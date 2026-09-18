import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Check, WifiOff, Wifi } from 'lucide-react';

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = useState(false);

  useEffect(() => {
    // Check standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone || localStorage.getItem('soma_pwa_installed') === 'true') {
      return;
    }

    // Check iOS
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const dismissed = localStorage.getItem('soma_pwa_dismissed');

    // Handle beforeinstallprompt for Android / Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dismissed) {
        // Show after slight delay post-login
        setTimeout(() => setShowBanner(true), 1500);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // If iOS and not dismissed, show iOS installation instructions banner
    if (isIosDevice && !dismissed) {
      setTimeout(() => setShowBanner(true), 2000);
    }

    // App installed listener
    const appInstalledHandler = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.setItem('soma_pwa_installed', 'true');
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    // Online/Offline status listeners
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(true);
      setTimeout(() => setShowOfflineToast(false), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global listener for manual trigger (e.g. from profile settings)
    (window as any).somaTriggerInstall = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }: { outcome: string }) => {
          if (outcome === 'accepted') {
            setShowBanner(false);
          }
          setDeferredPrompt(null);
        });
      } else {
        setShowBanner(true);
      }
    };

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      delete (window as any).somaTriggerInstall;
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (isIOS) {
      // iOS doesn't support programmatic prompt, instructions are shown in banner
      return;
    }
    if (!deferredPrompt) {
      // Fallback if prompt not yet captured
      alert("To install SOMA, tap your browser menu (three dots) and select 'Install app' or 'Add to Home screen'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('soma_pwa_installed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('soma_pwa_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Offline/Online Toast */}
      {showOfflineToast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold text-white transition-all animate-in fade-in slide-in-from-bottom-4 ${
          isOnline ? 'bg-emerald-600' : 'bg-amber-600'
        }`}>
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{isOnline ? "You're back online." : "You're offline. App shell cached for offline use."}</span>
        </div>
      )}

      {/* Install Banner Modal / Card */}
      {showBanner && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 max-w-md w-full p-6 space-y-5 overflow-hidden relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-2 rounded-xl hover:bg-neutral-100 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                S
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                  App Experience
                </span>
                <h3 className="text-lg font-bold text-neutral-900 mt-1">Install SOMA</h3>
                <p className="text-xs text-neutral-500">Your Personal Academic Operating System</p>
              </div>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed">
              Install SOMA on your device for lightning-fast access, offline capability, and a clean full-screen study environment.
            </p>

            <div className="bg-neutral-50 rounded-2xl p-4 space-y-2.5 border border-neutral-100">
              <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-700">
                <Check size={16} className="text-blue-600 shrink-0" />
                <span>Quick access directly from your Home Screen</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-700">
                <Check size={16} className="text-blue-600 shrink-0" />
                <span>Immersive full-screen app experience</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-medium text-neutral-700">
                <Check size={16} className="text-blue-600 shrink-0" />
                <span>Instant access to timetable, lectures, and AI Mentor</span>
              </div>
            </div>

            {isIOS ? (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-1.5">
                <p className="font-semibold">How to install on iOS Safari:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Tap the <span className="font-bold">Share</span> button in Safari navigation bar.</li>
                  <li>Scroll down and tap <span className="font-bold">“Add to Home Screen”</span>.</li>
                  <li>Tap <span className="font-bold">Add</span> to confirm.</li>
                </ol>
              </div>
            ) : null}

            <div className="flex items-center gap-3 pt-2">
              {!isIOS && (
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-2xl text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <span>Install SOMA</span>
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`${isIOS ? 'w-full' : 'flex-1'} bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-3 px-4 rounded-2xl text-sm transition-all`}
              >
                Not now
              </button>
            </div>

            <p className="text-[11px] text-center text-neutral-400">
              You can install SOMA anytime from your browser menu.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
