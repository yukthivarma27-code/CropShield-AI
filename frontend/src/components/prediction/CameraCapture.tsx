import React, { useEffect } from 'react';
import { useCamera } from '../../hooks/useCamera';
import { Button } from '../common/Button';
import { Camera, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const { videoRef, error, startCamera, stopCamera, capturePhoto } = useCamera();
  const { t } = useTranslation();

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      onCapture(photo);
      stopCamera();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between text-white py-2">
        <h2 className="text-base font-bold">{t('scan_leaf')}</h2>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video Viewfinder */}
      <div className="flex-1 flex items-center justify-center relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 my-4">
        {error ? (
          <div className="text-center p-6 text-zinc-400">
            <p className="text-sm mb-4">{error}</p>
            <Button variant="secondary" onClick={startCamera}>
              Retry Camera
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Capture Controls */}
      <div className="flex flex-col items-center gap-4 pb-6">
        <p className="text-xs text-zinc-400 text-center px-4">
          Position the infected leaf leaf inside the frame and keep the camera steady.
        </p>
        <button
          onClick={handleCapture}
          disabled={!!error}
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg border-4 border-zinc-200 active:scale-90 transition-transform disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white">
            <Camera className="w-6 h-6" />
          </div>
        </button>
      </div>
    </div>
  );
};
