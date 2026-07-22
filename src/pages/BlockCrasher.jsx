import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { LEVELS } from '@/lib/blockCrasherLevels';
import { assignSpecialBricks, getSpecialConfig } from '@/lib/specialBricks';
import CountdownTimer from '@/components/games/CountdownTimer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, RotateCcw, Trophy, Heart, Star } from 'lucide-react';

const CANVAS_W = 800;
const CANVAS_H = 600;
const PADDLE_H = 14;
const PADDLE_Y = 558;
const BALL_R = 8;
const BASE_SPEED = 3.5;
// Level 1 = base speed; each level adds ~5% of base; Level 10 = 50% faster than Level 1.
const getLevelSpeed = (lvl) => BASE_SPEED * (1 + (lvl - 1) * (0.5 / 9));
const BRICK_COLS = 10;
const BRICK_W = 72;
const BRICK_H = 22;
const BRICK_GAP = 4;
const BRICK_OFFSET_X = (CANVAS_W - (BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP)) / 2;
const BRICK_OFFSET_Y = 50;

const ROW_COLORS = [
  ['#FF6B6B', '#E84545'],
  ['#FFA94D', '#E8852D'],
  ['#FFD93D', '#E8C22D'],
  ['#6BCB77', '#4FB061'],
  ['#4D96FF', '#3D7ACC'],
  ['#9B72CB', '#7E55AE'],
  ['#FF6B9D', '#E84D80'],
  ['#6BCFFF', '#4FB8E8'],
  ['#FFD93D', '#E8C22D'],
  ['#6BCB77', '#4FB061'],
];
const TOUGH_COLORS = ['#B8C0CC', '#8A93A0'];
const TOUGH_COLORS_DAMAGED = ['#D8A0A0', '#B06868'];

function initBricks(levelConfig, level) {
  const bricks = [];
  const pattern = levelConfig.pattern;
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (pattern[row][col] === 0) continue;
      const isTough = pattern[row][col] === 2;
      const colors = isTough ? [...TOUGH_COLORS] : ROW_COLORS[row % ROW_COLORS.length];
      bricks.push({
        x: BRICK_OFFSET_X + col * (BRICK_W + BRICK_GAP),
        y: BRICK_OFFSET_Y + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        hp: isTough ? 2 : 1,
        maxHp: isTough ? 2 : 1,
        dead: false,
        isTough,
        colors,
        special: null,
        visible: true,
      });
    }
  }
  return assignSpecialBricks(bricks, level);
}

function spawnParticles(x, y, color, particles) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 3 + Math.random() * 3,
      color,
    });
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function render(ctx, bricks, paddle, balls, particles) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  for (const b of bricks) {
    if (b.dead) continue;
    if (b.special === 'invisible' && !b.visible) continue;
    const colors = b.hp < b.maxHp && b.isTough ? TOUGH_COLORS_DAMAGED : b.colors;
    drawRoundedRect(ctx, b.x, b.y, b.w, b.h, 4);
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x + 4, b.y + 1);
    ctx.lineTo(b.x + b.w - 4, b.y + 1);
    ctx.stroke();

    if (b.special) {
      const cfg = getSpecialConfig(b.special);
      if (cfg) {
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 3);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cfg.symbol, b.x + b.w / 2, b.y + b.h / 2);
      }
    }
  }

  const pg = ctx.createLinearGradient(0, PADDLE_Y, 0, PADDLE_Y + PADDLE_H);
  pg.addColorStop(0, '#5B9FFF');
  pg.addColorStop(0.5, '#4D96FF');
  pg.addColorStop(1, '#3D7ACC');
  drawRoundedRect(ctx, paddle.x, PADDLE_Y, paddle.w, PADDLE_H, PADDLE_H / 2);
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(paddle.x + paddle.w / 2, PADDLE_Y + PADDLE_H / 3, paddle.w / 3.5, PADDLE_H / 5, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const ball of balls) {
    const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R * 2.5);
    glow.addColorStop(0, 'rgba(255,255,255,0.35)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const bg = ctx.createRadialGradient(ball.x - BALL_R / 3, ball.y - BALL_R / 3, 0, ball.x, ball.y, BALL_R);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#C8C8D8');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B72CB'],
  });
}

function fireBigConfetti() {
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B72CB'];
  const end = Date.now() + 2000;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors });
}

