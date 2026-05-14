from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_model: str = Field(
        default="llama-3.1-8b-instant",
        validation_alias=AliasChoices("GROQ_MODEL", "MODEL_NAME")
    )
    groq_context_model: str = "llama-3.3-70b-versatile"
    ai_request_timeout_seconds: int = Field(default=12, validation_alias="AI_REQUEST_TIMEOUT_SECONDS")
    database_url: str = "sqlite:///./test.db"
    frontend_origin: str = "http://localhost:5173"
    frontend_origins: str = Field(
        default="",
        validation_alias=AliasChoices("FRONTEND_ORIGINS", "FRONTEND_ORIGIN_LIST")
    )

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
