import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Trophy, Compass, Gauge, Activity, Timer, Repeat, TrendingDown, Brain, Target } from 'lucide-react';

function Stat({ icon: Icon, label, value, color = 'text-foreground' }) {
  return (
    <div className="rounded-lg p-3 bg-muted/30 flex items-center gap-2">
      {Icon && <Icon className={`w-4 h-4 ${color} shrink-0`} />}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
const pct = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
const ms = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v)} ms`);
const s = (v) => (v == null || isNaN(v) ? '—' : `${v.toFixed(1)}s`);

export default function Results({ payload, onPlayAgain }) {
  const m = payload.metrics || {};
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-neutral-950 text-white">
      <div className="max-w-lg w-full rounded-2xl p-8 bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center"><Trophy className="w-6 h-6 text-white" /></div>
          <div>
            <h2 className="text-2xl font-bold">Session Complete</h2>
            <p className="text-sm text-neutral-400 capitalize">{payload.status} · reached level {m.highest_level} · cleared {m.levels_completed} lots</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <Stat icon={Trophy} label="Score" value={m.score || 0} color="text-yellow-400" />
          <Stat icon={Gauge} label="Planning Efficiency" value={pct(m.planning_efficiency)} color="text-primary" />
          <Stat icon={Compass} label="Deepest Solved" value={`${m.deepest_optimal_solved} moves`} color="text-primary" />
          <Stat icon={Target} label="Lot Accuracy" value={pct(m.level_accuracy)} />
          <Stat icon={Activity} label="Optimal Move Rate" value={pct(m.optimal_move_rate)} />
          <Stat icon={TrendingDown} label="Regressive Rate" value={pct(m.regressive_move_rate)} color="text-red-400" />
          <Stat icon={Repeat} label="Longest Plan Run" value={m.longest_plan_run || 0} />
          <Stat icon={Timer} label="First-move Latency" value={ms(m.avg_first_move_latency_ms)} />
          <Stat icon={Timer} label="Avg per Move" value={s(m.avg_seconds_per_move)} />
          <Stat icon={Brain} label="Hints Used" value={m.hints_used || 0} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <Stat icon={Activity} label="Reversals" value={m.total_reversals || 0} />
          <Stat icon={Repeat} label="Undos / Resets" value={`${m.total_undos || 0} / ${m.total_resets || 0}`} />
        </div>

        <p className="text-xs text-neutral-500 mb-4">Duration {s(m.duration_seconds)} · exited {m.exit_side} · {m.palette_band} band</p>

        <div className="flex gap-2">
          <Link to="/games"><Button variant="outline" className="border-neutral-700 text-neutral-200"><ArrowLeft className="w-4 h-4 mr-1" /> Done</Button></Link>
          <Button onClick={onPlayAgain} className="bg-primary hover:bg-primary/90"><RotateCcw className="w-4 h-4 mr-1" /> Play Again</Button>
        </div>
      </div>
    </div>
  );
}