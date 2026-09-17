import { getAccessToken } from './auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function fetchPrimaryCalendarEvents(timeMin: string, timeMax: string) {
  const token = getAccessToken();
  if (!token) throw new Error("No Google access token available");

  const query = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createGoogleCalendarEvent(event: any) {
  const token = getAccessToken();
  if (!token) throw new Error("No Google access token available");

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!res.ok) {
    throw new Error(`Failed to create event: ${res.statusText}`);
  }

  return await res.json();
}

export async function updateGoogleCalendarEvent(eventId: string, event: any) {
  const token = getAccessToken();
  if (!token) throw new Error("No Google access token available");

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!res.ok) {
    throw new Error(`Failed to update event: ${res.statusText}`);
  }

  return await res.json();
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const token = getAccessToken();
  if (!token) throw new Error("No Google access token available");

  const res = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) { // ignore if already deleted
    throw new Error(`Failed to delete event: ${res.statusText}`);
  }

  return true;
}
