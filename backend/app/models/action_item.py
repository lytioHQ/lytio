from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)

from app.core.database import Base


class ActionItem(Base):
    """M2.12.3 Business Action Tracking.

    Keeps the full source chain to the originating analysis:
    action -> source_run_id -> recommendation_id -> evidence snapshot.
    Status is user-managed (pending/completed/cancelled); verification
    linkage only records factual evidence, never flips status on its own.
    """

    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    source_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    recommendation_id = Column(String(120), nullable=True)
    description = Column(Text, nullable=False)
    detail = Column(Text, nullable=True)
    priority_snapshot = Column(String(20), nullable=True)
    action_type = Column(String(50), nullable=False, default="recommendation")
    evidence_snapshot = Column(Text, nullable=True)
    expected_impact = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    owner = Column(String(200), nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    verification_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    verification_evidence = Column(Text, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_action_items_project_status", "project_id", "status"),
        Index("ix_action_items_source_run", "source_run_id"),
        Index("ix_action_items_verification_run", "verification_run_id"),
    )
