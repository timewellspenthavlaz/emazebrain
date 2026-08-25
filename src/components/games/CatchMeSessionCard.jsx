import React from 'react';
import { Clock, Star, Heart, Target, Eye, Zap, TrendingDown, Activity, Gauge } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import moment from 'moment';

import MetricBox from './MetricBox';

function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

function formatMs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v)}ms`;
}

function formatSecs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toFixed(1)}s`;
}

function formatDeltaE(v) {
  if (v == null || isNaN(v)) return '—';
  return `ΔE ${v.toFixed(1)}`;
}

export default function CatchMeSessionCard({ g }) {
  const m = g.metrics || {};
  const q = m.quadrant_accuracy || {};

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-50 shrink-0">
          <Eye className="w-5 h-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
          <p className="text-xs text-muted-foreground">
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {formatSecs(g.duration_seconds)}
            {m.palette_band && <span className="capitalize"> · {m.palette_band} palette</span>}
            {m.orientation && <span className="capitalize"> · {m.orientation} companion</span>}
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
        <MetricBox icon={Clock} label="Duration" value={formatSecs(g.duration_seconds)} />
        <MetricBox icon={Star} label="Score" value={g.score || 0} color="text-yellow-500" />
        <MetricBox icon={Target} label="Highest Level" value={`${g.highest_level || 0}/9`} color="text-primary" />
        <MetricBox icon={Heart} label="Lives Left" value={g.lives_remaining ?? 0} color="text-red-500" />
      </div>

      {/* Perceptual metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Gauge} label="Accuracy" value={formatPct(m.accuracy_rate)} color="text-primary" />
        <MetricBox icon={Activity} label="Avg Reaction" value={formatMs(m.avg_reaction_time_ms)} />
        <MetricBox icon={Zap} label="Best Streak" value={m.best_streak ?? 0} color="text-amber-500" />
        <MetricBox icon={Eye} label="Final JND" value={formatDeltaE(m.final_jnd)} color="text-cyan-600" />
      </div>

      {/* Selection metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Target} label="Correct" value={m.correct_selections ?? 0} color="text-green-600" />
        <MetricBox icon={TrendingDown} label="Wrong" value={m.wrong_selections ?? 0} color="text-red-500" />
        <MetricBox icon={Target} label="Levels Cleared" value={g.levels_completed ?? 0} />
        <MetricBox icon={Activity} label="Total Stages" value={m.stage_count ?? 0} />
      </div>

      {/* Side / attention metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Eye} label="Left Accuracy" value={formatPct(m.left_side_accuracy)} />
        <MetricBox icon={Eye} label="Right Accuracy" value={formatPct(m.right_side_accuracy)} />
        <MetricBox icon={Activity} label="Left Avg RT" value={formatMs(m.left_side_avg_rt_ms)} />
        <MetricBox icon={Activity} label="Right Avg RT" value={formatMs(m.right_side_avg_rt_ms)} />
      </div>

      {/* Quadrant accuracy */}
      {q && (q.q1 || q.q2 || q.q3 || q.q4) ? (
        <div className="mt-2 mb-2">
          <p className="text-xs text-muted-foreground mb-1">Quadrant Accuracy</p>
          <div className="flex flex-wrap gap-1.5">
            {['q1', 'q2', 'q3', 'q4'].map((key, i) => (
              <span key={key} className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 capitalize">
                {key.toUpperCase()}: {formatPct(q[key])}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Anchor-first (attentional bias) */}
      {m.anchor_first_rate != null && m.anchor_first_rate > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Anchor-grid-first on dual stages: <span className="font-semibold text-foreground">{formatPct(m.anchor_first_rate)}</span>
          </p>
        </div>
      )}
    </div>
  );
}