"""M2.14.2 Business Memory Intelligence v1 (read-time, code-only).

Turns the enriched Business Memory v0 row into the "business improvement
analysis" layer: execution rates, verification coverage, alignment trend and
the improvement-evidence timeline.

Design rules (Lytio moat Layer 5):
- Every number is computed by code from stored facts. No AI anywhere.
- Improvement evidence is factual before/after observation, never a
  causation claim: no ``improvement`` / ``success`` / ``cause`` flags.
- ``unable_to_verify`` is split by reason (not_executed / metric_unavailable /
  insufficient_data) instead of being collapsed into a vague failure.
- Denominator == 0 -> ``null`` rates. Never fabricate 0.
- Pure functions of the memory row: calling twice yields identical output.
"""

from __future__ import annotations

from typing import Any

INTELLIGENCE_ENGINE_VERSION = "business_memory_intelligence_v1"
OBSERVATIONS_PER_RUN_CAP = 10

ALIGNED = "aligned"
NOT_ALIGNED = "not_aligned"
UNABLE_TO_VERIFY = "unable_to_verify"

# Fixed order for deterministic tie-breaking of per-action unable reasons.
UNABLE_REASON_ORDER = ("not_executed", "metric_unavailable", "insufficient_data")


# ---------------------------------------------------------------------------
# Rates (pure functions of the stored action_summary counters)
# ---------------------------------------------------------------------------

def execution_rates(summary: Any) -> dict[str, Any]:
    """Execution intelligence: total / executed / execution_rate.

    Denominator 0 -> ``execution_rate`` is ``None`` (never 0).
    """
    summary = summary if isinstance(summary, dict) else {}
    action_total = summary.get("total") or 0
    executed_count = summary.get("executed") or 0
    execution_rate = None
    if action_total > 0:
        execution_rate = round(executed_count / action_total, 4)
    return {
        "action_total": int(action_total),
        "executed_count": int(executed_count),
        "execution_rate": execution_rate,
        "source": "action_items+action_executions",
    }


def verification_rates(summary: Any) -> dict[str, Any]:
    """Verification intelligence with split unable reasons.

    total_verified_actions = actions carrying at least one observation.
    verified_count        = actions with at least one decisive (aligned /
                            not_aligned) observation.
    unable_to_verify_count = observed actions with no decisive observation.
    """
    summary = summary if isinstance(summary, dict) else {}
    total_verified = summary.get("total_verified_actions", summary.get("observed")) or 0
    verified_count = summary.get("verified_count") or 0
    unable_count = summary.get("unable_count") or 0
    verification_rate = None
    unable_rate = None
    if total_verified > 0:
        verification_rate = round(verified_count / total_verified, 4)
        unable_rate = round(unable_count / total_verified, 4)
    reasons = summary.get("unable_reasons") if isinstance(summary.get("unable_reasons"), dict) else {}
    return {
        "total_verified_actions": int(total_verified),
        "verified_count": int(verified_count),
        "verification_rate": verification_rate,
        "unable_to_verify_count": int(unable_count),
        "unable_rate": unable_rate,
        "unable_reasons": {
            reason: int(reasons.get(reason) or 0) for reason in UNABLE_REASON_ORDER
        },
        "source": "action_observations",
    }


def rates(summary: Any) -> dict[str, Any]:
    return {
        "execution": execution_rates(summary),
        "verification": verification_rates(summary),
    }


# ---------------------------------------------------------------------------
# Alignment trend + improvement-evidence timeline (pure, per verification run)
# ---------------------------------------------------------------------------

def _entry_alignment(entry: dict) -> dict[str, Any]:
    alignment = entry.get("alignment")
    if not isinstance(alignment, dict):
        return {
            "total": 0,
            "aligned": 0,
            "not_aligned": 0,
            "unable": 0,
        }
    return {
        "total": int(alignment.get("total") or 0),
        "aligned": int(alignment.get("aligned") or 0),
        "not_aligned": int(alignment.get("not_aligned") or 0),
        "unable": int(alignment.get("unable") or 0),
    }


def build_alignment_trend(verification_history: Any) -> list[dict[str, Any]]:
    """Per verification cycle alignment counts (code only, no AI judgement)."""
    history = verification_history if isinstance(verification_history, list) else []
    trend: list[dict[str, Any]] = []
    for entry in history:
        if not isinstance(entry, dict):
            continue
        alignment = _entry_alignment(entry)
        if alignment["total"] == 0:
            continue
        run_id = entry.get("run_id")
        parent_run_id = entry.get("parent_run_id")
        source_run_ids = [r for r in (run_id, parent_run_id) if r is not None]
        trend.append(
            {
                "period": entry.get("period"),
                "verification_run_id": run_id,
                "aligned_count": alignment["aligned"],
                "not_aligned_count": alignment["not_aligned"],
                "unable_count": alignment["unable"],
                "source_run_ids": source_run_ids,
            }
        )
    return trend


def build_improvement_timeline(verification_history: Any) -> list[dict[str, Any]]:
    """Improvement-evidence timeline.

    Each cycle carries its factual per-action observations (before/after,
    delta, direction, alignment). It never emits improvement/success/cause
    claims: aligned == "observed metric direction consistent with the action's
    target", nothing more.
    """
    history = verification_history if isinstance(verification_history, list) else []
    timeline: list[dict[str, Any]] = []
    for entry in history:
        if not isinstance(entry, dict):
            continue
        observations = entry.get("observations")
        if not isinstance(observations, list) or not observations:
            continue
        timeline.append(
            {
                "period": entry.get("period"),
                "verification_run_id": entry.get("run_id"),
                "parent_run_id": entry.get("parent_run_id"),
                "observation_count": len(observations),
                "observations": observations,
            }
        )
    return timeline


# ---------------------------------------------------------------------------
# Assembly (pure function of the memory row)
# ---------------------------------------------------------------------------

def build_intelligence(memory: Any) -> dict[str, Any]:
    """Full additive ``intelligence`` block for GET /api/projects/{id}/memory.

    Purely derived from the enriched memory row; never mutates it and never
    touches historical run data.
    """
    if memory is None:
        return {
            "engine_version": INTELLIGENCE_ENGINE_VERSION,
            "rates": {"execution": execution_rates(None), "verification": verification_rates(None)},
            "alignment_trend": [],
            "improvement_timeline": [],
            "open_loops": [],
        }
    return {
        "engine_version": INTELLIGENCE_ENGINE_VERSION,
        "rates": rates(getattr(memory, "action_summary", None)),
        "alignment_trend": build_alignment_trend(getattr(memory, "verification_history", None)),
        "improvement_timeline": build_improvement_timeline(getattr(memory, "verification_history", None)),
        "open_loops": list(getattr(memory, "open_loops", None) or []),
    }


__all__ = [
    "INTELLIGENCE_ENGINE_VERSION",
    "OBSERVATIONS_PER_RUN_CAP",
    "ALIGNED",
    "NOT_ALIGNED",
    "UNABLE_TO_VERIFY",
    "UNABLE_REASON_ORDER",
    "execution_rates",
    "verification_rates",
    "rates",
    "build_alignment_trend",
    "build_improvement_timeline",
    "build_intelligence",
]
