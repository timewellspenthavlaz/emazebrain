/**
 * GameMetrics — standalone metrics tracker for the Block Crasher game.
 * Collects gameplay data during a session, then POSTs results to a callback URL.
 * No Base44 SDK dependency — pure browser API (fetch + URLSearchParams).
 */
export class GameMetrics {
  constructor({ patientId, callbackUrl, gameId = 'block-crasher', version = '1.0' }) {
    this.patientId = patientId || 'unknown';
    this.callbackUrl = callbackUrl || '';
    this.gameId = gameId;
    this.version = version;
    this.sessionId = crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

    this.startTime = 0;
    this.inputMethod = '';

    // Per-session counters
    this.totalBricks = 0;
    this.toughBricks = 0;
    this.ballsLost = 0;
    this.paddleHits = 0;
    this.score = 0;

    // Motor tracking
    this.interceptGaps = [];      // px distance between paddle center and ball at hit
    this.lastPaddleX = null;
    this.lastMoveTime = 0;
    this.movementReversals = 0;
    this.idleMs = 0;
    this.lastActivityTime = 0;

    // Special bricks
    this.specialTriggered = {};   // { exploding: 0, slow_down: 0, ... }
    this.powerupKills = 0;         // bricks destroyed by power-ups
    this.powerupTriggers = 0;     // total power-ups triggered

    // Per-level
    this.levelHistory = [];
    this.currentLevel = null;
    this.levelStartTime = 0;
    this.levelScoreStart = 0;
    this.levelBricksStart = 0;
    this.levelBallsLost = 0;
    this.levelSpecialTriggered = {};
    this.levelMaxLevel = 0;
  }

  startSession() {
    this.startTime = Date.now();
    this.lastActivityTime = this.startTime;
  }

  setInputMethod(method) {
    if (!this.inputMethod) this.inputMethod = method;
  }

  startLevel(level, totalBricks, currentScore) {
    // Save previous level if exists
    if (this.currentLevel !== null) this._endLevel(false);

    this.currentLevel = level;
    this.levelMaxLevel = Math.max(this.levelMaxLevel, level);
    this.levelStartTime = Date.now();
    this.levelScoreStart = currentScore;
    this.levelBricksStart = totalBricks;
    this.levelBricksDestroyed = 0;
    this.levelBallsLost = 0;
    this.levelSpecialTriggered = {};
  }

  endLevel(completed = true) {
    this._endLevel(completed);
  }

  _endLevel(completed) {
    if (this.currentLevel === null) return;
    this.levelHistory.push({
      level: this.currentLevel,
      completed,
      duration_seconds: (Date.now() - this.levelStartTime) / 1000,
      score_earned: this.score - this.levelScoreStart,
      bricks_destroyed: this.levelBricksDestroyed,
      balls_lost: this.levelBallsLost,
      special_bricks_triggered: { ...this.levelSpecialTriggered },
    });
    this.currentLevel = null;
  }

  recordBrickDestroyed(isTough = false) {
    this.totalBricks++;
    this.levelBricksDestroyed = (this.levelBricksDestroyed || 0) + 1;
    if (isTough) this.toughBricks++;
  }

  recordBallLost() {
    this.ballsLost++;
    if (this.currentLevel !== null) this.levelBallsLost++;
  }

  recordPaddleHit(paddleCenterX, ballX) {
    this.paddleHits++;
    this.interceptGaps.push(Math.abs(paddleCenterX - ballX));
    this.lastActivityTime = Date.now();
  }

  recordPaddleMove(newX) {
    const now = Date.now();
    if (this.lastPaddleX !== null) {
      const delta = newX - this.lastPaddleX;
      const prevDelta = this._prevDelta || 0;
      if (delta * prevDelta < 0 && Math.abs(delta) > 2) {
        this.movementReversals++;
      }
      this._prevDelta = delta;
    }
    // Idle tracking
    if (this.lastActivityTime > 0) {
      const gap = now - this.lastActivityTime;
      if (gap > 500) this.idleMs += gap;
    }
    this.lastPaddleX = newX;
    this.lastActivityTime = now;
  }

  recordSpecialBrick(type, bricksDestroyedByIt = 0) {
    this.specialTriggered[type] = (this.specialTriggered[type] || 0) + 1;
    this.levelSpecialTriggered[type] = (this.levelSpecialTriggered[type] || 0) + 1;
    this.powerupTriggers++;
    this.powerupKills += bricksDestroyedByIt;
  }

  setScore(score) {
    this.score = score;
  }

  getAvgInterceptGap() {
    if (this.interceptGaps.length === 0) return 0;
    return this.interceptGaps.reduce((a, b) => a + b, 0) / this.interceptGaps.length;
  }

  getPowerupEfficiency() {
    if (this.powerupTriggers === 0) return 0;
    return this.powerupKills / this.powerupTriggers;
  }

  buildPayload(status = 'completed', finalScore = 0, levelsCompleted = 0, highestLevel = 0, livesRemaining = 0) {
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
        score: finalScore,
        duration_seconds: (Date.now() - this.startTime) / 1000,
        levels_completed: levelsCompleted,
        highest_level: highestLevel,
        lives_remaining: livesRemaining,
        input_method: this.inputMethod,
        total_bricks_destroyed: this.totalBricks,
        tough_bricks_destroyed: this.toughBricks,
        balls_lost: this.ballsLost,
        paddle_hits: this.paddleHits,
        paddle_miss_rate: this.paddleHits + this.ballsLost > 0
          ? this.ballsLost / (this.paddleHits + this.ballsLost)
          : 0,
        avg_intercept_gap: this.getAvgInterceptGap(),
        movement_reversals: this.movementReversals,
        idle_seconds: this.idleMs / 1000,
        special_bricks_triggered: this.specialTriggered,
        powerup_efficiency: this.getPowerupEfficiency(),
      },
      level_history: this.levelHistory,
    };
  }

  async sendResults(payload) {
    if (!this.callbackUrl) {
      console.warn('[GameMetrics] No callbackUrl set; results not sent');
      return { ok: false, reason: 'no_callback_url' };
    }
    try {
      const res = await fetch(this.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error('[GameMetrics] Callback failed:', res.status, await res.text());
        return { ok: false, reason: 'http_error', status: res.status };
      }
      return { ok: true, data: await res.json() };
    } catch (err) {
      console.error('[GameMetrics] Send error:', err);
      // Cache in localStorage for retry
      try {
        const cache = JSON.parse(localStorage.getItem('pendingGameResults') || '[]');
        cache.push({ url: this.callbackUrl, payload });
        localStorage.setItem('pendingGameResults', JSON.stringify(cache));
      } catch (e) { /* localStorage may be unavailable */ }
      return { ok: false, reason: 'network_error', error: err.message };
    }
  }
}