export default function BlockCrasherGame() {
  const [searchParams] = useSearchParams();
  const timeToPlay = parseInt(searchParams.get('time_to_play'), 10) || 0;
  const difficultyLevel = Math.min(5, Math.max(1, parseInt(searchParams.get('difficulty_level'), 10) || 1));
  const countdownTimerType = searchParams.get('countdown_timer') || 'none';
  const calculatedStartLevel = difficultyLevel === 1 ? 1 : Math.min(10, difficultyLevel * 2);
  const initialLevel = parseInt(searchParams.get('level'), 10) || calculatedStartLevel;
  const backgroundUrl = searchParams.get('bg') || '';

  const canvasRef = useRef(null);
  const phaseRef = useRef('serving');
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  const [phase, setPhase] = useState('serving');
  const [level, setLevel] = useState(Math.min(10, Math.max(1, initialLevel)));
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [retryNonce, setRetryNonce] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeToPlay);
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && !timerStarted) setTimerStarted(true);
  }, [phase, timerStarted]);

  useEffect(() => {
    if (timeToPlay <= 0 || !timerStarted) return;
    if (phase !== 'serving' && phase !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          phaseRef.current = 'gameOver';
          setPhase('gameOver');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, timeToPlay]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const levelConfig = LEVELS[level - 1];
    const speed = getLevelSpeed(level);
    const basePaddleW = levelConfig.paddleWidth;

    let paddle = { x: CANVAS_W / 2 - basePaddleW / 2, w: basePaddleW };
    let balls = [{ x: CANVAS_W / 2, y: PADDLE_Y - BALL_R - 1, dx: 0, dy: 0 }];
    let bricks = initBricks(levelConfig, level);
    let particles = [];
    let animId;
    let speedMult = 1;
    let speedMultUntil = 0;
    let paddleMult = 1;
    let paddleMultUntil = 0;
    let gravityUntil = 0;

    phaseRef.current = 'serving';

    const getCanvasX = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) * (CANVAS_W / rect.width);
    };

    const handleMove = (x) => {
      paddle.x = Math.max(0, Math.min(CANVAS_W - paddle.w, x - paddle.w / 2));
    };

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right) return;
      handleMove(getCanvasX(e.clientX));
    };
    const onTouchMove = (e) => { e.preventDefault(); handleMove(getCanvasX(e.touches[0].clientX)); };

    const onLaunch = () => {
      if (phaseRef.current === 'serving') {
        phaseRef.current = 'playing';
        setPhase('playing');
        const sp = speed * speedMult;
        const angle = (Math.random() - 0.5) * 0.6;
        balls[0].dx = sp * Math.sin(angle);
        balls[0].dy = -sp * Math.cos(angle);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') handleMove(paddle.x + paddle.w / 2 - 30);
      else if (e.key === 'ArrowRight') handleMove(paddle.x + paddle.w / 2 + 30);
      else if (e.key === ' ') { e.preventDefault(); onLaunch(); }
    };

    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('click', onLaunch);
    canvas.addEventListener('touchstart', onLaunch);
    window.addEventListener('keydown', onKeyDown);

    const update = () => {
      const now = Date.now();
      if (speedMultUntil && now >= speedMultUntil) {
        speedMult = 1;
        speedMultUntil = 0;
        const sp = speed;
        for (const sb of balls) {
          const cs = Math.sqrt(sb.dx * sb.dx + sb.dy * sb.dy);
          if (cs > 0) { sb.dx = (sb.dx / cs) * sp; sb.dy = (sb.dy / cs) * sp; }
        }
      }
      if (paddleMultUntil && now >= paddleMultUntil) { paddleMult = 1; paddleMultUntil = 0; }
      if (gravityUntil && now >= gravityUntil) { gravityUntil = 0; }

      paddle.w = basePaddleW * paddleMult;
      if (paddle.x + paddle.w > CANVAS_W) paddle.x = CANVAS_W - paddle.w;

      if (phaseRef.current === 'serving') {
        if (balls.length > 0) {
          balls[0].x = paddle.x + paddle.w / 2;
          balls[0].y = PADDLE_Y - BALL_R - 1;
        }
      }

      if (phaseRef.current === 'playing') {
        const sp = speed * speedMult;
        const gravityActive = gravityUntil > 0;

        for (let bi = balls.length - 1; bi >= 0; bi--) {
          const ball = balls[bi];

          if (gravityActive && ball.dy > 0) ball.dy += 0.02;

          ball.x += ball.dx;
          ball.y += ball.dy;

          if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.dx = Math.abs(ball.dx); }
          if (ball.x + BALL_R >= CANVAS_W) { ball.x = CANVAS_W - BALL_R; ball.dx = -Math.abs(ball.dx); }
          if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.dy = Math.abs(ball.dy); }

          if (ball.dy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 8 &&
              ball.x >= paddle.x - BALL_R && ball.x <= paddle.x + paddle.w + BALL_R) {
            ball.y = PADDLE_Y - BALL_R;
            const hitPos = Math.max(0, Math.min(1, (ball.x - paddle.x) / paddle.w));
            const angle = (hitPos - 0.5) * Math.PI * 0.7;
            ball.dx = sp * Math.sin(angle);
            ball.dy = -Math.abs(sp * Math.cos(angle));
          }

          for (let i = 0; i < bricks.length; i++) {
            const b = bricks[i];
            if (b.dead) continue;
            if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
                ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
              const overlapL = ball.x + BALL_R - b.x;
              const overlapR = b.x + b.w - (ball.x - BALL_R);
              const overlapT = ball.y + BALL_R - b.y;
              const overlapB = b.y + b.h - (ball.y - BALL_R);
              const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
              if (minOverlap === overlapL || minOverlap === overlapR) ball.dx = -ball.dx;
              else ball.dy = -ball.dy;

              if (b.special === 'invisible' && !b.visible) {
                b.visible = true;
                scoreRef.current += 5;
                setScore(scoreRef.current);
                break;
              }

              b.hp--;
              if (b.hp <= 0) {
                b.dead = true;
                scoreRef.current += 10;
                spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.colors[0], particles);

                if (b.special) {
                  switch (b.special) {
                    case 'exploding': {
                      const radius = (BRICK_W + BRICK_GAP) * 1.5;
                      const cx = b.x + b.w / 2;
                      const cy = b.y + b.h / 2;
                      for (const other of bricks) {
                        if (other.dead || other === b) continue;
                        const ox = other.x + other.w / 2;
                        const oy = other.y + other.h / 2;
                        const dist = Math.sqrt((cx - ox) ** 2 + (cy - oy) ** 2);
                        if (dist <= radius) {
                          other.hp = 0;
                          other.dead = true;
                          scoreRef.current += 10;
                          spawnParticles(ox, oy, other.colors[0], particles);
                        }
                      }
                      break;
                    }
                    case 'slow_down': {
                      speedMult = 0.6;
                      speedMultUntil = Date.now() + 10000;
                      const newSp = speed * speedMult;
                      for (const sb of balls) {
                        const cs = Math.sqrt(sb.dx * sb.dx + sb.dy * sb.dy);
                        if (cs > 0) { sb.dx = (sb.dx / cs) * newSp; sb.dy = (sb.dy / cs) * newSp; }
                      }
                      break;
                    }
                    case 'rocket': {
                      const colCenter = b.x + b.w / 2;
                      for (const other of bricks) {
                        if (other.dead || other === b) continue;
                        if (Math.abs((other.x + other.w / 2) - colCenter) < BRICK_W / 2 + BRICK_GAP) {
                          other.hp = 0;
                          other.dead = true;
                          scoreRef.current += 10;
                          spawnParticles(other.x + other.w / 2, other.y + other.h / 2, other.colors[0], particles);
                        }
                      }
                      break;
                    }
                    case 'paddle_thin':
                      paddleMult = 0.7;
                      paddleMultUntil = Date.now() + 10000;
                      break;
                    case 'paddle_wide':
                      paddleMult = 1.5;
                      paddleMultUntil = Date.now() + 10000;
                      break;
                    case 'multi_ball': {
                      if (balls.length < 10) {
                        for (let j = 0; j < 2; j++) {
                          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.7;
                          balls.push({
                            x: ball.x, y: ball.y,
                            dx: sp * Math.cos(angle),
                            dy: sp * Math.sin(angle),
                          });
                        }
                      }
                      break;
                    }
                    case 'gravity':
                      gravityUntil = Date.now() + 5000;
                      break;
                  }
                }
              } else {
                scoreRef.current += 5;
              }
              setScore(scoreRef.current);
              break;
            }
          }

          if (ball.y - BALL_R > CANVAS_H) {
            balls.splice(bi, 1);
          }
        }

        if (balls.length === 0) {
          livesRef.current--;
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            phaseRef.current = 'gameOver';
            setPhase('gameOver');
          } else {
            phaseRef.current = 'serving';
            setPhase('serving');
            balls.push({ x: paddle.x + paddle.w / 2, y: PADDLE_Y - BALL_R - 1, dx: 0, dy: 0 });
            speedMult = 1;
            speedMultUntil = 0;
            paddleMult = 1;
            paddleMultUntil = 0;
            gravityUntil = 0;
          }
        }

        if (bricks.every(b => b.dead)) {
          scoreRef.current += 50;
          setScore(scoreRef.current);
          if (level >= 10) {
            phaseRef.current = 'allComplete';
            setPhase('allComplete');
            fireBigConfetti();
          } else {
            phaseRef.current = 'levelComplete';
            setPhase('levelComplete');
            fireConfetti();
          }
        }
      }

      particles = particles.filter(p => {
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.2;
        p.life--;
        return p.life > 0;
      });

      render(ctx, bricks, paddle, balls, particles);
      animId = requestAnimationFrame(update);
    };

    update();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('click', onLaunch);
      canvas.removeEventListener('touchstart', onLaunch);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [level, retryNonce]);

  const nextLevel = () => {
    setLevel(l => Math.min(10, l + 1));
    setPhase('serving');
    setShowLevelUp(true);
    setTimeout(() => setShowLevelUp(false), 2000);
  };

  const retry = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setTimeLeft(timeToPlay);
    setTimerStarted(false);
    setRetryNonce(n => n + 1);
    setPhase('serving');
  };

  const replay = () => {
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setTimeLeft(timeToPlay);
    setTimerStarted(false);
    setLevel(1);
    setPhase('serving');
  };

  const levelConfig = LEVELS[level - 1];

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center bg-neutral-950 px-2 py-2">
      {/* HUD */}
      <div className="w-full flex items-center justify-between mb-2 shrink-0">
        <Link to="/games">
          <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
            <ArrowLeft className="w-4 h-4 mr-1" /> Exit
          </Button>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Level</p>
            <p className="text-base font-bold text-white">{level}/10</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Score</p>
            <p className="text-base font-bold text-white flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" />{score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Lives</p>
            <div className="flex items-center gap-1 mt-0.5">
              {[0, 1, 2].map(i => (
                <Heart key={i} className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-neutral-700'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Level name banner */}
      <div className="w-full mb-2 text-center shrink-0">
        <h2 className="text-lg font-bold text-white">{levelConfig.name}</h2>
        <p className="text-xs text-neutral-500">{levelConfig.description}</p>
      </div>

      {/* Game canvas */}
      <div
        className="relative flex-1 w-full min-h-0 flex items-center justify-center"
      >
      <div
        className="relative h-full aspect-[4/3] max-w-full max-h-full rounded-xl overflow-hidden border border-neutral-800 shadow-2xl"
        style={{
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <CountdownTimer type={countdownTimerType} timeLeft={timeLeft} totalTime={timeToPlay} />
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="relative w-full h-full block cursor-pointer"
        />

        {/* Click to launch */}
        {phase === 'serving' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-6 py-3 animate-pulse">
              <p className="text-white font-medium text-sm">Click or tap to launch</p>
            </div>
          </div>
        )}

        {/* Level up flash */}
        {showLevelUp && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-[fade-in_0.3s_ease-out]">
              <p className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(91,159,255,0.8)]">LEVEL UP!</p>
            </div>
          </div>
        )}

        {/* Level complete modal */}
        {phase === 'levelComplete' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-neutral-700">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Level Complete!</h3>
              <p className="text-neutral-400 mb-1">{levelConfig.name} cleared</p>
              <p className="text-lg text-yellow-400 font-semibold mb-6">Score: {score}</p>
              <Button onClick={nextLevel} className="w-full bg-primary hover:bg-primary/90">
                Next Level <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Game over modal */}
        {phase === 'gameOver' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-neutral-700">
              <h3 className="text-2xl font-bold text-white mb-1">Game Over</h3>
              <p className="text-neutral-400 mb-1">You reached Level {level}</p>
              <p className="text-lg text-yellow-400 font-semibold mb-6">Final Score: {score}</p>
              <Button onClick={retry} className="w-full bg-primary hover:bg-primary/90">
                <RotateCcw className="w-4 h-4 mr-1" /> Retry Level {level}
              </Button>
            </div>
          </div>
        )}

        {/* All complete modal */}
        {phase === 'allComplete' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-neutral-900 rounded-2xl p-8 text-center max-w-sm mx-4 border border-yellow-600/50">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-black text-white mb-1">CHAMPION!</h3>
              <p className="text-neutral-400 mb-4">All 10 levels conquered</p>
              <p className="text-2xl text-yellow-400 font-bold mb-6">Final Score: {score}</p>
              <Button onClick={replay} className="w-full bg-primary hover:bg-primary/90">
                <RotateCcw className="w-4 h-4 mr-1" /> Play Again
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      <p className="text-xs text-neutral-600 mt-1 shrink-0">Move mouse or use arrow keys · Click/Space to launch</p>
    </div>
  );
}