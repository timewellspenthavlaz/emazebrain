// Metric registry for the Game Sessions matrix trend feature.
// Maps each displayed metric label (per game) to a numeric accessor so that
// any MetricBox can be clicked to open a 30-day trend of that measurement
// across the patient's previous executions of the same game.

import moment from 'moment';

const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : null);

// Each game: { metricKey: { label, get(session)->number|null, unit, isPct, lowerIsBetter } }
const REGISTRY = {
  'block-crasher': {
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    highest_level: { label: 'Highest Level', get: (g) => num(g.highest_level), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.lives_remaining), lowerIsBetter: false },
    levels_completed: { label: 'Levels Completed', get: (g) => num(g.levels_completed), lowerIsBetter: false },
    bricks: { label: 'Bricks Destroyed', get: (g) => num(g.metrics?.total_bricks_destroyed), lowerIsBetter: false },
    paddle_hits: { label: 'Paddle Hits', get: (g) => num(g.metrics?.paddle_hits), lowerIsBetter: false },
    balls_lost: { label: 'Balls Lost', get: (g) => num(g.metrics?.balls_lost), lowerIsBetter: true },
    miss_rate: { label: 'Miss Rate', get: (g) => num(g.metrics?.paddle_miss_rate), unit: '%', isPct: true, lowerIsBetter: true },
    intercept_gap: { label: 'Avg Intercept Gap', get: (g) => num(g.metrics?.avg_intercept_gap), unit: 'px', lowerIsBetter: true },
  },
  'catch-me-if-you-can': {
    duration: { label: 'Duration', get: (g) => num(g.duration_seconds), unit: 's', lowerIsBetter: true },
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    highest_level: { label: 'Highest Level', get: (g) => num(g.highest_level), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.lives_remaining), lowerIsBetter: false },
    accuracy: { label: 'Accuracy', get: (g) => num(g.metrics?.accuracy_rate), unit: '%', isPct: true, lowerIsBetter: false },
    avg_reaction: { label: 'Avg Reaction', get: (g) => num(g.metrics?.avg_reaction_time_ms), unit: 'ms', lowerIsBetter: true },
    best_streak: { label: 'Best Streak', get: (g) => num(g.metrics?.best_streak), lowerIsBetter: false },
    final_jnd: { label: 'Final JND', get: (g) => num(g.metrics?.final_jnd), lowerIsBetter: true },
    correct: { label: 'Correct', get: (g) => num(g.metrics?.correct_selections), lowerIsBetter: false },
    wrong: { label: 'Wrong', get: (g) => num(g.metrics?.wrong_selections), lowerIsBetter: true },
    levels_cleared: { label: 'Levels Cleared', get: (g) => num(g.levels_completed), lowerIsBetter: false },
    total_stages: { label: 'Total Stages', get: (g) => num(g.metrics?.stage_count), lowerIsBetter: false },
    left_acc: { label: 'Left Accuracy', get: (g) => num(g.metrics?.left_side_accuracy), unit: '%', isPct: true, lowerIsBetter: false },
    right_acc: { label: 'Right Accuracy', get: (g) => num(g.metrics?.right_side_accuracy), unit: '%', isPct: true, lowerIsBetter: false },
    left_rt: { label: 'Left Avg RT', get: (g) => num(g.metrics?.left_side_avg_rt_ms), unit: 'ms', lowerIsBetter: true },
    right_rt: { label: 'Right Avg RT', get: (g) => num(g.metrics?.right_side_avg_rt_ms), unit: 'ms', lowerIsBetter: true },
  },
  'orbital-order': {
    duration: { label: 'Duration', get: (g) => num(g.duration_seconds), unit: 's', lowerIsBetter: true },
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.metrics?.summary?.livesRemaining ?? g.lives_remaining), lowerIsBetter: false },
    best_chain: { label: 'Best Chain', get: (g) => num(g.metrics?.summary?.maxChain), lowerIsBetter: false },
    accuracy: { label: 'Accuracy', get: (g) => num(g.metrics?.summary?.accuracy), unit: '%', isPct: true, lowerIsBetter: false },
    chain_completion: { label: 'Chain Completion', get: (g) => num(g.metrics?.summary?.chainCompletionRate), unit: '%', isPct: true, lowerIsBetter: false },
    trials: { label: 'Trials', get: (g) => num(g.metrics?.summary?.trialsOffered), lowerIsBetter: false },
    probe_accuracy: { label: 'Probe Accuracy', get: (g) => num(g.metrics?.summary?.probeAccuracy), unit: '%', isPct: true, lowerIsBetter: false },
    first_tap: { label: 'First-tap Latency', get: (g) => num(g.metrics?.summary?.firstTapLatencyMs), unit: 'ms', lowerIsBetter: true },
    inter_tap: { label: 'Inter-tap Latency', get: (g) => num(g.metrics?.summary?.interTapLatencyMs), unit: 'ms', lowerIsBetter: true },
    planning_ratio: { label: 'Planning Ratio', get: (g) => num(g.metrics?.summary?.planningRatio), unit: '×', lowerIsBetter: false },
    rule_switch_cost: { label: 'Rule Switch Cost', get: (g) => num(g.metrics?.summary?.ruleSwitchCostMs), unit: 'ms', lowerIsBetter: true },
    inhibition: { label: 'Inhibition Errors', get: (g) => num(g.metrics?.summary?.inhibitionIndex), unit: '%', isPct: true, lowerIsBetter: true },
    fatigue: { label: 'Fatigue Slope', get: (g) => num(g.metrics?.summary?.fatigueSlope), unit: '%', isPct: true, lowerIsBetter: true },
    rule_rechecks: { label: 'Rule Rechecks', get: (g) => num(g.metrics?.summary?.ruleRecheckCount), lowerIsBetter: true },
    baseline_tap: { label: 'Baseline Tap', get: (g) => num(g.metrics?.summary?.baselineTapLatencyMs), unit: 'ms', lowerIsBetter: true },
  },
  'beep-beep': {
    duration: { label: 'Duration', get: (g) => num(g.duration_seconds), unit: 's', lowerIsBetter: true },
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    lots_cleared: { label: 'Lots Cleared', get: (g) => num(g.levels_completed), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.lives_remaining), lowerIsBetter: false },
    planning_eff: { label: 'Planning Efficiency', get: (g) => num(g.metrics?.planning_efficiency), unit: '%', isPct: true, lowerIsBetter: false },
    deepest: { label: 'Deepest Solved', get: (g) => num(g.metrics?.deepest_optimal_solved), lowerIsBetter: false },
    optimal_rate: { label: 'Optimal Move Rate', get: (g) => num(g.metrics?.optimal_move_rate), unit: '%', isPct: true, lowerIsBetter: false },
    regressive: { label: 'Regressive Rate', get: (g) => num(g.metrics?.regressive_move_rate), unit: '%', isPct: true, lowerIsBetter: true },
    longest_plan: { label: 'Longest Plan Run', get: (g) => num(g.metrics?.longest_plan_run), lowerIsBetter: false },
    first_move_lat: { label: 'First-move Latency', get: (g) => num(g.metrics?.avg_first_move_latency_ms), unit: 'ms', lowerIsBetter: true },
    per_move: { label: 'Avg per Move', get: (g) => num(g.metrics?.avg_seconds_per_move), unit: 's', lowerIsBetter: true },
    hints: { label: 'Hints Used', get: (g) => num(g.metrics?.hints_used), lowerIsBetter: true },
    reversals: { label: 'Reversals', get: (g) => num(g.metrics?.total_reversals), lowerIsBetter: true },
    undos: { label: 'Undos', get: (g) => num(g.metrics?.total_undos), lowerIsBetter: true },
    resets: { label: 'Resets', get: (g) => num(g.metrics?.total_resets), lowerIsBetter: true },
    highest_grid: { label: 'Highest Grid', get: (g) => num(g.metrics?.highest_grid_size), lowerIsBetter: false },
  },
  'echo-keys': {
    melodies: { label: 'Melodies Cleared', get: (g) => num(g.levels_completed), lowerIsBetter: false },
    correct_notes: { label: 'Correct Notes', get: (g) => num(g.metrics?.totalCorrect), lowerIsBetter: false },
    wrong_notes: { label: 'Wrong Notes', get: (g) => num(g.metrics?.totalWrong), lowerIsBetter: true },
    accuracy: { label: 'Accuracy', get: (g) => num(g.metrics?.accuracy), unit: '%', isPct: true, lowerIsBetter: false },
    mean_resp: { label: 'Mean Response', get: (g) => num(g.metrics?.responseMs?.mean), unit: 'ms', lowerIsBetter: true },
    median_resp: { label: 'Median Response', get: (g) => num(g.metrics?.responseMs?.median), unit: 'ms', lowerIsBetter: true },
    fastest: { label: 'Fastest', get: (g) => num(g.metrics?.responseMs?.fastest), unit: 'ms', lowerIsBetter: true },
    best_streak: { label: 'Best Streak', get: (g) => num(g.metrics?.bestStreak), lowerIsBetter: false },
    button_hits: { label: 'Button Hits', get: (g) => num(g.metrics?.obstacleTask?.hits), lowerIsBetter: false },
    missed_cars: { label: 'Missed Cars', get: (g) => num(g.metrics?.obstacleTask?.misses), lowerIsBetter: true },
    false_alarms: { label: 'False Alarms', get: (g) => num(g.metrics?.obstacleTask?.falseAlarms), lowerIsBetter: true },
    mean_reaction: { label: 'Mean Reaction', get: (g) => num(g.metrics?.obstacleTask?.meanReactionMs), unit: 'ms', lowerIsBetter: true },
  },
  'peek-peek': {
    duration: { label: 'Duration', get: (g) => num(g.duration_seconds), unit: 's', lowerIsBetter: true },
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    levels: { label: 'Levels', get: (g) => num(g.levels_completed), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.metrics?.lives_remaining), lowerIsBetter: false },
    first_round_misses: { label: 'First-Round Misses', get: (g) => num(g.metrics?.first_round_misses_mean), lowerIsBetter: true },
    first_try_acc: { label: 'First-Try Accuracy', get: (g) => num(g.metrics?.first_attempt_accuracy_ex_final), unit: '%', isPct: true, lowerIsBetter: false },
    learning_slope: { label: 'Learning Slope', get: (g) => num(g.metrics?.learning_slope), lowerIsBetter: false },
    novel_errors: { label: 'Novel Hex Errors', get: (g) => num(g.metrics?.novel_hex_errors), lowerIsBetter: true },
    within_search: { label: 'Within-Search Err', get: (g) => num(g.metrics?.within_search_errors), lowerIsBetter: true },
    between_search: { label: 'Between-Search Err', get: (g) => num(g.metrics?.between_search_errors), lowerIsBetter: true },
    perseveration: { label: 'Perseveration Rate', get: (g) => num(g.metrics?.perseveration_rate), unit: '%', isPct: true, lowerIsBetter: true },
    capacity: { label: 'Capacity Est.', get: (g) => num(g.metrics?.capacity_estimate), lowerIsBetter: false },
    avg_first_tap: { label: 'Avg First Tap', get: (g) => num(g.metrics?.avg_first_tap_latency_ms), unit: 'ms', lowerIsBetter: true },
    inter_tap_slope: { label: 'Inter-Tap Slope', get: (g) => num(g.metrics?.inter_tap_slope_ms), unit: 'ms', lowerIsBetter: true },
    adjacency: { label: 'Adjacency Ratio', get: (g) => num(g.metrics?.adjacency_ratio), unit: '%', isPct: true, lowerIsBetter: false },
    search_org: { label: 'Search Org.', get: (g) => num(g.metrics?.search_organisation), unit: '%', isPct: true, lowerIsBetter: false },
    find_order: { label: 'Find-Order Index', get: (g) => num(g.metrics?.find_order_index), lowerIsBetter: false },
    mean_first_tap_x: { label: 'Mean First-Tap X', get: (g) => num(g.metrics?.mean_first_tap_x), lowerIsBetter: false },
    persev_asym: { label: 'Persev. Asymmetry', get: (g) => num(g.metrics?.perseveration_asymmetry), lowerIsBetter: false },
    control_find_order: { label: 'Control: Find-Order', get: (g) => num(g.metrics?.control_find_order_index), lowerIsBetter: false },
    control_first_tap_x: { label: 'Control: First-Tap X', get: (g) => num(g.metrics?.control_mean_first_tap_x), lowerIsBetter: false },
    control_latency_asym: { label: 'Control: Latency Asym', get: (g) => num(g.metrics?.control_first_tap_latency_asymmetry_ms), unit: 'ms', lowerIsBetter: false },
  },
  'tunnel-rush': {
    duration: { label: 'Duration', get: (g) => num(g.duration_seconds), unit: 's', lowerIsBetter: true },
    score: { label: 'Score', get: (g) => num(g.score), lowerIsBetter: false },
    level_reached: { label: 'Level Reached', get: (g) => num(g.highest_level), lowerIsBetter: false },
    lives_left: { label: 'Lives Left', get: (g) => num(g.lives_remaining), lowerIsBetter: false },
    accuracy: { label: 'Accuracy', get: (g) => num(g.metrics?.summary?.accuracy), unit: '%', isPct: true, lowerIsBetter: false },
    hit_rate: { label: 'Hit Rate', get: (g) => num(g.metrics?.summary?.hitRate), unit: '%', isPct: true, lowerIsBetter: true },
    avg_reaction: { label: 'Avg Reaction', get: (g) => num(g.metrics?.summary?.avgReactionMs), unit: 'ms', lowerIsBetter: true },
    median_rt: { label: 'Median RT', get: (g) => num(g.metrics?.summary?.medianReactionMs), unit: 'ms', lowerIsBetter: true },
    dodges: { label: 'Dodges', get: (g) => num(g.metrics?.summary?.dodges), lowerIsBetter: false },
    gates: { label: 'Gates', get: (g) => num(g.metrics?.summary?.gates), lowerIsBetter: false },
    rotations: { label: 'Rotations', get: (g) => num(g.metrics?.summary?.rotations), lowerIsBetter: false },
    best_streak: { label: 'Best Streak', get: (g) => num(g.metrics?.summary?.bestStreak), lowerIsBetter: false },
    no_move_rate: { label: 'No-Move Rate', get: (g) => num(g.metrics?.summary?.noMoveRate), unit: '%', isPct: true, lowerIsBetter: true },
  },
};

