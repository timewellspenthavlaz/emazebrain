/**
 * Peek Peek — configuration, URL-param parsing, progression + scoring.
 *
 * Object-location memory game (4th title in the clinical suite). Adopt the
 * Block Crasher / Kuku Kub / Beep Beep launch-parameter set; reinterpret
 * `orientation` as the hemifield bias of target placement, and add `pack`
 * (themed picture sets), `hidden_count`, `max_level` and `control_trial`.
 *
 * Heart budgets here are derived from the λ = 2.5 expected-miss model
 * (closed form), NOT empirically-measured M₀.₈₅. Per the spec, λ and β must
 * be re-fitted from pilot data before any normative claim — so the budgets
 * are a faithful lower bound, flagged in the payload, until that re-fit.
 */

export const GAME_ID = 'peek-peek';
export const VERSION = '1.0';
export const MAX_LEVEL = 50;

export const DIFFICULTY_MULT = { 1: 1.0, 2: 1.2, 3: 1.4, 4: 1.7, 5: 2.0 };

// Generating-function constants
export const G = { 1: 0.78, 2: 0.89, 3: 1.00, 4: 1.13, 5: 1.28 };
export const SKEW = { 1: 0.00, 2: 0.05, 3: 0.18, 4: 0.38, 5: 0.60 };
export const SLACK = { 1: 4.0, 2: 3.25, 3: 2.5, 4: 2.0, 5: 1.5 };
export const SINGLETONS = { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 };
// ρ = adjacency-clustering target (0 = forbid same-picture neighbours, 0.8 = cluster)
export const RHO = { 1: 0.80, 2: 0.55, 3: 0.32, 4: 0.12, 5: 0.00 };
export const RELIEF = new Set([6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 47]);
// Symmetric probe levels — all on interlock (mirror-symmetric) boards
export const PROBE_LEVELS = new Set([4, 13, 17, 21, 25, 33, 41, 45]);

// The 12 board row-vectors. T grows 7 → 35 across 50 levels (4 levels each).
export const BOARDS = [
  { T: 7, rows: [2, 3, 2], family: 'interlock' },
  { T: 9, rows: [3, 3, 3], family: 'brick' },
  { T: 12, rows: [3, 3, 3, 3], family: 'brick' },
  { T: 14, rows: [2, 3, 4, 3, 2], family: 'interlock' },
  { T: 17, rows: [3, 4, 3, 4, 3], family: 'interlock' },
  { T: 19, rows: [3, 4, 5, 4, 3], family: 'interlock' },
  { T: 22, rows: [4, 5, 4, 5, 4], family: 'interlock' },
  { T: 25, rows: [5, 5, 5, 5, 5], family: 'brick' },
  { T: 27, rows: [4, 5, 4, 5, 4, 5], family: 'interlock' },
  { T: 30, rows: [5, 5, 5, 5, 5, 5], family: 'brick' },
  { T: 32, rows: [5, 4, 5, 4, 5, 4, 5], family: 'interlock' },
  { T: 35, rows: [5, 5, 5, 5, 5, 5, 5], family: 'brick' },
];

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function boardForLevel(level) {
  const idx = Math.min(BOARDS.length - 1, Math.max(0, Math.floor((level - 1) / 4)));
  return BOARDS[idx];
}

export function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

export function isRelief(level) {
  return RELIEF.has(level);
}

export function singletonsFor(d, T) {
  return T >= 20 ? SINGLETONS[d] || 0 : 0;
}

/** Study seconds: max(3.0, round_half(1.6 + 0.225·T)) + 0.5 on relief levels. */
export function studySeconds(level) {
  const b = boardForLevel(level);
  let s = Math.max(3.0, roundHalf(1.6 + 0.225 * b.T));
  if (isRelief(level)) s += 0.5;
  return s;
}

/** Distinct pictures K for a level + difficulty, clamped to pack size. */
export function KforLevel(level, d, packSize) {
  const b = boardForLevel(level);
  const T = b.T;
  const sing = singletonsFor(d, T);
  const cap = Math.min(packSize, Math.floor(T / 2) + sing);
  let k = clamp(Math.round((2.0 + 8.6 * Math.pow((level - 1) / 49, 0.9)) * G[d]), 2, cap);
  if (isRelief(level) && level > 1) {
    const prevK = KforLevel(level - 1, d, packSize);
    k = Math.max(2, Math.min(k - 1, prevK - 1));
  }
  return k;
}

/** Copy partition: every picture starts at 2 (or 1 for singletons), remainder
 *  round-robin, then skew moves mass small→large capped at max(4, ⌊T/K⌋+2). */
export function copyPartition(T, K, level, d) {
  const sing = singletonsFor(d, T);
  const minCopies = d <= 3 ? 2 : 1;
  const counts = new Array(K).fill(2);
  for (let i = 0; i < sing && i < K; i++) counts[i] = 1;
  let remaining = T - counts.reduce((a, b) => a + b, 0);
  let i = sing % K;
  while (remaining > 0) {
    counts[i]++;
    remaining--;
    i = (i + 1) % K;
  }
  const skew = Math.min(0.75, (SKEW[d] || 0) + (0.22 * (level - 1)) / 49);
  const cap = Math.max(4, Math.floor(T / K) + 2);
  applySkew(counts, skew, cap, minCopies, sing);
  return counts;
}

