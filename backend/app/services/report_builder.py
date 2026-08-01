"""Pure transformation: AnalysisResult -> ExecutiveReport. No AI."""

from datetime import datetime, timezone
from app.schemas.business_objects import AnalysisResult
from app.schemas.executive_report import ExecutiveReport


def build_report(
    result: AnalysisResult,
    project_name: str = "",
    title: str = "Executive Report",
) -> ExecutiveReport:
    return ExecutiveReport(
        title=title,
        generated_at=datetime.now(timezone.utc),
        project_name=project_name,
        business_health=result.business_health,
        executive_summary=result.executive_summary,
        key_metrics=result.metrics,
        top_insights=result.insights,
        top_risks=result.risks,
        top_recommendations=result.recommendations,
        is_legacy=result.is_legacy,
    )


def build_report_from_json(
    result_json: str,
    project_name: str = "",
    title: str = "Executive Report",
) -> ExecutiveReport | None:
    """Build report from stored JSON string."""
    import json
    try:
        data = json.loads(result_json)
        result = AnalysisResult.model_validate(data)
        return build_report(result, project_name, title)
    except Exception:
        return None