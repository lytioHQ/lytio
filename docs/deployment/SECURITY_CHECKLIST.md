# ExcelPilot — Security Checklist

> Verified: 2026-07-30  
> Version: 0.1.0 (Private Beta)

---

## 1. Authentication

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Passwords hashed with bcrypt | ✅ | `passlib[bcrypt]` |
| 1.2 | JWT with configurable secret and expiration | ✅ | HS256, 7-day default |
| 1.3 | Token validated on every protected route | ✅ | `deps.py` require_auth |
| 1.4 | Login audit logged (DB + structured JSON) | ✅ | `audit_logs` table + stdout |
| 1.5 | Registration creates 14-day trial | ✅ | `plan_service.py` |
| 1.6 | Email uniqueness enforced at DB level | ✅ | Unique constraint on users.email |

---

## 2. Authorization & Isolation

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Upload API requires JWT auth | ✅ | `Depends(get_current_user)` |
| 2.2 | Analysis API requires JWT auth | ✅ | Both `/sales` and `/chat` |
| 2.3 | Project listing filtered by owner_id | ✅ | `WHERE owner_id = :user_id` |
| 2.4 | Project access verified on every API | ✅ | `get_project(db, pid, uid)` checks owner |
| 2.5 | Analysis run access verified via project ownership | ✅ | Checks project → owner chain |
| 2.6 | Files stored per-user (user_id directory) | ✅ | `storage/uploads/{user_id}/` |
| 2.7 | Cross-account file access prevented | ✅ | No direct file URLs, download via API |
| 2.8 | No client-side ID trust | ✅ | Server always re-verifies ownership |

---

## 3. Data Protection

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Uploaded files outside public directories | ✅ | `storage/uploads/` not in web root |
| 3.2 | Cascade delete removes all related data | ✅ | AnalysisRuns → Files → Project |
| 3.3 | No business data in logs | ✅ | Only user_id, project_id, event type |
| 3.4 | AI policy documented and accessible via API | ✅ | `GET /api/config/ai-policy` |
| 3.5 | Data never used for model training | ✅ | Documented in AI policy |

---

## 4. Secrets & Configuration

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | No secrets hardcoded in source code | ✅ | All from environment variables |
| 4.2 | .env files in .gitignore | ✅ | docker/.env, backend/.env, frontend/.env.local |
| 4.3 | .env.example provided with placeholders | ✅ | No real credentials in example |
| 4.4 | JWT secret configurable | ✅ | `JWT_SECRET` env var |
| 4.5 | Database credentials configurable | ✅ | `DATABASE_URL` env var |
| 4.6 | API keys never returned in responses | ✅ | Only metadata.model, not the key itself |

---

## 5. Error Handling & Resilience

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | No stack traces in production | ✅ | `APP_DEBUG=false` hides details |
| 5.2 | User-friendly error messages | ✅ | Generic 500 message in production |
| 5.3 | Structured JSON error logging | ✅ | stdout, includes event type + user_id |
| 5.4 | HTTP 404 handled gracefully | ✅ | Custom 404 handler |
| 5.5 | AI provider has retry logic | ✅ | 2 retries with exponential backoff |
| 5.6 | Auth failures return 401 (not 500) | ✅ | Don't retry on 401 |

---

## 6. API Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | CORS configured from environment | ✅ | `CORS_ORIGINS` env var |
| 6.2 | File upload size limit | ✅ | 20 MB max |
| 6.3 | File extension whitelist | ✅ | Only .xlsx, .xls |
| 6.4 | Rate limiting | ❌ | Not implemented — recommended for production |
| 6.5 | Request ID / tracing | ❌ | Not implemented — recommended for production |

---

## 7. Database

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | Passwords hashed (not plaintext) | ✅ | bcrypt via passlib |
| 7.2 | PostgreSQL with strong password | ⚠️ | Depends on deployment configuration |
| 7.3 | No raw SQL injection vectors | ✅ | SQLAlchemy ORM with parameterized queries |
| 7.4 | Database port not exposed publicly | ⚠️ | Depends on deployment (Docker Compose default: localhost) |

---

## Known Risks (Private Beta)

| Risk | Severity | Mitigation |
|------|----------|------------|
| No rate limiting | Medium | Add before public launch (nginx or middleware) |
| No request tracing | Low | Add correlation IDs for debugging |
| JWT stored in localStorage | Medium | Acceptable for beta; migrate to httpOnly cookie for production |
| No 2FA | Low | Not required for beta; add for enterprise customers |
| No session invalidation | Low | Tokens expire after 7 days; add refresh token rotation for production |
| Database password in compose env | Medium | Use Docker secrets or external secret manager in production |

---

## Next Steps

1. Add rate limiting (nginx `limit_req` or FastAPI middleware)
2. Add request correlation IDs for tracing
3. Consider httpOnly cookies for JWT storage
4. Set up automated security scanning (e.g., `bandit` for Python, `npm audit` for JS)
5. Configure database backups
6. Set up monitoring and alerting