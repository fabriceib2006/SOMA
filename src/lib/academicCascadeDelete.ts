import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { AcademicActivity, AcademicAssessment } from '../types';
import { deleteSOMAEntityFromGoogle } from './calendarSync';
import { safeParseDueDate } from './safeDateUtils';

/**
 * Normalizes title for loose comparison (case-insensitive, trims prefixes like "Due:", punctuation)
 */
export function normalizeAssessmentTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/^(due|assignment|quiz|cat|exam)\s*:\s*/i, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deletes an activity and performs full cascading cleanup:
 * 1. Deletes the corresponding assessment in `assessments` (if this was an assignment/quiz/cat/exam)
 * 2. Deletes the corresponding Google Calendar event and mapping
 * 3. Cleans any matching external_calendar_events
 * 4. Cleans any generated study_session activities in `activities` planned for this assessment
 * 5. Deletes the activity record from `activities`
 */
export async function deleteActivityWithCascade(
  activityId: string,
  activityData?: AcademicActivity
): Promise<{
  deletedActivityId: string;
  deletedAssessmentCount: number;
  deletedCalendarCount: number;
  deletedStudySessionsCount: number;
}> {
  if (!db) {
    return {
      deletedActivityId: activityId,
      deletedAssessmentCount: 0,
      deletedCalendarCount: 0,
      deletedStudySessionsCount: 0
    };
  }

  let act = activityData;
  if (!act) {
    try {
      const actSnap = await getDoc(doc(db, 'activities', activityId));
      if (actSnap.exists()) {
        act = { ...actSnap.data(), id: actSnap.id } as AcademicActivity;
      }
    } catch (e) {
      console.warn('Failed to fetch activity before cascade delete:', e);
    }
  }

  const deletedAssessmentIds: string[] = [];
  let deletedCalendarCount = 0;
  let deletedStudySessionsCount = 0;

  const activityTitle = act?.title || '';
  const normalizedActTitle = normalizeAssessmentTitle(activityTitle);
  const isAssessmentType = act ? ['assignment', 'quiz', 'cat', 'exam'].includes(act.type) : false;

  // 1. Find and delete linked assessments in `assessments`
  try {
    const asmCollection = collection(db, 'assessments');
    const asmSnap = await getDocs(asmCollection);
    const allAssessments = asmSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicAssessment));

    for (const asm of allAssessments) {
      const normalizedAsmTitle = normalizeAssessmentTitle(asm.title);
      let isMatch = false;

      // Match by explicit assessmentId on activity
      if (act?.assessmentId && act.assessmentId === asm.id) {
        isMatch = true;
      }
      // Match by exact or normalized title if it was an assessment type
      else if (isAssessmentType || activityTitle.toLowerCase().startsWith('due:')) {
        if (normalizedAsmTitle === normalizedActTitle) {
          isMatch = true;
        } else if (
          normalizedActTitle.length >= 4 &&
          (normalizedAsmTitle.includes(normalizedActTitle) || normalizedActTitle.includes(normalizedAsmTitle))
        ) {
          // Extra validation: verify module name or semester matches if available
          if (
            !act?.moduleName || 
            !asm.moduleName || 
            act.moduleName.toLowerCase() === asm.moduleName.toLowerCase() ||
            act.moduleId === asm.moduleId
          ) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        deletedAssessmentIds.push(asm.id);
        // Delete assessment document
        await deleteDoc(doc(db, 'assessments', asm.id));

        // Delete Google Calendar event and mapping for this assessment
        try {
          await deleteSOMAEntityFromGoogle(asm.id, 'assessment');
          deletedCalendarCount++;
        } catch (calErr) {
          console.warn('Calendar delete failed for assessment:', asm.id, calErr);
        }

        // Clean mapping doc explicitly if still present
        try {
          await deleteDoc(doc(db, 'calendar_mappings', asm.id));
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Error during assessment cascading delete:', err);
  }

  // 2. Delete Google Calendar event and mapping for the activity itself
  try {
    await deleteSOMAEntityFromGoogle(activityId, 'study_session');
    await deleteSOMAEntityFromGoogle(activityId, 'timetable');
    await deleteDoc(doc(db, 'calendar_mappings', activityId));
    deletedCalendarCount++;
  } catch (_) {}

  // 3. Delete matching external_calendar_events
  try {
    const extCollection = collection(db, 'external_calendar_events');
    const extSnap = await getDocs(extCollection);
    for (const extDoc of extSnap.docs) {
      const ext = extDoc.data();
      const extTitleNorm = normalizeAssessmentTitle(ext.title || '');
      if (
        ext.externalEventId === activityId ||
        deletedAssessmentIds.some(id => ext.externalEventId === id || ext.id === `ext_${id}`) ||
        (normalizedActTitle && extTitleNorm === normalizedActTitle)
      ) {
        await deleteDoc(extDoc.ref);
      }
    }
  } catch (_) {}

  // 4. Automatically clean/rebalance any study sessions in `activities` planned for this assessment
  try {
    const actsCollection = collection(db, 'activities');
    const qStudy = query(actsCollection, where('type', '==', 'study_session'));
    const studySnap = await getDocs(qStudy);

    for (const sDoc of studySnap.docs) {
      const s = sDoc.data() as AcademicActivity;
      let shouldPruneStudySession = false;

      if (s.assessmentId && deletedAssessmentIds.includes(s.assessmentId)) {
        shouldPruneStudySession = true;
      } else if (
        normalizedActTitle &&
        ((s.reason && s.reason.toLowerCase().includes(normalizedActTitle)) ||
         (s.title && normalizeAssessmentTitle(s.title).includes(normalizedActTitle)))
      ) {
        shouldPruneStudySession = true;
      }

      if (shouldPruneStudySession) {
        await deleteDoc(sDoc.ref);
        deletedStudySessionsCount++;
        // Also delete any calendar sync for the obsolete study session
        try {
          await deleteSOMAEntityFromGoogle(sDoc.id, 'study_session');
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Error pruning linked study sessions:', err);
  }

  // 5. Finally, delete the activity itself
  await deleteDoc(doc(db, 'activities', activityId));

  return {
    deletedActivityId: activityId,
    deletedAssessmentCount: deletedAssessmentIds.length,
    deletedCalendarCount,
    deletedStudySessionsCount
  };
}

/**
 * Deletes an assessment directly and cascades to:
 * 1. Linked activities in `activities` (matching day timetable activities)
 * 2. Google Calendar sync events & mappings
 * 3. External calendar events
 * 4. Automatically rebalances/prunes study sessions planned for it
 */
export async function deleteAssessmentWithCascade(
  assessmentId: string
): Promise<{
  deletedAssessmentId: string;
  deletedActivitiesCount: number;
  deletedCalendarCount: number;
  deletedStudySessionsCount: number;
}> {
  if (!db) {
    return {
      deletedAssessmentId: assessmentId,
      deletedActivitiesCount: 0,
      deletedCalendarCount: 0,
      deletedStudySessionsCount: 0
    };
  }

  let asmData: AcademicAssessment | null = null;
  try {
    const snap = await getDoc(doc(db, 'assessments', assessmentId));
    if (snap.exists()) {
      asmData = { ...snap.data(), id: snap.id } as AcademicAssessment;
    }
  } catch (e) {
    console.warn('Failed to fetch assessment before deletion:', e);
  }

  const asmTitle = asmData?.title || '';
  const normalizedAsmTitle = normalizeAssessmentTitle(asmTitle);
  let deletedActivitiesCount = 0;
  let deletedCalendarCount = 0;
  let deletedStudySessionsCount = 0;

  // 1. Delete the assessment document from `assessments`
  try {
    await deleteDoc(doc(db, 'assessments', assessmentId));
  } catch (e) {
    console.warn('Failed direct deleteDoc for assessment:', e);
  }

  // Also query by id field in case it was stored with a custom ID property
  try {
    const qSnap = await getDocs(query(collection(db, 'assessments'), where('id', '==', assessmentId)));
    for (const d of qSnap.docs) {
      if (d.id !== assessmentId) {
        await deleteDoc(d.ref);
      }
    }
  } catch (_) {}

  // Also delete any duplicate assessment in `assessments` matching this normalized title and module
  if (normalizedAsmTitle) {
    try {
      const allAsmSnap = await getDocs(collection(db, 'assessments'));
      for (const d of allAsmSnap.docs) {
        const dData = d.data();
        const dTitleNorm = normalizeAssessmentTitle(dData.title || '');
        if (dTitleNorm === normalizedAsmTitle) {
          if (!asmData?.moduleId || !dData.moduleId || dData.moduleId === asmData.moduleId) {
            await deleteDoc(d.ref);
          }
        }
      }
    } catch (_) {}
  }

  // 2. Delete Google Calendar event and mapping
  try {
    await deleteSOMAEntityFromGoogle(assessmentId, 'assessment');
    deletedCalendarCount++;
  } catch (_) {}
  try {
    await deleteDoc(doc(db, 'calendar_mappings', assessmentId));
  } catch (_) {}

  // 3. Find and delete linked activities in `activities`
  try {
    const actsCollection = collection(db, 'activities');
    const snap = await getDocs(actsCollection);
    const allActivities = snap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicActivity));

    for (const act of allActivities) {
      let isMatch = false;

      // Direct ID match
      if (act.assessmentId === assessmentId) {
        isMatch = true;
      } 
      // Title match for assessment/assignment activities
      else if (
        normalizedAsmTitle &&
        ['assignment', 'quiz', 'cat', 'exam'].includes(act.type)
      ) {
        const normalizedActTitle = normalizeAssessmentTitle(act.title);
        if (normalizedActTitle === normalizedAsmTitle) {
          isMatch = true;
        } else if (
          normalizedAsmTitle.length >= 4 &&
          (normalizedActTitle.includes(normalizedAsmTitle) || normalizedAsmTitle.includes(normalizedActTitle))
        ) {
          isMatch = true;
        }
      }

      if (isMatch) {
        await deleteDoc(doc(db, 'activities', act.id));
        deletedActivitiesCount++;

        // Delete Google calendar mapping for the activity
        try {
          await deleteSOMAEntityFromGoogle(act.id, act.type as any);
          deletedCalendarCount++;
        } catch (_) {}
        try {
          await deleteDoc(doc(db, 'calendar_mappings', act.id));
        } catch (_) {}
      }

      // 4. Clean planned study sessions for this assessment
      if (act.type === 'study_session') {
        let isPlannedForThis = false;
        if (act.assessmentId === assessmentId) {
          isPlannedForThis = true;
        } else if (
          normalizedAsmTitle &&
          ((act.reason && act.reason.toLowerCase().includes(normalizedAsmTitle)) ||
           (act.title && normalizeAssessmentTitle(act.title).includes(normalizedAsmTitle)))
        ) {
          isPlannedForThis = true;
        }

        if (isPlannedForThis) {
          await deleteDoc(doc(db, 'activities', act.id));
          deletedStudySessionsCount++;
          try {
            await deleteSOMAEntityFromGoogle(act.id, 'study_session');
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    console.error('Error finding linked activities during assessment delete:', err);
  }

  // 5. Clean external calendar events matching this assessment
  try {
    const extCollection = collection(db, 'external_calendar_events');
    const extSnap = await getDocs(extCollection);
    for (const extDoc of extSnap.docs) {
      const ext = extDoc.data();
      const extTitleNorm = normalizeAssessmentTitle(ext.title || '');
      if (
        ext.externalEventId === assessmentId ||
        ext.id === `ext_${assessmentId}` ||
        (normalizedAsmTitle && extTitleNorm === normalizedAsmTitle)
      ) {
        await deleteDoc(extDoc.ref);
      }
    }
  } catch (_) {}

  return {
    deletedAssessmentId: assessmentId,
    deletedActivitiesCount,
    deletedCalendarCount,
    deletedStudySessionsCount
  };
}

/**
 * Scans and cleans orphan or duplicate assessments that have no matching timetable activity
 * or have invalid date strings.
 */
export async function cleanOrphanAssessments(): Promise<{
  cleanedCount: number;
  cleanedTitles: string[];
}> {
  if (!db) return { cleanedCount: 0, cleanedTitles: [] };

  const cleanedTitles: string[] = [];

  try {
    // 1. Fetch all assessments and activities
    const [asmSnap, actSnap] = await Promise.all([
      getDocs(collection(db, 'assessments')),
      getDocs(collection(db, 'activities'))
    ]);

    const assessments = asmSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicAssessment));
    const activities = actSnap.docs.map(d => ({ ...d.data(), id: d.id } as AcademicActivity));

    // Filter activities that represent assessments/deadlines on the timetable
    const assessmentActivities = activities.filter(a =>
      ['assignment', 'quiz', 'cat', 'exam'].includes(a.type) ||
      (a.title && a.title.toLowerCase().startsWith('due:'))
    );

    const activityAssessmentIds = new Set(
      assessmentActivities.map(a => a.assessmentId).filter(Boolean)
    );
    const normalizedActivityTitles = new Set(
      assessmentActivities.map(a => normalizeAssessmentTitle(a.title)).filter(Boolean)
    );

    const seenTitles = new Set<string>();

    for (const asm of assessments) {
      const parsedDate = safeParseDueDate(asm.dueDate);
      const normalizedTitle = normalizeAssessmentTitle(asm.title);

      // Check if assessment has a corresponding active timetable activity
      const hasDirectActivityId = activityAssessmentIds.has(asm.id);
      const hasMatchingTitleActivity = normalizedActivityTitles.has(normalizedTitle);

      // Duplicate check: if we already processed an assessment with the exact same normalized title in this module
      const titleKey = `${asm.moduleId || 'gen'}_${normalizedTitle}`;
      const isDuplicate = seenTitles.has(titleKey);

      // Look for duplicate situation: e.g. "Soil Mechanics" vs "Assessment of soil mechanics..."
      // where one is just a generic module name and has no matching timetable activity
      const isDuplicateGeneric = assessments.some(
        other => 
          other.id !== asm.id && 
          other.moduleId === asm.moduleId && 
          other.title.length > asm.title.length &&
          normalizedActivityTitles.has(normalizeAssessmentTitle(other.title))
      );

      const isOrphan = isDuplicate || (!hasDirectActivityId && (!hasMatchingTitleActivity || !parsedDate.isValid || isDuplicateGeneric));

      if (isOrphan) {
        await deleteAssessmentWithCascade(asm.id);
        cleanedTitles.push(asm.title);
      } else {
        seenTitles.add(titleKey);
      }
    }
  } catch (err) {
    console.error('Error cleaning orphan assessments:', err);
  }

  return {
    cleanedCount: cleanedTitles.length,
    cleanedTitles
  };
}
