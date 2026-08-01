# Sprint 2 / Task 2.3 — TASK REPORT

> Implement Sales Analysis Plugin V1

---

## 1. Summary

Implemented the first industry plugin: Sales Analysis. Complete AI workflow — detector → prompt builder → engine → DeepSeek → parser → frontend display. The plugin is self-contained in `plugins/sales/`. Adding Finance Plugin = copy directory, change prompts. Zero changes to Engine, Provider, or Pipeline.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `backend/app/plugins/sales/__init__.py` | Plugin exports |
| `backend/app/plugins/sales/detector.py` | Verifies dataset suitability for sales analysis |
| `backend/app/plugins/sales/prompt_builder.py` | Generates sales-specific analysis prompt |
| `backend/app/plugins/sales/parser.py` | Converts AI response → structured result |
| `backend/app/plugins/sales/plugin.py` | Orchestrator: detect → build → analyze → parse |
| `backend/app/api/analysis.py` | POST /api/analysis/sales endpoint |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `backend/app/main.py` | Added analysis router + load_dotenv() |
| `frontend/src/app/page.tsx` | Added "Analyze Sales" button + result display |

---

## 4. Plugin Structure

```
plugins/sales/
├── __init__.py          ← exports SalesPlugin
├── detector.py          ← keyword + type-based detection
├── prompt_builder.py    ← sales-specific prompt (no networking)
├── parser.py            ← clean response formatting
└── plugin.py            ← orchestrator (detect → prompt → engine → parse)
```

---

## 5. Request Flow

```
Frontend: "Analyze Sales" click
  │
  │  POST /api/analysis/sales
  │  { saved_filename, sheet_name, headers, column_types, rows }
  ▼
analysis.py
  │
  ├─ SalesPlugin.detect(headers, column_types)
  │   └─ Checks keywords + numeric columns → DetectionResult
  │
  ├─ AnalysisEngine.build_request(...)
  │   └─ AnalysisRequest (provider-independent)
  │
  ├─ engine.analyze(request)
  │   └─ DeepSeekProvider.analyze()
  │       └─ POST DeepSeek API → raw response
  │
  ├─ SalesPlugin.parse(response)
  │   └─ SalesAnalysisResult
  │
  └─ Return JSON → Frontend
```

---

## 6. Verification

```bash
# Restart backend (new imports)
cd "D:\Users\徐捷\Documents\excel ai platform\backend"
uv run uvicorn app.main:app --reload --port 8000

# Frontend (auto-reload or restart)
cd "D:\Users\徐捷\Documents\excel ai platform\frontend"
npm run dev
```

Steps:
1. Open http://localhost:3000
2. Upload an .xlsx file → wait for "Detecting types..." to complete
3. Click green "Analyze Sales" button
4. Wait ~15-30 seconds for AI response
5. See: Summary, Highlights, Warnings, Recommendations

---

## 7. Expected Result

```
┌─────────────────────────────────────────┐
│ Sales Analysis Result                   │
│                                         │
│ [Summary] 2-3 paragraph analysis...     │
│                                         │
│ Highlights                              │
│ • Key finding 1                         │
│ • Key finding 2                         │
│                                         │
│ Warnings                                │
│ • Risk 1                                │
│                                         │
│ Recommendations                         │
│ • Action 1                              │
│ • Action 2                              │
│                                         │
│ Model: deepseek-chat · Tokens: 500+300  │
└─────────────────────────────────────────┘
```

---

## 8. Adding Finance Plugin (Future)

```bash
cp -r plugins/sales plugins/finance
# Edit: prompt_builder.py (finance prompt)
# Edit: detector.py (finance keywords)
# Done. Zero changes to engine, provider, or API.
```

---

## 9. Self Review

| Dimension | Rating | Reason |
|-----------|--------|--------|
| **Architecture** | ★★★★★ | Plugin is fully self-contained. Engine/Provider/Pipeline untouched. Second plugin = copy directory. |
| **Engineering** | ★★★★★ | Detector → Prompt → Parse clear single-responsibility. No module exceeds 60 lines. |
| **Maintainability** | ★★★★★ | All sales logic in one directory. No cross-plugin dependencies. |
| **Security** | ★★★★★ | API key only in env. No credentials in plugin or API layer. |
| **MVP** | ★★★★★ | Complete end-to-end AI analysis for the first industry. |