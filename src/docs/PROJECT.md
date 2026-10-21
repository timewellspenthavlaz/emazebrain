# eMazeBrain — Project Overview & Replication Guide

A therapeutic management platform for clinicians supporting children with neurodevelopmental conditions, featuring integrated, data-rich game-based assessment tools.

- **Published app URL:** https://emaze-brain-path.base44.app
- **Platform:** Base44 (backend-as-a-service: auth, database, integrations, hosting)
- **Frontend stack:** React 18 + Vite (ESM), Tailwind CSS, shadcn/ui, JavaScript (JSX)
- **Key frontend packages:** react-router-dom 6, @tanstack/react-query, recharts, lucide-react, moment, date-fns, react-markdown, framer-motion, canvas-confetti, three.js, react-leaflet

---

## 1. Application structure

### Admin app (auth-protected)
| Route | Page | Purpose |
|---|---|---|
| `/` | Dashboard | KPI overview: clinics, therapists, patients, sessions |
| `/analytics` | Analytics | Traffic & engagement analytics |
| `/clinics` | Clinics | Clinic CRUD |
| `/therapists` | Therapists | Therapist CRUD |
| `/patients` | Patients | Patient list + creation |
| `/patients/:id` | PatientDetail | Patient profile: info, taxonomy links, game-session telemetry, therapy logs |
| `/videos` | Videos | Therapeutic video content CRUD |
| `/games` | Games | Therapeutic game content CRUD, launch links with patient selection |
| `/taxonomy` | Taxonomy | Brain regions, functional skills, diagnoses graph |
| `/settings` | Settings | App settings |
| `/documentation` | Documentation | In-app technical documentation (renders the files in `src/docs/`) |

### Standalone game routes (NO auth — playable by patients)
`/block-crasher` · `/catch-me-if-you-can` · `/orbital-order` · `/beep-beep` · `/echo-keys` · `/peek-peek` · `/tunnel-rush`

Games bypass the auth gate entirely. In `src/App.jsx`, `AuthenticatedApp` checks `location.pathname` and renders the game's `<Routes>` directly when the path starts with one of the game prefixes. Games receive `patientId` + `callbackUrl` via URL query parameters and are launched from the Games admin page with a patient pre-selected.

### Auth
Platform-owned (Base44). Boilerplate pages at `src/pages/Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, wrapped by `src/components/ProtectedRoute.jsx` and `src/lib/AuthContext.jsx`. Pages outside the gate (the seven game routes) never call `auth.me()` on load.

---

## 2. Game architecture pattern (all seven games follow this)

```
URL query params → parseParams() (src/lib/<game>/config.js or in-page)
                      ↓
                 Game engine (src/lib/<game>/engine.js) — pure logic, no UI
                      ↓
              Metrics tracker class (src/lib/<game>/metrics.js or src/lib/gameMetrics.js)
                      ↓
        sendGameResults(payload, callbackUrl)   (src/lib/gameResultSender.js)
              ↓ callbackUrl POST        ↓ fallback
        external endpoint      base44.functions.invoke('receiveGameResults')
                                      ↓
                            GameSession entity → patient profile dashboards
```

**Conventions (suite-wide):**
- Session timers start on the **first interaction** (first launch/tap), not on component load.
- Sound is **off by default** (`sound=true` to enable); WebAudio oscillator pings only.
- Results are **never persisted without a real `patient_id`** (`demo`/`unknown`/empty are skipped) — guarded centrally in `sendGameResults`.
- On send failure the payload is queued in `localStorage.pendingGameResults` for retry.
- Abandoning the page (unmount mid-session) still sends the session with status `abandoned`.
- Every game renders an instructions/reveal modal before play; Hebrew (`lang=he`) renders RTL.
- All games post a **GameSession-compatible envelope** (see `docs/BACKEND.md`).

**Shared dashboard integration:** per-game session cards (`src/components/games/*SessionCard.jsx`), a sticky-column matrix view (`GameMatrix.jsx`), a compare drawer (`CompareDrawer.jsx`), and a 30-day metric-trend dialog (`MetricTrendDialog.jsx`) driven by `src/components/games/metricRegistry.js`, which maps each metric label to an accessor, unit, %-flag and "lower-is-better" direction.

---

## 3. Folder structure

```
src/
  api/base44Client.js        # pre-initialized Base44 SDK client
  pages/                     # admin pages + the 7 game pages
  components/
    admin/                   # AdminLayout, Sidebar, DataTable, StatCard, PageHeader…
    games/                   # session cards, GameMatrix, MetricTrendDialog, metricRegistry…
    tunnelRush/ peekPeek/ orbital/ beepBeep/   # per-game UI components
    ui/                      # shadcn/ui primitives
  lib/
    <game>/config.js         # URL-param parsing, difficulty presets, themes
    <game>/engine.js         # pure game logic
    <game>/metrics.js        # metrics tracker + payload builder
    gameMetrics.js           # Block Crasher tracker
    catchMeMetrics.js        # Catch Me If You Can tracker
    gameResultSender.js      # shared results chokepoint
    app-params.js            # platform app params (app_id, token, from_url)
    blockCrasherLevels.js, specialBricks.js, beepBeep/levels.js,
    peekPeek/packs.js, orbitalOrder/textures.jsx, catchMeColors.js …
  docs/                      # THIS documentation set (rendered at /documentation)
base44/
  entities/*.jsonc           # data model schemas
  functions/<name>/entry.ts  # backend HTTP functions (Deno)
  config.jsonc
```

---

## 4. Documentation index

| File | Contents |
|---|---|
| `docs/PROJECT.md` | This overview & replication guide |
| `docs/DATA-MODEL.md` | Every entity, full field tables |
| `docs/BACKEND.md` | Backend functions + results payload contract |
| `docs/GAMES-OVERVIEW.md` | Shared launch-parameter set & suite conventions |
| `docs/games/block-crasher.md` | Block Crasher — parameters, scoring, telemetry |
| `docs/games/catch-me-if-you-can.md` | Catch Me If You Can |
| `docs/games/orbital-order.md` | Orbital Order |
| `docs/games/beep-beep.md` | Beep Beep |
| `docs/games/echo-keys.md` | Echo Keys |
| `docs/games/peek-peek.md` | Peek Peek |
| `docs/games/tunnel-rush.md` | Tunnel Rush — full design document |

---

## 5. Replication checklist

1. Recreate the Base44 backend: the 12 entities from `docs/DATA-MODEL.md` (schemas copied verbatim) and the 3 backend functions from `docs/BACKEND.md`.
2. Scaffold a Vite + React + Tailwind + shadcn/ui app; wire `src/App.jsx` with `AuthProvider`, `QueryClientProvider`, `BrowserRouter`, `Toaster`, `ProtectedRoute`, and the AdminLayout layout route.
3. Register the seven game routes BOTH inside the auth-protected section AND in the standalone (auth-bypassing) early-return branch described above.
4. Build the admin CRUD pages (DataTable + dialogs) for clinics, therapists, patients, videos, games, taxonomy.
5. Implement each game following the per-game docs in `docs/games/` — config parser, engine, metrics tracker, results sender, HUD, instructions modal, summary screen.
6. Build the patient-profile telemetry layer: session cards per game, matrix view, compare drawer, metric trend dialog (`metricRegistry.js`).
7. Publish; game launch URLs are `https://<app-domain>/<game-id>?patientId=…&callbackUrl=/patients/<id>&…`.