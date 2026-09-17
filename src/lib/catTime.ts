/**
 * SOMA Central Africa Time (CAT) Intelligence Engine
 * Standard Timezone: Central Africa Time (CAT) = UTC+2 (constant, no DST)
 * Academic Day Cutoff: 23:00 CAT (11:00 PM CAT)
 */

export const CAT_TIMEZONE = 'Africa/Maputo'; // Official IANA name for CAT (UTC+2)
export const DAY_END_HOUR_CAT = 23; // 23:00 CAT
export const MORNING_START_HOUR_CAT = 6; // 06:00 CAT

export interface CATDateComponents {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number; // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
  dayOfWeek: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  dayOfWeekIndex: number; // 0 = Sunday, 1 = Monday, ...
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss
  shortTimeString: string; // HH:mm
  formattedDate: string; // e.g. "Tuesday, September 15, 2026"
  isDayEnded: boolean; // true if >= 23:00 CAT on this day
  isNightRestPeriod: boolean; // true if >= 23:00 or < 06:00
}

/**
 * Parses any date into CAT date components
 */
export function getCATDateComponents(date: Date = new Date()): CATDateComponents {
  // CAT is strictly UTC+2 (no daylight saving time)
  // We use Intl.DateTimeFormat for robust timezone extraction
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAT_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'long',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const year = parseInt(partMap.year || '2026', 10);
  const month = parseInt(partMap.month || '9', 10);
  const day = parseInt(partMap.day || '15', 10);
  const hours = parseInt(partMap.hour === '24' ? '0' : partMap.hour || '0', 10);
  const minutes = parseInt(partMap.minute || '0', 10);
  const seconds = parseInt(partMap.second || '0', 10);
  const dayOfWeek = (partMap.weekday || 'Tuesday') as CATDateComponents['dayOfWeek'];

  const daysMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };
  const dayOfWeekIndex = daysMap[dayOfWeek] ?? 2;

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const shortTimeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const timeString = `${shortTimeString}:${String(seconds).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const formattedDate = `${dayOfWeek}, ${monthNames[month - 1]} ${day}, ${year}`;

  const isDayEnded = hours >= DAY_END_HOUR_CAT;
  const isNightRestPeriod = hours >= DAY_END_HOUR_CAT || hours < MORNING_START_HOUR_CAT;

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dayOfWeek,
    dayOfWeekIndex,
    dateString,
    timeString,
    shortTimeString,
    formattedDate,
    isDayEnded,
    isNightRestPeriod
  };
}

/**
 * Normalizes any Date or date string to YYYY-MM-DD in CAT
 */
export function normalizeToCATDateString(d: Date | string): string {
  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const match = d.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  return getCATDateComponents(dateObj).dateString;
}

export type AcademicDayStatusType = 'ENDED' | 'ACTIVE_TODAY' | 'UPCOMING';

export interface DayStatusResult {
  status: AcademicDayStatusType;
  badgeText: string;
  badgeClass: string;
  isEnded: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  explanation: string;
}

/**
 * Determines whether an academic day is ENDED, ACTIVE_TODAY, or UPCOMING in CAT time.
 * Rule: A day is marked as ENDED if:
 * 1. Its calendar date is strictly in the past (before today in CAT), OR
 * 2. It is today in CAT and the current CAT time is >= 23:00 (11:00 PM CAT).
 * 3. It was manually ended early by the student.
 */
export function evaluateAcademicDayStatus(
  dayDate: Date | string,
  nowCAT: CATDateComponents = getCATDateComponents(),
  isManuallyEnded: boolean = false
): DayStatusResult {
  const targetDateStr = normalizeToCATDateString(dayDate);
  const todayDateStr = nowCAT.dateString;

  if (isManuallyEnded) {
    return {
      status: 'ENDED',
      badgeText: 'ENDED (Marked Complete)',
      badgeClass: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
      isEnded: true,
      isToday: targetDateStr === todayDateStr,
      isUpcoming: false,
      explanation: 'This academic day was marked as ended for sleep/rest.'
    };
  }

  // 1. Past Day -> Already concluded at 23:00 CAT
  if (targetDateStr < todayDateStr) {
    return {
      status: 'ENDED',
      badgeText: 'ENDED (23:00 CAT)',
      badgeClass: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
      isEnded: true,
      isToday: false,
      isUpcoming: false,
      explanation: 'Academic day concluded at 23:00 CAT.'
    };
  }

  // 2. Today in CAT
  if (targetDateStr === todayDateStr) {
    if (nowCAT.isDayEnded) {
      // It is 23:00 or later CAT!
      return {
        status: 'ENDED',
        badgeText: 'ENDED (23:00 CAT • Sleep Mode)',
        badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold',
        isEnded: true,
        isToday: true,
        isUpcoming: false,
        explanation: 'Academic day ended at 23:00 CAT. Daytime study concluded for sleep & rest.'
      };
    } else {
      // It is before 23:00 CAT!
      const hoursRemaining = DAY_END_HOUR_CAT - nowCAT.hours;
      return {
        status: 'ACTIVE_TODAY',
        badgeText: `ACTIVE TODAY • Closes 23:00 CAT (${hoursRemaining}h left)`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold animate-pulse',
        isEnded: false,
        isToday: true,
        isUpcoming: false,
        explanation: 'Active academic day. Scheduled classes and study tasks are underway.'
      };
    }
  }

  // 3. Future Day
  return {
    status: 'UPCOMING',
    badgeText: 'UPCOMING',
    badgeClass: 'bg-neutral-50 text-neutral-500 border border-neutral-200',
    isEnded: false,
    isToday: false,
    isUpcoming: true,
    explanation: 'Scheduled for future academic week.'
  };
}

/**
 * Returns contextual greeting based on CAT time
 */
export function getCATGreeting(userFirstName: string = 'Student', cat: CATDateComponents = getCATDateComponents()): {
  greeting: string;
  subtitle: string;
  cycleBadge: string;
  isSleepCycle: boolean;
} {

  if (cat.hours >= DAY_END_HOUR_CAT || cat.hours < MORNING_START_HOUR_CAT) {
    return {
      greeting: `Night Rest Cycle, ${userFirstName} 🌙`,
      subtitle: `Academic day closes at 23:00 CAT. All daytime modules are marked as ended so you can rest.`,
      cycleBadge: `CAT 23:00+ Sleep Cycle • Current: ${cat.shortTimeString} CAT`,
      isSleepCycle: true
    };
  }

  if (cat.hours < 12) {
    return {
      greeting: `Good morning, ${userFirstName} ☀️`,
      subtitle: `Today is your active academic command center. Classes and study tasks are active until 23:00 CAT.`,
      cycleBadge: `Active Day • Current: ${cat.shortTimeString} CAT`,
      isSleepCycle: false
    };
  }

  if (cat.hours < 17) {
    return {
      greeting: `Good afternoon, ${userFirstName} 🌤️`,
      subtitle: `Stay focused on today's lectures and practice drills. Academic day closes at 23:00 CAT.`,
      cycleBadge: `Active Day • Current: ${cat.shortTimeString} CAT`,
      isSleepCycle: false
    };
  }

  return {
    greeting: `Good evening, ${userFirstName} 🌆`,
    subtitle: `Wrap up your evening review sessions before the academic day ends at 23:00 CAT.`,
    cycleBadge: `Evening Session • Closes 23:00 CAT (${DAY_END_HOUR_CAT - cat.hours}h left)`,
    isSleepCycle: false
  };
}

