import React, { useState } from 'react';
import { AcademicActivity } from '../../types';
import { Clock, Brain, AlertCircle, CheckCircle2, Play, SkipForward, XCircle, PenTool, Calendar } from 'lucide-react';
import { evaluateAndSyncSession } from '../../lib/calendarPolicy';
import { useSOMA } from '../../lib/realtime';

interface PlannerCardProps {
  session: AcademicActivity;
  isEnded: boolean;
  onStatusUpdate: (id: string, status: AcademicActivity['status']) => void;
  onStartSession: (session: AcademicActivity) => void;
  onOpenPractice?: (moduleId: string, topicId: string) => void;
}

export const PlannerCard: React.FC<PlannerCardProps> = ({ 
  session, 
  isEnded, 
  onStatusUpdate,
  onStartSession,
  onOpenPractice
}) => {
  const { user } = useSOMA();
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(Boolean(session.googleEventId || session.calendarSyncStatus === 'synced'));

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const mode = (localStorage.getItem('soma_calendar_sync_mode') as any) || 'essential';
      await evaluateAndSyncSession(user.uid, session, mode, true);
      setSynced(true);
    } catch (e) {
      console.error('Failed to add to Google Calendar:', e);
    } finally {
      setSyncing(false);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-100';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-neutral-600 bg-neutral-50 border-neutral-100';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Skipped': return <SkipForward className="w-4 h-4 text-neutral-400" />;
      case 'Canceled': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'In Progress': return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      default: return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      session.status === 'Completed' ? 'bg-neutral-50 border-neutral-200 opacity-75' : 
      session.status === 'In Progress' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' :
      'bg-white hover:border-blue-200 shadow-sm'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityColor(session.priority)}`}>
            {session.priority || 'Medium'} Priority
          </span>
          <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
            {getStatusIcon(session.status)}
            {session.status || 'Upcoming'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {synced ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Added to Calendar
            </span>
          ) : (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncing}
              className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1 transition-colors"
            >
              <Calendar className="w-3 h-3" /> {syncing ? 'Syncing...' : '＋ Add to Google Calendar'}
            </button>
          )}
          <span className="text-xs font-bold text-neutral-900">
            {session.startTime} - {session.endTime}
          </span>
        </div>
      </div>

      <h4 className="font-bold text-neutral-900 text-sm">{session.title}</h4>
      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
        {session.reason || 'Strategically scheduled for your academic progress.'}
      </p>

      {session.topicName && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-blue-600 bg-blue-50/50 w-fit px-2 py-0.5 rounded-lg border border-blue-100">
          <Brain className="w-3 h-3" />
          Focus: {session.topicName}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex gap-2">
          {session.status !== 'Completed' && !isEnded && (
            <>
              <button 
                onClick={() => onStartSession(session)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold hover:bg-blue-700 transition-all shadow-xs"
              >
                <Play className="w-3 h-3 fill-current" /> Start
              </button>
              {session.moduleId && session.topicId && (
                <button 
                  onClick={() => onOpenPractice?.(session.moduleId!, session.topicId!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-[11px] font-bold hover:bg-neutral-800 transition-all shadow-xs"
                >
                  <PenTool className="w-3 h-3" /> Practice
                </button>
              )}
              <button 
                onClick={() => onStatusUpdate(session.id, 'Skipped')}
                className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-xl text-[11px] font-semibold hover:bg-neutral-200 transition-all border"
              >
                Skip
              </button>
            </>
          )}
          {session.status === 'Completed' && (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
        </div>
        
        {session.status !== 'Completed' && !isEnded && (
          <button 
            onClick={() => onStatusUpdate(session.id, 'Completed')}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  );
};
