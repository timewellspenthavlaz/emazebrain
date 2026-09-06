// Shared helpers for the Game Sessions matrix view.
// Groups sessions by game_id and derives compact-tile / sparkline / compare data.

export const GAME_META = {
  'block-crasher': { label: 'Block Crasher', icon: '🧱', color: 'accent' },
  'catch-me-if-you-can': { label: 'Catch Me', icon: '👁️', color: 'cyan' },
  'orbital-order': { label: 'Orbital Order', icon: '🪐', color: 'indigo' },
  'beep-beep': { label: 'Beep Beep', icon: '🚗', color: 'rose' },
  'echo-keys': { label: 'Echo Keys', icon: '🎹', color: 'violet' },
  'peek-peek': { label: 'Peek Peek', icon: '🧠', color: 'indigo' },
  'tunnel-rush': { label: 'Tunnel Rush', icon: '🌀', color: 'cyan' },
};

const isNum = (v) => v != null && typeof v === 'number' && !isNaN(v);

// One headline metric per game (matches the best-* summary already shown).
export function keyMetricFor(g) {
  const m = g.metrics || {};
  switch (g.game_id) {
    case 'catch-me-if-you-can':
      return { label: 'Accuracy', value: isNum(m.accuracy_rate) ? `${Math.round(m.accuracy_rate * 100)}%` : '—' };
    case 'orbital-order': {
      const s = m.summary || {};
      return { label: 'Accuracy', value: isNum(s.accuracy) ? `${Math.round(s.accuracy * 100)}%` : '—' };
    }
    case 'beep-beep':
      return { label: 'Planning', value: isNum(m.planning_efficiency) ? `${Math.round(m.planning_efficiency * 100)}%` : '—' };
    case 'echo-keys':
      return { label: 'Accuracy', value: isNum(m.accuracy) ? `${Math.round(m.accuracy * 100)}%` : '—' };
    case 'peek-peek':
      return { label: 'First-try Acc', value: isNum(m.first_attempt_accuracy_ex_final) ? `${Math.round(m.first_attempt_accuracy_ex_final * 100)}%` : '—' };
    case 'tunnel-rush':
      return { label: 'Accuracy', value: isNum(m.summary?.accuracy) ? `${Math.round(m.summary.accuracy * 100)}%` : '—' };
    case 'block-crasher':
      return { label: 'Miss Rate', value: isNum(m.paddle_miss_rate) ? `${Math.round(m.paddle_miss_rate * 100)}%` : '—' };
    default:
      return { label: 'Level', value: g.highest_level ?? 0 };
  }
}

// Numeric series for the per-game sparkline (score + accuracy across sessions).
function accuracyOf(g) {
  const m = g.metrics || {};
  switch (g.game_id) {
    case 'orbital-order': return m.summary?.accuracy ?? null;
    case 'beep-beep': return m.planning_efficiency ?? null;
    case 'catch-me-if-you-can': return m.accuracy_rate ?? null;
    case 'block-crasher': return m.paddle_miss_rate != null ? 1 - m.paddle_miss_rate : null;
    case 'echo-keys': return m.accuracy ?? null;
    case 'peek-peek': return m.first_attempt_accuracy_ex_final ?? null;
    case 'tunnel-rush': return m.summary?.accuracy ?? null;
    default: return null;
  }
}

