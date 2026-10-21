# Block Crasher — Technical Specification

`game_id: block-crasher` · Route `/block-crasher` · Page `src/pages/BlockCrasher.jsx` · Tracker `src/lib/gameMetrics.js` (class `GameMetrics`, version `1.0`)

Canvas breakout-style game: the patient moves a paddle to bounce a ball and destroy brick fields, with special bricks (exploding, slow-down, …) and power-ups. Motor-planning and coordination assessment (intercept accuracy, reversal control).

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `time_to_play` | seconds, 0 = untimed | 0 | Session length |
| `difficulty_level` | 1–5 | 1 | Platform difficulty. Start level = `difficulty_level × 2` (capped 10); difficulty 1 starts at level 1 |
| `level` | 1–10 | calculated | Explicit starting level override |
| `countdown_timer` | `left` / `right` / `none` | `none` | Countdown display side |
| `bg` | image URL | '' | Background image behind the board |
| `patientId` | ID | '' | Required for persistence |
| `callbackUrl` | URL | '' | External results endpoint |

Levels come from `src/lib/blockCrasherLevels.js`; special brick behaviors from `src/lib/specialBricks.js`.

## Metrics payload (`metrics` object)

| Key | Type | Meaning |
|---|---|---|
| `score` | number | Final score |
| `duration_seconds` | number | Session length |
| `levels_completed`, `highest_level`, `lives_remaining` | number | Progression |
| `input_method` | string | First input method used |
| `total_bricks_destroyed` | number | All bricks cleared |
| `tough_bricks_destroyed` | number | Multi-hit bricks |
| `balls_lost` | number | |
| `paddle_hits` | number | |
| `paddle_miss_rate` | fraction | `balls_lost / (paddle_hits + balls_lost)` |
| `avg_intercept_gap` | number (px) | Mean distance between paddle centre and ball at contact — motor precision |
| `movement_reversals` | number | Paddle direction changes |
| `idle_seconds` | number | Cumulative inactivity |
| `special_bricks_triggered` | object | Counts per special type (`exploding`, `slow_down`, …) |
| `powerup_efficiency` | number | Bricks destroyed by power-ups / power-up triggers |

`level_history` rows: per-level duration, score delta, bricks cleared, balls lost, specials triggered.

## Example permutations

```
/block-crasher?patientId=abc&callbackUrl=/patients/abc&time_to_play=300&difficulty_level=2
/block-crasher?difficulty_level=5&level=10&countdown_timer=right
/block-crasher?patientId=abc&level=3&bg=https://…/board-bg.png
``