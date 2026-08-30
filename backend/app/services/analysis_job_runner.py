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
from app.services import action_execution_service
from app.services import action_item_service
from app.services.analysis_engine import AnalysisEngine
from app.services import verification_metrics, verification_parser, verification_scoring, verification_service
from app.services.workbook_service import WorkbookAccessError, extract_canonical_dataset
from app.services.metric_engine import compute_metrics
from app.services.health_score import compute_health_score
from app.services.schema_mapper import derive_schema_meta
from app.services.schema_intelligence import detect_schema_intelligent
from app.services.schema_intelligence import core_confidence_blocked
from app.services import focused_insight_service
from app.services import memory_service
from app.services import memory_context as memory_context_service
from app.services import analysis_result_quality

RUNNER_PROVIDER_TIMEOUT = float(os.getenv("ANALYSIS_JOB_PROVIDER_TIMEOUT", "180"))

# M2.13.0: maximum AI attempts for a verification job (first call + one retry).
VERIFICATION_MAX_AI_ATTEMPTS = 2

# M2.14.5 Phase 1.1: deepseek-v4-pro counts reasoning tokens against max_tokens.
# 900 left no room for the JSON card; 1600 completes it and stays far below
# the full-analysis budget.
FOCUSED_INSIGHT_MAX_TOKENS = 1600
# Disable reasoning for the small follow-up card: measured completion is ~250
# tokens instead of 1000-1900, while 1600 max_tokens leaves headroom if the
# proxy ignores the option.
FOCUSED_INSIGHT_THINKING = {"type": "disabled"}

_tasks: set[asyncio.Task] = set()


