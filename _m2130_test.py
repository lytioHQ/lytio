# -*- coding: utf-8 -*-
"""M2.13.0 Verification Reliability Layer - offline logic tests (no DB).

Covers:
- verification_metrics: system-computed before/after changes (hard math)
- verification_scoring: transparent verdict rule (verification_reliability_v1)
- verification_parser: AI-boundary merge, usability check, computed fallback

Run from the repo root with backend on the path:
    $env:PYTHONPATH="backend"; .venv/Scripts/python.exe -B _m2130_test.py
"""

import json

from app.services import verification_metrics as vm
from app.services import verification_parser as vp
from app.services import verification_scoring as vs
from app.schemas.verification import ComparisonResult

PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    if not cond:
        print(f"  FAIL {name}: {detail}")


# ---------------------------------------------------------------------------
# fixtures
# ---------------------------------------------------------------------------
MAPPING = {
    "mappings": [
        {"canonical_key": "sales_amount", "source_column": "销售额", "availability": "available"},
        {"canonical_key": "order_id", "source_column": "订单号", "availability": "available"},
        {"canonical_key": "product_name", "source_column": "产品", "availability": "available"},
        {"canonical_key": "customer_name", "source_column": "客户", "availability": "available"},
        {"canonical_key": "order_date", "source_column": "成交日期", "availability": "available"},
        {"canonical_key": "sales_quantity", "source_column": "数量", "availability": "available"},
    ]
}

BEFORE_JSON = json.dumps(
    {
        "computed_metrics": [
            {"metric_name": "total_sales", "value": 1497700.0, "availability": "available", "confidence": "high"},
            {"metric_name": "order_count", "value": 12, "availability": "available", "confidence": "high"},
            {"metric_name": "average_order_value", "value": 124808.33, "availability": "available", "confidence": "high"},
            {"metric_name": "customer_count", "value": 4, "availability": "available", "confidence": "high"},
            {"metric_name": "customer_concentration", "value": 0.656, "availability": "available", "confidence": "high"},
            {"metric_name": "sales_growth", "value": 0.03, "availability": "available", "confidence": "high"},
        ]
    },
    ensure_ascii=False,
)

AFTER_DATASET = {
    "workbook_name": "v2.xlsx",
    "sheet_name": "Sheet1",
    "headers": ["订单号", "产品", "客户", "数量", "销售额", "成交日期"],
    "column_types": {},
    "rows": [
        ["SO-201", "A旗舰款", "华东集团", 10, 220000, "2026-04-05"],
        ["SO-202", "B智能款", "华南集团", 8, 160000, "2026-04-12"],
        ["SO-203", "C便携款", "华北集团", 12, 90000, "2026-04-19"],
        ["SO-204", "A旗舰款", "华东集团", 9, 200000, "2026-04-26"],
        ["SO-205", "D新品类", "新客户甲", 15, 120000, "2026-05-03"],
        ["SO-206", "B智能款", "新客户乙", 11, 180000, "2026-05-10"],
        ["SO-207", "A旗舰款", "华东集团", 10, 210000, "2026-05-17"],
        ["SO-208", "C便携款", "华北集团", 13, 95000, "2026-05-24"],
        ["SO-209", "D新品类", "新客户甲", 14, 130000, "2026-05-31"],
        ["SO-210", "B智能款", "新客户乙", 12, 190000, "2026-06-07"],
        ["SO-211", "A旗舰款", "华东集团", 11, 225000, "2026-06-14"],
        ["SO-212", "D新品类", "新客户甲", 16, 140000, "2026-06-21"],
    ],
}

# ---------------------------------------------------------------------------
# 1. verification_metrics
# ---------------------------------------------------------------------------
changes = vm.compute_before_after_changes(BEFORE_JSON, AFTER_DATASET, MAPPING)
by_name = {c["metric_name"]: c for c in changes}
check("changes_cover_all_comparable", set(by_name.keys()) == set(vm.COMPARABLE_METRICS), str(list(by_name)))

