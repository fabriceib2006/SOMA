import React, { useState, useEffect } from 'react';
import { LibraryModule, Semester, LectureMaterial, LibraryTopic, AcademicAssessment } from '../../types';
import { getModuleLectures, getModuleTopics, getModuleAssessments } from '../../lib/libraryFirestore';
import { ModuleOverviewTab } from './ModuleOverviewTab';
import { LecturesTab } from './LecturesTab';
import { TopicsTab } from './TopicsTab';
import { AssessmentsTab } from './AssessmentsTab';

export function ModuleFolderView({ module, semester, onBack }: { module: LibraryModule; semester: Semester; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'lectures' | 'topics' | 'assignments' | 'cats'>('overview');
  const [lectures, setLectures] = useState<LectureMaterial[]>([]);
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [assessments, setAssessments] = useState<AcademicAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModuleData();
  }, [module.id]);

  const loadModuleData = async () => {
    setLoading(true);
    const lecList = await getModuleLectures(module.id);
    const topList = await getModuleTopics(module.id);
    const asmList = await getModuleAssessments(module.id);
    setLectures(lecList);
    setTopics(topList);
    setAssessments(asmList);
    setLoading(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-neutral-500 font-medium">Loading Module Folder Workspace...</div>;
  }

  const assignmentList = assessments.filter(a => a.type === 'assignment');
  const catQuizList = assessments.filter(a => ['quiz', 'cat', 'exam'].includes(a.type));

  return (
    <div className="space-y-6 pb-16">
      {/* Back button & Module Header */}
      <div className="space-y-4">
        <button onClick={onBack} className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1">
          ← Back to Library ({semester.name})
        </button>

        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📁</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                  {module.code}
                </span>
                <span className="text-xs text-neutral-400 font-medium">Lecturer: {module.lecturer} • {module.credits} Credits</span>
              </div>
              <h1 className="text-2xl font-bold mt-1 text-neutral-900">{module.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="bg-neutral-100 text-neutral-700 text-xs px-3 py-1.5 rounded-xl font-medium">
              {semester.name}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'lectures', label: `Lectures (${lectures.length})` },
          { id: 'topics', label: `Topics (${topics.length})` },
          { id: 'assignments', label: `Assignments (${assignmentList.length})` },
          { id: 'cats', label: `CATs & Quizzes (${catQuizList.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && <ModuleOverviewTab module={module} lectures={lectures} topics={topics} assessments={assessments} />}
        {activeTab === 'lectures' && <LecturesTab module={module} lectures={lectures} onRefresh={loadModuleData} />}
        {activeTab === 'topics' && <TopicsTab module={module} topics={topics} onRefresh={loadModuleData} />}
        {activeTab === 'assignments' && <AssessmentsTab module={module} assessments={assignmentList} viewType="assignments" onRefresh={loadModuleData} />}
        {activeTab === 'cats' && <AssessmentsTab module={module} assessments={catQuizList} viewType="cats" onRefresh={loadModuleData} />}
      </div>
    </div>
  );
}
