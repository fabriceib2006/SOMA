import React, { useState } from 'react';
import { googleSignIn } from '../lib/auth';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import neuralBg from '../assets/images/neural_background_1789777908651.jpg';
import sLogo from '../assets/images/s_atom_logo_1789777920758.jpg';
import studyOsIso from '../assets/images/study_os_isometric_1789777933311.jpg';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await googleSignIn();
    } catch (error: any) {
      console.error("Login failed", error);
      if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
        setErrorMessage(`Domain not authorized: Please add "${window.location.hostname}" to your Firebase Console under Authentication > Settings > Authorized Domains.`);
      } else if (error?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please try again.');
      } else if (error?.code === 'auth/unauthorized-account') {
        setErrorMessage('Access denied: This system is strictly restricted to a single authorized account only.');
      } else {
        setErrorMessage(error?.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0E17] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Background Image: Dark Neural Network / Synapse Theme */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img 
          src={neuralBg} 
          alt="Neural Network Background" 
          className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E17]/80 via-[#0A0E17]/60 to-[#0A0E17]/90"></div>
      </div>

      {/* Main Container - Compact, clean, perfectly fitting viewport */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-5 sm:space-y-6 my-auto">
        
        {/* SOMA Brand Header */}
        <header className="text-center space-y-1 animate-in fade-in slide-in-from-top-3 duration-700">
          <h1 className="text-3xl sm:text-4xl font-serif tracking-[0.25em] font-normal text-white drop-shadow-md">
            SOMA
          </h1>
          <p className="text-[10px] sm:text-xs font-light tracking-[0.3em] text-neutral-300 uppercase drop-shadow-sm">
            Personal Academic Operating System
          </p>
        </header>

        {/* Two-Column Cinematic Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          
          {/* Left Panel — Sign In Glassmorphism Card */}
          <div className="lg:col-span-5 bg-neutral-900/70 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/70 flex flex-col justify-between relative overflow-hidden group">
            {/* Top light refraction edge */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>

            <div className="space-y-5">
              {/* Sign-In Box Icon: Glowing 3D Molecular / Atom 'S' Logo */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-blue-400/30 relative shadow-xl shadow-blue-500/20 bg-neutral-950 flex items-center justify-center">
                <img 
                  src={sLogo} 
                  alt="SOMA Atom Logo" 
                  className="w-full h-full object-cover scale-110"
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Sign in to SOMA
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Your personal academic intelligence engine.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-200 text-xs rounded-xl leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full group/btn relative overflow-hidden rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 hover:border-blue-400/60 text-white font-medium py-3.5 px-5 transition-all duration-300 shadow-xl shadow-black/40 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4 relative z-10 shrink-0" />
                <span className="relative z-10 text-xs sm:text-sm tracking-wide font-medium">
                  {loading ? 'Initializing Neural Session...' : 'Sign in with Google'}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-neutral-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Secure Academic Authentication & Cloud Sync</span>
              </div>
            </div>
          </div>

          {/* Right Panel — Secondary Illustration Form (Isometric Study OS / Knowledge Engine Graphic) */}
          <div className="lg:col-span-7 bg-neutral-900/60 backdrop-blur-2xl border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/70 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
                <span className="text-[11px] uppercase tracking-widest font-semibold text-cyan-400">
                  Neural Architecture Active
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">v4.8 OS Core</span>
            </div>

            {/* Isometric Study OS Graphic Container */}
            <div className="py-4 sm:py-6 flex items-center justify-center relative">
              <div className="w-full max-w-md rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-neutral-950/80 relative group">
                <img 
                  src={studyOsIso} 
                  alt="Study OS Isometric Graphic" 
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent flex items-end p-4">
                  <div className="text-left space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                      Central Core Active
                    </span>
                    <p className="text-xs font-semibold text-white mt-1">Knowledge Base & Memory Engine Synchronized</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>Status: Operational</span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span>Explore Ecosystem</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
