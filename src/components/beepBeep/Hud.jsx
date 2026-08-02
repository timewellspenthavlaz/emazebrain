import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Star, Undo2, Redo2, RotateCcw, Lightbulb, Infinity as InfinityIcon } from 'lucide-react';
import CountdownTimer from '@/components/games/CountdownTimer';

export default function Hud({
  level, maxLevel, lives, unlimited, score, streak, moves, budget,
  exitSide, bgName, paletteBand, difficulty, timeLeft, timeToPlay, countdownType,
  canUndo, canRedo, hintRung, hintEnabled,
  onUndo, onRedo, onReset, onHint,
}) {
  return (
    <>
      {/* top bar */}
      <div className="w-full flex items-center justify-between mb-2 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <a href="/games"><Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-neutral-800"><ArrowLeft className="w-4 h-4 mr-1" /> Exit</Button></a>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-white">
          <Stat label="Level" value={`${level}/${maxLevel}`} />
          <Stat label="Score" value={<span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" />{score}</span>} />
          <Stat label="Streak" value={streak} accent={streak > 1 ? 'text-amber-400' : ''} />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Lives</p>
            <div className="flex items-center gap-1 mt-0.5">
              {unlimited ? <InfinityIcon className="w-5 h-5 text-emerald-400" /> : [0, 1, 2].map((i) => (
                <Heart key={i} className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-neutral-700'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* tag row */}
      <div className="w-full mb-2 text-center shrink-0">
        <p className="text-xs text-neutral-500">
          Exit {exitSide === 'left' ? '←' : '→'} · Diff {difficulty}
          <span className="capitalize"> · {paletteBand}</span>
          {bgName && <span> · bg {bgName}</span>}
        </p>
      </div>

      {/* bottom control bar */}
      <div className="w-full flex items-center justify-center gap-2 mt-2 shrink-0 flex-wrap">
        <Button variant="outline" size="sm" disabled={!canUndo} onClick={onUndo} className="bg-neutral-900/60 border-neutral-700 text-neutral-200 hover:bg-neutral-800"><Undo2 className="w-4 h-4" /> Undo</Button>
        <Button variant="outline" size="sm" disabled={!canRedo} onClick={onRedo} className="bg-neutral-900/60 border-neutral-700 text-neutral-200 hover:bg-neutral-800"><Redo2 className="w-4 h-4" /> Redo</Button>
        <Button variant="outline" size="sm" onClick={onReset} className="bg-neutral-900/60 border-neutral-700 text-neutral-200 hover:bg-neutral-800"><RotateCcw className="w-4 h-4" /> Reset</Button>
        {hintEnabled && (
          <Button variant="outline" size="sm" onClick={onHint} className="bg-neutral-900/60 border-neutral-700 text-amber-300 hover:bg-neutral-800">
            <Lightbulb className="w-4 h-4" /> Hint{hintRung > 0 ? ` ${hintRung}/4` : ''}
          </Button>
        )}
        <div className="px-3 py-1.5 rounded-md bg-neutral-900/60 border border-neutral-700 text-neutral-200 text-sm">
          Moves <span className="font-bold text-white">{moves}</span> / {budget}
        </div>
        {countdownType !== 'none' && timeToPlay > 0 && (
          <CountdownTimer type={countdownType} timeLeft={timeLeft} totalTime={timeToPlay} />
        )}
      </div>
    </>
  );
}

function Stat({ label, value, accent = '' }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`text-base font-bold text-white ${accent}`}>{value}</p>
    </div>
  );
}