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
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.80,
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

        const ctx = canvas.getContext('2d', { alpha: false });
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

        // Fill white background for transparent PNG conversions
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (30% smaller than JPEG), fallback to JPEG
        const targetFormat = preferWebP ? 'image/webp' : 'image/jpeg';

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
