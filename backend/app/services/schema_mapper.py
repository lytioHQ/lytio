"""Map raw workbook headers to canonical sales fields.

Detection strategy (v3, M2.14.4):
1. exact synonym match after normalization          -> confidence 0.97
2. exact match after stripping common prefixes      -> confidence 0.92
3. candidate scoring: name semantics + units +
   value distribution + cross-field relationship   -> confidence 0.55-0.90

The old v2 keyword-matching flow made two dangerous mistakes on real
customer files:
- 销售单价 (unit price) was heuristically classified as sales_amount
  because "价" ended with an amount suffix;
- 库存周转天数 was classified as a quantity because "数" was a quantity
  suffix.

v3 therefore:
- treats 单价 / unit price as its own canonical field;
- treats 库存周转天数 as its own canonical field;
- scores every candidate field for every header and only keeps the
  highest-confidence candidate per canonical key;
- validates the relationship 数量 × 单价 ≈ 金额 when all three exist;
- emits field_mapping_confidence + needs_confirmation so the UI asks the
  user to confirm ambiguous mappings instead of silently computing with them.

M2.13.1 keeps the confirmation layer on top of detection:
- match_method / required / example_values / confirmation_status / conflicts
- append-only audit history inside the schema_mapping JSONB (no migration)
- per-run provenance via derive_schema_meta() -> result_json.schema_meta

Missing fields are reported as ``unavailable`` (never filled with zeros).
No I/O, no AI. Pure header -> canonical vocabulary mapping + user
confirmation bookkeeping.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable

from app.services.canonical_schema import (
    CANONICAL_BY_KEY,
    CANONICAL_FIELDS,
    COMMON_PREFIXES,
    _AMOUNT_SUFFIXES,
    _DATE_HINTS,
    _PRICE_SUFFIXES,
    _QUANTITY_SUFFIXES,
    _TURNOVER_SUFFIXES,
    normalize_header,
    SEMANTIC_COMPONENTS,
)

EXACT_CONFIDENCE = 0.97
PREFIX_STRIP_CONFIDENCE = 0.92
HEURISTIC_AMOUNT_CONFIDENCE = 0.60
HEURISTIC_QUANTITY_CONFIDENCE = 0.60
HEURISTIC_DATE_CONFIDENCE = 0.70

# M2.14.4: candidate-scoring weights. A single weak signal can never reach
# the auto-accept threshold by itself.
SCORE_EXACT_SYNONYM = 68.0
SCORE_PREFIX_SYNONYM = 56.0
SCORE_SUBSTRING = 32.0
SCORE_SUFFIX = 16.0
SCORE_TYPE_MATCH = 12.0
SCORE_VALUE_DISTRIBUTION = 10.0
SCORE_INDUSTRY = 6.0
SCORE_RELATIONSHIP = 8.0
SCORE_MAX = 100.0
SEMANTIC_CONFIDENCE = 0.94
SCORE_SEMANTIC_COMPONENT = 48.0
MIN_ACCEPT_CONFIDENCE = 0.55
# M2.14.4: below this threshold the UI must ask the user to confirm instead
# of treating the mapping as authoritative.
NEEDS_CONFIRMATION_THRESHOLD = 0.75
RELATIONSHIP_TOLERANCE = 0.15

AVAILABLE = "available"
UNAVAILABLE = "unavailable"

# M2.13.1: match methods and confirmation states (canonical vocabulary).
MATCH_EXACT = "exact_synonym"
MATCH_PREFIX = "prefix_strip"
MATCH_HEURISTIC = "heuristic_type"
MATCH_USER = "user_confirmed"
MATCH_SEMANTIC = "semantic_component"

STATUS_PENDING = "pending"
STATUS_CONFIRMED = "confirmed"
STATUS_MODIFIED = "modified"
STATUS_SKIPPED = "skipped"
STATUS_AUTO = "auto"
STATUS_UNAVAILABLE = "unavailable"

SCHEMA_VERSION = "canonical_sales_v1"
MAPPING_VERSION = 2
AUDIT_HISTORY_LIMIT = 5

SOURCE_SYSTEM = "system_detection"
SOURCE_USER = "user_confirmed"
SOURCE_AUTO_ACCEPT = "auto_accept"

_CORE_KEYS = ("sales_amount", "sales_quantity")

# Industry hints that change a candidate's prior. Unknown industries add
# nothing; the scoring stays conservative.
_INDUSTRY_HINTS: dict[str, tuple[str, ...]] = {
    "retail": ("零售", "门店", "retail"),
    "b2b": ("b2b", "企业客户", "批发"),
    "ecommerce": ("电商", "电子商务", "线上", "ecommerce", "网店"),
    "channel": ("渠道", "分销", "经销商", "channel"),
    "manufacturing": ("制造", "工厂", "生产", "manufacturing", "工业"),
    "saas": ("saas", "软件", "订阅", "云服务"),
}

_INDUSTRY_FIELD_BOOSTS: dict[str, dict[str, float]] = {
    "ecommerce": {"unit_price": 1.0, "sales_quantity": 0.6, "order_id": 0.5},
    "retail": {"unit_price": 0.8, "sales_quantity": 0.6, "customer_name": 0.4},
    "b2b": {"customer_name": 0.8, "pipeline_stage": 0.5, "unit_price": 0.4},
    "channel": {"region": 0.8, "customer_name": 0.4},
    "manufacturing": {"inventory_turnover_days": 1.0, "unit_price": 0.4},
    "saas": {"customer_name": 0.8, "order_id": 0.4, "product_name": 0.4},
}


def _field_required(key: str) -> bool:
    field_def = CANONICAL_BY_KEY.get(key)
    return bool(field_def.required) if field_def else False


def _field_value_type(key: str) -> str:
    field_def = CANONICAL_BY_KEY.get(key)
    return field_def.value_type if field_def else "unknown"


@dataclass
class FieldMapping:
    canonical_key: str
    source_column: str | None
    confidence: float
    value_type: str
    availability: str
    match_method: str = MATCH_HEURISTIC
    required: bool = False
    example_values: list[str] = field(default_factory=list)
    confirmation_status: str = STATUS_PENDING
    confirmation_source: str = SOURCE_SYSTEM
    confirmed_mapping: dict[str, Any] | None = None
    confirmed_at: str | None = None
    # M2.14.4: scoring provenance (additive; older mappings simply lack it).
    field_mapping_confidence: dict[str, Any] | None = None
    needs_confirmation: bool = False
    # M2.14.5: customer-facing confidence tier and understanding provenance.
    confidence_tier: str = "low"
    auto_confirmed: bool = False
    understanding_engine: str = "rules_v3"

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "canonical_key": self.canonical_key,
            "source_column": self.source_column,
            "confidence": self.confidence,
            "value_type": self.value_type,
            "availability": self.availability,
            "match_method": self.match_method,
            "required": self.required,
            "example_values": list(self.example_values),
            "confirmation_status": self.confirmation_status,
            "confirmation_source": self.confirmation_source,
        }
        data["confidence_tier"] = self.confidence_tier
        data["auto_confirmed"] = self.auto_confirmed
        data["understanding_engine"] = self.understanding_engine
        if self.field_mapping_confidence is not None:
            data["field_mapping_confidence"] = copy.deepcopy(self.field_mapping_confidence)
        if self.needs_confirmation:
            data["needs_confirmation"] = True
        if self.confirmed_mapping is not None:
            data["confirmed_mapping"] = copy.deepcopy(self.confirmed_mapping)
        if self.confirmed_at is not None:
            data["confirmed_at"] = self.confirmed_at
        return data


@dataclass
class SchemaDetection:
    source_headers: list[str] = field(default_factory=list)
    mappings: list[FieldMapping] = field(default_factory=list)
    unmapped: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    sales_core_available: bool = False
    conflicts: list[dict[str, Any]] = field(default_factory=list)
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # M2.14.4: additive scoring detail for diagnostics/UI.
    candidate_scores: dict[str, dict[str, dict[str, Any]]] = field(default_factory=dict)
    ambiguous_columns: list[dict[str, Any]] = field(default_factory=list)
    # M2.14.5: provenance and business-understanding summary.
    source_file: str | None = None
    relationship_evidence: dict[str, Any] | None = None
    understanding_summary: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        mapping_dicts = [m.to_dict() for m in self.mappings]
        audit: dict[str, Any] = {
            "suggested_at": self.detected_at,
            "confirmation_status": overall_confirmation_status({"mappings": mapping_dicts}),
            "mapping_source": SOURCE_SYSTEM,
            "schema_version": SCHEMA_VERSION,
            "history": [],
        }
        data: dict[str, Any] = {
            "version": MAPPING_VERSION,
            "schema_version": SCHEMA_VERSION,
            "source_headers": list(self.source_headers),
            "mappings": mapping_dicts,
            "unmapped": list(self.unmapped),
            "missing": list(self.missing),
            "conflicts": copy.deepcopy(self.conflicts),
            "sales_core_available": self.sales_core_available,
            "detected_at": self.detected_at,
            "audit": audit,
        }
        if self.candidate_scores:
            data["candidate_scores"] = copy.deepcopy(self.candidate_scores)
        if self.ambiguous_columns:
            data["ambiguous_columns"] = copy.deepcopy(self.ambiguous_columns)
        if self.source_file:
            data["source_file"] = self.source_file
        if self.relationship_evidence:
            data["relationship_evidence"] = copy.deepcopy(self.relationship_evidence)
        if self.understanding_summary:
            data["schema_understanding"] = copy.deepcopy(self.understanding_summary)
        return data


def _exact_match(norm: str) -> tuple[str, float, str] | None:
    """Return (canonical_key, confidence, match_method) for an exact synonym hit."""
    for field_def in CANONICAL_FIELDS:
        if norm in field_def.normalized_synonyms():
            return field_def.key, EXACT_CONFIDENCE, MATCH_EXACT
    return None


def _prefix_strip_match(norm: str) -> tuple[str, float, str] | None:
    """Return (canonical_key, confidence, method) after stripping a common prefix."""
    for prefix in COMMON_PREFIXES:
        if norm.startswith(prefix) and len(norm) > len(prefix):
            stripped = norm[len(prefix):]
            hit = _exact_match(stripped)
            if hit is not None:
                return hit[0], PREFIX_STRIP_CONFIDENCE, MATCH_PREFIX
    return None


def _heuristic_match(norm: str, column_type: str) -> tuple[str, float, str] | None:
    """Type-aware fallback for numeric/date columns with unfamiliar names."""
    if column_type == "date" or any(hint in norm for hint in _DATE_HINTS):
        return "order_date", HEURISTIC_DATE_CONFIDENCE, MATCH_HEURISTIC
    if column_type == "number":
        if norm.endswith(_AMOUNT_SUFFIXES):
            return "sales_amount", HEURISTIC_AMOUNT_CONFIDENCE, MATCH_HEURISTIC
        if norm.endswith(_QUANTITY_SUFFIXES):
            return "sales_quantity", HEURISTIC_QUANTITY_CONFIDENCE, MATCH_HEURISTIC
        if norm.endswith(_PRICE_SUFFIXES):
            return "unit_price", 0.66, MATCH_HEURISTIC
    return None

def _semantic_component_match(norm: str, column_type: str) -> tuple[str, float, str] | None:
    """Match a header through business semantic components (M2.14.5).

    This is not a flat keyword table: a header is understood as a combination
    of business components such as 金额/数量/单价/日期/库存. The matched
    component is only accepted when the column type is compatible.
    """
    if not norm:
        return None
    for field_key, components in SEMANTIC_COMPONENTS.items():
        if not any(comp in norm for comp in components):
            continue
        field_type = _field_value_type(field_key)
        if field_type == "number" and column_type not in ("number", "unknown", "text"):
            continue
        if field_type == "date" and column_type not in ("date", "text", "unknown"):
            continue
        if field_type == "text" and column_type not in ("text", "unknown"):
            continue
        return field_key, SEMANTIC_CONFIDENCE, MATCH_SEMANTIC
    return None

def _match_header(header: str, column_type: str) -> tuple[str, float, str] | None:
    norm = normalize_header(header)
    if not norm:
        return None

    hit = _exact_match(norm)
    if hit is None:
        hit = _prefix_strip_match(norm)
    if hit is None:
        semantic = _semantic_component_match(norm, column_type)
        if semantic is not None:
            hit = semantic
        else:
            hit = _heuristic_match(norm, column_type)
    return hit


def _col_matches_field_type(col_type: str, field_type: str) -> bool:
    if col_type in ("", "unknown", "empty"):
        return False
    if field_type == "number":
        return col_type == "number"
    if field_type == "date":
        return col_type == "date" or (col_type == "text" and bool(
            any(h in col_type.lower() for h in _DATE_HINTS)
        ))
    return col_type in ("text", "boolean")


def _unit_score(norm: str, field_key: str) -> float:
    """Score a unit/domain marker embedded in the header name."""
    if field_key == "sales_amount":
        return 1.0 if norm.endswith(_AMOUNT_SUFFIXES) else 0.0
    if field_key == "sales_quantity":
        return 1.0 if norm.endswith(_QUANTITY_SUFFIXES) else 0.0
    if field_key == "unit_price":
        return 1.0 if any(norm.endswith(s) for s in _PRICE_SUFFIXES) else 0.0
    if field_key == "inventory_turnover_days":
        return 1.0 if any(norm.endswith(s) for s in _TURNOVER_SUFFIXES) else 0.0
    return 0.0


def _substring_score(norm: str, field_key: str) -> float:
    """Best synonym substring score for a header.

    Exact synonyms are handled by _exact_match; this catches partial names
    such as 成交单价 / 销售单价 / unit price.
    """
    field_def = CANONICAL_BY_KEY.get(field_key)
    if field_def is None or not norm:
        return 0.0
    best = 0.0
    for synonym in field_def.normalized_synonyms():
        if len(synonym) < 2:
            continue
        if synonym in norm:
            best = max(best, min(1.0, len(synonym) / max(4, len(norm))))
        elif norm in synonym:
            best = max(best, 0.5)
    return best


def _numeric_stats(sample_rows: Iterable[list[Any]], col_index: int) -> dict[str, Any]:
    values: list[float] = []
    non_numeric = 0
    total = 0
    for row in sample_rows:
        if col_index >= len(row):
            continue
        v = row[col_index]
        if v is None or v == "" or v == "None":
            continue
        total += 1
        try:
            values.append(float(v))
        except (TypeError, ValueError):
            non_numeric += 1
    if not values:
        return {"count": 0}
    integer_ratio = sum(1 for v in values if v == int(v)) / len(values)
    abs_values = [abs(v) for v in values if v != 0]
    return {
        "count": len(values),
        "integer_ratio": integer_ratio,
        "mean": sum(values) / len(values),
        "min": min(values),
        "max": max(values),
        "median_abs": sorted(abs_values)[len(abs_values) // 2] if abs_values else 0.0,
        "non_numeric": non_numeric,
    }


def _value_distribution_score(stats: dict[str, Any] | None, field_key: str) -> float:
    """Score numeric value shape for quantity/unit-price/turnover candidates."""
    if not stats or stats.get("count", 0) < 3:
        return 0.0
    integer_ratio = stats.get("integer_ratio", 0.0)
    median_abs = stats.get("median_abs", 0.0) or 0.0
    if field_key == "sales_quantity":
        if integer_ratio >= 0.9 and median_abs < 1_000_000:
            return 1.0
        if integer_ratio >= 0.6:
            return 0.5
        return 0.0
    if field_key == "unit_price":
        if 0 < median_abs < 1_000_000:
            return 0.8
        return 0.2
    if field_key == "inventory_turnover_days":
        if 0 < median_abs < 10_000:
            return 0.6
        return 0.1
    if field_key == "sales_amount":
        if median_abs >= 100:
            return 0.4
        return 0.1
    return 0.0


def _industry_key(industry_hint: str | None) -> str | None:
    if not industry_hint:
        return None
    low = industry_hint.strip().lower()
    for key, terms in _INDUSTRY_HINTS.items():
        if any(term in low for term in terms):
            return key
    return low if low in _INDUSTRY_FIELD_BOOSTS else None


def _industry_score(industry_hint: str | None, field_key: str) -> float:
    key = _industry_key(industry_hint)
    if not key:
        return 0.0
    return _INDUSTRY_FIELD_BOOSTS.get(key, {}).get(field_key, 0.0)


def _normalize_confidence(raw: float) -> float:
    """Map a heuristic raw score to a stable 0..1 confidence.

    Exact/prefix synonym candidates bypass this mapping and keep their high
    confidence constants (0.97 / 0.92).
    """
    if raw <= 0:
        return 0.0
    return round(min(0.9, max(0.0, 0.55 + (raw / SCORE_MAX) * 0.35)), 3)


def _quantity_header_terms() -> tuple[str, ...]:
    field_def = CANONICAL_BY_KEY["sales_quantity"]
    return field_def.normalized_synonyms()


def _price_header_terms() -> tuple[str, ...]:
    field_def = CANONICAL_BY_KEY["unit_price"]
    return field_def.normalized_synonyms()


def _amount_header_terms() -> tuple[str, ...]:
    field_def = CANONICAL_BY_KEY["sales_amount"]
    return field_def.normalized_synonyms()


def _relationship_signals(
    sample_rows: list[list[Any]],
    headers: list[str],
) -> dict[str, Any]:
    """Return quantity × unit_price ≈ amount evidence (pure code).

    Uses only non-empty numeric rows; returns {} when the evidence is too
    thin to make any claim.
    """
    normalized_headers = {h: normalize_header(h) for h in headers}
    qty_header = next(
        (h for h, n in normalized_headers.items() if n in _quantity_header_terms()),
        None,
    )
    price_header = next(
        (h for h, n in normalized_headers.items() if n in _price_header_terms()),
        None,
    )
    amount_header = next(
        (h for h, n in normalized_headers.items() if n in _amount_header_terms()),
        None,
    )
    if not qty_header or not price_header:
        return {}
    header_index = {h: i for i, h in enumerate(headers)}
    qty_idx = header_index[qty_header]
    price_idx = header_index[price_header]
    amount_idx = header_index.get(amount_header) if amount_header else None

    pairs = 0
    consistent = 0
    with_amount = 0
    for row in sample_rows:
        if max(qty_idx, price_idx) >= len(row):
            continue
        try:
            q = float(row[qty_idx])
            p = float(row[price_idx])
        except (TypeError, ValueError):
            continue
        if q == 0 or p == 0:
            continue
        pairs += 1
        if amount_idx is not None and amount_idx < len(row):
            try:
                amount = float(row[amount_idx])
            except (TypeError, ValueError):
                continue
            if abs(amount) <= 0:
                continue
            with_amount += 1
            if abs(q * p - amount) / max(abs(amount), 1) <= RELATIONSHIP_TOLERANCE:
                consistent += 1
    if not pairs:
        return {}
    return {
        "pairs": pairs,
        "consistent": consistent,
        "with_amount": with_amount,
    }


def _score_header_for_field(
    header: str,
    norm: str,
    field_key: str,
    column_type: str,
    sample_rows: list[list[Any]] | None,
    column_by_header: dict[str, int],
    industry_hint: str | None,
    exact: tuple[str, float, str] | None,
    prefix: tuple[str, float, str] | None,
    semantic: tuple[str, float, str] | None = None,
) -> dict[str, Any]:
    """Score one header against one canonical field (pure code)."""
    reasons: list[str] = []
    raw = 0.0
    matched_by_exact = exact is not None and exact[0] == field_key
    matched_by_prefix = not matched_by_exact and prefix is not None and prefix[0] == field_key
    matched_by_semantic = not matched_by_prefix and semantic is not None and semantic[0] == field_key

    if matched_by_exact:
        raw += SCORE_EXACT_SYNONYM
        reasons.append("exact_synonym")
    elif matched_by_prefix:
        raw += SCORE_PREFIX_SYNONYM
        reasons.append("prefix_synonym")
    elif matched_by_semantic:
        raw += SCORE_SEMANTIC_COMPONENT
        reasons.append("semantic_component")
    else:
        substring = _substring_score(norm, field_key)
        if substring > 0:
            raw += SCORE_SUBSTRING * substring
            reasons.append(f"name_substring:{substring:.2f}")
        unit = _unit_score(norm, field_key)
        if unit > 0:
            raw += SCORE_SUFFIX * unit
            reasons.append("unit_suffix")

    if column_type and _col_matches_field_type(column_type, _field_value_type(field_key)):
        raw += SCORE_TYPE_MATCH
        reasons.append("type_match")

    stats = None
    if sample_rows and column_by_header.get(header) is not None:
        idx = column_by_header[header]
        stats = _numeric_stats(sample_rows, idx)
        dist = _value_distribution_score(stats, field_key)
        if dist > 0:
            raw += SCORE_VALUE_DISTRIBUTION * dist
            reasons.append(f"value_distribution:{dist:.2f}")

    industry = _industry_score(industry_hint, field_key)
    if industry > 0:
        raw += SCORE_INDUSTRY * industry
        reasons.append("industry_hint")

    confidence = EXACT_CONFIDENCE if matched_by_exact else (
        PREFIX_STRIP_CONFIDENCE if matched_by_prefix else (
            SEMANTIC_CONFIDENCE if matched_by_semantic else _normalize_confidence(raw)
        )
    )
    return {
        "field": field_key,
        "confidence": confidence,
        "raw_score": round(raw, 2),
        "reasons": reasons,
        "needs_confirmation": confidence < NEEDS_CONFIRMATION_THRESHOLD,
    }


def detect_schema(
    headers: list[str],
    column_types: dict[str, str] | None = None,
    rows_sample: list[list[Any]] | None = None,
    industry_hint: str | None = None,
) -> SchemaDetection:
    """Detect canonical field mappings for a list of headers (v3 scoring).

    ``rows_sample`` and ``industry_hint`` are optional refinements; without
    them detection degrades to the v2 name/type behavior (plus the v3
    candidate vocabulary). ``rows_sample`` is never stored.
    """
    column_types = column_types or {}
    sample_rows = rows_sample or []
    column_by_header = {h: i for i, h in enumerate(headers)}
    exact_by_header: dict[str, tuple[str, float, str] | None] = {}
    prefix_by_header: dict[str, tuple[str, float, str] | None] = {}
    semantic_by_header: dict[str, tuple[str, float, str] | None] = {}

    # Score every header against every canonical field.
    scored: dict[str, list[dict[str, Any]]] = {}
    normalized = {h: normalize_header(h) for h in headers}
    for header in headers:
        norm = normalized[header]
        if not norm:
            continue
        exact = _exact_match(norm)
        prefix = _prefix_strip_match(norm)
        exact_by_header[header] = exact
        prefix_by_header[header] = prefix
        col_type = column_types.get(header, "unknown")
        semantic = _semantic_component_match(norm, col_type)
        semantic_by_header[header] = semantic
        if col_type == "empty":
            continue
        candidates: list[dict[str, Any]] = []
        for field_def in CANONICAL_FIELDS:
            score = _score_header_for_field(
                header, norm, field_def.key, col_type, sample_rows,
                column_by_header, industry_hint, exact, prefix,
                semantic,
            )
            if score["confidence"] >= MIN_ACCEPT_CONFIDENCE:
                candidates.append(score)
        candidates.sort(key=lambda c: (c["confidence"], c["raw_score"]), reverse=True)
        scored[header] = candidates

    candidate_scores = {
        h: {c["field"]: {k: c[k] for k in ("confidence", "raw_score", "reasons", "needs_confirmation")} for c in cands}
        for h, cands in scored.items()
    }

    # Relationship validation (M2.14.4): when 数量 and 单价 exist, check
    # 数量 × 单价 ≈ 金额 and boost the amount candidate.
    rel_evidence: dict[str, Any] = {}
    if sample_rows:
        rel_evidence = _relationship_signals(sample_rows, headers)
    if rel_evidence.get("pairs", 0) >= 3 and rel_evidence.get("with_amount", 0) >= 3:
        threshold = max(1, int(rel_evidence["pairs"] * 0.7))
        if rel_evidence.get("consistent", 0) >= threshold:
            for header, cands in scored.items():
                for c in cands:
                    if c["field"] == "sales_amount":
                        c["confidence"] = round(min(0.99, c["confidence"] + 0.06), 3)
                        c["reasons"].append("relationship:quantity_x_unit_price")
                        c["needs_confirmation"] = c["confidence"] < NEEDS_CONFIRMATION_THRESHOLD

    # Select the best candidate per canonical key; exact/prefix matches win
    # because they carry the strongest name signal.
    mappings: list[FieldMapping] = []
    for field_def in CANONICAL_FIELDS:
        best: dict[str, Any] | None = None
        best_source: str | None = None
        for header in headers:
            cands = scored.get(header) or []
            candidate = next((c for c in cands if c["field"] == field_def.key), None)
            if candidate is None:
                continue
            if best is None or (candidate["confidence"], candidate["raw_score"]) > (best["confidence"], best["raw_score"]):
                best = candidate
                best_source = header
        if best is None:
            continue
        field_def_obj = CANONICAL_BY_KEY[best["field"]]
        mappings.append(
            FieldMapping(
                canonical_key=best["field"],
                source_column=best_source,
                confidence=round(best["confidence"], 3),
                value_type=field_def_obj.value_type,
                availability=AVAILABLE,
                match_method=_match_method_for_confidence(best["confidence"]),
                required=field_def_obj.required,
                confirmation_status=STATUS_PENDING,
                confirmation_source=SOURCE_SYSTEM,
                field_mapping_confidence={
                    "confidence": round(best["confidence"], 3),
                    "raw_score": best.get("raw_score"),
                    "reasons": best.get("reasons", []),
                    "needs_confirmation": best.get("needs_confirmation", False),
                },
                needs_confirmation=bool(best.get("needs_confirmation", False)),
            )
        )

    # A header maps to exactly one canonical field. If two fields select the
    # same source column, keep the higher-confidence mapping.
    used_columns: set[str] = set()
    filtered: list[FieldMapping] = []
    for m in sorted(mappings, key=lambda x: x.confidence, reverse=True):
        if m.source_column in used_columns:
            continue
        used_columns.add(m.source_column)
        filtered.append(m)
    mappings = filtered

    mapped_keys = {m.canonical_key for m in mappings}
    missing = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]
    unmapped = [h for h in headers if h not in used_columns]

    # M2.14.4: infer sales_amount from 数量 × 单价 when no amount column is
    # present and the relationship evidence is strong. Never fabricate when
    # the evidence is weak.
    if "sales_amount" not in mapped_keys and rel_evidence.get("pairs", 0) >= 3 and (rel_evidence.get("consistent", 0) >= 1 or rel_evidence.get("with_amount", 0) == 0):
        qty_m = next((m for m in mappings if m.canonical_key == "sales_quantity"), None)
        price_m = next((m for m in mappings if m.canonical_key == "unit_price"), None)
        if qty_m and price_m:
            inferred_source = f"{qty_m.source_column} × {price_m.source_column}"
            mappings.append(
                FieldMapping(
                    canonical_key="sales_amount",
                    source_column=inferred_source,
                    confidence=0.62,
                    value_type="number",
                    availability=AVAILABLE,
                    match_method=MATCH_HEURISTIC,
                    required=True,
                    confirmation_status=STATUS_PENDING,
                    confirmation_source=SOURCE_SYSTEM,
                    field_mapping_confidence={
                        "confidence": 0.62,
                        "reasons": ["relationship:quantity_x_unit_price_inferred"],
                        "needs_confirmation": True,
                    },
                    needs_confirmation=True,
                )
            )
            mapped_keys.add("sales_amount")
            missing = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]

    conflicts = detect_conflicts([m.to_dict() for m in mappings])

    # M2.14.4: explicit ambiguity list for the UI confirmation copy.
    ambiguous_columns: list[dict[str, Any]] = []
    for header in headers:
        cands = scored.get(header) or []
        if len(cands) >= 2:
            top = cands[0]
            second = cands[1]
            if second["confidence"] >= 0.55 and second["confidence"] >= top["confidence"] - 0.12:
                ambiguous_columns.append(
                    {
                        "source_column": header,
                        "top_candidate": top["field"],
                        "top_confidence": top["confidence"],
                        "alternate_candidate": second["field"],
                        "alternate_confidence": second["confidence"],
                    }
                )

    return SchemaDetection(
        source_headers=list(headers),
        mappings=mappings,
        unmapped=unmapped,
        missing=missing,
        sales_core_available=any(k in mapped_keys for k in _CORE_KEYS),
        conflicts=conflicts,
        candidate_scores=candidate_scores,
        ambiguous_columns=ambiguous_columns,
    )


def detect_conflicts(mappings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Detect multi-source conflicts for the same canonical key (pure code)."""
    by_key: dict[str, list[str]] = {}
    for m in mappings:
        if m.get("availability") != AVAILABLE or not m.get("source_column"):
            continue
        by_key.setdefault(m["canonical_key"], []).append(m["source_column"])
    return [
        {"canonical_key": key, "candidates": cols, "resolved": False}
        for key, cols in by_key.items()
        if len(cols) > 1
    ]


