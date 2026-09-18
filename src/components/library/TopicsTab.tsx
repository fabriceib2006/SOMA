import React, { useState } from 'react';
import { LibraryModule, LibraryTopic } from '../../types';
import { saveTopic } from '../../lib/libraryFirestore';
import { File, X, Sparkles, BookOpen, UploadCloud, Loader2 } from 'lucide-react';

export function TopicsTab({ module, topics, onRefresh }: { module: LibraryModule; topics: LibraryTopic[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [saving, setSaving] = useState(false);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await saveTopic({
      userId: 'current_user',
      semesterId: module.semesterId,
      moduleId: module.id,
      name: name.trim(),
      description: desc.trim(),
      fileName,
      fileData: fileData || undefined,
      masteryScore: 50,
      status: 'Developing',
      relatedLectures: ['Lecture 01'],
      weakAreas: [],
      strongAreas: [name.trim()]
    });
    setName('');
    setDesc('');
    setFileData(null);
    setFileName(null);
    setSaving(false);
    setShowAdd(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h3 className="text-base sm:text-xl font-bold text-neutral-900">AI Topic Map & Knowledge Graph</h3>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">Automatically extracted concepts and learning hierarchy for {module.name}.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
        >
          <BookOpen className="w-4 h-4 text-blue-200" />
          <span>+ Add Topic</span>
        </button>
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {topics.length === 0 ? (
          <div className="col-span-1 md:col-span-2 bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl border border-neutral-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center border border-purple-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-neutral-900">No topics discovered yet</h4>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              Upload lecture notes or add topics manually to build your AI topic map and track your mastery.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all inline-flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>+ Add Topic</span>
            </button>
          </div>
        ) : (
          topics.map(t => (
            <div key={t.id} className="bg-white p-4 sm:p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-xs space-y-3 sm:space-y-4 hover:border-blue-200 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                      {t.status}
                    </span>
                    <h4 className="font-bold text-base sm:text-lg text-neutral-900 mt-1.5 break-words">{t.name}</h4>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">{t.masteryScore}%</span>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Mastery</p>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">{t.description || 'Core concept extracted from module lectures.'}</p>
                
                {t.fileName && (
                  <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 w-fit max-w-full">
                    <File className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-900 font-medium truncate">{t.fileName}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex flex-wrap justify-between items-center gap-2 text-xs text-neutral-500 font-medium">
                <span className="truncate">Related: {t.relatedLectures?.length ? t.relatedLectures.join(', ') : 'Lecture 01'}</span>
                <span className="text-blue-600 font-semibold cursor-pointer hover:underline">Study Topic →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Topic Modal - Fully Responsive Bottom-Sheet on Mobile, Centered Modal on Tablet/Desktop */}
      {showAdd && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowAdd(false);
          }}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-100 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 uppercase tracking-wider truncate">
                    Knowledge Graph
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 mt-0.5 truncate">Add Topic</h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !saving && setShowAdd(false)}
                disabled={saving}
                className="w-10 h-10 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-40 flex items-center justify-center shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTopic} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 py-4 sm:px-7 sm:py-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                {/* Topic Name */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Topic Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Functional Dependencies & Normal Forms"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-purple-500 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-3 focus:ring-purple-500/10 transition-all outline-hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Brief explanation, core formula, or concept summary..."
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-purple-500 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-3 focus:ring-purple-500/10 transition-all outline-hidden resize-y min-h-[70px]"
                  />
                </div>
                
                {/* File Upload - Drag & Drop */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-neutral-700">Attach Reference Material</label>
                    <span className="text-[11px] text-neutral-400 font-normal">Optional</span>
                  </div>

                  {fileName ? (
                    <div className="flex items-center justify-between p-3 border border-purple-200 rounded-2xl bg-purple-50/70 shadow-2xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <File className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-sm font-semibold text-purple-950 truncate">{fileName}</p>
                          <p className="text-[10px] text-purple-600 font-medium">Topic material attached</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setFileName(null); setFileData(null); }}
                        className="text-neutral-400 hover:text-red-500 hover:bg-white p-2 rounded-xl transition-colors shrink-0 ml-2"
                        title="Remove file"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative group rounded-2xl border-2 border-dashed transition-all p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-2 ${
                        isDragging 
                          ? 'border-purple-500 bg-purple-50/60 scale-[1.01]' 
                          : 'border-neutral-200 hover:border-purple-400 bg-neutral-50/40 hover:bg-purple-50/20'
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-neutral-200/80 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-800 text-xs sm:text-sm">
                          <span className="text-purple-600 underline underline-offset-2">Click to browse</span> or drag & drop
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          PDF, Image, Word, or text summary
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Stacked on mobile, row on tablet/desktop */}
              <div className="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-neutral-100 bg-neutral-50/60 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowAdd(false)} 
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !name.trim()} 
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Topic...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save Topic</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
