import React from 'react';
import { COLOR_TOKENS, tokenFill } from '@/lib/orbitalOrder/config';

// Small colour cue for a filter chip: token fill + chrome ring.
function ColourCue({ token, neon, chrome }) {
  const fill = tokenFill(token, neon);
  const r = 7;
  return (
    <svg width={r * 2 + 2} height={r * 2 + 2} viewBox={`${-(r + 1)} ${-(r + 1)} ${(r + 1) * 2} ${(r + 1) * 2}`}>
      <circle r={r} fill={fill} stroke={chrome} strokeWidth={1.5} />
    </svg>
  );
}

function Chip({ children, changed, accent }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
      style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent ? accent : 'rgba(255,255,255,0.14)'}` }}
    >
      {children}
      {changed && (
        <span className="block h-[2px] w-full rounded-full bg-amber-400 mt-1"
          style={{ animation: 'oo-underline 0.3s ease-out' }} />
      )}
    </span>
  );
}

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
 * HUD — glass slab rule banner, progress arc, countdown ring, peek control.
 * All chrome is achromatic; the eight hues are reserved for sphere tokens.
 */
export default function Hud({
  rule, labels, changedClauses = [], progress, countdown, ruleVisible, bannerVisible,
  onPeek, demo, chrome, neon, segmentLabel,
}) {
  const changed = (k) => changedClauses.includes(k);
  const filterToken = rule?.filter?.colors?.[0];

  return (
    <div className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between gap-3 px-4 pt-4 pointer-events-none">
      {/* Rule banner / peek pill */}
      <div className="pointer-events-auto">
        {bannerVisible ? (
          <div
            className="rounded-[22px] px-4 py-2.5 flex items-center gap-2.5 shadow-lg"
            style={{
              background: 'rgba(20,22,28,0.62)', backdropFilter: 'blur(14px)',
              border: `1px solid ${chrome}22`, color: chrome,
            }}
            aria-live="polite"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mr-1">Rule</span>
            <Chip changed={changed('traversal')}>{labels.traversal}</Chip>
            <span className="opacity-40">·</span>
            <Chip changed={changed('ordering')}>{labels.ordering}</Chip>
            {labels.filter && (
              <>
                <span className="opacity-40">·</span>
                <Chip changed={changed('filter')} accent={filterToken ? tokenFill(filterToken, neon) : undefined}>
                  {filterToken && <ColourCue token={filterToken} neon={neon} chrome={chrome} />}
                  {labels.filter}
                </Chip>
              </>
            )}
            {ruleVisible === 'onrequest' && (
              <button onClick={onPeek} className="ml-1 text-[10px] uppercase tracking-wide opacity-60 hover:opacity-100 px-2 py-1 rounded-md"
                style={{ border: `1px solid ${chrome}22` }}>
                hide
              </button>
            )}
          </div>
        ) : (
          ruleVisible === 'onrequest' && (
            <button onClick={onPeek}
              className="pointer-events-auto rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide shadow"
              style={{ background: 'rgba(20,22,28,0.62)', backdropFilter: 'blur(14px)', border: `1px solid ${chrome}22`, color: chrome }}>
              Rule ?
            </button>
          )
        )}
      </div>

      {/* Progress + segment + demo */}
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

      <style>{`@keyframes oo-underline { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </div>
  );
}