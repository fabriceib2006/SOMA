import React from 'react';
import { LibraryModule, LectureMaterial, LibraryTopic, AcademicAssessment } from '../../types';

export function ModuleOverviewTab({ module, lectures, topics, assessments }: { 
  module: LibraryModule; 
  lectures: LectureMaterial[]; 
  topics: LibraryTopic[]; 
  assessments: AcademicAssessment[] 
}) {
  const avgMastery = topics.length > 0 ? Math.round(topics.reduce((acc, t) => acc + (t.masteryScore || 65), 0) / topics.length) : 70;
  const weakTopics = topics.filter(t => t.masteryScore < 60);
  const strongTopics = topics.filter(t => t.masteryScore >= 80);

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Lectures Uploaded</span>
          <p className="text-3xl font-bold text-neutral-900 mt-1">{lectures.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">AI Topics Discovered</span>
          <p className="text-3xl font-bold text-blue-600 mt-1">{topics.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Module Mastery</span>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{avgMastery}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Assessments</span>
          <p className="text-3xl font-bold text-purple-600 mt-1">{assessments.length}</p>
        </div>
      </div>

      {/* AI Recommendation & Insights */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500/30 text-blue-200 text-xs px-3 py-1 rounded-full font-semibold">🤖 SOMA AI Intelligence</span>
          <span className="text-xs text-blue-300">Based on recent module uploads</span>
        </div>
        <h3 className="text-xl font-bold">Study Recommendation</h3>
        <p className="text-sm text-blue-100 leading-relaxed">
          {lectures.length === 0 
            ? "No lectures uploaded yet. Upload your first lecture or notes to enable AI intelligence and personalized study plans for this module."
            : `You have processed ${lectures.length} lectures with ${topics.length} core concepts. Your current mastery is robust in foundational areas, but requires review in advanced topics.`}
        </p>
      </div>

      {/* Weak & Strong Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-3">
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

        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-3">
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
