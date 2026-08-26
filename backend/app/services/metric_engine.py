"""Sales Metric Engine v1 — pure computation, no AI.

All core business metrics are computed here from the extracted dataset plus a
canonical schema mapping (persisted ``projects.schema_mapping`` or a fresh
``detect_schema`` result). The AI layer consumes ``computed_metrics`` only for
explanation and recommendations; it never produces or modifies these numbers.

Rules:
- missing field -> availability="unavailable" (never fill with zero)
- never raise: metric failures degrade to unavailable entries
- evidence_rows: at most 5 representative rows per metric
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import date, datetime
from typing import Any
from decimal import Decimal


def _json_safe(value: Any) -> Any:
    """Normalize a cell value to a JSON-serializable primitive.

    Evidence snapshots keep the original cell value, but openpyxl returns
    ``datetime`` objects for real date-formatted cells and numeric cells can
    be ``Decimal``. Those must become stable strings/numbers before the value
    ever enters result_json / prompt JSON (M2.14.2 UAT P0).
    """
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value

from app.services.canonical_schema import CANONICAL_BY_KEY
from app.services.schema_mapper import AVAILABLE, UNAVAILABLE

HIGH = "high"
MEDIUM = "medium"
LOW = "low"

# order_count fallback marker used by the frontend ("订单量（估算）").
ORDER_COUNT_APPROX_FLAG = "order_count_approximation"


def _resolve_mapping(schema_mapping: dict | None) -> dict[str, str]:
    """Map canonical_key -> source_column for available mappings (first hit)."""
    result: dict[str, str] = {}
    if not schema_mapping or not isinstance(schema_mapping, dict):
        return result
    for m in schema_mapping.get("mappings") or []:
        if not isinstance(m, dict):
            continue
        if m.get("availability") != AVAILABLE or not m.get("source_column"):
            continue
        key = m.get("canonical_key")
        if key and key not in result:
            result[key] = str(m["source_column"])
    return result


def _col_index(headers: list[str], name: str | None) -> int | None:
    if not name:
        return None
    try:
        return headers.index(name)
    except ValueError:
        return None


def _num_values(rows: list[list], idx: int | None) -> list[tuple[int, float]]:
    """Return [(row_index, float_value)] for numeric cells in one column."""
    out: list[tuple[int, float]] = []
    for i, row in enumerate(rows):
        if idx is None or idx >= len(row):
            continue
        v = row[idx]
        if isinstance(v, bool):
            continue
        if isinstance(v, (int, float)):
            out.append((i, float(v)))
    return out


def _row_dict(rows: list[list], headers: list[str], row_index: int) -> dict[str, Any]:
    """Snapshot one row as {header: value} for evidence display."""
    row = rows[row_index]
    return {headers[j]: _json_safe(row[j]) for j in range(len(headers)) if j < len(row)}


def _top_rows(rows: list[list], headers: list[str], idx: int, limit: int = 5) -> list[dict]:
    """Largest-value rows as evidence snapshots."""
    scored = _num_values(rows, idx)
    scored.sort(key=lambda item: item[1], reverse=True)
    return [
        {"index": i + 1, "values": _row_dict(rows, headers, i)}
        for i, _ in scored[:limit]
    ]


def _parse_month(value: Any) -> str | None:
    """Normalize a date-ish cell to 'YYYY-MM'."""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m")
    if isinstance(value, date):
        return value.strftime("%Y-%m")
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        m = re.search(r"(\d{4})[年./-](\d{1,2})[月./-]?", s)
        if m:
            return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}"
        for fmt in ("%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d", "%Y/%m/%d"):
            try:
                return datetime.strptime(s[:10], fmt).strftime("%Y-%m")
            except ValueError:
                continue
    return None


def _metric(
    name: str,
    value: Any,
    formula: str,
    source_columns: list[str],
    availability: str,
    confidence: str,
    evidence_rows: list[dict] | None = None,
    assumptions: list[str] | None = None,
    note: str = "",
) -> dict[str, Any]:
    return {
        "metric_name": name,
        "value": value,
        "formula": formula,
        "source_columns": source_columns,
        "evidence_rows": evidence_rows or [],
        "availability": availability,
        "confidence": confidence,
        "assumptions": assumptions or [],
        "note": note,
    }


def _unavailable(name: str, formula: str, source_columns: list[str], note: str) -> dict[str, Any]:
    return _metric(
        name=name,
        value=None,
        formula=formula,
        source_columns=source_columns,
        availability=UNAVAILABLE,
        confidence=LOW,
        note=note,
    )


def compute_metrics(dataset: dict[str, Any], schema_mapping: dict | None = None) -> list[dict[str, Any]]:
    """Compute the v1 sales metrics for a canonical dataset.

    dataset: extract_canonical_dataset output (headers / column_types / rows).
    schema_mapping: persisted mapping dict or None (falls back to available fields only).
    """
    headers: list[str] = dataset.get("headers") or []
    rows: list[list] = dataset.get("rows") or []
    mapping = _resolve_mapping(schema_mapping)

    def col(canonical_key: str) -> int | None:
        return _col_index(headers, mapping.get(canonical_key))

    metrics: list[dict[str, Any]] = []
    source_cols: dict[str, list[str]] = {}

    # ---- Dataset (always available) ----
    metrics.append(
        _metric(
            name="row_count",
            value=len(rows),
            formula="COUNT(rows)",
            source_columns=[],
            availability=AVAILABLE,
            confidence=HIGH,
        )
    )

    # ---- Revenue: total_sales ----
    amount_idx = col("sales_amount")
    amount_values = _num_values(rows, amount_idx)
    if amount_idx is None or not amount_values:
        metrics.append(_unavailable("total_sales", "SUM(sales_amount)", ["sales_amount"], "missing field: sales_amount"))
    else:
        total_sales = sum(v for _, v in amount_values)
        metrics.append(
            _metric(
                name="total_sales",
                value=round(total_sales, 2),
                formula="SUM(sales_amount)",
                source_columns=[mapping.get("sales_amount", "sales_amount")],
                availability=AVAILABLE,
                confidence=HIGH,
                evidence_rows=_top_rows(rows, headers, amount_idx),
            )
        )

    # ---- Dataset: date_range ----
    date_idx = col("order_date")
    months = [m for v in _values(rows, date_idx) if (m := _parse_month(v))]
    if date_idx is None or not months:
        metrics.append(_unavailable("date_range", "MIN/MAX(order_date)", ["order_date"], "missing field: order_date"))
    else:
        metrics.append(
            _metric(
                name="date_range",
                value={"min": min(months), "max": max(months)},
                formula="MIN(order_date) .. MAX(order_date)",
                source_columns=[mapping.get("order_date", "order_date")],
                availability=AVAILABLE,
                confidence=HIGH,
                evidence_rows=[],
            )
        )

    # ---- Revenue: sales_growth (needs >= 2 distinct months) ----
    month_totals: Counter[str] = Counter()
    if amount_idx is not None and date_idx is not None:
        for i, row in enumerate(rows):
            if date_idx >= len(row) or amount_idx >= len(row):
                continue
            month = _parse_month(row[date_idx])
            v = row[amount_idx]
            if month and isinstance(v, (int, float)) and not isinstance(v, bool):
                month_totals[month] += float(v)
    sorted_months = sorted(month_totals)
    if len(sorted_months) >= 2:
        last_month = sorted_months[-1]
        prev_month = sorted_months[-2]
        prev_total = month_totals[prev_month]
        growth = None if prev_total == 0 else (month_totals[last_month] / prev_total - 1)
        metrics.append(
            _metric(
                name="sales_growth",
                value=None if growth is None else round(growth, 4),
                formula="last_month_total / prev_month_total - 1",
                source_columns=[mapping.get("sales_amount", "sales_amount"), mapping.get("order_date", "order_date")],
                availability=AVAILABLE if growth is not None else UNAVAILABLE,
                confidence=HIGH if growth is not None else MEDIUM,
                evidence_rows=[
                    {"month": month, "total": round(month_totals[month], 2)}
                    for month in sorted_months[-6:]
                ],
                note="" if growth is not None else "previous month total is zero",
            )
        )
    else:
        metrics.append(
            _unavailable(
                "sales_growth",
                "last_month_total / prev_month_total - 1",
                ["sales_amount", "order_date"],
                "need at least 2 distinct months" if date_idx is not None else "missing field: order_date",
            )
        )

    # ---- Order: order_count ----
    order_idx = col("order_id")
    if order_idx is not None:
        order_ids = {row[order_idx] for row in rows if order_idx < len(row) and row[order_idx] not in ("", None)}
        metrics.append(
            _metric(
                name="order_count",
                value=len(order_ids),
                formula="COUNT(DISTINCT order_id)",
                source_columns=[mapping.get("order_id", "order_id")],
                availability=AVAILABLE,
                confidence=HIGH,
            )
        )
    elif amount_idx is not None or col("sales_quantity") is not None:
        metrics.append(
            _metric(
                name="order_count",
                value=len(rows),
                formula="row_count approximation",
                source_columns=[],
                availability=AVAILABLE,
                confidence=MEDIUM,
                assumptions=["1 row approximately equals 1 order"],
                note="order_id field missing; approximated from row count",
            )
        )
    else:
        metrics.append(_unavailable("order_count", "COUNT(DISTINCT order_id)", ["order_id"], "missing core sales fields"))

    # ---- Order: average_order_value ----
    total_sales_metric = next((m for m in metrics if m["metric_name"] == "total_sales"), None)
    order_count_metric = next((m for m in metrics if m["metric_name"] == "order_count"), None)
    if (
        total_sales_metric is not None and total_sales_metric["availability"] == AVAILABLE
        and order_count_metric is not None and order_count_metric["availability"] == AVAILABLE
        and order_count_metric["value"]
    ):
        aov = total_sales_metric["value"] / order_count_metric["value"]
        metrics.append(
            _metric(
                name="average_order_value",
                value=round(aov, 2),
                formula="total_sales / order_count",
                source_columns=total_sales_metric["source_columns"] + order_count_metric["source_columns"],
                availability=AVAILABLE,
                confidence=HIGH if order_count_metric["confidence"] == HIGH else MEDIUM,
                assumptions=list(order_count_metric["assumptions"]),
            )
        )
    else:
        metrics.append(
            _unavailable(
                "average_order_value",
                "total_sales / order_count",
                ["sales_amount", "order_id"],
                "total_sales or order_count unavailable",
            )
        )

    # ---- Customer: customer_count ----
    customer_idx = col("customer_name")
    if customer_idx is None:
        metrics.append(_unavailable("customer_count", "COUNT(DISTINCT customer_name)", ["customer_name"], "missing field: customer_name"))
    else:
        customer_ids = {row[customer_idx] for row in rows if customer_idx < len(row) and row[customer_idx] not in ("", None)}
        metrics.append(
            _metric(
                name="customer_count",
                value=len(customer_ids),
                formula="COUNT(DISTINCT customer_name)",
                source_columns=[mapping.get("customer_name", "customer_name")],
                availability=AVAILABLE,
                confidence=HIGH,
            )
        )

    # ---- Customer: customer_concentration (Top1 + Top5) ----
    if customer_idx is None or amount_idx is None or not amount_values:
        metrics.append(
            _unavailable(
                "customer_concentration",
                "Top1/Top5 customer sales / total_sales",
                ["customer_name", "sales_amount"],
                "missing field: customer_name or sales_amount",
            )
        )
    else:
        customer_totals: Counter[str] = Counter()
        for i, row in enumerate(rows):
            if customer_idx >= len(row) or amount_idx >= len(row):
                continue
            name = row[customer_idx]
            v = row[amount_idx]
            if name not in ("", None) and isinstance(v, (int, float)) and not isinstance(v, bool):
                customer_totals[str(name)] += float(v)
        total_all = sum(customer_totals.values())
        if total_all <= 0:
            metrics.append(_unavailable("customer_concentration", "Top1/Top5 customer sales / total_sales", ["customer_name", "sales_amount"], "no positive sales per customer"))
        else:
            ranked = customer_totals.most_common()
            top1_ratio = ranked[0][1] / total_all if ranked else 0.0
            top5_ratio = sum(v for _, v in ranked[:5]) / total_all if ranked else 0.0
            top_customers = [
                {"rank": i + 1, "customer": name, "sales": round(v, 2), "share": round(v / total_all, 4)}
                for i, (name, v) in enumerate(ranked[:5])
            ]
            metrics.append(
                _metric(
                    name="customer_concentration",
                    value=round(top1_ratio, 4),
                    formula="Top1/Top5 customer sales / total_sales",
                    source_columns=[mapping.get("customer_name", "customer_name"), mapping.get("sales_amount", "sales_amount")],
                    availability=AVAILABLE,
                    confidence=HIGH,
                    evidence_rows=top_customers,
                )
            )

    # ---- Product: product_sales_rank ----
    product_idx = col("product_name")
    if product_idx is None or amount_idx is None or not amount_values:
        metrics.append(
            _unavailable(
                "product_sales_rank",
                "group by product_name, order by SUM(sales_amount) desc",
                ["product_name", "sales_amount"],
                "missing field: product_name or sales_amount",
            )
        )
    else:
        product_totals: Counter[str] = Counter()
        for i, row in enumerate(rows):
            if product_idx >= len(row) or amount_idx >= len(row):
                continue
            name = row[product_idx]
            v = row[amount_idx]
            if name not in ("", None) and isinstance(v, (int, float)) and not isinstance(v, bool):
                product_totals[str(name)] += float(v)
        ranked_products = product_totals.most_common()
        total_all = sum(product_totals.values())
        if not ranked_products:
            metrics.append(_unavailable("product_sales_rank", "group by product_name ...", ["product_name", "sales_amount"], "no product rows"))
        else:
            top_products = [
                {"rank": i + 1, "product": name, "sales": round(v, 2), "share": round(v / total_all, 4) if total_all else 0}
                for i, (name, v) in enumerate(ranked_products[:5])
            ]
            metrics.append(
                _metric(
                    name="product_sales_rank",
                    value=ranked_products[0][0],
                    formula="group by product_name, order by SUM(sales_amount) desc",
                    source_columns=[mapping.get("product_name", "product_name"), mapping.get("sales_amount", "sales_amount")],
                    availability=AVAILABLE,
                    confidence=HIGH,
                    evidence_rows=top_products,
                )
            )

    return metrics


def _values(rows: list[list], idx: int | None) -> list[Any]:
    if idx is None:
        return []
    return [row[idx] for row in rows if idx < len(row)]


def metric_map(metrics: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {m["metric_name"]: m for m in metrics}
