"""Sales Health Score v1 — pure computation, no AI.

Five interpretable dimensions are scored from the Metric Engine output (plus
direct dataset aggregates where no metric exists yet). The AI layer receives
the score only to explain it; it never generates or modifies scores.

Rules:
- missing field -> availability="unavailable" (no defaults, no fabrication)
- weights default to 0.20 each and are renormalized across available dims
- all dims unavailable -> health_score=null
- historical runs are never modified
"""

from __future__ import annotations

import statistics
from collections import Counter
from typing import Any

from app.services.metric_engine import (
    _col_index,
    _resolve_mapping,
    metric_map,
)

ENGINE_VERSION = "health_score_v1"
DEFAULT_WEIGHT = 0.20
AVAILABLE = "available"
UNAVAILABLE = "unavailable"
HIGH = "high"
MEDIUM = "medium"
LOW = "low"

_WIN_KEYWORDS = ("成交", "赢单", "签约", "已签", "won", "closed", "win")


def _level_for(score: float) -> str:
    if score >= 90:
        return "Excellent"
    if score >= 75:
        return "Good"
    if score >= 60:
        return "Fair"
    if score >= 45:
        return "Concerning"
    return "Critical"


def _dim(
    name: str,
    score: float | None,
    formula: str,
    evidence: dict,
    source_metrics: list[str],
    availability: str,
    confidence: str,
    note: str = "",
) -> dict[str, Any]:
    return {
        "name": name,
        "score": score,
        "weight": DEFAULT_WEIGHT,
        "weighted_score": None,
        "formula": formula,
        "evidence": evidence,
        "source_metrics": source_metrics,
        "availability": availability,
        "confidence": confidence,
        "note": note,
    }


def _unavailable(name: str, formula: str, source_metrics: list[str], note: str) -> dict[str, Any]:
    return _dim(
        name=name,
        score=None,
        formula=formula,
        evidence={},
        source_metrics=source_metrics,
        availability=UNAVAILABLE,
        confidence=LOW,
        note=note,
    )


def _pipeline_health(headers: list[str], rows: list[list], mapping: dict[str, str]) -> dict[str, Any]:
    stage_col = mapping.get("pipeline_stage")
    if not stage_col:
        return _unavailable("pipeline_health", "100 × won_share | 100 × (1 - max_stage_share)", [], "missing field: pipeline_stage")
    idx = _col_index(headers, stage_col)
    if idx is None:
        return _unavailable("pipeline_health", "100 × won_share | 100 × (1 - max_stage_share)", [], "missing field: pipeline_stage")
    counts: Counter[str] = Counter()
    for row in rows:
        if idx < len(row) and row[idx] not in ("", None):
            counts[str(row[idx])] += 1
    if not counts:
        return _unavailable("pipeline_health", "100 × won_share | 100 × (1 - max_stage_share)", [], "no pipeline stage values")
    total = sum(counts.values())
    won = sum(v for k, v in counts.items() if any(w in k.lower() for w in _WIN_KEYWORDS))
    if won:
        score = 100.0 * won / total
        formula = "100 × won_stage_share"
        evidence = {"won_share": round(won / total, 4), "stages": dict(counts.most_common(6))}
    else:
        max_share = max(counts.values()) / total
        score = 100.0 * (1 - max_share)
        formula = "100 × (1 - max_stage_share)"
        evidence = {"max_stage_share": round(max_share, 4), "stages": dict(counts.most_common(6))}
    return _dim(
        name="pipeline_health",
        score=round(score, 1),
        formula=formula,
        evidence=evidence,
        source_metrics=[],
        availability=AVAILABLE,
        confidence=HIGH if total >= 10 else MEDIUM,
    )


def _conversion_stability(metrics: dict[str, dict]) -> dict[str, Any]:
    growth = metrics.get("sales_growth")
    formula = "100 - min(100, CV(monthly_sales) × 120)"
    if not growth or growth.get("availability") != AVAILABLE or growth.get("value") is None:
        return _unavailable("conversion_stability", formula, ["sales_growth"], "need at least 2 months (order_date + sales_amount)")
    months = [
        e.get("total") for e in growth.get("evidence_rows", [])
        if isinstance(e.get("total"), (int, float))
    ]
    if len(months) < 2:
        return _unavailable("conversion_stability", formula, ["sales_growth"], "need at least 2 distinct months")
    mean = sum(months) / len(months)
    if mean <= 0:
        return _unavailable("conversion_stability", formula, ["sales_growth"], "monthly totals are not positive")
    cv = statistics.pstdev(months) / mean
    score = max(0.0, 100.0 - min(100.0, cv * 120))
    return _dim(
        name="conversion_stability",
        score=round(score, 1),
        formula=formula,
        evidence={"cv": round(cv, 4), "monthly_totals": [round(x, 2) for x in months]},
        source_metrics=["sales_growth"],
        availability=AVAILABLE,
        confidence=HIGH if len(months) >= 3 else MEDIUM,
    )


