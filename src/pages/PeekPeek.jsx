import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { parseParams, computeAward } from '@/lib/peekPeek/config';
import { packForLevel, getPack } from '@/lib/peekPeek/packs';
import { buildLevel, buildReplacement } from '@/lib/peekPeek/engine';
import { PeekPeekMetrics } from '@/lib/peekPeek/metrics';
import { resolveBg } from '@/lib/beepBeep/colors';

import HexBoard from '@/components/peekPeek/HexBoard';
import TargetTray from '@/components/peekPeek/TargetTray';
import Hud from '@/components/peekPeek/Hud';
import Results from '@/components/peekPeek/Results';
import CountdownTimer from '@/components/games/CountdownTimer';

const W = Math.sqrt(3);
const H = 2;

function boardMetrics(board) {
  const xs = board.cells.map((c) => c.cx);
  const ys = board.cells.map((c) => c.y);
  const bw = Math.max(...xs) + W / 2 - (Math.min(...xs) - W / 2);
  const bh = Math.max(...ys) + H / 2 - (Math.min(...ys) - H / 2);
  const maxAbs = Math.max(0.0001, ...xs.map((v) => Math.abs(v)));
  return { bw, bh, maxAbs };
}

const BACK_COLORS = {
  cold: 'linear-gradient(145deg,#1e3a5f,#0b1a2e)',
  warm: 'linear-gradient(145deg,#5a3a1e,#2e190b)',
  neutral: 'linear-gradient(145deg,#3a4252,#222831)',
};

