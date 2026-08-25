import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GAME_META } from './gameMatrixHelpers';
import SessionTile from './SessionTile';
import Sparkline from './Sparkline';

/**
 * GameMatrixRow — one game: a sticky left label (icon + name + sparkline) and
 * a horizontally-scrollable strip of SessionTiles.
 */
export default function GameMatrixRow({
  row, selectedId, pinnedIds, onSelect, onTogglePin,
}) {
  const meta = GAME_META[row.gameId] || { label: row.gameId, icon: '🎮' };
  const scrollRef = useRef(null);
  const pinnedCount = pinnedIds.length;
  const pinDisabledFor = (id) => pinnedCount >= 2 && !pinnedIds.includes(id);

  const scrollBy = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  return (
    <div className="flex items-stretch border-b border-border last:border-b-0">
      {/* Sticky label column */}
      <div className="sticky left-0 z-10 w-[200px] shrink-0 bg-card border-r border-border p-3 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
            <span className="text-base">{meta.icon}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{meta.label}</p>
            <p className="text-[11px] text-muted-foreground">{row.sessions.length} run{row.sessions.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        {row.trend.length >= 2 && (
          <Sparkline data={row.trend} />
        )}
      </div>

      {/* Horizontal scroll strip */}
      <div className="relative flex-1 min-w-0">
        {row.sessions.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="absolute left-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-r from-card/90 to-transparent hover:from-card"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="absolute right-0 top-0 bottom-0 z-10 w-7 flex items-center justify-center bg-gradient-to-l from-card/90 to-transparent hover:from-card"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </>
        )}
        <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto scrollbar-thin px-2.5 py-3">
          {row.sessions.map((s, i) => (
            <SessionTile
              key={s.id}
              session={s}
              index={i}
              selected={selectedId === s.id}
              pinned={pinnedIds.includes(s.id)}
              pinDisabled={pinDisabledFor(s.id)}
              onSelect={() => onSelect(s)}
              onTogglePin={() => onTogglePin(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}