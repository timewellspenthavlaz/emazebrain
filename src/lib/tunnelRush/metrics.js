/**
 * Tunnel Rush — telemetry. Raw event log + derived session metrics, built so
 * the summary is recomputable from gateEvents[] alone. Results are delivered
 * through the shared sendGameResults utility (lands in GameSession via the
 * existing receiveGameResults backend function).
 */

import { sendGameResults } from '@/lib/gameResultSender';
import { GAME_ID, VERSION, GATES_PER_LEVEL } from './config';

const MAX_STORED_GATES = 250; // cap the per-gate payload for entity field size

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
    this.gateEvents = [];
    this.truncated = false;

    this.score = 0;
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

  recordGate({ gate, lane, hit, reactionMs }) {
    this.gateEvents.push({
      gate: gate.id, t: this._t(), lane, blocked: gate.blocked,
      hit, reactionMs, objects: gate.objects,
    });
    if (this.gateEvents.length > MAX_STORED_GATES) {
      this.gateEvents.splice(0, this.gateEvents.length - MAX_STORED_GATES);
      this.truncated = true;
    }

    if (hit) {
      this.hits += 1;
      this.streak = 0;
      this.score = Math.max(0, this.score - 5);
      this.livesLost += 1;
      this.log('HIT', { gate: gate.id, lane });
    } else {
      this.dodges += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += 10 + Math.min(this.streak, 10) * 2;
      this.log('DODGE', { gate: gate.id, lane, reactionMs });
    }

    const pl = this.perLane[lane] || (this.perLane[lane] = { gates: 0, dodges: 0 });
    pl.gates += 1;
    if (!hit) pl.dodges += 1;
    for (const o of gate.objects) {
      const po = this.perObjectType[o.type] || (this.perObjectType[o.type] = { seen: 0 });
      po.seen += 1;
    }
  }

  recordLevelUp(level) {
    this.level = level;
    this.maxLevelReached = Math.max(this.maxLevelReached, level);
    this.score += GATES_PER_LEVEL * 2.5; // level bonus (rounded at derive time)
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
    const gates = this.gateEvents.length;
    const reactions = this.gateEvents.map((e) => e.reactionMs).filter((r) => r != null);
    return {
      gates,
      dodges: this.dodges,
      hits: this.hits,
      accuracy: gates ? this.dodges / gates : 0,
      hitRate: gates ? this.hits / gates : 0,
      avgReactionMs: this.mean(reactions),
      medianReactionMs: this.median(reactions),
      // gates the patient never rotated for — an attention/engagement flag
      noMoveRate: gates ? (gates - reactions.length) / gates : 0,
      rotations: this.rotations,
      bestStreak: this.bestStreak,
      levelReached: this.maxLevelReached,
      livesRemaining: this.lives > 0 ? Math.max(0, this.lives - this.livesLost) : 0,
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
        gates: this.gateEvents,
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
          warnings: this.truncated ? ['gate_events_truncated'] : [],
        },
      },
      level_history: this.gateEvents.map((e) => ({
        gate: e.gate, hit: e.hit, lane: e.lane, reaction_ms: e.reactionMs,
      })),
    };
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.cfg.callbackUrl);
  }
}