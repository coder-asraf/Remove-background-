import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Save, Trash2, Copy, Edit2, Calendar } from 'lucide-react';
import { ImageProject } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: ImageProject;
  onLoadProject: (project: ImageProject) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<ImageProject[]>([]);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Load projects from localStorage
  const loadSavedProjects = () => {
    try {
      const saved = localStorage.getItem('cutout_studio_projects');
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveCurrentProject = () => {
    try {
      const updatedList = [
        currentProject,
        ...projects.filter((p) => p.projectId !== currentProject.projectId),
      ];
      localStorage.setItem('cutout_studio_projects', JSON.stringify(updatedList));
      setProjects(updatedList);
    } catch (e: any) {
      alert('Failed to save project offline: ' + e.message);
    }
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter((p) => p.projectId !== id);
    localStorage.setItem('cutout_studio_projects', JSON.stringify(updated));
    setProjects(updated);
  };

  const duplicateProject = (project: ImageProject) => {
    const copy: ImageProject = {
      ...project,
      projectId: 'proj_' + Math.random().toString(36).substring(2, 9),
      projectName: `${project.projectName} (Copy)`,
      savedAt: Date.now(),
    };
    const updated = [copy, ...projects];
    localStorage.setItem('cutout_studio_projects', JSON.stringify(updated));
    setProjects(updated);
  };

  const startRename = (project: ImageProject) => {
    setEditingNameId(project.projectId);
    setTempName(project.projectName);
  };

  const saveRename = (id: string) => {
    const updated = projects.map((p) =>
      p.projectId === id ? { ...p, projectName: tempName || 'Untitled Project' } : p
    );
    localStorage.setItem('cutout_studio_projects', JSON.stringify(updated));
    setProjects(updated);
    setEditingNameId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Local Project Storage</h3>
              <p className="text-xs text-slate-400">100% offline project state persistence</p>
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
          {/* Quick Save Current */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Save Current Workspace</div>
              <div className="text-[11px] text-slate-400">
                "{currentProject.projectName}" • {currentProject.rotationDegrees}° rot • {currentProject.copies} copies
              </div>
            </div>
            <button
              onClick={saveCurrentProject}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Project</span>
            </button>
          </div>

          {/* Saved Projects List */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Saved Projects ({projects.length})
            </h4>

            {projects.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No saved projects yet. Click "Save Project" above to persist your edits offline.
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((proj) => {
                  const isCurrent = proj.projectId === currentProject.projectId;
                  const isEditing = editingNameId === proj.projectId;

                  return (
                    <div
                      key={proj.projectId}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {proj.backgroundRemovedSrc || proj.originalImageSrc ? (
                            <img
                              src={proj.backgroundRemovedSrc || proj.originalImageSrc}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FolderOpen className="w-5 h-5 text-slate-600" />
                          )}
                        </div>

                        {/* Title and metadata */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-white"
                              />
                              <button
                                onClick={() => saveRename(proj.projectId)}
                                className="text-xs text-indigo-400 font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-white truncate">
                                {proj.projectName}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                                  Active
                                </span>
                              )}
                              <button
                                onClick={() => startRename(proj)}
                                className="text-slate-500 hover:text-slate-300"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{new Date(proj.savedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{proj.copies} copies</span>
                            <span>•</span>
                            <span>{proj.rotationDegrees}°</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => duplicateProject(proj)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProject(proj.projectId)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-rose-400 hover:text-rose-300"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onLoadProject(proj);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs ml-1"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
