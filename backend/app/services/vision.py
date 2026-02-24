"""Servico Vision - Estagio 1: extrai componentes, grupos e fluxos de uma imagem de diagrama com OpenAI GPT-4o Vision."""

import base64
import json
import logging
from pathlib import Path

import httpx
from openai import AsyncOpenAI
from PIL import Image

from app.config import settings
from app.models.schemas import DiagramAnalysis

logger = logging.getLogger(__name__)

# Carrega o prompt de sistema uma vez no nivel de modulo.
_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
_VISION_SYSTEM_PROMPT = (_PROMPT_DIR / "vision_system.md").read_text(encoding="utf-8")


def _encode_image(image_path: str) -> str:
    """Executa o metodo _encode_image."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _normalize_for_vision(image_path: str) -> tuple[str, str]:
    """Executa o metodo _normalize_for_vision."""
    ext = Path(image_path).suffix.lower()
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        return image_path, _detect_media_type(image_path)

    # Converte formatos menos comuns (ex.: BMP) para PNG ao lado do arquivo original.
    normalized_path = str(Path(image_path).with_suffix(".normalized.png"))
    with Image.open(image_path) as img:
        img.convert("RGB").save(normalized_path, format="PNG")
    return normalized_path, "image/png"


def _detect_media_type(image_path: str) -> str:
    """Executa o metodo _detect_media_type."""
    ext = Path(image_path).suffix.lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "image/png")


async def extract_diagram(image_path: str) -> DiagramAnalysis:
    """Executa o metodo extract_diagram."""
    send_path, media_type = _normalize_for_vision(image_path)
    image_b64 = _encode_image(send_path)

    logger.info("Enviando imagem para OpenAI Vision: %s", send_path)

    async with httpx.AsyncClient(trust_env=False) as http_client:
        client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            http_client=http_client,
        )
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": _VISION_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analise este diagrama de arquitetura e extraia todos os componentes, "
                                "grupos/fronteiras e fluxos/conexoes. Retorne SOMENTE JSON. "
                                "Escreva o campo context_summary em portugues (pt-BR)."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}",
                                "detail": "high",
                            },
                        },
                    ],
                },
            ],
            temperature=0.1,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )

    raw = response.choices[0].message.content
    logger.info("Tamanho bruto da resposta Vision: %d caracteres", len(raw))

    data = json.loads(raw)
    result = DiagramAnalysis.model_validate(data)
    logger.info(
        "Extraidos %d componentes, %d grupos, %d fluxos",
        len(result.components),
        len(result.groups),
        len(result.flows),
    )
    return result
