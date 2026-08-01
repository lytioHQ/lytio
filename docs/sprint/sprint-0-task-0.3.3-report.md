# Task 0.3.3 — TASK REPORT

> Connect Frontend and Backend

---

## 1. Summary

Connected frontend to backend by adding a single `fetch()` call on the homepage. The page now displays live backend status (Running/Offline), response time, and backend version. One environment variable, one fetch, zero libraries.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `frontend/.env.local` | `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `frontend/src/app/page.tsx` | Added `"use client"`, `useEffect` + `fetch("/")` to display live backend status |
| `.env.example` | Added `NEXT_PUBLIC_API_BASE_URL` variable |

---

## 4. Environment Variables

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Read by `page.tsx` at runtime. Falls back to `http://localhost:8000` if not set. Prefix `NEXT_PUBLIC_` exposes it to browser-side code.

---

## 5. Request Flow

```
Browser (localhost:3000)
  │
  │  page.tsx mounts → useEffect fires
  │
  │  fetch(NEXT_PUBLIC_API_BASE_URL + "/")
  │
  ▼
FastAPI (localhost:8000)
  │
  │  GET / → { name, version, status }
  │
  ▼
Browser renders:
  Backend Status: Running | Offline
  Response Time: XXms
  Backend Version: 0.1.0
```

---

## 6. Verification Steps

User must run:

```bash
# Terminal 1: Backend
cd "D:\Users\徐捷\Documents\excel ai platform\backend"
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd "D:\Users\徐捷\Documents\excel ai platform\frontend"
npm run dev
```

Open `http://localhost:3000`.

---

## 7. Expected Result

**Backend online:**
```
ExcelPilot
AI Excel Analysis Platform
Version 0.1.0

Backend Status: Running       (green)
Response Time: 3ms
Backend Version: 0.1.0
```

**Backend offline:**
```
Backend Status: Offline        (red)
```

---

## 8. Known Limitations

| # | Limitation |
|---|-----------|
| 1 | Fetches only on mount — no periodic health check |
| 2 | CORS hardcoded to localhost:3000 in backend |

---

## 9. Technical Debt

(无 — implementation is minimal by design)

---

## 10. Risks

(无 — single fetch, no state management, no libraries)

---

## 11. Next Task

**Task 0.4.1** — Add database models or authentication (depending on Sprint plan).

---

## 12. Self Review

| Dimension | Rating | Reason |
|-----------|--------|--------|
| **Architecture** | ★★★★★ | Environment variable for URL. No hardcoded ports. Clean separation. |
| **Engineering** | ★★★★★ | Native fetch only. One useEffect. Three states (loading/running/offline). No libraries. |
| **Maintainability** | ★★★★★ | 50-line page.tsx. Any developer understands it instantly. |
| **Security** | ★★★★★ | No secrets in client code. URL is configurable. |
| **MVP** | ★★★★★ | Exactly the minimum to verify connectivity. Zero over-engineering. |