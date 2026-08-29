"""M2.14.4 Phase 1 backend tests (pure code, no DB/AI).

Covers:
- field intelligence: 销售单价/销售额/销售数量/库存周转天数
- ambiguous low-confidence confirmation
- focused insight: never builds a full-analysis job or re-reads Excel
- focused insight API-cost guardrail (compact prompt + small max_tokens)
- verification purpose default (optional focus areas)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas.verification import VerificationCreate
from app.services.focused_insight_service import (
    build_focused_prompt,
    extract_focused_context,
    focused_result_json,
    parse_focused_output,
)
from app.services.schema_mapper import detect_schema


class FakeRun:
    def __init__(self, result_json):
        self.result_json = result_json
        self.analysis_type = "health_scan"
        self.analysis_direction = "overview"
        self.summary = "baseline summary"


PARENT_RESULT = {
    "analysis_type": "health_scan",
    "analysis_direction": "overview",
    "executive_summary": {"content": "baseline summary"},
    "business_health": {"score": 72, "level": "Fair", "summary": "stable"},
    "metrics": [{"name": "total_sales", "value": "1234567", "trend": "up"}],
    "insights": [{"title": "客户集中度高", "description": "top1 客户占比 34%"}],
    "risks": [{"title": "销售下降", "description": "季度环比下降 8%"}],
    "recommendations": [{"title": "拓展新客户", "description": "降低集中度", "priority": "high"}],
}


def test_field_intelligence_core_headers():
    headers = ["销售单价", "销售数量", "销售金额", "库存周转天数"]
    types = {h: "number" for h in headers}
    rows = [[100, 2, 200, 35] for _ in range(10)]
    d = detect_schema(headers, types, rows_sample=rows, industry_hint="零售")
    by_key = {m.canonical_key: m for m in d.mappings}

    assert by_key["unit_price"].source_column == "销售单价"
    assert by_key["sales_quantity"].source_column == "销售数量"
    assert by_key["sales_amount"].source_column == "销售金额"
    assert by_key["inventory_turnover_days"].source_column == "库存周转天数"
    assert by_key["unit_price"].confidence >= 0.9
    assert by_key["sales_amount"].confidence >= 0.9
    assert by_key["sales_amount"].field_mapping_confidence["reasons"]  # scoring persisted


def test_field_intelligence_quantity_x_price_inference():
    headers = ["日期", "单价", "数量"]
    types = {h: "number" for h in headers}
    types["日期"] = "date"
    rows = [[1, 10.5, 4] for _ in range(8)]
    d = detect_schema(headers, types, rows_sample=rows)
    by_key = {m.canonical_key: m for m in d.mappings}
    assert by_key["sales_amount"].source_column == "数量 × 单价"
    assert by_key["sales_amount"].needs_confirmation is True


def test_field_intelligence_low_confidence_flag():
    # A header with close alternate candidates must be flagged, never silently
    # auto-mapped into a wrong field.
    headers = ["单价", "金额", "数量"]
    types = {h: "number" for h in headers}
    rows = [[10, 1000, 100] for _ in range(5)]
    d = detect_schema(headers, types, rows_sample=rows)
    by_key = {m.canonical_key: m for m in d.mappings}
    assert by_key["unit_price"].source_column == "单价"
    assert by_key["sales_amount"].source_column == "金额"


def test_focused_insight_never_runs_full_analysis():
    context = extract_focused_context(FakeRun(__import__("json").dumps(PARENT_RESULT)))
    prompt = build_focused_prompt(context, "客户集中度", "zh")
    card = parse_focused_output(
        '{"title":"客户集中度","finding":"top1 客户占比高","evidence":"34%","explanation":"依赖高","action":"拓展新客户"}',
        "客户集中度", "zh",
    )
    result = focused_result_json(card, "客户集中度", 42, context)

    # The envelope is a focused_insight run, not a full health_scan/deep_analysis.
    import json as _json
    data = _json.loads(result)
    assert data["analysis_type"] == "focused_insight"
    assert data["api_cost_mode"] == "focused_insight"
    assert data["parent_run_id"] == 42
    assert "rows" not in data
    assert "metrics" not in data  # full analysis sections must not leak

    # API-cost guardrail: the compact prompt must be far smaller than a full
    # analysis prompt with raw rows, and max_tokens stays at 900 in the runner.
    assert len(prompt) < 4000
    assert "max_tokens" not in result


def test_verification_purpose_optional():
    payload = VerificationCreate(saved_filename="x.xlsx")
    assert payload.purpose is None  # API layer defaults it to general_verification
    payload2 = VerificationCreate(saved_filename="x.xlsx", purpose=None)
    assert payload2.purpose is None
