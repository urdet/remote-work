"""AI provider helpers for SmartPresence screenshot analysis."""

from __future__ import annotations

import ast
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_PROVIDER = "gemini"
DEFAULT_GEMINI_MODEL_NAME = "gemini-2.5-flash-lite"
DEFAULT_GROQ_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"
ENV_FILE_NAME = ".env"


class AnalysisRequestError(RuntimeError):
    """Raised when an AI provider returns an API error."""

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        retry_delay: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retry_delay = retry_delay


class GeminiRequestError(AnalysisRequestError):
    """Raised when Gemini returns an API error."""


class GroqRequestError(AnalysisRequestError):
    """Raised when Groq returns an API error."""


@dataclass(slots=True)
class GeminiConfig:
    """Configuration needed to connect to Gemini."""

    api_key: str | None = None
    model_name: str = DEFAULT_GEMINI_MODEL_NAME
    temperature: float = 0.3
    max_output_tokens: int = 2048


@dataclass(slots=True)
class GroqConfig:
    """Configuration needed to connect to Groq."""

    api_key: str | None = None
    model_name: str = DEFAULT_GROQ_MODEL_NAME
    temperature: float = 0.3
    max_output_tokens: int = 2048


class BaseAnalysisModel:
    """Shared helpers used by all AI providers."""

    @staticmethod
    def load_env_file() -> None:
        search_paths = [Path.cwd(), *Path(__file__).resolve().parents]
        for directory in search_paths:
            env_path = directory / ENV_FILE_NAME
            if env_path.exists():
                BaseAnalysisModel._read_env_file(env_path)
                return

    @staticmethod
    def _read_env_file(env_path: Path) -> None:
        for line in env_path.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("\"'")
            if key and key not in os.environ:
                os.environ[key] = value

    def generate(self, prompt: str) -> str:
        return self.generate_content(prompt)

    def generate_content(self, contents: Any) -> str:
        raise NotImplementedError

    @staticmethod
    def _parse_json_response(response_text: str) -> dict[str, Any]:
        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text.strip("`")
            if cleaned_text.startswith("json"):
                cleaned_text = cleaned_text[4:].strip()

        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            pass

        candidate = BaseAnalysisModel._extract_json_object(cleaned_text)
        if candidate is not None:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                try:
                    parsed = ast.literal_eval(candidate)
                    if isinstance(parsed, dict):
                        return parsed
                except (SyntaxError, ValueError):
                    pass

        salvaged = BaseAnalysisModel._salvage_key_values(cleaned_text)
        if salvaged:
            return salvaged

        raise json.JSONDecodeError("Unable to parse model JSON response", cleaned_text, 0)

    @staticmethod
    def _extract_json_object(response_text: str) -> str | None:
        start = response_text.find("{")
        end = response_text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        return response_text[start : end + 1]

    @staticmethod
    def _salvage_key_values(response_text: str) -> dict[str, Any]:
        payload: dict[str, Any] = {}
        for key in ("employee_pin", "time", "activity", "apps", "details"):
            pattern = rf'["\']?{key}["\']?\s*:\s*(.+?)(?:,\s*(?:["\']?\w+["\']?\s*:)|\s*\}}|$)'
            match = re.search(pattern, response_text, re.IGNORECASE | re.DOTALL)
            if not match:
                continue

            raw_value = match.group(1).strip().rstrip(",")
            if (raw_value.startswith('"') and raw_value.endswith('"')) or (
                raw_value.startswith("'") and raw_value.endswith("'")
            ):
                value: Any = raw_value[1:-1].strip()
            else:
                value = raw_value.strip()
                if key == "employee_pin":
                    try:
                        value = int(value)
                    except ValueError:
                        pass

            payload[key] = value

        return payload


