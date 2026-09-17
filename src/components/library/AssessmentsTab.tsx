import React, { useState } from 'react';
import { LibraryModule, AcademicAssessment } from '../../types';
import { createAssessment } from '../../lib/assessmentFirestore';
import { auth, db } from '../../lib/firebase';
import { getCATDateComponents, normalizeToCATDateString } from '../../lib/catTime';
import { collection, addDoc } from 'firebase/firestore';
import { useSOMA } from '../../lib/realtime';
import { Paperclip, File, X } from 'lucide-react';

export function AssessmentsTab({ module, assessments, viewType, onRefresh }: { module: LibraryModule; assessments: AcademicAssessment[]; viewType: 'assignments' | 'cats'; onRefresh: () => void }) {
  const { days } = useSOMA();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'assignment' | 'quiz' | 'cat' | 'exam'>(viewType === 'assignments' ? 'assignment' : 'quiz');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getCATDateComponents().dateString);
  const [saving, setSaving] = useState(false);

  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const userId = auth.currentUser?.uid || 'current_user';
    await createAssessment(userId, {
      semesterId: module.semesterId,
      moduleId: module.id,
      type,
      title: title.trim(),
      dueDate,
      fileName,
      fileData: fileData || undefined,
    });

    if (viewType === 'assignments') {
      const targetDay = days.find(d => normalizeToCATDateString(d.date) === dueDate);
      if (targetDay) {
        try {
          await addDoc(collection(db, 'activities'), {
            dayId: targetDay.id,
            userId,
            semesterId: module.semesterId,
            type: 'assignment',
            taskType: 'Assignment',
            title: `Due: ${title.trim()}`,
            moduleName: module.name,
            moduleId: module.id,
            status: 'PENDING',
            durationMinutes: 60
          });
        } catch (err) {
          console.error(err);
        }
      }
    }

    setTitle('');
    setFileData(null);
    setFileName(null);
    setSaving(false);
    setShowModal(false);
    onRefresh();
  };

  const titleText = viewType === 'assignments' ? 'Assignments' : 'CATs & Quizzes';
  const subtitleText = viewType === 'assignments' ? `Track deadlines for assignments connected to ${module.name}.` : `Upload past papers, CATs, and Quizzes for AI structural analysis.`;
  const emptyText = viewType === 'assignments' ? 'No assignments scheduled' : 'No CATs or Quizzes uploaded';
  const emptySubText = viewType === 'assignments' ? 'Add assignments to stay ahead.' : 'Upload quizzes or CATs so SOMA can learn your teacher\'s testing structure.';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-neutral-900">{titleText}</h3>
          <p className="text-sm text-neutral-500">{subtitleText}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm"
        >
          + Add {viewType === 'assignments' ? 'Assignment' : 'CAT or Quiz'}
        </button>
      </div>

      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border text-center space-y-4">
            <h4 className="text-lg font-bold">{emptyText}</h4>
            <p className="text-sm text-neutral-500">{emptySubText}</p>
          </div>
        ) : (
          assessments.map(a => (
            <div key={a.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full ${
                    a.type === 'cat' ? 'bg-red-50 text-red-600' :
                    a.type === 'quiz' ? 'bg-purple-50 text-purple-600' :
                    a.type === 'assignment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {a.type}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">Due: {a.dueDate}</span>
                </div>
                <h4 className="font-bold text-lg text-neutral-900 mt-1">{a.title}</h4>{a.fileName && (<div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100 mt-2 w-max"><File className="w-3.5 h-3.5 text-blue-500 shrink-0" /><span className="text-xs text-blue-700 font-medium truncate">{a.fileName}</span></div>)}
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 text-neutral-700">
                {a.status}
              </span>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
            <h3 className="text-xl font-bold">Add {viewType === 'assignments' ? 'Assignment' : 'CAT or Quiz'}</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value as any)} className="w-full p-3 border rounded-xl text-sm bg-white">
                  {viewType === 'assignments' ? (
                    <option value="assignment">Assignment</option>
                  ) : (
                    <>
                      <option value="quiz">Quiz</option>
                      <option value="cat">CAT (Continuous Assessment Test)</option>
                      <option value="exam">Exam</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Title</label>
                <input type="text" required placeholder={viewType === 'assignments' ? "e.g. Assignment 2: Normalization" : "e.g. Mid-term CAT 1"} value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">{viewType === 'assignments' ? 'Due Date' : 'Test Date / Upload Date'}</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 border rounded-xl text-sm" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold mb-1">Attach Assessment Document (Optional)</label>
                {fileName ? (
                  <div className="flex items-center justify-between p-3 border rounded-xl bg-blue-50/50 border-blue-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-medium text-blue-900 truncate">{fileName}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setFileName(null); setFileData(null); }}
                      className="text-blue-400 hover:text-blue-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full p-4 border-2 border-dashed rounded-xl text-sm flex flex-col items-center justify-center gap-2 text-neutral-500 hover:bg-neutral-50 hover:border-blue-300 transition-colors">
                      <Paperclip className="w-5 h-5" />
                      <span className="font-medium">Click to upload document</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="w-1/3 bg-neutral-100 py-3 rounded-xl text-sm font-medium">Cancel</button>
                <button type="submit" disabled={saving} className="w-2/3 bg-blue-600 text-white py-3 rounded-xl text-sm font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
