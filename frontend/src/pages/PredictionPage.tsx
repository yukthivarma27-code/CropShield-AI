import React, { useState } from 'react';
import { ImageUpload } from '../components/prediction/ImageUpload';
import { CameraCapture } from '../components/prediction/CameraCapture';
import { PredictionCard } from '../components/prediction/PredictionCard';
import { SeverityGauge } from '../components/prediction/SeverityGauge';
import { TreatmentPanel } from '../components/prediction/TreatmentPanel';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { predictCropDisease, getRecommendation, getTTSAudio } from '../services/api';
import { speechService } from '../services/speechService';
import { useTranslation } from '../hooks/useTranslation';
import { PredictionResult, Recommendation } from '../types';
import { Button } from '../components/common/Button';
import { RefreshCw } from 'lucide-react';

interface PredictionPageProps {
  currentResult: PredictionResult | null;
  setCurrentResult: (result: PredictionResult | null) => void;
  state: string;
  district: string;
}

const CROP_OPTIONS = [
  'tomato', 'potato', 'rice', 'maize', 'wheat',
  'cotton', 'banana', 'mango', 'chili'
];

export const PredictionPage: React.FC<PredictionPageProps> = ({
  currentResult,
  setCurrentResult,
  state,
  district
}) => {
  const { t, lang } = useTranslation();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState('tomato');
  const [showCamera, setShowCamera] = useState(false);

  const stopAudio = () => speechService.stopSpeaking();

  const handleImageSelected = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setPreviewImage(imageUrl);

    setLoading(true);
    setRecommendation(null);
    stopAudio();

    try {
      const result = await predictCropDisease(file, selectedCrop, state, district);
      setCurrentResult(result);

      const rec = await getRecommendation(result.disease, selectedCrop, state, district);
      setRecommendation(rec);

      const audioText = `Diagnosis result shows ${result.disease} with ${result.severity} severity.`;
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
    setPreviewImage(base64Data);

    setLoading(true);
    setRecommendation(null);
    stopAudio();

    try {
      const result = await predictCropDisease(base64Data, selectedCrop, state, district);
      setCurrentResult(result);

      const rec = await getRecommendation(result.disease, selectedCrop, state, district);
      setRecommendation(rec);

      const audioText = `Diagnosis result shows ${result.disease}.`;
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

  const resetPrediction = () => {
    setCurrentResult(null);
    setRecommendation(null);
    if (previewImage?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
    setPreviewImage(null);
    stopAudio();
    setAudioUrl(null);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-50">
          {t('predict')}
        </h1>
        {currentResult && (
          <Button variant="ghost" size="sm" onClick={resetPrediction}>
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('new_scan') || 'New Scan'}
          </Button>
        )}
      </div>

      {/* Crop Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CROP_OPTIONS.map((crop) => (
          <button
            key={crop}
            onClick={() => setSelectedCrop(crop)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCrop === crop
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
            }`}
          >
            {crop.charAt(0).toUpperCase() + crop.slice(1)}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      {!previewImage && !loading && (
        <ImageUpload
          onImageSelected={handleImageSelected}
          onCameraClick={() => setShowCamera(true)}
        />
      )}

      {/* Loading State */}
      {loading && (
        <LoadingSpinner message="Analyzing leaf image..." />
      )}

      {/* Result */}
      {currentResult && !loading && (
        <>
          <PredictionCard
            result={currentResult}
            imageUrl={previewImage}
          />

          <SeverityGauge
            level={currentResult.severity}
            percentage={currentResult.severity_percentage}
          />

          {recommendation && (
            <TreatmentPanel recommendation={recommendation} />
          )}

          {/* Audio Playback */}
          {audioUrl && (
            <audio controls autoPlay className="w-full mt-2">
              <source src={audioUrl} type="audio/mp3" />
            </audio>
          )}
        </>
      )}
    </div>
  );
};
