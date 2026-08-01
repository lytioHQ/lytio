from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    """Provider-independent analysis request.

    Every AI provider receives this exact format.
    No provider-specific fields allowed.
    """

    workbook_name: str = Field(description="Original or saved workbook name")
    sheet_name: str = Field(description="Target worksheet name")
    headers: list[str] = Field(description="Column header names")
    column_types: dict[str, str] = Field(description="Column name → detected type mapping")
    rows: list[list] = Field(description="Data rows as list of lists")
    analysis_type: str = Field(description="Analysis type: trend, ranking, forecast, summary, custom")
    plugin_name: str = Field(default="generic", description="Plugin identifier: sales, finance, etc.")
    language: str = Field(default="zh", description="Response language code")
    parameters: dict = Field(default_factory=dict, description="Optional analysis parameters")


class AnalysisResponse(BaseModel):
    """Provider-independent analysis response.

    Every AI provider must return this exact format.
    No provider-specific fields allowed.
    """

    summary: str = Field(description="Executive summary, 2-3 paragraphs")
    highlights: list[str] = Field(default_factory=list, description="Key positive findings")
    warnings: list[str] = Field(default_factory=list, description="Issues or risks detected")
    recommendations: list[str] = Field(default_factory=list, description="Actionable suggestions")
    metadata: dict = Field(default_factory=dict, description="Provider metadata: model, tokens, latency")
    confidence: float | None = Field(default=None, ge=0, le=1, description="0-1 confidence score if provider supports it")