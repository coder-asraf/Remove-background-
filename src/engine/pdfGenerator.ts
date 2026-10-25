import { jsPDF } from 'jspdf';
import { ImageProject } from '../types';
import { calculatePrintLayout } from './printLayoutEngine';
import { renderFinalCanvas, loadImage } from './canvasRenderer';

/**
 * PDF Generator adheres to CRITICAL BUG FIX 2:
 * Always receives the exact edited image from renderFinalCanvas.
 * Rotation, cropping, adjustments, and background colors are 100% preserved in the generated PDF.
 */
export async function generatePrintPdf(
  project: ImageProject,
  sourceSrc: string
): Promise<{ blob: Blob; url: string; filename: string }> {
  const layout = calculatePrintLayout(project);
  if (!layout.fitsOnPage || layout.placements.length === 0) {
    throw new Error(layout.warningMessage || 'Layout exceeds printable page area.');
  }

  // 1. Load active source image
  const sourceImage = await loadImage(sourceSrc);

  // 2. High-resolution rendering at 300 DPI for print
  // pixels = mm * DPI / 25.4
  const targetPhotoWPx = Math.round((layout.photoWidthMm * 300) / 25.4);
  const targetPhotoHPx = Math.round((layout.photoHeightMm * 300) / 25.4);

  const finalEditedCanvas = renderFinalCanvas(project, sourceImage, {
    targetWidth: targetPhotoWPx,
    targetHeight: targetPhotoHPx,
    includeCheckerboard: false, // Clean print output
  });

  // Convert to high-quality PNG data URL
  const photoDataUrl = finalEditedCanvas.toDataURL('image/png', 1.0);

  // 3. Initialize jsPDF in millimeters
  const doc = new jsPDF({
    orientation: project.pageOrientation === 'LANDSCAPE' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [layout.pageWidthMm, layout.pageHeightMm],
  });

  // 4. Render all pages
  for (let pageIdx = 0; pageIdx < layout.totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage([layout.pageWidthMm, layout.pageHeightMm], project.pageOrientation === 'LANDSCAPE' ? 'landscape' : 'portrait');
    }

    const pagePlacements = layout.placements.filter((p) => p.pageIndex === pageIdx);

    for (const p of pagePlacements) {
      // Draw the final edited image at exact physical mm coordinates
      doc.addImage(photoDataUrl, 'PNG', p.xMm, p.yMm, p.widthMm, p.heightMm);

      // Cut Guides (dashed light grey rectangle)
      if (layout.cutGuidesEnabled) {
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.rect(p.xMm, p.yMm, p.widthMm, p.heightMm);
        doc.setLineDashPattern([], 0); // reset
      }

      // Crop Marks (solid corner marks extending outside)
      if (layout.cropMarksEnabled) {
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.2);
        const markLen = 2.5; // mm

        // Top-left
        doc.line(p.xMm - markLen, p.yMm, p.xMm, p.yMm);
        doc.line(p.xMm, p.yMm - markLen, p.xMm, p.yMm);

        // Top-right
        doc.line(p.xMm + p.widthMm, p.yMm, p.xMm + p.widthMm + markLen, p.yMm);
        doc.line(p.xMm + p.widthMm, p.yMm - markLen, p.xMm + p.widthMm, p.yMm);

        // Bottom-left
        doc.line(p.xMm - markLen, p.yMm + p.heightMm, p.xMm, p.yMm + p.heightMm);
        doc.line(p.xMm, p.yMm + p.heightMm, p.xMm, p.yMm + p.heightMm + markLen);

        // Bottom-right
        doc.line(p.xMm + p.widthMm, p.yMm + p.heightMm, p.xMm + p.widthMm + markLen, p.yMm + p.heightMm);
        doc.line(p.xMm + p.widthMm, p.yMm + p.heightMm, p.xMm + p.widthMm, p.yMm + p.heightMm + markLen);
      }

      // Optional photo number
      if (layout.photoNumbersEnabled) {
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(7);
        doc.text(`#${p.copyNumber}`, p.xMm + 1, p.yMm + p.heightMm - 1);
      }
    }
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const filename = `cutout_studio_print_${layout.pageWidthMm.toFixed(0)}x${layout.pageHeightMm.toFixed(0)}mm.pdf`;

  return { blob, url, filename };
}
