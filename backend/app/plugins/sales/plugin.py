"""Sales Analysis Plugin — orchestrates detection → prompt → analysis → parsing."""

from app.plugins.sales.detector import DetectionResult, detect
from app.plugins.sales.parser import SalesAnalysisResult, parse
from app.plugins.sales.prompt_builder import build
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_engine import AnalysisEngine


class SalesPlugin:
    """First industry plugin: Sales Analysis."""

    name = "sales"

    def detect(self, headers: list[str], column_types: dict[str, str]) -> DetectionResult:
        """Check if dataset is suitable for sales analysis."""
        return detect(headers, column_types)

    def build_prompt(self, *, sheet_name: str, headers: list[str],
                     column_types: dict[str, str], rows: list[list],
                     language: str = "zh") -> str:
        """Generate a sales-specific analysis prompt."""
        return build(
            sheet_name=sheet_name,
            headers=headers,
            column_types=column_types,
            rows=rows,
            language=language,
        )

    async def analyze(self, engine: AnalysisEngine, *,
                      workbook_name: str, sheet_name: str,
                      headers: list[str], column_types: dict[str, str],
                      rows: list[list], language: str = "zh") -> SalesAnalysisResult:
        """Full pipeline: detect → build request → analyze → parse.

        Args:
            engine: AnalysisEngine with provider already set.
            workbook_name, sheet_name, headers, column_types, rows:
                Dataset from the canonical extraction pipeline.
            language: Response language.

        Returns:
            Structured sales analysis result.

        Raises:
            ValueError: If dataset is not suitable for sales analysis.
        """
        detection = self.detect(headers, column_types)
        if not detection.supported:
            raise ValueError(detection.reason)

        request = AnalysisEngine.build_request(
            workbook_name=workbook_name,
            sheet_name=sheet_name,
            headers=headers,
            column_types=column_types,
            rows=rows,
            analysis_type="sales_overview",
            plugin_name="sales",
            language=language,
            parameters={"detection_confidence": detection.confidence},
        )

        response = await engine.analyze(request)

        return parse(
            response_summary=response.summary,
            response_highlights=response.highlights,
            response_warnings=response.warnings,
            response_recommendations=response.recommendations,
            metadata=response.metadata,
        )
