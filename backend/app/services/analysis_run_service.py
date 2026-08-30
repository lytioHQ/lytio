import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis_run import AnalysisRun

FULL_ANALYSIS_TYPES = ("health_scan", "deep_analysis", "overview")


def parse_metrics_snapshot(result_json: str | None) -> dict | None:
    """Extract code-computed metrics from a completed full-analysis snapshot.

    Used as a read-only fallback when the uploaded workbook is temporarily
    unavailable (M2.14.5 Phase 1.1). Never recomputes or mutates anything.
    """
    if not result_json:
        return None
    try:
        data = json.loads(result_json)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    computed = data.get("computed_metrics")
    if not isinstance(computed, list) or not computed:
        return None
    return {"computed_metrics": computed, "health_score": data.get("health_score")}


async def latest_full_run(db: AsyncSession, project_id: int) -> AnalysisRun | None:
    """Return the newest completed full analysis run for a project."""
    for run in await list_runs(db, project_id):
        if run.analysis_type in FULL_ANALYSIS_TYPES and run.status == "completed":
            return run
    return None


async def create_run(
    db: AsyncSession, project_id: int, summary: str,
    result_json: str, is_legacy: bool = False,
    *,
    analysis_type: str = "health_scan",
    analysis_direction: str = "overview",
    parent_run_id: int | None = None,
    dataset_version: str | None = None,
    purpose: str | None = None,
    comparison_result: str | None = None,
    status: str = "completed",
) -> AnalysisRun:
    health_score = None
    if result_json and not is_legacy:
        try:
            data = json.loads(result_json)
            bh = data.get("business_health", {})
            if bh and isinstance(bh, dict):
                health_score = bh.get("score")
        except (json.JSONDecodeError, TypeError):
            pass

    run = AnalysisRun(
        project_id=project_id,
        business_health_score=health_score,
        summary=summary[:5000] if summary else None,
        result_json=result_json,
        is_legacy=is_legacy,
        analysis_type=analysis_type,
        analysis_direction=analysis_direction,
        parent_run_id=parent_run_id,
        dataset_version=dataset_version,
        purpose=purpose,
        comparison_result=comparison_result,
        status=status,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def list_runs(db: AsyncSession, project_id: int) -> list[AnalysisRun]:
    result = await db.execute(
        select(AnalysisRun)
        .where(AnalysisRun.project_id == project_id)
        .order_by(AnalysisRun.created_at.desc())
        .limit(20)
    )
    return list(result.scalars().all())


async def get_run(db: AsyncSession, run_id: int) -> AnalysisRun | None:
    result = await db.execute(
        select(AnalysisRun).where(AnalysisRun.id == run_id)
    )
    return result.scalar_one_or_none()
