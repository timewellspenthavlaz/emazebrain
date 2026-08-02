/**
 * BeepBeepMetrics — telemetry collector. Subscribes to level_start, move,
 * undo, reset, hint, level_pass, level_fail and session_end; builds the
 * payload autonomously before firing the POST. Derived statistics are
 * computed once at session end, not incrementally.
 */

import { sendGameResults } from '@/lib/gameResultSender';

export class BeepBeepMetrics {
  constructor(cfg, bg) {
    this.cfg = cfg;
    this.bg = bg;
    this.gameId = 'beep-beep';
    this.version = '1.0';
    this.patientId = cfg.patientId || 'unknown';
    this.callbackUrl = cfg.callbackUrl || '';
    this.sessionId = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    this.startTime = 0;
    this.inputMethod = '';
    this.levelHistory = [];

    this.curLevel = null;
    this.curMoves = [];
    this.curStart = 0;
    this.curFirstMoveAt = null;
    this.curOptimalMoves = 0;
    this.curBudget = 0;
    this.curGridSize = 0;
    this.curScore = 0;
    this.curAttempts = 0;
    this.curHints = 0;
    this.curUndos = 0;
    this.curRedos = 0;
    this.curResets = 0;
    this.curBlocked = 0;
    this.curIllegal = 0;
    this.curTargetTouches = 0;
    this.curDistBefore = Infinity;
    this.lastMove = null;

    this.totalMoves = 0;
    this.totalUndos = 0;
    this.totalResets = 0;
    this.totalReversals = 0;
    this.blockedDrags = 0;
    this.illegalAxisDrags = 0;
    this.targetCarTouches = 0;
    this.totalInteractions = 0;
    this.hintsUsed = 0;
    this.idleMs = 0;
    this._lastActive = 0;

    this.streak = 0;
    this.longestStreak = 0;
  }

  startSession() {
    this.startTime = Date.now();
    this._lastActive = this.startTime;
  }
  setInputMethod(m) {
    if (!this.inputMethod) this.inputMethod = m;
  }
  noteActive() {
    const now = Date.now();
    if (this._lastActive && now - this._lastActive > 3000) {
      this.idleMs += now - this._lastActive - 3000;
    }
    this._lastActive = now;
  }

  startLevel({ level, gridSize, optimal, budget }) {
    this._endLevel(false, null);
    this.curLevel = level;
    this.curGridSize = gridSize;
    this.curOptimalMoves = optimal;
    this.curBudget = budget;
    this.curMoves = [];
    this.curStart = Date.now();
    this.curFirstMoveAt = null;
    this.curScore = 0;
    this.curAttempts = 1;
    this.curHints = 0;
    this.curUndos = 0;
    this.curRedos = 0;
    this.curResets = 0;
    this.curBlocked = 0;
    this.curIllegal = 0;
    this.curTargetTouches = 0;
    this.curDistBefore = Infinity;
    this.lastMove = null;
  }

  recordRetry() {
    this.curAttempts += 1;
  }

  recordMove({ pieceIdx, from, to, classification, isTarget }) {
    const now = Date.now();
    if (this.curFirstMoveAt === null) this.curFirstMoveAt = now;
    const lat = now - (this.curMoves.length ? this.curMoves[this.curMoves.length - 1].t : this.curStart);
    const move = { pieceIdx, from, to, classification, t: now, lat };
    // reversal = undoes the immediately preceding move
    let reversal = false;
    if (this.lastMove && this.lastMove.pieceIdx === pieceIdx && this.lastMove.from === to && this.lastMove.to === from) {
      reversal = true;
      this.totalReversals++;
    }
    move.reversal = reversal;
    this.curMoves.push(move);
    this.lastMove = move;
    this.totalMoves++;
    if (isTarget) this.curTargetTouches++;
    this.noteActive();
  }

