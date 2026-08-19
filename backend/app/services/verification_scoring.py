"""M2.13.0 - transparent, code-computed verdict for verification comparisons.

The AI never decides the verdict. This module derives a verdict from the
system-computed metric changes using a simple, documented rule.

Rule (``verification_reliability_v1``):
- comparable  = changes with status "available" and a known direction
- aligned     = comparable changes whose direction is "improved"
- aligned_share = aligned / len(comparable)
- no comparable metrics        -> unable_to_verify (no evidence)
- fewer than 2 comparable      -> unable_to_verify (insufficient data)
- aligned_share >= 0.50        -> partially_effective
      confidence high if >= 0.75 else medium
- aligned_share <  0.20        -> ineffective (medium confidence)
- otherwise (ambiguous)        -> unable_to_verify (low confidence)

The verdict expresses observed alignment with the business-improvement
direction only. It never claims causation.
"""

from __future__ import annotations

from typing import Any

ENGINE_VERSION = "verification_reliability_v1"

_KNOWN_DIRECTIONS = frozenset({"improved", "declined", "unchanged"})


def _direction_of(change: Any) -> Any:
    if isinstance(change, dict):
        return change.get("direction")
    return getattr(change, "direction", None)


def _status_of(change: Any) -> Any:
    if isinstance(change, dict):
        return change.get("status")
    return getattr(change, "status", None)


def _comparable(changes: list[dict[str, Any]] | list[Any]) -> list[Any]:
    """Return changes with status "available" and a known direction.

    Accepts plain dicts (system-computed) and pydantic MetricChange objects.
    """
    out: list[Any] = []
    for change in changes:
        if _status_of(change) != "available":
            continue
        if _direction_of(change) in _KNOWN_DIRECTIONS:
            out.append(change)
    return out


def score_verdict(metric_changes: list[dict[str, Any]]) -> tuple[str, str]:
    """Return ``(verdict, confidence)`` per ``verification_reliability_v1``.

    ``metric_changes`` may be dicts (system-computed) or pydantic objects.
    """
    comparable = _comparable(metric_changes)
    if not comparable:
        return "unable_to_verify", ""

    improved = sum(1 for c in comparable if _direction_of(c) == "improved")
    aligned_share = improved / len(comparable)

    if len(comparable) < 2:
        return "unable_to_verify", "low"
    if aligned_share >= 0.5:
        confidence = "high" if aligned_share >= 0.75 else "medium"
        return "partially_effective", confidence
    if aligned_share < 0.2:
        return "ineffective", "medium"
    return "unable_to_verify", "low"


def apply_code_verdict(comparison: Any, computed_changes: list[dict] | list[Any]) -> Any:
    """M2.13.0 hardening: the effectiveness verdict is always code-derived.

    The AI never decides the verdict. With system evidence the verdict comes
    from ``verification_reliability_v1``; without evidence it is honestly
    ``unable_to_verify``. Only the verdict and its confidence are replaced;
    the AI's explanation text is left untouched.
    """
    if computed_changes:
        verdict, confidence = score_verdict(computed_changes)
    else:
        verdict, confidence = "unable_to_verify", ""
    comparison.verdict = verdict
    comparison.confidence = confidence
    return comparison


def fallback_summary(language: str = "zh") -> str:
    """Deterministic, honest summary for the computed-fallback path."""
    messages = {
        "zh": "AI 解释暂不可用，以下为系统计算的指标变化（代码计算，AI 未参与数值）。",
        "en": "AI explanation is temporarily unavailable. Shown below are system-computed metric changes (calculated by code; AI played no part in the numbers).",
        "ja": "AI による説明を利用できません。以下はシステムが計算した指標変化です（コードで計算され、AI は数値に関与していません）。",
        "de": "Die KI-Erklärung ist derzeit nicht verfügbar. Nachfolgend systemberechnete Kennzahlenänderungen (vom Code berechnet; die KI war an den Zahlen nicht beteiligt).",
    }
    return messages.get(language, messages["en"])
