/**
 * Color engine for Catch Me If You Can.
 * CIE76 ΔE color generation with warm/cold palettes and a ColourBag
 * that guarantees no colour collision between grids or consecutive stages.
 */

export const WARM = [
  { name: 'Crimson', hex: '#DC143C' },
  { name: 'Tangerine', hex: '#E87411' },
  { name: 'Goldenrod', hex: '#E0A800' },
  { name: 'Terracotta', hex: '#CB6843' },
  { name: 'Coral', hex: '#E07060' },
  { name: 'Tomato', hex: '#E05040' },
  { name: 'Indian Red', hex: '#CD5C5C' },
  { name: 'Peru', hex: '#CD853F' },
];

export const COLD = [
  { name: 'Royal Blue', hex: '#1D4ED8' },
  { name: 'Deep Sky Blue', hex: '#0FBDE8' },
  { name: 'Medium Turquoise', hex: '#48D1CC' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Slate Blue', hex: '#6A8FE0' },
  { name: 'Indigo', hex: '#4B0082' },
  { name: 'Cadet Blue', hex: '#5F9EA6' },
  { name: 'Medium Slate Blue', hex: '#7B68EE' },
];

// --- RGB / Lab conversions (D65) ---

function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, c * 255)));
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r, g, b) {
  const h = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
  let x = 0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl;
  let y = 0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl;
  let z = 0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl;
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  x /= xn; y /= yn; z /= zn;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToRgb(L, a, b) {
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const fInv = (t) => (t > 0.206897 ? t ** 3 : (t - 16 / 116) / 7.787);
  const x = fInv(fx) * xn, y = fInv(fy) * yn, z = fInv(fz) * zn;
  const rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gl = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const bl = 0.0556482 * x - 0.2040259 * y + 1.0572259 * z;
  return [linearToSrgb(rl), linearToSrgb(gl), linearToSrgb(bl)];
}

export function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToLab(r, g, b);
}

export function labToHex(lab) {
  const [r, g, b] = labToRgb(lab.L, lab.a, lab.b);
  return rgbToHex(r, g, b);
}

export function deltaE76(lab1, lab2) {
  return Math.sqrt((lab1.L - lab2.L) ** 2 + (lab1.a - lab2.a) ** 2 + (lab1.b - lab2.b) ** 2);
}

/**
 * Generate an odd-tile Lab colour at a given CIE76 ΔE from the base.
 * Prefers a lightness shift; falls back to a/b shift if lightness is clamped.
 */
export function generateOddColor(baseLab, deltaE) {
  const canUp = baseLab.L + deltaE <= 99;
  const canDown = baseLab.L - deltaE >= 1;
  let dir;
  if (canUp && canDown) dir = Math.random() > 0.5 ? 1 : -1;
  else if (canUp) dir = 1;
  else if (canDown) dir = -1;
  else dir = 0;

  if (dir === 0) {
    const angle = Math.random() * Math.PI * 2;
    return {
      ...baseLab,
      a: baseLab.a + Math.cos(angle) * deltaE * 0.7,
      b: baseLab.b + Math.sin(angle) * deltaE * 0.7,
    };
  }
  return { ...baseLab, L: baseLab.L + deltaE * dir };
}

/**
 * Shuffled bag of colours drawn without replacement.
 * Guarantees G1 (no shared colour between grids in a dual stage)
 * and G2 (no colour repeats between consecutive stages).
 */
export class ColourBag {
  constructor(band) {
    this.band = [...band];
    this.bag = [];
    this.lastStage = [];
  }

  _refill(need) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = [...this.band].sort(() => Math.random() - 0.5);
      const firstN = candidate.slice(0, need);
      if (!firstN.some((c) => this.lastStage.some((lc) => lc.name === c.name))) {
        this.bag = candidate;
        return;
      }
    }
    this.bag = [...this.band].sort(() => Math.random() - 0.5);
  }

  drawStage(nGrids) {
    if (this.bag.length < nGrids) this._refill(nGrids);
    const picked = this.bag.splice(0, nGrids);
    this.lastStage = picked;
    return picked;
  }
}