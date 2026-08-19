"""Parse the Verification AI response into a strongly-typed ComparisonResult.

The AI is instructed to return a single JSON object (no markdown fences).
This parser is intentionally tolerant of malformed AI output, but never turns
missing metrics into numeric zeros: missing values remain ``None`` with
``status="unavailable"``.

M2.13.0 additions (additive, backward compatible):
- ``is_usable_comparison``: decides whether the AI output is usable at all.
- ``merge_computed_changes``: system-computed (code) metric changes always
  win over AI numbers; AI interpretations are preserved; AI-invented metrics
  that do not map to a system metric are dropped (AI never creates numbers).
- ``build_computed_fallback``: deterministic ComparisonResult derived from
  system-computed changes when AI output is unusable, with a transparent
  code-computed verdict (verification_reliability_v1).
"""

import json
import logging

from app.schemas.verification import (
    ComparisonResult,
    ExecutionGap,
    MetricChange,
    RecommendationResult,
)
from app.services import verification_metrics
from app.services import verification_scoring

logger = logging.getLogger(__name__)

_ALLOWED_DIRECTIONS = {"improved", "declined", "unchanged", "unavailable"}
_ALLOWED_REC_STATUSES = {"achieved", "partially_achieved", "not_achieved", "unable_to_verify"}
_ALLOWED_VERDICTS = {"effective", "partially_effective", "ineffective", "unable_to_verify"}
_ALLOWED_CONFIDENCES = {"high", "medium", "low"}

RELIABILITY_AI = "ai"
RELIABILITY_AI_RETRY = "ai_retry"
RELIABILITY_COMPUTED_FALLBACK = "computed_fallback"


def _strip_code_fences(raw: str) -> str:
    candidate = (raw or "").strip()
    if candidate.startswith("```"):
        lines = candidate.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()
    return candidate