ts = by_name["total_sales"]
check("total_sales_before", ts["before"] == 1497700, str(ts["before"]))
check("total_sales_after", ts["after"] == 1960000, str(ts["after"]))
check("total_sales_pct", abs(ts["percentage_change"] - 30.87) < 0.01, str(ts["percentage_change"]))
check("total_sales_direction", ts["direction"] == "improved", str(ts["direction"]))

oc = by_name["order_count"]
check("order_count_unchanged", oc["direction"] == "unchanged" and oc["status"] == "available", str(oc))

conc = by_name["customer_concentration"]
check("concentration_down_is_improved", conc["direction"] == "improved", str(conc["direction"]))
check("concentration_rate_no_pct", conc["percentage_change"] is None, str(conc["percentage_change"]))

growth = by_name["sales_growth"]
check("growth_rate_no_pct", growth["percentage_change"] is None and growth["status"] == "available", str(growth))

# missing field -> unavailable, never zero
missing = vm.compute_before_after_changes(
    json.dumps({"computed_metrics": []}),
    {"headers": ["x"], "rows": [["1"]]},
    None,
)
miss_total = next(c for c in missing if c["metric_name"] == "total_sales")
check("missing_field_unavailable", miss_total["status"] == "unavailable" and miss_total["before"] is None and miss_total["after"] is None, str(miss_total))

check("extract_before_none", vm.extract_before_metrics(None) == {})
check("extract_before_bad_json", vm.extract_before_metrics("{oops") == {})
check("resolve_alias_zh", vm.resolve_metric_key("总销售额") == "total_sales")
check("resolve_alias_unknown", vm.resolve_metric_key("随便指标") is None)
check("resolve_none", vm.resolve_metric_key(None) is None)

# ---------------------------------------------------------------------------
# 2. verification_scoring
# ---------------------------------------------------------------------------
def c(name, direction, status="available"):
    return {"metric_name": name, "direction": direction, "status": status}

check("score_empty_unable", vs.score_verdict([]) == ("unable_to_verify", ""), str(vs.score_verdict([])))
check("score_single_unable", vs.score_verdict([c("a", "improved")]) == ("unable_to_verify", "low"), str(vs.score_verdict([c("a", "improved")])))
check("score_all_improved_high", vs.score_verdict([c("a", "improved"), c("b", "improved"), c("d", "improved"), c("e", "improved")]) == ("partially_effective", "high"))
check("score_half_medium", vs.score_verdict([c("a", "improved"), c("b", "declined")]) == ("partially_effective", "medium"))
check("score_mostly_declined", vs.score_verdict([c("a", "declined"), c("b", "declined"), c("d", "declined"), c("e", "declined"), c("f", "declined"), c("g", "improved")]) == ("ineffective", "medium"))
check("score_ambiguous", vs.score_verdict([c("a", "improved"), c("b", "declined"), c("d", "unchanged")]) == ("unable_to_verify", "low"))
check("score_ignores_unavailable", vs.score_verdict([c("a", "unavailable", "unavailable")]) == ("unable_to_verify", ""))
check("fallback_summary_zh", bool(vs.fallback_summary("zh")))

# ---------------------------------------------------------------------------
# 3. verification_parser
# ---------------------------------------------------------------------------
check("usable_empty", vp.is_usable_comparison("") is False)
check("usable_provider_error", vp.is_usable_comparison("Analysis failed: empty response") is False)
check("usable_plain_text", vp.is_usable_comparison("总销售额增长了") is False)
check("usable_empty_json", vp.is_usable_comparison("{}") is False)
check("usable_fenced_json", vp.is_usable_comparison('```json\n{"comparison_summary": "ok"}\n```') is True)
check("usable_summary_only", vp.is_usable_comparison('{"comparison_summary": "ok"}') is True)

