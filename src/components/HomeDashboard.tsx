import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  LogOut,
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  Clock, 
  BookOpen, 
  Target, 
  Zap, 
  FileText, 
  MessageSquare,
  AlertTriangle,
  History,
  TrendingUp,
  Brain,
  Award,
  CheckCircle2,
  MoreVertical,
  Moon,
  Sparkles
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { AcademicActivity, Semester, Week, AcademicDay, LectureMaterial, AcademicAssessment, LibraryModule } from '../types';
import { 
  getCATDateComponents, 
  normalizeToCATDateString, 
  evaluateAcademicDayStatus, 
  getCATGreeting, 
  isDayManuallyEnded, 
  toggleManuallyEndDay, 
  CATDateComponents,
  DAY_END_HOUR_CAT
} from '../lib/catTime';
import { GeneratePlanButton } from './planner/GeneratePlanButton';
import { ProactiveCoach } from './ProactiveCoach';
import { PlannerCard } from './planner/PlannerCard';
import { updateSessionStatus } from '../lib/plannerFirestore';
import { useSOMA } from '../lib/realtime';
import { GoogleCalendarConnect } from './GoogleCalendarConnect';
import { UpcomingEvents } from './UpcomingEvents';

interface HomeDashboardProps {
  user: User;
  onNavigateTab: (tab: string) => void;
  onOpenDay: (day: AcademicDay) => void;
  onOpenAI?: (target?: { 
    topic: string; 
    module: string; 
    prompt?: string;
    objective?: string;
    reason?: string;
    sessionId?: string;
  }) => void;
  onOpenPractice?: (moduleId: string, topicId: string) => void;
}

