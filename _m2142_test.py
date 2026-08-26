# -*- coding: utf-8 -*-
"""M2.14.2 Business Memory Intelligence v1 - offline logic tests (no DB).

Covers:
  1. Data computation: multi-period alignment trend, no-action rates (null,
     never 0), not-executed actions never become improvement evidence,
     unable_to_verify split into the three reasons, alignment three states.
  2. Idempotency: build_intelligence twice == identical output; enrichment
     replay is stable.
  3. Historical protection: changed files are scoped to the M2.14.2 set;
     untouched sources (prompt / verification contract / execution logic)
     match their HEAD blobs; memory code performs no writes to
     result_json / latest_result_json / ActionItem status.
  4. AI boundary audit: memory_intelligence contains no AI imports or
     judgement vocabulary and emits no improvement/success/cause keys.
  5. API/schema invariants: additive "intelligence" block in the memory API.

Run from the repo root:
    $env:PYTHONPATH="backend"; backend/.venv/Scripts/python.exe -B _m2142_test.py
"""

import hashlib
import json
import os
import subprocess
from types import SimpleNamespace

from app.services import memory_intelligence as intel
from app.services import memory_service as svc

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name)
    if not cond:
        print(f"  FAIL {name}: {detail}")


def _summary(**kw) -> dict:
    base = {
        "total": 0, "pending": 0, "completed": 0, "cancelled": 0,
        "verified": 0, "executed": 0, "observed": 0,
        "aligned": 0, "not_aligned": 0, "unable_to_verify": 0,
        "total_verified_actions": 0, "verified_count": 0, "unable_count": 0,
        "unable_reasons": {"not_executed": 0, "metric_unavailable": 0, "insufficient_data": 0},
    }
    base.update(kw)
    return base


def _obs(alignment: str, reason: str | None = None, **kw) -> dict:
    row = {
        "action_id": 1, "verification_run_id": 10, "metric_name": "total_sales",
        "before_value": 1000, "after_value": 1200, "absolute_delta": 200,
        "percent_delta": 20.0, "direction": "improved", "expected_direction": "up",
        "alignment": alignment, "executed": True, "reason": reason,
    }
    row.update(kw)
    return row


def _enriched_entry(run_id: int, parent_run_id: int, period: str, obs_rows: list[dict]) -> dict:
    aligned = sum(1 for r in obs_rows if r["alignment"] == "aligned")
    not_aligned = sum(1 for r in obs_rows if r["alignment"] == "not_aligned")
    unable = sum(1 for r in obs_rows if r["alignment"] == "unable_to_verify")
    return {
        "run_id": run_id,
        "parent_run_id": parent_run_id,
        "dataset_version": period,
        "period": period,
        "verdict": "partially_effective",
        "alignment": {"total": len(obs_rows), "aligned": aligned, "not_aligned": not_aligned, "unable": unable},
        "observations": obs_rows,
    }


def _observation_dict(row: dict, description: str | None) -> dict:
    return {
        "action_id": row["action_id"], "description": description,
        "metric_name": row["metric_name"], "before_value": row["before_value"],
        "after_value": row["after_value"], "absolute_delta": row["absolute_delta"],
        "percent_delta": row["percent_delta"], "direction": row["direction"],
        "expected_direction": row["expected_direction"], "alignment": row["alignment"],
        "executed": row["executed"], "reason": row["reason"],
    }


# ---------------------------------------------------------------------------
# 1a. no action data -> all rates null (never 0)
# ---------------------------------------------------------------------------

er_empty = intel.execution_rates({})
check("t1a_exec_total_zero", er_empty["action_total"] == 0 and er_empty["executed_count"] == 0, str(er_empty))
check("t1a_exec_rate_null", er_empty["execution_rate"] is None, str(er_empty))
check("t1a_exec_never_zero", er_empty["execution_rate"] != 0, str(er_empty))

