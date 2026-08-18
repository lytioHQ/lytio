"""Canonical Sales Schema v1 — the field standard layer.

Maps arbitrary Excel headers to a canonical vocabulary so downstream engines
(metric engine, health score, schema mapping UI) can consume fields by
semantics instead of guessing from raw header text.

This module is pure data + normalization logic. It performs no I/O and no AI.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Common prefixes stripped before synonym matching (conservative: only used
# when the stripped form is an exact synonym).
COMMON_PREFIXES = ("本月", "当月", "上月", "实际", "年度", "季度", "总", "全部")

# Unit suffixes removed from headers before matching (e.g. "销售额（元）").
_UNIT_SUFFIXES = ("元", "￥", "$", "¥", "rmb", "usd", "cny")

# Fallback heuristics for numeric/date columns with unknown names.
_AMOUNT_SUFFIXES = ("额", "金额", "收入", "营收", "价", "款")
_QUANTITY_SUFFIXES = ("量", "数", "件")
_DATE_HINTS = ("日期", "时间", "date", "day")


@dataclass(frozen=True)
class CanonicalField:
    """One canonical sales field and its human aliases."""

    key: str
    value_type: str  # number | text | date
    display_name_zh: str
    display_name_en: str
    display_name_ja: str
    display_name_de: str
    required: bool = False
    synonyms: tuple[str, ...] = ()

    def normalized_synonyms(self) -> tuple[str, ...]:
        return tuple(normalize_header(s) for s in self.synonyms)


CANONICAL_FIELDS: list[CanonicalField] = [
    CanonicalField(
        key="order_date",
        value_type="date",
        display_name_zh="成交日期",
        display_name_en="Order Date",
        display_name_ja="成約日",
        display_name_de="Auftragsdatum",
        synonyms=("成交日期", "签约日期", "日期", "下单日期", "成交时间", "date", "order_date"),
    ),
    CanonicalField(
        key="sales_amount",
        value_type="number",
        display_name_zh="销售额",
        display_name_en="Sales Amount",
        display_name_ja="売上額",
        display_name_de="Umsatz",
        required=True,
        synonyms=(
            "销售额", "销售金额", "成交金额", "合同金额", "营收", "收入", "金额",
            "revenue", "sales_amount", "amount", "sales", "sales_revenue",
        ),
    ),
    CanonicalField(
        key="sales_quantity",
        value_type="number",
        display_name_zh="数量",
        display_name_en="Quantity",
        display_name_ja="数量",
        display_name_de="Menge",
        required=True,
        synonyms=("数量", "成交数量", "销量", "件数", "quantity", "qty", "count"),
    ),
    CanonicalField(
        key="product_name",
        value_type="text",
        display_name_zh="产品",
        display_name_en="Product",
        display_name_ja="製品",
        display_name_de="Produkt",
        synonyms=("产品", "产品名称", "商品", "品名", "product", "item", "product_name"),
    ),
    CanonicalField(
        key="region",
        value_type="text",
        display_name_zh="区域",
        display_name_en="Region",
        display_name_ja="地域",
        display_name_de="Region",
        synonyms=("区域", "地区", "渠道", "渠道名称", "region", "area", "channel"),
    ),
    CanonicalField(
        key="customer_name",
        value_type="text",
        display_name_zh="客户",
        display_name_en="Customer",
        display_name_ja="顧客",
        display_name_de="Kunde",
        synonyms=("客户", "客户名称", "客户名", "公司名称", "customer", "account", "customer_name"),
    ),
    CanonicalField(
        key="sales_person",
        value_type="text",
        display_name_zh="销售人员",
        display_name_en="Sales Person",
        display_name_ja="営業担当",
        display_name_de="Vertrieb",
        synonyms=("销售人员", "销售员", "业务员", "负责人", "salesperson", "sales_rep", "sales_person"),
    ),
    CanonicalField(
        key="pipeline_stage",
        value_type="text",
        display_name_zh="销售阶段",
        display_name_en="Pipeline Stage",
        display_name_ja="商談ステージ",
        display_name_de="Pipeline-Stufe",
        synonyms=("销售阶段", "商机阶段", "阶段", "stage", "pipeline_stage"),
    ),
    CanonicalField(
        key="lost_reason",
        value_type="text",
        display_name_zh="输单原因",
        display_name_en="Lost Reason",
        display_name_ja="失注理由",
        display_name_de="Verlustgrund",
        synonyms=("输单原因", "丢单原因", "失败原因", "未成交原因", "lost_reason"),
    ),
    CanonicalField(
        key="discount_rate",
        value_type="number",
        display_name_zh="折扣率",
        display_name_en="Discount Rate",
        display_name_ja="割引率",
        display_name_de="Rabattsatz",
        synonyms=("折扣", "折扣率", "discount", "discount_rate"),
    ),
    CanonicalField(
        key="profit_amount",
        value_type="number",
        display_name_zh="利润",
        display_name_en="Profit",
        display_name_ja="利益",
        display_name_de="Gewinn",
        synonyms=("利润", "毛利", "净利润", "profit", "gross_profit", "profit_amount"),
    ),
]

CANONICAL_BY_KEY: dict[str, CanonicalField] = {f.key: f for f in CANONICAL_FIELDS}


def normalize_header(raw: str) -> str:
    """Normalize a header for synonym matching.

    - lowercase
    - drop parenthetical content (e.g. 销售额（元） -> 销售额)
    - strip unit suffixes (元 / ￥ / $ / ¥ ...)
    - remove whitespace and separators
    """
    s = (raw or "").strip().lower()
    s = re.sub(r"[（(].*?[)）]", "", s)
    for suffix in _UNIT_SUFFIXES:
        if s.endswith(suffix):
            s = s[: -len(suffix)]
    s = re.sub(r"[\s\-_/·：:，,、]+", "", s)
    return s


def is_canonical_key(value: str) -> bool:
    return value in CANONICAL_BY_KEY


def canonical_display_name(field_key: str, lang: str = "zh") -> str:
    """Return the display name for a canonical key in the requested language."""
    field = CANONICAL_BY_KEY.get(field_key)
    if field is None:
        return field_key
    return {
        "zh": field.display_name_zh,
        "en": field.display_name_en,
        "ja": field.display_name_ja,
        "de": field.display_name_de,
    }.get(lang, field.display_name_zh)
