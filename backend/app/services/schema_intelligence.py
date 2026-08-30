"""M2.14.5 Schema Intelligence Pipeline.

The pipeline combines deterministic statistical/relationship evidence with a
lightweight Schema Understanding Agent. The agent receives headers, sample
values, statistics and candidate mappings only; it never reads the complete
workbook or full data rows.

Pipeline:
1. build column profile (types, units, numeric/date statistics)
2. deterministic candidate mapping (schema_mapper)
3. business relationship validation (amount = qty * price, profit = amount - cost)
4. optional agent review for ambiguous/low-confidence fields
5. confidence tiers and a customer-facing understanding summary
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from app.services.canonical_schema import CANONICAL_BY_KEY, CANONICAL_FIELDS, UNIT_SCALES, normalize_header
from app.services.schema_mapper import (
    AVAILABLE,
    MATCH_SEMANTIC,
    NEEDS_CONFIRMATION_THRESHOLD,
    SchemaDetection,
    detect_schema,
)

HIGH_CONFIDENCE = 0.90
MEDIUM_CONFIDENCE = 0.75
RELATIONSHIP_TOLERANCE = 0.15
AGENT_MAX_TOKENS = 600
AGENT_TIMEOUT_SECONDS = 15

CORE_KEYS = ("sales_amount", "sales_quantity", "order_date", "unit_price", "product_name")
RELATION_MIN_RATIO = 0.7
RELATION_MIN_ROWS = 3

_CURRENCY_UNITS = ("万元", "百万", "亿元", "千元", "元", "rmb", "cny", "usd")
_NON_CURRENCY_UNITS = ("台", "件", "个", "天", "人", "次", "%", "percent")
_DATE_RE = re.compile(
    r"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?$"
)
_DATE_RE_CN = re.compile(r"^\d{4}年\d{1,2}月\d{1,2}日$")
_NUMBER_CLEAN_RE = re.compile(r"[,\s¥￥$€]|^约")


def _parse_number(value: Any) -> float | None:
    """Parse a numeric value, including text-formatted numbers."""
    if value is None or value == "" or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return None
    s = value.strip().lower()
    if not s:
        return None
    if re.match(r"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}", s):
        return None
    s = _NUMBER_CLEAN_RE.sub("", s)
    if s.endswith("%"):
        s = s[:-1]
    try:
        return float(s)
    except ValueError:
        return None


def _is_date_value(value: Any) -> bool:
    if value is None or value == "":
        return False
    if hasattr(value, "strftime"):
        return True
    if not isinstance(value, str):
        return False
    s = value.strip()
    return bool(_DATE_RE.match(s) or _DATE_RE_CN.match(s))


def extract_unit(header: str) -> dict[str, Any]:
    """Extract a unit/scale hint from a raw header, e.g. 销售总额(万元)."""
    raw = (header or "").strip().lower()
    for unit in _CURRENCY_UNITS:
        if unit in raw:
            return {
                "unit": unit,
                "scale": UNIT_SCALES.get(unit, 1.0),
                "is_currency": True,
                "is_quantity_unit": False,
            }
    for unit in _NON_CURRENCY_UNITS:
        if unit in raw:
            return {
                "unit": unit,
                "scale": 1.0,
                "is_currency": False,
                "is_quantity_unit": unit in ("台", "件", "个", "人", "次"),
            }
    return {"unit": "", "scale": 1.0, "is_currency": False, "is_quantity_unit": False}


def _parse_date_value(value: Any):
    """Return a datetime for date-like cells (native, ISO or Chinese format)."""
    if hasattr(value, "year") and hasattr(value, "month") and hasattr(value, "day"):
        try:
            from datetime import datetime as _dt
            return _dt(value.year, value.month, value.day)
        except (TypeError, ValueError):
            return None
    if not isinstance(value, str):
        return None
    s = value.strip()
    if not s:
        return None
    try:
        from datetime import datetime as _dt
        if _DATE_RE.match(s):
            return _dt.strptime(s[:10], "%Y-%m-%d")
        if _DATE_RE_CN.match(s):
            return _dt.strptime(s, "%Y年%m月%d日")
    except ValueError:
        return None
    return None

def build_column_profile(
    headers: list[str],
    rows_sample: list[list[Any]],
    column_types: dict[str, str] | None = None,
) -> dict[str, dict[str, Any]]:
    """Build statistics for each column without exposing full data rows."""
    column_types = column_types or {}
    profile: dict[str, dict[str, Any]] = {}
    column_by_header = {h: i for i, h in enumerate(headers)}
    for header in headers:
        idx = column_by_header[header]
        values = [
            row[idx]
            for row in rows_sample
            if idx < len(row) and row[idx] not in (None, "", "None")
        ]
        numbers = [v for v in (_parse_number(v) for v in values) if v is not None]
        dates = [v for v in values if _is_date_value(v)]
        text_values = [str(v) for v in values if not _is_date_value(v) and _parse_number(v) is None]
        unit = extract_unit(header)
        numeric_ratio = round(len(numbers) / max(len(values), 1), 3)
        date_ratio = round(len(dates) / max(len(values), 1), 3)
        if numeric_ratio >= 0.8:
            col_type = "number"
        elif date_ratio >= 0.8:
            col_type = "date"
        elif len(values) > 0:
            col_type = "text"
        else:
            col_type = "empty"
        stats: dict[str, Any] = {
            "type": col_type,
            "count": len(values),
            "numeric_ratio": numeric_ratio,
            "date_ratio": date_ratio,
            "sample_values": [str(v) for v in values[:3]],
            "unit": unit,
        }
        if numbers:
            abs_values = [abs(v) for v in numbers if v != 0]
            stats.update(
                {
                    "integer_ratio": round(
                        sum(1 for v in numbers if v == int(v)) / len(numbers), 3
                    ),
                    "median": round(sorted(numbers)[len(numbers) // 2], 4),
                    "min": round(min(numbers), 4),
                    "max": round(max(numbers), 4),
                    "zero_ratio": round(sum(1 for v in numbers if v == 0) / len(numbers), 3),
                    "negative_ratio": round(
                        sum(1 for v in numbers if v < 0) / len(numbers), 3
                    ),
                    "p90": round(sorted(abs_values)[min(len(abs_values) - 1, int(len(abs_values) * 0.9))], 4)
                    if abs_values
                    else 0.0,
                }
            )
        profile[header] = stats
    return profile


def _relation_ratio(consistent: int, total: int) -> float:
    return round(consistent / total, 3) if total else 0.0


def analyze_relationships(
    headers: list[str],
    rows_sample: list[list[Any]],
    detection: SchemaDetection,
) -> dict[str, Any]:
    """Validate business arithmetic relationships from sample rows."""
    mapping_by_key = {
        m.canonical_key: m for m in detection.mappings if m.availability == AVAILABLE
    }
    header_index = {h: i for i, h in enumerate(headers)}

    def check_relation(a_key: str, b_key: str, result_key: str, op: str = "multiply") -> dict[str, Any]:
        a = mapping_by_key.get(a_key)
        b = mapping_by_key.get(b_key)
        result = mapping_by_key.get(result_key)
        if not a or not b or not result:
            return {"available": False}
        a_idx, b_idx, r_idx = (
            header_index.get(a.source_column),
            header_index.get(b.source_column),
            header_index.get(result.source_column),
        )
        if a_idx is None or b_idx is None or r_idx is None:
            return {"available": False}
        total = 0
        consistent = 0
        for row in rows_sample:
            if max(a_idx, b_idx, r_idx) >= len(row):
                continue
            x = _parse_number(row[a_idx])
            y = _parse_number(row[b_idx])
            r = _parse_number(row[r_idx])
            if x is None or y is None or r is None or abs(r) <= 0:
                continue
            expected = x + y if op == "add" else x * y
            total += 1
            if abs(expected - r) / abs(r) <= RELATIONSHIP_TOLERANCE:
                consistent += 1
        if total < RELATION_MIN_ROWS:
            return {"available": False, "total": total, "consistent": consistent}
        return {
            "available": True,
            "total": total,
            "consistent": consistent,
            "ratio": _relation_ratio(consistent, total),
        }

    def find_inventory_amount() -> str | None:
        qty = mapping_by_key.get("inventory_quantity")
        price = mapping_by_key.get("unit_price")
        if not qty or not price:
            return None
        q_idx = header_index.get(qty.source_column)
        p_idx = header_index.get(price.source_column)
        if q_idx is None or p_idx is None:
            return None
        best: str | None = None
        best_ratio = 0.0
        for header in headers:
            h_idx = header_index[header]
            if h_idx in (q_idx, p_idx):
                continue
            total = 0
            consistent = 0
            for row in rows_sample:
                if max(q_idx, p_idx, h_idx) >= len(row):
                    continue
                q = _parse_number(row[q_idx])
                p = _parse_number(row[p_idx])
                v = _parse_number(row[h_idx])
                if q is None or p is None or v is None or abs(v) <= 0:
                    continue
                total += 1
                if abs(q * p - v) / abs(v) <= RELATIONSHIP_TOLERANCE:
                    consistent += 1
            if total >= RELATION_MIN_ROWS:
                ratio = consistent / total
                if ratio >= RELATION_MIN_RATIO and ratio > best_ratio:
                    best = header
                    best_ratio = ratio
        return best

    relations: dict[str, Any] = {
        "quantity_x_unit_price_equals_amount": check_relation(
            "sales_quantity", "unit_price", "sales_amount"
        ),
        "sales_minus_cost_equals_profit": check_relation(
            "profit_amount", "cost_amount", "sales_amount",
            op="add",
        ),
    }
    inventory_amount = find_inventory_amount()
    if inventory_amount:
        relations["inventory_quantity_x_unit_price_equals_inventory_amount"] = {
            "available": True,
            "inferred_inventory_amount": inventory_amount,
            "note": "inferred from sample rows",
        }
    date_mapping = mapping_by_key.get("order_date")
    if date_mapping and date_mapping.availability == AVAILABLE:
        date_idx = header_index.get(date_mapping.source_column)
        if date_idx is not None:
            dates = []
            for row in rows_sample:
                if date_idx >= len(row):
                    continue
                parsed = _parse_date_value(row[date_idx])
                if parsed is not None:
                    dates.append(parsed)
            if len(dates) >= 3:
                unique = len({d.isoformat() for d in dates})
                ordered = sum(1 for a, b in zip(dates, dates[1:]) if b >= a)
                min_d, max_d = min(dates), max(dates)
                relations["order_date_validation"] = {
                    "available": True,
                    "count": len(dates),
                    "unique_ratio": round(unique / len(dates), 3),
                    "sorted_ratio": round(ordered / max(len(dates) - 1, 1), 3),
                    "min": min_d.isoformat(),
                    "max": max_d.isoformat(),
                    "days_span": (max_d - min_d).days,
                    "plausible": 1990 <= min_d.year <= 2100 and max_d.year <= 2100,
                }
    return relations


def confidence_tier(confidence: float) -> str:
    if confidence >= HIGH_CONFIDENCE:
        return "high"
    if confidence >= MEDIUM_CONFIDENCE:
        return "medium"
    return "low"


def _boost_mapping(mapping: Any, confidence: float, reason: str) -> None:
    if mapping.confidence >= confidence:
        return
    mapping.confidence = round(confidence, 3)
    if mapping.field_mapping_confidence is None:
        mapping.field_mapping_confidence = {
            "confidence": mapping.confidence,
            "reasons": [],
            "needs_confirmation": False,
        }
    if reason not in mapping.field_mapping_confidence.get("reasons", []):
        mapping.field_mapping_confidence.setdefault("reasons", []).append(reason)


def apply_relationship_boosts(detection: SchemaDetection, relations: dict[str, Any]) -> None:
    """Raise confidence only when a relation is consistently verified."""
    qp = relations.get("quantity_x_unit_price_equals_amount") or {}
    if qp.get("available") and qp.get("ratio", 0) >= RELATION_MIN_RATIO:
        for key in ("sales_amount", "sales_quantity", "unit_price"):
            for m in detection.mappings:
                if m.canonical_key == key and m.availability == AVAILABLE:
                    _boost_mapping(m, 0.96, "relationship:quantity_x_unit_price")
    sp = relations.get("sales_minus_cost_equals_profit") or {}
    if sp.get("available") and sp.get("ratio", 0) >= RELATION_MIN_RATIO:
        for key in ("sales_amount", "cost_amount", "profit_amount"):
            for m in detection.mappings:
                if m.canonical_key == key and m.availability == AVAILABLE:
                    _boost_mapping(m, 0.96, "relationship:sales_minus_cost_equals_profit")


def _apply_understanding_fields(
    detection: SchemaDetection, profile: dict[str, Any], agent_reviewed: bool = False,
) -> None:
    for m in detection.mappings:
        tier = confidence_tier(m.confidence)
        unit = profile.get(m.source_column or "", {}).get("unit") or {}
        reasons = list((m.field_mapping_confidence or {}).get("reasons") or [])
        if unit.get("is_currency") and m.canonical_key in (
            "sales_amount", "cost_amount", "profit_amount",
        ):
            reason = "unit:currency"
            if reason not in reasons:
                reasons.append(reason)
            if m.confidence < 0.94:
                m.confidence = 0.94
                tier = confidence_tier(m.confidence)
        elif unit.get("is_quantity_unit") and m.canonical_key == "sales_quantity":
            reason = "unit:quantity"
            if reason not in reasons:
                reasons.append(reason)
        if m.field_mapping_confidence is not None:
            m.field_mapping_confidence["reasons"] = reasons
            m.field_mapping_confidence["needs_confirmation"] = m.needs_confirmation
        m.confidence_tier = tier
        m.auto_confirmed = tier == "high"
        m.understanding_engine = "rules_v4"
        if agent_reviewed:
            m.understanding_engine = "rules_v4 + schema_agent"
        m.needs_confirmation = tier != "high"
        if m.field_mapping_confidence is not None:
            m.field_mapping_confidence["confidence"] = m.confidence
            m.field_mapping_confidence["needs_confirmation"] = m.needs_confirmation


def build_understanding_summary(
    detection: SchemaDetection,
    agent_reviewed: bool,
    relations: dict[str, Any],
) -> dict[str, Any]:
    """Build the customer-facing data understanding summary."""
    present = [m for m in detection.mappings if m.availability == AVAILABLE and m.source_column]
    high = [m for m in present if getattr(m, "confidence_tier", "low") == "high"]
    low = [m for m in present if getattr(m, "confidence_tier", "low") == "low"]
    quality = round(100 * len(high) / max(len(present), 1)) if present else 0
    core_fields = []
    for key in CORE_KEYS:
        m = next((x for x in present if x.canonical_key == key), None)
        if m:
            core_fields.append(
                {
                    "canonical_key": key,
                    "source_column": m.source_column,
                    "confidence_tier": getattr(m, "confidence_tier", "low"),
                    "status": "recognized" if m.confidence_tier == "high" else "needs_review",
                }
            )
    return {
        "status": "understood",
        "quality_score": quality,
        "auto_confirmed_count": len(high),
        "needs_confirmation_count": len(low),
        "total_fields": len(present),
        "core_fields": core_fields,
        "risk_fields": [
            {
                "canonical_key": m.canonical_key,
                "source_column": m.source_column,
                "confidence_tier": getattr(m, "confidence_tier", "low"),
            }
            for m in low
        ],
        "engine": "rules_v4 + schema_agent" if agent_reviewed else "rules_v4",
        "agent_reviewed": agent_reviewed,
        "relationship_evidence": relations,
    }


def _needs_agent_review(detection: SchemaDetection) -> bool:
    if detection.ambiguous_columns:
        return True
    return any(
        m.availability == AVAILABLE and getattr(m, "confidence_tier", "low") != "high"
        for m in detection.mappings
    )


def core_confidence_blocked(detection: SchemaDetection) -> list[str]:
    """Return present core fields whose confidence is below auto-accept.

    Phase 1.1 gate: when a core field exists in the workbook but the
    pipeline cannot confirm it at high confidence, the full analysis must
    stop and ask the customer to confirm the mapping first.
    """
    blocked: list[str] = []
    for m in detection.mappings:
        if m.availability != AVAILABLE or not m.source_column:
            continue
        if m.canonical_key not in CORE_KEYS:
            continue
        if getattr(m, "confidence_tier", "low") != "high" or m.needs_confirmation:
            blocked.append(m.source_column)
    return blocked

class SchemaUnderstandingAgent:
    """Compact agent that reviews only ambiguous/low-confidence fields."""

    def __init__(self, provider: Any | None = None):
        self._provider = provider

    @property
    def available(self) -> bool:
        return bool(self._provider is not None or os.getenv("DEEPSEEK_API_KEY"))

    def build_prompt(
        self,
        profile: dict[str, dict[str, Any]],
        detection: SchemaDetection,
        language: str = "zh",
    ) -> str:
        candidates = {
            m.source_column: {
                "canonical_type": m.canonical_key,
                "confidence": round(m.confidence, 3),
                "reasons": (m.field_mapping_confidence or {}).get("reasons", []),
            }
            for m in detection.mappings
            if m.availability == AVAILABLE and m.source_column
        }
        context = {
            "headers": list(detection.source_headers),
            "column_stats": profile,
            "candidate_mappings": candidates,
            "ambiguous_columns": detection.ambiguous_columns,
        }
        lang = "Chinese" if language == "zh" else "English"
        return (
            "You are a business schema understanding agent. You decide the business "
            "meaning of Excel columns for a sales analysis product.\n"
            f"Respond in {lang}. Do NOT invent numbers; use only the provided statistics.\n"
            "Never request the full workbook or full data rows.\n"
            "For every input column, return exactly one JSON object with keys:\n"
            "field_name, canonical_type, confidence, reason, needs_confirmation.\n"
            "canonical_type must be one of: "
            + ", ".join(sorted(CANONICAL_BY_KEY.keys()))
            + " or unmapped.\n"
            "Return ONLY a JSON array. No markdown fences.\n\n"
            + json.dumps(context, ensure_ascii=False)
        )

    async def understand(
        self,
        profile: dict[str, dict[str, Any]],
        detection: SchemaDetection,
        language: str = "zh",
    ) -> list[dict[str, Any]]:
        """Run the agent for one compact context; returns normalized decisions."""
        from app.providers.deepseek import DeepSeekProvider
        from app.services.analysis_engine import AnalysisEngine

        prompt = self.build_prompt(profile, detection, language)
        provider = self._provider or DeepSeekProvider(
            timeout=AGENT_TIMEOUT_SECONDS, max_retries=0
        )
        request = AnalysisEngine.build_request(
            workbook_name="schema_understanding",
            sheet_name="schema_understanding",
            headers=["schema_understanding"],
            column_types={"schema_understanding": "text"},
            rows=[["schema-understanding"]],
            analysis_type="schema_understanding",
            plugin_name="sales",
            language=language,
            parameters={"system_prompt": prompt, "max_tokens": AGENT_MAX_TOKENS},
        )
        response = await provider.analyze(request)
        return self.parse_output(response.summary)

    @staticmethod
    def parse_output(content: str) -> list[dict[str, Any]]:
        text = (content or "").strip()
        if text.startswith("```"):
            text = text.split("```", 2)[1] if text.count("```") >= 2 else text.strip("`")
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return []
        items = data if isinstance(data, list) else data.get("header_analysis") or data.get("columns") or []
        if not isinstance(items, list):
            return []
        out: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            canonical = str(item.get("canonical_type") or "").strip()
            if canonical not in CANONICAL_BY_KEY and canonical != "unmapped":
                continue
            confidence = item.get("confidence")
            try:
                confidence = float(confidence) if confidence is not None else 0.0
            except (TypeError, ValueError):
                confidence = 0.0
            out.append(
                {
                    "field_name": str(item.get("field_name") or ""),
                    "canonical_type": canonical,
                    "confidence": round(max(0.0, min(1.0, confidence)), 3),
                    "reason": str(item.get("reason") or ""),
                    "needs_confirmation": bool(item.get("needs_confirmation")),
                }
            )
        return out


def apply_agent_results(detection: SchemaDetection, decisions: list[dict[str, Any]]) -> None:
    by_source = {d.get("field_name", ""): d for d in decisions}
    for m in list(detection.mappings):
        decision = by_source.get(m.source_column or "")
        if not decision or m.availability != AVAILABLE:
            continue
        canonical = decision["canonical_type"]
        agent_conf = decision["confidence"]
        if canonical == "unmapped":
            if m.confidence < 0.75:
                m.availability = "unavailable"
                m.source_column = None
                m.needs_confirmation = True
                if m.field_mapping_confidence is not None:
                    m.field_mapping_confidence.setdefault("reasons", []).append("agent:unmapped")
            continue
        if canonical == m.canonical_key:
            if agent_conf > m.confidence:
                m.confidence = round(agent_conf, 3)
                if m.field_mapping_confidence is not None:
                    m.field_mapping_confidence.setdefault("reasons", []).append("agent:confirmed")
        elif m.confidence < 0.75 and agent_conf >= 0.92:
            field_def = CANONICAL_BY_KEY.get(canonical)
            if field_def:
                m.canonical_key = canonical
                m.value_type = field_def.value_type
                m.required = field_def.required
                m.confidence = round(agent_conf, 3)
                m.match_method = "agent_reviewed"
                if m.field_mapping_confidence is not None:
                    m.field_mapping_confidence.setdefault("reasons", []).append("agent:changed")
    used_columns = {m.source_column for m in detection.mappings if m.availability == AVAILABLE and m.source_column}
    detection.unmapped = [h for h in detection.source_headers if h not in used_columns]
    mapped_keys = {m.canonical_key for m in detection.mappings if m.availability == AVAILABLE}
    detection.missing = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]
    detection.sales_core_available = any(k in mapped_keys for k in CORE_KEYS)


async def detect_schema_intelligent(
    headers: list[str],
    column_types: dict[str, str] | None = None,
    rows_sample: list[list[Any]] | None = None,
    industry_hint: str | None = None,
    source_file: str | None = None,
    use_agent: bool = True,
) -> SchemaDetection:
    """Run the full M2.14.5 Schema Intelligence Pipeline."""
    detection = detect_schema(headers, column_types, rows_sample=rows_sample, industry_hint=industry_hint)
    profile = build_column_profile(headers, rows_sample or [], column_types)
    relations = analyze_relationships(headers, rows_sample or [], detection)
    apply_relationship_boosts(detection, relations)
    _apply_understanding_fields(detection, profile)

    agent_reviewed = False
    if use_agent and _needs_agent_review(detection):
        agent = SchemaUnderstandingAgent()
        if agent.available:
            try:
                decisions = await agent.understand(profile, detection)
                if decisions:
                    apply_agent_results(detection, decisions)
                    agent_reviewed = True
            except Exception:
                # Agent failures must never block upload or make a false claim.
                agent_reviewed = False

    _apply_understanding_fields(detection, profile, agent_reviewed=agent_reviewed)
    detection.relationship_evidence = relations
    detection.understanding_summary = build_understanding_summary(
        detection, agent_reviewed, relations
    )
    detection.source_file = source_file
    return detection
