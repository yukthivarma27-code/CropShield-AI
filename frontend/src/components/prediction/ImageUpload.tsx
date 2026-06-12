import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  onCameraClick: () => void;
  error?: string;
  onClearError?: () => void;
  onError?: (error: string) => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, onCameraClick, error, onClearError, onError }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
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

  const handleFile = useCallback((file: File) => {
    if (onClearError) onClearError();
    const validationError = validateFile(file);
    if (validationError) {
      if (onError) onError(validationError);
      return;
    }
    onImageSelected(file);
  }, [onClearError, onError, onImageSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onCameraClick}
        className="flex items-center justify-between p-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-3xl shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="bg-white/15 p-3 rounded-2xl">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-sm leading-tight">{t('take_photo')}</h4>
            <p className="text-xs text-primary-100 mt-0.5">Use camera to scan leaf</p>
          </div>
        </div>
      </button>

      <div
        onClick={triggerFileInput}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border-2 border-dashed rounded-3xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer ${
          dragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
            : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 dark:bg-primary-950/20 p-3 rounded-2xl">
            <Upload className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-sm text-gray-900 dark:text-zinc-50 leading-tight">
              {t('upload_image')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Drag & drop or click to choose
            </p>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
              JPG, PNG, WEBP &middot; Max {MAX_SIZE_MB} MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
