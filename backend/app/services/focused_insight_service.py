"""M2.14.4 focused-insight service.

Focused insight answers ONE user-chosen topic ("专项深入分析") using the
already-persisted analysis run. It never re-reads the Excel file, never runs
the full analysis pipeline, and never includes raw data rows. The prompt is a
small compact context + a small JSON output contract, so the API cost target
is well below 20% of a full analysis.

No I/O. No AI calls here; this module only builds/parses.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.models.analysis_run import AnalysisRun

FOCUSED_INSIGHT_PROMPT_DIR = Path(__file__).resolve().parent.parent.parent / "prompts" / "sales"
FOCUSED_INSIGHT_PROMPT = "focused_insight_v1"

LANG_INSTRUCTIONS = {
    "zh": "Respond in Chinese (中文).",
    "en": "Respond in English.",
    "ja": "Respond in Japanese (日本語).",
    "de": "Respond in German (Deutsch).",
}

OUTPUT_KEYS = ("title", "finding", "evidence", "explanation", "action")


def _parse_result_json(result_json: str | None) -> dict:
    if not result_json:
        return {}
    try:
        data = json.loads(result_json)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _list_of_dicts(value) -> list[dict]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def extract_focused_context(parent_run: AnalysisRun) -> dict:
    """Return a compact context (no rows, no workbook data) for one topic."""
    data = _parse_result_json(parent_run.result_json)

    executive_summary = data.get("executive_summary") or {}
    business_health = data.get("business_health") or {}
    metrics = _list_of_dicts(data.get("metrics")) or _list_of_dicts(data.get("computed_metrics"))
    recommendations = _list_of_dicts(data.get("recommendations"))
    insights = _list_of_dicts(data.get("insights"))
    risks = _list_of_dicts(data.get("risks"))

    return {
        "analysis_type": data.get("analysis_type") or parent_run.analysis_type,
        "analysis_direction": data.get("analysis_direction") or parent_run.analysis_direction,
        "summary": (
            executive_summary.get("content")
            if isinstance(executive_summary, dict)
            else parent_run.summary or ""
        ),
        "business_health": {
            "score": business_health.get("score"),
            "level": business_health.get("level", ""),
            "summary": business_health.get("summary", ""),
        }
        if isinstance(business_health, dict)
        else None,
        "metrics": [
            {
                "name": m.get("name", ""),
                "value": m.get("value", ""),
                "trend": m.get("trend", "stable"),
            }
            for m in metrics[:20]
        ],
        "recommendations": [
            {
                "title": r.get("title", ""),
                "description": r.get("description", ""),
                "priority": r.get("priority", ""),
            }
            for r in recommendations[:15]
        ],
        "insights": [
            {"title": i.get("title", ""), "description": i.get("description", "")}
            for i in insights[:15]
        ],
        "risks": [
            {"title": r.get("title", ""), "description": r.get("description", "")}
            for r in risks[:15]
        ],
    }


def build_focused_prompt(context: dict, topic: str, language: str) -> str:
    """Render the focused-insight prompt template."""
    template_path = FOCUSED_INSIGHT_PROMPT_DIR / f"{FOCUSED_INSIGHT_PROMPT}.md"
    if not template_path.exists():
        raise FileNotFoundError(f"Focused insight prompt template not found: {template_path}")
    template = template_path.read_text(encoding="utf-8")
    lang_instr = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    context_json = json.dumps(context, ensure_ascii=False, indent=2)
    return (
        template
        .replace("{{language_instruction}}", lang_instr)
        .replace("{{topic}}", topic)
        .replace("{{parent_analysis}}", context_json)
    )


def parse_focused_output(content: str, topic: str, language: str = "zh") -> dict:
    """Parse the model's JSON card; fall back to a safe text-only card.

    Never raises for malformed output: the UI still gets a readable result.
    """
    text = (content or "").strip()
    if text:
        # Strip common markdown fences around the JSON payload.
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```", 2)[1] if cleaned.count("```") >= 2 else cleaned.strip("`")
        try:
            data = json.loads(cleaned)
            # Some models double-encode the whole card as a JSON string.
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except (json.JSONDecodeError, TypeError):
                    data = {}
            if isinstance(data, dict):
                # Some models nest the card object inside "finding" instead of
                # returning the five top-level keys (Phase 1.1 hardening).
                nested = data.get("finding")
                if isinstance(nested, str) and nested.strip().startswith("{"):
                    try:
                        nested_data = json.loads(nested)
                        if isinstance(nested_data, dict):
                            for k in OUTPUT_KEYS:
                                if nested_data.get(k):
                                    data[k] = nested_data[k]
                    except (json.JSONDecodeError, TypeError):
                        pass
                missing = [k for k in OUTPUT_KEYS if not data.get(k)]
                if not missing:
                    return data
                for key in missing:
                    data[key] = ""
                return data
        except (json.JSONDecodeError, TypeError):
            pass

    fallback_title = {
        "zh": "专项分析",
        "en": "Focused analysis",
        "ja": "特化分析",
        "de": "Fokussierte Analyse",
    }.get(language, "Focused analysis")
    return {
        "title": fallback_title,
        "finding": text[:500] or "当前分析结果中没有生成该主题的结论。",
        "evidence": "",
        "explanation": "",
        "action": "",
        "raw_output": text[:1000],
    }


def focused_result_json(card: dict, topic: str, parent_run_id: int, context: dict | None = None) -> str:
    """Wrap the focused card in a result_json envelope (additive fields)."""
    data: dict[str, Any] = {
        "analysis_type": "focused_insight",
        "analysis_direction": "topic",
        "focused_insight": card,
        "focused_topic": topic,
        "parent_run_id": parent_run_id,
        "api_cost_mode": "focused_insight",
    }
    if context is not None:
        data["context_metrics_count"] = len(context.get("metrics") or [])
        data["context_items_count"] = (
            len(context.get("insights") or [])
            + len(context.get("risks") or [])
            + len(context.get("recommendations") or [])
        )
    return json.dumps(data, ensure_ascii=False)