def _match_method_for_confidence(confidence: float | None) -> str:
    if confidence is None:
        return MATCH_HEURISTIC
    if confidence >= 1.0:
        return MATCH_USER
    if confidence >= 0.95:
        return MATCH_EXACT
    if confidence == SEMANTIC_CONFIDENCE:
        return MATCH_SEMANTIC
    if confidence >= 0.9:
        return MATCH_PREFIX
    return MATCH_HEURISTIC


def _default_audit(detected_at: str | None = None) -> dict[str, Any]:
    return {
        "suggested_at": detected_at,
        "confirmation_status": STATUS_PENDING,
        "mapping_source": SOURCE_SYSTEM,
        "schema_version": SCHEMA_VERSION,
        "history": [],
    }


def upgrade_mapping(mapping: dict[str, Any] | None) -> dict[str, Any] | None:
    """Return a v2 copy of a persisted mapping (never mutates the input).

    v1 input is upgraded in memory: match_method derived from confidence,
    confirmation states filled (confidence 1.0 => user confirmed, otherwise
    auto), conflicts detected, audit initialized. v2 input is deep-copied with
    missing v2 keys defaulted.
    """
    if not mapping or not isinstance(mapping, dict):
        return mapping
    if int(mapping.get("version", 1) or 1) >= MAPPING_VERSION:
        out = copy.deepcopy(mapping)
        out.setdefault("schema_version", SCHEMA_VERSION)
        out.setdefault("conflicts", detect_conflicts(out.get("mappings") or []))
        out.setdefault("audit", _default_audit(out.get("detected_at")))
        return out

    out = copy.deepcopy(mapping)
    out["version"] = MAPPING_VERSION
    out["schema_version"] = SCHEMA_VERSION
    out["conflicts"] = detect_conflicts(out.get("mappings") or [])

    upgraded_mappings: list[dict[str, Any]] = []
    has_user = False
    for m in out.get("mappings") or []:
        m["match_method"] = _match_method_for_confidence(m.get("confidence"))
        m["required"] = _field_required(m["canonical_key"])
        m["example_values"] = []
        if m.get("availability") == AVAILABLE and m.get("source_column"):
            if m.get("confidence", 0) >= 1.0:
                m["confirmation_status"] = STATUS_CONFIRMED
                m["confirmation_source"] = SOURCE_USER
                m["confirmed_mapping"] = {"source_column": m.get("source_column")}
                m["confirmed_at"] = out.get("detected_at")
                has_user = True
            else:
                m["confirmation_status"] = STATUS_AUTO
                m["confirmation_source"] = SOURCE_AUTO_ACCEPT
        else:
            m["confirmation_status"] = STATUS_UNAVAILABLE
            m["confirmation_source"] = SOURCE_AUTO_ACCEPT
        upgraded_mappings.append(m)
    out["mappings"] = upgraded_mappings

    out["audit"] = {
        "suggested_at": out.get("detected_at"),
        "confirmed_at": out.get("detected_at") if has_user else None,
        "confirmation_status": overall_confirmation_status(out),
        "mapping_source": SOURCE_USER if has_user else SOURCE_AUTO_ACCEPT,
        "schema_version": SCHEMA_VERSION,
        "history": [],
    }
    return out


