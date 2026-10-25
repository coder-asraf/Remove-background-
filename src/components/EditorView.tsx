import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Crop,
  Sun,
  Contrast,
  Palette,
  Eye,
  Sliders,
  Check,
  Sparkles,
  Zap,
  Upload,
  AlertCircle,
  FlipHorizontal,
  FlipVertical,
} from 'lucide-react';
import { ImageProject, CropRect } from '../types';
import { COLOR_SWATCHES } from '../constants/presets';
import { renderFinalCanvas, loadImage } from '../engine/canvasRenderer';
import { removeBackgroundOffline, removeBackgroundGemini, removeBackgroundBgNinja } from '../engine/backgroundRemoval';

interface EditorViewProps {
  project: ImageProject;
  onUpdateProject: (updater: (prev: ImageProject) => ImageProject) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onLoadSampleImage: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  project,
  onUpdateProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onLoadSampleImage,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [showBefore, setShowBefore] = useState(false);
  const [cropActive, setCropActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'transform' | 'crop' | 'color' | 'adjust'>('transform');

  // Live Canvas Rendering synchronized with Single Source of Truth
  useEffect(() => {
    let isCancelled = false;
    const render = async () => {
      const activeSrc = showBefore
        ? project.originalImageSrc
        : (project.backgroundRemovedSrc || project.originalImageSrc);

      if (!activeSrc) return;

      try {
        const img = await loadImage(activeSrc);
        if (isCancelled) return;

        // Render preview with checkerboard pattern for transparency
        const canvas = renderFinalCanvas(
          showBefore ? { ...project, rotationDegrees: 0, cropRectangle: null, brightness: 0, contrast: 0, saturation: 0 } : project,
          img,
          { includeCheckerboard: true }
        );

        const targetCanvas = previewCanvasRef.current;
        if (targetCanvas) {
          targetCanvas.width = canvas.width;
          targetCanvas.height = canvas.height;
          const ctx = targetCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvas, 0, 0);
          }
        }
      } catch (err) {
        console.error('Preview render error:', err);
      }
    };

    render();
    return () => {
      isCancelled = true;
    };
  }, [project, showBefore]);

  // Rotations - strictly preserving transparency (CRITICAL BUG FIX 1)
  const handleRotate = (delta: number) => {
    onUpdateProject((prev) => {
      const newDegrees = ((prev.rotationDegrees + delta) % 360 + 360) % 360;
      return {
        ...prev,
        rotationDegrees: newDegrees,
        imageRevision: prev.imageRevision + 1,
      };
    });
  };

  const handleFineRotate = (deg: number) => {
    onUpdateProject((prev) => ({
      ...prev,
      rotationDegrees: deg,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  const handleFlip = (axis: 'h' | 'v') => {
    onUpdateProject((prev) => ({
      ...prev,
      horizontalFlip: axis === 'h' ? !prev.horizontalFlip : prev.horizontalFlip,
      verticalFlip: axis === 'v' ? !prev.verticalFlip : prev.verticalFlip,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  // Background Removal triggers
  const handleRemoveBgOffline = async () => {
    if (!project.originalImageSrc) return;
    setIsProcessing(true);
    setProcessingMsg('Running 100% Offline Edge Segmentation...');
    try {
      const transparentDataUrl = await removeBackgroundOffline(project.originalImageSrc);
      onUpdateProject((prev) => ({
        ...prev,
        backgroundRemovedSrc: transparentDataUrl,
        backgroundMode: 'TRANSPARENT',
        imageRevision: prev.imageRevision + 1,
      }));
    } catch (err: any) {
      alert('Offline background removal failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBgGemini = async () => {
    if (!project.originalImageSrc) return;
    setIsProcessing(true);
    setProcessingMsg('Removing background via Gemini AI (Nano Banana 2.1)...');
    try {
      const res = await removeBackgroundGemini(project.originalImageSrc);
      onUpdateProject((prev) => ({
        ...prev,
        backgroundRemovedSrc: res.imageUrl,
        backgroundMode: 'TRANSPARENT',
        imageRevision: prev.imageRevision + 1,
      }));
    } catch (err: any) {
      alert('AI removal note: ' + err.message + '\nFalling back to high-accuracy offline keyer.');
      await handleRemoveBgOffline();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveBgNinja = async () => {
    if (isProcessing || !project.originalImageSrc) return;
    setIsProcessing(true);
    setProcessingMsg('Removing background via BGNinja API (No key required)...');
    try {
      const dataUrl = await removeBackgroundBgNinja(project.originalImageSrc);
      onUpdateProject((prev) => ({
        ...prev,
        backgroundRemovedSrc: dataUrl,
        backgroundMode: 'TRANSPARENT',
        imageRevision: prev.imageRevision + 1,
      }));
    } catch (err: any) {
      alert('BGNinja note: ' + err.message + '\nYou can also use the 100% Offline Edge Keyer.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Background color selection
  const handleColorSelect = (hex: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      backgroundMode: hex === 'transparent' ? 'TRANSPARENT' : 'SOLID_COLOR',
      backgroundColor: hex,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  // Adjustments
  const handleAdjustmentChange = (key: 'brightness' | 'contrast' | 'saturation', val: number) => {
    onUpdateProject((prev) => ({
      ...prev,
      [key]: val,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  const resetAllEdits = () => {
    onUpdateProject((prev) => ({
      ...prev,
      rotationDegrees: 0,
      cropRectangle: null,
      horizontalFlip: false,
      verticalFlip: false,
      backgroundMode: 'TRANSPARENT',
      backgroundColor: 'transparent',
      brightness: 0,
      contrast: 0,
      saturation: 0,
      sharpness: 0,
      imageRevision: prev.imageRevision + 1,
    }));
  };

  // Preset aspect ratio cropping
  const applyCropRatio = (ratio: number | null) => {
    if (!ratio) {
      onUpdateProject((prev) => ({ ...prev, cropRectangle: null, imageRevision: prev.imageRevision + 1 }));
      setCropActive(false);
      return;
    }
    // Calculate centered crop box with target ratio
    // If ratio < 1 (portrait): height is 1, width = ratio
    // If ratio >= 1 (landscape): width is 1, height = 1 / ratio
    let w = 0.8;
    let h = 0.8;
    if (ratio < 1) {
      h = 0.85;
      w = h * ratio;
    } else {
      w = 0.85;
      h = w / ratio;
    }
    const left = (1 - w) / 2;
    const top = (1 - h) / 2;
    onUpdateProject((prev) => ({
      ...prev,
      cropRectangle: { left, top, right: left + w, bottom: top + h },
      imageRevision: prev.imageRevision + 1,
    }));
    setCropActive(true);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Central Interactive Preview Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 bg-slate-950 relative overflow-hidden">
        {/* Top Floating Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Rot: {project.rotationDegrees.toFixed(0)}°
            </span>
            {project.backgroundRemovedSrc && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium">
                Alpha Channel Intact (ARGB_8888)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => setShowBefore(!showBefore)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow ${
                showBefore
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showBefore ? 'Original (Before)' : 'Hold to View Before'}</span>
            </button>
            <button
              onClick={resetAllEdits}
              className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
              title="Reset All Edits"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display Viewport */}
        <div className="relative max-w-full max-h-[68vh] flex items-center justify-center p-2 rounded-2xl bg-slate-900/50 border border-slate-800/80 shadow-2xl overflow-hidden">
          <canvas
            ref={previewCanvasRef}
            className="max-h-[64vh] max-w-full rounded-xl object-contain shadow-lg"
          />

          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-200 animate-pulse">{processingMsg}</p>
            </div>
          )}
        </div>

        {/* Quick Demo Helper if no image */}
        {!project.originalImageSrc && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Upload a Portrait or ID Photo</h3>
            <p className="text-sm text-slate-400 max-w-md mb-5">
              Experience lossless alpha rotation, biometric passport guides, solid color swaps, and multi-copy print sheet generation.
            </p>
            <button
              onClick={onLoadSampleImage}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load High-Res Sample Portrait</span>
            </button>
          </div>
        )}
      </div>

      {/* Editing Controls Sidebar */}
      <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-auto lg:h-[calc(100vh-60px)] overflow-y-auto">
        {/* AI Background Removal Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                AI Background Removal
              </h3>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
              Zero-Loss Alpha
            </span>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleRemoveBgNinja}
              disabled={isProcessing || !project.originalImageSrc}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white border border-indigo-500 text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>BGNinja AI Removal (Free • No Key Required)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRemoveBgOffline}
                disabled={isProcessing || !project.originalImageSrc}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <span>Offline Edge Keyer</span>
              </button>

              <button
                onClick={handleRemoveBgGemini}
                disabled={isProcessing || !project.originalImageSrc}
                className="px-3 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 disabled:opacity-50 text-purple-200 border border-purple-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Gemini Prompt</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Tool Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-2 pt-2 gap-1">
          {[
            { id: 'transform', label: 'Rotate & Flip', icon: RotateCw },
            { id: 'crop', label: 'Crop', icon: Crop },
            { id: 'color', label: 'Background', icon: Palette },
            { id: 'adjust', label: 'Adjust', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-t-lg transition border-b-2 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Rotate & Flip (SOLVES BUG 1) */}
        {activeTab === 'transform' && (
          <div className="p-4 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300">
                  90° Rotation (Transparency Preserved)
                </label>
                <span className="text-[10px] text-slate-400">Never adds black fill</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleRotate(-90)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>-90° (CCW)</span>
                </button>
                <button
                  onClick={() => handleRotate(90)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCw className="w-4 h-4 text-indigo-400" />
                  <span>+90° (CW)</span>
                </button>
                <button
                  onClick={() => handleRotate(180)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span>180°</span>
                </button>
              </div>
            </div>

            {/* Fine Rotation Slider */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Fine Rotation Angle</label>
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  {project.rotationDegrees.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="0.5"
                value={project.rotationDegrees}
                onChange={(e) => handleFineRotate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
                <span>270°</span>
                <span>360°</span>
              </div>
            </div>

            {/* Flip Operations */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-2">Flip Image</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleFlip('h')}
                  className={`py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    project.horizontalFlip
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span>Flip Horizontal</span>
                </button>
                <button
                  onClick={() => handleFlip('v')}
                  className={`py-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                    project.verticalFlip
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  <span>Flip Vertical</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cropping */}
        {activeTab === 'crop' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Aspect Ratio Presets</label>
              {project.cropRectangle && (
                <button
                  onClick={() => applyCropRatio(null)}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Reset Crop
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Original / Free', ratio: null },
                { name: '1:1 Square (Passport US)', ratio: 1 },
                { name: '35:45 (EU Passport)', ratio: 35 / 45 },
                { name: '3:4 Portrait', ratio: 3 / 4 },
                { name: '4:3 Landscape', ratio: 4 / 3 },
                { name: '4:5 Social / Print', ratio: 4 / 5 },
                { name: '5:7 Frame Size', ratio: 5 / 7 },
                { name: '2:3 Classic Photo', ratio: 2 / 3 },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => applyCropRatio(item.ratio)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium text-left transition flex items-center justify-between"
                >
                  <span>{item.name}</span>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              Cropping maintains physical proportions without stretching facial anatomy. Preserves the alpha channel completely.
            </p>
          </div>
        )}

        {/* Tab 3: Background Colors */}
        {activeTab === 'color' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Backdrop Color</label>
              <span className="text-[10px] text-slate-400">Alpha-aware compositing</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {COLOR_SWATCHES.map((swatch) => {
                const isSelected =
                  (swatch.value === 'transparent' && project.backgroundMode === 'TRANSPARENT') ||
                  project.backgroundColor.toLowerCase() === swatch.value.toLowerCase();

                return (
                  <button
                    key={swatch.value}
                    onClick={() => handleColorSelect(swatch.value)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full border shadow-sm flex items-center justify-center relative overflow-hidden ${
                        swatch.value === 'transparent'
                          ? 'border-slate-600 bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)] bg-[size:10px_10px] bg-white'
                          : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: swatch.value !== 'transparent' ? swatch.value : undefined }}
                    >
                      {isSelected && (
                        <Check
                          className={`w-5 h-5 ${
                            swatch.name === 'White' || swatch.name === 'Light Blue' || swatch.name === 'Light Gray'
                              ? 'text-slate-900'
                              : 'text-white'
                          }`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">
                      {swatch.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Color Picker */}
            <div className="pt-2">
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Custom Hex Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={project.backgroundColor === 'transparent' ? '#ffffff' : project.backgroundColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  className="w-10 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={project.backgroundColor}
                  onChange={(e) => handleColorSelect(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Image Adjustments */}
        {activeTab === 'adjust' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">Tone &amp; Color</label>
              <button
                onClick={() => {
                  handleAdjustmentChange('brightness', 0);
                  handleAdjustmentChange('contrast', 0);
                  handleAdjustmentChange('saturation', 0);
                }}
                className="text-xs text-indigo-400 hover:underline"
              >
                Reset Tone
              </button>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Brightness
                </span>
                <span className="text-xs font-mono text-slate-400">{project.brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={project.brightness}
                onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Contrast className="w-3.5 h-3.5 text-sky-400" /> Contrast
                </span>
                <span className="text-xs font-mono text-slate-400">{project.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={project.contrast}
                onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-pink-400" /> Saturation
                </span>
                <span className="text-xs font-mono text-slate-400">{project.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={project.saturation}
                onChange={(e) => handleAdjustmentChange('saturation', parseInt(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
