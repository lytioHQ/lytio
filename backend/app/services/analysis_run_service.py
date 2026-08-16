import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis_run import AnalysisRun


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
        result_json=result_json[:30000] if result_json else None,
        is_legacy=is_legacy,
        analysis_type=analysis_type,
        analysis_direction=analysis_direction,
        parent_run_id=parent_run_id,
        dataset_version=dataset_version,
        purpose=purpose,
        comparison_result=comparison_result[:30000] if comparison_result else None,
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
