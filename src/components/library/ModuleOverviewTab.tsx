import React from 'react';
import { LibraryModule, LectureMaterial, LibraryTopic, AcademicAssessment } from '../../types';
import { Award, BookOpen, Clock, Edit3, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

export function ModuleOverviewTab({ 
  module, 
  lectures, 
  topics, 
  assessments,
  onEditCredits 
}: { 
  module: LibraryModule; 
  lectures: LectureMaterial[]; 
  topics: LibraryTopic[]; 
  assessments: AcademicAssessment[];
  onEditCredits?: () => void;
}) {
  const avgMastery = topics.length > 0 ? Math.round(topics.reduce((acc, t) => acc + (t.masteryScore || 65), 0) / topics.length) : 70;
  const weakTopics = topics.filter(t => t.masteryScore < 60);
  const strongTopics = topics.filter(t => t.masteryScore >= 80);
  const credits = module.credits || 3;

  const getCreditAnalysis = (c: number) => {
    if (c >= 6) {
      return {
        level: 'Heavyweight Course (6+ Credits)',
        badge: 'Priority Study Weight',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        desc: 'This high-credit course requires frequent active recall and deep problem drills. SOMA AI considers this an essential focus during weekly plan generation.'
      };
    } else if (c >= 4) {
      return {
        level: 'Core Academic Module (4–5 Credits)',
        badge: 'Standard Core Load',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        desc: 'Core academic workload. SOMA balances revision intervals evenly with scheduled lecture slots and assessment milestones.'
      };
    } else {
      return {
        level: 'Modular / Elective Load (1–3 Credits)',
        badge: 'Focused Weight',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        desc: 'Light-to-moderate credit weight. Targeted study sessions scheduled prior to assignments and tests.'
      };
    }
  };

  const creditProfile = getCreditAnalysis(credits);

  return (
    <div className="space-y-6">
      {/* Header Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Academic Credits</span>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900">{credits}</p>
            <span className="text-xs text-neutral-500 font-medium">Credits</span>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Lectures Uploaded</span>
          <p className="text-2xl sm:text-3xl font-bold text-neutral-900 mt-1">{lectures.length}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">AI Concepts</span>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{topics.length}</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-xs">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Module Mastery</span>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">{avgMastery}%</p>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border shadow-xs col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Assessments</span>
          <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">{assessments.length}</p>
        </div>
      </div>

      {/* Academic Credit & Workload Card */}
      <div className="bg-white p-6 rounded-3xl border shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm border border-amber-200">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-neutral-900 text-base">{creditProfile.level}</h4>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${creditProfile.badgeColor}`}>
                  {creditProfile.badge}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed pl-10">
            {creditProfile.desc}
          </p>
        </div>

        {onEditCredits && (
          <button
            onClick={onEditCredits}
            className="shrink-0 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Module Credits</span>
          </button>
        )}
      </div>

      {/* AI Recommendation & Insights */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500/30 text-blue-200 text-xs px-3 py-1 rounded-full font-semibold">🤖 SOMA AI Intelligence</span>
          <span className="text-xs text-blue-300">Calibrated for {credits} credits & Central Africa Time</span>
        </div>
        <h3 className="text-xl font-bold">Study Recommendation</h3>
        <p className="text-sm text-blue-100 leading-relaxed">
          {lectures.length === 0 
            ? "No lectures uploaded yet. Upload your first lecture documents or notes to enable SOMA AI concept discovery, mastery tracking, and smart revision planning for this module."
            : `You have processed ${lectures.length} lecture documents with ${topics.length} core concepts. Based on this module's ${credits} credit weighting, prioritize weak foundational concepts in your daily study slots before 23:00 CAT.`}
        </p>
      </div>

      {/* Weak & Strong Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-3">
          <h4 className="font-bold text-neutral-900 flex items-center gap-2">
            <span>⚠️</span> Areas Needing Attention
          </h4>
          {weakTopics.length === 0 ? (
            <p className="text-sm text-neutral-500 py-4">No weak areas identified yet. Complete practice sessions to discover focus areas.</p>
          ) : (
            <div className="space-y-2">
              {weakTopics.map(t => (
                <div key={t.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-semibold text-red-900">{t.name}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{t.masteryScore}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border shadow-xs space-y-3">
          <h4 className="font-bold text-neutral-900 flex items-center gap-2">
            <span>⭐</span> Strong Concepts
          </h4>
          {strongTopics.length === 0 ? (
            <p className="text-sm text-neutral-500 py-4">Complete quizzes and practice sessions to build your mastery profile.</p>
          ) : (
            <div className="space-y-2">
              {strongTopics.map(t => (
                <div key={t.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-semibold text-emerald-900">{t.name}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">{t.masteryScore}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
