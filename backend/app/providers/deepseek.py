import json
import logging
import os
import time
from typing import Any

import httpx

from app.providers.base import BaseAIProvider
from app.schemas.analysis import AnalysisRequest, AnalysisResponse

logger = logging.getLogger(__name__)


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
        max_retries: int = 0,
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
            "max_tokens": 16384,
        }

        raw_response: dict[str, Any] = {}
        last_error: str = ""
        started_at = time.monotonic()

        for attempt in range(self._max_retries + 1):
            attempt_started_at = time.monotonic()
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
                    elapsed_ms = int((time.monotonic() - attempt_started_at) * 1000)
                    logger.info(
                        "deepseek_attempt_success",
                        extra={
                            "event": "deepseek_attempt",
                            "attempt": attempt,
                            "elapsed_ms": elapsed_ms,
                            "status": "success",
                        },
                    )
                    break
            except httpx.TimeoutException:
                elapsed_ms = int((time.monotonic() - attempt_started_at) * 1000)
                logger.warning(
                    "deepseek_attempt_timeout",
                    extra={
                        "event": "deepseek_attempt",
                        "attempt": attempt,
                        "elapsed_ms": elapsed_ms,
                        "status": "timeout",
                    },
                )
                raise TimeoutError(f"DeepSeek provider request timed out after {self._timeout:.0f}s")
            except httpx.HTTPStatusError as e:
                elapsed_ms = int((time.monotonic() - attempt_started_at) * 1000)
                status_code = e.response.status_code
                logger.warning(
                    "deepseek_attempt_http_error",
                    extra={
                        "event": "deepseek_attempt",
                        "attempt": attempt,
                        "elapsed_ms": elapsed_ms,
                        "status": "http_error",
                        "http_status": status_code,
                    },
                )
                if status_code == 401:
                    last_error = "Authentication failed — check DEEPSEEK_API_KEY"
                    break  # don't retry auth errors
                last_error = f"API error {status_code}"
            except Exception as e:
                elapsed_ms = int((time.monotonic() - attempt_started_at) * 1000)
                logger.warning(
                    "deepseek_attempt_exception",
                    extra={
                        "event": "deepseek_attempt",
                        "attempt": attempt,
                        "elapsed_ms": elapsed_ms,
                        "status": "exception",
                        "exception_type": type(e).__name__,
                    },
                )
                last_error = type(e).__name__

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
        """Use the plugin-supplied system prompt when provided, else a minimal generic one.

        The provider stays industry-agnostic: it simply honors an injected
        business prompt (e.g. the Sales V2 prompt) carried on the request.
        """
        if isinstance(request.parameters, dict):
            injected = request.parameters.get("system_prompt")
            if injected and isinstance(injected, str) and injected.strip():
                return injected
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
            extra = {k: v for k, v in request.parameters.items() if k != "system_prompt"}
            if extra:
                params = "\nAdditional requirements:\n" + "\n".join(
                    f"  - {k}: {v}" for k, v in extra.items()
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

        if not content or not content.strip():
            return AnalysisResponse(
                summary="Analysis failed: the model returned an empty response (output limit reached).",
                metadata={"provider": self.name, "error": "empty response", "latency_ms": latency_ms},
            )

        # Try to parse as JSON
        try:
            data = json.loads(content)
            if isinstance(data, dict) and "summary" in data:
                # Legacy provider-level shape: extract flat fields.
                return AnalysisResponse(
                    summary=data.get("summary", content),
                    highlights=data.get("highlights", []),
                    warnings=data.get("warnings", []),
                    recommendations=data.get("recommendations", []),
                    metadata=metadata,
                )
            if isinstance(data, (dict, list)):
                # Structured Business-Objects result: pass the raw JSON through
                # so the plugin parser can build a typed AnalysisResult.
                return AnalysisResponse(summary=content, metadata=metadata)
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