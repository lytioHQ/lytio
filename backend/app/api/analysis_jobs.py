import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.plugins.sales.prompt_builder import (
    ANALYSIS_DIRECTIONS,
    analysis_type_for,
    is_valid_analysis_direction,
)
from app.services import analysis_job_service, project_service
from app.services.analysis_job_runner import schedule_job

router = APIRouter(prefix="/api/projects", tags=["analysis_jobs"])


class AnalysisJobCreate(BaseModel):
    analysis_direction: str = "overview"
    idempotency_key: str | None = None


class AnalysisJobResponse(BaseModel):
    job_id: int
    status: str
    analysis_type: str
    analysis_direction: str
    error_code: str | None = None
    error_message: str | None = None
    result_run_id: int | None = None


def _to_response(job) -> AnalysisJobResponse:
    return AnalysisJobResponse(
        job_id=job.id,
        status=job.status,
        analysis_type=job.analysis_type,
        analysis_direction=job.analysis_direction,
        error_code=job.error_code,
        error_message=job.error_message,
        result_run_id=job.result_run_id,
    )


class FocusedInsightCreate(BaseModel):
    parent_run_id: int
    topic: str
    idempotency_key: str | None = None


@router.post("/{project_id}/focused-insight", response_model=AnalysisJobResponse, status_code=202)
async def create_focused_insight_job(
    project_id: int,
    payload: FocusedInsightCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """M2.14.4: create a focused follow-up job for an existing analysis run.

    The job only consumes the parent run's compact context; it never reads
    the Excel file and never runs a full analysis.
    """
    topic = (payload.topic or "").strip()
    if not topic:
        raise HTTPException(status_code=422, detail="Topic must not be empty.")

    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from app.services import analysis_run_service

    parent = await analysis_run_service.get_run(db, payload.parent_run_id)
    if parent is None or parent.project_id != project_id:
        raise HTTPException(status_code=404, detail="Parent analysis run not found")
    if parent.analysis_type not in ("health_scan", "deep_analysis", "overview"):
        raise HTTPException(
            status_code=400,
            detail="Focused insight requires a completed full analysis as parent.",
        )

    idempotency_key = payload.idempotency_key or (
        f"focused-insight:{project_id}:{payload.parent_run_id}:{topic}"
    )

    existing = await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
    if existing is not None:
        if existing.user_id == user.id and existing.project_id == project_id:
            return _to_response(existing)
        raise HTTPException(status_code=409, detail="Focused insight job conflict")

    request_json = json.dumps(
        {
            "analysis_type": "focused_insight",
            "parent_run_id": payload.parent_run_id,
            "topic": topic,
            "report_language": project.language or "zh",
        },
        ensure_ascii=False,
    )
    job = await analysis_job_service.insert_job(
        db,
        user_id=user.id,
        project_id=project_id,
        idempotency_key=idempotency_key,
        analysis_type="focused_insight",
        analysis_direction="topic",
        request_json=request_json,
    )
    if job is None:
        raced = await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
        if raced is not None and raced.user_id == user.id and raced.project_id == project_id:
            return _to_response(raced)
        raise HTTPException(status_code=409, detail="Focused insight job conflict")

    schedule_job(job.id)
    return _to_response(job)


@router.get("/{project_id}/focused-insight/{job_id}", response_model=AnalysisJobResponse)
async def get_focused_insight_job(
    project_id: int,
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Poll the focused-insight job (same response contract as analysis jobs)."""
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    job = await analysis_job_service.get_job(db, project_id, user.id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Focused insight job not found")
    return _to_response(job)


@router.post("/{project_id}/analysis", response_model=AnalysisJobResponse, status_code=202)
async def create_analysis_job(
    project_id: int,
    payload: AnalysisJobCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    direction = payload.analysis_direction or "overview"
    if not is_valid_analysis_direction(direction):
        allowed = ", ".join(sorted([*ANALYSIS_DIRECTIONS, "overview"]))
        raise HTTPException(
            status_code=400,
            detail=f"Unknown analysis_direction '{direction}'. Must be one of: {allowed}.",
        )

    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    idempotency_key = payload.idempotency_key or f"{project_id}:{direction}:{uuid.uuid4().hex}"

    existing = await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
    if existing is not None:
        if existing.project_id == project_id and existing.user_id == user.id:
            return _to_response(existing)
        raise HTTPException(status_code=409, detail="Analysis job conflict")

    active = await analysis_job_service.get_active_job(db, project_id, direction)
    if active:
        return _to_response(active)

    completed = await analysis_job_service.get_completed_job(db, project_id, direction)
    if completed:
        raise HTTPException(
            status_code=409,
            detail="This analysis has already been completed for this project.",
        )

    request_json = json.dumps(
        {"analysis_direction": direction, "report_language": project.language or "zh"},
        ensure_ascii=False,
    )
    job = await analysis_job_service.insert_job(
        db,
        user_id=user.id,
        project_id=project_id,
        idempotency_key=idempotency_key,
        analysis_type=analysis_type_for(direction),
        analysis_direction=direction,
        request_json=request_json,
    )

    if job is None:
        raced = (
            await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
            or await analysis_job_service.get_active_job(db, project_id, direction)
            or await analysis_job_service.get_completed_job(db, project_id, direction)
        )
        if raced is not None and raced.project_id == project_id and raced.user_id == user.id:
            return _to_response(raced)
        raise HTTPException(status_code=409, detail="Analysis job conflict")

    schedule_job(job.id)
    return _to_response(job)


@router.get("/{project_id}/analysis/{job_id}", response_model=AnalysisJobResponse)
async def get_analysis_job(
    project_id: int,
    job_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    job = await analysis_job_service.get_job(db, project_id, user.id, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return _to_response(job)