def schedule_job(job_id: int) -> None:
    """Start a background job and keep a strong reference to its task."""
    task = asyncio.create_task(run_analysis_job(job_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


def _build_result_json(
    result, analysis_type: str, analysis_direction: str, computed_metrics: list[dict] | None = None,
    health_score: dict | None = None, schema_meta: dict | None = None,
    memory_context_meta: dict | None = None,
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
    if schema_meta:
        data["schema_meta"] = schema_meta
    if memory_context_meta:
        data["memory_context_meta"] = memory_context_meta
    return json.dumps(data, ensure_ascii=False)


async def _fail(
    job_id: int, error_code: str, message: str, started_at: float,
    exc: Exception | None = None,
) -> None:
    """Mark a known failure. Safe for both queued and running jobs.

    When ``exc`` is provided the full traceback is written to logs so a
    failed job stays diagnosable even after log rotation (M2.14.2 UAT P0).
    """
    if exc is not None:
        logger.error(
            "analysis_job_failed",
            extra={"event": "analysis_job", "job_id": job_id, "error_code": error_code},
            exc_info=exc,
        )
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
                db, job, "runner_exception", "分析未完成，请稍后重试。", elapsed_ms
            )
    except Exception as handler_exc:
        logger.error(
            "analysis_job_runner_fail_handler_error",
            extra={"event": "analysis_job", "job_id": job_id},
            exc_info=handler_exc,
        )


async def _set_stage(job_id: int, stage: str) -> None:
    """Record a pipeline stage. Stage bookkeeping never fails the job."""
    try:
        async with async_session() as db:
            job = await db.get(AnalysisJob, job_id)
            if not job:
                return
            await analysis_job_service.set_pipeline_stage(db, job, stage)
    except Exception:
        logger.warning(
            "analysis_job_stage_failed",
            extra={"event": "analysis_job", "job_id": job_id, "pipeline_stage": stage}, exc_info=True,
        )


def _read_error_message(code: str) -> str:
    """Customer-safe read-stage error copy (technical details go to logs only)."""
    return {
        "missing_file": "未找到上传的 Excel 文件，请重新上传。",
        "unsupported_file": "文件类型不支持，请上传 .xlsx 或 .xls 文件。",
        "unreadable_file": "Excel 文件无法解析，请检查文件格式后重新上传。",
        "empty_workbook": "Excel 中没有可读取的数据，请检查文件内容。",
    }.get(code, "数据读取失败，请检查文件后重新上传。")


def _provider_failed(result) -> bool:
    """Detect provider-level failure markers without exposing raw errors."""
    summary = (getattr(result, "summary", "") or "").strip()
    if summary.startswith("Analysis failed") or summary.startswith("PROVIDER_ERROR"):
        return True
    metadata = getattr(result, "metadata", None) or {}
    return bool(metadata.get("error"))


def _provider_error_message(code: str) -> str:
    if code == "provider_timeout":
        return "分析耗时过长，请稍后重试。"
    return "AI 服务暂时不可用，请稍后重试。"


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

        if job.analysis_type == "focused_insight":
            # M2.14.4: specialized follow-up using the parent run only. It
            # never re-reads the Excel file and never creates a full run.
            await _run_focused_insight(job_id, started_at)
            return

        if job.analysis_type == "verification":
            # The new dataset filename lives in request_json, never in
            # project.saved_filename (which must keep pointing at baseline).
            await _run_verification(job_id, started_at)
            return

        if not project.saved_filename:
            await analysis_job_service.mark_failed(
                db, job, "missing_file", "未找到关联的 Excel 文件，请先上传数据。",
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
        await _fail(job_id, exc.code, _read_error_message(exc.code), started_at)
        return

    await _set_stage(job_id, "UPLOAD_SUCCESS")

    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))
    plugin = SalesPlugin()

    # M2.12.1: compute canonical metrics from code. Never blocks analysis on
    # detection/computation failures - degrade to no computed context.
    computed_metrics: list[dict] | None = None
    health_score: dict | None = None
    try:
        if schema_mapping:
            mapping = schema_mapping
        else:
            detection_obj = await detect_schema_intelligent(
                dataset["headers"], dataset["column_types"], rows_sample=dataset["rows"][:200],
                industry_hint=project.industry, source_file=saved_filename,
            )
            blocked = core_confidence_blocked(detection_obj)
            if blocked:
                await _fail(
                    job_id, "SCHEMA_CONFIRM_REQUIRED",
                    "部分核心字段需要确认，请先在项目页确认字段映射。", started_at,
                )
                return
            mapping = detection_obj.to_dict()
        await _set_stage(job_id, "SCHEMA_SUCCESS")
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
    await _set_stage(job_id, "METRIC_SUCCESS")
    # M2.13.1: per-run field-semantics provenance. Pure derivation from the
    # mapping state; never blocks analysis and never touches historical runs.
    schema_meta: dict | None = None
    try:
        schema_meta = derive_schema_meta(mapping)
    except Exception:
        schema_meta = None

    # M2.13.2: build the historical memory context (pure code, never
    # blocks analysis; failures degrade to no context).
    memory_context: dict | None = None
    memory_context_text: str | None = None
    try:
        memory = await memory_service.get_memory(job.project_id, user_id)
        memory_context = memory_context_service.context_from_memory(memory)
        memory_context_text = memory_context_service.render_memory_context(memory_context)
    except Exception as ctx_exc:
        logger.warning(
            "memory_context_build_failed",
            extra={"event": "analysis_job", "job_id": job_id},
            exc_info=ctx_exc,
        )
        memory_context = None
        memory_context_text = None

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
            schema_meta=schema_meta,
            memory_context=memory_context_text,
        )
    except TimeoutError as exc:
        await _fail(job_id, "provider_timeout", _provider_error_message("provider_timeout"), started_at)
        return
    except ValueError as exc:
        await _fail(job_id, "invalid_data", "这份数据暂不支持分析，请检查数据格式。", started_at)
        return
    except Exception as exc:
        code = "DATA_SERIALIZATION_ERROR" if isinstance(exc, TypeError) else "unknown"
        await _fail(job_id, code, "分析服务异常，请稍后重试。", started_at, exc=exc)
        return

    if _provider_failed(result):
        md = getattr(result, "metadata", None) or {}
        code = (
            "provider_timeout" if "timeout" in str(md.get("error", "")).lower() else "provider_error"
        )
        await _fail(job_id, code, _provider_error_message(code), started_at)
        return
    await _set_stage(job_id, "AI_ANALYSIS_SUCCESS")
    analysis_type = analysis_type_for(direction)
    memory_context_meta = memory_context_service.build_context_meta(
        memory_context,
        injected=bool(memory_context_text),
        length_chars=len(memory_context_text or ""),
    )
    result_json = _build_result_json(
        result, analysis_type, direction,
        computed_metrics=computed_metrics, health_score=health_score, schema_meta=schema_meta,
        memory_context_meta=memory_context_meta,
    )
    data = json.loads(result_json)
    data = analysis_result_quality.ensure_complete(
        data,
        computed_metrics=computed_metrics,
        health_score=health_score,
        language=report_language,
    )
    ok, _missing = analysis_result_quality.assert_complete(data)
    if not ok:
        await _fail(job_id, "AI_OUTPUT_INCOMPLETE", "分析结果不完整，请稍后重试。", started_at)
        return
    result_json = json.dumps(data, ensure_ascii=False)
    summary = ""
    if isinstance(data.get("executive_summary"), dict):
        summary = str(data.get("executive_summary", {}).get("content") or "")
    summary = summary or result.summary or ""

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
            # M2.12.3 + Phase 1.1: recommendations become trackable action
            # items immediately (idempotent). Failure never fails the job.
            try:
                await action_item_service.create_actions_from_run(
                    db, job.project_id, job.user_id, run.id
                )
            except Exception as act_exc:
                logger.error(
                    "analysis_action_items_failed",
                    extra={"event": "analysis_job", "job_id": job_id, "run_id": run.id},
                    exc_info=act_exc,
                )
            await _set_stage(job_id, "REPORT_SUCCESS")
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
            # M2.12.4: refresh the project's business memory (derived cache).
            # Failures are logged, never propagated to the job transaction.
            try:
                await memory_service.upsert_memory_after_run(job.project_id, run.id)
            except Exception as mem_exc:
                memory_service.log_memory_failure({"job_id": job_id, "run_id": run.id}, mem_exc)
        except Exception as exc:
            logger.error(
                "analysis_job_persist_failed",
                extra={"event": "analysis_job", "job_id": job_id, "error_code": "unknown"},
                exc_info=exc,
            )
            await analysis_job_service.mark_failed(
                db, job, "unknown",
                "分析结果保存失败，请重试。",
                int((time.monotonic() - started_at) * 1000),
            )
            return


