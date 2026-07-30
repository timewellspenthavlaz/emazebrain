import { base44 } from '@/api/base44Client';

/**
 * Sends game session results to the backend so they land in the GameSession
 * entity and show up on the patient profile.
 *
 * If a `callbackUrl` is supplied we POST there first (the original contract).
 * On any failure — or when no callbackUrl is given — we fall back to invoking
 * the `receiveGameResults` backend function directly through the Base44 SDK,
 * which always resolves the correct deployed endpoint and uses the service
 * role (no user auth required, so it works on the public game routes).
 */
export async function sendGameResults(payload, callbackUrl = '') {
  if (callbackUrl) {
    try {
      const res = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        let data = {};
        try { data = await res.json(); } catch (e) { /* non-json ok */ }
        return { ok: true, data };
      }
      console.error('[gameResultSender] callback failed:', res.status);
    } catch (err) {
      console.error('[gameResultSender] callback error:', err);
    }
  }

  try {
    const res = await base44.functions.invoke('receiveGameResults', payload);
    return { ok: true, data: res?.data };
  } catch (err) {
    console.error('[gameResultSender] invoke failed:', err);
    try {
      const cache = JSON.parse(localStorage.getItem('pendingGameResults') || '[]');
      cache.push({ payload });
      localStorage.setItem('pendingGameResults', JSON.stringify(cache));
    } catch (e) { /* localStorage may be unavailable */ }
    return { ok: false, error: err?.message };
  }
}