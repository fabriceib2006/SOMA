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
import { cleanTimeValues } from './timetableUtils';
import { cleanUndefined } from './firestoreUtils';

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
          const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(template.morningTime || '09:00', '12:00');
          allActivities.push({
            id: `act_m_${dayId}_${Date.now()}`,
            dayId,
            userId,
            semesterId,
            type: 'class',
            title: template.morningModule.trim(),
            moduleName: template.morningModule.trim(),
            startTime: cleanStart || '09:00',
            endTime: cleanEnd || '12:00'
          });
        }
        if (template.afternoonModule && template.afternoonModule.trim()) {
          const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(template.afternoonTime || '13:00', '17:00');
          allActivities.push({
            id: `act_a_${dayId}_${Date.now()}`,
            dayId,
            userId,
            semesterId,
            type: 'class',
            title: template.afternoonModule.trim(),
            moduleName: template.afternoonModule.trim(),
            startTime: cleanStart || '13:00',
            endTime: cleanEnd || '17:00'
          });
        }
      }
    }

    currentStart.setDate(currentStart.getDate() + 7);
  }

  // Save to Firestore
  if (db) {
    const batch = writeBatch(db);
    batch.set(doc(db, 'semesters', semesterId), cleanUndefined({ ...newSemester, startDate: startDate.toISOString() }));
    weeks.forEach(wk => {
      batch.set(doc(db, 'weeks', wk.id), cleanUndefined({ ...wk, startDate: wk.startDate.toISOString(), endDate: wk.endDate.toISOString() }));
    });
    days.forEach(dy => {
      batch.set(doc(db, 'days', dy.id), cleanUndefined({ ...dy, date: dy.date.toISOString() }));
    });
    allActivities.forEach(act => {
      batch.set(doc(db, 'activities', act.id), cleanUndefined(act));
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
    await setDoc(doc(db, 'activities', actId), cleanUndefined(newActivity));
  }

  return newActivity;
};

export const updateFirestoreActivity = async (id: string, updates: Partial<AcademicActivity>): Promise<void> => {
  if (db) {
    await setDoc(doc(db, 'activities', id), cleanUndefined(updates), { merge: true });
  }
};

export const deleteFirestoreActivity = async (id: string): Promise<void> => {
  if (db) {
    await deleteDoc(doc(db, 'activities', id));
  }
};

export const moveFirestoreActivityToDay = async (
  id: string, 
  targetDayId: string, 
  timeUpdates?: { startTime?: string; endTime?: string }
): Promise<void> => {
  if (!db) return;
  const updates: Partial<AcademicActivity> = { dayId: targetDayId };
  if (timeUpdates) {
    const { startTime, endTime } = cleanTimeValues(timeUpdates.startTime, timeUpdates.endTime);
    if (startTime) updates.startTime = startTime;
    if (endTime) updates.endTime = endTime;
  }
  await updateFirestoreActivity(id, updates);
};

export interface MoveClassSlotAllWeeksParams {
  activity: AcademicActivity;
  sourceDayOfWeek: string;
  targetDayOfWeek: string;
  startTime: string;
  endTime: string;
  allDays: AcademicDay[];
  weeks: Week[];
}

/**
 * Moves a class slot from sourceDayOfWeek to targetDayOfWeek across ALL weeks of the active semester.
 * Guarantees all weeks remain identical with matching class slots on the destination day.
 */
export const moveClassSlotAcrossAllWeeks = async ({
  activity,
  sourceDayOfWeek,
  targetDayOfWeek,
  startTime,
  endTime,
  allDays,
  weeks
}: MoveClassSlotAllWeeksParams): Promise<{ movedCount: number }> => {
  if (!db) return { movedCount: 0 };

  const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(startTime, endTime);
  const finalStart = cleanStart || '09:00';
  const finalEnd = cleanEnd || '12:00';

  // 1. Fetch current activities from Firestore to ensure we have fresh state for all weeks
  let allActivities: AcademicActivity[] = [];
  try {
    const userId = auth.currentUser?.uid || activity.userId;
    let snap;
    if (userId) {
      try {
        const q = query(collection(db, 'activities'), where('userId', '==', userId));
        snap = await getDocs(q);
      } catch (err) {
        snap = await getDocs(collection(db, 'activities'));
      }
    } else {
      snap = await getDocs(collection(db, 'activities'));
    }
    allActivities = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicActivity));
  } catch (err) {
    console.warn('Failed to load all activities for batch update, using fallback', err);
  }

  const batch = writeBatch(db);
  let opCount = 0;

  const targetTitleLower = (activity.title || '').trim().toLowerCase();
  const targetModuleNameLower = (activity.moduleName || activity.title || '').trim().toLowerCase();

  for (const week of weeks) {
    const sourceDay = allDays.find(
      d => d.weekId === week.id && d.dayOfWeek.toLowerCase() === sourceDayOfWeek.toLowerCase()
    );
    const targetDay = allDays.find(
      d => d.weekId === week.id && d.dayOfWeek.toLowerCase() === targetDayOfWeek.toLowerCase()
    );

    if (!targetDay) continue;

    // Gather all class activities on sourceDay for this week matching title or moduleName
    const sourceCandidates = sourceDay
      ? allActivities.filter(a => {
          if (a.dayId !== sourceDay.id || a.type !== 'class') return false;
          const aTitle = (a.title || '').trim().toLowerCase();
          const aMod = (a.moduleName || a.title || '').trim().toLowerCase();
          return aIdMatches(a, activity) || aTitle === targetTitleLower || aMod === targetModuleNameLower;
        })
      : [];

    // Gather all class activities on targetDay for this week matching title or moduleName
    const targetCandidates = allActivities.filter(a => {
      if (a.dayId !== targetDay.id || a.type !== 'class') return false;
      const aTitle = (a.title || '').trim().toLowerCase();
      const aMod = (a.moduleName || a.title || '').trim().toLowerCase();
      return aIdMatches(a, activity) || aTitle === targetTitleLower || aMod === targetModuleNameLower;
    });

    if (sourceCandidates.length > 0) {
      // Move the first source candidate to targetDay with new times
      const primarySource = sourceCandidates[0];
      const actRef = doc(db, 'activities', primarySource.id);
      batch.set(
        actRef,
        {
          dayId: targetDay.id,
          startTime: finalStart,
          endTime: finalEnd,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      opCount++;

      // Delete any duplicate source candidates on sourceDay
      for (let i = 1; i < sourceCandidates.length; i++) {
        batch.delete(doc(db, 'activities', sourceCandidates[i].id));
        opCount++;
      }

      // If targetDay already had target candidates (excluding primarySource if it was moved there), delete or update them
      for (const tCand of targetCandidates) {
        if (tCand.id !== primarySource.id) {
          batch.delete(doc(db, 'activities', tCand.id));
          opCount++;
        }
      }
    } else if (targetCandidates.length > 0) {
      // No source candidate in this week, but target candidate exists -> update its times
      for (const tCand of targetCandidates) {
        const actRef = doc(db, 'activities', tCand.id);
        batch.set(
          actRef,
          {
            startTime: finalStart,
            endTime: finalEnd,
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        );
        opCount++;
      }
    } else {
      // Neither source nor target candidate exists in this week -> create one on targetDay so all weeks are identical
      const newActId = `act_${targetDay.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const actRef = doc(db, 'activities', newActId);
      const newAct: AcademicActivity = {
        id: newActId,
        dayId: targetDay.id,
        userId: auth.currentUser?.uid || activity.userId || 'current_user',
        semesterId: activity.semesterId || week.semesterId,
        type: 'class',
        title: activity.title,
        moduleName: activity.moduleName || activity.title,
        startTime: finalStart,
        endTime: finalEnd,
        status: 'Upcoming',
        source: 'master_timetable',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      batch.set(actRef, newAct);
      opCount++;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return { movedCount: opCount };
};

// Helper for matching activity ID or title/module
function aIdMatches(a: AcademicActivity, target: AcademicActivity): boolean {
  if (a.id === target.id) return true;
  const aTitle = (a.title || '').trim().toLowerCase();
  const aMod = (a.moduleName || a.title || '').trim().toLowerCase();
  const tTitle = (target.title || '').trim().toLowerCase();
  const tMod = (target.moduleName || target.title || '').trim().toLowerCase();
  return (aTitle && aTitle === tTitle) || (aMod && aMod === tMod);
}

export interface RemoveClassSlotAllWeeksParams {
  activity: AcademicActivity;
  dayOfWeek: string;
  allDays: AcademicDay[];
  weeks: Week[];
}

/**
 * Removes a class slot from dayOfWeek across ALL weeks of the active semester.
 */
export const removeClassSlotAcrossAllWeeks = async ({
  activity,
  dayOfWeek,
  allDays,
  weeks
}: RemoveClassSlotAllWeeksParams): Promise<{ removedCount: number }> => {
  if (!db) return { removedCount: 0 };

  let allActivities: AcademicActivity[] = [];
  try {
    const userId = auth.currentUser?.uid || activity.userId;
    let snap;
    if (userId) {
      try {
        const q = query(collection(db, 'activities'), where('userId', '==', userId));
        snap = await getDocs(q);
      } catch (err) {
        snap = await getDocs(collection(db, 'activities'));
      }
    } else {
      snap = await getDocs(collection(db, 'activities'));
    }
    allActivities = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicActivity));
  } catch (err) {
    console.warn('Failed to load activities for removal, fallback to single delete', err);
    await deleteFirestoreActivity(activity.id);
    return { removedCount: 1 };
  }

  const batch = writeBatch(db);
  let opCount = 0;
  const deletedIds = new Set<string>();

  for (const week of weeks) {
    const day = allDays.find(
      d => d.weekId === week.id && d.dayOfWeek.toLowerCase() === dayOfWeek.toLowerCase()
    );
    if (!day) continue;

    const candidates = allActivities.filter(a => a.dayId === day.id && a.type === 'class');
    const matchingCandidates = candidates.filter(a => aIdMatches(a, activity));

    for (const match of matchingCandidates) {
      if (!deletedIds.has(match.id)) {
        batch.delete(doc(db, 'activities', match.id));
        deletedIds.add(match.id);
        opCount++;
      }
    }
  }

  // Ensure clicked activity itself and any matching instances are deleted
  const fallbackMatches = allActivities.filter(a => aIdMatches(a, activity));
  for (const match of fallbackMatches) {
    if (!deletedIds.has(match.id)) {
      batch.delete(doc(db, 'activities', match.id));
      deletedIds.add(match.id);
      opCount++;
    }
  }

  if (!deletedIds.has(activity.id)) {
    batch.delete(doc(db, 'activities', activity.id));
    opCount++;
  }

  if (opCount > 0) {
    await batch.commit();
  }

  return { removedCount: opCount };
};


