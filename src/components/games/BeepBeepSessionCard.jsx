import React from 'react';
import { Clock, Star, Heart, Target, Compass, Gauge, Activity, Timer, Repeat, TrendingDown, Brain, Map } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import moment from 'moment';

import MetricBox from './MetricBox';
const pct = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
const ms = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v)}ms`);
const s = (v) => (v == null || isNaN(v) ? '—' : `${v.toFixed(1)}s`);

/**
 * BeepBeepSessionCard — renders the executive-function telemetry from a Beep
 * Beep session: planning efficiency, optimal-move rate, deepest solved,
 * latency, reversals, resets, and the move-error profile.
 */
export default function BeepBeepSessionCard({ g }) {
  const m = g.metrics || {};

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 shrink-0">
          <Compass className="w-5 h-5 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
          <p className="text-xs text-muted-foreground">
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {s(g.duration_seconds)}
            {m.exit_side && <span className="capitalize"> · exit {m.exit_side}</span>}
            {m.palette_band && <span className="capitalize"> · {m.palette_band}</span>}
            {m.difficulty_level && <span> · Diff {m.difficulty_level}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-yellow-500"><Star className="w-4 h-4" /> {g.score || 0}</span>
          <StatusBadge status={g.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Clock} label="Duration" value={s(g.duration_seconds)} />
        <MetricBox icon={Star} label="Score" value={g.score || 0} color="text-yellow-500" />
        <MetricBox icon={Target} label="Lots Cleared" value={g.levels_completed ?? 0} color="text-primary" />
        <MetricBox icon={Heart} label="Lives Left" value={g.lives_remaining ?? 0} color="text-red-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Gauge} label="Planning Efficiency" value={pct(m.planning_efficiency)} color="text-primary" />
        <MetricBox icon={Compass} label="Deepest Solved" value={`${m.deepest_optimal_solved ?? 0} mv`} color="text-primary" />
        <MetricBox icon={Activity} label="Optimal Move Rate" value={pct(m.optimal_move_rate)} />
        <MetricBox icon={TrendingDown} label="Regressive Rate" value={pct(m.regressive_move_rate)} color="text-red-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Repeat} label="Longest Plan Run" value={m.longest_plan_run ?? 0} color="text-amber-500" />
        <MetricBox icon={Timer} label="First-move Latency" value={ms(m.avg_first_move_latency_ms)} />
        <MetricBox icon={Timer} label="Avg per Move" value={s(m.avg_seconds_per_move)} />
        <MetricBox icon={Brain} label="Hints Used" value={m.hints_used ?? 0} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Activity} label="Reversals" value={m.total_reversals ?? 0} />
        <MetricBox icon={Repeat} label="Undos" value={m.total_undos ?? 0} />
        <MetricBox icon={Repeat} label="Resets" value={m.total_resets ?? 0} />
        <MetricBox icon={Map} label="Highest Grid" value={`${m.highest_grid_size ?? 0}×${m.highest_grid_size ?? 0}`} />
      </div>

      {(m.illegal_axis_drags > 0 || m.blocked_drags > 0) && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Rule comprehension: <span className="font-semibold text-red-500">{m.illegal_axis_drags || 0}</span> illegal-axis drags ·
            <span className="font-semibold text-amber-600"> {m.blocked_drags || 0}</span> blocked drags
          </p>
        </div>
      )}
    </div>
  );
}