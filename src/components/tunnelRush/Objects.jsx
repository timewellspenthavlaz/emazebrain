import React from 'react';

/**
 * Procedural wall objects for Tunnel Rush — pure SVG, no image assets.
 * Each glyph is drawn inside a 100×100 box centred on (0,0).
 * Faces are seeded vector portraits: no photos, no identifiable people.
 */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SHAPE_PATHS = {
  circle: <circle cx="0" cy="0" r="38" />,
  square: <rect x="-34" y="-34" width="68" height="68" rx="6" />,
  triangle: <path d="M 0 -38 L 34 26 L -34 26 Z" />,
  cross: <path d="M -12 -38 H 12 V -12 H 38 V 12 H 12 V 38 H -12 V 12 H -38 V -12 H -12 Z" />,
  star: <path d="M 0 -40 L 9.5 -12.5 L 38 -12.5 L 15 4.5 L 23 32 L 0 15 L -23 32 L -15 4.5 L -38 -12.5 L -9.5 -12.5 Z" />,
  hexagon: <path d="M 0 -38 L 33 -19 L 33 19 L 0 38 L -33 19 L -33 -19 Z" />,
};

function ShapeGlyph({ label, colors }) {
  const shape = SHAPE_PATHS[label] ? label : 'circle';
  return (
    <g>
      {React.cloneElement(SHAPE_PATHS[shape], {
        fill: colors.accent, fillOpacity: 0.22, stroke: colors.accent, strokeWidth: 3,
      })}
    </g>
  );
}

function GlyphText({ label, colors }) {
  return (
    <g>
      <rect x="-40" y="-32" width="80" height="64" rx="10" fill={colors.surface} fillOpacity="0.9" stroke={colors.accent} strokeOpacity="0.5" strokeWidth="2" />
      <text x="0" y="13" textAnchor="middle" fontSize="44" fontWeight="700" fontFamily="'Space Grotesk', sans-serif" fill={colors.accent}>
        {label}
      </text>
    </g>
  );
}

function CartoonFaceGlyph({ label, colors }) {
  const h = hash(label);
  const browTilt = (h % 7) - 3;            // -3..3
  const eyeR = 4 + (h % 3);
  const moodCurve = [10, 2, -8, -2][h % 4]; // smile → frown variants
  return (
    <g>
      <circle cx="0" cy="0" r="36" fill="#F2C9A0" stroke="#1B1B1B" strokeWidth="3" />
      {/* hair */}
      <path d={`M -36 -6 A 36 36 0 0 1 36 -6 L 36 -14 A 36 30 0 0 0 -36 -14 Z`} fill="#3B2E28" />
      {/* eyes */}
      <circle cx="-13" cy="-4" r={eyeR} fill="#1B1B1B" />
      <circle cx="13" cy="-4" r={eyeR} fill="#1B1B1B" />
      {/* brows */}
      <line x1="-21" y1={-16 + browTilt} x2="-6" y2={-18 - browTilt} stroke="#1B1B1B" strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1={-18 - browTilt} x2="21" y2={-16 + browTilt} stroke="#1B1B1B" strokeWidth="3" strokeLinecap="round" />
      {/* mouth */}
      <path d={`M -14 16 Q 0 ${16 + moodCurve} 14 16`} stroke="#1B1B1B" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* cheeks */}
      <circle cx="-22" cy="8" r="4" fill="#F2A08F" opacity="0.6" />
      <circle cx="22" cy="8" r="4" fill="#F2A08F" opacity="0.6" />
    </g>
  );
}

function RealisticFaceGlyph({ label, colors, uid }) {
  const h = hash(label);
  const skin = ['#E8B48C', '#C68863', '#8D5A3B', '#F2C9A0', '#A06A48'][h % 5];
  const hair = ['#221A16', '#4A342A', '#6E5341', '#171717', '#55607F'][h % 5];
  const gid = `tr-skin-${uid}`;
  const eyeY = -4;
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor="#8A6248" />
        </linearGradient>
      </defs>
      {/* neck + head */}
      <rect x="-10" y="26" width="20" height="14" fill={skin} />
      <ellipse cx="0" cy="0" rx="30" ry="36" fill={`url(#${gid})`} />
      {/* hair */}
      <path d="M -30 -8 A 30 36 0 0 1 30 -8 L 30 -18 A 34 30 0 0 0 -30 -18 Z" fill={hair} />
      {/* eyes with pupils */}
      <ellipse cx="-11" cy={eyeY} rx="7" ry="5" fill="#FDFDFD" />
      <ellipse cx="11" cy={eyeY} rx="7" ry="5" fill="#FDFDFD" />
      <circle cx="-11" cy={eyeY} r="2.6" fill="#221A16" />
      <circle cx="11" cy={eyeY} r="2.6" fill="#221A16" />
      {/* nose */}
      <path d="M 0 2 L -3 12 L 2 13" stroke="#8A6248" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* lips */}
      <path d="M -9 22 Q 0 27 9 22 Q 0 31 -9 22 Z" fill="#B36A5A" />
      {/* shading */}
      <ellipse cx="0" cy="0" rx="30" ry="36" fill="none" stroke="#00000055" strokeWidth="2" />
    </g>
  );
}

/**
 * ObjectGlyph — one procedural object.
 * `wall` orientation rotates the glyph to lie along the tunnel wall tangent;
 * `upright` keeps it readable from every lane.
 */
export default function ObjectGlyph({ type, label, colors, uid = '0', orientation = 'upright', rotationDeg = 0 }) {
  const wallRot = orientation === 'wall' ? rotationDeg : 0;
  let inner;
  switch (type) {
    case 'letters':
    case 'numbers':
      inner = <GlyphText label={label} colors={colors} />;
      break;
    case 'cartoonFaces':
      inner = <CartoonFaceGlyph label={label} colors={colors} />;
      break;
    case 'realisticFaces':
      inner = <RealisticFaceGlyph label={label} colors={colors} uid={uid} />;
      break;
    default:
      inner = <ShapeGlyph label={label} colors={colors} />;
  }
  return <g transform={`rotate(${wallRot})`}>{inner}</g>;
}