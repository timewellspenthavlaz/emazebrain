# Peek Peek — Technical Specification

`game_id: peek-peek` · Route `/peek-peek` · Page `src/pages/PeekPeek.jsx` · Config/progression `src/lib/peekPeek/config.js` · Engine `src/lib/peekPeek/engine.js` · Geometry `src/lib/peekPeek/geometry.js` · Packs `src/lib/peekPeek/packs.js` · Metrics `src/lib/peekPeek/metrics.js` · UI `src/components/peekPeek/*` (version `1.0`)

Object-location memory game on hex boards: the patient studies a board of themed pictures, the pictures hide, and the patient re-finds them by memory across rounds. Clinical focus: spatial memory capacity, search organization, perseveration, and hemifield bias — with dedicated **control trials** isolating pure motor/visual performance from memory load.

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `difficulty_level` | 1–5 | 3 | Scales `K` (distinct pictures), copy skew, heart slack, singleton counts, clustering ρ |
| `level` | 1–50 | 1 | Starting level (`MAX_LEVEL = 50`) |
| `max_level` | 1–50 | 50 | Progression cap |
| `lives` | 0–9 | 3 | Heart budget |
| `mode` | `assessment` / `therapy` | `assessment` | Therapy mode defaults `hidden_count` on |
| `pack` | `household`, `faces`, `marine`, `animals`, `rotate` | `marine` | Themed picture set |
| `orientation` | `none`, `left`, `right`, `left_strong`, `right_strong` | `none` | Hemifield bias of target placement |
| `br` | `left` / `right` | null | Hemisphere trained; drives palette band (`right` → cold, `left` → warm) |
| `countdown_timer` | `left` / `right` / `none` | `none` | Countdown display side |
| `hidden_count` | `true` / `false` | false (true in therapy mode) | Show a counter of hidden items |
| `control_trial` | `true` / `false` | true | Include control trials (heartbeat-pulse feedback on tapped tiles) |
| `study_time` | seconds > 0 | formula | Override the computed study phase length |
| `sound`, `bg`, `lang`, `patientId`, `callbackUrl` | | | Standard set |

## Progression model (`src/lib/peekPeek/config.js`)

- **12 board row-vectors**, T grows 7 → 35 across 50 levels (4 levels each), families `interlock` / `brick`.
- **Study seconds:** `max(3.0, round½(1.6 + 0.225·T)) + 0.5` on relief levels (relief: levels 6, 10, 14, … 47).
- **Distinct pictures K:** `clamp(round((2.0 + 8.6·((level−1)/49)^0.9)) × G[d], 2, min(packSize, ⌊T/2⌋ + singletons))`, reduced by 1 on relief levels.
- **Copy partition:** every picture starts at 2 copies (1 for singletons, difficulty 4+), remainder round-robin, then skew shifts mass small→large (capped at `max(4, ⌊T/K⌋+2)`).
- **Heart budget:** `max(3, round(W(c,H) scaled by (1−0.85) summed over rounds + SLACK[d]))` — λ = 2.5 expected-miss model, closed form; flagged as model-derived (not pilot-fit) in the payload.
- **Probe levels** 4, 13, 17, 21, 25, 33, 41, 45 run on mirror-symmetric (interlock) boards.
- **Score:** `100 × tileFactor(T) × DIFFICULTY_MULT[d] × speedBonus × streakMult × accuracyMult(hearts/budget)`.

## Metrics payload (`metrics` object)

| Key | Type | Meaning |
|---|---|---|
| `lives_remaining`, `score` | number | |
| `first_round_misses_mean` | number | Memory errors on the first re-find round |
| `first_attempt_accuracy_ex_final` | fraction/% | Accuracy excluding the free final round |
| `learning_slope` | number | Improvement across rounds |
| `novel_hex_errors` | number | Taps on never-seen tiles |
| `within_search_errors` / `between_search_errors` | number | Spatial error structure |
| `perseveration_rate` | fraction/% | Repeated returning to exhausted pictures |
| `capacity_estimate` | number | Working-memory capacity estimate |
| `avg_first_tap_latency_ms`, `inter_tap_slope_ms` | number (ms) | Search initiation & cadence |
| `adjacency_ratio`, `search_organisation` | fraction/% | Systematic search |
| `find_order_index`, `mean_first_tap_x` | number | Scan-path structure |
| `perseveration_asymmetry` | number | Hemifield perseveration bias |
| `control_find_order_index`, `control_mean_first_tap_x`, `control_first_tap_latency_asymmetry_ms` | number | Same measures on control (no-memory) trials |

## Example permutations

```
/peek-peek?patientId=abc&callbackUrl=/patients/abc&time_to_play=300&difficulty_level=3&pack=animals
/peek-peek?difficulty_level=4&orientation=right_strong&hidden_count=true&mode=therapy
/peek-peek?level=10&max_level=25&lives=2&study_time=6&countdown_timer=left
``