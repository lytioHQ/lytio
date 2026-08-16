from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services import analysis_run_service, project_service

router = APIRouter(prefix="/api/analysis-runs", tags=["analysis_runs"])


@router.get("/{run_id}")
async def get_run(
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    run = await analysis_run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    # Verify ownership via project
    project = await project_service.get_project(db, run.project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": run.id,
        "project_id": run.project_id,
        "created_at": str(run.created_at) if run.created_at else None,
        "business_health_score": run.business_health_score,
        "summary": run.summary,
        "result_json": run.result_json,
        "is_legacy": run.is_legacy,
        "analysis_type": run.analysis_type,
        "analysis_direction": run.analysis_direction,
        "parent_run_id": run.parent_run_id,
        "dataset_version": run.dataset_version,
        "purpose": run.purpose,
        "comparison_result": run.comparison_result,
        "status": run.status,
    }