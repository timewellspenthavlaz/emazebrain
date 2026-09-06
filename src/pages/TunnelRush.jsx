import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import PlayField from '@/components/tunnelRush/PlayField';
import Hud from '@/components/tunnelRush/Hud';
import InstructionsModal from '@/components/tunnelRush/InstructionsModal';
import Summary from '@/components/tunnelRush/Summary';
import { TunnelEngine } from '@/lib/tunnelRush/engine';
import { TunnelRushMetrics } from '@/lib/tunnelRush/metrics';
import { parseParams, resolveTheme, pageBackground, glyphPool } from '@/lib/tunnelRush/config';

export default function TunnelRush() {
  const [searchParams] = useSearchParams();
  const cfg = useRef(parseParams(searchParams)).current;
  const colors = useMemo(() => resolveTheme(cfg), [cfg]);
  const pool = useMemo(() => glyphPool(cfg), [cfg]);
  const engine = useRef(null);
  const metrics = useRef(null);

  // ---- state ----
  const [phase, setPhase] = useState('instructions'); // instructions | ready | playing | summary
  const [frame, setFrame] = useState({ angle: 0, scroll: 0, obstacles: [] });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(cfg.level);
  const [timeLeft, setTimeLeft] = useState(cfg.timeToPlay);
  const [pill, setPill] = useState(null);
  const [hitFlash, setHitFlash] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [summary, setSummary] = useState(null);

  // ---- refs (timing-critical) ----
  const phaseRef = useRef('instructions');
  const startedRef = useRef(false);
  const sentRef = useRef(false);
  const visualAngleRef = useRef(0);
  const timeUpRef = useRef(false);
  const pillTimeoutRef = useRef(null);
  const shakeTimeoutRef = useRef(null);
  const audioRef = useRef(null);
  const touchXRef = useRef(null);
  const lastScrollRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ---- init engine + metrics; abandon-safe unmount ----
  useEffect(() => {
    engine.current = new TunnelEngine({
      lanes: cfg.lanes, difficulty: cfg.difficulty, level: cfg.level,
      direction: cfg.direction, spinSpeed: cfg.spinSpeed,
      progressive: cfg.progressive, objectPool: pool,
    });
    metrics.current = new TunnelRushMetrics(cfg);
    metrics.current.startSession();
    if (cfg.autoStart) {
      phaseRef.current = 'ready';
      setPhase('ready');
    }
    return () => {
      if (metrics.current && !sentRef.current && phaseRef.current !== 'summary') {
        sentRef.current = true;
        metrics.current.endSession('ABANDONED');
        const payload = metrics.current.buildPayload('abandoned', 'ABANDONED');
        metrics.current.sendResults(payload);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- WebAudio (off by default; unlocked on first interaction) ----
  const ping = useCallback((freq, dur = 0.09, type = 'sine') => {
    if (!cfg.sound) return;
    try {
      audioRef.current ||= new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.stop(ctx.currentTime + dur);
    } catch (e) { /* audio unavailable */ }
  }, [cfg.sound]);

  const showPill = useCallback((correct, message) => {
    setPill({ correct, message, id: Date.now() });
    if (pillTimeoutRef.current) clearTimeout(pillTimeoutRef.current);
    pillTimeoutRef.current = setTimeout(() => setPill(null), 900);
  }, []);

  // ---- session end ----
  const endSession = useCallback((endReason) => {
    if (sentRef.current) return;
    sentRef.current = true;
    const m = metrics.current;
    m.endSession(endReason);
    const status = endReason === 'ABANDONED' ? 'abandoned' : (endReason === 'hitLimit' ? 'game_over' : 'completed');
    const payload = m.buildPayload(status, endReason);
    m.sendResults(payload);
    setSummary({ ...payload.metrics.summary, endReason, score: payload.metrics.score });
    phaseRef.current = 'summary';
    setPhase('summary');
  }, []);

  // ---- obstacle resolution ----
  // Hits never end the run — the session is driven purely by the timer.
  // A hit only gives unmistakable feedback: crimson flash + screen shake +
  // a 500ms slowdown (engine-side).
  const handlePassed = useCallback((events) => {
    const m = metrics.current;
    for (const ev of events) {
      m.recordObstacle(ev);
      if (ev.hit) {
        ping(130, 0.14, 'sawtooth');
        showPill(false, 'Hit!');
        setHitFlash((n) => n + 1);
        setShaking(true);
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => setShaking(false), 500);
      } else {
        ping(520, 0.06);
        showPill(true, `+${10 + Math.min(m.streak, 10) * 2}`);
      }
    }
    setScore(Math.round(m.score));
  }, [ping, showPill]);

  // ---- main loop ----
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'playing') return;
    let raf;
    let last = performance.now();
    const loop = (now) => {
      if (phaseRef.current === 'summary') return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const eng = engine.current;
      if (eng) {
        if (startedRef.current) {
          const { passed, levelUp } = eng.update(dt);
          if (passed.length) handlePassed(passed);
          if (levelUp) {
            metrics.current.recordLevelUp(levelUp);
            setLevel(levelUp);
            showPill(true, `Level ${levelUp}!`);
            ping(660, 0.1);
            setTimeout(() => ping(880, 0.12), 110);
          }
          const travelled = eng.scroll - lastScrollRef.current;
          lastScrollRef.current = eng.scroll;
          metrics.current.addDistance(travelled);
          metrics.current.setRotations(eng.rotations);
        }
        // ease the visual angle toward the logical angle (rotation + spin)
        visualAngleRef.current += (eng.angle - visualAngleRef.current) * Math.min(1, dt * 12);
        setFrame({ angle: visualAngleRef.current, scroll: eng.scroll, obstacles: eng.obstacles });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, handlePassed, showPill, ping]);

  // ---- global timer: starts on the first rotation (first interaction) ----
  useEffect(() => {
    if (cfg.timeToPlay <= 0 || phase !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { timeUpRef.current = true; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, cfg.timeToPlay]);

  useEffect(() => {
    if (timeUpRef.current) endSession('timeUp');
  }, [timeLeft, endSession]);

  // ---- rotation input ----
  const rotate = useCallback((dir) => {
    if (phaseRef.current !== 'ready' && phaseRef.current !== 'playing') return;
    engine.current?.rotate(dir);
    metrics.current?.recordRotation(dir);
    if (!startedRef.current) {
      startedRef.current = true;
      phaseRef.current = 'playing';
      setPhase('playing');
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); rotate(-1); }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); rotate(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rotate]);

  const onTouchStart = (e) => { touchXRef.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    const x0 = touchXRef.current;
    touchXRef.current = null;
    if (x0 == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? x0) - x0;
    if (Math.abs(dx) > 40) rotate(dx > 0 ? 1 : -1);
  };

  // ---- summary screen ----
  if (phase === 'summary' && summary) {
    return <Summary summary={summary} colors={colors} patientId={cfg.patientId} />;
  }

  const glassPill = (correct) => ({
    background: 'rgba(18,24,38,0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: `1px solid ${correct ? colors.accent : colors.hit}`,
    color: correct ? colors.accent : colors.hit,
  });
  const controlBtn = {
    background: 'rgba(18,24,38,0.6)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${colors.accent}30`,
    color: colors.accent,
  };

  return (
    <div className={`h-screen overflow-hidden relative select-none ${shaking ? 'animate-shake' : ''}`}
      style={{ background: pageBackground(cfg, colors), color: colors.text }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}>
      {/* Stage */}
      <PlayField
        angle={frame.angle}
        scroll={frame.scroll}
        obstacles={frame.obstacles}
        lanes={cfg.lanes}
        colors={colors}
        scene={cfg.scene}
        objectOrientation={cfg.objectOrientation}
        started={startedRef.current}
        hitFlash={hitFlash}
        reduceMotion={cfg.reduceMotion}
      />

      <Hud
        score={score}
        level={level}
        timeLeft={timeLeft}
        showTime={cfg.timeToPlay > 0}
        timerPosition={cfg.timerPosition}
        showScore={cfg.showScore}
        colors={colors}
        started={startedRef.current}
        demo={!cfg.patientId}
      />

      {/* Instructions / reveal modal */}
      {phase === 'instructions' && (
        <InstructionsModal lang={cfg.lang} colors={colors} onStart={() => {
          phaseRef.current = 'ready';
          setPhase('ready');
        }} />
      )}

      {/* Launch hint (waiting for the first interaction) */}
      {phase === 'ready' && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-30 pointer-events-none">
          <div className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium"
            style={{ background: 'rgba(18,24,38,0.7)', backdropFilter: 'blur(10px)', border: `1px solid ${colors.accent}44`, color: colors.text }}>
            Swipe / tap the arrows to launch
          </div>
        </div>
      )}

      {/* Feedback pill */}
      {pill && (
        <div key={pill.id} className="absolute left-1/2 -translate-x-1/2 bottom-16 z-30 animate-fade-in pointer-events-none">
          <div className="px-4 py-2 rounded-full text-sm font-semibold"
            style={glassPill(pill.correct)}>
            {pill.message}
          </div>
        </div>
      )}

      {/* On-screen lane rotation arrows — thumb zones */}
      {(phase === 'ready' || phase === 'playing') && (
        <>
          <button type="button" aria-label="Rotate left"
            className="absolute bottom-5 left-4 z-30 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition"
            style={controlBtn}
            onClick={() => rotate(-1)}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button type="button" aria-label="Rotate right"
            className="absolute bottom-5 right-4 z-30 w-14 h-14 rounded-2xl flex items-center justify-center active:scale-95 transition"
            style={controlBtn}
            onClick={() => rotate(1)}>
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Exit */}
      <Link to="/games" className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30">
        <Button variant="ghost" size="sm" style={{ color: `${colors.muted}cc` }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Exit
        </Button>
      </Link>
    </div>
  );
}