export function groupByGame(gameSessions) {
  const map = new Map();
  (gameSessions || []).forEach((g) => {
    const key = g.game_id || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(g);
  });
  const rows = [];
  map.forEach((sessions, gameId) => {
    const chrono = [...sessions].sort(
      (a, b) => new Date(a.session_date || a.created_date) - new Date(b.session_date || b.created_date)
    );
    const trend = chrono.map((g) => ({
      date: (g.session_date || g.created_date).slice(0, 10),
      score: g.score || 0,
      acc: accuracyOf(g),
    }));
    rows.push({ gameId, sessions: chrono, trend });
  });
  // Stable display order following GAME_META, unknown games last.
  rows.sort((a, b) => {
    const ai = Object.keys(GAME_META).indexOf(a.gameId);
    const bi = Object.keys(GAME_META).indexOf(b.gameId);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return rows;
}

// Comparison rows for the side-by-side compare drawer.
// Returns comparable numeric metrics shared across a game's two sessions.
export function compareRows(gameId, a, b) {
  const ma = a?.metrics || {};
  const mb = b?.metrics || {};
  const pick = (label, av, bv, fmt = (v) => v) => {
    const avn = typeof av === 'number' && !isNaN(av) ? av : null;
    const bvn = typeof bv === 'number' && !isNaN(bv) ? bv : null;
    return { label, a: avn == null ? '—' : fmt(avn), b: bvn == null ? '—' : fmt(bvn), delta: avn != null && bvn != null ? avn - bvn : null };
  };
  const pct = (v) => `${Math.round(v * 100)}%`;
  const rows = [
    pick('Score', a?.score, b?.score),
    pick('Highest Level', a?.highest_level, b?.highest_level),
    pick('Levels Completed', a?.levels_completed, b?.levels_completed),
    pick('Duration (s)', a?.duration_seconds, b?.duration_seconds, (v) => v.toFixed(1)),
    pick('Lives Remaining', a?.lives_remaining, b?.lives_remaining),
  ];
  switch (gameId) {
    case 'catch-me-if-you-can':
      rows.push(pick('Accuracy', ma.accuracy_rate, mb.accuracy_rate, pct));
      rows.push(pick('Avg Reaction (ms)', ma.avg_reaction_time_ms, mb.avg_reaction_time_ms, (v) => Math.round(v)));
      rows.push(pick('Best Streak', ma.best_streak, mb.best_streak));
      break;
    case 'orbital-order': {
      const sa = ma.summary || {}, sb = mb.summary || {};
      rows.push(pick('Accuracy', sa.accuracy, sb.accuracy, pct));
      rows.push(pick('Best Chain', sa.maxChain, sb.maxChain));
      rows.push(pick('Planning Ratio', sa.planningRatio, sb.planningRatio, (v) => `${v.toFixed(2)}×`));
      rows.push(pick('Inhibition Index', sa.inhibitionIndex, sb.inhibitionIndex, pct));
      break;
    }
    case 'beep-beep':
      rows.push(pick('Planning Eff.', ma.planning_efficiency, mb.planning_efficiency, pct));
      rows.push(pick('Moves', ma.total_moves, mb.total_moves));
      break;
    case 'echo-keys':
      rows.push(pick('Accuracy', ma.accuracy, mb.accuracy, pct));
      rows.push(pick('Notes Played', ma.notes_played, mb.notes_played));
      break;
    case 'peek-peek':
      rows.push(pick('First-Try Acc', ma.first_attempt_accuracy_ex_final, mb.first_attempt_accuracy_ex_final, pct));
      rows.push(pick('First-Round Misses', ma.first_round_misses_mean, mb.first_round_misses_mean, (v) => v.toFixed(2)));
      rows.push(pick('Learning Slope', ma.learning_slope, mb.learning_slope, (v) => v.toFixed(3)));
      break;
    case 'tunnel-rush': {
      const sa = ma.summary || {}, sb = mb.summary || {};
      rows.push(pick('Accuracy', sa.accuracy, sb.accuracy, pct));
      rows.push(pick('Hit Rate', sa.hitRate, sb.hitRate, pct));
      rows.push(pick('Median RT (ms)', sa.medianReactionMs, sb.medianReactionMs, (v) => Math.round(v)));
      rows.push(pick('Rotations', sa.rotations, sb.rotations));
      break;
    }
    case 'block-crasher':
      rows.push(pick('Miss Rate', ma.paddle_miss_rate, mb.paddle_miss_rate, pct));
      rows.push(pick('Bricks Destroyed', ma.total_bricks_destroyed, mb.total_bricks_destroyed));
      rows.push(pick('Paddle Hits', ma.paddle_hits, mb.paddle_hits));
      break;
    default:
      break;
  }
  return rows;
}