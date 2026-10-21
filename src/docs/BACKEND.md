# Backend Functions & Results Contract

Three deployed HTTP functions (Deno, `base44/functions/<name>/entry.ts`). External endpoint pattern: `https://emaze-brain-path.base44.app/functions/<functionName>` (from app code use `base44.functions.invoke(...)`).

## 1. `receiveGameResults` — public results collector
`POST` — no auth (CORS `*`; `OPTIONS` preflight answered with 204). Used by the standalone game routes, which run without a user session.

**Request body** (flexible; unknown fields ignored):
```json
{
  "game_id": "tunnel-rush",          // required
  "patient_id": "abc123",            // required
  "patient_name": "",                 // optional; resolved from Patient if empty
  "session_id": "uuid",              // default crypto.randomUUID()
  "session_date": "ISO-8601",        // default now (or metadata.timestamp)
  "version": "1.0",
  "status": "completed",             // completed | game_over | abandoned
  "metrics": { "...": "game-specific, stored verbatim" },
  "level_history": [ { "level": 1, "...": "per-level rows" } ]
}
```
Field fallbacks: `score` ← `metrics.score` ?? `body.score`; `duration_seconds` ← `metrics.duration_seconds` ?? `body.duration`; `levels_completed` ← `metrics.levels_completed`/`levelsCompleted`; `highest_level`, `lives_remaining`, `input_method` likewise.

**Response:** `201 { status: 'success', session_id, record_id }`; `400` missing `patient_id`/`game_id`; `500` on error. Writes one **GameSession** record via the service role.

## 2. `createTherapyLog` — signed clinical note
`POST` — **requires an authenticated user** (`401` otherwise).
Body: `{ patient_id, session_date, session_summary, clinical_notes, duration_minutes, location, progress_score }`. Validates `patient_id`, `session_date`, non-empty `clinical_notes` (`400`), loads the Patient (`404`), then creates a **TherapyLog** with denormalized names and a digital signature: `signature_hash = SHA-256("<therapist_id|unassigned>|<patient_id>|<signed_at ISO>|<clinical_notes>")` hex-encoded, `signed_by_*` from the current user, `status: 'signed'`.

## 3. `amendTherapyLog` — append-only amendment
`POST` — requires auth. Body: `{ log_id, note }` (`400` if missing). Loads the log (`404`), **appends** `{ note, amended_at, amended_by_id, amended_by_name }` to `amendments` (original `clinical_notes` never modified) and sets `status: 'amended'`.

## 4. Frontend results chokepoint — `src/lib/gameResultSender.js`
`sendGameResults(payload, callbackUrl)`:
1. **Guard:** skips persisting when `patient_id` is missing or `demo`/`unknown` (orphaned rows would never appear on a profile).
2. If `callbackUrl` is set, `POST` the payload there first (original external contract); success short-circuits.
3. On callback failure — or when no `callbackUrl` — invokes `receiveGameResults` via the Base44 SDK (service role, resolves the correct deployed endpoint, works on public game routes).
4. On total failure the payload is cached in `localStorage.pendingGameResults` and the call reports `{ ok: false }`.