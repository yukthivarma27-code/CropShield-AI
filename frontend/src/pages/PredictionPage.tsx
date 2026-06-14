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

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

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
  const [imageError, setImageError] = useState<string>('');

  const stopAudio = () => speechService.stopSpeaking();

  const validateImageFile = (file: File): string | null => {
    if (!file) {
      return 'Please upload an image.';
    }
    if (file.size === 0) {
      return 'Uploaded file is empty. Please select a valid image.';
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Unsupported format. Please upload JPG, JPEG, PNG, or WEBP.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    }
    return null;
  };

  const handleImageSelected = async (file: File) => {
    setImageError('');
    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      return;
    }

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
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || 'Inference failed. Check connection or retry.');
      setPreviewImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async (base64Data: string) => {
    setImageError('');
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
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || 'Camera upload prediction failed.');
      setPreviewImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePreviewError = () => {
    setImageError('Invalid image file. Please upload a different image.');
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
    setImageError('');
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

      {!previewImage && !loading && (
        <ImageUpload
          onImageSelected={handleImageSelected}
          onCameraClick={() => setShowCamera(true)}
          error={imageError}
          onClearError={() => setImageError('')}
          onError={(error) => setImageError(error)}
        />
      )}

      {loading && (
        <div className="space-y-3">
          {previewImage && (
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 bg-zinc-900">
              <img
                src={previewImage}
                alt="Uploaded leaf"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <LoadingSpinner message="Analyzing leaf image..." />
        </div>
      )}

      {currentResult && !loading && (
        <>
          <PredictionCard
            result={currentResult}
            imageUrl={previewImage}
            onImageError={handleImagePreviewError}
          />

          <SeverityGauge
            level={currentResult.severity}
            percentage={currentResult.severity_percentage}
          />

          {recommendation && (
            <TreatmentPanel recommendation={recommendation} />
          )}

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
