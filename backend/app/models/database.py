"""Modelos do banco e configuracao do SQLAlchemy."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    pass


class Analysis(Base):
    """Representa cada processamento de modelagem de ameacas salvo no banco."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_filename = Column(String(255), nullable=False)
    image_path = Column(String(500), nullable=False)
    status = Column(String(50), default="pending")  # pending | processing | done | error
    diagram_json = Column(JSON, nullable=True)       # Saida da Etapa 1 (Vision).
    stride_json = Column(JSON, nullable=True)        # Saida da Etapa 2 (STRIDE).
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


# Engine e fabrica de sessao assincorna.
engine = create_async_engine(settings.database_url, echo=settings.debug)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Executa o metodo init_db."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Executa o metodo get_session."""
    async with async_session() as session:
        yield session
