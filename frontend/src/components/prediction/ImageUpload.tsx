import React, { useRef } from 'react';
import { Upload, Camera } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  onCameraClick: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelected, onCameraClick }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Camera capture trigger */}
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

      {/* File upload trigger */}
      <button
        onClick={triggerFileInput}
        className="flex items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-zinc-700/80 active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="bg-primary-50 dark:bg-primary-950/20 p-3 rounded-2xl">
            <Upload className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-sm text-gray-900 dark:text-zinc-50 leading-tight">
              {t('upload_image')}
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Choose image from gallery</p>
          </div>
        </div>
      </button>
    </div>
  );
};
