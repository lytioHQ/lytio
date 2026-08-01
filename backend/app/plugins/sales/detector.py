"""Verify whether a dataset is suitable for Sales Analysis."""

from dataclasses import dataclass


@dataclass
class DetectionResult:
    supported: bool
    confidence: float  # 0.0 - 1.0
    reason: str


SALES_KEYWORDS = {
    "销售额", "销售收入", "营收", "revenue", "sales",
    "销量", "订单", "order", "金额", "amount",
    "利润", "profit", "成本", "cost", "产品", "product",
    "客户", "customer", "渠道", "channel", "区域", "region",
}


def detect(headers: list[str], column_types: dict[str, str]) -> DetectionResult:
    """Check if a dataset is suitable for sales analysis."""
    numeric_cols = [h for h in headers if column_types.get(h) == "number"]
    text_cols = [h for h in headers if column_types.get(h) == "text"]

    if not headers:
        return DetectionResult(False, 0.0, "Dataset has no headers")

    if len(numeric_cols) == 0:
        return DetectionResult(False, 0.0, "No numeric columns found — sales data requires numbers")

    # Check keyword match
    matched = {h for h in headers if _matches_sales(h)}
    if matched:
        return DetectionResult(
            True,
            min(0.9, 0.5 + 0.1 * len(matched)),
            f"Found sales-related columns: {', '.join(list(matched)[:5])}",
        )

    # Generic fallback: has numbers + text = probably analyzable
    if len(text_cols) >= 1 and len(numeric_cols) >= 2:
        return DetectionResult(
            True,
            0.5,
            "Generic tabular data with numeric columns — will attempt analysis",
        )

    return DetectionResult(
        False,
        0.2,
        "Cannot confirm this is sales data. Need at least 2 numeric columns and 1 text column.",
    )


def _matches_sales(header: str) -> bool:
    lower = header.lower()
    for kw in SALES_KEYWORDS:
        if kw in lower:
            return True
    return False
