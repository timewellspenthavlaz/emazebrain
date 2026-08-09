import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parseParams, GAME_HTML_URL, buildGameHtml, buildPayload } from '@/lib/echoKeys/config';
import { sendGameResults } from '@/lib/gameResultSender';
import CountdownTimer from '@/components/games/CountdownTimer';

/**
 * Echo Keys — a piano melody-memory trainer on the Nocturne N-88.
 *
 * The game is a self-contained vanilla-JS HTML file. We embed it in a
 * same-origin iframe (srcdoc) so we can read the finished summary directly
 * off iframe.contentWindow.PM, then persist it as a GameSession record.
 */
export default function EchoKeys() {
  const [searchParams] = useSearchParams();
  const cfg = useMemo(() => parseParams(searchParams), [searchParams]);
  const [gameHtml, setGameHtml] = useState(null);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(cfg.time_to_play);
  const [stopped, setStopped] = useState(false);
  const iframeRef = useRef(null);
  const sentRef = useRef(false);
  const cfgRef = useRef(cfg);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);

  // ---- fetch + patch the self-contained game HTML once per config ----
  useEffect(() => {
    let alive = true;
    setGameHtml(null);
    setError(null);
    fetch(GAME_HTML_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (alive) setGameHtml(buildGameHtml(html, cfg.br, cfg.obstacle, cfg.bg));
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Failed to load game');
      });
    return () => { alive = false; };
  }, [cfg.br, cfg.obstacle]);

  const submitResults = useCallback((summary, status) => {
    if (sentRef.current) return;
    if (!summary) return;
    sentRef.current = true;
    const payload = buildPayload(summary, cfgRef.current, status);
    sendGameResults(payload, cfgRef.current.callbackUrl);
  }, []);

  // ---- poll the iframe for the finished summary (PM.lastSummary) ----
  useEffect(() => {
    if (!gameHtml) return;
    sentRef.current = false;
    const id = setInterval(() => {
      try {
        const win = iframeRef.current?.contentWindow;
        if (!win || !win.PM || !win.PM.lastSummary) return;
        submitResults(win.PM.lastSummary, 'completed');
        clearInterval(id);
      } catch (e) { /* not ready or cross-origin */ }
    }, 500);
    return () => {
      clearInterval(id);
      // On unmount (navigate away mid-game), send what we have as abandoned
      try {
        const win = iframeRef.current?.contentWindow;
        if (win?.PM?.Game && !sentRef.current) {
          submitResults(win.PM.Game.summary(), 'abandoned');
        }
      } catch (e) { /* ignore */ }
    };
  }, [gameHtml, submitResults]);

  // ---- abandoned: send current summary when the tab is hidden / closed ----
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (sentRef.current) return;
      try {
        const win = iframeRef.current?.contentWindow;
        if (!win || !win.PM || !win.PM.Game) return;
        const summary = win.PM.Game.summary();
        if (!summary) return;
        submitResults(summary, 'abandoned');
      } catch (e) { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [submitResults]);

  // ---- countdown timer: end the session when the budget runs out ----
  useEffect(() => {
    if (!gameHtml || cfg.time_to_play <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) {
          clearInterval(id);
          try {
            const win = iframeRef.current?.contentWindow;
            if (win?.PM?.Game && !sentRef.current) {
              submitResults(win.PM.Game.summary(), 'completed');
            }
          } catch (e) { /* ignore */ }
          setStopped(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameHtml, cfg.time_to_play, submitResults]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#06070C] text-white p-6">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Unable to load Echo Keys</h2>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!gameHtml) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#06070C]">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  const wrapperStyle = cfg.bg
    ? { backgroundImage: `url(${cfg.bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  const cdType = cfg.br === 'right' ? 'right' : cfg.br === 'left' ? 'left' : 'none';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#06070C] relative" style={wrapperStyle}>
      {cdType !== 'none' && cfg.time_to_play > 0 && !stopped && (
        <CountdownTimer type={cdType} timeLeft={timeLeft} totalTime={cfg.time_to_play} />
      )}
      {!stopped && (
        <iframe
          ref={iframeRef}
          title="Echo Keys"
          srcDoc={gameHtml}
          className="w-full h-full border-0 relative z-0"
          allow="autoplay; clipboard-write"
        />
      )}
      {stopped && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#06070C]">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-3">Time's Up!</h2>
            <p className="text-slate-400 text-lg">Your session has ended.</p>
          </div>
        </div>
      )}
    </div>
  );
}