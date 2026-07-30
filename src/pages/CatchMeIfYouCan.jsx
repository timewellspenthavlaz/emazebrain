import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Heart, Star, RotateCcw, Eye, Trophy } from 'lucide-react';
import CountdownTimer from '@/components/games/CountdownTimer';
import ColorGrid from '@/components/games/ColorGrid';
import { CatchMeMetrics } from '@/lib/catchMeMetrics';
import { WARM, COLD, ColourBag, hexToLab, labToHex, generateOddColor } from '@/lib/catchMeColors';

const LEVEL_MIN = 2;
const LEVEL_MAX = 9;
const DELTA_E_BASE = { 1: 30.0, 2: 24.0, 3: 19.2, 4: 15.4, 5: 12.3 };
const DELTA_E_FLOOR = 1.5;
const DELTA_E_DECAY = 0.95;

function computeDeltaE(difficulty, globalStage) {
  const base = DELTA_E_BASE[difficulty] || 19.2;
  return Math.max(DELTA_E_FLOOR, base * Math.pow(DELTA_E_DECAY, globalStage - 1));
}

function getQuadrant(tileIndex, gridSize) {
  const row = Math.floor(tileIndex / gridSize);
  const col = tileIndex % gridSize;
  const mid = gridSize / 2;
  if (row < mid && col < mid) return 0;
  if (row < mid && col >= mid) return 1;
  if (row >= mid && col < mid) return 2;
  return 3;
}

function computeStartingGlobalStage(startLevel) {
  let g = 1;
  for (let l = LEVEL_MIN; l < startLevel; l++) g += l;
  return g;
}

function fireConfetti() {
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#22C55E', '#48D1CC', '#4D96FF'],
  });
}

function fireLevelConfetti() {
  const colors = ['#22C55E', '#48D1CC', '#4D96FF', '#9B72CB'];
  const end = Date.now() + 1500;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors });
}

