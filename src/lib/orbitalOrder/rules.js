/**
 * Orbital Order — rule engine.
 * The solver is the single source of truth for correctness: (rule, spheres) →
 * canonical expected chain. The renderer never decides anything.
 */
import { DIFFICULTY, GLYPH_SETS, TOKEN_ORDER } from './config';

const TRAVERSALS = ['TOP_TO_BOTTOM', 'BOTTOM_TO_TOP'];
const ORDERINGS = ['ASCENDING', 'DESCENDING'];

function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Ordinal used to sort glyphs: digits by numeric value, letters by code point.
export function glyphOrdinal(glyph, glyphType) {
  if (glyphType === 'LETTERS') return glyph.charCodeAt(0);
  return parseInt(glyph, 10);
}

/* ---------- Rule generation ---------- */

function randomFilter(pool) {
  const r = Math.random();
  if (r < 0.45) return null; // Family A — no colour filter
  const mode = Math.random() < 0.5 ? 'INCLUDE_ONLY' : 'EXCLUDE';
  const color = pick(pool);
  return { mode, colors: [color] };
}

// Generate the next rule. Differs from the previous by ≥1 clause (≥2 at
// difficulty ≥ 3) and never repeats within a 3-block window.
export function generateRule(history, difficulty, pool) {
  const prev = history[history.length - 1] || null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rule = {
      traversal: pick(TRAVERSALS),
      ordering: pick(ORDERINGS),
      filter: randomFilter(pool),
    };
    if (prev) {
      let diffs = (rule.traversal !== prev.traversal ? 1 : 0)
        + (rule.ordering !== prev.ordering ? 1 : 0)
        + (filterKey(rule.filter) !== filterKey(prev.filter) ? 1 : 0);
      const minDiffs = difficulty >= 3 ? 2 : 1;
      if (diffs < minDiffs) continue;
    }
    if (history.slice(-3).some((h) => ruleKey(h) === ruleKey(rule))) continue;
    return rule;
  }
  // Fallback — just flip traversal from prev.
  return { traversal: prev ? (prev.traversal === 'TOP_TO_BOTTOM' ? 'BOTTOM_TO_TOP' : 'TOP_TO_BOTTOM') : 'BOTTOM_TO_TOP', ordering: 'ASCENDING', filter: null };
}

function filterKey(f) { return f ? `${f.mode}:${f.colors.join(',')}` : 'none'; }
function ruleKey(r) { return `${r.traversal}|${r.ordering}|${filterKey(r.filter)}`; }

/* ---------- Sphere generation ---------- */

// Produce n spheres in normalised [0,1] coords. Each sphere gets its own
// vertical band so top→bottom order is unambiguous (no two share a y-band),
// and glyph value is decorrelated from y-position.
export function generateSpheres(rule, difficulty, glyphType, pool) {
  const cfg = DIFFICULTY[difficulty];
  const n = cfg.sphereCount;
  const pairs = Math.min(cfg.duplicatePairs, Math.floor(n / 2));

  // Colours — ensure the filter colour is present for filter rules.
  let colors;
  if (rule.filter) {
    const fc = rule.filter.colors[0];
    const others = shuffle(pool.filter((c) => c !== fc));
    const targetCount = Math.max(1, Math.ceil(n * 0.6));
    const targetColors = Array.from({ length: targetCount }, () => fc);
    const distractorCount = n - targetCount;
    const distractorColors = others.slice(0, Math.max(0, distractorCount));
    colors = shuffle([...targetColors, ...distractorColors]);
    // Pad if distractor pool ran short
    while (colors.length < n) colors.push(others[colors.length % others.length] || fc);
    colors = colors.slice(0, n);
  } else {
    colors = shuffle(pool).slice(0, n);
    while (colors.length < n) colors.push(pool[colors.length % pool.length]);
  }

  // Glyphs with deliberate duplicates (ties). `pairs` groups of two share a
  // glyph; the remainder are unique.
  const glyphs = [];
  const set = GLYPH_SETS[glyphType];
  const used = shuffle(set);
  let gi = 0;
  for (let p = 0; p < pairs; p++) {
    const g = used[gi % used.length]; gi++;
    glyphs.push(g, g);
  }
  while (glyphs.length < n) {
    let g = used[gi % used.length]; gi++;
    while (glyphs.includes(g) && used.length > n) g = used[gi % used.length]; gi++;
    glyphs.push(g);
  }
  const shuffledGlyphs = shuffle(glyphs).slice(0, n);

  // Positions: jittered vertical bands. Band index → y. Shuffle band↔glyph
  // assignment so value and y are decorrelated.
  const bandOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const spheres = [];
  for (let i = 0; i < n; i++) {
    const band = bandOrder[i];
    // map bands into the safe vertical range (below the HUD band), not [0,1]
    const yStart = 0.16, yEnd = 0.96;
    const bandH = (yEnd - yStart) / n;
    const jitter = 0.3 * (Math.random() - 0.5) * bandH;
    const y = Math.min(yEnd - 0.02, Math.max(yStart + 0.02, yStart + band * bandH + bandH * 0.5 + jitter));
    const x = 0.12 + Math.random() * 0.76;
    spheres.push({
      id: `s${i}`,
      color: colors[i],
      glyph: shuffledGlyphs[i],
      x,
      y,
      cellIndex: band,
    });
  }
  return spheres;
}

