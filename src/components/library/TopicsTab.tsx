import React, { useState } from 'react';
import { LibraryModule, LibraryTopic } from '../../types';
import { saveTopic } from '../../lib/libraryFirestore';
import { Paperclip, File, X } from 'lucide-react';

export function TopicsTab({ module, topics, onRefresh }: { module: LibraryModule; topics: LibraryTopic[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
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
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-neutral-900">AI Topic Map & Knowledge Graph</h3>
          <p className="text-sm text-neutral-500">Automatically extracted concepts and learning hierarchy for {module.name}.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          + Add Topic
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.length === 0 ? (
          <div className="col-span-2 bg-white p-12 rounded-3xl border text-center space-y-4">
            <h4 className="text-lg font-bold">No topics discovered yet</h4>
            <p className="text-sm text-neutral-500">Upload lecture notes or add topics manually to build your topic map.</p>
          </div>
        ) : (
          topics.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                    {t.status}
                  </span>
                  <h4 className="font-bold text-lg text-neutral-900 mt-2">{t.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-blue-600">{t.masteryScore}%</span>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Mastery</p>
                </div>
              </div>

              <p className="text-xs text-neutral-600">{t.description || 'Core concept extracted from module lectures.'}</p>{t.fileName && (<div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 mt-3"><File className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="text-xs text-blue-700 font-medium truncate">{t.fileName}</span></div>)}

              <div className="pt-3 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-500 font-medium">
                <span>Related: {t.relatedLectures.join(', ')}</span>
                <span className="text-blue-600 cursor-pointer hover:underline">Study Topic →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Add Topic</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Topic Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Functional Dependencies"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Brief explanation..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1">Attach Material (Image, PDF, Document)</label>
                {fileName ? (
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-blue-50/50 border-blue-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-medium text-blue-900 truncate">{fileName}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setFileName(null); setFileData(null); }}
                      className="text-blue-400 hover:text-blue-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full p-4 border-2 border-dashed rounded-xl text-sm flex flex-col items-center justify-center gap-2 text-neutral-500 hover:bg-neutral-50 hover:border-blue-300 transition-colors">
                      <Paperclip className="w-5 h-5" />
                      <span className="font-medium">Click to upload material</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="w-1/3 bg-neutral-100 py-3 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="w-2/3 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium">Save Topic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
