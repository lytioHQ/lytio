from pydantic import BaseModel, Field


class ComputedMetric(BaseModel):
    metric_name: str
    value: float | str | dict | None = None
    formula: str = ""
    source_columns: list[str] = Field(default_factory=list)
    evidence_rows: list[dict] = Field(default_factory=list)
    availability: str = "unavailable"
    confidence: str = "low"
    assumptions: list[str] = Field(default_factory=list)
    note: str = ""


class MetricsResponse(BaseModel):
    project_id: int
    computed_metrics: list[ComputedMetric]
