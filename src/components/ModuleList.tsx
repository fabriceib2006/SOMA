import React, { useState, useEffect } from 'react';
import { getModules, addModule } from '../lib/db';
import { Module } from '../types';

export const ModuleList: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [newModuleName, setNewModuleName] = useState('');

  useEffect(() => {
    getModules().then(setModules);
  }, []);

  const handleAddModule = async () => {
    if (!newModuleName) return;
    await addModule({ 
      name: newModuleName, 
      code: 'NEW', 
      lecturer: 'TBD', 
      credits: 3, 
      importance: 'medium' 
    });
    setNewModuleName('');
    getModules().then(setModules);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-neutral-100">
      <h2 className="text-lg font-semibold">Modules</h2>
      <ul className="mt-4 space-y-2">
        {modules.map(m => <li key={m.id}>{m.name} ({m.code})</li>)}
      </ul>
      <div className="mt-4 flex gap-2">
        <input 
          className="border rounded p-2 flex-grow"
          value={newModuleName} 
          onChange={e => setNewModuleName(e.target.value)} 
          placeholder="New Module Name"
        />
        <button onClick={handleAddModule} className="bg-neutral-900 text-white rounded p-2">Add</button>
      </div>
    </div>
  );
};
