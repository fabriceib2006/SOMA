import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const NoteUpload: React.FC = () => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const data = await response.json();
      
      // Store in firestore (simplified for MVP)
      await addDoc(collection(db, 'processed-notes'), {
        rawContent: content,
        extractedMetadata: data,
        createdAt: new Date()
      });
      
      alert('Note processed and saved!');
      setContent('');
    } catch (error) {
      console.error(error);
      alert('Failed to process note.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-neutral-100">
      <h2 className="text-lg font-semibold">Daily Note Capture</h2>
      <textarea 
        className="w-full h-32 border rounded mt-4 p-2"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Paste your notes or summary here..."
      />
      <button 
        onClick={handleProcess} 
        disabled={isProcessing}
        className="mt-4 w-full rounded-xl bg-neutral-900 py-3 text-white font-semibold"
      >
        {isProcessing ? 'AI is analyzing...' : 'Process Note'}
      </button>
    </div>
  );
};
