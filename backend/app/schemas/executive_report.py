"""Executive Report model — generated from Business Objects, not AI."""

from datetime import datetime
from pydantic import BaseModel, Field
from app.schemas.business_objects import (
    BusinessHealth, ExecutiveSummary, Insight, Metric, Recommendation, Risk,
)


class ExecutiveReport(BaseModel):
    title: str = "Executive Report"
    generated_at: datetime | None = None
    project_name: str = ""
    business_health: BusinessHealth | None = None
    executive_summary: ExecutiveSummary | None = None
    key_metrics: list[Metric] = Field(default_factory=list)
    top_insights: list[Insight] = Field(default_factory=list)
    top_risks: list[Risk] = Field(default_factory=list)
    top_recommendations: list[Recommendation] = Field(default_factory=list)
    is_legacy: bool = False