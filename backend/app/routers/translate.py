"""
AgriVision AI — Translation Router
=====================================
GET /translate — Text translation and language support.
"""

from fastapi import APIRouter, Query
from app.services.translation_service import translate, get_all_translations, get_supported_languages

router = APIRouter(prefix="/translate", tags=["Translation"])


@router.get("")
async def translate_text(
    text: str = Query(...),
    lang: str = Query("en"),
):
    """Translate a text key to the target language."""
    return {"original": text, "translated": translate(text, lang), "language": lang}


@router.get("/all")
async def all_translations(lang: str = Query("en")):
    """Get all UI translations for a language."""
    return {"language": lang, "translations": get_all_translations(lang)}


@router.get("/languages")
async def supported_languages():
    """List supported languages."""
    return {"languages": get_supported_languages()}
