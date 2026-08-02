/**
 * Beep Beep — board model + runtime solver.
 * Boards are stored once with the exit on the right; orientation=left mirrors
 * at render/input time only. A board is a grid size, a list of pieces as
 * (fixed coordinate, length, orientation), a list of wall cells, and a state
 * vector holding each piece's variable coordinate.
 *
 * Occupancy is a BigInt bitmask (n up to 7 → 49 bits; JS bitwise ops are
 * 32-bit so BigInt is required). Moves are one vehicle, one direction, any
 * distance = one move. The BFS is undirected (every move is reversible), so a
 * single search from the current state labels distance-to-goal.
 */

import { SOLVER_CAP } from './config';

export function makeBoard(raw) {
  const pieces = raw.pieces.map((p, i) => ({
    id: i,
    fixed: p.fixed,
    len: p.len,
    horiz: !!p.horiz,
    v: p.v,
    isTarget: i === 0,
  }));
  const walls = (raw.walls || []).map(([r, c]) => ({ r, c }));
  return {
    n: raw.n,
    pieces,
    walls,
    exitRow: raw.exit_row,
    optimal: raw.optimal,
    grid: raw.grid,
    slot: raw.slot,
    difficulty: raw.difficulty,
  };
}

export function initialState(board) {
  return board.pieces.map((p) => p.v);
}

const bit = (n, r, c) => 1n << BigInt(r * n + c);

function pieceCells(piece, v) {
  const cells = [];
  for (let k = 0; k < piece.len; k++) {
    if (piece.horiz) cells.push([piece.fixed, v + k]);
    else cells.push([v + k, piece.fixed]);
  }
  return cells;
}

function wallMask(board) {
  let m = 0n;
  for (const w of board.walls) m |= bit(board.n, w.r, w.c);
  return m;
}

function pieceMask(piece, v, n) {
  let m = 0n;
  for (let k = 0; k < piece.len; k++) {
    if (piece.horiz) m |= bit(n, piece.fixed, v + k);
    else m |= bit(n, v + k, piece.fixed);
  }
  return m;
}

function occupancy(board, state, excludeIdx) {
  let m = wallMask(board);
  for (let i = 0; i < board.pieces.length; i++) {
    if (i === excludeIdx) continue;
    m |= pieceMask(board.pieces[i], state[i], board.n);
  }
  return m;
}

export function isGoal(board, state) {
  const t = board.pieces[0];
  return state[0] === board.n - t.len;
}

const stateKey = (state) => state.join(',');

/**
 * Enumerate every legal neighbour: for each piece, each direction, every
 * reachable stop (any distance = one move).
 */
export function neighbors(board, state) {
  const n = board.n;
  const out = [];
  for (let i = 0; i < board.pieces.length; i++) {
    const p = board.pieces[i];
    const occ = occupancy(board, state, i);
    for (const dir of [-1, 1]) {
      let v = state[i];
      while (true) {
        const nv = v + dir;
        let cell;
        if (p.horiz) {
          const col = dir === 1 ? nv + p.len - 1 : nv;
          if (col < 0 || col >= n) break;
          cell = [p.fixed, col];
        } else {
          const row = dir === 1 ? nv + p.len - 1 : nv;
          if (row < 0 || row >= n) break;
          cell = [row, p.fixed];
        }
        if (occ & bit(n, cell[0], cell[1])) break;
        v = nv;
        const ns = state.slice();
        ns[i] = v;
        out.push({ idx: i, from: state[i], to: v, dir, state: ns });
      }
    }
  }
  return out;
}

/**
 * BFS from `state` to the nearest goal. Returns distance (Number) or Infinity
 * if the cap is hit. Distances are cached per board for reuse (undirected
 * graph ⇒ distance is symmetric and state-independent).
 */
export function distanceToGoal(board, state, cache) {
  if (isGoal(board, state)) return 0;
  const k = stateKey(state);
  if (cache && cache.has(k)) return cache.get(k);
  const visited = new Map();
  visited.set(k, 0);
  let frontier = [state];
  let count = 0;
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      const d = visited.get(stateKey(s));
      for (const nb of neighbors(board, s)) {
        const nk = stateKey(nb.state);
        if (visited.has(nk)) continue;
        if (isGoal(board, nb.state)) {
          const result = d + 1;
          if (cache) cache.set(k, result);
          return result;
        }
        visited.set(nk, d + 1);
        next.push(nb.state);
      }
      if (++count > SOLVER_CAP) return Infinity;
    }
    frontier = next;
    if (visited.size > SOLVER_CAP) return Infinity;
  }
  return Infinity;
}

