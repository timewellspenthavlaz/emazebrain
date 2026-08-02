/**
 * Beep Beep — level pack loader.
 * The pack (250 boards) is fetched once from the attached public JSON and
 * cached for the session.
 */

const LEVELS_URL =
  'https://media.base44.com/files/public/6a53fb14473d432d3056ed57/6b3f5ae8e_levels.json';

let cache = null;
let loadPromise = null;

export function loadLevels() {
  if (cache) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  loadPromise = fetch(LEVELS_URL)
    .then((r) => {
      if (!r.ok) throw new Error('levels fetch failed: ' + r.status);
      return r.json();
    })
    .then((arr) => {
      cache = arr;
      return arr;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });
  return loadPromise;
}

export function pickBoard(pack, slot, difficulty) {
  return pack.find((b) => b.slot === slot && b.difficulty === difficulty) || null;
}