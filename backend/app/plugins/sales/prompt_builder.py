"""Build sales-specific analysis prompts.

Loads prompt template from markdown file.
No networking. No API calls. Pure text generation + variable substitution.
"""

from datetime import date
from pathlib import Path

PROMPT_DIR = Path(__file__).parent.parent.parent.parent / "prompts" / "sales"
DEFAULT_VERSION = "v1"

LANG_INSTRUCTIONS = {
    "zh": "Respond in Chinese (\u4e2d\u6587).",
    "en": "Respond in English.",
    "ja": "Respond in Japanese (\u65e5\u672c\u8a9e).",
    "de": "Respond in German (Deutsch).",
}


def build(
    *,
    sheet_name: str,
    headers: list[str],
    column_types: dict[str, str],
    rows: list[list],
    language: str = "zh",
    version: str = DEFAULT_VERSION,
) -> str:
    """Generate a sales analysis prompt from a versioned template.

    Args:
        sheet_name: Worksheet name.
        headers: Column header names.
        column_types: Column name -> detected type mapping.
        rows: Data rows as list of lists.
        language: "zh", "en", "ja", or "de".
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

    return (
        template
        .replace("{{sheet_name}}", sheet_name)
        .replace("{{column_count}}", str(len(headers)))
        .replace("{{column_info}}", column_info)
        .replace("{{row_count}}", str(len(sample_rows)))
        .replace("{{data_text}}", data_text)
        .replace("{{language_instruction}}", lang_instr)
        .replace("{{today}}", today_str)
    )