import React, { useId } from 'react';

/**
 * CarShape — a top-down, 3D-styled car rendered as scalable SVG.
 * Drawn in a horizontal "content" space (0 0 L 100) with the front at +x,
 * then rotated for vertical pieces so the same artwork serves both axes.
 * When `isAmbulance` is true the body is white with a red cross stripe and
 * a roof light bar — the vehicle to be rescued from the lot.
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

  const body = isAmbulance ? '#F3F5F8' : color;
  const edge = shade(body, isAmbulance ? -0.16 : -0.24);
  const light = shade(body, isAmbulance ? 0.04 : 0.18);
  const glass = isAmbulance ? '#33414F' : '#26303D';
  const glassLight = '#5B6B7E';

  const bodyGrad = `bg-${gid}`;
  const glassGrad = `gl-${gid}`;

  const axles = [0.30, 0.70];
  const wheelW = Math.min(L * 0.20, 26);
  const frontX = L * 0.62;

  const content = (
    <>
      <defs>
        <linearGradient id={bodyGrad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor={edge} />
          <stop offset="48%" stopColor={light} />
          <stop offset="100%" stopColor={edge} />
        </linearGradient>
        <linearGradient id={glassGrad} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor={glass} />
          <stop offset="50%" stopColor={glassLight} />
          <stop offset="100%" stopColor={glass} />
        </linearGradient>
      </defs>

      {/* wheels (poke out top & bottom = the car's long sides) */}
      {axles.map((a, i) => {
        const cx = L * a;
        return (
          <g key={`w${i}`}>
            <rect x={cx - wheelW / 2} y={0} width={wheelW} height={18} rx={4} fill="#15171C" />
            <rect x={cx - wheelW / 2} y={82} width={wheelW} height={18} rx={4} fill="#15171C" />
          </g>
        );
      })}

      {/* body */}
      <rect x="6" y="9" width={L - 12} height="82" rx="20" fill={`url(#${bodyGrad})`} />
      {/* lower body shadow band for depth */}
      <rect x="6" y="74" width={L - 12} height="17" rx="14" fill={edge} opacity="0.55" />

      {/* sheen along the roof crown */}
      <rect x={L * 0.16} y="44" width={L * 0.68} height="9" rx="4" fill="#FFFFFF" opacity={isAmbulance ? 0.55 : 0.22} />

      {/* windshield (front = right) */}
      <rect x={frontX} y="20" width={L * 0.18} height="60" rx="9" fill={`url(#${glassGrad})`} />
      {/* rear window (back = left) */}
      <rect x={L * 0.18} y="20" width={L * 0.15} height="60" rx="9" fill={`url(#${glassGrad})`} opacity="0.92" />

      {/* roof panel between the glass */}
      <rect x={L * 0.36} y="22" width={L * 0.22} height="56" rx="10" fill={shade(body, isAmbulance ? -0.04 : 0.10)} opacity="0.5" />

      {/* headlights (front corners) */}
      <rect x={L - 16} y="16" width="9" height="13" rx="3" fill="#FFF6C8" />
      <rect x={L - 16} y="71" width="9" height="13" rx="3" fill="#FFF6C8" />
      {/* taillights (back corners) */}
      <rect x="7" y="16" width="8" height="13" rx="3" fill="#E0473A" />
      <rect x="7" y="71" width="8" height="13" rx="3" fill="#E0473A" />

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