export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LibraryModule {
  id: string;
  userId: string;
  academicYearId: string;
  semesterId: string;
  name: string;
  code: string;
  lecturer: string;
  credits: number;
  description: string;
  color?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LectureMaterial {
  fileData?: string;
  id: string;
  userId: string;
  academicYearId: string;
  semesterId: string;
  moduleId: string;
  dayId?: string;
  lectureNumber: string;
  title: string;

  lectureDate: string;
  type: 'pdf' | 'powerpoint' | 'word' | 'image' | 'photo' | 'text' | 'scanned';
  fileName?: string;
  fileDataUrl?: string;
  fileUrl?: string;
  storagePath?: string;
  fileSize?: number;
  mimeType?: string;
  isHistorical?: boolean;
  processingStatus: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed' | 'analyzing' | 'analyzed';
  aiAnalysis?: {
    topicsFound: string[];
    concepts: string[];
    difficulty: string;
    importance: string;
    summary: string;
    recommendations?: string[];
  };
  uploadedAt?: string;
  processedAt?: string;
  processingError?: string;
  createdAt: string;
}

export interface LibraryTopic {
  fileName?: string;
  fileData?: string;

  id: string;
  userId: string;
  semesterId: string;
  moduleId: string;
  name: string;
  description: string;
  masteryScore: number; // 0-100
  status: 'Mastered' | 'Developing' | 'Needs Review';
  relatedLectures: string[];
  weakAreas: string[];
  strongAreas: string[];
  lastStudied?: string;
  nextReview?: string;
}

export type AssessmentStatus = 'Draft' | 'Scheduled' | 'Preparing' | 'Ready' | 'InProgress' | 'Submitted' | 'UnderReview' | 'Graded' | 'Reviewed' | 'EvidenceCaptured' | 'Closed' | 'Upcoming' | 'Completed';
export type SubmissionStatus = 'Draft' | 'Uploading' | 'Uploaded' | 'Submitted' | 'UnderAIReview' | 'AIReviewed' | 'Graded' | 'Returned';

export interface AssessmentSubmission {
  id: string;
  userId: string;
  semesterId: string;
  assessmentId: string;
  moduleId: string;
  topicIds: string[];
  status: SubmissionStatus;
  submittedAt?: string;
  fileUrls?: string[];
  typedContent?: string;
  aiEvaluation?: string;
  aiScore?: number;
  officialMark?: number;
  feedback?: string;
  attemptNumber: number;
}

export interface AcademicAssessment {
  fileName?: string;
  fileData?: string;
  id: string;
  userId?: string;
  semesterId?: string;
  moduleId: string;
  moduleName?: string;
  type: 'assignment' | 'quiz' | 'cat' | 'exam';
  title: string;

  description?: string;
  dueDate: string;
  durationMinutes?: number;
  status: AssessmentStatus;
  maxScore?: number;
  officialMark?: number;
  feedback?: string;
  topicNames?: string[];
  submissionIds?: string[];
  dayId?: string;
  notes?: string;
}

export interface LibraryExercise {
  id: string;
  userId: string;
  semesterId: string;
  moduleId: string;
  topicId?: string;
  question: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  correctAnswer?: string;
  explanation?: string;
}

export interface ExerciseSubmission {
  id: string;
  userId: string;
  semesterId: string;
  exerciseId?: string;
  moduleId: string;
  moduleName?: string;
  topicId?: string;
  topicName?: string;
  dayId?: string;
  question: string;
  answerType: 'typed' | 'handwritten';
  studentAnswer: string; // text or base64 image (legacy)
  evidenceUrls?: string[]; // ordered list of storage URLs for multi-page
  pageCount?: number;
  score: number; // 0-10
  feedback: string;
  correctAnswer?: string;
  mistakes: string[];
  conceptGaps: string[];
  strengths: string[];
  submittedAt: string;
  status: 'Evaluated' | 'Failed';
}

export interface PracticeDraft {
  id: string;
  userId: string;
  semesterId: string;
  moduleId: string;
  topicId: string;
  exerciseId?: string;
  question: string;
  answerType: 'typed' | 'handwritten';
  typedAnswer?: string;
  canvasData?: string; // Serialization of the drawing
  lastSavedAt: string;
}

export interface MistakeRecord {
  id: string;
  userId: string;
  semesterId: string;
  moduleId: string;
  topicId: string;
  attemptId: string; // Link to ExerciseSubmission
  concept: string;
  mistakeType: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface AcademicYear {
  id: string;
  year: string; // e.g., "2026 / 2027"
}

export interface Semester {
  id: string;
  academicYearId: string;
  name: string; // e.g., "Semester 1"
  startDate: Date;
  numberOfWeeks: number;
  isCurrent: boolean;
}

export interface Week {
  id: string;
  semesterId: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}

export interface AcademicDay {
  id: string;
  weekId: string;
  date: Date;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  status: 'UPCOMING' | 'TODAY' | 'COMPLETED';
}

export interface AcademicActivity {
  googleEventId?: string;
  calendarSyncStatus?: 'synced' | 'pending' | 'error';
  id: string;
  dayId: string;
  userId?: string;
  semesterId?: string;
  type: 'class' | 'assignment' | 'quiz' | 'cat' | 'exam' | 'study_session' | 'event';
  taskType?: "Review Lecture" | "Active Recall" | "Practice" | "Problem Solving" | "Assignment" | "Revision" | "Exam Preparation" | "Mistake Review" | "Tutor Session" | "Notes Processing";
  title: string;

  moduleName?: string;
  moduleId?: string;
  topicName?: string;
  topicId?: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration?: number; // in minutes
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  reason?: string;
  source?: 'master_timetable' | 'intelligence_engine' | 'manual';
  status?: 'Upcoming' | 'In Progress' | 'Completed' | 'Canceled' | 'Skipped';
  assessmentId?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Module {
  id: string;
  name: string;
  code: string;
  lecturer: string;
  credits: number;
  importance: 'high' | 'medium' | 'low';
}

export interface Topic {
  id: string;
  moduleId: string;
  name: string;
  masteryScore: number;
}

export interface TimetableEntry {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  activityName: string;
  lecturer?: string;
  location?: string;
  moduleId?: string;
  status: 'active' | 'canceled';
  weekNumber: number;
}

export interface Deadline {
  id: string;
  title: string;

  type: 'Assignment' | 'CAT' | 'Quiz';
  dueDate: Date;
  moduleId?: string;
}

export interface TopicEvidenceRecord {
  id: string;
  userId: string;
  semesterId: string;
  moduleId: string;
  moduleName?: string;
  topicId: string;
  topicName: string;
  sourceType: 'exercise' | 'submission' | 'quiz' | 'cat' | 'exam' | 'handwritten_grading';
  sourceTitle: string;
  score: number; // 0 to 10 or 0 to 100
  normalizedScore: number; // 0 to 100
  mistakes?: string[];
  date: string;
  dayId?: string;
}

export interface TutorConversation {
  id: string;
  userId: string;
  semesterId: string;
  dayId?: string;
  moduleId?: string;
  topicId?: string;
  title: string;

  lastMessageAt: string;
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    topicId?: string;
    moduleId?: string;
    contextId?: string;
  };
}

export interface CalculatedTopicMastery {
  id: string;
  topicId: string;
  moduleId: string;
  moduleName: string;
  semesterId: string;
  name: string;
  masteryScore?: number; // 0-100, or undefined if insufficient evidence
  evidenceCount: number;
  lastAssessed?: string;
  lastPracticed?: string;
  lastStudied?: string;
  trend: 'Improving' | 'Stable' | 'Declining' | 'New';
  trendDiff?: number;
  confidence: 'Low' | 'Medium' | 'High';
  status: 'Not Started' | 'Learning' | 'Developing' | 'Strong' | 'Mastered' | 'Insufficient Evidence';
  weakAreas: string[];
  strongAreas: string[];
  commonMistakes: { mistake: string; count: number }[];
  history: { date: string; score: number; source: string; dayId?: string }[];
}

export interface AssessmentReadinessRecord {
  assessment: AcademicAssessment;
  moduleName: string;
  daysRemaining: number;
  readinessPercentage: number;
  urgency: 'Critical' | 'High' | 'Medium' | 'Low';
  weakTopics: string[];
  strongTopics: string[];
  recommendedAction: string;
}

export interface AcademicRiskRecord {
  moduleId: string;
  moduleName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  weakTopics: string[];
  upcomingAssessment?: string;
  daysRemaining?: number;
  recommendedSessions: number;
}

export interface Recommendation {
  id: string;
  userId: string;
  semesterId: string;
  type: 'assessment_warning' | 'risk_change' | 'weak_topic' | 'repeated_mistake' | 'missed_session' | 'planner_drift' | 'timetable_change' | 'new_material' | 'new_assessment' | 'insufficient_evidence' | 'neglected_module' | 'free_window' | 'improvement' | 'achievement' | 'readiness_change';
  title: string;

  message: string;
  reason: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Pending' | 'Dismissed' | 'Completed' | 'Expired';
  moduleId?: string;
  topicId?: string;
  assessmentId?: string;
  dayId?: string;
  plannerSessionId?: string;
  createdAt: string;
  expiresAt?: string;
}


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