export default function CatchMeIfYouCanGame() {
  const [searchParams] = useSearchParams();
  const timeToPlay = parseInt(searchParams.get('time_to_play'), 10) || 0;
  const difficultyLevel = Math.min(5, Math.max(1, parseInt(searchParams.get('difficulty_level'), 10) || 3));
  const countdownTimerType = searchParams.get('countdown_timer') || 'none';
  const initialLevel = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, parseInt(searchParams.get('level'), 10) || LEVEL_MIN));
  const br = searchParams.get('br') || 'left';
  const orientation = searchParams.get('orientation') || 'right';
  const patientId = searchParams.get('patientId') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const backgroundUrl = searchParams.get('bg') || '';

  const paletteBand = br === 'right' ? 'cold' : 'warm';
  const band = paletteBand === 'warm' ? WARM : COLD;
  const startingGlobalStage = computeStartingGlobalStage(initialLevel);

  // State
  const [phase, setPhase] = useState('serving');
  const [level, setLevel] = useState(initialLevel);
  const [stage, setStage] = useState(1);
  const [globalStage, setGlobalStage] = useState(startingGlobalStage);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [selections, setSelections] = useState({});
  const [resolved, setResolved] = useState(null);
  const [grids, setGrids] = useState([]);
  const [currentDeltaE, setCurrentDeltaE] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeToPlay);
  const [timerStarted, setTimerStarted] = useState(false);
  const [stageNonce, setStageNonce] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Refs
  const phaseRef = useRef('serving');
  const levelRef = useRef(initialLevel);
  const stageRef = useRef(1);
  const globalStageRef = useRef(startingGlobalStage);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const streakRef = useRef(0);
  const highestLevelRef = useRef(initialLevel);
  const levelsCompletedRef = useRef(0);
  const metricsRef = useRef(null);
  const metricsSentRef = useRef(false);
  const colourBagRef = useRef(null);
  const stageStartRef = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Initialize metrics + colour bag on mount
  useEffect(() => {
    metricsRef.current = new CatchMeMetrics({ patientId, callbackUrl, gameId: 'catch-me-if-you-can', version: '1.3', orientation, paletteBand });
    metricsRef.current.startSession();
    metricsRef.current.startLevel(initialLevel);
    colourBagRef.current = new ColourBag(band);
    setStageNonce(1);

    return () => {
      if (metricsRef.current && !metricsSentRef.current) {
        metricsSentRef.current = true;
        const payload = metricsRef.current.buildPayload('abandoned', scoreRef.current, levelsCompletedRef.current, highestLevelRef.current, livesRef.current);
        metricsRef.current.sendResults(payload);
      }
    };
  }, []);

  // Global timer — starts on first "Start" click, runs across all levels
  useEffect(() => {
    if (timeToPlay <= 0 || !timerStarted) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          phaseRef.current = 'gameOver';
          setPhase('gameOver');
          if (metricsRef.current && !metricsSentRef.current) {
            metricsSentRef.current = true;
            const payload = metricsRef.current.buildPayload('game_over', scoreRef.current, levelsCompletedRef.current, highestLevelRef.current, livesRef.current);
            metricsRef.current.sendResults(payload);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerStarted, timeToPlay]);

  // Stage generation — runs on mount and whenever stageNonce changes
  useEffect(() => {
    if (stageNonce === 0) return;
    const curLevel = levelRef.current;
    const curStage = stageRef.current;
    const curGlobal = globalStageRef.current;
    const deltaE = computeDeltaE(difficultyLevel, curGlobal);
    setCurrentDeltaE(deltaE);

    const anchorSize = curLevel;
    const companionSize = curStage === 1 ? null : curStage;
    const nGrids = companionSize ? 2 : 1;
    const colors = colourBagRef.current.drawStage(nGrids);

    const newGrids = [];
    const anchorLab = hexToLab(colors[0].hex);
    const anchorOddLab = generateOddColor(anchorLab, deltaE);
    const anchorOddIndex = Math.floor(Math.random() * anchorSize * anchorSize);
    newGrids.push({
      type: 'anchor',
      size: anchorSize,
      baseColor: colors[0].hex,
      baseColorName: colors[0].name,
      oddColor: labToHex(anchorOddLab),
      oddIndex: anchorOddIndex,
      side: orientation === 'left' ? 'right' : 'left',
    });

    if (companionSize) {
      const companionLab = hexToLab(colors[1].hex);
      const companionOddLab = generateOddColor(companionLab, deltaE);
      const companionOddIndex = Math.floor(Math.random() * companionSize * companionSize);
      newGrids.push({
        type: 'companion',
        size: companionSize,
        baseColor: colors[1].hex,
        baseColorName: colors[1].name,
        oddColor: labToHex(companionOddLab),
        oddIndex: companionOddIndex,
        side: orientation,
      });
    }

    setGrids(newGrids);
    setSelections({});
    setResolved(null);
    stageStartRef.current = Date.now();

    if (metricsRef.current) {
      const gridSizes = newGrids.map((g) => g.size);
      metricsRef.current.startStage(curLevel, curStage, curGlobal, deltaE, gridSizes);
    }
  }, [stageNonce]);

  // Evaluation — runs when all grids have a selection
  useEffect(() => {
    if (phase !== 'playing' || resolved) return;
    if (grids.length === 0) return;
    const allSelected = grids.every((g) => selections[g.type] !== undefined);
    if (!allSelected) return;

    const results = grids.map((g) => {
      const sel = selections[g.type];
      const isCorrect = sel?.index === g.oddIndex;
      return { type: g.type, isCorrect, selected: sel?.index, oddIndex: g.oddIndex, side: g.side, size: g.size, time: sel?.time || 0 };
    });
    const allCorrect = results.every((r) => r.isCorrect);

    // Record metrics in selection order (earliest first)
    const sortedByTime = [...results].sort((a, b) => a.time - b.time);
    sortedByTime.forEach((r) => {
      const quadrant = getQuadrant(r.oddIndex, r.size);
      metricsRef.current?.recordSelection(r.type, r.isCorrect, r.time, quadrant, r.side);
    });

    setResolved({ correct: allCorrect, results });

    if (allCorrect) {
      metricsRef.current?.stageSucceeded();
      fireConfetti();
      const points = 100 + levelRef.current * 10 + streakRef.current * 5;
      scoreRef.current += points;
      setScore(scoreRef.current);
      streakRef.current++;
      setStreak(streakRef.current);

      setTimeout(() => {
        setResolved(null);
        setSelections({});
        advanceStage();
      }, 900);
    } else {
      metricsRef.current?.stageFailed(currentDeltaE);
      setTimeout(() => {
        setResolved(null);
        setSelections({});
        livesRef.current--;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          endGame('game_over');
        } else {
          reshuffleStage();
        }
      }, 1200);
    }
  }, [selections, phase, resolved, grids, currentDeltaE]);

  const advanceStage = () => {
    const curLevel = levelRef.current;
    const curStage = stageRef.current;
    const curGlobal = globalStageRef.current;

    if (curStage >= curLevel) {
      levelsCompletedRef.current++;
      if (curLevel >= LEVEL_MAX) {
        metricsRef.current?.startLevel(LEVEL_MAX);
        stageRef.current = 1;
        setStage(1);
        globalStageRef.current = curGlobal + 1;
        setGlobalStage(curGlobal + 1);
        setStageNonce((n) => n + 1);
      } else {
        const newLevel = curLevel + 1;
        levelRef.current = newLevel;
        highestLevelRef.current = Math.max(highestLevelRef.current, newLevel);
        setLevel(newLevel);
        metricsRef.current?.startLevel(newLevel);
        stageRef.current = 1;
        setStage(1);
        globalStageRef.current = curGlobal + 1;
        setGlobalStage(curGlobal + 1);
        setStageNonce((n) => n + 1);
        fireLevelConfetti();
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 2000);
      }
    } else {
      stageRef.current = curStage + 1;
      setStage(curStage + 1);
      globalStageRef.current = curGlobal + 1;
      setGlobalStage(curGlobal + 1);
      setStageNonce((n) => n + 1);
    }
  };

  const reshuffleStage = () => {
    streakRef.current = 0;
    setStreak(0);
    setStageNonce((n) => n + 1);
  };

  const endGame = (status) => {
    if (metricsRef.current && !metricsSentRef.current) {
      metricsSentRef.current = true;
      const payload = metricsRef.current.buildPayload(status, scoreRef.current, levelsCompletedRef.current, highestLevelRef.current, livesRef.current);
      metricsRef.current.sendResults(payload);
    }
    phaseRef.current = 'gameOver';
    setPhase('gameOver');
  };

  const handleStart = () => {
    phaseRef.current = 'playing';
    setPhase('playing');
    if (timeToPlay > 0) setTimerStarted(true);
  };

  const handleSelect = (gridType, tileIndex) => {
    if (phase !== 'playing' || resolved) return;
    metricsRef.current?.setInputMethod('touch');
    const rt = Date.now() - stageStartRef.current;
    setSelections((prev) => ({ ...prev, [gridType]: { index: tileIndex, time: rt } }));
  };

  const playAgain = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    streakRef.current = 0;
    levelsCompletedRef.current = 0;
    metricsSentRef.current = false;
    levelRef.current = initialLevel;
    stageRef.current = 1;
    globalStageRef.current = startingGlobalStage;
    highestLevelRef.current = initialLevel;
    phaseRef.current = 'serving';

    metricsRef.current = new CatchMeMetrics({ patientId, callbackUrl, gameId: 'catch-me-if-you-can', version: '1.3', orientation, paletteBand });
    metricsRef.current.startSession();
    metricsRef.current.startLevel(initialLevel);
    colourBagRef.current = new ColourBag(band);

    setScore(0);
    setLives(3);
    setStreak(0);
    setLevel(initialLevel);
    setStage(1);
    setGlobalStage(startingGlobalStage);
    setTimeLeft(timeToPlay);
    setTimerStarted(false);
    setPhase('serving');
    setStageNonce((n) => n + 1);
  };

  const sortedGrids = [...grids].sort((a, b) => {
    if (a.side === 'left' && b.side === 'right') return -1;
    if (a.side === 'right' && b.side === 'left') return 1;
    return 0;
  });

  const getGridFeedback = (gridType) => {
    if (!resolved) return 'none';
    const result = resolved.results.find((r) => r.type === gridType);
    if (!result) return 'none';
    return result.isCorrect ? 'correct' : 'wrong';
  };

  const companionPlaceholder = stage === 1 ? (
    <div className="hidden lg:flex lg:flex-1 lg:max-w-[45%] items-center justify-center">
      <div className="aspect-square w-full max-w-[200px] rounded-xl border-2 border-dashed border-neutral-700 flex items-center justify-center">
        <p className="text-neutral-600 text-xs text-center px-4">More tiles coming soon</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center bg-neutral-950 px-2 py-2">
      {/* HUD */}
      <div className="w-full flex items-center justify-between mb-2 shrink-0">
        <Link to="/games">
          <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Exit
          </Button>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Level</p>
            <p className="text-base font-bold text-white">{level}/9</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Stage</p>
            <p className="text-base font-bold text-white">{stage}/{level}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Score</p>
            <p className="text-base font-bold text-white flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" />{score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Lives</p>
            <div className="flex items-center gap-1 mt-0.5">
              {[0, 1, 2].map((i) => (
                <Heart key={i} className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-neutral-700'}`} />
              ))}
            </div>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">ΔE</p>
            <p className="text-base font-bold text-cyan-400">{currentDeltaE.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Band info */}
      <div className="w-full mb-2 text-center shrink-0">
        <p className="text-xs text-neutral-500">
          {paletteBand === 'warm' ? 'Warm' : 'Cold'} palette · Companion {orientation}
          {streak > 1 && <span className="ml-2 text-yellow-500">🔥 Streak {streak}</span>}
        </p>
      </div>

      {/* Game area */}
      <div
        className="relative flex-1 w-full min-h-0 flex items-center justify-center rounded-xl overflow-hidden border border-neutral-800 shadow-2xl"
        style={{
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'linear-gradient(135deg, #0f1729 0%, #1a1a2e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <CountdownTimer type={countdownTimerType} timeLeft={timeLeft} totalTime={timeToPlay} />

        {/* Grids */}
        <div className="relative w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 p-4">
          {companionPlaceholder && orientation === 'left' && companionPlaceholder}
          {sortedGrids.map((grid) => (
            <div key={grid.type} className={`w-full ${sortedGrids.length === 1 ? 'max-w-sm' : 'lg:flex-1 lg:max-w-[45%]'}`}>
              <ColorGrid
                grid={grid}
                selectedIndex={selections[grid.type]?.index}
                feedback={getGridFeedback(grid.type)}
                onSelect={(idx) => handleSelect(grid.type, idx)}
              />
            </div>
          ))}
          {companionPlaceholder && orientation === 'right' && companionPlaceholder}
        </div>

        {/* Level up flash */}
        {showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="animate-[fade-in_0.3s_ease-out]">
              <p className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(72,209,204,0.8)]">LEVEL {level}!</p>
            </div>
          </div>
        )}

        {/* Serving overlay */}
        {phase === 'serving' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
            <div className="text-center max-w-sm px-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(72,209,204,0.4)]">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Catch Me If You Can</h3>
              <p className="text-neutral-400 mb-6 text-sm">Find the one tile that's a different shade. The smaller the difference, the harder it gets — the game narrows it until you can't tell them apart.</p>
              <Button onClick={handleStart} className="bg-cyan-600 hover:bg-cyan-700">
                Start
              </Button>
            </div>
          </div>
        )}

        {/* Game over overlay */}
        {phase === 'gameOver' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
            <div className="bg-neutral-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-neutral-700">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Session Complete</h3>
              <p className="text-neutral-400 mb-1">You reached Level {level}</p>
              <p className="text-lg text-yellow-400 font-semibold mb-1">Final Score: {score}</p>
              <p className="text-sm text-cyan-400 mb-6">
                JND (ΔE): {metricsRef.current?.lastFailedDeltaE?.toFixed(1) || '—'}
              </p>
              <Button onClick={playAgain} className="w-full bg-cyan-600 hover:bg-cyan-700">
                <RotateCcw className="w-4 h-4 mr-1" /> Play Again
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600 mt-1 shrink-0">Tap the tile that looks different · Clear all grids to advance</p>
    </div>
  );
}