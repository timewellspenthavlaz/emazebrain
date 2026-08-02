/**
 * Beep Beep — configuration, URL-param parsing, progression + scoring.
 * Adopt the Block Crasher / Kuku Kub launch-parameter set; reinterpret
 * orientation as the exit side.
 */

export const GAME_ID = 'beep-beep';
export const VERSION = '1.0';

export const BUDGET_FACTOR = { 1: 3.0, 2: 2.75, 3: 2.5, 4: 2.25, 5: 2.0 };
export const DIFFICULTY_MULT = { 1: 1.0, 2: 1.2, 3: 1.4, 4: 1.7, 5: 2.0 };

export const STARTING_LIVES = 3;
export const MAX_LEVEL = 50;
export const SOLVER_CAP = 250000;

export function gridBand(level) {
  if (level <= 10) return 4;
  if (level <= 22) return 5;
  if (level <= 38) return 6;
  return 7;
}

export function budget(optimal, diff) {
  return Math.max(optimal + 2, Math.ceil(optimal * (BUDGET_FACTOR[diff] || 2.5)));
}

export function tileFactor(n) {
  return (n * n) / 12;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
export function speedBonus(levelSeconds) {
  return clamp(1.8 - levelSeconds / 45, 1.0, 1.8);
}
export function streakMult(streak) {
  return 1 + Math.min(streak, 10) * 0.05;
}
export function efficiencyMult(optimal, moves) {
  return 0.45 + 0.55 * (optimal / Math.max(optimal, moves));
}

export function computeAward(n, diff, levelSeconds, streak, optimal, moves) {
  return Math.round(
    100 *
      tileFactor(n) *
      (DIFFICULTY_MULT[diff] || 1.4) *
      speedBonus(levelSeconds) *
      streakMult(streak) *
      efficiencyMult(optimal, moves)
  );
}

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
  const lives = clamp(num('lives', STARTING_LIVES), 0, 9);
  const orientation = get('orientation', 'right') === 'left' ? 'left' : 'right';
  const br = get('br', '') === 'right' ? 'right' : get('br', '') === 'left' ? 'left' : null;
  const countdown = get('countdown_timer', 'none');
  const cdType = countdown === 'left' ? 'left' : countdown === 'right' ? 'right' : 'none';

  return {
    patientId: get('patientId', ''),
    callbackUrl: get('callbackUrl', ''),
    time_to_play: num('time_to_play', 0),
    difficulty_level: difficulty,
    level,
    max_level: maxLevel,
    bg: get('bg', ''),
    countdown_timer: cdType,
    br,
    lives,
    orientation,
    show_answer_on_miss: bool('show_answer_on_miss', true),
    hint_after: num('hint_after', 0),
    sound: bool('sound', false),
    paletteBand: br === 'right' ? 'cold' : br === 'left' ? 'warm' : 'neutral',
  };
}

/**
 * Pick a replacement board (same grid size, different grid string) matching
 * depth exactly where possible, within one move otherwise, nearest otherwise.
 */
export function findReplacement(pack, failed, allSeen) {
  const n = failed.n;
  const opt = failed.optimal;
  const sameGrid = pack.filter((b) => b.n === n && b.grid !== failed.grid);
  const notSeen = (b) => !allSeen || !allSeen.has(b.grid);

  const tiers = [
    sameGrid.filter((b) => b.optimal === opt && notSeen(b)),
    sameGrid.filter((b) => Math.abs(b.optimal - opt) <= 1 && notSeen(b)),
    sameGrid.filter((b) => notSeen(b)),
    sameGrid,
  ];
  for (const tier of tiers) {
    if (tier.length) return tier[Math.floor(Math.random() * tier.length)];
  }
  return failed;
}