def _safe_str(value, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def _safe_list(value) -> list:
    if isinstance(value, list):
        return value
    return []


def _is_available(value) -> bool:
    return value is not None and value != ""


def _normalize_confidence(value) -> str:
    confidence = _safe_str(value)
    return confidence if confidence in _ALLOWED_CONFIDENCES else ""


def is_usable_comparison(raw: str | None) -> bool:
    """Return True when the AI output is usable as a comparison report.

    Usable means: parses to a JSON object with at least one substantive field.
    Empty responses, provider error markers, plain prose and ``{}`` are not
    usable and trigger the reliability fallback path.
    """
    text = _strip_code_fences(raw or "")
    if not text or text.startswith("Analysis failed:"):
        return False
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return False
    if not isinstance(data, dict):
        return False
    return bool(
        _safe_str(data.get("comparison_summary")).strip()
        or _safe_list(data.get("metric_changes"))
        or _safe_list(data.get("next_actions"))
    )


def _as_metric_change(item: dict) -> MetricChange:
    return MetricChange(
        metric_name=_safe_str(item.get("metric_name")),
        before=item.get("before"),
        after=item.get("after"),
        absolute_change=item.get("absolute_change"),
        percentage_change=item.get("percentage_change"),
        direction=_safe_str(item.get("direction"), "unavailable"),
        status=_safe_str(item.get("status"), "unavailable"),
        interpretation=_safe_str(item.get("interpretation")),
    )


def merge_computed_changes(
    comparison: ComparisonResult, computed_changes: list[dict]
) -> ComparisonResult:
    """Merge system-computed changes into an AI comparison.

    Rules (AI boundary):
    - System numbers/direction/status always win for a known metric.
    - The AI's interpretation text is preserved when provided.
    - AI metrics that do not resolve to a system metric are dropped.
    - System metrics missing from the AI output are appended.
    """
    if not computed_changes:
        return comparison

    computed_by_key = {c["metric_name"]: c for c in computed_changes if c.get("metric_name")}
    merged: list[MetricChange] = []
    used_keys: set[str] = set()

    for ai_change in comparison.metric_changes:
        key = verification_metrics.resolve_metric_key(ai_change.metric_name)
        if key is None:
            continue  # AI-invented metric: drop, AI never creates numbers
        system_change = computed_by_key.get(key)
        if system_change is None:
            continue
        merged.append(
            MetricChange(
                metric_name=ai_change.metric_name or system_change["metric_name"],
                before=system_change.get("before"),
                after=system_change.get("after"),
                absolute_change=system_change.get("absolute_change"),
                percentage_change=system_change.get("percentage_change"),
                direction=system_change.get("direction", "unavailable"),
                status=system_change.get("status", "unavailable"),
                interpretation=ai_change.interpretation or "",
            )
        )
        used_keys.add(key)

    for key, system_change in computed_by_key.items():
        if key in used_keys:
            continue
        merged.append(_as_metric_change(system_change))

    comparison.metric_changes = merged
    comparison.computed_metric_changes = [_as_metric_change(c) for c in computed_changes]
    return comparison


def build_computed_fallback(
    computed_changes: list[dict],
    *,
    language: str = "zh",
    reason: str = "",
) -> ComparisonResult:
    """Deterministic ComparisonResult from system-computed changes.

    Used when AI output is unusable after retry. The verdict comes from the
    transparent ``verification_reliability_v1`` code rule - never from AI.
    """
    changes = [_as_metric_change(c) for c in computed_changes]
    verdict, confidence = verification_scoring.score_verdict(changes)
    limitations: list[str] = []
    if reason:
        limitations.append(f"AI explanation unavailable: {reason[:200]}")
    return ComparisonResult(
        comparison_summary=verification_scoring.fallback_summary(language),
        verdict=verdict,
        metric_changes=changes,
        recommendation_results=[],
        execution_gap=[],
        confidence=confidence,
        limitations=limitations,
        next_actions=[],
        computed_metric_changes=changes,
        reliability=RELIABILITY_COMPUTED_FALLBACK,
    )


def parse_comparison(
    raw: str,
    *,
    computed_changes: list[dict] | None = None,
    reliability: str = RELIABILITY_AI,
) -> ComparisonResult:
    """Parse raw AI JSON into a validated ComparisonResult.

    Falls back to a minimal "unable to verify" result if the AI output is not
    usable JSON, so a verification run is still persisted with an explicit,
    honest state instead of disappearing into a 500.

    When ``computed_changes`` is provided, system numbers win over AI numbers
    and the computed evidence is attached to the result.
    """
    text = _strip_code_fences(raw)
    data: dict = {}
    if text:
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                data = parsed
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning("Verification JSON parse failed: %s", exc)

    metric_changes: list[MetricChange] = []
    for item in _safe_list(data.get("metric_changes")):
        if not isinstance(item, dict):
            continue
        before = item.get("before")
        after = item.get("after")
        available = _is_available(before) or _is_available(after)
        direction = _safe_str(item.get("direction"), "unchanged")
        if direction not in _ALLOWED_DIRECTIONS:
            direction = "unavailable" if not available else "unchanged"
        metric_changes.append(
            MetricChange(
                metric_name=_safe_str(item.get("metric_name"), ""),
                before=before,
                after=after,
                absolute_change=item.get("absolute_change"),
                percentage_change=item.get("percentage_change"),
                direction=direction,
                status="available" if available else "unavailable",
                interpretation=_safe_str(item.get("interpretation")),
            )
        )

    recommendation_results: list[RecommendationResult] = []
    for item in _safe_list(data.get("recommendation_results")):
        if not isinstance(item, dict):
            continue
        status = _safe_str(item.get("status"), "unable_to_verify")
        if status not in _ALLOWED_REC_STATUSES:
            status = "unable_to_verify"
        recommendation_results.append(
            RecommendationResult(
                recommendation=_safe_str(item.get("recommendation")),
                status=status,
                evidence=_safe_str(item.get("evidence")),
                confidence=_normalize_confidence(item.get("confidence")),
                reason=_safe_str(item.get("reason")),
            )
        )

    execution_gap: list[ExecutionGap] = []
    for item in _safe_list(data.get("execution_gap")):
        if isinstance(item, dict):
            execution_gap.append(
                ExecutionGap(
                    issue=_safe_str(item.get("issue")),
                    reason=_safe_str(item.get("reason")),
                )
            )
        elif isinstance(item, str) and item.strip():
            execution_gap.append(ExecutionGap(issue=item.strip()))

    verdict = _safe_str(data.get("verdict"), "unable_to_verify")
    if verdict not in _ALLOWED_VERDICTS:
        verdict = "unable_to_verify"

    comparison = ComparisonResult(
        comparison_summary=_safe_str(data.get("comparison_summary")),
        verdict=verdict,
        metric_changes=metric_changes,
        recommendation_results=recommendation_results,
        execution_gap=execution_gap,
        confidence=_normalize_confidence(data.get("confidence")),
        limitations=[_safe_str(x) for x in _safe_list(data.get("limitations"))],
        next_actions=[_safe_str(x) for x in _safe_list(data.get("next_actions"))],
        reliability=reliability,
    )

    if computed_changes:
        comparison = merge_computed_changes(comparison, computed_changes)
    return comparison