export default function PeekPeek() {
  const [searchParams] = useSearchParams();
  const cfg = useMemo(() => parseParams(searchParams), [searchParams]);
  const bg = useMemo(() => resolveBg(cfg.bg), [cfg.bg]);
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sessionId = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pp-${Date.now()}`),
    []
  );
  const seed = `${cfg.patientId || 'anon'}:${sessionId}`;

  const [phase, setPhase] = useState('onboarding');
  const [board, setBoard] = useState(null);
  const [pack, setPack] = useState([]);
  const [level, setLevel] = useState(cfg.level);
  const [lives, setLives] = useState(cfg.lives);
  const [hearts, setHearts] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [faceUpIds, setFaceUpIds] = useState(new Set());
  const [claimedIds, setClaimedIds] = useState(new Set());
  const [wrongHexId, setWrongHexId] = useState(null);
  const [revealAll, setRevealAll] = useState(false);
  const [wave, setWave] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [studyLeft, setStudyLeft] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.time_to_play);
  const [timerStarted, setTimerStarted] = useState(false);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);
  const [scale, setScale] = useState(40);

  const metricsRef = useRef(null);
  const sentRef = useRef(false);
  const phaseRef = useRef('onboarding');
  const levelRef = useRef(cfg.level);
  const livesRef = useRef(cfg.lives);
  const heartsRef = useRef(0);
  const targetIndexRef = useRef(0);
  const foundCopiesRef = useRef(0);
  const boardRef = useRef(null);
  const attemptsRef = useRef(1);
  const lastTapRef = useRef(0);
  const reRevealRef = useRef(false);
  const reRevealTimer = useRef(null);
  const maxAbsRef = useRef(1);
  const levelStartRef = useRef(0);
  const areaRef = useRef(null);
  const sessionIdRef = useRef(sessionId);
  const streakRef = useRef(0);
  const studyTickRef = useRef(null);
  const transitionTimerRef = useRef([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { heartsRef.current = hearts; }, [hearts]);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  const unlimited = cfg.lives === 0;
  const backColor = BACK_COLORS[cfg.paletteBand] || BACK_COLORS.neutral;
  const cdType = cfg.countdown_timer;

  // ---- init metrics ----
  useEffect(() => {
    metricsRef.current = new PeekPeekMetrics(cfg, bg, sessionIdRef.current);
    return () => {
      if (metricsRef.current && !sentRef.current && phaseRef.current !== 'onboarding' && phaseRef.current !== 'results') {
        sentRef.current = true;
        metricsRef.current.flushPartialLevel('abandoned');
        const payload = metricsRef.current.buildPayload('abandoned', levelRef.current, cfg.lives === 0 ? null : livesRef.current);
        metricsRef.current.sendResults(payload);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- abandoned on tab hide ----
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (sentRef.current || phaseRef.current === 'onboarding' || phaseRef.current === 'results') return;
      sentRef.current = true;
      metricsRef.current?.flushPartialLevel('abandoned');
      const payload = metricsRef.current?.buildPayload('abandoned', levelRef.current, cfg.lives === 0 ? null : livesRef.current);
      try { navigator.sendBeacon?.(cfg.callbackUrl, JSON.stringify(payload)); } catch (e) { /* ignore */ }
      metricsRef.current?.sendResults(payload);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- session timer ----
  useEffect(() => {
    if (cfg.time_to_play <= 0 || !timerStarted) return;
    const id = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(id);
          endSession('completed', 'timer');
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStarted, cfg.time_to_play]);

  // ---- responsive board sizing ----
  useEffect(() => {
    const el = areaRef.current;
    if (!el || !board) return;
    const update = () => {
      const { bw, bh } = boardMetrics(board);
      const w = el.clientWidth - 12;
      const h = el.clientHeight - 12;
      const s = Math.max(22, Math.min(78, Math.min(w / bw, h / bh)));
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [board]);

  // ---- level / round orchestration ----
  const beginStudy = useCallback((b) => {
    const all = new Set(b.cells.map((c) => c.id));
    setPhase('study');
    phaseRef.current = 'study';
    setWave(true);
    setFaceUpIds(all);
    let left = b.studySeconds;
    setStudyLeft(left);
    if (studyTickRef.current) clearInterval(studyTickRef.current);
    studyTickRef.current = setInterval(() => {
      left -= 0.1;
      setStudyLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(studyTickRef.current);
        studyTickRef.current = null;
        setFaceUpIds(new Set());
        const t = setTimeout(() => {
          if (sentRef.current) return;
          setWave(false);
          setPhase('hunting');
          phaseRef.current = 'hunting';
          startRound(0, b);
        }, 550);
        transitionTimerRef.current.push(t);
      }
    }, 100);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRound = useCallback((t, b) => {
    const bd = b || boardRef.current;
    const pic = bd.tray[t];
    const copies = bd.partition[pic];
    targetIndexRef.current = t;
    foundCopiesRef.current = 0;
    setTargetIndex(t);
    metricsRef.current?.startRound(pic, copies);
  }, []);

  const startLevel = useCallback((lvl, isRetry) => {
    const d = cfg.difficulty_level;
    const pSize = getPack(packForLevel(cfg.pack, lvl)).length;
    let b;
    if (isRetry) {
      attemptsRef.current += 1;
      b = buildReplacement(lvl, d, pSize, cfg.orientation, seed, attemptsRef.current);
    } else {
      attemptsRef.current = 1;
      b = buildLevel(lvl, d, pSize, cfg.orientation, seed);
    }
    b.studySeconds = cfg.study_time || 3;
    boardRef.current = b;
    setBoard(b);
    const pn = packForLevel(cfg.pack, lvl);
    setPack(getPack(pn));
    const m = boardMetrics(b);
    maxAbsRef.current = m.maxAbs;
    setHearts(b.heartBudget);
    heartsRef.current = b.heartBudget;
    setFaceUpIds(new Set());
    setClaimedIds(new Set());
    setWrongHexId(null);
    setRevealAll(false);
    setWave(false);
    setSelectedId(b.cells[0]?.id || null);
    setTargetIndex(0);
    targetIndexRef.current = 0;
    foundCopiesRef.current = 0;
    levelStartRef.current = Date.now();
    metricsRef.current?.startLevel(
      {
        level: lvl,
        boardId: b.boardId,
        T: b.T,
        K: b.K,
        partition: b.partition,
        realisedAdjacency: b.realisedAdjacency,
        studySeconds: b.studySeconds,
        heartBudget: b.heartBudget,
        isProbe: b.isProbe,
        pack: pn,
        attempts: attemptsRef.current,
      },
      { nmap: b.nmap, sideOf: b.sideOf }
    );
    beginStudy(b);
  }, [cfg, seed, beginStudy]);

  const advanceRound = useCallback(() => {
    metricsRef.current?.endRound();
    const bd = boardRef.current;
    const next = targetIndexRef.current + 1;
    setTargetIndex(next);
    targetIndexRef.current = next;
    if (next >= bd.K) {
      clearLevel();
    } else {
      const t = setTimeout(() => { if (!sentRef.current) startRound(next, bd); }, 250);
      transitionTimerRef.current.push(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRound]);

  const clearLevel = useCallback(() => {
    const bd = boardRef.current;
    const levelSeconds = (Date.now() - levelStartRef.current) / 1000;
    const award = computeAward(bd.T, cfg.difficulty_level, levelSeconds, streakRef.current, heartsRef.current, bd.heartBudget);
    metricsRef.current?.passLevel(award);
    setScore((s) => s + award);
    setStreak((s) => s + 1);
    if (!reduceMotion) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.45 }, colors: ['#22D3EE', '#34D399', '#F59E0B', '#60A5FA'], ticks: 200 });
    }
    const nextLevel = levelRef.current + 1;
    const t = setTimeout(() => {
      if (sentRef.current) return;
      if (nextLevel > cfg.max_level) {
        endSession('completed', 'MAX_LEVEL');
      } else {
        setLevel(nextLevel);
        levelRef.current = nextLevel;
        startLevel(nextLevel, false);
      }
    }, 950);
    transitionTimerRef.current.push(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, reduceMotion, startLevel]);

  const failLevel = useCallback((reason) => {
    metricsRef.current?.endRound();
    metricsRef.current?.failLevel(reason);
    setStreak(0);
    const lostLife = !unlimited;
    let nl = livesRef.current;
    if (lostLife) {
      nl = nl - 1;
      livesRef.current = nl;
      setLives(nl);
    }
    if (attemptsRef.current >= 5) {
      // force-advance regardless of lives
      const nextLevel = levelRef.current + 1;
      setToast('Moving to the next board');
      setTimeout(() => setToast(null), 1400);
      const t = setTimeout(() => {
        if (sentRef.current) return;
        if (nextLevel > cfg.max_level) endSession('completed', 'MAX_LEVEL');
        else { setLevel(nextLevel); levelRef.current = nextLevel; startLevel(nextLevel, false); }
      }, 1100);
      transitionTimerRef.current.push(t);
      return;
    }
    if (unlimited || nl > 0) {
      setToast('New board — same size');
      setTimeout(() => setToast(null), 1300);
      const t2 = setTimeout(() => { if (!sentRef.current) startLevel(levelRef.current, true); }, 1100);
      transitionTimerRef.current.push(t2);
    } else {
      endSession('game_over', 'NO_LIVES');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlimited, cfg.max_level, startLevel]);

  const onWrong = useCallback((hexId) => {
    reRevealRef.current = true;
    const newHearts = heartsRef.current - 1;
    heartsRef.current = newHearts;
    setHearts(newHearts);
    setWrongHexId(hexId);
    if (reRevealTimer.current) clearTimeout(reRevealTimer.current);
    reRevealTimer.current = setTimeout(() => {
      setWrongHexId(null);
      setRevealAll(true);
      reRevealTimer.current = setTimeout(() => {
        setRevealAll(false);
        reRevealRef.current = false;
        if (sentRef.current) return;
        if (newHearts <= 0) failLevel('hearts');
      }, 2000);
    }, 700);
  }, [failLevel]);

  const tap = useCallback((hexId) => {
    if (phaseRef.current !== 'hunting') return;
    if (reRevealRef.current || wrongHexId === hexId) return;
    if (claimedIds.has(hexId) || faceUpIds.has(hexId)) return;
    const now = Date.now();
    const since = now - lastTapRef.current;
    if (since < 120) return; // debounce
    const accidental = since < 160;
    lastTapRef.current = now;
    metricsRef.current?.setInputMethod('touch');
    metricsRef.current?.noteActive();

    const bd = boardRef.current;
    const cell = bd.cellsById[hexId];
    const x = Math.max(-1, Math.min(1, cell.cx / maxAbsRef.current));
    const target = bd.tray[targetIndexRef.current];
    const correct = bd.assignment[hexId] === target;
    metricsRef.current?.recordTap({ hexId, correct, x, isReveal: !correct, accidental });

    if (correct) {
      setFaceUpIds((s) => new Set(s).add(hexId));
      setClaimedIds((s) => new Set(s).add(hexId));
      foundCopiesRef.current += 1;
      if (foundCopiesRef.current >= bd.partition[target]) {
        advanceRound();
      }
    } else {
      onWrong(hexId);
    }
  }, [claimedIds, faceUpIds, wrongHexId, advanceRound, onWrong]);

  // ---- control trial (face-up perception only) ----
  const startControlTrial = useCallback(() => {
    const d = cfg.difficulty_level;
    const pSize = getPack(packForLevel(cfg.pack, 1)).length;
    const b = buildLevel(1, d, pSize, 'none', seed + ':control');
    b.studySeconds = 0;
    boardRef.current = b;
    setBoard(b);
    const pn = packForLevel(cfg.pack, 1);
    setPack(getPack(pn));
    const m = boardMetrics(b);
    maxAbsRef.current = m.maxAbs;
    setFaceUpIds(new Set(b.cells.map((c) => c.id)));
    setClaimedIds(new Set());
    setWrongHexId(null);
    setRevealAll(true);
    setSelectedId(b.cells[0]?.id || null);
    setPhase('control');
    phaseRef.current = 'control';
    metricsRef.current?.startControl(pn);
    const target = b.tray[0];
    metricsRef.current?.startControlRound(target, b.partition[target]);
    setTargetIndex(0);
    targetIndexRef.current = 0;
    foundCopiesRef.current = 0;
    setToast('Control trial: find every copy of the shown picture — board stays face-up');
    setTimeout(() => setToast(null), 2600);
  }, [cfg, seed]);

  const controlTap = useCallback((hexId) => {
    if (phaseRef.current !== 'control') return;
    const now = Date.now();
    const since = now - lastTapRef.current;
    if (since < 120) return;
    lastTapRef.current = now;
    metricsRef.current?.setInputMethod('touch');
    const bd = boardRef.current;
    const cell = bd.cellsById[hexId];
    const x = Math.max(-1, Math.min(1, cell.cx / maxAbsRef.current));
    const target = bd.tray[0];
    const correct = bd.assignment[hexId] === target;
    metricsRef.current?.recordControlTap({ hexId, correct, x });
    if (correct) {
      setClaimedIds((s) => new Set(s).add(hexId));
      foundCopiesRef.current += 1;
      if (foundCopiesRef.current >= bd.partition[target]) {
        metricsRef.current?.endControlRound();
        metricsRef.current?.endControl();
        setRevealAll(false);
        setToast('Control complete — starting memory rounds');
        setTimeout(() => setToast(null), 1500);
        const t = setTimeout(() => { if (!sentRef.current) startLevel(cfg.level, false); }, 900);
        transitionTimerRef.current.push(t);
      }
    }
  }, [cfg, startLevel]);

  // ---- keyboard ----
  useEffect(() => {
    if (phase !== 'hunting' && phase !== 'control') return;
    const onKey = (e) => {
      const bd = boardRef.current;
      if (!bd) return;
      const sel = selectedId;
      const nmap = bd.nmap[sel] || [];
      let idx = -1;
      if (e.key === 'ArrowLeft') idx = 0;
      else if (e.key === 'ArrowRight') idx = 1;
      else if (e.key === 'ArrowUp') idx = 2;
      else if (e.key === 'ArrowDown') idx = 4;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (phase === 'hunting') tap(sel);
        else controlTap(sel);
        return;
      } else return;
      e.preventDefault();
      const ns = nmap[idx] || nmap[idx + 1] || sel;
      if (ns) setSelectedId(ns);
      metricsRef.current?.setInputMethod('keyboard');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, selectedId, tap, controlTap]);

  // ---- end session ----
  const endSession = useCallback((status, reason) => {
    if (sentRef.current) return;
    sentRef.current = true;
    if (studyTickRef.current) { clearInterval(studyTickRef.current); studyTickRef.current = null; }
    if (reRevealTimer.current) { clearTimeout(reRevealTimer.current); reRevealTimer.current = null; }
    transitionTimerRef.current.forEach((t) => clearTimeout(t));
    transitionTimerRef.current = [];
    if (reason === 'timer' || reason === 'abandoned') {
      metricsRef.current?.flushPartialLevel(reason);
    } else if (metricsRef.current?.curRound) {
      metricsRef.current.endRound();
      if (metricsRef.current.curLevel) metricsRef.current.failLevel(reason);
    }
    const payload = metricsRef.current?.buildPayload(status, levelRef.current, cfg.lives === 0 ? null : livesRef.current);
    if (payload) {
      metricsRef.current?.sendResults(payload);
      setResult(payload);
    }
    setPhase('results');
    phaseRef.current = 'results';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.lives]);

  const startGame = () => {
    if (cfg.time_to_play > 0) setTimerStarted(true);
    if (cfg.control_trial) startControlTrial();
    else startLevel(cfg.level, false);
  };

  const playAgain = () => {
    sentRef.current = false;
    setResult(null);
    metricsRef.current = new PeekPeekMetrics(cfg, bg, sessionIdRef.current);
    setLevel(cfg.level);
    levelRef.current = cfg.level;
    setLives(cfg.lives);
    livesRef.current = cfg.lives;
    setScore(0);
    setStreak(0);
    setTimeLeft(cfg.time_to_play);
    setTimerStarted(false);
    startGame();
  };

  // ---- auto-start: skip onboarding, begin directly ----
  useEffect(() => {
    startGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- render ----
  if (phase === 'results' && result) return <Results payload={result} onPlayAgain={playAgain} />;

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center px-2 py-2 relative" style={{ background: bg.fieldCss, color: bg.chrome }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)' }} />

      {cdType !== 'none' && cfg.time_to_play > 0 && phase !== 'onboarding' && (
        <CountdownTimer type={cdType} timeLeft={timeLeft} totalTime={cfg.time_to_play} topPct={16} />
      )}

      <div className="relative w-full max-w-2xl flex flex-col h-full">
        {board && phase !== 'onboarding' && (
          <Hud
            level={level}
            maxLevel={cfg.max_level}
            lives={lives}
            unlimited={unlimited}
            score={score}
            hearts={hearts}
            heartBudget={board.heartBudget}
            pack={packForLevel(cfg.pack, level)}
            paletteBand={cfg.paletteBand}
            studyLeft={studyLeft}
            phase={phase}
          />
        )}

        <div ref={areaRef} className="relative flex-1 w-full min-h-0 flex items-center justify-center">
          {board && phase !== 'onboarding' && (
            <HexBoard
              board={board}
              pack={pack}
              faceUpIds={faceUpIds}
              claimedIds={claimedIds}
              wrongHexId={wrongHexId}
              revealAll={revealAll}
              selectedId={selectedId}
              onTap={phase === 'hunting' ? tap : phase === 'control' ? controlTap : undefined}
              scale={scale}
              reduceMotion={reduceMotion}
              backColor={backColor}
              wave={wave}
            />
          )}
        </div>

        {board && phase !== 'onboarding' && (
          <div className="w-full pb-2">
            <TargetTray
              board={board}
              pack={pack}
              currentIndex={targetIndex}
              scale={scale}
              reduceMotion={reduceMotion}
              backColor={backColor}
            />
            {cfg.hidden_count ? null : (
              <p className="text-center text-[11px] opacity-70 mt-1">
                {board.partition[board.tray[targetIndex]] > 0
                  ? `Find ${board.partition[board.tray[targetIndex]]} copies`
                  : ''}
              </p>
            )}
          </div>
        )}

        {/* toast */}
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-28 z-30">
            <div className="px-4 py-2 rounded-full text-sm bg-black/70 text-white border border-white/15">{toast}</div>
          </div>
        )}
      </div>
    </div>
  );
}