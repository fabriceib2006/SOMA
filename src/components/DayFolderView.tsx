import React, { useState, useEffect } from 'react';
import { getFirestoreActivities, addFirestoreActivity, updateFirestoreActivity, deleteFirestoreActivity } from '../lib/semesterFirestore';
import { AcademicActivity } from '../types';
import { createAssessment } from '../lib/assessmentFirestore';
import { auth } from '../lib/firebase';
import { Sparkles, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { 
  getCATDateComponents, 
  evaluateAcademicDayStatus, 
  toggleManuallyEndDay, 
  isDayManuallyEnded, 
  DAY_END_HOUR_CAT,
  CATDateComponents 
} from '../lib/catTime';

export function DayFolderView({ dayId, dayOfWeek, date }: { dayId: string; dayOfWeek: string; date: string }) {
  const [activities, setActivities] = useState<AcademicActivity[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'class' | 'assignment' | 'quiz' | 'cat' | 'exam' | 'study_session' | 'event'>('assignment');
  const [moduleName, setModuleName] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [catTime, setCatTime] = useState<CATDateComponents>(getCATDateComponents());
  const [manualTrigger, setManualTrigger] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCatTime(getCATDateComponents());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadActivities();
  }, [dayId]);

  const loadActivities = async () => {
    const list = await getFirestoreActivities(dayId);
    setActivities(list);
  };

  const dayStatus = evaluateAcademicDayStatus(date, catTime, isDayManuallyEnded(dayId));

  const handleToggleEnd = () => {
    toggleManuallyEndDay(dayId);
    setManualTrigger(prev => prev + 1);
  };

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const isTimed = newType === 'class' || newType === 'study_session';
    const cleanDate = date.includes('T') ? date.split('T')[0] : date;

    // Add activity to day
    const addedAct = await addFirestoreActivity({
      dayId,
      title: newTitle.trim(),
      type: newType,
      moduleName: moduleName.trim() || undefined,
      startTime: isTimed ? startTime : '',
      endTime: isTimed ? endTime : '',
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

  const classesList = activities.filter(a => a.type === 'class');
  const assessmentsList = activities.filter(a => a.type !== 'class');

  return (
    <div className="space-y-6">
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

      {/* Add Assessment / Activity Form */}
      <form onSubmit={handleAdd} className="bg-neutral-50 p-5 rounded-2xl border space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-neutral-800 text-sm">Add Academic Event or Assessment (Firestore)</h4>
          <span className="text-xs text-neutral-500 font-medium">
            {newType === 'assignment' ? '📌 Logged as a deadline' : 
             ['quiz', 'cat', 'exam'].includes(newType) ? '🎯 Logged as a milestone event' : '⏱️ Timed schedule'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Title (e.g. Linear Algebra CAT 1)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:border-blue-500"
          />
          <input
            type="text"
            placeholder="Course / Module (e.g. Mathematics)"
            value={moduleName}
            onChange={e => setModuleName(e.target.value)}
            className="p-2.5 border rounded-xl bg-white text-sm focus:outline-hidden focus:border-blue-500"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as any)}
            className="p-2.5 border rounded-xl bg-white text-sm font-medium focus:outline-hidden focus:border-blue-500"
          >
            <option value="assignment">Assignment (Deadline)</option>
            <option value="quiz">Quiz (Milestone)</option>
            <option value="cat">CAT (Continuous Assessment Test)</option>
            <option value="exam">Exam (Final Milestone)</option>
            <option value="class">Class (Timed Lecture)</option>
            <option value="study_session">Study Session (Timed)</option>
            <option value="event">Event</option>
          </select>
        </div>

        {(newType === 'class' || newType === 'study_session') && (
          <div className="flex gap-2">
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="p-2 border rounded-xl bg-white w-1/2 text-sm"
              placeholder="Start Time"
            />
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="p-2 border rounded-xl bg-white w-1/2 text-sm"
              placeholder="End Time"
            />
          </div>
        )}

        <div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-all text-sm shadow-sm">
            + Add to Day Folder (Firestore)
          </button>
        </div>
      </form>

      {/* Scheduled Classes from Master Timetable */}
      <div className="space-y-3">
        <h4 className="font-semibold text-neutral-800">Scheduled Classes ({classesList.length})</h4>
        {classesList.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center border rounded-xl bg-white">No classes scheduled for this day.</p>
        ) : (
          classesList.map(act => (
            <div key={act.id} className={`p-4 rounded-xl shadow-xs border flex justify-between items-center transition-all ${
              dayStatus.isEnded ? 'bg-neutral-50/80 border-neutral-200' : 'bg-white'
            }`}>
              <div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium uppercase tracking-wide ${
                  dayStatus.isEnded ? 'bg-neutral-200 text-neutral-700' : 'bg-blue-50 text-blue-600'
                }`}>
                  Class • {act.startTime} - {act.endTime}
                </span>
                <h5 className="font-bold text-neutral-900 mt-2 text-base">{act.title}</h5>
              </div>
              {dayStatus.isEnded ? (
                <span className="text-xs text-neutral-500 bg-neutral-200/70 px-3 py-1 rounded-full font-medium">
                  Concluded (23:00 CAT)
                </span>
              ) : (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Assessments & Exams List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-neutral-800">Assessments, Milestones & Deadlines ({assessmentsList.length})</h4>
        {assessmentsList.length === 0 ? (
          <p className="text-sm text-neutral-500 py-4 text-center border rounded-xl bg-white">No assignments, quizzes, CATs or exams added for this day yet.</p>
        ) : (
          assessmentsList.map(act => (
            <div key={act.id} className="p-4 bg-white rounded-xl shadow-sm border flex justify-between items-center">
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
                    <span className="text-xs text-neutral-500 font-medium">{act.startTime} - {act.endTime}</span>
                  ) : null}
                </div>
                {editingId === act.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="mt-2 p-1 border rounded w-full"
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
    </div>
  );
}
