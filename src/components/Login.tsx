import React, { useState } from 'react';
import { googleSignIn } from '../lib/auth';
import { Sparkles, Database, Cpu, Search, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

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
      } else {
        setErrorMessage(error?.message || 'Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0E17] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Background Neural-Network & Synapse Atmospheric Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0a0e17" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Ambient Glows */}
          <circle cx="15%" cy="25%" r="350" fill="url(#glow)" />
          <circle cx="85%" cy="75%" r="400" fill="url(#glow)" />

          {/* Synapse Network Paths */}
          <g stroke="url(#lineGrad)" strokeWidth="1" fill="none">
            <path d="M 50 100 Q 350 200 700 140 T 1200 300" />
            <path d="M 120 600 Q 450 400 800 700 T 1400 500" />
          </g>

          {/* Glowing Neural Nodes */}
          <g fill="#3b82f6" opacity="0.5">
            <circle cx="180" cy="180" r="3" />
            <circle cx="620" cy="160" r="2.5" />
            <circle cx="900" cy="320" r="3.5" />
          </g>
        </svg>
      </div>

      {/* Main Container - Compact, clean, perfectly fitting viewport */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 my-auto">
        
        {/* SOMA Brand Header */}
        <header className="text-center space-y-1 animate-in fade-in slide-in-from-top-3 duration-700">
          <h1 className="text-3xl sm:text-4xl font-serif tracking-[0.25em] font-normal text-white">
            SOMA
          </h1>
          <p className="text-[10px] sm:text-xs font-light tracking-[0.3em] text-neutral-400 uppercase">
            Personal Academic Operating System
          </p>
        </header>

        {/* Two-Column Cinematic Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
          
          {/* Left Panel — Sign In Glassmorphism Card */}
          <div className="lg:col-span-5 bg-neutral-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 flex flex-col justify-between relative overflow-hidden group">
            {/* Top light refraction edge */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

            <div className="space-y-5">
              {/* SOMA Intelligence Crystal Emblem */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/25 via-cyan-500/10 to-transparent border border-blue-400/30 flex items-center justify-center relative shadow-xl shadow-blue-500/15">
                <div className="absolute inset-0 rounded-xl bg-blue-500/15 blur-md"></div>
                <div className="relative z-10 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                  Sign in to SOMA
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Your personal academic intelligence engine.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              {errorMessage && (
                <div className="p-3 bg-red-950/70 border border-red-500/30 text-red-200 text-xs rounded-xl leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full group/btn relative overflow-hidden rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-blue-400/50 text-white font-medium py-3 px-5 transition-all duration-300 shadow-xl shadow-black/30 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
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

          {/* Right Panel — SOMA Intelligence Preview / Ecosystem Visualization */}
          <div className="lg:col-span-7 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 flex flex-col justify-between relative overflow-hidden">
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

            {/* Central Study OS Ecosystem Graphic / Nodes */}
            <div className="py-4 sm:py-6 flex flex-col items-center justify-center relative">
              
              {/* Connecting SVG Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 hidden sm:block" xmlns="http://www.w3.org/2000/svg">
                <line x1="50%" y1="40%" x2="20%" y2="20%" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="50%" y1="40%" x2="80%" y2="20%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="50%" y1="40%" x2="50%" y2="85%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>

              {/* Central Study OS Hub */}
              <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-900/60 border border-blue-400/40 backdrop-blur-2xl flex flex-col items-center justify-center p-3 shadow-xl shadow-blue-500/25 group hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-lg group-hover:bg-blue-500/30 transition-all"></div>
                <Cpu className="w-7 h-7 text-cyan-300 relative z-10 mb-1" />
                <span className="text-[11px] font-bold text-white tracking-wider relative z-10">Study OS</span>
                <span className="text-[8px] text-cyan-200/70 font-mono relative z-10">Central Core</span>
              </div>

              {/* Orbiting Component Nodes */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 sm:pt-6 relative z-10">
                
                {/* Knowledge Base */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 rounded-xl p-3 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:scale-110 transition-transform">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-0.5">Knowledge Base</h4>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Curriculum materials, syllabi & notes.
                  </p>
                </div>

                {/* Memory Engine */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-xl p-3 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-0.5">Memory Engine</h4>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Active recall & spaced repetition.
                  </p>
                </div>

                {/* Research Assistant */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 rounded-xl p-3 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-semibold text-white mb-0.5">Research Assistant</h4>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    AI SOMA Mentor & assessment prep.
                  </p>
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
