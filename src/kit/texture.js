// Screen-space substrate: paper, film grain, vignette.
// Textures are generated once into plain canvases and reused; they never
// depend on time, so they cannot introduce frame-to-frame flicker.

import { rngFor, TAU } from './math.js';
import { alpha } from './color.js';

const paperCache = new Map();
const grainCache = new Map();
const patternCache = new WeakMap();

export function paperCanvas(w, h, { tone = '#f1e8d6', seed = 11, fiber = 2600, specks = 7000, laid = false } = {}) {
  const key = `${w}x${h}:${tone}:${seed}:${fiber}:${specks}:${laid}`;
  if (paperCache.has(key)) return paperCache.get(key);

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const rand = rngFor(seed);

  c.fillStyle = tone;
  c.fillRect(0, 0, w, h);

  // Large soft stains: gives the sheet uneven age.
  for (let i = 0; i < 26; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (0.08 + rand() * 0.22) * Math.max(w, h);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() > 0.5;
    g.addColorStop(0, alpha(dark ? '#8a6d42' : '#ffffff', 0.035 + rand() * 0.035));
    g.addColorStop(1, alpha(dark ? '#8a6d42' : '#ffffff', 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Fibers.
  c.lineCap = 'round';
  for (let i = 0; i < fiber; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 2 + rand() * 14;
    const ang = rand() * TAU;
    c.strokeStyle = alpha(rand() > 0.5 ? '#6f5636' : '#fffaf0', 0.025 + rand() * 0.05);
    c.lineWidth = 0.5 + rand() * 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    c.stroke();
  }

  // Laid lines (handmade paper / rubbing paper).
  if (laid) {
    for (let y = 0; y < h; y += 5) {
      c.strokeStyle = alpha('#5c452c', 0.028);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, y + 0.5);
      c.lineTo(w, y + 0.5);
      c.stroke();
    }
  }

  // Specks.
  for (let i = 0; i < specks; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rand() * 1.1;
    c.fillStyle = alpha(rand() > 0.7 ? '#4f3a24' : '#b9a789', 0.05 + rand() * 0.12);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  // Slight edge darkening; sheets are handled, not screens.
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  vg.addColorStop(0, 'rgba(60,40,20,0)');
  vg.addColorStop(1, 'rgba(60,40,20,0.12)');
  c.fillStyle = vg;
  c.fillRect(0, 0, w, h);

  paperCache.set(key, cv);
  return cv;
}

export function drawPaper(g, opts = {}) {
  const cv = paperCanvas(g.width, g.height, opts);
  const c = g.drawingContext;
  c.save();
  c.globalAlpha = opts.alpha ?? 1;
  c.drawImage(cv, 0, 0);
  c.restore();
}

export function grainTile(seed = 7, size = 256) {
  const key = `${seed}:${size}`;
  if (grainCache.has(key)) return grainCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const rand = rngFor(seed);
  for (let i = 0; i < size * size; i += 1) {
    const v = rand();
    const lum = v > 0.5 ? 255 : 0;
    img.data[i * 4] = lum;
    img.data[i * 4 + 1] = lum;
    img.data[i * 4 + 2] = lum;
    img.data[i * 4 + 3] = Math.pow(rand(), 2) * 90;
  }
  c.putImageData(img, 0, 0);
  grainCache.set(key, cv);
  return cv;
}

export function grain(g, amount = 0.06, seed = 7) {
  const c = g.drawingContext;
  const tile = grainTile(seed);
  let pat = patternCache.get(c);
  if (!pat || pat.__tile !== tile) {
    pat = c.createPattern(tile, 'repeat');
    pat.__tile = tile;
    patternCache.set(c, pat);
  }
  c.save();
  c.globalAlpha = amount;
  c.fillStyle = pat;
  c.fillRect(0, 0, g.width, g.height);
  c.restore();
}

export function vignette(g, strength = 0.28, color = '10, 8, 6') {
  const c = g.drawingContext;
  const w = g.width;
  const h = g.height;
  const gr = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
  gr.addColorStop(0, `rgba(${color}, 0)`);
  gr.addColorStop(1, `rgba(${color}, ${strength})`);
  c.save();
  c.fillStyle = gr;
  c.fillRect(0, 0, w, h);
  c.restore();
}

export function softEllipse(g, x, y, rx, ry, color, opacity = 0.25) {
  const c = g.drawingContext;
  const gr = c.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  gr.addColorStop(0, alpha(color, opacity));
  gr.addColorStop(1, alpha(color, 0));
  c.save();
  c.translate(x, y);
  c.scale(1, ry / Math.max(rx, ry));
  c.fillStyle = gr;
  c.beginPath();
  c.arc(0, 0, Math.max(rx, ry), 0, TAU);
  c.fill();
  c.restore();
}
