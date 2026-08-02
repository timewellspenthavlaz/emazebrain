import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Activity, Timer, CheckCircle2, XCircle } from 'lucide-react';
import Hud from '@/components/orbital/Hud';
import RuleModal from '@/components/orbital/RuleModal';
import PlayField from '@/components/orbital/PlayField';
import { OrbitalMetrics } from '@/lib/orbitalOrder/metrics';
import {
  parseParams, resolveBg, chromeColor, DIFFICULTY, PROBE_DIFFICULTY, MAX_RULE_TRIALS,
  SEGMENTS, responseWindowMs, GLYPH_SETS, STARTING_LIVES, SCORE_PER_TAP, CHAIN_BONUS,
} from '@/lib/orbitalOrder/config';
import {
  generateRule, generateSpheres, solveChain, classifyError, hasTies, sessionPool,
  ruleLabel, targetSet, randInt,
} from '@/lib/orbitalOrder/rules';

const REVEAL_SKIP = true;

export default function OrbitalOrder() {
  const [searchParams] = useSearchParams();
  const cfg = useRef(parseParams(searchParams)).current;
  const bg = useRef(resolveBg(cfg.bg, cfg.neon)).current;
  const neon = bg.neon;
  const chrome = chromeColor(bg.fieldHex);
  const pool = useRef(sessionPool(cfg.difficulty_level)).current;

  // ---- render state ----
  const [segment, setSegment] = useState('practice');
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState('reveal'); // reveal | response | feedback | gap
  const [rule, setRule] = useState(null);
  const [labels, setLabels] = useState({ ordering: '', skip: '' });
  const [changedClauses, setChangedClauses] = useState([]);
  const [spheres, setSpheres] = useState([]);
  const [committed, setCommitted] = useState([]);
  const [correctIds, setCorrectIds] = useState([]);
  const [wrongId, setWrongId] = useState(null);
  const [litId, setLitId] = useState(null);
  const [isSwitchTrial, setIsSwitchTrial] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [peeking, setPeeking] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(cfg.time_to_play);
  const [countdown, setCountdown] = useState(cfg.countdown_timer || 0);
  const [summary, setSummary] = useState(null);
  const [fieldSize, setFieldSize] = useState({ width: 0, height: 0 });
  const [started, setStarted] = useState(false);
  const [segmentTotal, setSegmentTotal] = useState(SEGMENTS.PRACTICE.trials);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [score, setScore] = useState(0);

  // ---- refs (timing-critical) ----
  const metricsRef = useRef(null);
  const sentRef = useRef(false);
  const phaseRef = useRef('reveal');
  const segmentRef = useRef('practice');
  const trialIndexRef = useRef(0);
  const committedRef = useRef([]);
  const spheresRef = useRef([]);
  const expectedRef = useRef([]);
  const targetIdsRef = useRef([]);
  const ruleRef = useRef(null);
  const glyphTypeRef = useRef(cfg.glyphType);
  const blockNumRef = useRef(1);
  const trialsInBlockRef = useRef(0);
  const blockLengthRef = useRef(randInt(5, 8));
  const ruleHistoryRef = useRef([]);
  const prevExpectedRef = useRef(null);
  const pendingSwitchRef = useRef(false);
  const pendingChangedRef = useRef([]);
  const effectiveDiffRef = useRef(cfg.difficulty_level);
  const revealTimeoutRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const globalIntervalRef = useRef(null);
  const timeUpRef = useRef(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const peekingRef = useRef(false);
  const litIdRef = useRef(null);
  const countdownRef = useRef(cfg.countdown_timer || 0);
  const livesRef = useRef(STARTING_LIVES);
  const fieldRef = useRef(null);
  const [trialNonce, setTrialNonce] = useState(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { segmentRef.current = segment; }, [segment]);
  useEffect(() => { trialIndexRef.current = trialIndex; }, [trialIndex]);
  useEffect(() => { spheresRef.current = spheres; }, [spheres]);

  // ---- field size ----
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const update = () => setFieldSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- init ----
  useEffect(() => {
    metricsRef.current = new OrbitalMetrics({ ...cfg, neon });
    metricsRef.current.startSession();
    startSegment('rules');
    setStarted(true);
    return () => {
      if (metricsRef.current && !sentRef.current && segmentRef.current !== 'summary') {
        sentRef.current = true;
        const payload = metricsRef.current.buildPayload('abandoned', 'ABANDONED');
        metricsRef.current.sendResults(payload);
      }
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearTimers() {
    [revealTimeoutRef, feedbackTimeoutRef].forEach((r) => { if (r.current) clearTimeout(r.current); });
    [countdownIntervalRef, globalIntervalRef].forEach((r) => { if (r.current) clearInterval(r.current); });
  }

  // ---- global timer (scored portion) ----
  useEffect(() => {
    if (cfg.time_to_play <= 0 || !timerStarted) return;
    globalIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { timeUpRef.current = true; return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(globalIntervalRef.current);
  }, [timerStarted, cfg.time_to_play]);

  // ---- segment control ----
  const startSegment = useCallback((seg) => {
    segmentRef.current = seg;
    setSegment(seg);
    setTrialIndex(0);
    trialIndexRef.current = 0;
    setCommitted([]); committedRef.current = [];
    setCorrectIds([]); setWrongId(null); setLitId(null); litIdRef.current = null;
    setFeedback(null); setBannerVisible(true);

    if (seg === 'practice') {
      setSegmentTotal(SEGMENTS.PRACTICE.trials);
      effectiveDiffRef.current = cfg.difficulty_level;
      ruleHistoryRef.current = [];
      const r = generateRule([], cfg.difficulty_level, pool);
      r.glyphType = cfg.glyphType;
      ruleRef.current = r; ruleHistoryRef.current.push(r);
      setRule(r); setLabels(ruleLabel(r)); setChangedClauses([]);
    }
    if (seg === 'motor') { setSegmentTotal(SEGMENTS.MOTOR.trials); }
    if (seg === 'probe') {
      setSegmentTotal(SEGMENTS.PROBE.trials);
      ruleHistoryRef.current = [];
      const r = generateRule([], PROBE_DIFFICULTY, pool);
      r.glyphType = cfg.glyphType;
      ruleRef.current = r; ruleHistoryRef.current.push(r);
      setRule(r); setLabels(ruleLabel(r)); setChangedClauses([]);
    }
    if (seg === 'rules') {
      setSegmentTotal(MAX_RULE_TRIALS);
      blockNumRef.current = 1; trialsInBlockRef.current = 0;
      blockLengthRef.current = randInt(5, 8);
      ruleHistoryRef.current = [];
      const r = generateRule([], effectiveDiffRef.current, pool);
      r.glyphType = cfg.glyphType;
      ruleRef.current = r; ruleHistoryRef.current.push(r);
      metricsRef.current?.startBlock(1, r);
      setRule(r); setLabels(ruleLabel(r)); setChangedClauses([]);
      pendingSwitchRef.current = false;
    }
    if (seg === 'summary') { endSession('TIME_BUDGET'); return; }

    setTrialNonce((n) => n + 1);
    setStarted((s) => s || true);
  }, [cfg, pool]);

  // ---- trial setup (driven by trialNonce) ----
  useEffect(() => {
    if (trialNonce === 0 || !fieldSize.width) return;
    setupTrial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialNonce, fieldSize.width]);

  function pickGlyphType() {
    if (segmentRef.current === 'practice' || segmentRef.current === 'motor') return cfg.glyphType;
    return Math.random() < 0.5 ? 'DIGITS' : 'LETTERS';
  }

  function setupTrial() {
    const seg = segmentRef.current;
    setCommitted([]); committedRef.current = [];
    setCorrectIds([]); setWrongId(null); setFeedback(null);
    setBannerVisible(true);

    if (seg === 'motor') {
      const s = spheresRef.current.length ? spheresRef.current : generateSpheres(
        { ordering: 'ASCENDING', skip: pool[0], glyphType: 'DIGITS' },
        Math.min(cfg.difficulty_level, 2), 'DIGITS', pool
      );
      spheresRef.current = s; setSpheres(s);
      const lit = s[Math.floor(Math.random() * s.length)].id;
      litIdRef.current = lit; setLitId(lit);
      metricsRef.current?.startTrial({ trial: trialIndexRef.current, block: 0, isSwitchTrial: false, rule: null, chainLength: 1, hasTies: false, segment: 'MOTOR' });
      phaseRef.current = 'response'; setPhase('response');
      return;
    }

    // scored / practice
    let r = ruleRef.current;
    const isSwitch = pendingSwitchRef.current;
    pendingSwitchRef.current = false;
    const changed = pendingChangedRef.current;
    pendingChangedRef.current = [];

    const gt = pickGlyphType();
    glyphTypeRef.current = gt;
    r.glyphType = gt;
    setRule({ ...r });
    setLabels(ruleLabel(r));
    setChangedClauses(isSwitch ? changed : []);
    setIsSwitchTrial(isSwitch);

    const diff = seg === 'probe' ? PROBE_DIFFICULTY
      : seg === 'practice' ? Math.min(cfg.difficulty_level, 2)
      : effectiveDiffRef.current;
    const sp = generateSpheres(r, diff, gt, pool);
    spheresRef.current = sp; setSpheres(sp);
    const chain = solveChain(r, sp);
    expectedRef.current = chain;
    targetIdsRef.current = targetSet(r, sp);
    const ties = hasTies(sp);

    metricsRef.current?.startTrial({
      trial: trialIndexRef.current, block: blockNumRef.current, isSwitchTrial: isSwitch,
      rule: r, chainLength: chain.length, hasTies: ties, segment: seg.toUpperCase(),
    });

    // rule reveal
    phaseRef.current = 'reveal'; setPhase('reveal');
    const revealMs = DIFFICULTY[diff].revealMs;
    revealTimeoutRef.current = setTimeout(() => startResponse(), revealMs);
  }

  function startResponse() {
    if (revealTimeoutRef.current) { clearTimeout(revealTimeoutRef.current); revealTimeoutRef.current = null; }
    if (phaseRef.current !== 'reveal') return;
    phaseRef.current = 'response'; setPhase('response');
    setBannerVisible(cfg.rule_visible === 'always');
    metricsRef.current?.beginResponse();

    // start global timer on first scored response
    if (!timerStarted) setTimerStarted(true);

    // per-trial countdown
    if (cfg.countdown_timer > 0) {
      const window = Math.round(responseWindowMs(effectiveDiffRef.current) / Math.max(1, expectedRef.current.length));
      countdownRef.current = Math.min(cfg.countdown_timer, window);
      setCountdown(countdownRef.current);
      countdownIntervalRef.current = setInterval(() => {
        if (peekingRef.current) return;
        countdownRef.current -= 1;
        setCountdown(countdownRef.current);
        if (countdownRef.current <= 0) {
          clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
          onTimeout();
        }
      }, 1000);
    }
  }

  function onTimeout() {
    if (phaseRef.current !== 'response') return;
    const seg = segmentRef.current;
    const isScored = seg === 'probe' || seg === 'rules';
    metricsRef.current?.log('TIMEOUT', { trial: trialIndexRef.current });
    metricsRef.current?.endTrial({ outcome: 'INCORRECT', errorClass: 'TIMEOUT' });
    if (isScored) {
      metricsRef.current?.loseLife();
      livesRef.current -= 1; setLives(livesRef.current);
    }
    setFeedback({ correct: false, message: isScored && livesRef.current <= 0 ? 'Game Over' : 'Time up' });
    phaseRef.current = 'feedback'; setPhase('feedback');
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (isScored && livesRef.current <= 0) {
      feedbackTimeoutRef.current = setTimeout(() => endSession('GAME_OVER'), 900);
    } else {
      feedbackTimeoutRef.current = setTimeout(() => afterTrial('INCORRECT'), 900);
    }
  }

  // ---- tap handling ----
  function handleTap(sphereId) {
    const seg = segmentRef.current;
    if (seg === 'summary') return;

    if (phaseRef.current === 'reveal' && REVEAL_SKIP) { startResponse(); return; }
    if (phaseRef.current !== 'response') return;

    // motor baseline
    if (seg === 'motor') {
      const lat = metricsRef.current ? Date.now() - metricsRef.current.trialStartMs : 0;
      metricsRef.current?.recordMotorTap(lat);
      metricsRef.current?.endTrial({ outcome: 'CORRECT', errorClass: null });
      litIdRef.current = null; setLitId(null);
      phaseRef.current = 'feedback'; setPhase('feedback');
      feedbackTimeoutRef.current = setTimeout(() => afterTrial('CORRECT'), 350);
      return;
    }

    // scored / practice
    const committedCount = committedRef.current.length;
    const expected = expectedRef.current;
    const sphere = spheresRef.current.find((s) => s.id === sphereId);
    if (!sphere) return;
    const expectedNext = expected[committedCount];
    const isCorrect = sphereId === expectedNext;

    if (isCorrect) {
      committedRef.current = [...committedRef.current, sphereId];
      setCommitted(committedRef.current);
      setCorrectIds((p) => [...p, sphereId]);
      metricsRef.current?.recordTap({
        sphereId, glyph: sphere.glyph, color: sphere.color,
        pos: { x: sphere.x, y: sphere.y, z: 0 }, correct: true, errorClass: null,
        sinceLastTapMs: 0,
      });
      setScore(metricsRef.current?.score ?? 0);

      if (committedRef.current.length >= expected.length) {
        // chain complete — bonus
        metricsRef.current?.addChainBonus();
        setScore(metricsRef.current?.score ?? 0);
        metricsRef.current?.endTrial({ outcome: 'CORRECT', errorClass: null });
        phaseRef.current = 'feedback'; setPhase('feedback');
        setFeedback({ correct: true, message: `+${CHAIN_BONUS} Chain!` });
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        feedbackTimeoutRef.current = setTimeout(() => afterTrial('CORRECT'), 450);
      }
      return;
    }

    // incorrect
    const errClass = classifyError({
      tapSphere: sphere, expectedChain: expected, committedCount,
      targetIds: targetIdsRef.current, prevExpectedChain: prevExpectedRef.current,
    });
    metricsRef.current?.recordTap({
      sphereId, glyph: sphere.glyph, color: sphere.color,
      pos: { x: sphere.x, y: sphere.y, z: 0 }, correct: false, errorClass: errClass || 'RANDOM',
      sinceLastTapMs: 0,
    });
    setWrongId(sphereId);

    if (seg === 'practice') {
      // lenient: flash the correct sphere, let them retry
      setWrongId(null);
      const correctSphere = spheresRef.current.find((s) => s.id === expectedNext);
      if (correctSphere) { litIdRef.current = correctSphere.id; setLitId(correctSphere.id); setTimeout(() => { setLitId(null); litIdRef.current = null; }, 700); }
      return;
    }

    metricsRef.current?.endTrial({ outcome: 'INCORRECT', errorClass: errClass || 'RANDOM' });
    metricsRef.current?.loseLife();
    livesRef.current -= 1; setLives(livesRef.current);
    phaseRef.current = 'feedback'; setPhase('feedback');
    setFeedback({ correct: false, message: livesRef.current <= 0 ? 'Game Over' : 'Chain broke (−1 life)' });
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (livesRef.current <= 0) {
      feedbackTimeoutRef.current = setTimeout(() => endSession('GAME_OVER'), 900);
    } else {
      feedbackTimeoutRef.current = setTimeout(() => afterTrial('INCORRECT'), 900);
    }
  }

  // ---- after trial → next ----
  function afterTrial(/* outcome */) {
    setWrongId(null); setFeedback(null);
    phaseRef.current = 'gap'; setPhase('gap');

    const seg = segmentRef.current;
    let idx = trialIndexRef.current + 1;

    const goNext = () => {
      if (seg === 'practice') {
        if (idx >= SEGMENTS.PRACTICE.trials) {
          // comprehension gate
          if (metricsRef.current.comprehensionCorrect < Math.ceil(SEGMENTS.PRACTICE.trials * 0.66)) {
            effectiveDiffRef.current = 1;
          }
          startSegment('motor'); return;
        }
        setTrialIndex(idx); trialIndexRef.current = idx;
        setTrialNonce((n) => n + 1);
        return;
      }
      if (seg === 'motor') {
        if (idx >= SEGMENTS.MOTOR.trials) { startSegment('probe'); return; }
        setTrialIndex(idx); trialIndexRef.current = idx;
        setTrialNonce((n) => n + 1);
        return;
      }
      if (seg === 'probe') {
        if (idx >= SEGMENTS.PROBE.trials) { startSegment('rules'); return; }
        setTrialIndex(idx); trialIndexRef.current = idx;
        setTrialNonce((n) => n + 1);
        return;
      }
      if (seg === 'rules') {
        trialsInBlockRef.current += 1;
        if (timeUpRef.current || idx >= MAX_RULE_TRIALS) { startSegment('summary'); return; }
        if (trialsInBlockRef.current >= blockLengthRef.current) {
          // rotate rule
          prevExpectedRef.current = expectedRef.current;
          metricsRef.current?.setPrevExpectedChain(expectedRef.current);
          const newRule = generateRule(ruleHistoryRef.current, effectiveDiffRef.current, pool);
          const oldRule = ruleRef.current;
          const changed = [];
          if (newRule.ordering !== oldRule.ordering) changed.push('ordering');
          if (newRule.skip !== oldRule.skip) changed.push('skip');
          ruleRef.current = newRule; ruleHistoryRef.current.push(newRule);
          blockNumRef.current += 1; trialsInBlockRef.current = 0;
          blockLengthRef.current = randInt(5, 8);
          pendingSwitchRef.current = true; pendingChangedRef.current = changed;
          metricsRef.current?.startBlock(blockNumRef.current, newRule);
        }
        setTrialIndex(idx); trialIndexRef.current = idx;
        setTrialNonce((n) => n + 1);
      }
    };

    feedbackTimeoutRef.current = setTimeout(goNext, 400);
  }

  // ---- end session ----
  function endSession(endReason) {
    clearTimers();
    if (metricsRef.current && !sentRef.current) {
      sentRef.current = true;
      const status = endReason === 'ABANDONED' ? 'abandoned' : (endReason === 'GAME_OVER' ? 'game_over' : 'completed');
      metricsRef.current.endSession(endReason, status !== 'abandoned');
      const payload = metricsRef.current.buildPayload(status, endReason);
      metricsRef.current.sendResults(payload);
      setSummary({ ...payload.metrics.summary, endReason, durationSeconds: payload.metrics.duration_seconds, config: payload.metrics.config });
    }
    phaseRef.current = 'summary'; setPhase('summary');
  }

  // ---- rule modal (reveal dismiss + corner "?" peek) ----
  function closeRuleModal() {
    if (phaseRef.current === 'reveal') { startResponse(); return; }
    if (peekingRef.current) {
      peekingRef.current = false; setPeeking(false);
      metricsRef.current?.recordPeekEnd();
    }
  }

  function openPeek() {
    if (peekingRef.current) return;
    if (phaseRef.current === 'reveal') { startResponse(); return; }
    peekingRef.current = true; setPeeking(true);
    metricsRef.current?.recordPeekStart();
    setTimeout(() => {
      if (peekingRef.current) { peekingRef.current = false; setPeeking(false); metricsRef.current?.recordPeekEnd(); }
    }, 3000);
  }

  // ---- summary ----
  if (segment === 'summary' && summary) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: bg.fieldHex, color: chrome }}>
        <div className="max-w-lg w-full rounded-2xl p-8" style={{ background: 'rgba(20,22,28,0.7)', border: `1px solid ${chrome}22`, backdropFilter: 'blur(14px)' }}>
          <div className="flex items-center gap-3 mb-5">
            <Activity className="w-7 h-7" style={{ color: '#0EA5A4' }} />
            <h2 className="text-2xl font-bold">Session Summary</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Score" value={`${summary.score || 0}`} />
            <Stat label="Lives Left" value={`${summary.livesRemaining ?? 0}`} />
            <Stat label="Best Chain" value={`${summary.maxChain || 0}`} />
            <Stat label="Accuracy" value={`${Math.round((summary.accuracy || 0) * 100)}%`} />
            <Stat label="Trials" value={`${summary.trialsOffered}`} />
            <Stat label="Chain Completion" value={`${Math.round((summary.chainCompletionRate || 0) * 100)}%`} />
            <Stat label="First-tap Latency" value={`${Math.round(summary.firstTapLatencyMs || 0)} ms`} />
            <Stat label="Inter-tap Latency" value={`${Math.round(summary.interTapLatencyMs || 0)} ms`} />
            <Stat label="Rule Switch Cost" value={`${Math.round(summary.ruleSwitchCostMs || 0)} ms`} />
            <Stat label="Probe Accuracy" value={`${Math.round((summary.probeAccuracy || 0) * 100)}%`} />
            <Stat label="Inhibition Errors" value={`${Math.round((summary.inhibitionIndex || 0) * 100)}%`} />
            <Stat label="Rule Rechecks" value={`${(summary.ruleRecheckCount || 0).toFixed(1)}`} />
          </div>
          {summary.errorProfile && (
            <div className="mt-4">
              <p className="text-xs opacity-60 mb-2 uppercase tracking-wide">Error Profile</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.errorProfile).filter(([, v]) => v > 0).map(([k, v]) => (
                  <span key={k} className="px-2 py-1 rounded text-[11px] font-medium" style={{ background: 'rgba(255,74,52,0.12)', color: '#FF6B4A' }}>
                    {k.replace(/_/g, ' ')} {Math.round(v * 100)}%
                  </span>
                ))}
                {Object.values(summary.errorProfile).every((v) => v === 0) && <span className="text-xs opacity-60">No errors</span>}
              </div>
            </div>
          )}
          <p className="text-xs opacity-50 mt-4">Duration {Math.round(summary.durationSeconds || 0)}s · Ended: {summary.endReason}</p>
          <div className="flex gap-2 mt-6">
            <Link to="/games"><Button variant="outline" style={{ color: chrome, borderColor: `${chrome}33` }}><ArrowLeft className="w-4 h-4 mr-1" /> Done</Button></Link>
            <Button onClick={() => window.location.reload()} style={{ background: '#0EA5A4', color: '#fff' }}><RotateCcw className="w-4 h-4 mr-1" /> Play Again</Button>
          </div>
        </div>
      </div>
    );
  }

  const segmentLabel = SEGMENTS[segment.toUpperCase()]?.label || segment;
  const countdownData = cfg.countdown_timer > 0 ? { remaining: countdown, total: cfg.countdown_timer } : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: bg.fieldHex, color: chrome }}>
      {/* Play field */}
      <div ref={fieldRef} className="relative flex-1 w-full min-h-0"
        onClick={() => { if (started && phaseRef.current === 'reveal' && REVEAL_SKIP) startResponse(); }}>
        {started && fieldSize.width > 0 && spheres.length > 0 && (
          <PlayField
            spheres={spheres} committed={committed} dim={phase === 'reveal'}
            wrongId={wrongId} correctIds={correctIds} litId={litId}
            neon={neon} chrome={chrome} field={bg} reduceMotion={cfg.reduce_motion}
            onTap={handleTap} width={fieldSize.width} height={fieldSize.height}
          />
        )}

        <Hud
          progress={{ done: trialIndex + (phase === 'gap' || phase === 'feedback' ? 1 : 0), total: segmentTotal }}
          countdown={countdownData}
          demo={!cfg.patientId} chrome={chrome}
          segmentLabel={segmentLabel}
          lives={{ current: lives, total: STARTING_LIVES }}
          score={score}
        />

        {started && segment !== 'summary' && segment !== 'motor' && (
          <RuleModal
            expanded={phase === 'reveal' || peeking}
            labels={labels} rule={rule} chrome={chrome} neon={neon}
            width={fieldSize.width} height={fieldSize.height}
            onDismiss={closeRuleModal} onOpen={openPeek} peeking={peeking}
          />
        )}

        {/* Exit */}
        <Link to="/games" className="absolute bottom-3 left-3 z-30">
          <Button variant="ghost" size="sm" style={{ color: `${chrome}99` }}><ArrowLeft className="w-4 h-4 mr-1" /> Exit</Button>
        </Link>

        {/* Feedback pill */}
        {feedback && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-16 z-30">
            <div className="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2"
              style={{
                background: 'rgba(20,22,28,0.7)', backdropFilter: 'blur(10px)',
                border: `1px solid ${feedback.correct ? '#0EA5A4' : '#FF6B4A'}`,
                color: feedback.correct ? '#5EEAD4' : '#FF6B4A',
              }}>
              {feedback.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {feedback.message}
            </div>
          </div>
        )}

        {/* Time-left chip (global) */}
        {cfg.time_to_play > 0 && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1.5 text-xs opacity-70" style={{ color: chrome }}>
            <Timer className="w-4 h-4" /> {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] uppercase tracking-wide opacity-60">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}