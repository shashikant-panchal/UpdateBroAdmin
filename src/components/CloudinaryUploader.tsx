import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  UploadCloud,
  X,
  AlertCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Link as LinkIcon,
  CheckCircle2,
} from 'lucide-react';
import { uploadToCloudinary } from '../lib/cloudinary';

interface CloudinaryUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  preset?: 'product' | 'banner' | 'category';
}

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  images,
  onChange,
  multiple = true,
  maxFiles = 6,
  label = 'Product Images',
  preset = 'product',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileList.length === 0) {
      setErrorMsg('Please select valid image files (JPG, PNG, WebP).');
      return;
    }

    if (!multiple) {
      fileList.splice(1);
    } else if (images.length + fileList.length > maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} images allowed.`);
      return;
    }

    setErrorMsg(null);
    setUploadSuccess(false);
    setIsUploading(true);
    setUploadProgress(10);

    const uploadedUrls: string[] = [];

    const compressionOptions =
      preset === 'banner'
        ? { maxWidth: 1920, maxHeight: 1080, quality: 0.82 }
        : preset === 'category'
        ? { maxWidth: 800, maxHeight: 800, quality: 0.80 }
        : { maxWidth: 1200, maxHeight: 1200, quality: 0.78 };

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const url = await uploadToCloudinary(
          file,
          (percent) => {
            const overall = Math.round(((i + percent / 100) / fileList.length) * 100);
            setUploadProgress(overall);
          },
          compressionOptions
        );
        uploadedUrls.push(url);
      }

      setUploadSuccess(true);
      window.setTimeout(() => setUploadSuccess(false), 3500);

      if (multiple) {
        onChange([...images, ...uploadedUrls]);
      } else {
        onChange([uploadedUrls[0]]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMsg(`${msg}. You can also paste an image URL below.`);
      setShowManualInput(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChange(updated);
  };

  const handleAddManualUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    if (multiple) {
      onChange([...images, manualUrl.trim()]);
    } else {
      onChange([manualUrl.trim()]);
    }
    setManualUrl('');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showManualInput ? 'Hide URL input' : 'Paste Image URL'}</span>
        </button>
      </div>

      {showManualInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://... (direct image link)"
            className="h-9 flex-1 rounded-xl border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="rounded-xl bg-cloud px-3 text-xs font-bold text-ink hover:bg-line transition"
          >
            Add URL
          </button>
        </div>
      )}

      {(!multiple && images.length === 0) || (multiple && images.length < maxFiles) ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
            isDragging
              ? 'border-accent bg-accent-soft/30'
              : 'border-line bg-cloud/30 hover:border-accent/60 hover:bg-cloud/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="text-xs font-bold text-ink">
                  Uploading ({uploadProgress}%)
                </span>
                <div className="h-1.5 w-48 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-sm mb-2">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-ink">
                  Drag &amp; drop images here, or <span className="text-accent underline">browse</span>
                </p>
                <p className="mt-1.5 text-[11px] text-muted">
                  Supports JPG, PNG, WebP • Max 10MB per file
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {uploadSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 font-bold"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>Image uploaded and saved successfully</span>
        </motion.div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, idx) => (
            <motion.div
              key={`${url}-${idx}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
            >
              <img
                src={url}
                alt={`Uploaded #${idx + 1}`}
                className="h-full w-full object-cover"
              />

              {idx === 0 && multiple && (
                <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                  Primary
                </span>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/60 opacity-0 backdrop-blur-xs transition group-hover:opacity-100">
                {multiple && idx > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'up')}
                    className="rounded-full bg-surface/90 p-1.5 text-ink hover:text-accent transition"
                    title="Move earlier"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                )}
                {multiple && idx < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    className="rounded-full bg-surface/90 p-1.5 text-ink hover:text-accent transition"
                    title="Move later"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="rounded-full bg-red-500/90 p-1.5 text-white hover:bg-red-600 transition"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
