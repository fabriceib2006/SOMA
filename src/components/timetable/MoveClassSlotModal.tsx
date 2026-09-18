import React, { useState } from 'react';
import { AcademicActivity, AcademicDay, Week } from '../../types';
import { moveClassSlotAcrossAllWeeks } from '../../lib/semesterFirestore';
import { cleanTimeValues, formatTimeSlot } from '../../lib/timetableUtils';
import { Calendar, ArrowRight, X, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

interface MoveClassSlotModalProps {
  activity: AcademicActivity | null;
  currentDayId: string;
  currentDayName: string;
  allDays: AcademicDay[];
  weeks: Week[];
  isOpen: boolean;
  onClose: () => void;
  onMoved: () => void;
}

const ALL_DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export function MoveClassSlotModal({
  activity,
  currentDayId,
  currentDayName,
  allDays,
  weeks,
  isOpen,
  onClose,
  onMoved
}: MoveClassSlotModalProps) {
  const [targetDayOfWeek, setTargetDayOfWeek] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute available days of the week present in the semester
  const availableDaysOfWeek = React.useMemo(() => {
    if (allDays && allDays.length > 0) {
      const presentDays = new Set(allDays.map(d => d.dayOfWeek));
      const matched = ALL_DAYS_OF_WEEK.filter(d => presentDays.has(d as any));
      if (matched.length > 0) return matched;
    }
    return ALL_DAYS_OF_WEEK;
  }, [allDays]);

  React.useEffect(() => {
    if (activity) {
      const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(activity.startTime, activity.endTime);
      setStartTime(cleanStart || '09:00');
      setEndTime(cleanEnd || '12:00');

      // Default to first day that is not the current day of the week
      const otherDay = availableDaysOfWeek.find(
        d => d.toLowerCase() !== currentDayName.toLowerCase()
      );
      if (otherDay) {
        setTargetDayOfWeek(otherDay);
      }
    }
  }, [activity, currentDayName, availableDaysOfWeek]);

  if (!isOpen || !activity) return null;

  const isCurrentDay = (day: string) => day.toLowerCase() === currentDayName.toLowerCase();

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDayOfWeek || isCurrentDay(targetDayOfWeek)) {
      setError('Please select a different destination day of the week');
      return;
    }

    try {
      setMoving(true);
      setError(null);
      const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(startTime, endTime);

      await moveClassSlotAcrossAllWeeks({
        activity,
        sourceDayOfWeek: currentDayName,
        targetDayOfWeek,
        startTime: cleanStart || '09:00',
        endTime: cleanEnd || '12:00',
        allDays,
        weeks
      });

      setMoving(false);
      onMoved();
      onClose();
    } catch (err: any) {
      console.error('Failed to move activity across weeks:', err);
      setError(err?.message || 'Failed to move slot');
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-neutral-50/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Timetable Rescheduling
            </span>
            <h3 className="text-lg font-bold text-neutral-900 mt-1">Move Class to Another Day</h3>
            <p className="text-xs text-neutral-500">
              Applies across all weeks of the semester so every week stays synchronized.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleMove} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current slot info */}
          <div className="p-4 bg-neutral-50 rounded-2xl border flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Current Slot</span>
              <p className="text-sm font-bold text-neutral-900">{activity.title}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {currentDayName} • {formatTimeSlot(activity.startTime, activity.endTime)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Destination Day Selection */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-neutral-800">
                Destination Day
              </label>
              <span className="text-[11px] text-neutral-500">
                Applied to all {weeks.length > 0 ? `${weeks.length} weeks` : 'weeks'}
              </span>
            </div>

            {/* Interactive Day Button Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {availableDaysOfWeek.map(day => {
                const isCurrent = isCurrentDay(day);
                const isSelected = day.toLowerCase() === targetDayOfWeek.toLowerCase();
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setTargetDayOfWeek(day)}
                    className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all border ${
                      isCurrent 
                        ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60' 
                        : isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs font-bold ring-2 ring-purple-400/30'
                        : 'bg-white hover:bg-purple-50 text-neutral-700 hover:text-purple-700 border-neutral-200'
                    }`}
                  >
                    <span className="text-xs">{day.slice(0, 3)}</span>
                    <span className="text-[9px] font-normal opacity-85 mt-0.5">
                      {isCurrent ? 'Current' : isSelected ? 'Active' : 'Pick'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Alternative */}
            <select
              value={targetDayOfWeek}
              onChange={e => setTargetDayOfWeek(e.target.value)}
              className="w-full p-2.5 border border-neutral-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
            >
              {availableDaysOfWeek.map(day => {
                const isCurrent = isCurrentDay(day);
                return (
                  <option key={day} value={day} disabled={isCurrent}>
                    {day} {isCurrent ? '(Current Day)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Desired Time Slot */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-neutral-800">
                Time Slot on Destination Day
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { setStartTime('09:00'); setEndTime('12:00'); }}
                  className="text-[10px] font-semibold px-2 py-1 border rounded-lg hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-neutral-600 transition-colors"
                >
                  09:00–12:00
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('13:00'); setEndTime('17:00'); }}
                  className="text-[10px] font-semibold px-2 py-1 border rounded-lg hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-neutral-600 transition-colors"
                >
                  13:00–17:00
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full p-2.5 border border-neutral-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Real-time synchronization notice */}
          <div className="p-3.5 bg-purple-50/80 border border-purple-200/80 rounded-2xl space-y-1 text-xs text-purple-900">
            <div className="flex items-center gap-1.5 font-bold text-purple-950">
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Synchronized Across All Weeks</span>
            </div>
            <p className="text-purple-800 leading-relaxed text-[11px] sm:text-xs">
              Moving <strong className="font-semibold text-purple-950">"{activity.title}"</strong> from <strong className="font-semibold text-purple-950">{currentDayName}</strong> to <strong className="font-semibold text-purple-950">{targetDayOfWeek}</strong> ({startTime} – {endTime}) will update this slot across every week of your semester.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-neutral-200 rounded-xl text-neutral-600 text-sm font-semibold hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={moving || !targetDayOfWeek || isCurrentDay(targetDayOfWeek)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {moving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Moving All Weeks...</span>
                </>
              ) : (
                <span>Move Class Slot</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
