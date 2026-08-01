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
    created_at = Column(DateTime(timezone=True), server_default=func.now())