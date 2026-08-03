import { useEffect, useState } from 'react';

/**
 * useCarsSprite — loads the multi-car SVG asset once, mounts it hidden so
 * every car group AND its gradients live in the document, then injects a
 * sprite of <symbol> definitions that reference those groups via <use>.
 * For every car we emit two symbols:
 *   #bb-car-N      — landscape (natural) orientation
 *   #bb-car-N-v    — portrait (pre-rotated -90) orientation
 * Each symbol crops to the car's bounding box and uses
 * preserveAspectRatio="none" so CarShape can stretch it to fill its slot.
 */

const SVG_URL =
  'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/347f3e873_985769_328.svg';

const CAR_IDS = [
  'Car_x5F_3_x5F_D', 'Car_x5F_3_x5F_C', 'Car_x5F_3_x5F_B', 'Car_x5F_3_x5F_A',
  'Car2_x5F_D', 'Car2_x5F_C', 'Car2_x5F_B', 'Car2_x5F_A',
  'Car_x5F_1_x5F_D', 'Car_x5F_1_x5F_C', 'Car_x5F_1_x5F_B', 'Car_x5F_1_x5F_A',
];

export const CAR_COUNT = CAR_IDS.length;
export const TARGET_INDEX = 0;
export const BLOCKER_INDICES = CAR_IDS.map((_, i) => i).filter((i) => i !== TARGET_INDEX);

let spritePromise = null;

function buildSprite() {
  if (spritePromise) return spritePromise;
  spritePromise = (async () => {
    const res = await fetch(SVG_URL);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const src = doc.documentElement;

    const svgNS = 'http://www.w3.org/2000/svg';

    // Mount the full source hidden so all car groups + gradients are present
    // in the document for <use> and url(#) resolution, and so we can measure
    // each group's bounding box.
    const holder = document.createElementNS(svgNS, 'svg');
    holder.setAttribute('id', 'beepbeep-cars-source');
    holder.setAttribute('aria-hidden', 'true');
    holder.setAttribute('viewBox', '0 0 800 800');
    holder.setAttribute('width', '800');
    holder.setAttribute('height', '800');
    holder.style.cssText =
      'position:absolute;left:-99999px;top:0;width:800px;height:800px;overflow:hidden;visibility:hidden;pointer-events:none';
    Array.from(src.childNodes).forEach((n) => holder.appendChild(n.cloneNode(true)));
    document.body.appendChild(holder);

    const sprite = document.createElementNS(svgNS, 'svg');
    sprite.setAttribute('id', 'beepbeep-cars-sprite');
    sprite.setAttribute('aria-hidden', 'true');
    sprite.style.cssText =
      'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';

    CAR_IDS.forEach((id, i) => {
      const g = holder.querySelector('#' + id);
      let bx = 0, by = 0, bw = 800, bh = 800;
      try {
        const b = g.getBBox();
        if (b.width > 0 && b.height > 0) { bx = b.x; by = b.y; bw = b.width; bh = b.height; }
      } catch (e) { /* keep fallback */ }
      const pad = Math.max(bw, bh) * 0.04 || 8;
      bx -= pad; by -= pad; bw += pad * 2; bh += pad * 2;

      // landscape symbol — viewBox crops to the car's bbox in 800-space.
      const symL = document.createElementNS(svgNS, 'symbol');
      symL.setAttribute('id', `bb-car-${i}`);
      symL.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
      symL.setAttribute('preserveAspectRatio', 'none');
      const useL = document.createElementNS(svgNS, 'use');
      useL.setAttribute('href', `#${id}`);
      symL.appendChild(useL);
      sprite.appendChild(symL);

      // portrait symbol — same car rotated -90, viewBox 0 0 bh bw.
      const symP = document.createElementNS(svgNS, 'symbol');
      symP.setAttribute('id', `bb-car-${i}-v`);
      symP.setAttribute('viewBox', `0 0 ${bh} ${bw}`);
      symP.setAttribute('preserveAspectRatio', 'none');
      const outer = document.createElementNS(svgNS, 'g');
      outer.setAttribute('transform', `translate(0 ${bw}) rotate(-90)`);
      const inner = document.createElementNS(svgNS, 'g');
      inner.setAttribute('transform', `translate(${-bx} ${-by})`);
      const useP = document.createElementNS(svgNS, 'use');
      useP.setAttribute('href', `#${id}`);
      inner.appendChild(useP);
      outer.appendChild(inner);
      symP.appendChild(outer);
      sprite.appendChild(symP);
    });

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