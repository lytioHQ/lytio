"""Parse AI response into structured SalesAnalysisResult.

V2: AI returns JSON matching AnalysisResult schema.
V1 (legacy): AI returns {"summary", "highlights", "warnings", "recommendations"}.
Both formats are supported for backward compatibility.
"""

import json
import logging
from dataclasses import dataclass, field

from app.schemas.business_objects import (
    AnalysisResult,
    BusinessHealth,
    Evidence,
    ExecutiveSummary,
    ExpectedImpact,
    Insight,
    Metric,
    Recommendation,
    Risk,
)
from app.services.object_identity import assign_ids_to_result

logger = logging.getLogger(__name__)


@dataclass
class SalesAnalysisResult:
    """Wrapper around AnalysisResult with metadata."""
    result: AnalysisResult | None = None
    summary: str = ""          # legacy
    highlights: list[str] = field(default_factory=list)   # legacy
    warnings: list[str] = field(default_factory=list)     # legacy
    recommendations: list[str] = field(default_factory=list)  # legacy
    metadata: dict = field(default_factory=dict)
    is_legacy: bool = False


def _strip_code_fences(raw: str) -> str:
    """Remove markdown code fences around a JSON block, if present."""
    candidate = raw.strip()
    if candidate.startswith("```"):
        lines = candidate.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        candidate = "\n".join(lines).strip()
    return candidate


def _parse_evidence(raw) -> Evidence | None:
    """Parse an Evidence object from AI JSON (may be absent or malformed)."""
    if not isinstance(raw, dict):
        return None
    return Evidence(
        source_sheet=str(raw.get("source_sheet", "")),
        source_range=str(raw.get("source_range", "")),
        source_columns=[str(c) for c in (raw.get("source_columns") or [])],
        source_rows=str(raw.get("source_rows", "")),
        reason=str(raw.get("reason", "")),
        confidence=str(raw.get("confidence", "")),
    )


def parse(response_summary: str, response_highlights: list[str],
          response_warnings: list[str], response_recommendations: list[str],
          metadata: dict) -> SalesAnalysisResult:
    """Parse AI response. Try V2 JSON first, fall back to legacy."""
    raw = response_summary.strip() if response_summary else ""
    candidates = [raw]
    stripped = _strip_code_fences(raw)
    if stripped != raw:
        candidates.insert(0, stripped)

    # Try to parse as V2 AnalysisResult JSON
    for candidate in candidates:
        if candidate.startswith("{"):
            try:
                data = json.loads(candidate)
                result = _parse_v2(data)
                return SalesAnalysisResult(
                    result=result,
                    summary=result.executive_summary.content if result.executive_summary else "",
                    highlights=[i.title for i in result.insights],
                    warnings=[r.title for r in result.risks],
                    recommendations=[r.title for r in result.recommendations],
                    metadata=metadata,
                    is_legacy=False,
                )
            except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
                logger.warning("V2 JSON parse failed, falling back to legacy: %s", e)

    # Legacy format: plain text or old JSON
    return SalesAnalysisResult(
        summary=raw if raw else "No analysis available.",
        highlights=_clean_list(response_highlights),
        warnings=_clean_list(response_warnings),
        recommendations=_clean_list(response_recommendations),
        metadata=metadata,
        is_legacy=True,
    )


def _parse_v2(data: dict) -> AnalysisResult:
    """Parse V2 JSON into typed AnalysisResult."""
    bh_raw = data.get("business_health", {})
    business_health = None
    if bh_raw and isinstance(bh_raw, dict):
        business_health = BusinessHealth(
            score=int(bh_raw.get("score", 50)),
            level=str(bh_raw.get("level", "Fair")),
            summary=str(bh_raw.get("summary", "")),
        )

    metrics = []
    for m in (data.get("metrics") or []):
        if isinstance(m, dict):
            metrics.append(Metric(
                name=str(m.get("name", "")),
                value=str(m.get("value", "")),
                trend=str(m.get("trend", "stable")),
            ))

    insights = []
    for i in (data.get("insights") or []):
        if isinstance(i, dict):
            insights.append(Insight(
                title=str(i.get("title", "")),
                description=str(i.get("description", "")),
                confidence=str(i.get("confidence", "medium")),
                evidence=_parse_evidence(i.get("evidence")),
            ))

    risks = []
    for r in (data.get("risks") or []):
        if isinstance(r, dict):
            risks.append(Risk(
                title=str(r.get("title", "")),
                description=str(r.get("description", "")),
                severity=str(r.get("severity", "medium")),
                evidence=_parse_evidence(r.get("evidence")),
            ))

    recs = []
    for r in (data.get("recommendations") or []):
        if isinstance(r, dict):
            ei = r.get("expected_impact")
            expected_impact = None
            if ei and isinstance(ei, dict):
                expected_impact = ExpectedImpact(
                    business_health_change=str(ei.get("business_health_change", "")),
                    risk_change=str(ei.get("risk_change", "")),
                    expected_result=str(ei.get("expected_result", "")),
                    confidence=str(ei.get("confidence", "")),
                )
            recs.append(Recommendation(
                title=str(r.get("title", "")),
                description=str(r.get("description", "")),
                priority=str(r.get("priority", "medium")),
                evidence=_parse_evidence(r.get("evidence")),
                expected_impact=expected_impact,
            ))

    es_raw = data.get("executive_summary", {})
    exec_summary = None
    if es_raw and isinstance(es_raw, dict):
        exec_summary = ExecutiveSummary(content=str(es_raw.get("content", "")))

    result = AnalysisResult(
        business_health=business_health,
        metrics=metrics,
        insights=insights,
        risks=risks,
        recommendations=recs,
        executive_summary=exec_summary,
    )
    assign_ids_to_result(result)
    return result


def _clean_list(items: list[str]) -> list[str]:
    return [item.strip() for item in items if item and item.strip()]