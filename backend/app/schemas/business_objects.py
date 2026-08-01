"""Structured Business Objects 鈥?the platform''s universal data vocabulary.

These objects replace raw markdown output. AI returns JSON that
deserializes into these typed models. Frontend renders from objects,
never from markdown parsing.
"""

from pydantic import BaseModel, Field


class Evidence(BaseModel):
    """Optional evidence explaining why the AI reached a conclusion."""
    source_sheet: str = ""
    source_range: str = ""
    source_columns: list[str] = Field(default_factory=list)
    source_rows: str = ""
    reason: str = ""
    confidence: str = ""  # high, medium, low


class BusinessHealth(BaseModel):
    score: int = Field(..., ge=0, le=100, description="0-100 health score")
    level: str = Field(..., description="Excellent/Good/Fair/Concerning/Critical")
    summary: str = Field(..., description="One-line health assessment")


class Metric(BaseModel):
    id: str | None = None  # stable fingerprint for lifecycle tracking
    name: str
    value: str
    trend: str = "stable"  # up, down, stable


class Insight(BaseModel):
    id: str | None = None  # stable fingerprint for lifecycle tracking
    title: str
    description: str
    confidence: str = "medium"  # high, medium, low
    evidence: Evidence | None = None


class Risk(BaseModel):
    id: str | None = None  # stable fingerprint for lifecycle tracking
    title: str
    description: str
    severity: str = "medium"  # critical, high, medium, low
    evidence: Evidence | None = None


class ExpectedImpact(BaseModel):
    """Optional estimated impact of following a recommendation."""
    business_health_change: str = ""  # e.g. "+4", "-2"
    risk_change: str = ""             # e.g. "Reduced", "Mitigated"
    expected_result: str = ""         # e.g. "Revenue stabilizes within 2 quarters"
    confidence: str = ""              # high, medium, low


class Recommendation(BaseModel):
    id: str | None = None  # stable fingerprint for lifecycle tracking
    title: str
    description: str
    priority: str = "medium"  # high, medium, low
    evidence: Evidence | None = None
    expected_impact: ExpectedImpact | None = None


class ExecutiveSummary(BaseModel):
    content: str


class AnalysisResult(BaseModel):
    business_health: BusinessHealth | None = None
    metrics: list[Metric] = Field(default_factory=list)
    insights: list[Insight] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)
    executive_summary: ExecutiveSummary | None = None

    @property
    def is_legacy(self) -> bool:
        """True if this result was parsed from legacy markdown format."""
        return self.business_health is None and self.executive_summary is None


def make_legacy_result(summary: str, highlights: list[str], warnings: list[str], recs: list[str]) -> AnalysisResult:
    """Convert legacy markdown output to AnalysisResult for backward compat."""
    return AnalysisResult(
        insights=[Insight(title=h, description=h) for h in highlights],
        risks=[Risk(title=w, description=w) for w in warnings],
        recommendations=[Recommendation(title=r, description=r) for r in recs],
        executive_summary=ExecutiveSummary(content=summary),
    )