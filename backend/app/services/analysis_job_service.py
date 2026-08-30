"""Persistence helpers for AnalysisJob records."""

from datetime import datetime, timezone
import json

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging_config import logger
from app.models.analysis_job import AnalysisJob

ACTIVE_STATUSES = ("queued", "running")


PIPELINE_STAGES = (
    "UPLOAD_SUCCESS",
    "SCHEMA_SUCCESS",
    "METRIC_SUCCESS",
    "AI_ANALYSIS_SUCCESS",
    "REPORT_SUCCESS",
)



def get_pipeline_stage(job) -> str | None:
    """Return the last recorded pipeline stage (stored in request_json)."""
    if not job or not getattr(job, "request_json", None):
        return None
    try:
        data = json.loads(job.request_json)
        stage = data.get("pipeline_stage") if isinstance(data, dict) else None
        return stage if stage in PIPELINE_STAGES else None
    except (json.JSONDecodeError, TypeError):
        return None


async def set_pipeline_stage(db: AsyncSession, job: AnalysisJob, stage: str) -> None:
    """Record a pipeline stage without a schema migration (request_json)."""
    if stage not in PIPELINE_STAGES:
        raise ValueError(f"unknown pipeline stage: {stage}")
    try:
        data = json.loads(job.request_json or "{}")
    except (json.JSONDecodeError, TypeError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    data["pipeline_stage"] = stage
    job.request_json = json.dumps(data, ensure_ascii=False)
    await db.commit()
    logger.info("analysis_job_stage", extra=_log_extra(job, pipeline_stage=stage))
def _log_extra(job: AnalysisJob, **extra):
    return {
        "event": "analysis_job",
        "job_id": job.id,
        "project_id": job.project_id,
        "user_id": job.user_id,
        "analysis_type": job.analysis_type,
        "analysis_direction": job.analysis_direction,
        **extra,
    }


async def get_job(
    db: AsyncSession, project_id: int, user_id: int, job_id: int
) -> AnalysisJob | None:
    result = await db.execute(
        select(AnalysisJob).where(
            AnalysisJob.id == job_id,
            AnalysisJob.project_id == project_id,
            AnalysisJob.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_job_by_idempotency(db: AsyncSession, idempotency_key: str) -> AnalysisJob | None:
    result = await db.execute(
        select(AnalysisJob).where(AnalysisJob.idempotency_key == idempotency_key)
    )
    return result.scalar_one_or_none()


async def get_active_job(
    db: AsyncSession, project_id: int, analysis_direction: str
) -> AnalysisJob | None:
    result = await db.execute(
        select(AnalysisJob)
        .where(
            AnalysisJob.project_id == project_id,
            AnalysisJob.analysis_direction == analysis_direction,
            AnalysisJob.status.in_(ACTIVE_STATUSES),
        )
        .order_by(AnalysisJob.id.asc())
    )
    return result.scalars().first()


async def get_completed_job(
    db: AsyncSession, project_id: int, analysis_direction: str
) -> AnalysisJob | None:
    result = await db.execute(
        select(AnalysisJob)
        .where(
            AnalysisJob.project_id == project_id,
            AnalysisJob.analysis_direction == analysis_direction,
            AnalysisJob.status == "completed",
        )
        .order_by(AnalysisJob.id.desc())
    )
    return result.scalars().first()


async def insert_job(
    db: AsyncSession,
    *,
    user_id: int,
    project_id: int,
    idempotency_key: str,
    analysis_type: str,
    analysis_direction: str,
    request_json: str | None,
) -> AnalysisJob | None:
    """Insert a queued job. Returns None on a unique-constraint race."""
    job = AnalysisJob(
        user_id=user_id,
        project_id=project_id,
        idempotency_key=idempotency_key,
        status="queued",
        analysis_type=analysis_type,
        analysis_direction=analysis_direction,
        request_json=request_json,
    )
    db.add(job)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return None
    await db.refresh(job)
    logger.info("analysis_job_created", extra=_log_extra(job))
    return job


async def mark_running(db: AsyncSession, job: AnalysisJob) -> None:
    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    job.error_code = None
    job.error_message = None
    await db.commit()
    logger.info("analysis_job_started", extra=_log_extra(job))


async def mark_completed(
    db: AsyncSession, job: AnalysisJob, result_run_id: int, elapsed_ms: int
) -> None:
    job.status = "completed"
    job.result_run_id = result_run_id
    job.completed_at = datetime.now(timezone.utc)
    job.error_code = None
    job.error_message = None
    await db.commit()
    logger.info(
        "analysis_job_completed",
        extra=_log_extra(job, elapsed_ms=elapsed_ms, error_code=None),
    )


async def mark_failed(
    db: AsyncSession, job: AnalysisJob, error_code: str, error_message: str, elapsed_ms: int
) -> None:
    job.status = "failed"
    job.error_code = error_code
    job.error_message = (error_message or "")[:500]
    job.completed_at = datetime.now(timezone.utc)
    await db.commit()
    logger.info(
        "analysis_job_failed",
        extra=_log_extra(job, elapsed_ms=elapsed_ms, error_code=error_code),
    )


async def reconcile_stale_jobs(db: AsyncSession) -> int:
    """Mark jobs left in queued/running after a process restart as interrupted."""
    result = await db.execute(
        update(AnalysisJob)
        .where(AnalysisJob.status.in_(ACTIVE_STATUSES))
        .values(
            status="failed",
            error_code="interrupted",
            error_message="Analysis was interrupted by a service restart.",
            completed_at=datetime.now(timezone.utc),
        )
    )
    await db.commit()
    return result.rowcount or 0
