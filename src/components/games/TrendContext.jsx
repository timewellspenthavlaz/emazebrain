import React from 'react';

// Context that lets any MetricBox inside a session detail card open a 30-day
// trend for its metric. Provided per SessionDetailCard in CompareDrawer.
export const TrendContext = React.createContext(null);

export function useTrend() {
  return React.useContext(TrendContext);
}