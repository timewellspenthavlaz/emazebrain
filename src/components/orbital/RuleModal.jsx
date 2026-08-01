import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Ban, HelpCircle } from 'lucide-react';
import { tokenFill, relLuminance } from '@/lib/orbitalOrder/config';

/* Color dot used in the filter row. */
function ColorDot({ token, neon, chrome }) {
  const fill = tokenFill(token, neon);
  return (
    <svg width={22} height={22} viewBox="-12 -12 24 24" className="shrink-0">
      <circle r={9} fill={fill} stroke={chrome} strokeWidth={1.5} />
    </svg>
  );
}

function Row({ icon: Icon, label, value, chrome, colorCue, neon, rowBg, rowFg }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: rowBg }}>
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: rowFg }}>
        <Icon className="w-5 h-5" style={{ color: chrome }} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wide opacity-50">{label}</p>
        <p className="text-sm font-semibold capitalize">{value}</p>
      </div>
      {colorCue && <ColorDot token={colorCue} neon={neon} chrome={chrome} />}
    </div>
  );
}

function RuleCard({ labels, rule, chrome, neon, peeking, glassBg, rowBg, rowFg }) {
  const skipToken = rule?.skip;
  const isAscending = rule?.ordering === 'ASCENDING';
  const SortIcon = isAscending ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-3xl p-5 w-[270px] shadow-2xl"
      style={{ background: glassBg, backdropFilter: 'blur(20px)', color: chrome }}>
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] opacity-50 mb-4">Goal</p>
      <div className="space-y-2.5">
        <Row icon={SortIcon} label="Sort" value={labels.ordering}
          chrome={chrome} rowBg={rowBg} rowFg={rowFg} />
        <Row icon={Ban} label="Skip"
          value={skipToken ? skipToken.charAt(0) + skipToken.slice(1).toLowerCase() : ''}
          chrome={chrome} colorCue={skipToken} neon={neon} rowBg={rowBg} rowFg={rowFg} />
      </div>
      <p className="text-center text-xs opacity-50 mt-4">{peeking ? 'Tap to close' : 'Tap to begin'}</p>
    </div>
  );
}

/**
 * RuleModal — central structured "Goal" card during the reveal phase, then
 * flies to the top-left corner and becomes a "?" pill the user can tap to peek.
 * `expanded` drives the center card; when false the collapsed pill is shown.
 */
export default function RuleModal({ expanded, labels, rule, chrome, neon, width, height, onDismiss, onOpen, peeking }) {
  const cardDark = relLuminance(chrome) > 140;
  const glassBg = cardDark ? 'rgba(12,14,20,0.92)' : 'rgba(255,255,255,0.94)';
  const rowBg = cardDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const rowFg = cardDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';

  // fly-to-corner vector (relative to the centered card position)
  const flyX = width ? -(width / 2) + 48 : -240;
  const flyY = height ? -(height / 2) + 48 : -200;

  return (
    <div className="absolute inset-0 z-40" style={{ pointerEvents: 'none' }}>
      {/* Dim backdrop — reveal only, not during peek */}
      <AnimatePresence>
        {expanded && !peeking && (
          <motion.div key="backdrop" className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.55)', pointerEvents: 'auto' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} onClick={onDismiss} />
        )}
      </AnimatePresence>

      {/* Center card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatePresence>
          {expanded && (
            <motion.div key="card" style={{ pointerEvents: 'auto' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.18, opacity: 0, x: flyX, y: flyY }}
              transition={{ type: 'spring', stiffness: 240, damping: 26 }}
              onClick={onDismiss}>
              <RuleCard labels={labels} rule={rule} chrome={chrome} neon={neon}
                peeking={peeking} glassBg={glassBg} rowBg={rowBg} rowFg={rowFg} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapsed "?" pill (top-left corner) */}
      <AnimatePresence>
        {!expanded && (
          <motion.button key="pill" onClick={onOpen}
            className="absolute top-4 left-4 rounded-full w-11 h-11 flex items-center justify-center shadow-lg"
            style={{
              pointerEvents: 'auto',
              background: glassBg,
              backdropFilter: 'blur(14px)',
              border: `1px solid ${cardDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)'}`,
              color: chrome,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { delay: 0.14, type: 'spring', stiffness: 300, damping: 20 } }}
            exit={{ scale: 0, opacity: 0 }}
            aria-label="Show rule">
            <HelpCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}