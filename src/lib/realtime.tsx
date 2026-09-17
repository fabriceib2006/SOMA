import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, query, where, onSnapshot, Unsubscribe, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { User } from 'firebase/auth';
import { initAuth, getAccessToken } from './auth';
import { 
  Semester, Week, AcademicDay, AcademicActivity, TopicEvidenceRecord, LibraryModule, 
  LibraryTopic, AcademicAssessment, CalculatedTopicMastery, AssessmentReadinessRecord, 
  AcademicRiskRecord, Recommendation, ExternalCalendarEvent
} from '../types';
import { syncGoogleEventsToSOMA } from './calendarSync';
import { AcademicContext } from './academicContext';
import { calculateTopicMastery, getAssessmentReadiness, getAcademicRiskAnalysis } from './performanceFirestore';

interface SOMAContextType {
  user: User | null;
  loading: boolean;
  semesters: Semester[];
  activeSemester: Semester | null;
  weeks: Week[];
  days: AcademicDay[];
  activities: AcademicActivity[];
  evidence: TopicEvidenceRecord[];
  modules: LibraryModule[];
  topics: LibraryTopic[];
  assessments: AcademicAssessment[];
  
  // Derived Intelligence
  topicMastery: CalculatedTopicMastery[];
  assessmentReadiness: AssessmentReadinessRecord[];
  academicRisk: AcademicRiskRecord[];
  recommendations: Recommendation[];
  
  externalEvents: ExternalCalendarEvent[];
  // Synchronization State
  syncStatus: 'online' | 'offline' | 'error';
  lastSyncedAt: string | null;
}

const SOMAContext = createContext<SOMAContextType | undefined>(undefined);

