from dotenv import load_dotenv
load_dotenv(override=True)

import os
from contextlib import asynccontextmanager
from app.core.database import async_session, init_db, engine
import app.models.project  # noqa: F401
import app.models.analysis_run  # noqa: F401  ensure table creation
import app.models.audit_log  # noqa: F401  ensure table creation
import app.models.analysis_job  # noqa: F401  ensure table creation
from app.core.logging_config import logger

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.upload import router as upload_router
from app.api.analysis import router as analysis_router
from app.api.workbook import router as workbook_router
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.analysis_runs import router as analysis_runs_router
from app.api.analysis_jobs import router as analysis_jobs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("lytio.startup", extra={"event": "startup"})
    await init_db()
    async with async_session() as db:
        from app.services import analysis_job_service
        await analysis_job_service.reconcile_stale_jobs(db)
    yield
    logger.info("lytio.shutdown", extra={"event": "shutdown"})


app = FastAPI(
    title="Lytio API",
    description="AI-powered Excel analysis platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS: always allow production frontends and local dev, even when
# CORS_ORIGINS is partially set in the environment (e.g. on Railway).
_DEFAULT_CORS_ORIGINS = [
    "https://www.lytio.co",
    "https://lytio.co",
    "http://localhost:3000",
]
_env_cors = os.getenv("CORS_ORIGINS", "")
_extra_cors = [o.strip().rstrip("/") for o in _env_cors.split(",") if o.strip()]
CORS_ORIGINS = list(dict.fromkeys(_DEFAULT_CORS_ORIGINS + _extra_cors))
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Production error handlers ──

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler: returns user-friendly message, never exposes stack traces."""
    logger.error("unhandled_error", extra={"event": "error", "user_id": None, "project_id": None}, exc_info=exc)
    is_debug = os.getenv("APP_DEBUG", "false").lower() == "true"
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc) if is_debug else "An unexpected error occurred. Please try again.",
            "status": "error",
        },
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "The requested resource was not found.", "status": "error"},
    )


app.include_router(upload_router)
app.include_router(analysis_router)
app.include_router(workbook_router)
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(analysis_runs_router)
app.include_router(analysis_jobs_router)


@app.get("/")
async def root():
    return {
        "name": "Lytio API",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check with database connectivity verification."""
    db_status = "ok"
    db_error = None
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.commit()
    except Exception as e:
        db_status = "error"
        db_error = str(e) if os.getenv("APP_DEBUG", "false").lower() == "true" else "Database unavailable"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "api": "ok",
        "database": db_status,
        "version": "0.1.0",
        **({"database_error": db_error} if db_error else {}),
    }


@app.get("/api/config/ai-policy")
async def ai_policy():
    """Central AI data policy 鈥?read by frontend, not hardcoded."""
    return {
        "version": "1.0",
        "data_usage": "Uploaded data is NEVER used for model training.",
        "retention": "Data is retained only while the project exists.",
        "deletion": "Deleting a project removes all associated files and analysis data permanently.",
        "privacy": "All projects are private to their owner. No cross-account access.",
        "encryption": "Files are stored securely and accessed only through authenticated APIs.",
    }