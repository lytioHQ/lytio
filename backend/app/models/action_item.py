from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)

from app.core.database import Base


class ActionItem(Base):
    """M2.12.3 Business Action Tracking.

    Keeps the full source chain to the originating analysis:
    action -> source_run_id -> recommendation_id -> evidence snapshot.
    Status is user-managed (pending/completed/cancelled); verification
    linkage only records factual evidence, never flips status on its own.

    M2.14.0 adds optional target-metric binding so a verification run can
    later compute alignment. target_metric_source is user | code_keyword | none;
    AI never participates in target selection or execution judgement.
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
    # M2.14.0: optional target metric binding (user | code_keyword | none).
    target_metric_name = Column(String(80), nullable=True)
    target_direction = Column(String(20), nullable=True)  # up | down
    target_metric_source = Column(String(20), nullable=True, default="none")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_action_items_project_status", "project_id", "status"),
        Index("ix_action_items_source_run", "source_run_id"),
        Index("ix_action_items_verification_run", "verification_run_id"),
    )


class ActionExecution(Base):
    """M2.14.0 append-only factual log of action execution.

    Each row is a user-recorded fact (execution event or note). client_key
    provides idempotency so replays never create duplicates.
    """

    __tablename__ = "action_executions"

    id = Column(Integer, primary_key=True)
    action_id = Column(Integer, ForeignKey("action_items.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    kind = Column(String(20), nullable=False, default="execution")  # execution | note
    note = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    status_snapshot = Column(String(20), nullable=True)
    client_key = Column(String(120), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_action_executions_action", "action_id"),
        Index("ix_action_executions_project", "project_id"),
    )


class ActionObservation(Base):
    """M2.14.0 code-computed alignment between an action's target metric and
    the before/after metric changes of a verification run.

    alignment values:
      aligned           - metric moved in expected direction
      not_aligned       - metric moved against expected direction
      unable_to_verify  - flat / insufficient data / no execution evidence

    executed = whether at least one execution record exists when the
    observation is created. This is a factual flag, never an AI verdict.
    """

    __tablename__ = "action_observations"

    id = Column(Integer, primary_key=True)
    action_id = Column(Integer, ForeignKey("action_items.id"), nullable=False)
    verification_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    metric_name = Column(String(80), nullable=False)
    before_value = Column(Numeric(20, 4), nullable=True)
    after_value = Column(Numeric(20, 4), nullable=True)
    absolute_delta = Column(Numeric(20, 4), nullable=True)
    percent_delta = Column(Numeric(20, 4), nullable=True)
    direction = Column(String(20), nullable=True)  # improved | declined | unchanged
    expected_direction = Column(String(20), nullable=True)  # up | down | none
    alignment = Column(String(30), nullable=False)  # aligned | not_aligned | unable_to_verify
    executed = Column(Boolean, nullable=False, default=False)
    reason = Column(String(250), nullable=True)
    source = Column(String(30), nullable=False, default="verification_metrics")
    engine_version = Column(String(40), nullable=False, default="action_observation_v1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "action_id", "verification_run_id", "metric_name", name="uq_action_observation"
        ),
        Index("ix_action_observations_action", "action_id"),
        Index("ix_action_observations_verification", "verification_run_id"),
    )
