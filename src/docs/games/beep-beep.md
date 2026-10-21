# Beep Beep — Technical Specification

`game_id: beep-beep` · Route `/beep-beep` · Page `src/pages/BeepBeep.jsx` · Config `src/lib/beepBeep/config.js` · Engine `src/lib/beepBeep/engine.js` · Levels `src/lib/beepBeep/levels.js` · Metrics `src/lib/beepBeep/metrics.js` · Board UI `src/components/beepBeep/*`

Rush-Hour-style slide-puzzle path-planning game: the patient drives a car out of a locked grid by moving blocking vehicles. Measures planning, move efficiency, and spatial strategy. Failed boards are auto-replaced with a depth-matched alternative (`findReplacement`: same grid size + same optimal depth, else ±1 move, else any unseen board).

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `time_to_play` | seconds, 0 = untimed | 0 | Session length |
| `difficulty_level` | 1–5 | 3 | Multiplies the move budget (`BUDGET_FACTOR` 3.0→2.0) and scoring multiplier (1.0→2.0) |
| `level` | 1–50 | 1 | Starting level |
| `max_level` | 1–50 | 50 | Progression cap |
| `lives` | 0–9 | 3 | Heart budget |
| `orientation` | `left` / `right` | `right` | Exit side of the board |
| `br` | `left` / `right` | null | Hemisphere trained; drives palette band (`right` → cold, `left` → warm) |
| `countdown_timer` | `left` / `right` / `none` | `none` | Countdown display side |
| `bg` | image URL / hex | '' | Background |
| `show_answer_on_miss` | `true` / `false` | true | Reveal solution after a failed board |
| `hint_after` | seconds | 0 | Offer a hint after N seconds stuck |
| `sound` | `true` / `false` | false | Audio feedback |

## Progression & scoring

- **Grid band by level:** 1–10 → 4×4, 11–22 → 5×5, 23–38 → 6×6, 39+ → 7×7.
- **Move budget:** `max(optimal + 2, ceil(optimal × BUDGET_FACTOR[difficulty]))` — solver capped at 250 000 states (`SOLVER_CAP`).
- **Score per level:** `100 × tileFactor(n) × DIFFICULTY_MULT[d] × speedBonus(t) × streakMult × efficiencyMult`, where `tileFactor = n²/12`, `speedBonus = clamp(1.8 − t/45, 1.0, 1.8)`, `streakMult = 1 + min(streak,10)×0.05`, `efficiencyMult = 0.45 + 0.55 × optimal/max(optimal, moves)`.

## Metrics payload (`metrics` object)

| Key | Type | Meaning |
|---|---|---|
| `planning_efficiency` | fraction/% | Completed ÷ attempted levels |
| `deepest_optimal_solved` | number | Hardest board solved at optimal depth |
| `optimal_move_rate` | fraction/% | Levels finished within optimal moves |
| `regressive_move_rate` | fraction/% | Moves that undo progress |
| `longest_plan_run` | number | Longest consecutive-optimal streak |
| `avg_first_move_latency_ms` | number (ms) | Planning time before the first move |
| `avg_seconds_per_move` | number | Execution cadence |
| `hints_used` | number | |
| `total_reversals`, `total_undos`, `total_resets` | number | Self-correction behaviour |
| `highest_grid_size` | number | |

## Example permutations

```
/beep-beep?patientId=abc&callbackUrl=/patients/abc&time_to_play=300&difficulty_level=3&br=right
/beep-beep?difficulty_level=5&lives=2&hint_after=30&show_answer_on_miss=false
/beep-beep?level=15&max_level=30&orientation=left&countdown_timer=left&sound=true
``