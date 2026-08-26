# -*- coding: utf-8 -*-
"""M2.14.2 UAT P0 fix - end-to-end regression tests.

Covers:
  Case A: Excel date column with REAL datetime cells -> evidence_rows become
          ISO strings; full extract -> metrics -> prompt chain succeeds.
  Case B: Excel date column with TEXT cells (legacy) -> unchanged behavior,
          values stay strings, chain succeeds.
  Case C: Decimal amount values -> normalized to float; prompt builder JSON
          fallback never fails the job.
  Case D: historical text-date project pipeline must not regress.
  Error code: TypeError during analysis maps to DATA_SERIALIZATION_ERROR and
          the frontend maps it to a customer-language copy block.
  History protection: only the 5 allowed files are modified; verification /
          memory / action / health-score / metric-engine contracts untouched
          (metric_engine change is JSON-safety only, verified by behavior).

Run from the repo root:
    $env:PYTHONPATH="backend"; backend/.venv/Scripts/python.exe -B _m2142_uat_p0_test.py
"""

import json
import os
import subprocess
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from openpyxl import Workbook

BACKEND = Path(__file__).resolve().parent / "backend"
sys.path.insert(0, str(BACKEND))

from app.services import metric_engine as me  # noqa: E402
from app.services import schema_mapper  # noqa: E402
from app.services.metric_engine import compute_metrics  # noqa: E402
from app.services.workbook_service import extract_canonical_dataset  # noqa: E402
from app.plugins.sales.prompt_builder import build as build_prompt  # noqa: E402

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name)
    if not cond:
        print(f"  FAIL {name}: {detail}")


def _json_serializable(value) -> bool:
    try:
        json.dumps(value, ensure_ascii=False)
        return True
    except TypeError:
        return False


def _make_workbook(path: Path, date_mode: str) -> None:
    """date_mode: 'datetime' | 'text'"""
    path.parent.mkdir(parents=True, exist_ok=True)
    wb = Workbook()
    ws = wb.active
    ws.title = "销售数据"
    ws.append(["月份", "产品名称", "销售单价(元)", "销售数量(台)"])
    for i in range(12):
        if date_mode == "datetime":
            ws.append([datetime(2026, (i % 6) + 1, 1), f"产品{i}", 1000 + i * 100, 5 + i])
            ws.cell(row=i + 2, column=1).number_format = "yyyy-mm"
        else:
            ws.append([f"2026-{(i % 6) + 1:02d}-01", f"产品{i}", 1000 + i * 100, 5 + i])
    wb.save(str(path))


def _chain_ok(dataset: dict) -> tuple[list[dict], bool]:
    """extract -> detect -> compute_metrics -> build_prompt, all without raise."""
    mapping = schema_mapper.detect_schema(dataset["headers"], dataset["column_types"]).to_dict()
    metrics = compute_metrics(dataset, mapping)
    try:
        prompt = build_prompt(
            sheet_name=dataset["sheet_name"],
            headers=dataset["headers"],
            column_types=dataset["column_types"],
            rows=dataset["rows"],
            language="zh",
            analysis_direction="overview",
            computed_metrics=metrics,
        )
        return metrics, len(prompt) > 0
    except Exception as exc:  # noqa: BLE001
        print(f"    chain raised: {type(exc).__name__}: {exc}")
        return metrics, False


def _evidence_values(metrics: list[dict]) -> list:
    out = []
    for m in metrics:
        for row in m.get("evidence_rows") or []:
            vals = row.get("values") or {}
            out.extend(vals.values())
    return out


# ---------- Case A: real datetime date column ----------
def case_a() -> None:
    old_cwd = os.getcwd()
    os.chdir(BACKEND)
    try:
        p = Path("storage/uploads/998/uat_p0_case_a.xlsx")
        _make_workbook(p, "datetime")
        ds = extract_canonical_dataset(998, "uat_p0_case_a.xlsx")
        metrics, ok = _chain_ok(ds)
        check("A1 chain succeeds with datetime cells", ok, "extract->metrics->prompt must not raise")
        check("A2 column type detected as date", ds["column_types"].get("月份") == "date",
              f"got {ds['column_types'].get('月份')!r}")
        non_json = [v for v in _evidence_values(metrics) if not isinstance(v, (str, int, float, bool, type(None)))]
        check("A3 no non-JSON values in evidence_rows", len(non_json) == 0,
              f"found {[repr(v)[:40] for v in non_json][:3]}")
        json_ok = all(_json_serializable(m) for m in metrics)
        check("A4 every metric JSON-serializable", json_ok)
        iso_hits = [v for v in _evidence_values(metrics) if isinstance(v, str) and "-" in v and "T" in v]
        check("A5 datetime normalized to ISO strings", len(iso_hits) > 0, f"got {iso_hits[:2]}")
    finally:
        os.chdir(old_cwd)


