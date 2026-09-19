import { AcademicContext } from './academicContext';
import { Recommendation } from '../types';
import { safeParseDueDate } from './safeDateUtils';

export async function detectSignals(context: AcademicContext): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // 1. Check for Upcoming Assessments
  const upcomingAssessments = context.assessments.filter(a => {
    const parsed = safeParseDueDate(a.dueDate);
    return parsed.isValid && parsed.daysRemaining >= 0 && parsed.daysRemaining <= 7;
  });

  for (const assessment of upcomingAssessments) {
    const masteryForAssessment = context.mastery.filter(m => assessment.topicNames?.includes(m.name));
    const weakTopics = masteryForAssessment.filter(m => (m.masteryScore || 0) < 60);

    if (weakTopics.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        userId: context.user.id,
        semesterId: context.activeSemester.id,
        type: 'assessment_warning',
        title: `Prepare for ${assessment.title}`,
        message: `Your ${assessment.title} is coming up, but you have weak mastery in: ${weakTopics.map(t => t.name).join(', ')}.`,
        reason: 'Upcoming assessment with low mastery in related topics.',
        priority: 'Critical',
        status: 'Pending',
        assessmentId: assessment.id,
        createdAt: new Date().toISOString()
      });
    }
  }

  // 2. Check for Academic Risk
  const highRisk = context.risk.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
  for (const risk of highRisk) {
    recommendations.push({
      id: crypto.randomUUID(),
      userId: context.user.id,
      semesterId: context.activeSemester.id,
      type: 'risk_change',
      title: `High Risk in ${risk.moduleName}`,
      message: `Your risk level is ${risk.riskLevel}. Please review: ${risk.weakTopics.join(', ')}.`,
      reason: 'Academic risk analysis indicates high risk.',
      priority: 'High',
      status: 'Pending',
      moduleId: risk.moduleId,
      createdAt: new Date().toISOString()
    });
  }

  return recommendations;
}
