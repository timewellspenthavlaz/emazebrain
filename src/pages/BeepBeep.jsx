import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import Board from '@/components/beepBeep/Board';
import Hud from '@/components/beepBeep/Hud';
import Results from '@/components/beepBeep/Results';
import { TARGET_INDEX, BLOCKER_INDICES } from '@/components/beepBeep/useCarsSprite';
import { parseParams, gridBand, budget, computeAward, findReplacement } from '@/lib/beepBeep/config';
import { resolveBg } from '@/lib/beepBeep/colors';
import { loadLevels, pickBoard } from '@/lib/beepBeep/levels';
import {
  makeBoard, initialState, isGoal, distanceToGoal, firstOptimalMove,
  slideRange, blockersToExit,
} from '@/lib/beepBeep/engine';
import { BeepBeepMetrics } from '@/lib/beepBeep/metrics';

function fireConfetti() {
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.5, x: 0.5 }, colors: ['#22C55E', '#48D1CC', '#4D96FF', '#F2C14E'], ticks: 220 });
}

export default function BeepBeep() {
  const [searchParams] = useSearchParams();
  const cfg = useMemo(() => parseParams(searchParams), [searchParams]);
  const bg = useMemo(() => resolveBg(cfg.bg), [cfg.bg]);

  const [phase, setPhase] = useState('loading'); // loading | serving | playing | results
  const [pack, setPack] = useState(null);
  const [board, setBoard] = useState(null);
  const [state, setState] = useState(null);
  const [level, setLevel] = useState(cfg.level);
  const [lives, setLives] = useState(cfg.lives);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [budgetVal, setBudgetVal] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [hintRung, setHintRung] = useState(0);
  const [idleHint, setIdleHint] = useState(false);
  const [solved, setSolved] = useState(false);
  const [toast, setToast] = useState(null);
  const [timeLeft, setTimeLeft] = useState(cfg.time_to_play);
  const [timerStarted, setTimerStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [px, setPx] = useState(360);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const metricsRef = useRef(null);
  const sentRef = useRef(false);
  const levelRef = useRef(cfg.level);
  const livesRef = useRef(cfg.lives);
  const distCacheRef = useRef(new Map());
  const currentDistRef = useRef(Infinity);
  const levelStartRef = useRef(0);
  const seenGridsRef = useRef(new Set());
  const areaRef = useRef(null);
  const hintMoveRef = useRef(null);
  const hintStateKeyRef = useRef(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phaseRef = useRef('loading');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const unlimited = cfg.lives === 0;
  const livesRemaining = unlimited ? null : lives;

  // ---- load levels pack ----
  useEffect(() => {
    let alive = true;
    loadLevels().then((p) => { if (alive) { setPack(p); setPhase('serving'); } }).catch(() => setPhase('serving'));
    return () => { alive = false; };
  }, []);

  // ---- init metrics on mount ----
  useEffect(() => {
    metricsRef.current = new BeepBeepMetrics(cfg, bg);
    metricsRef.current.startSession();
    return () => {
      if (metricsRef.current && !sentRef.current && phaseRef.current === 'playing') {
        sentRef.current = true;
        const payload = metricsRef.current.buildPayload('abandoned', level, 0, cfg.lives);
        metricsRef.current.sendResults(payload);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- abandoned on tab hide ----
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (metricsRef.current && !sentRef.current && phaseRef.current === 'playing') {
        sentRef.current = true;
        const payload = metricsRef.current.buildPayload('abandoned', level, 0, cfg.lives);
        try { navigator.sendBeacon?.(cfg.callbackUrl, JSON.stringify(payload)); } catch (e) { /* ignore */ }
        metricsRef.current.sendResults(payload);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // ---- responsive board sizing ----
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 16;
      const h = el.clientHeight - 16;
      const n = board ? board.n : 4;
      let size = Math.max(n * 30 + 40, Math.min(w, h));
      setPx(size);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [board]);

  // ---- global timer ----
  useEffect(() => {
    if (cfg.time_to_play <= 0 || !timerStarted) return;
    const id = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(id);
          endSession('completed', 'TIME_BUDGET');
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStarted, cfg.time_to_play]);

  // ---- start a level ----
  const startLevel = useCallback((lvl, isRetry, overrideRaw) => {
    if (!pack) return;
    const raw = overrideRaw || pickBoard(pack, lvl, cfg.difficulty_level);
    if (!raw) { endSession('completed', 'NO_BOARD'); return; }
    if (!isRetry) seenGridsRef.current = new Set();
    seenGridsRef.current.add(raw.grid);
    const b = makeBoard(raw);
    distCacheRef.current = new Map();
    setBoard(b);
    const st = initialState(b);
    setState(st);
    setMoves(0);
    setBudgetVal(budget(b.optimal, cfg.difficulty_level));
    setUndoStack([]); setRedoStack([]);
    setHintRung(0); setIdleHint(false); setSolved(false); setSelectedIdx(0);
    const dist = distanceToGoal(b, st, distCacheRef.current);
    currentDistRef.current = dist;
    levelStartRef.current = Date.now();
    if (isRetry) {
      metricsRef.current?.recordRetry();
    } else {
      metricsRef.current?.startLevel({ level: lvl, gridSize: b.n, optimal: b.optimal, budget: budget(b.optimal, cfg.difficulty_level) });
      metricsRef.current?.setDistBefore(dist);
    }
  }, [pack, cfg.difficulty_level]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = () => {
    setPhase('playing');
    startLevel(cfg.level);
    if (cfg.time_to_play > 0) setTimerStarted(true);
  };

  // ---- hint computation ----
  const getHintMove = useCallback(() => {
    if (!board || !state) return null;
    const key = state.join(',');
    if (hintStateKeyRef.current !== key) {
      hintStateKeyRef.current = key;
      hintMoveRef.current = firstOptimalMove(board, state, distCacheRef.current);
    }
    return hintMoveRef.current;
  }, [board, state]);

  // ---- apply a move ----
  const applyMove = useCallback((idx, toV) => {
    if (solved || phaseRef.current !== 'playing' || !board || !state) return;
    const from = state[idx];
    if (toV === from) return;
    const newState = state.slice();
    newState[idx] = toV;
    const distBefore = currentDistRef.current;
    const distAfter = distanceToGoal(board, newState, distCacheRef.current);
    const classification = !Number.isFinite(distBefore) || !Number.isFinite(distAfter)
      ? 'unknown'
      : distAfter < distBefore ? 'progressive' : distAfter > distBefore ? 'regressive' : 'neutral';
    metricsRef.current?.recordMove({ pieceIdx: idx, from, to: toV, classification, isTarget: idx === 0 });
    setUndoStack((s) => [...s, { idx, from, to: toV }]);
    setRedoStack([]);
    setState(newState);
    setMoves((m) => m + 1);
    setHintRung(0); setIdleHint(false);
    currentDistRef.current = distAfter;
    metricsRef.current?.setDistBefore(distAfter);

    if (isGoal(board, newState)) {
      onSolved();
      return;
    }
    if (moves + 1 >= budgetVal) {
      onBudgetExceeded();
    }
  }, [board, state, solved, moves, budgetVal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- solved ----
  const onSolved = useCallback(() => {
    setSolved(true);
    if (!reduceMotion) fireConfetti();
    const levelSeconds = (Date.now() - levelStartRef.current) / 1000;
    const award = computeAward(board.n, cfg.difficulty_level, levelSeconds, streak, board.optimal, moves + 1);
    setScore((s) => s + award);
    setStreak((s) => {
      const ns = s + 1;
      return ns;
    });
    metricsRef.current?.passLevel(award);
    setTimeout(() => {
      const nextLevel = level + 1;
      if (nextLevel > cfg.max_level) {
        endSession('completed', 'MAX_LEVEL');
      } else {
        setLevel(nextLevel);
        startLevel(nextLevel, false);
      }
    }, 1100);
  }, [board, level, streak, moves, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- budget exceeded ----
  const onBudgetExceeded = useCallback(() => {
    if (unlimited) {
      // no failure; let them keep playing beyond budget? Spec: lives=0 disables failure. Just continue.
      return;
    }
    metricsRef.current?.failLevel('budget');
    setStreak(0);
    setLives((l) => {
      const nl = l - 1;
      if (nl <= 0) {
        endSession('game_over', 'NO_LIVES');
        return 0;
      }
      // show answer on miss
      if (cfg.show_answer_on_miss) {
        const mv = getHintMove();
        if (mv) flashToast(`Try: move the highlighted car`, 1200);
      }
      // replacement board at same depth
      const rep = findReplacement(pack, board, seenGridsRef.current);
      setTimeout(() => startLevel(level, true, rep), 1200);
      return nl;
    });
  }, [unlimited, pack, board, level, cfg.show_answer_on_miss]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- undo / redo / reset ----
  const undo = useCallback(() => {
    if (!undoStack.length || solved) return;
    const last = undoStack[undoStack.length - 1];
    const newState = state.slice();
    newState[last.idx] = last.from;
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, last]);
    setState(newState);
    setMoves((m) => Math.max(0, m - 1));
    metricsRef.current?.recordUndo();
    currentDistRef.current = distanceToGoal(board, newState, distCacheRef.current);
    setHintRung(0); setIdleHint(false);
  }, [undoStack, state, board, solved]);

  const redo = useCallback(() => {
    if (!redoStack.length || solved) return;
    const last = redoStack[redoStack.length - 1];
    const newState = state.slice();
    newState[last.idx] = last.to;
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((s) => [...s, last]);
    setState(newState);
    setMoves((m) => m + 1);
    metricsRef.current?.recordRedo();
    currentDistRef.current = distanceToGoal(board, newState, distCacheRef.current);
    if (isGoal(board, newState)) onSolved();
  }, [redoStack, state, board, solved]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    if (!board || solved) return;
    const st = initialState(board);
    setState(st);
    setMoves(0);
    setUndoStack([]); setRedoStack([]);
    setHintRung(0); setIdleHint(false);
    currentDistRef.current = distanceToGoal(board, st, distCacheRef.current);
    metricsRef.current?.recordReset();
  }, [board, solved]);

  // ---- hint ladder ----
  const onHint = useCallback(() => {
    setHintRung((r) => {
      const nr = Math.min(4, r + 1);
      if (nr === 4) {
        const mv = getHintMove();
        if (mv) {
          metricsRef.current?.recordHint(4);
          setTimeout(() => applyMove(mv.idx, mv.to), 50);
          return 0;
        }
        return r;
      }
      metricsRef.current?.recordHint(nr);
      return nr;
    });
    setIdleHint(false);
  }, [getHintMove, applyMove]);

  // ---- idle hint (hint_after) ----
  useEffect(() => {
    if (cfg.hint_after <= 0 || phase !== 'playing' || solved) return;
    const id = setTimeout(() => setIdleHint(true), cfg.hint_after * 1000);
    return () => clearTimeout(id);
  }, [cfg.hint_after, phase, solved, state, moves]);

  // ---- keyboard ----
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'u') { e.preventDefault(); undo(); return; }
      if (k === 'r') { e.preventDefault(); reset(); return; }
      if (k === 'h') { e.preventDefault(); onHint(); return; }
      if (k === 'tab') { e.preventDefault(); setSelectedIdx((i) => (i + (e.shiftKey ? -1 : 1) + board.pieces.length) % board.pieces.length); return; }
      if (!state) return;
      const sel = board.pieces[selectedIdx];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        metricsRef.current?.setInputMethod('keyboard');
        if (sel.horiz && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { metricsRef.current?.recordIllegalAxisDrag(); return; }
        if (!sel.horiz && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { metricsRef.current?.recordIllegalAxisDrag(); return; }
        const range = slideRange(board, state, selectedIdx);
        let dir = 0;
        if (sel.horiz) {
          const screenLeft = e.key === 'ArrowLeft' ? -1 : 1;
          dir = cfg.orientation === 'left' ? -screenLeft : screenLeft;
        } else {
          dir = e.key === 'ArrowUp' ? -1 : 1;
        }
        const target = Math.max(range.min, Math.min(range.max, state[selectedIdx] + dir));
        if (target !== state[selectedIdx]) applyMove(selectedIdx, target);
        else metricsRef.current?.recordBlockedDrag();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, board, state, selectedIdx, cfg.orientation, undo, redo, reset, onHint, applyMove]);

  // ---- end session ----
  const endSession = useCallback((status, reason) => {
    if (sentRef.current) return;
    sentRef.current = true;
    if (metricsRef.current && metricsRef.current.curLevel != null) {
      metricsRef.current.failLevel(reason || 'abandoned');
    }
    const levelsCompleted = metricsRef.current?.levelHistory?.filter((l) => l.completed).length || 0;
    const payload = metricsRef.current?.buildPayload(status, levelRef.current, levelsCompleted, cfg.lives === 0 ? null : livesRef.current);
    if (payload) {
      metricsRef.current?.sendResults(payload);
      setResult({ payload });
    }
    setPhase('results');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- interaction handlers ----
  const onInteract = (isTarget) => {
    metricsRef.current?.setInputMethod('touch');
    metricsRef.current?.noteActive();
    if (isTarget) metricsRef.current?.recordTargetTouch();
  };
  const onIllegalAxis = () => metricsRef.current?.recordIllegalAxisDrag();
  const onBlockedDrag = () => metricsRef.current?.recordBlockedDrag();

  function flashToast(msg, ms = 1500) {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  }

  // ---- highlight / ghost for hints ----
  const hintMove = getHintMove();
  const highlightSet = useMemo(() => {
    if (hintRung >= 2 && hintMove) return new Set([hintMove.idx]);
    if (hintRung === 1 || idleHint) return blockersToExit(board, state);
    return null;
  }, [hintRung, idleHint, hintMove, board, state]);
  const ghost = hintRung >= 3 && hintMove ? { idx: hintMove.idx, to: hintMove.to } : null;

  const playAgain = () => {
    sentRef.current = false;
    setResult(null);
    metricsRef.current = new BeepBeepMetrics(cfg, bg);
    metricsRef.current.startSession();
    setLevel(cfg.level); setLives(cfg.lives); setScore(0); setStreak(0);
    setPhase('serving');
  };

  const vehiclePalette = useMemo(() => {
    if (!board) return {};
    const map = {};
    let pi = 0;
    board.pieces.forEach((p) => {
      if (p.isTarget) map[p.id] = TARGET_INDEX;
      else { map[p.id] = BLOCKER_INDICES[pi % BLOCKER_INDICES.length]; pi++; }
    });
    return map;
  }, [board]);

  // ---- render ----
  if (phase === 'results' && result) return <Results payload={result.payload} onPlayAgain={playAgain} />;

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center px-2 py-2"
      style={{ background: bg.fieldCss, color: bg.chrome }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.22) 100%)' }} />

      <div className="relative w-full max-w-2xl flex flex-col items-center h-full">
        <Hud
          level={level} maxLevel={cfg.max_level} lives={lives} unlimited={unlimited}
          score={score} streak={streak} moves={moves} budget={budgetVal}
          exitSide={cfg.orientation} bgName={bg.name} paletteBand={cfg.paletteBand}
          difficulty={cfg.difficulty_level} timeLeft={timeLeft} timeToPlay={cfg.time_to_play}
          countdownType={cfg.countdown_timer}
          canUndo={undoStack.length > 0 && !solved} canRedo={redoStack.length > 0 && !solved}
          hintRung={hintRung} hintEnabled={cfg.hint_after > 0}
          onUndo={undo} onRedo={redo} onReset={reset} onHint={onHint}
        />

        <div ref={areaRef} className="relative flex-1 w-full min-h-0 flex items-center justify-center">
          {board && state && (
            <Board
              board={board} state={state} px={px}
              mirror={cfg.orientation === 'left'} highlight={highlightSet} hintMove={ghost}
              solved={solved} reduceMotion={reduceMotion} exitDir={1}
              onMove={applyMove} onIllegalAxis={onIllegalAxis} onBlockedDrag={onBlockedDrag}
              onInteract={onInteract} vehiclePalette={vehiclePalette}
            />
          )}
          {selectedIdx != null && phase === 'playing' && board && (
            <div className="absolute bottom-2 left-2 text-[11px] opacity-60 pointer-events-none">
              Tab selects · arrows move · U undo · R reset · H hint
            </div>
          )}
        </div>

        {/* serving overlay */}
        {phase === 'serving' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
            <div className="text-center max-w-sm px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(224,80,58,0.4)]">
                <CompassIcon />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Beep Beep</h3>
              <p className="text-neutral-400 mb-6 text-sm">Clear a path and drive the red car out through the gap. Cars slide only along their own length — sideways cars go left/right, upright cars go up/down. Drag a car to slide it, or tap to send it as far as it can go.</p>
              <button onClick={startGame} className="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold">Start</button>
            </div>
          </div>
        )}

        {/* toast */}
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-30">
            <div className="px-4 py-2 rounded-full text-sm bg-neutral-900/80 text-white border border-neutral-700">{toast}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M15 9l-2 6-4 2 2-6z" fill="currentColor" stroke="none" />
    </svg>
  );
}