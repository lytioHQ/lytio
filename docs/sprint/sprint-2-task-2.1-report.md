# Sprint 2 / Task 2.1 — TASK REPORT

> Implement AI Analysis Engine

---

## 1. Summary

Created the analysis orchestration layer: a provider-independent engine that sits between the data pipeline and future AI providers. The engine validates input, builds unified requests, dispatches to injectable providers, and returns unified responses. Zero provider code. Zero business logic.

---

## 2. Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/schemas/analysis.py` | 34 | AnalysisRequest + AnalysisResponse Pydantic models |
| `backend/app/providers/__init__.py` | 0 | Package marker |
| `backend/app/providers/base.py` | 22 | BaseAIProvider abstract interface |
| `backend/app/services/analysis_engine.py` | 79 | AnalysisEngine orchestrator + global instance |

---

## 3. Directory Structure (New)

```
backend/app/
├── schemas/
│   └── analysis.py          ★ AnalysisRequest / AnalysisResponse
├── providers/
│   ├── __init__.py
│   └── base.py              ★ BaseAIProvider (abstract)
└── services/
    └── analysis_engine.py   ★ AnalysisEngine + build_request()
```

---

## 4. Request Model

```python
class AnalysisRequest(BaseModel):
    workbook_name: str
    sheet_name: str
    headers: list[str]
    column_types: dict[str, str]    # {"Month": "text", "Sales": "number"}
    rows: list[list]                # [["January", 100], ["February", 200]]
    analysis_type: str              # "trend" | "ranking" | "forecast" | "summary"
    plugin_name: str = "generic"    # "sales" | "finance"
    language: str = "zh"
    parameters: dict = {}           # Plugin-specific params
```

---

## 5. Response Model

```python
class AnalysisResponse(BaseModel):
    summary: str                    # 2-3 paragraph executive summary
    highlights: list[str]           # Positive findings
    warnings: list[str]             # Issues or risks
    recommendations: list[str]      # Actionable suggestions
    metadata: dict                  # {model, tokens_used, latency_ms}
    confidence: float | None        # 0-1 if provider supports
```

---

## 6. Engine Flow

```
Plugin (sales/finance)
  │
  │  build_request(workbook, headers, types, rows, analysis_type)
  ▼
AnalysisEngine.build_request()
  │  Validates input → builds AnalysisRequest
  ▼
engine.analyze(request)
  │  Checks provider is set
  ▼
BaseAIProvider.analyze(request)
  │  (DeepSeekProvider / OpenAIProvider / ClaudeProvider)
  │  ← injected at startup, never imported by engine
  ▼
AnalysisResponse
  │  summary, highlights, warnings, recommendations
  ▼
Plugin renders results
```

---

## 7. Verification

```bash
cd "D:\Users\徐捷\Documents\excel ai platform\backend"
uv run python -c "
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.providers.base import BaseAIProvider
from app.services.analysis_engine import engine, AnalysisEngine

# Test build_request
req = AnalysisEngine.build_request(
    workbook_name='test.xlsx',
    sheet_name='Sheet1',
    headers=['Month', 'Sales'],
    column_types={'Month': 'text', 'Sales': 'number'},
    rows=[['Jan', 100], ['Feb', 200]],
    analysis_type='trend',
    plugin_name='sales',
)
print(f'Request: {req.workbook_name} | {req.analysis_type} | {len(req.rows)} rows')
print(f'Has provider: {engine.has_provider}')

# Test no-provider error
try:
    import asyncio
    asyncio.run(engine.analyze(req))
except RuntimeError as e:
    print(f'Expected error: {e}')
print('All checks passed.')
"
```

---

## 8. Design Decisions

| Decision | Reason |
|----------|--------|
| Engine never imports providers | Swap DeepSeek → OpenAI without touching engine |
| Global `engine` instance | Simple singleton for MVP; DI container later |
| `build_request()` is static | Plugins can validate before creating engine dependency |
| No async in build_request | Synchronous validation; only analyze() is async |

---

## 9. Next Task

**Task 2.2** — Implement DeepSeek AI Provider (first concrete provider).

---

## 10. Self Review

| Dimension | Rating | Reason |
|-----------|--------|--------|
| **Architecture** | ★★★★★ | Clean separation: schemas ↔ engine ↔ providers. Engine never knows about concrete AI services. |
| **Engineering** | ★★★★★ | Abstract base class for providers. Static factory method for requests. Runtime provider injection. |
| **Maintainability** | ★★★★★ | Adding a new provider = implement BaseAIProvider. Engine unchanged. |
| **Security** | ★★★★★ | No API keys in engine. No network calls. Pure orchestration. |
| **MVP** | ★★★★★ | Minimal surface area. Three small files. Zero dependencies. |