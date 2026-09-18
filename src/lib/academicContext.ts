
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User, Semester, LibraryModule, LibraryTopic, AcademicAssessment, AcademicActivity, TopicEvidenceRecord, MistakeRecord, CalculatedTopicMastery, AcademicRiskRecord, AssessmentReadinessRecord } from '../types';
import { calculateTopicMastery, getAssessmentReadiness, getAcademicRiskAnalysis } from './performanceFirestore';

export interface AcademicContext {
  user: User;
  activeSemester: Semester;
  modules: LibraryModule[];
  topics: LibraryTopic[];
  assessments: AcademicAssessment[];
  planner: AcademicActivity[];
  evidence: TopicEvidenceRecord[];
  mastery: CalculatedTopicMastery[];
  mistakes: MistakeRecord[];
  risk: AcademicRiskRecord[];
  readiness: AssessmentReadinessRecord[];
}

export type ContextScope = 'global' | 'semester' | 'module' | 'topic' | 'assessment' | 'day' | 'session';

export interface ContextOptions {
  userId: string;
  semesterId: string;
  scope: ContextScope;
  moduleId?: string;
  topicId?: string;
  assessmentId?: string;
  dayId?: string;
  sessionId?: string;
}

export async function buildAcademicContext(options: ContextOptions): Promise<Partial<AcademicContext>> {
  const context: Partial<AcademicContext> = {};
  
  // 1. Fetch Semester (authoritative)
  const semSnap = await getDocs(query(collection(db, 'semesters'), where('id', '==', options.semesterId)));
  if (!semSnap.empty) {
    context.activeSemester = semSnap.docs[0].data() as Semester;
  }

  if (!context.activeSemester) return context;

  // 2. Fetch Modules
  const modSnap = await getDocs(query(collection(db, 'modules'), where('semesterId', '==', options.semesterId)));
  context.modules = modSnap.docs.map(d => d.data() as LibraryModule);

  // 3. Fetch Topics
  const topSnap = await getDocs(query(collection(db, 'topics'), where('semesterId', '==', options.semesterId)));
  context.topics = topSnap.docs.map(d => d.data() as LibraryTopic);

  // 4. Fetch Evidence
  const evSnap = await getDocs(query(collection(db, 'topic_evidence'), where('semesterId', '==', options.semesterId)));
  context.evidence = evSnap.docs.map(d => d.data() as TopicEvidenceRecord);

  // 5. Calculate Mastery (Reuse logic)
  const modMap: Record<string, string> = {};
  context.modules.forEach(m => { modMap[m.id] = m.name; });
  
  context.mastery = context.topics.map(t => {
      return calculateTopicMastery(t, modMap[t.moduleId] || 'General', context.evidence || []);
  });

  // 6. Fetch Assessments
  const asmSnap = await getDocs(query(collection(db, 'assessments'), where('semesterId', '==', options.semesterId)));
  context.assessments = asmSnap.docs.map(d => d.data() as AcademicAssessment);

  // 7. Calculate Risk and Readiness
  context.risk = getAcademicRiskAnalysis(context.modules, context.mastery, context.assessments);
  context.readiness = getAssessmentReadiness(context.assessments, context.mastery, modMap);

  // 8. Scope to requested level
  if (options.scope === 'module' && options.moduleId) {
      context.modules = context.modules.filter(m => m.id === options.moduleId);
      context.topics = context.topics.filter(t => t.moduleId === options.moduleId);
      context.mastery = context.mastery.filter(m => m.moduleId === options.moduleId);
      context.risk = context.risk.filter(r => r.moduleId === options.moduleId);
  }
  
  return context;
}

export function formatContextForGemini(context: Partial<AcademicContext>): string {
  let prompt = `
    Student Academic Context:
    - Active Semester: ${context.activeSemester?.name || 'N/A'}
    - Modules & Academic Credits: ${context.modules?.map(m => `${m.name} (${m.code || 'MOD'}, ${m.credits || 3} Credits)`).join(', ') || 'N/A'}
    - Module Credit Guidance: Higher credit modules (4-6+ credits) represent heavier academic workload. Use credit weight as a study intensity input while never overriding urgent upcoming assessments.
    - Mastery Scores: ${context.mastery?.map(m => `${m.name}: ${m.masteryScore}% (Confidence: ${m.confidence})`).join(', ') || 'N/A'}
    - Upcoming Assessments: ${context.assessments?.map(a => `${a.title} (${a.type}, Due: ${a.dueDate})`).join(', ') || 'None'}
    - Academic Risk: ${context.risk?.map(r => `${r.moduleName}: ${r.riskLevel}`).join(', ') || 'None'}
    - Recent Evidence Count: ${context.evidence?.length || 0}
  `;
  
  if (context.mistakes && context.mistakes.length > 0) {
      prompt += `- Recent Mistakes: ${context.mistakes.map(m => m.concept).join(', ')}`;
  }
  
  return prompt;
}