export function SOMAProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Raw Firestore State
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [days, setDays] = useState<AcademicDay[]>([]);
  const [activities, setActivities] = useState<AcademicActivity[]>([]);
  const [evidence, setEvidence] = useState<TopicEvidenceRecord[]>([]);
  const [modules, setModules] = useState<LibraryModule[]>([]);
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [assessments, setAssessments] = useState<AcademicAssessment[]>([]);

  // Derived Intelligence
  const [topicMastery, setTopicMastery] = useState<CalculatedTopicMastery[]>([]);
  const [assessmentReadiness, setAssessmentReadiness] = useState<AssessmentReadinessRecord[]>([]);
  const [academicRisk, setAcademicRisk] = useState<AcademicRiskRecord[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);

  // 1. Handle Auth
  useEffect(() => {
    const unsub = initAuth(
      (u, token) => {
        setUser(u);
        setLoading(false);
      },
      () => {
        setUser(null);
        setLoading(false);
        // ... (rest of logout logic)
      }
    );
    return () => unsub();
  }, []);

  // 2. Handle Semester Subscriptions (Global for User)
  useEffect(() => {
    // If loading or not authenticated, do not start listeners
    if (loading || !user || !db) return;

    const q = query(collection(db, 'semesters'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        startDate: new Date(doc.data().startDate)
      })) as Semester[];
      
      setSemesters(list);
      
      // Auto-select active semester
      const current = list.find(s => s.isCurrent) || list[0] || null;
      setActiveSemester(current);
      setSyncStatus('online');
      setLastSyncedAt(new Date().toISOString());
    }, (err) => {
      console.error("Semester listener error:", err.code, err.message);
      setSyncStatus('error');
    });

    return () => {
      unsub();
    };
  }, [user, loading, db]);

  // 3. Handle Semester-Scoped Subscriptions
  useEffect(() => {
    if (loading || !db || !activeSemester) {
      if (!activeSemester) {
        setWeeks([]);
        setDays([]);
        setActivities([]);
        setEvidence([]);
        setModules([]);
        setTopics([]);
        setAssessments([]);
        setExternalEvents([]);
      }
      return;
    }
    
    if (!user) return;

    const sId = activeSemester.id;
    const unsubs: Unsubscribe[] = [];

    // Weeks
    const qWeeks = query(collection(db, 'weeks')); 
    unsubs.push(onSnapshot(qWeeks, (snap) => {
      const allWeeks = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        startDate: new Date(d.data().startDate),
        endDate: new Date(d.data().endDate)
      })) as Week[];
      const list = allWeeks.filter(w => w.id && w.id.includes(sId));
      setWeeks(list.sort((a, b) => a.weekNumber - b.weekNumber));
    }));

    // Days (Scoping by weekId might be harder in a flat way, but we can query by semesterId if we added it, 
    // or just fetch all days and filter. Let's see if days have semesterId. 
    // Inspection showed: dayId = `day_${weekId}_${d}`. 
    // We might need to query all days and filter in JS if there's no semesterId index on days.
    const qDays = query(collection(db, 'days')); 
    unsubs.push(onSnapshot(qDays, (snap) => {
      const allDays = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        date: new Date(d.data().date)
      })) as AcademicDay[];
      // Filter days belonging to weeks of this semester
      const weekIds = new Set(weeks.map(w => w.id));
      if (weekIds.size > 0) {
        setDays(allDays.filter(d => weekIds.has(d.weekId)));
      } else {
        // If weeks not loaded yet, wait or fetch all and we'll filter next render
        setDays(allDays); 
      }
    }));

    // Activities
    const qActs = query(collection(db, 'activities'));
    unsubs.push(onSnapshot(qActs, (snap) => {
      const allActs = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicActivity));
      const filteredActs = allActs.filter(a => a.dayId && a.dayId.includes(sId));
      setActivities(filteredActs);
    }));

    // Evidence
    const qEv = query(collection(db, 'topic_evidence'));
    unsubs.push(onSnapshot(qEv, (snap) => {
      setEvidence(snap.docs.map(d => ({ ...d.data(), id: d.id } as TopicEvidenceRecord)));
    }));

    // Modules
    const qMod = query(collection(db, 'modules'));
    unsubs.push(onSnapshot(qMod, (snap) => {
      setModules(snap.docs.map(d => ({ ...d.data(), id: d.id } as LibraryModule)));
    }));

    // Topics
    const qTop = query(collection(db, 'topics'));
    unsubs.push(onSnapshot(qTop, (snap) => {
      setTopics(snap.docs.map(d => ({ ...d.data(), id: d.id } as LibraryTopic)));
    }));

    // Assessments
    const qAsm = query(collection(db, 'assessments'));
    unsubs.push(onSnapshot(qAsm, (snap) => {
      setAssessments(snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicAssessment)));
    }));
    
    // External Calendar Events
    const qExt = query(collection(db, 'external_calendar_events'));
    unsubs.push(onSnapshot(qExt, (snap) => {
      setExternalEvents(snap.docs.map(d => ({ ...d.data(), id: d.id } as ExternalCalendarEvent)));
    }));

    setLoading(false);

    return () => unsubs.forEach(u => u());
  }, [user, activeSemester, weeks.length]);

  // 4. Intelligence Re-calculation (Reactive)
  useEffect(() => {
    if (!activeSemester || !user) return;

    // Topics Mastery
    const mastery = topics.map(t => {
      const mod = modules.find(m => m.id === t.moduleId);
      return calculateTopicMastery(t, mod?.name || 'General', evidence);
    });
    setTopicMastery(mastery);

    // Assessment Readiness
    const modMap: Record<string, string> = {};
    modules.forEach(m => { modMap[m.id] = m.name; });
    const readiness = getAssessmentReadiness(assessments, mastery, modMap);
    setAssessmentReadiness(readiness);

    // Risk Analysis
    const risk = getAcademicRiskAnalysis(modules, mastery, assessments);
    setAcademicRisk(risk);

    // 5. Proactive Coach Signal Detection
    const runCoach = async () => {
      if (modules.length === 0) {
        setRecommendations([]);
        return;
      }

      const context: AcademicContext = {
        user: {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || 'Student'
        },
        activeSemester,
        modules,
        topics,
        assessments,
        planner: activities,
        evidence,
        mastery,
        mistakes: [], 
        risk,
        readiness
      };
      const { detectSignals } = await import('./coachEngine');
      const { saveRecommendations, getPendingRecommendations } = await import('./coachFirestore');
      const signals = await detectSignals(context);
      await saveRecommendations(user.uid, signals);
      const recs = await getPendingRecommendations(user.uid);
      const validRecs = recs.filter(r => !r.semesterId || r.semesterId === activeSemester.id);
      setRecommendations(validRecs);
    };
    
    runCoach();

  }, [topics, modules, evidence, assessments, activeSemester, user, activities]);

  const value: SOMAContextType = {
    user,
    loading,
    semesters,
    activeSemester,
    weeks,
    days,
    activities,
    evidence,
    modules,
    topics,
    assessments,
    topicMastery,
    assessmentReadiness,
    academicRisk,
    recommendations,
    externalEvents,
    syncStatus,
    lastSyncedAt
  };

  return (
    <SOMAContext.Provider value={value}>
      {children}
    </SOMAContext.Provider>
  );
}

export function useSOMA() {
  const context = useContext(SOMAContext);
  if (context === undefined) {
    throw new Error('useSOMA must be used within a SOMAProvider');
  }
  return context;
}
