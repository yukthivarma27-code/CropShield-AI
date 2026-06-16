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

  const validateCropImage = (file: File): Promise<string | null> => {
    console.log("VALIDATION START");
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.naturalWidth < 224 || img.naturalHeight < 224) {
          resolve(`Image too small (${img.naturalWidth}x${img.naturalHeight}). Minimum 224x224px required for analysis.`);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const total = canvas.width * canvas.height;
        let greenPixels = 0, naturalPixels = 0, whitePixels = 0, skinPixels = 0;
        let edgeSum = 0;
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const i = (y * canvas.width + x) * 4;
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            const rn = r / 255, gn = g / 255, bn = b / 255;
            const cmax = Math.max(rn, gn, bn);
            const cmin = Math.min(rn, gn, bn);
            const diff = cmax - cmin;
            let h = 0, s = 0, v = cmax;
            if (diff === 0) h = 0;
            else if (cmax === rn) h = 60 * (((gn - bn) / diff) % 6);
            else if (cmax === gn) h = 60 * ((bn - rn) / diff + 2);
            else h = 60 * ((rn - gn) / diff + 4);
            if (h < 0) h += 360;
            s = cmax === 0 ? 0 : diff / cmax;
            const hDeg = h, sPct = s * 100, vPct = v * 100;
            if (hDeg >= 50 && hDeg <= 120 && sPct >= 15 && vPct >= 15) greenPixels++;
            if ((hDeg >= 50 && hDeg <= 120 && sPct >= 15 && vPct >= 15) ||
                (hDeg >= 28 && hDeg < 50 && sPct >= 25 && vPct >= 25) ||
                (hDeg >= 5 && hDeg < 28 && sPct >= 30 && vPct >= 10)) naturalPixels++;
            if (vPct > 85 && sPct < 12) whitePixels++;
            if (hDeg >= 0 && hDeg <= 25 && sPct >= 8 && sPct <= 60 && vPct >= 25 && vPct <= 80) skinPixels++;
            const li = ((y - 1) * canvas.width + (x - 1)) * 4;
            const gray = Math.round(0.299 * pixels[li] + 0.587 * pixels[li + 1] + 0.114 * pixels[li + 2]);
            const ri = ((y) * canvas.width + (x)) * 4;
            const grayR = Math.round(0.299 * pixels[ri] + 0.587 * pixels[ri + 1] + 0.114 * pixels[ri + 2]);
            const bi = ((y) * canvas.width + (x - 1)) * 4;
            const grayB = Math.round(0.299 * pixels[bi] + 0.587 * pixels[bi + 1] + 0.114 * pixels[bi + 2]);
            const dx = Math.abs(grayR - gray);
            const dy = Math.abs(grayB - gray);
            edgeSum += Math.sqrt(dx * dx + dy * dy) > 50 ? 1 : 0;
          }
        }
        const greenRatio = greenPixels / total;
        const naturalRatio = naturalPixels / total;
        const whiteRatio = whitePixels / total;
        const skinRatio = skinPixels / total;
        const edgeDensity = edgeSum / ((canvas.width - 2) * (canvas.height - 2));
        console.log("IS PLANT:", { greenRatio, naturalRatio, whiteRatio, skinRatio, edgeDensity });
        if (whiteRatio > 0.35 && naturalRatio < 0.10) {
          console.log("VALIDATION FAILED: white document background");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        if (skinRatio > 0.15) {
          console.log("VALIDATION FAILED: skin/face detected");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        if (edgeDensity > 0.35) {
          console.log("VALIDATION FAILED: excessive edges (screenshot/text)");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        if (edgeDensity > 0.20 && naturalRatio < 0.10) {
          console.log("VALIDATION FAILED: text-heavy image");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        if (naturalRatio < 0.05) {
          console.log("VALIDATION FAILED: no plant content detected");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        if (whiteRatio > 0.20 && greenRatio < 0.05) {
          console.log("VALIDATION FAILED: document with colored accent");
          resolve("Invalid image. Please upload a clear crop leaf image.");
          return;
        }
        resolve(null);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('Could not read image. The file may be corrupt.');
      };
      img.src = url;
    });
  };

  const handleImageSelected = async (file: File) => {
    setImageError('');
    const error = validateImageFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    const cropError = await validateCropImage(file);
    if (cropError) {
      setImageError(cropError);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    console.log("PREVIEW URL CREATED:", imageUrl, { fileName: file.name, fileType: file.type, fileSize: file.size });
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

      {!loading && (!previewImage || imageError) && (
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
