import React, { useState } from 'react';
import { X, Wand2, Sparkles, Check, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { removeBackgroundGemini } from '../engine/backgroundRemoval';

interface AiEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onApplyEditedImage: (newImageSrc: string) => void;
}

export const AiEnhancerModal: React.FC<AiEnhancerModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onApplyEditedImage,
}) => {
  const [prompt, setPrompt] = useState(
    'Remove the background cleanly and create a studio biometric passport portrait with even lighting on pure transparent background'
  );
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-nano-banana-2.1');
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      label: 'Transparent Cutout',
      prompt: 'Remove background completely with clean anti-aliased silhouette edges on transparent background',
    },
    {
      label: 'Light Blue Studio',
      prompt: 'Place the subject against a smooth, solid light blue biometric passport studio background with balanced studio softbox lighting',
    },
    {
      label: 'Pure White Backdrop',
      prompt: 'Place the subject against an evenly illuminated, pure white seamless studio backdrop with no harsh shadows behind ears',
    },
    {
      label: 'Enhance Face & Lighting',
      prompt: 'Enhance portrait lighting, eliminate glare, ensure eyes and facial features are clearly visible for official ID verification',
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || !imageSrc) return;
    setLoading(true);
    setError(null);
    try {
      const res = await removeBackgroundGemini(imageSrc, prompt);
      setEditedImage(res.imageUrl);
      setModelUsed(res.modelUsed);
    } catch (err: any) {
      setError(err.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (editedImage) {
      onApplyEditedImage(editedImage);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                AI Prompt Studio &amp; Enhancer
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/30 text-purple-300 font-mono">
                  {modelUsed}
                </span>
              </h3>
              <p className="text-xs text-slate-400">Text-driven image editing powered by Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Prompt Presets</label>
            <div className="flex flex-wrap gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p.prompt)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Editing Instructions
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Remove background cleanly and sharpen eyes..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-purple-600/30 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Generating with Gemini Nano Banana 2.1...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Prompt Edit</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparison Preview */}
          {editedImage && (
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Result Comparison
              </label>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1 text-center">Original</span>
                  <img
                    src={imageSrc}
                    alt="Original"
                    className="w-full h-44 object-contain rounded-lg bg-slate-900 border border-slate-800"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-purple-300 font-semibold block mb-1 text-center">
                    AI Output ({modelUsed})
                  </span>
                  <img
                    src={editedImage}
                    alt="Edited"
                    className="w-full h-44 object-contain rounded-lg bg-slate-900 border border-purple-500/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!editedImage}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Studio Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
