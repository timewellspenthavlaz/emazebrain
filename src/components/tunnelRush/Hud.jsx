import React from 'react';
import { Heart } from 'lucide-react';

const DISPLAY = "'Space Grotesk', sans-serif";

const POS_CLASS = {
  'top-left': 'top-3 left-3',
  'top-center': 'top-3 left-1/2 -translate-x-1/2',
  'top-right': 'top-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-center': 'bottom-3 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-3 right-3',
  center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
};

/**
 * Hud — the floating top rail: score + lives + level badge, with the session
 * countdown timer docked in its configured corner (default top-right).
 */
export default function Hud({
  score, lives, livesOn, level, timeLeft, showTime, timerPosition,
  showScore, colors, started, demo,
}) {
  const glass = {
    background: 'rgba(18,24,38,0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${colors.accent}26`,
  };

  return (
    <>
      {/* Top rail: score left, lives + level right */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-2 p-3 pointer-events-none">
        {showScore && (
          <div className="px-4 py-2 rounded-xl" style={glass}>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: colors.muted, fontFamily: DISPLAY }}>
              Score
            </p>
            <p className="text-2xl sm:text-4xl font-bold leading-none tabular-nums" style={{ color: colors.text, fontFamily: DISPLAY }}>
              {score}
            </p>
          </div>
        )}
        <div className="flex items-center gap-2">
          {livesOn && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={glass}>
              {Array.from({ length: Math.max(lives, 0) }, (_, i) => (
                <Heart key={i} className="w-4 h-4 sm:w-5 sm:h-5" fill={colors.accent} stroke={colors.accent} />
              ))}
            </div>
          )}
          <div className="px-3 py-2 rounded-xl text-center" style={glass}>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: colors.muted, fontFamily: DISPLAY }}>
              Level
            </p>
            <p className="text-base sm:text-xl font-bold leading-none tabular-nums" style={{ color: colors.text, fontFamily: DISPLAY }}>
              {level}
            </p>
          </div>
          {demo && (
            <div className="px-3 py-2 rounded-xl" style={glass}>
              <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: colors.alert, fontFamily: DISPLAY }}>Demo</p>
            </div>
          )}
        </div>
      </div>

      {/* Countdown timer — docked per timerPosition (default top-right) */}
      {showTime && timerPosition !== 'none' && (
        <div className={`absolute z-30 pointer-events-none ${POS_CLASS[timerPosition] || POS_CLASS['top-right']}`}>
          <div className="px-4 py-2 rounded-xl" style={{ ...glass, borderColor: `${timeLeft <= 10 ? colors.hit : colors.accent}44` }}>
            <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: colors.muted, fontFamily: DISPLAY }}>
              {started ? 'Time' : 'Ready'}
            </p>
            <p
              className="text-2xl sm:text-[32px] font-bold leading-none tabular-nums"
              style={{ color: timeLeft <= 10 ? colors.hit : colors.text, fontFamily: DISPLAY }}
            >
              {Math.max(0, timeLeft)}
              <span className="text-base sm:text-xl" style={{ color: colors.muted }}>s</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}