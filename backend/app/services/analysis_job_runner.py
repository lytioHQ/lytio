"""In-process async runner for AnalysisJob records.

The runner uses its own AsyncSession (never the request session) and its own
DeepSeek provider with a longer timeout, so the legacy synchronous
``POST /api/analysis/sales`` endpoint keeps its original behavior.
"""

import asyncio
import json
import os
import time

from app.core.database import async_session
from app.core.logging_config import logger
from app.models.analysis_job import AnalysisJob
from app.models.project import Project
from app.plugins.sales import SalesPlugin
from app.plugins.sales.prompt_builder import analysis_type_for
from app.providers.deepseek import DeepSeekProvider
from app.services import analysis_job_service, analysis_run_service, project_service
from app.services.analysis_engine import AnalysisEngine
from app.services.workbook_service import WorkbookAccessError, extract_canonical_dataset

RUNNER_PROVIDER_TIMEOUT = float(os.getenv("ANALYSIS_JOB_PROVIDER_TIMEOUT", "180"))

_tasks: set[asyncio.Task] = set()


def schedule_job(job_id: int) -> None:
    """Start a background job and keep a strong reference to its task."""
    task = asyncio.create_task(run_analysis_job(job_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _build_result_json(result, analysis_type: str, analysis_direction: str) -> str:
    if result.result is not None:
        data = result.result.model_dump()
    else:
        data = {
            "insights": [{"title": h, "description": h} for h in result.highlights],
            "risks": [{"title": w, "description": w} for w in result.warnings],
            "recommendations": [{"title": r, "description": r} for r in result.recommendations],
            "executive_summary": {"content": result.summary or ""},
        }
    data["analysis_direction"] = analysis_direction
    data["analysis_type"] = analysis_type
    return json.dumps(data, ensure_ascii=False)


async def _fail(job_id: int, error_code: str, message: str, started_at: float) -> None:
    """Mark a known failure. Safe for both queued and running jobs."""
    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status not in ("queued", "running"):
            return
        await analysis_job_service.mark_failed(
            db, job, error_code, message, int((time.monotonic() - started_at) * 1000)
        )


async def _fail_uncaught(job_id: int, exc: Exception, started_at: float) -> None:
    """Outermost guard: convert any uncaught exception into a failed job.

    Detailed exception data goes only to logs; the stored error message stays
    user-safe so it never leaks prompt/token/excel/AI internals.
    """
    elapsed_ms = int((time.monotonic() - started_at) * 1000)
    logger.error(
        "analysis_job_runner_exception",
        extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": elapsed_ms},
        exc_info=exc,
    )
    try:
        async with async_session() as db:
            job = await db.get(AnalysisJob, job_id)
            if not job or job.status not in ("queued", "running"):
                return
            await analysis_job_service.mark_failed(
                db, job, "runner_exception", "Analysis failed. Please try again.", elapsed_ms
            )
    except Exception as handler_exc:
        logger.error(
            "analysis_job_runner_fail_handler_error",
            extra={"event": "analysis_job", "job_id": job_id},
            exc_info=handler_exc,
        )


async def run_analysis_job(job_id: int) -> None:
    """Execute one job with an outermost guard against stuck running jobs."""
    started_at = time.monotonic()
    try:
        await _execute_job(job_id, started_at)
    except Exception as exc:
        await _fail_uncaught(job_id, exc, started_at)
    finally:
        logger.info(
            "analysis_job_runner_exited",
            extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": int((time.monotonic() - started_at) * 1000)},
        )


async def _execute_job(job_id: int, started_at: float) -> None:
    """Run one job end-to-end: extract -> AI -> persist result -> create run."""
    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status not in ("queued", "running"):
            return

        project = await db.get(Project, job.project_id)
        if not project or project.owner_id != job.user_id:
            await analysis_job_service.mark_failed(
                db, job, "invalid_project", "Project not found",
                int((time.monotonic() - started_at) * 1000),
            )
            return
        if not project.saved_filename:
            await analysis_job_service.mark_failed(
                db, job, "missing_file", "No Excel file is linked to this project.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        await analysis_job_service.mark_running(db, job)
        saved_filename = project.saved_filename
        user_id = job.user_id
        direction = job.analysis_direction
        report_language = project.language or "zh"

    try:
        dataset = extract_canonical_dataset(user_id, saved_filename)
    except WorkbookAccessError as exc:
        await _fail(job_id, exc.code, str(exc), started_at)
        return

    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))
    plugin = SalesPlugin()

    try:
        result = await plugin.analyze(
            engine,
            workbook_name=dataset["workbook_name"],
            sheet_name=dataset["sheet_name"],
            headers=dataset["headers"],
            column_types=dataset["column_types"],
            rows=dataset["rows"],
            language=report_language,
            analysis_direction=direction,
        )
    except TimeoutError as exc:
        await _fail(job_id, "provider_timeout", str(exc), started_at)
        return
    except ValueError as exc:
        await _fail(job_id, "invalid_data", str(exc), started_at)
        return
    except Exception as exc:
        await _fail(job_id, "unknown", f"{type(exc).__name__}: {exc}", started_at)
        return

    analysis_type = analysis_type_for(direction)
    result_json = _build_result_json(result, analysis_type, direction)
    summary = result.summary or ""

    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status != "running":
            return
        try:
            await project_service.save_analysis_result(
                db, job.project_id, job.user_id, summary, result_json
            )
            run = await analysis_run_service.create_run(
                db, job.project_id, summary, result_json, is_legacy=result.is_legacy
            )
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
        except Exception as exc:
            await analysis_job_service.mark_failed(
                db, job, "unknown",
                f"Failed to persist analysis result: {type(exc).__name__}: {exc}",
                int((time.monotonic() - started_at) * 1000),
            )
            return

    logger.info(
        "analysis_job_finished",
        extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": int((time.monotonic() - started_at) * 1000)},
    )