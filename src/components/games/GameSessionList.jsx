import React from 'react';
import { Gamepad2, Clock, Star, Heart, Target, MousePointer, Zap, TrendingDown, PauseCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/admin/StatusBadge';
import CatchMeSessionCard from '@/components/games/CatchMeSessionCard';
import OrbitalOrderSessionCard from '@/components/games/OrbitalOrderSessionCard';
import BeepBeepSessionCard from '@/components/games/BeepBeepSessionCard';
import EchoKeysSessionCard from '@/components/games/EchoKeysSessionCard';
import PeekPeekSessionCard from '@/components/games/PeekPeekSessionCard';
import moment from 'moment';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

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

function formatPct(v) {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v * 100)}%`;
}

function formatNum(v, suffix = '') {
  if (v == null || isNaN(v)) return '—';
  return `${Math.round(v)}${suffix}`;
}

function formatSecs(v) {
  if (v == null || isNaN(v)) return '—';
  return `${v.toFixed(1)}s`;
}

export default function GameSessionList({ gameSessions }) {
  if (!gameSessions || gameSessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-accent" /> Game Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No game sessions recorded</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...gameSessions].sort(
    (a, b) => new Date(b.session_date || b.created_date) - new Date(a.session_date || a.created_date)
  );

  const bestScore = Math.max(...sorted.map(g => g.score || 0));
  const highestLevel = Math.max(...sorted.map(g => g.highest_level || 0));
  const totalBricks = sorted.reduce((sum, g) => sum + (g.metrics?.total_bricks_destroyed || 0), 0);

  const hasCatchMe = sorted.some(g => g.game_id === 'catch-me-if-you-can');
  const hasBlockCrasher = sorted.some(g => g.game_id === 'block-crasher');
  const hasOrbital = sorted.some(g => g.game_id === 'orbital-order');
  const hasEcho = sorted.some(g => g.game_id === 'echo-keys');
  const hasPeek = sorted.some(g => g.game_id === 'peek-peek');
  const hasBeep = sorted.some(g => g.game_id === 'beep-beep');
  const bestAccuracy = Math.max(
    0,
    ...sorted
      .filter(g => g.game_id === 'catch-me-if-you-can')
      .map(g => g.metrics?.accuracy_rate || 0)
  );
  const bestChain = Math.max(
    0,
    ...sorted
      .filter(g => g.game_id === 'orbital-order')
      .map(g => g.metrics?.summary?.maxChain || 0)
  );
  const bestPlanningEff = Math.max(
    0,
    ...sorted
      .filter(g => g.game_id === 'beep-beep')
      .map(g => g.metrics?.planning_efficiency || 0)
  );
  const bestEchoAccuracy = Math.max(
    0,
    ...sorted
      .filter(g => g.game_id === 'echo-keys')
      .map(g => g.metrics?.accuracy || 0)
  );
  const peekSessions = sorted.filter(g => g.game_id === 'peek-peek');
  const bestPeekFirstRoundMisses = peekSessions.length
    ? Math.min(...peekSessions.map(g => g.metrics?.first_round_misses_mean ?? 0))
    : null;
  // Level cap depends on which game types are present (beep-beep max = 50, orbital max = 5, catch-me max = 9, block-crasher max = 10)
  const levelCap = (hasBeep || hasPeek) ? 50
    : hasEcho && !hasOrbital && !hasCatchMe && !hasBlockCrasher ? 5
    : hasOrbital && !hasCatchMe && !hasBlockCrasher ? 5
    : hasCatchMe && !hasBlockCrasher ? 9 : 10;

  // Progression trend — score & accuracy across sessions (oldest → newest)
  const sessionAccuracy = (g) => {
    if (g.game_id === 'orbital-order') return g.metrics?.summary?.accuracy ?? null;
    if (g.game_id === 'beep-beep') return g.metrics?.planning_efficiency ?? null;
    if (g.game_id === 'catch-me-if-you-can') return g.metrics?.accuracy_rate ?? null;
    if (g.game_id === 'block-crasher') return g.metrics?.paddle_miss_rate != null ? 1 - g.metrics.paddle_miss_rate : null;
    if (g.game_id === 'echo-keys') return g.metrics?.accuracy ?? null;
    if (g.game_id === 'peek-peek') return g.metrics?.first_attempt_accuracy_ex_final ?? null;
    return null;
  };
  const progressionData = [...sorted]
    .sort((a, b) => new Date(a.session_date || a.created_date) - new Date(b.session_date || b.created_date))
    .map((g, i) => ({
      idx: i + 1,
      date: moment(g.session_date || g.created_date).format('MMM DD'),
      game: (g.game_id || '').replace(/-/g, ' '),
      score: g.score || 0,
      accuracy: sessionAccuracy(g),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-accent" /> Game Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <p className="text-xs text-muted-foreground">Games Played</p>
            <p className="text-lg font-bold text-primary">{sorted.length}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-accent/5">
            <p className="text-xs text-muted-foreground">Best Score</p>
            <p className="text-lg font-bold text-accent">{bestScore}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50">
            <p className="text-xs text-muted-foreground">Highest Level</p>
            <p className="text-lg font-bold text-purple-600">{highestLevel}/{levelCap}</p>
          </div>
          {hasCatchMe ? (
            <div className="text-center p-3 rounded-lg bg-cyan-50">
              <p className="text-xs text-muted-foreground">Best Accuracy</p>
              <p className="text-lg font-bold text-cyan-600">{Math.round(bestAccuracy * 100)}%</p>
            </div>
          ) : hasOrbital ? (
            <div className="text-center p-3 rounded-lg bg-indigo-50">
              <p className="text-xs text-muted-foreground">Best Chain</p>
              <p className="text-lg font-bold text-indigo-600">{bestChain}</p>
            </div>
          ) : hasBeep ? (
            <div className="text-center p-3 rounded-lg bg-rose-50">
              <p className="text-xs text-muted-foreground">Planning Eff.</p>
              <p className="text-lg font-bold text-rose-600">{Math.round(bestPlanningEff * 100)}%</p>
            </div>
          ) : hasEcho ? (
            <div className="text-center p-3 rounded-lg bg-cyan-50">
              <p className="text-xs text-muted-foreground">Best Accuracy</p>
              <p className="text-lg font-bold text-cyan-600">{Math.round(bestEchoAccuracy * 100)}%</p>
            </div>
          ) : hasPeek ? (
            <div className="text-center p-3 rounded-lg bg-indigo-50">
              <p className="text-xs text-muted-foreground">First-Round Misses</p>
              <p className="text-lg font-bold text-indigo-600">{(bestPeekFirstRoundMisses ?? 0).toFixed(1)}</p>
            </div>
          ) : (
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-xs text-muted-foreground">Bricks Broken</p>
              <p className="text-lg font-bold text-green-600">{totalBricks}</p>
            </div>
          )}
        </div>

        {/* Progression trend */}
        {progressionData.length >= 2 && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Progression Across Sessions
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={progressionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 15% 90%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="score" tick={{ fontSize: 11, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="acc" orientation="right" domain={[0, 1]} tick={{ fontSize: 11, fill: 'hsl(240 10% 45%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(210 15% 90%)', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="score" type="monotone" dataKey="score" name="Score" stroke="hsl(168 65% 30%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="acc" type="monotone" dataKey="accuracy" name="Accuracy" stroke="hsl(200 70% 50%)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session list */}
        <div className="space-y-3">
          {sorted.map(g => {
            if (g.game_id === 'catch-me-if-you-can') {
              return <CatchMeSessionCard key={g.id} g={g} />;
            }
            if (g.game_id === 'orbital-order') {
              return <OrbitalOrderSessionCard key={g.id} g={g} />;
            }
            if (g.game_id === 'beep-beep') {
              return <BeepBeepSessionCard key={g.id} g={g} />;
            }
            if (g.game_id === 'echo-keys') {
              return <EchoKeysSessionCard key={g.id} g={g} />;
            }
            if (g.game_id === 'peek-peek') {
              return <PeekPeekSessionCard key={g.id} g={g} />;
            }
            const m = g.metrics || {};
            const specials = m.special_bricks_triggered || {};

            return (
              <div key={g.id} className="p-4 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                {/* Header row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 shrink-0">
                    <Gamepad2 className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{g.game_id?.replace(/-/g, ' ') || 'Game'}</p>
                    <p className="text-xs text-muted-foreground">
                      {moment(g.session_date || g.created_date).format('MMM DD, YYYY · HH:mm')} · {formatSecs(g.duration_seconds)}
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
                  <MetricBox icon={Target} label="Highest Level" value={`${g.highest_level || 0}/10`} color="text-primary" />
                  <MetricBox icon={Heart} label="Lives Left" value={g.lives_remaining ?? 0} color="text-red-500" />
                </div>

                {/* Gameplay metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <MetricBox icon={Target} label="Levels Completed" value={g.levels_completed ?? 0} />
                  <MetricBox icon={Zap} label="Bricks Destroyed" value={m.total_bricks_destroyed ?? 0} />
                  <MetricBox icon={Zap} label="Tough Bricks" value={m.tough_bricks_destroyed ?? 0} color="text-orange-500" />
                  <MetricBox icon={MousePointer} label="Paddle Hits" value={m.paddle_hits ?? 0} />
                </div>

                {/* Motor skill metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <MetricBox icon={TrendingDown} label="Balls Lost" value={m.balls_lost ?? 0} color="text-red-500" />
                  <MetricBox icon={TrendingDown} label="Miss Rate" value={formatPct(m.paddle_miss_rate)} color="text-red-500" />
                  <MetricBox icon={MousePointer} label="Avg Intercept Gap" value={formatNum(m.avg_intercept_gap, 'px')} />
                  <MetricBox icon={PauseCircle} label="Movement Reversals" value={m.movement_reversals ?? 0} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <MetricBox icon={PauseCircle} label="Idle Time" value={formatSecs(m.idle_seconds)} />
                  <MetricBox icon={MousePointer} label="Input Method" value={m.input_method || '—'} />
                  <MetricBox icon={Zap} label="Power-up Triggers" value={Object.values(specials).reduce((a, b) => a + b, 0)} color="text-purple-500" />
                  <MetricBox icon={Zap} label="Power-up Efficiency" value={formatPct(m.powerup_efficiency)} color="text-purple-500" />
                </div>

                {/* Special bricks triggered */}
                {Object.keys(specials).length > 0 && (
                  <div className="mt-2 mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Special Bricks Triggered</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(specials).map(([type, count]) => (
                        <span key={type} className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 capitalize">
                          {type.replace(/_/g, ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Level history */}
                {g.level_history && g.level_history.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1.5">Level Breakdown</p>
                    <div className="space-y-1.5">
                      {g.level_history.map((lh, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                            lh.completed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            L{lh.level}
                          </span>
                          <span className={`text-[11px] ${lh.completed ? 'text-green-600' : 'text-red-500'}`}>
                            {lh.completed ? '✓ Completed' : '✗ Not completed'}
                          </span>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground ml-auto">
                            <span>⭐ {lh.score_earned || 0}</span>
                            <span>🧱 {lh.bricks_destroyed || 0}</span>
                            {lh.balls_lost != null && <span>💔 {lh.balls_lost}</span>}
                            <span>⏱ {formatSecs(lh.duration_seconds)}</span>
                          </div>
                          {lh.special_bricks_triggered && Object.keys(lh.special_bricks_triggered).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(lh.special_bricks_triggered).map(([type, count]) => (
                                <span key={type} className="px-1.5 py-0.5 rounded text-[10px] bg-purple-50 text-purple-600 capitalize">
                                  {type.replace(/_/g, ' ')}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}