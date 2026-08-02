import React from 'react';

/**
 * Procedural texture library for Orbital Order.
 * 8 pattern designs × 2 palettes (warm / cold) = 16 textured backgrounds.
 * One warm + one cold variant exists per pattern index; coldt/warmt randomly
 * select an index at launch so each session shows a different background.
 *
 * Palette shape: { name, reeds: [c1, c2, c3], accent }
 * The dark field base (from resolveBg) shows through the gaps, so palettes
 * only supply the drawn reed/accent colours.
 */

export const WARM_PALETTES = [
  { name: 'Cane',     reeds: ['#B8860B', '#8D6E2E', '#5D4037'], accent: '#D4A537' },
  { name: 'Terracotta', reeds: ['#C8743A', '#A05A2C', '#6B3A1A'], accent: '#E0884A' },
  { name: 'Ochre',    reeds: ['#C9974A', '#A67838', '#6B4F22'], accent: '#E0B25C' },
  { name: 'Rust',     reeds: ['#A8522E', '#7E3D22', '#52281A'], accent: '#C46238' },
  { name: 'Sand',     reeds: ['#D4B483', '#B8965E', '#8A6B3C'], accent: '#E6C99A' },
  { name: 'Bronze',   reeds: ['#9C7A3E', '#7A5E2E', '#4E3B1E'], accent: '#B8924A' },
  { name: 'Mahogany', reeds: ['#8A4A2E', '#6B3820', '#421F12'], accent: '#A85838' },
  { name: 'Camel',    reeds: ['#C9A368', '#A8843E', '#7A5E2A'], accent: '#DDB87A' },
];

export const COLD_PALETTES = [
  { name: 'Deep Blue', reeds: ['#3B6EA5', '#2E5680', '#1E3A55'], accent: '#5A8FC4' },
  { name: 'Teal',      reeds: ['#2E8A82', '#1F6B66', '#14443F'], accent: '#46B0A4' },
  { name: 'Steel',     reeds: ['#6E7E92', '#54657A', '#36424F'], accent: '#94A4B8' },
  { name: 'Indigo',    reeds: ['#4A5A9E', '#37447A', '#252E52'], accent: '#6A7AB8' },
  { name: 'Slate',     reeds: ['#5A7AA0', '#44618A', '#2C4060'], accent: '#80A0C6' },
  { name: 'Cyan',      reeds: ['#2E8AA0', '#1F6A82', '#144256'], accent: '#46B0C6' },
  { name: 'Navy',      reeds: ['#3A4A78', '#2A3760', '#1A2240'], accent: '#5A6AA0' },
  { name: 'Sea',       reeds: ['#3A8AA0', '#266A82', '#144456'], accent: '#56AEC6' },
];

/* ---- pattern generators: each returns { w, h, content } ---- */

// 0 — Cane weave: vertical + horizontal + both diagonals forming octagonal
// voids, with a thin accent highlight along each strand (the reference look).
function weave(p) {
  const T = 120;
  const h = T / 2;
  const [c1, c2] = p.reeds;
  const sw = 6;
  return {
    w: T, h: T,
    content: [
      <line key="d1" x1="0" y1="0" x2={T} y2={T} stroke={c1} strokeWidth={sw} strokeLinecap="round" />,
      <line key="d2" x1={T} y1="0" x2="0" y2={T} stroke={c1} strokeWidth={sw} strokeLinecap="round" />,
      <line key="v" x1={h} y1="0" x2={h} y2={T} stroke={c2} strokeWidth={sw} strokeLinecap="round" />,
      <line key="h" x1="0" y1={h} x2={T} y2={h} stroke={c2} strokeWidth={sw} strokeLinecap="round" />,
      <line key="hl1" x1="0" y1="0" x2={T} y2={T} stroke={p.accent} strokeWidth="1.5" opacity="0.7" />,
      <line key="hl2" x1={T} y1="0" x2="0" y2={T} stroke={p.accent} strokeWidth="1.5" opacity="0.7" />,
      <line key="hl3" x1={h} y1="0" x2={h} y2={T} stroke={p.accent} strokeWidth="1.5" opacity="0.6" />,
      <line key="hl4" x1="0" y1={h} x2={T} y2={h} stroke={p.accent} strokeWidth="1.5" opacity="0.6" />,
    ],
  };
}

// 1 — Dot grid: filled circles at the corners + a smaller accent centre dot.
function dots(p) {
  const T = 70;
  const r = 7;
  return {
    w: T, h: T,
    content: [
      <circle key="c1" cx="0" cy="0" r={r} fill={p.reeds[0]} />,
      <circle key="c2" cx={T} cy="0" r={r} fill={p.reeds[0]} />,
      <circle key="c3" cx="0" cy={T} r={r} fill={p.reeds[0]} />,
      <circle key="c4" cx={T} cy={T} r={r} fill={p.reeds[0]} />,
      <circle key="c5" cx={T / 2} cy={T / 2} r={r * 0.75} fill={p.accent} />,
    ],
  };
}

// 2 — Crosshatch: dense parallel diagonal mesh in two reed colours.
function crosshatch(p) {
  const T = 84;
  const step = 14;
  const lines = [];
  for (let i = -T; i <= T * 2; i += step) {
    lines.push(<line key={`a${i}`} x1={i} y1="0" x2={i + T} y2={T} stroke={p.reeds[0]} strokeWidth="2.5" />);
    lines.push(<line key={`b${i}`} x1={i} y1={T} x2={i + T} y2="0" stroke={p.reeds[1]} strokeWidth="2.5" />);
  }
  return { w: T, h: T, content: lines };
}

