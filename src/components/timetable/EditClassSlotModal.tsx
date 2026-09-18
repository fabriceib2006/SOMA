import React, { useState, useEffect } from 'react';
import { AcademicActivity, LibraryModule } from '../../types';
import { updateFirestoreActivity } from '../../lib/semesterFirestore';
import { cleanTimeValues, formatTimeSlot } from '../../lib/timetableUtils';
import { Clock, BookOpen, X, Check, AlertCircle } from 'lucide-react';

interface EditClassSlotModalProps {
  activity: AcademicActivity | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  modules: LibraryModule[];
}

export function EditClassSlotModal({
  activity,
  isOpen,
  onClose,
  onSaved,
  modules
}: EditClassSlotModalProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || '');
      setModuleName(activity.moduleName || activity.title || '');
      const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(activity.startTime, activity.endTime);
      setStartTime(cleanStart || '09:00');
      setEndTime(cleanEnd || '12:00');

      // Try to find matching module
      const matched = modules.find(m => 
        m.name.toLowerCase() === (activity.moduleName || activity.title || '').toLowerCase()
      );
      if (matched) {
        setSelectedModuleId(matched.id);
      } else {
        setSelectedModuleId('custom');
      }
    }
  }, [activity, modules]);

  if (!isOpen || !activity) return null;

  const handleModuleSelect = (modId: string) => {
    setSelectedModuleId(modId);
    if (modId === 'custom') {
      // keep current title
    } else {
      const mod = modules.find(m => m.id === modId);
      if (mod) {
        setTitle(mod.name);
        setModuleName(mod.name);
      }
    }
  };

  const applyPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a module title');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(startTime, endTime);

      await updateFirestoreActivity(activity.id, {
        title: title.trim(),
        moduleName: moduleName.trim() || title.trim(),
        startTime: cleanStart || '09:00',
        endTime: cleanEnd || '12:00'
      });

      setSaving(false);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Error updating timetable slot:', err);
      setError(err?.message || 'Failed to update slot');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b flex justify-between items-center bg-neutral-50/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Timetable Slot Editor
            </span>
            <h3 className="text-lg font-bold text-neutral-900 mt-1">Edit Timetable Session</h3>
            <p className="text-xs text-neutral-500">
              Updates only this scheduled session without modifying library contents.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Module Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">
              Select Module from Library
            </label>
            <select
              value={selectedModuleId}
              onChange={e => handleModuleSelect(e.target.value)}
              className="w-full p-3 border rounded-xl bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.name} ({m.credits || 3} Credits)
                </option>
              ))}
              <option value="custom">✏️ Custom Course Name...</option>
            </select>
          </div>

          {/* Title input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700">
              Session Title / Course Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                setModuleName(e.target.value);
              }}
              placeholder="e.g. Soil Mechanics"
              className="w-full p-3 border rounded-xl bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time Slot Presets & Inputs */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-neutral-700">
                Scheduled Time Range
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('09:00', '12:00')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    startTime === '09:00' && endTime === '12:00'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Morning (09:00 – 12:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('13:00', '17:00')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    startTime === '13:00' && endTime === '17:00'
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                      : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Afternoon (13:00 – 17:00)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">End Time</label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border text-xs text-neutral-600 flex items-center justify-between">
              <span className="font-medium text-neutral-500">Preview Time Badge:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                CLASS • {formatTimeSlot(startTime, endTime)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border rounded-xl text-neutral-600 text-sm font-medium hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
