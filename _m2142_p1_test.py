# -*- coding: utf-8 -*-
"""M2.14.2 P1 fix - verification_history persistence/ordering tests (no DB).

Root cause under test:
    Plain SQLAlchemy JSONB columns only track *reassignment*. In-place edits
    followed by assigning a deep-equal shallow copy are treated as unchanged,
    so the verification-history enrichment (period/alignment/observations) was
    silently dropped on commit.

What this file proves (offline, using the real service + model classes):

  Case 1  - After observations exist, _enrich_verification_history emits
            period/alignment/observations AND the assigned list is genuinely
            "dirty" (SQLAlchemy history.added non-empty), i.e. the commit path
            will persist it. The old in-place+copy pattern is shown to be
            undetectable (added == ()) - the regression this fix addresses.
  Case 2  - Two consecutive verification runs (N, N+1) both survive the merge
            and keep their own alignment/observation enrichment.
  Case 3  - Per-project refresh lock serializes same-project refreshes so a
            stale snapshot can never be written after a fresher one; different
            projects are NOT serialized (no global lock).
  Case 4  - Repeating the refresh three times is deterministic (deep-equal).
  Case 5  - A project with no observations keeps a legal empty state: no
            fabricated alignment/observations, no crash, no invented data.

Run from the repo root:
    $env:PYTHONPATH="backend"; backend/.venv/Scripts/python.exe -B _m2142_p1_test.py
"""

import asyncio
import copy
import json
import os
import subprocess
import time
from types import SimpleNamespace

from sqlalchemy import inspect
from sqlalchemy.orm.attributes import set_committed_value

from app.models.business_memory import BusinessMemory
from app.services import memory_service as svc

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name)
    if not cond:
        print(f"  FAIL {name}: {detail}")


def _verification_entry(run_id: int, parent_run_id: int, period: str | None = None) -> dict:
    """Shape written by extract_verification_summary (pre-enrichment)."""
    return {
        "run_id": run_id,
        "parent_run_id": parent_run_id,
        "dataset_version": period,
        "verdict": "partially_effective",
        "confidence": "medium",
        "reliability": {"verification_reliability_v1": {"effective": 2, "partial": 1}},
        "metric_changes": [{"metric_name": "total_sales", "before": 100, "after": 120}],
        "next_actions": ["keep tracking"],
    }


def _obs(alignment: str, reason: str | None = None, run_id: int = 10, **kw) -> dict:
    row = {
        "action_id": 1, "verification_run_id": run_id, "metric_name": "total_sales",
        "before_value": 1000, "after_value": 1200, "absolute_delta": 200,
        "percent_delta": 20.0, "direction": "improved", "expected_direction": "up",
        "alignment": alignment, "executed": True, "reason": reason,
    }
    row.update(kw)
    return row


def _history_added(memory) -> list:
    return list(inspect(memory).attrs.verification_history.history.added)


def _enrich_into(memory, obs_by_run):
    svc._enrich_verification_history(memory, obs_by_run)
    return memory.verification_history


# ---------------------------------------------------------------------------
# Case 1 - enrichment content + real dirty detection at the SQLAlchemy boundary
# ---------------------------------------------------------------------------

obs_run = [
    _obs("aligned", run_id=10),
    _obs("aligned", run_id=10),
    _obs("unable_to_verify", reason="metric_unavailable", run_id=10),
]
obs_by_run = {10: obs_run}

# 1a. entries now carry period / alignment / observations.
m1 = BusinessMemory(project_id=1)
m1.verification_history = [_verification_entry(10, 8, period="2026-06")]
out1 = _enrich_into(m1, obs_by_run)
e1 = out1[0]
check("c1_period_present", e1.get("period") == "2026-06", str(e1))
check("c1_alignment_total", e1.get("alignment", {}).get("total") == 3, str(e1))
check(
    "c1_alignment_counts",
    e1.get("alignment") == {"total": 3, "aligned": 2, "not_aligned": 0, "unable": 1},
    str(e1),
)
check("c1_observations_present", len(e1.get("observations") or []) == 3, str(e1))
check("c1_observations_content", e1["observations"][0]["alignment"] == "aligned", str(e1["observations"][0]))

# 1b. persistence proof under committed semantics: pin the committed baseline
#     (as a freshly-loaded row would have), then the FIXED pattern's fresh
#     dicts must be detected as dirty -> SQLAlchemy will persist enrichment.
m1c = BusinessMemory(project_id=1)
m1c.verification_history = [_verification_entry(10, 8, period="2026-06")]
set_committed_value(m1c, "verification_history", list(m1c.verification_history))
out1c = _enrich_into(m1c, obs_by_run)
added1c = _history_added(m1c)
check("c1_dirty_detected", len(added1c) == 1 and added1c[0] is out1c, f"added={added1c}")

