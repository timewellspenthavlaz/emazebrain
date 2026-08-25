import React, { useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import moment from 'moment';
import { buildTrendSeries, formatTrendValue, getMetricByKey } from './metricRegistry';
import { GAME_META } from './gameMatrixHelpers';

/**
 * MetricTrendDialog — shows a 30-day trend line for a single metric across the
 * patient's previous executions of the same game, with the current session
 * highlighted as the rightmost endpoint.
 */
export default function MetricTrendDialog({ open, onOpenChange, gameSessions, gameId, metricKey, metricLabel, refSession }) {
  const meta = getMetricByKey(gameId, metricKey);
  const gameMeta = GAME_META[gameId] || { label: gameId, icon: '🎮' };

  const { points, startDate, refDate } = useMemo(
    () => buildTrendSeries(gameSessions, gameId, metricKey, refSession, 30),
    [gameSessions, gameId, metricKey, refSession]
  );

  const stats = useMemo(() => {
    if (!points.length) return null;
    const vals = points.map((p) => p.value);
    const first = vals[0];
    const last = vals[vals.length - 1];
    const best = meta?.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
    const worst = meta?.lowerIsBetter ? Math.max(...vals) : Math.min(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const delta = last - first;
    const improved = meta ? (meta.lowerIsBetter ? delta < 0 : delta > 0) : delta > 0;
    return { first, last, best, worst, mean, delta, improved, count: vals.length };
  }, [points, meta]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {metricLabel || meta?.label || 'Metric'} — 30-day trend
          </DialogTitle>
          <DialogDescription>
            <span className="text-base mr-1">{gameMeta.icon}</span>
            {gameMeta.label} · {points.length} execution{points.length === 1 ? '' : 's'} in window
            {refSession && (
              <> · current run {moment(refSession.session_date || refSession.created_date).format('MMM DD, HH:mm')}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No previous executions of this game recorded in the last 30 days.
            </p>
          ) : (
            <>
              {/* Summary stats */}
              {stats && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] uppercase text-muted-foreground">Latest</p>
                    <p className="text-sm font-semibold">{formatTrendValue(stats.last, meta)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] uppercase text-muted-foreground">{meta?.lowerIsBetter ? 'Best (low)' : 'Best (high)'}</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatTrendValue(stats.best, meta)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] uppercase text-muted-foreground">Mean</p>
                    <p className="text-sm font-semibold">{formatTrendValue(stats.mean, meta)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <p className="text-[10px] uppercase text-muted-foreground">Change</p>
                    <p className={`text-sm font-semibold ${stats.delta === 0 ? 'text-muted-foreground' : stats.improved ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {stats.delta > 0 ? '+' : ''}{formatTrendValue(Math.abs(stats.delta) === 0 ? 0 : stats.delta, meta)}
                    </p>
                  </div>
                </div>
              )}

              {/* Trend chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => moment(d).format('MM/DD')}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickMargin={6}
                    />
                    <YAxis
                      tickFormatter={(v) => (meta?.isPct ? `${Math.round(v)}%` : Math.round(v * 100) / 100)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={48}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                            <p className="font-medium">{moment(p.date).format('MMM DD, YYYY · HH:mm')}</p>
                            <p className="text-muted-foreground">
                              {metricLabel}: <span className="font-semibold text-foreground">{formatTrendValue(p.value, meta)}</span>
                            </p>
                            {p.isCurrent && <p className="text-primary font-medium mt-0.5">● Current run</p>}
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={(p) => {
                        const cx = p.cx, cy = p.cy;
                        if (p.payload?.isCurrent) {
                          return <circle cx={cx} cy={cy} r={5} fill="hsl(var(--accent))" stroke="#fff" strokeWidth={2} />;
                        }
                        return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" opacity={0.7} />;
                      }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Window: {moment(startDate).format('MMM DD')} → {moment(refDate).format('MMM DD, YYYY')} ·
                each point is one execution of {gameMeta.label}.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}