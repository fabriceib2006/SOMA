import React, { useState, useEffect } from 'react';
import { Semester, Week, AcademicDay } from '../types';
import { SemesterSetupWizard } from './SemesterSetupWizard';
import { DayFolderView } from './DayFolderView';
import { clearFirestoreDatabase } from '../lib/semesterFirestore';
import { AcademicActivity } from '../types';
import { getCATDateComponents, CATDateComponents, evaluateAcademicDayStatus, isDayManuallyEnded } from '../lib/catTime';
import { useSOMA } from '../lib/realtime';
import { formatTimeSlot, sortActivitiesChronologically } from '../lib/timetableUtils';

interface SemesterDashboardProps {
  initialDay?: AcademicDay | null;
  onSelectDay?: (day: AcademicDay | null) => void;
}

export function SemesterDashboard({ initialDay, onSelectDay }: SemesterDashboardProps = {}) {
  const {
    semesters,
    activeSemester: currentSem,
    weeks,
    days: allDays,
    activities: allActivities,
    loading: somaLoading
  } = useSOMA();

  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [selectedDay, setSelectedDay] = useState<AcademicDay | null>(initialDay || null);
  const [showSetup, setShowSetup] = useState(false);
  const [catTime, setCatTime] = useState<CATDateComponents>(getCATDateComponents());

  useEffect(() => {
    const timer = setInterval(() => {
      setCatTime(getCATDateComponents());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Filter days for the selected week
  const days = selectedWeek ? allDays.filter(d => d.weekId === selectedWeek.id) : [];

  // Filter activities for the days in view
  const dayActivitiesMap: Record<string, AcademicActivity[]> = {};
  days.forEach(d => {
    dayActivitiesMap[d.id] = allActivities.filter(a => a.dayId === d.id);
  });

  useEffect(() => {
    if (weeks.length > 0 && !selectedWeek) {
      let targetWeek = weeks[0];
      if (initialDay?.weekId) {
        const match = weeks.find(w => w.id === initialDay.weekId);
        if (match) targetWeek = match;
      }
      setSelectedWeek(targetWeek);
    }
  }, [weeks, initialDay, selectedWeek]);

  const handleWeekSelect = (w: Week) => {
    setSelectedWeek(w);
    setSelectedDay(null);
  };

  const handleResetData = async () => {
    if (window.confirm('Are you sure you want to delete all generated semester data from the Firestore database and start fresh?')) {
      try {
        await clearFirestoreDatabase();
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert('Error clearing database');
      }
    }
  };

  if (somaLoading) {
    return <div className="p-8 text-center text-neutral-500 font-medium animate-pulse">Synchronizing with SOMA...</div>;
  }

  if (semesters.length === 0 || showSetup) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Initialize Semester & Master Timetable (Firestore)</h2>
            <p className="text-sm text-neutral-500">No active semester found in database. Create your semester below.</p>
          </div>
          {semesters.length > 0 && <button onClick={() => setShowSetup(false)} className="text-sm text-blue-600 underline">Back</button>}
        </div>
        <SemesterSetupWizard onComplete={() => setShowSetup(false)} />
      </div>
    );
  }

  // Use the currentSem from useSOMA or fallback to the first semester
  const fallbackSem = currentSem || semesters.find(s => s.isCurrent) || semesters[0];

  if (selectedDay) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedDay(null)} className="text-blue-600 font-medium">← Back to Week {selectedWeek?.weekNumber}</button>
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <DayFolderView dayId={selectedDay.id} dayOfWeek={selectedDay.dayOfWeek} date={selectedDay.date as any} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{fallbackSem?.name || 'Active Semester'}</span>
            <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-3 py-1 rounded-full flex items-center gap-1.5 border border-neutral-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              🕒 {catTime.shortTimeString} CAT (UTC+2) • Days End at 23:00 CAT
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2">Academic Timeline</h2>
          <p className="text-sm text-neutral-500">{weeks.length} Weeks Total • Central Africa Time Enforced</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleResetData} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-all">Clean Database / Reset (Firestore)</button>
          <button onClick={() => setShowSetup(true)} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-medium">New Semester Setup</button>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weeks.map(w => (
          <button
            key={w.id}
            onClick={() => handleWeekSelect(w)}
            className={`px-4 py-3 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${selectedWeek?.id === w.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-neutral-600 hover:bg-neutral-50'}`}
          >
            Week {w.weekNumber}
          </button>
        ))}
      </div>

      {/* Days Grid with Morning / Afternoon Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map(day => {
          const acts = dayActivitiesMap[day.id] || [];
          const classes = sortActivitiesChronologically(acts.filter(a => a.type === 'class'));
          const assessments = acts.filter(a => a.type !== 'class');
          const dayStatus = evaluateAcademicDayStatus(day.date, catTime, isDayManuallyEnded(day.id));

          return (
            <div
              key={day.id}
              onClick={() => setSelectedDay(day)}
              className={`p-5 rounded-2xl shadow-sm border transition-all cursor-pointer flex flex-col justify-between ${
                dayStatus.isEnded
                  ? 'bg-neutral-50/70 border-neutral-200 hover:border-neutral-300'
                  : dayStatus.isToday
                  ? 'bg-white border-blue-300 ring-2 ring-blue-100/70 hover:border-blue-400'
                  : 'bg-white border-neutral-200 hover:border-blue-300'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-lg text-neutral-900">{day.dayOfWeek}</span>
                    {dayStatus.isToday && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                    dayStatus.isEnded 
                      ? 'bg-neutral-200 text-neutral-700' 
                      : dayStatus.isToday 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {dayStatus.badgeText}
                  </span>
                </div>

                {/* Modules list */}
                <div className="mt-2 space-y-2">
                  {classes.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-2">No modules scheduled</p>
                  ) : (
                    classes.map(c => (
                      <div key={c.id} className={`p-2.5 rounded-xl border flex justify-between items-center text-xs ${
                        dayStatus.isEnded 
                          ? 'bg-neutral-100/70 border-neutral-200 text-neutral-600' 
                          : 'bg-blue-50/60 border-blue-100'
                      }`}>
                        <span className={`font-semibold ${dayStatus.isEnded ? 'text-neutral-700' : 'text-blue-900'}`}>{c.title}</span>
                        <span className={dayStatus.isEnded ? 'text-neutral-500' : 'text-blue-600 font-medium'}>
                          {formatTimeSlot(c.startTime, c.endTime)}
                        </span>
                      </div>
                    ))
                  )}

                  {assessments.length > 0 && (
                    <div className="pt-2 flex gap-1 flex-wrap">
                      {assessments.map(a => (
                        <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          {a.type}: {a.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-between items-center text-xs text-neutral-400">
                <span>Open Day Folder</span>
                <span>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
