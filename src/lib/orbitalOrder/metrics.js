/**
 * Orbital Order — telemetry. Raw event log + derived session metrics, built so
 * the summary is recomputable from events[] alone. Results are delivered
 * through the shared sendGameResults utility (lands in GameSession).
 */
import { sendGameResults } from '@/lib/gameResultSender';
import { GAME_ID, VERSION, STARTING_LIVES, SCORE_PER_TAP, CHAIN_BONUS } from './config';

export class OrbitalMetrics {
  constructor(cfg) {
    this.cfg = cfg;
    this.sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    this.seed = Math.random().toString(16).slice(2, 8);
    this.startedAt = Date.now();
    this.endedAt = null;
    this.events = [];
    this.trials = [];
    this.ruleHistory = [];

    this.trialStartMs = 0;
    this.lastTapMs = 0;
    this.peekActive = false;
    this.peekStartMs = 0;
    this.peekDurationThisTrial = 0;

    this.baselineLatencies = [];
    this.comprehensionCorrect = 0;
    this.comprehensionTotal = 0;

    // playful layer
    this.score = 0;
    this.livesLost = 0;
    this.maxChain = 0;
    this.chainLengths = [];
  }

  _t() { return Date.now() - this.startedAt; }

  log(type, extra = {}) {
    this.events.push({ t: this._t(), type, ...extra });
  }

  startSession() { this.log('SESSION_START'); }

  startBlock(block, rule) {
    this.ruleHistory.push(rule);
    if (this.ruleHistory.length > 4) this.ruleHistory.shift();
    this.currentBlock = block;
    this.currentRule = rule;
    this.log('BLOCK_START', { block, rule });
  }

  startTrial({ trial, block, isSwitchTrial, rule, chainLength, hasTies, segment }) {
    this.currentTrial = { trial, block, isSwitchTrial, rule, chainLength, hasTies, segment };
    this.trialStartMs = Date.now();
    this.lastTapMs = this.trialStartMs;
    this.peekDurationThisTrial = 0;
    this.committedCount = 0;
    this.correctTapsBeforeBreak = 0;
    this.firstTapLatencyMs = null;
    this.tapLatencies = [];
    this.log('TRIAL_START', { trial, block, isSwitchTrial, chainLength, hasTies, segment });
    this.log('RULE_REVEAL', { trial, block, rule });
  }

  beginResponse() {
    this.log('ENCODE_START', { trial: this.currentTrial.trial });
  }

  recordPeekStart() {
    if (this.peekActive) return;
    this.peekActive = true;
    this.peekStartMs = Date.now();
    this.log('RULE_PEEK', { trial: this.currentTrial.trial, step: this.committedCount, phase: 'start' });
  }
  recordPeekEnd() {
    if (!this.peekActive) return;
    this.peekActive = false;
    const dur = Date.now() - this.peekStartMs;
    this.peekDurationThisTrial += dur;
    this.log('RULE_PEEK', { trial: this.currentTrial.trial, step: this.committedCount, phase: 'end', durationMs: dur });
  }

  recordTap({ sphereId, glyph, color, pos, correct, errorClass }) {
    const sinceTrial = Date.now() - this.trialStartMs;
    const sinceLast = this.lastTapMs ? Date.now() - this.lastTapMs : sinceTrial;
    this.lastTapMs = Date.now();
    if (this.firstTapLatencyMs === null) this.firstTapLatencyMs = sinceTrial;
    this.tapLatencies.push(sinceLast);
    this.log('TAP', {
      trial: this.currentTrial.trial, block: this.currentBlock,
      sphereId, glyph, color, pos, correct, errorClass,
      sinceTrialStartMs: sinceTrial, sinceLastTapMs: sinceLast,
    });
    if (correct) {
      this.committedCount++;
      this.correctTapsBeforeBreak++;
      this.score += SCORE_PER_TAP;
    }
  }

  // Awarded when a full chain is completed.
  addChainBonus() {
    this.score += CHAIN_BONUS;
    this.chainLengths.push(this.correctTapsBeforeBreak);
    this.maxChain = Math.max(this.maxChain, this.correctTapsBeforeBreak);
    this.log('CHAIN_BONUS', { length: this.correctTapsBeforeBreak, bonus: CHAIN_BONUS });
  }

  loseLife() {
    this.livesLost += 1;
    this.log('LIFE_LOST', { livesLost: this.livesLost });
  }

  recordMotorTap(latencyMs) {
    this.baselineLatencies.push(latencyMs);
    this.log('MOTOR_TAP', { latencyMs, trial: this.currentTrial?.trial });
  }

  endTrial({ outcome, errorClass }) {
    const t = this.currentTrial;
    if (!t) return;
    const totalTimeMs = Date.now() - this.trialStartMs;
    const trialRecord = {
      trial: t.trial, block: t.block, segment: t.segment, isSwitchTrial: t.isSwitchTrial,
      rule: t.rule, chainLength: t.chainLength, hasTies: t.hasTies,
      correctTapsBeforeBreak: this.correctTapsBeforeBreak,
      outcome, errorClass,
      firstTapLatencyMs: this.firstTapLatencyMs,
      totalTimeMs,
      interTapLatencies: this.tapLatencies.slice(1),
      ruleRecheckCount: this.peekDurationThisTrial > 0 ? this.events.filter((e) => e.type === 'RULE_PEEK' && e.phase === 'start' && e.trial === t.trial).length : 0,
    };
    this.trials.push(trialRecord);
    this.log('TRIAL_END', { trial: t.trial, outcome, errorClass, totalTimeMs });

    if (t.segment === 'PRACTICE') {
      this.comprehensionTotal++;
      if (outcome === 'CORRECT') this.comprehensionCorrect++;
    }
  }