/**
 * First move of an optimal solution (hint rung 2/4 + show_answer_on_miss).
 * Returns { idx, from, to, dir } or null.
 */
export function firstOptimalMove(board, state, cache) {
  if (isGoal(board, state)) return null;
  const startKey = stateKey(state);
  const parent = new Map();
  parent.set(startKey, null);
  let frontier = [state];
  let count = 0;
  while (frontier.length) {
    const next = [];
    for (const s of frontier) {
      const sk = stateKey(s);
      for (const nb of neighbors(board, s)) {
        const nk = stateKey(nb.state);
        if (parent.has(nk)) continue;
        parent.set(nk, { prevKey: sk, move: nb });
        if (isGoal(board, nb.state)) {
          let curKey = nk;
          let firstMove = nb;
          while (true) {
            const par = parent.get(curKey);
            if (!par || par.prevKey === null) break;
            firstMove = par.move;
            curKey = par.prevKey;
          }
          return firstMove;
        }
        next.push(nb.state);
      }
      if (++count > SOLVER_CAP) return null;
    }
    frontier = next;
    if (parent.size > SOLVER_CAP) return null;
  }
  return null;
}

/**
 * Classify a move as 'progressive' | 'neutral' | 'regressive' | 'unknown'
 * by comparing distance-to-goal before and after.
 */
export function classifyMove(board, distBefore, stateAfter, cache) {
  if (!Number.isFinite(distBefore)) return 'unknown';
  const distAfter = distanceToGoal(board, stateAfter, cache);
  if (!Number.isFinite(distAfter)) return 'unknown';
  if (distAfter < distBefore) return 'progressive';
  if (distAfter > distBefore) return 'regressive';
  return 'neutral';
}

/**
 * Legal range a piece can slide to (inclusive) in each direction, given the
 * current occupancy. Used for drag clamping + tap-to-max.
 * Returns { min, max } reachable v values (the piece may stop anywhere
 * between current and min/max inclusive).
 */
export function slideRange(board, state, idx) {
  const n = board.n;
  const p = board.pieces[idx];
  const occ = occupancy(board, state, idx);
  let lo = state[idx];
  let hi = state[idx];
  // decreasing
  while (lo > 0) {
    const nv = lo - 1;
    const cell = p.horiz ? [p.fixed, nv] : [nv, p.fixed];
    if (occ & bit(n, cell[0], cell[1])) break;
    lo = nv;
  }
  while (hi + p.len < n) {
    const nv = hi + 1;
    const cell = p.horiz ? [p.fixed, nv + p.len - 1] : [nv + p.len - 1, p.fixed];
    if (occ & bit(n, cell[0], cell[1])) break;
    hi = nv;
  }
  return { min: lo, max: hi };
}

/**
 * Rung-1 hint: vehicles standing between the target car and the exit.
 * Direct row blockers + the vertical vehicles blocking those (one level of
 * transitive closure — attention direction, minimal information).
 */
export function blockersToExit(board, state) {
  const n = board.n;
  const target = board.pieces[0];
  const tRight = state[0] + target.len - 1;
  const set = new Set();
  const cellToPiece = new Map();
  for (let i = 0; i < board.pieces.length; i++) {
    for (const [r, c] of pieceCells(board.pieces[i], state[i])) {
      cellToPiece.set(r * n + c, i);
    }
  }
  for (let c = tRight + 1; c < n; c++) {
    const idx = cellToPiece.get(board.exitRow * n + c);
    if (idx != null && idx !== 0) set.add(idx);
  }
  // vertical blockers of those, along their column
  const direct = [...set];
  for (const idx of direct) {
    const p = board.pieces[idx];
    if (!p.horiz) {
      for (let r = 0; r < n; r++) {
        if (r >= state[idx] && r < state[idx] + p.len) continue;
        const bidx = cellToPiece.get(r * n + p.fixed);
        if (bidx != null && bidx !== 0 && bidx !== idx) set.add(bidx);
      }
    }
  }
  return set;
}