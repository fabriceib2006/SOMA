import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('soma_pwa_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('soma_pwa_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-blue-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg">
          S
        </div>
        <div>
          <h4 className="font-semibold text-sm">Install SOMA App</h4>
          <p className="text-xs text-blue-100">Add to your Home Screen for lightning-fast study OS access.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center gap-1.5"
        >
          <Download size={14} /> Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white p-1 rounded-lg"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
