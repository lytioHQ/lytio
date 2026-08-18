"""Map raw workbook headers to canonical sales fields.

Detection strategy (v1, conservative):
1. exact synonym match after normalization          -> confidence 0.97
2. exact match after stripping common prefixes      -> confidence 0.92
3. type-aware heuristic for numeric/date columns    -> confidence 0.60-0.70

Missing fields are reported as ``unavailable`` (never filled with zeros).
No I/O, no AI. Pure header -> canonical vocabulary mapping.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.services.canonical_schema import (
    CANONICAL_BY_KEY,
    CANONICAL_FIELDS,
    COMMON_PREFIXES,
    _AMOUNT_SUFFIXES,
    _DATE_HINTS,
    _QUANTITY_SUFFIXES,
    normalize_header,
)

EXACT_CONFIDENCE = 0.97
PREFIX_STRIP_CONFIDENCE = 0.92
HEURISTIC_AMOUNT_CONFIDENCE = 0.60
HEURISTIC_QUANTITY_CONFIDENCE = 0.60
HEURISTIC_DATE_CONFIDENCE = 0.70

AVAILABLE = "available"
UNAVAILABLE = "unavailable"


@dataclass
class FieldMapping:
    canonical_key: str
    source_column: str | None
    confidence: float
    value_type: str
    availability: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "canonical_key": self.canonical_key,
            "source_column": self.source_column,
            "confidence": self.confidence,
            "value_type": self.value_type,
            "availability": self.availability,
        }


@dataclass
class SchemaDetection:
    source_headers: list[str] = field(default_factory=list)
    mappings: list[FieldMapping] = field(default_factory=list)
    unmapped: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    sales_core_available: bool = False
    detected_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": 1,
            "source_headers": self.source_headers,
            "mappings": [m.to_dict() for m in self.mappings],
            "unmapped": self.unmapped,
            "missing": self.missing,
            "sales_core_available": self.sales_core_available,
            "detected_at": self.detected_at,
        }


def _exact_match(norm: str) -> tuple[str, float] | None:
    """Return (canonical_key, confidence) for an exact synonym hit."""
    for field in CANONICAL_FIELDS:
        if norm in field.normalized_synonyms():
            return field.key, EXACT_CONFIDENCE
    return None


def _prefix_strip_match(norm: str) -> tuple[str, float] | None:
    """Return (canonical_key, confidence) after stripping a common prefix."""
    for prefix in COMMON_PREFIXES:
        if norm.startswith(prefix) and len(norm) > len(prefix):
            stripped = norm[len(prefix):]
            hit = _exact_match(stripped)
            if hit is not None:
                return hit[0], PREFIX_STRIP_CONFIDENCE
    return None


def _heuristic_match(norm: str, column_type: str) -> tuple[str, float] | None:
    """Type-aware fallback for numeric/date columns with unfamiliar names."""
    if column_type == "date" or any(hint in norm for hint in _DATE_HINTS):
        return "order_date", HEURISTIC_DATE_CONFIDENCE
    if column_type == "number":
        if norm.endswith(_AMOUNT_SUFFIXES):
            return "sales_amount", HEURISTIC_AMOUNT_CONFIDENCE
        if norm.endswith(_QUANTITY_SUFFIXES):
            return "sales_quantity", HEURISTIC_QUANTITY_CONFIDENCE
    return None


def _match_header(header: str, column_type: str) -> tuple[str, float] | None:
    norm = normalize_header(header)
    if not norm:
        return None

    hit = _exact_match(norm)
    if hit is None:
        hit = _prefix_strip_match(norm)
    if hit is None:
        hit = _heuristic_match(norm, column_type)
    return hit


def detect_schema(headers: list[str], column_types: dict[str, str] | None = None) -> SchemaDetection:
    """Detect canonical field mappings for a list of headers."""
    column_types = column_types or {}
    mappings: list[FieldMapping] = []
    matched_columns: set[str] = set()

    for header in headers:
        col_type = column_types.get(header, "unknown")
        if col_type == "empty":
            continue
        hit = _match_header(header, col_type)
        if hit is None:
            continue
        canonical_key, confidence = hit
        field = CANONICAL_BY_KEY[canonical_key]
        # Small confidence penalty when the column type contradicts the field type.
        if col_type not in ("unknown",) and field.value_type != col_type:
            confidence = max(0.5, confidence - 0.1)
        mappings.append(
            FieldMapping(
                canonical_key=canonical_key,
                source_column=header,
                confidence=round(confidence, 2),
                value_type=field.value_type,
                availability=AVAILABLE,
            )
        )
        matched_columns.add(header)

    mapped_keys = {m.canonical_key for m in mappings}
    missing = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]
    unmapped = [h for h in headers if h not in matched_columns]

    return SchemaDetection(
        source_headers=list(headers),
        mappings=mappings,
        unmapped=unmapped,
        missing=missing,
        sales_core_available="sales_amount" in mapped_keys or "sales_quantity" in mapped_keys,
    )


def build_saved_mapping(
    headers: list[str],
    confirmed: list[tuple[str, str | None]],
) -> dict[str, Any]:
    """Build a persisted schema_mapping dict from user-confirmed mappings.

    ``confirmed`` items are (canonical_key, source_column_or_None). A None
    source column marks the field as explicitly unavailable.

    Raises ValueError if a canonical key is unknown or a source column is not
    in the current headers.
    """
    header_set = set(headers)
    mappings: list[dict[str, Any]] = []
    available_keys: set[str] = set()

    for canonical_key, source_column in confirmed:
        field = CANONICAL_BY_KEY.get(canonical_key)
        if field is None:
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
                "value_type": field.value_type,
                "availability": availability,
            }
        )

    mapped_source_columns = {
        m["source_column"] for m in mappings if m["source_column"] is not None
    }
    missing = [f.key for f in CANONICAL_FIELDS if f.key not in available_keys]
    unmapped = [h for h in headers if h not in mapped_source_columns]

    return {
        "version": 1,
        "source_headers": list(headers),
        "mappings": mappings,
        "unmapped": unmapped,
        "missing": missing,
        "sales_core_available": (
            "sales_amount" in available_keys or "sales_quantity" in available_keys
        ),
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }
