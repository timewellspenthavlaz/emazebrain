import React from 'react';
import { Star, Pin, PinOff } from 'lucide-react';
import moment from 'moment';
import { keyMetricFor, GAME_META } from './gameMatrixHelpers';

/**
 * SessionTile — a compact execution tile inside a game row.
 * Shows date, score badge, and one headline metric. Supports selected + pinned
 * states and a pin/compare toggle.
 */
export default function SessionTile({ session, index, selected, pinned, onSelect, onTogglePin, pinDisabled }) {
  const km = keyMetricFor(session);
  const meta = GAME_META[session.game_id] || { icon: '🎮' };
  const date = moment(session.session_date || session.created_date);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative shrink-0 w-[168px] text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : pinned
          ? 'border-amber-400 bg-amber-50 hover:bg-amber-100'
          : 'border-border bg-card hover:bg-muted/40 hover:border-primary/40'
      }`}
    >
      {/* index + pin */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground">#{index + 1}</span>
        <span
          role="checkbox"
          aria-checked={pinned}
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); if (!pinDisabled) onTogglePin(); }}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !pinDisabled) { e.preventDefault(); e.stopPropagation(); onTogglePin(); } }}
          className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${
            pinDisabled && !pinned ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-black/5'
          }`}
          title={pinned ? 'Unpin' : 'Pin to compare'}
        >
          {pinned ? <PinOff className="w-3.5 h-3.5 text-amber-600" /> : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-sm">{meta.icon}</span>
        <span className="text-xs font-medium text-muted-foreground truncate">
          {date.format('MMM D')}
        </span>
        <span className="text-[10px] text-muted-foreground/70">{date.format('HH:mm')}</span>
      </div>

      <div className="flex items-center gap-1 mb-1">
        <Star className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-lg font-bold leading-none text-foreground">{session.score || 0}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">score</span>
      </div>

      <div className="pt-1.5 border-t border-border/60">
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{km.label}</p>
        <p className="text-sm font-semibold text-foreground">{km.value}</p>
      </div>
    </button>
  );
}