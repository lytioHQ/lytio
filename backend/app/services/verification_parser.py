"""Parse the Verification AI response into a strongly-typed ComparisonResult.

The AI is instructed to return a single JSON object (no markdown fences).
This parser is intentionally tolerant of malformed AI output, but never turns
missing metrics into numeric zeros: missing values remain ``None`` with
``status="unavailable"``.
"""

import json
import logging

from app.schemas.verification import (
    ComparisonResult,
    ExecutionGap,
    MetricChange,
    RecommendationResult,
)

logger = logging.getLogger(__name__)

_ALLOWED_DIRECTIONS = {"improved", "declined", "unchanged", "unavailable"}
_ALLOWED_REC_STATUSES = {"achieved", "partially_achieved", "not_achieved", "unable_to_verify"}
_ALLOWED_VERDICTS = {"effective", "partially_effective", "ineffective", "unable_to_verify"}
_ALLOWED_CONFIDENCES = {"high", "medium", "low"}


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


def parse_comparison(raw: str) -> ComparisonResult:
    """Parse raw AI JSON into a validated ComparisonResult.

    Falls back to a minimal "unable to verify" result if the AI output is not
    usable JSON, so a verification run is still persisted with an explicit,
    honest state instead of disappearing into a 500.
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

    return ComparisonResult(
        comparison_summary=_safe_str(data.get("comparison_summary")),
        verdict=verdict,
        metric_changes=metric_changes,
        recommendation_results=recommendation_results,
        execution_gap=execution_gap,
        confidence=_normalize_confidence(data.get("confidence")),
        limitations=[_safe_str(x) for x in _safe_list(data.get("limitations"))],
        next_actions=[_safe_str(x) for x in _safe_list(data.get("next_actions"))],
    )
