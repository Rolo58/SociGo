const MAX_DIMENSION = 1200;
const QUALITY = 0.82;

/**
 * Downscales and re-encodes an uploaded creative before it is stored.
 * Phase 1 keeps images as data URLs in localStorage, so an untouched 2 MB photo
 * would exhaust the quota after two or three posts.
 * SVGs are returned untouched: they are already compact and stay crisp at any size.
 */
export async function prepareImage(file: File): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  if (file.type === 'image/svg+xml') return dataUrl;

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  if (scale === 1 && dataUrl.length < 400_000) return dataUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be decoded.'));
    image.src = src;
  });
}
