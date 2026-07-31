import React from 'react';

// Circular progress + countdown ring.
function ProgressArc({ done, total, countdown }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  const prog = total > 0 ? Math.min(1, done / total) : 0;
  const cd = countdown && countdown.total > 0 ? countdown.remaining / countdown.total : 0;
  return (
    <div className="relative" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
        <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={3} />
        {countdown && (
          <circle cx={32} cy={32} r={R + 6} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={2}
            strokeDasharray={2 * Math.PI * (R + 6)} strokeDashoffset={2 * Math.PI * (R + 6) * (1 - cd)} strokeLinecap="round" />
        )}
        <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={3}
          strokeDasharray={C} strokeDashoffset={C * (1 - prog)} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

/**
 * HUD — progress arc, countdown ring, segment label, demo badge.
 * Rule display is handled by the RuleModal (central card + corner "?" pill).
 * All chrome is achromatic; the eight hues are reserved for sphere tokens.
 */
export default function Hud({ progress, countdown, demo, chrome, segmentLabel }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-start justify-end gap-3 px-4 pt-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3">
        {demo && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
            Demo — Not recorded
          </span>
        )}
        {segmentLabel && (
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: `${chrome}99` }}>
            {segmentLabel}
          </span>
        )}
        <ProgressArc done={progress.done} total={progress.total} countdown={countdown} />
      </div>
    </div>
  );
}