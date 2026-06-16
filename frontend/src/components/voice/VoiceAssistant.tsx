import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { speechService } from '../../services/speechService';
import { useTranslation } from '../../hooks/useTranslation';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export const VoiceAssistant: React.FC = () => {
  const { t, lang } = useTranslation();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'assistant', text: 'Namaste! I am your AgriVision crop assistant. How can I help you today?' }
  ]);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('audioMuted');
    return saved === 'true';
  });

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    speechService.setMuted(isMuted);
    localStorage.setItem('audioMuted', String(isMuted));
  }, [isMuted]);

  const toggleMute = () => {
    if (isMuted) {
      speechService.setMuted(false);
      setIsMuted(false);
    } else {
      speechService.stopSpeaking();
      speechService.setMuted(true);
      setIsMuted(true);
    }
  };

  const handleStartListening = () => {
    setIsListening(true);
    speechService.stopSpeaking();

    speechService.listen(
      lang,
      (resultText) => {
        setIsListening(false);
        if (resultText.trim()) {
          handleUserCommand(resultText);
        }
      },
      (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    );
  };

  const handleUserCommand = async (command: string) => {
    // Add user message to log
    setMessages((prev) => [...prev, { sender: 'user', text: command }]);

    // Query voice backend or run local matching rule
    let responseText = '';
    const cmdLower = command.toLowerCase();

    if (cmdLower.includes('spots') || cmdLower.includes('yellow') || cmdLower.includes('brown')) {
      responseText = 'Please capture or upload a clear leaf image of your crop. I will analyze the symptoms and give treatment recommendations.';
    } else if (cmdLower.includes('pesticide') || cmdLower.includes('spray') || cmdLower.includes('chemical')) {
      responseText = 'I recommend using Carbendazim 50% WP (1g per Litre) or Mancozeb 75% WP (2.5g per Litre) for fungal infections. Please upload an image to confirm.';
    } else if (cmdLower.includes('organic') || cmdLower.includes('neem')) {
      responseText = 'You can prepare an organic neem oil spray: Mix 5ml neem oil + 1ml liquid soap in 1L water. Spray early mornings.';
    } else if (cmdLower.includes('weather') || cmdLower.includes('rain')) {
      responseText = 'Let me check weather conditions. If rain is expected within 24 hours, you should delay spraying pesticide.';
    } else {
      responseText = 'I can help you identify crop diseases, recommend chemical treatments, or provide organic remedies. Please show me a picture or ask a specific question.';
    }

    // Add assistant response to log
    setMessages((prev) => [...prev, { sender: 'assistant', text: responseText }]);

    // Speak out response
    speechService.speak(responseText, lang);
  };

  return (
    <Card title={t('voice_assistant')} className="flex flex-col h-[400px] justify-between">
      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 my-2 scrollbar">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 max-w-[85%] ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div
              className={`p-3 rounded-2xl text-xs leading-normal shadow-sm ${
                m.sender === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-tl-none'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Controls */}
      <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col items-center gap-3">
        {!speechSupported && (
          <p className="text-[10px] text-rose-500 font-bold text-center">
            Speech recognition not supported in this browser. Use typing interface instead.
          </p>
        )}

        <div className="flex items-center gap-4 w-full">
          <Button
            variant={isListening ? 'danger' : 'primary'}
            fullWidth
            onClick={isListening ? () => setIsListening(false) : handleStartListening}
            disabled={!speechSupported}
            icon={isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
          >
            {isListening ? t('assistant_listening') : t('speak_now')}
          </Button>

          <Button
            variant="secondary"
            onClick={toggleMute}
            title={isMuted ? 'Enable audio' : 'Disable audio'}
            className={isMuted ? 'bg-gray-200 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400' : ''}
            icon={isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </Button>
        </div>
      </div>
    </Card>
  );
};
