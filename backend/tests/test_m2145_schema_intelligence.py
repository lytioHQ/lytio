"""M2.14.5 Schema Intelligence backend tests (pure code, no DB/AI).

Covers:
- obvious headers auto-confirmed at high tier (sales amount/quantity/unit price/date)
- inventory turnover days is never mapped to quantity
- text-formatted numbers and text dates are understood
- real customer Excel files through the full intelligent pipeline
- schema understanding summary is emitted
"""
import asyncio
import sys
from types import SimpleNamespace
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.schema_intelligence import detect_schema_intelligent
from app.services.schema_intelligence import SchemaUnderstandingAgent
from app.services.schema_intelligence import build_column_profile
from app.services.schema_mapper import detect_schema
from app.services.workbook_service import extract_canonical_dataset

FIXTURES = [
    (999, "m2144_fieldmap.xlsx", {
        "sales_amount", "sales_quantity", "order_date", "unit_price",
    }),
    (999, "uat_repro.xlsx", {
        "sales_amount", "sales_quantity", "unit_price", "inventory_turnover_days",
        "cost_amount", "profit_amount",
    }),
    (9998, "C2_amount_as_text.xlsx", {
        "order_date", "product_name", "sales_amount", "sales_quantity",
    }),
    (9998, "B_realworld_business.xlsx", {
        "order_date", "product_name", "customer_name", "sales_amount", "sales_quantity",
    }),
    (1, "1.xlsx", {"order_date", "sales_amount", "sales_quantity"}),
]


def _detect(headers, column_types, rows, industry_hint=None, source_file=None):
    return asyncio.run(
        detect_schema_intelligent(
            headers, column_types, rows_sample=rows[:200],
            industry_hint=industry_hint, source_file=source_file, use_agent=False,
        )
    )


def _by_key(detection):
    return {m.canonical_key: m for m in detection.mappings}


def test_obvious_customer_headers_are_auto_confirmed():
    headers = ["销售总额(元)", "购买数量", "订单日期", "销售单价(元)"]
    rows = [
        ["2026-07-01", "智能手表", 3200.55, 3, 1000],
        ["2026-07-02", "智能音箱", 1300.00, 2, 650],
    ]
    types = {
        "销售总额(元)": "number",
        "购买数量": "number",
        "订单日期": "date",
        "销售单价(元)": "number",
    }
    detection = _detect(headers, types, rows, industry_hint="零售")
    mapping = _by_key(detection)

    assert mapping["sales_amount"].source_column == "销售总额(元)"
    assert mapping["sales_amount"].confidence_tier == "high"
    assert mapping["sales_amount"].auto_confirmed is True
    assert mapping["sales_quantity"].source_column == "购买数量"
    assert mapping["sales_quantity"].confidence_tier == "high"
    assert mapping["order_date"].source_column == "订单日期"
    assert mapping["order_date"].confidence_tier == "high"
    assert mapping["unit_price"].source_column == "销售单价(元)"
    assert mapping["unit_price"].confidence_tier == "high"


def test_inventory_turnover_days_never_quantity():
    headers = ["销售金额", "销售数量", "销售单价", "库存周转天数(天)"]
    rows = [[5000, 5, 1000, 30] for _ in range(8)]
    types = {h: "number" for h in headers}
    detection = _detect(headers, types, rows, industry_hint="零售")
    mapping = _by_key(detection)

    assert mapping["inventory_turnover_days"].source_column == "库存周转天数(天)"
    assert mapping["inventory_turnover_days"].confidence_tier == "high"
    assert mapping.get("sales_quantity").source_column != "库存周转天数(天)"


def test_profit_equals_sales_minus_cost_relationship():
    headers = ["销售金额", "成本", "利润", "销售数量"]
    rows = [[5000, 3000, 2000, 5], [2400, 1800, 600, 3], [8000, 5000, 3000, 8]]
    types = {h: "number" for h in headers}
    detection = _detect(headers, types, rows, industry_hint="零售")
    relation = (detection.relationship_evidence or {}).get("sales_minus_cost_equals_profit") or {}
    assert relation.get("available") is True
    assert relation.get("ratio", 0) == 1.0
    mapping = _by_key(detection)
    assert mapping["profit_amount"].confidence >= 0.9
    assert mapping["cost_amount"].confidence >= 0.9


def test_replaced_file_clears_old_schema_mapping():
    from sqlalchemy.dialects import postgresql
    from app.services.project_service import set_project_file

    class FakeDB:
        def __init__(self):
            self.statement = None
        async def execute(self, statement, *args, **kwargs):
            self.statement = statement
        async def commit(self):
            pass

    db = FakeDB()
    asyncio.run(set_project_file(db, 42, 7, "old.xlsx", "new.xlsx"))
    sql = str(db.statement.compile(dialect=postgresql.dialect()))
    assert "schema_mapping" in sql
    compiled = db.statement.compile(dialect=postgresql.dialect())
    assert compiled.params.get("schema_mapping") is None


