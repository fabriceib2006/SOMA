import React, { useState, useEffect } from 'react';
import { LibraryModule, Semester, LectureMaterial, LibraryTopic, AcademicAssessment } from '../../types';
import { getModuleLectures, getModuleTopics, getModuleAssessments } from '../../lib/libraryFirestore';
import { ModuleOverviewTab } from './ModuleOverviewTab';
import { LecturesTab } from './LecturesTab';
import { TopicsTab } from './TopicsTab';
import { AssessmentsTab } from './AssessmentsTab';
import { EditModuleCreditsModal } from './EditModuleCreditsModal';
import { Award, Edit3 } from 'lucide-react';

export function ModuleFolderView({ 
  module: initialModule, 
  semester, 
  onBack 
}: { 
  module: LibraryModule; 
  semester: Semester; 
  onBack: () => void 
}) {
  const [currentModule, setCurrentModule] = useState<LibraryModule>(initialModule);
  const [activeTab, setActiveTab] = useState<'overview' | 'lectures' | 'topics' | 'assignments' | 'cats'>('overview');
  const [lectures, setLectures] = useState<LectureMaterial[]>([]);
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [assessments, setAssessments] = useState<AcademicAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    setCurrentModule(initialModule);
  }, [initialModule]);

  useEffect(() => {
    loadModuleData();
  }, [currentModule.id]);

  const loadModuleData = async () => {
    setLoading(true);
    const lecList = await getModuleLectures(currentModule.id);
    const topList = await getModuleTopics(currentModule.id);
    const asmList = await getModuleAssessments(currentModule.id);
    setLectures(lecList);
    setTopics(topList);
    setAssessments(asmList);
    setLoading(false);
  };

  const handleModuleUpdated = (updates: Partial<LibraryModule>) => {
    setCurrentModule(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <div className="p-12 text-center text-neutral-500 font-medium animate-pulse">Loading Module Folder Workspace...</div>;
  }

  const assignmentList = assessments.filter(a => a.type === 'assignment');
  const catQuizList = assessments.filter(a => ['quiz', 'cat', 'exam'].includes(a.type));

  return (
    <div className="space-y-6 pb-16">
      {/* Back button & Module Header */}
      <div className="space-y-3 sm:space-y-4">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm hover:underline flex items-center gap-1.5 transition-colors">
          <span>←</span>
          <span>Back to Library ({semester.name})</span>
        </button>

        <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 text-2xl border border-blue-100/80">
              📁
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {currentModule.code || 'MOD'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  {currentModule.credits || 3} Credits
                </span>
                <span className="text-xs text-neutral-500 font-medium truncate">
                  Lecturer: {currentModule.lecturer || 'TBD'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold mt-1 text-neutral-900 truncate">{currentModule.name}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setShowEditModal(true)}
              className="bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs px-3.5 py-2 rounded-xl font-semibold border border-neutral-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Edit module credits and course information"
            >
              <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
              <span>Edit Credits & Info</span>
            </button>
            <span className="bg-neutral-100/90 text-neutral-700 text-xs px-3 py-2 rounded-xl font-medium border border-neutral-200/60">
              {semester.name}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 border-b border-neutral-200/80 no-scrollbar">
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
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'bg-white border border-neutral-200/80 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <ModuleOverviewTab 
            module={currentModule} 
            lectures={lectures} 
            topics={topics} 
            assessments={assessments} 
            onEditCredits={() => setShowEditModal(true)}
          />
        )}
        {activeTab === 'lectures' && <LecturesTab module={currentModule} lectures={lectures} onRefresh={loadModuleData} />}
        {activeTab === 'topics' && <TopicsTab module={currentModule} topics={topics} onRefresh={loadModuleData} />}
        {activeTab === 'assignments' && <AssessmentsTab module={currentModule} assessments={assignmentList} viewType="assignments" onRefresh={loadModuleData} />}
        {activeTab === 'cats' && <AssessmentsTab module={currentModule} assessments={catQuizList} viewType="cats" onRefresh={loadModuleData} />}
      </div>

      {/* Edit Module & Credits Modal */}
      <EditModuleCreditsModal
        module={currentModule}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSaved={handleModuleUpdated}
      />
    </div>
  );
}
