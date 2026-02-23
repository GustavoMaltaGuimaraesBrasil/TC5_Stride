"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Database
    database_url: str = "sqlite+aiosqlite:///./stride.db"

    # File storage
    upload_dir: str = "./uploads"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # App
    app_title: str = "STRIDE Modelador de Ameacas"
    app_version: str = "2.0.0"
    debug: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Ensure upload directory exists
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
