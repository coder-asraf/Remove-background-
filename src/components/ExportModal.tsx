import React, { useState } from 'react';
import { X, Download, FileImage, FileText, Check, ShieldCheck } from 'lucide-react';
import { ImageProject } from '../types';
import { renderFinalCanvas, loadImage } from '../engine/canvasRenderer';
import { generatePrintPdf } from '../engine/pdfGenerator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ImageProject;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setLastDownloaded(filename);
    setTimeout(() => setLastDownloaded(null), 3000);
  };

  const exportTransparentPng = async () => {
    const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
    if (!activeSrc) return;
    setDownloading(true);
    try {
      const img = await loadImage(activeSrc);
      const canvas = renderFinalCanvas(
        { ...project, backgroundMode: 'TRANSPARENT', backgroundColor: 'transparent' },
        img,
        { includeCheckerboard: false }
      );
      const url = canvas.toDataURL('image/png', 1.0);
      triggerDownload(url, `cutout_studio_transparent_${project.projectName.replace(/\s+/g, '_').toLowerCase()}.png`);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const exportSolidPng = async () => {
    const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
    if (!activeSrc) return;
    setDownloading(true);
    try {
      const img = await loadImage(activeSrc);
      const canvas = renderFinalCanvas(
        { ...project, backgroundMode: 'SOLID_COLOR', backgroundColor: project.backgroundColor || '#FFFFFF' },
        img,
        { includeCheckerboard: false }
      );
      const url = canvas.toDataURL('image/png', 1.0);
      triggerDownload(url, `cutout_studio_photo_${project.projectName.replace(/\s+/g, '_').toLowerCase()}.png`);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const exportJpeg = async () => {
    const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
    if (!activeSrc) return;
    setDownloading(true);
    try {
      const img = await loadImage(activeSrc);
      // For JPEG, strictly composite transparency onto background color (default white if none set)
      const bgColor = project.backgroundColor !== 'transparent' ? project.backgroundColor : '#FFFFFF';
      const canvas = renderFinalCanvas(
        { ...project, backgroundMode: 'SOLID_COLOR', backgroundColor: bgColor },
        img,
        { includeCheckerboard: false }
      );
      const url = canvas.toDataURL('image/jpeg', 0.95);
      triggerDownload(url, `cutout_studio_photo_${project.projectName.replace(/\s+/g, '_').toLowerCase()}.jpg`);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const exportPdf = async () => {
    const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
    if (!activeSrc) return;
    setDownloading(true);
    try {
      const { url, filename } = await generatePrintPdf(project, activeSrc);
      triggerDownload(url, filename);
    } catch (err: any) {
      alert('PDF export failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Export Finished Image &amp; Print</h3>
              <p className="text-xs text-slate-400">High-resolution print and web formats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Transparent PNG */}
          <button
            onClick={exportTransparentPng}
            disabled={downloading}
            className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                  Transparent PNG (.png)
                </div>
                <div className="text-[11px] text-slate-400">
                  Preserves 100% alpha channel cutout and rotation
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
          </button>

          {/* Solid PNG */}
          <button
            onClick={exportSolidPng}
            disabled={downloading}
            className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-sky-300 transition">
                  Solid Background PNG (.png)
                </div>
                <div className="text-[11px] text-slate-400">
                  Composited onto selected backdrop color
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
          </button>

          {/* High-quality JPEG */}
          <button
            onClick={exportJpeg}
            disabled={downloading}
            className="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileImage className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                  High-Quality JPEG (.jpg)
                </div>
                <div className="text-[11px] text-slate-400">
                  Solid background composite with zero black halos
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
          </button>

          {/* Printable PDF Sheet */}
          <button
            onClick={exportPdf}
            disabled={downloading}
            className="w-full p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-950/60 border border-indigo-500/40 text-left transition flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-200">
                  Print-Ready Multi-Copy PDF (.pdf)
                </div>
                <div className="text-[11px] text-slate-400">
                  Physical mm dimensions, cut guides, and crop marks
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-indigo-300" />
          </button>

          {lastDownloaded && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="truncate">Saved: {lastDownloaded}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
