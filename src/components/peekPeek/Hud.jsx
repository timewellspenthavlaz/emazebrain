import React from 'react';
import { Heart, HeartOff, Shield, Layers, Timer, Sparkles } from 'lucide-react';

/**
 * Hud — top bar: level/maxLevel + pack, hearts (per-level miss budget), lives,
 * score. The session countdown is rendered separately (CountdownTimer overlay).
 */
export default function Hud({
  level, maxLevel, lives, unlimited, score, hearts, heartBudget,
  pack, paletteBand, studyLeft, phase,
}) {
  const heartList = Array.from({ length: Math.max(1, heartBudget || 0) }, (_, i) => i < hearts);
  const bandLabel = paletteBand === 'cold' ? 'Cold' : paletteBand === 'warm' ? 'Warm' : 'Neutral';

  return (
    <div className="w-full max-w-2xl flex items-center justify-between gap-2 px-1 py-2 text-white">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
          <Layers className="w-3.5 h-3.5 text-cyan-300" />
          <span className="text-xs font-semibold">L{level}</span>
          <span className="text-[10px] opacity-60">/ {maxLevel}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm capitalize">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-xs font-medium">{pack}</span>
          <span className="text-[10px] opacity-50">· {bandLabel}</span>
        </div>
      </div>

      {/* hearts (per-level miss budget) */}
      <div className="flex items-center gap-0.5">
        {heartList.map((on, i) => (
          <Heart
            key={i}
            className={`w-4 h-4 ${on ? 'text-rose-400 fill-rose-400' : 'text-white/25'}`}
            strokeWidth={on ? 0 : 2}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {!unlimited && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm">
            <Shield className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-semibold">{lives}</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 backdrop-blur-sm">
          <span className="text-xs font-bold text-amber-300">{score}</span>
        </div>
      </div>

      {phase === 'study' && studyLeft > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 top-12 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white text-xs">
          <Timer className="w-3.5 h-3.5 text-cyan-300" /> Memorise · {studyLeft.toFixed(1)}s
        </div>
      )}
    </div>
  );
}