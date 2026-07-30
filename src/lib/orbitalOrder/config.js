/**
 * Orbital Order — configuration, URL-param parsing, colour tokens, difficulty.
 * All visuals are generated in code; no bitmap assets.
 */

export const GAME_ID = 'orbital-order';
export const VERSION = '1.0.0';

// Eight colour tokens. Each carries a redundant rim-ring pattern so the rule
// stays executable for colour-vision-deficient patients. Ring geometry is
// identical in both neon modes — only chroma + emissive core change.
export const COLOR_TOKENS = {
  BLUE:    { ring: 'solid',    neon0: '#3D7BFF', neon1: '#2E9BFF' },
  TEAL:    { ring: 'double',   neon0: '#25B7A8', neon1: '#16E8C8' },
  LIME:    { ring: 'notched',  neon0: '#BFD73E', neon1: '#C6FF33' },
  AMBER:   { ring: 'dashed',   neon0: '#F2A93B', neon1: '#FFB629' },
  RED:     { ring: 'thick',    neon0: '#E0503A', neon1: '#FF4A34' },
  MAGENTA: { ring: 'dotted',   neon0: '#E0479E', neon1: '#FF39B0' },
  VIOLET:  { ring: 'quadrant', neon0: '#9A6BF5', neon1: '#A855FF' },
  SLATE:   { ring: 'inner',    neon0: '#8FA0BC', neon1: '#9FBEE8' },
};
export const TOKEN_ORDER = ['BLUE', 'TEAL', 'LIME', 'AMBER', 'RED', 'MAGENTA', 'VIOLET', 'SLATE'];

// Per-level parameters. Sphere count capped at 5; duplicate glyph pairs make
// the traversal (secondary sort key) load-bearing.
export const DIFFICULTY = {
  1: { sphereCount: 3, duplicatePairs: 0, revealMs: 2000, responseWindowMult: 1.8 },
  2: { sphereCount: 3, duplicatePairs: 0, revealMs: 1700, responseWindowMult: 1.6 },
  3: { sphereCount: 4, duplicatePairs: 2, revealMs: 1400, responseWindowMult: 1.4 },
  4: { sphereCount: 5, duplicatePairs: 2, revealMs: 1200, responseWindowMult: 1.2 },
  5: { sphereCount: 5, duplicatePairs: 3, revealMs: 1000, responseWindowMult: 1.0 },
};

export const GLYPH_SETS = {
  DIGITS: ['2', '3', '4', '5', '6', '7', '8', '9'],
  LETTERS: ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
};

// Session segments (Fig 12)
export const SEGMENTS = {
  PRACTICE:      { label: 'Practice',        trials: 3, scored: false },
  MOTOR:         { label: 'Motor Baseline',  trials: 5, scored: false },
  PROBE:         { label: 'Probe Block',     trials: 5, scored: true },
  RULES:         { label: 'Rule Blocks',     trials: 0, scored: true }, // 0 = until time / max
  SUMMARY:       { label: 'Summary',         trials: 0, scored: false },
};

export const PROBE_DIFFICULTY = 3;
export const MAX_RULE_TRIALS = 24; // fallback cap when time_to_play = 0
export const BASE_RESPONSE_PER_TARGET_MS = 3000;

/* ---------- URL parameters ---------- */

export function parseParams(searchParams) {
  const get = (k, d) => searchParams.get(k) ?? d;
  const num = (k, d) => {
    const v = parseInt(searchParams.get(k), 10);
    return Number.isFinite(v) ? v : d;
  };
  const difficulty = Math.min(5, Math.max(1, num('difficulty_level', 3)));
  return {
    br: get('br', 'left') === 'right' ? 'right' : 'left',
    difficulty_level: difficulty,
    time_to_play: num('time_to_play', 0),            // seconds, 0 = untimed (max_trials cap)
    countdown_timer: num('countdown_timer', 0),      // seconds per trial, 0 = none
    orientation: get('orientation', 'auto'),
    bg: get('bg', 'dark'),
    neon: num('neon', 0) === 1 ? 1 : 0,
    rule_visible: get('rule_visible', 'onrequest') === 'always' ? 'always' : 'onrequest',
    glyphType: get('glyphType', 'DIGITS') === 'LETTERS' ? 'LETTERS' : 'DIGITS',
    reduce_motion: num('reduce_motion', 0) === 1,
    patientId: get('patientId', ''),
    callbackUrl: get('callbackUrl', ''),
    lang: get('lang', 'en'),
  };
}

/* ---------- Colour helpers ---------- */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Perceptual luminance on a 0–255 scale.
export function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Chrome (interface ink: rings, badges, trail, HUD text) is achromatic and
// derived from the background luminance so an arbitrary bg hex can't produce
// an unreadable board.
export function chromeColor(bgHex) {
  return relLuminance(bgHex) < 140 ? '#F2F4F8' : '#0A0C12';
}

// Ring tint flips on bright fills (LIME) so a white-mixed ring doesn't vanish.
export function ringColor(fillHex, chrome) {
  return relLuminance(fillHex) > 165 ? '#0A0C12' : chrome;
}

export function glyphColor() {
  return '#0A0C12'; // dark glyph on every fill — contrast re-asserted, not assumed
}

// Resolve the bg token (or arbitrary hex) to a concrete field colour. neon=1 on
// a light-resolved background falls back to neon=0 (acceptance §11).
export function resolveBg(bg, neon) {
  let fieldHex;
  let grid = false;
  let neonEffective = neon;
  let warning = null;

  if (bg === 'dark') fieldHex = neon ? '#040509' : '#0A0C12';
  else if (bg === 'light') { fieldHex = '#F8F9FB'; if (neon) { neonEffective = 0; warning = 'NEON_DISABLED_ON_LIGHT_BG'; } }
  else if (bg === 'grid') { fieldHex = neon ? '#040509' : '#0A0C12'; grid = true; }
  else if (/^#?[0-9a-fA-F]{6}$/.test(bg)) {
    fieldHex = bg.startsWith('#') ? bg : '#' + bg;
    if (neon && relLuminance(fieldHex) > 140) { neonEffective = 0; warning = 'NEON_DISABLED_ON_LIGHT_BG'; }
  } else fieldHex = neon ? '#040509' : '#0A0C12';

  return { fieldHex, grid, neon: neonEffective, warning };
}

export function tokenFill(tokenName, neon) {
  const t = COLOR_TOKENS[tokenName];
  return neon ? t.neon1 : t.neon0;
}

export function responseWindowMs(difficulty) {
  return Math.round(BASE_RESPONSE_PER_TARGET_MS * DIFFICULTY[difficulty].responseWindowMult);
}