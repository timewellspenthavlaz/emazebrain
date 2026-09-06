/**
 * Tunnel Rush — configuration, URL-param parsing, themes, difficulty presets.
 *
 * Accepts the standard platform launch set (patientId, callbackUrl,
 * difficulty_level, br, time_to_play, bg, lang) and maps it onto the native
 * Tunnel Rush options; native options (objectType, lanes, direction, theme,
 * spinSpeed, …) pass straight through. Unknown parameters are ignored.
 */

export const GAME_ID = 'tunnel-rush';
export const VERSION = '1.0.0';
export const MAX_LEVEL = 10;
export const VIEW_DEPTH = 7;      // world units of visible tunnel ahead
export const OBSTACLES_PER_LEVEL = 8; // progressive level-up cadence

export const LANES_ALLOWED = [6, 8, 10, 12];

// Difficulty bands for adaptive pacing: the run starts at speedMin and creeps
// toward speedMax while the patient dodges cleanly; a hit eases it back down.
// obstacleSpacing is the depth gap between objects (smaller = faster cadence);
// maxJump bounds how far the next object's lane can sit from the previous
// one, so every object stays reachable at the current speed.
export const DIFFICULTY_PRESETS = {
  easy:   { speedMin: 2.4, speedMax: 3.6, obstacleSpacing: 5.0, maxJump: 2 },
  medium: { speedMin: 3.0, speedMax: 4.6, obstacleSpacing: 4.2, maxJump: 3 },
  hard:   { speedMin: 3.8, speedMax: 5.8, obstacleSpacing: 3.4, maxJump: 4 },
};

// Per-level tuning (level 1..10): the band's ceiling rises slightly each level.
export const LEVEL_BONUS = { speed: 0.08 };

// Themes follow the committed palette: Primary Dark #090D16, Surface #121826,
// Cyan #00F0FF, Amber #FFB800, Crimson #FF2E63.
export const THEMES = {
  dark:         { page: '#090D16', surface: '#121826', accent: '#00F0FF', alert: '#FFB800', hit: '#FF2E63', text: '#F4F7FC', muted: '#94A3B8' },
  light:        { page: '#F1F5F9', surface: '#E2E8F0', accent: '#0891B2', alert: '#D97706', hit: '#E11D48', text: '#0F172A', muted: '#64748B' },
  ocean:        { page: '#06202B', surface: '#0B2E3D', accent: '#00F0FF', alert: '#FFB800', hit: '#FF2E63', text: '#EAF7FB', muted: '#7FA8B8' },
  sunset:       { page: '#190D16', surface: '#251220', accent: '#FFB800', alert: '#FF7A3D', hit: '#FF2E63', text: '#FBF0EA', muted: '#B08A9A' },
  forest:       { page: '#0A1710', surface: '#12241A', accent: '#39FF88', alert: '#FFB800', hit: '#FF2E63', text: '#EDFBF2', muted: '#7FA88F' },
  neon:         { page: '#090D16', surface: '#121826', accent: '#00F0FF', alert: '#FF2E63', hit: '#FF2E63', text: '#FFFFFF', muted: '#9AA6C4' },
  highContrast: { page: '#000000', surface: '#0A0A0A', accent: '#FFFFFF', alert: '#FFD400', hit: '#FF3B3B', text: '#FFFFFF', muted: '#B8B8B8' },
};

export const SHAPES = ['circle', 'square', 'triangle', 'cross', 'star', 'hexagon'];
export const LETTER_POOL = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
export const NUMBER_POOL = ['2', '3', '4', '5', '6', '7', '8', '9'];
export const FACE_MOODS = ['calm', 'happy', 'surprised', 'serious'];

export const SCENE_MODES = ['gradient', 'solid', 'stars', 'grid', 'rings'];

