# -*- coding: utf-8 -*-
"""M2.13.1 Schema Mapping Confirmation - offline logic tests (no DB required).

Covers the 12 planned scenarios plus audit / idempotency / conflict /
provenance invariants required by M2.13.1.

Run from the repo root:
    $env:PYTHONPATH="backend"; backend/.venv/Scripts/python.exe -B _m2131_test.py
"""

import json
from copy import deepcopy

from app.services.schema_mapper import (
    AVAILABLE,
    UNAVAILABLE,
    MATCH_EXACT,
    MATCH_HEURISTIC,
    MATCH_USER,
    STATUS_AUTO,
    STATUS_CONFIRMED,
    STATUS_MODIFIED,
    STATUS_PENDING,
    STATUS_SKIPPED,
    SOURCE_AUTO_ACCEPT,
    SOURCE_SYSTEM,
    SOURCE_USER,
    SCHEMA_VERSION,
    MAPPING_VERSION,
    AUDIT_HISTORY_LIMIT,
    detect_schema,
    upgrade_mapping,
    attach_examples_to_mapping,
    apply_confirmation_actions,
    derive_schema_meta,
    build_saved_mapping,
)
from app.services.metric_engine import compute_metrics

PASS = []
FAIL = []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    if not cond:
        print(f"  FAIL {name}: {detail}")


def find_metric(metrics, name):
    for m in metrics:
        if m.get("metric_name") == name:
            return m
    return None


STD_DATASET = {
    "workbook_name": "standard.xlsx",
    "sheet_name": "Sheet1",
    "headers": ["成交日期", "订单号", "产品", "客户", "数量", "销售额"],
    "column_types": {"成交日期": "date", "数量": "number", "销售额": "number"},
    "rows": [
        ["2026-01-05", "SO-101", "A旗舰款", "华东集团", 10, 168000],
        ["2026-01-12", "SO-102", "B智能款", "华南集团", 8, 196000],
        ["2026-01-19", "SO-103", "C便携款", "华北集团", 12, 224000],
        ["2026-02-02", "SO-104", "A旗舰款", "华东集团", 9, 200000],
    ],
}
STD_HEADERS = STD_DATASET["headers"]

# ---------------------------------------------------------------------------
# Scenario 1: standard Chinese Excel
# ---------------------------------------------------------------------------
det = detect_schema(STD_DATASET["headers"], STD_DATASET["column_types"])
d = det.to_dict()
check("s1_version2", d["version"] == MAPPING_VERSION, str(d.get("version")))
check("s1_schema_version", d["schema_version"] == SCHEMA_VERSION, str(d.get("schema_version")))
sa = next(m for m in d["mappings"] if m["canonical_key"] == "sales_amount")
check("s1_match_method", sa["match_method"] == MATCH_EXACT, str(sa.get("match_method")))
check("s1_confidence", sa["confidence"] == 0.97, str(sa.get("confidence")))
check("s1_required", sa["required"] is True, str(sa.get("required")))
check("s1_status_pending", sa["confirmation_status"] == STATUS_PENDING, str(sa.get("confirmation_status")))
check("s1_source_system", sa["confirmation_source"] == SOURCE_SYSTEM, str(sa.get("confirmation_source")))
check("s1_qty_required", next(m for m in d["mappings"] if m["canonical_key"] == "sales_quantity")["required"] is True)
check("s1_missing_excludes_core", "sales_amount" not in d["missing"] and "sales_quantity" not in d["missing"], str(d["missing"]))
check("s1_missing_lists_absent", set(d["missing"]) == {"region", "sales_person", "pipeline_stage", "lost_reason", "discount_rate", "profit_amount"}, str(d["missing"]))
check("s1_core_available", d["sales_core_available"] is True)
attached = attach_examples_to_mapping(d, STD_DATASET)
sa_ex = next(m for m in attached["mappings"] if m["canonical_key"] == "sales_amount")
check("s1_examples", sa_ex["example_values"] == ["168000", "196000", "224000"], str(sa_ex["example_values"]))
mets = compute_metrics(STD_DATASET, d)
check("s1_total_sales", find_metric(mets, "total_sales")["value"] == 788000, str(find_metric(mets, "total_sales")))
check("s1_total_sales_available", find_metric(mets, "total_sales")["availability"] == AVAILABLE)

