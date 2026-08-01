# Sprint 2 / Task 2.2 — TASK REPORT

> Implement DeepSeek Provider

---

## 1. Summary

Implemented the first concrete AI provider: `DeepSeekProvider`. Inherits `BaseAIProvider`, communicates via httpx, converts `AnalysisRequest` → API call → `AnalysisResponse`. Timeout (60s), exponential backoff retry (max 2), structured error handling. No business logic, no prompt engineering — just a generic data analyst prompt.

---

## 2. Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/providers/deepseek.py` | 185 | DeepSeekProvider — HTTP + retry + parse |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `backend/pyproject.toml` | Added `httpx>=0.28.0` |
| `docker/.env` | Added `DEEPSEEK_MODEL=deepseek-chat` |
| `.env.example` | Added `DEEPSEEK_MODEL=deepseek-chat` |

---

## 4. Environment Variables

```
DEEPSEEK_API_KEY=sk-your-api-key      # Required — your real key
DEEPSEEK_BASE_URL=https://api.deepseek.com  # Optional
DEEPSEEK_MODEL=deepseek-chat           # Optional — model name
```

---

## 5. Provider Class Structure

```
BaseAIProvider (abstract)
  │
  └── DeepSeekProvider
       ├── name: "DeepSeek (deepseek-chat)"
       ├── analyze(request) → AnalysisResponse
       │    ├── _build_system_prompt()  ← generic, no industry knowledge
       │    ├── _build_user_prompt()    ← formats data as text
       │    ├── httpx POST with retry
       │    └── _parse_response()       ← JSON parse or text fallback
       └── config: api_key, base_url, model, timeout, max_retries
```

---

## 6. Request Flow

```
AnalysisRequest
  │
  │  _build_system_prompt()
  │  → "You are a professional data analyst..."
  │
  │  _build_user_prompt()
  │  → "Workbook: test.xlsx\nSheet: Sheet1\nColumns:...\nData:..."
  │
  ▼
POST https://api.deepseek.com/chat/completions
  { model, messages, temperature: 0.3, max_tokens: 4096 }
  Authorization: Bearer sk-...
  │
  │  Retry: 0s → 2s → 4s (max 2 retries)
  ▼
Response → _parse_response()
  │  Try JSON parse → {summary, highlights, warnings, recommendations}
  │  Fallback → all content in summary
  ▼
AnalysisResponse
```

---

## 7. Verification

```bash
# Install httpx
cd "D:\Users\徐捷\Documents\excel ai platform\backend"
uv sync

# Test provider (requires real API key in docker/.env)
uv run python -c "
import asyncio
from app.providers.deepseek import DeepSeekProvider
from app.services.analysis_engine import AnalysisEngine

provider = DeepSeekProvider()
engine = AnalysisEngine(provider)

req = AnalysisEngine.build_request(
    workbook_name='test.xlsx',
    sheet_name='Sheet1',
    headers=['Month', 'Revenue'],
    column_types={'Month': 'text', 'Revenue': 'number'},
    rows=[['Jan', 1000], ['Feb', 1200], ['Mar', 1100]],
    analysis_type='trend',
    language='zh',
)

resp = asyncio.run(engine.analyze(req))
print(f'Summary: {resp.summary[:200]}...')
print(f'Highlights: {resp.highlights}')
print(f'Model: {resp.metadata.get(\"model\")}')
print(f'Tokens: {resp.metadata.get(\"prompt_tokens\")} + {resp.metadata.get(\"completion_tokens\")}')
"
```

---

## 8. Known Limitations

| # | Limitation | When |
|---|-----------|------|
| 1 | Prompt is generic — no industry-specific context | Task 2.3+ (Prompt Builder) |
| 2 | Retry on all errors except 401 | Fine for MVP |
| 3 | Data rows truncated at 50 | Acceptable — token limits |

---

## 9. Next Task

**Task 2.3** — Wire everything: POST /api/analysis endpoint → Engine → DeepSeek → return results to frontend.

---

## 10. Self Review

| Dimension | Rating | Reason |
|-----------|--------|--------|
| **Architecture** | ★★★★★ | Cleanly implements BaseAIProvider. Swapping to OpenAI = copy file, change base_url. Engine unchanged. |
| **Engineering** | ★★★★★ | httpx with timeout + exponential backoff. JSON parse with text fallback. Config from env vars only. |
| **Maintainability** | ★★★★★ | Single file. Three private methods. Clear separation: network ↔ parse. |
| **Security** | ★★★★★ | API key from env only. Never logged. 401 not retried. |
| **MVP** | ★★★★★ | Exactly the minimum to call DeepSeek and get structured results back. |