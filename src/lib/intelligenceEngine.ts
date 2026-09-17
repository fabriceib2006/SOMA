import { CalculatedTopicMastery } from '../types';

export interface TrajectoryProjection {
  currentPerformance: number;
  projectedPerformance: number | null;
  confidence: 'High' | 'Medium' | 'Low' | 'Insufficient';
  trend: 'Improving' | 'Stable' | 'Declining';
}

export const calculateTrajectory = (mastery: CalculatedTopicMastery[]): TrajectoryProjection => {
  const scoredTopics = mastery.filter(t => t.masteryScore !== undefined && t.history.length >= 3);
  
  if (scoredTopics.length === 0) {
    return {
      currentPerformance: 0,
      projectedPerformance: null,
      confidence: 'Insufficient',
      trend: 'Stable'
    };
  }

  // Calculate weighted current performance (weighted by mastery score vs evidence count)
  let totalEvidence = 0;
  let weightedScore = 0;
  scoredTopics.forEach(t => {
    const weight = Math.min(t.evidenceCount, 10); // cap evidence weight
    weightedScore += (t.masteryScore || 0) * weight;
    totalEvidence += weight;
  });

  const currentPerformance = Math.round(weightedScore / totalEvidence);

  // Analyze trend from history
  let totalTrend = 0;
  scoredTopics.forEach(t => {
    if (t.trend === 'Improving') totalTrend += 1;
    else if (t.trend === 'Declining') totalTrend -= 1;
  });
  
  const trend: TrajectoryProjection['trend'] = totalTrend > 0 ? 'Improving' : totalTrend < 0 ? 'Declining' : 'Stable';

  // Projection (Simple Linear extrapolation of current trend)
  const projection = trend === 'Improving' ? Math.min(100, currentPerformance + 5) : 
                     trend === 'Declining' ? Math.max(0, currentPerformance - 5) : 
                     currentPerformance;

  return {
    currentPerformance,
    projectedPerformance: projection,
    confidence: scoredTopics.length >= 3 ? 'High' : 'Medium',
    trend
  };
};
