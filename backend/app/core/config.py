"""Application settings via Pydantic BaseSettings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Study Companion API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/study_companion"
    USE_MOCK_DATA: bool = True  # Set False when DB is ready

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
