"""M2.14.5 Phase 1.1 report completeness hardening.

Turns a possibly sparse AI analysis into a complete customer report by
merging code-computed evidence, then enforces a minimum content contract
(health / metrics / insights / risks / recommendations). Pure code, no AI.

The fallback never fabricates business numbers: it only repeats values the
metric engine already computed and marks its provenance as code_fallback.
"""

from __future__ import annotations

from typing import Any

MIN_METRICS = 3
MIN_INSIGHTS = 3
MIN_RISKS = 2
MIN_RECOMMENDATIONS = 3

_FALLBACK_METRIC_LABELS: dict[str, dict[str, str]] = {
    "zh": {
        "total_sales": "销售额",
        "order_count": "订单量",
        "average_order_value": "平均客单价",
        "customer_count": "客户数",
        "customer_concentration": "客户集中度",
        "sales_growth": "销售增长率",
        "date_range": "数据周期",
        "product_sales_rank": "畅销产品",
        "row_count": "数据行数",
    },
    "en": {
        "total_sales": "Total Sales",
        "order_count": "Orders",
        "average_order_value": "Average Order Value",
        "customer_count": "Customers",
        "customer_concentration": "Customer Concentration",
        "sales_growth": "Sales Growth",
        "date_range": "Data Period",
        "product_sales_rank": "Top Product",
        "row_count": "Data Rows",
    },
    "ja": {
        "total_sales": "売上高",
        "order_count": "注文数",
        "average_order_value": "平均注文単価",
        "customer_count": "顧客数",
        "customer_concentration": "顧客集中度",
        "sales_growth": "売上成長率",
        "date_range": "データ期間",
        "product_sales_rank": "売れ筋商品",
        "row_count": "データ行数",
    },
    "de": {
        "total_sales": "Umsatz",
        "order_count": "Bestellungen",
        "average_order_value": "Durchschnittlicher Bestellwert",
        "customer_count": "Kunden",
        "customer_concentration": "Kundenkonzentration",
        "sales_growth": "Umsatzwachstum",
        "date_range": "Datenzeitraum",
        "product_sales_rank": "Top-Produkt",
        "row_count": "Datenzeilen",
    },
}

_FALLBACK_RISK_COPY: dict[str, dict[str, str]] = {
    "zh": {
        "amount_missing": "销售金额数据缺失",
        "amount_missing_desc": "当前数据中缺少可计算的销售金额字段，部分经营指标无法完整判断。",
        "concentration": "客户集中度较高",
        "concentration_desc": "头部客户占销售额比例较高，经营结果对少数客户依赖较大。",
        "decline": "销售额环比下降",
        "decline_desc": "最近周期销售额较上一周期出现下降，需要关注增长动能。",
        "estimate": "订单量按行数估算",
        "estimate_desc": "数据中没有订单编号字段，订单量由数据行数近似估算。",
    },
    "en": {
        "amount_missing": "Sales amount data is missing",
        "amount_missing_desc": "The current dataset has no computable sales amount field, so some business metrics cannot be fully assessed.",
        "concentration": "Customer concentration is high",
        "concentration_desc": "Top customers account for a large share of sales, so results depend heavily on a few customers.",
        "decline": "Sales declined versus the prior period",
        "decline_desc": "Sales in the latest period decreased versus the previous period; growth momentum needs attention.",
        "estimate": "Order count is estimated from rows",
        "estimate_desc": "No order ID field exists, so order count is approximated from the number of data rows.",
    },
    "ja": {
        "amount_missing": "売上金額データが不足",
        "amount_missing_desc": "現在のデータには計算可能な売上金額フィールドがなく、一部の経営指標を完全に評価できません。",
        "concentration": "顧客集中度が高い",
        "concentration_desc": "主要顧客が売上の大きな割合を占めており、少数顧客への依存が高い状態です。",
        "decline": "売上が前期比で減少",
        "decline_desc": "直近期間の売上が前期より減少しており、成長の勢いを注視する必要があります。",
        "estimate": "注文数は行数から推定",
        "estimate_desc": "注文IDフィールドがないため、注文数はデータ行数から近似推定しています。",
    },
    "de": {
        "amount_missing": "Umsatzdaten fehlen",
        "amount_missing_desc": "Im aktuellen Datensatz fehlt ein berechenbares Umsatzfeld; einige Kennzahlen können nicht vollständig bewertet werden.",
        "concentration": "Hohe Kundenkonzentration",
        "concentration_desc": "Wenige Top-Kunden tragen einen großen Teil des Umsatzes; das Ergebnis hängt stark von einzelnen Kunden ab.",
        "decline": "Umsatz gegenüber Vorperiode gesunken",
        "decline_desc": "Der Umsatz der letzten Periode ist gegenüber der Vorperiode gesunken; die Wachstumsdynamik sollte beobachtet werden.",
        "estimate": "Bestellanzahl aus Zeilen geschätzt",
        "estimate_desc": "Es gibt kein Auftrags-ID-Feld; die Bestellanzahl wird anhand der Datenzeilen näherungsweise geschätzt.",
    },
}

