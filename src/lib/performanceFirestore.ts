import { db, auth } from './firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore';
import { LibraryModule, LibraryTopic, AcademicAssessment, ExerciseSubmission, TopicEvidenceRecord, CalculatedTopicMastery, AssessmentReadinessRecord, AcademicRiskRecord } from '../types';
import { getLibraryModules, getModuleTopics, getModuleAssessments, getModuleSubmissions } from './libraryFirestore';

export const getTopicEvidence = async (semesterId: string, moduleId?: string, topicId?: string): Promise<TopicEvidenceRecord[]> => {
  if (!db) return [];
  try {
    let q = query(collection(db, 'topic_evidence'), where('semesterId', '==', semesterId));
    if (moduleId) {
      q = query(collection(db, 'topic_evidence'), where('moduleId', '==', moduleId));
    }
    const snapshot = await getDocs(q);
    let list = snapshot.docs.map(d => d.data() as TopicEvidenceRecord);
    if (topicId) {
      list = list.filter(e => e.topicId === topicId);
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (e) {
    console.error('Firestore getTopicEvidence failed', e);
    return [];
  }
};

export const addTopicEvidence = async (record: Omit<TopicEvidenceRecord, 'id'>): Promise<TopicEvidenceRecord> => {
  const id = 'ev_' + Date.now();
  const userId = auth.currentUser?.uid;
  const normalized = record.normalizedScore !== undefined 
    ? record.normalizedScore 
    : (record.score <= 10 ? Math.round(record.score * 10) : Math.min(100, Math.round(record.score)));

  const newRecord: TopicEvidenceRecord = {
    ...record,
    id,
    userId: userId || '',
    normalizedScore: normalized
  };

  if (db) {
    await setDoc(doc(db, 'topic_evidence', id), newRecord);
  }

  return newRecord;
};

// Evidence weighting helper
const getEvidenceWeight = (type: TopicEvidenceRecord['sourceType']): number => {
  switch (type) {
    case 'exam': return 2.5;
    case 'cat': return 2.0;
    case 'quiz': return 1.5;
    case 'handwritten_grading': return 1.2;
    case 'submission': return 1.0;
    case 'exercise': return 1.0;
    default: return 1.0;
  }
};

// Deterministic Evidence-Based Mastery Calculation
export const calculateTopicMastery = (
  topic: LibraryTopic,
  moduleName: string,
  evidenceList: TopicEvidenceRecord[]
): CalculatedTopicMastery => {
  const attempts = evidenceList.filter(e => e.topicId === topic.id || e.topicName?.toLowerCase() === topic.name?.toLowerCase());

  if (attempts.length === 0) {
    return {
      id: topic.id,
      topicId: topic.id,
      moduleId: topic.moduleId,
      moduleName,
      semesterId: topic.semesterId,
      name: topic.name,
      masteryScore: undefined, // Never invent arbitrary 70% or fake scores!
      evidenceCount: 0,
      trend: 'New',
      confidence: 'Low',
      status: 'Insufficient Evidence',
      weakAreas: topic.weakAreas || [],
      strongAreas: topic.strongAreas || [],
      commonMistakes: [],
      history: []
    };
  }

  // Weight each attempt by evidence type and recency
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Chronological sort
  const sorted = [...attempts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  sorted.forEach((att, index) => {
    const baseWeight = getEvidenceWeight(att.sourceType);
    // Recency multiplier: last 3 attempts get 1.4x weight
    const recencyMultiplier = (index >= sorted.length - 3 && sorted.length >= 3) ? 1.4 : 1.0;
    const finalWeight = baseWeight * recencyMultiplier;

    totalWeightedScore += att.normalizedScore * finalWeight;
    totalWeight += finalWeight;
  });

  const finalScore = Math.round(totalWeightedScore / totalWeight);

  // Confidence calculation
  let confidence: 'Low' | 'Medium' | 'High' = 'Low';
  if (attempts.length >= 8) {
    confidence = 'High';
  } else if (attempts.length >= 3) {
    confidence = 'Medium';
  }

  // Trend calculation
  let trend: 'Improving' | 'Stable' | 'Declining' | 'New' = 'New';
  let trendDiff = 0;

  if (sorted.length >= 3) {
    const recentSubset = sorted.slice(-3);
    const earlierSubset = sorted.slice(0, sorted.length - 3);

    const recentAvg = recentSubset.reduce((sum, e) => sum + e.normalizedScore, 0) / recentSubset.length;
    if (earlierSubset.length > 0) {
      const earlierAvg = earlierSubset.reduce((sum, e) => sum + e.normalizedScore, 0) / earlierSubset.length;
      trendDiff = Math.round(recentAvg - earlierAvg);
      if (trendDiff >= 5) trend = 'Improving';
      else if (trendDiff <= -5) trend = 'Declining';
      else trend = 'Stable';
    } else {
      trend = 'Stable';
    }
  }

  // Status calculation
  let status: CalculatedTopicMastery['status'] = 'Developing';
  if (finalScore >= 85 && confidence === 'High') {
    status = 'Mastered';
  } else if (finalScore >= 75 && attempts.length >= 2) {
    status = 'Strong';
  } else if (finalScore >= 50) {
    status = 'Developing';
  } else if (finalScore < 50) {
    status = 'Learning';
  }

  // Mistake aggregation
  const mistakeMap: Record<string, number> = {};
  attempts.forEach(att => {
    if (att.mistakes) {
      att.mistakes.forEach(m => {
        const clean = m.trim();
        if (clean) mistakeMap[clean] = (mistakeMap[clean] || 0) + 1;
      });
    }
  });

  const commonMistakes = Object.entries(mistakeMap)
    .map(([mistake, count]) => ({ mistake, count }))
    .sort((a, b) => b.count - a.count);

  const history = sorted.map(s => ({
    date: s.date,
    score: s.normalizedScore,
    source: s.sourceTitle || s.sourceType,
    dayId: s.dayId
  }));

  const lastAttempt = sorted[sorted.length - 1];

  return {
    id: topic.id,
    topicId: topic.id,
    moduleId: topic.moduleId,
    moduleName,
    semesterId: topic.semesterId,
    name: topic.name,
    masteryScore: finalScore,
    evidenceCount: attempts.length,
    lastAssessed: lastAttempt.sourceType !== 'exercise' ? lastAttempt.date : undefined,
    lastPracticed: lastAttempt.date,
    lastStudied: topic.lastStudied || lastAttempt.date,
    trend,
    trendDiff,
    confidence,
    status,
    weakAreas: topic.weakAreas || [],
    strongAreas: topic.strongAreas || [],
    commonMistakes,
    history
  };
};

export const getAssessmentReadiness = (
  assessments: AcademicAssessment[],
  topics: CalculatedTopicMastery[],
  moduleMap: Record<string, string>
): AssessmentReadinessRecord[] => {
  const today = new Date();

  return assessments.map(asm => {
    const dueDate = new Date(asm.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Related topics in the module
    const moduleTopics = topics.filter(t => t.moduleId === asm.moduleId);
    const scoredTopics = moduleTopics.filter(t => t.masteryScore !== undefined);
    const avgMastery = scoredTopics.length > 0 
      ? Math.round(scoredTopics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / scoredTopics.length)
      : 50; // baseline if no topics scored yet

    // Practice attempts in this module
    const totalModuleEvidence = moduleTopics.reduce((sum, t) => sum + t.evidenceCount, 0);
    const practiceFactor = Math.min(100, totalModuleEvidence * 10);

    // Readiness formula: 70% topic mastery + 30% practice volume
    const readinessPercentage = Math.round(avgMastery * 0.7 + practiceFactor * 0.3);

    // Urgency categorization
    let urgency: AssessmentReadinessRecord['urgency'] = 'Low';
    if (daysRemaining <= 3 || (daysRemaining <= 7 && readinessPercentage < 65)) {
      urgency = 'Critical';
    } else if (daysRemaining <= 7 || (daysRemaining <= 14 && readinessPercentage < 70)) {
      urgency = 'High';
    } else if (daysRemaining <= 21) {
      urgency = 'Medium';
    }

    const weakTopics = moduleTopics.filter(t => (t.masteryScore || 0) < 65).map(t => t.name);
    const strongTopics = moduleTopics.filter(t => (t.masteryScore || 0) >= 75).map(t => t.name);

    let recommendedAction = `Target ${weakTopics[0] || 'core concepts'} with a 45-min review session.`;
    if (urgency === 'Critical') {
      recommendedAction = `Immediate revision needed: ${daysRemaining} days remaining for ${asm.title}. Focus on ${weakTopics.join(', ') || 'practice'}.`;
    }

    return {
      assessment: asm,
      moduleName: moduleMap[asm.moduleId] || 'General Module',
      daysRemaining,
      readinessPercentage,
      urgency,
      weakTopics,
      strongTopics,
      recommendedAction
    };
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);
};

export const getAcademicRiskAnalysis = (
  modules: LibraryModule[],
  topics: CalculatedTopicMastery[],
  assessments: AcademicAssessment[]
): AcademicRiskRecord[] => {
  return modules.map(mod => {
    const modTopics = topics.filter(t => t.moduleId === mod.id);
    const weakTopics = modTopics.filter(t => (t.masteryScore !== undefined && t.masteryScore < 60) || t.trend === 'Declining');
    const scored = modTopics.filter(t => t.masteryScore !== undefined);
    const avgMastery = scored.length > 0 ? Math.round(scored.reduce((s, t) => s + (t.masteryScore || 0), 0) / scored.length) : undefined;

    const upcomingAsm = assessments.find(a => a.moduleId === mod.id && a.status !== 'Completed');
    let daysRemaining: number | undefined;
    if (upcomingAsm) {
      const diff = new Date(upcomingAsm.dueDate).getTime() - new Date().getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const reasons: string[] = [];
    let riskLevel: AcademicRiskRecord['riskLevel'] = 'LOW';

    if (daysRemaining !== undefined && daysRemaining <= 5 && (avgMastery === undefined || avgMastery < 65)) {
      riskLevel = 'CRITICAL';
      reasons.push(`${upcomingAsm?.type.toUpperCase()} is ${daysRemaining} days away with ${avgMastery ? avgMastery + '%' : 'untested'} mastery.`);
    } else if (weakTopics.length >= 2 || (avgMastery !== undefined && avgMastery < 60)) {
      riskLevel = 'HIGH';
      reasons.push(`${weakTopics.length} weak or declining topics detected.`);
    } else if (weakTopics.length === 1 || (daysRemaining !== undefined && daysRemaining <= 14)) {
      riskLevel = 'MEDIUM';
      reasons.push(`Upcoming assessment in ${daysRemaining} days.`);
    }

    if (modTopics.some(t => t.trend === 'Declining')) {
      reasons.push(`Recent performance decline in: ${modTopics.filter(t => t.trend === 'Declining').map(t => t.name).join(', ')}`);
    }

    return {
      moduleId: mod.id,
      moduleName: mod.name,
      riskLevel,
      reasons,
      weakTopics: weakTopics.map(t => t.name),
      upcomingAssessment: upcomingAsm?.title,
      daysRemaining,
      recommendedSessions: riskLevel === 'CRITICAL' ? 3 : (riskLevel === 'HIGH' ? 2 : 1)
    };
  }).filter(r => r.riskLevel !== 'LOW');
};
