/**
 * Lightweight client-side image optimization utility.
 * Downscales overly large raster images (max 1600px dimension) and compresses
 * to efficient data URLs, preventing browser storage quota overflow.
 */
export async function optimizeImageFile(file: File): Promise<string> {
  // SVGs, animated GIFs, or lightweight images (< 120KB) are kept intact
  if (
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    file.size < 120 * 1024
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Downscale and compress raster images
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Use WebP if supported, otherwise JPEG or PNG
            const format = file.type === 'image/png' && file.size < 1.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
            const quality = format === 'image/jpeg' ? 0.85 : undefined;
            const dataUrl = canvas.toDataURL(format, quality);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Fallback to raw data URL on any canvas error
        }
        resolve(e.target?.result as string);
      };
      img.onerror = () => resolve(e.target?.result as string || '');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