export function HomeDashboard({ user, onNavigateTab, onOpenDay, onOpenAI, onOpenPractice }: HomeDashboardProps) {
  const { 
    activeSemester: semester, 
    weeks: wList, 
    days: allDays, 
    activities: allActivities,
    assessments: allAssessments,
    academicRisk,
    recommendations,
    loading: somaLoading,
    syncStatus
  } = useSOMA();

  const [selectedDay, setSelectedDay] = useState<AcademicDay | null>(null);
  const [catTime, setCatTime] = useState<CATDateComponents>(getCATDateComponents());
  const [quickInput, setQuickInput] = useState('');
  const [parsingAI, setParsingAI] = useState(false);
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await auth.signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCatTime(getCATDateComponents());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const catTodayStr = catTime.dateString;
  const todayDay = allDays.find(d => normalizeToCATDateString(d.date) === catTodayStr) || null;
  const activeDay = selectedDay || todayDay || allDays[0];
  
  const currentWeek = activeDay ? wList.find(w => w.id === activeDay.weekId) : wList[0];
  const weekDays = currentWeek ? allDays.filter(d => d.weekId === currentWeek.id) : [];
  const dayActivities = activeDay ? allActivities.filter(a => a.dayId === activeDay.id) : [];

  const handleSelectDay = (day: AcademicDay) => {
    setSelectedDay(day);
  };

  const handleQuickAddAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || !semester) return;
    setParsingAI(true);
    setParseSuccessMsg(null);

    try {
      const availableModules = allAssessments.map(a => a.moduleName || 'General');
      const res = await fetch('/api/parse-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: quickInput,
          semesterName: semester?.name || 'Semester',
          referenceDate: catTime.dateString,
          modules: [...new Set(availableModules)]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = data.assessment || data;

        if (parsed) {
          const { createAssessment } = await import('../lib/libraryFirestore');
          const { addFirestoreActivity } = await import('../lib/semesterFirestore');

          await createAssessment({
            moduleId: 'mod_' + (parsed.moduleName || 'general').toLowerCase().replace(/\s+/g, '_'),
            moduleName: parsed.moduleName || 'General',
            semesterId: semester.id,
            title: parsed.title,
            type: parsed.type,
            dueDate: parsed.dueDate,
            status: 'Upcoming',
            topicNames: parsed.topicName ? [parsed.topicName] : []
          });

          if (activeDay) {
            await addFirestoreActivity({
              dayId: activeDay.id,
              semesterId: semester.id,
              title: parsed.title,
              type: parsed.type,
              moduleName: parsed.moduleName,
              startTime: '',
              endTime: '',
              status: 'Upcoming'
            });
          }

          setParseSuccessMsg(`✓ Added ${parsed.type.toUpperCase()}: "${parsed.title}" (Synced)`);
          setQuickInput('');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsingAI(false);
    }
  };

  if (somaLoading) {
    return (
      <div className="space-y-6 pb-24 max-w-5xl mx-auto animate-pulse">
        <div className="h-28 bg-white rounded-3xl border"></div>
        <div className="h-48 bg-white rounded-3xl border"></div>
        <div className="h-64 bg-white rounded-3xl border"></div>
      </div>
    );
  }

  if (!semester) {
    return (
      <div className="space-y-6 pb-24 max-w-3xl mx-auto text-center py-16">
        <h2 className="text-3xl font-bold text-neutral-900">Welcome to SOMA</h2>
        <p className="text-neutral-500 mt-2">Personal Academic Operating System</p>
        <div className="mt-8">
          <button 
            onClick={() => onNavigateTab('Semester')} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-sm transition-all"
          >
            Setup Your Semester & Master Timetable →
          </button>
        </div>
      </div>
    );
  }

  const dayStatus = activeDay 
    ? evaluateAcademicDayStatus(activeDay.date, catTime, isDayManuallyEnded(activeDay.id))
    : { status: 'UPCOMING' as const, badgeText: 'UPCOMING', badgeClass: '', isEnded: false, isToday: false, isUpcoming: false, explanation: '' };

  const classesList = dayActivities.filter(a => a.type === 'class');
  const studySessionsList = dayActivities.filter(a => a.type === 'study_session');
  const upcomingAssessments = allAssessments.filter(a => a.status === 'Upcoming' || a.status === 'Ready' || a.status === 'Scheduled' || a.status === 'Preparing');

  const topRisk = academicRisk.find(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH');
  const topPriority = topRisk ? {
    title: `Master ${topRisk.weakTopics[0] || 'Module Core Concepts'}`,
    type: 'study_session',
    moduleName: topRisk.moduleName,
    reason: topRisk.reasons[0]
  } : (upcomingAssessments[0] || { 
    title: dayStatus.isEnded ? 'Plan Rest & Prep for Next Day' : 'Review Today’s Lecture Concepts', 
    type: 'study_session', 
    moduleName: classesList[0]?.moduleName || 'Academic Focus' 
  });

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

  const catGreeting = getCATGreeting(user.displayName?.split(' ')[0] || 'Student', catTime);

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto">
      {/* Header & Command Center Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm relative">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {syncStatus === 'online' ? 'Real-time Synchronized' : 'Sync Pending • Offline Mode'}
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {semester.name} • Week {currentWeek?.weekNumber || 1}
            </span>
            <span className="text-xs font-medium text-neutral-500">
              {activeDay ? new Date(activeDay.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : catTime.formattedDate}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
            {catGreeting.greeting}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {catGreeting.subtitle}
          </p>

          {activeDay && (
            <div className="mt-4">
              <button
                onClick={() => onOpenDay(activeDay)}
                className="bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <span>📁</span> Open Day Folder
              </button>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div 
          ref={profileMenuRef}
          className="absolute top-6 right-6 md:top-8 md:right-8"
        >
          <img 
            src={user.photoURL || undefined} 
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-neutral-200 border-2 border-white shadow-md cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all object-cover" 
            alt="Profile" 
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full pointer-events-none"></span>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200/90 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 p-2.5 bg-neutral-50 rounded-xl mb-2 border border-neutral-100">
                <img 
                  src={user.photoURL || undefined} 
                  className="w-10 h-10 rounded-full bg-neutral-200 object-cover shrink-0" 
                  alt="Profile" 
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-900 truncate">{user.displayName || 'Student'}</p>
                  <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* AI Daily Briefing */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10 text-8xl font-bold">🧠</div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full border border-purple-400/30">
              SOMA Intelligence Briefing
            </span>
            <span className="text-xs text-purple-300">
              Central Africa Time: {catTime.shortTimeString} CAT
            </span>
          </div>
          <h2 className="text-xl font-bold">
            {dayStatus.isEnded ? "Sleep & Recovery Mode Active" : "Today's Focus & Academic Priorities"}
          </h2>
          <p className="text-sm text-purple-100 leading-relaxed max-w-3xl">
            {dayStatus.isEnded ? (
              <>
                <span className="font-semibold text-amber-300">{activeDay?.dayOfWeek}'s academic day concluded at 23:00 CAT</span>. All classes and study tasks are marked as ended so you can rest. SOMA recommends 7–8 hours of quality sleep to solidify memory retention before tomorrow's modules.
              </>
            ) : (
              <>
                You have <span className="font-semibold text-white">{classesList.length} classes scheduled</span> today. Your upcoming workload includes <span className="font-semibold text-white">{upcomingAssessments.length} scheduled assessments</span>. Timetable is locked to Central Africa Time (CAT) and concludes at 23:00 CAT tonight.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <ProactiveCoach recommendations={recommendations} onOpenAI={onOpenAI} />
          {/* Priority Card */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 border-l-4 border-l-red-500">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full">
                🔴 Top Academic Priority
              </span>
              <span className="text-xs text-neutral-400">Calculated by SOMA Risk Engine</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">{topPriority.title}</h3>
              <p className="text-sm text-neutral-500 mt-0.5">{topPriority.moduleName || semester.name} • {topPriority.type.toUpperCase()}</p>
            </div>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-neutral-600 font-medium">
                {dayStatus.isEnded ? "Rest now; pick up this priority when morning classes begin." : "SOMA recommends 45 min review session before 23:00 CAT."}
              </span>
              <button 
                onClick={() => onOpenAI?.({
                  topic: topPriority.title,
                  module: topPriority.moduleName || semester.name,
                  prompt: `Prepare me for ${topPriority.title}. Test my understanding with a diagnostic question.`
                })}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Start with SOMA AI →
              </button>
            </div>
          </div>

          {/* Planner Section */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-neutral-900 text-lg">Intelligent Daily Planner</h3>
                <p className="text-xs text-neutral-500">Rebalanced based on performance & assessment urgency.</p>
              </div>
              {activeDay && semester && (
                <GeneratePlanButton 
                  userId={user.uid}
                  semesterId={semester.id}
                  day={activeDay}
                  onComplete={() => {}}
                  variant="secondary"
                />
              )}
            </div>

            {studySessionsList.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 rounded-3xl border border-dashed space-y-4">
                <Sparkles className="w-8 h-8 text-purple-600 mx-auto" />
                <h4 className="font-bold text-neutral-900 text-sm">No Study Plan Generated</h4>
                {activeDay && semester && (
                  <GeneratePlanButton userId={user.uid} semesterId={semester.id} day={activeDay} onComplete={() => {}} />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studySessionsList.map(s => (
                  <PlannerCard 
                    key={s.id} 
                    session={s} 
                    isEnded={dayStatus.isEnded} 
                    onStatusUpdate={handleStatusUpdate}
                    onStartSession={handleStartSession}
                    onOpenPractice={onOpenPractice}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timetable Section */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-neutral-900 text-lg">Academic Timetable</h3>
              <span className="text-xs text-neutral-500 font-medium">
                {classesList.length} Classes • {studySessionsList.length} Study Tasks
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {weekDays.map(day => {
                const isSel = activeDay?.id === day.id;
                const st = evaluateAcademicDayStatus(day.date, catTime, isDayManuallyEnded(day.id));
                return (
                  <button
                    key={day.id}
                    onClick={() => handleSelectDay(day)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap border transition-all ${
                      isSel ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm' : 
                      st.isToday ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-neutral-600'
                    }`}
                  >
                    {day.dayOfWeek.slice(0, 3)} {new Date(day.date).getDate()}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {classesList.map(c => (
                <div key={c.id} className="p-4 rounded-2xl border bg-white flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                      Class • {c.startTime} - {c.endTime}
                    </span>
                    <h4 className="font-bold text-neutral-900 mt-2 text-base">{c.title}</h4>
                    <p className="text-xs text-neutral-500">{c.moduleName}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${dayStatus.isEnded ? 'bg-neutral-100 text-neutral-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {dayStatus.isEnded ? 'Concluded' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GoogleCalendarConnect />
          <UpcomingEvents />
          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-3">
            <h3 className="font-bold text-neutral-900 text-sm uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onNavigateTab('Library')} className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl text-xs font-semibold text-neutral-700 border text-left">📚 Add Lecture</button>
              <button onClick={() => onOpenAI()} className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-2xl text-xs font-semibold text-neutral-700 border text-left">🤖 Ask SOMA AI</button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-neutral-900 text-base">Deadlines</h3>
              <span className="text-xs text-neutral-500">{upcomingAssessments.length}</span>
            </div>
            
            <form onSubmit={handleQuickAddAssessment} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Quick add with AI..."
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  className="w-full text-xs p-2.5 pr-16 border rounded-xl bg-neutral-50 focus:bg-white"
                />
                <button type="submit" disabled={parsingAI || !quickInput.trim()} className="absolute right-1 top-1 bottom-1 px-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold">
                  {parsingAI ? '...' : 'Add ✨'}
                </button>
              </div>
              {parseSuccessMsg && <p className="text-[10px] text-emerald-600 font-medium">{parseSuccessMsg}</p>}
            </form>

            <div className="space-y-2">
              {upcomingAssessments.slice(0, 3).map(asm => (
                <div key={asm.id} className="p-3 rounded-xl border bg-neutral-50/50 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-neutral-900 text-xs">{asm.title}</h5>
                    <span className="text-[10px] text-neutral-500">{asm.dueDate}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-red-600">{asm.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-sm space-y-4">
            <h4 className="font-bold text-lg leading-tight">Master your syllabus with SOMA AI</h4>
            <p className="text-xs text-blue-100">AI analysis of your lectures and topic mastery.</p>
            <button onClick={() => onOpenAI()} className="w-full bg-white text-blue-700 py-3 rounded-2xl text-xs font-bold">Open AI Tutor →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
