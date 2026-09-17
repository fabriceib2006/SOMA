import { db } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, writeBatch, query, where 
} from 'firebase/firestore';
import { fetchPrimaryCalendarEvents, createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from './calendarApi';
import { AcademicActivity, AcademicAssessment, ExternalCalendarEvent, CalendarSyncMapping } from '../types';

export const SYNC_HORIZON_DAYS = 14;

// 1. Fetch External events from Google Calendar and import into SOMA as constraints
export async function syncGoogleEventsToSOMA(userId: string) {
  if (!db) return;
  
  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + SYNC_HORIZON_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch events
  const googleEvents = await fetchPrimaryCalendarEvents(timeMin, timeMax);
  
  // Clean old external events for this user that are in the horizon to do a full refresh
  const extEventsRef = collection(db, 'external_calendar_events');
  const q = query(extEventsRef, where('userId', '==', userId));
  const existingDocs = await getDocs(q);
  
  const batch = writeBatch(db);
  const timestamp = new Date().toISOString();
  
  // Delete all existing external events to refresh them simply (in a real app you might want to do differential sync)
  existingDocs.forEach(d => {
    batch.delete(d.ref);
  });

  // Create new ones
  for (const ge of googleEvents) {
    // Skip events created by SOMA (we can identify them by a custom property or if we have mapping)
    // SOMA events will have "SOMA:" in the description, or we rely on our mapping collection.
    // For simplicity, let's say if it doesn't have somaEntityId in extendedProperties it's external.
    if (ge.extendedProperties?.private?.somaEntityId) continue;
    
    // Ignore full day events without specific time for now, or treat them as 00:00 to 23:59.
    const start = ge.start?.dateTime || (ge.start?.date ? `${ge.start.date}T00:00:00Z` : null);
    const end = ge.end?.dateTime || (ge.end?.date ? `${ge.end.date}T23:59:59Z` : null);
    
    if (!start || !end) continue;

    const extEvent: ExternalCalendarEvent = {
      id: `ext_${ge.id}`,
      userId,
      externalEventId: ge.id,
      calendarId: 'primary',
      title: ge.summary || 'Busy',
      start,
      end,
      timezone: ge.start?.timeZone,
      status: ge.status === 'cancelled' ? 'cancelled' : 'confirmed',
      lastSyncedAt: timestamp,
      source: 'google_calendar'
    };

    batch.set(doc(db, 'external_calendar_events', extEvent.id), extEvent);
  }

  await batch.commit();
}

// 2. Sync SOMA Entity to Google Calendar
export async function syncSOMAEntityToGoogle(userId: string, entityId: string, entityType: 'timetable' | 'study_session' | 'assessment', eventData: { title: string; start: string; end: string; description?: string }) {
  if (!db) return;
  const mappingRef = doc(db, 'calendar_mappings', entityId);
  const mappingSnap = await getDoc(mappingRef);
  const timestamp = new Date().toISOString();

  const googleEventPayload = {
    summary: eventData.title,
    description: eventData.description || 'Synced from SOMA Academic Intelligence',
    start: { dateTime: eventData.start },
    end: { dateTime: eventData.end },
    extendedProperties: {
      private: {
        somaEntityId: entityId,
        somaEntityType: entityType
      }
    }
  };

  if (mappingSnap.exists()) {
    // Update existing
    const mapping = mappingSnap.data() as CalendarSyncMapping;
    if (mapping.googleEventId) {
      try {
        await updateGoogleCalendarEvent(mapping.googleEventId, googleEventPayload);
        await setDoc(mappingRef, { syncStatus: 'synced', lastSyncedAt: timestamp }, { merge: true });
        return;
      } catch (err: any) {
        if (err.message.includes('404')) {
          // Event deleted on Google Calendar. Recreate it.
        } else {
          throw err;
        }
      }
    }
  }

  // Create new
  const createdEvent = await createGoogleCalendarEvent(googleEventPayload);
  
  const newMapping: CalendarSyncMapping = {
    somaEntityId: entityId,
    somaEntityType: entityType,
    googleCalendarId: 'primary',
    googleEventId: createdEvent.id,
    syncDirection: 'soma_to_google',
    syncStatus: 'synced',
    lastSyncedAt: timestamp
  };

  await setDoc(mappingRef, newMapping);
  
  // Also update the original entity to mark it as synced
  if (entityType === 'study_session' || entityType === 'timetable') {
    await setDoc(doc(db, 'activities', entityId), { googleEventId: createdEvent.id, calendarSyncStatus: 'synced' }, { merge: true });
  } else if (entityType === 'assessment') {
    await setDoc(doc(db, 'assessments', entityId), { googleEventId: createdEvent.id, calendarSyncStatus: 'synced' }, { merge: true });
  }
}

// 3. Remove SOMA Entity from Google Calendar
export async function deleteSOMAEntityFromGoogle(entityId: string, entityType: 'timetable' | 'study_session' | 'assessment') {
  if (!db) return;
  const mappingRef = doc(db, 'calendar_mappings', entityId);
  const mappingSnap = await getDoc(mappingRef);
  
  if (mappingSnap.exists()) {
    const mapping = mappingSnap.data() as CalendarSyncMapping;
    if (mapping.googleEventId) {
      try {
        await deleteGoogleCalendarEvent(mapping.googleEventId);
      } catch (e) {
        console.warn('Failed to delete on Google, possibly already gone:', e);
      }
    }
    await deleteDoc(mappingRef);
  }
}
