import React, { useMemo } from 'react';
import ObjectGlyph from './Objects';
import { VIEW_DEPTH } from '@/lib/tunnelRush/config';

/**
 * PlayField — the tunnel stage. SVG/CSS pseudo-3D: polygonal wireframe bands
 * recede to a vanishing point; gates render as crimson blocked arcs with the
 * guaranteed opening left clear; procedural objects mark the danger lanes.
 * The patient's position is the glowing cyan wedge at the bottom.
 */

const CX = 500;
const CY = 500;
const R = 470;
const F = 3;           // focal length for depth perspective
const BAND = 0.55;     // spacing between wireframe bands

function proj(r, ang) {
  return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)];
}

function ringPoints(r, lanes, angle) {
  const arc = (Math.PI * 2) / lanes;
  const pts = [];
  for (let i = 0; i <= lanes; i++) {
    const [x, y] = proj(r, i * arc + angle + Math.PI / 2);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

// Deterministic star field for the `stars` scene.
function useStars() {
  return useMemo(() => {
    let s = 42;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    return Array.from({ length: 70 }, () => ({
      x: rnd() * 1000, y: rnd() * 1000, r: 0.6 + rnd() * 1.6, o: 0.15 + rnd() * 0.5,
    }));
  }, []);
}

export default function PlayField({
  angle, scroll, gates, lanes, colors, scene,
  objectOrientation, started, hitFlash, reduceMotion,
}) {
  const arc = (Math.PI * 2) / lanes;
  const stars = useStars();

  // Wireframe bands scrolling toward the viewer.
  const bands = [];
  const offset = scroll % BAND;
  for (let k = 0; ; k++) {
    const z = k * BAND - offset;
    if (z < 0.12) continue;
    if (z > VIEW_DEPTH) break;
    bands.push({ z, r: (R * F) / (F + z) });
  }

  // Visible gates (world z relative to the patient plane).
  const visibleGates = (gates || [])
    .map((g) => ({ ...g, z: g.z - scroll }))
    .filter((g) => g.z > 0 && g.z <= VIEW_DEPTH);

  return (
    <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="tr-scene" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor={colors.page} />
          <stop offset="70%" stopColor={colors.page} />
          <stop offset="100%" stopColor={colors.surface} />
        </radialGradient>
      </defs>

      {/* Scene backdrop */}
      {scene === 'solid' && <rect width="1000" height="1000" fill={colors.page} />}
      {scene === 'gradient' && <rect width="1000" height="1000" fill="url(#tr-scene)" />}
      {scene === 'stars' && (
        <>
          <rect width="1000" height="1000" fill={colors.page} />
          {stars.map((st, i) => (
            <circle key={i} cx={st.x} cy={st.y} r={st.r} fill={colors.muted} opacity={st.o} />
          ))}
        </>
      )}
      {scene === 'grid' && (
        <>
          <rect width="1000" height="1000" fill={colors.page} />
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i} stroke={colors.accent} strokeOpacity="0.07" strokeWidth="1">
              <line x1={i * 100} y1="0" x2={i * 100} y2="1000" />
              <line x1="0" y1={i * 100} x2="1000" y2={i * 100} />
            </g>
          ))}
        </>
      )}
      {scene === 'rings' && (
        <>
          <rect width="1000" height="1000" fill={colors.page} />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cx={CX} cy={CY} r={40 + i * 38} fill="none" stroke={colors.accent} strokeOpacity="0.07" strokeWidth="1" />
          ))}
        </>
      )}

      {/* Motion-blur speed streaks radiating outward */}
      {!reduceMotion && Array.from({ length: 18 }, (_, i) => {
        const ang = i * (Math.PI / 9) + 0.31;
        const [x0, y0] = proj(R * 0.66, ang);
        const [x1, y1] = proj(R, ang);
        return (
          <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
            stroke={colors.accent} strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur={`${0.7 + (i % 5) * 0.12}s`} begin={`${(i % 7) * 0.11}s`} repeatCount="indefinite" />
          </line>
        );
      })}

      {/* Corner rays — the 1px hairline cyan grid down the tunnel walls */}
      {Array.from({ length: lanes + 1 }, (_, i) => {
        const ang = i * arc + angle + Math.PI / 2;
        const [x0, y0] = proj(R * F / (F + VIEW_DEPTH), ang);
        const [x1, y1] = proj(R, ang);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={colors.accent} strokeOpacity="0.12" strokeWidth="1" />;
      })}

      {/* Wireframe bands */}
      {bands.map((b, i) => (
        <polygon key={i} points={ringPoints(b.r, lanes, angle)}
          fill="none" stroke={colors.accent}
          strokeOpacity={b.z < 1.2 ? 0.4 : 0.16} strokeWidth="1" />
      ))}

      {/* Gates: crimson blocked arcs, cyan hairline ring, open lane clear */}
      {visibleGates.map((g) => {
        const zNear = Math.max(0.02, g.z + 0.34);
        const rFar = (R * F) / (F + g.z);
        const rNear = (R * F) / (F + zNear);
        return (
          <g key={g.id}>
            {/* full-ring hairline at the gate plane */}
            <polygon points={ringPoints(rFar, lanes, angle)}
              fill="none" stroke={colors.accent} strokeOpacity="0.5" strokeWidth="2" />
            {/* blocked lanes */}
            {g.blocked.map((lane) => {
              const a0 = lane * arc + angle + Math.PI / 2;
              const a1 = a0 + arc;
              const [x1n, y1n] = proj(rNear, a0);
              const [x2n, y2n] = proj(rNear, a1);
              const [x2f, y2f] = proj(rFar, a1);
              const [x1f, y1f] = proj(rFar, a0);
              return (
                <polygon key={lane}
                  points={`${x1n.toFixed(1)},${y1n.toFixed(1)} ${x2n.toFixed(1)},${y2n.toFixed(1)} ${x2f.toFixed(1)},${y2f.toFixed(1)} ${x1f.toFixed(1)},${y1f.toFixed(1)}`}
                  fill={colors.hit} fillOpacity={g.z < 1.5 ? 0.75 : 0.5}
                  stroke={colors.hit} strokeOpacity="0.9" strokeWidth="1.5" />
              );
            })}
            {/* wall objects on the blocked lanes */}
            {g.objects.map((o, oi) => {
              const aMid = (o.lane + 0.5) * arc + angle + Math.PI / 2;
              const rMid = (rNear + rFar) / 2;
              const [x, y] = proj(rMid, aMid);
              const s = Math.max(0.06, (rMid * arc * 0.72) / 100);
              const rotDeg = ((aMid + Math.PI / 2) * 180) / Math.PI;
              return (
                <g key={oi} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`}>
                  <ObjectGlyph type={o.type} label={o.label} colors={colors}
                    uid={`${g.id}-${oi}`} orientation={objectOrientation}
                    rotationDeg={rotDeg} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Patient wedge — fixed at the bottom, glowing cyan */}
      <g>
        <line x1={CX} y1={CY + R + 26} x2={CX} y2={CY + R * 0.45}
          stroke={colors.accent} strokeWidth="2" strokeOpacity={started ? 0.75 : 0.3} />
        <polygon
          points={`${CX - 13},${CY + R + 12} ${CX + 13},${CY + R + 12} ${CX},${CY + R - 10}`}
          fill={colors.accent} opacity={started ? 0.95 : 0.5} />
        {started && (
          <polygon points={`${CX - 13},${CY + R + 12} ${CX + 13},${CY + R + 12} ${CX},${CY + R - 10}`} fill={colors.accent}>
            <animate attributeName="opacity" values="1;0.55;1" dur="1.4s" repeatCount="indefinite" />
          </polygon>
        )}
      </g>

      {/* Crimson hit vignette pulse */}
      {hitFlash > 0 && (
        <rect key={hitFlash} width="1000" height="1000" fill={colors.hit} opacity="0">
          <animate attributeName="opacity" values="0.22;0" dur="0.45s" fill="freeze" />
        </rect>
      )}
    </svg>
  );
}