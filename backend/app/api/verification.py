import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.logging_config import logger
from app.models.user import User
from app.schemas.verification import (
    VERIFICATION_PURPOSES,
    VerificationCreate,
    VerificationJobResponse,
    is_valid_purpose,
)
from app.services import analysis_job_service, analysis_run_service, project_service
from app.services.analysis_job_runner import schedule_job

router = APIRouter(prefix="/api/projects", tags=["verification"])


def _purpose_for(job) -> str | None:
    if not job.request_json:
        return None
    try:
        data = json.loads(job.request_json)
        return data.get("purpose")
    except (json.JSONDecodeError, TypeError):
        return None


def _to_response(job) -> VerificationJobResponse:
    return VerificationJobResponse(
        job_id=job.id,
        status=job.status,
        analysis_type=job.analysis_type,
        analysis_direction=job.analysis_direction,
        purpose=_purpose_for(job),
        error_code=job.error_code,
        error_message=job.error_message,
        result_run_id=job.result_run_id,
    )


@router.post("/{project_id}/verification", response_model=VerificationJobResponse, status_code=202)
async def create_verification_job(
    project_id: int,
    data: VerificationCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not is_valid_purpose(data.purpose):
        allowed = ", ".join(VERIFICATION_PURPOSES)
        raise HTTPException(
            status_code=400,
            detail=f"Unknown verification purpose '{data.purpose}'. Must be one of: {allowed}.",
        )

    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Tenant-safe parent resolution: parent must belong to this exact project.
    from app.services import verification_service

    parent = await verification_service.resolve_parent_run(db, project_id, data.parent_run_id)
    if parent is None:
        if data.parent_run_id is not None:
            raise HTTPException(status_code=404, detail="Parent analysis run not found")
        raise HTTPException(
            status_code=400,
            detail="No completed analysis with recommendations is available to verify.",
        )

    idempotency_key = data.idempotency_key or (
        f"verification:{project_id}:{parent.id}:{data.purpose}:{data.saved_filename}"
    )

    existing = await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
    if existing is not None:
        if existing.user_id == user.id and existing.project_id == project_id:
            return _to_response(existing)
        raise HTTPException(status_code=409, detail="Verification job conflict")

    request_json = json.dumps(
        {
            "analysis_type": "verification",
            "purpose": data.purpose,
            "parent_run_id": parent.id,
            "saved_filename": data.saved_filename,
            "original_filename": data.original_filename,
        },
        ensure_ascii=False,
    )

    job = await analysis_job_service.insert_job(
        db,
        user_id=user.id,
        project_id=project_id,
        idempotency_key=idempotency_key,
        analysis_type="verification",
        analysis_direction="verification",
        request_json=request_json,
    )

    if job is None:
        raced = await analysis_job_service.get_job_by_idempotency(db, idempotency_key)
        if raced is not None and raced.user_id == user.id and raced.project_id == project_id:
            return _to_response(raced)
        raise HTTPException(status_code=409, detail="Verification job conflict")

    logger.info(
        "verification_job_created",
        extra={
            "event": "verification",
            "job_id": job.id,
            "project_id": project_id,
            "user_id": user.id,
            "parent_run_id": parent.id,
            "purpose": data.purpose,
        },
    )
    schedule_job(job.id)
    return _to_response(job)


@router.get("/{project_id}/comparison/{run_id}")
async def get_comparison_report(
    project_id: int,
    run_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    run = await analysis_run_service.get_run(db, run_id)
    if not run or run.project_id != project_id or run.analysis_type != "verification":
        raise HTTPException(status_code=404, detail="Verification run not found")

    parent = None
    if run.parent_run_id:
        parent = await analysis_run_service.get_run(db, run.parent_run_id)
        if not parent or parent.project_id != project_id:
            parent = None

    def _run_payload(item):
        return {
            "id": item.id,
            "project_id": item.project_id,
            "created_at": str(item.created_at) if item.created_at else None,
            "analysis_type": item.analysis_type,
            "analysis_direction": item.analysis_direction,
            "parent_run_id": item.parent_run_id,
            "dataset_version": item.dataset_version,
            "purpose": item.purpose,
            "business_health_score": item.business_health_score,
            "summary": item.summary,
            "result_json": item.result_json,
            "comparison_result": item.comparison_result,
            "is_legacy": item.is_legacy,
        }

    return {
        "run": _run_payload(run),
        "parent": _run_payload(parent) if parent else None,
    }
