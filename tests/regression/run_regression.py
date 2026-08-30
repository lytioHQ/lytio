"""M2.14 Regression Gate.

Runs the four long-term quality gates introduced in M2.14.5 Phase 1.1:

1. Schema Regression: obvious customer headers must map to the right
   canonical fields and inventory turnover days must never become quantity.
2. Report Regression: a real analysis payload must satisfy the minimum
   report contract (health / metrics / insights / risks / recommendations).
3. UI Text Regression: customer-visible strings must never expose
   "AI分析", "Analysis failed", or raw internal field names.
4. Overflow Regression: extreme numbers render compact without clipping,
   and the exact value is available for tooltips.

Usage (repo root):
    backend\\.venv\\Scripts\\python.exe -X utf8 tests\\regression\\run_regression.py
"""

from __future__ import annotations

import asyncio
import json
import re
import subprocess
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_SRC = ROOT / "frontend" / "src"
sys.path.insert(0, str(ROOT / "backend"))

FAILED: list[str] = []


def check(name: str, fn) -> None:
    try:
        fn()
        print(f"PASS {name}")
    except Exception:
        FAILED.append(name)
        print(f"FAIL {name}")
        traceback.print_exc()


# ---------------------------------------------------------------------------
# 1. Schema Regression
# ---------------------------------------------------------------------------
def schema_regression() -> None:
    from app.services.schema_intelligence import detect_schema_intelligent

    headers = ["销售总额(元)", "购买数量", "订单日期", "销售单价(元)", "库存周转天数"]
    rows = [
        [3200.55, 3, "2026-07-01", 1000, 30],
        [1300.00, 2, "2026-07-02", 650, 28],
        [2400.00, 4, "2026-07-03", 600, 31],
        [1800.00, 3, "2026-07-04", 600, 29],
    ]
    column_types = {h: ("date" if h == "订单日期" else "number") for h in headers}
    detection = asyncio.run(
        detect_schema_intelligent(
            headers, column_types, rows_sample=rows, industry_hint="零售",
            source_file="regression.xlsx", use_agent=False,
        )
    )
    mapping = {m.canonical_key: m for m in detection.mappings}
    expected = {
        "sales_amount": "销售总额(元)",
        "sales_quantity": "购买数量",
        "order_date": "订单日期",
        "unit_price": "销售单价(元)",
        "inventory_turnover_days": "库存周转天数",
    }
    for key, source in expected.items():
        m = mapping.get(key)
        assert m is not None, f"missing {key}"
        assert m.source_column == source, f"{key} mapped to {m.source_column}"
        assert m.confidence_tier == "high", f"{key} tier={m.confidence_tier}"
        assert m.auto_confirmed is True, f"{key} not auto-confirmed"
    assert mapping["sales_quantity"].source_column != "库存周转天数"
    date_validation = (detection.relationship_evidence or {}).get("order_date_validation") or {}
    assert date_validation.get("available") is True
    assert date_validation.get("plausible") is True
    summary = detection.to_dict().get("schema_understanding") or {}
    assert summary.get("status") == "understood"


# ---------------------------------------------------------------------------
# 2. Report Regression
# ---------------------------------------------------------------------------
def report_regression() -> None:
    from app.services import analysis_result_quality

    computed_metrics = [
        {"metric_name": "total_sales", "value": 1234567.89, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "order_count", "value": 123, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "average_order_value", "value": 10037.14, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "customer_count", "value": 45, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "customer_concentration", "value": 0.62, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "sales_growth", "value": -0.04, "availability": "available", "confidence": "high", "assumptions": []},
        {"metric_name": "date_range", "value": {"min": "2026-07-01", "max": "2026-07-31"}, "availability": "available", "confidence": "high", "assumptions": []},
    ]
    health_score = {"health_score": 72, "health_level": "fair", "coverage": 0.8, "engine_version": "v1"}
    sparse = {
        "business_health": None,
        "metrics": [],
        "insights": [],
        "risks": [],
        "recommendations": [],
        "executive_summary": None,
    }
    complete = analysis_result_quality.ensure_complete(
        sparse, computed_metrics=computed_metrics, health_score=health_score, language="zh"
    )
    ok, missing = analysis_result_quality.assert_complete(complete)
    assert ok, f"report contract missing: {missing}"
    assert len(complete.get("metrics") or []) >= 3
    assert len(complete.get("insights") or []) >= 3
    assert len(complete.get("risks") or []) >= 2
    assert len(complete.get("recommendations") or []) >= 3
    assert complete.get("business_health", {}).get("score") == 72
    assert complete.get("executive_summary", {}).get("content")


# ---------------------------------------------------------------------------
# 3. UI Text Regression
# ---------------------------------------------------------------------------
BANNED_PHRASES = ("AI分析", "Analysis failed")
BANNED_FIELD_WORDS = ("title", "finding", "evidence", "action", "summary")


def _iter_text_files():
    for ext in ("ts", "tsx"):
        yield from FRONTEND_SRC.rglob(f"*.{ext}")