def test_amount_unit_scales_are_understood():
    headers = ["销售额(万元)", "购买数量", "订单日期"]
    rows = [
        ["2026-07-01", 10, 5],
        ["2026-07-02", 20, 8],
    ]
    types = {"销售额(万元)": "number", "购买数量": "number", "订单日期": "date"}
    detection = _detect(headers, types, rows, industry_hint="零售")
    mapping = _by_key(detection)

    assert mapping["sales_amount"].source_column == "销售额(万元)"
    assert mapping["sales_amount"].confidence_tier == "high"
    assert mapping["sales_quantity"].source_column == "购买数量"
    assert mapping["order_date"].source_column == "订单日期"


def test_text_numbers_and_text_dates_are_understood():
    headers = ["订单日期", "产品名称", "客户名称", "销售金额", "购买数量"]
    rows = [
        ["2026-06-02 00:00:00", "智能手表", "华美贸易", "3,200.55", "3"],
        ["2026-06-04 00:00:00", "智能音箱", "星澜零售", "约1300", "2"],
    ]
    types = {
        "订单日期": "text",
        "产品名称": "text",
        "客户名称": "text",
        "销售金额": "text",
        "购买数量": "text",
    }
    detection = _detect(headers, types, rows, industry_hint="零售")
    mapping = _by_key(detection)

    assert mapping["order_date"].confidence_tier == "high"
    assert mapping["sales_amount"].confidence_tier == "high"
    assert mapping["sales_quantity"].confidence_tier == "high"
    assert mapping["product_name"].confidence_tier == "high"


def test_schema_understanding_summary_emitted():
    headers = ["订单日期", "销售金额", "购买数量", "商品名称"]
    rows = [["2026-07-01", 100, 2, "A"], ["2026-07-02", 200, 3, "B"]]
    types = {"订单日期": "date", "销售金额": "number", "购买数量": "number", "商品名称": "text"}
    detection = _detect(headers, types, rows, industry_hint="零售")
    summary = detection.to_dict().get("schema_understanding") or {}

    assert summary.get("status") == "understood"
    assert summary.get("quality_score", 0) >= 75
    assert summary.get("auto_confirmed_count", 0) >= 3
    assert summary.get("core_fields")
    assert detection.relationship_evidence is not None


def test_real_customer_excel_pipeline():
    repo_root = Path(__file__).resolve().parent.parent
    checked = 0
    for user_id, filename, expected_keys in FIXTURES:
        path = repo_root / "storage" / "uploads" / str(user_id) / filename
        if not path.exists():
            continue
        dataset = extract_canonical_dataset(user_id, filename)
        detection = _detect(
            dataset["headers"], dataset["column_types"], dataset["rows"],
            industry_hint="零售", source_file=filename,
        )
        mapping = _by_key(detection)
        for key in expected_keys:
            assert key in mapping, f"{filename}: missing {key}"
            assert mapping[key].confidence_tier == "high", f"{filename}: {key} not high"
        assert detection.to_dict().get("schema_understanding"), f"{filename}: no summary"
        checked += 1
    assert checked >= 3, f"only {checked} real fixture(s) found"


def test_realworld_title_row_is_skipped():
    repo_root = Path(__file__).resolve().parent.parent
    path = repo_root / "storage" / "uploads" / "9998" / "B_realworld_business.xlsx"
    if not path.exists():
        return
    dataset = extract_canonical_dataset(9998, "B_realworld_business.xlsx")
    assert dataset["headers"] == ["订单日期", "商品名称", "客户名称", "销售金额", "数量", "区域"]
    detection = _detect(
        dataset["headers"], dataset["column_types"], dataset["rows"],
        industry_hint="零售", source_file="B_realworld_business.xlsx",
    )
    assert "2026年7月销售明细表" not in detection.source_headers
    assert _by_key(detection)["sales_amount"].source_column == "销售金额"


def test_agent_output_is_parsed_into_decisions():
    headers = ["销售单价(元)", "购买数量", "销售总额(元)"]
    rows = [[1000, 5, 5000], [800, 3, 2400]]
    types = {h: "number" for h in headers}
    detection = detect_schema(headers, types, rows_sample=rows)
    profile = build_column_profile(headers, rows, types)

    class FakeProvider:
        async def analyze(self, request):
            payload = [
                '{"field_name":"销售单价(元)","canonical_type":"unit_price","confidence":0.98,"reason":"agent confirmed","needs_confirmation":false}',
                '{"field_name":"购买数量","canonical_type":"sales_quantity","confidence":0.98,"reason":"agent confirmed","needs_confirmation":false}',
                '{"field_name":"销售总额(元)","canonical_type":"sales_amount","confidence":0.98,"reason":"agent confirmed","needs_confirmation":false}',
            ]
            return SimpleNamespace(summary="[" + ",".join(payload) + "]")

    agent = SchemaUnderstandingAgent(provider=FakeProvider())
    decisions = asyncio.run(agent.understand(profile, detection))
    by_source = {d["field_name"]: d for d in decisions}
    assert by_source["销售单价(元)"]["canonical_type"] == "unit_price"
    assert by_source["购买数量"]["canonical_type"] == "sales_quantity"
    assert by_source["销售总额(元)"]["canonical_type"] == "sales_amount"
    assert all(d["confidence"] == 0.98 for d in decisions)
