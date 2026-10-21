# Orbital Order — Technical Specification

`game_id: orbital-order` · Route `/orbital-order` · Page `src/pages/OrbitalOrder.jsx` · Config `src/lib/orbitalOrder/config.js` · Metrics `src/lib/orbitalOrder/metrics.js` · Rules `src/lib/orbitalOrder/rules.js` · Textures `src/lib/orbitalOrder/textures.jsx`

Sequencing / executive-function game: glowing spheres orbit; the patient taps them in ascending order of their hidden values (glyphs appear on reveal). Structured session segments (practice → motor baseline → probe → rule blocks) yield rich clinical telemetry. All visuals are code-generated; no bitmap assets.

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `difficulty_level` | 1–5 | 3 | Sphere count 4–8, reveal 2000→1000 ms, response-window multiplier 1.8→1.0 |
| `br` | `left` / `right` | `left` | Hemisphere trained |
| `time_to_play` | seconds, 0 = untimed | 0 | Untimed runs cap at 24 rule trials (`MAX_RULE_TRIALS`) |
| `countdown_timer` | seconds per trial, 0 = none | 0 | Per-trial response countdown |
| `orientation` | string | `auto` | Layout orientation |
| `bg` | `dark`, `light`, `grid`, `colds`, `warms`, `coldt`, `warmt`, `coldg`, `warmg`, or 6-digit hex | `dark` | Field: solid, grid, random palette solid, textured, gradient, or custom hex |
| `neon` | `0` / `1` | 0 | Emissive neon mode (auto-disabled on light backgrounds with warning `NEON_DISABLED_ON_LIGHT_BG`) |
| `rule_visible` | `onrequest` / `always` | `onrequest` | Whether the rule hint is always shown |
| `glyphType` | `DIGITS` / `LETTERS` | `DIGITS` | Sphere glyph family (no ties — ordering unambiguous) |
| `reduce_motion` | `0` / `1` | 0 | Motion sensitivity |
| `lang`, `patientId`, `callbackUrl` | | | Standard set |

## Design constants

- **8 color tokens**, each with a redundant rim-ring pattern for colour-vision-deficient patients: BLUE (solid), TEAL (double), LIME (notched), AMBER (dashed), RED (thick), MAGENTA (dotted), VIOLET (quadrant), SLATE (inner) — each with `neon0`/`neon1` fills.
- **Segments:** Practice (3 trials, unscored) → Motor Baseline (5, unscored) → Probe Block (5, scored, difficulty 3) → Rule Blocks (until time / 24 trials, scored) → Summary.
- **Lives:** 3; scoring: 10 per tap + 25 chain bonus; base response window 3000 ms × difficulty multiplier.

## Metrics payload (`metrics.summary` object)

| Key | Type | Meaning |
|---|---|---|
| `accuracy`, `chainCompletionRate`, `probeAccuracy` | fraction/% | |
| `maxChain` | number | Longest correct chain |
| `trialsOffered` | number | |
| `firstTapLatencyMs`, `interTapLatencyMs`, `baselineTapLatencyMs` | number (ms) | Planning vs execution speed |
| `planningRatio` | number (×) | First-tap latency ÷ inter-tap latency |
| `ruleSwitchCostMs` | number | Slowing after rule changes |
| `inhibitionIndex` | % | Impulsive-error rate |
| `fatigueSlope` | % | Performance drift across the session |
| `ruleRecheckCount` | number | Rule-consultation behaviour |
| `livesRemaining` | number | |

## Example permutations

```
/orbital-order?patientId=abc&callbackUrl=/patients/abc&time_to_play=300&difficulty_level=3&br=left
/orbital-order?difficulty_level=5&neon=1&bg=coldg&glyphType=LETTERS&countdown_timer=4
/orbital-order?rule_visible=always&reduce_motion=1&bg=light&lang=he
``