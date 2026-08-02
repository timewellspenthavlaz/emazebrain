import { useEffect, useState } from 'react';

/**
 * useCarsSprite — loads the multi-car SVG asset once, measures each car's
 * bounding box, and injects a hidden <svg> sprite of <symbol> definitions
 * into the document. For every car we emit two symbols:
 *   #bb-car-N      — landscape (natural) orientation
 *   #bb-car-N-v     — portrait (pre-rotated -90) orientation
 * so a piece can pick the matching symbol and fill its slot cleanly in
 * either axis without distorting the 3D artwork. CarShape references the
 * symbol with <use>, keeping the JS bundle small.
 *
 * The source SVG exposes four distinct cars; car #4 (green w/ red accents)
 * is reserved as the rescue / target vehicle.
 */

const SVG_URL =
  'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/2070e9f7b_3090486_2023.svg';
const CAR_IDS = ['car_x5F_1', 'car_x5F_2', 'car_x5F_3', 'car_x5F_4'];

export const CAR_COUNT = CAR_IDS.length;
export const TARGET_VARIANT = 3;

// Filled after the sprite is built: { w, h, landscape } per car index.
export const carsMeta = [];

let spritePromise = null;

function buildSprite() {
  if (spritePromise) return spritePromise;
  spritePromise = (async () => {
    const res = await fetch(SVG_URL);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const src = doc.documentElement;

    // Offscreen, full-size clone so getBBox() has real geometry.
    const holder = document.createElement('div');
    holder.style.cssText =
      'position:absolute;left:-99999px;top:0;width:400px;height:400px;overflow:hidden;visibility:hidden;pointer-events:none';
    const meas = src.cloneNode(true);
    meas.setAttribute('width', '400');
    meas.setAttribute('height', '400');
    holder.appendChild(meas);
    document.body.appendChild(holder);

    const svgNS = 'http://www.w3.org/2000/svg';
    const sprite = document.createElementNS(svgNS, 'svg');
    sprite.setAttribute('id', 'beepbeep-cars-sprite');
    sprite.setAttribute('aria-hidden', 'true');
    sprite.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';

    CAR_IDS.forEach((id, i) => {
      const g = meas.querySelector('#' + id);
      let bx = 0, by = 0, bw = 400, bh = 400;
      try {
        const b = g.getBBox();
        if (b.width > 0 && b.height > 0) { bx = b.x; by = b.y; bw = b.width; bh = b.height; }
      } catch (e) { /* keep fallback */ }
      const pad = Math.max(bw, bh) * 0.06 || 8;
      bx -= pad; by -= pad; bw += pad * 2; bh += pad * 2;
      carsMeta[i] = { w: bw, h: bh, landscape: bw >= bh };

      const cloneL = g.cloneNode(true);
      cloneL.removeAttribute('id');
      const cloneP = g.cloneNode(true);
      cloneP.removeAttribute('id');

      // landscape symbol — viewBox crops to the car's bbox in 400-space.
      const symL = document.createElementNS(svgNS, 'symbol');
      symL.setAttribute('id', `bb-car-${i}`);
      symL.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
      symL.appendChild(cloneL);
      sprite.appendChild(symL);

      // portrait symbol — same car rotated -90, viewBox 0 0 bh bw.
      const symP = document.createElementNS(svgNS, 'symbol');
      symP.setAttribute('id', `bb-car-${i}-v`);
      symP.setAttribute('viewBox', `0 0 ${bh} ${bw}`);
      const outer = document.createElementNS(svgNS, 'g');
      outer.setAttribute('transform', `translate(0 ${bw}) rotate(-90)`);
      const inner = document.createElementNS(svgNS, 'g');
      inner.setAttribute('transform', `translate(${-bx} ${-by})`);
      inner.appendChild(cloneP);
      outer.appendChild(inner);
      symP.appendChild(outer);
      sprite.appendChild(symP);
    });

    document.body.removeChild(holder);
    document.body.appendChild(sprite);
    return true;
  })().catch((e) => {
    spritePromise = null;
    throw e;
  });
  return spritePromise;
}

export function useCarsSprite() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    buildSprite()
      .then(() => { if (alive) setReady(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return ready;
}