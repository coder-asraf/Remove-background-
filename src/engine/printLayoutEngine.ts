import { ImageProject, PrintLayoutPlan, PhotoPlacement } from '../types';
import { PHOTO_PRESETS, PAPER_PRESETS } from '../constants/presets';

export function calculatePrintLayout(project: ImageProject): PrintLayoutPlan {
  // 1. Resolve photo dimensions in millimeters
  const photoPreset = PHOTO_PRESETS.find((p) => p.id === project.selectedPhotoPreset);
  const photoW = photoPreset && photoPreset.id !== 'passport_custom'
    ? photoPreset.widthMm
    : Math.max(10, project.customPhotoWidthMm);
  const photoH = photoPreset && photoPreset.id !== 'passport_custom'
    ? photoPreset.heightMm
    : Math.max(10, project.customPhotoHeightMm);

  // 2. Resolve paper dimensions in millimeters
  const paperPreset = PAPER_PRESETS.find((p) => p.id === project.selectedPaperPreset);
  const basePaperW = paperPreset ? paperPreset.widthMm : Math.max(50, project.customPaperWidthMm);
  const basePaperH = paperPreset ? paperPreset.heightMm : Math.max(50, project.customPaperHeightMm);

  // 3. Orientation
  const isLandscape = project.pageOrientation === 'LANDSCAPE';
  const pageW = isLandscape ? Math.max(basePaperW, basePaperH) : Math.min(basePaperW, basePaperH);
  const pageH = isLandscape ? Math.min(basePaperW, basePaperH) : Math.max(basePaperW, basePaperH);

  const margin = Math.max(0, project.marginMm);
  const hGap = Math.max(0, project.horizontalGapMm);
  const vGap = Math.max(0, project.verticalGapMm);

  const printableW = pageW - 2 * margin;
  const printableH = pageH - 2 * margin;

  if (printableW < photoW || printableH < photoH) {
    return {
      pageWidthMm: pageW,
      pageHeightMm: pageH,
      photoWidthMm: photoW,
      photoHeightMm: photoH,
      totalCopiesRequested: project.copies,
      copiesPerPage: 0,
      totalPages: 0,
      columns: 0,
      rows: 0,
      marginMm: margin,
      horizontalGapMm: hGap,
      verticalGapMm: vGap,
      cutGuidesEnabled: project.cutGuidesEnabled,
      cropMarksEnabled: project.cropMarksEnabled,
      photoNumbersEnabled: project.photoNumbersEnabled,
      placements: [],
      fitsOnPage: false,
      warningMessage: 'Photo size exceeds printable page area. Adjust margins or paper size.',
    };
  }

  // Calculate grid columns and rows:
  // C * photoW + (C - 1) * hGap <= printableW
  // C <= (printableW + hGap) / (photoW + hGap)
  const cols = Math.max(1, Math.floor((printableW + hGap) / (photoW + hGap)));
  const rows = Math.max(1, Math.floor((printableH + vGap) / (photoH + vGap)));

  const copiesPerPage = cols * rows;
  const totalRequested = Math.max(1, project.copies);
  const totalPages = Math.ceil(totalRequested / copiesPerPage);

  // Center grid on page
  const gridTotalW = cols * photoW + (cols - 1) * hGap;
  const gridTotalH = rows * photoH + (rows - 1) * vGap;
  const startX = margin + (printableW - gridTotalW) / 2;
  const startY = margin + (printableH - gridTotalH) / 2;

  const placements: PhotoPlacement[] = [];
  let placedCount = 0;

  for (let page = 0; page < totalPages; page++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (placedCount >= totalRequested) break;
        const x = startX + c * (photoW + hGap);
        const y = startY + r * (photoH + vGap);
        placements.push({
          pageIndex: page,
          xMm: x,
          yMm: y,
          widthMm: photoW,
          heightMm: photoH,
          copyNumber: placedCount + 1,
        });
        placedCount++;
      }
      if (placedCount >= totalRequested) break;
    }
  }

  return {
    pageWidthMm: pageW,
    pageHeightMm: pageH,
    photoWidthMm: photoW,
    photoHeightMm: photoH,
    totalCopiesRequested: totalRequested,
    copiesPerPage,
    totalPages,
    columns: cols,
    rows,
    marginMm: margin,
    horizontalGapMm: hGap,
    verticalGapMm: vGap,
    cutGuidesEnabled: project.cutGuidesEnabled,
    cropMarksEnabled: project.cropMarksEnabled,
    photoNumbersEnabled: project.photoNumbersEnabled,
    placements,
    fitsOnPage: true,
    warningMessage: null,
  };
}