_FALLBACK_RECOMMENDATION_COPY: dict[str, dict[str, str]] = {
    "zh": {
        "amount": "补充销售金额字段",
        "amount_desc": "在后续 Excel 中加入可识别的销售金额列，解锁更完整的经营指标。",
        "customer": "优化客户结构",
        "customer_desc": "关注头部客户占比，拓展新客户并分散大客户集中风险。",
        "growth": "稳定销售额增长",
        "growth_desc": "复盘最近周期下滑原因，聚焦重点产品和渠道，制定回升措施。",
        "order_id": "补充订单编号字段",
        "order_id_desc": "加入订单编号列后，订单量可按去重订单精确计算。",
        "track": "持续追踪经营指标",
        "track_desc": "定期上传新周期数据，通过改善验证报告跟踪各项行动的执行效果。",
    },
    "en": {
        "amount": "Add a sales amount field",
        "amount_desc": "Include a recognizable sales amount column in future spreadsheets to unlock more complete business metrics.",
        "customer": "Diversify the customer base",
        "customer_desc": "Watch the top-customer share, expand new customers and reduce concentration risk.",
        "growth": "Stabilize sales growth",
        "growth_desc": "Review the reasons for the latest decline and focus on key products and channels to recover momentum.",
        "order_id": "Add an order ID field",
        "order_id_desc": "With an order ID column, order count can be calculated from deduplicated orders.",
        "track": "Track metrics continuously",
        "track_desc": "Upload new-period data regularly and use improvement verification reports to follow up on actions.",
    },
    "ja": {
        "amount": "売上金額フィールドの追加",
        "amount_desc": "今後の Excel に認識可能な売上金額列を追加すると、より完全な経営指標が得られます。",
        "customer": "顧客基盤の分散",
        "customer_desc": "主要顧客の割合を注視し、新規顧客を開拓して集中リスクを低減します。",
        "growth": "売上成長の安定化",
        "growth_desc": "直近の減少要因を振り返り、重点商品とチャネルに注力して回復を図ります。",
        "order_id": "注文IDフィールドの追加",
        "order_id_desc": "注文ID列を追加すると、重複を除いた正確な注文数が計算できます。",
        "track": "経営指標の継続追跡",
        "track_desc": "新しい期間のデータを定期的にアップロードし、改善検証レポートで施策の効果を追跡します。",
    },
    "de": {
        "amount": "Umsatzfeld ergänzen",
        "amount_desc": "Fügen Sie in künftigen Tabellen eine erkennbare Umsatzspalte hinzu, um vollständigere Kennzahlen zu erhalten.",
        "customer": "Kundenbasis diversifizieren",
        "customer_desc": "Beobachten Sie den Top-Kunden-Anteil, gewinnen Sie neue Kunden und reduzieren Sie Konzentrationsrisiken.",
        "growth": "Umsatzwachstum stabilisieren",
        "growth_desc": "Analysieren Sie die Ursachen des Rückgangs und fokussieren Sie Schlüsselprodukte und -kanäle.",
        "order_id": "Auftrags-ID-Feld ergänzen",
        "order_id_desc": "Mit einer Auftrags-ID-Spalte kann die Bestellanzahl eindeutig berechnet werden.",
        "track": "Kennzahlen kontinuierlich verfolgen",
        "track_desc": "Laden Sie regelmäßig neue Perioden hoch und verfolgen Sie Maßnahmen über Verbesserungsverifikationsberichte.",
    },
}

