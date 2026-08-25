import React, { useMemo, useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { groupByGame, GAME_META } from './gameMatrixHelpers';
import GameMatrixRow from './GameMatrixRow';
import CompareDrawer from './CompareDrawer';

/**
 * GameMatrix — replaces the old single chronological session list with a 2D
 * matrix: one row per game (sticky label + sparkline), executions scroll
 * horizontally. Click a tile for full detail; pin two tiles in a row to
 * compare them side-by-side. Keeps the 4 summary stat cards.
 */
export default function GameMatrix({ gameSessions }) {
  const rows = useMemo(() => groupByGame(gameSessions), [gameSessions]);

  const [selectedId, setSelectedId] = useState(null);
  // pinned: { [gameId]: [idA, idB] }
  const [pinnedByGame, setPinnedByGame] = useState({});
  const [drawer, setDrawer] = useState({ open: false, mode: 'single', gameId: null, a: null, b: null });

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

  // Summary stats (kept from the previous view)
  const sorted = [...gameSessions].sort(
    (a, b) => new Date(b.session_date || b.created_date) - new Date(a.session_date || a.created_date)
  );
  const bestScore = Math.max(...sorted.map((g) => g.score || 0));
  const highestLevel = Math.max(...sorted.map((g) => g.highest_level || 0));
  const hasCatchMe = sorted.some((g) => g.game_id === 'catch-me-if-you-can');
  const hasOrbital = sorted.some((g) => g.game_id === 'orbital-order');
  const hasBeep = sorted.some((g) => g.game_id === 'beep-beep');
  const hasEcho = sorted.some((g) => g.game_id === 'echo-keys');
  const hasPeek = sorted.some((g) => g.game_id === 'peek-peek');
  const levelCap =
    hasBeep || hasPeek ? 50
    : hasEcho && !hasOrbital && !hasCatchMe ? 5
    : hasOrbital && !hasCatchMe ? 5
    : hasCatchMe ? 9 : 10;
  const bestAccuracy = Math.max(0, ...sorted.filter((g) => g.game_id === 'catch-me-if-you-can').map((g) => g.metrics?.accuracy_rate || 0));
  const bestChain = Math.max(0, ...sorted.filter((g) => g.game_id === 'orbital-order').map((g) => g.metrics?.summary?.maxChain || 0));
  const bestPlanningEff = Math.max(0, ...sorted.filter((g) => g.game_id === 'beep-beep').map((g) => g.metrics?.planning_efficiency || 0));
  const bestEchoAccuracy = Math.max(0, ...sorted.filter((g) => g.game_id === 'echo-keys').map((g) => g.metrics?.accuracy || 0));
  const peekSessions = sorted.filter((g) => g.game_id === 'peek-peek');
  const bestPeekFirstRoundMisses = peekSessions.length ? Math.min(...peekSessions.map((g) => g.metrics?.first_round_misses_mean ?? 0)) : null;
  const totalBricks = sorted.reduce((sum, g) => sum + (g.metrics?.total_bricks_destroyed || 0), 0);

  const handleSelect = (session) => {
    setSelectedId(session.id);
    setDrawer({ open: true, mode: 'single', gameId: session.game_id, a: session, b: null });
  };

  const handleTogglePin = (gameId, id) => {
    setPinnedByGame((prev) => {
      const cur = prev[gameId] || [];
      let next;
      if (cur.includes(id)) {
        next = cur.filter((x) => x !== id);
      } else if (cur.length >= 2) {
        // replace the oldest pin (first entry)
        next = [cur[1], id];
      } else {
        next = [...cur, id];
      }
      return { ...prev, [gameId]: next };
    });
  };

  const openCompare = (gameId) => {
    const ids = pinnedByGame[gameId] || [];
    if (ids.length !== 2) return;
    const gameRows = rows.find((r) => r.gameId === gameId)?.sessions || [];
    const a = gameRows.find((s) => s.id === ids[0]);
    const b = gameRows.find((s) => s.id === ids[1]);
    if (!a || !b) return;
    setDrawer({ open: true, mode: 'compare', gameId, a, b });
  };

  const summaryFourth = hasCatchMe ? (
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
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-accent" /> Game Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary stats (kept) */}
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
          {summaryFourth}
        </div>

        {/* Matrix */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex bg-muted/30 border-b border-border">
            <div className="w-[200px] shrink-0 border-r border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Game
            </div>
            <div className="flex-1 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Executions (oldest → newest) — scroll horizontally · pin two to compare
            </div>
          </div>
          {rows.map((row) => {
            const pinnedIds = pinnedByGame[row.gameId] || [];
            return (
              <div key={row.gameId}>
                <GameMatrixRow
                  row={row}
                  selectedId={selectedId}
                  pinnedIds={pinnedIds}
                  onSelect={handleSelect}
                  onTogglePin={(id) => handleTogglePin(row.gameId, id)}
                />
                {pinnedIds.length === 2 && (
                  <div className="flex items-center justify-end gap-2 px-3 py-1.5 bg-amber-50/60 border-t border-amber-200">
                    <span className="text-[11px] text-amber-700">Two runs pinned</span>
                    <Button size="sm" className="h-7 text-xs" onClick={() => openCompare(row.gameId)}>
                      Compare side-by-side
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <CompareDrawer
          open={drawer.open}
          onOpenChange={(o) => setDrawer((d) => ({ ...d, open: o }))}
          mode={drawer.mode}
          gameId={drawer.gameId}
          sessionA={drawer.a}
          sessionB={drawer.b}
          gameSessions={gameSessions}
        />
      </CardContent>
    </Card>
  );
}