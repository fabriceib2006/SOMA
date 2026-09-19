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
    <div className="min-h-screen w-full bg-[#0A0E17] text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden selection:bg-blue-500/30">
      
      {/* Background Neural-Network & Synapse Atmospheric Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0a0e17" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Ambient Glows */}
          <circle cx="10%" cy="20%" r="350" fill="url(#glow)" />
          <circle cx="90%" cy="80%" r="400" fill="url(#glow)" />

          {/* Synapse Network Paths */}
          <g stroke="url(#lineGrad)" strokeWidth="1" fill="none">
            <path d="M 50 100 Q 300 200 600 150 T 1100 300" />
            <path d="M 100 600 Q 400 400 700 700 T 1300 500" />
            <path d="M 200 300 Q 500 600 900 400 T 1400 200" />
            <path d="M 0 400 Q 300 500 600 300 T 1200 700" />
          </g>

          {/* Glowing Neural Nodes */}
          <g fill="#3b82f6" opacity="0.6">
            <circle cx="150" cy="180" r="3" className="animate-pulse" />
            <circle cx="580" cy="160" r="2.5" />
            <circle cx="850" cy="320" r="3.5" className="animate-pulse" />
            <circle cx="350" cy="520" r="2" />
            <circle cx="950" cy="650" r="3" className="animate-pulse" />
            <circle cx="1150" cy="280" r="2.5" />
          </g>
        </svg>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center space-y-8 lg:space-y-12">
        
        {/* SOMA Brand Header */}
        <header className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-[0.2em] font-normal text-white">
            SOMA
          </h1>
          <p className="text-xs sm:text-sm font-light tracking-[0.25em] text-neutral-400 uppercase">
            Personal Academic Operating System
          </p>
        </header>

        {/* Two-Column Cinematic Grid */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Left Panel — Sign In Glassmorphism Card */}
          <div className="lg:col-span-5 bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/50 flex flex-col justify-between relative overflow-hidden group">
            {/* Subtle top light refraction */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

            <div className="space-y-6">
              {/* SOMA Intelligence Crystal Emblem */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent border border-blue-400/30 flex items-center justify-center relative shadow-lg shadow-blue-500/10">
                <div className="absolute inset-0 rounded-2xl bg-blue-500/10 blur-md"></div>
                <div className="relative z-10 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-7 h-7 animate-spin-slow" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Sign in to SOMA
                </h2>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Your personal academic intelligence engine.
                </p>
              </div>
            </div>

            <div className="space-y-6 pt-8">
              {errorMessage && (
                <div className="p-3.5 bg-red-950/60 border border-red-500/30 text-red-200 text-xs rounded-2xl leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full group/btn relative overflow-hidden rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 hover:border-blue-400/50 text-white font-medium py-3.5 px-6 transition-all duration-300 shadow-xl shadow-black/20 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 relative z-10" />
                <span className="relative z-10 text-sm tracking-wide font-medium">
                  {loading ? 'Initializing Neural Session...' : 'Sign in with Google'}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Secure Academic Authentication & Cloud Sync</span>
              </div>
            </div>
          </div>

          {/* Right Panel — SOMA Intelligence Preview / Ecosystem Visualization */}
          <div className="lg:col-span-7 bg-neutral-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/40 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></div>
                <span className="text-xs uppercase tracking-widest font-semibold text-cyan-400">
                  Neural Architecture Active
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">v4.8 OS Core</span>
            </div>

            {/* Central Study OS Ecosystem Graphic / Nodes */}
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center relative">
              
              {/* Connecting SVG Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 4" />
                <line x1="50%" y1="50%" x2="50%" y2="85%" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>

              {/* Central Study OS Hub */}
              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-blue-600/30 to-indigo-900/50 border border-blue-400/40 backdrop-blur-xl flex flex-col items-center justify-center p-4 shadow-2xl shadow-blue-500/20 group hover:scale-105 transition-transform duration-500">
                <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl group-hover:bg-blue-500/30 transition-all"></div>
                <Cpu className="w-8 h-8 text-cyan-300 relative z-10 mb-1" />
                <span className="text-xs font-bold text-white tracking-wider relative z-10">Study OS</span>
                <span className="text-[9px] text-cyan-200/70 font-mono relative z-10">Central Core</span>
              </div>

              {/* Orbiting Component Nodes */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 relative z-10">
                
                {/* Knowledge Base */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 rounded-2xl p-4 transition-all duration-300 group">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">Knowledge Base</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Curriculum materials, syllabi, lecture folders & notes.
                  </p>
                </div>

                {/* Memory Engine */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/40 rounded-2xl p-4 transition-all duration-300 group">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">Memory Engine</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Active recall, mastery tracking & spaced repetition.
                  </p>
                </div>

                {/* Research Assistant */}
                <div className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 rounded-2xl p-4 transition-all duration-300 group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                    <Search className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">Research Assistant</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    AI SOMA Mentor & intelligent assessment preparation.
                  </p>
                </div>

              </div>

            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>Status: Operational</span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span>Explore Ecosystem</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
