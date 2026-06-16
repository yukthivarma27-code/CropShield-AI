/**
 * Web Speech API wrapper for speech-to-text (STT) and text-to-speech (TTS)
 */

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
    };
  };
}

export class SpeechService {
  private recognition: any = null;
  private _muted = false;

  constructor() {
    // Initialize SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  /**
   * TTS: Speak the provided text using Web Speech API synthesis
   */
  speak(text: string, lang = 'en') {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    // Cancel current speaking
    window.speechSynthesis.cancel();

    if (this._muted) return;

    const utterance = new SpeechSynthesisUtterance(text);

    // Try to map language codes
    const voices = window.speechSynthesis.getVoices();
    const langMap: Record<string, string> = {
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN'
    };
    utterance.lang = langMap[lang] || 'en-US';

    // Find a matching voice if possible
    const matchingVoice = voices.find(voice => voice.lang.startsWith(lang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * STT: Listen for user input
   */
  listen(lang = 'en', onResult: (text: string) => void, onError?: (err: string) => void): () => void {
    if (!this.recognition) {
      if (onError) onError('Speech recognition not supported in this browser.');
      return () => {};
    }

    const langMap: Record<string, string> = {
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      kn: 'kn-IN'
    };
    this.recognition.lang = langMap[lang] || 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const resultText = event.results[0][0].transcript;
      onResult(resultText);
    };

    this.recognition.onerror = (event: any) => {
      if (onError) onError(event.error);
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.error(err);
    }

    // Return function to stop listening
    return () => {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
    };
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
