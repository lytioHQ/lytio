"""Build sales-specific analysis prompts.

Loads prompt template from markdown file.
No networking. No API calls. Pure text generation + variable substitution.
"""

from datetime import date
from pathlib import Path
import json

PROMPT_DIR = Path(__file__).parent.parent.parent.parent / "prompts" / "sales"
DEFAULT_VERSION = "v1"

LANG_INSTRUCTIONS = {
    "zh": "Respond in Chinese (\u4e2d\u6587).",
    "en": "Respond in English.",
    "ja": "Respond in Japanese (\u65e5\u672c\u8a9e).",
    "de": "Respond in German (Deutsch).",
}

# Analysis directions are the "what should I focus on" lens the consultant
# applies to the same structured dataset. The output JSON contract is shared;
# the direction only reshapes which insights/risks/recommendations are surfaced.
ANALYSIS_DIRECTIONS: dict[str, str] = {
    "growth_opportunity": (
        "Focus on growth opportunities. Identify high-growth products, regions, and "
        "segments; quantify expansion potential and recommend where to invest next. "
        "Prioritize insights and recommendations that answer: where can we grow?"
    ),
    "risk_detection": (
        "Focus on risk detection. Surface declining trends, concentration risk, anomalies, "
        "and early warning signals. Prioritize risks by severity and probability, and "
        "recommend concrete mitigations."
    ),
    "profit_optimization": (
        "Focus on profit optimization. Analyze cost structure, margins, and profitability "
        "drivers; identify margin leaks and the highest-leverage improvements to profitability."
    ),
    "customer_analysis": (
        "Focus on customer analysis. Assess customer concentration, churn risk, high-value "
        "accounts, and purchase behavior; recommend actions to protect and grow customer value."
    ),
    "product_analysis": (
        "Focus on product analysis. Break down performance by product and category; separate "
        "star products from laggards and recommend portfolio adjustments."
    ),
}

# "overview" is the implicit first-pass Health Scan: same structured output,
# but without a specific deep-analysis focus.
OVERVIEW_DIRECTION = "overview"
ANALYSIS_DIRECTION_KEYS: frozenset[str] = frozenset({OVERVIEW_DIRECTION, *ANALYSIS_DIRECTIONS.keys()})


def analysis_type_for(analysis_direction: str | None) -> str:
    """Map a direction to the analysis run type.

    overview (or no direction) -> health_scan; any deep direction -> deep_analysis.
    """
    return "health_scan" if (analysis_direction is None or analysis_direction == OVERVIEW_DIRECTION) else "deep_analysis"


def is_valid_analysis_direction(value: str | None) -> bool:
    return value is None or value in ANALYSIS_DIRECTION_KEYS


def build(
    *,
    sheet_name: str,
    headers: list[str],
    column_types: dict[str, str],
    rows: list[list],
    language: str = "zh",
    analysis_direction: str | None = None,
    version: str = DEFAULT_VERSION,
    computed_metrics: list[dict] | None = None,
) -> str:
    """Generate a sales analysis prompt from a versioned template.

    Args:
        sheet_name: Worksheet name.
        headers: Column header names.
        column_types: Column name -> detected type mapping.
        rows: Data rows as list of lists.
        language: "zh", "en", "ja", or "de".
        analysis_direction: Optional focus lens (see ANALYSIS_DIRECTIONS). None = overview.
        version: Template version to load (e.g. "v1").

    Returns:
        Rendered prompt string with all variables substituted.
    """
    template_path = PROMPT_DIR / f"{version}.md"
    if not template_path.exists():
        raise FileNotFoundError(f"Prompt template not found: {template_path}")

    template = template_path.read_text(encoding="utf-8")

    sample_rows = rows[:40]
    column_info = "\n".join(
        f"  - {h} ({column_types.get(h, 'unknown')})"
        for h in headers
    )
    data_text = "\n".join(
        " | ".join(str(v) for v in row)
        for row in sample_rows
    )
    lang_instr = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    today_str = date.today().isoformat()

    prompt = (
        template
        .replace("{{sheet_name}}", sheet_name)
        .replace("{{column_count}}", str(len(headers)))
        .replace("{{column_info}}", column_info)
        .replace("{{row_count}}", str(len(sample_rows)))
        .replace("{{data_text}}", data_text)
        .replace("{{language_instruction}}", lang_instr)
        .replace("{{today}}", today_str)
    )

    # Inject the direction focus before the JSON rules so the structure stays intact.
    if analysis_direction and analysis_direction in ANALYSIS_DIRECTIONS:
        direction_section = (
            "\n\n## Analysis Direction\n"
            + ANALYSIS_DIRECTIONS[analysis_direction]
        )
        prompt = prompt.replace("## Rules", direction_section + "\n\n## Rules", 1)

    # Inject system-computed metrics before the JSON rules. The AI must explain
    # these numbers but never recompute or modify them.
    if computed_metrics:
        metrics_section = (
            "\n\n## Computed Metrics (system calculated)\n"
            "The following metrics were computed by the system from the dataset. "
            "AI must reference these numbers directly and must NOT recompute or modify any value. "
            "A metric with availability 'unavailable' means the required field is missing - do not fabricate it.\n"
            + json.dumps(computed_metrics, ensure_ascii=False)
        )
        prompt = prompt.replace("## Rules", metrics_section + "\n\n## Rules", 1)

    return prompt