# AI merge: system numbers win, AI interpretation kept, AI-invented dropped
ai_raw = json.dumps(
    {
        "comparison_summary": "销售额提升，客户集中度下降。",
        "verdict": "partially_effective",
        "metric_changes": [
            {"metric_name": "总销售额", "before": 1000000, "after": 2000000, "direction": "improved", "interpretation": "销售总额增长，与扩张方向一致"},
            {"metric_name": "虚构指标", "before": 1, "after": 2, "direction": "improved", "interpretation": "AI 自创指标"},
        ],
        "next_actions": ["继续跟进新客户"],
    },
    ensure_ascii=False,
)
parsed = vp.parse_comparison(ai_raw, computed_changes=changes, reliability=vp.RELIABILITY_AI)
merged_by_name = {m.metric_name: m for m in parsed.metric_changes}
check("merge_system_wins", merged_by_name["总销售额"].before == 1497700 and merged_by_name["总销售额"].after == 1960000, str(merged_by_name["总销售额"]))
check("merge_keeps_ai_interpretation", merged_by_name["总销售额"].interpretation == "销售总额增长，与扩张方向一致", str(merged_by_name["总销售额"].interpretation))
check("merge_drops_ai_invented", "虚构指标" not in merged_by_name, str(list(merged_by_name)))
check("merge_appends_missing", "order_count" in merged_by_name, str(list(merged_by_name)))
check("parse_sets_reliability", parsed.reliability == vp.RELIABILITY_AI)
check("parse_sets_computed_changes", len(parsed.computed_metric_changes) == len(changes))

# fallback build
fb = vp.build_computed_fallback(changes, language="zh", reason="empty response")
check("fallback_reliability", fb.reliability == vp.RELIABILITY_COMPUTED_FALLBACK)
check("fallback_verdict_code", fb.verdict == "partially_effective" and fb.confidence == "medium", f"{fb.verdict}/{fb.confidence}")
check("fallback_scored_from_objects", vs.score_verdict(fb.metric_changes) == ("partially_effective", "medium"), str(vs.score_verdict(fb.metric_changes)))
check("fallback_metric_rows", len(fb.metric_changes) == len(changes))
check("fallback_summary_text", bool(fb.comparison_summary))
check("fallback_limitations_reason", any("empty response" in x for x in fb.limitations), str(fb.limitations))

# JSON contract: additive fields present in serialized output
dumped = json.loads(fb.model_dump_json())
check("json_has_reliability", "reliability" in dumped and "computed_metric_changes" in dumped, str(sorted(dumped.keys())))

# legacy path without computed changes still works
legacy = vp.parse_comparison(ai_raw)
check("legacy_parse_ok", legacy.verdict == "partially_effective" and len(legacy.metric_changes) == 2, str(legacy.metric_changes))

# ---------------------------------------------------------------------------
# 4. AI boundary hardening: verdict always code-derived
# ---------------------------------------------------------------------------
ai_effective = vp.parse_comparison(
    json.dumps({"comparison_summary": "增长明显", "verdict": "effective", "confidence": "high"}),
    computed_changes=changes,
    reliability=vp.RELIABILITY_AI,
)
ai_effective = vs.apply_code_verdict(ai_effective, changes)
check("hardening_verdict_code_derived", ai_effective.verdict == "partially_effective", f"{ai_effective.verdict} (AI said effective)")
check("hardening_confidence_code_derived", ai_effective.confidence == "medium", str(ai_effective.confidence))
check("hardening_keeps_ai_summary", ai_effective.comparison_summary == "增长明显", str(ai_effective.comparison_summary))
no_evidence = vs.apply_code_verdict(vp.parse_comparison(ai_raw, reliability=vp.RELIABILITY_AI), [])
check("hardening_no_evidence_unable", no_evidence.verdict == "unable_to_verify" and no_evidence.confidence == "", f"{no_evidence.verdict}/{no_evidence.confidence}")

print(f"\nPASS={len(PASS)} FAIL={len(FAIL)}")
if FAIL:
    print("FAILED:", FAIL)
    raise SystemExit(1)
print("M2.13.0 OFFLINE TESTS PASSED")
