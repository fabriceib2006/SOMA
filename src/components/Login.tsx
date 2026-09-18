import React, { useState } from 'react';
import { googleSignIn } from '../lib/auth';

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
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center space-y-6">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-2xl">S</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">Sign in to SOMA</h1>
        <p className="text-neutral-500 text-center text-sm">
          Your personal academic intelligence engine.
        </p>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 text-neutral-700 font-semibold py-3 px-4 rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        {errorMessage && (
          <div className="w-full p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl leading-relaxed">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