vr_empty = intel.verification_rates({})
check("t1a_ver_totals_zero", vr_empty["total_verified_actions"] == 0 and vr_empty["verified_count"] == 0, str(vr_empty))
check("t1a_ver_rates_null", vr_empty["verification_rate"] is None and vr_empty["unable_rate"] is None, str(vr_empty))
check("t1a_ver_reasons_zero", all(v == 0 for v in vr_empty["unable_reasons"].values()), str(vr_empty))

# ---------------------------------------------------------------------------
# 1b. execution + verification rates vs hand calculation
# ---------------------------------------------------------------------------

summary = _summary(total=4, executed=3, total_verified_actions=4, verified_count=2, unable_count=2,
                   unable_reasons={"not_executed": 1, "metric_unavailable": 1, "insufficient_data": 0})
er = intel.execution_rates(summary)
check("t1b_exec_rate", er["execution_rate"] == 0.75, str(er))
vr = intel.verification_rates(summary)
check("t1b_ver_rate", vr["verification_rate"] == 0.5, str(vr))
check("t1b_unable_rate", vr["unable_rate"] == 0.5, str(vr))
check("t1b_reasons_split", vr["unable_reasons"] == {"not_executed": 1, "metric_unavailable": 1, "insufficient_data": 0}, str(vr))


# ---------------------------------------------------------------------------
# 1c. alignment trend - multi-period memory
# ---------------------------------------------------------------------------

obs_a = [_obs("aligned", None), _obs("unable_to_verify", "not_executed", executed=False)]
obs_b = [_obs("not_aligned", None, direction="declined"), _obs("aligned", None)]
entry_a = _enriched_entry(10, 5, "v1", obs_a)
entry_b = _enriched_entry(11, 5, "v2", obs_b)
history = [entry_a, entry_b]

trend = intel.build_alignment_trend(history)
check("t1c_trend_count", len(trend) == 2, str(trend))
t0, t1 = trend[0], trend[1]
check("t1c_trend_a", t0["aligned_count"] == 1 and t0["not_aligned_count"] == 0 and t0["unable_count"] == 1, str(t0))
check("t1c_trend_b", t1["aligned_count"] == 1 and t1["not_aligned_count"] == 1 and t1["unable_count"] == 0, str(t1))
check("t1c_trend_periods", t0["period"] == "v1" and t1["period"] == "v2", str(trend))
check("t1c_trend_sources", t0["source_run_ids"] == [5, 10] or t0["source_run_ids"] == [10, 5], str(t0))

# entry without observations is skipped
plain_entry = {"run_id": 12, "parent_run_id": 5, "verdict": "effective"}
check("t1c_trend_skip_empty", len(intel.build_alignment_trend([plain_entry])) == 0)
check("t1c_trend_skip_none", intel.build_alignment_trend(None) == [])


# ---------------------------------------------------------------------------
# 1d. improvement timeline - not executed never improvement evidence
# ---------------------------------------------------------------------------

timeline = intel.build_improvement_timeline(history)
check("t1d_timeline_count", len(timeline) == 2, str(timeline))
t_obs = timeline[0]["observations"]
check("t1d_timeline_obs_count", len(t_obs) == 2, str(t_obs))
not_exec = [o for o in t_obs if o["executed"] is False]
check("t1d_not_executed_not_aligned", all(o["alignment"] == "unable_to_verify" for o in not_exec), str(t_obs))
check("t1d_not_executed_reason", not_exec[0]["reason"] == "not_executed", str(t_obs))
check("t1d_timeline_no_verdict_keys", all("verdict" not in o for o in t_obs), str(t_obs))
check("t1d_timeline_no_improvement_flags", all(k not in o for o in t_obs for k in ("improvement", "success", "cause")), str(t_obs))

# ---------------------------------------------------------------------------
# 1e. unable_to_verify three reasons via _action_items_snapshot
# ---------------------------------------------------------------------------

