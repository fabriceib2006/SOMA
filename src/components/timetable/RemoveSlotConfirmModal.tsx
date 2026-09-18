import React, { useState } from 'react';
import { AcademicActivity } from '../../types';
import { formatTimeSlot } from '../../lib/timetableUtils';
import { ShieldCheck, Trash2, X, AlertTriangle } from 'lucide-react';

interface RemoveSlotConfirmModalProps {
  activity: AcademicActivity | null;
  dayOfWeek: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RemoveSlotConfirmModal({
  activity,
  dayOfWeek,
  isOpen,
  onClose,
  onConfirm
}: RemoveSlotConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !activity) return null;

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      await onConfirm();
      setDeleting(false);
      onClose();
    } catch (err) {
      console.error('Failed to remove slot:', err);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b flex justify-between items-center bg-red-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Remove Timetable Slot</h3>
              <p className="text-xs text-neutral-500">From {dayOfWeek}'s schedule across all weeks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-700">
            Are you sure you want to remove <strong className="text-neutral-900">"{activity.title}"</strong> ({formatTimeSlot(activity.startTime, activity.endTime)}) from <strong className="text-neutral-900">{dayOfWeek}</strong> across all weeks of the semester?
          </p>

          {/* Explicit Academic Safety Guarantee Box */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Academic Data Safety Guarantee</span>
            </div>
            <p className="text-xs text-emerald-900/80 leading-relaxed">
              This action <strong>only</strong> clears this timetable time slot from {dayOfWeek}. 
              Your <strong>Library module, uploaded lectures, topic mastery notes, and assessment history</strong> will remain 100% safe and intact.
            </p>
          </div>

          <div className="pt-3 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="px-4 py-2.5 border rounded-xl text-neutral-600 text-sm font-medium hover:bg-neutral-50"
            >
              Keep Slot
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {deleting ? 'Removing...' : 'Remove From Day'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
