import React from 'react';
import HexTile from './HexTile';

const W = Math.sqrt(3); // hex width at R = 1
const H = 2; // hex height at R = 1

/**
 * HexBoard — renders the hex map from a built board. Each hex is an
 * absolutely-positioned HexTile; the whole board is centred on x = 0 in
 * geometry coords, so we shift by the board's top-left to localise tiles.
 */
export default function HexBoard({
  board, pack, faceUpIds, claimedIds, wrongHexId, revealAll,
  selectedId, onTap, scale, reduceMotion, backColor, wave,
}) {
  const cells = board.cells;
  const xs = cells.map((c) => c.cx);
  const ys = cells.map((c) => c.y);
  const left = Math.min(...xs) - W / 2;
  const top = Math.min(...ys) - H / 2;
  const boardW = Math.max(...xs) + W / 2 - left;
  const boardH = Math.max(...ys) + H / 2 - top;
  const wpx = W * scale;
  const hpx = H * scale;

  return (
    <div
      className="relative mx-auto"
      style={{ width: boardW * scale, height: boardH * scale, touchAction: 'none' }}
    >
      {cells.map((c) => {
        const id = c.id;
        const picIdx = board.assignment[id];
        const faceUp = revealAll || faceUpIds.has(id) || wrongHexId === id;
        const claimed = claimedIds.has(id);
        const delay = wave ? c.r * 26 : 0;
        return (
          <HexTile
            key={id}
            left={(c.cx - W / 2 - left) * scale}
            top={(c.y - H / 2 - top) * scale}
            w={wpx}
            h={hpx}
            picUrl={picIdx != null && pack[picIdx] ? pack[picIdx].url : null}
            faceUp={faceUp}
            claimed={claimed}
            selected={selectedId === id}
            backColor={backColor}
            delay={delay}
            reduceMotion={reduceMotion}
            onTap={onTap ? () => onTap(id) : undefined}
          />
        );
      })}
    </div>
  );
}