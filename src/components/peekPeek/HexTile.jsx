import React from 'react';
import Image from '@/components/ui/image';

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/**
 * HexTile — a single pointy-top hex with a CSS 3D flip (rotateY + backface
 * visibility). Face-down shows a themed back; face-up shows the concealed
 * picture. Used for both the map hexes and the tray target hexes.
 */
export default function HexTile({
  left, top, w, h, picUrl, faceUp, claimed, selected, dim,
  backColor, onTap, delay = 0, reduceMotion = false, mark,
}) {
  const flipped = !!faceUp;
  return (
    <div className="absolute select-none" style={{ left, top, width: w, height: h }}>
      <div
        onPointerDown={(e) => {
          if (!onTap) return;
          e.preventDefault();
          onTap();
        }}
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: reduceMotion ? 'none' : 'transform 0.4s ease',
          transitionDelay: reduceMotion ? '0ms' : `${delay}ms`,
          cursor: claimed || !onTap ? 'default' : 'pointer',
          touchAction: 'none',
        }}
      >
        {/* face-down back */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            clipPath: HEX_CLIP,
            background: backColor || 'linear-gradient(145deg,#3a4252,#222831)',
            boxShadow: 'inset 0 3px 8px rgba(0,0,0,.35)',
          }}
        >
          <span style={{ fontSize: Math.max(10, h * 0.2), opacity: 0.22, color: '#fff' }}>◆</span>
        </div>
        {/* face-up front (picture) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            clipPath: HEX_CLIP,
            background: '#f8fafc',
            boxShadow: claimed
              ? '0 0 0 2px #34d399, 0 4px 10px rgba(16,185,129,.35)'
              : selected
              ? '0 0 0 2px #22d3ee, 0 4px 10px rgba(34,211,238,.35)'
              : 'inset 0 0 0 1px rgba(0,0,0,.08)',
          }}
        >
          {picUrl ? (
            <Image
              src={picUrl}
              fittingType="fill"
              className="w-full h-full"
              style={{ objectFit: 'cover', filter: dim ? 'grayscale(0.4) brightness(1.05)' : undefined }}
              draggable={false}
            />
          ) : null}
          {mark && (
            <span className="absolute top-0.5 right-0.5 text-[10px] px-1 bg-emerald-500 text-white rounded-bl font-bold">
              {mark}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}