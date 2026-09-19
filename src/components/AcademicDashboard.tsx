import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target, 
  Brain, 
  BookOpen, 
  Sparkles, 
  Filter, 
  ChevronRight, 
  Info, 
  Search, 
  Award,
  AlertCircle,
  BarChart3,
  ExternalLink,
  X,
  PenTool,
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { Semester, LibraryModule, LibraryTopic, AcademicAssessment, ExerciseSubmission, CalculatedTopicMastery, TopicEvidenceRecord, AssessmentReadinessRecord, AcademicRiskRecord } from '../types';
import { getCATDateComponents, normalizeToCATDateString } from '../lib/catTime';
import { GeneratePlanButton } from './planner/GeneratePlanButton';
import { auth } from '../lib/firebase';
import { useSOMA } from '../lib/realtime';
import { deleteAssessmentWithCascade, cleanOrphanAssessments } from '../lib/academicCascadeDelete';
import { safeParseDueDate } from '../lib/safeDateUtils';
import { ConfirmDeleteModal } from './common/ConfirmDeleteModal';

interface AcademicDashboardProps {
  onNavigateTab?: (tab: string) => void;
  onOpenTopicInTutor?: (topicName: string, moduleName: string) => void;
  onOpenPractice?: (moduleId: string, topicId: string) => void;
}

