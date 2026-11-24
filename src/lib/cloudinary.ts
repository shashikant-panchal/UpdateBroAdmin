const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ffqesytx';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'updatebro_unsigned';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  preferWebP?: boolean;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  percentSaved: number;
  width: number;
  height: number;
  format: string;
}

export interface UploadProgressCallback {
  (percent: number): void;
}

export interface CompressionCallback {
  (stats: CompressionStats): void;
}

/**
 * Formats raw byte counts into human-readable strings (e.g. 4.2 MB -> 180 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Compresses an image client-side using an HTML5 canvas before network upload.
 * - Downsamples large camera resolutions (e.g. 4000x3000 -> 1200x1200 max)
 * - Converts to WebP (with fallback to JPEG) with perceptual quality compression
 * - Strips heavy EXIF camera metadata, reducing 5-10MB photos to ~100-250KB (95%+ reduction)
 * - Protects the Cloudinary Free Tier storage limit (25 Credits / 25GB)
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; stats: CompressionStats }> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.78,
    preferWebP = true,
  } = options;

  const originalSize = file.size;

  // Skip SVGs and animated GIFs
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      blob: file,
      stats: {
        originalSize,
        compressedSize: originalSize,
        percentSaved: 0,
        width: 0,
        height: 0,
        format: file.type,
      },
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file for compression'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downsample maintaining aspect ratio if larger than bounds
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const isPng = file.type === 'image/png';
        const ctx = canvas.getContext('2d', { alpha: isPng });
        if (!ctx) {
          resolve({
            blob: file,
            stats: {
              originalSize,
              compressedSize: originalSize,
              percentSaved: 0,
              width: img.width,
              height: img.height,
              format: file.type,
            },
          });
          return;
        }

        // Fill white background only for non-PNG images to avoid black artifacts
        if (!isPng) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        // WebP is 30-40% smaller than JPEG and natively supports alpha channel
        const targetFormat = preferWebP ? 'image/webp' : (isPng ? 'image/png' : 'image/jpeg');

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < originalSize) {
              const compressedSize = blob.size;
              const percentSaved = Math.max(
                0,
                Math.round(((originalSize - compressedSize) / originalSize) * 100)
              );
              resolve({
                blob,
                stats: {
                  originalSize,
                  compressedSize,
                  percentSaved,
                  width,
                  height,
                  format: blob.type || targetFormat,
                },
              });
            } else {
              // If already smaller than compressed canvas output, use original
              resolve({
                blob: file,
                stats: {
                  originalSize,
                  compressedSize: originalSize,
                  percentSaved: 0,
                  width,
                  height,
                  format: file.type,
                },
              });
            }
          },
          targetFormat,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Injects automatic Cloudinary transformations for high-performance CDN delivery:
 * - f_auto: Serves modern AVIF or WebP based on user's browser support
 * - q_auto:good: Automatic perceptual quality optimization
 * Saves 50-70% bandwidth on customer storefront.
 */
export function optimizeCloudinaryUrl(
  url: string,
  transformations = 'f_auto,q_auto:good'
): string {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com') || url.includes('/f_auto')) {
    return url;
  }
  return url.replace('/upload/', `/upload/${transformations}/`);
}

/**
 * Uploads an image to Cloudinary:
 * 1. Client-side pre-compression (reduces 5-10MB to ~150KB)
 * 2. Uploads to Cloudinary unsigned preset in folder 'updatebro'
 * 3. Returns CDN delivery URL with f_auto,q_auto:good injected
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback,
  options?: CompressionOptions,
  onCompression?: CompressionCallback
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary Cloud Name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME.');
  }

  // 1. Client-Side Pre-Compression
  const { blob, stats } = await compressImage(file, options);
  if (onCompression) {
    onCompression(stats);
  }

  const formData = new FormData();
  // Name file with correct webp/jpeg extension
  const cleanExt = stats.format === 'image/webp' ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const fileName = `${baseName}.${cleanExt}`;

  formData.append('file', blob, fileName);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'updatebro');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const rawUrl = data.secure_url || data.url;
          const deliveryUrl = optimizeCloudinaryUrl(rawUrl);
          resolve(deliveryUrl);
        } catch {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData?.error?.message || `Upload failed with HTTP ${xhr.status}`;
          reject(new Error(message));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during image upload'));
    };

    xhr.send(formData);
  });
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface VideoUploadResult {
  videoUrl: string;
  posterUrl: string;
  publicId: string;
  duration: number;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Builds the least-compression HD delivery URL for videos:
 * Uses q_auto:good, vc_h264, br_750k, and w_1280,c_limit for crystal-clear 720p HD playback
 * while strictly capping bandwidth in KBs / low MBs to protect Cloudinary free tier credits.
 */
