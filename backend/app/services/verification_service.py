"""Business logic for the M2.11 Verification Workflow.

Responsibilities:
- resolve and isolate the parent (baseline) AnalysisRun
- extract the parent business context (health / metrics / recommendations)
- build the verification prompt
- compute deterministic dataset versions
"""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis_run import AnalysisRun
from app.schemas.verification import VERIFICATION_PURPOSES

VERIFICATION_PROMPT_DIR = Path(__file__).resolve().parent.parent.parent / "prompts" / "sales"
VERIFICATION_PROMPT = "verification_v1"

LANG_INSTRUCTIONS = {
    "zh": "Respond in Chinese (\u4e2d\u6587).",
    "en": "Respond in English.",
    "ja": "Respond in Japanese (\u65e5\u672c\u8a9e).",
    "de": "Respond in German (Deutsch).",
}

BASELINE_TYPES = ("health_scan", "deep_analysis")


def _parse_result_json(result_json: str | None) -> dict:
    if not result_json:
        return {}
    try:
        data = json.loads(result_json)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _list_of_dicts(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def extract_parent_context(parent_run: AnalysisRun) -> dict:
    """Return a compact, AI-safe context of the parent analysis."""
    data = _parse_result_json(parent_run.result_json)

    executive_summary = data.get("executive_summary") or {}
    business_health = data.get("business_health") or {}
    metrics = _list_of_dicts(data.get("metrics"))
    recommendations = _list_of_dicts(data.get("recommendations"))
    insights = _list_of_dicts(data.get("insights"))
    risks = _list_of_dicts(data.get("risks"))

    context: dict = {
        "analysis_type": data.get("analysis_type") or parent_run.analysis_type,
        "analysis_direction": data.get("analysis_direction") or parent_run.analysis_direction,
        "summary": (
            executive_summary.get("content")
            if isinstance(executive_summary, dict)
            else parent_run.summary or ""
        ),
        "business_health": {
            "score": business_health.get("score"),
            "level": business_health.get("level", ""),
            "summary": business_health.get("summary", ""),
        }
        if isinstance(business_health, dict)
        else None,
        "metrics": [
            {
                "name": m.get("name", ""),
                "value": m.get("value", ""),
                "trend": m.get("trend", "stable"),
            }
            for m in metrics
        ],
        "recommendations": [
            {
                "title": r.get("title", ""),
                "description": r.get("description", ""),
                "expected_impact": r.get("expected_impact"),
                "priority": r.get("priority", ""),
            }
            for r in recommendations
        ],
        "insights": [i.get("title", "") for i in insights],
        "risks": [r.get("title", "") for r in risks],
    }
    return context


def build_verification_prompt(parent_context: dict, purpose: str, language: str) -> str:
    """Render the verification prompt template with parent context."""
    template_path = VERIFICATION_PROMPT_DIR / f"{VERIFICATION_PROMPT}.md"
    if not template_path.exists():
        raise FileNotFoundError(f"Verification prompt template not found: {template_path}")

    template = template_path.read_text(encoding="utf-8")
    lang_instr = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    parent_json = json.dumps(parent_context, ensure_ascii=False, indent=2)

    return (
        template
        .replace("{{language_instruction}}", lang_instr)
        .replace("{{purpose}}", purpose)
        .replace("{{parent_analysis}}", parent_json)
    )


async def resolve_parent_run(
    db: AsyncSession, project_id: int, parent_run_id: int | None
) -> AnalysisRun | None:
    """Resolve the baseline run to verify, with a deterministic fallback.

    When ``parent_run_id`` is omitted, choose the most recent run that carries
    recommendations (health_scan or deep_analysis). The API records the actual
    selected ``parent_run_id`` on the resulting job/run.
    """
    if parent_run_id is not None:
        result = await db.execute(
            select(AnalysisRun).where(
                AnalysisRun.id == parent_run_id,
                AnalysisRun.project_id == project_id,
            )
        )
        run = result.scalar_one_or_none()
        if run is None:
            return None
        return run if run.analysis_type in BASELINE_TYPES or _has_recommendations(run) else None

    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.project_id == project_id)
        .order_by(AnalysisRun.created_at.desc())
        .limit(50)
    )
    for run in result.scalars().all():
        if run.analysis_type in BASELINE_TYPES and _has_recommendations(run):
            return run
    return None


def _has_recommendations(run: AnalysisRun) -> bool:
    data = _parse_result_json(run.result_json)
    recommendations = data.get("recommendations")
    return bool(isinstance(recommendations, list) and len(recommendations) > 0)


async def _max_dataset_version(db: AsyncSession, project_id: int) -> int:
    result = await db.execute(
        select(AnalysisRun.dataset_version).where(AnalysisRun.project_id == project_id)
    )
    max_version = 0
    for value in result.scalars().all():
        if isinstance(value, str) and value.startswith("v"):
            try:
                max_version = max(max_version, int(value[1:]))
            except ValueError:
                continue
    return max_version


async def current_analysis_dataset_version(db: AsyncSession, project_id: int) -> str:
    """Return the dataset version of the project's primary (non-verification) dataset."""
    result = await db.execute(
        select(AnalysisRun.dataset_version)
        .where(AnalysisRun.project_id == project_id, AnalysisRun.analysis_type != "verification")
        .order_by(AnalysisRun.created_at.desc())
        .limit(1)
    )
    value = result.scalar_one_or_none()
    if value:
        return value
    return "v1"


async def next_dataset_version(db: AsyncSession, project_id: int) -> str:
    """Return the next logical dataset version (v1, v2, v3, ...)."""
    return f"v{(await _max_dataset_version(db, project_id)) + 1}"


def is_valid_purpose(purpose: str | None) -> bool:
    return purpose in VERIFICATION_PURPOSES