# confirm -> metric engine still consumes, provenance recorded
confirmed = apply_confirmation_actions(
    d, [{"canonical_key": "sales_amount", "action": "confirm"}], STD_HEADERS, user_id=42
)
sa_c = next(m for m in confirmed["mappings"] if m["canonical_key"] == "sales_amount")
check("s1_confirm_status", sa_c["confirmation_status"] == STATUS_CONFIRMED, str(sa_c.get("confirmation_status")))
check("s1_confirm_source", sa_c["confirmation_source"] == SOURCE_USER, str(sa_c.get("confirmation_source")))
check("s1_confirm_method", sa_c["match_method"] == MATCH_USER, str(sa_c.get("match_method")))
check("s1_confirm_at", bool(sa_c.get("confirmed_at")), str(sa_c.get("confirmed_at")))
check("s1_audit_user", confirmed["audit"].get("confirmed_by_user_id") == 42, str(confirmed["audit"].get("confirmed_by_user_id")))
check("s1_confirm_metrics_same", find_metric(compute_metrics(STD_DATASET, confirmed), "total_sales")["value"] == 788000)
meta = derive_schema_meta(confirmed)
check("s1_meta_source", meta["mapping_source"] == SOURCE_USER, str(meta))
check("s1_meta_status", meta["confirmation_status"] == STATUS_CONFIRMED, str(meta))
check("s1_meta_version", meta["schema_version"] == SCHEMA_VERSION, str(meta))
check("s1_meta_confirmed_at", bool(meta.get("confirmed_at")), str(meta))

# ---------------------------------------------------------------------------
# Scenario 2: English fields
# ---------------------------------------------------------------------------
EN_DATASET = {
    "headers": ["Revenue", "Order ID", "Customer", "Quantity"],
    "column_types": {"Revenue": "number", "Quantity": "number"},
    "rows": [["50000", "E-1", "Acme", 2]],
}
en = detect_schema(EN_DATASET["headers"], EN_DATASET["column_types"]).to_dict()
en_rev = next(m for m in en["mappings"] if m["canonical_key"] == "sales_amount")
check("s2_revenue_confidence", en_rev["confidence"] == 0.97, str(en_rev.get("confidence")))
check("s2_revenue_method", en_rev["match_method"] == MATCH_EXACT, str(en_rev.get("match_method")))
check("s2_order_id", any(m["canonical_key"] == "order_id" for m in en["mappings"]))
check("s2_customer", any(m["canonical_key"] == "customer_name" for m in en["mappings"]))

# ---------------------------------------------------------------------------
# Scenario 3: synonyms
# ---------------------------------------------------------------------------
SYN_HEADERS = ["成交金额", "合同金额", "客户名称", "Account", "签约日期"]
syn = detect_schema(SYN_HEADERS, {}).to_dict()
sa_cols = [m["source_column"] for m in syn["mappings"] if m["canonical_key"] == "sales_amount"]
check("s3_sales_synonyms", sa_cols == ["成交金额", "合同金额"], str(sa_cols))
cust_cols = [m["source_column"] for m in syn["mappings"] if m["canonical_key"] == "customer_name"]
check("s3_customer_synonyms", cust_cols == ["客户名称", "Account"], str(cust_cols))
check("s3_conflict_detected", any(
    c["canonical_key"] == "sales_amount" and c["candidates"] == ["成交金额", "合同金额"] and not c["resolved"]
    for c in syn["conflicts"]
), str(syn["conflicts"]))

# ---------------------------------------------------------------------------
# Scenario 4: low confidence (heuristic)
# ---------------------------------------------------------------------------
LOW_HEADERS = ["销额", "客户"]
low = detect_schema(LOW_HEADERS, {"销额": "number"}).to_dict()
lo = next(m for m in low["mappings"] if m["canonical_key"] == "sales_amount")
check("s4_low_confidence", lo["confidence"] == 0.6, str(lo.get("confidence")))
check("s4_low_method", lo["match_method"] == MATCH_HEURISTIC, str(lo.get("match_method")))
check("s4_not_blocking", lo["availability"] == AVAILABLE, str(lo.get("availability")))

# ---------------------------------------------------------------------------
# Scenario 5: missing sales_amount
# ---------------------------------------------------------------------------
NO_AMOUNT = {
    "headers": ["成交日期", "订单号", "客户"],
    "column_types": {"成交日期": "date"},
    "rows": [["2026-01-05", "SO-101", "华东集团"]],
}
na = detect_schema(NO_AMOUNT["headers"], NO_AMOUNT["column_types"]).to_dict()
check("s5_missing_has_sa", "sales_amount" in na["missing"], str(na["missing"]))
check("s5_core_false", na["sales_core_available"] is False)
na_mets = compute_metrics(NO_AMOUNT, na)
na_ts = find_metric(na_mets, "total_sales")
check("s5_total_sales_unavailable", na_ts["availability"] == UNAVAILABLE and na_ts["value"] is None, str(na_ts))

