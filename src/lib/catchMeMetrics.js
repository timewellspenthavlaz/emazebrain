import { sendGameResults } from '@/lib/gameResultSender';

/**
 * CatchMeMetrics — metrics tracker for the Catch Me If You Can game.
 * Collects perceptual/attentional data during a session, then sends results
 * to the backend. Uses the same payload envelope as Block Crasher's
 * GameMetrics so it works with the existing receiveGameResults backend.
 */
export class CatchMeMetrics {
  constructor({ patientId, callbackUrl, gameId = 'catch-me-if-you-can', version = '1.3', orientation, paletteBand }) {
    this.patientId = patientId || 'unknown';
    this.callbackUrl = callbackUrl || '';
    this.gameId = gameId;
    this.version = version;
    this.orientation = orientation || 'right';
    this.paletteBand = paletteBand || 'warm';
    this.sessionId = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    this.startTime = 0;
    this.inputMethod = '';

    // Session counters
    this.totalSelections = 0;
    this.correctSelections = 0;
    this.wrongSelections = 0;
    this.bestStreak = 0;
    this.currentStreak = 0;

    // Reaction times
    this.reactionTimes = [];
    this.anchorReactionTimes = [];
    this.companionReactionTimes = [];
    this.leftReactionTimes = [];
    this.rightReactionTimes = [];
    this.leftCorrect = 0;
    this.leftTotal = 0;
    this.rightCorrect = 0;
    this.rightTotal = 0;

    // First-grid tracking (dual stages)
    this.anchorFirstCount = 0;
    this.dualStageCount = 0;

    // Quadrant tracking
    this.quadrantCorrect = [0, 0, 0, 0];
    this.quadrantTotal = [0, 0, 0, 0];

    // JND convergence
    this.lastFailedDeltaE = null;

    // Level/stage history
    this.levelHistory = [];
    this.currentLevel = null;
    this.currentLevelStages = [];
    this.currentStage = null;
    this.stageStartTime = 0;
    this.stageAttempts = 0;
    this.stageFirstGrid = null;
    this.stageSelections = {};
  }

  startSession() {
    this.startTime = Date.now();
  }

  setInputMethod(method) {
    if (!this.inputMethod) this.inputMethod = method;
  }

  startLevel(level) {
    this._endLevel();
    this.currentLevel = level;
    this.currentLevelStages = [];
  }

  startStage(level, stage, globalStage, deltaE, gridSizes) {
    this._endStage();
    this.currentStage = { level, stage, global_stage: globalStage, delta_e: deltaE, grid_sizes: gridSizes };
    this.stageStartTime = Date.now();
    this.stageAttempts = 0;
    this.stageFirstGrid = null;
    this.stageSelections = {};
  }

  recordSelection(gridType, isCorrect, reactionTimeMs, quadrant, side) {
    this.totalSelections++;
    if (isCorrect) this.correctSelections++;
    else this.wrongSelections++;

    this.reactionTimes.push(reactionTimeMs);
    if (gridType === 'anchor') this.anchorReactionTimes.push(reactionTimeMs);
    else this.companionReactionTimes.push(reactionTimeMs);

    if (side === 'left') {
      this.leftReactionTimes.push(reactionTimeMs);
      this.leftTotal++;
      if (isCorrect) this.leftCorrect++;
    } else {
      this.rightReactionTimes.push(reactionTimeMs);
      this.rightTotal++;
      if (isCorrect) this.rightCorrect++;
    }

    if (quadrant >= 0 && quadrant < 4) {
      this.quadrantTotal[quadrant]++;
      if (isCorrect) this.quadrantCorrect[quadrant]++;
    }

    if (!this.stageFirstGrid) {
      this.stageFirstGrid = gridType;
      if (this.currentStage && this.currentStage.grid_sizes.length > 1) {
        this.dualStageCount++;
        if (gridType === 'anchor') this.anchorFirstCount++;
      }
    }

    this.stageSelections[gridType] = { time_ms: reactionTimeMs, correct: isCorrect, quadrant };
  }

  stageFailed(deltaE) {
    this.lastFailedDeltaE = deltaE;
    this.stageAttempts++;
    this.currentStreak = 0;
  }

  stageSucceeded() {
    this.stageAttempts++;
    this.currentStreak++;
    this.bestStreak = Math.max(this.bestStreak, this.currentStreak);
  }

  _endStage() {
    if (!this.currentStage) return;
    this.currentStage.attempts = this.stageAttempts;
    this.currentStage.first_grid = this.stageFirstGrid;
    this.currentStage.selections = { ...this.stageSelections };
    this.currentLevelStages.push(this.currentStage);
    this.currentStage = null;
  }

  _endLevel() {
    if (this.currentLevel === null) return;
    this._endStage();
    this.levelHistory.push({ level: this.currentLevel, stages: [...this.currentLevelStages] });
    this.currentLevel = null;
    this.currentLevelStages = [];
  }

  buildPayload(status, score, levelsCompleted, highestLevel, livesRemaining) {
    this._endLevel();
    const avg = (arr) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);

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
        score,
        duration_seconds: (Date.now() - this.startTime) / 1000,
        levels_completed: levelsCompleted,
        highest_level: highestLevel,
        lives_remaining: livesRemaining,
        input_method: this.inputMethod,
        palette_band: this.paletteBand,
        orientation: this.orientation,
        total_selections: this.totalSelections,
        correct_selections: this.correctSelections,
        wrong_selections: this.wrongSelections,
        accuracy_rate: this.totalSelections > 0 ? this.correctSelections / this.totalSelections : 0,
        avg_reaction_time_ms: Math.round(avg(this.reactionTimes)),
        best_streak: this.bestStreak,
        final_jnd: this.lastFailedDeltaE,
        anchor_first_rate: this.dualStageCount > 0 ? this.anchorFirstCount / this.dualStageCount : 0,
        left_side_accuracy: this.leftTotal > 0 ? this.leftCorrect / this.leftTotal : 0,
        right_side_accuracy: this.rightTotal > 0 ? this.rightCorrect / this.rightTotal : 0,
        left_side_avg_rt_ms: Math.round(avg(this.leftReactionTimes)),
        right_side_avg_rt_ms: Math.round(avg(this.rightReactionTimes)),
        quadrant_accuracy: {
          q1: this.quadrantTotal[0] > 0 ? this.quadrantCorrect[0] / this.quadrantTotal[0] : 0,
          q2: this.quadrantTotal[1] > 0 ? this.quadrantCorrect[1] / this.quadrantTotal[1] : 0,
          q3: this.quadrantTotal[2] > 0 ? this.quadrantCorrect[2] / this.quadrantTotal[2] : 0,
          q4: this.quadrantTotal[3] > 0 ? this.quadrantCorrect[3] / this.quadrantTotal[3] : 0,
        },
        stage_count: this.levelHistory.reduce((sum, l) => sum + l.stages.length, 0),
      },
      level_history: this.levelHistory,
    };
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.callbackUrl);
  }
}