import React, { useState, useEffect } from 'react';
import { X, ScanFace, CheckCircle2, AlertCircle, XCircle, Sparkles, RefreshCw } from 'lucide-react';
import { GeminiAnalysisResult } from '../types';

interface AiAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
}

export const AiAnalyzerModal: React.FC<AiAnalyzerModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeminiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!imageSrc) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageSrc,
          documentType: 'Standard Biometric Passport & Visa',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || `Server returned ${response.status}`);
      }

      const data: GeminiAnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to inspect image with Gemini 4 Argon');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result && !loading) {
      runAnalysis();
    }
  }, [isOpen, imageSrc]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ScanFace className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Biometric Photo Verification
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono">
                  gemini-4-argon
                </span>
              </h3>
              <p className="text-xs text-slate-400">Official biometric &amp; passport standard audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-300 animate-pulse">
                Auditing framing, lighting, contrast &amp; compliance with Gemini 4 Argon...
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Analysis Failed</p>
                <p className="text-rose-300/80 mt-0.5">{error}</p>
                <button
                  onClick={runAnalysis}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-700 text-white font-medium text-xs transition"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Score & Verdict Card */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Biometric Score</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {result.complianceScore}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                      result.verdict === 'Approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : result.verdict === 'Needs Adjustment'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {result.verdict}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 max-w-[200px] truncate">
                    {result.summary}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Specification Checks
                </h4>
                <div className="space-y-2">
                  {result.checks?.map((check, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3"
                    >
                      {check.status === 'Pass' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {check.status === 'Warning' && (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      {check.status === 'Fail' && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{check.category}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              check.status === 'Pass'
                                ? 'text-emerald-400'
                                : check.status === 'Warning'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Expert Recommendations
                  </h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