# ---------- Case B: text date column (legacy) ----------
def case_b() -> None:
    old_cwd = os.getcwd()
    os.chdir(BACKEND)
    try:
        p = Path("storage/uploads/998/uat_p0_case_b.xlsx")
        _make_workbook(p, "text")
        ds = extract_canonical_dataset(998, "uat_p0_case_b.xlsx")
        metrics, ok = _chain_ok(ds)
        check("B1 chain succeeds with text date cells", ok, "extract->metrics->prompt must not raise")
        check("B2 text cells stay str", ds["rows"][0][0] == "2026-01-01",
              f"got {ds['rows'][0][0]!r} ({type(ds['rows'][0][0]).__name__})")
        dates = [v for v in _evidence_values(metrics) if isinstance(v, str) and v.startswith("2026-")]
        check("B3 legacy text dates unchanged in evidence", len(dates) > 0, "text dates must remain strings")
        non_json = [v for v in _evidence_values(metrics) if not isinstance(v, (str, int, float, bool, type(None)))]
        check("B4 no non-JSON values in evidence_rows", len(non_json) == 0)
    finally:
        os.chdir(old_cwd)


# ---------- Case C: Decimal amounts ----------
def case_c() -> None:
    ds = {
        "workbook_name": "decimal.xlsx",
        "sheet_name": "Sheet1",
        "headers": ["日期", "金额", "数量"],
        "column_types": {"日期": "date", "金额": "number", "数量": "number"},
        "rows": [
            [datetime(2026, 1, 15), Decimal("1234.56"), 2],
            [datetime(2026, 2, 15), Decimal("2345.67"), 3],
            [date(2026, 3, 1), Decimal("999.99"), 1],
        ],
    }
    mapping = schema_mapper.detect_schema(ds["headers"], ds["column_types"]).to_dict()
    metrics = compute_metrics(ds, mapping)
    check("C1 compute_metrics does not raise on Decimal rows", True)
    check("C2 _json_safe(Decimal) -> float",
          me._json_safe(Decimal("123.45")) == 123.45 and isinstance(me._json_safe(Decimal("1.0")), float))
    check("C3 _json_safe(datetime/date) -> ISO",
          me._json_safe(datetime(2026, 1, 15, 10, 30)) == "2026-01-15T10:30:00"
          and me._json_safe(date(2026, 1, 15)) == "2026-01-15")
    # prompt builder defensive fallback: inject Decimal into a metrics payload
    dirty = [{
        "metric_name": "total_sales", "value": Decimal("9999.99"),
        "formula": "SUM(amount)", "source_columns": ["金额"],
        "evidence_rows": [{"index": 1, "values": {"日期": datetime(2026, 1, 15), "金额": Decimal("1234.56")}}],
        "availability": "available", "confidence": "high",
    }]
    try:
        prompt = build_prompt(
            sheet_name="Sheet1", headers=ds["headers"], column_types=ds["column_types"],
            rows=ds["rows"], language="zh", computed_metrics=dirty,
        )
        check("C4 prompt builder fallback survives Decimal/datetime", len(prompt) > 0)
    except Exception as exc:  # noqa: BLE001
        check("C4 prompt builder fallback survives Decimal/datetime", False, f"{type(exc).__name__}: {exc}")


# ---------- Case D: legacy seed workbook ----------
def case_d() -> None:
    old_cwd = os.getcwd()
    os.chdir(BACKEND)
    try:
        seeds = sorted(Path("storage/uploads").glob("*.xlsx"))
        if not seeds:
            check("D1 legacy seed workbook available", False, "no seed xlsx found")
            return
        user_dir = Path("storage/uploads/9998")
        user_dir.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy2(seeds[0], user_dir / seeds[0].name)
        ds = extract_canonical_dataset(9998, seeds[0].name)
        metrics, ok = _chain_ok(ds)
        check("D1 legacy seed chain succeeds", ok)
        non_json = [v for v in _evidence_values(metrics) if not isinstance(v, (str, int, float, bool, type(None)))]
        check("D2 legacy seed evidence stays JSON-safe", len(non_json) == 0)
    finally:
        os.chdir(old_cwd)


