import React, { useMemo } from 'react';
import ObjectGlyph from './Objects';
import ShipGlyph from './Ship';
import { VIEW_DEPTH, laneColor, CURVE_AMPS } from '@/lib/tunnelRush/config';

/**
 * PlayField — the tunnel stage. SVG/CSS pseudo-3D with a visibly bending
 * corridor: every depth ring is displaced along a world-space arc, so the
 * tunnel sweeps left/right (and up/down at difficulty 3+) with a clearly
 * shifted vanishing point. Each lane carries its own color-blocked tile
 * band, and the patient flies a low-poly spaceship — docked at the mouth
 * (`fixed` mode) or sliding around the circumference (`move` mode).
 */

const CX = 500;
const CY = 500;
const R = 470;
const F = 3;           // focal length for depth perspective
const BAND = 0.55;     // spacing between wireframe bands
const PANEL = 1.1;      // depth of each colored tile band

// World-space bending pattern. Displacement is anchored at the patient
// plane (zero there) and grows with depth — the far end of the corridor
// visibly arcs away, and the pattern sweeps past as the patient travels.
function bend(worldZ, amp, vertical) {
  return {
    x: amp * (Math.sin(worldZ * 0.55) * 0.7 + Math.sin(worldZ * 0.23 + 1.3) * 0.3),
    y: vertical ? amp * 0.45 * Math.sin(worldZ * 0.37 + 2.1) : 0,
  };
}

// Geometry of the ring at screen-depth d: radius + centre offset by the curve.
function ringGeom(d, scroll, amp, vertical) {
  const r = (R * F) / (F + d);
  const damp = 0.55 + 0.45 * (r / R); // far rings shift slightly less than near ones
  const here = bend(scroll, amp, vertical);
  const at = bend(scroll + d, amp, vertical);
  return { r, cx: CX + (at.x - here.x) * damp, cy: CY + (at.y - here.y) * damp };
}

function ringPoint(g, arc, i, rot) {
  const a = i * arc + rot + Math.PI / 2;
  return [g.cx + g.r * Math.cos(a), g.cy + g.r * Math.sin(a)];
}