# ---------------------------------------------------------------------------
# Scenario 6: conflict
# ---------------------------------------------------------------------------
CONFLICT_HEADERS = ["销售额", "Revenue", "客户"]
CONFLICT_TYPES = {"销售额": "number", "Revenue": "number"}
cf = detect_schema(CONFLICT_HEADERS, CONFLICT_TYPES).to_dict()
sa_cf = [m for m in cf["mappings"] if m["canonical_key"] == "sales_amount"]
check("s6_two_candidates", len(sa_cf) == 2, str(sa_cf))
check("s6_conflict_recorded", any(
    c["canonical_key"] == "sales_amount" and c["candidates"] == ["销售额", "Revenue"] and not c["resolved"]
    for c in cf["conflicts"]
), str(cf["conflicts"]))
CF_DATASET = {
    "headers": CONFLICT_HEADERS,
    "column_types": CONFLICT_TYPES,
    "rows": [["x", "y", "z"], [100, 200, "A"], [300, 400, "B"]],
}
cf_mets = compute_metrics(CF_DATASET, cf)
check("s6_first_suggestion_used", find_metric(cf_mets, "total_sales")["value"] == 400, str(find_metric(cf_mets, "total_sales")))
check("s6_not_fake_confirmed", sa_cf[0]["confirmation_status"] != STATUS_CONFIRMED)
cf_meta = derive_schema_meta(cf)
check("s6_conflict_in_provenance", any(
    c["canonical_key"] == "sales_amount" and not c["resolved"] for c in cf_meta["conflicts"]
), str(cf_meta))
resolved = apply_confirmation_actions(
    cf, [{"canonical_key": "sales_amount", "action": "modify", "source_column": "Revenue"}],
    CONFLICT_HEADERS, user_id=7,
)
sa_r = [m for m in resolved["mappings"] if m["canonical_key"] == "sales_amount"]
check("s6_single_entry_after_choice", len(sa_r) == 1, str(sa_r))
check("s6_modified_status", sa_r[0]["confirmation_status"] == STATUS_MODIFIED, str(sa_r[0]))
check("s6_chosen_column", sa_r[0]["source_column"] == "Revenue", str(sa_r[0]))
check("s6_conflict_resolved", all(c["canonical_key"] != "sales_amount" for c in resolved["conflicts"]), str(resolved["conflicts"]))
cf_mets2 = compute_metrics(CF_DATASET, resolved)
check("s6_modified_column_used", find_metric(cf_mets2, "total_sales")["value"] == 600, str(find_metric(cf_mets2, "total_sales")))

# ---------------------------------------------------------------------------
# Scenario 7: user modify (explicit)
# ---------------------------------------------------------------------------
modded = apply_confirmation_actions(
    d, [{"canonical_key": "customer_name", "action": "modify", "source_column": "客户"}],
    STD_HEADERS, user_id=9,
)
cm = next(m for m in modded["mappings"] if m["canonical_key"] == "customer_name")
check("s7_modified", cm["confirmation_status"] == STATUS_MODIFIED, str(cm))
check("s7_user_source", cm["confirmation_source"] == SOURCE_USER, str(cm))
check("s7_audit_user", modded["audit"].get("confirmed_by_user_id") == 9, str(modded["audit"]))
# mark unavailable
unav = apply_confirmation_actions(
    d, [{"canonical_key": "customer_name", "action": "modify", "source_column": None}],
    STD_HEADERS, user_id=9,
)
cu = next(m for m in unav["mappings"] if m["canonical_key"] == "customer_name")
check("s7_marked_unavailable", cu["availability"] == UNAVAILABLE and cu["confirmation_status"] == "unavailable", str(cu))
check("s7_unavailable_in_missing", "customer_name" in unav["missing"], str(unav["missing"]))

