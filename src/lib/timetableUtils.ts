import { AcademicActivity } from '../types';

/**
 * Parses any time string representation into minutes from midnight (0..1439).
 * Handles values like "09:00", "9:00", "09:00 - 12:00", "13:00 – 17:00", etc.
 */
export function extractStartTimeMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  
  // If string has a dash, take the first portion (the start time)
  const firstPart = timeStr.split(/[-–—]/)[0]?.trim() || '';
  const match = firstPart.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Extracts and cleans start and end time strings.
 * Prevents duplicates like "13:00 - 17:00 - 17:00" by normalizing redundant inputs.
 */
export function cleanTimeValues(startTime?: string, endTime?: string): { startTime: string; endTime: string } {
  let s = (startTime || '').trim();
  let e = (endTime || '').trim();

  // If startTime itself contains a range (e.g. "09:00 - 12:00" or "13:00 – 17:00")
  const sParts = s.split(/[-–—]/).map(part => part.trim()).filter(Boolean);
  if (sParts.length >= 2) {
    s = sParts[0];
    if (!e || e === sParts[1]) {
      e = sParts[1];
    }
  }

  // If endTime itself contains redundant repetitions (e.g. "17:00 - 17:00")
  const eParts = e.split(/[-–—]/).map(part => part.trim()).filter(Boolean);
  if (eParts.length >= 2) {
    // Pick the last valid time token
    e = eParts[eParts.length - 1];
  }

  // Ensure HH:mm format where possible
  const normalizeToken = (token: string): string => {
    const m = token.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return token;
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  };

  return {
    startTime: normalizeToken(s),
    endTime: normalizeToken(e)
  };
}

/**
 * Formats a clean, readable time range display, e.g. "09:00 – 12:00".
 * Strictly prevents duplicate time strings like "13:00 – 17:00 – 17:00".
 */
export function formatTimeSlot(startTime?: string, endTime?: string): string {
  const { startTime: cleanStart, endTime: cleanEnd } = cleanTimeValues(startTime, endTime);

  if (cleanStart && cleanEnd && cleanStart !== cleanEnd) {
    return `${cleanStart} – ${cleanEnd}`;
  }
  if (cleanStart) {
    return cleanStart;
  }
  if (cleanEnd) {
    return cleanEnd;
  }
  return 'Time TBD';
}

/**
 * Sorts activities chronologically by startTime (ascending: e.g. 09:00 before 13:00).
 * Preserves stable secondary ordering by title if times match.
 */
export function sortActivitiesChronologically<T extends { startTime?: string; title?: string }>(activities: T[]): T[] {
  return [...activities].sort((a, b) => {
    const minA = extractStartTimeMinutes(a.startTime);
    const minB = extractStartTimeMinutes(b.startTime);
    if (minA !== minB) {
      return minA - minB;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
}
