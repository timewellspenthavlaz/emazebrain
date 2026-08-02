import React, { useId } from 'react';

/**
 * CarShape — a top-down, 3D-styled car rendered as scalable SVG.
 * Drawn in a horizontal "content" space (0 0 L 100) with the front at +x,
 * then rotated for vertical pieces. Lighting comes from the top-left,
 * giving the rounded body, glass and panel lines a low-poly 3D read.
 * When `isAmbulance` is true the body is white with a red cross stripe
 * and a roof light bar — the vehicle to be rescued from the lot.
 */

function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const add = amt * 255;
  return '#' + [clamp255(r + add), clamp255(g + add), clamp255(b + add)]
    .map((v) => v.toString(16).padStart(2, '0')).join('');
}

export default function CarShape({ length, horiz, color, isAmbulance }) {
  const raw = useId();
  const gid = raw.replace(/[:]/g, '');
  const L = length * 100;

  const body = isAmbulance ? '#F4F6F9' : color;
  const hi = shade(body, isAmbulance ? 0.05 : 0.24);
  const lo = shade(body, isAmbulance ? -0.18 : -0.30);
  const panel = shade(body, isAmbulance ? -0.06 : 0.08);
  const glass = '#1B232E';
  const glassHi = '#6E8095';

  const bodyGrad = `bg-${gid}`;
  const glassGrad = `gl-${gid}`;
  const sheen = `sh-${gid}`;
  const rimGrad = `rm-${gid}`;

  const axles = [0.28, 0.72];
  const wheelW = Math.min(L * 0.20, 24);

  const content = (
    <>
      <defs>
        <linearGradient id={bodyGrad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={L} y2="100">
          <stop offset="0%" stopColor={hi} />
          <stop offset="55%" stopColor={body} />
          <stop offset="100%" stopColor={lo} />
        </linearGradient>
        <linearGradient id={glassGrad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor={glass} />
          <stop offset="45%" stopColor={glassHi} />
          <stop offset="100%" stopColor={glass} />
        </linearGradient>
        <radialGradient id={sheen} gradientUnits="userSpaceOnUse" cx={L * 0.3} cy="32" r={L * 0.5}>
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={rimGrad}>
          <stop offset="0%" stopColor="#7C828C" />
          <stop offset="100%" stopColor="#2A2E36" />
        </radialGradient>
      </defs>

      {/* contact shadow under the car */}
      <ellipse cx={L / 2} cy="94" rx={L * 0.46} ry="6" fill="#000" opacity="0.28" />

      {/* wheels (poke out top & bottom = the car's long sides) */}
      {axles.map((a, i) => {
        const cx = L * a;
        return (
          <g key={`w${i}`}>
            {[0, 82].map((wy) => (
              <g key={wy}>
                <rect x={cx - wheelW / 2} y={wy} width={wheelW} height={18} rx={5} fill="#171A20" />
                <circle cx={cx} cy={wy + 9} r={wheelW * 0.30} fill={`url(#${rimGrad})`} />
              </g>
            ))}
          </g>
        );
      })}

      {/* body */}
      <rect x="6" y="12" width={L - 12} height="76" rx="22" fill={`url(#${bodyGrad})`} stroke={lo} strokeWidth="1.2" />
      {/* directional sheen from top-left */}
      <rect x="6" y="12" width={L - 12} height="76" rx="22" fill={`url(#${sheen})`} />

      {/* hood (front) panel line */}
      <path d={`M ${L * 0.60} 20 Q ${L * 0.55} 50 ${L * 0.60} 80`} stroke={lo} strokeWidth="1.1" fill="none" opacity="0.7" />
      {/* trunk (rear) panel line */}
      <path d={`M ${L * 0.40} 20 Q ${L * 0.45} 50 ${L * 0.40} 80`} stroke={lo} strokeWidth="1.1" fill="none" opacity="0.7" />
      {/* door split lines */}
      <line x1={L * 0.34} y1="18" x2={L * 0.34} y2="82" stroke={lo} strokeWidth="0.9" opacity="0.5" />
      <line x1={L * 0.50} y1="18" x2={L * 0.50} y2="82" stroke={lo} strokeWidth="0.9" opacity="0.5" />

      {/* roof / cabin glass band */}
      <rect x={L * 0.38} y="20" width={L * 0.22} height="60" rx="12" fill={`url(#${glassGrad})`} />
      {/* windshield (front = right) trapezoid + reflection */}
      <path d={`M ${L * 0.60} 24 L ${L * 0.66} 24 L ${L * 0.64} 76 L ${L * 0.60} 76 Z`} fill={`url(#${glassGrad})`} />
      <path d={`M ${L * 0.60} 26 L ${L * 0.635} 26 L ${L * 0.625} 40 L ${L * 0.60} 40 Z`} fill="#FFFFFF" opacity="0.20" />
      {/* rear window (back = left) */}
      <path d={`M ${L * 0.40} 24 L ${L * 0.34} 24 L ${L * 0.36} 76 L ${L * 0.40} 76 Z`} fill={`url(#${glassGrad})`} opacity="0.95" />
      {/* side windows */}
      <rect x={L * 0.40} y="20" width={L * 0.18} height="11" rx="4" fill={glass} opacity="0.85" />
      <rect x={L * 0.40} y="69" width={L * 0.18} height="11" rx="4" fill={glass} opacity="0.85" />

      {/* mirrors */}
      <rect x={L * 0.40} y="9" width="6" height="7" rx="2" fill={panel} />
      <rect x={L * 0.40} y="84" width="6" height="7" rx="2" fill={panel} />

      {/* headlights (front corners) */}
      <rect x={L - 15} y="17" width="8" height="12" rx="3" fill="#FFF7D0" />
      <rect x={L - 15} y="71" width="8" height="12" rx="3" fill="#FFF7D0" />
      {/* taillights (back corners) */}
      <rect x="7" y="17" width="7" height="12" rx="3" fill="#E0473A" />
      <rect x="7" y="71" width="7" height="12" rx="3" fill="#E0473A" />

      {/* hood + trunk toning for the low-poly read */}
      <rect x={L * 0.62} y="14" width={L * 0.34} height="72" rx="16" fill={panel} opacity="0.22" />
      <rect x="8" y="14" width={L * 0.30} height="72" rx="16" fill={lo} opacity="0.16" />

      {isAmbulance && (
        <>
          {/* red side stripe across the body */}
          <rect x="8" y="42" width={L - 16} height="16" rx="3" fill="#E0503A" />
          {/* white cross on the stripe */}
          <g fill="#FFFFFF">
            <rect x={L * 0.5 - 11} y="40" width="22" height="20" rx="2" />
            <rect x={L * 0.5 - 20} y="44" width="40" height="12" rx="2" />
          </g>
          {/* roof light bar (red / blue) */}
          <rect x={L * 0.58} y="46" width={L * 0.10} height="8" rx="2" fill="#E0503A" />
          <rect x={L * 0.68} y="46" width={L * 0.10} height="8" rx="2" fill="#3D7BFF" />
        </>
      )}
    </>
  );

  if (horiz) {
    return (
      <svg viewBox={`0 0 ${L} 100`} preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        {content}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 100 ${L}`} preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <g transform={`translate(0 ${L}) rotate(-90)`}>{content}</g>
    </svg>
  );
}