async def _run_focused_insight(job_id: int, started_at: float) -> None:
    """Execute a focused-insight job from the parent run only (M2.14.4).

    Cost control: compact context JSON + small max_tokens; no workbook
    rows, no full prompt, no full pipeline. The persisted run is
    analysis_type=focused_insight with parent_run_id set.
    """
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

        try:
            request_data = json.loads(job.request_json or "{}")
        except json.JSONDecodeError:
            request_data = {}

        topic = str(request_data.get("topic") or "").strip()
        parent_run_id = request_data.get("parent_run_id")
        report_language = project.language or "zh"

        if not topic:
            await analysis_job_service.mark_failed(
                db, job, "invalid_focused_insight_request", "Topic is missing.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        parent = await analysis_run_service.get_run(db, int(parent_run_id)) if parent_run_id else None
        if parent is None or parent.project_id != job.project_id:
            await analysis_job_service.mark_failed(
                db, job, "invalid_parent",
                "No completed analysis is available for this topic.",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        try:
            context = focused_insight_service.extract_focused_context(parent)
            prompt = focused_insight_service.build_focused_prompt(context, topic, report_language)
        except Exception as exc:
            await analysis_job_service.mark_failed(
                db, job, "invalid_focused_insight_request", str(exc),
                int((time.monotonic() - started_at) * 1000),
            )
            return

        user_id = job.user_id
        parent_id = parent.id

    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))

    try:
        request = AnalysisEngine.build_request(
            workbook_name="focused_insight",
            sheet_name="focused_insight",
            headers=["topic"],
            column_types={"topic": "text"},
            rows=[["focused_insight"]],
            analysis_type="focused_insight",
            plugin_name="sales",
            language=report_language,
            parameters={
                "system_prompt": prompt,
                "max_tokens": FOCUSED_INSIGHT_MAX_TOKENS,
                "thinking": FOCUSED_INSIGHT_THINKING,
            },
        )
        response = await engine.analyze(request)
    except TimeoutError as exc:
        await _fail(job_id, "provider_timeout", str(exc), started_at)
        return
    except ValueError as exc:
        await _fail(job_id, "invalid_data", str(exc), started_at)
        return
    except Exception as exc:
        code = "DATA_SERIALIZATION_ERROR" if isinstance(exc, TypeError) else "unknown"
        await _fail(job_id, code, f"{type(exc).__name__}: {exc}", started_at, exc=exc)
        return

    card = focused_insight_service.parse_focused_output(
        response.summary, topic, report_language
    )
    result_json = focused_insight_service.focused_result_json(
        card, topic, parent_id, context
    )
    summary = card.get("finding") or card.get("title") or "Focused insight completed."

    async with async_session() as db:
        job = await db.get(AnalysisJob, job_id)
        if not job or job.status != "running":
            return
        try:
            run = await analysis_run_service.create_run(
                db, job.project_id, summary, result_json, is_legacy=False,
                analysis_type="focused_insight",
                analysis_direction="topic",
                parent_run_id=parent_id,
                status="completed",
            )
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
        except Exception as exc:
            await analysis_job_service.mark_failed(
                db, job, "unknown",
                "专项分析结果保存失败，请重试。",
                int((time.monotonic() - started_at) * 1000),
            )
            return

    logger.info(
        "focused_insight_job_finished",
        extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": int((time.monotonic() - started_at) * 1000)},
    )


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
                db, job, "invalid_verification_request", "缺少验证所需的新数据集文件，请重新上传。",
                int((time.monotonic() - started_at) * 1000),
            )
            return
        if not purpose or not verification_service.is_valid_purpose(purpose):
            await analysis_job_service.mark_failed(
                db, job, "invalid_verification_request", "验证目的无效，请重新发起验证。",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        parent = await verification_service.resolve_parent_run(db, job.project_id, parent_run_id)
        if parent is None:
            await analysis_job_service.mark_failed(
                db, job, "invalid_parent",
                "没有可验证的历史分析，请先完成一次完整分析。",
                int((time.monotonic() - started_at) * 1000),
            )
            return

        parent_context = verification_service.extract_parent_context(parent)
        dataset_version = await verification_service.next_dataset_version(db, job.project_id)
        prompt = verification_service.build_verification_prompt(parent_context, purpose, report_language)

        # Capture scalar values so the closed ORM objects are never lazy-loaded.
        user_id = job.user_id
        parent_id = parent.id
        parent_result_json = parent.result_json
        project_schema_mapping = project.schema_mapping

    try:
        dataset = extract_canonical_dataset(user_id, saved_filename)
    except WorkbookAccessError as exc:
        await _fail(job_id, exc.code, _read_error_message(exc.code), started_at)
        return

    await _set_stage(job_id, "UPLOAD_SUCCESS")

    # M2.13.0: system-computed before/after metric changes (pure code, no AI).
    # Never fails the job: on any computation error the comparison simply has
    # no computed evidence and behaves exactly like the pre-M2.13 path.
    try:
        if project_schema_mapping:
            schema_mapping = project_schema_mapping
        else:
            detection_obj = await detect_schema_intelligent(
                dataset["headers"], dataset["column_types"], rows_sample=dataset["rows"][:200],
                industry_hint=project.industry, source_file=saved_filename,
            )
            blocked = core_confidence_blocked(detection_obj)
            if blocked:
                await _fail(
                    job_id, "SCHEMA_CONFIRM_REQUIRED",
                    "部分核心字段需要确认，请先在项目页确认字段映射。", started_at,
                )
                return
            schema_mapping = detection_obj.to_dict()
        computed_changes = verification_metrics.compute_before_after_changes(
            parent_result_json, dataset, schema_mapping
        )
    except Exception as exc:
        logger.warning(
            "verification_computed_metrics_failed",
            extra={"event": "verification", "job_id": job_id, "exception": type(exc).__name__},
        )
        computed_changes = []

    await _set_stage(job_id, "SCHEMA_SUCCESS")
    await _set_stage(job_id, "METRIC_SUCCESS")
    engine = AnalysisEngine()
    engine.set_provider(DeepSeekProvider(timeout=RUNNER_PROVIDER_TIMEOUT, max_retries=0))

    # M2.13.0: retry once when the AI output is unusable (empty / non-JSON /
    # provider error marker). A stricter JSON-only instruction is added to the
    # second attempt. Total AI spend per verification is bounded at 2 calls.
    response = None
    attempts = 0
    for attempt in range(VERIFICATION_MAX_AI_ATTEMPTS):
        attempts = attempt + 1
        parameters = {"system_prompt": prompt}
        if attempt >= 1:
            parameters["strict_json"] = (
                "Return ONLY one JSON object matching the output contract. "
                "No markdown, no commentary, no empty fields."
            )
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
                parameters=parameters,
            )
            response = await engine.analyze(request)
        except TimeoutError as exc:
            await _fail(job_id, "provider_timeout", _provider_error_message("provider_timeout"), started_at)
            return
        except ValueError as exc:
            await _fail(job_id, "invalid_data", "这份数据暂不支持分析，请检查数据格式。", started_at)
            return
        except Exception as exc:
            code = "DATA_SERIALIZATION_ERROR" if isinstance(exc, TypeError) else "unknown"
            await _fail(job_id, code, "分析服务异常，请稍后重试。", started_at, exc=exc)
            return
        if verification_parser.is_usable_comparison(response.summary):
            break
        logger.warning(
            "verification_ai_output_unusable",
            extra={"event": "verification", "job_id": job_id, "attempt": attempt},
        )

    await _set_stage(job_id, "AI_ANALYSIS_SUCCESS")
    ai_usable = verification_parser.is_usable_comparison(response.summary)
    if ai_usable:
        reliability = (
            verification_parser.RELIABILITY_AI_RETRY
            if attempts > 1
            else verification_parser.RELIABILITY_AI
        )
        comparison = verification_parser.parse_comparison(
            response.summary, computed_changes=computed_changes, reliability=reliability
        )
    else:
        comparison = verification_parser.build_computed_fallback(
            computed_changes, language=report_language, reason=response.summary[:200]
        )
    # M2.13.0 hardening: the effectiveness verdict is always derived from
    # system-computed evidence (verification_reliability_v1). The AI never
    # decides the verdict; it only explains the system numbers.
    comparison = verification_scoring.apply_code_verdict(comparison, computed_changes)
    comparison_json = comparison.model_dump_json()
    # M2.13.1: provenance for the verification dataset's field semantics.
    # Embedded into the stored comparison JSON (pydantic ignores the unknown
    # key on later reads), so the verification run is traceable like analyses.
    try:
        comparison_obj = json.loads(comparison_json)
        comparison_obj["schema_meta"] = derive_schema_meta(schema_mapping)
        comparison_json = json.dumps(comparison_obj, ensure_ascii=False)
    except Exception:
        pass
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
            # M2.14.0: code-compute per-action observations from the same
            # computed_metric_changes. Isolated: must never fail the job.
            try:
                created_obs = await action_execution_service.create_observations_for_verification(
                    db, job.project_id, run.id, computed_changes
                )
                if created_obs:
                    logger.info(
                        "action_observations_created",
                        extra={"event": "analysis_job", "job_id": job_id,
                               "verification_run_id": run.id, "created": created_obs},
                    )
            except Exception as obs_exc:
                logger.error(
                    "action_observations_failed",
                    extra={"event": "analysis_job", "job_id": job_id,
                           "verification_run_id": run.id},
                    exc_info=obs_exc,
                )
            # M2.12.4: refresh the project's business memory (derived cache).
            try:
                await memory_service.upsert_memory_after_run(job.project_id, run.id)
            except Exception as mem_exc:
                memory_service.log_memory_failure({"job_id": job_id, "run_id": run.id}, mem_exc)
            # M2.14.2 P1 fix: mark the job completed only AFTER observations and
            # the memory refresh have been persisted, so a "completed" job
            # always implies a fully consistent verification_history. This also
            # removes the poll-then-read race for consumers that poll the job.
            await _set_stage(job_id, "REPORT_SUCCESS")
            elapsed_ms = int((time.monotonic() - started_at) * 1000)
            await analysis_job_service.mark_completed(db, job, run.id, elapsed_ms)
        except Exception as exc:
            await analysis_job_service.mark_failed(
                db, job, "unknown",
                "验证结果保存失败，请重试。",
                int((time.monotonic() - started_at) * 1000),
            )
            return

    logger.info(
        "verification_job_finished",
        extra={"event": "analysis_job", "job_id": job_id, "elapsed_ms": int((time.monotonic() - started_at) * 1000)},
    )