def ui_text_regression() -> None:
    problems: list[str] = []

    for path in _iter_text_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        for banned in BANNED_PHRASES:
            for m in re.finditer(re.escape(banned), text):
                line_no = text[: m.start()].count("\n") + 1
                problems.append(f"{path.relative_to(ROOT)}:{line_no} banned phrase {banned!r}")

    # i18n values must not equal a raw internal field name.
    i18n_path = FRONTEND_SRC / "lib" / "i18n.ts"
    for line_no, line in enumerate(i18n_path.read_text(encoding="utf-8").splitlines(), 1):
        m = re.match(r'\s*"([^"]+)":\s*"([^"]*)",?\s*$', line)
        if not m:
            continue
        value = m.group(2).strip()
        if value in BANNED_FIELD_WORDS:
            problems.append(f"frontend/src/lib/i18n.ts:{line_no} raw field label {value!r}")

    # JSX text nodes equal to raw field names (e.g. >title<).
    for path in FRONTEND_SRC.rglob("*.tsx"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for word in BANNED_FIELD_WORDS:
            pattern = re.compile(r">\s*" + re.escape(word) + r"\s*<")
            for m in pattern.finditer(text):
                line_no = text[: m.start()].count("\n") + 1
                problems.append(f"{path.relative_to(ROOT)}:{line_no} raw JSX text {word!r}")

    assert not problems, "\n".join(problems[:30])


# ---------------------------------------------------------------------------
# 4. Overflow Regression
# ---------------------------------------------------------------------------
def overflow_regression() -> None:
    node = "node"
    script = ROOT / "tests" / "regression" / "overflow_regression.mjs"
    result = subprocess.run(
        [node, "--experimental-strip-types", str(script)],
        cwd=str(ROOT), capture_output=True, text=True, timeout=60,
    )
    if result.returncode != 0:
        raise AssertionError(result.stdout + result.stderr)
    assert "OVERFLOW REGRESSION PASS" in result.stdout




# ---------------------------------------------------------------------------
# 4. Focused Insight Regression
# ---------------------------------------------------------------------------

def migration_idempotency_regression() -> None:
    """Re-running migrations must never overwrite app-persisted run types."""
    migration = (ROOT / "backend" / "migrations" / "001_analysis_run_verification.sql").read_text(encoding="utf-8")
    assert "AND analysis_type = 'health_scan'" in migration
    assert "AND analysis_direction = 'overview'" in migration

def focused_insight_regression() -> None:
    from app.services import focused_insight_service
    from app.services import analysis_job_runner

    # The provider counts reasoning tokens against max_tokens; 900 truncated the
    # card and could leave evidence/action empty. Keep the budget high enough to
    # return a complete five-field JSON card.
    assert analysis_job_runner.FOCUSED_INSIGHT_MAX_TOKENS >= 1500
    assert analysis_job_runner.FOCUSED_INSIGHT_THINKING == {"type": "disabled"}

    normal = focused_insight_service.parse_focused_output(
        '{"title": "T", "finding": "F", "evidence": "E", "explanation": "X", "action": "A"}',
        "growth_opportunity", "zh",
    )
    assert normal["title"] == "T" and normal["evidence"] == "E" and normal["action"] == "A"

    double_encoded = focused_insight_service.parse_focused_output(
        '{"title": "T2", "finding": "F2", "evidence": "E2", "explanation": "X2", "action": "A2"}',
        "growth_opportunity", "zh",
    )
    assert double_encoded["title"] == "T2" and double_encoded["evidence"] == "E2"
    assert double_encoded["action"] == "A2"

    nested_payload = json.dumps(
        {"finding": json.dumps(
            {"title": "Nested", "finding": "F3", "evidence": "E3",
             "explanation": "X3", "action": "A3"}
        )}
    )
    nested = focused_insight_service.parse_focused_output(
        nested_payload, "growth_opportunity", "zh",
    )
    assert nested["title"] == "Nested" and nested["finding"] == "F3"
    assert nested["evidence"] == "E3" and nested["action"] == "A3"

def focused_ui_text_regression() -> None:
    card = (FRONTEND_SRC / "components" / "business" / "FocusedInsightCard.tsx").read_text(encoding="utf-8")
    report = (FRONTEND_SRC / "app" / "project" / "[id]" / "report" / "[runId]" / "page.tsx").read_text(encoding="utf-8")

    assert "<pre" not in card, "focused card must not render a raw code block"
    assert "JSON.stringify" not in card, "focused card must not serialize the result as JSON"

    focused_branch = report.split('=== "focused_insight" && resultData?.focused_insight', 1)[1].split(") : resultData", 1)[0]
    assert "report.execSummary" not in focused_branch, "focused page must not duplicate the finding as an executive summary"

    visible_text = "".join(re.findall(r">([^<{]*?)\s*<", card + focused_branch))
    for banned in ("title:", "finding:", "evidence:", "explanation:", "action:"):
        assert banned not in visible_text, f"customer-visible field label {banned!r} must not appear"

    for key in ("focus.card.finding", "focus.card.evidence", "focus.card.explanation", "focus.card.action"):
        assert f'"{key}"' in card, f"focused card is missing i18n section {key}"

def main() -> None:
    check("schema_regression", schema_regression)
    check("report_regression", report_regression)
    check("ui_text_regression", ui_text_regression)
    check("overflow_regression", overflow_regression)
    check("focused_ui_text_regression", focused_ui_text_regression)
    check("focused_insight_regression", focused_insight_regression)
    check("migration_idempotency_regression", migration_idempotency_regression)
    if FAILED:
        print(f"\n{len(FAILED)} regression gate(s) failed: {', '.join(FAILED)}")
        sys.exit(1)
    print("\nALL M2.14.5 PHASE1.1 REGRESSION GATES PASSED")


if __name__ == "__main__":
    main()