function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z]/g, ''); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function isHex(v) { return /^#?[0-9a-fA-F]{6}$/.test(String(v || '')); }
function toHex(v) { return String(v).startsWith('#') ? v : '#' + v; }

export function parseParams(searchParams) {
  const get = (k, d) => searchParams.get(k) ?? d;
  const num = (k, d) => { const v = parseInt(searchParams.get(k), 10); return Number.isFinite(v) ? v : d; };
  const bool = (k, d) => {
    const v = searchParams.get(k);
    if (v === null || v === undefined) return d;
    return v === 'true' || v === '1';
  };

  // ---- standard platform set (auto-mapped) ----
  const patientId = get('patientId', '');
  const callbackUrl = get('callbackUrl', '');
  const timeToPlay = Math.max(0, num('time_to_play', 120));
  const difficultyLevel = clamp(num('difficulty_level', 3), 1, 5);
  const br = get('br', '') === 'left' ? 'left' : get('br', '') === 'right' ? 'right' : null;
  const langRaw = norm(get('lang', 'en'));
  const lang = ['en', 'he', 'fr', 'es', 'ru', 'zh'].includes(langRaw) ? langRaw : 'en';

  // ---- native Tunnel Rush set ----
  // difficulty: native wins; otherwise derived from difficulty_level 1-5.
  const diffRaw = norm(get('difficulty', ''));
  const difficulty = ['easy', 'medium', 'hard'].includes(diffRaw)
    ? diffRaw
    : (difficultyLevel <= 2 ? 'easy' : difficultyLevel === 3 ? 'medium' : 'hard');

  const objectTypeRaw = norm(get('objectType', get('objecttype', 'shapes')));
  const objectType = ['shapes', 'realisticfaces', 'cartoonfaces', 'numbers', 'letters', 'mixed'].includes(objectTypeRaw)
    ? objectTypeRaw
    : 'shapes';

  const objectSet = String(get('objectSet', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const objectOrientation = get('objectOrientation', 'upright') === 'wall' ? 'wall' : 'upright';

  const lanesRaw = num('lanes', 8);
  const lanes = LANES_ALLOWED.includes(lanesRaw) ? lanesRaw : 8;
  const level = clamp(num('level', 1), 1, MAX_LEVEL);
  const progressive = bool('progressive', true);
  const directionRaw = norm(get('direction', 'none'));
  const direction = ['none', 'cw', 'ccw', 'alternate'].includes(directionRaw) ? directionRaw : 'none';
  const spinSpeed = clamp(num('spinSpeed', 14), 0, 60);

  const themeRaw = norm(get('theme', get('colorTheme', 'dark')));
  const theme = THEMES[themeRaw] ? themeRaw : 'dark';

  // `bg`: native scene keyword (gradient/solid/stars/grid/rings) vs the
  // platform's background image URL / hex — disambiguated by value.
  const bgRaw = get('bg', get('background', 'gradient'));
  const scene = SCENE_MODES.includes(norm(bgRaw)) ? norm(bgRaw) : 'gradient';
  const pageBg = SCENE_MODES.includes(norm(bgRaw)) ? '' : bgRaw;

  const bgColor = get('bgColor', '');
  const accentColor = get('accentColor', '');

  const timerDefault = br === 'left' ? 'top-left' : 'top-right';
  const timerPosition = get('timerPosition', timerDefault);
  const showScore = bool('showScore', true);
  const lives = Math.max(0, num('maxHits', num('lives', 3))); // 0 = endless
  const sound = bool('sound', false); // WebAudio only, off by default (suite convention)
  const autoStart = bool('autoStart', false);
  const debug = bool('debug', false);
  const reduceMotion = bool('reduce_motion', false);

  return {
    patientId, callbackUrl, timeToPlay, difficultyLevel, br, lang,
    difficulty, objectType, objectSet, objectOrientation,
    lanes, level, progressive, direction, spinSpeed, theme, scene, pageBg,
    bgColor, accentColor, timerPosition, showScore, lives,
    sound, autoStart, debug, reduceMotion,
  };
}

// Effective theme colors after bgColor / accentColor overrides.
export function resolveTheme(cfg) {
  const t = { ...THEMES[cfg.theme] };
  if (isHex(cfg.bgColor)) t.page = toHex(cfg.bgColor);
  if (isHex(cfg.accentColor)) t.accent = toHex(cfg.accentColor);
  return t;
}

// Page background: platform bg param (image URL or hex) or the theme page color.
export function pageBackground(cfg, theme) {
  const bg = cfg.pageBg;
  if (!bg) return theme.page;
  if (/^https?:\/\//.test(bg)) return `url("${bg}") center/cover no-repeat`;
  if (isHex(bg)) return toHex(bg);
  return theme.page;
}

// The glyph pool for the session — the objects that can appear on the walls.
// objectSet (comma list) overrides the default pool for every type.
export function glyphPool(cfg) {
  const custom = cfg.objectSet;
  switch (cfg.objectType) {
    case 'letters':
      return (custom.length ? custom : LETTER_POOL).map((label) => ({ type: 'letters', label }));
    case 'numbers':
      return (custom.length ? custom : NUMBER_POOL).map((label) => ({ type: 'numbers', label }));
    case 'cartoonFaces':
      return (custom.length ? custom : FACE_MOODS).map((label) => ({ type: 'cartoonFaces', label }));
    case 'realisticFaces':
      return (custom.length ? custom : FACE_MOODS).map((label) => ({ type: 'realisticFaces', label }));
    case 'shapes':
      return (custom.length ? custom : SHAPES).map((label) => ({ type: 'shapes', label: norm(label) }));
    case 'mixed':
    default: {
      const pool = [];
      for (const label of custom.length ? custom : SHAPES) pool.push({ type: 'shapes', label: norm(label) });
      if (!custom.length) {
        for (const label of LETTER_POOL.slice(0, 6)) pool.push({ type: 'letters', label });
        for (const label of NUMBER_POOL.slice(0, 4)) pool.push({ type: 'numbers', label });
        for (const label of FACE_MOODS) pool.push({ type: 'cartoonFaces', label });
      } else {
        for (const label of custom) pool.push({ type: 'letters', label });
      }
      return pool;
    }
  }
}