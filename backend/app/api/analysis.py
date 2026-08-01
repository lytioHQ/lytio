import re
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.plugins.sales import SalesPlugin
from app.plugins.sales.recommendations import get_recommendations
from app.providers.deepseek import DeepSeekProvider
from app.services.analysis_engine import engine
from app.core.logging_config import logger
from app.services import audit_service


router = APIRouter(prefix="/api/analysis", tags=["analysis"])

if not engine.has_provider:
    engine.set_provider(DeepSeekProvider())

sales_plugin = SalesPlugin()


class AnalysisPayload(BaseModel):
    saved_filename: str
    sheet_name: str = "Sheet1"
    headers: list[str]
    column_types: dict[str, str]
    rows: list[list]
    plugin: str = "sales"
    report_language: str = "zh"
    ui_language: str = "zh"
    project_id: int | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatPayload(BaseModel):
    plugin: str = "sales"
    report_language: str = "zh"
    report_summary: str = ""
    report_highlights: list[str] = []
    report_warnings: list[str] = []
    headers: list[str] = []
    column_types: dict[str, str] = {}
    rows: list[list] = []
    sheet_name: str = "Sheet1"
    question: str
    history: list[ChatMessage] = []
    project_id: int | None = None


def _detect_multi_language(headers: list[str]) -> bool:
    cjk = re.compile(r"[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]")
    latin = re.compile(r"[a-zA-Z]")
    has_cjk = False
    has_latin = False
    for h in headers:
        if cjk.search(h):
            has_cjk = True
        if latin.search(h):
            has_latin = True
        if has_cjk and has_latin:
            return True
    return False


LANG_NAMES = {"zh": "Chinese", "en": "English", "ja": "Japanese", "de": "German"}


def _get_provider() -> DeepSeekProvider:
    p = engine._provider
    if p is None:
        raise RuntimeError("No AI provider configured")
    return p


@router.post("/sales")
async def analyze_sales(
    payload: AnalysisPayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await sales_plugin.analyze(
            engine,
            workbook_name=payload.saved_filename,
            sheet_name=payload.sheet_name,
            headers=payload.headers,
            column_types=payload.column_types,
            rows=payload.rows,
            language=payload.report_language,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    # Audit log + structured logging
    await audit_service.log_event(db, user.id, "analysis", payload.project_id)
    logger.info("analysis_completed", extra={"event": "analysis", "user_id": user.id, "project_id": payload.project_id})

    metadata = result.metadata
    metadata["multi_language"] = _detect_multi_language(payload.headers)

    response = {
        "plugin": payload.plugin,
        "sheet": payload.sheet_name,
        "summary": result.summary,
        "highlights": result.highlights,
        "warnings": result.warnings,
        "recommendations": result.recommendations,
        "metadata": metadata,
        "recommended_questions": get_recommendations(payload.plugin, payload.report_language),
        "is_legacy": result.is_legacy,
    }
    # Include typed result if available (V2)
    if result.result is not None:
        response["result"] = result.result.model_dump()
    return response


@router.post("/chat")
async def chat_followup(
    payload: ChatPayload,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Follow-up conversation based on current analysis context."""
    provider = _get_provider()

    lang_name = LANG_NAMES.get(payload.report_language, "Chinese")

    context_parts = [f"You are a senior data analyst assistant. Respond in {lang_name}."]
    context_parts.append(f"You are analyzing a worksheet named '{payload.sheet_name}'.")

    if payload.report_summary:
        context_parts.append(f"\n## Current Analysis Report Summary\n{payload.report_summary}")

    if payload.report_highlights:
        context_parts.append("\n## Key Findings\n" + "\n".join(f"- {h}" for h in payload.report_highlights))

    if payload.report_warnings:
        context_parts.append("\n## Risks\n" + "\n".join(f"- {w}" for w in payload.report_warnings))

    if payload.headers:
        col_info = "\n".join(
            f"  - {h} ({payload.column_types.get(h, 'unknown')})"
            for h in payload.headers
        )
        context_parts.append(f"\n## Dataset Columns\n{col_info}")

    if payload.rows:
        sample = payload.rows[:30]
        data_text = "\n".join(" | ".join(str(v) for v in row) for row in sample)
        context_parts.append(f"\n## Sample Data ({len(sample)} rows)\n{data_text}")

    context_parts.append(
        "\n## Instructions\n"
        "Answer the user's question based ONLY on the provided data and analysis context. "
        "Be concise and specific. If the question cannot be answered from the data, say so clearly."
    )

    system_prompt = "\n".join(context_parts)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in payload.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.question})

    api_key = provider._api_key
    base_url = provider._base_url
    model = provider._model

    payload_body = {
        "model": model,
        "messages": messages,
        "temperature": 0.5,
        "max_tokens": 2048,
    }

    started_at = time.monotonic()

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                json=payload_body,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            raw = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")

    latency_ms = int((time.monotonic() - started_at) * 1000)

    try:
        answer = raw["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=500, detail="Unexpected AI response format")

    usage = raw.get("usage", {})

    return {
        "answer": answer,
        "recommended_questions": get_recommendations(payload.plugin, payload.report_language),
        "metadata": {
            "model": raw.get("model", model),
            "latency_ms": latency_ms,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
        },
    }