def attach_examples_to_mapping(
    mapping: dict[str, Any] | None,
    dataset: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """Attach the first 3 distinct non-empty example values per mapped column.

    Examples are read from actual dataset rows (pure code, no AI). The input
    mapping is not mutated; the returned copy carries ``example_values``.
    """
    if not mapping or not dataset:
        return mapping
    out = copy.deepcopy(mapping)
    headers = dataset.get("headers") or []
    rows = dataset.get("rows") or []
    index_by_header = {h: i for i, h in enumerate(headers)}
    for m in out.get("mappings") or []:
        col = m.get("source_column")
        if not col or col not in index_by_header:
            continue
        idx = index_by_header[col]
        examples: list[str] = []
        seen: set[str] = set()
        for row in rows:
            if idx >= len(row):
                continue
            val = row[idx]
            if val is None or val == "":
                continue
            sval = str(val)
            if sval in seen:
                continue
            seen.add(sval)
            examples.append(sval)
            if len(examples) >= 3:
                break
        m["example_values"] = examples
    return out


def overall_confirmation_status(mapping: dict[str, Any] | None) -> str:
    """Aggregate confirmation status across available mapped fields."""
    if not mapping:
        return STATUS_UNAVAILABLE
    statuses = [
        m.get("confirmation_status", STATUS_PENDING)
        for m in mapping.get("mappings") or []
        if m.get("availability") == AVAILABLE
    ]
    if not statuses:
        return STATUS_UNAVAILABLE
    if all(s == STATUS_CONFIRMED for s in statuses):
        return STATUS_CONFIRMED
    # Confirmation priority: confirmed > modified > skipped > pending > auto.
    for status in (STATUS_CONFIRMED, STATUS_MODIFIED, STATUS_SKIPPED, STATUS_PENDING):
        if any(s == status for s in statuses):
            return status
    return STATUS_AUTO


def _field_snapshot(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_column": entry.get("source_column"),
        "confidence": entry.get("confidence"),
        "availability": entry.get("availability"),
        "confirmation_status": entry.get("confirmation_status"),
        "match_method": entry.get("match_method"),
    }


def _changed_fields(previous: dict[str, Any], new: dict[str, Any]) -> list[str]:
    return [k for k in new if previous.get(k) != new.get(k)]


def apply_confirmation_actions(
    mapping: dict[str, Any] | None,
    actions: list[dict[str, Any]],
    headers: list[str],
    user_id: int | None = None,
) -> dict[str, Any]:
    """Apply user confirm / modify / skip actions to a mapping.

    Returns a new v2 mapping. The previous field state is appended to
    ``audit.history`` (append-only, capped at AUDIT_HISTORY_LIMIT) before each
    change. Never mutates the input dict.

    - confirm: accept the system suggestion -> status=confirmed, user_confirmed
    - modify + source_column: user-chosen column -> status=modified
    - modify + source_column=None: explicitly mark unavailable
    - skip: keep the system suggestion, mark skipped (never fake confirmed)

    Raises ValueError for unknown keys, invalid actions, or source columns
    outside the workbook headers.
    """
    base = upgrade_mapping(mapping)
    if base is None:
        base = {
            "version": MAPPING_VERSION,
            "schema_version": SCHEMA_VERSION,
            "source_headers": list(headers),
            "mappings": [],
            "unmapped": list(headers),
            "missing": [f.key for f in CANONICAL_FIELDS],
            "conflicts": [],
            "sales_core_available": False,
            "detected_at": datetime.now(timezone.utc).isoformat(),
        }
    out = copy.deepcopy(base)
    out["source_headers"] = list(headers)
    header_set = set(headers)
    now = datetime.now(timezone.utc).isoformat()
    history = list((out.get("audit") or {}).get("history") or [])

    for action in actions:
        canonical_key = action.get("canonical_key")
        action_type = action.get("action")
        if canonical_key not in CANONICAL_BY_KEY:
            raise ValueError(f"Unknown canonical field: {canonical_key}")
        if action_type not in ("confirm", "modify", "skip"):
            raise ValueError(f"Invalid action: {action_type}")
        source_column = action.get("source_column")
        if source_column is not None and source_column not in header_set:
            raise ValueError(f"Source column not found in workbook: {source_column}")

        entry = next(
            (m for m in out["mappings"] if m.get("canonical_key") == canonical_key),
            None,
        )
        if entry is None:
            entry = {
                "canonical_key": canonical_key,
                "source_column": None,
                "confidence": 1.0,
                "value_type": _field_value_type(canonical_key),
                "availability": UNAVAILABLE,
                "match_method": MATCH_USER,
                "required": _field_required(canonical_key),
                "example_values": [],
                "confirmation_status": STATUS_PENDING,
                "confirmation_source": SOURCE_SYSTEM,
            }
            out["mappings"].append(entry)

        previous = _field_snapshot(entry)
        if action_type == "confirm":
            if entry.get("availability") != AVAILABLE or not entry.get("source_column"):
                raise ValueError(f"Cannot confirm unavailable field: {canonical_key}")
            entry["confirmation_status"] = STATUS_CONFIRMED
            entry["confirmation_source"] = SOURCE_USER
            entry["match_method"] = MATCH_USER
            entry["confirmed_mapping"] = {"source_column": entry.get("source_column")}
            entry["confirmed_at"] = now
        elif action_type == "modify":
            entry["source_column"] = source_column
            entry["availability"] = AVAILABLE if source_column is not None else UNAVAILABLE
            entry["confidence"] = 1.0
            entry["match_method"] = MATCH_USER
            entry["confirmation_source"] = SOURCE_USER
            entry["confirmed_mapping"] = {"source_column": source_column}
            entry["confirmed_at"] = now
            entry["confirmation_status"] = (
                STATUS_UNAVAILABLE if source_column is None else STATUS_MODIFIED
            )
        else:  # skip: keep the system suggestion, stay honest about provenance
            entry["confirmation_status"] = STATUS_SKIPPED
            entry["confirmed_at"] = now

        new_snapshot = _field_snapshot(entry)
        changed = _changed_fields(previous, new_snapshot)
        history.append(
            {
                "action": action_type,
                "timestamp": now,
                "canonical_key": canonical_key,
                "previous": previous,
                "new": new_snapshot,
                "source": SOURCE_USER if action_type != "skip" else SOURCE_SYSTEM,
                "user_id": user_id,
                "changed_fields": changed,
            }
        )

        # A confirm/modify resolves a multi-candidate conflict: the chosen
        # entry wins and the other candidates for the same canonical key are
        # dropped (skip keeps all suggestions untouched).
        if action_type in ("confirm", "modify"):
            out["mappings"] = [
                m for m in out["mappings"]
                if m.get("canonical_key") != canonical_key or m is entry
            ]

    history = history[-AUDIT_HISTORY_LIMIT:]

    # Recompute aggregates from the new mapping state.
    available_entries = [
        m for m in out["mappings"]
        if m.get("availability") == AVAILABLE and m.get("source_column")
    ]
    mapped_keys = {m["canonical_key"] for m in available_entries}
    out["missing"] = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]
    used_columns = {m["source_column"] for m in available_entries}
    out["unmapped"] = [h for h in headers if h not in used_columns]
    out["sales_core_available"] = any(k in mapped_keys for k in _CORE_KEYS)

    # Fields acted upon resolve their conflicts (user made the choice); the
    # remaining mappings are re-scanned for unresolved multi-source conflicts.
    acted_keys = {a.get("canonical_key") for a in actions}
    remaining = [
        m for m in out["mappings"] if m.get("canonical_key") not in acted_keys
    ]
    out["conflicts"] = detect_conflicts(remaining)

    overall = overall_confirmation_status(out)
    has_user = any(
        m.get("confirmation_source") == SOURCE_USER for m in out["mappings"]
    )
    audit = dict(out.get("audit") or {})
    audit["suggested_at"] = audit.get("suggested_at", base.get("detected_at"))
    audit["confirmed_at"] = now
    audit["confirmation_status"] = overall
    audit["mapping_source"] = SOURCE_USER if has_user else SOURCE_SYSTEM
    audit["schema_version"] = SCHEMA_VERSION
    audit["confirmed_by_user_id"] = user_id
    audit["history"] = history
    out["audit"] = audit
    return out