fake_actions = [
    SimpleNamespace(id=1, status="completed", verification_run_id=10, description="a1",
                    priority_snapshot="high", source_run_id=5),
    SimpleNamespace(id=2, status="completed", verification_run_id=10, description="a2",
                    priority_snapshot=None, source_run_id=5),
    SimpleNamespace(id=3, status="completed", verification_run_id=10, description="a3",
                    priority_snapshot=None, source_run_id=5),
    SimpleNamespace(id=4, status="pending", verification_run_id=None, description="a4",
                    priority_snapshot=None, source_run_id=5),
]
obs_summary = {
    1: {"total": 1, "aligned": 0, "not_aligned": 0, "unable_to_verify": 1,
        "unable_reasons": {"not_executed": 1, "metric_unavailable": 0, "insufficient_data": 0}},
    2: {"total": 1, "aligned": 0, "not_aligned": 0, "unable_to_verify": 1,
        "unable_reasons": {"not_executed": 0, "metric_unavailable": 1, "insufficient_data": 0}},
    3: {"total": 1, "aligned": 1, "not_aligned": 0, "unable_to_verify": 0},
}
summary3, _, _ = svc._action_items_snapshot(fake_actions, {}, obs_summary)
check("t1e_total_verified", summary3["total_verified_actions"] == 3, str(summary3))
check("t1e_verified_count", summary3["verified_count"] == 1, str(summary3))
check("t1e_unable_count", summary3["unable_count"] == 2, str(summary3))
check("t1e_reasons", summary3["unable_reasons"] == {"not_executed": 1, "metric_unavailable": 1, "insufficient_data": 0}, str(summary3))

# legacy obs_summary without reasons -> deterministic fallback
legacy_obs = {1: {"total": 1, "aligned": 0, "not_aligned": 0, "unable_to_verify": 1}}
s4, _, _ = svc._action_items_snapshot(fake_actions[:1], {}, legacy_obs)
check("t1e_reason_fallback", s4["unable_reasons"]["insufficient_data"] == 1, str(s4))
check("t1e_legacy_counters", s4["total_verified_actions"] == 1 and s4["unable_count"] == 1, str(s4))


# ---------------------------------------------------------------------------
# 1f. alignment three states - decide_observation wiring stays intact
# ---------------------------------------------------------------------------

from app.services import action_execution_service as aesvc  # noqa: E402
a1, r1 = aesvc.decide_observation({"status": "available", "direction": "improved"}, "up", executed=True)
a2, r2 = aesvc.decide_observation({"status": "available", "direction": "improved"}, "down", executed=True)
a3, r3 = aesvc.decide_observation({"status": "available", "direction": "improved"}, "up", executed=False)
check("t1f_aligned", a1 == "aligned" and r1 is None, f"{a1},{r1}")
check("t1f_not_aligned", a2 == "not_aligned" and r2 is None, f"{a2},{r2}")
check("t1f_unable_not_executed", a3 == "unable_to_verify" and r3 == "not_executed", f"{a3},{r3}")


# ---------------------------------------------------------------------------
# 2. Idempotency
# ---------------------------------------------------------------------------

memory = SimpleNamespace(
    action_summary=summary,
    verification_history=[entry_a, entry_b],
    open_loops=[
        {"type": "pending_action", "action_id": 4, "description": "pending", "priority": "high"},
        {"type": "not_executed_action", "action_id": 1, "description": "done", "priority": "high"},
    ],
)
b1 = intel.build_intelligence(memory)
b2 = intel.build_intelligence(memory)
check("t2_intel_identical", json.dumps(b1, ensure_ascii=False, sort_keys=True) == json.dumps(b2, ensure_ascii=False, sort_keys=True))
check("t2_intel_version", b1["engine_version"] == "business_memory_intelligence_v1", str(b1["engine_version"]))
check("t2_intel_rates_keys", set(b1["rates"].keys()) == {"execution", "verification"}, str(b1["rates"].keys()))
check("t2_intel_open_loops", len(b1["open_loops"]) == 2, str(b1["open_loops"]))

# enrichment replay stability (rebuild semantics)
mem2 = SimpleNamespace(verification_history=[_enriched_entry(10, 5, "v1", obs_a)])
svc._enrich_verification_history(mem2, {10: [_observation_dict(obs_a[0], "a1"), _observation_dict(obs_a[1], "a2")]})
snap1 = json.dumps(mem2.verification_history, ensure_ascii=False, sort_keys=True)
svc._enrich_verification_history(mem2, {10: [_observation_dict(obs_a[0], "a1"), _observation_dict(obs_a[1], "a2")]})
snap2 = json.dumps(mem2.verification_history, ensure_ascii=False, sort_keys=True)
check("t2_enrich_idempotent", snap1 == snap2, "")


