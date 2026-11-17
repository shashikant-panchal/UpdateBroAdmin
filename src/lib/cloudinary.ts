const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'ffqesytx';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'updatebro_unsigned';

/**
 * Compresses an image client-side using an HTML5 canvas before network upload.
 * Limits max dimensions to 1600px and optimizes compression quality.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a Cloudinary image URL by injecting f_auto,q_auto transformations.
 */
export function optimizeCloudinaryUrl(url: string, transformations = 'f_auto,q_auto'): string {
  if (!url || !url.includes('cloudinary.com') || url.includes('/f_auto')) {
    return url;
  }
  return url.replace('/upload/', `/upload/${transformations}/`);
}

export interface UploadProgressCallback {
  (percent: number): void;
}

/**
 * Uploads an image to Cloudinary using an unsigned upload preset.
 * Automatically runs client-side compression before sending.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary Cloud Name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME.');
  }

  const compressedBlob = await compressImage(file);
  const formData = new FormData();
  formData.append('file', compressedBlob, file.name);
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
          const deliveryUrl = optimizeCloudinaryUrl(data.secure_url || data.url);
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
