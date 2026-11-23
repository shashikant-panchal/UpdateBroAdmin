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
  Film,
  RefreshCw,
} from 'lucide-react';
import {
  uploadToCloudinary,
  uploadVideoToCloudinary,
  validateAndInspectVideo,
  formatBytes,
  type VideoUploadResult,
  type VideoMetadata,
} from '../lib/cloudinary';

export interface VideoUploadData {
  videoUrl: string;
  posterUrl: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
}

export interface CloudinaryUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  preset?: 'product' | 'banner' | 'category';
  mediaType?: 'image' | 'video';
  videoData?: VideoUploadData | null;
  onVideoChange?: (data: VideoUploadData | null) => void;
}

export const CloudinaryUploader: React.FC<CloudinaryUploaderProps> = ({
  images,
  onChange,
  multiple = true,
  maxFiles = 6,
  label = 'Product Images',
  preset = 'product',
  mediaType = 'image',
  videoData,
  onVideoChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [detectedVideoMeta, setDetectedVideoMeta] = useState<VideoMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideoMode = mediaType === 'video';

  const handleVideoUpload = async (file: File) => {
    setErrorMsg(null);
    setUploadSuccess(false);

    try {
      // 1. Client-Side Pre-Upload Validation (Under 10.5s & <= 35MB)
      const meta = await validateAndInspectVideo(file);
      setDetectedVideoMeta(meta);

      setIsUploading(true);
      setUploadProgress(5);

      // 2. Upload to Cloudinary Video endpoint
      const result: VideoUploadResult = await uploadVideoToCloudinary(file, (percent) => {
        setUploadProgress(percent);
      });

      setUploadSuccess(true);
      window.setTimeout(() => setUploadSuccess(false), 3500);

      // Update parent state with HD video delivery URL & auto-derived poster URL
      if (onVideoChange) {
        onVideoChange({
          videoUrl: result.videoUrl,
          posterUrl: result.posterUrl,
          duration: result.duration,
          width: result.width,
          height: result.height,
          size: result.bytes,
        });
      }

      // Keep image_url populated with the auto-generated poster image URL so fallback cards never break
      onChange([result.posterUrl]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Video upload failed';
      setErrorMsg(msg);
      setShowManualInput(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageFiles = async (files: FileList | File[]) => {
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

  const handleFiles = (files: FileList | File[]) => {
    if (isVideoMode) {
      if (files.length > 0) {
        handleVideoUpload(files[0]);
      }
    } else {
      handleImageFiles(files);
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
    const url = manualUrl.trim();

    if (isVideoMode) {
      if (onVideoChange) {
        onVideoChange({
          videoUrl: url,
          posterUrl: images[0] || '',
        });
      }
    } else {
      if (multiple) {
        onChange([...images, url]);
      } else {
        onChange([url]);
      }
    }

    setManualUrl('');
    setErrorMsg(null);
  };

  const handleRemoveVideo = () => {
    if (onVideoChange) onVideoChange(null);
    setDetectedVideoMeta(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted uppercase tracking-wider">{label}</label>
        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showManualInput ? 'Hide URL input' : isVideoMode ? 'Paste Video URL' : 'Paste Image URL'}</span>
        </button>
      </div>

      {showManualInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder={isVideoMode ? 'https://... (direct .mp4 video link)' : 'https://... (direct image link)'}
            className="h-9 flex-1 rounded-xl border border-line bg-surface px-3 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="rounded-xl bg-cloud px-3 text-xs font-bold text-ink hover:bg-line transition cursor-pointer"
          >
            Add URL
          </button>
        </div>
      )}

      {/* VIDEO MODE: If video is already uploaded, show video preview with metadata badge & actions */}
      {isVideoMode && videoData?.videoUrl ? (
        <div className="space-y-2">
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-2xl border border-line bg-black shadow-md group">
            <video
              src={videoData.videoUrl}
              poster={videoData.posterUrl || images[0]}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />

            {/* Glowing HD Video Badge */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-400/30 backdrop-blur-md shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              <span>HD VIDEO</span>
            </div>

            {/* Quick Action Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Replace Video</span>
              </button>
              <button
                type="button"
                onClick={handleRemoveVideo}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Video Metadata Chip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-cloud/40 px-3 py-2 text-[11px] font-mono text-muted">
            <div className="flex items-center gap-2">
              <Film className="h-3.5 w-3.5 text-accent" />
              <span className="font-bold text-ink">
                {videoData.duration ? `${videoData.duration.toFixed(1)}s` : detectedVideoMeta ? `${detectedVideoMeta.duration.toFixed(1)}s` : 'HD Clip'}
              </span>
              {videoData.width ? (
                <>
                  <span>•</span>
                  <span>{videoData.width}×{videoData.height}</span>
                </>
              ) : null}
              {videoData.size ? (
                <>
                  <span>•</span>
                  <span>{formatBytes(videoData.size)}</span>
                </>
              ) : detectedVideoMeta?.size ? (
                <>
                  <span>•</span>
                  <span>{formatBytes(detectedVideoMeta.size)}</span>
                </>
              ) : null}
            </div>
            <span className="font-sans text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              HD Encoded (q_auto:best)
            </span>
          </div>

          {/* Hidden file input for Replace */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      ) : (!isVideoMode && (!multiple && images.length === 0)) || (!isVideoMode && multiple && images.length < maxFiles) || (isVideoMode && !videoData?.videoUrl) ? (
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
            accept={isVideoMode ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov' : 'image/*'}
            multiple={!isVideoMode && multiple}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center">
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="text-xs font-bold text-ink">
                  {isVideoMode ? `Uploading HD Video (${uploadProgress || 0}%)` : `Uploading (${uploadProgress || 0}%)`}
                </span>
                <div className="h-1.5 w-52 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{ width: `${uploadProgress || 0}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted">
                  Encoding with least-compression HD profile...
                </span>
              </div>
            ) : isVideoMode ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500 shadow-sm mb-2">
                  <Film className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-ink">
                  Drag &amp; drop short HD video clip (≤ 10s), or <span className="text-accent underline">browse</span>
                </p>
                <p className="mt-1.5 text-[11px] text-muted">
                  Supports MP4, WebM, MOV • Max 10.5 seconds • Max 35 MB
                </p>
              </>
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
          <span>{isVideoMode ? 'HD Video uploaded and optimized successfully' : 'Image uploaded and saved successfully'}</span>
        </motion.div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Render uploaded image thumbnails for standard image mode */}
      {!isVideoMode && images.length > 0 && (
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
                    className="rounded-full bg-surface/90 p-1.5 text-ink hover:text-accent transition cursor-pointer"
                    title="Move earlier"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                )}
                {multiple && idx < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMove(idx, 'down')}
                    className="rounded-full bg-surface/90 p-1.5 text-ink hover:text-accent transition cursor-pointer"
                    title="Move later"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="rounded-full bg-red-500/90 p-1.5 text-white hover:bg-red-600 transition cursor-pointer"
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
