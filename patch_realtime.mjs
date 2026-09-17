import fs from 'fs';
let code = fs.readFileSync('src/lib/realtime.tsx', 'utf8');

// Imports
code = code.replace(
  /import \{[\s\S]*?Recommendation\n\} from '\.\.\/types';/,
  `import { 
  Semester, Week, AcademicDay, AcademicActivity, TopicEvidenceRecord, LibraryModule, 
  LibraryTopic, AcademicAssessment, CalculatedTopicMastery, AssessmentReadinessRecord, 
  AcademicRiskRecord, Recommendation, ExternalCalendarEvent
} from '../types';
import { syncGoogleEventsToSOMA } from './calendarSync';`
);

// State
if (!code.includes('const [externalEvents, setExternalEvents]')) {
  code = code.replace(
    /const \[recommendations, setRecommendations\] = useState<Recommendation\[\]>\(\[\]\);/,
    `const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);`
  );
}

// Effect for external events
if (!code.includes('setExternalEvents(data)')) {
  code = code.replace(
    /return \(\) => unsub\(\);\n  \}, \[user, activeSemester\]\);/,
    `return () => unsub();
  }, [user, activeSemester]);

  // Handle External Calendar Events
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'external_calendar_events'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => d.data() as ExternalCalendarEvent);
      setExternalEvents(data);
    });
    return () => unsub();
  }, [user]);`
  );
}

// sync func
if (!code.includes('const syncGoogleCalendar')) {
  code = code.replace(
    /const contextValue: SOMAContextType = \{/,
    `const syncGoogleCalendar = async () => {
    if (!user) return;
    try {
      await syncGoogleEventsToSOMA(user.uid);
    } catch (err) {
      console.error('Failed to sync google calendar:', err);
      throw err;
    }
  };

  const contextValue: SOMAContextType = {`
  );
}

// context value
code = code.replace(
  /loading,\n    academicRisk,\n    recommendations\n  \};/,
  `loading,
    academicRisk,
    recommendations,
    externalEvents,
    syncGoogleCalendar
  };`
);

fs.writeFileSync('src/lib/realtime.tsx', code);
