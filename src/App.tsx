/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { EditorView } from './components/EditorView';
import { PassportView } from './components/PassportView';
import { PrintSheetView } from './components/PrintSheetView';
import { AndroidProjectHub } from './components/AndroidProjectHub';
import { AiAnalyzerModal } from './components/AiAnalyzerModal';
import { AiEnhancerModal } from './components/AiEnhancerModal';
import { ExportModal } from './components/ExportModal';
import { ProjectsModal } from './components/ProjectsModal';
import { ImageProject } from './types';
import { createDefaultProject } from './constants/presets';
import { generateSamplePortrait } from './utils/sampleImage';

export default function App() {
  const [project, setProject] = useState<ImageProject>(() => createDefaultProject());
  const [activeTab, setActiveTab] = useState<ActiveTab>('editor');

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<ImageProject[]>([]);
  const [redoStack, setRedoStack] = useState<ImageProject[]>([]);

  // Modals state
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [isEnhancerOpen, setIsEnhancerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Automatically initialize with high-resolution sample portrait on first load
  useEffect(() => {
    if (!project.originalImageSrc) {
      const sample = generateSamplePortrait();
      setProject((prev) => ({
        ...prev,
        originalImageSrc: sample,
      }));
    }
  }, []);

  const updateProject = (updater: (prev: ImageProject) => ImageProject) => {
    setProject((prev) => {
      const next = updater(prev);
      setUndoStack((u) => [...u.slice(-15), prev]);
      setRedoStack([]);
      return next;
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setRedoStack((r) => [...r, project]);
    setProject(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, project]);
    setProject(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const fresh = createDefaultProject(result);
          fresh.projectName = file.name.replace(/\.[^/.]+$/, '');
          setUndoStack([]);
          setRedoStack([]);
          setProject(fresh);
          setActiveTab('editor');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadSample = () => {
    const sample = generateSamplePortrait();
    const fresh = createDefaultProject(sample);
    fresh.projectName = 'Biometric Passport Sample';
    setUndoStack([]);
    setRedoStack([]);
    setProject(fresh);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30">
      {/* Hidden File Picker Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Application Header */}
      <Header
        onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
        onOpenAiEnhancer={() => setIsEnhancerOpen(true)}
        onOpenAndroidHub={() => setActiveTab('android')}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        hasImage={Boolean(project.originalImageSrc)}
      />

      {/* Navigation Sub-bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasImage={Boolean(project.originalImageSrc)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'editor' && (
          <EditorView
            project={project}
            onUpdateProject={updateProject}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onLoadSampleImage={handleLoadSample}
          />
        )}

        {activeTab === 'passport' && (
          <PassportView
            project={project}
            onUpdateProject={updateProject}
            onOpenAnalyzer={() => setIsAnalyzerOpen(true)}
          />
        )}

        {activeTab === 'print' && (
          <PrintSheetView
            project={project}
            onUpdateProject={updateProject}
          />
        )}

        {activeTab === 'android' && <AndroidProjectHub />}
      </main>

      {/* Gemini Biometric Analyzer Modal (gemini-4-argon) */}
      <AiAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        imageSrc={project.backgroundRemovedSrc || project.originalImageSrc}
      />

      {/* Gemini Prompt Enhancer Modal (gemini-nano-banana-2.1) */}
      <AiEnhancerModal
        isOpen={isEnhancerOpen}
        onClose={() => setIsEnhancerOpen(false)}
        imageSrc={project.originalImageSrc}
        onApplyEditedImage={(newSrc) => {
          updateProject((prev) => ({
            ...prev,
            backgroundRemovedSrc: newSrc,
            backgroundMode: 'TRANSPARENT',
            imageRevision: prev.imageRevision + 1,
          }));
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
      />

      {/* Projects Modal */}
      <ProjectsModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentProject={project}
        onLoadProject={(loaded) => {
          setUndoStack([]);
          setRedoStack([]);
          setProject(loaded);
        }}
      />
    </div>
  );
}
