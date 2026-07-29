import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a single colour-discrimination grid.
 * All tiles share baseColor except the odd tile (oddColor).
 */
export default function ColorGrid({ grid, selectedIndex, feedback, onSelect }) {
  const { size, baseColor, oddColor, oddIndex } = grid;
  const total = size * size;

  return (
    <div
      className="grid gap-0.5 rounded-xl overflow-hidden shadow-2xl bg-black/30 p-1.5"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const isOdd = i === oddIndex;
        const isSelected = i === selectedIndex;
        const showCorrect = feedback !== 'none' && isOdd;
        const showWrong = feedback === 'wrong' && isSelected && !isOdd;

        return (
          <button
            key={i}
            onClick={() => onSelect?.(i)}
            disabled={feedback !== 'none'}
            className={cn(
              'aspect-square transition-all duration-200 rounded-[2px]',
              isSelected && feedback === 'none' && 'ring-2 ring-white ring-offset-1 ring-offset-black/40 z-10 scale-90',
              showCorrect && 'ring-2 ring-green-400 z-10',
              showWrong && 'ring-2 ring-red-500 z-10 animate-pulse'
            )}
            style={{ backgroundColor: isOdd ? oddColor : baseColor }}
          />
        );
      })}
    </div>
  );
}