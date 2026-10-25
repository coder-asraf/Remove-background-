import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ImageProject } from '../types';
import { PAPER_PRESETS } from '../constants/presets';
import { calculatePrintLayout } from '../engine/printLayoutEngine';
import { renderFinalCanvas, loadImage } from '../engine/canvasRenderer';
import { generatePrintPdf } from '../engine/pdfGenerator';

interface PrintSheetViewProps {
  project: ImageProject;
  onUpdateProject: (updater: (prev: ImageProject) => ImageProject) => void;
}

export const PrintSheetView: React.FC<PrintSheetViewProps> = ({
  project,
  onUpdateProject,
}) => {
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const layout = calculatePrintLayout(project);

  // Render sheet preview on Canvas
  useEffect(() => {
    let isCancelled = false;
    const renderSheet = async () => {
      const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
      if (!activeSrc) return;

      try {
        const img = await loadImage(activeSrc);
        if (isCancelled) return;

        // Render individual photo copy using Single Source of Truth
        const photoCanvas = renderFinalCanvas(project, img, {
          includeCheckerboard: false,
        });

        const canvas = sheetCanvasRef.current;
        if (!canvas) return;

        // Rendering scale factor (screen pixels per mm for sharp display)
        const scale = 2.0;
        canvas.width = Math.round(layout.pageWidthMm * scale);
        canvas.height = Math.round(layout.pageHeightMm * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fill clean white paper
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Filter placements for current page
        const pagePlacements = layout.placements.filter((p) => p.pageIndex === currentPage);

        for (const p of pagePlacements) {
          const x = p.xMm * scale;
          const y = p.yMm * scale;
          const w = p.widthMm * scale;
          const h = p.heightMm * scale;

          // Draw the edited photo (Guarantees rotated image appears in print layout!)
          ctx.drawImage(photoCanvas, x, y, w, h);

          // Cut Guides
          if (layout.cutGuidesEnabled) {
            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
          }

          // Corner Crop Marks
          if (layout.cropMarksEnabled) {
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.2;
            const markLen = 6 * scale;

            // Top-left
            ctx.beginPath();
            ctx.moveTo(x - markLen, y);
            ctx.lineTo(x, y);
            ctx.moveTo(x, y - markLen);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Top-right
            ctx.beginPath();
            ctx.moveTo(x + w, y);
            ctx.lineTo(x + w + markLen, y);
            ctx.moveTo(x + w, y - markLen);
            ctx.lineTo(x + w, y);
            ctx.stroke();

            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(x - markLen, y + h);
            ctx.lineTo(x, y + h);
            ctx.moveTo(x, y + h);
            ctx.lineTo(x, y + h + markLen);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(x + w, y + h);
            ctx.lineTo(x + w + markLen, y + h);
            ctx.moveTo(x + w, y + h);
            ctx.lineTo(x + w, y + h + markLen);
            ctx.stroke();
          }

          // Numbering
          if (layout.photoNumbersEnabled) {
            ctx.fillStyle = '#94A3B8';
            ctx.font = `${Math.round(8 * scale)}px sans-serif`;
            ctx.fillText(`#${p.copyNumber}`, x + 4, y + h - 4);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    renderSheet();
    return () => {
      isCancelled = true;
    };
  }, [project, layout, currentPage]);

  const handleDownloadPdf = async () => {
    const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
    if (!activeSrc) return;
    setIsExportingPdf(true);
    try {
      const { url, filename } = await generatePrintPdf(project, activeSrc);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('PDF generation error: ' + err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Printable Sheet Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 bg-slate-950 relative overflow-hidden">
        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-semibold text-white shadow">
              {layout.pageWidthMm.toFixed(0)} × {layout.pageHeightMm.toFixed(0)} mm Paper
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium">
              Grid: {layout.columns} cols × {layout.rows} rows ({layout.copiesPerPage}/page)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || !layout.fitsOnPage}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download Print PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Warning if layout overflows */}
        {layout.warningMessage && (
          <div className="absolute top-16 left-6 right-6 z-10 p-3 rounded-xl bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-xl">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{layout.warningMessage}</span>
          </div>
        )}

        {/* Canvas Sheet Display */}
        <div className="relative max-w-full max-h-[72vh] flex items-center justify-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-2xl overflow-auto">
          <canvas
            ref={sheetCanvasRef}
            className="max-h-[66vh] max-w-full rounded shadow-2xl bg-white object-contain"
          />
        </div>

        {/* Multi-page Navigator */}
        {layout.totalPages > 1 && (
          <div className="mt-3 flex items-center gap-3 bg-slate-900/90 px-4 py-1.5 rounded-xl border border-slate-800 shadow">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 font-medium">
              Page {currentPage + 1} of {layout.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(layout.totalPages - 1, p + 1))}
              disabled={currentPage === layout.totalPages - 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Settings & Layout Controls Sidebar */}
      <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col p-4 overflow-y-auto space-y-4">
        {/* Paper Presets */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">Paper Sheet Size</label>
          <div className="grid grid-cols-2 gap-2">
            {PAPER_PRESETS.map((paper) => {
              const isSelected = project.selectedPaperPreset === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      selectedPaperPreset: paper.id,
                      customPaperWidthMm: paper.widthMm,
                      customPaperHeightMm: paper.heightMm,
                      imageRevision: prev.imageRevision + 1,
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">{paper.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {paper.widthMm.toFixed(0)} × {paper.heightMm.toFixed(0)} mm
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orientation */}
        <div>
          <label className="text-xs font-medium text-slate-300 block mb-1.5">Page Orientation</label>
          <div className="grid grid-cols-2 gap-2">
            {(['PORTRAIT', 'LANDSCAPE'] as const).map((orient) => (
              <button
                key={orient}
                onClick={() =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    pageOrientation: orient,
                    imageRevision: prev.imageRevision + 1,
                  }))
                }
                className={`py-2 rounded-xl border text-xs font-medium transition ${
                  project.pageOrientation === orient
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {orient === 'PORTRAIT' ? 'Portrait' : 'Landscape'}
              </button>
            ))}
          </div>
        </div>

        {/* Copy Count Slider */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Total Copies</span>
            <span className="text-xs font-mono font-bold text-indigo-400">{project.copies}</span>
          </div>
          <input
            type="range"
            min="1"
            max="32"
            value={project.copies}
            onChange={(e) =>
              onUpdateProject((prev) => ({
                ...prev,
                copies: parseInt(e.target.value),
                imageRevision: prev.imageRevision + 1,
              }))
            }
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>1</span>
            <span>8 (Standard)</span>
            <span>16</span>
            <span>32</span>
          </div>
        </div>

        {/* Spacing & Margins */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-300 block">Print Spacing &amp; Margins</label>

          {/* Margins */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Page Margin</span>
              <span className="font-mono text-slate-400">{project.marginMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={project.marginMm}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  marginMm: parseInt(e.target.value),
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Horizontal Gap */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Horizontal Gap</span>
              <span className="font-mono text-slate-400">{project.horizontalGapMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={project.horizontalGapMm}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  horizontalGapMm: parseInt(e.target.value),
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Vertical Gap */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Vertical Gap</span>
              <span className="font-mono text-slate-400">{project.verticalGapMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              value={project.verticalGapMm}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  verticalGapMm: parseInt(e.target.value),
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>

        {/* Guides & Markings */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5">
          <label className="text-xs font-bold text-slate-300 block">Print Finishing Guides</label>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span>Dashed Cut Guides</span>
            <input
              type="checkbox"
              checked={project.cutGuidesEnabled}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  cutGuidesEnabled: e.target.checked,
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span>Corner Crop Marks</span>
            <input
              type="checkbox"
              checked={project.cropMarksEnabled}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  cropMarksEnabled: e.target.checked,
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span>Photo Copy Numbers (#1, #2)</span>
            <input
              type="checkbox"
              checked={project.photoNumbersEnabled}
              onChange={(e) =>
                onUpdateProject((prev) => ({
                  ...prev,
                  photoNumbersEnabled: e.target.checked,
                  imageRevision: prev.imageRevision + 1,
                }))
              }
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