  // Kept as a no-op for callers that still reference it (perseveration detection
  // was removed with the traversal clause).
  setPrevExpectedChain() {}

  endSession(endReason, completed = true) {
    this.endedAt = Date.now();
    this.log('SESSION_END', { endReason, completed });
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
    const scored = this.trials.filter((t) => t.segment === 'PROBE' || t.segment === 'RULES');
    const correctTrials = scored.filter((t) => t.outcome === 'CORRECT').length;
    const accuracy = scored.length ? correctTrials / scored.length : 0;

    const firstTaps = scored.map((t) => t.firstTapLatencyMs).filter(Boolean);
    const interTaps = scored.flatMap((t) => t.interTapLatencies).filter(Boolean);

    const switchTrials = scored.filter((t) => t.isSwitchTrial);
    const steadyTrials = scored.filter((t) => !t.isSwitchTrial);
    const ruleSwitchCostMs = (switchTrials.length && steadyTrials.length)
      ? this.mean(switchTrials.map((t) => t.firstTapLatencyMs).filter(Boolean)) - this.mean(steadyTrials.map((t) => t.firstTapLatencyMs).filter(Boolean))
      : 0;

    const errorClasses = ['INHIBITION_ERROR', 'ORDER_ERROR', 'TIMEOUT'];
    const errorTotal = scored.filter((t) => t.errorClass).length;
    const errorProfile = {};
    for (const c of errorClasses) {
      const cnt = scored.filter((t) => t.errorClass === c).length;
      errorProfile[c] = errorTotal ? cnt / errorTotal : 0;
    }
    const inhibitionIndex = errorProfile.INHIBITION_ERROR || 0;

    const probeTrials = this.trials.filter((t) => t.segment === 'PROBE');
    const probeAccuracy = probeTrials.length ? probeTrials.filter((t) => t.outcome === 'CORRECT').length / probeTrials.length : 0;
    const probeFirstTap = probeTrials.map((t) => t.firstTapLatencyMs).filter(Boolean);

    let fatigueSlope = 0;
    if (scored.length >= 4) {
      const half = Math.floor(scored.length / 2);
      const a1 = scored.slice(0, half).filter((t) => t.outcome === 'CORRECT').length / scored.slice(0, half).length;
      const a2 = scored.slice(half).filter((t) => t.outcome === 'CORRECT').length / Math.max(1, scored.slice(half).length);
      fatigueSlope = a2 - a1;
    }

    const baselineTapLatencyMs = this.baselineLatencies.length ? this.median(this.baselineLatencies) : 0;
    const ruleRecheckCount = this.mean(scored.map((t) => t.ruleRecheckCount));
    const planningRatio = (this.mean(firstTaps) && this.mean(interTaps)) ? this.mean(firstTaps) / this.mean(interTaps) : 0;
    const comprehensionGate = this.comprehensionTotal === 0 ? 'SKIPPED' : (this.comprehensionCorrect >= Math.ceil(this.comprehensionTotal * 0.66) ? 'PASSED' : 'FAILED');

    return {
      score: this.score,
      livesLost: this.livesLost,
      livesRemaining: Math.max(0, STARTING_LIVES - this.livesLost),
      maxChain: this.maxChain,
      meanChainLength: this.chainLengths.length ? this.mean(this.chainLengths) : 0,
      trialsOffered: scored.length,
      trialsAttempted: scored.length,
      accuracy,
      chainCompletionRate: accuracy,
      firstTapLatencyMs: this.mean(firstTaps),
      interTapLatencyMs: this.mean(interTaps),
      planningRatio,
      ruleSwitchCostMs,
      inhibitionIndex,
      fatigueSlope,
      ruleRecheckCount,
      baselineTapLatencyMs,
      probeAccuracy,
      probeFirstTapLatencyMs: this.mean(probeFirstTap),
      comprehensionGate,
      errorProfile,
      motorBaselineTrials: this.baselineLatencies.length,
    };
  }

  buildPayload(status = 'completed', endReason = 'COMPLETED') {
    const summary = this.derive();
    const durationMs = (this.endedAt || Date.now()) - this.startedAt;

    return {
      game_id: GAME_ID,
      patient_id: this.cfg.patientId || 'demo',
      session_id: this.sessionId,
      version: VERSION,
      metadata: {
        version: VERSION,
        game_id: GAME_ID,
        timestamp: new Date(this.startedAt).toISOString(),
        patient_id: this.cfg.patientId,
        session_id: this.sessionId,
      },
      status,
      metrics: {
        score: this.score,
        duration_seconds: durationMs / 1000,
        levels_completed: summary.trialsAttempted,
        highest_level: this.cfg.difficulty_level,
        lives_remaining: summary.livesRemaining,
        input_method: 'touch',
        seed: this.seed,
        endReason,
        summary,
        config: {
          br: this.cfg.br, difficulty_level: this.cfg.difficulty_level,
          time_to_play: this.cfg.time_to_play, countdown_timer: this.cfg.countdown_timer,
          orientation: this.cfg.orientation, bg: this.cfg.bg, neon: this.cfg.neon,
          rule_visible: this.cfg.rule_visible, glyphType: this.cfg.glyphType,
          reduce_motion: this.cfg.reduce_motion, lang: this.cfg.lang,
          starting_lives: STARTING_LIVES,
        },
        trials: this.trials,
        integrity: { warnings: [] },
      },
      level_history: this.trials.map((t) => ({ trial: t.trial, outcome: t.outcome, errorClass: t.errorClass })),
    };
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.cfg.callbackUrl);
  }
}