  recordUndo() {
    this.curUndos++;
    this.totalUndos++;
    if (this.curMoves.length) {
      const m = this.curMoves.pop();
      if (m.reversal) this.totalReversals--;
      this.lastMove = this.curMoves[this.curMoves.length - 1] || null;
      this.totalMoves = Math.max(0, this.totalMoves - 1);
    }
  }
  recordRedo() {
    this.curRedos++;
  }
  recordReset() {
    this.curResets++;
    this.totalResets++;
    this.curMoves = [];
    this.lastMove = null;
    this.curFirstMoveAt = null;
  }
  recordBlockedDrag() {
    this.curBlocked++;
    this.blockedDrags++;
    this.totalInteractions++;
    this.noteActive();
  }
  recordIllegalAxisDrag() {
    this.curIllegal++;
    this.illegalAxisDrags++;
    this.totalInteractions++;
    this.noteActive();
  }
  recordTargetTouch() {
    this.targetCarTouches++;
    this.totalInteractions++;
  }
  recordHint(rung) {
    this.curHints++;
    this.hintsUsed++;
  }
  setDistBefore(d) {
    this.curDistBefore = d;
  }

  _endLevel(completed, failReason) {
    if (this.curLevel === null) return;
    const moves = this.curMoves;
    const movesUsed = moves.length;
    const progressive = moves.filter((m) => m.classification === 'progressive');
    const regressive = moves.filter((m) => m.classification === 'regressive');
    const neutral = moves.filter((m) => m.classification === 'neutral');
    const classified = progressive.length + regressive.length + neutral.length;
    // longest unbroken run of progressive moves
    let longest = 0;
    let run = 0;
    for (const m of moves) {
      if (m.classification === 'progressive') {
        run++;
        longest = Math.max(longest, run);
      } else run = 0;
    }
    const firstLat = this.curFirstMoveAt != null ? this.curFirstMoveAt - this.curStart : null;
    const levelSeconds = (Date.now() - this.curStart) / 1000;
    const moveEfficiency = completed && movesUsed > 0 ? this.curOptimalMoves / Math.max(this.curOptimalMoves, movesUsed) : null;

    this.levelHistory.push({
      level: this.curLevel,
      grid_size: this.curGridSize,
      optimal_moves: this.curOptimalMoves,
      move_budget: this.curBudget,
      moves_used: movesUsed,
      attempts: this.curAttempts,
      completed: !!completed,
      fail_reason: completed ? null : failReason,
      duration_seconds: levelSeconds,
      score_earned: completed ? this.curScore : 0,
      move_efficiency: moveEfficiency,
      first_move_latency_ms: firstLat,
      optimal_moves_made: progressive.length,
      regressive_moves: regressive.length,
      neutral_moves: neutral.length,
      longest_plan_run: longest,
      reversals: moves.filter((m) => m.reversal).length,
      undos: this.curUndos,
      redos: this.curRedos,
      resets: this.curResets,
      hints_used: this.curHints,
      blocked_drags: this.curBlocked,
      illegal_axis_drags: this.curIllegal,
      target_car_touches: this.curTargetTouches,
    });
    this.curLevel = null;
  }

  passLevel(scoreEarned) {
    this.curScore = scoreEarned;
    this._endLevel(true, null);
    this.streak++;
    this.longestStreak = Math.max(this.longestStreak, this.streak);
  }
  failLevel(reason) {
    this._endLevel(false, reason);
    this.streak = 0;
  }

