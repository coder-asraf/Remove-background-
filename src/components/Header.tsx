import React from 'react';
import {
  Scissors,
  Sparkles,
  Smartphone,
  FolderOpen,
  Download,
  ShieldCheck,
  ScanFace,
  Wand2,
} from 'lucide-react';

interface HeaderProps {
  onOpenAnalyzer: () => void;
  onOpenAiEnhancer: () => void;
  onOpenAndroidHub: () => void;
  onOpenProjects: () => void;
  onOpenExport: () => void;
  hasImage: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAnalyzer,
  onOpenAiEnhancer,
  onOpenAndroidHub,
  onOpenProjects,
  onOpenExport,
  hasImage,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white">Cutout Studio</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                v1.0.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AI Background Remover, Biometric Passport &amp; Print Studio
            </p>
          </div>
        </div>

        {/* Feature Badges & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* AI Tools */}
          {hasImage && (
            <>
              <button
                onClick={onOpenAnalyzer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                title="Biometric Passport Validation with Gemini 4 Argon"
              >
                <ScanFace className="w-4 h-4 text-emerald-400" />
                <span>Biometric Check</span>
                <span className="text-[10px] px-1 rounded bg-emerald-800/80 text-emerald-200">Argon</span>
              </button>

              <button
                onClick={onOpenAiEnhancer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
                title="AI Studio Lighting & Prompt Editing"
              >
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>AI Prompt Edit</span>
                <span className="text-[10px] px-1 rounded bg-purple-800/80 text-purple-200">Nano 2.1</span>
              </button>
            </>
          )}

          {/* Android Project Hub */}
          <button
            onClick={onOpenAndroidHub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>Android Code &amp; APK</span>
          </button>

          {/* Saved Projects */}
          <button
            onClick={onOpenProjects}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Projects</span>
          </button>

          {/* Export Action */}
          {hasImage && (
            <button
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
