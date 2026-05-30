from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(default="postgresql+psycopg://aigrowthcopilot:aigrowthcopilot@localhost:5432/aigrowthcopilot", alias="DATABASE_URL")

    s3_endpoint: str = Field(default="http://localhost:9000", alias="S3_ENDPOINT")
    public_s3_base_url: str = Field(default="http://localhost:9000", alias="PUBLIC_S3_BASE_URL")
    s3_access_key: str = Field(default="minioadmin", alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", alias="S3_SECRET_KEY")
    s3_bucket: str = Field(default="aigrowthcopilot", alias="S3_BUCKET")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    api_key_salt: str = Field(default="devsalt", alias="API_KEY_SALT")
    seed_demo: bool = Field(default=False, alias="SEED_DEMO")
    demo_api_key: str | None = Field(default=None, alias="DEMO_API_KEY")

    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")

    progress_poll_ms: int = Field(default=1500, alias="PROGRESS_POLL_MS")
    pixverse_poll_sec: int = Field(default=8, alias="PIXVERSE_POLL_SEC")

    pixverse_workspace_id: str | None = Field(default=None, alias="PIXVERSE_WORKSPACE_ID")

    def cors_origin_list(self) -> list[str]:
        return [v.strip() for v in self.cors_origins.split(",") if v.strip()]

    def openai_base_url_v1(self) -> str:
        base = self.openai_base_url.rstrip("/")
        if base.endswith("/v1"):
            return base
        return f"{base}/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
