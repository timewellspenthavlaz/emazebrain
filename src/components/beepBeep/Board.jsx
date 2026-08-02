import React from 'react';
import { motion } from 'framer-motion';
import Vehicle from './Vehicle';
import { slideRange } from '@/lib/beepBeep/engine';

const WALL_COLOR = '#3A4250';
const FRAME_COLOR = '#2A3140';
const KERB_A = '#F2C14E';
const KERB_B = '#3A4250';

export default function Board({
  board, state, px, mirror, highlight, hintMove, solved, reduceMotion,
  exitDir, onMove, onIllegalAxis, onBlockedDrag, onInteract, vehiclePalette,
}) {
  const n = board.n;
  const cell = px / n;
  const exitY = board.exitRow * cell;
  const frame = 4;

  const getRange = (idx) => slideRange(board, state, idx);

  return (
    <div style={{ position: 'relative', width: px, height: px }}>
      {/* mirrored play layer */}
      <div style={{ position: 'absolute', inset: 0, transform: mirror ? 'scaleX(-1)' : undefined }}>
        {/* lot floor */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }} />

        {/* subtle grid lines */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={px} height={px}>
          {Array.from({ length: n - 1 }).map((_, i) => (
            <g key={i} stroke="rgba(255,255,255,0.05)" strokeWidth={1}>
              <line x1={(i + 1) * cell} y1={0} x2={(i + 1) * cell} y2={px} />
              <line x1={0} y1={(i + 1) * cell} x2={px} y2={(i + 1) * cell} />
            </g>
          ))}
        </svg>

        {/* walls (hatched fixed obstacles) */}
        {board.walls.map((w, i) => (
          <div key={i} style={{
            position: 'absolute', left: w.c * cell + 2, top: w.r * cell + 2,
            width: cell - 4, height: cell - 4, borderRadius: 3,
            background: `repeating-linear-gradient(45deg, ${WALL_COLOR} 0 6px, #4A5360 6px 12px)`,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
          }} />
        ))}

        {/* vehicles */}
        {board.pieces.map((p) => (
          <Vehicle
            key={p.id} piece={p} v={state[p.id]} n={n} cell={cell} mirror={mirror}
            isTarget={p.isTarget} highlight={highlight?.has(p.id)} reduceMotion={reduceMotion}
            hintTarget={hintMove && hintMove.idx === p.id ? hintMove.to : null}
            onMove={onMove} onIllegalAxis={onIllegalAxis} onBlockedDrag={onBlockedDrag}
            onInteract={onInteract} solved={solved} exitDir={exitDir}
            palette={vehiclePalette[p.id]} getRange={getRange}
          />
        ))}

        {/* frame bars */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: px, height: frame, background: FRAME_COLOR, borderRadius: '6px 6px 0 0' }} />
        <div style={{ position: 'absolute', left: 0, bottom: 0, width: px, height: frame, background: FRAME_COLOR, borderRadius: '0 0 6px 6px' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: frame, height: px, background: FRAME_COLOR }} />
        {/* right wall split at the exit gap */}
        <div style={{ position: 'absolute', right: 0, top: 0, width: frame, height: exitY, background: FRAME_COLOR }} />
        <div style={{ position: 'absolute', right: 0, top: exitY + cell, width: frame, height: px - exitY - cell, background: FRAME_COLOR }} />

        {/* hazard kerbs flanking the gap */}
        {[[exitY - 6, 0], [exitY + cell, 1]].map(([y, k], i) => (
          <div key={i} style={{
            position: 'absolute', right: 0, top: y, width: frame, height: 6,
            background: `repeating-linear-gradient(45deg, ${KERB_A} 0 4px, ${KERB_B} 4px 8px)`,
            borderRadius: 1,
          }} />
        ))}

        {/* exit lane stub + chevrons + boom barrier (rendered to the right of the gap) */}
        <div style={{ position: 'absolute', left: px, top: exitY, width: cell * 1.6, height: cell, pointerEvents: 'none' }}>
          {/* chevrons pointing out */}
          {[0, 1, 2].map((i) => (
            <svg key={i} viewBox="0 0 24 24" style={{
              position: 'absolute', left: 4 + i * 12, top: '50%', transform: 'translateY(-50%)',
              width: cell * 0.5, height: cell * 0.5, opacity: 0.5 - i * 0.12,
            }}>
              <path d="M8 4l8 8-8 8" fill="none" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ))}
        </div>

        {/* boom barrier across the gap */}
        <motion.div
          style={{ position: 'absolute', right: -2, top: exitY, width: cell + 8, height: 8, background: '#E0503A', borderRadius: 4, transformOrigin: 'right center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
          animate={solved ? { rotate: -75, opacity: 0 } : { rotate: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}