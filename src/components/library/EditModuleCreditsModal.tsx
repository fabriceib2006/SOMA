import React, { useState, useEffect } from 'react';
import { LibraryModule } from '../../types';
import { updateLibraryModule } from '../../lib/libraryFirestore';
import { Award, BookOpen, User, Hash, AlignLeft, X, Check, AlertCircle, Info } from 'lucide-react';

interface EditModuleCreditsModalProps {
  module: LibraryModule | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Partial<LibraryModule>) => void;
}

export function EditModuleCreditsModal({
  module,
  isOpen,
  onClose,
  onSaved
}: EditModuleCreditsModalProps) {
  const [credits, setCredits] = useState<number>(3);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (module) {
      setCredits(module.credits || 3);
      setName(module.name || '');
      setCode(module.code || '');
      setLecturer(module.lecturer || '');
      setDescription(module.description || '');
      setError(null);
    }
  }, [module]);

  if (!isOpen || !module) return null;

  const handleQuickCredits = (val: number) => {
    setCredits(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Module name is required');
      return;
    }
    const cleanCredits = Math.max(1, Math.min(30, Number(credits) || 3));

    try {
      setSaving(true);
      setError(null);
      const updates = {
        name: name.trim(),
        code: code.trim() || 'MOD',
        credits: cleanCredits,
        lecturer: lecturer.trim() || 'TBD',
        description: description.trim()
      };

      await updateLibraryModule(module.id, updates);
      setSaving(false);
      onSaved(updates);
      onClose();
    } catch (err: any) {
      console.error('Error updating module:', err);
      setError(err?.message || 'Failed to update module');
      setSaving(false);
    }
  };

  const getCreditBadgeInfo = (c: number) => {
    if (c >= 6) {
      return {
        label: 'Heavy Academic Weight',
        desc: 'Substantial semester commitment. SOMA AI allocates priority study blocks.',
        color: 'bg-purple-50 text-purple-700 border-purple-200'
      };
    } else if (c >= 4) {
      return {
        label: 'Core Academic Course',
        desc: 'Standard major curriculum load. Balanced weekly study allocation.',
        color: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    } else {
      return {
        label: 'Elective / Modular Load',
        desc: 'Lower credit footprint. Standard review and test preparation.',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }
  };

  const badge = getCreditBadgeInfo(credits);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex justify-between items-start bg-neutral-50/60 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 inline-block mb-1">
              Authoritative Academic Metadata
            </span>
            <h3 className="text-base sm:text-lg font-bold text-neutral-900">Edit Module & Academic Credits</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Updates credit weighting across SOMA's library, AI tutor, and study planner.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Module Credits Section */}
          <div className="p-4 sm:p-5 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-600" />
                Academic Credits (Weighting)
              </label>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={credits}
                  onChange={e => setCredits(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 p-2.5 border rounded-xl bg-white text-base font-bold text-neutral-900 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-xs text-neutral-500 font-medium">Credits</span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto overflow-x-auto py-1">
                {[2, 3, 4, 5, 6].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickCredits(val)}
                    className={`min-w-[36px] h-9 px-3 rounded-xl border text-xs font-bold transition-all ${
                      credits === val 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' 
                        : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 flex items-start gap-1.5 leading-relaxed pt-1 border-t border-neutral-200/60">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <span>{badge.desc}</span>
            </p>
          </div>

          {/* Module Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Module / Course Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Soil Mechanics"
                className="w-full p-3 border border-neutral-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="ENG 301"
                className="w-full p-3 border border-neutral-200 rounded-xl bg-white text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Lecturer */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Lecturer / Instructor
            </label>
            <input
              type="text"
              value={lecturer}
              onChange={e => setLecturer(e.target.value)}
              placeholder="e.g. Dr. K. Mwanza"
              className="w-full p-3 border border-neutral-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Course Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief summary of course topics and objectives..."
              className="w-full p-3 border border-neutral-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-neutral-200 rounded-xl text-neutral-700 text-sm font-semibold hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
