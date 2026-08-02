import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';


/**
 * Vehicle — pointer-driven slider. Supports two input models:
 *  - drag: move to release point snapped to nearest cell, clamped to first
 *    blocker, with rubber-band resistance past the limit.
 *  - tap: send the vehicle as far as it legally can in the tapped direction.
 * Dragging across the vehicle's own axis produces resistance (no move) and
 * one increment of illegal_axis_drags.
 */
export default function Vehicle({
  piece, v, n, cell, mirror, isTarget, highlight, hintTarget, reduceMotion,
  onMove, onIllegalAxis, onBlockedDrag, onInteract, solved, exitDir, palette,
  getRange,
}) {
  const dragRef = useRef(null);
  const [dragV, setDragV] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [pulse, setPulse] = useState(false);

  // slow hero pulse for the target car
  useEffect(() => {
    if (!isTarget || reduceMotion || solved) return;
    let on = true;
    const tick = () => {
      if (!on) return;
      setPulse((p) => !p);
      setTimeout(tick, 1000);
    };
    setTimeout(tick, 1000);
    return () => { on = false; };
  }, [isTarget, reduceMotion, solved]);

  const horiz = piece.horiz;
  const len = piece.len;
  const left = horiz ? v * cell : piece.fixed * cell;
  const top = horiz ? piece.fixed * cell : v * cell;
  const width = horiz ? len * cell : cell;
  const height = horiz ? cell : len * cell;

  // live visual position while dragging
  const liveV = dragV ?? v;
  const liveLeft = horiz ? liveV * cell : piece.fixed * cell;
  const liveTop = horiz ? piece.fixed * cell : liveV * cell;

  function onPointerDown(e) {
    if (solved) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startV: v, pointerId: e.pointerId,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      illegal: false, moved: false, axisDelta: 0, perpDelta: 0,
    };
    onInteract(isTarget);
    setDragging(true);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const primary = horiz ? dx : dy;
    const perp = horiz ? dy : dx;
    // illegal axis drag
    if (Math.abs(perp) > Math.abs(primary) + 6 && Math.abs(perp) > 14) {
      if (!d.illegal) { d.illegal = true; onIllegalAxis(); }
      return;
    }
    if (d.illegal) return;
    const cellDelta = primary / cell;
    const modelDelta = mirror ? -cellDelta : cellDelta;
    d.axisDelta = modelDelta;
    d.moved = true;
    // clamp to slide range (rubber band: clamp hard at limit)
    const range = getRange(piece.id);
    let desired = d.startV + modelDelta;
    desired = Math.max(range.min, Math.min(range.max, desired));
    setDragV(desired);
  }

  function onPointerUp(e) {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    setDragV(null);
    setDragging(false);
    if (d.illegal) return; // resisted; nothing committed
    const rounded = d.moved ? Math.round(d.startV + d.axisDelta) : null;
    if (d.moved && rounded !== d.startV) {
      onMove(piece.id, rounded);
      return;
    }
    if (!d.moved) {
      // tap → send as far as legally can in the tapped direction
      const screenDir = horiz ? Math.sign(e.clientX - d.centerX) : Math.sign(e.clientY - d.centerY);
      if (screenDir === 0) return;
      const modelDir = mirror ? -screenDir : screenDir;
      const range = getRange(piece.id);
      const target = modelDir > 0 ? range.max : range.min;
      if (target !== d.startV) onMove(piece.id, target);
      else onBlockedDrag();
      return;
    }
    // attempted axis move but blocked at the limit
    if (Math.abs(d.axisDelta) > 0.4) onBlockedDrag();
  }

  const fill = isTarget ? '#E0503A' : palette;
  const stroke = isTarget ? '#FFFFFF' : 'rgba(255,255,255,0.18)';
  const shadow = '0 3px 8px rgba(0,0,0,0.35)';

  return (
    <motion.div
      style={{ position: 'absolute', left: liveLeft, top: liveTop, width, height, zIndex: isTarget ? 6 : 5, transition: dragging ? 'none' : 'left 0.16s ease-out, top 0.16s ease-out' }}
      animate={solved && isTarget ? { x: exitDir * cell * (n - v + 2), opacity: 0 } : { x: 0, opacity: 1 }}
      transition={solved && isTarget ? { duration: 0.52, ease: 'easeIn' } : { duration: 0.18, ease: 'easeOut' }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null; setDragV(null); setDragging(false); }}
        style={{
          position: 'absolute', inset: 2, borderRadius: Math.max(4, cell * 0.12),
          background: fill, boxShadow: shadow,
          border: isTarget
            ? `2px solid ${stroke}${pulse ? '' : '88'}`
            : `1px solid ${stroke}`,
          touchAction: 'none', cursor: 'grab',
          outline: highlight ? '2px solid #5EEAD4' : 'none',
          outlineOffset: '2px',
        }}
      >
        {/* roof star on target */}
        {isTarget && (
          <svg viewBox="0 0 24 24" style={{ position: 'absolute', inset: 0, margin: 'auto', width: '52%', height: '52%', opacity: 0.95 }}>
            <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.2 20.9l1.6-6.8L1.6 8.9l6.9-.6z" fill="#fff" />
          </svg>
        )}
        {/* windscreen hint */}
        <div style={{ position: 'absolute', top: '15%', left: '12%', right: '12%', height: '24%', borderRadius: '3px', background: 'rgba(255,255,255,0.22)' }} />
        {/* hint ghost destination */}
        {hintTarget != null && hintTarget !== v && (
          <div style={{
            position: 'absolute', borderRadius: Math.max(4, cell * 0.12),
            left: horiz ? (hintTarget - v) * cell - 2 : -2,
            top: horiz ? -2 : (hintTarget - v) * cell - 2,
            width: width - 0, height: height - 0,
            border: '2px dashed #5EEAD4', background: 'rgba(94,234,212,0.12)', pointerEvents: 'none',
          }} />
        )}
      </div>
    </motion.div>
  );
}