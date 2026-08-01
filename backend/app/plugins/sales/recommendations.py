"""Plugin-specific recommendation generation.

Each plugin provides its own set of recommended next questions.
Architecture supports replacing hardcoded questions with AI-generated
recommendations in the future without changing the interface.
"""

RECOMMENDATIONS: dict[str, dict[str, list[str]]] = {
    "sales": {
        "zh": [
            "\u54ea\u4e2a\u4ea7\u54c1\u7684\u5229\u6da6\u7387\u6700\u9ad8\uff1f",
            "\u54ea\u4e2a\u533a\u57df\u7684\u589e\u957f\u6f5c\u529b\u6700\u5927\uff1f",
            "\u54ea\u4e9b\u4ea7\u54c1\u503c\u5f97\u66f4\u591a\u6295\u5165\uff1f",
            "\u9884\u6d4b\u4e0b\u4e2a\u6708\u7684\u9500\u552e\u989d\u3002",
            "\u751f\u6210\u4e00\u4efd\u6539\u8fdb\u8ba1\u5212\u3002",
        ],
        "en": [
            "Which product has the highest profit margin?",
            "Which region has the highest growth potential?",
            "Which products deserve more investment?",
            "Predict next month\u2019s sales.",
            "Generate an improvement plan.",
        ],
        "ja": [
            "\u3069\u306e\u88fd\u54c1\u306e\u5229\u76ca\u7387\u304c\u6700\u3082\u9ad8\u3044\u3067\u3059\u304b\uff1f",
            "\u3069\u306e\u5730\u57df\u306e\u6210\u9577\u4f59\u5730\u304c\u6700\u3082\u5927\u304d\u3044\u3067\u3059\u304b\uff1f",
            "\u3069\u306e\u88fd\u54c1\u306b\u3088\u308a\u591a\u304f\u306e\u6295\u8cc7\u3092\u3059\u308b\u4fa1\u5024\u304c\u3042\u308a\u307e\u3059\u304b\uff1f",
            "\u6765\u6708\u306e\u58f2\u4e0a\u3092\u4e88\u6e2c\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
            "\u6539\u5584\u8a08\u753b\u3092\u4f5c\u6210\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        ],
        "de": [
            "Welches Produkt hat die h\u00f6chste Gewinnmarge?",
            "Welche Region hat das gr\u00f6\u00dfte Wachstumspotenzial?",
            "Welche Produkte verdienen mehr Investitionen?",
            "Prognostizieren Sie den Umsatz f\u00fcr den n\u00e4chsten Monat.",
            "Erstellen Sie einen Verbesserungsplan.",
        ],
    },
}


def get_recommendations(plugin: str, language: str) -> list[str]:
    """Return 5 recommended next questions for a plugin.

    Args:
        plugin: Plugin identifier (e.g. "sales").
        language: Language code (zh, en, ja, de).

    Returns:
        List of 5 recommendation strings. Falls back to English
        if language not available for the plugin.
    """
    plugin_recs = RECOMMENDATIONS.get(plugin, {})
    if not plugin_recs:
        return RECOMMENDATIONS.get("sales", {}).get("en", ["No recommendations available."])

    lang_recs = plugin_recs.get(language)
    if lang_recs:
        return list(lang_recs)

    # Fallback to English
    en_recs = plugin_recs.get("en")
    if en_recs:
        return list(en_recs)

    # Last resort: first available language
    first_key = next(iter(plugin_recs))
    return list(plugin_recs[first_key])