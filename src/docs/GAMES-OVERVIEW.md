# Games Overview — Shared Launch Contract

Every game is a standalone route playable without login. All games accept a **standard platform launch set** plus their own native parameters. Unknown parameters are ignored, so the set is forward/backward compatible.

## Standard platform launch set (all games)

| Parameter | Values | Default | Description |
|---|---|---|---|
| `patientId` | any ID | '' | Ties the session to a patient record; results are **not persisted** without a real ID (`demo`/`unknown` skipped) |
| `callbackUrl` | any URL | '' | External results endpoint tried first (POST, JSON); SDK fallback to `receiveGameResults` on failure |
| `time_to_play` | seconds, `0` = untimed | game-specific | Session length. Timers start on the **first interaction**, never on page load |
| `difficulty_level` | 1–5 | 3 (1 for Block Crasher) | Platform difficulty, mapped onto each game's native scaling |
| `level` | 1–game max | game-specific | Starting level |
| `bg` | URL / hex / keyword | '' | Background image or color; keyword when the game supports scenes |
| `br` | `left` / `right` | game-specific | Hemisphere being trained — drives palette band and/or timer/attention bias |
| `countdown_timer` | `left` / `right` / `none` (or per-trial seconds for Orbital Order) | `none` | Countdown display side |
| `lang` | `en`, `he`, `fr`, `es`, `ru`, `zh` | `en` | UI/instructions language; Hebrew renders RTL |
| `sound` | `true` / `1` | off | WebAudio feedback (off by default suite-wide) |

## Suite conventions

- **Results envelope** — every game posts the GameSession-compatible payload documented in `docs/BACKEND.md` (core fields + `metrics` + `level_history`).
- **Abandon safety** — closing/leaving mid-session sends the payload with `status: 'abandoned'`.
- **No orphan sessions** — the central sender refuses to persist without a real `patient_id`.
- **Instructions first** — a reveal/instructions modal opens the session (games with `autoStart`/assessment defaults may skip it); concise practice-round modals carry only a title, one sentence, and a "Got it!" button.
- **Standardized metrics** — all games expose accuracy and reaction-time-style measures so clinicians can compare speed-vs-accuracy across games (see `metricRegistry.js`).
- **Per-game launch link** — built on the Games admin page with a patient pre-selected: `/tunnel-rush?patientId=…&callbackUrl=/patients/<id>&difficulty_level=3&…`.

## Dashboard integration

Session records appear on the patient profile via:
- `GameSessionList` — chronological list per game;
- `GameMatrix` — matrix view with sticky game-label columns for horizontal scrolling;
- per-game `*SessionCard` — detailed telemetry boxes;
- `CompareDrawer` — single-session detail or two-run side-by-side with deltas;
- `MetricTrendDialog` — 30-day trend for any metric, all runs plotted as dots with a "best-so-far" step line, powered by `metricRegistry.js` (label → accessor, unit, isPct, lowerIsBetter).