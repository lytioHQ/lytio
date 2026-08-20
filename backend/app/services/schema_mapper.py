"""Map raw workbook headers to canonical sales fields.

Detection strategy (v2):
1. exact synonym match after normalization          -> confidence 0.97
2. exact match after stripping common prefixes      -> confidence 0.92
3. type-aware heuristic for numeric/date columns    -> confidence 0.60-0.70

M2.13.1 adds the confirmation layer on top of v1 detection:
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

# M2.13.1: match methods and confirmation states (canonical vocabulary).
MATCH_EXACT = "exact_synonym"
MATCH_PREFIX = "prefix_strip"
MATCH_HEURISTIC = "heuristic_type"
MATCH_USER = "user_confirmed"

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

    def to_dict(self) -> dict[str, Any]:
        mapping_dicts = [m.to_dict() for m in self.mappings]
        audit: dict[str, Any] = {
            "suggested_at": self.detected_at,
            "confirmation_status": overall_confirmation_status({"mappings": mapping_dicts}),
            "mapping_source": SOURCE_SYSTEM,
            "schema_version": SCHEMA_VERSION,
            "history": [],
        }
        return {
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
    return None


def _match_header(header: str, column_type: str) -> tuple[str, float, str] | None:
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
    """Detect canonical field mappings for a list of headers (v2 suggestions)."""
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
        canonical_key, confidence, method = hit
        field_def = CANONICAL_BY_KEY[canonical_key]
        # Small confidence penalty when the column type contradicts the field type.
        if col_type not in ("unknown",) and field_def.value_type != col_type:
            confidence = max(0.5, confidence - 0.1)
        mappings.append(
            FieldMapping(
                canonical_key=canonical_key,
                source_column=header,
                confidence=round(confidence, 2),
                value_type=field_def.value_type,
                availability=AVAILABLE,
                match_method=method,
                required=field_def.required,
                confirmation_status=STATUS_PENDING,
                confirmation_source=SOURCE_SYSTEM,
            )
        )
        matched_columns.add(header)

    mapped_keys = {m.canonical_key for m in mappings}
    missing = [f.key for f in CANONICAL_FIELDS if f.key not in mapped_keys]
    unmapped = [h for h in headers if h not in matched_columns]
    conflicts = detect_conflicts([m.to_dict() for m in mappings])

    return SchemaDetection(
        source_headers=list(headers),
        mappings=mappings,
        unmapped=unmapped,
        missing=missing,
        sales_core_available=any(k in mapped_keys for k in _CORE_KEYS),
        conflicts=conflicts,
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
