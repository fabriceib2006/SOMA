import React, { useState, useEffect } from 'react';
import { 
  getFirestoreActivities, 
  addFirestoreActivity, 
  updateFirestoreActivity, 
  deleteFirestoreActivity,
  removeClassSlotAcrossAllWeeks
} from '../lib/semesterFirestore';
import { AcademicActivity } from '../types';
import { createAssessment } from '../lib/assessmentFirestore';
import { auth } from '../lib/firebase';
import { 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  ArrowRightLeft, 
  Trash2, 
  Plus, 
  BookOpen, 
  ShieldCheck,
  AlertCircle 
} from 'lucide-react';
import { 
  getCATDateComponents, 
  evaluateAcademicDayStatus, 
  toggleManuallyEndDay, 
  isDayManuallyEnded, 
  DAY_END_HOUR_CAT,
  CATDateComponents 
} from '../lib/catTime';
import { useSOMA } from '../lib/realtime';
import { cleanTimeValues, formatTimeSlot, sortActivitiesChronologically } from '../lib/timetableUtils';
import { EditClassSlotModal } from './timetable/EditClassSlotModal';
import { MoveClassSlotModal } from './timetable/MoveClassSlotModal';
import { RemoveSlotConfirmModal } from './timetable/RemoveSlotConfirmModal';

