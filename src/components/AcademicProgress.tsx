import React from 'react';
import { useSOMA } from '../lib/realtime';
import { AcademicIntelligenceCenter } from './AcademicIntelligenceCenter';

export function AcademicProgress() {
  const { topicMastery, assessmentReadiness, academicRisk } = useSOMA();

  return (
    <div className="p-6">
      <AcademicIntelligenceCenter 
        mastery={topicMastery}
        readiness={assessmentReadiness}
        risk={academicRisk}
      />
    </div>
  );
}
