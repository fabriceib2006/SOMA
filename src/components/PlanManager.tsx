import { useState } from 'react';
import { TimetableManager } from './TimetableManager';
import { DeadlinesManager } from './DeadlinesManager';

export function PlanManager() {
  const [activeTab, setActiveTab] = useState<'Timetable' | 'Deadlines'>('Timetable');

  return (
    <div className="p-6 space-y-6">
      <div className="flex space-x-2 border-b border-neutral-200">
        {(['Timetable', 'Deadlines'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-2 ${activeTab === tab ? 'border-b-2 border-blue-600 font-semibold' : 'text-neutral-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      {activeTab === 'Timetable' ? <TimetableManager /> : <DeadlinesManager />}
    </div>
  );
}
