"""M2.12.4 Business Memory model.

Per-project aggregate of operating knowledge (profile, metric/health history,
action summary, issue lifecycle, verification summary). This is a *derived
cache*: it can always be rebuilt from analysis_runs + action_items, and it
never serves as the authoritative source for any business number.
"""

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class BusinessMemory(Base):
    __tablename__ = "business_memory"

    id = Column(BigInteger, primary_key=True)
    project_id = Column(BigInteger, ForeignKey("projects.id"), nullable=False, unique=True, index=True)
    profile = Column(JSONB, nullable=False, default=dict)
    latest_metrics = Column(JSONB, nullable=False, default=dict)
    metric_history = Column(JSONB, nullable=False, default=dict)
    health_history = Column(JSONB, nullable=False, default=list)
    action_summary = Column(JSONB, nullable=False, default=dict)
    action_recent = Column(JSONB, nullable=False, default=list)
    issue_tracker = Column(JSONB, nullable=False, default=list)
    verification_history = Column(JSONB, nullable=False, default=list)
    open_loops = Column(JSONB, nullable=False, default=list)
    engine_version = Column(Text, nullable=False, default="business_memory_v0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
