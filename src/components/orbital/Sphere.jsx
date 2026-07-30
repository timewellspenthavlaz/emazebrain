import React from 'react';
import { motion } from 'framer-motion';
import { COLOR_TOKENS, tokenFill, ringColor, glyphColor } from '@/lib/orbitalOrder/config';

// Quadrant ring: four arcs with small gaps.
function quadrantArcs(R, stroke, sw) {
  const arc = (a1, a2) => {
    const p = (deg) => [R * Math.cos((deg * Math.PI) / 180), R * Math.sin((deg * Math.PI) / 180)];
    const [x1, y1] = p(a1);
    const [x2, y2] = p(a2);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  return [-88, 2, 92, 182].map((a, i) => (
    <path key={i} d={arc(a, a + 84)} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
  ));
}

// One of eight rim-ring patterns. Ring geometry is identical across neon modes.
function RingPattern({ ring, R, stroke, sw }) {
  switch (ring) {
    case 'solid':    return <circle r={R} stroke={stroke} strokeWidth={sw} fill="none" />;
    case 'double':   return (<><circle r={R} stroke={stroke} strokeWidth={sw} fill="none" /><circle r={R - 4} stroke={stroke} strokeWidth={sw} fill="none" /></>);
    case 'dashed':   return <circle r={R} stroke={stroke} strokeWidth={sw} fill="none" strokeDasharray="6 4" />;
    case 'dotted':   return <circle r={R} stroke={stroke} strokeWidth={sw} fill="none" strokeDasharray="0.5 4" strokeLinecap="round" />;
    case 'thick':    return <circle r={R} stroke={stroke} strokeWidth={sw + 2.5} fill="none" />;
    case 'notched':  return <circle r={R} stroke={stroke} strokeWidth={sw} fill="none" strokeDasharray={`${(R * Math.PI) / 4} ${(R * Math.PI) / 6}`} />;
    case 'quadrant': return <g>{quadrantArcs(R, stroke, sw)}</g>;
    case 'inner':    return <circle r={R * 0.62} stroke={stroke} strokeWidth={sw} fill="none" />;
    default:         return <circle r={R} stroke={stroke} strokeWidth={sw} fill="none" />;
  }
}

/**
 * Sphere — a single colour token, rendered as a 2D disc (br=left backend).
 * Pure visual; positioning + drift is owned by the PlayField wrapper. Hit area
 * is 1.15× the visual radius.
 */
export default function Sphere({
  token, glyph, r, state = 'idle', ordinal, neon = false, chrome, reduceMotion = false, onTap,
}) {
  const fill = tokenFill(token, neon);
  const ringCol = ringColor(fill, chrome);
  const glyphCol = glyphColor();
  const hitR = r * 1.15;
  const Rr = r * 0.9;
  const sw = Math.max(2, r * 0.05);

  const dim = state === 'dim';
  const selected = state === 'selected';
  const correct = state === 'correct';
  const wrong = state === 'wrong';
  const lit = state === 'lit';

  const badgeR = Math.max(10, r * 0.3);
  const badgeOff = r * 0.78;

  const shake = wrong && !reduceMotion ? { x: [0, -14, 14, -10, 10, -6, 6, 0] } : false;

  return (
    <motion.div
      onClick={onTap}
      style={{
        width: hitR * 2, height: hitR * 2,
        cursor: dim ? 'default' : 'pointer',
        opacity: dim ? 0.26 : 1,
        pointerEvents: dim ? 'none' : 'auto',
      }}
      animate={shake ? { x: shake.x } : undefined}
      transition={shake ? { duration: 0.3, ease: 'easeOut' } : undefined}
      whileHover={!dim ? { scale: 1.03 } : undefined}
    >
      <svg width="100%" height="100%" viewBox={`${-hitR} ${-hitR} ${hitR * 2} ${hitR * 2}`} style={{ display: 'block', overflow: 'visible' }}>
        {neon && <circle r={r} fill={fill} opacity={0.55} style={{ filter: `blur(${r * 0.6}px)` }} />}
        <circle r={r} fill={fill} />
        {neon && <circle r={r * 0.5} fill="#ffffff" opacity={0.42} style={{ filter: `blur(${r * 0.18}px)` }} />}
        <circle r={r - sw / 2} fill="none" stroke={ringCol} strokeWidth={sw} opacity={0.5} />
        <RingPattern ring={COLOR_TOKENS[token].ring} R={Rr} stroke={ringCol} sw={sw} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
          fontSize={r * 0.8} fontWeight={800} fill={glyphCol}
          style={{ fontFamily: 'Inter, ui-sans-serif, system-ui', fontVariantNumeric: 'tabular-nums' }}>
          {glyph}
        </text>
        {selected && <circle r={r + 4} fill="none" stroke={chrome} strokeWidth={2.5} opacity={0.9} />}
        {correct && <circle r={r + 3} fill="none" stroke={chrome} strokeWidth={2} opacity={0.7} />}
        {lit && <circle r={r + 5} fill="none" stroke={chrome} strokeWidth={3} opacity={0.95} />}
        {wrong && <circle r={r + 3} fill="none" stroke="#FF4A34" strokeWidth={3.5} opacity={0.95} />}
        {ordinal != null && (
          <g transform={`translate(${badgeOff} ${-badgeOff})`}>
            <circle r={badgeR} fill={chrome} />
            <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
              fontSize={badgeR * 1.05} fontWeight={800} fill={glyphCol}
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
              {ordinal}
            </text>
          </g>
        )}
      </svg>
    </motion.div>
  );
}