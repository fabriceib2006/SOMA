import { AcademicActivity, AcademicAssessment } from '../types';
import { syncSOMAEntityToGoogle, deleteSOMAEntityFromGoogle } from './calendarSync';
import { safeParseDueDate } from './safeDateUtils';

export type CalendarSyncMode = 'essential' | 'academic' | 'full';

export async function evaluateAndSyncSession(
  userId: string,
  session: AcademicActivity,
  syncMode: CalendarSyncMode,
  isUserRequested = false
) {
  const isAssessmentOrCritical = 
    session.type === 'exam' || 
    session.type === 'cat' || 
    session.type === 'quiz' || 
    session.type === 'assignment' || 
    session.priority === 'Critical' || 
    session.priority === 'High';

  const isClass = session.type === 'class';

  let shouldSync = isUserRequested;

  if (!shouldSync) {
    if (syncMode === 'essential') {
      shouldSync = isAssessmentOrCritical;
    } else if (syncMode === 'academic') {
      shouldSync = isAssessmentOrCritical || isClass || session.type === 'study_session';
    } else if (syncMode === 'full') {
      shouldSync = true;
    }
  }

  if (shouldSync) {
    const startDateTime = `${new Date().toISOString().split('T')[0]}T${session.startTime}:00`;
    const endDateTime = `${new Date().toISOString().split('T')[0]}T${session.endTime}:00`;

    const syncReason = isUserRequested 
      ? 'user_requested' 
      : isAssessmentOrCritical 
      ? 'high_risk' 
      : isClass 
      ? 'timetable' 
      : 'planner_session';

    try {
      await syncSOMAEntityToGoogle(userId, session.id, session.type === 'class' ? 'timetable' : 'study_session', {
        title: `SOMA — ${session.title}`,
        start: startDateTime,
        end: endDateTime,
        description: `Reason: ${session.reason || syncReason} (Sync Mode: ${syncMode})`
      });
    } catch (e) {
      console.error('Failed to sync session to Google Calendar:', e);
    }
  } else if (!isUserRequested && session.googleEventId) {
    // If it was previously synced but no longer eligible under the new mode, do we remove?
    // User rule: "DO NOT unexpectedly destroy the user's calendar... Prefer preserving existing SOMA-owned events unless explicitly chosen."
    // So we don't automatically delete unless requested.
  }
}

export async function evaluateAndSyncAssessment(
  userId: string,
  assessment: AcademicAssessment,
  syncMode: CalendarSyncMode
) {
  // Assessments are ALWAYS eligible under Essential, Academic, and Full
  const parsed = safeParseDueDate(assessment.dueDate);
  const dateStr = parsed.isoDateString || assessment.dueDate;
  const startDateTime = `${dateStr}T09:00:00`;
  const endDateTime = `${dateStr}T10:00:00`;

  try {
    await syncSOMAEntityToGoogle(userId, assessment.id, 'assessment', {
      title: `🚨 ${assessment.type.toUpperCase()}: ${assessment.title}`,
      start: startDateTime,
      end: endDateTime,
      description: `Assessment Deadline. Module: ${assessment.moduleName || 'Academic Module'}`
    });
  } catch (e) {
    console.error('Failed to sync assessment to Google Calendar:', e);
  }
}
