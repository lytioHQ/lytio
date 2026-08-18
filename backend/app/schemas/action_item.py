"""Pydantic schemas for M2.12.3 Action Items.

Kept separate from analysis/verification contracts so the Action system can
evolve without touching M2.11 schemas.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

ACTION_STATUSES: tuple[str, ...] = ("pending", "completed", "cancelled")
ACTION_TYPES: tuple[str, ...] = ("recommendation",)

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
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ActionItemUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    owner: str | None = Field(default=None, max_length=200)
    deadline: date | None = None
    status: str | None = None


class ActionCreateResult(BaseModel):
    created: list[ActionItemOut] = Field(default_factory=list)
    existing: list[ActionItemOut] = Field(default_factory=list)


class ActionOverview(BaseModel):
    total: int = 0
    pending: int = 0
    completed: int = 0
    cancelled: int = 0
    verified: int = 0  # actions linked to at least one verification run
