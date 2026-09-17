import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { Semester, Week, AcademicDay, AcademicActivity } from '../types';

export interface WeeklyModuleTemplate {
  dayOfWeek: string;
  morningModule: string;
  morningTime: string;
  afternoonModule: string;
  afternoonTime: string;
}

export const clearFirestoreDatabase = async (): Promise<void> => {
  try {
    if (!db) return;

    const collectionsToClear = ['semesters', 'weeks', 'days', 'activities'];
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    for (const colName of collectionsToClear) {
      try {
        // Only clear user's own data
        const q = query(collection(db, colName), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((document) => {
          batch.delete(document.ref);
        });
        await batch.commit();
      } catch (err) {
        console.warn(`Could not clear Firestore collection ${colName}`, err);
      }
    }
  } catch (e) {
    console.error('Error clearing database:', e);
  }
};

export const createSemesterHierarchyInFirestore = async (
  year: string,
  semesterName: string,
  startDate: Date,
  numberOfWeeks: number,
  weeklyTemplate: WeeklyModuleTemplate[]
): Promise<string> => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Authentication required");

  await clearFirestoreDatabase();

  const semesterId = 'sem_' + Date.now();
  const yearId = 'year_' + Date.now();

  const newSemester: Semester = {
    id: semesterId,
    academicYearId: yearId,
    name: semesterName,
    startDate: startDate,
    numberOfWeeks,
    isCurrent: true,
    userId
  } as any;

  const weeks: Week[] = [];
  const days: AcademicDay[] = [];
  const allActivities: AcademicActivity[] = [];

  let currentStart = new Date(startDate);
  for (let w = 1; w <= numberOfWeeks; w++) {
    const weekId = `week_${semesterId}_${w}`;
    const weekEnd = new Date(currentStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      id: weekId,
      semesterId,
      weekNumber: w,
      startDate: new Date(currentStart),
      endDate: weekEnd,
      userId
    } as any);

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(currentStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()] as any;

      const dayId = `day_${weekId}_${d}`;
      days.push({
        id: dayId,
        weekId,
        date: dayDate,
        dayOfWeek,
        status: 'UPCOMING',
        userId,
        semesterId
      } as any);

      const template = weeklyTemplate.find(t => t.dayOfWeek === dayOfWeek);
      if (template) {
        if (template.morningModule && template.morningModule.trim()) {
          allActivities.push({
            id: `act_m_${dayId}_${Date.now()}`,
            dayId,
            userId,
            semesterId,
            type: 'class',
            title: template.morningModule.trim(),
            moduleName: template.morningModule.trim(),
            startTime: template.morningTime || '09:00',
            endTime: '12:00'
          });
        }
        if (template.afternoonModule && template.afternoonModule.trim()) {
          allActivities.push({
            id: `act_a_${dayId}_${Date.now()}`,
            dayId,
            userId,
            semesterId,
            type: 'class',
            title: template.afternoonModule.trim(),
            moduleName: template.afternoonModule.trim(),
            startTime: template.afternoonTime || '13:00',
            endTime: '17:00'
          });
        }
      }
    }

    currentStart.setDate(currentStart.getDate() + 7);
  }

  // Save to Firestore
  if (db) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'semesters', semesterId), { ...newSemester, startDate: startDate.toISOString() });
    weeks.forEach(wk => {
      batch.set(doc(db, 'weeks', wk.id), { ...wk, startDate: wk.startDate.toISOString(), endDate: wk.endDate.toISOString() });
    });
    days.forEach(dy => {
      batch.set(doc(db, 'days', dy.id), { ...dy, date: dy.date.toISOString() });
    });
    allActivities.forEach(act => {
      batch.set(doc(db, 'activities', act.id), act);
    });
    await batch.commit();
  }

  return semesterId;
};

export const getFirestoreSemesters = async (): Promise<Semester[]> => {
  const userId = auth.currentUser?.uid;
  if (!userId || !db) return [];

  try {
    const q = query(collection(db, 'semesters'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        startDate: new Date(data.startDate)
      } as Semester;
    });
  } catch (e) {
    console.error('Firestore get semesters failed', e);
    return [];
  }
};

export const getFirestoreWeeks = async (semesterId: string): Promise<Week[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'weeks'), where('semesterId', '==', semesterId));
    const snapshot = await getDocs(q);
    const weeks = snapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate)
      } as Week;
    });
    return weeks.sort((a, b) => a.weekNumber - b.weekNumber);
  } catch (e) {
    console.error('Firestore get weeks failed', e);
    return [];
  }
};

export const getFirestoreDays = async (weekId: string): Promise<AcademicDay[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'days'), where('weekId', '==', weekId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        date: new Date(data.date)
      } as AcademicDay;
    });
  } catch (e) {
    console.error('Firestore get days failed', e);
    return [];
  }
};

export const getFirestoreActivities = async (dayId: string): Promise<AcademicActivity[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, 'activities'), where('dayId', '==', dayId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as AcademicActivity);
  } catch (e) {
    console.error('Firestore get activities failed', e);
    return [];
  }
};

export const addFirestoreActivity = async (activity: Omit<AcademicActivity, 'id'>): Promise<AcademicActivity> => {
  const actId = 'act_' + Date.now();
  const userId = auth.currentUser?.uid;
  const newActivity: AcademicActivity = { ...activity, id: actId, userId };

  if (db) {
    await setDoc(doc(db, 'activities', actId), newActivity);
  }

  return newActivity;
};

export const updateFirestoreActivity = async (id: string, updates: Partial<AcademicActivity>): Promise<void> => {
  if (db) {
    await setDoc(doc(db, 'activities', id), updates, { merge: true });
  }
};

export const deleteFirestoreActivity = async (id: string): Promise<void> => {
  if (db) {
    await deleteDoc(doc(db, 'activities', id));
  }
};