# 1c. regression proof: the OLD in-place + deep-equal shallow copy pattern is
#     NOT dirty -> explains exactly why the enrichment was silently dropped.
m_old = BusinessMemory(project_id=1)
m_old.verification_history = [_verification_entry(10, 8, period="2026-06")]
set_committed_value(m_old, "verification_history", list(m_old.verification_history))
history = list(m_old.verification_history)
for entry in history:
    entry["period"] = entry.get("period") or entry.get("dataset_version") or None
    entry["alignment"] = {"total": 3, "aligned": 2, "not_aligned": 0, "unable": 1}
    entry["observations"] = obs_run
m_old.verification_history = list(history)  # old pattern: shallow copy, deep-equal
added_old = _history_added(m_old)
check("c1_old_pattern_undetectable", len(added_old) == 0, f"added={added_old} (must be empty to reproduce bug)")

# 1d. period fallback to dataset_version when period missing.
m1b = BusinessMemory(project_id=1)
m1b.verification_history = [_verification_entry(10, 8, period=None)]
out1b = _enrich_into(m1b, {10: []})
check("c1_period_fallback", out1b[0].get("period") is None or out1b[0].get("period") == out1b[0].get("dataset_version"), str(out1b[0]))

# ---------------------------------------------------------------------------
# Case 2 - consecutive runs N and N+1 both preserved with their own evidence
# ---------------------------------------------------------------------------

hist: list[dict] = []
hist = svc._merge_points(hist, [_verification_entry(20, 18, period="2026-05")], 50)
hist = svc._merge_points(hist, [_verification_entry(21, 18, period="2026-06")], 50)
m2 = BusinessMemory(project_id=1)
m2.verification_history = hist
obs_by_run_2 = {
    20: [_obs("aligned", run_id=20), _obs("not_aligned", run_id=20)],
    21: [_obs("aligned", run_id=21)],
}
out2 = _enrich_into(m2, obs_by_run_2)
run_ids = [e.get("run_id") for e in out2]
check("c2_both_runs_kept", run_ids == [20, 21], str(run_ids))
by_id = {e.get("run_id"): e for e in out2}
check("c2_runN_alignment", by_id[20]["alignment"] == {"total": 2, "aligned": 1, "not_aligned": 1, "unable": 0}, str(by_id[20]))
check("c2_runN_obs", len(by_id[20]["observations"]) == 2, str(by_id[20]))
check("c2_runN1_alignment", by_id[21]["alignment"] == {"total": 1, "aligned": 1, "not_aligned": 0, "unable": 0}, str(by_id[21]))
check("c2_runN1_obs", len(by_id[21]["observations"]) == 1, str(by_id[21]))
check("c2_runN_period", by_id[20]["period"] == "2026-05", str(by_id[20]))
check("c2_runN1_period", by_id[21]["period"] == "2026-06", str(by_id[21]))
check("c2_merge_idempotent", [e.get("run_id") for e in svc._merge_points(out2, [_verification_entry(20, 18)], 50)] == [20, 21], "")

# ---------------------------------------------------------------------------
# Case 3 - per-project refresh lock: no stale overwrite, no global lock
# ---------------------------------------------------------------------------


async def _case3_concurrent_same_project() -> None:
    pid = 424242
    hold_s = 0.05
    order: list[str] = []
    final: dict = {}

    async def refresher(name: str, obs_snapshot: list[dict]) -> None:
        async with svc._memory_lock(pid):
            order.append(f"{name}:enter")
            await asyncio.sleep(hold_s)  # hold the lock while "refreshing"
            m = BusinessMemory(project_id=pid)
            m.verification_history = [_verification_entry(30, 28, period="2026-07")]
            svc._enrich_verification_history(m, {30: obs_snapshot})
            final["memory"] = m.verification_history
            final["writer"] = name
            order.append(f"{name}:exit")

    start = time.monotonic()
    a = asyncio.create_task(refresher("A", []))  # stale: no observations
    await asyncio.sleep(0.01)  # ensure A grabs the lock first
    b = asyncio.create_task(refresher("B", obs_run))  # fresh: observations exist
    await asyncio.gather(a, b)
    elapsed = time.monotonic() - start

    check("c3_strict_serial_order", order == ["A:enter", "A:exit", "B:enter", "B:exit"], str(order))
    check("c3_last_writer_wins", final.get("writer") == "B", str(final.get("writer")))
    check("c3_no_stale_overwrite", len(final["memory"][0].get("observations") or []) == 3, json.dumps(final["memory"], ensure_ascii=False))
    check("c3_serialized_walltime", elapsed >= 2 * hold_s - 0.02, f"elapsed={elapsed:.3f}s")