export const AcademicDashboard: React.FC<AcademicDashboardProps> = ({ 
  onNavigateTab,
  onOpenTopicInTutor,
  onOpenPractice
}) => {
  const {
    semesters,
    activeSemester: selectedSemester,
    modules,
    assessments: allAssessments,
    topicMastery: allTopics,
    academicRisk: riskList,
    assessmentReadiness: readinessList,
    loading: somaLoading,
    syncStatus
  } = useSOMA();

  // Filters
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected topic for detail drawer
  const [activeTopicDetail, setActiveTopicDetail] = useState<CalculatedTopicMastery | null>(null);

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<{
    summary: string;
    strengths: string[];
    riskAnalysis: string;
    mistakeInsights: string[];
    recommendations: { action: string; duration: string; reason: string }[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Assessment deletion and cleanup state
  const [assessmentToDelete, setAssessmentToDelete] = useState<{ id: string; title: string; moduleName?: string } | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleDeleteAssessment = (assessmentId: string, title: string, moduleName?: string) => {
    setAssessmentToDelete({ id: assessmentId, title, moduleName });
  };

  const handleConfirmDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    try {
      setDeletingAssessmentId(assessmentToDelete.id);
      const title = assessmentToDelete.title;
      await deleteAssessmentWithCascade(assessmentToDelete.id);
      setAssessmentToDelete(null);
      setCleanFeedback(`✓ Successfully deleted "${title}" from assessments, progress, and timetable.`);
      setTimeout(() => setCleanFeedback(null), 6000);
    } catch (err) {
      console.error('Failed to delete assessment:', err);
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  const handleCleanOrphans = async () => {
    try {
      setIsCleaning(true);
      const res = await cleanOrphanAssessments();
      if (res.cleanedCount > 0) {
        setCleanFeedback(`Purged ${res.cleanedCount} ghost plan${res.cleanedCount > 1 ? 's' : ''}: ${res.cleanedTitles.join(', ')}`);
      } else {
        setCleanFeedback('All assessment plans are cleanly synced with your academic timeline.');
      }
      setTimeout(() => setCleanFeedback(null), 6000);
    } catch (e) {
      console.error('Failed to clean orphans:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return allTopics.filter(t => {
      const matchesModule = selectedModuleId === 'all' || t.moduleId === selectedModuleId;
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.moduleName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (selectedStatusFilter === 'weak') {
        matchesStatus = t.masteryScore !== undefined && t.masteryScore < 60;
      } else if (selectedStatusFilter === 'strong') {
        matchesStatus = t.masteryScore !== undefined && t.masteryScore >= 75;
      } else if (selectedStatusFilter === 'developing') {
        matchesStatus = t.status === 'Developing';
      } else if (selectedStatusFilter === 'mastered') {
        matchesStatus = t.status === 'Mastered';
      } else if (selectedStatusFilter === 'improving') {
        matchesStatus = t.trend === 'Improving';
      } else if (selectedStatusFilter === 'declining') {
        matchesStatus = t.trend === 'Declining';
      } else if (selectedStatusFilter === 'insufficient') {
        matchesStatus = t.status === 'Insufficient Evidence';
      }

      return matchesModule && matchesSearch && matchesStatus;
    });
  }, [allTopics, selectedModuleId, selectedStatusFilter, searchQuery]);

  // High-level aggregates (Evidence-based only)
  const scoredTopics = allTopics.filter(t => t.masteryScore !== undefined);
  const totalAttempts = allTopics.reduce((sum, t) => sum + t.evidenceCount, 0);
  const overallMastery = scoredTopics.length > 0 
    ? Math.round(scoredTopics.reduce((sum, t) => sum + (t.masteryScore || 0), 0) / scoredTopics.length)
    : undefined;

  const topicsMasteredCount = allTopics.filter(t => t.status === 'Mastered').length;
  const weakTopics = allTopics.filter(t => t.masteryScore !== undefined && t.masteryScore < 60);

  const handleSemesterChange = (semId: string) => {
    // In real-time mode, changing the current semester in Firestore would trigger a refresh 
    // for all components via SOMAProvider if we implemented activeSemester switching.
    // For now, we assume activeSemester is handled globally or we can just notify user.
  };

  // Aggregated Mistakes
  const aggregatedMistakes = useMemo(() => {
    const mistakeMap: Record<string, { count: number; topicName: string; moduleName: string }> = {};
    allTopics.forEach(t => {
      t.commonMistakes.forEach(m => {
        if (!mistakeMap[m.mistake]) {
          mistakeMap[m.mistake] = { count: m.count, topicName: t.name, moduleName: t.moduleName };
        } else {
          mistakeMap[m.mistake].count += m.count;
        }
      });
    });
    return Object.entries(mistakeMap)
      .map(([mistake, data]) => ({ mistake, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [allTopics]);

  // Fetch AI Insights
  const handleFetchAiInsights = async () => {
    setLoadingInsights(true);
    try {
      const cat = getCATDateComponents();
      const response = await fetch('/api/progress/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: allTopics.map(t => ({ name: t.name, module: t.moduleName, score: t.masteryScore, trend: t.trend, status: t.status })),
          assessments: allAssessments.map(a => ({ title: a.title, type: a.type, dueDate: a.dueDate })),
          mistakes: aggregatedMistakes.slice(0, 5),
          overallMastery,
          referenceDate: cat.dateString,
          catTimeString: cat.shortTimeString
        })
      });
      const data = await response.json();
      setAiInsights(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (somaLoading) {
    return (
      <div className="space-y-6 pb-24 max-w-5xl mx-auto animate-pulse">
        <div className="h-32 bg-white rounded-3xl border"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-white rounded-2xl border"></div>
          <div className="h-28 bg-white rounded-2xl border"></div>
          <div className="h-28 bg-white rounded-2xl border"></div>
        </div>
        <div className="h-72 bg-white rounded-3xl border"></div>
      </div>
    );
  }

  if (!selectedSemester) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border max-w-2xl mx-auto p-8">
        <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-3" />
        <h3 className="text-xl font-bold text-neutral-800">No Active Semester Configured</h3>
        <p className="text-neutral-500 text-sm mt-1 mb-6">Create your semester to unlock evidence-based academic performance intelligence.</p>
        <button 
          onClick={() => onNavigateTab?.('Semester')} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          Setup Semester Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto">
      {/* Real-time Status */}
      <div className="flex items-center gap-2 px-4">
        <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          {syncStatus === 'online' ? 'Real-time Performance Intelligence Active' : 'Performance Offline • Historical Mode'}
        </span>
      </div>

      {/* 1. Header & Academic Performance Status */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {selectedSemester.name} Performance Center
            </span>
            <span className="text-xs text-neutral-400">Academic Year 2026 / 2027</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-neutral-100 text-neutral-700 border flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-500" />
              <span>{getCATDateComponents().shortTimeString} CAT</span>
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">
            Academic Performance & Mastery
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Real evidence-based learning signals, topic mastery, and academic risk analytics.
          </p>
        </div>

        {/* Semester selector dropdown if multiple exist */}
        {semesters.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-medium">Semester:</span>
            <select
              value={selectedSemester.id}
              onChange={e => handleSemesterChange(e.target.value)}
              className="p-2 border rounded-xl bg-neutral-50 text-sm font-medium"
            >
              {semesters.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? '(Current)' : ''}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Top Metric Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Modules</span>
          <h3 className="text-2xl font-bold text-neutral-900 mt-1">{modules.length}</h3>
          <span className="text-[10px] text-neutral-500">Active courses</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Topics Tracked</span>
          <h3 className="text-2xl font-bold text-neutral-900 mt-1">{allTopics.length}</h3>
          <span className="text-[10px] text-neutral-500">Across all modules</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Mastered</span>
          <h3 className="text-2xl font-bold text-emerald-700 mt-1">{topicsMasteredCount}</h3>
          <span className="text-[10px] text-emerald-600 font-medium">High confidence</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Practice Attempts</span>
          <h3 className="text-2xl font-bold text-blue-700 mt-1">{totalAttempts}</h3>
          <span className="text-[10px] text-blue-600">Recorded evidence</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-xs col-span-2 md:col-span-1">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Assessments</span>
          <h3 className="text-2xl font-bold text-purple-700 mt-1">{allAssessments.length}</h3>
          <span className="text-[10px] text-purple-600">Quizzes, CATs, Exams</span>
        </div>
      </div>

      {/* 3. Overall Mastery & Target Goal Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Authoritative Baseline</span>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-extrabold text-neutral-900">
                {overallMastery !== undefined ? `${overallMastery}%` : 'Building baseline...'}
              </h2>
              <span className="text-xs font-medium text-neutral-500">Overall Mastery</span>
            </div>
            <p className="text-xs text-neutral-500">
              {overallMastery !== undefined
                ? `Calculated from ${totalAttempts} recorded learning attempts across ${scoredTopics.length} tested topics.`
                : 'Complete exercises, upload handwritten notes, or take quizzes to build your evidence-based baseline.'}
            </p>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex items-center gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Academic Target</span>
              <h4 className="text-sm font-bold text-neutral-800">First Class Honors</h4>
              <span className={`text-[10px] font-medium ${
                overallMastery && overallMastery >= 70 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {overallMastery && overallMastery >= 70 ? '● Strong Trajectory' : '● Action Required in Weak Areas'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="mt-6 pt-6 border-t flex flex-wrap gap-2">
          {weakTopics.length > 0 && (
            <button
              onClick={() => onOpenTopicInTutor?.(weakTopics[0].name, weakTopics[0].moduleName)}
              className="bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>🔴</span> Practice Weakest Topic ({weakTopics[0].name})
            </button>
          )}
          <button
            onClick={() => setSelectedStatusFilter('declining')}
            className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>⚠️</span> Filter Declining Topics
          </button>
          {readinessList.length > 0 && (
            <button
              onClick={() => setSelectedModuleId(readinessList[0].assessment.moduleId)}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>📝</span> Prepare for Next Assessment ({readinessList[0].assessment.title})
            </button>
          )}
          <button
            onClick={() => onNavigateTab?.('AI')}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
          >
            <Brain className="w-3.5 h-3.5" /> Open SOMA AI Tutor
          </button>
        </div>
      </div>

      {/* 4. SOMA AI Performance Intelligence Insights */}
      <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-neutral-900 text-white p-6 md:p-8 rounded-3xl shadow-md space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold bg-purple-500/30 text-purple-200 px-3 py-1 rounded-full border border-purple-400/20 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-300" /> SOMA Intelligence Insights
            </span>
          </div>
          <button
            onClick={handleFetchAiInsights}
            disabled={loadingInsights}
            className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl font-medium transition-all"
          >
            {loadingInsights ? 'Analyzing evidence...' : 'Generate Fresh Insights'}
          </button>
        </div>

        {aiInsights ? (
          <div className="space-y-4 text-purple-100 text-sm">
            <p className="leading-relaxed text-white font-medium">{aiInsights.summary}</p>
            {aiInsights.riskAnalysis && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-xs text-red-200">
                <strong>Academic Risk Alert:</strong> {aiInsights.riskAnalysis}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {aiInsights.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-3.5 rounded-2xl space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-purple-300 font-bold uppercase">
                    <span>Recommendation {idx + 1}</span>
                    <span>{rec.duration}</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">{rec.action}</h5>
                  <p className="text-[11px] text-purple-200 leading-snug">{rec.reason}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
            <div>
              <h4 className="font-bold text-white text-base">Want deep pedagogical analysis of your performance?</h4>
              <p className="text-xs text-purple-200 mt-0.5">
                SOMA will evaluate your practice scores, repeated mistakes, and assessment countdowns to formulate optimal study advice.
              </p>
            </div>
            <button
              onClick={handleFetchAiInsights}
              disabled={loadingInsights}
              className="bg-white text-neutral-900 hover:bg-purple-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
            >
              {loadingInsights ? 'Analyzing...' : 'Analyze My Performance'}
            </button>
          </div>
        )}
      </div>

      {/* 5. Academic Risk & Upcoming Assessment Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Risk */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Academic Risk Center
            </h3>
            <span className="text-xs text-neutral-400">Early Warning System</span>
          </div>

          {riskList.length === 0 ? (
            <div className="p-6 text-center bg-emerald-50/50 border border-emerald-100 rounded-2xl">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-emerald-900 text-sm">No Critical Academic Risks</h4>
              <p className="text-xs text-emerald-700 mt-1">All modules have stable or developing performance with manageable assessment timelines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {riskList.map((risk, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-2xl border ${
                    risk.riskLevel === 'CRITICAL' ? 'bg-red-50/60 border-red-200' : 'bg-amber-50/60 border-amber-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                        risk.riskLevel === 'CRITICAL' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {risk.riskLevel} RISK • {risk.moduleName}
                      </span>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-700">
                        {risk.reasons.map((r, ri) => (
                          <li key={ri} className="flex items-center gap-1.5">
                            <span className="text-red-500">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-black/5 flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-neutral-600">
                      Recommended: {risk.recommendedSessions} targeted study sessions
                    </span>
                    <button 
                      onClick={() => setSelectedModuleId(risk.moduleId)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      View Topics →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assessment Readiness */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" /> Assessment Readiness
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCleanOrphans}
                disabled={isCleaning}
                className="text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                title="Scan and purge any phantom or duplicate assessments not matched on the academic timeline"
              >
                {isCleaning ? 'Cleaning...' : 'Purge Ghost Plans'}
              </button>
              <span className="text-xs text-neutral-400 hidden sm:inline">Preparation vs Scope</span>
            </div>
          </div>

          {cleanFeedback && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-medium leading-relaxed">
              {cleanFeedback}
            </div>
          )}

          {readinessList.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">No scheduled assessments in this semester.</p>
          ) : (
            <div className="space-y-3">
              {readinessList.map((item, i) => {
                const parsed = safeParseDueDate(item.assessment.dueDate);
                return (
                  <div key={item.assessment.id || i} className="p-4 rounded-2xl border bg-neutral-50/50 space-y-2 hover:bg-white hover:border-neutral-300 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                            {item.assessment.type.toUpperCase()} • {item.moduleName}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Due: {parsed.formattedDueDate}
                          </span>
                        </div>
                        <h4 className="font-bold text-neutral-900 text-sm mt-1">{item.assessment.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.urgency === 'Critical' ? 'bg-red-100 text-red-700' :
                            item.urgency === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.daysRemaining === 0 ? 'Today' : `${item.daysRemaining} days away`}
                          </span>
                          <div className="text-xs font-extrabold text-neutral-900 mt-1">
                            Readiness: {item.readinessPercentage}%
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAssessment(item.assessment.id, item.assessment.title, item.moduleName);
                          }}
                          disabled={deletingAssessmentId === item.assessment.id}
                          title="Delete assessment (removes from progress, academic timeline, Google calendar, and rebalances study plan)"
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          item.readinessPercentage >= 75 ? 'bg-emerald-500' :
                          item.readinessPercentage >= 55 ? 'bg-amber-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${item.readinessPercentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500">{item.recommendedAction}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Module Comparison & Filter Tabs */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-neutral-900 text-lg">Module Performance Breakdown</h3>
            <p className="text-xs text-neutral-500">Filter topics and assess mastery distribution by course.</p>
          </div>

          {/* Module Pills */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedModuleId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedModuleId === 'all' 
                  ? 'bg-neutral-900 text-white shadow-xs' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              All Modules ({allTopics.length})
            </button>
            {modules.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModuleId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedModuleId === m.id 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Filters & Search */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search topics or concepts..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-neutral-50 text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'weak', label: '🔴 Needs Attention (<60%)' },
              { id: 'developing', label: '🟡 Developing' },
              { id: 'strong', label: '🟢 Strong (≥75%)' },
              { id: 'improving', label: '↑ Improving' },
              { id: 'declining', label: '↓ Declining' },
              { id: 'insufficient', label: '⚪ No Evidence Yet' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedStatusFilter === f.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                    : 'bg-white border text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topics List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {filteredTopics.length === 0 ? (
            <div className="col-span-full py-12 text-center text-neutral-400 bg-neutral-50 rounded-2xl border border-dashed">
              <p className="text-sm">No topics match the selected filters.</p>
            </div>
          ) : (
            filteredTopics.map(topic => (
              <div
                key={topic.id}
                onClick={() => setActiveTopicDetail(topic)}
                className="p-4 rounded-2xl border bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      {topic.moduleName}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {topic.trend === 'Improving' && <span className="text-emerald-600 flex items-center"><TrendingUp className="w-3.5 h-3.5" /> +{topic.trendDiff}%</span>}
                      {topic.trend === 'Declining' && <span className="text-red-600 flex items-center"><TrendingDown className="w-3.5 h-3.5" /> {topic.trendDiff}%</span>}
                      {topic.trend === 'Stable' && <span className="text-neutral-400 flex items-center"><Minus className="w-3.5 h-3.5" /></span>}
                    </div>
                  </div>
                  <h4 className="font-bold text-neutral-900 text-sm mt-1">{topic.name}</h4>
                </div>

                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <div>
                    {topic.masteryScore !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-base font-extrabold ${
                          topic.masteryScore >= 75 ? 'text-emerald-600' :
                          topic.masteryScore >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {topic.masteryScore}%
                        </span>
                        <span className="text-[10px] text-neutral-400">({topic.confidence} conf)</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">No evidence yet</span>
                    )}
                  </div>
                  <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-0.5">
                    Evidence ({topic.evidenceCount}) <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 7. Detected Common Mistakes & Frequency */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-neutral-900 text-lg">Your Common Mistakes & Recurrent Error Patterns</h3>
            <p className="text-xs text-neutral-500">Extracted from AI-graded submissions and practice errors.</p>
          </div>
          <span className="text-xs font-semibold text-neutral-400">{aggregatedMistakes.length} Detected Patterns</span>
        </div>

        {aggregatedMistakes.length === 0 ? (
          <div className="p-6 bg-neutral-50 rounded-2xl border text-center text-neutral-500 text-sm">
            No repeated mistake patterns recorded yet. As you complete exercises and handwritten note submissions, SOMA detects error tendencies automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aggregatedMistakes.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl border bg-neutral-50/50 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    {item.moduleName} • {item.topicName}
                  </span>
                  <h4 className="font-bold text-neutral-900 text-sm mt-0.5">{item.mistake}</h4>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-xs font-extrabold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                    {item.count} occurrences
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Topic Detail Drawer / Modal */}
      {activeTopicDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  {activeTopicDetail.moduleName}
                </span>
                <h3 className="text-2xl font-bold text-neutral-900 mt-2">{activeTopicDetail.name}</h3>
              </div>
              <button 
                onClick={() => setActiveTopicDetail(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Evidence & Score Overview */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-2xl border text-center">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Mastery</span>
                <h4 className="text-2xl font-extrabold text-neutral-900 mt-0.5">
                  {activeTopicDetail.masteryScore !== undefined ? `${activeTopicDetail.masteryScore}%` : 'N/A'}
                </h4>
                <span className="text-[10px] text-neutral-500">{activeTopicDetail.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Confidence</span>
                <h4 className="text-xl font-bold text-neutral-800 mt-1">{activeTopicDetail.confidence}</h4>
                <span className="text-[10px] text-neutral-500">{activeTopicDetail.evidenceCount} attempts</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Trend</span>
                <h4 className="text-xl font-bold text-neutral-800 mt-1">{activeTopicDetail.trend}</h4>
                <span className="text-[10px] text-neutral-500">{activeTopicDetail.trendDiff ? `${activeTopicDetail.trendDiff}%` : 'Stable'}</span>
              </div>
            </div>

            {/* Why This Score (Traceable Audit) */}
            <div className="space-y-2">
              <h4 className="font-bold text-neutral-800 text-sm">Evidence Audit: Why this score?</h4>
              {activeTopicDetail.history.length === 0 ? (
                <p className="text-xs text-neutral-500">No recorded practice attempts or graded submissions for this topic yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeTopicDetail.history.map((h, hi) => (
                    <div key={hi} className="p-2.5 rounded-xl border bg-white flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-neutral-800">{h.source}</span>
                        <p className="text-[10px] text-neutral-400">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                      <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {h.score}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Common Mistakes for this topic */}
            {activeTopicDetail.commonMistakes.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-neutral-800 text-sm">Mistakes Detected in this Topic:</h4>
                <div className="space-y-1">
                  {activeTopicDetail.commonMistakes.map((m, mi) => (
                    <div key={mi} className="text-xs text-neutral-700 bg-red-50/50 p-2 rounded-lg flex justify-between">
                      <span>• {m.mistake}</span>
                      <span className="font-bold text-red-600">{m.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const t = activeTopicDetail;
                    setActiveTopicDetail(null);
                    onOpenPractice?.(t.moduleId, t.id);
                  }}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all text-center flex items-center justify-center gap-2"
                >
                  <PenTool className="w-3.5 h-3.5" /> Start Practice Session
                </button>
                <button
                  onClick={() => {
                    const t = activeTopicDetail;
                    setActiveTopicDetail(null);
                    onOpenTopicInTutor?.(t.name, t.moduleName);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-sm transition-all text-center flex items-center justify-center gap-2"
                >
                  <Brain className="w-3.5 h-3.5" /> Ask SOMA AI →
                </button>
              </div>
              <button
                onClick={() => {
                  setActiveTopicDetail(null);
                  onNavigateTab?.('Library');
                }}
                className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-semibold text-xs transition-all"
              >
                View in Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assessment Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!assessmentToDelete}
        title="Delete Assessment"
        itemName={assessmentToDelete ? `${assessmentToDelete.title}${assessmentToDelete.moduleName ? ` (${assessmentToDelete.moduleName})` : ''}` : ''}
        itemType="Assessment"
        impactDetails={[
          "Removes this assessment from Progress & Assessment Readiness",
          "Removes the corresponding deadline from your Home dashboard",
          "Clears the entry from your Academic Timeline day folder",
          "Removes the associated Google Calendar event",
          "Automatically rebalances your AI daily study schedule"
        ]}
        confirmButtonText="Delete Assessment"
        onClose={() => setAssessmentToDelete(null)}
        onConfirm={handleConfirmDeleteAssessment}
      />
    </div>
  );
};
