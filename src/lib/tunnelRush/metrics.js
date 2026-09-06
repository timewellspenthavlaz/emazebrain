/**
 * Tunnel Rush — telemetry. Raw event log + derived session metrics, built so
 * the summary is recomputable from obstacleEvents[] alone. Results are
 * delivered through the shared sendGameResults utility (lands in GameSession
 * via the existing receiveGameResults backend function).
 *
 * Hybrid scoring: steady points per distance unit travelled + a dodge bonus
 * with a streak multiplier per obstacle passed (capped as before).
 */

import { sendGameResults } from '@/lib/gameResultSender';
import { GAME_ID, VERSION, OBSTACLES_PER_LEVEL } from './config';

const MAX_STORED_OBSTACLES = 250; // cap the per-obstacle payload for entity field size
const DISTANCE_POINTS_PER_UNIT = 0.5;
const HIT_PENALTY = 5;

export class TunnelRushMetrics {
  constructor(cfg) {
    this.cfg = cfg;
    this.lives = cfg.lives; // 0 = endless
    this.sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tr-${Date.now()}`;
    this.startedAt = Date.now();
    this.endedAt = null;
    this.events = [];
    this.obstacleEvents = [];
    this.truncated = false;

    this.score = 0;          // hybrid total (fractional; rounded at payload time)
    this.dodgePoints = 0;
    this.distancePoints = 0;
    this.distanceUnits = 0;
    this.hits = 0;
    this.dodges = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.livesLost = 0;
    this.level = cfg.level;
    this.maxLevelReached = cfg.level;
    this.rotations = 0;
    this.perLane = {};
    this.perObjectType = {};
  }

  _t() { return Date.now() - this.startedAt; }

  log(type, extra = {}) {
    this.events.push({ t: this._t(), type, ...extra });
  }

  startSession() { this.log('SESSION_START'); }
  setRotations(n) { this.rotations = n; }

  recordRotation(dir) {
    this.log('ROTATE', { dir });
  }

  // Hybrid scoring: steady points per distance unit travelled.
  addDistance(units) {
    if (!units || units <= 0) return;
    this.distanceUnits += units;
    const pts = units * DISTANCE_POINTS_PER_UNIT;
    this.distancePoints += pts;
    this.score += pts;
  }

  recordObstacle({ obstacle, lane, hit, reactionMs, speed }) {
    this.obstacleEvents.push({
      obstacle: obstacle.id, t: this._t(), lane, hit, reactionMs, speed,
      type: obstacle.type, label: obstacle.label,
    });
    if (this.obstacleEvents.length > MAX_STORED_OBSTACLES) {
      this.obstacleEvents.splice(0, this.obstacleEvents.length - MAX_STORED_OBSTACLES);
      this.truncated = true;
    }

    if (hit) {
      this.hits += 1;
      this.streak = 0;
      this.score = Math.max(0, this.score - HIT_PENALTY);
      this.livesLost += 1;
      this.log('HIT', { obstacle: obstacle.id, lane });
    } else {
      this.dodges += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const gain = 10 + Math.min(this.streak, 10) * 2;
      this.dodgePoints += gain;
      this.score += gain;
      this.log('DODGE', { obstacle: obstacle.id, lane, reactionMs });
    }

    const pl = this.perLane[lane] || (this.perLane[lane] = { obstacles: 0, dodges: 0 });
    pl.obstacles += 1;
    if (!hit) pl.dodges += 1;
    const po = this.perObjectType[obstacle.type] || (this.perObjectType[obstacle.type] = { seen: 0 });
    po.seen += 1;
  }

  recordLevelUp(level) {
    this.level = level;
    this.maxLevelReached = Math.max(this.maxLevelReached, level);
    this.score += OBSTACLES_PER_LEVEL * 2.5; // level bonus (rounded at derive time)
    this.log('LEVEL_UP', { level });
  }

  endSession(endReason) {
    this.endedAt = Date.now();
    this.log('SESSION_END', { endReason });
  }

  /* ---------- Derived metrics ---------- */

  median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

  derive() {
    const obstacles = this.obstacleEvents.length;
    const reactions = this.obstacleEvents.map((e) => e.reactionMs).filter((r) => r != null);
    const speeds = this.obstacleEvents.map((e) => e.speed).filter((s) => s != null);
    return {
      obstacles,
      dodges: this.dodges,
      hits: this.hits,
      accuracy: obstacles ? this.dodges / obstacles : 0,
      hitRate: obstacles ? this.hits / obstacles : 0,
      avgReactionMs: this.mean(reactions),
      medianReactionMs: this.median(reactions),
      // obstacles the patient never rotated for — an attention/engagement flag
      noMoveRate: obstacles ? (obstacles - reactions.length) / obstacles : 0,
      rotations: this.rotations,
      bestStreak: this.bestStreak,
      levelReached: this.maxLevelReached,
      livesRemaining: this.lives > 0 ? Math.max(0, this.lives - this.livesLost) : 0,
      // hybrid score breakdown
      distanceUnits: this.distanceUnits,
      distancePoints: this.distancePoints,
      dodgePoints: this.dodgePoints,
      // adaptive-speed profile
      avgSpeed: this.mean(speeds),
      speedStart: speeds.length ? speeds[0] : null,
      speedEnd: speeds.length ? speeds[speeds.length - 1] : null,
      perLane: this.perLane,
      perObjectType: this.perObjectType,
    };
  }

  buildPayload(status = 'completed', endReason = 'TIME_BUDGET') {
    const summary = this.derive();
    const durationMs = (this.endedAt || Date.now()) - this.startedAt;
    return {
      game_id: GAME_ID,
      patient_id: this.cfg.patientId || 'demo',
      patient_name: '',
      session_id: this.sessionId,
      session_date: new Date(this.startedAt).toISOString(),
      version: VERSION,
      status,
      metrics: {
        score: Math.round(this.score),
        duration_seconds: durationMs / 1000,
        levels_completed: Math.max(0, this.maxLevelReached - this.cfg.level),
        highest_level: this.maxLevelReached,
        lives_remaining: summary.livesRemaining,
        input_method: 'touch/keys',
        endReason,
        summary,
        obstacles: this.obstacleEvents,
        config: {
          objectType: this.cfg.objectType, difficulty: this.cfg.difficulty,
          startLevel: this.cfg.level, lanes: this.cfg.lanes,
          direction: this.cfg.direction, spinSpeed: this.cfg.spinSpeed,
          progressive: this.cfg.progressive, theme: this.cfg.theme,
          scene: this.cfg.scene, lives: this.cfg.lives,
          time_to_play: this.cfg.timeToPlay, timerPosition: this.cfg.timerPosition,
          objectOrientation: this.cfg.objectOrientation, lang: this.cfg.lang,
        },
        integrity: {
          warnings: this.truncated ? ['obstacle_events_truncated'] : [],
        },
      },
      level_history: this.obstacleEvents.map((e) => ({
        obstacle: e.obstacle, hit: e.hit, lane: e.lane, reaction_ms: e.reactionMs,
      })),
    };
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.cfg.callbackUrl);
  }
}