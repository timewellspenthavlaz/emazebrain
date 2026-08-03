import React from 'react';
import { useCarsSprite, TARGET_INDEX } from './useCarsSprite';

/**
 * CarShape — renders one car from the shared SVG sprite, stretched to fill
 * its rectangle (preserveAspectRatio none). The sprite provides a landscape
 * and a pre-rotated portrait symbol per car; we pick the one matching the
 * piece's orientation. `variant` is the resolved car index (0..11); the
 * target piece uses TARGET_INDEX. A soft placeholder shows while loading.
 */
export default function CarShape({ length = 2, horiz, isTarget, variant }) {
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

  const idx = Number.isFinite(variant) ? variant : TARGET_INDEX;
  const href = `#bb-car-${idx}${horiz ? '' : '-v'}`;

  return (
    <svg viewBox={vb} preserveAspectRatio="none"
      width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
      <use href={href} width="100%" height="100%" />
    </svg>
  );
}