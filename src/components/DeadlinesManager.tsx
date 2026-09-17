import React, { useState, useEffect } from 'react';
import { getDeadlines, addDeadline } from '../lib/db';
import { Deadline } from '../types';

export function DeadlinesManager() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [newDeadline, setNewDeadline] = useState<Partial<Deadline>>({ title: '', type: 'Assignment', dueDate: new Date() });

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    const data = await getDeadlines();
    setDeadlines(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDeadline(newDeadline as any);
    fetchDeadlines();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Deadlines</h3>
      {deadlines.map(d => (
        <div key={d.id} className="p-3 border rounded flex justify-between">
          <span>{d.title} ({d.type})</span>
          <span className="text-sm text-neutral-500">{new Date(d.dueDate).toLocaleDateString()}</span>
        </div>
      ))}
      <form onSubmit={handleAdd} className="grid grid-cols-3 gap-2 border-t pt-4">
        <input placeholder="Title" onChange={e => setNewDeadline({...newDeadline, title: e.target.value})} className="p-2 border rounded text-sm" />
        <select onChange={e => setNewDeadline({...newDeadline, type: e.target.value as any})} className="p-2 border rounded text-sm">
          {['Assignment', 'CAT', 'Quiz'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button type="submit" className="bg-blue-600 text-white rounded text-sm">Add</button>
      </form>
    </div>
  );
}
