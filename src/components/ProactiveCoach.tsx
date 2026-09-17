import React from 'react';
import { Recommendation } from '../types';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ProactiveCoachProps {
  recommendations: Recommendation[];
  onOpenAI?: (target: { topic: string; module: string; prompt?: string }) => void;
}

export function ProactiveCoach({ recommendations, onOpenAI }: ProactiveCoachProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-bold text-neutral-900 text-lg">SOMA Academic Coach</h3>
      </div>
      
      {recommendations.slice(0, 3).map(rec => (
        <div key={rec.id} className={`p-4 rounded-2xl border ${rec.priority === 'Critical' ? 'bg-red-50 border-red-100' : 'bg-neutral-50 border-neutral-100'}`}>
          <div className="flex items-start gap-3">
            {rec.priority === 'Critical' ? <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />}
            <div>
              <h4 className="font-bold text-neutral-900 text-sm">{rec.title}</h4>
              <p className="text-xs text-neutral-600 mt-1">{rec.message}</p>
              <button 
                onClick={() => {
                  if (onOpenAI) {
                    onOpenAI({
                      topic: rec.title,
                      module: rec.reason || 'Academic Review',
                      prompt: `Please help me review and overcome the risk highlighted in this recommendation: "${rec.title}" - ${rec.message}`
                    });
                  }
                }}
                className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                View Action →
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