export function hasTies(spheres) {
  const counts = {};
  for (const s of spheres) counts[s.glyph] = (counts[s.glyph] || 0) + 1;
  return Object.values(counts).some((c) => c > 1);
}

/* ---------- Solver — canonical expected chain ---------- */

export function targetSet(rule, spheres) {
  if (!rule.filter) return spheres.map((s) => s.id);
  if (rule.filter.mode === 'INCLUDE_ONLY') return spheres.filter((s) => rule.filter.colors.includes(s.color)).map((s) => s.id);
  return spheres.filter((s) => !rule.filter.colors.includes(s.color)).map((s) => s.id);
}

export function solveChain(rule, spheres) {
  const byId = Object.fromEntries(spheres.map((s) => [s.id, s]));
  const targets = targetSet(rule, spheres).map((id) => byId[id]);
  const dir = rule.ordering === 'ASCENDING' ? 1 : -1;
  // traversal: BOTTOM_TO_TOP → bottom (larger y) first; TOP_TO_BOTTOM → top (smaller y) first
  const tDir = rule.traversal === 'BOTTOM_TO_TOP' ? -1 : 1;
  const sorted = [...targets].sort((a, b) => {
    const va = glyphOrdinal(a.glyph, rule.glyphType);
    const vb = glyphOrdinal(b.glyph, rule.glyphType);
    if (va !== vb) return dir * (va - vb);
    return tDir * (b.y - a.y); // tie-break on y
  });
  return sorted.map((s) => s.id);
}

/* ---------- Error taxonomy ---------- */

// Classify an incorrect tap. Needs the previous block's expected chain to
// detect PERSEVERATION.
export function classifyError({
  tapSphere, expectedChain, committedCount, targetIds, prevExpectedChain,
}) {
  const expectedNext = expectedChain[committedCount];
  if (!expectedNext || tapSphere.id === expectedNext) return null; // correct

  const isTarget = targetIds.includes(tapSphere.id);
  if (!isTarget) return 'INHIBITION_ERROR';

  if (tapSphere.glyph === expectedNext.glyph && tapSphere.id !== expectedNext) {
    return 'TRAVERSAL_ERROR';
  }
  // appears later in the expected chain → an intermediate sphere was skipped
  const laterIdx = expectedChain.indexOf(tapSphere.id);
  if (laterIdx > committedCount) return 'SKIP';

  if (prevExpectedChain && prevExpectedChain[committedCount] === tapSphere.id) {
    return 'PERSEVERATION';
  }
  return 'ORDER_REVERSAL';
}

/* ---------- Per-session colour pool ---------- */

// Sample up to 5 tokens from the eight-token pool, seeded per session. Below
// level 4, avoid pairing near-neighbour ring patterns.
export function sessionPool(difficulty) {
  const pool = shuffle(TOKEN_ORDER).slice(0, 5);
  return pool;
}

/* ---------- Rule rendering strings ---------- */

export function ruleLabel(rule) {
  const traversal = rule.traversal === 'BOTTOM_TO_TOP' ? 'Bottom → Top' : 'Top → Bottom';
  const ordering = rule.ordering === 'ASCENDING' ? 'Ascending' : 'Descending';
  let filter = null;
  if (rule.filter) {
    const color = rule.filter.colors[0];
    filter = rule.filter.mode === 'INCLUDE_ONLY' ? `${color.toLowerCase().charAt(0).toUpperCase() + color.slice(1).toLowerCase()} only` : `Skip ${color.toLowerCase()}`;
  }
  return { traversal, ordering, filter };
}

export { randInt };