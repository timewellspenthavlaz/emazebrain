/**
 * Beep Beep — colour system.
 * Bands lifted verbatim from Kuku Kub v1.3: eight warm hues (Orchid → Straw)
 * and eight cold hues (Jade → Indigo), fixed L* 74 / C* 26 in CIE LCh.
 * Texture + gradient amplitudes are deliberately small (±3 L*).
 */

const WARM_HUES = [
  { h: 334, name: 'Orchid' },
  { h: 350, name: 'Crimson' },
  { h: 10, name: 'Vermilion' },
  { h: 28, name: 'Tangerine' },
  { h: 45, name: 'Amber' },
  { h: 60, name: 'Gold' },
  { h: 75, name: 'Citron' },
  { h: 90, name: 'Straw' },
];

const COLD_HUES = [
  { h: 140, name: 'Jade' },
  { h: 160, name: 'Seafoam' },
  { h: 180, name: 'Cyan' },
  { h: 200, name: 'Sky' },
  { h: 220, name: 'Azure' },
  { h: 240, name: 'Sapphire' },
  { h: 260, name: 'Violet' },
  { h: 276, name: 'Indigo' },
];

const L = 74;
const C = 26;

/* ---- LCh → sRGB ---- */
function fInv(t) {
  const t3 = t * t * t;
  if (t3 > 0.008856) return t3;
  return (t - 16 / 116) / 7.787;
}
function labToRgb(Lv, a, b) {
  const fy = (Lv + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = fInv(fx) * 0.95047;
  const Y = fInv(fy) * 1.0;
  const Z = fInv(fz) * 1.08883;
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
  let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
  let bl = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  const to = (c) => Math.round(Math.max(0, Math.min(1, gam(c))) * 255);
  return { r: to(r), g: to(g), b: to(bl) };
}
function lchToHex(Lv, Cv, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const { r, g, b } = labToRgb(Lv, Cv * Math.cos(h), Cv * Math.sin(h));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
function relLum(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}
export function chromeColor(hex) {
  return relLum(hex) < 140 ? '#F2F4F8' : '#0A0C12';
}
function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const NEUTRAL_HEX = '#0E1116';

/**
 * Resolve the bg parameter to a concrete backdrop.
 * Returns { mode, baseHex, name, fieldCss, texture, gradient, secondHex, chrome }.
 * - mode: raw keyword ('colds' …) | 'url' | 'neutral'
 * - name: hue name (warm/cold) or null
 * - texture: true for coldt/warmt
 * - gradient: true for coldg/warmg
 */
export function resolveBg(bgRaw) {
  const bg = (bgRaw || '').trim();
  const out = { mode: 'neutral', baseHex: NEUTRAL_HEX, name: null, fieldCss: NEUTRAL_HEX, texture: false, gradient: false, secondHex: null, chrome: chromeColor(NEUTRAL_HEX) };

  if (!bg) return out;

  const warm = bg === 'warms' || bg === 'warmt' || bg === 'warmg';
  const cold = bg === 'colds' || bg === 'coldt' || bg === 'coldg';
  if (warm || cold) {
    const band = warm ? WARM_HUES : COLD_HUES;
    const a = randPick(band);
    out.mode = bg;
    out.baseHex = lchToHex(L, C, a.h);
    out.name = a.name;
    out.chrome = chromeColor(out.baseHex);
    if (bg.endsWith('s')) {
      out.fieldCss = out.baseHex;
    } else if (bg.endsWith('t')) {
      out.texture = true;
      out.fieldCss = out.baseHex; // hatch overlay rendered by Board
    } else if (bg.endsWith('g')) {
      out.gradient = true;
      const b = randPick(band.filter((x) => x.name !== a.name));
      out.secondHex = lchToHex(L, C, b.h);
      out.name = `${a.name} · ${b.name}`;
      out.fieldCss = `linear-gradient(135deg, ${out.baseHex} 0%, ${out.secondHex} 100%)`;
    }
    return out;
  }

  // Anything else → treat as image URL
  if (/^https?:\/\//.test(bg) || bg.startsWith('/')) {
    out.mode = 'url';
    out.fieldCss = `url(${bg})`;
    out.chrome = '#F2F4F8';
    return out;
  }

  // Hex literal
  if (/^#?[0-9a-fA-F]{6}$/.test(bg)) {
    out.mode = 'hex';
    out.baseHex = bg.startsWith('#') ? bg : '#' + bg;
    out.chrome = chromeColor(out.baseHex);
    out.fieldCss = out.baseHex;
    return out;
  }

  return out;
}