  buildPayload(status, highestLevel, levelsCompleted, livesRemaining) {
    const completed = this.levelHistory.filter((l) => l.completed);
    const attempted = this.levelHistory.length;
    const levelAccuracy = attempted ? completed.length / attempted : 0;
    const effs = completed.map((l) => l.move_efficiency).filter((v) => v != null);
    const planningEfficiency = effs.length ? effs.reduce((a, b) => a + b, 0) / effs.length : 0;
    const bestEff = effs.length ? Math.max(...effs) : 0;
    const byGrid = {};
    for (const l of completed) {
      const key = `${l.grid_size}x${l.grid_size}`;
      if (!byGrid[key]) byGrid[key] = [];
      byGrid[key].push(l.move_efficiency);
    }
    const planningEffByGrid = {};
    for (const k of Object.keys(byGrid)) {
      planningEffByGrid[k] = byGrid[k].reduce((a, b) => a + b, 0) / byGrid[k].length;
    }
    const deepest = completed.length ? Math.max(...completed.map((l) => l.optimal_moves)) : 0;
    const highestGrid = this.levelHistory.reduce((m, l) => Math.max(m, l.grid_size), 0);
    const allProg = completed.reduce((s, l) => s + l.optimal_moves_made, 0);
    const allRegr = completed.reduce((s, l) => s + l.regressive_moves, 0);
    const allNeut = completed.reduce((s, l) => s + l.neutral_moves, 0);
    const classified = allProg + allRegr + allNeut;
    const optimalMoveRate = classified ? allProg / classified : 0;
    const regressiveMoveRate = classified ? allRegr / classified : 0;
    const longestPlanRun = completed.reduce((m, l) => Math.max(m, l.longest_plan_run), 0);
    const firstLats = completed.map((l) => l.first_move_latency_ms).filter((v) => v != null);
    const avgFirst = firstLats.length ? firstLats.reduce((a, b) => a + b, 0) / firstLats.length : 0;
    const medFirst = firstLats.length ? firstLats.slice().sort((a, b) => a - b)[Math.floor(firstLats.length / 2)] : 0;
    const levelSecs = completed.map((l) => l.duration_seconds);
    const avgLevelSecs = levelSecs.length ? levelSecs.reduce((a, b) => a + b, 0) / levelSecs.length : 0;
    const totalMoveSecs = completed.reduce((s, l) => s + l.duration_seconds, 0);
    const totalMoveCount = completed.reduce((s, l) => s + l.moves_used, 0);
    const avgSecsPerMove = totalMoveCount ? totalMoveSecs / totalMoveCount : 0;
    const reversals = completed.reduce((s, l) => s + l.reversals, 0);
    const reversalRate = totalMoveCount ? reversals / totalMoveCount : 0;
    const totalUndos = completed.reduce((s, l) => s + l.undos, 0);
    const totalResets = completed.reduce((s, l) => s + l.resets, 0);

    return {
      game_id: this.gameId,
      patient_id: this.patientId,
      session_id: this.sessionId,
      version: this.version,
      metadata: {
        version: this.version,
        game_id: this.gameId,
        timestamp: new Date(this.startTime).toISOString(),
        patient_id: this.patientId,
        session_id: this.sessionId,
      },
      status,
      metrics: {
        score: this.levelHistory.reduce((s, l) => s + (l.score_earned || 0), 0),
        duration_seconds: (Date.now() - this.startTime) / 1000,
        levels_completed: levelsCompleted,
        highest_level: highestLevel,
        lives_remaining: livesRemaining,
        input_method: this.inputMethod,
        orientation: this.cfg.orientation,
        exit_side: this.cfg.orientation,
        br: this.cfg.br,
        palette_band: this.cfg.paletteBand,
        bg_mode: this.bg.mode,
        bg_colour: this.bg.baseHex,
        bg_colour_name: this.bg.name,
        difficulty_level: this.cfg.difficulty_level,
        levels_attempted: attempted,
        highest_grid_size: highestGrid,
        deepest_optimal_solved: deepest,
        level_accuracy: levelAccuracy,
        planning_efficiency: planningEfficiency,
        planning_efficiency_by_grid: planningEffByGrid,
        best_planning_efficiency: bestEff,
        optimal_move_rate: optimalMoveRate,
        regressive_move_rate: regressiveMoveRate,
        longest_plan_run: longestPlanRun,
        avg_first_move_latency_ms: Math.round(avgFirst),
        median_first_move_latency_ms: Math.round(medFirst),
        avg_level_seconds: Math.round(avgLevelSecs * 10) / 10,
        avg_seconds_per_move: Math.round(avgSecsPerMove * 10) / 10,
        total_moves: totalMoveCount,
        total_reversals: reversals,
        reversal_rate: reversalRate,
        total_undos: totalUndos,
        total_resets: totalResets,
        blocked_drags: this.blockedDrags,
        illegal_axis_drags: this.illegalAxisDrags,
        target_car_touch_rate: this.totalInteractions ? this.targetCarTouches / this.totalInteractions : 0,
        longest_streak: this.longestStreak,
        hints_used: this.hintsUsed,
        idle_seconds: Math.round(this.idleMs / 1000),
      },
      level_history: this.levelHistory,
    };
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.callbackUrl);
  }
}