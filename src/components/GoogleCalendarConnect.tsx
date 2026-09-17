import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, RefreshCw, XCircle, Settings } from 'lucide-react';
import { getAccessToken, googleSignIn, logout } from '../lib/auth';
import { useSOMA } from '../lib/realtime';
import { syncGoogleEventsToSOMA } from '../lib/calendarSync';
import { CalendarSyncMode } from '../lib/calendarPolicy';
import { checkCloudCalendarConnection, setCloudCalendarConnection } from '../lib/calendarConnectionFirestore';

export function GoogleCalendarConnect() {
  const { user } = useSOMA();
  const [syncMode, setSyncMode] = useState<CalendarSyncMode>(() => {
    return (localStorage.getItem('soma_calendar_sync_mode') as CalendarSyncMode) || 'essential';
  });

  useEffect(() => {
    localStorage.setItem('soma_calendar_sync_mode', syncMode);
  }, [syncMode]);

  const syncGoogleCalendar = async () => {
    if (user) await syncGoogleEventsToSOMA(user.uid);
  };
  const [connected, setConnected] = useState(() => {
    return localStorage.getItem('soma_gcal_connected') === 'true' || !!getAccessToken();
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    checkCloudCalendarConnection(user.uid).then(isCloudConnected => {
      if (isMounted && isCloudConnected) {
        setConnected(true);
        localStorage.setItem('soma_gcal_connected', 'true');
      }
    });
    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    if (getAccessToken()) {
      setConnected(true);
      localStorage.setItem('soma_gcal_connected', 'true');
      if (user) {
        setCloudCalendarConnection(user.uid, true);
      }
    }
  }, [user]);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      localStorage.setItem('soma_gcal_connected', 'true');
      setConnected(true);
      if (res?.user) {
        await setCloudCalendarConnection(res.user.uid, true);
        await syncGoogleEventsToSOMA(res.user.uid);
      } else if (user) {
        await setCloudCalendarConnection(user.uid, true);
        await syncGoogleCalendar();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!getAccessToken()) {
        const res = await googleSignIn();
        localStorage.setItem('soma_gcal_connected', 'true');
        setConnected(true);
        if (res?.user) {
          await setCloudCalendarConnection(res.user.uid, true);
        } else if (user) {
          await setCloudCalendarConnection(user.uid, true);
        }
      }
      await syncGoogleCalendar();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sync');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    localStorage.removeItem('soma_gcal_connected');
    if (user) {
      await setCloudCalendarConnection(user.uid, false);
    }
    await logout();
    setConnected(false);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-neutral-900 text-lg">Google Calendar Sync</h3>
        </div>
        {connected && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Connected
          </span>
        )}
      </div>

      <p className="text-sm text-neutral-600">
        Connect your calendar so SOMA places important academic commitments and high-risk sessions around your schedule.
      </p>

      {/* Sync Mode Selection */}
      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
          <Settings className="w-3 h-3" /> Synchronization Policy
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setSyncMode('essential')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              syncMode === 'essential' 
                ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100' 
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="text-xs font-bold">Essential</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Exams, CATs, & High-Risk</div>
          </button>
          <button
            type="button"
            onClick={() => setSyncMode('academic')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              syncMode === 'academic' 
                ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100' 
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="text-xs font-bold">Academic</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Essential + Timetable</div>
          </button>
          <button
            type="button"
            onClick={() => setSyncMode('full')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              syncMode === 'full' 
                ? 'bg-blue-50 border-blue-200 text-blue-900 ring-1 ring-blue-100' 
                : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <div className="text-xs font-bold">Full</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">All SOMA academic events</div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {connected ? (
        <div className="flex gap-3 pt-2">
          <button 
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
          <button 
            onClick={handleDisconnect}
            className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 text-neutral-700 font-semibold py-3 px-4 rounded-xl hover:bg-neutral-50 transition-colors shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          {loading ? 'Connecting...' : 'Connect Google Calendar'}
        </button>
      )}
    </div>
  );
}
