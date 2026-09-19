import React, { useState, useEffect } from 'react';
import { AcademicActivity, Semester, AcademicDay } from '../types';
import { getCATDateComponents, normalizeToCATDateString, evaluateAcademicDayStatus, isDayManuallyEnded } from '../lib/catTime';
import { GeneratePlanButton } from './planner/GeneratePlanButton';
import { PlannerCard } from './planner/PlannerCard';
import { updateSessionStatus } from '../lib/plannerFirestore';
import { auth } from '../lib/firebase';
import { Calendar, Brain, Clock } from 'lucide-react';
import { SemesterDashboard } from './SemesterDashboard';
import { SemesterSetupWizard } from './SemesterSetupWizard';
import { useSOMA } from '../lib/realtime';

interface StudyPlannerProps {
  onOpenAI?: (target?: any) => void;
}

export const StudyPlanner: React.FC<StudyPlannerProps> = ({ onOpenAI }) => {
  const {
    activeSemester: semester,
    days: allDays,
    activities: allActivities,
    loading: somaLoading,
    syncStatus
  } = useSOMA();

  const [activeDay, setActiveDay] = useState<AcademicDay | null>(null);
  const [view, setView] = useState<'planner' | 'timeline'>('planner');

  // Sync activeDay with today initially if not set
  useEffect(() => {
    if (!activeDay && allDays.length > 0) {
      const cat = getCATDateComponents();
      const today = allDays.find(d => normalizeToCATDateString(d.date) === cat.dateString);
      setActiveDay(today || allDays[0]);
    }
  }, [allDays, activeDay]);

  const sessions = activeDay 
    ? allActivities.filter(a => a.dayId === activeDay.id && a.type === 'study_session')
    : [];

  const handleStartSession = (session: AcademicActivity) => {
    if (onOpenAI) {
      onOpenAI({
        topic: session.topicName || session.title,
        module: session.moduleName || 'General',
        reason: session.reason,
        objective: session.title,
        sessionId: session.id
      });
      
      if (activeDay) {
        updateSessionStatus(session.id, 'In Progress', activeDay.id);
      }
    }
  };

  const handleStatusUpdate = async (id: string, status: AcademicActivity['status']) => {
    if (activeDay) {
      await updateSessionStatus(id, status, activeDay.id);
    }
  };

  if (somaLoading) {
    return <div className="p-12 text-center text-neutral-500 font-medium animate-pulse">Synchronizing with SOMA Intelligence...</div>;
  }

  if (!semester) {
    return <SemesterSetupWizard />;
  }

  if (!activeDay) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-dashed max-w-2xl mx-auto space-y-4">
        <Calendar className="w-12 h-12 text-neutral-300 mx-auto" />
        <h3 className="text-xl font-bold text-neutral-800">Planner Unavailable</h3>
        <p className="text-neutral-500 text-sm">Please ensure today's date is within your semester range.</p>
      </div>
    );
  }

  const cat = getCATDateComponents();
  const dayStatus = evaluateAcademicDayStatus(activeDay.date, cat, isDayManuallyEnded(activeDay.id));

  if (view === 'timeline') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
          <h2 className="font-bold text-neutral-900">Academic Timeline</h2>
          <button 
            onClick={() => setView('planner')}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all"
          >
            Switch to Daily Planner →
          </button>
        </div>
        <SemesterDashboard initialDay={activeDay} onSelectDay={d => setActiveDay(d)} onOpenAI={onOpenAI} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Sync Status Bar */}
      <div className="flex items-center gap-2 px-4">
        <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {syncStatus === 'online' ? 'Planner Synchronized' : 'Offline Mode • Sync Pending'}
        </span>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
              SOMA Intelligence Planner
            </span>
            <span className="text-xs text-neutral-400">{activeDay.dayOfWeek}, {new Date(activeDay.date).toLocaleDateString()}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
            Intelligent Daily Plan
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Dynamic scheduling rebalanced based on your mastery scores and assessment urgency.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <GeneratePlanButton 
            userId={auth.currentUser?.uid || 'guest'}
            semesterId={semester.id}
            day={activeDay}
            onComplete={() => {}} // Now automatic via real-time
            variant="secondary"
          />
          <button 
            onClick={() => setView('timeline')}
            className="text-[10px] font-bold text-neutral-500 hover:text-blue-600 text-center"
          >
            View Academic Timeline →
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border shadow-sm space-y-6">
          <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl w-fit mx-auto">
            <Brain className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-neutral-900">Your Plan is Ready to be Generated</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">
              SOMA will analyze your current mastery in {semester.name}, identify academic risks, and schedule high-impact sessions.
            </p>
          </div>
          <div className="max-w-xs mx-auto">
            <GeneratePlanButton 
              userId={auth.currentUser?.uid || 'guest'}
              semesterId={semester.id}
              day={activeDay}
              onComplete={() => {}} // Now automatic via real-time
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map(s => (
            <PlannerCard 
              key={s.id} 
              session={s} 
              isEnded={dayStatus.isEnded} 
              onStatusUpdate={handleStatusUpdate}
              onStartSession={handleStartSession}
            />
          ))}
        </div>
      )}

      {dayStatus.isEnded && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-3">
          <Clock className="w-4 h-4" />
          <span>The academic day has concluded (23:00 CAT). Use remaining sessions only for light review or reflection.</span>
        </div>
      )}
    </div>
  );
};
