import React from 'react';
import { Clock, Star, Heart, Target, Brain, Layers, Gauge, Repeat, Compass, Activity, ShieldCheck, AlertTriangle, MapPin } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import moment from 'moment';

import MetricBox from './MetricBox';
function fmt(v, suffix = '') {
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—';
  return typeof v === 'number' ? `${Math.round(v * 100) / 100}${suffix}` : `${v}`;
}
function pct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

/**
 * PeekPeekSessionCard — renders the object-location memory telemetry: primary
 * first-round misses, the within/between/novel error split, latency, strategy,
 * laterality on symmetric probe levels, and the face-up control trial. Leads
 * with first-round misses and first-try accuracy, never score.
 */
export default function PeekPeekSessionCard({ g }) {
  const m = g.metrics || {};
  const lh = g.level_history || [];
  const probeCount = m.probe_count || 0;

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 shrink-0">
          <Brain className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
          <p className="text-xs text-muted-foreground">
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {fmt(g.duration_seconds, 's')}
            {m.difficulty_level && <span> · Diff {m.difficulty_level}</span>}
            {m.pack && <span className="capitalize"> · {m.pack}</span>}
            {m.br && <span className="capitalize"> · {m.br} br</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-semibold text-yellow-500">
            <Star className="w-4 h-4" /> {g.score || 0}
          </span>
          <StatusBadge status={g.status} />
        </div>
      </div>

      {/* Core */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Clock} label="Duration" value={fmt(g.duration_seconds, 's')} />
        <MetricBox icon={Star} label="Score" value={g.score || 0} color="text-yellow-500" />
        <MetricBox icon={Layers} label="Levels" value={`${g.levels_completed ?? 0}/${g.highest_level ?? 0}`} color="text-primary" />
        <MetricBox icon={Heart} label="Lives Left" value={m.lives_remaining == null ? '∞' : m.lives_remaining} color="text-red-500" />
      </div>

      {/* Primary clinical outcomes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Target} label="First-Round Misses" value={fmt(m.first_round_misses_mean)} color="text-rose-600" />
        <MetricBox icon={Gauge} label="First-Try Accuracy" value={pct(m.first_attempt_accuracy_ex_final)} color="text-emerald-600" />
        <MetricBox icon={Repeat} label="Learning Slope" value={m.learning_slope == null ? '—' : fmt(m.learning_slope)} />
        <MetricBox icon={Target} label="Novel Hex Errors" value={fmt(m.novel_hex_errors)} color="text-rose-500" />
      </div>

      {/* Error taxonomy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Activity} label="Within-Search Err" value={fmt(m.within_search_errors)} />
        <MetricBox icon={Activity} label="Between-Search Err" value={fmt(m.between_search_errors)} />
        <MetricBox icon={Repeat} label="Perseveration Rate" value={pct(m.perseveration_rate)} />
        <MetricBox icon={Gauge} label="Capacity Est." value={fmt(m.capacity_estimate)} />
      </div>

      {/* Latency & strategy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Clock} label="Avg First Tap" value={fmt(m.avg_first_tap_latency_ms, 'ms')} />
        <MetricBox icon={Clock} label="Inter-Tap Slope" value={fmt(m.inter_tap_slope_ms, 'ms')} />
        <MetricBox icon={Compass} label="Adjacency Ratio" value={pct(m.adjacency_ratio)} />
        <MetricBox icon={Compass} label="Search Org." value={pct(m.search_organisation)} color="text-primary" />
      </div>

      {/* Laterality — only when probe levels exist */}
      {probeCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <MetricBox icon={MapPin} label="Find-Order Index" value={fmt(m.find_order_index)} />
          <MetricBox icon={MapPin} label="Mean First-Tap X" value={fmt(m.mean_first_tap_x)} />
          <MetricBox icon={MapPin} label="Persev. Asymmetry" value={fmt(m.perseveration_asymmetry)} />
          <MetricBox icon={MapPin} label={`Probes (${probeCount})`} value={m.probe_levels_used?.join(', ') || '—'} />
        </div>
      )}

      {/* Control trial */}
      {m.control_trial_completed && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          <MetricBox icon={ShieldCheck} label="Control: Find-Order" value={fmt(m.control_find_order_index)} />
          <MetricBox icon={ShieldCheck} label="Control: First-Tap X" value={fmt(m.control_mean_first_tap_x)} />
          <MetricBox icon={ShieldCheck} label="Control: Latency Asym" value={fmt(m.control_first_tap_latency_asymmetry_ms, 'ms')} />
        </div>
      )}

      {/* Data quality flags */}
      {(m.floor_flag || m.ceiling_flag) && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          {m.floor_flag ? 'Floor flag — early-level data; later metrics preliminary.' : 'Ceiling — all levels cleared with no misses.'}
        </div>
      )}

      {/* Per-level breakdown */}
      {lh.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Level Breakdown</p>
          <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin">
            {lh.map((l, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/20 text-[11px]">
                <span className={`px-1.5 py-0.5 rounded font-bold shrink-0 ${l.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  L{l.level}
                </span>
                <span className="text-muted-foreground">T{l.total_hexes} · K{l.distinct_pictures} · A{fmt(l.realised_adjacency)}</span>
                <span className="ml-auto flex gap-2 text-muted-foreground">
                  <span>💔 {l.hearts_lost}</span>
                  <span>⏱ {fmt(l.duration_seconds, 's')}</span>
                  <span>⭐ {l.score_earned || 0}</span>
                  {l.is_symmetric_probe && <span className="text-indigo-600">probe</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        Budgets model-derived (λ=2.5, not pilot-fitted). Art placeholder pending commission.
      </p>
    </div>
  );
}