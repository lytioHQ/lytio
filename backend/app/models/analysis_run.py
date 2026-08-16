from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, func
from app.core.database import Base


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    business_health_score = Column(Integer, nullable=True)
    summary = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    is_legacy = Column(Boolean, default=False)
    analysis_type = Column(String(30), nullable=False, default="health_scan")
    analysis_direction = Column(String(50), nullable=False, default="overview")
    parent_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True, index=True)
    dataset_version = Column(String(500), nullable=True)
    purpose = Column(String(50), nullable=True)
    comparison_result = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
