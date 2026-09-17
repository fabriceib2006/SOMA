import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where,
  writeBatch,
  orderBy
} from 'firebase/firestore';
import { AcademicActivity, LibraryModule, AcademicAssessment, CalculatedTopicMastery, ExternalCalendarEvent } from '../types';
import { getLibraryModules, getModuleAssessments, getModuleTopics } from './libraryFirestore';
import { getTopicEvidence, calculateTopicMastery } from './performanceFirestore';
import { getCATDateComponents, normalizeToCATDateString } from './catTime';
import { getFirestoreActivities } from './semesterFirestore';

export const generateAndPersistDailyPlan = async (
  userId: string,
  semesterId: string,
  dayId: string,
  date: string
): Promise<AcademicActivity[]> => {
  try {
    // 1. Gather all required context
    const modules = await getLibraryModules(semesterId);
    
    let assessments: AcademicAssessment[] = [];
    let rawTopics: any[] = [];
    for (const m of modules) {
      const asms = await getModuleAssessments(m.id);
      assessments = [...assessments, ...asms];
      const topics = await getModuleTopics(m.id);
      rawTopics = [...rawTopics, ...topics];
    }

    const evidenceList = await getTopicEvidence(semesterId);
    const calculatedTopics = rawTopics.map(t => {
      const mod = modules.find(m => m.id === t.moduleId);
      return calculateTopicMastery(t, mod?.name || 'General', evidenceList);
    });

    // Gather history and activities
    const existingActivities = await getFirestoreActivities(dayId);
    const classes = existingActivities.filter(a => a.type === 'class');
    
    // NOTE: In a real implementation, you'd fetch more history. 
    // Here we use existing for simplicity.
    const studyHistory = existingActivities.filter(a => a.type === 'study_session');
    
    // Fetch Google Calendar Constraints
    const extEventsRef = collection(db, 'external_calendar_events');
    const q = query(extEventsRef, where('userId', '==', userId));
    const extEventsSnap = await getDocs(q);
    const externalEvents = extEventsSnap.docs.map(d => d.data() as ExternalCalendarEvent);
    

    // 2. Call the AI Planner API with enhanced context
    const response = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modules: modules.map(m => ({ id: m.id, name: m.name })),
        topics: calculatedTopics.map(t => ({ 
          id: t.id, 
          name: t.name, 
          moduleName: t.moduleName, 
          status: t.status,
          trend: t.trend
        })),
        masteryScores: calculatedTopics.map(t => ({
          topicId: t.id,
          score: t.masteryScore
        })),
        studentRisk: {
          overall: calculatedTopics.filter(t => t.masteryScore < 50).length > 2 ? 'High' : 'Medium'
        },
        assessments: assessments.map(a => ({
          title: a.title,
          type: a.type,
          dueDate: a.dueDate,
          moduleId: a.moduleId
        })),
        existingTimetable: classes.map(c => ({
          title: c.title,
          startTime: c.startTime,
          endTime: c.endTime
        })),
        studyHistory: studyHistory.map(s => ({
          title: s.title,
          status: s.status,
          date: s.dayId
        })),
        externalCalendarEvents: externalEvents.map(e => ({
          title: e.title,
          start: e.start,
          end: e.end,
          status: e.status
        })),
        date
      })
    });

    if (!response.ok) throw new Error('Failed to generate plan');
    const planData = await response.json();

    // 3. Persist to Firestore
    if (!db) throw new Error("Database unavailable");
    const batch = writeBatch(db);
    const newSessions: AcademicActivity[] = [];
    const timestamp = new Date().toISOString();

    for (const session of planData.sessions) {
      const id = `study_${dayId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const topic = calculatedTopics.find(t => t.name === session.topic || t.id === session.topicId);
      
      const activity: AcademicActivity = {
        id,
        dayId,
        userId,
        semesterId,
        type: 'study_session',
        title: session.activity || `${session.topic} Study Session`,
        moduleName: session.module,
        moduleId: topic?.moduleId,
        topicName: session.topic,
        topicId: topic?.id,
        startTime: session.start,
        endTime: session.end,
        duration: session.duration,
        taskType: session.taskType,
        priority: (session.priority as any) || 'Medium',
        reason: session.reason,
        source: 'intelligence_engine',
        status: 'Upcoming',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      newSessions.push(activity);
      batch.set(doc(db, 'activities', id), activity);
    }

    await batch.commit();
    return newSessions;
  } catch (error) {
    console.error('Error generating and persisting daily plan:', error);
    throw error;
  }
};

export const getDailyPlan = async (dayId: string): Promise<AcademicActivity[]> => {
  const activities = await getFirestoreActivities(dayId);
  return activities.filter(a => a.type === 'study_session');
};

export const updateSessionStatus = async (
  sessionId: string, 
  status: AcademicActivity['status'],
  dayId: string
): Promise<void> => {
  const timestamp = new Date().toISOString();
  const updates: Partial<AcademicActivity> = { 
    status, 
    updatedAt: timestamp 
  };
  
  if (status === 'Completed') {
    updates.completedAt = timestamp;
  }

  // Update Firestore
  if (db) {
    await setDoc(doc(db, 'activities', sessionId), updates, { merge: true });
  }
};
