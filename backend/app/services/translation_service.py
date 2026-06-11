"""
AgriVision AI — Translation Service
======================================
Multilingual support for English, Telugu, Hindi, Tamil, Kannada.
Uses a static translations dictionary for offline capability.
"""

from typing import Dict, Optional

# Core translations for the app
TRANSLATIONS = {
    "en": {
        "app_name": "AgriVision AI",
        "home": "Home", "predict": "Predict", "history": "History", "settings": "Settings",
        "upload_image": "Upload Image", "take_photo": "Take Photo", "scan_leaf": "Scan Leaf",
        "disease_detected": "Disease Detected", "confidence": "Confidence", "severity": "Severity",
        "treatments": "Treatments", "organic_remedies": "Organic Remedies",
        "preventive_measures": "Preventive Measures", "weather_advisory": "Weather Advisory",
        "save_report": "Save Report", "healthy": "Your crop is healthy!",
        "low_severity": "Low Severity", "medium_severity": "Medium Severity", "high_severity": "High Severity",
        "chemical_treatment": "Chemical Treatment", "dosage": "Dosage", "spray_interval": "Spray Interval",
        "precautions": "Precautions", "voice_assistant": "Voice Assistant",
        "speak_now": "Speak now...", "listening": "Listening...",
    },
    "te": {
        "app_name": "అగ్రివిజన్ AI",
        "home": "హోమ్", "predict": "గుర్తించు", "history": "చరిత్ర", "settings": "సెట్టింగ్‌లు",
        "upload_image": "చిత్రం అప్‌లోడ్", "take_photo": "ఫోటో తీయండి", "scan_leaf": "ఆకు స్కాన్ చేయండి",
        "disease_detected": "వ్యాధి గుర్తించబడింది", "confidence": "నమ్మకం", "severity": "తీవ్రత",
        "treatments": "చికిత్సలు", "organic_remedies": "సేంద్రీయ మందులు",
        "preventive_measures": "నివారణ చర్యలు", "weather_advisory": "వాతావరణ సలహా",
        "save_report": "నివేదిక సేవ్ చేయండి", "healthy": "మీ పంట ఆరోగ్యంగా ఉంది!",
        "low_severity": "తక్కువ తీవ్రత", "medium_severity": "మధ్యస్థ తీవ్రత", "high_severity": "అధిక తీవ్రత",
        "chemical_treatment": "రసాయన చికిత్స", "dosage": "మోతాదు", "spray_interval": "పిచికారి విరామం",
        "precautions": "జాగ్రత్తలు", "voice_assistant": "వాయిస్ అసిస్టెంట్",
        "speak_now": "ఇప్పుడు మాట్లాడండి...", "listening": "వింటోంది...",
    },
    "hi": {
        "app_name": "एग्रीविज़न AI",
        "home": "होम", "predict": "पहचानें", "history": "इतिहास", "settings": "सेटिंग्स",
        "upload_image": "चित्र अपलोड करें", "take_photo": "फोटो लें", "scan_leaf": "पत्ती स्कैन करें",
        "disease_detected": "रोग का पता चला", "confidence": "विश्वास", "severity": "गंभीरता",
        "treatments": "उपचार", "organic_remedies": "जैविक उपाय",
        "preventive_measures": "निवारक उपाय", "weather_advisory": "मौसम सलाह",
        "save_report": "रिपोर्ट सहेजें", "healthy": "आपकी फसल स्वस्थ है!",
        "low_severity": "कम गंभीरता", "medium_severity": "मध्यम गंभीरता", "high_severity": "उच्च गंभीरता",
        "chemical_treatment": "रासायनिक उपचार", "dosage": "खुराक", "spray_interval": "छिड़काव अंतराल",
        "precautions": "सावधानियां", "voice_assistant": "वॉइस असिस्टेंट",
        "speak_now": "अब बोलें...", "listening": "सुन रहा है...",
    },
    "ta": {
        "app_name": "அக்ரிவிஷன் AI",
        "home": "முகப்பு", "predict": "கணிக்க", "history": "வரலாறு", "settings": "அமைப்புகள்",
        "upload_image": "படம் பதிவேற்றம்", "take_photo": "புகைப்படம் எடு", "scan_leaf": "இலை ஸ்கேன்",
        "disease_detected": "நோய் கண்டறியப்பட்டது", "confidence": "நம்பகத்தன்மை", "severity": "தீவிரம்",
        "treatments": "சிகிச்சைகள்", "organic_remedies": "இயற்கை வைத்தியம்",
        "preventive_measures": "தடுப்பு நடவடிக்கைகள்", "weather_advisory": "வானிலை ஆலோசனை",
        "save_report": "அறிக்கை சேமி", "healthy": "உங்கள் பயிர் ஆரோக்கியமாக உள்ளது!",
        "low_severity": "குறைந்த தீவிரம்", "medium_severity": "நடுத்தர தீவிரம்", "high_severity": "அதிக தீவிரம்",
    },
    "kn": {
        "app_name": "ಅಗ್ರಿವಿಷನ್ AI",
        "home": "ಮುಖಪುಟ", "predict": "ಗುರುತಿಸಿ", "history": "ಇತಿಹಾಸ", "settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
        "upload_image": "ಚಿತ್ರ ಅಪ್‌ಲೋಡ್", "take_photo": "ಫೋಟೋ ತೆಗೆಯಿರಿ", "scan_leaf": "ಎಲೆ ಸ್ಕ್ಯಾನ್",
        "disease_detected": "ರೋಗ ಪತ್ತೆಯಾಗಿದೆ", "confidence": "ವಿಶ್ವಾಸ", "severity": "ತೀವ್ರತೆ",
        "treatments": "ಚಿಕಿತ್ಸೆಗಳು", "organic_remedies": "ಸಾವಯವ ಪರಿಹಾರಗಳು",
        "preventive_measures": "ತಡೆಗಟ್ಟುವ ಕ್ರಮಗಳು", "weather_advisory": "ಹವಾಮಾನ ಸಲಹೆ",
        "save_report": "ವರದಿ ಉಳಿಸಿ", "healthy": "ನಿಮ್ಮ ಬೆಳೆ ಆರೋಗ್ಯಕರವಾಗಿದೆ!",
    },
}


def translate(text: str, target_lang: str) -> str:
    """Translate a key to the target language."""
    if target_lang in TRANSLATIONS and text in TRANSLATIONS[target_lang]:
        return TRANSLATIONS[target_lang][text]
    # Fallback to English
    return TRANSLATIONS.get("en", {}).get(text, text)


def get_all_translations(lang: str) -> Dict[str, str]:
    """Get all translations for a language."""
    return TRANSLATIONS.get(lang, TRANSLATIONS["en"])


def get_supported_languages() -> list:
    """Return list of supported languages."""
    return [
        {"code": "en", "name": "English", "native": "English"},
        {"code": "te", "name": "Telugu", "native": "తెలుగు"},
        {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
        {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
        {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    ]
