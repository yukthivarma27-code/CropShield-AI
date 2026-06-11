import React, { useState } from 'react';
import { ImageUpload } from '../components/prediction/ImageUpload';
import { CameraCapture } from '../components/prediction/CameraCapture';
import { PredictionCard } from '../components/prediction/PredictionCard';
import { SeverityGauge } from '../components/prediction/SeverityGauge';
import { TreatmentPanel } from '../components/prediction/TreatmentPanel';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { predictCropDisease, getRecommendation, getTTSAudio } from '../services/api';
import { PredictionResult, Recommendation } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { FileDown, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';

interface PredictionPageProps {
  currentResult: PredictionResult | null;
  setCurrentResult: (result: PredictionResult | null) => void;
  state: string;
  district: string;
}

export const PredictionPage: React.FC<PredictionPageProps> = ({
  currentResult,
  setCurrentResult,
  state,
  district
}) => {
  const { t, lang } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>('tomato');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const crops = ['tomato', 'potato', 'rice', 'maize', 'wheat', 'cotton', 'banana', 'mango', 'chili'];

  const handleImageSelected = async (file: File) => {
    setLoading(true);
    setRecommendation(null);
    stopAudio();

    try {
      // Predict
      const result = await predictCropDisease(file, selectedCrop, state, district);
      setCurrentResult(result);

      // Load treatments/remedies for this disease
      const rec = await getRecommendation(result.disease, selectedCrop, state, district);
      setRecommendation(rec);

      // Fetch speech explanation audio
      const audioText = `Diagnosis result shows ${result.disease} with ${result.severity} severity. Please apply ${rec.chemical_treatments[0]?.name || 'recommended treatments'} and practice organic remedies.`;
      const base64Audio = await getTTSAudio(audioText, lang);
      if (base64Audio) {
        setAudioUrl(base64Audio);
      }
    } catch (err) {
      console.error(err);
      alert('Inference failed. Check connection or retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async (base64Data: string) => {
    setLoading(true);
    setRecommendation(null);
    stopAudio();

    try {
      const result = await predictCropDisease(base64Data, selectedCrop, state, district);
      setCurrentResult(result);

      const rec = await getRecommendation(result.disease, selectedCrop, state, district);
      setRecommendation(rec);

      const audioText = `Diagnosis result shows ${result.disease}. Recommended treatments: ${rec.organic_remedies[0]?.name || 'Organic sprays'}.`;
      const base64Audio = await getTTSAudio(audioText, lang);
      if (base64Audio) {
        setAudioUrl(base64Audio);
      }
    } catch (err) {
      console.error(err);
      alert('Camera upload prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioUrl) {
      if (isPlaying && audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        const audio = audioElement || new Audio(audioUrl);
        if (!audioElement) setAudioElement(audio);
        audio.play();
        setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
      }
    } else {
      // Fallback local Web Speech API synthesis
      if (currentResult && recommendation) {
        const audioText = `Diagnosis result: ${currentResult.disease}. Severity is ${currentResult.severity}. Symptoms: ${currentResult.symptoms}`;
        const SpeechSynthesis = window.speechSynthesis;
        if (SpeechSynthesis) {
          if (isPlaying) {
            SpeechSynthesis.cancel();
            setIsPlaying(false);
          } else {
            const utterance = new SpeechSynthesisUtterance(audioText);
            utterance.lang = lang;
            utterance.onend = () => setIsPlaying(false);
            SpeechSynthesis.speak(utterance);
            setIsPlaying(true);
          }
        }
      }
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const downloadPDFReport = () => {
    if (!currentResult) return;

    // Simple mockup PDF/print trigger
    window.print();
  };

  const resetPrediction = () => {
    setCurrentResult(null);
    setRecommendation(null);
    stopAudio();
    setAudioUrl(null);
  };

  return (
    <div className="space-y-4">
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {loading && <LoadingSpinner message={t('loading_prediction')} />}

      {!loading && !currentResult && (
        <div className="space-y-4">
          {/* Crop Selector Card */}
          <Card title={t('crop_select')}>
            <div className="grid grid-cols-3 gap-2">
              {crops.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCrop(c)}
                  className={`py-2 px-1 text-xs font-bold rounded-2xl border transition-all duration-200 capitalize ${
                    selectedCrop === c
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm shadow-primary-500/10'
                      : 'bg-white text-gray-700 border-gray-100 hover:border-gray-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Card>

          {/* Upload and camera selections */}
          <ImageUpload
            onImageSelected={handleImageSelected}
            onCameraClick={() => setShowCamera(true)}
          />
        </div>
      )}

      {!loading && currentResult && (
        <div className="space-y-4">
          {/* Diagnosis Details Card */}
          <PredictionCard result={currentResult} />

          {/* Severity Indicator Card */}
          <SeverityGauge
            level={currentResult.severity}
            percentage={currentResult.severity_percentage}
          />

          {/* Audio explanation player */}
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400">
                {isPlaying ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 animate-bounce" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-50 leading-tight">
                  {isPlaying ? t('stop_audio') : t('explain_audio')}
                </h4>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">Listen in selected language</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handlePlayAudio}
              className="text-xs px-4 py-2 font-bold"
            >
              {isPlaying ? 'Stop' : 'Listen'}
            </Button>
          </Card>

          {/* Treatment & Recommendation List */}
          {recommendation && (
            <TreatmentPanel
              recommendation={recommendation}
              weatherAdvisory={recommendation.weather_advisory}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={resetPrediction}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Scan Again
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={downloadPDFReport}
              icon={<FileDown className="w-4 h-4" />}
            >
              {t('save_report')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
