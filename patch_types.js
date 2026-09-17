const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `
export interface GoogleCalendarConnection {
  id: string;
  userId: string;
  provider: 'google';
  connected: boolean;
  googleAccountId?: string;
  calendarId?: string;
  calendarName?: string;
  scopes?: string[];
  tokenStatus?: 'valid' | 'expired' | 'revoked';
  lastSuccessfulSyncAt?: string;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalCalendarEvent {
  id: string; // The Firestore ID
  userId: string;
  externalEventId: string; // The Google Event ID
  calendarId: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  timezone?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  lastSyncedAt: string;
  source: 'google_calendar';
}

export interface CalendarSyncMapping {
  somaEntityId: string;
  somaEntityType: 'timetable' | 'study_session' | 'assessment';
  googleCalendarId: string;
  googleEventId: string;
  syncDirection: 'soma_to_google' | 'google_to_soma' | 'bidirectional';
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncedAt: string;
  lastKnownGoogleUpdatedAt?: string;
}
`;

// replace CalendarConnection if it exists, otherwise append
if (code.includes('export interface CalendarConnection')) {
  code = code.replace(/export interface CalendarConnection \{[\s\S]*?\}/, newTypes);
} else {
  code += newTypes;
}

// Add calendar mapping fields to AcademicActivity if not there
if (!code.includes('googleEventId?: string;')) {
  code = code.replace(
    /export interface AcademicActivity \{/,
    "export interface AcademicActivity {\n  googleEventId?: string;\n  calendarSyncStatus?: 'synced' | 'pending' | 'error';"
  );
}

fs.writeFileSync('src/types.ts', code);
