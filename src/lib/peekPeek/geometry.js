/**
 * Peek Peek — pointy-top hex geometry.
 *
 * Doubled-width coordinates with offset rows. Cells are built from a row vector
 * (e.g. [2,3,2]); each row is centred on the board's vertical axis so interlock
 * boards come out mirror-symmetric. Neighbours use the odd-r offset formula.
 */

const SQRT3 = Math.sqrt(3);

/**
 * Build a cell list from a row vector.
 * Returns [{ id, r, i, x, y }] with pixel coordinates for circumradius R.
 * The whole board is centred on x = 0.
 */
export function buildCells(rows, R = 1) {
  const width = SQRT3 * R;
  const cells = [];
  for (let r = 0; r < rows.length; r++) {
    const n = rows[r];
    const offset = (r % 2) * (width / 2); // odd rows shifted right half a width
    for (let i = 0; i < n; i++) {
      const x = i * width + offset;
      const y = r * 1.5 * R;
      cells.push({ id: `${r}-${i}`, r, i, x, y });
    }
  }
  // centre the whole board on x = 0
  const xs = cells.map((c) => c.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + width;
  const shift = -(minX + maxX) / 2;
  cells.forEach((c) => {
    c.x += shift;
    c.cx = c.x + width / 2; // hex centre x
  });
  return cells;
}

/** Neighbour map for odd-r offset pointy-top hexes. Returns id -> [neighbour ids]. */
export function neighbourMap(cells) {
  const byKey = {};
  cells.forEach((c) => {
    byKey[`${c.r},${c.i}`] = c;
  });
  const map = {};
  cells.forEach((c) => {
    const { r, i } = c;
    const even = r % 2 === 0;
    const offsets = even
      ? [
          [r, i - 1],
          [r, i + 1],
          [r - 1, i - 1],
          [r - 1, i],
          [r + 1, i - 1],
          [r + 1, i],
        ]
      : [
          [r, i - 1],
          [r, i + 1],
          [r - 1, i],
          [r - 1, i + 1],
          [r + 1, i],
          [r + 1, i + 1],
        ];
    const ns = [];
    for (const [nr, ni] of offsets) {
      const k = `${nr},${ni}`;
      if (byKey[k]) ns.push(byKey[k].id);
    }
    map[c.id] = ns;
  });
  return map;
}

/** Count same-picture adjacent edges (realised adjacency A). */
export function realisedAdjacency(assignment, cells, nmap) {
  let a = 0;
  for (const c of cells) {
    for (const nid of nmap[c.id]) {
      if (assignment[c.id] === assignment[nid]) a++;
    }
  }
  return a / 2; // each edge counted twice
}

/** Left/right split of cell ids by board centre (x = 0). Left = cx < 0. */
export function sideOf(cell) {
  return cell.cx < 0 ? -1 : cell.cx > 0 ? 1 : 0;
}

/** Bounding box of the cells (for SVG viewBox). */
export function bounds(cells, R = 1) {
  const width = SQRT3 * R;
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  return {
    minX: Math.min(...xs) - width / 2,
    maxX: Math.max(...xs) + width * 1.5,
    minY: Math.min(...ys) - R,
    maxY: Math.max(...ys) + R * 2,
  };
}

export const HEX_WIDTH = (R) => SQRT3 * R;
export const HEX_HEIGHT = (R) => 2 * R;