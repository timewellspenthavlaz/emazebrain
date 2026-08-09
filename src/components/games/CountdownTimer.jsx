import React from 'react';

export default function CountdownTimer({ type, timeLeft, totalTime, topPct = 34 }) {
  if (!type || type === 'none' || !totalTime || totalTime <= 0) return null;
  const lineStyle = { top: `${topPct}%` };

  if (type === 'right') {
    const percent = Math.max(0, (timeLeft / totalTime) * 100);
    return (
      <div className="absolute left-10 z-20 -translate-y-1/2" style={{ ...lineStyle, width: '20%' }}>
        <div
          className="relative h-5 rounded-md overflow-hidden border-2 border-slate-600/80"
          style={{
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)',
            background: 'rgba(15,23,42,0.7)',
          }}
        >
          <div
            className="h-full rounded-sm transition-all duration-1000 ease-linear"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(180deg, #a5f3fc 0%, #38bdf8 30%, #3b82f6 70%, #1e3a8a 100%)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.4)',
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-1/3 rounded-t-sm pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }}
          />
        </div>
      </div>
    );
  }

  if (type === 'left') {
    return (
      <div className="absolute right-10 z-20 -translate-y-1/2" style={lineStyle}>
        <div
          className="text-4xl font-black tabular-nums leading-none"
          style={{
            background: 'linear-gradient(180deg, #fef08a 0%, #fb923c 40%, #ef4444 80%, #991b1b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(2px 3px 1px rgba(0,0,0,0.6))',
          }}
        >
          {timeLeft}
          <span className="text-2xl">s</span>
        </div>
      </div>
    );
  }

  return null;
}