# ---------------------------------------------------------------------------
# 3. Historical protection audit
# ---------------------------------------------------------------------------

diff = subprocess.run(
    ["git", "diff", "--name-only", "HEAD"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
    capture_output=True, text=True,
).stdout.splitlines()
# Regression files themselves are tracked; exclude them so the scope audit
# below only covers the authorized product files of the P1/P0 fixes.
_scope_excluded = {
    os.path.basename(__file__), "_m2142_p1_test.py", "_m2142_uat_p0_test.py",
}
diff = [f for f in diff if f not in _scope_excluded]
allowed_tracked = [
    # M2.14.2 P1 fix + UAT P0 fix scope.
    "backend/app/services/analysis_job_runner.py",
    "backend/app/services/metric_engine.py",
    "backend/app/plugins/sales/prompt_builder.py",
    "frontend/src/app/project/[id]/analysis/page.tsx",
    "frontend/src/lib/i18n.ts",
]
check("t3_diff_scoped", all(f in diff for f in allowed_tracked), str(diff))
check("t3_diff_no_extra", len(diff) == len(allowed_tracked), str(diff))
new_files = ["backend/app/services/memory_intelligence.py", "_m2142_test.py", "_m2142_p1_test.py"]
check("t3_new_files_exist", all(os.path.exists(f) for f in new_files), str(new_files))
forbidden = [
    "verification_service.py", "schemas/verification.py",
    "api/verification.py", "api/auth.py", "workbook_service.py",
    "action_execution_service.py", "action_item_service.py",
    "health_score.py", "analysis_engine.py", "models/",
]
check("t3_diff_forbidden_absent", all(f not in diff for f in forbidden), diff)

# untouched sources: absent from the working diff + normalized-hash equal
untouched_rels = [
    "backend/app/services/verification_service.py",
    "backend/app/schemas/verification.py",
    "backend/app/api/verification.py",
    "backend/app/services/action_execution_service.py",
]


def _norm(data: bytes) -> bytes:
    return data.replace(b"\r\n", b"\n")


for rel in untouched_rels:
    check(f"t3_untouched_{os.path.basename(rel)}", rel not in diff, f"{rel} in working diff")
    head_blob = subprocess.run(
        ["git", "show", f"HEAD:{rel}"],
        cwd=os.path.dirname(os.path.abspath(__file__)),
        capture_output=True,
    ).stdout
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), rel), "rb") as fh:
        work = fh.read()
    check(
        f"t3_untouched_hash_{os.path.basename(rel)}",
        hashlib.sha256(_norm(work)).hexdigest() == hashlib.sha256(_norm(head_blob)).hexdigest(),
        f"{rel} content differs from HEAD",
    )

# memory code never writes authoritative business data
mem_src = open(os.path.join("backend", "app", "services", "memory_service.py"), encoding="utf-8").read()
intel_src = open(os.path.join("backend", "app", "services", "memory_intelligence.py"), encoding="utf-8").read()
for token in [".result_json =", "latest_result_json =", ".status =", "ActionItem(", "AnalysisRun("]:
    check(f"t3_no_write_{token.strip().replace(' ', '_').replace('.', '_')}", token not in mem_src and token not in intel_src)


# ---------------------------------------------------------------------------
# 4. AI boundary audit
# ---------------------------------------------------------------------------

ai_tokens = ["deepseek", "openai", "llm", "chat", "gpt", "prompt", "verdict"]
for tok in ai_tokens:
    check(f"t4_no_ai_{tok}", tok not in intel_src.lower(), f"'{tok}' found in memory_intelligence")
