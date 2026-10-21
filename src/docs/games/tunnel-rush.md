# Tunnel Rush — Full Design Document

`game_id: tunnel-rush` · Route `/tunnel-rush` · Page `src/pages/TunnelRush.jsx` · Config `src/lib/tunnelRush/config.js` (version `1.0.0`) · Engine `src/lib/tunnelRush/engine.js` (class `TunnelEngine`) · Metrics `src/lib/tunnelRush/metrics.js` (class `TunnelRushMetrics`) · UI `src/components/tunnelRush/*` (PlayField, Ship, Hud, InstructionsModal, Summary, Objects)

## 1. Concept

Continuous runner inside a rotating tunnel rendered in pseudo-3D (SVG/CSS). The patient steers — rotating the tunnel (or sliding the ship, see §5) — to dodge objects floating on the tunnel walls while travelling forward. Trains sustained attention, reaction time, visual-motor steering, and hemispheric attention (`br` sets the default timer side).

**Core rules:**
- **Hits never end the session.** A hit triggers unmistakable feedback — crimson screen flash, screen shake (CSS `animate-shake` 500 ms), and a 500 ms engine slowdown penalty — then play continues.
- **The session is governed purely by `time_to_play`.** The countdown starts on the **first interaction** (first rotation/launch), never on page load, and persists across level transitions.
- **Level-ups** every 8 obstacles passed (`OBSTACLES_PER_LEVEL`), when `progressive` is on; each level raises the speed-band ceiling (`LEVEL_BONUS.speed = 0.08`), max level 10.
- **Adaptive pacing:** speed creeps toward `speedMax` during clean dodges and eases back down after a hit, within the difficulty preset's band.

## 2. Visual design (industrial curved tunnel)

- **Bending corridor:** every depth ring is displaced along a world-space arc (`bend()`), so the tunnel visibly sweeps left/right with a shifted vanishing point; difficulty 3+ adds vertical dips. Bend amplitude per `difficulty_level` (`CURVE_AMPS`): 1 → 90, 2 → 140, 3 → 200, 4 → 260, 5 → 320 (viewBox units at the far ring).
- **Lane tile bands:** each lane carries its own metallic panel from a monochromatic cyan-teal industrial family (`LANE_PALETTE = ['#0A9396', '#04303A', '#00B4C5', '#00566B', '#0E7C8B', '#062830']`), alternating light/dark so adjacent lanes stay readable; panels get a light-to-dark metallic sheen gradient, deep shadow seams (`#002025`), and near-field glow that fades into the distance.
- **Structural ribs** at each wireframe band (slate `#3A4A63`) with an inner cyan light strip (brighter near the viewer).
- **Emissive cyan light bars** run down the centre of each lane from the mouth to the far ring.
- **Depth fog** swallows the far end of the corridor (radial gradient in the page colour).
- **Scene backdrops** (`bg`): `gradient`, `solid`, `stars`, `grid`, `rings`.
- **Spaceship avatar** (`ShipGlyph`): low-poly cyan-glowing ship with idle hover, banking tilt on every steer input, and a speed-linked backfire exhaust.
- **Speed streaks** radiate outward (suppressed by `reduce_motion`).

## 3. Launch parameters — standard platform set

| Parameter | Values | Default | Description |
|---|---|---|---|
| `patientId` | any ID | '' | Required for persistence (`demo`/`unknown` skipped) |
| `callbackUrl` | any URL | '' | External results endpoint, tried first |
| `time_to_play` | seconds, 0 = off | 120 | Session length; starts on first interaction; the only end condition besides abandonment |
| `difficulty_level` | 1–5 | 3 | Maps to native difficulty (1–2 → easy, 3 → medium, 4–5 → hard) and to tunnel bend strength |
| `br` | `left` / `right` | – | Hemisphere trained; default timer side (`left` → top-left, `right` → top-right) |
| `lang` | `en`, `he`, `fr`, `es`, `ru`, `zh` | `en` | Instructions language; Hebrew renders RTL |
| `bg` / `background` | scene keyword, hex, or image URL | `gradient` | Scene keyword sets the backdrop style; otherwise used as the page background |
| `reduce_motion` | `true` / `1` | off | Disables screen shake and speed streaks |

## 4. Launch parameters — native gameplay set

