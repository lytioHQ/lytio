"""M2.12.4 Business Memory API (incremental, prefix /api/projects).

Read-only consumption of the per-project derived operating memory. The memory
row is a derived cache and is lazily rebuilt from analysis_runs + action_items
when a project has no row yet (old customers).
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.services import memory_service, project_service

router = APIRouter(prefix="/api/projects", tags=["business_memory"])


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _serialize(memory) -> dict:
    return {
        "project_id": memory.project_id,
        "engine_version": memory.engine_version,
        "profile": memory.profile or {},
        "latest_metrics": memory.latest_metrics or {},
        "metric_history": memory.metric_history or {},
        "health_history": list(memory.health_history or []),
        "action_summary": memory.action_summary or {},
        "action_recent": list(memory.action_recent or []),
        "issue_tracker": list(memory.issue_tracker or []),
        "verification_history": list(memory.verification_history or []),
        "open_loops": list(memory.open_loops or []),
        "updated_at": _iso(memory.updated_at),
        "ready": memory_service.memory_ready(memory),
    }


@router.get("/{project_id}/memory")
async def get_project_memory(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the project's operating memory (derived cache, read-only)."""
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    memory = await memory_service.get_memory(project_id, user.id)
    if memory is None:
        raise HTTPException(status_code=500, detail="Failed to load business memory.")
    return _serialize(memory)


@router.get("/{project_id}/memory/trend")
async def get_project_memory_trend(
    project_id: int,
    metric: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the time series for one metric (or health_score) from memory."""
    if not metric or not metric.strip():
        raise HTTPException(status_code=400, detail="metric query parameter is required")
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    points = await memory_service.get_metric_trend(project_id, user.id, metric.strip())
    return points
