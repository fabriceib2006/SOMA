import React, { useState } from 'react';
import { LibraryModule, AcademicAssessment } from '../../types';
import { createAssessment } from '../../lib/assessmentFirestore';
import { auth, db } from '../../lib/firebase';
import { getCATDateComponents, normalizeToCATDateString } from '../../lib/catTime';
import { collection, addDoc } from 'firebase/firestore';
import { useSOMA } from '../../lib/realtime';
import { cleanUndefined } from '../../lib/firestoreUtils';
import { File, X, Sparkles, UploadCloud, Loader2, Award, Calendar, CheckSquare } from 'lucide-react';

export function AssessmentsTab({ module, assessments, viewType, onRefresh }: { module: LibraryModule; assessments: AcademicAssessment[]; viewType: 'assignments' | 'cats'; onRefresh: () => void }) {
  const { days } = useSOMA();
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<'assignment' | 'quiz' | 'cat' | 'exam'>(viewType === 'assignments' ? 'assignment' : 'quiz');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(getCATDateComponents().dateString);
  const [saving, setSaving] = useState(false);

  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
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
          await addDoc(collection(db, 'activities'), cleanUndefined({
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
          }));
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
  const emptySubText = viewType === 'assignments' ? 'Add assignments to stay ahead of upcoming deadlines.' : 'Upload quizzes or CATs so SOMA can learn your teacher\'s testing structure.';

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-neutral-200/80 shadow-xs">
        <div>
          <h3 className="text-base sm:text-xl font-bold text-neutral-900">{titleText}</h3>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">{subtitleText}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
        >
          {viewType === 'assignments' ? (
            <CheckSquare className="w-4 h-4 text-blue-200" />
          ) : (
            <Award className="w-4 h-4 text-blue-200" />
          )}
          <span>+ Add {viewType === 'assignments' ? 'Assignment' : 'CAT / Quiz'}</span>
        </button>
      </div>

      {/* Assessment List */}
      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="bg-white p-8 sm:p-12 rounded-2xl sm:rounded-3xl border border-neutral-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center border border-blue-100">
              {viewType === 'assignments' ? <CheckSquare className="w-6 h-6" /> : <Award className="w-6 h-6" />}
            </div>
            <h4 className="text-base sm:text-lg font-bold text-neutral-900">{emptyText}</h4>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">{emptySubText}</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm hover:bg-blue-700 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>+ Add {viewType === 'assignments' ? 'Assignment' : 'CAT / Quiz'}</span>
            </button>
          </div>
        ) : (
          assessments.map((a, index) => (
            <div key={a.id || `asm_${index}`} className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-200 transition-all">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border ${
                    a.type === 'cat' ? 'bg-red-50 text-red-700 border-red-200' :
                    a.type === 'quiz' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    a.type === 'assignment' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {a.type}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    Due: {a.dueDate}
                  </span>
                </div>
                <h4 className="font-bold text-base sm:text-lg text-neutral-900 break-words">{a.title}</h4>
                {a.fileName && (
                  <div className="flex items-center gap-2 p-1.5 px-2.5 bg-blue-50/60 rounded-lg border border-blue-100 w-fit max-w-full">
                    <File className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-xs text-blue-900 font-medium truncate">{a.fileName}</span>
                  </div>
                )}
              </div>
              <div className="self-start sm:self-center shrink-0 pt-1 sm:pt-0">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {a.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Upload - Fully Responsive Bottom-Sheet on Mobile, Centered Modal on Tablet/Desktop */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowModal(false);
          }}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-100 flex flex-col max-h-[94vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  {viewType === 'assignments' ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Award className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider truncate">
                    {viewType === 'assignments' ? 'Academic Task' : 'Evaluation'}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 mt-0.5 truncate">
                    Add {viewType === 'assignments' ? 'Assignment' : 'CAT or Quiz'}
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                className="w-10 h-10 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-40 flex items-center justify-center shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 py-4 sm:px-7 sm:py-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                {/* Type & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">Assessment Type</label>
                    <select 
                      value={type} 
                      onChange={e => setType(e.target.value as any)} 
                      className="w-full px-3.5 py-2.5 sm:py-2 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-sm text-neutral-900 font-medium focus:ring-3 focus:ring-blue-500/10 transition-all outline-hidden cursor-pointer"
                    >
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
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {viewType === 'assignments' ? 'Due Date' : 'Test / Upload Date'}
                    </label>
                    <input 
                      type="date" 
                      value={dueDate} 
                      onChange={e => setDueDate(e.target.value)} 
                      className="w-full px-3.5 py-2.5 sm:py-2 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-3 focus:ring-blue-500/10 transition-all outline-hidden"
                    />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder={viewType === 'assignments' ? "e.g. Assignment 2: Normalization & BCNF" : "e.g. Mid-term CAT 1"} 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full px-3.5 py-2.5 sm:py-2 bg-neutral-50/70 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-3 focus:ring-blue-500/10 transition-all outline-hidden"
                  />
                </div>
                
                {/* File Upload - Drag & Drop */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-neutral-700">Attach Document</label>
                    <span className="text-[11px] text-neutral-400 font-normal">Optional</span>
                  </div>

                  {fileName ? (
                    <div className="flex items-center justify-between p-3 border border-blue-200 rounded-2xl bg-blue-50/70 shadow-2xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <File className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-sm font-semibold text-blue-950 truncate">{fileName}</p>
                          <p className="text-[10px] text-blue-600 font-medium">Document attached</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setFileName(null); setFileData(null); }}
                        className="text-neutral-400 hover:text-red-500 hover:bg-white p-2 rounded-xl transition-colors shrink-0 ml-2"
                        title="Remove file"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative group rounded-2xl border-2 border-dashed transition-all p-4 sm:p-5 text-center flex flex-col items-center justify-center gap-2 ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50/60 scale-[1.01]' 
                          : 'border-neutral-200 hover:border-blue-400 bg-neutral-50/40 hover:bg-blue-50/20'
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-10 h-10 rounded-2xl bg-white shadow-2xs border border-neutral-200/80 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-800 text-xs sm:text-sm">
                          <span className="text-blue-600 underline underline-offset-2">Click to browse</span> or drag & drop
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          PDF, Word, or paper photo
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer - Stacked on mobile, row on tablet/desktop */}
              <div className="px-5 py-3.5 sm:px-7 sm:py-4 border-t border-neutral-100 bg-neutral-50/60 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-700 border border-neutral-200 rounded-xl font-medium text-xs sm:text-sm transition-colors disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || !title.trim()} 
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save {viewType === 'assignments' ? 'Assignment' : 'Assessment'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