import_lines = [
    ln for ln in intel_src.splitlines()
    if ln.startswith("import ") or ln.startswith("from ")
]
check(
    "t4_imports_minimal",
    all(("typing" in ln) or ("__future__" in ln) for ln in import_lines),
    str(import_lines),
)
for k in ("improvement", "success", "cause"):
    check(f"t4_no_flag_{k}", f'"{k}"' not in intel_src, f'"{k}" key present in memory_intelligence')
# sanity: build_intelligence output never contains verdict-ish flags
out_text = json.dumps(b1)
check("t4_output_no_verdict", '"verdict"' not in out_text, out_text[:300])
check("t4_output_no_success", '"success"' not in out_text and '"improvement": true' not in out_text, out_text[:300])


# ---------------------------------------------------------------------------
# 5. API / schema invariants (additive)
# ---------------------------------------------------------------------------

api_src = open(os.path.join("backend", "app", "api", "business_memory.py"), encoding="utf-8").read()
check("t5_api_import", "memory_intelligence" in api_src, "missing import")
check("t5_api_additive", '"intelligence": memory_intelligence.build_intelligence(memory)' in api_src, "missing additive key")
check("t5_api_old_keys", '"open_loops"' in api_src and '"verification_history"' in api_src and '"trend_deltas"' in api_src, "")

# extract_verification_summary carries dataset_version
vs = svc.extract_verification_summary(
    json.dumps({"verdict": "partially_effective", "metric_changes": [], "next_actions": []}),
    run_id=10, parent_run_id=5, dataset_version="v2",
)
check("t5_dataset_version", vs["dataset_version"] == "v2", str(vs))
vs_old = svc.extract_verification_summary(
    json.dumps({"verdict": "effective", "metric_changes": [], "next_actions": []}),
    run_id=11, parent_run_id=5,
)
check("t5_dataset_version_default", vs_old["dataset_version"] is None, str(vs_old))


# ---------------------------------------------------------------------------
# 6. build_open_loops extended types
# ---------------------------------------------------------------------------

actions = [
    {"id": 1, "status": "pending", "description": "p1", "priority_snapshot": "high"},
    {"id": 2, "status": "completed", "description": "c-without-exec", "priority_snapshot": "low"},
    {"id": 3, "status": "completed", "description": "c-with-exec", "priority_snapshot": "low"},
    {"id": 4, "status": "cancelled", "description": "x", "priority_snapshot": None},
]
loops = svc.build_open_loops(
    actions,
    {"customer_count": {"availability": "unavailable", "formula": "COUNT(DISTINCT c)"}},
    exec_counts={3: 1},
    issue_tracker=[
        {"status": "open", "title": "old issue", "priority": "high", "first_seen_run_id": 3},
        {"status": "open", "title": "recent issue", "priority": "medium", "first_seen_run_id": 11},
    ],
    verification_run_ids=[9, 10],
)
types = [l["type"] for l in loops]
check("t6_pending", "pending_action" in types, str(types))
check("t6_not_executed", "not_executed_action" in types, str(types))
check("t6_not_executed_only_completed", loops[types.index("not_executed_action")]["action_id"] == 2, str(loops))
check("t6_executed_not_flagged", all(l.get("action_id") != 3 for l in loops), str(loops))
check("t6_unavailable_metric", "unavailable_metric" in types, str(types))
check("t6_long_open_issue", "long_open_issue" in types, str(types))
long_issue = [l for l in loops if l["type"] == "long_open_issue"]
check("t6_long_open_facts", len(long_issue) == 1 and long_issue[0]["title"] == "old issue", str(long_issue))
check("t6_recent_issue_not_long", all(l.get("title") != "recent issue" for l in loops), str(loops))
check("t6_cancelled_excluded", all(l.get("action_id") != 4 for l in loops), str(loops))

# backward compatible call (v0 signature, no exec info) keeps v0 behaviour
loops_v0 = svc.build_open_loops(actions, {"customer_count": {"availability": "unavailable"}})
v0_types = [l["type"] for l in loops_v0]
check("t6_backward_compat", "not_executed_action" not in v0_types, str(loops_v0))
check("t6_backward_compat_order", len(loops_v0) == 2 and v0_types == ["pending_action", "unavailable_metric"], str(loops_v0))


