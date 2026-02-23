"""Vision Service — Stage 1: Extract components, groups, and flows from a diagram image using OpenAI GPT-4o Vision."""

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

# Load system prompt once at module level
_PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
_VISION_SYSTEM_PROMPT = (_PROMPT_DIR / "vision_system.md").read_text(encoding="utf-8")


def _encode_image(image_path: str) -> str:
    """Read an image file and return its base64 encoding."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _normalize_for_vision(image_path: str) -> tuple[str, str]:
    """
    Ensure image is in a format compatible with the Vision API payload.
    Returns (path_to_send, media_type).
    """
    ext = Path(image_path).suffix.lower()
    if ext in {".png", ".jpg", ".jpeg", ".gif", ".webp"}:
        return image_path, _detect_media_type(image_path)

    # Convert uncommon formats (e.g. BMP) to PNG alongside the original file.
    normalized_path = str(Path(image_path).with_suffix(".normalized.png"))
    with Image.open(image_path) as img:
        img.convert("RGB").save(normalized_path, format="PNG")
    return normalized_path, "image/png"


def _detect_media_type(image_path: str) -> str:
    """Return the MIME type based on file extension."""
    ext = Path(image_path).suffix.lower()
    return {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }.get(ext, "image/png")


async def extract_diagram(image_path: str) -> DiagramAnalysis:
    """
    Send an architecture diagram image to GPT-4o Vision and get back
    structured JSON with components, groups, and flows.
    """
    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        http_client=httpx.AsyncClient(trust_env=False),
    )

    send_path, media_type = _normalize_for_vision(image_path)
    image_b64 = _encode_image(send_path)

    logger.info("Sending image to OpenAI Vision: %s", send_path)

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
                        "text": "Analyze this architecture diagram. Extract all components, groups/boundaries, and flows/connections. Return ONLY the JSON.",
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
    logger.info("Vision raw response length: %d chars", len(raw))

    data = json.loads(raw)
    result = DiagramAnalysis.model_validate(data)
    logger.info(
        "Extracted %d components, %d groups, %d flows",
        len(result.components),
        len(result.groups),
        len(result.flows),
    )
    return result
