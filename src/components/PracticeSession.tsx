import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  Sparkles, 
  Type, 
  PenTool, 
  Send, 
  Save, 
  Brain, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  History,
  MessageSquare,
  RefreshCcw,
  Target,
  Zap,
  TrendingUp,
  Award,
  Plus,
  Image as ImageIcon,
  Trash,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSOMA } from '../lib/realtime';
import { Scratchpad, ScratchpadRef } from './library/Scratchpad';
import { 
  saveSubmission, 
  savePracticeDraft, 
  getPracticeDraft, 
  deletePracticeDraft,
  saveMistakeRecord,
  uploadEvidenceImagesToStorage
} from '../lib/libraryFirestore';
import { addTopicEvidence } from '../lib/performanceFirestore';
import { AcademicActivity, ExerciseSubmission, LibraryExercise } from '../types';
import { normalizeToCATDateString, getCATDateComponents } from '../lib/catTime';

interface PracticeSessionProps {
  moduleId: string;
  topicId: string;
  onClose: () => void;
  onOpenAI?: (target: any) => void;
}

export function PracticeSession({ moduleId, topicId, onClose, onOpenAI }: PracticeSessionProps) {
  const { user, activeSemester, modules, topics, evidence, lastSyncedAt } = useSOMA();
  const [mode, setMode] = useState<'typed' | 'handwritten'>('typed');
  const [exercise, setExercise] = useState<LibraryExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Student Input
  const [typedAnswer, setTypedAnswer] = useState('');
  const [canvasData, setCanvasData] = useState<string | null>(null);
  const [evidencePages, setEvidencePages] = useState<{ id: string; data: string; file?: File }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const scratchpadRef = useRef<ScratchpadRef>(null);

  // Status
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const module = modules.find(m => m.id === moduleId);
  const topic = topics.find(t => t.id === topicId);

  // 1. Fetch Draft or Generate Exercise
  useEffect(() => {
    async function init() {
      if (!moduleId || !topicId) return;
      setLoading(true);
      
      try {
        // Try to restore draft
        const draft = await getPracticeDraft(moduleId, topicId);
        if (draft) {
          setExercise({
            id: draft.exerciseId || 'gen_' + Date.now(),
            userId: user?.uid || '',
            semesterId: activeSemester?.id || '',
            moduleId,
            topicId,
            question: draft.question,
            difficulty: 'Medium'
          });
          setMode(draft.answerType);
          if (draft.answerType === 'typed') setTypedAnswer(draft.typedAnswer || '');
          if (draft.answerType === 'handwritten') setCanvasData(draft.canvasData || null);
          setLoading(false);
          return;
        }

        // Otherwise generate new
        await generateNewExercise();
      } catch (err) {
        console.error(err);
        setError('Failed to load practice session.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [moduleId, topicId]);

  const generateNewExercise = async () => {
    setGenerating(true);
    setEvaluation(null);
    setTypedAnswer('');
    setCanvasData(null);
    scratchpadRef.current?.clear();
    
    try {
      const priorMistakes = evidence
        .filter(e => e.topicId === topicId && e.mistakes)
        .flatMap(e => e.mistakes || []);

      const res = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName: module?.name,
          topicName: topic?.name,
          difficulty: 'Medium',
          priorMistakes: [...new Set(priorMistakes)]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setExercise({
          id: 'gen_' + Date.now(),
          userId: user?.uid || '',
          semesterId: activeSemester?.id || '',
          moduleId,
          topicId,
          question: data.question,
          difficulty: 'Medium',
          correctAnswer: data.sampleAnswer,
          explanation: data.rubric.join('\n')
        });
      }
    } catch (err) {
      setError('AI failed to generate exercise.');
    } finally {
      setGenerating(false);
    }
  };

  // 2. Draft Persistence
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!exercise || submitting || evaluation) return;
      setSaving(true);
      await savePracticeDraft({
        userId: user?.uid || 'guest',
        semesterId: activeSemester?.id || '',
        moduleId,
        topicId,
        exerciseId: exercise.id,
        question: exercise.question,
        answerType: mode,
        typedAnswer: mode === 'typed' ? typedAnswer : undefined,
        canvasData: mode === 'handwritten' ? canvasData || undefined : undefined
      });
      setSaving(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [typedAnswer, canvasData, mode, exercise]);

  const handleAddPage = (file?: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setEvidencePages([...evidencePages, { id: 'page_' + Date.now(), data, file }]);
        setCurrentPageIndex(evidencePages.length);
      };
      reader.readAsDataURL(file);
    } else {
      // Current canvas page
      const data = scratchpadRef.current?.getDataUrl();
      if (data) {
        setEvidencePages([...evidencePages, { id: 'page_' + Date.now(), data }]);
        scratchpadRef.current?.clear();
        setCurrentPageIndex(evidencePages.length);
      }
    }
  };

  const removePage = (index: number) => {
    const newPages = evidencePages.filter((_, i) => i !== index);
    setEvidencePages(newPages);
    if (currentPageIndex >= newPages.length) {
      setCurrentPageIndex(Math.max(0, newPages.length - 1));
    }
  };

  // 3. Submission & AI Evaluation
  const handleSubmit = async () => {
    const isHandwritten = mode === 'handwritten';
    const studentAnswer = mode === 'typed' ? typedAnswer : (evidencePages.length > 0 ? evidencePages[0].data : canvasData);
    
    if (!studentAnswer && evidencePages.length === 0 && !exercise) return;

    setSubmitting(true);
    setError(null);

    try {
      let finalEvidenceUrls: string[] | undefined;
      let aiImages: string[] = [];

      if (isHandwritten) {
        setPipelineStatus('Uploading evidence to SOMA Storage...');
        // Gather all pages
        const allPages = [...evidencePages];
        // If there's something currently on the scratchpad, add it as the last page
        const lastCanvas = scratchpadRef.current?.getDataUrl();
        if (lastCanvas && !evidencePages.some(p => p.data === lastCanvas)) {
          allPages.push({ id: 'final_' + Date.now(), data: lastCanvas });
        }

        if (allPages.length > 0) {
          // Convert dataURLs to Files for storage upload
          const filesToUpload = await Promise.all(allPages.map(async (p, i) => {
            if (p.file) return p.file;
            const res = await fetch(p.data);
            const blob = await res.blob();
            return new File([blob], `page_${i + 1}.jpg`, { type: 'image/jpeg' });
          }));

          const { urls } = await uploadEvidenceImagesToStorage(
            filesToUpload,
            user?.uid || 'guest',
            activeSemester?.id || '',
            moduleId,
            (idx, prog) => setPipelineStatus(`Uploading page ${idx + 1}: ${Math.round(prog)}%`)
          );
          finalEvidenceUrls = urls;
          aiImages = allPages.map(p => p.data);
        }
      }

      setPipelineStatus('SOMA AI is evaluating your work...');
      const res = await fetch('/api/evaluate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: exercise?.question,
          studentAnswer: isHandwritten ? undefined : typedAnswer,
          images: isHandwritten ? aiImages : undefined,
          answerType: mode,
          moduleName: module?.name,
          topicName: topic?.name
        })
      });

      if (res.ok) {
        const result = await res.json();
        setEvaluation(result);

        // A. Save Durable Submission
        const submission = await saveSubmission({
          userId: user?.uid || 'guest',
          semesterId: activeSemester?.id || '',
          moduleId,
          moduleName: module?.name,
          topicId,
          topicName: topic?.name,
          question: exercise?.question || '',
          answerType: mode,
          studentAnswer: isHandwritten ? '[Handwritten Evidence in Storage]' : typedAnswer,
          evidenceUrls: finalEvidenceUrls,
          pageCount: finalEvidenceUrls?.length,
          score: result.score,
          feedback: result.feedback,
          mistakes: result.mistakes,
          conceptGaps: result.conceptGaps,
          strengths: result.strengths,
          dayId: `day_${normalizeToCATDateString(new Date())}`
        });

        // B. Add Academic Evidence (Updates Mastery via Realtime)
        await addTopicEvidence({
          userId: user?.uid || 'guest',
          semesterId: activeSemester?.id || '',
          moduleId,
          moduleName: module?.name || 'General',
          topicId,
          topicName: topic?.name || 'Topic',
          sourceType: 'exercise',
          sourceTitle: exercise.question.substring(0, 50) + '...',
          score: result.score,
          normalizedScore: result.score * 10,
          mistakes: result.mistakes,
          date: new Date().toISOString(),
          dayId: `day_${normalizeToCATDateString(new Date())}`
        });

        // C. Record Mistakes for Pattern Recognition
        if (result.mistakes && result.mistakes.length > 0) {
          for (const m of result.mistakes) {
            await saveMistakeRecord({
              userId: user?.uid || 'guest',
              semesterId: activeSemester?.id || '',
              moduleId,
              topicId,
              attemptId: submission.id,
              concept: result.conceptGaps[0] || topic?.name || 'General',
              mistakeType: result.isConceptualMistake ? 'Conceptual' : 'Calculation',
              description: m,
              severity: result.score < 5 ? 'High' : 'Medium'
            });
          }
        }

        // D. Clear Draft
        await deletePracticeDraft(moduleId, topicId);
      } else {
        throw new Error('Evaluation failed');
      }
    } catch (err) {
      setError('Evaluation error. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskTutor = () => {
    if (!evaluation || !onOpenAI) return;
    
    onOpenAI({
      topic: topic?.name || 'Topic',
      module: module?.name || 'Module',
      prompt: `I just completed a practice exercise on "${topic?.name}". 
      Question: "${exercise?.question}"
      My Score: ${evaluation.score}/10
      My Mistake: "${evaluation.mistakes[0] || 'Unclear'}"
      Concept Gap identified: "${evaluation.conceptGaps[0] || 'Unknown'}"
      
      Can you explain where I went wrong and help me understand the concept better?`,
      objective: 'Practice Review & Remediation',
      reason: 'Low score in recent practice session',
      sessionId: 'practice_' + Date.now()
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-neutral-500">Initializing SOMA Practice Environment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                Practice Mode
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                {module?.code} • {module?.name}
              </span>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 mt-0.5">{topic?.name}</h1>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-neutral-50 px-4 py-2 rounded-2xl border">
          <div className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
            {saving ? 'Autosaving...' : 'Changes Saved'}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!evaluation ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Question Card */}
            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h2 className="font-bold text-neutral-900">Active Exercise</h2>
                </div>
                <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-3 py-1 rounded-full">
                  DIFFICULTY: {exercise?.difficulty.toUpperCase()}
                </span>
              </div>
              
              {generating ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-medium text-neutral-500">SOMA AI is synthesizing a targeted problem for you...</p>
                </div>
              ) : (
                <p className="text-base text-neutral-800 leading-relaxed font-medium bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
                  {exercise?.question}
                </p>
              )}

              <div className="flex items-center gap-2 justify-center pt-2">
                <button 
                  onClick={() => setMode('typed')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    mode === 'typed' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Typed Answer
                </button>
                <button 
                  onClick={() => setMode('handwritten')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                    mode === 'handwritten' ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <PenTool className="w-4 h-4" />
                  Handwritten
                </button>
              </div>
            </div>

            {/* Work Area */}
            <div className="bg-white p-1 rounded-3xl border shadow-sm min-h-[400px] flex flex-col overflow-hidden">
              {mode === 'typed' ? (
                <textarea
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your intermediate steps and final answer here..."
                  className="flex-1 w-full p-6 text-base text-neutral-800 focus:outline-hidden rounded-3xl resize-none"
                />
              ) : (
                <div className="flex flex-col h-full min-h-[500px]">
                  {/* Multi-page Navigation */}
                  {evidencePages.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-neutral-50 border-b overflow-x-auto no-scrollbar">
                      {evidencePages.map((page, idx) => (
                        <div 
                          key={page.id} 
                          className={`relative group shrink-0 w-16 h-20 rounded-lg border-2 transition-all cursor-pointer ${
                            currentPageIndex === idx ? 'border-blue-600 shadow-md' : 'border-neutral-200'
                          }`}
                          onClick={() => setCurrentPageIndex(idx)}
                        >
                          <img src={page.data} className="w-full h-full object-cover rounded-md" alt={`Page ${idx + 1}`} />
                          <button 
                            onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded font-bold">
                            P{idx + 1}
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => handleAddPage()}
                        className="w-16 h-20 rounded-lg border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:border-blue-400 hover:text-blue-500 transition-all shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[8px] font-bold">ADD</span>
                      </button>
                    </div>
                  )}

                  <div className="flex-1 relative bg-white">
                    {currentPageIndex < evidencePages.length ? (
                      <div className="absolute inset-0 flex flex-col">
                        <img src={evidencePages[currentPageIndex].data} className="w-full h-full object-contain p-4" alt="Captured Page" />
                        <div className="absolute bottom-4 right-4 flex gap-2">
                          <button 
                            onClick={() => removePage(currentPageIndex)}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold border border-red-100 shadow-sm"
                          >
                            Delete Page {currentPageIndex + 1}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Scratchpad 
                        ref={scratchpadRef}
                        initialData={canvasData || undefined}
                        onChange={setCanvasData}
                        className="h-full border-0 rounded-none"
                      />
                    )}
                  </div>
                  
                  <div className="p-3 bg-neutral-50 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAddPage(file);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50">
                          <ImageIcon className="w-4 h-4 text-blue-600" />
                          Capture Photo
                        </button>
                      </div>
                      <button 
                        onClick={() => handleAddPage()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50"
                      >
                        <Plus className="w-4 h-4 text-emerald-600" />
                        New Drawing Page
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">
                      {evidencePages.length + (currentPageIndex >= evidencePages.length ? 1 : 0)} Total Pages
                    </span>
                  </div>
                </div>
              )}
            </div>

            {pipelineStatus && (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl border border-blue-100 text-xs font-bold flex items-center gap-3 animate-pulse">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                {pipelineStatus}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={generateNewExercise}
                className="flex items-center gap-2 px-6 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl text-sm font-bold transition-all"
              >
                <RefreshCcw className="w-4 h-4" />
                Skip / New Question
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting || (mode === 'typed' ? !typedAnswer.trim() : !canvasData)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-sm font-extrabold transition-all shadow-lg"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    SOMA is Evaluating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Academic Work
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          /* Result Screen */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Score & Feedback Card */}
            <div className="bg-white p-8 rounded-3xl border shadow-md space-y-6 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Practice Score</span>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-6xl font-black ${
                    evaluation.score >= 8 ? 'text-emerald-500' : 
                    evaluation.score >= 5 ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {evaluation.score}
                  </span>
                  <span className="text-2xl font-bold text-neutral-300">/ 10</span>
                </div>
              </div>

              <div className="max-w-2xl mx-auto space-y-4">
                <p className="text-lg font-bold text-neutral-800 leading-tight">
                  {evaluation.feedback}
                </p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {evaluation.strengths.slice(0, 3).map((s: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">Detected Gaps & Mistakes</h4>
                  </div>
                  <ul className="space-y-2">
                    {evaluation.mistakes.map((m: string, i: number) => (
                      <li key={i} className="text-xs text-amber-700 leading-relaxed font-medium flex gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                        {m}
                      </li>
                    ))}
                    {evaluation.conceptGaps.map((g: string, i: number) => (
                      <li key={i} className="text-xs text-amber-900 leading-relaxed font-bold flex gap-2 italic">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">SOMA Action Plan</h4>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed font-medium">
                    {evaluation.recommendedNextAction}
                  </p>
                  <div className="pt-2">
                    <button 
                      onClick={handleAskTutor}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Ask AI Mentor about this result
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Confirmation */}
            <div className="bg-neutral-900 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold">Academic Evidence Synchronized</h4>
                  <p className="text-xs text-neutral-400">Mastery and Risk analysis updated for <strong>{topic?.name}</strong>.</p>
                </div>
              </div>
              <button 
                onClick={generateNewExercise}
                className="flex items-center gap-2 px-5 py-3 bg-white text-neutral-900 rounded-xl text-xs font-extrabold hover:bg-neutral-100 transition-all"
              >
                Next Exercise
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <button onClick={onClose} className="text-neutral-500 font-bold text-sm hover:text-neutral-700 transition-all">
                Close Practice & Return to Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
    </div>
  );
}
