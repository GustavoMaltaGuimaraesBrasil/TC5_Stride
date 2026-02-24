"""Voice service: OpenAI TTS + transcription (pt-BR)."""

from __future__ import annotations

import base64
import logging

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_BASE_URL = "https://api.openai.com/v1"
TRANSCRIBE_PRIMARY = "gpt-4o-mini-transcribe"
TRANSCRIBE_FALLBACK = "whisper-1"
TTS_MODEL = "tts-1-hd"
TTS_VOICE = "shimmer"
TTS_SPEED = 1.1
TTS_FORMAT = "mp3"
TRANSCRIBE_LANGUAGE = "pt"
TRANSCRIBE_TEMPERATURE = "0.0"
TRANSCRIBE_PROMPT = (
    "Transcreva com alta fidelidade em pt-BR, mantendo termos tecnicos de seguranca "
    "e infraestrutura. Corrija apenas pontuacao essencial sem alterar significado."
)


def _auth_headers() -> dict[str, str]:
    if not settings.openai_api_key:
        raise HTTPException(500, "OPENAI_API_KEY nao configurada no backend.")
    return {"Authorization": f"Bearer {settings.openai_api_key}"}


async def synthesize_speech(text: str) -> str:
    payload = {
        "model": TTS_MODEL,
        "voice": TTS_VOICE,
        "speed": TTS_SPEED,
        "input": text.strip(),
        "response_format": TTS_FORMAT,
    }
    if not payload["input"]:
        raise HTTPException(400, "Texto vazio para sintese de voz.")

    async with httpx.AsyncClient(base_url=OPENAI_BASE_URL, timeout=90.0, trust_env=False) as client:
        response = await client.post("/audio/speech", headers=_auth_headers(), json=payload)

    if response.status_code >= 400:
        logger.error("Falha TTS OpenAI: status=%s", response.status_code)
        raise HTTPException(502, "Falha ao sintetizar audio no provedor de voz.")

    return base64.b64encode(response.content).decode("utf-8")


def _can_fallback_transcription(status_code: int, body: str) -> bool:
    if status_code in {429, 500, 502, 503, 504}:
        return True
    lower = body.lower()
    markers = [
        "model",
        "unavailable",
        "not found",
        "does not exist",
        "unsupported",
        "temporarily",
        "overloaded",
    ]
    return status_code in {400, 404} and any(m in lower for m in markers)


async def transcribe_audio(audio_bytes: bytes, filename: str, content_type: str | None) -> tuple[str, str]:
    content_type = content_type or "application/octet-stream"
    model_candidates = [TRANSCRIBE_PRIMARY, TRANSCRIBE_FALLBACK]

    async with httpx.AsyncClient(base_url=OPENAI_BASE_URL, timeout=180.0, trust_env=False) as client:
        for index, model in enumerate(model_candidates):
            files = {"file": (filename or "audio.wav", audio_bytes, content_type)}
            data = {
                "model": model,
                "language": TRANSCRIBE_LANGUAGE,
                "temperature": TRANSCRIBE_TEMPERATURE,
                "prompt": TRANSCRIBE_PROMPT,
            }
            response = await client.post("/audio/transcriptions", headers=_auth_headers(), files=files, data=data)

            if response.status_code < 400:
                payload = response.json()
                text = str(payload.get("text", "")).strip()
                if not text:
                    raise HTTPException(502, "Transcricao vazia retornada pelo provedor de voz.")
                return text, model

            body = response.text[:1000]
            if index == 0 and _can_fallback_transcription(response.status_code, body):
                logger.warning("Transcricao fallback ativado para whisper-1")
                continue

            logger.error("Falha transcricao OpenAI: status=%s", response.status_code)
            raise HTTPException(502, "Falha ao transcrever audio no provedor de voz.")

    raise HTTPException(502, "Falha ao transcrever audio no provedor de voz.")
