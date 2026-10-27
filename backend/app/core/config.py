import json
import os
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings configured via environment variables or .env file.
    """
    # Project Info
    PROJECT_NAME: str = "HackFlow Backend API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ENABLE_DEMO_DATA: bool = False

    @property
    def demo_enabled(self) -> bool:
        return self.ENABLE_DEMO_DATA and self.ENVIRONMENT in {"development", "test"}


    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    return [str(o).strip().rstrip("/") for o in parsed if str(o).strip()]
                except Exception:
                    pass
            return [origin.strip().rstrip("/") for origin in v.split(",") if origin.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(o).strip().rstrip("/") for o in v if str(o).strip()]
        return []

    # Database Configuration (Supabase PostgreSQL / Local)
    DATABASE_URL: str = "sqlite+aiosqlite:///./hackflow.db"

    @property
    def async_database_url(self) -> str:
        """
        Ensure the database URL uses the asyncpg driver for async SQLAlchemy.
        Converts 'postgresql://' or 'postgres://' to 'postgresql+asyncpg://'.
        Keeps the configured database target; connection failures must remain visible.
        """
        url = (self.DATABASE_URL or "").strip()
        if not url or url == "sqlite":
            return "sqlite+aiosqlite:///./hackflow.db"
        if "@db." in url and ".supabase.co" in url and (
            os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_SERVICE_ID")
        ):
            return "sqlite+aiosqlite:///./hackflow.db"
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if "?" in url and url.startswith("postgresql+asyncpg://"):
            base, query = url.split("?", 1)
            kept = [
                p for p in query.split("&")
                if not p.startswith("pgbouncer=") and not p.startswith("sslmode=")
            ]
            url = f"{base}?{'&'.join(kept)}" if kept else base
        return url

    # Security & JWT Token
    SECRET_KEY: str = "hackflow9-super-secret-key-development-minimum-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # GitHub OAuth Settings (for HF-19) & GitHub REST API Settings (for HF-33)
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:5173/auth/callback"
    GITHUB_API_TOKEN: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Cached instance of application settings.
    """
    return Settings()


settings = get_settings()
