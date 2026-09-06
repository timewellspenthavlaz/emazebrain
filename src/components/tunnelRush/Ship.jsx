import React from 'react';

/**
 * ShipGlyph — the patient's spaceship, drawn rear-view (chase camera):
 * low-poly angular hull, dark central stripe, glowing cyan cockpit and
 * thrusters. Banks (tilt) on steer input, idles with a gentle hover, and
 * fires a backfire exhaust that intensifies with the run's speed.
 * Drawn in a ~110-unit box centred on (x, y).
 */
export default function ShipGlyph({
  colors, started, tilt = 0, speedRatio = 0, x = 0, y = 0, reduceMotion = false,
}) {
  const glow = started ? 0.95 : 0.5;
  const flameLen = 26 + speedRatio * 58;
  const flicker = (v1, v2, dur) => (reduceMotion
    ? null
    : <animate attributeName="opacity" values={`${v1};${v2};${v1}`} dur={dur} repeatCount="indefinite" />);

  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(1.15)`}>
      <g transform={`rotate(${tilt.toFixed(1)})`}>
        <g>
          {reduceMotion ? null : (
            <animateTransform attributeName="transform" type="translate"
              values="0 0; 0 -4; 0 0" dur="2.4s" repeatCount="indefinite" additive="sum" />
          )}
          <defs>
            <linearGradient id="tr-flame" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor={colors.accent} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* soft cyan under-glow */}
          <ellipse cx="0" cy="10" rx="58" ry="34" fill={colors.accent} opacity={glow * 0.16} />
          {/* backfire exhaust — behind the hull, streaming toward the viewer */}
          {started && (
            <>
              <polygon points={`-21,34 -14,${34 + flameLen} -7,34`} fill="url(#tr-flame)">
                {flicker(1, 0.5, '0.16s')}
              </polygon>
              <polygon points={`7,34 14,${34 + flameLen} 21,34`} fill="url(#tr-flame)">
                {flicker(0.5, 1, '0.13s')}
              </polygon>
            </>
          )}
          {/* wings */}
          <path d="M 18 2 L 52 34 L 20 40 Z" fill="#16233A" stroke={colors.accent} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M -18 2 L -52 34 L -20 40 Z" fill="#16233A" stroke={colors.accent} strokeWidth="2.5" strokeLinejoin="round" />
          {/* angular hull */}
          <path d="M 0 -40 L 22 -10 L 28 36 L -28 36 L -22 -10 Z" fill="#1B2A44" stroke={colors.accent} strokeWidth="3" strokeLinejoin="round" />
          {/* dark central stripe */}
          <path d="M -7 -34 L 7 -34 L 10 36 L -10 36 Z" fill="#0B1220" />
          {/* cockpit glow */}
          <ellipse cx="0" cy="-14" rx="7" ry="10" fill={colors.accent} opacity={glow}>
            {reduceMotion ? null : (
              <animate attributeName="opacity"
                values={`${glow};${(glow * 0.55).toFixed(2)};${glow}`} dur="1.6s" repeatCount="indefinite" />
            )}
          </ellipse>
          {/* rear thruster nozzles */}
          <circle cx="-14" cy="34" r="7" fill="#0B1220" stroke={colors.accent} strokeWidth="2.5" />
          <circle cx="14" cy="34" r="7" fill="#0B1220" stroke={colors.accent} strokeWidth="2.5" />
          <circle cx="-14" cy="34" r="3" fill="#FFFFFF" opacity={started ? 0.9 : 0.25} />
          <circle cx="14" cy="34" r="3" fill="#FFFFFF" opacity={started ? 0.9 : 0.25} />
        </g>
      </g>
    </g>
  );
}