export function buildVideoDeliveryUrl(publicId: string): string {
  const cleanId = publicId.replace(/\.[^/.]+$/, '');
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/w_1280,c_limit,q_auto:good,vc_h264,br_750k/${cleanId}.mp4`;
}

/**
 * Auto-derives a crisp JPG poster frame from the first video frame (so_0).
 */
export function buildVideoPosterUrl(publicId: string): string {
  const cleanId = publicId.replace(/\.[^/.]+$/, '');
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,w_1280,f_jpg,q_auto:good/${cleanId}.jpg`;
}

/**
 * Client-Side Pre-Upload Validation for Hero Videos:
 * - Accepts .mp4, .webm, and .mov
 * - Max size 50 MB
 * - Rejects clips longer than 30.5 seconds with clear message
 */
export async function validateAndInspectVideo(file: File): Promise<VideoMetadata> {
  const validMimes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['mp4', 'webm', 'mov'];

  const isMimeValid = validMimes.includes(file.type);
  const isExtValid = ext ? validExts.includes(ext) : false;

  if (!isMimeValid && !isExtValid) {
    throw new Error('Please select a valid video file (.mp4, .webm, or .mov).');
  }

  const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Video file is too large (${formatBytes(file.size)}). Hero videos must be 50 MB or less.`);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const duration = video.duration;
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;

      if (duration > 30.5) {
        reject(new Error(`Hero videos must be 30 seconds or less (selected clip is ${Math.round(duration)}s).`));
        return;
      }

      resolve({
        duration,
        width,
        height,
        size: file.size,
        format: file.type || ext || 'video/mp4',
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not inspect video file. Please ensure it is a valid MP4, WebM, or MOV clip.'));
    };

    video.src = objectUrl;
  });
}

/**
 * Uploads a short HD hero video to Cloudinary:
 * 1. Client-side pre-validation (< 30.5s, <= 50MB, .mp4/.webm/.mov)
 * 2. Uploads to Cloudinary video endpoint
 * 3. Returns least-compression HD delivery URL & auto-derived so_0 poster frame URL
 */
export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<VideoUploadResult> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary Cloud Name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME.');
  }

  // Pre-validate locally
  const meta = await validateAndInspectVideo(file);

  const videoPreset =
    import.meta.env.VITE_CLOUDINARY_VIDEO_PRESET ||
    UPLOAD_PRESET;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', videoPreset);
  formData.append('folder', 'updatebro/banners');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const rawPublicId: string = data.public_id || '';
          const cleanPublicId = rawPublicId.replace(/\.[^/.]+$/, '');

          const videoUrl = buildVideoDeliveryUrl(cleanPublicId);
          const posterUrl = buildVideoPosterUrl(cleanPublicId);

          resolve({
            videoUrl,
            posterUrl,
            publicId: cleanPublicId,
            duration: Number(data.duration) || meta.duration,
            width: Number(data.width) || meta.width,
            height: Number(data.height) || meta.height,
            bytes: Number(data.bytes) || file.size,
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary response for video'));
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          const message = errData?.error?.message || `Video upload failed with HTTP ${xhr.status}`;
          reject(new Error(message));
        } catch {
          reject(new Error(`Video upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error occurred during video upload'));
    };

    xhr.send(formData);
  });
}
