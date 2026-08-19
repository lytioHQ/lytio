"""M2.13.0 - system-computed before/after metric changes for verification.

All numeric values, changes and directions are computed in code. The AI never
calculates or overrides these numbers; it only explains them. Missing values
stay ``unavailable`` and are never coerced to zero.

Compatibility:
- Additive only. Existing verification contracts and historical
  ``result_json`` are never modified.
- Depends on the M2.12.1 Metric Engine (hard computation) plus the persisted
  parent-run ``computed_metrics`` already stored in ``result_json``.
"""

from __future__ import annotations

import json
from typing import Any

from app.services.metric_engine import compute_metrics, metric_map

# Directional sales metrics comparable across datasets.
# "up" = a higher value is better; "down" = a lower value is better.
# Direction semantics are business-aligned so a *decrease* in concentration
# is reported as "improved" (matches the verification prompt's direction enum).
COMPARABLE_METRICS: dict[str, str] = {
    "total_sales": "up",
    "sales_growth": "up",
    "order_count": "up",
    "average_order_value": "up",
    "customer_count": "up",
    "customer_concentration": "down",
}

# Rate-like metrics: percentage_change is not a meaningful ratio for these.
# absolute_change is expressed in the metric's own unit (fraction).
RATE_LIKE_METRICS: frozenset[str] = frozenset({"sales_growth", "customer_concentration"})

# Non-directional / informational metrics excluded from the change table.
EXCLUDED_METRICS: frozenset[str] = frozenset(
    {"row_count", "date_range", "product_sales_rank"}
)

# Alias map: canonical metric key -> accepted human/AI names (lowercased).
# Used to match AI-provided metric names back to system metrics so that
# system numbers always win and AI-invented metrics are dropped.
METRIC_NAME_ALIASES: dict[str, tuple[str, ...]] = {
    "total_sales": ("total_sales", "sales", "sales total", "total sales", "销售额", "总销售额", "销售总额", "营收", "收入"),
    "sales_growth": ("sales_growth", "sales growth", "销售增长", "销售额增长率", "增长率"),
    "order_count": ("order_count", "orders", "order count", "订单量", "订单数量", "成交数量", "成交订单数"),
    "average_order_value": ("average_order_value", "aov", "avg order value", "客单价", "平均客单价", "平均订单金额", "订单均价"),
    "customer_count": ("customer_count", "customers", "customer count", "客户数", "客户数量", "客户总量"),
    "customer_concentration": ("customer_concentration", "concentration", "客户集中度", "集中度", "top1客户占比", "top客户占比"),
}


def extract_before_metrics(result_json: str | None) -> dict[str, dict[str, Any]]:
    """Extract the parent run's system-computed metrics (metric_name -> metric)."""
    if not result_json:
        return {}
    try:
        data = json.loads(result_json)
    except (json.JSONDecodeError, TypeError):
        return {}
    if not isinstance(data, dict):
        return {}
    metrics = data.get("computed_metrics")
    if not isinstance(metrics, list):
        return {}
    return {
        m.get("metric_name"): m
        for m in metrics
        if isinstance(m, dict) and m.get("metric_name")
    }


def resolve_metric_key(name: Any) -> str | None:
    """Map a human/AI metric name back to its canonical key, if known."""
    if name is None:
        return None
    norm = str(name).strip().lower()
    if not norm:
        return None
    if norm in COMPARABLE_METRICS:
        return norm
    for key, aliases in METRIC_NAME_ALIASES.items():
        if norm in aliases:
            return key
    return None


def _numeric_value(metric: dict[str, Any] | None) -> float | None:
    if not metric:
        return None
    if metric.get("availability") != "available":
        return None
    value = metric.get("value")
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _clean_number(value: float) -> Any:
    """Keep integers as integers for clean JSON display."""
    if float(value).is_integer():
        return int(value)
    return round(value, 4)


def _direction(name: str, delta: float) -> str:
    """Business-aligned factual direction: improved | declined | unchanged."""
    if delta == 0:
        return "unchanged"
    higher_is_better = COMPARABLE_METRICS.get(name, "up") == "up"
    return "improved" if (delta > 0) == higher_is_better else "declined"


def compute_before_after_changes(
    before_result_json: str | None,
    after_dataset: dict[str, Any],
    schema_mapping: dict | None = None,
) -> list[dict[str, Any]]:
    """Compute system metric changes between the parent run and a new dataset.

    Args:
        before_result_json: Parent AnalysisRun ``result_json`` (contains the
            M2.12.1 system ``computed_metrics``).
        after_dataset: ``extract_canonical_dataset`` output for the new file.
        schema_mapping: Persisted project mapping or detection dict. When None
            the metric engine falls back to its own detection semantics.

    Returns:
        A list of ``MetricChange``-shaped dicts ordered by ``COMPARABLE_METRICS``.
    """
    before = extract_before_metrics(before_result_json)
    after_map = metric_map(compute_metrics(after_dataset, schema_mapping))

    changes: list[dict[str, Any]] = []
    for name in COMPARABLE_METRICS:
        before_value = _numeric_value(before.get(name))
        after_value = _numeric_value(after_map.get(name))
        if before_value is None or after_value is None:
            changes.append(
                {
                    "metric_name": name,
                    "before": _clean_number(before_value) if before_value is not None else None,
                    "after": _clean_number(after_value) if after_value is not None else None,
                    "absolute_change": None,
                    "percentage_change": None,
                    "direction": "unavailable",
                    "status": "unavailable",
                    "interpretation": "",
                }
            )
            continue

        delta = after_value - before_value
        percentage_change = None
        if name not in RATE_LIKE_METRICS and before_value != 0:
            percentage_change = round((delta / abs(before_value)) * 100, 2)
        changes.append(
            {
                "metric_name": name,
                "before": _clean_number(before_value),
                "after": _clean_number(after_value),
                "absolute_change": _clean_number(delta),
                "percentage_change": percentage_change,
                "direction": _direction(name, delta),
                "status": "available",
                "interpretation": "",
            }
        )
    return changes
