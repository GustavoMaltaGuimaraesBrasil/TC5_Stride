"""Voice endpoints: speech synthesis and transcription."""

from fastapi import APIRouter, File, UploadFile

from app.models.schemas import TTSSpeechRequest, TTSSpeechResponse, TranscriptionResponse
from app.services import voice

router = APIRouter()


@router.post("/audio/speech", response_model=TTSSpeechResponse)
async def tts_speech(payload: TTSSpeechRequest):
    audio_b64 = await voice.synthesize_speech(payload.text)
    return TTSSpeechResponse(audioBase64=audio_b64, format="mp3")


@router.post("/audio/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)):
    audio_bytes = await file.read()
    text, model_used = await voice.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.wav",
        content_type=file.content_type,
    )
    return TranscriptionResponse(text=text, model_used=model_used)
