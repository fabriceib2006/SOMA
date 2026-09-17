import fs from 'fs';
let code = fs.readFileSync('src/lib/plannerFirestore.ts', 'utf8');

// Add import
if (!code.includes('ExternalCalendarEvent')) {
  code = code.replace(
    /import \{ AcademicActivity, LibraryModule, AcademicAssessment, CalculatedTopicMastery \} from '\.\.\/types';/,
    `import { AcademicActivity, LibraryModule, AcademicAssessment, CalculatedTopicMastery, ExternalCalendarEvent } from '../types';`
  );
}

// Fetch external events
if (!code.includes('external_calendar_events')) {
  code = code.replace(
    /const studyHistory = existingActivities\.filter\(a => a\.type === 'study_session'\);/,
    `const studyHistory = existingActivities.filter(a => a.type === 'study_session');
    
    // Fetch Google Calendar Constraints
    const extEventsRef = collection(db, 'external_calendar_events');
    const q = query(extEventsRef, where('userId', '==', userId));
    const extEventsSnap = await getDocs(q);
    const externalEvents = extEventsSnap.docs.map(d => d.data() as ExternalCalendarEvent);
    `
  );
}

// Add to fetch payload
if (!code.includes('externalCalendarEvents:')) {
  code = code.replace(
    /studyHistory: studyHistory\.map\(s => \(\{[\s\S]*?\}\)\),/,
    `studyHistory: studyHistory.map(s => ({
          title: s.title,
          status: s.status,
          date: s.dayId
        })),
        externalCalendarEvents: externalEvents.map(e => ({
          title: e.title,
          start: e.start,
          end: e.end,
          status: e.status
        })),`
  );
}

// Ensure SOMA activities sync with google when generated (optional but useful). Let's keep it simple: the planner just avoids them for now. Sync to Google happens manually or in background.
// wait, the prompt asks for bidirectional sync. If SOMA generates a plan, shouldn't it push it to Google Calendar?
// Yes! But it might be too slow to do in one request or we can trigger it in background.
// Let's just push it directly since we can.
code = code.replace(
  /await batch\.commit\(\);\n\n    return newSessions;/,
  `await batch.commit();

    // Push new sessions to Google Calendar in background (fire and forget to not block UI)
    import('./calendarSync').then(({ syncSOMAEntityToGoogle }) => {
      newSessions.forEach(session => {
        syncSOMAEntityToGoogle(userId, session.id, 'study_session', {
          title: session.title,
          start: session.startTime,
          end: session.endTime,
          description: session.reason
        }).catch(err => console.warn('Failed to background sync to google:', err));
      });
    }).catch(() => {});

    return newSessions;`
);

fs.writeFileSync('src/lib/plannerFirestore.ts', code);
