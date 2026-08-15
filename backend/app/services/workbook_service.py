"""Reusable workbook extraction for the async analysis runner.

Kept separate from the workbook HTTP router so background jobs can read the
canonical dataset (first sheet headers / typed columns / rows) without HTTP
coupling. The workbook router remains the public API contract.
"""

from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from app.core.logging_config import logger

UPLOAD_DIR = Path("storage/uploads")


class WorkbookAccessError(RuntimeError):
    """Raised when an uploaded workbook cannot be located or parsed."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def resolve_upload_path(user_id: int, saved_filename: str) -> Path:
    return UPLOAD_DIR / str(user_id) / saved_filename


def _detect_type(values: list[Any]) -> str:
    """Detect a column's generic type from its non-empty values."""
    non_empty = [v for v in values if v not in (None, "", "None")]
    if not non_empty:
        return "empty"

    types = {type(v) for v in non_empty}
    if types == {int} or types == {float} or types == {int, float}:
        return "number"
    if types == {str}:
        return "text"
    if types == {bool}:
        return "boolean"
    if all(hasattr(v, "strftime") for v in non_empty):
        return "date"
    return "unknown"


def extract_canonical_dataset(user_id: int, saved_filename: str) -> dict[str, Any]:
    """Return the first sheet as workbook_name/sheet_name/headers/column_types/rows."""
    file_path = resolve_upload_path(user_id, saved_filename)
    logger.info(
        "analysis_job_workbook_lookup",
        extra={
            "event": "analysis_job",
            "user_id": user_id,
            "saved_filename": saved_filename,
            "exists": file_path.exists(),
        },
    )

    if not file_path.exists():
        raise WorkbookAccessError("missing_file", "Uploaded workbook not found.")
    if file_path.suffix.lower() not in (".xlsx", ".xls"):
        raise WorkbookAccessError("unsupported_file", "Unsupported workbook type.")

    try:
        wb = load_workbook(str(file_path), read_only=True, data_only=True)
    except Exception as exc:
        raise WorkbookAccessError("unreadable_file", f"Failed to open workbook: {exc}") from exc

    try:
        if not wb.worksheets:
            raise WorkbookAccessError("empty_workbook", "Workbook has no worksheets.")

        sheet = wb.worksheets[0]
        headers: list[str] = []
        rows: list[list[Any]] = []
        columns_data: dict[int, list[Any]] = {}
        header_found = False

        for row in wb[sheet.title].iter_rows(values_only=True):
            values = [v if v is not None else "" for v in row]
            if all(v == "" for v in values):
                continue
            if not header_found:
                headers = [str(v) for v in values]
                columns_data = {i: [] for i in range(len(headers))}
                header_found = True
            else:
                for i, v in enumerate(values):
                    if i in columns_data:
                        columns_data[i].append(v)
                rows.append(values)

        if not header_found:
            raise WorkbookAccessError("empty_workbook", "Workbook contains no header row.")

        column_types: dict[str, str] = {}
        for i, name in enumerate(headers):
            column_types[name] = _detect_type(columns_data.get(i, []))

        return {
            "workbook_name": file_path.name,
            "sheet_name": sheet.title,
            "headers": headers,
            "column_types": column_types,
            "rows": rows,
        }
    finally:
        wb.close()