"""In-process async runner for AnalysisJob records.

The runner uses its own AsyncSession (never the request session) and its own
DeepSeek provider with a longer timeout, so the legacy synchronous
``POST /api/analysis/sales`` endpoint keeps its original behavior.

Verification jobs reuse the same runner. A verification job:
- extracts the *new* dataset from the filename recorded in ``request_json``
  (NOT the project's baseline ``saved_filename``)
- compares it against the parent AnalysisRun
- persists a new Verification AnalysisRun without touching
  ``project.latest_result_json``.
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
from app.services import action_item_service
from app.services.analysis_engine import AnalysisEngine
from app.services import verification_parser, verification_service
from app.services.workbook_service import WorkbookAccessError, extract_canonical_dataset
from app.services.metric_engine import compute_metrics
from app.services.health_score import compute_health_score
from app.services.schema_mapper import detect_schema
from app.services import memory_service

RUNNER_PROVIDER_TIMEOUT = float(os.getenv("ANALYSIS_JOB_PROVIDER_TIMEOUT", "180"))

_tasks: set[asyncio.Task] = set()


def schedule_job(job_id: int) -> None:
    """Start a background job and keep a strong reference to its task."""
    task = asyncio.create_task(run_analysis_job(job_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _build_result_json(
    result, analysis_type: str, analysis_direction: str, computed_metrics: list[dict] | None = None,
    health_score: dict | None = None,
) -> str:
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
    if computed_metrics:
        data["computed_metrics"] = computed_metrics
    if health_score:
        data["health_score"] = health_score
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

        await analysis_job_service.mark_running(db, job)

        if job.analysis_type == "verification":
            # The new dataset filename lives in request_json, never in
            # project.saved_filename (which must keep pointing at baseline).
            await _run_verification(job_id, started_at)
            return

        if not project.saved_filename:
            await analysis_job_service.mark_failed(
                db, job, "missing_file", "No Excel file is linked to this project.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        saved_filename = project.saved_filename
        user_id = job.user_id
        direction = job.analysis_direction
        report_language = project.language or "zh"
        schema_mapping = project.schema_mapping

    try:
        dataset = extract_canonical_dataset(user_id, saved_filename)
    except WorkbookAccessError as exc:
        await _fail(job_id, exc.code, str(exc), started_at)
        return

    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))
    plugin = SalesPlugin()

    # M2.12.1: compute canonical metrics from code. Never blocks analysis on
    # detection/computation failures - degrade to no computed context.
    computed_metrics: list[dict] | None = None
    health_score: dict | None = None
    try:
        mapping = schema_mapping or detect_schema(dataset["headers"], dataset["column_types"]).to_dict()
        computed_metrics = compute_metrics(dataset, mapping)
    except Exception:
        computed_metrics = None
    if computed_metrics:
        # M2.12.2: code-computed health score. Never blocks analysis; degrade
        # to no score if anything fails.
        try:
            health_score = compute_health_score(dataset, mapping, computed_metrics)
        except Exception:
            health_score = None

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
            computed_metrics=computed_metrics,
            health_score=health_score,
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
    result_json = _build_result_json(result, analysis_type, direction, computed_metrics=computed_metrics)
    result_json = _build_result_json(
        result, analysis_type, direction, computed_metrics=computed_metrics, health_score=health_score
    )
    summary = result.summary or ""

    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status != "running":
            return
        try:
            dataset_version = await verification_service.current_analysis_dataset_version(
                db, job.project_id
            )
            await project_service.save_analysis_result(
                db, job.project_id, job.user_id, summary, result_json
            )
            run = await analysis_run_service.create_run(
                db, job.project_id, summary, result_json, is_legacy=result.is_legacy,
                analysis_type=analysis_type,
                analysis_direction=direction,
                dataset_version=dataset_version,
            )
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
            # M2.12.4: refresh the project's business memory (derived cache).
            # Failures are logged, never propagated to the job transaction.
            try:
                await memory_service.upsert_memory_after_run(job.project_id, run.id)
            except Exception as mem_exc:
                memory_service.log_memory_failure({"job_id": job_id, "run_id": run.id}, mem_exc)
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


async def _run_verification(job_id: int, started_at: float) -> None:
    """Execute a verification job end-to-end without overwriting baseline."""
    # Read all inputs inside one short-lived session, then release the DB
    # connection before the long-running AI call.
    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status != "running":
            return

        project = await db.get(Project, job.project_id)
        if not project or project.owner_id != job.user_id:
            await analysis_job_service.mark_failed(
                db, job, "invalid_project", "Project not found",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        request_data: dict = {}
        try:
            request_data = json.loads(job.request_json or "{}")
        except json.JSONDecodeError:
            pass

        saved_filename = str(request_data.get("saved_filename") or "")
        purpose = str(request_data.get("purpose") or "")
        parent_run_id = request_data.get("parent_run_id")
        report_language = project.language or "zh"

        if not saved_filename:
            await analysis_job_service.mark_failed(
                db, job, "invalid_verification_request", "New dataset filename is missing.",
                int((time.monotonic() - started_at) * 1000),
            )
            return
        if not purpose or not verification_service.is_valid_purpose(purpose):
            await analysis_job_service.mark_failed(
                db, job, "invalid_verification_request", "Unknown verification purpose.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        parent = await verification_service.resolve_parent_run(db, job.project_id, parent_run_id)
        if parent is None:
            await analysis_job_service.mark_failed(
                db, job, "invalid_parent",
                "No completed analysis with recommendations is available to verify.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        parent_context = verification_service.extract_parent_context(parent)
        dataset_version = await verification_service.next_dataset_version(db, job.project_id)
        prompt = verification_service.build_verification_prompt(parent_context, purpose, report_language)

        # Capture scalar values so the closed ORM objects are never lazy-loaded.
        user_id = job.user_id
        parent_id = parent.id

    try:
        dataset = extract_canonical_dataset(user_id, saved_filename)
    except WorkbookAccessError as exc:
        await _fail(job_id, exc.code, str(exc), started_at)
        return

    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))

    try:
        request = AnalysisEngine.build_request(
            workbook_name=dataset["workbook_name"],
            sheet_name=dataset["sheet_name"],
            headers=dataset["headers"],
            column_types=dataset["column_types"],
            rows=dataset["rows"],
            analysis_type="verification",
            plugin_name="sales",
            language=report_language,
            parameters={"system_prompt": prompt},
        )
        response = await engine.analyze(request)
    except TimeoutError as exc:
        await _fail(job_id, "provider_timeout", str(exc), started_at)
        return
    except ValueError as exc:
        await _fail(job_id, "invalid_data", str(exc), started_at)
        return
    except Exception as exc:
        await _fail(job_id, "unknown", f"{type(exc).__name__}: {exc}", started_at)
        return

    comparison = verification_parser.parse_comparison(response.summary)
    comparison_json = comparison.model_dump_json()
    summary = comparison.comparison_summary or "Verification completed."

    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status != "running":
            return
        try:
            run = await analysis_run_service.create_run(
                db, job.project_id, summary, comparison_json, is_legacy=False,
                analysis_type="verification",
                analysis_direction="verification",
                parent_run_id=parent_id,
                dataset_version=dataset_version,
                purpose=purpose,
                comparison_result=comparison_json,
                status="completed",
            )
            # M2.12.3: mechanically link source-run action items to this
            # verification run (factual evidence only, never flips status).
            # Failures must not fail the verification job itself.
            try:
                linked = await action_item_service.link_actions_to_verification(
                    db, job.project_id, run.id
                )
                if linked:
                    logger.info(
                        "action_items_linked_to_verification",
                        extra={"event": "analysis_job", "job_id": job_id,
                               "verification_run_id": run.id, "linked": linked},
                    )
            except Exception as link_exc:
                logger.error(
                    "action_items_link_failed",
                    extra={"event": "analysis_job", "job_id": job_id,
                           "verification_run_id": run.id},
                    exc_info=link_exc,
                )
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
            # M2.12.4: refresh the project's business memory (derived cache).
            try:
                await memory_service.upsert_memory_after_run(job.project_id, run.id)
            except Exception as mem_exc:
                memory_service.log_memory_failure({"job_id": job_id, "run_id": run.id}, mem_exc)
        except Exception as exc:
            await analysis_job_service.mark_failed(
                db, job, "unknown",
                f"Failed to persist verification result: {type(exc).__name__}: {exc}",
                int((time.monotonic() - started_at) * 1000),
            )
            return

    logger.info(
        "verification_job_finished",
        extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": int((time.monotonic() - started_at) * 1000)},
    )
