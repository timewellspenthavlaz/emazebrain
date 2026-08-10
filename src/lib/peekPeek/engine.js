/**
 * Peek Peek — board build, picture placement, tray ordering.
 *
 * Boards are generated at runtime from the spec's generating functions, seeded
 * by patientId + session_id + level so a session is replayable. Picture
 * assignment is seeded for tray order / pack-slot mapping only — never for hex
 * assignment in the shipped spec (which uses pre-verified boards). Realised
 * adjacency, copy partition and heart budget are echoed in the payload.
 *
 * Placement respects the adjacency lever ρ(d) (cluster → spread) and the
 * orientation hemifield bias over the designated probe subset.
 */

import {
  boardForLevel, KforLevel, copyPartition, studySeconds, heartBudgetFor, RHO, PROBE_LEVELS,
} from './config';
import { buildCells, neighbourMap, realisedAdjacency } from './geometry';

function hashStr(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) - Math.imul(t ^ (t >>> 14), 9);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seedStr) {
  return mulberry32(hashStr(seedStr));
}

/** Fisher-Yates tray order over the K distinct pictures. */
export function trayOrder(K, rng) {
  const a = [];
  for (let i = 0; i < K; i++) a.push(i);
  for (let i = K - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sideBias(orientation, isProbe) {
  if (orientation === 'none') return null;
  const strong = orientation.indexOf('strong') >= 0;
  const p = strong ? 0.9 : 0.75;
  let towardLeft;
  if (orientation === 'left' || orientation === 'left_strong') towardLeft = isProbe;
  else towardLeft = !isProbe; // right / right_strong
  return { side: towardLeft ? -1 : 1, p };
}

function pickFirst(free, cellsById, sideOf, bias, rng) {
  const arr = [...free].map((id) => cellsById[id]);
  let pool = arr;
  if (bias && rng() < bias.p) {
    const s = arr.filter((c) => sideOf[c.id] === bias.side);
    if (s.length) pool = s;
  }
  return pool[Math.floor(rng() * pool.length)].id;
}

function pickNext(free, nmap, assignment, pic, rho, bias, rng, cellsById, sideOf) {
  const clusterCands = [];
  for (const id in assignment) {
    if (assignment[id] !== pic) continue;
    for (const nid of nmap[id]) if (free.has(nid)) clusterCands.push(nid);
  }
  if (rho > 0.05 && clusterCands.length && rng() < rho) {
    let pool = clusterCands;
    if (bias && rng() < bias.p) {
      const s = clusterCands.filter((id) => sideOf[id] === bias.side);
      if (s.length) pool = s;
    }
    return pool[Math.floor(rng() * pool.length)];
  }
  if (rho <= 0.05) {
    // spread: free cell with fewest same-picture neighbours
    let best = null;
    let bestScore = Infinity;
    for (const id of free) {
      let nb = 0;
      for (const nid of nmap[id]) if (assignment[nid] === pic) nb++;
      if (nb < bestScore || (nb === bestScore && rng() < 0.25)) {
        bestScore = nb;
        best = id;
      }
    }
    return best;
  }
  let pool = [...free];
  if (bias && rng() < bias.p) {
    const s = pool.filter((id) => sideOf[id] === bias.side);
    if (s.length) pool = s;
  }
  return pool[Math.floor(rng() * pool.length)];
}

function placePictures(cells, nmap, cellsById, sideOf, partition, d, orientation, rng, tray) {
  const rho = RHO[d] ?? 0.32;
  const free = new Set(cells.map((c) => c.id));
  const assignment = {};
  const probeCount = Math.ceil(partition.length / 2);
  // place in tray order so the probe subset (first ⌈K/2⌉) is known
  for (let t = 0; t < partition.length; t++) {
    const pic = tray[t];
    const count = partition[pic];
    const bias = sideBias(orientation, t < probeCount);
    for (let k = 0; k < count; k++) {
      const id = k === 0
        ? pickFirst(free, cellsById, sideOf, bias, rng)
        : pickNext(free, nmap, assignment, pic, rho, bias, rng, cellsById, sideOf);
      assignment[id] = pic;
      free.delete(id);
    }
  }
  return assignment;
}

/**
 * Build a complete level board.
 * @returns {object} board with cells, assignment, tray, realised metrics.
 */
export function buildLevel(level, d, packSize, orientation, seedStr) {
  const b = boardForLevel(level);
  const cells = buildCells(b.rows);
  const nmap = neighbourMap(cells);
  const cellsById = {};
  const sideOf = {};
  cells.forEach((c) => {
    cellsById[c.id] = c;
    sideOf[c.id] = c.cx < 0 ? -1 : c.cx > 0 ? 1 : 0;
  });
  const K = KforLevel(level, d, packSize);
  const partition = copyPartition(b.T, K, level, d);
  const rng = makeRng(`${seedStr}:${level}:${d}`);
  const tray = trayOrder(K, rng);
  const assignment = placePictures(cells, nmap, cellsById, sideOf, partition, d, orientation, rng, tray);
  const A = realisedAdjacency(assignment, cells, nmap);
  const s = studySeconds(level);
  const bud = heartBudgetFor(level, d, partition);
  const leftCount = cells.filter((c) => sideOf[c.id] < 0).length;
  const rightCount = cells.filter((c) => sideOf[c.id] > 0).length;
  const isProbe =
    orientation === 'none' &&
    PROBE_LEVELS.has(level) &&
    b.family === 'interlock' &&
    leftCount === rightCount;
  const boardId = `pp-L${level}-d${d}-T${b.T}-K${K}-A${A}`;
  return {
    level,
    T: b.T,
    K,
    partition,
    cells,
    nmap,
    cellsById,
    sideOf,
    assignment,
    tray,
    realisedAdjacency: A,
    studySeconds: s,
    heartBudget: bud,
    boardId,
    family: b.family,
    isProbe,
    rows: b.rows,
  };
}

/** A replacement board: same (T, K), different seed → fresh placement. */
export function buildReplacement(level, d, packSize, orientation, seedStr, attempt) {
  return buildLevel(level, d, packSize, orientation, `${seedStr}#r${attempt}`);
}