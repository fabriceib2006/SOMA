import React, { useState, useEffect } from 'react';
import { getTimetable, addTimetableEntry, updateTimetableEntry } from '../lib/db';
import { TimetableEntry } from '../types';

export function TimetableManager() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [newEntry, setNewEntry] = useState<Partial<TimetableEntry>>({ day: 'Monday', startTime: '09:00', endTime: '10:00', status: 'active', weekNumber: 1 });
  const [semester, setSemester] = useState('Fall 2026');
  const [weeks, setWeeks] = useState(15);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const data = await getTimetable();
    setEntries(data.filter(e => e.weekNumber === currentWeek));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTimetableEntry({ ...newEntry, activityName: newEntry.activityName || '', status: 'active', weekNumber: currentWeek } as any);
    fetchEntries();
  };

  const toggleStatus = async (entry: TimetableEntry) => {
    await updateTimetableEntry(entry.id, { status: entry.status === 'active' ? 'canceled' : 'active' });
    fetchEntries();
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <input value={semester} onChange={e => setSemester(e.target.value)} className="p-2 border rounded" placeholder="Semester" />
        <input type="number" value={weeks} onChange={e => setWeeks(parseInt(e.target.value))} className="p-2 border rounded w-20" placeholder="Weeks" />
        <select value={currentWeek} onChange={e => setCurrentWeek(parseInt(e.target.value))} className="p-2 border rounded">
          {Array.from({length: weeks}).map((_, i) => <option key={i+1} value={i+1}>Week {i+1}</option>)}
        </select>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {days.map(day => (
          <div key={day} className="space-y-2">
            <h4 className="font-medium text-sm text-neutral-500">{day}</h4>
            {entries.filter(e => e.day === day).map(entry => (
              <div key={entry.id} className={`p-3 rounded border shadow-sm ${entry.status === 'canceled' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <p className="font-semibold text-sm">{entry.activityName}</p>
                <p className="text-xs text-neutral-500">{entry.startTime}-{entry.endTime}</p>
                <button onClick={() => toggleStatus(entry)} className="text-[10px] mt-2 underline">
                  {entry.status === 'active' ? 'Mark Canceled' : 'Restore Class'}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleAdd} className="grid grid-cols-4 gap-2 border-t pt-4">
        <input placeholder="Subject" onChange={e => setNewEntry({...newEntry, activityName: e.target.value})} className="p-2 border rounded text-sm" />
        <select onChange={e => setNewEntry({...newEntry, day: e.target.value as any})} className="p-2 border rounded text-sm">
          {days.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
        <div className="flex gap-1">
          <input type="time" onChange={e => setNewEntry({...newEntry, startTime: e.target.value})} className="p-2 border rounded text-sm flex-1" />
          <input type="time" onChange={e => setNewEntry({...newEntry, endTime: e.target.value})} className="p-2 border rounded text-sm flex-1" />
        </div>
        <button type="submit" className="bg-blue-600 text-white rounded text-sm">Add Class</button>
      </form>
    </div>
  );
}
