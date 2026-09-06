import React from 'react';
import { Clock, Star, Target, Heart, Gauge, Activity, Zap, ShieldAlert, MoveHorizontal } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import moment from 'moment';
import MetricBox from './MetricBox';

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}
function fmtMs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v)}ms`;
}
function fmtSecs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toFixed(1)}s`;
}

/**
 * TunnelRushSessionCard — full telemetry for one Tunnel Rush session, shown
 * in the session drawer / compare view. Every MetricBox label matches the
 * 'tunnel-rush' entry in metricRegistry.js, so each box opens its 30-day
 * running-best trend.
 */
export default function TunnelRushSessionCard({ g }) {
  const m = g.metrics || {};
  const s = m.summary || {};
  const c = m.config || {};

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-50 shrink-0">🌀</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">Tunnel Rush</p>
          <p className="text-xs text-muted-foreground">
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {fmtSecs(g.duration_seconds)}
            {c.difficulty && <span className="capitalize"> · {c.difficulty}</span>}
            {c.lanes && <span> · {c.lanes} lanes</span>}
            {c.direction && c.direction !== 'none' && <span className="uppercase"> · spin {c.direction}</span>}
            {c.objectType && <span className="capitalize"> · {c.objectType.replace(/([A-Z])/g, ' $1')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-yellow-500">
            <Star className="w-4 h-4" /> {g.score || 0}
          </span>
          <StatusBadge status={g.status} />
        </div>
      </div>

      {/* Core stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Clock} label="Duration" value={fmtSecs(g.duration_seconds)} />
        <MetricBox icon={Star} label="Score" value={g.score || 0} color="text-yellow-500" />
        <MetricBox icon={Target} label="Level Reached" value={g.highest_level ?? 1} color="text-primary" />
        <MetricBox icon={Heart} label="Lives Left" value={g.lives_remaining ?? 0} color="text-red-500" />
      </div>

      {/* Gate performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Gauge} label="Accuracy" value={fmtPct(s.accuracy)} color="text-primary" />
        <MetricBox icon={ShieldAlert} label="Hit Rate" value={fmtPct(s.hitRate)} color="text-red-500" />
        <MetricBox icon={Zap} label="Dodges" value={s.dodges ?? 0} color="text-emerald-600" />
        <MetricBox icon={Activity} label="Gates" value={s.gates ?? 0} />
      </div>

      {/* Reaction times */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Activity} label="Avg Reaction" value={fmtMs(s.avgReactionMs)} />
        <MetricBox icon={Activity} label="Median RT" value={fmtMs(s.medianReactionMs)} />
        <MetricBox icon={MoveHorizontal} label="Rotations" value={s.rotations ?? 0} />
        <MetricBox icon={Zap} label="Best Streak" value={s.bestStreak ?? 0} color="text-amber-500" />
      </div>

      {/* Attention flag */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <MetricBox icon={ShieldAlert} label="No-Move Rate" value={fmtPct(s.noMoveRate)} color="text-amber-600" />
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
        Reaction time = from gate spawn to the patient's last rotation before it arrived; null (never moved) feeds the No-Move Rate.
      </p>
    </div>
  );
}