# ---------------------------------------------------------------------------
# Scenario 8: skip
# ---------------------------------------------------------------------------
skipped = apply_confirmation_actions(
    d, [{"canonical_key": "sales_amount", "action": "skip"}], STD_HEADERS, user_id=3
)
sa_sk = next(m for m in skipped["mappings"] if m["canonical_key"] == "sales_amount")
check("s8_skip_status", sa_sk["confirmation_status"] == STATUS_SKIPPED, str(sa_sk))
check("s8_keeps_suggestion", sa_sk["source_column"] == "销售额", str(sa_sk))
check("s8_not_confirmed", sa_sk["confirmation_status"] != STATUS_CONFIRMED)
meta_sk = derive_schema_meta(skipped)
check("s8_meta_auto", meta_sk["mapping_source"] == "auto", str(meta_sk))
check("s8_meta_skipped", meta_sk["confirmation_status"] == STATUS_SKIPPED, str(meta_sk))
check("s8_metrics_use_suggestion", find_metric(compute_metrics(STD_DATASET, skipped), "total_sales")["value"] == 788000)

# ---------------------------------------------------------------------------
# Scenario 9: legacy v1 mapping
# ---------------------------------------------------------------------------
V1 = {
    "version": 1,
    "source_headers": ["销售额", "客户"],
    "mappings": [
        {"canonical_key": "sales_amount", "source_column": "销售额", "confidence": 0.97, "value_type": "number", "availability": "available"},
        {"canonical_key": "customer_name", "source_column": "客户", "confidence": 0.97, "value_type": "text", "availability": "available"},
    ],
    "unmapped": [],
    "missing": [],
    "sales_core_available": True,
    "detected_at": "2026-08-01T00:00:00+00:00",
}
before = deepcopy(V1)
v2 = upgrade_mapping(V1)
check("s9_v1_input_untouched", V1 == before, str(V1))
check("s9_upgraded_version", v2["version"] == MAPPING_VERSION, str(v2.get("version")))
sa_v1 = next(m for m in v2["mappings"] if m["canonical_key"] == "sales_amount")
check("s9_auto_status", sa_v1["confirmation_status"] == STATUS_AUTO, str(sa_v1))
check("s9_auto_source", sa_v1["confirmation_source"] == SOURCE_AUTO_ACCEPT, str(sa_v1))
check("s9_match_method", sa_v1["match_method"] == MATCH_EXACT, str(sa_v1))
check("s9_analysis_normal", find_metric(compute_metrics(STD_DATASET, v2), "total_sales")["value"] == 788000)
check("s9_meta_auto", derive_schema_meta(v2)["mapping_source"] == "auto", str(derive_schema_meta(v2)))

# ---------------------------------------------------------------------------
# Scenario 10: confirmed mapping consumed by Metric Engine (regression anchor)
# ---------------------------------------------------------------------------
check("s10_confirmed_consumed", find_metric(compute_metrics(STD_DATASET, confirmed), "total_sales")["value"] == 788000)
aov = find_metric(compute_metrics(STD_DATASET, confirmed), "average_order_value")
check("s10_aov", aov["value"] == 197000, str(aov))

# ---------------------------------------------------------------------------
# Scenario 11: historical data / input mapping never mutated
# ---------------------------------------------------------------------------
base = detect_schema(STD_DATASET["headers"], STD_DATASET["column_types"]).to_dict()
base_before = deepcopy(base)
apply_confirmation_actions(
    base, [{"canonical_key": "sales_amount", "action": "confirm"}], STD_HEADERS, user_id=1
)
check("s11_no_mutation", base == base_before)
v1_before = deepcopy(V1)
upgrade_mapping(V1)
check("s11_v1_no_mutation", V1 == v1_before)

# ---------------------------------------------------------------------------
# Scenario 12: refresh / reload keeps confirmation state
# ---------------------------------------------------------------------------
persisted = json.loads(json.dumps(confirmed))  # simulate JSONB round trip
reloaded = upgrade_mapping(persisted)
sa_p = next(m for m in reloaded["mappings"] if m["canonical_key"] == "sales_amount")
check("s12_status_kept", sa_p["confirmation_status"] == STATUS_CONFIRMED, str(sa_p))
check("s12_audit_kept", reloaded["audit"].get("confirmed_by_user_id") == 42, str(reloaded["audit"]))
re_attached = attach_examples_to_mapping(reloaded, STD_DATASET)
sa_p2 = next(m for m in re_attached["mappings"] if m["canonical_key"] == "sales_amount")
check("s12_examples_reattached", sa_p2["example_values"] == ["168000", "196000", "224000"], str(sa_p2["example_values"]))