export function getMetricByLabel(gameId, label) {
  const g = REGISTRY[gameId];
  if (!g) return null;
  const found = Object.entries(g).find(([, m]) => m.label === label);
  return found ? { key: found[0], ...found[1] } : null;
}

export function getMetricByKey(gameId, key) {
  const g = REGISTRY[gameId];
  if (!g || !g[key]) return null;
  return { key, ...g[key] };
}

// Build the 30-day trend series for a metric. The window is the last `days`
// days from today (so every recent execution of the same game appears, no
// matter which session was clicked), but the clicked session is guaranteed to
// be included and highlighted even if it sits just outside that window.
export function buildTrendSeries(gameSessions, gameId, key, refSession, days = 30) {
  const meta = getMetricByKey(gameId, key);
  if (!meta) return { points: [], meta: null, startDate: null, refDate: null };
  const now = new Date();
  const ref = refSession ? new Date(refSession.session_date || refSession.created_date) : now;
  if (isNaN(ref.getTime())) return { points: [], meta, startDate: null, refDate: null };
  // Window end = latest of "now" and the clicked session, so the clicked run
  // is always visible; window spans `days` back from that end.
  const end = ref.getTime() > now.getTime() ? ref : now;
  const start = new Date(end.getTime() - days * 86400000);
  const sessions = (gameSessions || [])
    .filter((g) => g.game_id === gameId)
    .filter((g) => {
      const d = new Date(g.session_date || g.created_date);
      return !isNaN(d.getTime()) && d >= start && d <= end;
    })
    .sort((a, b) => new Date(a.session_date || a.created_date) - new Date(b.session_date || b.created_date));
  let runBest = null;
  const points = sessions
    .map((g) => {
      const v = meta.get(g);
      if (v == null) return null;
      const val = meta.isPct ? v * 100 : v;
      runBest =
        runBest == null
          ? val
          : meta.lowerIsBetter
            ? Math.min(runBest, val)
            : Math.max(runBest, val);
      return {
        id: g.id,
        date: g.session_date || g.created_date,
        value: val,
        bestSoFar: runBest,
        isCurrent: !!(refSession && g.id === refSession.id),
        status: g.status,
      };
    })
    .filter(Boolean);
  return { points, meta, startDate: start, refDate: end };
}

export function formatTrendValue(v, meta) {
  if (v == null || isNaN(v)) return '—';
  if (meta.isPct) return `${Math.round(v)}%`;
  if (meta.unit === 'ms') return `${Math.round(v)}ms`;
  if (meta.unit === 's') return `${v.toFixed(1)}s`;
  if (meta.unit === '×') return `${v.toFixed(2)}×`;
  if (meta.unit === 'px') return `${Math.round(v)}px`;
  return `${Math.round(v * 100) / 100}`;
}