export function DayFolderView({ dayId, dayOfWeek, date }: { dayId: string; dayOfWeek: string; date: string }) {
  const { modules, days: allDays, weeks, activities: realtimeActivities } = useSOMA();
  const [activities, setActivities] = useState<AcademicActivity[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'class' | 'assignment' | 'quiz' | 'cat' | 'exam' | 'study_session' | 'event'>('class');
  const [moduleName, setModuleName] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [catTime, setCatTime] = useState<CATDateComponents>(getCATDateComponents());
  const [manualTrigger, setManualTrigger] = useState(0);

  // Timetable Slot Modals State
  const [editingClassSlot, setEditingClassSlot] = useState<AcademicActivity | null>(null);
  const [movingClassSlot, setMovingClassSlot] = useState<AcademicActivity | null>(null);
  const [removingClassSlot, setRemovingClassSlot] = useState<AcademicActivity | null>(null);

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  useEffect(() => {
    const timer = setInterval(() => {
      setCatTime(getCATDateComponents());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [dayId]);

  // Keep local activities refreshed if realtime context updates
  useEffect(() => {
    if (realtimeActivities.length > 0) {
      const dayActs = realtimeActivities.filter(a => a.dayId === dayId);
      if (dayActs.length > 0) {
        setActivities(dayActs);
      }
    }
  }, [realtimeActivities, dayId]);

  const loadActivities = async () => {
    const list = await getFirestoreActivities(dayId);
    setActivities(list);
  };

  const dayStatus = evaluateAcademicDayStatus(date, catTime, isDayManuallyEnded(dayId));

  const handleToggleEnd = () => {
    toggleManuallyEndDay(dayId);
    setManualTrigger(prev => prev + 1);
  };

  const handleModuleDropdownChange = (modId: string) => {
    setSelectedModuleId(modId);
    if (modId === 'custom' || !modId) {
      // keep manual input
    } else {
      const found = modules.find(m => m.id === modId);
      if (found) {
        setModuleName(found.name);
        setNewTitle(found.name);
      }
    }
  };

  const applyTimePreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const isTimed = newType === 'class' || newType === 'study_session';
    const dateStr = typeof date === 'string' ? date : (date ? String(date) : new Date().toISOString());
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;

    const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(startTime, endTime);

    // Add activity to day
    await addFirestoreActivity({
      dayId,
      title: newTitle.trim(),
      type: newType,
      moduleName: moduleName.trim() || newTitle.trim() || undefined,
      startTime: isTimed ? cleanStart : '',
      endTime: isTimed ? cleanEnd : '',
      status: 'Upcoming'
    });

    // If it is an assessment, quiz, cat, or exam, also register it in the academic assessments collection
    if (['assignment', 'quiz', 'cat', 'exam'].includes(newType)) {
      const userId = auth.currentUser?.uid || 'current_user';
      await createAssessment(userId, {
        moduleId: 'mod_' + (moduleName.trim() || 'general').toLowerCase().replace(/\s+/g, '_'),
        title: newTitle.trim(),
        type: newType as any,
        dueDate: cleanDate,
      });
    }

    setNewTitle('');
    setModuleName('');
    setSelectedModuleId('');
    loadActivities();
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateFirestoreActivity(id, { title: editTitle.trim() });
    setEditingId(null);
    loadActivities();
  };

  const handleDelete = async (id: string) => {
    await deleteFirestoreActivity(id);
    loadActivities();
  };

  const handleConfirmRemoveSlot = async () => {
    if (!removingClassSlot) return;
    await removeClassSlotAcrossAllWeeks({
      activity: removingClassSlot,
      dayOfWeek,
      allDays,
      weeks
    });
    loadActivities();
  };

  // Chronologically sort scheduled classes by startTime
  const rawClassesList = activities.filter(a => a.type === 'class');
  const classesList = sortActivitiesChronologically(rawClassesList);
  const assessmentsList = activities.filter(a => a.type !== 'class');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white border p-5 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-neutral-900">{dayOfWeek} Folder</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              dayStatus.isEnded 
                ? 'bg-neutral-200 text-neutral-700' 
                : dayStatus.isToday 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-neutral-100 text-neutral-500'
            }`}>
              {dayStatus.badgeText}
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {catTime.shortTimeString} CAT
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToggleEnd}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              dayStatus.isEnded
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <span>{dayStatus.isEnded ? '☀️' : '🌙'}</span>
            <span>{dayStatus.isEnded ? 'Resume Day' : 'End Day (Sleep)'}</span>
          </button>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl">
            {activities.length} Items
          </span>
        </div>
      </div>

      {/* CAT Day Status Notification Banner */}
      {dayStatus.isEnded ? (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <h4 className="font-bold text-sm text-white">Day Closed (Central Africa Time)</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              This academic day concluded at 23:00 CAT for sleep and recovery. Daytime lectures and study modules are finished.
            </p>
          </div>
        </div>
      ) : dayStatus.isToday ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Academic Day • Central Africa Time (CAT) • Auto-closes at 23:00 CAT
          </span>
          <span className="text-neutral-500 font-medium">
            {DAY_END_HOUR_CAT - catTime.hours > 0 ? `${DAY_END_HOUR_CAT - catTime.hours}h until 23:00 CAT` : 'Closes soon'}
          </span>
        </div>
      ) : null}

      {/* Scheduled Classes from Master Timetable */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-neutral-900 text-base">
              Scheduled Classes ({classesList.length})
            </h4>
            <p className="text-xs text-neutral-500">
              Chronologically ordered • Easily edit, move, or remove slots without touching library modules
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            Time ascending (Morning → Afternoon)
          </span>
        </div>

        {classesList.length === 0 ? (
          <div className="p-6 text-center border border-dashed rounded-2xl bg-white text-neutral-500 space-y-1">
            <p className="font-medium text-sm">No classes scheduled for {dayOfWeek}.</p>
            <p className="text-xs text-neutral-400">Add a course from your library using the form below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classesList.map(act => (
              <div 
                key={act.id} 
                className={`p-4 rounded-2xl shadow-xs border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  dayStatus.isEnded ? 'bg-neutral-50/80 border-neutral-200' : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      dayStatus.isEnded 
                        ? 'bg-neutral-200 text-neutral-700' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      CLASS • {formatTimeSlot(act.startTime, act.endTime)}
                    </span>
                    {dayStatus.isEnded ? (
                      <span className="text-[10px] text-neutral-500 bg-neutral-200/70 px-2.5 py-0.5 rounded-full font-medium">
                        Concluded (23:00 CAT)
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                        Active Slot
                      </span>
                    )}
                  </div>
                  <h5 className="font-bold text-neutral-900 text-base">{act.title}</h5>
                  {act.moduleName && act.moduleName !== act.title && (
                    <p className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
                      {act.moduleName}
                    </p>
                  )}
                </div>

                {/* Slot Management Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => setEditingClassSlot(act)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Change time or course name for this slot"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Slot</span>
                  </button>

                  <button
                    onClick={() => setMovingClassSlot(act)}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Move this class session to another day"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Move Day</span>
                  </button>

                  <button
                    onClick={() => setRemovingClassSlot(act)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Remove slot (preserves library module)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Assessment / Class Form */}
      <form onSubmit={handleAdd} className="bg-neutral-50 p-5 rounded-2xl border space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-bold text-neutral-800 text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-blue-600" />
            Add Class Slot or Assessment to {dayOfWeek}
          </h4>
          <span className="text-xs text-neutral-500 font-medium">
            {newType === 'class' ? '📅 Adds class to timetable' :
             newType === 'assignment' ? '📌 Logged as a deadline' : 
             ['quiz', 'cat', 'exam'].includes(newType) ? '🎯 Logged as a milestone event' : '⏱️ Timed schedule'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Activity Type */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Entry Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as any)}
              className="w-full p-2.5 border rounded-xl bg-white text-sm font-medium focus:outline-hidden focus:border-blue-500"
            >
              <option value="class">Class (Timed Lecture Slot)</option>
              <option value="assignment">Assignment (Deadline)</option>
              <option value="quiz">Quiz (Milestone)</option>
              <option value="cat">CAT (Continuous Assessment Test)</option>
              <option value="exam">Exam (Final Milestone)</option>
              <option value="study_session">Study Session (Timed)</option>
              <option value="event">Academic Event</option>
            </select>
          </div>

          {/* Module Selector from Library */}
          {modules.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Select from Library</label>
              <select
                value={selectedModuleId}
                onChange={e => handleModuleDropdownChange(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:border-blue-500"
              >
                <option value="">-- Choose Library Module --</option>
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.code ? `[${m.code}] ` : ''}{m.name} ({m.credits || 3} Credits)
                  </option>
                ))}
                <option value="custom">✏️ Custom Title...</option>
              </select>
            </div>
          )}

          {/* Title input */}
          <div className={modules.length > 0 ? '' : 'md:col-span-2'}>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Title / Course Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Soil Mechanics or Mathematics"
              value={newTitle}
              onChange={e => {
                setNewTitle(e.target.value);
                setModuleName(e.target.value);
              }}
              className="w-full p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Timed options for Class or Study Session */}
        {(newType === 'class' || newType === 'study_session') && (
          <div className="p-3 bg-white rounded-xl border space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-neutral-700">Schedule Time Slot:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTimePreset('09:00', '12:00')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    startTime === '09:00' && endTime === '12:00' 
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' 
                      : 'bg-neutral-50 text-neutral-600'
                  }`}
                >
                  Morning (09:00 – 12:00)
                </button>
                <button
                  type="button"
                  onClick={() => applyTimePreset('13:00', '17:00')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                    startTime === '13:00' && endTime === '17:00' 
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold' 
                      : 'bg-neutral-50 text-neutral-600'
                  }`}
                >
                  Afternoon (13:00 – 17:00)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-0.5">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="p-2 border rounded-xl bg-white w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-0.5">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="p-2 border rounded-xl bg-white w-full text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all text-sm shadow-xs">
            + Add to {dayOfWeek} Timetable
          </button>
        </div>
      </form>

      {/* Assessments & Exams List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-neutral-800">Assessments, Milestones & Deadlines ({assessmentsList.length})</h4>
        {assessmentsList.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center border rounded-xl bg-white">No assignments, quizzes, CATs or exams added for this day yet.</p>
        ) : (
          assessmentsList.map(act => (
            <div key={act.id} className="p-4 bg-white rounded-xl shadow-xs border flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                    act.type === 'exam' ? 'bg-red-50 text-red-600' :
                    act.type === 'cat' ? 'bg-orange-50 text-orange-600' :
                    act.type === 'quiz' ? 'bg-purple-50 text-purple-600' :
                    act.type === 'assignment' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {act.type} {act.moduleName ? `• ${act.moduleName}` : ''}
                  </span>

                  {act.type === 'assignment' ? (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                      Deadline
                    </span>
                  ) : ['quiz', 'cat', 'exam'].includes(act.type) ? (
                    <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                      Milestone Event
                    </span>
                  ) : act.startTime ? (
                    <span className="text-xs text-neutral-500 font-medium">{formatTimeSlot(act.startTime, act.endTime)}</span>
                  ) : null}
                </div>
                {editingId === act.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="mt-2 p-1 border rounded w-full text-sm"
                  />
                ) : (
                  <h5 className="font-bold text-neutral-900 mt-1 text-base">{act.title}</h5>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingId === act.id ? (
                  <>
                    <button onClick={() => handleUpdate(act.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-neutral-200 rounded text-sm">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(act.id); setEditTitle(act.title); }} className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(act.id)} className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm font-medium">Delete</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timetable Editing Modals */}
      <EditClassSlotModal
        activity={editingClassSlot}
        isOpen={!!editingClassSlot}
        onClose={() => setEditingClassSlot(null)}
        onSaved={loadActivities}
        modules={modules}
      />

      <MoveClassSlotModal
        activity={movingClassSlot}
        currentDayId={dayId}
        currentDayName={dayOfWeek}
        allDays={allDays}
        weeks={weeks}
        isOpen={!!movingClassSlot}
        onClose={() => setMovingClassSlot(null)}
        onMoved={loadActivities}
      />

      <RemoveSlotConfirmModal
        activity={removingClassSlot}
        dayOfWeek={dayOfWeek}
        isOpen={!!removingClassSlot}
        onClose={() => setRemovingClassSlot(null)}
        onConfirm={handleConfirmRemoveSlot}
      />
    </div>
  );
}
