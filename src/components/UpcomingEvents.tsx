import React from 'react';
import { useSOMA } from '../lib/realtime';

export const UpcomingEvents: React.FC = () => {
  const { externalEvents } = useSOMA();

  // Filter to upcoming only and sort
  const now = new Date();
  const upcoming = [...externalEvents]
    .filter(e => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);

  if (upcoming.length === 0) return null;

  return (
    <section id="upcoming-events" className="rounded-2xl bg-white p-6 shadow-sm border border-neutral-100 mt-6">
      <h2 className="text-lg font-semibold text-neutral-900">📅 External Commitments</h2>
      <p className="text-xs text-neutral-500 mb-4 mt-1">Synced from Google Calendar</p>
      <ul className="space-y-3">
        {upcoming.map((event) => {
          const startDate = new Date(event.start);
          const timeString = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateString = startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
          return (
            <li key={event.id} className="flex gap-3 items-start border-l-2 border-blue-200 pl-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">{event.title}</p>
                <p className="text-xs text-neutral-500">{dateString} at {timeString}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
