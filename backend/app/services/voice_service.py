"""
AgriVision AI — Voice Service
===============================
Text-to-Speech using gTTS and basic voice command parsing.
"""

import io
import base64
from typing import Dict, Optional


async def text_to_speech(text: str, lang: str = "en") -> str:
    """Convert text to speech audio (base64 encoded MP3)."""
    lang_map = {"en": "en", "te": "te", "hi": "hi", "ta": "ta", "kn": "kn"}
    gtts_lang = lang_map.get(lang, "en")

    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode("utf-8")
        return f"data:audio/mp3;base64,{audio_b64}"
    except Exception as e:
        print(f"[!] TTS error: {e}")
        return ""


def parse_voice_command(text: str) -> Dict:
    """Parse a voice command and determine the intent."""
    text_lower = text.lower().strip()

    # Intent detection with keyword matching
    if any(w in text_lower for w in ["capture", "photo", "camera", "scan", "picture"]):
        return {"intent": "capture", "response": "Please capture a clear image of the affected leaf."}

    if any(w in text_lower for w in ["pesticide", "spray", "chemical", "medicine", "treatment"]):
        return {"intent": "treatment", "response": "I can help with treatment recommendations. Please upload a leaf image first."}

    if any(w in text_lower for w in ["disease", "problem", "spots", "yellow", "brown", "wilting", "infected"]):
        return {"intent": "diagnose", "response": "Please capture or upload a clear image of the affected leaf for diagnosis."}

    if any(w in text_lower for w in ["weather", "rain", "temperature"]):
        return {"intent": "weather", "response": "I'll check the weather conditions for your area."}

    if any(w in text_lower for w in ["organic", "natural", "neem", "home remedy"]):
        return {"intent": "organic_remedy", "response": "I can suggest organic remedies. Please tell me the disease or upload a leaf image."}

    if any(w in text_lower for w in ["history", "previous", "past", "reports"]):
        return {"intent": "history", "response": "Opening your prediction history."}

    return {"intent": "unknown", "response": "I can help you detect crop diseases. Please upload or capture a leaf image to get started."}
