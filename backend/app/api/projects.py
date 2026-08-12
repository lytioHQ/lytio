from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import project_service, analysis_run_service, report_builder

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await project_service.list_projects(db, user.id)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await project_service.touch_project(db, project_id, user.id)
    # touch_project's bulk UPDATE expires the in-memory instance; refresh it so
    # response serialization never triggers an async lazy-load (500 in prod).
    await db.refresh(project)
    return project


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await project_service.create_project(db, user.id, data)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.update_project(db, project_id, user.id, data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    deleted = await project_service.delete_project(db, project_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")

class FileLinkPayload(BaseModel):
    original_filename: str
    saved_filename: str


@router.patch("/{project_id}/file")
async def link_file(
    project_id: int,
    data: FileLinkPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await project_service.set_project_file(db, project_id, user.id, data.original_filename, data.saved_filename)
    return {"status": "ok"}

class StatusPayload(BaseModel):
    status: str


@router.patch("/{project_id}/status")
async def set_project_status(
    project_id: int,
    data: StatusPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.schemas.project import ProjectUpdate
    valid = {"draft", "ready", "completed", "archived"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    project = await project_service.update_project(db, project_id, user.id, ProjectUpdate(status=data.status))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok"}

class SaveResultPayload(BaseModel):
    summary: str = ""
    result_json: str = ""
    is_legacy: bool = False


@router.patch("/{project_id}/result")
async def save_result(
    project_id: int,
    data: SaveResultPayload,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await project_service.save_analysis_result(db, project_id, user.id, data.summary, data.result_json)
    # Create timeline event
    run = await analysis_run_service.create_run(
        db, project_id, data.summary, data.result_json,
        is_legacy=data.is_legacy,
    )
    return {"status": "ok", "run_id": run.id}

class TimelineItem(BaseModel):
    id: int
    created_at: str | None = None
    business_health_score: int | None = None
    summary: str | None = None


@router.get("/{project_id}/timeline", response_model=list[TimelineItem])
async def get_timeline(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await analysis_run_service.list_runs(db, project_id)
    return [
        TimelineItem(
            id=r.id,
            created_at=str(r.created_at) if r.created_at else None,
            business_health_score=r.business_health_score,
            summary=r.summary[:300] if r.summary else None,
        )
        for r in runs
    ]

@router.get("/{project_id}/executive")
async def get_executive_report(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.latest_result_json:
        raise HTTPException(status_code=404, detail="No analysis result available. Run an analysis first.")

    report = report_builder.build_report_from_json(
        project.latest_result_json,
        project_name=project.title,
        title=f"{project.title} \u2014 Executive Report",
    )

    if report is None:
        raise HTTPException(status_code=500, detail="Failed to parse stored result")

    return report.model_dump()