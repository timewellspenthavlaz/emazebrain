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

// Shuffle the melody order so the game doesn't always open with Twinkle.
// Injected right after PM.MELODIES is assigned (Fisher-Yates in place).
const MELODIES_END_LINE =
  "      notes: seq(greenM, greenD)\n    }\n  ];";
const MELODIES_END_REPLACEMENT =
  "      notes: seq(greenM, greenD)\n    }\n  ];\n" +
  "  (function(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}})(PM.MELODIES);";

// "Twinkle Twinkle Little Star" ships with 21 notes; trim it to the first
// 14 (the two opening phrases) for a shorter, focused run.
const TWINKLE_M_LINE =
  "  var twinkleM = [\n    60, 60, 67, 67, 69, 69, 67,\n    65, 65, 64, 64, 62, 62, 60,\n    67, 67, 65, 65, 64, 64, 62\n  ];";
const TWINKLE_M_REPLACEMENT =
  "  var twinkleM = [\n    60, 60, 67, 67, 69, 69, 67,\n    65, 65, 64, 64, 62, 62, 60\n  ];";
const TWINKLE_D_LINE =
  "  var twinkleD = [\n    450, 450, 450, 450, 450, 450, 900,\n    450, 450, 450, 450, 450, 450, 900,\n    450, 450, 450, 450, 450, 450, 900\n  ];";
const TWINKLE_D_REPLACEMENT =
  "  var twinkleD = [\n    450, 450, 450, 450, 450, 450, 900,\n    450, 450, 450, 450, 450, 450, 900\n  ];";

// Replace "Jingle Bells" with "London Bridge Is Falling Down"
// (public-domain nursery rhyme, key of C, 14 notes). We keep the internal
// id/var names (jingle) so nothing else in the game needs to change.
const JINGLE_M_LINE =
  "  var jingleM = [\n    64, 64, 64,\n    64, 64, 64,\n    64, 67, 60, 62, 64,\n    65, 65, 65, 65, 65, 64, 64, 64, 64,\n    62, 62, 64, 62,\n    67\n  ];\n  var jingleD = [\n    380, 380, 760,\n    380, 380, 760,\n    380, 380, 570, 190, 1000,\n    380, 380, 380, 380, 380, 380, 380, 380, 380,\n    380, 380, 380, 380,\n    1100\n  ];";
const JINGLE_M_REPLACEMENT =
  "  var jingleM = [\n    67, 67, 69, 67,\n    65, 64, 65, 67,\n    62, 64, 65, 64, 62,\n    60\n  ];\n  var jingleD = [\n    450, 450, 450, 900,\n    450, 450, 450, 900,\n    450, 450, 450, 450, 900,\n    900\n  ];";

const JINGLE_OBJ_LINE =
  "      id: 'jingle',\n      name: 'Jingle Bells',\n      hint: 'Jingle bells, jingle bells, jingle all the way',\n      notes: seq(jingleM, jingleD)";
const JINGLE_OBJ_REPLACEMENT =
  "      id: 'jingle',\n      name: 'London Bridge Is Falling Down',\n      hint: 'London Bridge is falling down, falling down, falling down',\n      notes: seq(jingleM, jingleD)";

// The cold ("bold") palette paints the half-tone (black) keys red, which
// clashes with the cold blue of the natural keys. Repaint them a cold
// indigo/violet so the whole keyboard reads as cold.
const BOLD_KEYBLACK_LINE =
  "      keyBlack: '#FF1352', keyBlackEdge: '#5C0219',";
const BOLD_KEYBLACK_REPLACEMENT =
  "      keyBlack: '#311B8E', keyBlackEdge: '#0E0840',";

// The game shows an intro overlay that requires a Start click. Auto-start
// it so the player enters the game directly (audio unlocks on first
// interaction via the game's built-in kick handler).
const INTRO_LINE =
  "    setHud();\n    els.intro.classList.add('is-on');\n  }";
const INTRO_REPLACEMENT =
  "    setHud();\n    setTimeout(start, 0);\n  }";

export function parseParams(searchParams) {
  const get = (k, d) => searchParams.get(k) ?? d;
  const num = (k, d) => {
    const v = parseInt(searchParams.get(k), 10);
    return Number.isFinite(v) ? v : d;
  };
  const brRaw = String(get('br', 'default') || 'default').trim().toLowerCase();
  const br = brRaw === 'right' || brRaw === 'left' ? brRaw : 'default';
  const obstacle = String(get('obstacle', 'false')).trim().toLowerCase() === 'true';
  return {
    patientId: get('patientId', ''),
    callbackUrl: get('callbackUrl', ''),
    br,
    obstacle,
    time_to_play: Math.max(0, num('time_to_play', 0)),
    bg: get('bg', ''),
  };
}

/**
 * Take the raw self-contained game HTML and patch it so:
 *  1. it reads config from window.__EK_QS (set for srcdoc embeds), and
 *  2. that global is injected in <head> before any game script runs.
 */
export function buildGameHtml(rawHtml, br, obstacle, bg) {
  const parts = [`br=${encodeURIComponent(br)}`, `obstacle=${obstacle ? 'true' : 'false'}`];
  if (bg) parts.push(`bg=${encodeURIComponent(bg)}`);
  const qs = `?${parts.join('&')}`;
  const inject = `<script>window.__EK_QS=${JSON.stringify(qs)};</script>`;
  let html = rawHtml.replace(QS_LINE, QS_REPLACEMENT);
  html = html.replace(BALL_LINE, BALL_REPLACEMENT);
  html = html.replace(INTRO_LINE, INTRO_REPLACEMENT);
  html = html.replace(MELODIES_END_LINE, MELODIES_END_REPLACEMENT);
  html = html.replace(TWINKLE_M_LINE, TWINKLE_M_REPLACEMENT);
  html = html.replace(TWINKLE_D_LINE, TWINKLE_D_REPLACEMENT);
  html = html.replace(JINGLE_M_LINE, JINGLE_M_REPLACEMENT);
  html = html.replace(JINGLE_OBJ_LINE, JINGLE_OBJ_REPLACEMENT);
  html = html.replace(BOLD_KEYBLACK_LINE, BOLD_KEYBLACK_REPLACEMENT);
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
      time_to_play: cfg.time_to_play,
      bg: cfg.bg,
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