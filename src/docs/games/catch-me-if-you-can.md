# Catch Me If You Can — Technical Specification

`game_id: catch-me-if-you-can` · Route `/catch-me-if-you-can` · Page `src/pages/CatchMeIfYouCan.jsx` · Tracker `src/lib/catchMeMetrics.js` (class `CatchMeMetrics`, version `1.3`) · Colors `src/lib/catchMeColors.js`

Perceptual/attentional discrimination game. The patient picks the target grid (anchor vs companion) across stages of shrinking color difference (JND staircase). Measures perceptual accuracy, reaction time, attentional anchoring, hemifield and quadrant performance.

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `time_to_play` | seconds, 0 = untimed | 0 | Session length |
| `difficulty_level` | 1–5 | 3 | Platform difficulty (JND starting depth) |
| `level` | LEVEL_MIN–LEVEL_MAX | LEVEL_MIN | Starting level |
| `countdown_timer` | `left` / `right` / `none` | `none` | Countdown display side |
| `br` | `left` / `right` | `left` | Hemisphere trained; `right` → cold palette band, else warm |
| `orientation` | `left` / `right` | `right` | Target side bias |
| `bg` | image URL / hex | '' | Background |
| `patientId`, `callbackUrl` | | '' | Standard set |

## Metrics payload (`metrics` object)

| Key | Type | Meaning |
|---|---|---|
| `score`, `duration_seconds`, `levels_completed`, `highest_level`, `lives_remaining`, `input_method` | | Core |
| `palette_band`, `orientation` | string | Config echo |
| `total_selections`, `correct_selections`, `wrong_selections` | number | |
| `accuracy_rate` | fraction | |
| `avg_reaction_time_ms` | number | All selections |
| `best_streak` | number | |
| `final_jnd` | number | Last failed ΔE — perceptual threshold reached |
| `anchor_first_rate` | fraction | Dual-grid stages where the anchor grid was chosen first |
| `left_side_accuracy` / `right_side_accuracy` | fraction | Hemifield |
| `left_side_avg_rt_ms` / `right_side_avg_rt_ms` | number | Hemifield speed |
| `quadrant_accuracy` | object | `{ q1, q2, q3, q4 }` fractions |
| `stage_count` | number | Total stages played |

`level_history`: `[{ level, stages: [{ stage, global_stage, delta_e, grid_sizes, attempts, first_grid, selections }] }]`.

## Example permutations

```
/catch-me-if-you-can?patientId=abc&callbackUrl=/patients/abc&time_to_play=240&difficulty_level=3&br=right
/catch-me-if-you-can?difficulty_level=5&orientation=left&countdown_timer=left
/catch-me-if-you-can?br=left&bg=#1a1a2e
``