import React, { useState } from 'react';
import { createSemesterHierarchyInFirestore, WeeklyModuleTemplate } from '../lib/semesterFirestore';
import { getCATDateComponents } from '../lib/catTime';

export function SemesterSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    year: '2026 / 2027',
    semesterName: 'Semester 1',
    startDate: getCATDateComponents().dateString,
    numberOfWeeks: 15
  });

  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyModuleTemplate[]>([
    { dayOfWeek: 'Monday', morningModule: '', morningTime: '09:00', afternoonModule: '', afternoonTime: '13:00' },
    { dayOfWeek: 'Tuesday', morningModule: '', morningTime: '09:00', afternoonModule: '', afternoonTime: '13:00' },
    { dayOfWeek: 'Wednesday', morningModule: '', morningTime: '09:00', afternoonModule: '', afternoonTime: '13:00' },
    { dayOfWeek: 'Thursday', morningModule: '', morningTime: '09:00', afternoonModule: '', afternoonTime: '13:00' },
    { dayOfWeek: 'Friday', morningModule: '', morningTime: '09:00', afternoonModule: '', afternoonTime: '13:00' },
  ]);

  const handleTemplateChange = (dayOfWeek: string, field: 'morningModule' | 'afternoonModule', value: string) => {
    setWeeklyTemplate(prev => prev.map(t => t.dayOfWeek === dayOfWeek ? { ...t, [field]: value } : t));
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      await createSemesterHierarchyInFirestore(
        formData.year,
        formData.semesterName,
        new Date(formData.startDate),
        formData.numberOfWeeks,
        weeklyTemplate
      );
      setLoading(false);
      if (onComplete) {
        onComplete();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      console.error(e);
      setLoading(false);
      alert('Error creating semester in Firestore: ' + (e.message || 'Unknown error'));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Firestore Setup</span>
          <h2 className="text-xl font-bold mt-2">Initialize Semester & Master Timetable (Step {step} of 2)</h2>
        </div>
        <span className="text-sm text-neutral-500 font-medium">Step {step} / 2</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-neutral-800">1. Semester Details & Duration</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year</label>
            <input className="w-full p-3 border rounded-xl" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Semester Name</label>
            <input className="w-full p-3 border rounded-xl" value={formData.semesterName} onChange={e => setFormData({...formData, semesterName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input type="date" className="w-full p-3 border rounded-xl" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Number of Weeks in Semester</label>
            <input type="number" className="w-full p-3 border rounded-xl" value={formData.numberOfWeeks} onChange={e => setFormData({...formData, numberOfWeeks: parseInt(e.target.value) || 15})} />
          </div>
          <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-all" onClick={() => setStep(2)}>
            Next: Configure Master Weekly Timetable →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-neutral-800">2. Master Weekly Timetable (Monday - Friday)</h3>
            <p className="text-sm text-neutral-500 mt-1">Set your standard modules for Morning (09:00 - 12:00) and Afternoon (13:00 - 17:00). This will be securely saved to your Firestore database across all weeks!</p>
          </div>

          <div className="space-y-4">
            {weeklyTemplate.map(t => (
              <div key={t.dayOfWeek} className="p-4 bg-neutral-50 rounded-xl border space-y-3">
                <h4 className="font-bold text-neutral-900">{t.dayOfWeek}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Morning Module (09:00 - 12:00)</label>
                    <input
                      type="text"
                      placeholder="e.g. Database Systems"
                      value={t.morningModule}
                      onChange={e => handleTemplateChange(t.dayOfWeek, 'morningModule', e.target.value)}
                      className="w-full p-2.5 border rounded-lg bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">Afternoon Module (13:00 - 17:00)</label>
                    <input
                      type="text"
                      placeholder="e.g. Software Engineering"
                      value={t.afternoonModule}
                      onChange={e => handleTemplateChange(t.dayOfWeek, 'afternoonModule', e.target.value)}
                      className="w-full p-2.5 border rounded-lg bg-white text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="w-1/3 bg-neutral-200 text-neutral-700 py-3 rounded-xl font-medium hover:bg-neutral-300 transition-all" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button 
              disabled={loading}
              className="w-2/3 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-all disabled:opacity-50" 
              onClick={handleCreate}
            >
              {loading ? 'Saving to Firestore Database...' : 'Save & Generate Semester in Firestore'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
