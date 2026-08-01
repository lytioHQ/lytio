import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.analysis_run import AnalysisRun


async def create_run(
    db: AsyncSession, project_id: int, summary: str,
    result_json: str, is_legacy: bool = False,
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