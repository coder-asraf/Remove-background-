import React, { useState, useEffect, useRef } from 'react';
import { BadgeCheck, Info, Ruler, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { ImageProject, PhotoPreset } from '../types';
import { PHOTO_PRESETS } from '../constants/presets';
import { renderFinalCanvas, loadImage } from '../engine/canvasRenderer';

interface PassportViewProps {
  project: ImageProject;
  onUpdateProject: (updater: (prev: ImageProject) => ImageProject) => void;
  onOpenAnalyzer: () => void;
}

export const PassportView: React.FC<PassportViewProps> = ({
  project,
  onUpdateProject,
  onOpenAnalyzer,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showBiometricGuides, setShowBiometricGuides] = useState(true);
  const [unit, setUnit] = useState<'mm' | 'in'>('mm');

  const selectedPreset = PHOTO_PRESETS.find((p) => p.id === project.selectedPhotoPreset) || PHOTO_PRESETS[0];

  // Render photo with biometric guides
  useEffect(() => {
    let isCancelled = false;
    const render = async () => {
      const activeSrc = project.backgroundRemovedSrc || project.originalImageSrc;
      if (!activeSrc) return;

      try {
        const img = await loadImage(activeSrc);
        if (isCancelled) return;

        // Render current edited image
        const rendered = renderFinalCanvas(project, img, { includeCheckerboard: true });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = rendered.width;
        canvas.height = rendered.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(rendered, 0, 0);

        // Draw Biometric Passport Guides Overlay
        if (showBiometricGuides) {
          const w = canvas.width;
          const h = canvas.height;

          // 1. Safe Margins (5%)
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);

          // 2. Center Vertical Symmetry Line
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
          ctx.stroke();

          // 3. Crown of Head line (10% from top)
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(w * 0.15, h * 0.12);
          ctx.lineTo(w * 0.85, h * 0.12);
          ctx.stroke();

          // 4. Eye Level Reference line (42% from top)
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w * 0.2, h * 0.42);
          ctx.lineTo(w * 0.8, h * 0.42);
          ctx.stroke();

          // 5. Chin Reference line (82% from top)
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w * 0.2, h * 0.82);
          ctx.lineTo(w * 0.8, h * 0.82);
          ctx.stroke();

          // Text labels for guides
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText('Crown (Top of Head)', w * 0.15, h * 0.12 - 6);
          ctx.fillText('Eye Level (35-45%)', w * 0.2, h * 0.42 - 6);
          ctx.fillText('Chin Line (70-80% height)', w * 0.2, h * 0.82 + 16);
          ctx.shadowBlur = 0;
        }
      } catch (e) {
        console.error(e);
      }
    };

    render();
    return () => {
      isCancelled = true;
    };
  }, [project, showBiometricGuides]);

  const selectPreset = (preset: PhotoPreset) => {
    onUpdateProject((prev) => ({
      ...prev,
      selectedPhotoPreset: preset.id,
      customPhotoWidthMm: preset.widthMm,
      customPhotoHeightMm: preset.heightMm,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  const handleCustomDimension = (dimension: 'w' | 'h', val: number) => {
    const mmVal = unit === 'in' ? val * 25.4 : val;
    onUpdateProject((prev) => ({
      ...prev,
      selectedPhotoPreset: 'passport_custom',
      [dimension === 'w' ? 'customPhotoWidthMm' : 'customPhotoHeightMm']: mmVal,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  // Physical dimension in mm
  const photoWidthMm = selectedPreset.id === 'passport_custom' ? project.customPhotoWidthMm : selectedPreset.widthMm;
  const photoHeightMm = selectedPreset.id === 'passport_custom' ? project.customPhotoHeightMm : selectedPreset.heightMm;

  // Pixels required at 300 DPI: pixels = mm * 300 / 25.4
  const reqPixelsW = Math.round((photoWidthMm * 300) / 25.4);
  const reqPixelsH = Math.round((photoHeightMm * 300) / 25.4);

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Central Viewport with Biometric Overlay */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 bg-slate-950 relative overflow-hidden">
        {/* Top bar info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-semibold text-white shadow flex items-center gap-1.5">
              <Ruler className="w-4 h-4 text-indigo-400" />
              <span>{photoWidthMm.toFixed(1)} × {photoHeightMm.toFixed(1)} mm</span>
              <span className="text-slate-400 font-normal">
                ({(photoWidthMm / 25.4).toFixed(2)}" × {(photoHeightMm / 25.4).toFixed(2)}")
              </span>
            </span>

            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              300 DPI Ready: {reqPixelsW} × {reqPixelsH} px
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBiometricGuides(!showBiometricGuides)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shadow ${
                showBiometricGuides
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              Biometric Guides: {showBiometricGuides ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative max-w-full max-h-[68vh] flex items-center justify-center p-2 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-2xl">
          <canvas
            ref={canvasRef}
            className="max-h-[64vh] max-w-full rounded-xl object-contain shadow-lg"
          />
        </div>

        {/* Legend */}
        {showBiometricGuides && (
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Crown Line (Top)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Eye Line (Center 42%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Chin Line (Bottom)
            </span>
          </div>
        )}
      </div>

      {/* Sidebar - Preset Selector & Biometric Verification */}
      <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col p-4 overflow-y-auto space-y-4">
        {/* Gemini Biometric Verification Button */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-indigo-500/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Gemini Biometric Inspection
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Analyze facial proportions, lighting symmetry, background uniformity, and passport standards using <strong className="text-white">gemini-4-argon</strong>.
          </p>
          <button
            onClick={onOpenAnalyzer}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <BadgeCheck className="w-4 h-4" />
            <span>Run Biometric Compliance Check</span>
          </button>
        </div>

        {/* Standard Presets List */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Standard Document Presets
          </label>
          <div className="space-y-2">
            {PHOTO_PRESETS.map((preset) => {
              const isSelected = project.selectedPhotoPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-start justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">{preset.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{preset.description}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Dimensions */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">Custom Dimensions</label>
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setUnit('mm')}
                className={`px-2 py-0.5 rounded font-medium ${unit === 'mm' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                mm
              </button>
              <button
                onClick={() => setUnit('in')}
                className={`px-2 py-0.5 rounded font-medium ${unit === 'in' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                inches
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Width ({unit})</label>
              <input
                type="number"
                step={unit === 'in' ? '0.1' : '1'}
                value={unit === 'in' ? (project.customPhotoWidthMm / 25.4).toFixed(2) : project.customPhotoWidthMm}
                onChange={(e) => handleCustomDimension('w', parseFloat(e.target.value) || 10)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Height ({unit})</label>
              <input
                type="number"
                step={unit === 'in' ? '0.1' : '1'}
                value={unit === 'in' ? (project.customPhotoHeightMm / 25.4).toFixed(2) : project.customPhotoHeightMm}
                onChange={(e) => handleCustomDimension('h', parseFloat(e.target.value) || 10)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