function applySkew(counts, skew, cap, minCopies, sing) {
  const movable = counts.reduce((a, c, idx) => {
    const floor = idx < sing ? 1 : minCopies;
    return a + Math.max(0, c - floor);
  }, 0);
  let moves = Math.round(skew * movable);
  while (moves-- > 0) {
    let smallIdx = -1;
    let smallVal = Infinity;
    for (let i = 0; i < counts.length; i++) {
      const floor = i < sing ? 1 : minCopies;
      if (counts[i] > floor && counts[i] < smallVal) {
        smallVal = counts[i];
        smallIdx = i;
      }
    }
    let bigIdx = -1;
    let bigVal = -1;
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] < cap && counts[i] > bigVal) {
        bigVal = counts[i];
        bigIdx = i;
      }
    }
    if (smallIdx < 0 || bigIdx < 0 || smallIdx === bigIdx) break;
    counts[smallIdx]--;
    counts[bigIdx]++;
  }
}

/** Expected wrong-tap count of a reference patient with fidelity p.
 *  W(c,H) = c·(H−c)/(c+1), summed over rounds against a shrinking pool, scaled
 *  by (1−p). The free final round contributes W(c,c)=0 by construction. */
export function expectedMisses(partition, p) {
  const K = partition.length;
  let total = 0;
  for (let r = 0; r < K; r++) {
    let H = 0;
    for (let j = r; j < K; j++) H += partition[j];
    const c = partition[r];
    total += (c * (H - c)) / (c + 1);
  }
  return (1 - p) * total;
}

/** Heart budget = max(3, round(M₀.₈₅ + SLACK[d])). Model-derived, not pilot-fit. */
export function heartBudgetFor(level, d, partition) {
  const m = expectedMisses(partition, 0.85);
  return Math.max(3, Math.round(m + (SLACK[d] || 2.5)));
}

// ---- scoring ----
export function tileFactor(T) {
  return T / 12;
}
export function speedBonus(levelSeconds) {
  return clamp(1.8 - levelSeconds / 60, 1.0, 1.8);
}
export function streakMult(streak) {
  return 1 + Math.min(streak, 10) * 0.05;
}
export function accuracyMult(heartsRemaining, bud) {
  return 0.45 + 0.55 * (bud > 0 ? heartsRemaining / bud : 1);
}
export function computeAward(T, d, levelSeconds, streak, heartsRemaining, bud) {
  return Math.round(
    100 *
      tileFactor(T) *
      (DIFFICULTY_MULT[d] || 1.4) *
      speedBonus(levelSeconds) *
      streakMult(streak) *
      accuracyMult(heartsRemaining, bud)
  );
}

// ---- params ----
export function parseParams(searchParams) {
  const get = (k, d) => searchParams.get(k) ?? d;
  const num = (k, d) => {
    const v = parseInt(searchParams.get(k), 10);
    return Number.isFinite(v) ? v : d;
  };
  const bool = (k, d) => {
    const v = searchParams.get(k);
    if (v === null || v === undefined) return d;
    return v === 'true' || v === '1';
  };

  const difficulty = clamp(num('difficulty_level', 3), 1, 5);
  const level = clamp(num('level', 1), 1, MAX_LEVEL);
  const maxLevel = clamp(num('max_level', MAX_LEVEL), 1, MAX_LEVEL);
  const lives = clamp(num('lives', 3), 0, 9);
  const mode = get('mode', 'assessment') === 'therapy' ? 'therapy' : 'assessment';
  const packRaw = String(get('pack', 'marine')).toLowerCase();
  const pack = ['household', 'faces', 'marine', 'animals', 'rotate'].includes(packRaw)
    ? packRaw
    : 'marine';
  const orientationRaw = String(get('orientation', 'none')).toLowerCase();
  const orientation = ['none', 'left', 'right', 'left_strong', 'right_strong'].includes(orientationRaw)
    ? orientationRaw
    : 'none';
  const brRaw = String(get('br', '')).toLowerCase();
  const br = brRaw === 'right' ? 'right' : brRaw === 'left' ? 'left' : null;
  const countdown = String(get('countdown_timer', 'none')).toLowerCase();
  const cdType = countdown === 'left' ? 'left' : countdown === 'right' ? 'right' : 'none';
  const hiddenCount =
    searchParams.get('hidden_count') == null ? mode === 'therapy' : bool('hidden_count', false);
  const controlTrial = bool('control_trial', true);
  const studyTimeOverride = num('study_time', 0) > 0 ? num('study_time', 0) : null;
  const sound = bool('sound', false);
  const paletteBand = br === 'right' ? 'cold' : br === 'left' ? 'warm' : 'neutral';
  const langRaw = String(get('lang', 'en')).toLowerCase();
  const lang = ['en', 'he', 'fr', 'es', 'ru', 'zh'].includes(langRaw) ? langRaw : 'en';

  return {
    patientId: get('patientId', ''),
    callbackUrl: get('callbackUrl', ''),
    time_to_play: Math.max(0, num('time_to_play', 0)),
    difficulty_level: difficulty,
    level,
    max_level: maxLevel,
    bg: get('bg', ''),
    countdown_timer: cdType,
    br,
    lives,
    mode,
    pack,
    orientation,
    hidden_count: hiddenCount,
    control_trial: controlTrial,
    study_time: studyTimeOverride,
    sound,
    paletteBand,
    lang,
  };
}