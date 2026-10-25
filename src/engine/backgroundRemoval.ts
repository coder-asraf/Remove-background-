import { loadImage } from './canvasRenderer';

/**
 * 100% Offline Background Removal:
 * Samples backdrop border pixels and computes color distance matting with edge feathering.
 * Never requires network or an external server.
 */
export async function removeBackgroundOffline(imageSrc: string): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const w = canvas.width;
  const h = canvas.height;

  // Sample corner pixel colors
  const sampleIndices = [
    0, // top-left
    (w - 1) * 4, // top-right
    ((h - 1) * w) * 4, // bottom-left
    ((h - 1) * w + w - 1) * 4, // bottom-right
  ];

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const idx of sampleIndices) {
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
  }
  const avgR = sumR / sampleIndices.length;
  const avgG = sumG / sampleIndices.length;
  const avgB = sumB / sampleIndices.length;

  const threshold = 38; // color difference sensitivity

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const diff = Math.abs(r - avgR) + Math.abs(g - avgG) + Math.abs(b - avgB);

    if (diff < threshold) {
      if (diff < threshold * 0.5) {
        data[i + 3] = 0; // Fully transparent
      } else {
        // Feathered alpha transition for smooth non-jagged edge
        const ratio = (diff - threshold * 0.5) / (threshold * 0.5);
        data[i + 3] = Math.round(ratio * 255);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * AI Background Removal using Gemini Nano Banana 2.1 via server proxy
 */
export async function removeBackgroundGemini(
  imageSrc: string,
  prompt: string = 'Remove the background cleanly and produce a crisp isolated subject portrait silhouette on pure transparent background'
): Promise<{ imageUrl: string; modelUsed: string }> {
  const response = await fetch('/api/gemini/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: imageSrc,
      prompt,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `AI request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.imageUrl) {
    throw new Error('No image returned by AI background removal model.');
  }

  return { imageUrl: data.imageUrl, modelUsed: data.modelUsed };
}

/**
 * BGNinja API background removal via server proxy
 * Uses the official free public endpoint without an API key
 */
export async function removeBackgroundBgNinja(imageSrc: string): Promise<string> {
  const response = await fetch('/api/bgninja/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: imageSrc,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'BGNinja failed' }));
    throw new Error(err.error || `BGNinja returned status ${response.status}`);
  }

  const data = await response.json();
  return data.dataUrl;
}
