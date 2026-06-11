"""
AgriVision AI — Voice Router
===============================
GET /voice — Text-to-speech and voice command processing.
"""

from fastapi import APIRouter, Query
from app.services.voice_service import text_to_speech, parse_voice_command

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.get("/tts")
async def voice_tts(
    text: str = Query(...),
    lang: str = Query("en"),
):
    """Convert text to speech audio."""
    audio = await text_to_speech(text, lang)
    return {"text": text, "language": lang, "audio": audio}


@router.get("/command")
async def voice_command(text: str = Query(...)):
    """Parse a voice command and return appropriate response."""
    result = parse_voice_command(text)
    return result
