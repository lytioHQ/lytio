"""Pydantic schemas for M2.12.3 Action Items.

Kept separate from analysis/verification contracts so the Action system can
evolve without touching M2.11 schemas. M2.14.0 adds additive fields only:
target-metric binding, execution records and code-computed observations.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

ACTION_STATUSES: tuple[str, ...] = ("pending", "completed", "cancelled")
ACTION_TYPES: tuple[str, ...] = ("recommendation",)

TARGET_METRIC_SOURCES: tuple[str, ...] = ("user", "code_keyword", "none")
TARGET_DIRECTIONS: tuple[str, ...] = ("up", "down")

# Verification evidence is a factual snapshot; it never implies the action
# itself was executed (AI must not judge task completion).
VERIFICATION_STATUSES: tuple[str, ...] = (
    "achieved",
    "partially_achieved",
    "not_achieved",
    "unable_to_verify",
)


class ActionItemOut(BaseModel):
    id: int
    project_id: int
    source_run_id: int
    recommendation_id: str | None = None
    description: str
    detail: str | None = None
    priority_snapshot: str | None = None
    action_type: str = "recommendation"
    expected_result: str | None = None
    owner: str | None = None
    deadline: date | None = None
    status: str
    completed_at: datetime | None = None
    verification_run_id: int | None = None
    verification_evidence: dict[str, Any] | None = None
    verified_at: datetime | None = None
    # M2.14.0 additive: target metric binding (user | code_keyword | none).
    target_metric_name: str | None = None
    target_direction: str | None = None
    target_metric_source: str | None = None
    execution_count: int = 0
    observations_summary: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ActionItemUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    owner: str | None = Field(default=None, max_length=200)
    deadline: date | None = None
    status: str | None = None
    # M2.14.0 additive: optional target metric binding.
    target_metric_name: str | None = Field(default=None, max_length=80)
    target_direction: str | None = None
    target_metric_source: str | None = None


class ActionCreateResult(BaseModel):
    created: list[ActionItemOut] = Field(default_factory=list)
    existing: list[ActionItemOut] = Field(default_factory=list)


class ActionOverview(BaseModel):
    total: int = 0
    pending: int = 0
    completed: int = 0
    cancelled: int = 0
    verified: int = 0  # actions linked to at least one verification run
    # M2.14.0 additive counters (computed by code, never by AI).
    executed: int = 0  # actions with at least one execution record
    observed: int = 0  # actions with at least one observation
    aligned: int = 0
    not_aligned: int = 0
    unable_to_verify: int = 0


class ExecutionCreate(BaseModel):
    kind: str = Field(default="execution", pattern="^(execution|note)$")
    note: str | None = Field(default=None, max_length=1000)
    evidence: str | None = Field(default=None, max_length=2000)
    client_key: str | None = Field(default=None, max_length=120)
    # Optional user-declared state applied in the same request; defaults to
    # leaving the action status untouched. Never derived by AI.
    status: str | None = None


class ExecutionOut(BaseModel):
    id: int
    action_id: int
    project_id: int
    kind: str
    note: str | None = None
    evidence: str | None = None
    status_snapshot: str | None = None
    client_key: str
    created_at: datetime | None = None


class ObservationOut(BaseModel):
    id: int
    action_id: int
    verification_run_id: int
    metric_name: str
    before_value: float | int | None = None
    after_value: float | int | None = None
    absolute_delta: float | int | None = None
    percent_delta: float | int | None = None
    direction: str | None = None
    expected_direction: str | None = None
    alignment: str
    executed: bool = False
    reason: str | None = None
    source: str = "verification_metrics"
    engine_version: str = "action_observation_v1"
    created_at: datetime | None = None
