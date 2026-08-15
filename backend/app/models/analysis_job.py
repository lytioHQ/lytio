from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func, text

from app.core.database import Base


class AnalysisJob(Base):
    """Execution record for an asynchronous analysis job.

    AnalysisJob tracks the process lifecycle (queued/running/completed/failed).
    AnalysisRun tracks successful business results only and is created after a
    job completes successfully.
    """

    __tablename__ = "analysis_jobs"
    __table_args__ = (
        Index(
            "uq_analysis_jobs_active_direction",
            "project_id",
            "analysis_direction",
            unique=True,
            postgresql_where=text("status IN ('queued', 'running')"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    idempotency_key = Column(String(200), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="queued", index=True)
    analysis_type = Column(String(30), nullable=False)
    analysis_direction = Column(String(50), nullable=False)
    request_json = Column(Text, nullable=True)
    error_code = Column(String(50), nullable=True)
    error_message = Column(String(500), nullable=True)
    result_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)