def _revenue_quality(metrics: dict[str, dict]) -> dict[str, Any]:
    total = metrics.get("total_sales")
    formula = "60 + clamp(sales_growth, ±0.5) × 40"
    if not total or total.get("availability") != AVAILABLE:
        return _unavailable("revenue_quality", formula, ["total_sales"], "missing field: sales_amount")
    growth = metrics.get("sales_growth")
    g = growth.get("value") if growth and growth.get("availability") == AVAILABLE and growth.get("value") is not None else None
    score = 60.0 + (max(-0.5, min(0.5, float(g))) * 40 if g is not None else 0.0)
    source_metrics = ["total_sales"] + (["sales_growth"] if g is not None else [])
    return _dim(
        name="revenue_quality",
        score=round(score, 1),
        formula=formula,
        evidence={"total_sales": total.get("value"), "sales_growth": g},
        source_metrics=source_metrics,
        availability=AVAILABLE,
        confidence=HIGH,
    )


def _customer_risk(metrics: dict[str, dict]) -> dict[str, Any]:
    conc = metrics.get("customer_concentration")
    formula = "100 - top1_customer_share × 100"
    if not conc or conc.get("availability") != AVAILABLE or conc.get("value") is None:
        return _unavailable("customer_risk", formula, ["customer_concentration"], "missing field: customer_name or sales_amount")
    top1 = float(conc["value"])
    score = max(0.0, 100.0 - top1 * 100)
    return _dim(
        name="customer_risk",
        score=round(score, 1),
        formula=formula,
        evidence={"top1_share": round(top1, 4), "top_customers": conc.get("evidence_rows", [])},
        source_metrics=["customer_concentration"],
        availability=AVAILABLE,
        confidence=HIGH,
    )


def _productivity(headers: list[str], rows: list[list], mapping: dict[str, str]) -> dict[str, Any]:
    person_col = mapping.get("sales_person")
    amount_col = mapping.get("sales_amount")
    formula = "100 - top1_salesperson_share × 100"
    if not person_col or not amount_col:
        return _unavailable("productivity", formula, ["sales_amount"], "missing field: sales_person or sales_amount")
    pidx = _col_index(headers, person_col)
    aidx = _col_index(headers, amount_col)
    if pidx is None or aidx is None:
        return _unavailable("productivity", formula, ["sales_amount"], "missing field: sales_person or sales_amount")
    totals: Counter[str] = Counter()
    for row in rows:
        if pidx >= len(row) or aidx >= len(row):
            continue
        name, v = row[pidx], row[aidx]
        if name in ("", None) or isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            totals[str(name)] += float(v)
    if not totals:
        return _unavailable("productivity", formula, ["sales_amount"], "no salesperson rows")
    total = sum(totals.values())
    if total <= 0:
        return _unavailable("productivity", formula, ["sales_amount"], "no positive sales per salesperson")
    top1_share = totals.most_common(1)[0][1] / total
    score = max(0.0, 100.0 - top1_share * 100)
    return _dim(
        name="productivity",
        score=round(score, 1),
        formula=formula,
        evidence={"top1_person_share": round(top1_share, 4), "salesperson_count": len(totals)},
        source_metrics=[],
        availability=AVAILABLE,
        confidence=HIGH if len(totals) >= 3 else MEDIUM,
    )


def _overall_confidence(dimensions: list[dict]) -> str:
    confidences = {d["confidence"] for d in dimensions if d["availability"] == AVAILABLE}
    if not confidences:
        return LOW
    if LOW in confidences:
        return LOW
    if MEDIUM in confidences:
        return MEDIUM
    return HIGH


def compute_health_score(
    dataset: dict[str, Any],
    schema_mapping: dict | None = None,
    computed_metrics: list[dict] | None = None,
) -> dict[str, Any]:
    """Compute the v1 five-dimension health score.

    dataset: extract_canonical_dataset output (headers / rows / column_types).
    schema_mapping: persisted or freshly detected mapping (canonical -> column).
    computed_metrics: Metric Engine output (optional; dimensions fall back to
        direct dataset aggregates when no metric covers them).
    """
    headers = dataset.get("headers") or []
    rows = dataset.get("rows") or []
    mapping = _resolve_mapping(schema_mapping)
    metrics = metric_map(computed_metrics or [])

    dimensions = [
        _pipeline_health(headers, rows, mapping),
        _conversion_stability(metrics),
        _revenue_quality(metrics),
        _customer_risk(metrics),
        _productivity(headers, rows, mapping),
    ]

    available = [d for d in dimensions if d["availability"] == AVAILABLE]
    if available:
        raw_total = sum(d["weight"] for d in available)
        for d in dimensions:
            if d["availability"] == AVAILABLE:
                d["weight"] = round(d["weight"] / raw_total, 4)
                d["weighted_score"] = round(float(d["score"]) * d["weight"], 2)
            else:
                d["weighted_score"] = None
        health_score = round(sum(float(d["weighted_score"]) for d in available), 1)
        health_level = _level_for(health_score)
        coverage = len(available) / len(dimensions)
    else:
        health_score = None
        health_level = None
        coverage = 0.0

    return {
        "health_score": health_score,
        "health_level": health_level,
        "coverage": round(coverage, 2),
        "score_confidence": _overall_confidence(dimensions),
        "engine_version": ENGINE_VERSION,
        "dimensions": dimensions,
    }
