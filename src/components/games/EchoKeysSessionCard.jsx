import React from 'react';
import { Music, Clock, Star, Target, Zap, TrendingDown, Car } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import moment from 'moment';

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

function fmtMs(v) {
  if (v == null || isNaN(v) || v === 0) return '—';
  return `${Math.round(v)} ms`;
}

function fmtSecs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toFixed(1)}s`;
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

export default function EchoKeysSessionCard({ g }) {
  const m = g.metrics || {};
  const resp = m.responseMs || {};
  const perMelody = m.perMelody || [];
  const obs = m.obstacleTask;
  const palette = m.config?.br === 'left' ? 'warm' : m.config?.br === 'right' ? 'bold' : 'default';

  return (
    <div className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-50 shrink-0">
          <Music className="w-5 h-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Echo Keys · Nocturne N-88</p>
          <p className="text-xs text-muted-foreground">
            {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {fmtSecs(g.duration_seconds)}
            {obs ? ` · dual-task (${palette})` : ` · ${palette} palette`}
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
        <MetricBox icon={Target} label="Melodies Cleared" value={`${g.levels_completed ?? 0}/5`} color="text-primary" />
        <MetricBox icon={Zap} label="Correct Notes" value={m.totalCorrect ?? 0} color="text-emerald-600" />
        <MetricBox icon={TrendingDown} label="Wrong Notes" value={m.totalWrong ?? 0} color="text-red-500" />
        <MetricBox icon={Target} label="Accuracy" value={fmtPct(m.accuracy)} color="text-cyan-600" />
      </div>

      {/* Response times + streak */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox icon={Clock} label="Mean Response" value={fmtMs(resp.mean)} />
        <MetricBox icon={Clock} label="Median Response" value={fmtMs(resp.median)} />
        <MetricBox icon={Clock} label="Fastest" value={fmtMs(resp.fastest)} color="text-emerald-600" />
        <MetricBox icon={Star} label="Best Streak" value={m.bestStreak ?? 0} color="text-yellow-500" />
      </div>

      {/* Obstacle / dual-task stats */}
      {obs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <MetricBox icon={Car} label="Button Hits" value={obs.hits ?? 0} color="text-emerald-600" />
          <MetricBox icon={TrendingDown} label="Missed Cars" value={obs.misses ?? 0} color="text-red-500" />
          <MetricBox icon={TrendingDown} label="False Alarms" value={obs.falseAlarms ?? 0} color="text-orange-500" />
          <MetricBox icon={Clock} label="Mean Reaction" value={fmtMs(obs.meanReactionMs)} color="text-cyan-600" />
        </div>
      )}

      {/* Per-melody breakdown */}
      {perMelody.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Melody Breakdown</p>
          <div className="space-y-1.5">
            {perMelody.map((mel, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                  mel.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  M{i + 1}
                </span>
                <span className="text-[11px] font-medium truncate flex-1">{mel.name}</span>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground ml-auto">
                  <span>{mel.roundsCleared}/{mel.notes} rounds</span>
                  <span className="text-emerald-600">✓ {mel.correct}</span>
                  <span className="text-red-500">✗ {mel.wrong}</span>
                  <span>🔥 {mel.bestStreak}</span>
                  <span>⏱ {fmtMs(mel.meanResponseMs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}