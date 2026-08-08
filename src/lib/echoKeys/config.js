/**
 * Echo Keys — configuration, game-HTML patching, and results payload.
 *
 * The game ships as a self-contained vanilla-JS HTML file (no build step,
 * no ES modules). It reads its `br` / `obstacle` config from
 * `window.location.search`. When we embed it in a same-origin iframe via
 * `srcdoc` the location search is empty, so we patch the game's `qs()`
 * helper to also read an injected `window.__EK_QS` global, and inject that
 * global before any game script runs.
 */

export const GAME_ID = 'echo-keys';
export const GAME_VERSION = '1.0';

// Public CDN URL of the self-contained game file.
export const GAME_HTML_URL =
  'https://media.base44.com/files/public/6a53fb14473d432d3056ed57/60c03b30c_echo-keys.html';

// The exact line inside the game's qs() function we override so the config
// can be supplied via window.__EK_QS instead of location.search.
const QS_LINE =
  "var s = (W.location && W.location.search) ? W.location.search.replace(/^\\?/, '') : '';";
const QS_REPLACEMENT =
  "var s = ''; if (W.__EK_QS) { s = String(W.__EK_QS).replace(/^\\?/, ''); } " +
  "else if (W.location && W.location.search) { s = W.location.search.replace(/^\\?/, ''); }";

// The ball rests at 30%/24% down the key (near the back), but the letter
// labels sit near the front. Reposition the ball's contact point to sit
// just above the letter on each key.
const BALL_LINE =
  "var contactY = keysEl.clientHeight * (isWhite(midi) ? 0.30 : 0.24);";
const BALL_REPLACEMENT =
  "var contactY = el.offsetTop + el.offsetHeight - (isWhite(midi) ? 40 : 28) * u;";

export function parseParams(searchParams) {
  const get = (k, d) => searchParams.get(k) ?? d;
  const brRaw = String(get('br', 'default') || 'default').trim().toLowerCase();
  const br = brRaw === 'right' || brRaw === 'left' ? brRaw : 'default';
  const obstacle = String(get('obstacle', 'false')).trim().toLowerCase() === 'true';
  return {
    patientId: get('patientId', ''),
    callbackUrl: get('callbackUrl', ''),
    br,
    obstacle,
  };
}

/**
 * Take the raw self-contained game HTML and patch it so:
 *  1. it reads config from window.__EK_QS (set for srcdoc embeds), and
 *  2. that global is injected in <head> before any game script runs.
 */
export function buildGameHtml(rawHtml, br, obstacle) {
  const qs = `?br=${encodeURIComponent(br)}&obstacle=${obstacle ? 'true' : 'false'}`;
  const inject = `<script>window.__EK_QS=${JSON.stringify(qs)};</script>`;
  let html = rawHtml.replace(QS_LINE, QS_REPLACEMENT);
  html = html.replace(BALL_LINE, BALL_REPLACEMENT);
  html = html.replace('</head>', `${inject}</head>`);
  return html;
}

/**
 * Map the game's summary object into a GameSession-compatible payload that
 * the receiveGameResults backend function understands.
 */
export function buildPayload(summary, cfg, status) {
  const s = summary || {};
  const perMelody = s.perMelody || [];
  const melodiesCompleted = perMelody.filter((m) => m.completed).length;
  const durationSeconds = Math.round((s.durationMs || 0) / 1000);
  const sessionId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ek-${Date.now()}`;

  return {
    game_id: GAME_ID,
    patient_id: cfg.patientId,
    patient_name: '',
    session_id: sessionId,
    session_date: s.generatedAt || new Date().toISOString(),
    version: GAME_VERSION,
    score: s.totalCorrect || 0,
    duration_seconds: durationSeconds,
    levels_completed: melodiesCompleted,
    highest_level: melodiesCompleted,
    lives_remaining: 0,
    input_method: 'keyboard/mouse',
    status,
    metrics: {
      ...s,
      duration_seconds: durationSeconds,
      levels_completed: melodiesCompleted,
      highest_level: melodiesCompleted,
      br: cfg.br,
      obstacle: cfg.obstacle,
    },
    level_history: perMelody.map((m, i) => ({
      level: i + 1,
      name: m.name,
      completed: m.completed,
      rounds_cleared: m.roundsCleared,
      notes: m.notes,
      correct: m.correct,
      wrong: m.wrong,
      best_streak: m.bestStreak,
      mean_response_ms: m.meanResponseMs,
      score_earned: m.correct,
      duration_seconds: 0,
    })),
  };
}