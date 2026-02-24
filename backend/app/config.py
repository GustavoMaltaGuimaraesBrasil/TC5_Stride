"""Configuracoes da aplicacao carregadas por variaveis de ambiente."""

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Configuracao da OpenAI.
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Configuracao do banco de dados.
    database_url: str = "sqlite+aiosqlite:///./stride.db"

    # Diretorio de armazenamento de arquivos enviados.
    upload_dir: str = "./uploads"

    # Lista de origens permitidas para CORS.
    cors_origins: list[str] = ["http://localhost:5173"]

    # Metadados da aplicacao.
    app_title: str = "STRIDE Modelador de Amea\u00e7as"
    app_version: str = "2.0.0"
    debug: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()

# Garante que o diretorio de upload exista ao iniciar a aplicacao.
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