class GeminiAnalysisModel(BaseAnalysisModel):
    """Small wrapper around Gemini for screenshot analysis."""

    def __init__(self, config: GeminiConfig | None = None) -> None:
        self.config = config or GeminiConfig()
        self._client: Any | None = None
        self._types: Any | None = None

    def _api_key(self) -> str | None:
        self.load_env_file()
        return (
            self.config.api_key
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
            or os.getenv("GOOGLE_GENAI_API_KEY")
        )

    def connect(self) -> Any:
        if self._client is not None:
            return self._client

        api_key = self._api_key()
        if not api_key:
            raise ValueError(
                "Gemini API key is missing. Set GEMINI_API_KEY, GOOGLE_API_KEY, "
                "or pass GeminiConfig(api_key=...)."
            )

        try:
            from google import genai
            from google.genai import types
        except ImportError as exc:
            raise ImportError(
                "google-genai is required. Install it with `pip install google-genai`."
            ) from exc

        self._client = genai.Client(api_key=api_key)
        self._types = types
        return self._client

    def generate_content(self, contents: Any) -> str:
        client = self.connect()
        try:
            response = client.models.generate_content(
                model=self.config.model_name,
                contents=contents,
                config=self._types.GenerateContentConfig(
                    temperature=self.config.temperature,
                    max_output_tokens=self.config.max_output_tokens,
                ),
            )
        except Exception as exc:
            if exc.__class__.__module__.startswith("google.genai"):
                raise self._gemini_request_error(exc) from exc
            raise
        return getattr(response, "text", "").strip()

    @staticmethod
    def _gemini_request_error(exc: Exception) -> GeminiRequestError:
        details = getattr(exc, "details", None) or {}
        error = details.get("error", details) if isinstance(details, dict) else {}
        message = getattr(exc, "message", None) or error.get("message") or str(exc)
        status_code = getattr(exc, "code", None)
        retry_delay = None

        for detail in error.get("details", []):
            if detail.get("@type", "").endswith("RetryInfo"):
                retry_delay = detail.get("retryDelay")
                break

        return GeminiRequestError(
            message=message,
            status_code=status_code,
            retry_delay=retry_delay,
        )


class GroqAnalysisModel(BaseAnalysisModel):
    """OpenAI-compatible Groq wrapper for screenshot analysis."""

    def __init__(self, config: GroqConfig | None = None) -> None:
        self.config = config or GroqConfig()
        self._client: Any | None = None

    def _api_key(self) -> str | None:
        self.load_env_file()
        return self.config.api_key or os.getenv("GROQ_API_KEY")

    def connect(self) -> Any:
        if self._client is not None:
            return self._client

        api_key = self._api_key()
        if not api_key:
            raise ValueError(
                "Groq API key is missing. Set GROQ_API_KEY or pass GroqConfig(api_key=...)."
            )

        try:
            from groq import Groq
        except ImportError as exc:
            raise ImportError(
                "groq is required. Install it with `pip install groq`."
            ) from exc

        self._client = Groq(api_key=api_key)
        return self._client

    def generate_content(self, contents: Any) -> str:
        client = self.connect()
        messages = [{"role": "user", "content": contents}]

        try:
            response = client.chat.completions.create(
                model=self.config.model_name,
                messages=messages,
                temperature=self.config.temperature,
                max_completion_tokens=self.config.max_output_tokens,
                response_format={"type": "json_object"},
            )
        except Exception as exc:
            raise self._groq_request_error(exc) from exc

        return response.choices[0].message.content.strip()

    @staticmethod
    def _groq_request_error(exc: Exception) -> GroqRequestError:
        message = str(exc)
        status_code = getattr(exc, "status_code", None)
        if status_code is None:
            response = getattr(exc, "response", None)
            status_code = getattr(response, "status_code", None)
        return GroqRequestError(message=message, status_code=status_code)


def get_analysis_provider() -> str:
    BaseAnalysisModel.load_env_file()
    return os.getenv("ANALYSIS_PROVIDER", DEFAULT_PROVIDER).strip().lower() or DEFAULT_PROVIDER
