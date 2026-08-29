"""Pydantic schemas for M2.11 Verification Workflow.

Kept separate from the legacy Sales analysis payload so verification never
accidentally reuses the ordinary re-analysis contract.
"""

from typing import Any

from pydantic import BaseModel, Field

VERIFICATION_PURPOSES: tuple[str, ...] = (
    "verify_recommendation",
    "verify_growth",
    "verify_risk",
    "verify_profit",
    "general_verification",
)

RECOMMENDATION_STATUSES: tuple[str, ...] = (
    "achieved",
    "partially_achieved",
    "not_achieved",
    "unable_to_verify",
)

METRIC_DIRECTIONS: tuple[str, ...] = ("improved", "declined", "unchanged", "unavailable")


class VerificationCreate(BaseModel):
    parent_run_id: int | None = None
    # M2.14.4: purpose is now an optional focus area; the full two-period
    # comparison always runs regardless of the selected focus. The API layer
    # defaults None to "general_verification".
    purpose: str | None = Field(default=None, description="Optional focus area")
    saved_filename: str = Field(..., min_length=1, description="New uploaded workbook filename")
    original_filename: str | None = None
    idempotency_key: str | None = None


class VerificationJobResponse(BaseModel):
    job_id: int
    status: str
    analysis_type: str
    analysis_direction: str
    purpose: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    result_run_id: int | None = None


class MetricChange(BaseModel):
    metric_name: str
    before: Any | None = None
    after: Any | None = None
    absolute_change: Any | None = None
    percentage_change: Any | None = None
    direction: str = "unchanged"
    status: str = "available"  # available | unavailable
    interpretation: str = ""


class RecommendationResult(BaseModel):
    recommendation: str
    status: str = "unable_to_verify"
    evidence: str = ""
    confidence: str = ""
    reason: str = ""


class ExecutionGap(BaseModel):
    issue: str
    reason: str = ""


class ComparisonResult(BaseModel):
    comparison_summary: str = ""
    verdict: str = "unable_to_verify"
    metric_changes: list[MetricChange] = Field(default_factory=list)
    recommendation_results: list[RecommendationResult] = Field(default_factory=list)
    execution_gap: list[ExecutionGap] = Field(default_factory=list)
    confidence: str = ""
    limitations: list[str] = Field(default_factory=list)
    next_actions: list[str] = Field(default_factory=list)
    # M2.13.0: system-computed metric changes and reliability source
    # (ai | ai_retry | computed_fallback). Additive only.
    computed_metric_changes: list[MetricChange] = Field(default_factory=list)
    reliability: str = "ai"


def is_valid_purpose(value: str | None) -> bool:
    return value in VERIFICATION_PURPOSES


def normalize_metric_status(value: Any) -> str:
    """Return `unavailable` for missing metrics, never coercing to a numeric zero."""
    if value is None or value == "":
        return "unavailable"
    return "available"