def derive_schema_meta(mapping: dict[str, Any] | None) -> dict[str, Any] | None:
    """Return per-run field-semantics provenance for a new AnalysisRun.

    ``mapping_source`` is ``user_confirmed`` when any field was confirmed or
    modified by a user, otherwise ``auto`` (system suggestion, possibly
    skipped). Never touches historical result_json.
    """
    if not mapping:
        return None
    v2 = upgrade_mapping(mapping)
    if not v2:
        return None
    has_user = any(
        m.get("confirmation_source") == SOURCE_USER
        or m.get("confirmation_status") in (STATUS_CONFIRMED, STATUS_MODIFIED)
        for m in v2.get("mappings") or []
    )
    audit = v2.get("audit") or {}
    return {
        "schema_version": v2.get("schema_version", SCHEMA_VERSION),
        "mapping_source": SOURCE_USER if has_user else "auto",
        "confirmation_status": overall_confirmation_status(v2),
        "confirmed_at": audit.get("confirmed_at"),
        "source_file": v2.get("source_file"),
        "conflicts": [
            c for c in (v2.get("conflicts") or []) if not c.get("resolved")
        ],
    }


def build_saved_mapping(
    headers: list[str],
    confirmed: list[tuple[str, str | None]],
) -> dict[str, Any]:
    """Build a persisted schema_mapping v2 from user-confirmed mappings.

    ``confirmed`` items are (canonical_key, source_column_or_None). A None
    source column marks the field as explicitly unavailable.

    Raises ValueError if a canonical key is unknown or a source column is not
    in the current headers.
    """
    header_set = set(headers)
    now = datetime.now(timezone.utc).isoformat()
    mappings: list[dict[str, Any]] = []
    available_keys: set[str] = set()

    for canonical_key, source_column in confirmed:
        field_def = CANONICAL_BY_KEY.get(canonical_key)
        if field_def is None:
            raise ValueError(f"Unknown canonical field: {canonical_key}")
        if source_column is not None and source_column not in header_set:
            raise ValueError(f"Source column not found in workbook: {source_column}")
        availability = AVAILABLE if source_column is not None else UNAVAILABLE
        if availability == AVAILABLE:
            available_keys.add(canonical_key)
        mappings.append(
            {
                "canonical_key": canonical_key,
                "source_column": source_column,
                "confidence": 1.0,
                "value_type": field_def.value_type,
                "availability": availability,
                "match_method": MATCH_USER,
                "required": field_def.required,
                "example_values": [],
                "confirmation_status": (
                    STATUS_CONFIRMED if availability == AVAILABLE else STATUS_UNAVAILABLE
                ),
                "confirmation_source": SOURCE_USER,
                "confirmed_mapping": {"source_column": source_column},
                "confirmed_at": now,
            }
        )

    mapped_source_columns = {
        m["source_column"] for m in mappings if m["source_column"] is not None
    }
    missing = [f.key for f in CANONICAL_FIELDS if f.key not in available_keys]
    unmapped = [h for h in headers if h not in mapped_source_columns]

    return {
        "version": MAPPING_VERSION,
        "schema_version": SCHEMA_VERSION,
        "source_headers": list(headers),
        "mappings": mappings,
        "unmapped": unmapped,
        "missing": missing,
        "conflicts": [],
        "sales_core_available": any(k in available_keys for k in _CORE_KEYS),
        "detected_at": now,
        "audit": {
            "suggested_at": now,
            "confirmed_at": now,
            "confirmation_status": STATUS_CONFIRMED,
            "mapping_source": SOURCE_USER,
            "schema_version": SCHEMA_VERSION,
            "history": [],
        },
    }
