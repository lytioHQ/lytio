import json
import os
import time
from typing import Any

import httpx

from app.providers.base import BaseAIProvider
from app.schemas.analysis import AnalysisRequest, AnalysisResponse


class DeepSeekProvider(BaseAIProvider):
    """DeepSeek API provider.

    Communicates with the DeepSeek chat completions API.
    Responsibilities: network I/O, retry, response parsing.
    Does NOT build business prompts or know about Excel/plugins.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
        max_retries: int = 2,
    ):
        self._api_key = api_key or os.getenv("DEEPSEEK_API_KEY", "")
        self._base_url = (base_url or os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")).rstrip("/")
        self._model = model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self._timeout = timeout
        self._max_retries = max_retries

        if not self._api_key:
            raise ValueError("DEEPSEEK_API_KEY is required")

    @property
    def name(self) -> str:
        return f"DeepSeek ({self._model})"

    async def analyze(self, request: AnalysisRequest) -> AnalysisResponse:
        system_prompt = self._build_system_prompt(request)
        user_prompt = self._build_user_prompt(request)

        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
        }

        raw_response: dict[str, Any] = {}
        last_error: str = ""
        started_at = time.monotonic()

        for attempt in range(self._max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(
                        f"{self._base_url}/chat/completions",
                        json=payload,
                        headers={
                            "Authorization": f"Bearer {self._api_key}",
                            "Content-Type": "application/json",
                        },
                    )
                    resp.raise_for_status()
                    raw_response = resp.json()
                    break
            except httpx.TimeoutException:
                last_error = "Request timed out"
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    last_error = "Authentication failed — check DEEPSEEK_API_KEY"
                    break  # don't retry auth errors
                last_error = f"API error {e.response.status_code}: {e.response.text[:200]}"
            except Exception as e:
                last_error = str(e)

            if attempt < self._max_retries:
                await _sleep(2 ** attempt)

        latency_ms = int((time.monotonic() - started_at) * 1000)

        if not raw_response:
            return AnalysisResponse(
                summary=f"Analysis failed: {last_error}",
                metadata={"provider": self.name, "error": last_error, "latency_ms": latency_ms},
            )

        return self._parse_response(raw_response, latency_ms)

    # ── private ──────────────────────────────────────────

    def _build_system_prompt(self, request: AnalysisRequest) -> str:
        """Minimal system prompt. No industry knowledge. No business logic."""
        lang = "Chinese" if request.language == "zh" else "English"
        return (
            f"You are a professional data analyst. "
            f"Analyze the provided dataset objectively. "
            f"Respond in {lang}. "
            f"Return your analysis as a JSON object with the following fields: "
            f'"summary" (string, 2-3 paragraphs), '
            f'"highlights" (array of strings, key positive findings), '
            f'"warnings" (array of strings, issues or risks), '
            f'"recommendations" (array of strings, actionable suggestions).'
        )

    def _build_user_prompt(self, request: AnalysisRequest) -> str:
        """Convert AnalysisRequest into a plain-text prompt."""
        column_info = "\n".join(
            f"  - {h} ({request.column_types.get(h, 'unknown')})"
            for h in request.headers
        )
        # Limit data rows to avoid exceeding token limits
        sample_rows = request.rows[:50]
        data_text = "\n".join(
            " | ".join(str(v) for v in row)
            for row in sample_rows
        )

        params = ""
        if request.parameters:
            params = "\nAdditional requirements:\n" + "\n".join(
                f"  - {k}: {v}" for k, v in request.parameters.items()
            )

        return (
            f"Workbook: {request.workbook_name}\n"
            f"Sheet: {request.sheet_name}\n"
            f"Analysis type: {request.analysis_type}\n"
            f"Plugin: {request.plugin_name}\n\n"
            f"Columns ({len(request.headers)}):\n{column_info}\n\n"
            f"Data ({len(sample_rows)} rows):\n{data_text}"
            f"{params}"
        )

    def _parse_response(
        self, raw: dict[str, Any], latency_ms: int
    ) -> AnalysisResponse:
        """Parse DeepSeek API response into AnalysisResponse."""
        try:
            content = raw["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            return AnalysisResponse(
                summary="Unexpected API response format.",
                metadata={"provider": self.name, "latency_ms": latency_ms},
            )

        usage = raw.get("usage", {})
        metadata = {
            "provider": self.name,
            "model": raw.get("model", self._model),
            "latency_ms": latency_ms,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
        }

        # Try to parse as JSON
        try:
            data = json.loads(content)
            return AnalysisResponse(
                summary=data.get("summary", content),
                highlights=data.get("highlights", []),
                warnings=data.get("warnings", []),
                recommendations=data.get("recommendations", []),
                metadata=metadata,
            )
        except (json.JSONDecodeError, TypeError):
            pass

        # Fallback: plain text → put everything in summary
        return AnalysisResponse(
            summary=content,
            metadata=metadata,
        )


async def _sleep(seconds: float) -> None:
    """Async sleep helper (avoids importing asyncio at module level)."""
    import asyncio
    await asyncio.sleep(seconds)