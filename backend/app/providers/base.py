from abc import ABC, abstractmethod

from app.schemas.analysis import AnalysisRequest, AnalysisResponse


class BaseAIProvider(ABC):
    """Abstract interface for AI providers.

    Providers: DeepSeek, OpenAI, Claude, etc.
    The engine never imports concrete providers directly.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        """Send analysis request to the AI provider."""
        ...