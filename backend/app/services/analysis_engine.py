from app.providers.base import BaseAIProvider
from app.schemas.analysis import AnalysisRequest, AnalysisResponse


class AnalysisEngine:
    """Orchestration layer between data pipeline and AI providers.

    Responsibilities:
    1. Receive semantic dataset + analysis parameters
    2. Validate input completeness
    3. Build provider-independent request
    4. Dispatch to configured AI provider
    5. Return provider-independent response

    The engine never imports concrete providers (DeepSeek, OpenAI, etc.).
    Providers are injected via set_provider().
    """

    def __init__(self, provider: BaseAIProvider | None = None):
        self._provider = provider

    def set_provider(self, provider: BaseAIProvider) -> None:
        """Inject an AI provider at runtime."""
        self._provider = provider

    @property
    def has_provider(self) -> bool:
        return self._provider is not None

    @staticmethod
    def build_request(
        *,
        workbook_name: str,
        sheet_name: str,
        headers: list[str],
        column_types: dict[str, str],
        rows: list[list],
        analysis_type: str = "summary",
        plugin_name: str = "generic",
        language: str = "zh",
        parameters: dict | None = None,
    ) -> AnalysisRequest:
        """Build a validated analysis request from raw inputs.

        This is the single entry point for constructing requests.
        Plugins call this method with their data.
        """
        if not rows:
            raise ValueError("rows must not be empty")
        if not headers:
            raise ValueError("headers must not be empty")

        return AnalysisRequest(
            workbook_name=workbook_name,
            sheet_name=sheet_name,
            headers=headers,
            column_types=column_types,
            rows=rows,
            analysis_type=analysis_type,
            plugin_name=plugin_name,
            language=language,
            parameters=parameters or {},
        )

    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        """Execute analysis via the configured provider.

        Raises:
            RuntimeError: If no provider is configured.
        """
        if not self._provider:
            raise RuntimeError(
                "No AI provider configured. Call set_provider() before analyze()."
            )
        return await self._provider.analyze(request)


# Global engine instance (provider injected at startup)
engine = AnalysisEngine()