import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Semester, LibraryModule, AcademicAssessment, LectureMaterial, LibraryTopic } from '../types';
import { getOrCreateDayConversation, saveTutorMessage, TutorMessage } from '../lib/tutorFirestore';
import { addTopicEvidence } from '../lib/performanceFirestore';
import { auth } from '../lib/firebase';
import { getCATDateComponents, getCATGreeting, CATDateComponents } from '../lib/catTime';
import { Sparkles, CheckCircle2, AlertTriangle, ArrowRight, X, Clock, Moon } from 'lucide-react';
import { useSOMA } from '../lib/realtime';
import { onSnapshot, collection, query, orderBy, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';

interface AITutorDashboardProps {
  user?: User | null;
  initialTarget?: { 
    topic: string; 
    module: string; 
    prompt?: string;
    sessionId?: string;
    reason?: string;
    objective?: string;
  } | null;
  onClearTarget?: () => void;
}

import { buildAcademicContext, ContextOptions, formatContextForGemini } from '../lib/academicContext';

export function AITutorDashboard({ user, initialTarget, onClearTarget }: AITutorDashboardProps) {
  const {
    activeSemester: selectedSem,
    modules,
    assessments,
    topicMastery: allTopics,
    academicRisk: riskList,
    loading: somaLoading,
    syncStatus
  } = useSOMA();

  const [catTime, setCatTime] = useState<CATDateComponents>(getCATDateComponents());
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [imageAttachments, setImageAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live CAT tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCatTime(getCATDateComponents());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;
    if (selectedSem && user) {
      initTutorSession().then(unsub => {
        if (unsub) unsubscribe = unsub;
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, selectedSem]);

  const initTutorSession = async () => {
    if (!selectedSem || !user) return;
    setInitializing(true);

    try {
      const currentUid = user.uid;
      const currentCat = getCATDateComponents();
      const todayStr = currentCat.dateString;
      const dayId = `day_${todayStr}`;
      
      const conv = await getOrCreateDayConversation(selectedSem.id, dayId, todayStr, currentUid);
      setConversationId(conv.id);

      // Real-time messages listener
      const msgsRef = collection(db, 'conversations', conv.id, 'messages');
      const q = query(msgsRef, orderBy('createdAt', 'asc'));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TutorMessage));
        setMessages(msgs);
        
        if (msgs.length === 0) {
          const studentName = user.displayName?.split(' ')[0] || 'Student';
          const greetingData = getCATGreeting(studentName, currentCat);
          
          const criticalRisks = riskList.filter(r => r.riskLevel === 'CRITICAL');
          const highRisks = riskList.filter(r => r.riskLevel === 'HIGH');
          const weakList = allTopics.filter(t => t.masteryScore !== undefined && t.masteryScore < 60);

          // Initial greeting
          await saveTutorMessage({
            conversationId: conv.id,
            userId: currentUid,
            role: 'assistant',
            content: `${greetingData.greeting}! I am SOMA AI, your Academic Mentor & Intelligence Partner.

🕒 **Current Time (Central Africa Time)**: **${currentCat.shortTimeString} CAT**
${currentCat.isDayEnded ? '🌙 **Night Rest Period Active**: Academic daytime concluded at 23:00 CAT so you can sleep and consolidate memories.' : '⚡ **Active Academic Period**: Academic daytime concludes at 23:00 CAT.'}

📊 **Today\'s Academic Intelligence Briefing**:
- Active Semester: **${selectedSem.name}**
- Upcoming Assessments: **${assessments.length} scheduled**
- Academic Risk Status: **${criticalRisks.length > 0 ? 'CRITICAL' : (highRisks.length > 0 ? 'HIGH' : 'STABLE')}**
${weakList.length > 0 ? `\n⚠️ **Topics Requiring Immediate Mastery**: ${weakList.slice(0, 3).map(t => `${t.name} (${t.masteryScore}%)`).join(', ')}` : ''}

How can I help you master your curriculum today?`
          });
        }
      });

      // Handle Initial Target
      if (initialTarget) {
        setTimeout(() => {
          let customPrompt = initialTarget.prompt;
          if (!customPrompt) {
            customPrompt = `I'm starting a study session on **${initialTarget.topic}** in **${initialTarget.module}**.`;
            if (initialTarget.objective) customPrompt += `\n\nObjective: ${initialTarget.objective}`;
            if (initialTarget.reason) customPrompt += `\n\nReason: ${initialTarget.reason}`;
            customPrompt += `\n\nPlease guide me through this topic with a diagnostic drill or active recall session.`;
          }
          handleSend(customPrompt, conv.id);
          onClearTarget?.();
        }, 500);
      }

      setInitializing(false);
      return unsubscribe;
    } catch (e) {
      console.error(e);
      setInitializing(false);
    }
  };

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImageAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (customPrompt?: string, activeConvId?: string) => {
    const targetConvId = activeConvId || conversationId;
    const text = customPrompt || input;
    if (!text.trim() && imageAttachments.length === 0) return;
    if (!targetConvId) return;

    const currentUid = user?.uid || auth.currentUser?.uid || 'current_user';
    const userMsgContent = text.trim() || `[Multi-Page Practice Submission (${imageAttachments.length} pages)]`;
    
    // UI will update via onSnapshot
    await saveTutorMessage({
      conversationId: targetConvId,
      userId: currentUid,
      role: 'user',
      content: userMsgContent,
      attachmentUrl: imageAttachments[0] || undefined
    });

    if (!customPrompt) setInput('');
    const currentImgs = [...imageAttachments];
    setImageAttachments([]);
    setLoading(true);

    try {
      // Build context
      const context = await buildAcademicContext({
        userId: user!.uid,
        semesterId: selectedSem!.id,
        scope: 'semester'
      });
      const contextPrompt = formatContextForGemini(context);

      const res = await fetch('/api/tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsgContent,
          images: currentImgs,
          context: contextPrompt // Send the formatted context string
        })
      });

      if (res.ok) {
        const data = await res.json();

        // If SOMA AI produced a structured diagnostic grading block, log to Firestore
        if (data.gradingResult && selectedSem) {
          const g = data.gradingResult;
          const matchedModule = modules.find(m => m.name.toLowerCase().includes((g.moduleName || '').toLowerCase())) || modules[0];
          
          await addTopicEvidence({
            userId: currentUid,
            semesterId: selectedSem.id,
            moduleId: matchedModule?.id || 'mod_general',
            moduleName: matchedModule?.name || g.moduleName || 'Curriculum',
            topicId: 'top_' + (g.topicName || 'diagnostic').toLowerCase().replace(/\s+/g, '_'),
            topicName: g.topicName || 'AI Diagnostic Assessment',
            sourceType: currentImgs.length > 0 ? 'handwritten_grading' : 'exercise',
            sourceTitle: 'SOMA AI Diagnostic Evaluation',
            score: g.score,
            normalizedScore: Math.round(g.score * 10),
            mistakes: g.mistakes || [],
            date: catTime.dateString
          });
        }

        await saveTutorMessage({
          conversationId: targetConvId,
          userId: currentUid,
          role: 'assistant',
          content: data.reply || 'Here is your academic guidance.',
          score: data.gradingResult?.score
        });
      } else {
        await saveTutorMessage({
          conversationId: targetConvId,
          userId: currentUid,
          role: 'assistant',
          content: 'I am currently reviewing your syllabus and lecture notes. Please try your query again.'
        });
      }
    } catch (err) {
      await saveTutorMessage({
        conversationId: targetConvId,
        userId: currentUid,
        role: 'assistant',
        content: 'Network connection issue with SOMA intelligence layer.'
      });
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = riskList.some(r => r.riskLevel === 'CRITICAL') ? 'CRITICAL' : 
                   riskList.some(r => r.riskLevel === 'HIGH') ? 'HIGH' : 'MEDIUM';

  const quickChips = [
    allTopics.filter(t => (t.masteryScore || 0) < 60).length > 0 
      ? `Quiz me on ${allTopics.filter(t => (t.masteryScore || 0) < 60)[0].name}` 
      : "Quiz me on my weakest topic",
    "What should I study today?",
    "Review my recurring mistake patterns",
    "Prepare me for my next CAT",
    "Generate active recall flashcards"
  ];

  if (somaLoading || initializing) {
    return <div className="p-12 text-center text-neutral-500 font-medium">Initializing SOMA AI Mentor & Academic Intelligence...</div>;
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header & Academic Status */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            {syncStatus === 'online' ? 'Intelligence Stream Active' : 'SOMA Intelligence Offline'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                AI Mentor & Intelligence Engine
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                riskLevel === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                Risk: {riskLevel}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-neutral-100 text-neutral-700 border flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>{catTime.shortTimeString} CAT</span>
              </span>
              {catTime.isDayEnded && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-900 text-amber-300 flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  <span>Day Ended</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mt-2 text-neutral-900">SOMA AI Intelligence Layer</h1>
            <p className="text-sm text-neutral-500">
              Synced with <span className="font-semibold text-neutral-800">{selectedSem?.name}</span> • {modules.length} Modules
            </p>
          </div>

          {initialTarget && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-2xl text-xs font-semibold text-blue-700">
              <span>Targeting:</span> {initialTarget.topic}
            </div>
          )}
        </div>
      </div>

      {catTime.isDayEnded && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-amber-300">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-100">Central Africa Time: 23:00 Academic Day Cutoff Passed ({catTime.shortTimeString} CAT)</p>
              <p className="text-slate-400">Daytime lectures and study modules are ended. SOMA AI recommends resting for memory consolidation.</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-full whitespace-nowrap">
            Night Rest Mode
          </span>
        </div>
      )}

      {/* Quick Intelligence Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            className="bg-white hover:bg-neutral-50 border text-neutral-700 px-4 py-2.5 rounded-2xl text-xs font-medium whitespace-nowrap shadow-xs transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> {chip}
          </button>
        ))}
      </div>

      {/* Chat Conversation Window */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4 min-h-[480px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
          {messages.map((m) => (
            <div key={m.id} className={`p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white ml-12' : 'bg-neutral-100 text-neutral-900 mr-12'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs opacity-75">{m.role === 'user' ? 'You' : 'SOMA AI Mentor'}</span>
                <span className="text-[10px] opacity-60">
                  {new Intl.DateTimeFormat('en-GB', {
                    timeZone: 'Africa/Maputo',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).format(new Date(m.createdAt))} CAT
                </span>
              </div>
              <div className="mt-1 text-sm leading-relaxed text-neutral-900 prose prose-sm max-w-none prose-headings:text-neutral-950 prose-p:text-neutral-900 prose-li:text-neutral-900 prose-headings:font-bold prose-p:my-1.5 prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-pre:p-3 prose-pre:rounded-xl prose-code:text-xs prose-code:bg-neutral-200/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              {m.score !== undefined && (
                <div className="mt-2 pt-2 border-t border-black/10 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Evaluation: {m.score}/10 — Recorded to Academic Dashboard Evidence</span>
                </div>
              )}
              {m.attachmentUrl && (
                <div className="mt-3">
                  <img src={m.attachmentUrl} alt="Student attachment" className="max-h-48 rounded-xl border border-white/20 object-cover" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="p-4 bg-purple-50 text-purple-700 rounded-2xl text-sm animate-pulse flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>SOMA is synthesizing your lectures, topic mastery, and academic calendar...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input & Image Upload */}
        <div className="pt-4 border-t space-y-3">
          {imageAttachments.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {imageAttachments.map((img, idx) => (
                <div key={idx} className="relative flex items-center gap-2 p-1.5 bg-neutral-50 rounded-xl border">
                  <img src={img} alt={`Page ${idx + 1}`} className="w-12 h-12 object-cover rounded-lg" />
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Page {idx + 1}</span>
                  <button 
                    onClick={() => setImageAttachments(prev => prev.filter((_, i) => i !== idx))} 
                    className="text-red-500 font-bold hover:text-red-700 px-1.5 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-3">
            <label className="cursor-pointer bg-neutral-100 hover:bg-neutral-200 p-3.5 rounded-2xl text-neutral-600 transition-colors flex items-center gap-1.5" title="Upload multiple handwritten pages for grading">
              <span>📷</span>
              <span className="text-xs font-semibold hidden sm:inline">Add Pages</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>

            <input
              type="text"
              placeholder="Ask your mentor anything, submit multi-page answers, or paste notes..."
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-grow p-3.5 border rounded-2xl text-sm bg-neutral-50 focus:bg-white transition-all shadow-xs focus:outline-hidden focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && imageAttachments.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-medium text-sm transition-all shadow-sm disabled:opacity-50"
            >
              Send →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