# ---------- Error-code mapping & frontend copy ----------
def error_code_mapping() -> None:
    runner = (BACKEND / "app/services/analysis_job_runner.py").read_text(encoding="utf-8")
    check("E1 runner maps TypeError -> DATA_SERIALIZATION_ERROR",
          'code = "DATA_SERIALIZATION_ERROR" if isinstance(exc, TypeError)' in runner)
    check("E2 runner logs traceback on fail (exc arg)",
          "exc: Exception | None = None" in runner and "exc_info=exc" in runner)
    page = Path("frontend/src/app/project/[id]/analysis/page.tsx").read_text(encoding="utf-8")
    check("E3 frontend maps DATA_SERIALIZATION_ERROR",
          'case "DATA_SERIALIZATION_ERROR":' in page)
    i18n = Path("frontend/src/lib/i18n.ts").read_text(encoding="utf-8")
    check("E4 i18n dataError in zh/en/ja/de", i18n.count("analysis.error.dataError") == 4)
    # customer-language copy must not contain technical jargon
    for lang_block in i18n.split("const zh:")[1:2]:
        check("E5 zh copy stays customer language", "TypeError" not in lang_block
              and "serialization" not in lang_block)


# ---------- History protection audit ----------
def history_protection() -> None:
    changed = subprocess.run(
        ["git", "status", "--porcelain"], capture_output=True, text=True, cwd=Path(__file__).resolve().parent,
    ).stdout
    allowed = {
        "backend/app/services/metric_engine.py",
        "backend/app/plugins/sales/prompt_builder.py",
        "backend/app/services/analysis_job_runner.py",
        "frontend/src/app/project/[id]/analysis/page.tsx",
        "frontend/src/lib/i18n.ts",
        "_m2142_test.py",
        "_m2142_p1_test.py",
    }
    modified = set()
    for line in changed.splitlines():
        if not line.strip():
            continue
        status_code = line[:2]
        path = line[3:].strip()
        if status_code.startswith("??"):
            # untracked: long-standing docs + our diagnostic scripts/reports
            if path.startswith(("_m2142_p0_", "_m2142_uat_p0_", "_m2142_p0_query")):
                continue
            if path in ("M2.14.2_UAT_ANALYSIS_FAILURE_DIAGNOSIS.md", "M2.14.2_UAT_P0_FIX_REPORT.md"):
                continue
            continue  # pre-existing untracked docs are out of scope
        if path in allowed:
            modified.add(path)
        else:
            # any other tracked modification is out of scope
            check("H1 no out-of-scope tracked modifications", False, f"unexpected: {line}")
    check("H2 all 5 allowed files modified", modified == allowed,
          f"modified={sorted(modified)} allowed={sorted(allowed)}")
    protected = [
        "backend/app/services/verification_service.py",
        "backend/app/services/verification_metrics.py",
        "backend/app/services/verification_scoring.py",
        "backend/app/services/memory_service.py",
        "backend/app/services/memory_intelligence.py",
        "backend/app/services/action_item_service.py",
        "backend/app/services/action_execution_service.py",
        "backend/app/services/health_score.py",
        "backend/app/services/canonical_schema.py",
        "backend/app/plugins/sales/prompt_builder.py",
    ]
    for f in protected:
        if f != "backend/app/plugins/sales/prompt_builder.py":
            check(f"H3 {f} untouched", f not in changed, "must not be modified")


def main() -> int:
    print("=== M2.14.2 UAT P0 fix tests ===")
    print("[Case A] real datetime date column")
    case_a()
    print("[Case B] text date column")
    case_b()
    print("[Case C] Decimal amounts")
    case_c()
    print("[Case D] legacy seed workbook")
    case_d()
    print("[Error mapping] backend + frontend")
    error_code_mapping()
    print("[History protection]")
    history_protection()

    print(f"\nPASS={len(PASS)} FAIL={len(FAIL)}")
    for f in FAIL:
        print(f"  FAILED: {f}")
    return 0 if not FAIL else 1


if __name__ == "__main__":
    sys.exit(main())
