import React from 'react';
import { Star, Layers, Target, Repeat, Activity, Gauge, Compass, ShieldCheck, AlertTriangle } from 'lucide-react';

function MetricBox({ icon: Icon, label, value, color = 'text-foreground' }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
      {Icon && <Icon className={`w-4 h-4 ${color} shrink-0`} />}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-semibold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
function fmt(v, suffix = '') {
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—';
  return typeof v === 'number' ? `${Math.round(v * 100) / 100}${suffix}` : `${v}`;
}
function pct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

/**
 * Results — patient-facing session summary. Mirrors the payload: score and
 * levels get equal billing with the primary clinical measure (first-round
 * misses), with no "threshold/deficit/impairment" language and no good/bad
 * framing on any side or quadrant result.
 */
export default function Results({ payload, onPlayAgain }) {
  const m = payload?.metrics || {};
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] text-white p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Session Complete</h2>
          <p className="text-sm text-slate-400 mt-1 capitalize">
            {m.pack} pack · difficulty {m.difficulty_level} · {payload.status}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <MetricBox icon={Star} label="Score" value={payload.score || 0} color="text-amber-400" />
          <MetricBox icon={Layers} label="Levels" value={`${payload.levels_completed || 0}/${m.highest_level || 0}`} color="text-cyan-300" />
          <MetricBox icon={Activity} label="Duration" value={fmt(payload.duration_seconds, 's')} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <MetricBox icon={Target} label="First-Round Misses" value={fmt(m.first_round_misses_mean)} color="text-rose-300" />
          <MetricBox icon={Gauge} label="First-Try Accuracy" value={pct(m.first_attempt_accuracy_ex_final)} color="text-emerald-300" />
          <MetricBox icon={Repeat} label="Learning Slope" value={m.learning_slope == null ? '—' : fmt(m.learning_slope)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <MetricBox icon={Target} label="Novel Hex Errors" value={fmt(m.novel_hex_errors)} />
          <MetricBox icon={Activity} label="Within-Search Err" value={fmt(m.within_search_errors)} />
          <MetricBox icon={Activity} label="Between-Search Err" value={fmt(m.between_search_errors)} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          <MetricBox icon={Gauge} label="Avg First Tap" value={fmt(m.avg_first_tap_latency_ms, 'ms')} />
          <MetricBox icon={Compass} label="Search Organisation" value={pct(m.search_organisation)} />
          <MetricBox icon={Activity} label="Longest Streak" value={fmt(m.longest_streak)} />
        </div>

        {/* laterality — only meaningful with enough probes; never good/bad */}
        {m.probe_count > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            <MetricBox icon={Compass} label="Find-Order Index" value={fmt(m.find_order_index)} />
            <MetricBox icon={Compass} label="Mean First-Tap X" value={fmt(m.mean_first_tap_x)} />
            <MetricBox icon={Compass} label={`Probes (${m.probe_count})`} value={m.probe_levels_used?.join(', ') || '—'} />
          </div>
        )}

        {m.control_trial_completed && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            <MetricBox icon={ShieldCheck} label="Control: Find-Order" value={fmt(m.control_find_order_index)} />
            <MetricBox icon={ShieldCheck} label="Control: First-Tap X" value={fmt(m.control_mean_first_tap_x)} />
            <MetricBox icon={ShieldCheck} label="Control: Latency Asym" value={fmt(m.control_first_tap_latency_asymmetry_ms, 'ms')} />
          </div>
        )}

        {(m.floor_flag || m.ceiling_flag) && (
          <div className="flex items-center gap-2 mb-3 text-xs text-amber-300/80">
            <AlertTriangle className="w-4 h-4" />
            {m.floor_flag ? 'Early-level indicator — later metrics are preliminary.' : 'All levels cleared with no misses.'}
          </div>
        )}

        <div className="text-center text-[10px] text-slate-500 mb-4">
          Budgets are model-derived (λ=2.5), not pilot-fitted. Art is placeholder pending commission.
        </div>

        <div className="flex justify-center">
          <button
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}