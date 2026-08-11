# Lytio — Production Setup Guide

## Prerequisites

- Docker & Docker Compose
- Python 3.12+ (with `uv`)
- Node.js 20+ (with `npm`)
- A DeepSeek API key (https://platform.deepseek.com)

---

## 1. Environment Configuration

Copy the example environment file and fill in production values:

```bash
cp .env.example docker/.env
```

**Critical production changes:**

| Variable | Development | Production |
|----------|------------|------------|
| `JWT_SECRET` | `dev-secret-...` | `openssl rand -hex 32` |
| `DEEPSEEK_API_KEY` | `sk-your-api-key` | Your actual API key |
| `APP_ENV` | `development` | `production` |
| `APP_DEBUG` | `true` | `false` |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://your-domain.com` |
| `POSTGRES_PASSWORD` | `excelpilot` | Strong random password |
| `DATABASE_URL` | postgresql+asyncpg://... | Match production DB credentials |

**Never commit `docker/.env` or `backend/.env` to version control.** They are gitignored.

---

## 2. Database

Start PostgreSQL via Docker Compose:

```bash
cd docker
docker compose up -d
```

Verify:

```bash
docker compose ps
# excelpilot-pg should show "Up"
```

The application creates tables automatically on first startup (via SQLAlchemy `create_all`).

---

## 3. Backend

```bash
cd backend
uv sync                          # Install dependencies
uv run uvicorn app.main:app \    # Start server
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4                    # Production: 2-4 workers per CPU
```

**Production considerations:**
- Run behind a reverse proxy (nginx, Caddy)
- Set `APP_DEBUG=false` to hide stack traces
- Use `--workers 4` for concurrency
- Consider `gunicorn` + `uvicorn` workers for process management

---

## 4. Frontend

```bash
cd frontend
npm install
npm run build      # Production build
npm start          # Start on port 3000
```

Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to your backend URL.

**Production considerations:**
- Deploy to Vercel, or serve via nginx as static + SSR
- Set `NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.com`

---

## 5. Health Check

After startup, verify:

```bash
# Backend health
curl http://localhost:8000/health
# → {"status":"ok","api":"ok","database":"ok","version":"0.1.0"}

# Frontend
curl http://localhost:3000
# → HTTP 200 with landing page HTML
```

If database is unavailable, the health endpoint returns `"status":"degraded"` with `"database":"error"`.

---

## 6. Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (asyncpg) |
| `DEEPSEEK_API_KEY` | Yes | — | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | API base URL |
| `DEEPSEEK_MODEL` | No | `deepseek-v4-pro` | Model name |
| `JWT_SECRET` | Yes | `dev-secret-...` | JWT signing secret |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRE_MINUTES` | No | `10080` (7 days) | Token expiration |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `APP_ENV` | No | `development` | `development` or `production` |
| `APP_DEBUG` | No | `true` | Show detailed errors (dev only) |

---

## 7. File Storage

Uploaded files are stored in `backend/storage/uploads/{user_id}/`. This directory is created automatically. In production, ensure:

- Sufficient disk space for expected upload volume
- Regular cleanup of orphaned files (project deletion handles this automatically)
- Backups of the storage directory

---

## 8. Monitoring

Structured JSON logs are written to stdout. Each log entry contains:

```json
{"ts": "2026-07-30T...", "level": "INFO", "event": "login", "user_id": 1, "project_id": null}
```

Events logged: `startup`, `shutdown`, `login`, `upload`, `analysis_completed`, `project_deleted`, `error`.

No business data, file contents, or PII is logged.