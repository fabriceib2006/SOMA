import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { RotateCcw, Trash2, Undo2, Redo2, Maximize2, Minimize2 } from 'lucide-react';

interface ScratchpadProps {
  initialData?: string;
  onChange?: (dataUrl: string) => void;
  className?: string;
}

export interface ScratchpadRef {
  getDataUrl: () => string;
  clear: () => void;
  undo: () => void;
}

export const Scratchpad = forwardRef<ScratchpadRef, ScratchpadProps>(({ initialData, onChange, className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      // Save current content
      const tempImage = canvas.toDataURL();
      
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight || 400;
      
      // Restore content
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e1e1e';
        ctx.lineWidth = 3;
        
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = tempImage;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle Initial Data
  useEffect(() => {
    if (initialData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = initialData;
        setHistory([initialData]);
        setHistoryIndex(0);
      }
    }
  }, [initialData]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onChange?.(dataUrl);
  };

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    
    // Prevent scrolling on touch
    if (e.pointerType === 'touch') {
      (e.target as HTMLElement).style.touchAction = 'none';
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory();
  };

  useImperativeHandle(ref, () => ({
    getDataUrl: () => canvasRef.current?.toDataURL() || '',
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
      }
    },
    undo: () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
          };
          img.src = history[newIndex];
        }
      } else if (historyIndex === 0) {
        // Clear if undoing first step
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setHistoryIndex(-1);
        }
      }
    }
  }));

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = history[newIndex];
      }
    }
  };

  return (
    <div className={`relative flex flex-col bg-neutral-50 rounded-2xl border overflow-hidden ${className}`} ref={containerRef}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => ref && (ref as any).current.undo()}
            disabled={historyIndex < 0}
            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 disabled:opacity-30"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500 disabled:opacity-30"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
            <span className="text-[10px] font-bold text-neutral-400 px-2 uppercase">Tools</span>
            <button className="p-1.5 bg-white shadow-xs rounded-md text-blue-600">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <button 
            onClick={() => ref && (ref as any).current.clear()}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerOut={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />
        {historyIndex === -1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm font-medium">Draw your solution here...</p>
            </div>
          </div>
        )}
      </div>

      {/* Hint/Status */}
      <div className="p-1.5 px-3 bg-neutral-100/50 flex justify-between items-center">
        <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-tight">Handwritten Mode • Mobile Optimized</span>
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] text-emerald-600 font-bold">Ready</span>
        </div>
      </div>
    </div>
  );
});

import { Sparkles } from 'lucide-react';
