"""M2.13.2 Business Memory Consumption — pure context builder.

Turns the Business Memory v0 derived cache into a compact, versioned
``memory_context`` consumed by the analysis prompt and the Executive
"business change" view.

Design rules (Lytio moat Layer 5):
- Derived on demand from memory + actions; never an authoritative source.
- Pure computation: no AI, no I/O, no mutation of memory or run data.
- Fixed schema ``memory_context_v1`` with source run ids per section.
- Length-capped rendering; over-cap sections are dropped in priority order
  (issues -> actions -> verification -> health -> metric trends), never
  truncated mid-line.
- Historical facts are strictly separated from current-period data in the
  prompt; every number here must come from system computation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

MEMORY_CONTEXT_VERSION = "memory_context_v1"
MEMORY_CONTEXT_CHAR_CAP = 1200
TREND_FLAT_PCT = 0.5
METRIC_TREND_MAX = 6
ISSUE_CONTEXT_MAX = 5
ACTION_RECENT_MAX = 3

AVAILABLE = "available"
DIRECTION_UP = "up"
DIRECTION_DOWN = "down"
DIRECTION_FLAT = "flat"
DIRECTION_INSUFFICIENT = "insufficient"

_CONFIDENCE_RANK = {"high": 3, "medium": 2, "low": 1}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Point extraction (pure, defensive)
# ---------------------------------------------------------------------------

def _metric_points(history: Any) -> list[dict]:
    """Available metric points with a value, sorted by run_id ascending."""
    if not isinstance(history, list):
        return []
    usable = [
        p for p in history
        if isinstance(p, dict)
        and p.get("availability") == AVAILABLE
        and p.get("value") is not None
    ]
    usable.sort(key=lambda p: p.get("run_id") or 0)
    return usable


def _health_points(history: Any) -> list[dict]:
    """Health points with a score, sorted by run_id ascending."""
    if not isinstance(history, list):
        return []
    usable = [p for p in history if isinstance(p, dict) and p.get("score") is not None]
    usable.sort(key=lambda p: p.get("run_id") or 0)
    return usable


def _verification_points(history: Any) -> list[dict]:
    if not isinstance(history, list):
        return []
    usable = [p for p in history if isinstance(p, dict)]
    usable.sort(key=lambda p: p.get("run_id") or 0)
    return usable


def _source_run_ids(points: list[dict]) -> list[int]:
    return [int(p["run_id"]) for p in points if p.get("run_id") is not None]


def _lower_confidence(*values: Any) -> Any:
    present = [v for v in values if v is not None]
    if not present:
        return None
    if any(v not in _CONFIDENCE_RANK for v in present):
        return None
    return min(present, key=lambda v: _CONFIDENCE_RANK[v])


def _usable_run_ids(
    metric_history: Any,
    health_history: Any,
    verification_history: Any,
) -> set[int]:
    ids: set[int] = set()
    if isinstance(metric_history, dict):
        for pts in metric_history.values():
            ids.update(_source_run_ids(_metric_points(pts)))
    ids.update(_source_run_ids(_health_points(health_history)))
    ids.update(_source_run_ids(_verification_points(verification_history)))
    return ids


def periods_used(
    metric_history: Any,
    health_history: Any,
    verification_history: Any,
) -> int:
    """Distinct historical runs carrying at least one usable value."""
    return len(_usable_run_ids(metric_history, health_history, verification_history))


def latest_run_id(
    metric_history: Any,
    health_history: Any,
    verification_history: Any,
) -> int | None:
    ids = _usable_run_ids(metric_history, health_history, verification_history)
    return max(ids) if ids else None


# ---------------------------------------------------------------------------
# Trend computations (all code, all source-attributed)
# ---------------------------------------------------------------------------

def compute_metric_trends(metric_history: Any) -> list[dict]:
    """Per-metric latest / previous / delta / percent / direction."""
    if not isinstance(metric_history, dict):
        return []
    trends: list[dict] = []
    for name in sorted(metric_history.keys()):
        pts = _metric_points(metric_history.get(name))
        if not pts:
            continue
        latest = pts[-1]
        prev = pts[-2] if len(pts) >= 2 else None
        trend: dict[str, Any] = {
            "metric_name": name,
            "latest": latest.get("value"),
            "previous": prev.get("value") if prev else None,
            "absolute_delta": None,
            "percent_delta": None,
            "direction": DIRECTION_INSUFFICIENT,
            "period_count": len(pts),
            "latest_period": latest.get("period") or None,
            "availability": latest.get("availability", AVAILABLE),
            "confidence": latest.get("confidence"),
            "source_run_ids": _source_run_ids(pts[-2:]),
        }
        if prev is not None:
            latest_v = latest["value"]
            prev_v = prev["value"]
            if isinstance(latest_v, (int, float)) and isinstance(prev_v, (int, float)):
                trend["absolute_delta"] = round(latest_v - prev_v, 4)
                if prev_v != 0:
                    trend["percent_delta"] = round(
                        (latest_v - prev_v) / abs(prev_v) * 100, 1
                    )
                    if abs(trend["percent_delta"]) < TREND_FLAT_PCT:
                        trend["direction"] = DIRECTION_FLAT
                    elif trend["percent_delta"] > 0:
                        trend["direction"] = DIRECTION_UP
                    else:
                        trend["direction"] = DIRECTION_DOWN
                else:
                    trend["direction"] = (
                        DIRECTION_UP if latest_v > 0 else DIRECTION_DOWN
                    )
                trend["confidence"] = _lower_confidence(
                    latest.get("confidence"), prev.get("confidence")
                )
        trends.append(trend)
    trends.sort(
        key=lambda t: (
            t["direction"] == DIRECTION_INSUFFICIENT,
            -t.get("period_count") or 0,
            str(t.get("metric_name")),
        )
    )
    return trends[:METRIC_TREND_MAX]


def compute_health_trend(health_history: Any) -> dict | None:
    pts = _health_points(health_history)
    if not pts:
        return None
    latest = pts[-1]
    prev = pts[-2] if len(pts) >= 2 else None
    out: dict[str, Any] = {
        "latest_score": latest.get("score"),
        "previous_score": prev.get("score") if prev else None,
        "delta": None,
        "direction": DIRECTION_INSUFFICIENT,
        "latest_level": latest.get("level"),
        "score_confidence": latest.get("confidence") or latest.get("score_confidence"),
        "period_count": len(pts),
        "source_run_ids": _source_run_ids(pts[-2:]),
    }
    if prev is not None:
        delta = latest.get("score") - prev.get("score")
        out["delta"] = round(delta, 2)
        out["direction"] = (
            DIRECTION_FLAT if delta == 0 else (DIRECTION_UP if delta > 0 else DIRECTION_DOWN)
        )
    return out


def compute_action_trend(action_summary: Any, open_loops: Any) -> dict:
    summary = action_summary if isinstance(action_summary, dict) else {}
    loops = open_loops if isinstance(open_loops, list) else []
    total = summary.get("total") or 0
    completed = summary.get("completed") or 0
    verified = summary.get("verified") or 0
    pending = summary.get("pending") or 0
    cancelled = summary.get("cancelled") or 0
    verification_rate = round(verified / completed, 2) if completed else 0.0
    pending_loops = [
        l for l in loops
        if isinstance(l, dict) and l.get("type") == "pending_action"
    ]
    return {
        "total_actions": total,
        "pending": pending,
        "completed": completed,
        "cancelled": cancelled,
        "verified": verified,
        "verification_rate": verification_rate,
        "open_loops": len(pending_loops),
        "source": "action_items",
    }


def compute_verification_trend(verification_history: Any) -> dict | None:
    pts = _verification_points(verification_history)
    if not pts:
        return None
    latest = pts[-1]
    prev = pts[-2] if len(pts) >= 2 else None
    changes = latest.get("metric_changes") or []
    change_summary: list[dict] = []
    for c in changes[:5]:
        if isinstance(c, dict):
            change_summary.append(
                {
                    "metric_name": c.get("metric_name") or c.get("metric"),
                    "direction": c.get("direction"),
                }
            )
    return {
        "latest_verdict": latest.get("verdict"),
        "previous_verdict": prev.get("verdict") if prev else None,
        "latest_reliability": latest.get("reliability"),
        "latest_confidence": latest.get("confidence"),
        "verified_recommendations": len(changes),
        "metric_changes_summary": change_summary,
        "source_run_ids": _source_run_ids(pts[-2:]),
    }


def _issue_summary(issue_tracker: Any, open_loops: Any) -> dict:
    tracker = issue_tracker if isinstance(issue_tracker, list) else []
    unresolved: list[dict] = []
    for e in tracker:
        if not isinstance(e, dict) or e.get("status") != "open":
            continue
        unresolved.append(
            {
                "title": e.get("title"),
                "priority": e.get("priority"),
                "first_seen_run_id": e.get("first_seen_run_id"),
            }
        )
    loops = open_loops if isinstance(open_loops, list) else []
    pending_actions = [
        l for l in loops
        if isinstance(l, dict) and l.get("type") == "pending_action"
    ]
    return {
        "open_issues": len(unresolved),
        "unresolved": unresolved[:ISSUE_CONTEXT_MAX],
        "pending_actions": pending_actions[:ISSUE_CONTEXT_MAX],
    }


# ---------------------------------------------------------------------------
# Context assembly
# ---------------------------------------------------------------------------

def build_trend_deltas(
    metric_history: Any,
    health_history: Any,
    action_summary: Any,
    open_loops: Any,
    verification_history: Any,
) -> dict:
    """Structured deltas for the Executive "business change" view."""
    return {
        "metric_trends": compute_metric_trends(metric_history),
        "health_trend": compute_health_trend(health_history),
        "action_trend": compute_action_trend(action_summary, open_loops),
        "verification_trend": compute_verification_trend(verification_history),
        "periods_used": periods_used(metric_history, health_history, verification_history),
        "latest_run_id": latest_run_id(metric_history, health_history, verification_history),
    }


def build_memory_context(
    metric_history: Any = None,
    health_history: Any = None,
    action_summary: Any = None,
    open_loops: Any = None,
    verification_history: Any = None,
    issue_tracker: Any = None,
) -> dict:
    """Pure build of ``memory_context_v1`` from memory-derived inputs."""
    metric_trends = compute_metric_trends(metric_history)
    health_trend = compute_health_trend(health_history)
    action_trend = compute_action_trend(action_summary, open_loops)
    verification_trend = compute_verification_trend(verification_history)
    issues = _issue_summary(issue_tracker, open_loops)
    used = periods_used(metric_history, health_history, verification_history)
    latest = latest_run_id(metric_history, health_history, verification_history)
    if used == 0 and not action_trend.get("total_actions"):
        return {
            "version": MEMORY_CONTEXT_VERSION,
            "periods_used": 0,
            "latest_run_id": None,
            "empty": True,
        }
    return {
        "version": MEMORY_CONTEXT_VERSION,
        "periods_used": used,
        "latest_run_id": latest,
        "empty": False,
        "metric_trends": metric_trends,
        "health_trend": health_trend,
        "action_trend": action_trend,
        "verification_trend": verification_trend,
        "issues": issues,
    }


def context_from_memory(memory: Any) -> dict:
    """Convenience adapter: build the context from a BusinessMemory row."""
    if memory is None:
        return build_memory_context()
    return build_memory_context(
        metric_history=getattr(memory, "metric_history", None),
        health_history=getattr(memory, "health_history", None),
        action_summary=getattr(memory, "action_summary", None),
        open_loops=getattr(memory, "open_loops", None),
        verification_history=getattr(memory, "verification_history", None),
        issue_tracker=getattr(memory, "issue_tracker", None),
    )


# ---------------------------------------------------------------------------
# Rendering (compact, length-capped, section-priority trimming)
# ---------------------------------------------------------------------------

def _render_sections(context: dict) -> list[str]:
    header = (
        f"version: {context.get('version')}, "
        f"periods_used: {context.get('periods_used')}, "
        f"latest_run_id: {context.get('latest_run_id')}"
    )
    sections = [header]
    metric_trends = context.get("metric_trends") or []
    if metric_trends:
        lines = ["metric trends (historical):"]
        for tr in metric_trends:
            pct = tr.get("percent_delta")
            pct_s = f"{pct:+.1f}%" if pct is not None else "n/a"
            lines.append(
                f"  {tr.get('metric_name')}: latest={tr.get('latest')}, "
                f"previous={tr.get('previous')}, delta={pct_s}, "
                f"direction={tr.get('direction')}, periods={tr.get('period_count')}"
            )
        sections.append("\n".join(lines))
    ht = context.get("health_trend")
    if ht:
        sections.append(
            f"health: latest={ht.get('latest_score')} ({ht.get('latest_level')}), "
            f"previous={ht.get('previous_score')}, delta={ht.get('delta')}, "
            f"direction={ht.get('direction')}, periods={ht.get('period_count')}"
        )
    vt = context.get("verification_trend")
    if vt:
        sections.append(
            f"verification: latest_verdict={vt.get('latest_verdict')}, "
            f"previous_verdict={vt.get('previous_verdict')}, "
            f"reliability={vt.get('latest_reliability')}, "
            f"verified_recommendations={vt.get('verified_recommendations')}, "
            f"confidence={vt.get('latest_confidence')}"
        )
    at = context.get("action_trend") or {}
    if at.get("total_actions"):
        sections.append(
            f"actions: total={at.get('total_actions')}, pending={at.get('pending')}, "
            f"completed={at.get('completed')}, cancelled={at.get('cancelled')}, "
            f"verified={at.get('verified')}, verification_rate={at.get('verification_rate')}, "
            f"open_loops={at.get('open_loops')}"
        )
    issues = context.get("issues") or {}
    if issues.get("open_issues"):
        unresolved = "; ".join(
            f"{u.get('title')} (run {u.get('first_seen_run_id')}, {u.get('priority')})"
            for u in issues.get("unresolved") or []
        )
        sections.append(f"issues: {issues.get('open_issues')} open ({unresolved})")
    return sections


def render_memory_context(context: dict | None) -> str:
    """Compact text form of the context; never truncated mid-line."""
    if not context or context.get("empty"):
        return ""
    sections = _render_sections(context)
    cap = MEMORY_CONTEXT_CHAR_CAP
    # Drop lowest-priority sections (issues -> actions -> verification ->
    # health -> metric trends) until the text fits; header always retained.
    while len("\n".join(sections)) > cap and len(sections) > 1:
        sections.pop()
    return "\n".join(sections)


def build_context_meta(
    context: dict | None, injected: bool, length_chars: int = 0
) -> dict:
    if not context:
        return {
            "version": MEMORY_CONTEXT_VERSION,
            "periods_used": 0,
            "latest_run_id": None,
            "generated_at": _now_iso(),
            "length_chars": 0,
            "injected": False,
        }
    return {
        "version": context.get("version", MEMORY_CONTEXT_VERSION),
        "periods_used": context.get("periods_used") or 0,
        "latest_run_id": context.get("latest_run_id"),
        "generated_at": _now_iso(),
        "length_chars": length_chars,
        "injected": injected,
    }


__all__ = [
    "MEMORY_CONTEXT_VERSION",
    "MEMORY_CONTEXT_CHAR_CAP",
    "TREND_FLAT_PCT",
    "METRIC_TREND_MAX",
    "AVAILABLE",
    "DIRECTION_UP",
    "DIRECTION_DOWN",
    "DIRECTION_FLAT",
    "DIRECTION_INSUFFICIENT",
    "periods_used",
    "latest_run_id",
    "compute_metric_trends",
    "compute_health_trend",
    "compute_action_trend",
    "compute_verification_trend",
    "build_trend_deltas",
    "build_memory_context",
    "context_from_memory",
    "render_memory_context",
    "build_context_meta",
]