_FALLBACK_INSIGHT_TEMPLATES: dict[str, dict[str, str]] = {
    "zh": {
        "sales": "销售额达到 {value}",
        "sales_desc": "系统根据上传数据计算得出，当前周期销售额为 {value}。",
        "orders": "订单量 {value}",
        "orders_desc": "当前数据共产生 {value} 笔订单（按可识别订单口径）。",
        "aov": "平均客单价 {value}",
        "aov_desc": "当前周期平均客单价为 {value}。",
        "customers": "客户数 {value}",
        "customers_desc": "当前数据中共识别到 {value} 个客户。",
        "growth": "销售增长率 {value}",
        "growth_desc": "最近周期销售额环比变化为 {value}。",
    },
    "en": {
        "sales": "Total sales reached {value}",
        "sales_desc": "Based on the uploaded data, total sales for the period is {value}.",
        "orders": "Order count {value}",
        "orders_desc": "The dataset contains {value} orders (using the recognized order definition).",
        "aov": "Average order value {value}",
        "aov_desc": "The average order value for the period is {value}.",
        "customers": "Customer count {value}",
        "customers_desc": "The dataset contains {value} customers.",
        "growth": "Sales growth {value}",
        "growth_desc": "Latest-period sales changed by {value} versus the previous period.",
    },
    "ja": {
        "sales": "売上高は {value}",
        "sales_desc": "アップロードされたデータから計算された当期の売上高は {value} です。",
        "orders": "注文数 {value}",
        "orders_desc": "現在のデータには {value} 件の注文があります（認識された注文口径）。",
        "aov": "平均注文単価 {value}",
        "aov_desc": "当期の平均注文単価は {value} です。",
        "customers": "顧客数 {value}",
        "customers_desc": "現在のデータには {value} 社の顧客が識別されています。",
        "growth": "売上成長率 {value}",
        "growth_desc": "直近期間の売上は前期比 {value} となりました。",
    },
    "de": {
        "sales": "Umsatz erreichte {value}",
        "sales_desc": "Berechnet aus den hochgeladenen Daten beträgt der Umsatz der Periode {value}.",
        "orders": "Bestellanzahl {value}",
        "orders_desc": "Der Datensatz enthält {value} Bestellungen (gemäß erkannter Bestelldefinition).",
        "aov": "Durchschnittlicher Bestellwert {value}",
        "aov_desc": "Der durchschnittliche Bestellwert der Periode beträgt {value}.",
        "customers": "Kundenanzahl {value}",
        "customers_desc": "Der Datensatz enthält {value} Kunden.",
        "growth": "Umsatzwachstum {value}",
        "growth_desc": "Der Umsatz der letzten Periode veränderte sich gegenüber der Vorperiode um {value}.",
    },
}

_METRIC_ORDER = (
    "total_sales",
    "order_count",
    "average_order_value",
    "customer_count",
    "customer_concentration",
    "sales_growth",
)


def _lang(language: str) -> str:
    return language if language in _FALLBACK_METRIC_LABELS else "en"


def _fmt(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:,.2f}"
    return str(value)


def _metric_value_text(metric: dict[str, Any], lang: str) -> str:
    name = metric.get("metric_name")
    value = metric.get("value")
    if name in ("customer_concentration", "sales_growth") and isinstance(value, (int, float)):
        return f"{float(value) * 100:.1f}%"
    if name == "date_range" and isinstance(value, dict):
        return f"{value.get('min', '')} ~ {value.get('max', '')}"
    return _fmt(value)


def _metric_label(name: str, lang: str) -> str:
    return _FALLBACK_METRIC_LABELS.get(lang, {}).get(name, name)


def _available(metric: dict[str, Any] | None) -> bool:
    if not metric:
        return False
    return metric.get("availability") == "available" and metric.get("value") is not None


def build_metric_fallback(
    computed_metrics: list[dict[str, Any]] | None, language: str = "zh"
) -> list[dict[str, Any]]:
    """Convert code-computed metrics into the AI Metric display shape."""
    lang = _lang(language)
    by_name = {m.get("metric_name"): m for m in (computed_metrics or [])}
    out: list[dict[str, Any]] = []
    for name in _METRIC_ORDER:
        m = by_name.get(name)
        if not _available(m):
            continue
        out.append(
            {
                "name": _metric_label(name, lang),
                "value": _metric_value_text(m, lang),
                "trend": "stable",
                "provenance": "code_fallback",
            }
        )
    return out


