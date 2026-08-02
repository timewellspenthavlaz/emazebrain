import React from 'react';
import { useCarsSprite, TARGET_VARIANT } from './useCarsSprite';

/**
 * CarShape — renders one of the 3D cars from the shared SVG sprite.
 * The sprite provides a landscape and a pre-rotated portrait symbol per
 * car; we pick the one matching the piece's orientation and size the svg
 * viewBox to the piece (length × 1 cell) so the artwork fills the slot's
 * short side and extends along its length, undistorted and centered.
 *
 * The rescue / target piece always uses the dedicated target car
 * (green w/ red accents); blockers cycle through the remaining three.
 * While the sprite loads we show a soft placeholder silhouette.
 */
export default function CarShape({ length = 2, horiz, variant, isTarget }) {
  const ready = useCarsSprite();
  const L = Math.max(1, length) * 100;
  const vb = horiz ? `0 0 ${L} 100` : `0 0 100 ${L}`;

  if (!ready) {
    return (
      <svg viewBox={vb} preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block' }}>
        <rect x="6" y="22" width={L - 12} height="56" rx="16"
          fill={isTarget ? '#3AB72C' : '#8A93A0'} opacity="0.55" />
      </svg>
    );
  }

  const v = Number.isFinite(variant) ? variant : 0;
  const idx = isTarget ? TARGET_VARIANT : v % TARGET_VARIANT; // blockers cycle 0..2
  const href = `#bb-car-${idx}${horiz ? '' : '-v'}`;

  return (
    <svg viewBox={vb} preserveAspectRatio="xMidYMid meet"
      width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <use href={href} />
    </svg>
  );
}