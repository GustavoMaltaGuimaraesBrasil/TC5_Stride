"""Ponto de entrada da aplicacao FastAPI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.database import init_db
from app.routers import analysis, health, voice


def create_app() -> FastAPI:
    """Executa o metodo create_app."""
    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # Configura CORS para permitir chamadas do frontend.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Registra os roteadores da API.
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(analysis.router, prefix="/api", tags=["analysis"])
    app.include_router(voice.router, prefix="/api", tags=["voice"])

    @app.on_event("startup")
    async def startup():
        """Executa o metodo startup."""
        await init_db()

    return app


app = create_app()
