/**
 * Disables Base44 SDK analytics on the public standalone game route.
 *
 * The analytics module calls auth.me() on startup to attach a user id to
 * events. On the public /block-crasher route there is no authenticated user,
 * so that call 401s. The SDK reads the `analytics-enable` URL param at module
 * init time; setting it to "false" makes analytics a no-op (and the param is
 * auto-stripped from the URL by the SDK).
 *
 * This module MUST be imported before @base44/sdk is evaluated (i.e. before
 * App → base44Client → @base44/sdk), so it is imported first in main.jsx.
 */
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/block-crasher')) {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('analytics-enable') !== 'false') {
      url.searchParams.set('analytics-enable', 'false');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (e) {
    /* ignore — URL rewrite is best-effort */
  }
}