// 3 — Diamonds: a grid of rotated squares (diamond outlines) with accent tips.
function diamonds(p) {
  const T = 90;
  const h = T / 2;
  return {
    w: T, h: T,
    content: [
      <polygon key="d1" points={`${h},0 ${T},${h} ${h},${T} 0,${h}`} fill="none" stroke={p.reeds[0]} strokeWidth="3" />,
      <polygon key="d2" points={`${h},0 ${T},${h} ${h},${T} 0,${h}`} fill="none" stroke={p.accent} strokeWidth="1" opacity="0.5" />,
      <circle key="c" cx={h} cy={h} r="3" fill={p.reeds[1]} />,
    ],
  };
}

// 4 — Triangles: alternating up/down triangle outlines in two reed colours.
function triangles(p) {
  const B = 56;
  const H = 48;
  return {
    w: B, h: H,
    content: [
      <polygon key="up" points={`0,${H} ${B},${H} ${B / 2},0`} fill={p.reeds[0]} opacity="0.55" stroke={p.accent} strokeWidth="1" />,
      <polygon key="down" points={`0,0 ${B},0 ${B / 2},${H}`} fill={p.reeds[1]} opacity="0.45" stroke={p.accent} strokeWidth="1" />,
    ],
  };
}

// 5 — Plus signs: a grid of plus marks in reed + accent.
function plus(p) {
  const T = 80;
  const h = T / 2;
  const arm = 11;
  return {
    w: T, h: T,
    content: [
      <g key="p1" stroke={p.reeds[0]} strokeWidth="4" strokeLinecap="round">
        <line x1={h - arm} y1={h} x2={h + arm} y2={h} />
        <line x1={h} y1={h - arm} x2={h} y2={h + arm} />
      </g>,
      <circle key="c" cx={h} cy={h} r="2.5" fill={p.accent} />,
    ],
  };
}

// 6 — Brick: two offset courses of rectangles with mortar gaps.
function brick(p) {
  const W = 110;
  const H = 44;
  const bh = 18;
  return {
    w: W, h: H,
    content: [
      <rect key="r1" x="0" y="0" width={W} height={bh} fill={p.reeds[0]} stroke={p.reeds[2]} strokeWidth="1" />,
      <rect key="r2" x={-W / 2} y={bh + 6} width={W} height={bh} fill={p.reeds[1]} stroke={p.reeds[2]} strokeWidth="1" />,
      <rect key="r3" x={W / 2} y={bh + 6} width={W} height={bh} fill={p.reeds[1]} stroke={p.reeds[2]} strokeWidth="1" />,
    ],
  };
}

// 7 — Scatter: precomputed randomized shapes (stable for the session).
function scatter(p) {
  const T = 150;
  const rng = (seed) => { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
  const rand = rng(Math.floor(Math.random() * 100000));
  const shapes = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const kind = Math.floor(rand() * 4);
    const x = 12 + rand() * (T - 24);
    const y = 12 + rand() * (T - 24);
    const size = 8 + rand() * 16;
    const col = p.reeds[Math.floor(rand() * p.reeds.length)];
    const op = 0.5 + rand() * 0.35;
    shapes.push({ kind, x, y, size, col, op, key: i });
  }
  const content = shapes.map((sh) => {
    if (sh.kind === 0) return <circle key={sh.key} cx={sh.x} cy={sh.y} r={sh.size / 2} fill={sh.col} opacity={sh.op} />;
    if (sh.kind === 1) return (
      <g key={sh.key} stroke={sh.col} strokeWidth="3" opacity={sh.op} strokeLinecap="round">
        <line x1={sh.x - sh.size / 2} y1={sh.y} x2={sh.x + sh.size / 2} y2={sh.y} />
        <line x1={sh.x} y1={sh.y - sh.size / 2} x2={sh.x} y2={sh.y + sh.size / 2} />
      </g>
    );
    if (sh.kind === 2) return <rect key={sh.key} x={sh.x - sh.size / 2} y={sh.y - sh.size / 2} width={sh.size} height={sh.size} fill={sh.col} opacity={sh.op} />;
    const h = sh.size / 2;
    return <polygon key={sh.key} points={`${sh.x},${sh.y - h} ${sh.x + h},${sh.y + h} ${sh.x - h},${sh.y + h}`} fill={sh.col} opacity={sh.op} />;
  });
  return { w: T, h: T, content };
}

const PATTERNS = [weave, dots, crosshatch, diamonds, triangles, plus, brick, scatter];

/**
 * Randomly select one of the 8 textured backgrounds for the given family.
 * Returns { name, w, h, content } where content is ready-to-render SVG nodes.
 */
export function pickTexture(family) {
  const palettes = family === 'cold' ? COLD_PALETTES : WARM_PALETTES;
  const idx = Math.floor(Math.random() * PATTERNS.length);
  const palette = palettes[idx];
  const result = PATTERNS[idx](palette);
  return { name: `${palette.name} ${family === 'cold' ? 'Cold' : 'Warm'}`, ...result };
}