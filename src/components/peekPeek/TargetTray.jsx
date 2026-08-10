import React from 'react';
import HexTile from './HexTile';

const W = Math.sqrt(3);
const H = 2;

/**
 * TargetTray — the row of target hexes below the map. The current target
 * flips up to reveal its picture; completed targets show a check. Future
 * targets stay face-down until reached.
 */
export default function TargetTray({
  board, pack, currentIndex, scale, reduceMotion, backColor,
}) {
  const tray = board.tray;
  const wpx = W * scale;
  const hpx = H * scale;
  return (
    <div className="flex items-end justify-center" style={{ gap: wpx * 0.18 }}>
      {tray.map((picIdx, t) => {
        const done = t < currentIndex;
        const isCurrent = t === currentIndex;
        const faceUp = isCurrent || done;
        return (
          <div key={t} className="relative" style={{ width: wpx, height: hpx }}>
            <HexTile
              left={0}
              top={0}
              w={wpx}
              h={hpx}
              picUrl={faceUp && pack[picIdx] ? pack[picIdx].url : null}
              faceUp={faceUp}
              claimed={done}
              backColor={backColor}
              reduceMotion={reduceMotion}
              mark={done ? '✓' : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}