# ---------------------------------------------------------------------------
# 6b. multi-period + semantic edge matrix (0/1/2/3+ cycles, no fabrication)
# ---------------------------------------------------------------------------

hist3 = [
    _enriched_entry(10, 5, "v1", [_obs("aligned", None), _obs("not_aligned", None, direction="declined")]),
    _enriched_entry(
        11, 5, "v2",
        [_obs("unable_to_verify", "not_executed", executed=False),
         _obs("unable_to_verify", "metric_unavailable", executed=True)],
    ),
    _enriched_entry(
        12, 5, "v3",
        [_obs("aligned", None),
         _obs("aligned", None),
         _obs("unable_to_verify", "insufficient_data", executed=True, direction="unavailable")],
    ),
]
trend3 = intel.build_alignment_trend(hist3)
check("t6b_periods_3", len(trend3) == 3, str(trend3))
check("t6b_v1_counts", trend3[0]["aligned_count"] == 1 and trend3[0]["not_aligned_count"] == 1 and trend3[0]["unable_count"] == 0, str(trend3[0]))
check("t6b_v2_counts", trend3[1]["aligned_count"] == 0 and trend3[1]["not_aligned_count"] == 0 and trend3[1]["unable_count"] == 2, str(trend3[1]))
check("t6b_v3_counts", trend3[2]["aligned_count"] == 2 and trend3[2]["not_aligned_count"] == 0 and trend3[2]["unable_count"] == 1, str(trend3[2]))
check("t6b_deterministic", intel.build_alignment_trend(hist3) == trend3, "")
timeline3 = intel.build_improvement_timeline(hist3)
check("t6b_timeline_3", len(timeline3) == 3, str(len(timeline3)))
flags = [k for pt in timeline3 for o in pt["observations"] for k in ("improvement", "success", "cause") if k in o]
check("t6b_no_flags", flags == [], str(flags))
check("t6b_reasons_kept", {o["reason"] for pt in timeline3 for o in pt["observations"] if o["alignment"] == "unable_to_verify"} == {
    "not_executed", "metric_unavailable", "insufficient_data"}, "")

# no target metric -> no observation -> never enters verified scope or timeline
no_target = [
    SimpleNamespace(id=5, status="completed", verification_run_id=10, description="a5",
                    priority_snapshot=None, source_run_id=5),
]
s5, _, _ = svc._action_items_snapshot(no_target, {}, {})
check("t6b_no_target_not_verified", s5["total_verified_actions"] == 0 and s5["verified_count"] == 0, str(s5))
check("t6b_no_target_timeline", intel.build_improvement_timeline([_enriched_entry(10, 5, "v1", [])]) == [], "")

# zero / one period
check("t6b_zero_period", intel.build_alignment_trend([]) == [] and intel.build_improvement_timeline([]) == [])
check("t6b_one_period", len(intel.build_alignment_trend(history[:1])) == 1, "")


# ---------------------------------------------------------------------------
# 7. memory staleness detection
# ---------------------------------------------------------------------------

legacy_mem = SimpleNamespace(
    action_summary={"total": 2, "executed": 1},
    verification_history=[{"run_id": 10, "parent_run_id": 5, "verdict": "effective"}],
)
fresh_mem = SimpleNamespace(
    action_summary=_summary(total=2, total_verified_actions=1),
    verification_history=[_enriched_entry(10, 5, "v1", [_obs("aligned", None)])],
)
check("t7_legacy_stale", svc._memory_needs_intelligence_refresh(legacy_mem) is True)
check("t7_fresh_not_stale", svc._memory_needs_intelligence_refresh(fresh_mem) is False)
check("t7_none_not_stale", svc._memory_needs_intelligence_refresh(None) is False)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

total = len(PASS) + len(FAIL)
print(f"PASS={len(PASS)} FAIL={len(FAIL)} total={total}")
if FAIL:
    print("FAILED:", ", ".join(FAIL))
    raise SystemExit(1)
print("ALL M2.14.2 OFFLINE TESTS PASSED")