| Parameter | Values | Default | Description |
|---|---|---|---|
| `difficulty` | `easy`, `medium`, `hard` | from `difficulty_level` | Native override (see presets below) |
| `lanes` | 6, 8, 10, 12 | 8 | Lanes around the tunnel circumference |
| `level` | 1–10 | 1 | Starting level (`MAX_LEVEL = 10`) |
| `progressive` | `true` / `false` | `true` | Level up every 8 obstacles |
| `direction` | `none`, `cw`, `ccw`, `alternate` | `none` | Ambient tunnel rotation |
| `spinSpeed` | 0–60 | 14 | Ambient rotation speed (deg/sec) |
| `shipMode` | `fixed`, `move` | `fixed` | See §5 |
| `objectType` | `shapes`, `letters`, `numbers`, `cartoonfaces`, `realisticfaces`, `mixed` | `shapes` | Glyph family for obstacles |
| `objectSet` | comma list | – | Custom pool override, e.g. `objectSet=A,K,Z` or `objectSet=red,blue` |
| `objectOrientation` | `upright` / `wall` | `upright` | Glyphs stand upright or lie along the wall |
| `theme` / `colorTheme` | `dark`, `light`, `ocean`, `sunset`, `forest`, `neon`, `highContrast` | `dark` | Color theme |
| `bgColor` | 6-digit hex | – | Page-color override |
| `accentColor` | 6-digit hex | – | Accent (light strips/glow) override |
| `timerPosition` | e.g. `top-left`, `top-right` | from `br` | Timer placement |
| `showScore` | `true` / `false` | `true` | Score in the HUD |
| `maxHits` / `lives` | number | 3 | Compatibility only; 0 = endless. Hits never end the run |
| `sound` | `true` / `false` | false | WebAudio pings on dodge/hit/level-up |
| `autoStart` | `true` / `false` | false | Skip the instructions modal |
| `debug` | `true` / `false` | false | Debug output |

## 5. Control schemes — `shipMode`

- **`fixed`** (default): the ship stays docked at the bottom of the tunnel mouth while the tunnel rolls around it. Steering is conventional: rotate the tunnel toward the safe lane.
- **`move`**: the tunnel stays put and the ship slides around its circumference; **steering is inverted** — tap right (`rotate(1)`) and the tunnel rolls left while the ship moves right. Selected via `shipMode=move` (also accepts `shipmode`).

**Inputs (both modes):** `ArrowLeft`/`ArrowRight`, `A`/`D`, swipe left/right (touch, 40 px threshold), and on-screen thumb-zone arrow buttons. The visual angle eases toward the logical angle; the ship banks ±16° on input and eases back level.

## 6. Difficulty presets

| Preset | speedMin | speedMax | obstacleSpacing | maxJump |
|---|---|---|---|---|
| `easy` | 2.4 | 3.6 | 5.0 | 2 |
| `medium` | 3.0 | 4.6 | 4.2 | 3 |
| `hard` | 3.8 | 5.8 | 3.4 | 4 |

`speedMin`/`speedMax`: adaptive pacing band (world units/sec). `obstacleSpacing`: depth gap between objects (smaller = faster cadence). `maxJump`: how far the next object's lane may sit from the previous one, keeping every object reachable at current speed. Each level (1–10) adds +0.08 to the band's ceiling.

## 7. Metrics payload

Core `GameSession` fields (`score`, `duration_seconds`, `levels_completed`, `highest_level`, `lives_remaining`, `input_method`, `status` ∈ `completed`/`game_over`/`abandoned`) plus a game-specific `metrics` object:

| Key | Type | Meaning |
|---|---|---|
| `summary.accuracy` | fraction/% | Clean dodges ÷ total obstacles |
| `summary.hitRate` | fraction/% | Hits ÷ obstacles |
| `summary.avgReactionMs`, `summary.medianReactionMs` | number (ms) | Steering response times |
| `summary.dodges`, `summary.obstacles` | number | |
| `summary.avgSpeed` | number | Mean travel speed |
| `summary.distanceUnits` | number | World units travelled |
| `summary.dodgePoints`, `summary.score` | number | Scoring: +10 per clean dodge + streak bonus (up to +20) |
| `summary.rotations` | number | Total steering inputs (starts the timer) |
| `summary.bestStreak` | number | |
| `summary.noMoveRate` | fraction/% | Obstacles passed with no steering input |
| per-lane / per-object-type breakdowns | object | Accuracy and RT split by lane and glyph type |
| config echo (`difficulty`, `lanes`, `shipMode`, `objectType`, …) | | |

`level_history`: per-level rows (level reached, obstacles, accuracy, time).

## 8. Example permutations

```
# Standard clinical launch, right hemisphere, easy, Hebrew
/tunnel-rush?patientId=abc123&callbackUrl=/patients/abc123&time_to_play=180&difficulty_level=2&br=right&lang=he

# Sliding-ship mode, strongest curves, letters, 10 lanes
/tunnel-rush?shipMode=move&difficulty_level=5&objectType=letters&lanes=10

# Ambient clockwise spin, starfield, custom accent, sound on
/tunnel-rush?direction=cw&spinSpeed=22&bg=stars&accentColor=00F0FF&sound=true

# High-contrast accessibility setup
/tunnel-rush?theme=highContrast&reduce_motion=true&lanes=6&difficulty=easy

# Untimed practice run, fixed ship, shapes only
/tunnel-rush?time_to_play=0&autoStart=true&objectType=shapes&progressive=false
``