def build_insight_fallback(
    computed_metrics: list[dict[str, Any]] | None, language: str = "zh"
) -> list[dict[str, Any]]:
    lang = _lang(language)
    by_name = {m.get("metric_name"): m for m in (computed_metrics or [])}
    templates = _FALLBACK_INSIGHT_TEMPLATES[lang]
    out: list[dict[str, Any]] = []
    mapping = (
        ("total_sales", "sales", "sales_desc"),
        ("order_count", "orders", "orders_desc"),
        ("average_order_value", "aov", "aov_desc"),
        ("customer_count", "customers", "customers_desc"),
        ("sales_growth", "growth", "growth_desc"),
    )
    for metric_name, key, desc_key in mapping:
        m = by_name.get(metric_name)
        if not _available(m):
            continue
        value = _metric_value_text(m, lang)
        out.append(
            {
                "title": templates[key].replace("{value}", value),
                "description": templates[desc_key].replace("{value}", value),
                "confidence": "high",
                "provenance": "code_fallback",
            }
        )
    return out


def build_risk_fallback(
    computed_metrics: list[dict[str, Any]] | None, language: str = "zh"
) -> list[dict[str, Any]]:
    lang = _lang(language)
    copy = _FALLBACK_RISK_COPY[lang]
    by_name = {m.get("metric_name"): m for m in (computed_metrics or [])}
    out: list[dict[str, Any]] = []

    total = by_name.get("total_sales")
    if not _available(total):
        out.append(
            {
                "title": copy["amount_missing"],
                "description": copy["amount_missing_desc"],
                "severity": "high",
                "provenance": "code_fallback",
            }
        )

    conc = by_name.get("customer_concentration")
    if _available(conc) and isinstance(conc.get("value"), (int, float)) and float(conc["value"]) > 0.5:
        out.append(
            {
                "title": copy["concentration"],
                "description": copy["concentration_desc"],
                "severity": "medium",
                "provenance": "code_fallback",
            }
        )

    growth = by_name.get("sales_growth")
    if _available(growth) and isinstance(growth.get("value"), (int, float)) and float(growth["value"]) < 0:
        out.append(
            {
                "title": copy["decline"],
                "description": copy["decline_desc"],
                "severity": "medium",
                "provenance": "code_fallback",
            }
        )

    orders = by_name.get("order_count")
    if _available(orders) and orders.get("assumptions"):
        out.append(
            {
                "title": copy["estimate"],
                "description": copy["estimate_desc"],
                "severity": "low",
                "provenance": "code_fallback",
            }
        )

    return out