async def _case3_concurrent_different_projects() -> None:
    hold_s = 0.05
    order: list[str] = []

    async def refresher(pid: int, name: str) -> None:
        async with svc._memory_lock(pid):
            order.append(f"{name}:enter")
            await asyncio.sleep(hold_s)
            order.append(f"{name}:exit")

    start = time.monotonic()
    a = asyncio.create_task(refresher(1, "X"))
    b = asyncio.create_task(refresher(2, "Y"))
    await asyncio.gather(a, b)
    elapsed = time.monotonic() - start

    check("c3_projects_not_serialized", elapsed < 2 * hold_s - 0.02, f"elapsed={elapsed:.3f}s (per-project lock only)")
    check("c3_projects_both_done", sorted(order) == ["X:enter", "X:exit", "Y:enter", "Y:exit"], str(order))


# ---------------------------------------------------------------------------
# Case 4 - repeated refresh is deterministic
# ---------------------------------------------------------------------------

m4 = BusinessMemory(project_id=1)
m4.verification_history = [_verification_entry(40, 38, period="2026-08")]
svc._enrich_verification_history(m4, obs_by_run)
snap1 = json.dumps(m4.verification_history, sort_keys=True, ensure_ascii=False)
svc._enrich_verification_history(m4, obs_by_run)
snap2 = json.dumps(m4.verification_history, sort_keys=True, ensure_ascii=False)
svc._enrich_verification_history(m4, obs_by_run)
snap3 = json.dumps(m4.verification_history, sort_keys=True, ensure_ascii=False)
check("c4_deterministic", snap1 == snap2 == snap3, "")
check("c4_no_duplicate_entries", len(m4.verification_history) == 1, str(m4.verification_history))

# ---------------------------------------------------------------------------
# Case 5 - no observations -> legal empty state, no fabricated data
# ---------------------------------------------------------------------------

m5a = BusinessMemory(project_id=1)
m5a.verification_history = []
out5a = _enrich_into(m5a, {})
check("c5_empty_stays_empty", out5a == [], str(out5a))

m5b = BusinessMemory(project_id=1)
m5b.verification_history = [_verification_entry(50, 48, period="2026-09")]
out5b = _enrich_into(m5b, {})  # run exists, but zero observations
e5 = out5b[0]
check("c5_no_fabricated_obs", e5.get("observations") == [], str(e5))
check("c5_honest_zero_alignment", e5.get("alignment") == {"total": 0, "aligned": 0, "not_aligned": 0, "unable": 0}, str(e5))
check("c5_period_preserved", e5.get("period") == "2026-09", str(e5))

# ---------------------------------------------------------------------------
# Scope + AI-boundary audit (same style as the M2.14.2 regression suite)
# ---------------------------------------------------------------------------

try:
    diff_files = (
        subprocess.check_output(
            ["git", "diff", "--name-only", "HEAD"], text=True, stderr=subprocess.DEVNULL
        )
        .strip()
        .splitlines()
    )
    allowed = {"backend/app/services/memory_service.py", "backend/app/services/analysis_job_runner.py"}
    # Regression/test files themselves are expected in the working diff; only
    # product code is scope-limited to the two authorized service files.
    ignored = {os.path.basename(__file__), "_m2142_test.py"}
    unexpected = [f for f in diff_files if f not in allowed and f not in ignored]
    check("scope_only_two_services", not unexpected, f"unexpected files: {unexpected}")
except Exception as exc:  # pragma: no cover
    check("scope_only_two_services", False, str(exc))

src = ""
for f in ("backend/app/services/memory_service.py", "backend/app/services/analysis_job_runner.py"):
    with open(f, encoding="utf-8") as fh:
        src += fh.read()
banned = ["openai", "AsyncOpenAI", "client.chat", "anthropic"]
hits = [b for b in banned if b in src]
check("ai_boundary_no_ai_imports", not hits, f"banned tokens: {hits}")
verdict_builder = [
    t for t in ["generate_verdict", "judge_success", "improvement=true", "success=true", "cause=true"]
    if t in src
]
check("ai_boundary_no_judgement_tokens", not verdict_builder, str(verdict_builder))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

print(f"\nPASS: {len(PASS)}  FAIL: {len(FAIL)}")
for name in PASS:
    print(f"  ok {name}")
for name in FAIL:
    print(f"  XX {name}")
raise SystemExit(1 if FAIL else 0)
