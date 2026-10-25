export type BackgroundMode = 'TRANSPARENT' | 'SOLID_COLOR';
export type PageOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface CropRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ImageProject {
  projectId: string;
  originalImageSrc: string;
  backgroundRemovedSrc: string | null;
  rotationDegrees: number;
  cropRectangle: CropRect | null;
  horizontalFlip: boolean;
  verticalFlip: boolean;
  backgroundMode: BackgroundMode;
  backgroundColor: string; // e.g. '#ffffff' or 'transparent'
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number;  // 0 to 100
  selectedPhotoPreset: string;
  customPhotoWidthMm: number;
  customPhotoHeightMm: number;
  selectedPaperPreset: string;
  customPaperWidthMm: number;
  customPaperHeightMm: number;
  pageOrientation: PageOrientation;
  copies: number;
  marginMm: number;
  horizontalGapMm: number;
  verticalGapMm: number;
  cutGuidesEnabled: boolean;
  cropMarksEnabled: boolean;
  photoNumbersEnabled: boolean;
  imageRevision: number;
  projectName: string;
  savedAt: number;
}

export interface PhotoPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  ratio: number;
}

export interface PaperPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  standardDpi: number;
}

export interface PhotoPlacement {
  pageIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  copyNumber: number;
}

export interface PrintLayoutPlan {
  pageWidthMm: number;
  pageHeightMm: number;
  photoWidthMm: number;
  photoHeightMm: number;
  totalCopiesRequested: number;
  copiesPerPage: number;
  totalPages: number;
  columns: number;
  rows: number;
  marginMm: number;
  horizontalGapMm: number;
  verticalGapMm: number;
  cutGuidesEnabled: boolean;
  cropMarksEnabled: boolean;
  photoNumbersEnabled: boolean;
  placements: PhotoPlacement[];
  fitsOnPage: boolean;
  warningMessage?: string | null;
}

export interface GeminiAnalysisResult {
  complianceScore: number;
  verdict: 'Approved' | 'Needs Adjustment' | 'Rejected';
  summary: string;
  checks: Array<{
    category: string;
    status: 'Pass' | 'Warning' | 'Fail';
    detail: string;
  }>;
  recommendations: string[];
  estimatedEyeLevelPercent?: number;
  estimatedHeadHeightPercent?: number;
}
