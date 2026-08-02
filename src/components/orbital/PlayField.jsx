import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Sphere from './Sphere';

// Build a randomized, repeating texture tile of scattered shapes so the
// "textured" bg modes (coldt / warmt) read clearly without being noisy.
function useTextureTile(chrome) {
  return useMemo(() => {
    const TILE = 150;
    const rng = (seed) => {
      let s = seed;
      return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    };
    const rand = rng(Math.floor(Math.random() * 100000));
    const shapes = [];
    const shapeCount = 7;
    for (let i = 0; i < shapeCount; i++) {
      const kind = Math.floor(rand() * 4); // 0 circle, 1 cross, 2 square, 3 triangle
      const x = 10 + rand() * (TILE - 20);
      const y = 10 + rand() * (TILE - 20);
      const size = 6 + rand() * 12;
      const opacity = 0.06 + rand() * 0.12;
      shapes.push({ kind, x, y, size, opacity });
    }
    return { TILE, shapes, chrome };
  }, [chrome]);
}

/**
 * Play field — places spheres in jittered vertical bands and renders the chain
 * trail. Spheres drift gently within their cell (±12% of cell radius) unless
 * reduce_motion is set. The ≥90% visibility clamp is enforced by clamping each
 * sphere's centre so center ± 0.9r stays inside the safe rect.
 */
export default function PlayField({
  spheres, committed = [], dim, wrongId, correctIds = [], litId,
  neon, chrome, field, reduceMotion, onTap, width, height,
}) {
  const r = useMemo(() => {
    if (!spheres.length) return 32;
    const n = spheres.length;
    const bandH = height / n;
    const byBand = Math.min(bandH * 0.42, width * 0.09);
    return Math.max(26, Math.min(60, byBand));
  }, [spheres.length, width, height]);

  const hitR = r * 1.15;
  const pad = r * 0.95 + 6;
  const clamp = (cx, cy) => ({
    x: Math.min(width - pad, Math.max(pad, cx)),
    y: Math.min(height - pad, Math.max(pad, cy)),
  });

  const positioned = spheres.map((s) => {
    const base = clamp(s.x * width, s.y * height);
    return { ...s, bx: base.x, by: base.y };
  });
  const byId = Object.fromEntries(positioned.map((s) => [s.id, s]));

  const trail = [];
  for (let i = 1; i < committed.length; i++) {
    const a = byId[committed[i - 1]];
    const b = byId[committed[i]];
    if (a && b) trail.push({ a, b });
  }

  const texture = useTextureTile(chrome);

  return (
    <div className="absolute inset-0">
      {field.grid && (() => {
        const { TILE, shapes } = texture;
        return (
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            <defs>
              <pattern id="oo-texture" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
                {shapes.map((sh, i) => {
                  const common = { key: i, stroke: chrome, fill: 'none', strokeWidth: 1.5, opacity: sh.opacity };
                  if (sh.kind === 0) return <circle {...common} cx={sh.x} cy={sh.y} r={sh.size / 2} />;
                  if (sh.kind === 1) {
                    const h = sh.size / 2;
                    return (
                      <g key={i} stroke={chrome} strokeWidth={1.5} opacity={sh.opacity}>
                        <line x1={sh.x - h} y1={sh.y} x2={sh.x + h} y2={sh.y} />
                        <line x1={sh.x} y1={sh.y - h} x2={sh.x} y2={sh.y + h} />
                      </g>
                    );
                  }
                  if (sh.kind === 2) return <rect {...common} x={sh.x - sh.size / 2} y={sh.y - sh.size / 2} width={sh.size} height={sh.size} />;
                  const h = sh.size / 2;
                  return (
                    <polygon key={i} stroke={chrome} fill="none" strokeWidth={1.5} opacity={sh.opacity}
                      points={`${sh.x},${sh.y - h} ${sh.x + h},${sh.y + h} ${sh.x - h},${sh.y + h}`} />
                  );
                })}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#oo-texture)" />
          </svg>
        );
      })()}

      {/* Chain trail */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', zIndex: 5 }}>
        {trail.map((seg, i) => {
          const opacity = 0.4 + (0.55 * (i + 1)) / Math.max(1, trail.length);
          return (
            <line key={i} x1={seg.a.bx} y1={seg.a.by} x2={seg.b.bx} y2={seg.b.by}
              stroke={chrome} strokeWidth={3} strokeLinecap="round" opacity={opacity}
              style={neon ? { filter: `drop-shadow(0 0 6px ${chrome})` } : undefined} />
          );
        })}
      </svg>

      {/* Spheres */}
      {positioned.map((s) => {
        let state = 'idle';
        if (dim) state = 'dim';
        else if (litId && litId !== s.id) state = 'dim';
        else if (litId === s.id) state = 'lit';
        else if (wrongId === s.id) state = 'wrong';
        else if (correctIds.includes(s.id)) state = 'correct';

        const ordinalIdx = committed.indexOf(s.id);
        const ordinal = ordinalIdx >= 0 ? ordinalIdx + 1 : null;

        const driftAmp = reduceMotion ? 0 : r * 0.12;
        const dur = 6 + (parseInt(s.id.slice(1), 10) % 4);
        const delay = (parseInt(s.id.slice(1), 10) % 5) * 0.4;

        const z = state === 'wrong' || state === 'lit' || state === 'correct' ? 20 : 10;

        return (
          <motion.div key={s.id}
            style={{ position: 'absolute', left: s.bx - hitR, top: s.by - hitR, width: hitR * 2, height: hitR * 2, zIndex: z }}
            animate={driftAmp ? { x: [0, driftAmp, 0, -driftAmp, 0], y: [0, -driftAmp * 0.7, -driftAmp, 0, 0] } : undefined}
            transition={driftAmp ? { duration: dur, repeat: Infinity, ease: 'easeInOut', delay } : undefined}
          >
            <Sphere token={s.color} glyph={s.glyph} r={r} state={state} ordinal={ordinal}
              neon={neon} chrome={chrome} reduceMotion={reduceMotion}
              onTap={() => onTap(s.id)} />
          </motion.div>
        );
      })}
    </div>
  );
}