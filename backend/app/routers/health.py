"""Endpoint de verificacao de saude."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Executa o metodo health_check."""
    return {"status": "ok", "service": "stride-threat-modeler"}