# ---------------------------------------------------------------------------
# Audit: append-only, per-action entries
# ---------------------------------------------------------------------------
aud = apply_confirmation_actions(
    d,
    [
        {"canonical_key": "sales_amount", "action": "confirm"},
        {"canonical_key": "customer_name", "action": "modify", "source_column": "客户"},
        {"canonical_key": "order_date", "action": "skip"},
    ],
    STD_HEADERS, user_id=11,
)
hist = aud["audit"]["history"]
check("audit_three_entries", len(hist) == 3, str(len(hist)))
check("audit_action_order", [h["action"] for h in hist] == ["confirm", "modify", "skip"], str(hist))
check("audit_fields_present", all(
    h.get("timestamp") and h.get("previous") and h.get("new") and "changed_fields" in h
    for h in hist
), str(hist))
check("audit_previous_differs", any(h["previous"] != h["new"] for h in hist), str(hist))
check("audit_user_id", all(h["user_id"] == 11 for h in hist), str(hist))
# history preserved across successive operations (append-only)
second = apply_confirmation_actions(
    aud, [{"canonical_key": "order_id", "action": "confirm"}], STD_HEADERS, user_id=12
)
check("audit_append_only", len(second["audit"]["history"]) == 4, str(len(second["audit"]["history"])))

# ---------------------------------------------------------------------------
# Idempotency: replaying the same action is safe and consistent
# ---------------------------------------------------------------------------
once = apply_confirmation_actions(
    d, [{"canonical_key": "sales_amount", "action": "confirm"}], STD_HEADERS, user_id=1
)
twice = apply_confirmation_actions(
    once, [{"canonical_key": "sales_amount", "action": "confirm"}], STD_HEADERS, user_id=1
)
sa_o = next(m for m in once["mappings"] if m["canonical_key"] == "sales_amount")
sa_t = next(m for m in twice["mappings"] if m["canonical_key"] == "sales_amount")
check("idem_no_error", True)
check("idem_state_consistent", sa_o["confirmation_status"] == sa_t["confirmation_status"] == STATUS_CONFIRMED, str(sa_t))
check("idem_history_appends", len(twice["audit"]["history"]) == 2, str(len(twice["audit"]["history"])))
check("idem_metrics_stable", find_metric(compute_metrics(STD_DATASET, twice), "total_sales")["value"] == 788000)

# ---------------------------------------------------------------------------
# History cap
# ---------------------------------------------------------------------------
many_keys = ["order_date", "sales_amount", "sales_quantity", "order_id", "product_name", "region", "customer_name"]
many_actions = [{"canonical_key": k, "action": "skip"} for k in many_keys]
capped = apply_confirmation_actions(d, many_actions, STD_HEADERS, user_id=1)
check("cap_history", len(capped["audit"]["history"]) == AUDIT_HISTORY_LIMIT, str(len(capped["audit"]["history"])))

# ---------------------------------------------------------------------------
# Validation errors
# ---------------------------------------------------------------------------
def raises(fn):
    try:
        fn()
        return False
    except ValueError:
        return True


check("err_unknown_key", raises(lambda: apply_confirmation_actions(
    d, [{"canonical_key": "bogus", "action": "confirm"}], STD_HEADERS)))
check("err_bad_column", raises(lambda: apply_confirmation_actions(
    d, [{"canonical_key": "sales_amount", "action": "modify", "source_column": "不存在的列"}], STD_HEADERS)))
check("err_bad_action", raises(lambda: apply_confirmation_actions(
    d, [{"canonical_key": "order_date", "action": "nuke"}], STD_HEADERS)))

# ---------------------------------------------------------------------------
# Legacy PATCH payload path (build_saved_mapping)
# ---------------------------------------------------------------------------
legacy = build_saved_mapping(STD_HEADERS, [("sales_amount", "销售额"), ("customer_name", None)])
check("legacy_version2", legacy["version"] == MAPPING_VERSION, str(legacy.get("version")))
check("legacy_confirm_status", next(m for m in legacy["mappings"] if m["canonical_key"] == "sales_amount")["confirmation_status"] == STATUS_CONFIRMED)
check("legacy_unavailable", next(m for m in legacy["mappings"] if m["canonical_key"] == "customer_name")["availability"] == UNAVAILABLE)
check("legacy_missing", "customer_name" in legacy["missing"], str(legacy["missing"]))
check("legacy_conflict_none", legacy["conflicts"] == [], str(legacy["conflicts"]))

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print(f"\nM2.13.1 schema mapping confirmation: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print("FAILED:", ", ".join(FAIL))
    raise SystemExit(1)
print("ALL M2.13.1 TESTS PASSED")
