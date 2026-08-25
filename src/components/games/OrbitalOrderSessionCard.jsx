import React from 'react';
import { Clock, Star, Heart, Target, Brain, Activity, Zap, TrendingDown, Gauge, Timer, Repeat, ShieldAlert, Compass } from 'lucide-react';
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
function formatNum(v, suffix = '') {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v)}${suffix}`;
}

/**
 * OrbitalOrderSessionCard — renders the rich cognitive telemetry collected by
 * the Orbital Order engine: accuracy, chain completion, latencies, planning
 * ratio, rule-switch cost, inhibition index, fatigue slope, error profile and
 * comprehension gate. Designed for longitudinal progression tracking.
 */
export default function OrbitalOrderSessionCard({ g }) {
  const s = g.metrics?.summary || {};
  const cfg = g.metrics?.config || {};
  const errors = s.errorProfile || {};
  const activeErrors = Object.entries(errors).filter(([, v]) => v > 0);

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
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {formatSecs(g.duration_seconds)}
            {cfg.difficulty_level && <span> · Diff {cfg.difficulty_level}</span>}
            {cfg.br && <span className="capitalize"> · {cfg.br} br</span>}
            {cfg.glyphType && <span> · {cfg.glyphType.toLowerCase()}</span>}
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
        <MetricBox icon={Clock} label="Duration" value={formatSecs(g.duration_seconds)} />
        <MetricBox icon={Star} label="Score" value={g.score || 0} color="text-yellow-500" />
        <MetricBox icon={Heart} label="Lives Left" value={s.livesRemaining ?? g.lives_remaining ?? 0} color="text-red-500" />
        <MetricBox icon={Zap} label="Best Chain" value={s.maxChain ?? 0} color="text-amber-500" />
      </div>

      {/* Cognitive accuracy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Gauge} label="Accuracy" value={formatPct(s.accuracy)} color="text-primary" />
        <MetricBox icon={Target} label="Chain Completion" value={formatPct(s.chainCompletionRate)} color="text-primary" />
        <MetricBox icon={Activity} label="Trials" value={s.trialsOffered ?? 0} />
        <MetricBox icon={Target} label="Probe Accuracy" value={formatPct(s.probeAccuracy)} />
      </div>

      {/* Latency / planning */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Timer} label="First-tap Latency" value={formatMs(s.firstTapLatencyMs)} />
        <MetricBox icon={Timer} label="Inter-tap Latency" value={formatMs(s.interTapLatencyMs)} />
        <MetricBox icon={Compass} label="Planning Ratio" value={formatNum(s.planningRatio, '×')} />
        <MetricBox icon={Repeat} label="Rule Switch Cost" value={formatMs(s.ruleSwitchCostMs)} />
      </div>

      {/* Control / inhibition */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={ShieldAlert} label="Inhibition Errors" value={formatPct(s.inhibitionIndex)} color="text-red-500" />
        <MetricBox icon={TrendingDown} label="Fatigue Slope" value={formatPct(s.fatigueSlope)} />
        <MetricBox icon={Activity} label="Rule Rechecks" value={(s.ruleRecheckCount ?? 0).toFixed(1)} />
        <MetricBox icon={Activity} label="Baseline Tap" value={formatMs(s.baselineTapLatencyMs)} />
      </div>

      {/* Comprehension gate */}
      {s.comprehensionGate && s.comprehensionGate !== 'SKIPPED' && (
        <div className="mt-2 mb-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Comprehension:</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            s.comprehensionGate === 'PASSED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>{s.comprehensionGate}</span>
        </div>
      )}

      {/* Error profile */}
      {activeErrors.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Error Profile</p>
          <div className="flex flex-wrap gap-1.5">
            {activeErrors.map(([type, v]) => (
              <span key={type} className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 capitalize">
                {type.replace(/_/g, ' ')} {Math.round(v * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}