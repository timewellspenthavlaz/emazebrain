# Echo Keys — Technical Specification

`game_id: echo-keys` · Route `/echo-keys` · Page `src/pages/EchoKeys.jsx` · Config/patcher `src/lib/echoKeys/config.js` (version `1.0`)

Musical piano-key game: melodies scroll in and the patient echoes them on a piano keyboard — sustained attention, auditory-motor mapping, and a GO/NO-GO style obstacle sub-task. Unique architecture: the game is a **self-contained vanilla-JS HTML file** loaded from a CDN and patched at runtime, then embedded in a same-origin `<iframe srcdoc>`.

## Runtime patching (`buildGameHtml`)

The raw HTML is fetched from `GAME_HTML_URL` (`https://media.base44.com/files/public/6a53fb14473d432d3056ed57/60c03b30c_echo-keys.html`) and patched:
1. `qs()` helper reads an injected `window.__EK_QS` global (the srcdoc embed has no `location.search`) — the launch query (`br`, `obstacle`, `bg`) is injected into `<head>` before any game script runs.
2. Ball contact point repositioned just above each key's letter label.
3. Intro overlay auto-starts (`setTimeout(start, 0)`); audio unlocks on first interaction.
4. Melody order Fisher-Yates-shuffled so the game never opens with the same tune.
5. "Twinkle Twinkle Little Star" truncated to its first **14 tones**.
6. "Jingle Bells" replaced with "London Bridge Is Falling Down" (14 notes, key of C).
7. Cold palette: black keys repainted from red `#FF1352` to cold indigo `#1111ED` so the keyboard reads monochromatically cold.

## Launch parameters

| Parameter | Values | Default | Description |
|---|---|---|---|
| `br` | `left` / `right` / `default` | `default` | Hemisphere config passed into the embedded game |
| `obstacle` | `true` / `false` | `false` | Enables the obstacle (GO/NO-GO) sub-task |
| `time_to_play` | seconds, 0 = untimed | 0 | Session length |
| `bg` | game background token | '' | Passed into the embedded game |
| `patientId`, `callbackUrl` | | '' | Standard set |

## Metrics payload (`metrics` object — camelCase, game-native)

| Key | Type | Meaning |
|---|---|---|
| `totalCorrect`, `totalWrong`, `accuracy` | number/% | Note accuracy |
| `responseMs` | object | `{ mean, median, fastest }` in ms |
| `bestStreak` | number | |
| `durationMs` | number | Raw duration |
| `perMelody` | object[] | `[{ name, completed, roundsCleared, notes, correct, wrong, bestStreak, meanResponseMs }]` — mapped into `level_history` |
| `obstacleTask` | object | `{ hits, misses, falseAlarms, meanReactionMs }` (present when `obstacle=true`) |
| `br`, `obstacle`, `time_to_play`, `bg` | | Config echo |

## Example permutations

```
/echo-keys?patientId=abc&callbackUrl=/patients/abc&time_to_play=240&br=right
/echo-keys?obstacle=true&time_to_play=300&bg=dark
/echo-keys?br=left&lang=he
``