/**
 * Peek Peek — metrics instrumentation + payload builder.
 *
 * Implements the full clinical metric set from the spec: primary
 * first_round_misses_mean, the CANTAB-SWM within/between/novel error split,
 * latency, strategy, laterality on symmetric probe levels only, the
 * face-up control trial, and data-quality flags. Mirrors the sibling
 * games' Metrics-class pattern and posts through sendGameResults.
 */

import { GAME_ID, VERSION, MAX_LEVEL } from './config';
import { sendGameResults } from '@/lib/gameResultSender';

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function linSlope(points) {
  // points: [{x,y}]; least squares slope; null if <2 points or zero variance
  if (points.length < 2) return null;
  const n = points.length;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

export class PeekPeekMetrics {
  constructor(cfg, bg, sessionId) {
    this.cfg = cfg;
    this.bg = bg;
    this.sessionId = sessionId || null;
    this.sessionStart = Date.now();
    this.levels = [];
    this.curLevel = null;
    this.curRound = null;
    this.inputMethod = null;
    this.longestStreak = 0;
    this.curStreak = 0;
    this.suspectedAccidental = 0;
    this.stallEvents = 0;
    this.idleSeconds = 0;
    this.packsUsed = new Set();
    this.control = null; // { rounds, completed }
    this.lastActive = Date.now();
  }

  setInputMethod(m) {
    if (m && !this.inputMethod) this.inputMethod = m;
  }
  noteActive() {
    const now = Date.now();
    this.idleSeconds += Math.max(0, (now - this.lastActive) / 1000 - 1.5);
    this.lastActive = now;
  }
  recordStall() {
    this.stallEvents++;
    this.idleSeconds += 20;
  }

  // ---- control trial (face-up, perception only) ----
  startControl(packName) {
    this.control = { pack: packName, rounds: [], completed: false, cur: null };
  }
  startControlRound(targetIndex, copies) {
    this.control.cur = {
      targetIndex, copies, firstTapX: null, firstTapLatencyMs: null,
      tapSequence: [], leftRanks: [], rightRanks: [], found: 0, start: Date.now(),
    };
  }
  recordControlTap({ hexId, correct, x }) {
    const r = this.control.cur;
    if (!r) return;
    const side = x < 0 ? -1 : x > 0 ? 1 : 0;
    const now = Date.now();
    const dt = r.firstTapX === null ? now - r.start : now - (r.lastTapTime || r.start);
    if (r.firstTapX === null) {
      r.firstTapX = x;
      r.firstTapLatencyMs = dt;
    }
    r.tapSequence.push({ hex: hexId, correct, side });
    if (correct) {
      r.found++;
      const rank = r.tapSequence.filter((t) => t.correct).length;
      if (side < 0) r.leftRanks.push(rank);
      else if (side > 0) r.rightRanks.push(rank);
    }
    r.lastTapTime = now;
  }
  endControlRound() {
    if (this.control?.cur) this.control.rounds.push(this.control.cur);
    this.control.cur = null;
  }
  endControl() {
    if (this.control) this.control.completed = true;
  }

  // ---- levels ----
  startLevel(meta, cellsMeta) {
    this.curLevel = {
      ...meta,
      heartsLost: 0,
      attempts: 1,
      completed: false,
      failReason: null,
      durationMs: 0,
      scoreEarned: 0,
      rounds: [],
      reReveals: 0,
      revealedHexes: new Set(),
      claimedHexes: new Set(),
      levelStart: Date.now(),
      nmap: cellsMeta?.nmap || {},
      sideOf: cellsMeta?.sideOf || {},
    };
    this.packsUsed.add(meta.pack);
  }

  startRound(targetIndex, copies) {
    const start = Date.now();
    this.curRound = {
      targetIndex,
      copies,
      misses: 0,
      withinSearchErrors: 0,
      betweenSearchErrors: 0,
      novelHexErrors: 0,
      firstTapCorrect: null,
      firstTapLatencyMs: null,
      firstTapX: null,
      firstTapSide: null,
      tapSequence: [],
      shownWrong: new Set(), // hexes shown wrong for the CURRENT target
      roundStart: start,
      lastTapTime: start,
      reRevealCount: 0,
      firstTapDone: false,
      leftRanks: [],
      rightRanks: [],
      leftWithin: 0,
      rightWithin: 0,
      leftNovel: 0,
      rightNovel: 0,
      leftFirstLat: null,
      rightFirstLat: null,
    };
  }

  recordTap({ hexId, correct, x, isReveal, accidental }) {
    const r = this.curRound;
    const L = this.curLevel;
    if (!r || !L) return;
    const side = x < 0 ? -1 : x > 0 ? 1 : 0;
    const now = Date.now();
    const dt = r.firstTapDone ? now - r.lastTapTime : now - r.roundStart;

    if (accidental) {
      this.suspectedAccidental++;
      // excluded from error metrics; still record in sequence
      r.tapSequence.push({ hex: hexId, correct, dt_ms: dt });
      return;
    }

    // adjacency_ratio: consecutive taps that are hex neighbours
    if (r.tapSequence.length) {
      const prev = r.tapSequence[r.tapSequence.length - 1].hex;
      L.totalPairs = (L.totalPairs || 0) + 1;
      if (L.nmap[prev] && L.nmap[prev].includes(hexId)) L.adjPairs = (L.adjPairs || 0) + 1;
    }

    if (!r.firstTapDone) {
      r.firstTapDone = true;
      r.firstTapCorrect = correct;
      r.firstTapLatencyMs = dt;
      r.firstTapX = x;
      r.firstTapSide = side;
      if (side < 0) r.leftFirstLat = dt;
      else if (side > 0) r.rightFirstLat = dt;
    }

    if (correct) {
      L.claimedHexes.add(hexId);
      L.revealedHexes.add(hexId);
      r.tapSequence.push({ hex: hexId, correct: true, dt_ms: dt, side });
      const rank = r.tapSequence.filter((t) => t.correct).length;
      if (side < 0) r.leftRanks.push(rank);
      else if (side > 0) r.rightRanks.push(rank);
      this.curStreak++;
      if (this.curStreak > this.longestStreak) this.longestStreak = this.curStreak;
    } else {
      r.misses++;
      L.heartsLost = (L.heartsLost || 0) + 1;
      L.revealedHexes.add(hexId);
      r.shownWrong.add(hexId);
      // error taxonomy
      // classify: within = shown wrong for current target already; between = revealed/claimed earlier; novel = never revealed
      let cls;
      if (r.shownWrong.has(hexId)) cls = 'within';
      else if (L.revealedHexes.has(hexId)) cls = 'between';
      else cls = 'novel';
      if (cls === 'within') r.withinSearchErrors++;
      else if (cls === 'between') r.betweenSearchErrors++;
      else r.novelHexErrors++;
      // side attribution for laterality
      if (side < 0) {
        if (cls === 'within') r.leftWithin++;
        else if (cls === 'novel') r.leftNovel++;
      } else if (side > 0) {
        if (cls === 'within') r.rightWithin++;
        else if (cls === 'novel') r.rightNovel++;
      }
      r.tapSequence.push({ hex: hexId, correct: false, dt_ms: dt, side, cls });
      if (isReveal) {
        r.reRevealCount++;
        L.reReveals++;
      }
      this.curStreak = 0;
    }
    r.lastTapTime = now;
  }

  endRound() {
    if (this.curRound && this.curLevel) {
      this.curLevel.rounds.push(this.serializeRound(this.curRound));
    }
    this.curRound = null;
  }

  serializeRound(r) {
    return {
      target_index: r.targetIndex,
      copies: r.copies,
      misses: r.misses,
      within_search_errors: r.withinSearchErrors,
      between_search_errors: r.betweenSearchErrors,
      novel_hex_errors: r.novelHexErrors,
      first_tap_correct: r.firstTapCorrect,
      first_tap_latency_ms: r.firstTapLatencyMs,
      first_tap_x: r.firstTapX,
      re_reveal_count: r.reRevealCount,
      left_ranks: r.leftRanks,
      right_ranks: r.rightRanks,
      left_within: r.leftWithin,
      right_within: r.rightWithin,
      left_novel: r.leftNovel,
      right_novel: r.rightNovel,
      left_first_lat: r.leftFirstLat,
      right_first_lat: r.rightFirstLat,
      tap_sequence: r.tapSequence.map((t) => ({ hex: t.hex, correct: t.correct, dt_ms: t.dt_ms, side: t.side, cls: t.cls })),
    };
  }

  passLevel(award) {
    if (!this.curLevel) return;
    this.curLevel.completed = true;
    this.curLevel.scoreEarned = award || 0;
    this.curLevel.durationMs = Date.now() - this.curLevel.levelStart;
    this.levels.push(this.serializeLevel(this.curLevel));
    this.curLevel = null;
  }

  failLevel(reason) {
    if (!this.curLevel) return;
    this.curLevel.completed = false;
    this.curLevel.failReason = reason || 'hearts';
    this.curLevel.durationMs = Date.now() - this.curLevel.levelStart;
    this.levels.push(this.serializeLevel(this.curLevel));
    this.curLevel = null;
  }

  /** Mid-level flush on a hard timer stop (partial round retained). */
  flushPartialLevel(reason) {
    if (this.curRound) {
      this.endRound();
    }
    if (this.curLevel) {
      this.curLevel.completed = false;
      this.curLevel.failReason = reason || 'timer';
      this.curLevel.durationMs = Date.now() - this.curLevel.levelStart;
      this.levels.push(this.serializeLevel(this.curLevel));
      this.curLevel = null;
    }
  }

  serializeLevel(L) {
    return {
      level: L.level,
      board_id: L.boardId,
      total_hexes: L.T,
      distinct_pictures: L.K,
      copy_partition: L.partition,
      realised_adjacency: L.realisedAdjacency,
      study_seconds: L.studySeconds,
      heart_budget: L.heartBudget,
      hearts_lost: L.heartsLost,
      attempts: L.attempts,
      completed: L.completed,
      fail_reason: L.failReason,
      is_symmetric_probe: L.isProbe,
      pack: L.pack,
      duration_seconds: Math.round(L.durationMs / 1000),
      score_earned: L.scoreEarned,
      adj_pairs: L.adjPairs || 0,
      total_pairs: L.totalPairs || 0,
      rounds: L.rounds,
    };
  }

  // ---- aggregates ----
  buildPayload(status, highestLevel, livesRemaining) {
    const cfg = this.cfg;
    const levels = this.levels;
    const completedLevels = levels.filter((l) => l.completed);
    const levelsCompleted = completedLevels.length;
    const totalScore = levels.reduce((a, l) => a + (l.score_earned || 0), 0);

    // error aggregates over rounds
    const allRounds = levels.flatMap((l) => l.rounds);
    const totalErrors = allRounds.reduce((a, r) => a + r.misses, 0);
    const withinSearch = allRounds.reduce((a, r) => a + r.within_search_errors, 0);
    const betweenSearch = allRounds.reduce((a, r) => a + r.between_search_errors, 0);
    const novelHex = allRounds.reduce((a, r) => a + r.novel_hex_errors, 0);

    // first_round_misses_mean (PRIMARY) — misses in each level's first round
    const firstRoundMisses = levels
      .filter((l) => l.rounds.length > 0)
      .map((l) => l.rounds[0].misses);
    const firstRoundMissesMean = firstRoundMisses.length ? mean(firstRoundMisses) : 0;

    // total_errors_adjusted — coarse model estimate for unreached levels (TBD convention)
    const remaining = Math.max(0, cfg.max_level - highestLevel);
    const totalErrorsAdjusted = totalErrors + firstRoundMissesMean * remaining;

    // first_attempt_accuracy (raw + ex-final-round)
    const faRounds = allRounds.filter((r) => r.first_tap_correct !== null);
    const faCorrect = faRounds.filter((r) => r.first_tap_correct).length;
    const firstAttemptAcc = faRounds.length ? faCorrect / faRounds.length : null;
    const exFinal = levels
      .filter((l) => l.rounds.length >= 2)
      .flatMap((l) => l.rounds.slice(0, -1))
      .filter((r) => r.first_tap_correct !== null);
    const exFinalCorrect = exFinal.filter((r) => r.first_tap_correct).length;
    const firstAttemptAccExFinal = exFinal.length ? exFinalCorrect / exFinal.length : null;

    // learning_slope — misses per successive re-reveal within a level
    const slopePoints = [];
    let slopeN = 0;
    for (const l of levels) {
      if (l.rounds.length < 2) continue;
      // bucket misses by re-reveal index across the level's rounds
      const buckets = {};
      for (const r of l.rounds) {
        // misses before first re-reveal = bucket 0; each re-reveal starts next bucket
        let bIdx = 0;
        // reconstruct from tap sequence isn't stored; approximate with reRevealCount per round
        // use round's own reRevealCount spread: distribute misses across buckets up to reRevealCount+1
        const nB = (r.re_reveal_count || 0) + 1;
        if (nB > 1) {
          for (let b = 0; b < nB; b++) {
            buckets[b] = (buckets[b] || 0) + r.misses / nB;
          }
        }
      }
      const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
      if (keys.length >= 2) {
        slopeN++;
        for (const k of keys) slopePoints.push({ x: k, y: buckets[k] });
      }
    }
    const learningSlope = linSlope(slopePoints);

    // latency
    const firstTapLats = allRounds.map((r) => r.first_tap_latency_ms).filter((v) => v != null);
    const interTaps = [];
    const interTapSlopePts = [];
    for (const r of allRounds) {
      let prev = null;
      let idx = 0;
      for (const t of r.tap_sequence) {
        if (prev != null) {
          const dt = t.dt_ms;
          interTaps.push(dt);
          interTapSlopePts.push({ x: idx, y: dt });
          idx++;
        }
        prev = t;
      }
    }
    const avgFirstTapLat = mean(firstTapLats);
    const medianFirstTapLat = median(firstTapLats);
    const avgInterTap = mean(interTaps);
    const interTapSlope = linSlope(interTapSlopePts);

    // strategy
    const adjPairs = levels.reduce((a, l) => a + (l.adj_pairs || 0), 0);
    const totalPairs = levels.reduce((a, l) => a + (l.total_pairs || 0), 0);
    const adjacencyRatio = totalPairs ? adjPairs / totalPairs : null;
    const firstTapXs = allRounds.map((r) => r.first_tap_x).filter((v) => v != null);
    const ftMean = mean(firstTapXs) || 0;
    const ftStd = firstTapXs.length ? Math.sqrt(mean(firstTapXs.map((v) => (v - ftMean) ** 2))) : 0;
    const scanStartConsistency = firstTapXs.length ? Math.max(0, 1 - ftStd / 2) : null;
    const perseverationRate = withinSearch + betweenSearch + novelHex > 0
      ? withinSearch / (withinSearch + betweenSearch + novelHex)
      : null;
    const searchOrganisation = (() => {
      const parts = [adjacencyRatio, scanStartConsistency, perseverationRate == null ? null : 1 - perseverationRate].filter((v) => v != null);
      return parts.length ? mean(parts) : null;
    })();

    // laterality — symmetric probe levels only
    const probeLevels = levels.filter((l) => l.is_symmetric_probe);
    const probeLevelsUsed = probeLevels.map((l) => l.level);
    const probeCount = probeLevels.length;
    const laterality = this._computeLaterality(probeLevels);
    const controlLaterality = this.control?.completed ? this._computeControlLaterality() : null;

    // capacity estimate — highest level completed with ≤1 miss
    const capacity = completedLevels
      .filter((l) => l.rounds.reduce((a, r) => a + r.misses, 0) <= 1)
      .map((l) => l.level)
      .reduce((m, v) => Math.max(m, v), 0);

    // data quality
    const floorFlag = levels.some((l) => !l.completed && l.level <= 2);
    const ceilingFlag = highestLevel >= cfg.max_level && totalErrors === 0;

    const metrics = {
      score: totalScore,
      duration_seconds: Math.round((Date.now() - this.sessionStart) / 1000),
      levels_completed: levelsCompleted,
      highest_level: highestLevel,
      lives_remaining: cfg.lives === 0 ? null : livesRemaining,
      input_method: this.inputMethod || 'mouse',

      pack: cfg.pack,
      packs_used: [...this.packsUsed],
      orientation: cfg.orientation,
      hidden_count: cfg.hidden_count,
      study_time_override: cfg.study_time,
      br: cfg.br,
      palette_band: cfg.paletteBand,
      bg_mode: this.bg?.mode || cfg.bg || null,
      bg_colour: this.bg?.baseHex || null,
      bg_colour_name: this.bg?.name || null,
      difficulty_level: cfg.difficulty_level,

      // primary clinical outcomes
      first_round_misses_mean: Number(firstRoundMissesMean.toFixed(3)),
      novel_hex_errors: novelHex,
      total_errors_adjusted: Number(totalErrorsAdjusted.toFixed(3)),
      first_attempt_accuracy: firstAttemptAcc,
      first_attempt_accuracy_ex_final: firstAttemptAccExFinal,
      learning_slope: learningSlope == null ? null : Number(learningSlope.toFixed(4)),
      learning_slope_n: slopeN,
      capacity_estimate: capacity,

      // error taxonomy
      within_search_errors: withinSearch,
      between_search_errors: betweenSearch,
      novel_hex_errors_dup: novelHex,
      perseveration_rate: perseverationRate,

      // latency
      avg_first_tap_latency_ms: avgFirstTapLat == null ? null : Math.round(avgFirstTapLat),
      median_first_tap_latency_ms: medianFirstTapLat == null ? null : Math.round(medianFirstTapLat),
      avg_inter_tap_interval_ms: avgInterTap == null ? null : Math.round(avgInterTap),
      inter_tap_slope_ms: interTapSlope == null ? null : Math.round(interTapSlope),

      // strategy
      adjacency_ratio: adjacencyRatio == null ? null : Number(adjacencyRatio.toFixed(3)),
      scan_start_consistency: scanStartConsistency == null ? null : Number(scanStartConsistency.toFixed(3)),
      search_organisation: searchOrganisation == null ? null : Number(searchOrganisation.toFixed(3)),

      // laterality (probe levels only)
      find_order_index: laterality.findOrderIndex,
      mean_first_tap_x: laterality.meanFirstTapX,
      first_tap_latency_asymmetry_ms: laterality.firstTapLatencyAsym,
      perseveration_asymmetry: laterality.perseverationAsym,
      novel_error_asymmetry: laterality.novelErrorAsym,
      probe_levels_used: probeLevelsUsed,
      probe_count: probeCount,
      reference_frame: 'viewport_centre',

      // control trial
      control_trial_completed: !!this.control?.completed,
      control_find_order_index: controlLaterality?.findOrderIndex ?? null,
      control_mean_first_tap_x: controlLaterality?.meanFirstTapX ?? null,
      control_first_tap_latency_asymmetry_ms: controlLaterality?.firstTapLatencyAsym ?? null,

      // data quality
      suspected_accidental_taps: this.suspectedAccidental,
      stall_events: this.stallEvents,
      idle_seconds: Math.round(this.idleSeconds),
      floor_flag: floorFlag,
      ceiling_flag: ceilingFlag,

      longest_streak: this.longestStreak,

      // provenance / caveats
      budget_model: 'lambda2.5_expected_miss (not pilot-fitted)',
      art_status: 'placeholder (<14 per pack; commissioned art pending P4)',
    };

    return {
      game_id: GAME_ID,
      patient_id: cfg.patientId,
      patient_name: '',
      session_id: this._sessionId(),
      session_date: new Date().toISOString(),
      version: VERSION,
      score: totalScore,
      duration_seconds: metrics.duration_seconds,
      levels_completed: levelsCompleted,
      highest_level: highestLevel,
      lives_remaining: metrics.lives_remaining,
      input_method: metrics.input_method,
      metrics,
      level_history: levels.map((l) => ({
        level: l.level,
        board_id: l.board_id,
        total_hexes: l.total_hexes,
        distinct_pictures: l.distinct_pictures,
        copy_partition: l.copy_partition,
        realised_adjacency: l.realised_adjacency,
        study_seconds: l.study_seconds,
        heart_budget: l.heart_budget,
        hearts_lost: l.hearts_lost,
        attempts: l.attempts,
        completed: l.completed,
        fail_reason: l.fail_reason,
        is_symmetric_probe: l.is_symmetric_probe,
        pack: l.pack,
        duration_seconds: l.duration_seconds,
        score_earned: l.score_earned,
        rounds: l.rounds.map((r) => ({
          target_index: r.target_index,
          copies: r.copies,
          misses: r.misses,
          within_search_errors: r.within_search_errors,
          between_search_errors: r.between_search_errors,
          novel_hex_errors: r.novel_hex_errors,
          first_tap_correct: r.first_tap_correct,
          first_tap_latency_ms: r.first_tap_latency_ms,
          first_tap_x: r.first_tap_x,
          tap_sequence: r.tap_sequence,
        })),
      })),
      status,
    };
  }

  _levelNmap(L) {
    return L._nmap;
  }

  _computeLaterality(probeLevels) {
    if (!probeLevels.length) {
      return { findOrderIndex: null, meanFirstTapX: null, firstTapLatencyAsym: null, perseverationAsym: null, novelErrorAsym: null };
    }
    const foiVals = [];
    const ftX = [];
    const leftLats = [];
    const rightLats = [];
    let leftWithin = 0;
    let rightWithin = 0;
    let leftNovel = 0;
    let rightNovel = 0;
    for (const l of probeLevels) {
      for (const r of l.rounds) {
        if (r.first_tap_x != null) {
          ftX.push(r.first_tap_x);
          if (r.first_tap_x < 0 && r.left_first_lat != null) leftLats.push(r.left_first_lat);
          else if (r.first_tap_x > 0 && r.right_first_lat != null) rightLats.push(r.right_first_lat);
        }
        const lr = r.left_ranks || [];
        const rr = r.right_ranks || [];
        if (lr.length || rr.length) {
          const lm = lr.length ? mean(lr) : 0;
          const rm = rr.length ? mean(rr) : 0;
          const denom = (lr.length + rr.length) || 1;
          foiVals.push((lm - rm) / denom); // positive = right copies found earlier = rightward
        }
        leftWithin += r.left_within || 0;
        rightWithin += r.right_within || 0;
        leftNovel += r.left_novel || 0;
        rightNovel += r.right_novel || 0;
      }
    }
    const totalWithin = leftWithin + rightWithin || 1;
    const totalNovel = leftNovel + rightNovel || 1;
    return {
      findOrderIndex: foiVals.length ? Number(mean(foiVals).toFixed(3)) : null,
      meanFirstTapX: ftX.length ? Number(mean(ftX).toFixed(3)) : null,
      firstTapLatencyAsym: leftLats.length && rightLats.length ? Math.round(mean(leftLats) - mean(rightLats)) : null,
      perseverationAsym: Number(((leftWithin - rightWithin) / totalWithin).toFixed(3)),
      novelErrorAsym: Number(((leftNovel - rightNovel) / totalNovel).toFixed(3)),
    };
  }

  _computeControlLaterality() {
    const rounds = this.control.rounds || [];
    if (!rounds.length) return null;
    const ftX = [];
    const leftLats = [];
    const rightLats = [];
    const foiVals = [];
    for (const r of rounds) {
      if (r.firstTapX != null) {
        ftX.push(r.firstTapX);
        if (r.firstTapX < 0) leftLats.push(r.firstTapLatencyMs);
        else if (r.firstTapX > 0) rightLats.push(r.firstTapLatencyMs);
      }
      if (r.leftRanks.length || r.rightRanks.length) {
        const lm = r.leftRanks.length ? mean(r.leftRanks) : 0;
        const rm = r.rightRanks.length ? mean(r.rightRanks) : 0;
        const denom = (r.leftRanks.length + r.rightRanks.length) || 1;
        foiVals.push((lm - rm) / denom);
      }
    }
    return {
      findOrderIndex: foiVals.length ? Number(mean(foiVals).toFixed(3)) : null,
      meanFirstTapX: ftX.length ? Number(mean(ftX).toFixed(3)) : null,
      firstTapLatencyAsym: leftLats.length && rightLats.length ? Math.round(mean(leftLats) - mean(rightLats)) : null,
    };
  }

  _sessionId() {
    if (this.sessionId) return this.sessionId;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `pp-${Date.now()}`;
  }

  async sendResults(payload) {
    return sendGameResults(payload, this.cfg.callbackUrl);
  }
}