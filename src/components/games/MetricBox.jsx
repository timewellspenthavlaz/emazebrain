import React, { useContext } from 'react';
import { TrendingUp } from 'lucide-react';
import { TrendContext } from './TrendContext';
import { getMetricByLabel } from './metricRegistry';

/**
 * Shared MetricBox — drop-in replacement for the local MetricBox in each
 * session card. Same look, but if the metric label is trendable (found in the
 * registry for the current game), the box becomes a button that opens a 30-day
 * trend of that measurement. Renders as a plain div when no trend context or
 * no registry match is available.
 */
export default function MetricBox({ icon: Icon, label, value, color = 'text-foreground' }) {
  const ctx = useContext(TrendContext);
  const meta = ctx?.gameId ? getMetricByLabel(ctx.gameId, label) : null;
  const clickable = !!(meta && ctx?.onMetricClick);

  const content = (
    <>
      {Icon && <Icon className={`w-4 h-4 ${color} shrink-0`} />}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate flex items-center gap-1">
          {label}
          {clickable && <TrendingUp className="w-3 h-3 text-primary/70 shrink-0" />}
        </p>
        <p className={`text-sm font-semibold ${color}`}>{value}</p>
      </div>
    </>
  );

  if (!clickable) {
    return <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => ctx.onMetricClick(meta.key, label, ctx.session)}
      title={`View 30-day trend for ${label}`}
      className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 text-left hover:bg-primary/5 hover:ring-2 hover:ring-primary/40 transition cursor-pointer w-full"
    >
      {content}
    </button>
  );
}