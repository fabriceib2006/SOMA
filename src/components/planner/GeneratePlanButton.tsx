import React, { useState } from 'react';
import { Sparkles, Brain, Loader2 } from 'lucide-react';
import { generateAndPersistDailyPlan } from '../../lib/plannerFirestore';
import { AcademicDay } from '../../types';

interface GeneratePlanButtonProps {
  userId: string;
  semesterId: string;
  day: AcademicDay;
  onComplete?: () => void;
  variant?: 'primary' | 'secondary';
}

export const GeneratePlanButton: React.FC<GeneratePlanButtonProps> = ({ 
  userId, 
  semesterId, 
  day, 
  onComplete,
  variant = 'primary'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = day.date instanceof Date ? day.date.toISOString().split('T')[0] : day.date;
      await generateAndPersistDailyPlan(userId, semesterId, day.id, dateStr);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      setError('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'secondary') {
    return (
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all border border-purple-200 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? 'Thinking...' : 'AI Plan Today'}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-4 rounded-2xl font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
      >
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
        )}
        <div className="text-left">
          <div className="text-sm">
            {loading ? 'SOMA Intelligence Engine Calculating...' : 'Generate Intelligent Study Plan'}
          </div>
          {!loading && <div className="text-[10px] opacity-80 font-normal">Based on mastery, risks, and assessment countdowns</div>}
        </div>
      </button>
      {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
    </div>
  );
};
