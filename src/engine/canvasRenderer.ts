import { ImageProject } from '../types';

/**
 * CanvasRenderer implements the Single Source of Truth image transformation pipeline
 * matching Android's FinalImageRenderer and ImageTransformEngine:
 * 1. Rotation with full alpha preservation (no black/white background fill)
 * 2. Cropping
 * 3. Flip H / Flip V
 * 4. Image adjustments (brightness, contrast, saturation)
 * 5. Background compositing (transparent or solid color)
 * 6. Final target dimension scaling
 */

export function renderFinalCanvas(
  project: ImageProject,
  sourceElement: HTMLImageElement | HTMLCanvasElement,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    includeCheckerboard?: boolean; // ONLY for live preview
  } = {}
): HTMLCanvasElement {
  // 1. Initial base canvas from source
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = sourceElement.width;
  currentCanvas.height = sourceElement.height;
  let ctx = currentCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
  ctx.drawImage(sourceElement, 0, 0);

  // 2. Rotation preserving alpha transparency
  const rawDegrees = ((project.rotationDegrees % 360) + 360) % 360;
  if (Math.abs(rawDegrees) > 0.01) {
    const rad = (rawDegrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    // Calculate transformed bounding box to prevent clipping
    const newWidth = Math.round(currentCanvas.width * cos + currentCanvas.height * sin);
    const newHeight = Math.round(currentCanvas.width * sin + currentCanvas.height * cos);

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = Math.max(1, newWidth);
    rotCanvas.height = Math.max(1, newHeight);
    const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true })!;
    rotCtx.clearRect(0, 0, rotCanvas.width, rotCanvas.height);

    rotCtx.save();
    rotCtx.translate(newWidth / 2, newHeight / 2);
    rotCtx.rotate(rad);
    rotCtx.drawImage(currentCanvas, -currentCanvas.width / 2, -currentCanvas.height / 2);
    rotCtx.restore();

    currentCanvas = rotCanvas;
  }

  // 3. Cropping
  if (project.cropRectangle) {
    const { left, top, right, bottom } = project.cropRectangle;
    const cropX = Math.round(left * currentCanvas.width);
    const cropY = Math.round(top * currentCanvas.height);
    const cropW = Math.max(1, Math.round((right - left) * currentCanvas.width));
    const cropH = Math.max(1, Math.round((bottom - top) * currentCanvas.height));

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })!;
    cropCtx.clearRect(0, 0, cropW, cropH);
    cropCtx.drawImage(currentCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    currentCanvas = cropCanvas;
  }

  // 4. Flip operations
  if (project.horizontalFlip || project.verticalFlip) {
    const flipCanvas = document.createElement('canvas');
    flipCanvas.width = currentCanvas.width;
    flipCanvas.height = currentCanvas.height;
    const flipCtx = flipCanvas.getContext('2d', { willReadFrequently: true })!;
    flipCtx.clearRect(0, 0, flipCanvas.width, flipCanvas.height);

    flipCtx.save();
    flipCtx.translate(
      project.horizontalFlip ? flipCanvas.width : 0,
      project.verticalFlip ? flipCanvas.height : 0
    );
    flipCtx.scale(
      project.horizontalFlip ? -1 : 1,
      project.verticalFlip ? -1 : 1
    );
    flipCtx.drawImage(currentCanvas, 0, 0);
    flipCtx.restore();

    currentCanvas = flipCanvas;
  }

  // 5. Image Adjustments (Brightness, Contrast, Saturation)
  const hasAdjustments =
    Math.abs(project.brightness) > 0.1 ||
    Math.abs(project.contrast) > 0.1 ||
    Math.abs(project.saturation) > 0.1;

  if (hasAdjustments) {
    const adjCanvas = document.createElement('canvas');
    adjCanvas.width = currentCanvas.width;
    adjCanvas.height = currentCanvas.height;
    const adjCtx = adjCanvas.getContext('2d', { willReadFrequently: true })!;
    adjCtx.drawImage(currentCanvas, 0, 0);

    const imgData = adjCtx.getImageData(0, 0, adjCanvas.width, adjCanvas.height);
    const data = imgData.data;

    const b = project.brightness * 2.55; // [-255..255]
    const cFactor = (project.contrast + 100) / 100; // [0..2]
    const satFactor = (project.saturation + 100) / 100;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha === 0) continue; // preserve 100% transparent pixels

      let r = data[i];
      let g = data[i + 1];
      let bl = data[i + 2];

      // Contrast and Brightness
      r = cFactor * (r - 128) + 128 + b;
      g = cFactor * (g - 128) + 128 + b;
      bl = cFactor * (bl - 128) + 128 + b;

      // Saturation via luminance weights
      const gray = 0.2989 * r + 0.587 * g + 0.114 * bl;
      r = gray + satFactor * (r - gray);
      g = gray + satFactor * (g - gray);
      bl = gray + satFactor * (bl - gray);

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, bl));
      // data[i+3] alpha is untouched
    }
    adjCtx.putImageData(imgData, 0, 0);
    currentCanvas = adjCanvas;
  }

  // 6. Background Compositing
  const outCanvas = document.createElement('canvas');
  outCanvas.width = currentCanvas.width;
  outCanvas.height = currentCanvas.height;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true })!;

  if (options.includeCheckerboard && (project.backgroundMode === 'TRANSPARENT' || project.backgroundColor === 'transparent')) {
    // Draw preview checkerboard
    drawCheckerboard(outCtx, outCanvas.width, outCanvas.height);
  } else if (project.backgroundMode === 'SOLID_COLOR' && project.backgroundColor && project.backgroundColor !== 'transparent') {
    outCtx.fillStyle = project.backgroundColor;
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
  } else {
    outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
  }

  outCtx.drawImage(currentCanvas, 0, 0);

  // 7. Output scaling if specific target dimensions are requested
  if (
    options.targetWidth &&
    options.targetHeight &&
    (options.targetWidth !== outCanvas.width || options.targetHeight !== outCanvas.height)
  ) {
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = options.targetWidth;
    scaledCanvas.height = options.targetHeight;
    const sCtx = scaledCanvas.getContext('2d')!;
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';
    sCtx.drawImage(outCanvas, 0, 0, options.targetWidth, options.targetHeight);
    return scaledCanvas;
  }

  return outCanvas;
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number, size: number = 16) {
  const c1 = '#F1F5F9';
  const c2 = '#CBD5E1';
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x, y, size, size);
    }
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image source: ' + e));
    img.src = src;
  });
}
