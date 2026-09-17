import React from 'react';
import { CalculatedTopicMastery, AssessmentReadinessRecord, AcademicRiskRecord } from '../types';
import { Sparkles, AlertCircle, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { calculateTrajectory } from '../lib/intelligenceEngine';

interface AcademicIntelligenceCenterProps {
  mastery: CalculatedTopicMastery[];
  readiness: AssessmentReadinessRecord[];
  risk: AcademicRiskRecord[];
}

export function AcademicIntelligenceCenter({ mastery, readiness, risk }: AcademicIntelligenceCenterProps) {
  const highRiskModules = risk.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');
  const upcomingAssessments = readiness.sort((a, b) => a.daysRemaining - b.daysRemaining);
  const trajectory = calculateTrajectory(mastery);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-purple-600" />
        <h2 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Academic Intelligence Center</h2>
      </div>

      {/* Trajectory & Risk Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trajectory Card */}
        <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Current Trajectory</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-neutral-900">{trajectory.currentPerformance}%</span>
                <span className={`flex items-center text-sm font-bold ${trajectory.trend === 'Improving' ? 'text-emerald-600' : trajectory.trend === 'Declining' ? 'text-red-600' : 'text-neutral-500'}`}>
                    {trajectory.trend === 'Improving' ? <TrendingUp className="w-4 h-4 mr-1"/> : trajectory.trend === 'Declining' ? <TrendingDown className="w-4 h-4 mr-1"/> : <Minus className="w-4 h-4 mr-1"/>}
                    {trajectory.trend}
                </span>
            </div>
            {trajectory.projectedPerformance && (
                <p className="text-sm text-neutral-600">
                    Based on recent performance, SOMA projects a trajectory of <strong>{trajectory.projectedPerformance}%</strong> ({trajectory.confidence} confidence).
                </p>
            )}
        </div>

        {/* High Risk Alerts */}
        <div className={`p-8 rounded-3xl border ${highRiskModules.length > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${highRiskModules.length > 0 ? 'text-red-900' : 'text-emerald-900'} flex items-center gap-2 mb-4`}>
            <AlertCircle className="w-5 h-5" />
            {highRiskModules.length > 0 ? 'Urgent Priority Concerns' : 'Academic Health Stable'}
          </h3>
          {highRiskModules.length > 0 ? (
            <div className="space-y-3">
                {highRiskModules.map(r => (
                <div key={r.moduleId} className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs">
                    <p className="font-bold text-neutral-900">{r.moduleName}</p>
                    <p className="text-sm text-neutral-600">{r.reasons.join(', ')}</p>
                </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-800">No critical academic risks detected at this time.</p>
          )}
        </div>
      </div>

      {/* Upcoming Assessments */}
      <div className="bg-white p-8 rounded-3xl border shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Upcoming Assessment Readiness</h3>
        <div className="space-y-6">
          {upcomingAssessments.map(asm => (
            <div key={asm.assessment.id} className="flex justify-between items-center pb-6 border-b last:border-0 last:pb-0">
              <div className="space-y-1">
                <p className="font-bold text-neutral-900 text-lg">{asm.assessment.title}</p>
                <p className="text-sm text-neutral-500">{asm.daysRemaining} days remaining • <span className="font-semibold text-neutral-800">Readiness: {asm.readinessPercentage}%</span></p>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-xs font-bold ${asm.urgency === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                {asm.urgency}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Mastery Summary */}
      <div className="bg-white p-8 rounded-3xl border shadow-sm">
        <h3 className="text-lg font-bold text-neutral-900 mb-6">Topic Mastery Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
                { label: 'Mastered', count: mastery.filter(m => m.status === 'Mastered').length },
                { label: 'Strong', count: mastery.filter(m => m.status === 'Strong').length },
                { label: 'Developing', count: mastery.filter(m => m.status === 'Developing').length },
                { label: 'Needs Review', count: mastery.filter(m => m.status === 'Learning' || m.status === 'Not Started').length },
            ].map(item => (
                <div key={item.label} className="bg-neutral-50 p-6 rounded-3xl border text-center">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">{item.label}</p>
                    <p className="text-4xl font-extrabold text-neutral-900">{item.count}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
