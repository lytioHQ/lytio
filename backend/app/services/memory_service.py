"""M2.12.4 Business Memory service.

Turns scattered AnalysisRun / ActionItem / Verification data into a per-project
operating memory: profile, metric history, health history, action summary,
issue lifecycle, verification summary and open loops.

Design rules (Lytio moat Layer 5):
- Derived cache only: everything can be rebuilt from analysis_runs +
  action_items; business_memory is never an authoritative business source.
- Pure computation: no AI anywhere in this module.
- Never blocks analysis: callers wrap the async entry points in try/except.
- Historical data is never modified; only business_memory rows are written.
- Idempotent: upserts are keyed by run_id and can be replayed safely.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from app.core.database import async_session
from app.core.logging_config import logger
from app.models.action_item import ActionItem
from app.models.analysis_run import AnalysisRun
from app.models.business_memory import BusinessMemory
from app.models.project import Project
from app.services import action_item_service
from app.services.canonical_schema import CANONICAL_BY_KEY

ENGINE_VERSION = "business_memory_v0"
METRIC_HISTORY_CAP = 12
HEALTH_HISTORY_CAP = 24
VERIFICATION_HISTORY_CAP = 24
ISSUE_TRACKER_CAP = 100
ACTION_RECENT_CAP = 10
OPEN_LOOP_CAP = 10

AVAILABLE = "available"


# ---------------------------------------------------------------------------
# Pure extraction helpers (offline-testable, no I/O)
# ---------------------------------------------------------------------------

def _parse_json(value: str | None) -> dict | None:
    if not value:
        return None
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, TypeError):
        return None


def extract_latest_metrics(result_json: str | None) -> dict[str, dict]:
    """Snapshot computed_metrics as {metric_name -> {value, availability, confidence}}."""
    data = _parse_json(result_json)
    if not data:
        return {}
    metrics = data.get("computed_metrics")
    if not isinstance(metrics, list):
        return {}
    out: dict[str, dict] = {}
    for m in metrics:
        if not isinstance(m, dict) or not m.get("metric_name"):
            continue
        out[str(m["metric_name"])] = {
            "value": m.get("value"),
            "availability": m.get("availability", "unavailable"),
            "confidence": m.get("confidence"),
            "formula": m.get("formula"),
        }
    return out


def extract_metric_points(
    result_json: str | None, run_id: int, dataset_version: str | None
) -> dict[str, list[dict]]:
    """Available metrics -> per-metric history points (keyed for upsert).

    The dataset date range (when present) is carried into every point as
    ``period`` so later comparisons can align by month.
    """
    latest = extract_latest_metrics(result_json)
    out: dict[str, list[dict]] = {}
    period = None
    date_range = latest.get("date_range")
    if (
        date_range is not None
        and date_range.get("availability") == AVAILABLE
        and isinstance(date_range.get("value"), dict)
    ):
        period = date_range["value"]
    for name, m in latest.items():
        if m.get("availability") != AVAILABLE or m.get("value") is None:
            continue
        out[name] = [
            {
                "run_id": run_id,
                "dataset_version": dataset_version,
                "period": period,
                "value": m["value"],
                "availability": AVAILABLE,
                "confidence": m.get("confidence"),
            }
        ]
    return out


def extract_health_point(
    result_json: str | None, run_id: int, dataset_version: str | None
) -> dict | None:
    data = _parse_json(result_json)
    if not data:
        return None
    hs = data.get("health_score")
    if not isinstance(hs, dict) or hs.get("health_score") is None:
        return None
    return {
        "run_id": run_id,
        "dataset_version": dataset_version,
        "score": hs.get("health_score"),
        "level": hs.get("health_level"),
        "coverage": hs.get("coverage"),
        "engine_version": hs.get("engine_version"),
    }


def extract_verification_summary(
    comparison_result: str | None, run_id: int, parent_run_id: int | None
) -> dict | None:
    data = _parse_json(comparison_result)
    if not data:
        return None
    changes = data.get("metric_changes") or []
    next_actions = data.get("next_actions") or []
    return {
        "run_id": run_id,
        "parent_run_id": parent_run_id,
        "verdict": data.get("verdict"),
        "confidence": data.get("confidence"),
        "metric_changes": changes[:5],
        "next_actions": next_actions[:5],
    }


def extract_issue_entries(result_json: str | None, run_id: int) -> list[dict]:
    """Recommendations -> open issue tracker entries.

    Dedup key: recommendation_id when present, otherwise a per-run unnamed
    index so several unnamed recommendations from one run stay distinct.
    """
    recs = action_item_service.extract_recommendations(result_json)
    out: list[dict] = []
    unnamed_index = 0
    for r in recs:
        named = bool(r.get("recommendation_id"))
        if not named:
            unnamed_index += 1
        out.append(
            {
                "recommendation_id": r.get("recommendation_id"),
                "_unnamed": not named,
                "unnamed_index": unnamed_index if not named else None,
                "title": r.get("title"),
                "priority": r.get("priority"),
                "source_run_id": run_id,
                "first_seen_run_id": run_id,
                "status": "open",
            }
        )
    return out


def build_open_loops(
    actions: list[dict], latest_metrics: dict[str, dict]
) -> list[dict]:
    """Open loops = pending actions + unavailable latest metrics."""
    loops: list[dict] = []
    for a in actions:
        if a.get("status") == "pending":
            loops.append(
                {
                    "type": "pending_action",
                    "action_id": a.get("id"),
                    "description": a.get("description"),
                    "priority": a.get("priority_snapshot"),
                }
            )
    for name, m in latest_metrics.items():
        if m.get("availability") != AVAILABLE:
            loops.append(
                {
                    "type": "unavailable_metric",
                    "metric": name,
                    "note": m.get("formula"),
                }
            )
    return loops[:OPEN_LOOP_CAP]


def _merge_points(existing: list[dict], points: list[dict], cap: int) -> list[dict]:
    seen = {p.get("run_id") for p in existing}
    merged = list(existing)
    for p in points:
        if p.get("run_id") in seen:
            continue
        merged.append(p)
        seen.add(p.get("run_id"))
    merged.sort(key=lambda p: p.get("run_id") or 0)
    return merged[-cap:]


def _issue_key(entry: dict) -> str:
    """Stable dedup key for one issue entry."""
    rid = entry.get("recommendation_id")
    if rid:
        return str(rid)
    run_id = entry.get("source_run_id")
    if entry.get("_unnamed"):
        return f"r{run_id}-u{entry.get('unnamed_index', 0)}"
    return f"r{run_id}"


def _merge_issues(existing: list[dict], entries: list[dict], cap: int) -> list[dict]:
    """Merge issue entries; existing keys win (first-seen preserved)."""
    merged = {_issue_key(e): e for e in existing}
    for e in entries:
        key = _issue_key(e)
        if key in merged:
            continue
        merged[key] = e
    return list(merged.values())[-cap:]


# ---------------------------------------------------------------------------
# Async DB operations
# ---------------------------------------------------------------------------

async def _load_memory(db, project_id: int) -> BusinessMemory:
    res = await db.execute(
        select(BusinessMemory).where(BusinessMemory.project_id == project_id)
    )
    memory = res.scalar_one_or_none()
    if memory is None:
        memory = BusinessMemory(project_id=project_id, engine_version=ENGINE_VERSION)
        db.add(memory)
        await db.flush()
    return memory


def _profile_from_project(project: Project) -> dict[str, Any]:
    mapping = project.schema_mapping or {}
    mappings = mapping.get("mappings") or [] if isinstance(mapping, dict) else []
    available_keys = {
        str(m.get("canonical_key"))
        for m in mappings
        if isinstance(m, dict)
        and m.get("availability") == AVAILABLE
        and m.get("source_column")
    }
    total = len(CANONICAL_BY_KEY)
    missing = [k for k in CANONICAL_BY_KEY if k not in available_keys]
    return {
        "industry": project.industry,
        "language": project.language,
        "schema_mapping_persisted": bool(mapping),
        "field_coverage": round(len(available_keys) / total, 2) if total else 0.0,
        "missing_fields": missing[:20],
    }


def _action_item_dict(a: ActionItem) -> dict[str, Any]:
    return {
        "id": a.id,
        "description": a.description,
        "priority_snapshot": a.priority_snapshot,
        "status": a.status,
        "source_run_id": a.source_run_id,
        "verification_run_id": a.verification_run_id,
    }


def _action_items_snapshot(
    actions: list[ActionItem],
) -> tuple[dict[str, Any], list[dict[str, Any]], list[dict[str, Any]]]:
    summary: dict[str, Any] = {"total": len(actions), "pending": 0, "completed": 0, "cancelled": 0, "verified": 0}
    all_items: list[dict[str, Any]] = []
    for a in actions:
        summary[a.status] = summary.get(a.status, 0) + 1
        if a.verification_run_id is not None:
            summary["verified"] += 1
        all_items.append(_action_item_dict(a))
    recent = sorted(all_items, key=lambda a: a["id"] or 0, reverse=True)
    return summary, recent[:ACTION_RECENT_CAP], all_items


async def _refresh_action_data(
    db, memory: BusinessMemory, project_id: int, owner_id: int
) -> None:
    res = await db.execute(
        select(ActionItem)
        .where(ActionItem.project_id == project_id, ActionItem.user_id == owner_id)
        .order_by(ActionItem.id)
    )
    actions = list(res.scalars().all())
    summary, recent, all_items = _action_items_snapshot(actions)
    memory.action_summary = summary
    memory.action_recent = recent
    memory.open_loops = build_open_loops(all_items, dict(memory.latest_metrics or {}))


async def _apply_run_updates(db, memory: BusinessMemory, run: AnalysisRun, project: Project) -> None:
    """Merge one AnalysisRun into the memory row. Idempotent (keyed by run_id)."""
    result_json = run.result_json
    dataset_version = run.dataset_version

    latest = extract_latest_metrics(result_json)
    if latest:
        memory.latest_metrics = latest
        memory.profile = _profile_from_project(project)
        points = extract_metric_points(result_json, run.id, dataset_version)
        history = dict(memory.metric_history or {})
        for name, pts in points.items():
            history[name] = _merge_points(list(history.get(name) or []), pts, METRIC_HISTORY_CAP)
        memory.metric_history = history

    health = extract_health_point(result_json, run.id, dataset_version)
    if health:
        memory.health_history = _merge_points(
            list(memory.health_history or []), [health], HEALTH_HISTORY_CAP
        )

    if run.analysis_type == "verification":
        summary = extract_verification_summary(run.comparison_result, run.id, run.parent_run_id)
        if summary:
            memory.verification_history = _merge_points(
                list(memory.verification_history or []),
                [summary],
                VERIFICATION_HISTORY_CAP,
            )

    entries = extract_issue_entries(result_json, run.id)
    if entries:
        memory.issue_tracker = _merge_issues(
            list(memory.issue_tracker or []), entries, ISSUE_TRACKER_CAP
        )

    await _refresh_action_data(db, memory, run.project_id, project.owner_id)
    memory.updated_at = datetime.now(timezone.utc)


async def upsert_memory_after_run(project_id: int, run_id: int) -> None:
    """Entry point called by the analysis runner after a run completes.

    Opens its own session so a memory failure can never poison the job
    transaction. Failures are logged by the caller, never propagated.
    """
    async with async_session() as db:
        run = await db.get(AnalysisRun, run_id)
        if run is None or run.project_id != project_id:
            return
        project = await db.get(Project, project_id)
        if project is None:
            return
        memory = await _load_memory(db, project_id)
        await _apply_run_updates(db, memory, run, project)
        await db.commit()


async def rebuild_memory(project_id: int, owner_id: int) -> None:
    """Rebuild the derived memory row from all runs + actions. Idempotent."""
    async with async_session() as db:
        memory = await _load_memory(db, project_id)
        memory.profile = {}
        memory.latest_metrics = {}
        memory.metric_history = {}
        memory.health_history = []
        memory.action_summary = {}
        memory.action_recent = []
        memory.issue_tracker = []
        memory.verification_history = []
        memory.open_loops = []
        project = await db.get(Project, project_id)
        if project is None:
            await db.commit()
            return
        res = await db.execute(
            select(AnalysisRun)
            .where(AnalysisRun.project_id == project_id)
            .order_by(AnalysisRun.id)
        )
        for run in res.scalars().all():
            await _apply_run_updates(db, memory, run, project)
        memory.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def get_memory(project_id: int, owner_id: int) -> BusinessMemory | None:
    """Read the memory row; lazily rebuild it when absent (old customers)."""
    async with async_session() as db:
        res = await db.execute(
            select(BusinessMemory).where(BusinessMemory.project_id == project_id)
        )
        memory = res.scalar_one_or_none()
        if memory is None:
            await rebuild_memory(project_id, owner_id)
            res = await db.execute(
                select(BusinessMemory).where(BusinessMemory.project_id == project_id)
            )
            memory = res.scalar_one_or_none()
        return memory


async def get_metric_trend(
    project_id: int, owner_id: int, metric: str
) -> list[dict]:
    memory = await get_memory(project_id, owner_id)
    if memory is None:
        return []
    if metric == "health_score":
        return list(memory.health_history or [])
    history = dict(memory.metric_history or {})
    return list(history.get(metric) or [])


def memory_ready(memory: BusinessMemory | None) -> bool:
    if memory is None:
        return False
    return bool(memory.metric_history or memory.health_history or memory.verification_history)


def log_memory_failure(context: dict, exc: Exception) -> None:
    logger.error(
        "business_memory_upsert_failed",
        extra={"event": "business_memory", **context},
        exc_info=exc,
    )


__all__ = [
    "ENGINE_VERSION",
    "AVAILABLE",
    "extract_latest_metrics",
    "extract_metric_points",
    "extract_health_point",
    "extract_verification_summary",
    "extract_issue_entries",
    "build_open_loops",
    "upsert_memory_after_run",
    "rebuild_memory",
    "get_memory",
    "get_metric_trend",
    "memory_ready",
    "log_memory_failure",
]
