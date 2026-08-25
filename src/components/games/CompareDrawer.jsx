import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import moment from 'moment';
import StatusBadge from '@/components/admin/StatusBadge';
import CatchMeSessionCard from '@/components/games/CatchMeSessionCard';
import OrbitalOrderSessionCard from '@/components/games/OrbitalOrderSessionCard';
import BeepBeepSessionCard from '@/components/games/BeepBeepSessionCard';
import EchoKeysSessionCard from '@/components/games/EchoKeysSessionCard';
import PeekPeekSessionCard from '@/components/games/PeekPeekSessionCard';
import { compareRows, GAME_META } from './gameMatrixHelpers';
import MetricBox from './MetricBox';
import { TrendContext } from './TrendContext';
import MetricTrendDialog from './MetricTrendDialog';

function SessionDetailCard({ g, onMetricClick }) {
  const trendValue = { gameId: g.game_id, session: g, onMetricClick };
  return (
    <TrendContext.Provider value={trendValue}>
      <SessionDetailCardInner g={g} />
    </TrendContext.Provider>
  );
}

function SessionDetailCardInner({ g }) {
  switch (g.game_id) {
    case 'catch-me-if-you-can': return <CatchMeSessionCard g={g} />;
    case 'orbital-order': return <OrbitalOrderSessionCard g={g} />;
    case 'beep-beep': return <BeepBeepSessionCard g={g} />;
    case 'echo-keys': return <EchoKeysSessionCard g={g} />;
    case 'peek-peek': return <PeekPeekSessionCard g={g} />;
    default: return <BlockCrasherDetail g={g} />;
  }
}

function BlockCrasherDetail({ g }) {
  const m = g.metrics || {};
  const specials = m.special_bricks_triggered || {};
  const fmt = (v, s = '') => (v == null || isNaN(v) ? '—' : `${Math.round(v)}${s}`);
  const pct = (v) => (v == null || isNaN(v) ? '—' : `${Math.round(v * 100)}%`);
  const sec = (v) => (v == null || isNaN(v) ? '—' : `${v.toFixed(1)}s`);
  return (
    <div className="p-4 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">🧱</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
          <p className="text-xs text-muted-foreground">{moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {sec(g.duration_seconds)}</p>
        </div>
        <span className="text-sm font-semibold text-yellow-500">⭐ {g.score || 0}</span>
        <StatusBadge status={g.status} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox label="Highest Level" value={`${g.highest_level || 0}/10`} color="text-primary" />
        <MetricBox label="Lives Left" value={g.lives_remaining ?? 0} color="text-red-500" />
        <MetricBox label="Levels Completed" value={g.levels_completed ?? 0} />
        <MetricBox label="Bricks Destroyed" value={m.total_bricks_destroyed ?? 0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        <MetricBox label="Paddle Hits" value={m.paddle_hits ?? 0} />
        <MetricBox label="Balls Lost" value={m.balls_lost ?? 0} color="text-red-500" />
        <MetricBox label="Miss Rate" value={pct(m.paddle_miss_rate)} color="text-red-500" />
        <MetricBox label="Avg Intercept Gap" value={fmt(m.avg_intercept_gap, 'px')} />
      </div>
      {Object.keys(specials).length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Special Bricks Triggered</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(specials).map(([t, c]) => (
              <span key={t} className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 capitalize">{t.replace(/_/g, ' ')}: {c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta, lowerIsBetter }) {
  if (delta == null || delta === 0) return <span className="text-[11px] text-muted-foreground">—</span>;
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? '+' : '';
  const val = Number.isInteger(delta) ? delta : delta.toFixed(2);
  return (
    <span className={`text-[11px] font-semibold ${improved ? 'text-emerald-600' : 'text-rose-500'}`}>
      {sign}{val}
    </span>
  );
}

function SessionHead({ g, color }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">⭐ {g.score || 0}</span>
        <StatusBadge status={g.status} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')}
      </p>
      <p className="text-[11px] text-muted-foreground">
        Level {g.highest_level || 0} · {(g.duration_seconds || 0).toFixed(0)}s
      </p>
    </div>
  );
}

/**
 * CompareDrawer — a right-side sheet that shows either a single selected
 * session's full detail card, or a side-by-side compare of two pinned
 * sessions of the same game with aligned metric rows + deltas.
 */
export default function CompareDrawer({ open, onOpenChange, mode, gameId, sessionA, sessionB, gameSessions }) {
  const meta = GAME_META[gameId] || { label: gameId, icon: '🎮' };
  const [trend, setTrend] = React.useState(null);

  const openTrend = (metricKey, metricLabel, session) => {
    setTrend({ metricKey, metricLabel, refSession: session });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-base">{meta.icon}</span>
            {mode === 'compare' ? 'Compare Runs' : 'Session Details'} — {meta.label}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-1 pb-6">
          <p className="text-[11px] text-muted-foreground -mt-1">
            Tip: tap any metric with a <span className="text-primary/70 font-medium">↗</span> icon to view its 30-day trend across previous executions.
          </p>

          {mode === 'single' && sessionA && (
            <SessionDetailCard g={sessionA} onMetricClick={openTrend} />
          )}

          {mode === 'compare' && sessionA && sessionB && (
            <>
              {/* Full detail cards stacked for both runs */}
              <div className="space-y-3">
                <SessionDetailCard g={sessionA} onMetricClick={openTrend} />
                <SessionDetailCard g={sessionB} onMetricClick={openTrend} />
              </div>

              {/* Aligned metric comparison table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/40 border-b border-border">
                  <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">Metric</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-blue-700 uppercase">Run A</div>
                  <div className="px-3 py-2 text-[11px] font-semibold text-emerald-700 uppercase">Run B</div>
                </div>
                {compareRows(gameId, sessionA, sessionB).map((r, i) => (
                  <div key={r.label} className={`grid grid-cols-3 items-center ${i % 2 ? 'bg-muted/20' : ''}`}>
                    <div className="px-3 py-2 text-xs text-muted-foreground">{r.label}</div>
                    <div className="px-3 py-2 text-sm font-medium text-blue-700 flex items-center gap-1.5">
                      {r.a}
                      <DeltaBadge delta={r.delta} lowerIsBetter={r.lowerIsBetter} />
                    </div>
                    <div className="px-3 py-2 text-sm font-medium text-emerald-700">{r.b}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Delta = Run B − Run A. Green = improvement, red = decline (relative to each metric's goal).
              </p>
            </>
          )}

          {!sessionA && (
            <p className="text-sm text-muted-foreground text-center py-8">No session selected</p>
          )}
        </div>
      </SheetContent>

      <MetricTrendDialog
        open={!!trend}
        onOpenChange={(o) => { if (!o) setTrend(null); }}
        gameSessions={gameSessions}
        gameId={gameId}
        metricKey={trend?.metricKey}
        metricLabel={trend?.metricLabel}
        refSession={trend?.refSession}
      />
    </Sheet>
  );
}