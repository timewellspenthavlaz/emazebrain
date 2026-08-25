import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

/**
 * Sparkline — a tiny inline score/accuracy trend for a game row.
 * Plots score (primary) with a faint accuracy overlay where available.
 */
export default function Sparkline({ data, height = 36 }) {
  const points = useMemo(() => data.map((d) => ({ s: d.score, a: d.acc })), [data]);
  const hasAcc = points.some((p) => p.a != null && !isNaN(p.a));
  return (
    <div className="h-9 w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line
            type="monotone"
            dataKey="s"
            stroke="hsl(168 65% 35%)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {hasAcc && (
            <Line
              type="monotone"
              dataKey="a"
              stroke="hsl(200 70% 55%)"
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}