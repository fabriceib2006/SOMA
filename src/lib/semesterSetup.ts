import { Semester, Week, AcademicDay } from '../types';

const STORAGE_KEY_SEMESTERS = 'soma_semesters';
const STORAGE_KEY_WEEKS = 'soma_weeks';
const STORAGE_KEY_DAYS = 'soma_days';
const STORAGE_KEY_ACTIVITIES = 'soma_activities';

export interface WeeklyModuleTemplate {
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  morningModule: string;
  morningTime: string;
  afternoonModule: string;
  afternoonTime: string;
}

export interface AcademicActivity {
  id: string;
  dayId: string;
  type: 'class' | 'assignment' | 'quiz' | 'cat' | 'exam' | 'study_session' | 'event';
  title: string;
  moduleName?: string;
  startTime: string;
  endTime: string;
}

export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_SEMESTERS);
    localStorage.removeItem(STORAGE_KEY_WEEKS);
    localStorage.removeItem(STORAGE_KEY_DAYS);
    localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
    localStorage.clear();
  } catch (e) {
    console.error('Error clearing storage', e);
  }
};

export const createSemesterHierarchyWithTemplate = async (
  year: string,
  semesterName: string,
  startDate: Date,
  numberOfWeeks: number,
  weeklyTemplate: WeeklyModuleTemplate[]
): Promise<string> => {
  const semesterId = 'sem_' + Date.now();
  const yearId = 'year_' + Date.now();

  const newSemester: Semester = {
    id: semesterId,
    academicYearId: yearId,
    name: semesterName,
    startDate: startDate,
    numberOfWeeks,
    isCurrent: true
  };

  const weeks: Week[] = [];
  const days: AcademicDay[] = [];
  const allActivities: AcademicActivity[] = [];

  let currentStart = new Date(startDate);
  for (let w = 1; w <= numberOfWeeks; w++) {
    const weekId = `week_${semesterId}_${w}`;
    const weekEnd = new Date(currentStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      id: weekId,
      semesterId,
      weekNumber: w,
      startDate: new Date(currentStart),
      endDate: weekEnd
    });

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(currentStart);
      dayDate.setDate(dayDate.getDate() + d);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayDate.getDay()] as any;

      const dayId = `day_${weekId}_${d}`;
      days.push({
        id: dayId,
        weekId,
        date: dayDate,
        dayOfWeek,
        status: 'UPCOMING'
      });

      // Find template for this day of week
      const template = weeklyTemplate.find(t => t.dayOfWeek === dayOfWeek);
      if (template) {
        if (template.morningModule && template.morningModule.trim()) {
          allActivities.push({
            id: `act_m_${dayId}_${Date.now()}`,
            dayId,
            type: 'class',
            title: template.morningModule.trim(),
            moduleName: template.morningModule.trim(),
            startTime: template.morningTime || '09:00',
            endTime: '12:00'
          });
        }
        if (template.afternoonModule && template.afternoonModule.trim()) {
          allActivities.push({
            id: `act_a_${dayId}_${Date.now()}`,
            dayId,
            type: 'class',
            title: template.afternoonModule.trim(),
            moduleName: template.afternoonModule.trim(),
            startTime: template.afternoonTime || '13:00',
            endTime: '16:00'
          });
        }
      }
    }

    currentStart.setDate(currentStart.getDate() + 7);
  }

  localStorage.setItem(STORAGE_KEY_SEMESTERS, JSON.stringify([newSemester]));
  localStorage.setItem(STORAGE_KEY_WEEKS, JSON.stringify(weeks));
  localStorage.setItem(STORAGE_KEY_DAYS, JSON.stringify(days));
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(allActivities));

  return semesterId;
};

export const getStoredSemesters = (): Semester[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SEMESTERS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const getStoredWeeks = (semesterId: string): Week[] => {
  try {
    const weeks: Week[] = JSON.parse(localStorage.getItem(STORAGE_KEY_WEEKS) || '[]');
    return weeks.filter(w => w.semesterId === semesterId).sort((a, b) => a.weekNumber - b.weekNumber);
  } catch (e) {
    return [];
  }
};

export const getStoredDays = (weekId: string): AcademicDay[] => {
  try {
    const days: AcademicDay[] = JSON.parse(localStorage.getItem(STORAGE_KEY_DAYS) || '[]');
    return days.filter(d => d.weekId === weekId);
  } catch (e) {
    return [];
  }
};

export const getStoredActivities = (dayId: string): AcademicActivity[] => {
  try {
    const activities: AcademicActivity[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || '[]');
    return activities.filter(a => a.dayId === dayId);
  } catch (e) {
    return [];
  }
};

export const addStoredActivity = (activity: Omit<AcademicActivity, 'id'>) => {
  const activities: AcademicActivity[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || '[]');
  const newActivity: AcademicActivity = { ...activity, id: 'act_' + Date.now() };
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify([newActivity, ...activities]));
  return newActivity;
};

export const updateStoredActivity = (id: string, updates: Partial<AcademicActivity>) => {
  const activities: AcademicActivity[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || '[]');
  const updated = activities.map(a => a.id === id ? { ...a, ...updates } : a);
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(updated));
};

export const deleteStoredActivity = (id: string) => {
  const activities: AcademicActivity[] = JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIVITIES) || '[]');
  const filtered = activities.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(filtered));
};
