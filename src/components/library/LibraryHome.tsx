import React, { useState, useMemo } from 'react';
import { Semester, LibraryModule } from '../../types';
import { createLibraryModule, deleteLibraryModule } from '../../lib/libraryFirestore';
import { ModuleFolderView } from './ModuleFolderView';
import { EditModuleCreditsModal } from './EditModuleCreditsModal';
import { useSOMA } from '../../lib/realtime';
import { Award, Edit3 } from 'lucide-react';

export function LibraryHome() {
  const {
    semesters,
    activeSemester: selectedSemester,
    modules,
    topicMastery: topics,
    assessments,
    loading
  } = useSOMA();

  const [selectedModule, setSelectedModule] = useState<LibraryModule | null>(null);
  const [editingModule, setEditingModule] = useState<LibraryModule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Module stats map derived locally from live data
  const moduleStats = useMemo(() => {
    const statsMap: Record<string, { topics: number; assessments: number; mastery: number }> = {};
    for (const m of modules) {
      const mTopics = topics.filter(t => t.moduleId === m.id);
      const mAssessments = assessments.filter(a => a.moduleId === m.id);
      
      const avgMastery = mTopics.length > 0 
        ? Math.round(mTopics.reduce((acc, t) => acc + (t.masteryScore || 0), 0) / mTopics.length) 
        : 0;
        
      statsMap[m.id] = {
        topics: mTopics.length,
        assessments: mAssessments.length,
        mastery: avgMastery
      };
    }
    return statsMap;
  }, [modules, topics, assessments]);

  // New module form
  const [newMod, setNewMod] = useState({
    name: '',
    code: '',
    lecturer: '',
    credits: 3,
    description: '',
    color: 'blue'
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSemesterChange = (sem: Semester) => {
    // handled by useSOMA context, but we can reset selection
    setSelectedModule(null);
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMod.name.trim() || !selectedSemester) return;

    setSaving(true);
    setSaveStatus('Creating module...');

    try {
      await createLibraryModule({
        userId: 'current_user',
        academicYearId: selectedSemester.academicYearId,
        semesterId: selectedSemester.id,
        name: newMod.name.trim(),
        code: newMod.code.trim() || 'MOD',
        lecturer: newMod.lecturer.trim() || 'TBD',
        credits: Number(newMod.credits) || 3,
        description: newMod.description.trim(),
        color: newMod.color
      });

      setSaveStatus('✓ Module saved successfully');
      setNewMod({ name: '', code: '', lecturer: '', credits: 3, description: '', color: 'blue' });
      setTimeout(() => {
        setShowCreateModal(false);
        setSaveStatus(null);
      }, 800);
    } catch (err) {
      setSaveStatus('⚠ Module could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (selectedModule) {
    return (
      <ModuleFolderView 
        module={selectedModule} 
        semester={selectedSemester!} 
        onBack={() => { setSelectedModule(null); /* loadModulesForSemester removed */ }} 
      />
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-neutral-500 font-medium">Loading Academic Library & Knowledge Workspace...</div>;
  }

  if (!selectedSemester) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border shadow-sm space-y-4 max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold">No Semester Found</h2>
        <p className="text-sm text-neutral-500">Set up a semester first to access your academic library.</p>
      </div>
    );
  }

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.lecturer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLectures = Object.values(moduleStats).reduce((a: number, b: any) => a + (b.lectures || 0), 0);
  const totalTopics = Object.values(moduleStats).reduce((a: number, b: any) => a + (b.topics || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Semester Switcher & Header */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Academic Knowledge Center</span>
            <span className="text-xs text-neutral-400 font-medium">{selectedSemester.numberOfWeeks} Weeks Total</span>
          </div>
          <h1 className="text-2xl font-bold mt-2 text-neutral-900">My Library</h1>
          <p className="text-sm text-neutral-500">Current Semester: <span className="font-semibold text-neutral-800">{selectedSemester.name}</span></p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedSemester.id}
            onChange={e => {
              const found = semesters.find(s => s.id === e.target.value);
              if (found) handleSemesterChange(found);
            }}
            className="p-2.5 border rounded-xl text-sm bg-neutral-50 font-medium w-full md:w-auto"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.academicYearId ? 'Active' : ''})</option>
            ))}
          </select>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm whitespace-nowrap"
          >
            + Create Module
          </button>
        </div>
      </div>

      {/* Library Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Modules</span>
          <p className="text-3xl font-bold text-neutral-900 mt-1">{modules.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Total Lectures</span>
          <p className="text-3xl font-bold text-blue-600 mt-1">{totalLectures}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">AI Topics</span>
          <p className="text-3xl font-bold text-purple-600 mt-1">{totalTopics}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Semester Status</span>
          <p className="text-lg font-bold text-emerald-600 mt-2">Active Memory</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4">
        <input 
          type="text"
          placeholder="Search modules, course codes, or lecturers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-3.5 bg-white border rounded-2xl shadow-sm text-sm"
        />
      </div>

      {/* Modules Grid / Folder Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-neutral-900">Semester Modules ({filteredModules.length})</h2>

        {filteredModules.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border text-center space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">📁</div>
            <h3 className="text-lg font-bold">Your {selectedSemester.name} library is empty</h3>
            <p className="text-sm text-neutral-500 max-w-md mx-auto">Create your modules to begin organizing your lectures, assignments, and study materials in SOMA.</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-all inline-block"
            >
              + Create Module
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map(m => {
              const stats = moduleStats[m.id] || { lectures: 0, topics: 0, assessments: 0, mastery: 68 };
              return (
                <div 
                  key={m.id}
                  onClick={() => setSelectedModule(m)}
                  className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                        {m.code || 'MOD'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-600" />
                          {m.credits || 3} Credits
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(m);
                          }}
                          className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                          title="Edit credits and module details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📁</span>
                      <h3 className="font-bold text-lg text-neutral-900 group-hover:text-blue-600 transition-colors">{m.name}</h3>
                    </div>

                    <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{m.description || `Lecturer: ${m.lecturer}`}</p>

                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-medium text-neutral-600 bg-neutral-50 p-3 rounded-xl">
                      <div>📚 {stats.topics} topics</div>
                      <div>🧠 {stats.topics} topics</div>
                      <div>📝 {stats.assessments} assessments</div>
                      <div>⭐ {stats.mastery}% mastery</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-between items-center text-xs font-semibold text-blue-600">
                    <span>Open Module Folder</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Module Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Module Creation</span>
                <h3 className="text-xl font-bold mt-1">Create New Module ({selectedSemester.name})</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-neutral-700 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Module Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Database Systems"
                  value={newMod.name}
                  onChange={e => setNewMod({ ...newMod, name: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Module Code</label>
                  <input 
                    type="text"
                    placeholder="e.g. CS304"
                    value={newMod.code}
                    onChange={e => setNewMod({ ...newMod, code: e.target.value })}
                    className="w-full p-3 border rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Credits</label>
                  <input 
                    type="number"
                    value={newMod.credits}
                    onChange={e => setNewMod({ ...newMod, credits: parseInt(e.target.value) || 3 })}
                    className="w-full p-3 border rounded-xl text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Lecturer</label>
                <input 
                  type="text"
                  placeholder="e.g. Dr. Alan Turing"
                  value={newMod.lecturer}
                  onChange={e => setNewMod({ ...newMod, lecturer: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <textarea 
                  rows={3}
                  placeholder="Brief course overview..."
                  value={newMod.description}
                  onChange={e => setNewMod({ ...newMod, description: e.target.value })}
                  className="w-full p-3 border rounded-xl text-sm bg-white"
                />
              </div>

              {saveStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium ${saveStatus.includes('✓') ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  {saveStatus}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/3 bg-neutral-100 text-neutral-700 py-3 rounded-xl font-medium text-sm hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-2/3 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving to Firestore...' : 'Save Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Module Credits Modal */}
      <EditModuleCreditsModal
        module={editingModule}
        isOpen={!!editingModule}
        onClose={() => setEditingModule(null)}
        onSaved={() => setEditingModule(null)}
      />
    </div>
  );
}
