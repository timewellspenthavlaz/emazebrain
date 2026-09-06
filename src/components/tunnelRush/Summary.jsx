import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowLeft, Activity } from 'lucide-react';

function fmtMs(v) { return v == null || isNaN(v) ? '—' : `${Math.round(v)}ms`; }

/**
 * Summary — post-session overlay: the four headline clinical metrics in a
 * grid, secondary stats, and Play Again / Save & Return actions.
 */
export default function Summary({ summary, colors, patientId }) {
  const glass = {
    background: 'rgba(18,24,38,0.78)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: `1px solid ${colors.accent}33`,
  };
  const cell = (label, value) => (
    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: colors.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: colors.text, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: colors.page, color: colors.text }}>
      <div className="max-w-lg w-full rounded-2xl p-6 sm:p-8" style={glass}>
        <div className="flex items-center gap-3 mb-5">
          <Activity className="w-6 h-6" style={{ color: colors.accent }} />
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Session Summary
          </h2>
        </div>

        {/* Headline 4-grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {cell('Accuracy', `${Math.round((summary.accuracy || 0) * 100)}%`)}
          {cell('Median RT', fmtMs(summary.medianReactionMs))}
          {cell('Gates Cleared', summary.dodges ?? 0)}
          {cell('Total Rotations', summary.rotations ?? 0)}
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] uppercase" style={{ color: colors.muted }}>Score</p>
            <p className="text-base font-bold">{Math.round(summary.score ?? 0)}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] uppercase" style={{ color: colors.muted }}>Hits</p>
            <p className="text-base font-bold" style={{ color: colors.hit }}>{summary.hits ?? 0}</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] uppercase" style={{ color: colors.muted }}>Level</p>
            <p className="text-base font-bold">{summary.levelReached ?? 1}</p>
          </div>
        </div>

        <p className="text-xs mb-6" style={{ color: colors.muted }}>
          {summary.gates ?? 0} gates encountered · avg RT {fmtMs(summary.avgReactionMs)} ·
          ended: {summary.endReason || 'completed'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => window.location.reload()}
            className="flex-1 font-semibold"
            style={{ background: colors.accent, color: colors.page === '#F1F5F9' ? '#FFFFFF' : '#090D16' }}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Play Again
          </Button>
          <Link to={patientId ? `/patients/${patientId}` : '/games'} className="flex-1">
            <Button variant="outline" className="w-full font-semibold"
              style={{ color: colors.text, borderColor: `${colors.muted}55`, background: 'transparent' }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Save & Return to Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}