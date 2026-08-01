/**
 * Orbital Order — rule engine (v2: 2-rule model).
 * Rules: Ordering (Ascending/Descending) + Skip (one colour to avoid).
 * The solver is the single source of truth for correctness: (rule, spheres)
 * → canonical expected chain. The renderer never decides anything.
 *
 * Design notes:
 *  - The skip colour always has FEWER spheres than the target colour(s), so the
 *    distractor is less prevalent and the user must actively inhibit it.
 *  - Glyphs are unique per trial (no ties), so ordering is unambiguous without
 *    a traversal/positional tie-break.
 */
import { DIFFICULTY, GLYPH_SETS, TOKEN_ORDER } from './config';

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

// Generate the next rule: ordering + a skip colour. Differs from the previous
// rule by ≥1 clause (≥2 at difficulty ≥ 3) and never repeats within a 3-block
// window.
export function generateRule(history, difficulty, pool) {
  const prev = history[history.length - 1] || null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const rule = {
      ordering: pick(ORDERINGS),
      skip: pick(pool),
    };
    if (prev) {
      const diffs = (rule.ordering !== prev.ordering ? 1 : 0)
        + (rule.skip !== prev.skip ? 1 : 0);
      const minDiffs = difficulty >= 3 ? 2 : 1;
      if (diffs < minDiffs) continue;
    }
    if (history.slice(-3).some((h) => ruleKey(h) === ruleKey(rule))) continue;
    return rule;
  }
  return {
    ordering: prev ? (prev.ordering === 'ASCENDING' ? 'DESCENDING' : 'ASCENDING') : 'ASCENDING',
    skip: pool[0],
  };
}

function ruleKey(r) { return `${r.ordering}|${r.skip}`; }

/* ---------- Sphere generation ---------- */

// Produce n spheres in normalised [0,1] coords. The skip colour is always the
// minority so the user must inhibit a less-prevalent distractor. Glyphs are
// unique so the ordering has a single deterministic solution.
export function generateSpheres(rule, difficulty, glyphType, pool) {
  const cfg = DIFFICULTY[difficulty];
  const n = cfg.sphereCount;

  const targetPool = pool.filter((c) => c !== rule.skip);
  // distractor count strictly less than target count → distractor < n/2.
  const maxDistractors = Math.max(1, Math.floor((n - 1) / 2));
  const distractorCount = randInt(1, Math.min(maxDistractors, Math.max(1, n - 2)));
  const targetCount = n - distractorCount;

  const targetColors = Array.from({ length: targetCount }, (_, i) => targetPool[i % targetPool.length]);
  const distractorColors = Array.from({ length: distractorCount }, () => rule.skip);
  const colors = shuffle([...targetColors, ...distractorColors]);

  const set = shuffle(GLYPH_SETS[glyphType]).slice(0, n);
  const glyphs = shuffle(set);

  // Jittered vertical bands (below the HUD band), decorrelated from glyph value.
  const bandOrder = shuffle(Array.from({ length: n }, (_, i) => i));
  const yStart = 0.16, yEnd = 0.96;
  const bandH = (yEnd - yStart) / n;
  const spheres = [];
  for (let i = 0; i < n; i++) {
    const band = bandOrder[i];
    const jitter = 0.3 * (Math.random() - 0.5) * bandH;
    const y = Math.min(yEnd - 0.02, Math.max(yStart + 0.02, yStart + band * bandH + bandH * 0.5 + jitter));
    const x = 0.12 + Math.random() * 0.76;
    spheres.push({ id: `s${i}`, color: colors[i], glyph: glyphs[i], x, y, cellIndex: band });
  }
  return spheres;
}

// Unique glyphs by construction → never ties.
export function hasTies() { return false; }

/* ---------- Solver — canonical expected chain ---------- */

export function targetSet(rule, spheres) {
  return spheres.filter((s) => s.color !== rule.skip).map((s) => s.id);
}

export function solveChain(rule, spheres) {
  const byId = Object.fromEntries(spheres.map((s) => [s.id, s]));
  const targets = targetSet(rule, spheres).map((id) => byId[id]);
  const dir = rule.ordering === 'ASCENDING' ? 1 : -1;
  const sorted = [...targets].sort(
    (a, b) => dir * (glyphOrdinal(a.glyph, rule.glyphType) - glyphOrdinal(b.glyph, rule.glyphType))
  );
  return sorted.map((s) => s.id);
}

/* ---------- Error taxonomy ---------- */

// Classify an incorrect tap. Two failure modes:
//  INHIBITION_ERROR — tapped a skip-colour (distractor) sphere.
//  ORDER_ERROR — tapped a target sphere out of sequence.
export function classifyError({ tapSphere, expectedChain, committedCount, targetIds }) {
  const expectedNext = expectedChain[committedCount];
  if (!expectedNext || tapSphere.id === expectedNext) return null; // correct

  const isTarget = targetIds.includes(tapSphere.id);
  if (!isTarget) return 'INHIBITION_ERROR';
  return 'ORDER_ERROR';
}

/* ---------- Per-session colour pool ---------- */

export function sessionPool() {
  return shuffle(TOKEN_ORDER).slice(0, 5);
}

/* ---------- Rule rendering strings ---------- */

export function ruleLabel(rule) {
  const ordering = rule.ordering === 'ASCENDING' ? 'Ascending' : 'Descending';
  const skip = rule.skip.charAt(0).toUpperCase() + rule.skip.slice(1).toLowerCase();
  return { ordering, skip };
}

export { randInt };