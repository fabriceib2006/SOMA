/**
 * Robust date parsing utility for SOMA assessments and academic timetables.
 * Prevents 'NaN days away', invalid dates, and malformed timezone suffixes like ' GM'.
 */

export interface SafeParsedDueDate {
  date: Date | null;
  daysRemaining: number;
  formattedDueDate: string;
  isoDateString: string;
  isValid: boolean;
}

export function safeParseDueDate(dueDate: any): SafeParsedDueDate {
  if (!dueDate) {
    return {
      date: null,
      daysRemaining: 0,
      formattedDueDate: 'Unspecified date',
      isoDateString: '',
      isValid: false
    };
  }

  let dateObj: Date | null = null;

  // 1. If it's a Firestore Timestamp or object with toDate()
  if (dueDate && typeof dueDate.toDate === 'function') {
    try {
      dateObj = dueDate.toDate();
    } catch (_) {}
  } else if (dueDate instanceof Date) {
    dateObj = isNaN(dueDate.getTime()) ? null : dueDate;
  } else if (typeof dueDate === 'number') {
    const d = new Date(dueDate);
    dateObj = isNaN(d.getTime()) ? null : d;
  } else if (typeof dueDate === 'string') {
    const raw = dueDate.trim();

    // Direct check for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      dateObj = new Date(y, m - 1, d);
    } else {
      // Try normal parse first
      let d = new Date(raw);
      if (!isNaN(d.getTime())) {
        dateObj = d;
      } else {
        // Strip trailing broken timezones like " GM", " GMT...", " (Central Africa Time)"
        const cleaned = raw.replace(/\s+GM[A-Za-z0-9+-]*/i, '').trim();
        d = new Date(cleaned);
        if (!isNaN(d.getTime())) {
          dateObj = d;
        } else {
          // Try month name extraction: e.g. "Sep 23 2026" or "23 September 2026"
          const monthMap: Record<string, number> = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
          };
          const matchA = cleaned.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i);
          const matchB = cleaned.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[,\s]+(\d{4})/i);

          if (matchA) {
            const m = monthMap[matchA[1].slice(0, 3).toLowerCase()] ?? 0;
            const dayNum = parseInt(matchA[2], 10);
            const yr = parseInt(matchA[3], 10);
            dateObj = new Date(yr, m, dayNum);
          } else if (matchB) {
            const dayNum = parseInt(matchB[1], 10);
            const m = monthMap[matchB[2].slice(0, 3).toLowerCase()] ?? 0;
            const yr = parseInt(matchB[3], 10);
            dateObj = new Date(yr, m, dayNum);
          }
        }
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      date: null,
      daysRemaining: 0,
      formattedDueDate: String(dueDate || 'Unspecified date'),
      isoDateString: '',
      isValid: false
    };
  }

  // Calculate days remaining against today (at midnight)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateObj.getTime());
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const rawDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, isNaN(rawDays) ? 0 : rawDays);

  const yr = dateObj.getFullYear();
  const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dy = String(dateObj.getDate()).padStart(2, '0');
  const isoDateString = `${yr}-${mo}-${dy}`;

  const formattedDueDate = dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return {
    date: dateObj,
    daysRemaining,
    formattedDueDate,
    isoDateString,
    isValid: true
  };
}