def build_recommendation_fallback(
    computed_metrics: list[dict[str, Any]] | None,
    language: str = "zh",
    risks: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    lang = _lang(language)
    copy = _FALLBACK_RECOMMENDATION_COPY[lang]
    by_name = {m.get("metric_name"): m for m in (computed_metrics or [])}
    out: list[dict[str, Any]] = []
    risk_titles = {r.get("title") for r in (risks or [])}

    if "销售金额数据缺失" in risk_titles or "Sales amount data is missing" in risk_titles:
        out.append({"title": copy["amount"], "description": copy["amount_desc"], "priority": "high", "provenance": "code_fallback"})
    if "客户集中度较高" in risk_titles or "Customer concentration is high" in risk_titles:
        out.append({"title": copy["customer"], "description": copy["customer_desc"], "priority": "medium", "provenance": "code_fallback"})
    if "销售额环比下降" in risk_titles or "Sales declined versus the prior period" in risk_titles:
        out.append({"title": copy["growth"], "description": copy["growth_desc"], "priority": "high", "provenance": "code_fallback"})
    orders = by_name.get("order_count")
    if _available(orders) and orders.get("assumptions"):
        out.append({"title": copy["order_id"], "description": copy["order_id_desc"], "priority": "low", "provenance": "code_fallback"})
    if len(out) < MIN_RECOMMENDATIONS:
        track = {"title": copy["track"], "description": copy["track_desc"], "priority": "medium", "provenance": "code_fallback"}
        if track["title"] not in {r.get("title") for r in out}:
            out.append(track)
    return out


def _health_from_code(health_score: dict[str, Any] | None, language: str = "zh") -> dict[str, Any] | None:
    if not health_score or not isinstance(health_score, dict):
        return None
    score = health_score.get("health_score")
    level = health_score.get("health_level")
    if score is None or level is None:
        return None
    lang = _lang(language)
    summary = {
        "zh": f"系统根据代码计算的 {score} 分健康评分。",
        "en": f"System-computed health score: {score}.",
        "ja": f"システムが計算した健全性スコア: {score}。",
        "de": f"Systemberechneter Gesundheitswert: {score}.",
    }[lang]
    return {"score": int(score), "level": str(level), "summary": summary, "provenance": "code_fallback"}


def ensure_complete(
    data: dict[str, Any],
    computed_metrics: list[dict[str, Any]] | None = None,
    health_score: dict[str, Any] | None = None,
    language: str = "zh",
) -> dict[str, Any]:
    """Merge code-computed evidence into a sparse AI result (pure code)."""
    data = dict(data or {})
    lang = _lang(language)

    if not data.get("business_health"):
        fallback_health = _health_from_code(health_score, lang)
        if fallback_health:
            data["business_health"] = fallback_health

    metrics = [m for m in (data.get("metrics") or []) if isinstance(m, dict)]
    if len(metrics) < MIN_METRICS:
        fallback_metrics = build_metric_fallback(computed_metrics, lang)
        seen = {m.get("name") for m in metrics}
        for m in fallback_metrics:
            if m.get("name") in seen:
                continue
            metrics.append(m)
            seen.add(m.get("name"))
        data["metrics"] = metrics[:20]

    insights = [i for i in (data.get("insights") or []) if isinstance(i, dict) and i.get("title")]
    if len(insights) < MIN_INSIGHTS:
        fallback_insights = build_insight_fallback(computed_metrics, lang)
        seen_titles = {i.get("title") for i in insights}
        for i in fallback_insights:
            if i.get("title") in seen_titles:
                continue
            insights.append(i)
            seen_titles.add(i.get("title"))
        data["insights"] = insights[:15]

    risks = [r for r in (data.get("risks") or []) if isinstance(r, dict) and r.get("title")]
    if len(risks) < MIN_RISKS:
        fallback_risks = build_risk_fallback(computed_metrics, lang)
        seen_titles = {r.get("title") for r in risks}
        for r in fallback_risks:
            if r.get("title") in seen_titles:
                continue
            risks.append(r)
            seen_titles.add(r.get("title"))
        data["risks"] = risks[:15]

    recs = [r for r in (data.get("recommendations") or []) if isinstance(r, dict) and r.get("title")]
    if len(recs) < MIN_RECOMMENDATIONS:
        fallback_recs = build_recommendation_fallback(computed_metrics, lang, risks)
        seen_titles = {r.get("title") for r in recs}
        for r in fallback_recs:
            if r.get("title") in seen_titles:
                continue
            recs.append(r)
            seen_titles.add(r.get("title"))
        data["recommendations"] = recs[:15]

    summary_text = ""
    exec_summary = data.get("executive_summary")
    if isinstance(exec_summary, dict):
        summary_text = str(exec_summary.get("content") or "")
    if not summary_text:
        summary_text = str(data.get("summary") or "")
    if not summary_text:
        health = data.get("business_health")
        if isinstance(health, dict) and health.get("summary"):
            summary_text = health["summary"]
    if summary_text:
        data["executive_summary"] = {"content": summary_text}

    data["quality_provenance"] = {
        "engine": "analysis_result_quality_v1",
        "fallback_applied": True,
        "language": lang,
    }
    return data


def assert_complete(data: dict[str, Any]) -> tuple[bool, list[str]]:
    """Return (ok, missing) against the Phase 1.1 report contract."""
    missing: list[str] = []
    health = data.get("business_health")
    if not isinstance(health, dict) or health.get("score") is None:
        missing.append("business_health")
    metrics = [m for m in (data.get("metrics") or []) if isinstance(m, dict)]
    if len(metrics) < MIN_METRICS:
        missing.append("metrics")
    insights = [i for i in (data.get("insights") or []) if isinstance(i, dict) and i.get("title")]
    if len(insights) < MIN_INSIGHTS:
        missing.append("insights")
    risks = [r for r in (data.get("risks") or []) if isinstance(r, dict) and r.get("title")]
    if len(risks) < MIN_RISKS:
        missing.append("risks")
    recs = [r for r in (data.get("recommendations") or []) if isinstance(r, dict) and r.get("title")]
    if len(recs) < MIN_RECOMMENDATIONS:
        missing.append("recommendations")
    exec_summary = data.get("executive_summary")
    if not (isinstance(exec_summary, dict) and (exec_summary.get("content") or "").strip()):
        missing.append("executive_summary")
    return (not missing, missing)


__all__ = [
    "MIN_METRICS",
    "MIN_INSIGHTS",
    "MIN_RISKS",
    "MIN_RECOMMENDATIONS",
    "build_metric_fallback",
    "build_insight_fallback",
    "build_risk_fallback",
    "build_recommendation_fallback",
    "ensure_complete",
    "assert_complete",
]
