const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_RAW_BYTES = 10 * 1024 * 1024; // 10 MB upload limit
const MAX_DATA_URL_LENGTH = 450000; // Safe margin below Firestore 500KB rule cap

export async function validateAndCompressImage(
  file: File,
  maxDimension = 1080
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Unsupported file format. Upload a PNG, JPG, or WebP screenshot.');
  }
  if (file.size > MAX_RAW_BYTES) {
    throw new Error('Image file exceeds 10 MB limit. Please select a smaller screenshot.');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid or corrupted image file.'));
    image.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas image processing is unavailable in this browser.');
  }

  ctx.fillStyle = '#07090E';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let quality = 0.78;
  let compressed = canvas.toDataURL('image/jpeg', quality);
  while (compressed.length > MAX_DATA_URL_LENGTH && quality > 0.35) {
    quality -= 0.1;
    compressed = canvas.toDataURL('image/jpeg', quality);
  }

  if (compressed.length > MAX_DATA_URL_LENGTH) {
    throw new Error('Image could not be compressed under storage limits. Please crop or resize the screenshot.');
  }

  return compressed;
}