const STORAGE_KEY_ENDED_DAYS = 'soma_manually_ended_days';

export function getManuallyEndedDayIds(): string[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const data = localStorage.getItem(STORAGE_KEY_ENDED_DAYS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function isDayManuallyEnded(dayId: string): boolean {
  return getManuallyEndedDayIds().includes(dayId);
}

export function toggleManuallyEndDay(dayId: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const current = getManuallyEndedDayIds();
    const exists = current.includes(dayId);
    let updated: string[];
    if (exists) {
      updated = current.filter(id => id !== dayId);
    } else {
      updated = [...current, dayId];
    }
    localStorage.setItem(STORAGE_KEY_ENDED_DAYS, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}

/**
 * Produces an unambiguous string for AI prompts describing current Central Africa Time
 */
export function getCATPromptContext(cat: CATDateComponents = getCATDateComponents()): string {
  return [
    `Current Time: ${cat.shortTimeString} Central Africa Time (CAT, UTC+2)`,
    `Current Calendar Date: ${cat.dayOfWeek}, ${cat.dateString} (${cat.formattedDate})`,
    `Academic Day Cutoff: 23:00 CAT (11:00 PM CAT)`,
    `Current Academic Phase: ${
      cat.isDayEnded 
        ? 'Night Rest Period (Past 23:00 CAT cutoff; daytime classes and study sessions have concluded)' 
        : cat.isNightRestPeriod 
        ? 'Early Morning Rest (Before 06:00 CAT; morning classes begin at 06:00+)'
        : `Active Academic Daytime (Closes at 23:00 CAT; ${DAY_END_HOUR_CAT - cat.hours}h remaining)`
    }`
  ].join('\n');
}