const ptStr = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;

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
  angle, scroll, obstacles, lanes, colors, scene,
  objectOrientation, shipMode = 'fixed', tilt = 0, speedRatio = 0,
  difficultyLevel = 3, started, hitFlash, reduceMotion,
}) {
  const arc = (Math.PI * 2) / lanes;
  const stars = useStars();
  const amp = CURVE_AMPS[difficultyLevel] || CURVE_AMPS[3];
  const vertical = difficultyLevel >= 3;
  // In `move` mode the tunnel stays put and the ship slides instead.
  const ringRot = shipMode === 'move' ? 0 : angle;

  // Wireframe band depths, scrolling toward the viewer.
  const bands = [];
  const offset = scroll % BAND;
  for (let k = 0; ; k++) {
    const z = k * BAND - offset;
    if (z < 0.12) continue;
    if (z > VIEW_DEPTH) break;
    bands.push(z);
  }

  // Colored tile-band ring depths (coarser than the wireframe cadence).
  const panels = [];
  const pOff = scroll % PANEL;
  for (let k = 0; ; k++) {
    const d = k * PANEL - pOff;
    if (d > VIEW_DEPTH) break;
    if (d > 0.05) panels.push(d);
  }

  // Visible obstacles (depth relative to the patient plane).
  const visibleObstacles = (obstacles || [])
    .map((o) => ({ ...o, z: o.z - scroll }))
    .filter((o) => o.z > 0 && o.z <= VIEW_DEPTH);

  const gNear = ringGeom(0, scroll, amp, vertical);
  const gFar = ringGeom(VIEW_DEPTH, scroll, amp, vertical);

  // Ship placement: docked at the bottom of the mouth, or sliding around
  // the circumference opposite the tunnel roll.
  let shipX = CX;
  let shipY = CY + R * 0.8;
  if (shipMode === 'move') {
    const sa = Math.PI / 2 + 0.5 * arc - angle;
    shipX = CX + R * 0.82 * Math.cos(sa);
    shipY = CY + R * 0.82 * Math.sin(sa);
  }

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
        const [x0, y0] = [CX + R * 0.66 * Math.cos(ang), CY + R * 0.66 * Math.sin(ang)];
        const [x1, y1] = [CX + R * Math.cos(ang), CY + R * Math.sin(ang)];
        return (
          <line key={i} x1={x0} y1={y0} x2={x1} y2={y1}
            stroke={colors.accent} strokeWidth="1.5" opacity="0">
            <animate attributeName="opacity" values="0;0.4;0" dur={`${0.7 + (i % 5) * 0.12}s`} begin={`${(i % 7) * 0.11}s`} repeatCount="indefinite" />
          </line>
        );
      })}

      {/* Color-blocked tile bands — one distinct color per lane */}
      {panels.slice(0, -1).map((d1, k) => {
        const d2 = panels[k + 1];
        const g1 = ringGeom(d1, scroll, amp, vertical);
        const g2 = ringGeom(d2, scroll, amp, vertical);
        const fade = Math.max(0.06, 0.34 - d1 * 0.04);
        return Array.from({ length: lanes }, (_, j) => {
          const a1 = ringPoint(g1, arc, j, ringRot);
          const b1 = ringPoint(g1, arc, j + 1, ringRot);
          const a2 = ringPoint(g2, arc, j, ringRot);
          const b2 = ringPoint(g2, arc, j + 1, ringRot);
          return (
            <polygon key={`${k}-${j}`}
              points={`${ptStr(a1)} ${ptStr(b1)} ${ptStr(b2)} ${ptStr(a2)}`}
              fill={laneColor(j)} fillOpacity={fade}
              stroke="#0B1220" strokeOpacity="0.4" strokeWidth="1" />
          );
        });
      })}

      {/* Corner rays — hairlines converging along the curved walls */}
      {Array.from({ length: lanes + 1 }, (_, i) => {
        const [x0, y0] = ringPoint(gFar, arc, i, ringRot);
        const [x1, y1] = ringPoint(gNear, arc, i, ringRot);
        return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={colors.accent} strokeOpacity="0.12" strokeWidth="1" />;
      })}

      {/* Wireframe bands over the tiles */}
      {bands.map((z, i) => {
        const g = ringGeom(z, scroll, amp, vertical);
        const pts = Array.from({ length: lanes + 1 }, (_, j) => ptStr(ringPoint(g, arc, j, ringRot))).join(' ');
        return <polygon key={i} points={pts} fill="none" stroke={colors.accent}
          strokeOpacity={z < 1.2 ? 0.35 : 0.14} strokeWidth="1" />;
      })}

      {/* Obstacles: distinct 3D-styled objects floating on the circumference.
          Everything else is open passage — only an object's own lane hits. */}
      {visibleObstacles.map((o) => {
        const g = ringGeom(o.z, scroll, amp, vertical);
        const r = g.r * 0.84; // floating slightly inside the wall
        const aMid = (o.lane + 0.5) * arc + ringRot + Math.PI / 2;
        const x = g.cx + r * Math.cos(aMid);
        const y = g.cy + r * Math.sin(aMid);
        const s = Math.max(0.06, (r * arc * 0.92) / 100);
        const rotDeg = ((aMid + Math.PI / 2) * 180) / Math.PI;
        const near = o.z < 1.5;
        return (
          <g key={o.id} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})`}>
            {/* depth shadow — cheap 3D read */}
            <rect x="-50" y="-50" width="100" height="100" rx="16"
              fill="#000000" fillOpacity={near ? 0.45 : 0.3} transform="translate(7,9)" />
            {/* crimson blocker panel */}
            <rect x="-52" y="-52" width="104" height="104" rx="16"
              fill={colors.hit} fillOpacity={near ? 0.3 : 0.18}
              stroke={colors.hit} strokeWidth="3" />
            {/* procedural glyph tinted as danger */}
            <ObjectGlyph type={o.type} label={o.label} colors={{ ...colors, accent: colors.hit }}
              uid={String(o.id)} orientation={objectOrientation} rotationDeg={rotDeg} />
          </g>
        );
      })}

      {/* Patient spaceship */}
      <ShipGlyph colors={colors} started={started} tilt={tilt} speedRatio={speedRatio}
        x={shipX} y={shipY} reduceMotion={reduceMotion} />

      {/* Crimson hit vignette pulse */}
      {hitFlash > 0 && (
        <rect key={hitFlash} width="1000" height="1000" fill={colors.hit} opacity="0">
          <animate attributeName="opacity" values="0.22;0" dur="0.45s" fill="freeze" />
        </rect>
      )}
    </svg>
  );
}