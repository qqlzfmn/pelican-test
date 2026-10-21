// 3 — 汉画像石拓片 / Han stone rubbing (c. 100 CE).
// Black ink rubbed onto fibrous paper over a carved stone: the raised chisel
// lines stay white, the recessed ground takes ink. A chariot procession moves
// right; the pelican rides in the queue. The stone, the procession and the
// paper weathering are cached; the rider, the lead horse's head, an official's
// cap and the seal are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { TAU, clamp, easeOut, rngFor, smoothstep } from '../kit/math.js';
import { cachedLayer, drawCached, CACHE } from '../kit/cache.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { rigPose } from '../rig/pose.js';

const pal = basePalette({
  bg: '#141311', bg2: '#1b1916', motif: '#d9d2c2', accent: '#a89f8d',
  ink: '#0b0a09', titleInk: '#e8e1d2', scrim: '#000000', ground: '#141311',
  road: '#141311', dash: '#3a352c', body: '#ded4c0', beak: '#cfc5b0',
  rigInk: '#0b0a09',
});

const PAPER = '#d9d2c2';
const CHALK = '#e8dfcd';
const GREY = '#b0a795';
const DIM = '#7f786a';
const FILL = '#3a332a';
const DEEP = '#171410';
const SEAL = '#a13f28';

const LAYER = { x0: CACHE.x0, y0: CACHE.y0, w: CACHE.w, h: CACHE.h };

const GY = 820;
const NEAR_HORSE = 840;
const FAR_HORSE = 780;
const CART_X = 1010;
const CAP_MAN = { x: 1170, gy: GY, h: 246 };

export default {
  id: 's03',
  number: 3,
  cn: '汉画像石拓片',
  en: 'Han Stone Rubbing',
  year: '约100 · 东汉',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    const stone = cachedLayer(ctx, 's03-stone', drawStone, LAYER);
    drawCached(g, stone);

    // The shared road keeps the wheel-speed scroll; here it is invisible
    // ground, only its grit and faint stone edge register.
    ctx.road(g, {
      ground: 'rgba(0,0,0,0)',
      verge: 'rgba(0,0,0,0)',
      road: 'rgba(0,0,0,0)',
      edge: '#3a352c',
      dash: '#2b2721',
      ink: '#000000',
      dust: false,
    });

    const proc = cachedLayer(ctx, 's03-proc', drawProcession, LAYER);
    drawCached(g, proc);

    drawLeadHead(g, ctx);
    drawFlyingCap(g, ctx);
    drawSeal(g, ctx);
    drawRiderWhite(g, ctx);
    drawRideDust(g, ctx);

    // Fibres, creases and paper scuffs ride over every mark so the whole
    // picture sits *under* the paper.
    const over = cachedLayer(ctx, 's03-over', drawWeathering, LAYER);
    drawCached(g, over);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawRubbingTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- primitives

function a(c, k) {
  return alpha(c, k);
}

function jitter(pts, seed, amp = 0.8) {
  const rand = rngFor(seed);
  return pts.map((p) => ({
    x: p.x + (rand() - 0.5) * amp,
    y: p.y + (rand() - 0.5) * amp,
  }));
}

function pathFrom(c, pts, close = false) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  c.lineTo(last.x, last.y);
  if (close) c.closePath();
}

function strokePts(c, pts, color, w, seed, amp = 0.8, op = 1) {
  if (!pts || pts.length < 2) return;
  const p = jitter(pts, seed, amp * 1.7);
  pathFrom(c, p, false);
  c.strokeStyle = a(color, op);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}

function fillShape(c, pts, fill, line, w, seed, amp = 0.8, op = 1) {
  const p = jitter(pts, seed, amp);
  pathFrom(c, p, true);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (line) {
    c.strokeStyle = a(line, op);
    c.lineWidth = w;
    c.lineJoin = 'round';
    c.stroke();
  }
}

// Angular fill for chiselled forms: no midpoint smoothing, so corners stay.
function fillSharp(c, pts, fill, line, w, seed, amp = 0.6, op = 1) {
  const p = jitter(pts, seed, amp);
  c.beginPath();
  c.moveTo(p[0].x, p[0].y);
  for (let i = 1; i < p.length; i += 1) c.lineTo(p[i].x, p[i].y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (line) {
    c.strokeStyle = a(line, op);
    c.lineWidth = w;
    c.lineJoin = 'miter';
    c.stroke();
  }
}

function chiselEllipse(c, cx, cy, rx, ry, rot, color, w, seed, op = 1) {
  const rand = rngFor(seed);
  const n = 28;
  c.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const ang = (i / n) * TAU;
    const wob = 1 + (rand() - 0.5) * 0.018;
    const x = Math.cos(ang) * rx * wob;
    const y = Math.sin(ang) * ry * wob;
    const px = cx + x * Math.cos(rot) - y * Math.sin(rot);
    const py = cy + x * Math.sin(rot) + y * Math.cos(rot);
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.strokeStyle = a(color, op);
  c.lineWidth = w;
  c.stroke();
}

function bezier(p0, p1, p2, p3, n = 12) {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const v = 1 - u;
    out.push({
      x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * p3.x,
      y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * p3.y,
    });
  }
  return out;
}

function offsetPts(pts, off) {
  return pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: p.x - (dy / d) * off, y: p.y + (dx / d) * off };
  });
}

function taper(c, spine, w0, w1, fill, line, seed, op = 1) {
  const n = spine.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i += 1) {
    const p = spine[i];
    const q = spine[Math.min(n - 1, i + 1)];
    const r = spine[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const d = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
    left.push({ x: p.x - (dy / d) * w, y: p.y + (dx / d) * w });
    right.push({ x: p.x + (dy / d) * w, y: p.y - (dx / d) * w });
  }
  const outline = left.concat(right.slice().reverse());
  c.beginPath();
  c.moveTo(outline[0].x, outline[0].y);
  for (let i = 1; i < outline.length; i += 1) c.lineTo(outline[i].x, outline[i].y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (line) {
    strokePts(c, left, line, 2.1, seed, 0.7, op);
    strokePts(c, right, line, 2.1, seed + 5, 0.7, op);
  }
  return { left, right };
}

function tube(c, p0, p1, color, w, gap, seed, op = 1) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * gap * 0.5;
  const ny = (dx / d) * gap * 0.5;
  strokePts(c, [{ x: p0.x + nx, y: p0.y + ny }, { x: p1.x + nx, y: p1.y + ny }], color, w, seed, 0.6, op);
  strokePts(c, [{ x: p0.x - nx, y: p0.y - ny }, { x: p1.x - nx, y: p1.y - ny }], color, w * 0.75, seed + 7, 0.6, op * 0.8);
}

function hline(c, x0, x1, y, color, w, seed, op = 1, amp = 1) {
  const n = Math.max(2, Math.round(Math.abs(x1 - x0) / 26));
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push({ x, y: y + Math.sin(i * 0.9 + seed) * 0.9 });
  }
  strokePts(c, pts, color, w, seed, amp, op);
}

// ---------------------------------------------------------------- substrate

function drawStone(pg, c) {
  const rand = rngFor(3001);
  const x0 = CACHE.x0;
  const y0 = CACHE.y0;
  const w = CACHE.w;
  const h = CACHE.h;

  c.fillStyle = '#141311';
  c.fillRect(x0, y0, w, h);

  // Ink held unevenly: broad thin and thick pools.
  for (let i = 0; i < 120; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const r = 70 + rand() * 380;
    const light = rand() > 0.4;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light
      ? a('#5d564a', 0.04 + rand() * 0.05)
      : a('#000000', 0.10 + rand() * 0.16));
    gr.addColorStop(1, a('#000000', 0));
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Long ink streaks from the rubbing pad.
  for (let i = 0; i < 80; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const len = 60 + rand() * 260;
    const ang = -0.06 + rand() * 0.12;
    c.strokeStyle = a(rand() > 0.5 ? '#4a443a' : '#000000', 0.025 + rand() * 0.05);
    c.lineWidth = 6 + rand() * 26;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    c.stroke();
  }

  // Stone bedding: long shallow waves where the slab was dressed.
  c.lineCap = 'round';
  for (let i = 0; i < 90; i += 1) {
    const sx = x0 - 100 + rand() * w;
    const sy = y0 + rand() * h;
    const len = 140 + rand() * 520;
    const pts = [];
    for (let k = 0; k <= 12; k += 1) {
      pts.push({
        x: sx + (len * k) / 12,
        y: sy + Math.sin(k * 0.85 + i * 0.7) * (2 + rand() * 2),
      });
    }
    strokePts(c, pts, rand() > 0.5 ? '#6a6355' : '#000000', 1.5 + rand() * 4, 3500 + i, 0.4, 0.018 + rand() * 0.03);
  }

  // Fibrous paper: short pale hairs, mostly horizontal.
  c.lineCap = 'round';
  for (let i = 0; i < 5000; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const len = 2 + rand() * 18;
    const ang = (rand() - 0.5) * 0.45;
    c.strokeStyle = a(rand() > 0.35 ? '#efe6d4' : '#7a7364', 0.02 + rand() * 0.05);
    c.lineWidth = 0.5 + rand() * 0.8;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    c.stroke();
  }

  // Stone pitting: the chisel skipped here, so the paper stayed white.
  for (let i = 0; i < 1700; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const r = 0.5 + rand() * 2.1;
    c.fillStyle = a(rand() > 0.5 ? CHALK : DIM, 0.06 + rand() * 0.2);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.fillStyle = a('#000000', 0.18);
    c.beginPath();
    c.arc(x + r * 0.8, y + r * 0.7, r * 0.8, 0, TAU);
    c.fill();
  }

  // Broad rubbed-out patches near the sheet edges.
  for (let i = 0; i < 22; i += 1) {
    const edge = i % 4;
    const x = edge === 0 ? x0 + rand() * 90 : edge === 1 ? x0 + w - rand() * 90 : x0 + rand() * w;
    const y = edge === 2 ? y0 + rand() * 80 : edge === 3 ? y0 + h - rand() * 80 : y0 + rand() * h;
    const r = 40 + rand() * 120;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, a(PAPER, 0.07 + rand() * 0.07));
    gr.addColorStop(1, a(PAPER, 0));
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Torn corner, top right: the sheet lifted and the white paper shows.
  drawTear(c, 1270, -50, 320, 200, 2.1, -0.1, 7);
  drawTear(c, -500, 1020, 300, 190, 1.0, Math.PI, 11);

  // Carved frame: a lozenge band on the top and right of the slab.
  drawBorder(c);
}

function drawTear(c, cx, cy, rx, ry, dir, rot, seed) {
  const rand = rngFor(seed);
  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.beginPath();
  c.moveTo(-rx, -ry);
  const n = 26;
  for (let i = 0; i <= n; i += 1) {
    const u = i / n;
    const x = dir > 1.5
      ? rx * Math.cos(u * Math.PI * 0.5) * (0.7 + rand() * 0.3)
      : -rx + u * rx * 2;
    const y = -ry + Math.sin(u * Math.PI) * ry * 1.1 * (0.7 + rand() * 0.3);
    c.lineTo(x, y);
  }
  c.lineTo(rx * 1.2, -ry * 1.6);
  c.lineTo(-rx * 1.2, -ry * 1.6);
  c.closePath();
  c.fillStyle = a('#c9bfad', 0.09 + rand() * 0.06);
  c.fill();
  // Ragged fibre edge.
  for (let i = 0; i < 80; i += 1) {
    const u = rand();
    const x = -rx + u * rx * 2;
    const y = -ry + Math.sin(u * Math.PI) * ry * 1.02;
    c.strokeStyle = a('#efe6d4', 0.05 + rand() * 0.11);
    c.lineWidth = 0.6 + rand();
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (rand() - 0.5) * 16, y - 4 - rand() * 34);
    c.stroke();
  }
  c.restore();
}

function drawBorder(c) {
  const top = 46;
  const right = 1352;
  const bandW = 56;

  hline(c, -760, 1470, top, GREY, 2.6, 610, 0.8, 1.6);
  hline(c, -760, 1470, top + bandW, GREY, 2.2, 611, 0.7, 1.6);
  hline(c, -760, 1470, top + 3, CHALK, 1, 612, 0.35, 1.4);

  const rnd = rngFor(613);
  for (let y = top; y < 1120; y += 30) {
    strokePts(c, [{ x: right + (rnd() - 0.5) * 1.6, y }, { x: right + (rnd() - 0.5) * 1.6, y: y + 28 }], GREY, 2.2, 620 + y, 0.5, 0.7);
    strokePts(c, [{ x: right + bandW, y }, { x: right + bandW, y: y + 28 }], GREY, 1.7, 660 + y, 0.5, 0.55);
  }

  // Lozenge row along the top.
  for (let x = -740; x < 1480; x += 66) {
    const cx = x + 33;
    const cy = top + bandW * 0.5;
    const pts = [
      { x: cx - 27, y: cy }, { x: cx, y: cy - 19 },
      { x: cx + 27, y: cy }, { x: cx, y: cy + 19 },
    ];
    fillShape(c, pts, null, GREY, 1.6, 700 + x, 0.6, 0.62);
    if ((Math.round(x / 66) & 1) === 0) {
      c.fillStyle = a(GREY, 0.4);
      c.beginPath();
      c.arc(cx, cy, 2.8, 0, TAU);
      c.fill();
    }
  }

  for (let y = top + 42; y < 1120; y += 66) {
    const cy = y + 33;
    const cx = right + bandW * 0.5;
    const pts = [
      { x: cx - 18, y: cy - 27 }, { x: cx + 18, y: cy }, { x: cx - 18, y: cy + 27 },
    ];
    fillShape(c, pts, null, GREY, 1.5, 760 + y, 0.6, 0.55);
  }

  // Tool marks along the frame.
  const rand = rngFor(790);
  for (let i = 0; i < 54; i += 1) {
    const vertical = rand() > 0.5;
    const x = vertical ? -600 + rand() * 1900 : right + rand() * 64;
    const y = vertical ? top + rand() * 64 : -20 + rand() * 1000;
    strokePts(
      c,
      [{ x, y }, { x: x + (vertical ? 8 + rand() * 26 : 0), y: y + (vertical ? 0 : 8 + rand() * 22) }],
      CHALK, 0.9, 800 + i, 0.8, 0.10 + rand() * 0.12,
    );
  }
}

// ---------------------------------------------------------------- procession

function drawProcession(pg, c) {
  drawHorizon(c);
  drawBirds(c);
  drawGround(c);

  // A gate tower behind the queue, the stone's only architecture.
  drawTower(c, -196, 742);

  drawOfficial(c, { x: 168, gy: GY, h: 238, seed: 940, staff: true });
  drawOfficial(c, { x: 268, gy: GY, h: 222, seed: 950, halberd: true });

  // The chariot and its two horses.
  drawHorse(c, { front: FAR_HORSE, gy: GY - 7, seed: 960, dim: 0.62 });
  drawCart(c);
  drawHorse(c, { front: NEAR_HORSE, gy: GY, seed: 970, dim: 1 });

  drawBanner(c, 1278, GY);
  drawOfficial(c, { x: CAP_MAN.x, gy: CAP_MAN.gy, h: CAP_MAN.h, seed: 980, noCap: true });
}

function drawHorizon(c) {
  const ridge = (y, amp, seed, op) => {
    const pts = [];
    for (let x = -760; x <= 1480; x += 40) {
      pts.push({ x, y: y + Math.sin(x * 0.006 + seed) * amp + Math.sin(x * 0.017 + seed * 2) * amp * 0.35 });
    }
    strokePts(c, pts, GREY, 2.1, seed, 2.4, op);
  };
  ridge(700, 15, 11, 0.36);
  ridge(722, 10, 23, 0.25);

  const rand = rngFor(31);
  for (let i = 0; i < 170; i += 1) {
    const x = -740 + rand() * 2180;
    const y = 730 + rand() * 44;
    strokePts(c, [{ x, y }, { x: x + 20 + rand() * 52, y: y + 4 + rand() * 6 }], GREY, 1, 40 + i, 1, 0.10 + rand() * 0.1);
  }

  // Small carved peaks.
  for (const [px, py, pwid] of [[-560, 714, 96], [664, 706, 78], [1216, 712, 120], [112, 718, 64]]) {
    fillShape(c, [
      { x: px - pwid, y: py },
      { x: px - pwid * 0.45, y: py - 52 },
      { x: px - pwid * 0.1, y: py - 26 },
      { x: px + pwid * 0.12, y: py - 62 },
      { x: px + pwid * 0.6, y: py - 34 },
      { x: px + pwid, y: py },
    ], null, GREY, 1.7, 1200 + px, 1.2, 0.3);
    strokePts(c, [
      { x: px - pwid * 0.1, y: py - 24 },
      { x: px + pwid * 0.05, y: py - 40 },
      { x: px + pwid * 0.2, y: py - 22 },
    ], GREY, 1, 1250 + px, 1, 0.2);
  }

  // Low hills behind the queue.
  for (const [hx, hy, hr] of [[-260, 700, 200], [1200, 694, 250]]) {
    for (let k = 1; k <= 3; k += 1) {
      c.beginPath();
      c.ellipse(hx, hy + 40, hr * (0.4 + k * 0.2), 44 * (0.4 + k * 0.2), 0, Math.PI, TAU);
      c.strokeStyle = a(GREY, 0.2);
      c.lineWidth = 1.4;
      c.stroke();
    }
  }
}

function drawBirds(c) {
  const BIRDS = [
    [190, 232, 10], [248, 266, 8], [286, 214, 7], [336, 250, 9], [368, 288, 7],
    [408, 190, 8], [438, 230, 6], [490, 276, 7], [536, 214, 6], [588, 258, 7],
    [646, 320, 6], [704, 208, 5], [930, 168, 7], [978, 202, 6], [1036, 236, 6],
    [1102, 190, 5], [1150, 258, 5], [1196, 170, 4],
  ];
  BIRDS.forEach(([x, y, s], i) => {
    strokePts(c, [{ x: x - s, y: y - s * 0.6 }, { x, y }, { x: x + s, y: y - s * 0.55 }], CHALK, 1.9, 500 + i, 0.8, 0.55);
    strokePts(c, [{ x: x - s * 0.45, y: y - s * 0.25 }, { x, y: y + s * 0.18 }], CHALK, 1.1, 530 + i, 0.5, 0.32);
  });

  const clouds = [
    [-70, 156, 1.2], [40, 260, 1], [1120, 300, 1.1], [1180, 360, 0.9], [820, 130, 0.8],
    [300, 128, 0.9], [650, 340, 0.8], [980, 96, 0.7], [1300, 220, 0.9],
  ];
  clouds.forEach(([x, y, s], i) => {
    const pts = [];
    for (let k = 0; k <= 18; k += 1) {
      const u = k / 18;
      pts.push({
        x: x + u * 300 * s,
        y: y + Math.sin(u * TAU * 1.4 + 0.6) * 18 * s - u * 10,
      });
    }
    strokePts(c, pts, GREY, 2, 570 + i, 1, 0.3);
    const inner = pts.map((p) => ({ x: p.x, y: p.y + 9 }));
    strokePts(c, inner, GREY, 1.2, 580 + i, 1, 0.16);
  });
}

function drawGround(c) {
  hline(c, -760, 1470, GY, CHALK, 3, 601, 0.78, 1.4);
  hline(c, -760, 1470, GY + 10, GREY, 1.4, 602, 0.45, 1.4);

  const rand = rngFor(603);
  for (let i = 0; i < 110; i += 1) {
    const x = -760 + rand() * 2260;
    const y = 744 + rand() * 60;
    strokePts(c, [{ x, y }, { x: x + 30 + rand() * 90, y: y + (rand() - 0.5) * 4 }], GREY, 1, 1080 + i, 1, 0.05 + rand() * 0.09);
  }
  for (let i = 0; i < 640; i += 1) {
    const x = -760 + rand() * 2260;
    const y = GY + 16 + rand() * 180;
    const len = 14 + rand() * 84;
    strokePts(
      c,
      [{ x, y }, { x: x + len, y: y + (rand() - 0.5) * 3 }],
      rand() > 0.3 ? GREY : CHALK,
      0.8 + rand() * 1,
      900 + i,
      0.7,
      0.09 + rand() * 0.2,
    );
  }

  for (let i = 0; i < 46; i += 1) {
    const x = -720 + rand() * 2160;
    const y = GY + 4 + rand() * 30;
    if (i % 3 === 0) {
      const s = 4 + rand() * 7;
      strokePts(c, [{ x, y: y - s }, { x: x + 3, y: y - s * 1.6 }, { x: x + 7, y: y - s * 1.1 }], GREY, 1.2, 980 + i, 0.6, 0.4);
      strokePts(c, [{ x: x + 3, y: y - s * 1.6 }, { x: x + 11, y: y - s * 2 }], GREY, 1, 990 + i, 0.6, 0.35);
    } else {
      chiselEllipse(c, x, y, 4 + rand() * 6, 2 + rand() * 2, 0, GREY, 1.1, 1010 + i, 0.26);
    }
  }
}

function drawBanner(c, x, gy) {
  // Tall processional banner with wind-blown streamers.
  strokePts(c, [{ x, y: gy - 4 }, { x: x + 2, y: gy - 322 }], CHALK, 3, 1101, 0.7, 0.9);
  strokePts(c, [{ x: x + 8, y: gy - 2 }, { x: x + 9, y: gy - 320 }], GREY, 1.2, 1102, 0.6, 0.5);
  // Crossbar and finial.
  hline(c, x - 34, x + 8, gy - 320, CHALK, 2.4, 1103, 0.85);
  c.fillStyle = a(CHALK, 0.7);
  c.beginPath();
  c.arc(x + 2, gy - 330, 4, 0, TAU);
  c.fill();
  // Hanging banner cloth.
  fillShape(c, [
    { x: x - 32, y: gy - 318 },
    { x: x - 4, y: gy - 318 },
    { x: x - 6, y: gy - 258 },
    { x: x - 18, y: gy - 264 },
    { x: x - 30, y: gy - 256 },
  ], a(FILL, 1), CHALK, 2, 1104, 0.7, 0.9);
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [{ x: x - 26 + i * 7, y: gy - 310 }, { x: x - 22 + i * 6, y: gy - 268 }], GREY, 1.1, 1105 + i, 0.7, 0.45);
  }
  // Streamers blowing back (left).
  for (let i = 0; i < 3; i += 1) {
    const yy = gy - 336 + i * 15;
    strokePts(c, [
      { x: x - 30, y: yy },
      { x: x - 70, y: yy - 6 + i * 3 },
      { x: x - 112, y: yy + 2 + i * 4 },
      { x: x - 140, y: yy - 6 + i * 4 },
    ], CHALK, 1.7, 1110 + i, 1, 0.65);
  }
}

// ---------------------------------------------------------------- horse

function drawHorse(c, { front, gy, seed, dim = 1 }) {
  const f = front;
  const body = [
    { x: f + 22, y: gy - 146 },
    { x: f + 27, y: gy - 170 },
    { x: f + 18, y: gy - 192 },
    { x: f - 2, y: gy - 201 },
    { x: f - 42, y: gy - 205 },
    { x: f - 96, y: gy - 206 },
    { x: f - 140, y: gy - 199 },
    { x: f - 166, y: gy - 187 },
    { x: f - 183, y: gy - 170 },
    { x: f - 189, y: gy - 150 },
    { x: f - 182, y: gy - 130 },
    { x: f - 162, y: gy - 114 },
    { x: f - 128, y: gy - 105 },
    { x: f - 88, y: gy - 101 },
    { x: f - 52, y: gy - 104 },
    { x: f - 24, y: gy - 114 },
    { x: f - 6, y: gy - 130 },
  ];
  fillShape(c, body, a(FILL, dim), CHALK, 3.8, seed, 0.9, dim);

  // Far legs.
  const farFront = [
    { x: f - 2, y: gy - 138 }, { x: f - 16, y: gy - 78 },
    { x: f - 12, y: gy - 22 }, { x: f - 6, y: gy - 3 },
  ];
  const farHind = [
    { x: f - 148, y: gy - 138 }, { x: f - 168, y: gy - 78 },
    { x: f - 166, y: gy - 22 }, { x: f - 156, y: gy - 2 },
  ];
  c.save();
  c.globalAlpha = dim * 0.5;
  for (const leg of [farFront, farHind]) {
    strokePts(c, leg, FILL, 13, seed + leg[0].x, 0.5, 1);
    strokePts(c, offsetPts(leg, 4), GREY, 1.5, seed + 3, 0.5, 0.8);
    strokePts(c, offsetPts(leg, -4), GREY, 1.5, seed + 9, 0.5, 0.8);
  }
  c.restore();

  // Near legs, double white line with joints.
  const nearFront = [
    { x: f + 12, y: gy - 140 }, { x: f + 28, y: gy - 80 },
    { x: f + 24, y: gy - 24 }, { x: f + 30, y: gy - 2 },
  ];
  const nearHind = [
    { x: f - 158, y: gy - 140 }, { x: f - 180, y: gy - 80 },
    { x: f - 176, y: gy - 24 }, { x: f - 188, y: gy - 2 },
  ];
  for (const leg of [nearFront, nearHind]) {
    strokePts(c, leg, FILL, 15, seed + leg[0].x, 0.5, 1);
    strokePts(c, offsetPts(leg, 4.6), GREY, 1.9, seed + 2, 0.5, 0.92 * dim);
    strokePts(c, offsetPts(leg, -4.6), GREY, 1.9, seed + 8, 0.5, 0.92 * dim);
    chiselEllipse(c, leg[1].x, leg[1].y, 5, 4, 0.2, GREY, 1.2, seed + 4, 0.5 * dim);
    chiselEllipse(c, leg[2].x, leg[2].y, 3.6, 3, 0.2, GREY, 1, seed + 5, 0.45 * dim);
    const h = leg[3];
    fillShape(c, [
      { x: h.x - 8, y: h.y - 1 }, { x: h.x + 10, y: h.y - 1 },
      { x: h.x + 9, y: h.y + 7 }, { x: h.x - 7, y: h.y + 7 },
    ], DEEP, CHALK, 1.6, seed + 6, 0.5, 0.85 * dim);
  }

  // Tail: long rubbing strands.
  const tailBase = { x: f - 186, y: gy - 164 };
  for (let i = 0; i < 7; i += 1) {
    const pts = [
      tailBase,
      { x: tailBase.x - 20, y: tailBase.y + 6 + i * 5 },
      { x: tailBase.x - 40 - i * 2, y: tailBase.y + 24 + i * 6 },
      { x: tailBase.x - 36 - i * 5, y: tailBase.y + 54 + i * 7 },
    ];
    strokePts(c, pts, i === 0 ? CHALK : GREY, 2.2 - i * 0.13, seed + 50 + i, 1.2, 0.8 * dim);
  }

  // Ribs, shoulder and haunch.
  for (let i = 0; i < 5; i += 1) {
    strokePts(c, [
      { x: f - 34 - i * 17, y: gy - 186 },
      { x: f - 42 - i * 17, y: gy - 146 },
      { x: f - 34 - i * 17, y: gy - 110 },
    ], GREY, 1.4, seed + 70 + i, 1, 0.42 * dim);
  }
  strokePts(c, [
    { x: f - 142, y: gy - 184 },
    { x: f - 160, y: gy - 158 },
    { x: f - 162, y: gy - 132 },
    { x: f - 146, y: gy - 110 },
  ], GREY, 1.9, seed + 80, 1, 0.7 * dim);
  strokePts(c, [
    { x: f - 170, y: gy - 176 },
    { x: f - 184, y: gy - 150 },
    { x: f - 176, y: gy - 124 },
  ], GREY, 1.2, seed + 81, 1, 0.5 * dim);
  strokePts(c, [
    { x: f + 20, y: gy - 152 },
    { x: f + 4, y: gy - 128 },
    { x: f + 8, y: gy - 108 },
  ], GREY, 1.7, seed + 82, 1, 0.55 * dim);
  strokePts(c, [
    { x: f + 12, y: gy - 196 },
    { x: f - 2, y: gy - 170 },
    { x: f + 4, y: gy - 140 },
  ], CHALK, 1.5, seed + 83, 1, 0.4 * dim);

  // Coat: short chisel ticks following the barrel.
  const coatRand = rngFor(seed + 200);
  for (let i = 0; i < 46; i += 1) {
    const bx = f - 176 + coatRand() * 196;
    const by = gy - 200 + coatRand() * 92;
    const dy = (by - (gy - 158)) / 44;
    const dx = (bx - (f - 84)) / 104;
    if (dx * dx + dy * dy > 1) continue;
    strokePts(c, [
      { x: bx, y: by },
      { x: bx + 7 + coatRand() * 9, y: by + 1 + coatRand() * 5 },
    ], GREY, 0.9, seed + 210 + i, 0.5, 0.16 + coatRand() * 0.14);
  }
  for (let i = 0; i < 30; i += 1) {
    const bx = f - 168 + coatRand() * 182;
    const by = gy - 192 + coatRand() * 82;
    const dy = (by - (gy - 158)) / 42;
    const dx = (bx - (f - 84)) / 100;
    if (dx * dx + dy * dy > 1) continue;
    strokePts(c, [
      { x: bx, y: by },
      { x: bx - 5 - coatRand() * 4, y: by + 8 + coatRand() * 6 },
    ], GREY, 0.8, seed + 280 + i, 0.5, 0.12 + coatRand() * 0.08);
  }
  // Mane ridge along the withers.
  strokePts(c, [
    { x: f - 6, y: gy - 202 },
    { x: f - 34, y: gy - 208 },
    { x: f - 70, y: gy - 209 },
  ], CHALK, 1.6, seed + 260, 0.7, 0.5 * dim);

  // Yoke and harness.
  strokePts(c, [{ x: f + 2, y: gy - 200 }, { x: f - 128, y: gy - 202 }], CHALK, 2.8, seed + 90, 1, 0.85 * dim);
  strokePts(c, [{ x: f - 4, y: gy - 194 }, { x: f - 122, y: gy - 196 }], GREY, 1.4, seed + 91, 0.8, 0.5 * dim);
  strokePts(c, [
    { x: f - 30, y: gy - 200 }, { x: f - 24, y: gy - 158 }, { x: f - 16, y: gy - 116 },
  ], CHALK, 2.2, seed + 92, 1, 0.75 * dim);
  strokePts(c, [
    { x: f - 100, y: gy - 200 }, { x: f - 92, y: gy - 152 },
  ], CHALK, 2.2, seed + 93, 1, 0.6 * dim);
  // Girth strap.
  strokePts(c, [
    { x: f - 58, y: gy - 204 }, { x: f - 60, y: gy - 150 }, { x: f - 52, y: gy - 108 },
  ], GREY, 1.6, seed + 94, 0.8, 0.5 * dim);
}

function upperEdge(pts, off) {
  return pts.map((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d;
    let ny = dx / d;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: p.x + nx * off, y: p.y + ny * off };
  });
}

function horseHeadGeom(front, gy, look) {
  const f = front;
  const Hf = { x: f + 72, y: gy - 276 };
  const Mf = { x: f + 152, y: gy - 260 };
  const Hb = { x: f - 46, y: gy - 280 };
  const Mb = { x: f - 122, y: gy - 248 };
  const ctrlF = { x: f + 44, y: gy - 238 };
  const ctrlB = { x: f + 2, y: gy - 250 };
  const mixPt = (p, q) => ({ x: p.x + (q.x - p.x) * look, y: p.y + (q.y - p.y) * look });
  return {
    H: mixPt(Hf, Hb),
    M: mixPt(Mf, Mb),
    C: mixPt(ctrlF, ctrlB),
    base: { x: f + 4, y: gy - 178 },
    look,
  };
}

function drawHorseHead(c, front, gy, look, dim, seed) {
  const g = horseHeadGeom(front, gy, look);
  const len = Math.hypot(g.M.x - g.H.x, g.M.y - g.H.y);
  const ux = (g.M.x - g.H.x) / len;
  const uy = (g.M.y - g.H.y) / len;
  let nx = -uy;
  let ny = ux;
  // Keep the face's near side pointing down whatever the head's direction.
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }

  const spine = bezier(
    g.base,
    { x: g.base.x + (g.C.x - g.base.x) * 0.5, y: g.base.y + (g.C.y - g.base.y) * 0.5 },
    g.C,
    { x: g.H.x - ux * 8, y: g.H.y - uy * 8 },
    10,
  );
  taper(c, spine, 56, 30, a(FILL, dim), GREY, seed, dim);

  // Mane: a soft fringe of tufts along the top of the neck.
  const crest = upperEdge(spine, 14);
  strokePts(c, crest, CHALK, 2.2, seed + 100, 0.7, 0.85 * dim);
  for (let i = 1; i < crest.length - 1; i += 1) {
    const p = crest[i];
    const l = 9 + Math.sin(i * 2.1) * 4;
    strokePts(c, [
      p,
      { x: p.x - ux * (2 + i * 0.7) - 5, y: p.y - uy * 2 - l },
    ], CHALK, 1.7, seed + 110 + i, 0.7, 0.65 * dim);
  }
  // Forelock strands at the poll.
  for (let i = 0; i < 3; i += 1) {
    const p = crest[crest.length - 1];
    strokePts(c, [p, { x: p.x - ux * (8 + i * 4), y: p.y - uy * 8 - 6 - i * 4 }], CHALK, 1.5, seed + 130 + i, 0.8, 0.6 * dim);
  }

  // Head profile: poll, nose bridge, muzzle, jaw, jowl.
  const P = (t, off) => ({
    x: g.H.x + (g.M.x - g.H.x) * t + nx * off,
    y: g.H.y + (g.M.y - g.H.y) * t + ny * off,
  });
  fillSharp(c, [
    P(-0.03, 3),
    P(0.24, -12),
    P(0.66, -9),
    P(0.93, -8),
    P(1.04, -1),
    P(1.02, 8),
    P(0.84, 11),
    P(0.62, 16),
    P(0.28, 21),
    P(0.04, 18),
    P(-0.06, 10),
  ], a(FILL, dim), CHALK, 2.6, seed + 20, 0.7, dim);

  // Cheek and jaw line.
  chiselEllipse(c, P(0.27, 9).x, P(0.27, 9).y, 14, 12, 0, GREY, 1.4, seed + 31, 0.5 * dim);
  strokePts(c, [P(0.2, 19), P(0.5, 15), P(0.86, 12)], GREY, 1.2, seed + 30, 0.7, 0.5 * dim);
  // Throat from jaw to neck.
  strokePts(c, [P(0.03, 17), { x: g.base.x + 10, y: g.base.y + 14 }], GREY, 1.4, seed + 34, 0.8, 0.45 * dim);

  // Eye.
  const ex = P(0.3, -6).x;
  const ey = P(0.3, -6).y;
  c.fillStyle = a(CHALK, 0.95 * dim);
  c.beginPath();
  c.arc(ex, ey, 3.8, 0, TAU);
  c.fill();
  c.fillStyle = a(DEEP, dim);
  c.beginPath();
  c.arc(ex + ux * 1.2, ey + uy * 1.2, 1.9, 0, TAU);
  c.fill();
  // Brow.
  strokePts(c, [P(0.2, -8), P(0.4, -12), P(0.52, -9)], CHALK, 1.3, seed + 32, 0.6, 0.6 * dim);

  // Nostril and mouth.
  c.fillStyle = a(CHALK, 0.7 * dim);
  c.beginPath();
  c.arc(P(0.93, 3).x, P(0.93, 3).y, 2.2, 0, TAU);
  c.fill();
  strokePts(c, [P(1.02, 9), P(0.95, 14)], CHALK, 1.8, seed + 33, 0.6, dim);

  // Ears, laid back along the poll.
  for (let i = 0; i < 2; i += 1) {
    fillShape(c, [
      P(-0.02, 4),
      P(-0.14 - i * 0.04, -16 - i * 3),
      P(-0.16 - i * 0.04, -2),
    ], a(FILL, dim), CHALK, 1.6, seed + 40 + i, 0.5, 0.9 * dim);
  }

  // Forelock.
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [
      P(0, 0),
      P(-0.08 - i * 0.035, -10 - i * 2),
    ], CHALK, 1.5, seed + 45 + i, 0.7, 0.55 * dim);
  }

  // Bridle, bit and reins.
  const b0 = {
    x: g.H.x + (g.M.x - g.H.x) * 0.7,
    y: g.H.y + (g.M.y - g.H.y) * 0.7,
  };
  strokePts(c, [
    { x: b0.x - nx * 13, y: b0.y - ny * 13 },
    { x: b0.x + nx * 11, y: b0.y + ny * 11 },
  ], GREY, 1.7, seed + 50, 0.7, 0.85 * dim);
  strokePts(c, [
    { x: g.H.x - nx * 9, y: g.H.y - ny * 9 },
    { x: b0.x + nx * 9, y: b0.y + ny * 9 },
  ], GREY, 1.4, seed + 51, 0.7, 0.55 * dim);
  strokePts(c, [
    { x: b0.x + nx * 6, y: b0.y + ny * 6 },
    { x: (b0.x + 1010) / 2, y: b0.y + 46 },
    { x: 966, y: GY - 170 },
  ], GREY, 1.4, seed + 52, 1, 0.4 * dim);

  return g;
}

function drawLeadHead(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.local;
  const turn = smoothstep(1.45, 1.98, t) * (1 - smoothstep(4.55, 5.15, t));
  const look = clamp(turn + (turn > 0.2 ? Math.sin(t * 2.6) * 0.04 : 0));
  drawHorseHead(c, NEAR_HORSE, GY, look, 1, 971);
}

// ---------------------------------------------------------------- cart

function drawCart(c) {
  const x0 = CART_X - 64;
  const x1 = CART_X + 76;

  // Wheel: big, many spokes, a felly.
  chiselEllipse(c, CART_X, GY - 62, 62, 62, 0, CHALK, 3.2, 1701);
  chiselEllipse(c, CART_X, GY - 62, 56, 56, 0, GREY, 1.3, 1702, 0.7);
  for (let i = 0; i < 20; i += 1) {
    const ang = (i / 20) * TAU + 0.15;
    strokePts(c, [
      { x: CART_X + Math.cos(ang) * 7, y: GY - 62 + Math.sin(ang) * 7 },
      { x: CART_X + Math.cos(ang) * 53, y: GY - 62 + Math.sin(ang) * 53 },
    ], GREY, 1.15, 1710 + i, 0.5, 0.8);
  }
  chiselEllipse(c, CART_X, GY - 62, 10, 10, 0, CHALK, 2.2, 1730);
  chiselEllipse(c, CART_X, GY - 62, 4.5, 4.5, 0, CHALK, 1.2, 1731, 0.8);

  // Shafts to the horses.
  strokePts(c, [{ x: x0 + 4, y: GY - 128 }, { x: NEAR_HORSE - 32, y: GY - 132 }], CHALK, 2.6, 1740, 0.8, 0.85);
  strokePts(c, [{ x: x0 + 4, y: GY - 120 }, { x: FAR_HORSE - 30, y: GY - 124 }], GREY, 1.7, 1741, 0.8, 0.55);

  // Cart floor and box (a low sided cart, not a barrel).
  const floor = GY - 104;
  const rail = GY - 176;
  fillSharp(c, [
    { x: x0, y: rail + 6 }, { x: x0 + 8, y: rail - 6 },
    { x: x1 - 8, y: rail - 6 }, { x: x1, y: rail + 6 },
    { x: x1 - 6, y: floor }, { x: x0 + 6, y: floor },
  ], a(FILL, 1), CHALK, 2.8, 1750, 0.8, 1);
  hline(c, x0 + 4, x1 - 4, rail, CHALK, 2.6, 1751, 0.9);
  hline(c, x0 + 4, x1 - 4, rail + 12, GREY, 1.2, 1752, 0.55);
  hline(c, x0 + 6, x1 - 6, floor, CHALK, 2.2, 1753, 0.85);
  // Side panel slats.
  for (let i = 1; i < 6; i += 1) {
    const x = x0 + 6 + ((x1 - x0 - 12) * i) / 6;
    strokePts(c, [{ x, y: rail + 2 }, { x: x + 1, y: floor - 2 }], GREY, 1.2, 1760 + i, 0.7, 0.45);
  }
  // Studs.
  for (let i = 0; i < 4; i += 1) {
    c.fillStyle = a(CHALK, 0.6);
    c.beginPath();
    c.arc(x0 + 16 + i * 30, GY - 140, 2.2, 0, TAU);
    c.fill();
  }

  // Canopy pole and umbrella.
  strokePts(c, [{ x: CART_X + 8, y: rail - 4 }, { x: CART_X + 8, y: GY - 350 }], CHALK, 3.2, 1770, 0.6, 0.9);
  strokePts(c, [{ x: CART_X + 15, y: rail - 4 }, { x: CART_X + 15, y: GY - 350 }], GREY, 1.2, 1771, 0.6, 0.5);
  const cy = GY - 362;
  fillSharp(c, [
    { x: CART_X - 112, y: cy + 2 },
    { x: CART_X - 92, y: cy - 20 },
    { x: CART_X - 32, y: cy - 32 },
    { x: CART_X + 44, y: cy - 30 },
    { x: CART_X + 104, y: cy - 14 },
    { x: CART_X + 114, y: cy + 4 },
  ], a(FILL, 1), CHALK, 3.2, 1780, 0.8, 1);
  hline(c, CART_X - 108, CART_X + 110, cy + 4, CHALK, 2.2, 1781, 0.9);
  // Canopy ribs.
  for (let i = 0; i < 8; i += 1) {
    const x = CART_X - 94 + i * 27;
    strokePts(c, [{ x: CART_X + 8, y: cy - 26 }, { x, y: cy + 3 }], GREY, 1.1, 1790 + i, 0.6, 0.5);
  }
  // Fringe.
  for (let i = 0; i < 13; i += 1) {
    const x = CART_X - 104 + i * 17;
    strokePts(c, [{ x, y: cy + 4 }, { x: x - 2, y: cy + 18 }], CHALK, 1.2, 1800 + i, 0.6, 0.5);
  }
  // Finial.
  strokePts(c, [{ x: CART_X + 8, y: cy - 32 }, { x: CART_X + 8, y: cy - 54 }], CHALK, 2, 1810, 0.5, 0.8);
  c.fillStyle = a(CHALK, 0.7);
  c.beginPath();
  c.arc(CART_X + 8, cy - 57, 3.4, 0, TAU);
  c.fill();

  // Driver standing on the floor, both arms forward on the reins.
  const dx = CART_X + 34;
  const headY = GY - 314;
  fillShape(c, [
    { x: dx - 10, y: headY + 34 },
    { x: dx - 22, y: rail + 2 },
    { x: dx - 32, y: floor },
    { x: dx + 30, y: floor },
    { x: dx + 24, y: rail + 2 },
    { x: dx + 12, y: headY + 32 },
  ], a(FILL, 1), CHALK, 2.2, 1820, 0.7, 0.9);
  // Robe folds and hem.
  for (let i = 0; i < 4; i += 1) {
    strokePts(c, [
      { x: dx - 10 + i * 11, y: headY + 52 },
      { x: dx - 16 + i * 12, y: floor - 4 },
    ], GREY, 1.1, 1830 + i, 0.8, 0.45);
  }
  hline(c, dx - 30, dx + 28, floor - 18, GREY, 1.2, 1836, 0.5);
  // Reaching sleeves.
  strokePts(c, [
    { x: dx - 14, y: headY + 46 },
    { x: dx - 40, y: rail - 16 },
    { x: dx - 64, y: rail - 22 },
  ], CHALK, 2, 1821, 0.8, 0.85);
  strokePts(c, [
    { x: dx - 24, y: rail - 14 },
    { x: dx - 46, y: rail - 18 },
    { x: dx - 60, y: rail - 30 },
  ], GREY, 1.3, 1822, 0.7, 0.55);
  c.fillStyle = a(CHALK, 0.85);
  c.beginPath();
  c.arc(dx - 64, rail - 22, 3, 0, TAU);
  c.fill();
  // Head and cap.
  c.fillStyle = a(FILL, 1);
  c.beginPath();
  c.ellipse(dx, headY, 15, 16, 0, 0, TAU);
  c.fill();
  chiselEllipse(c, dx, headY, 15, 16, 0, CHALK, 2.3, 1840, 1);
  strokePts(c, [{ x: dx + 9, y: headY - 4 }, { x: dx + 14, y: headY + 3 }], GREY, 1.2, 1842, 0.6, 0.5);
  drawWingedCap(c, dx, headY - 18, 0.8, 1, 1841);
  // Reins.
  strokePts(c, [
    { x: dx - 62, y: rail - 22 },
    { x: (dx + NEAR_HORSE) / 2, y: GY - 200 },
    { x: NEAR_HORSE + 70, y: GY - 226 },
  ], GREY, 1.3, 1850, 1, 0.45);
}

// ---------------------------------------------------------------- tower

function drawTower(c, x, baseY) {
  const dim = 0.7;
  const plat = baseY - 122;
  const eave = plat - 92;
  const ridge = eave - 44;

  // Gate wall with a deep doorway.
  fillSharp(c, [
    { x: x - 58, y: baseY }, { x: x + 58, y: baseY },
    { x: x + 56, y: plat }, { x: x - 56, y: plat },
  ], a(FILL, dim), GREY, 2.4, 1300, 0.7, 0.85 * dim);
  fillSharp(c, [
    { x: x - 24, y: baseY }, { x: x + 24, y: baseY },
    { x: x + 24, y: plat - 44 }, { x: x + 13, y: plat - 58 },
    { x: x - 13, y: plat - 58 }, { x: x - 24, y: plat - 44 },
  ], '#141311', GREY, 1.8, 1301, 0.6, 0.75 * dim);
  strokePts(c, [{ x, y: baseY }, { x, y: plat - 56 }], GREY, 1.1, 1302, 0.5, 0.5 * dim);
  for (let i = 0; i < 4; i += 1) {
    hline(c, x - 21, x + 21, baseY - 22 - i * 24, GREY, 0.9, 1310 + i, 0.3 * dim);
  }
  for (let i = 0; i < 5; i += 1) {
    hline(c, x - 55, x + 55, baseY - 8 - i * 22, GREY, 0.8, 1320 + i, 0.14 * dim);
  }

  // Platform and parapet.
  hline(c, x - 68, x + 68, plat, CHALK, 2.6, 1330, 0.75 * dim);
  hline(c, x - 64, x + 64, plat - 4, GREY, 1, 1331, 0.4 * dim);
  for (let i = 0; i < 9; i += 1) {
    const px = x - 60 + i * 15;
    strokePts(c, [{ x: px, y: plat }, { x: px, y: plat - 18 }], GREY, 1.1, 1340 + i, 0.5, 0.35 * dim);
  }
  hline(c, x - 62, x + 62, plat - 18, GREY, 1.3, 1350, 0.45 * dim);

  // Upper hall.
  fillSharp(c, [
    { x: x - 52, y: plat - 18 }, { x: x + 52, y: plat - 18 },
    { x: x + 50, y: eave }, { x: x - 50, y: eave },
  ], a(FILL, dim), GREY, 2, 1360, 0.6, 0.7 * dim);
  for (let i = -1; i <= 1; i += 1) {
    const wx = x + i * 30;
    strokePts(c, [
      { x: wx - 8, y: eave + 20 }, { x: wx + 8, y: eave + 20 },
      { x: wx + 8, y: eave + 52 }, { x: wx - 8, y: eave + 52 },
      { x: wx - 8, y: eave + 20 },
    ], GREY, 1.1, 1370 + i, 0.5, 0.5 * dim);
    strokePts(c, [{ x: wx, y: eave + 20 }, { x: wx, y: eave + 52 }], GREY, 0.8, 1380 + i, 0.4, 0.35 * dim);
    strokePts(c, [{ x: wx - 8, y: eave + 36 }, { x: wx + 8, y: eave + 36 }], GREY, 0.8, 1390 + i, 0.4, 0.35 * dim);
  }

  // Roof.
  towerRoof(c, x, eave, ridge, 86, 40, 1410, Math.min(1, dim));
  // Ridge ornament.
  strokePts(c, [
    { x: x - 26, y: ridge },
    { x: x - 18, y: ridge - 13 },
    { x: x + 18, y: ridge - 13 },
    { x: x + 26, y: ridge },
  ], CHALK, 1.6, 1490, 0.6, 0.6 * dim);
  strokePts(c, [{ x, y: ridge - 13 }, { x, y: ridge - 26 }], CHALK, 1.5, 1491, 0.5, 0.6 * dim);
  c.fillStyle = a(CHALK, 0.5);
  c.beginPath();
  c.arc(x, ridge - 28, 2.6, 0, TAU);
  c.fill();
}

function towerRoof(c, x, eave, ridge, half, ridgeHalf, seed, dim) {
  fillSharp(c, [
    { x: x - half, y: eave + 6 },
    { x: x - half * 0.88, y: eave - 13 },
    { x: x - ridgeHalf, y: ridge },
    { x: x + ridgeHalf, y: ridge },
    { x: x + half * 0.88, y: eave - 13 },
    { x: x + half, y: eave + 6 },
  ], a(FILL, dim), CHALK, 2.2, seed, 0.8, 0.85 * dim);
  for (const sx of [-1, 1]) {
    strokePts(c, [
      { x: x + sx * half * 0.82, y: eave - 12 },
      { x: x + sx * half * 1.03, y: eave - 2 },
      { x: x + sx * half * 0.96, y: eave + 9 },
    ], CHALK, 1.8, seed + 1, 0.6, 0.65 * dim);
  }
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const tx = x - half * 0.92 + t * half * 1.84;
    strokePts(c, [
      { x: tx, y: eave - 2 },
      { x: x + (tx - x) * (ridgeHalf / half), y: ridge + 2 },
    ], GREY, 1, seed + 10 + i, 0.5, 0.3 * dim);
  }
  hline(c, x - ridgeHalf, x + ridgeHalf, ridge, CHALK, 2, seed + 30, 0.7 * dim);
}

// ---------------------------------------------------------------- official

function drawOfficial(c, { x, gy, h, seed, staff = false, halberd = false, noCap = false }) {
  const headY = gy - h + 24;
  const shoulder = gy - h + 64;
  const waist = gy - h + 136;
  const hem = gy - 2;

  // Halberd or staff behind the body.
  if (staff || halberd) {
    strokePts(c, [{ x: x + 48, y: gy - 4 }, { x: x + 53, y: gy - h + 2 }], GREY, 2.2, seed + 1, 0.8, 0.72);
    if (halberd) {
      fillShape(c, [
        { x: x + 49, y: gy - h + 4 },
        { x: x + 40, y: gy - h - 28 },
        { x: x + 54, y: gy - h - 10 },
        { x: x + 64, y: gy - h - 32 },
      ], a(FILL, 1), CHALK, 1.8, seed + 2, 0.6, 0.85);
      strokePts(c, [{ x: x + 54, y: gy - h + 1 }, { x: x + 54, y: gy - h - 10 }], CHALK, 1.2, seed + 3, 0.5, 0.7);
    } else {
      c.fillStyle = a(CHALK, 0.72);
      c.beginPath();
      c.arc(x + 53, gy - h, 3.6, 0, TAU);
      c.fill();
    }
  }

  // Robe silhouette.
  const robe = [
    { x: x - 24, y: shoulder - 4 },
    { x: x - 42, y: shoulder + 22 },
    { x: x - 50, y: waist + 14 },
    { x: x - 64, y: hem - 28 },
    { x: x - 68, y: hem },
    { x: x + 44, y: hem },
    { x: x + 42, y: hem - 44 },
    { x: x + 36, y: waist + 8 },
    { x: x + 32, y: shoulder + 16 },
    { x: x + 20, y: shoulder - 2 },
  ];
  fillShape(c, robe, a(FILL, 1), CHALK, 3.5, seed + 10, 0.9, 1);

  // Collar: crossed lapels.
  strokePts(c, [
    { x: x - 9, y: shoulder + 2 },
    { x: x + 6, y: shoulder + 32 },
    { x: x - 10, y: waist - 4 },
  ], CHALK, 2, seed + 12, 0.7, 0.9);
  strokePts(c, [
    { x: x + 15, y: shoulder + 2 },
    { x: x + 3, y: shoulder + 28 },
  ], GREY, 1.5, seed + 13, 0.7, 0.7);
  strokePts(c, [
    { x: x - 9, y: shoulder + 4 },
    { x: x - 24, y: shoulder + 30 },
  ], GREY, 1.2, seed + 14, 0.7, 0.5);

  // Belt with pendant.
  hline(c, x - 44, x + 31, waist, CHALK, 2.6, seed + 15, 0.92);
  hline(c, x - 44, x + 31, waist + 8, GREY, 1, seed + 16, 0.5);
  strokePts(c, [{ x: x - 2, y: waist + 8 }, { x: x - 4, y: waist + 40 }, { x: x + 4, y: waist + 52 }], GREY, 1.3, seed + 17, 0.7, 0.55);
  c.fillStyle = a(CHALK, 0.6);
  c.beginPath();
  c.arc(x + 3, waist + 50, 2.6, 0, TAU);
  c.fill();

  // Robe folds and hem band.
  for (let i = 0; i < 7; i += 1) {
    const fx = x - 48 + i * 14;
    strokePts(c, [
      { x: fx + 3, y: waist + 12 },
      { x: fx - 2, y: hem - 18 },
      { x: fx - 7, y: hem - 4 },
    ], GREY, 1.3, seed + 20 + i, 0.9, 0.5);
  }
  hline(c, x - 66, x + 42, hem - 24, CHALK, 1.8, seed + 30, 0.7);
  for (let i = 0; i < 8; i += 1) {
    const fx = x - 58 + i * 13;
    strokePts(c, [{ x: fx, y: hem - 22 }, { x: fx + 5, y: hem - 4 }], GREY, 1, seed + 31 + i, 0.7, 0.35);
    // Hem ornament: a small squared scroll.
    strokePts(c, [
      { x: fx, y: hem - 18 },
      { x: fx + 5, y: hem - 18 },
      { x: fx + 5, y: hem - 12 },
      { x: fx + 1, y: hem - 12 },
      { x: fx + 1, y: hem - 15 },
    ], CHALK, 0.9, seed + 40 + i, 0.4, 0.35);
  }

  // Far arm hanging behind the robe.
  strokePts(c, [
    { x: x - 26, y: shoulder + 12 },
    { x: x - 34, y: shoulder + 56 },
    { x: x - 30, y: shoulder + 84 },
  ], GREY, 1.8, seed + 38, 0.8, 0.55);
  c.fillStyle = a(CHALK, 0.5);
  c.beginPath();
  c.arc(x - 29, shoulder + 88, 2.6, 0, TAU);
  c.fill();

  // Wide sleeve and hand.
  strokePts(c, [
    { x: x + 16, y: shoulder + 8 },
    { x: x + 42, y: shoulder + 48 },
    { x: x + 48, y: shoulder + 88 },
    { x: x + 31, y: shoulder + 100 },
    { x: x + 13, y: shoulder + 58 },
    { x: x + 7, y: shoulder + 26 },
  ], CHALK, 2.8, seed + 40, 0.8, 0.95);
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [
      { x: x + 23 + i * 7, y: shoulder + 32 },
      { x: x + 43 + i * 2, y: shoulder + 84 },
    ], GREY, 1.1, seed + 41 + i, 0.7, 0.45);
  }
  c.fillStyle = a(CHALK, 0.88);
  c.beginPath();
  c.arc(x + 46, shoulder + 92, 3.2, 0, TAU);
  c.fill();

  // Shoulder line: the robe must sit on a body, not a cone.
  strokePts(c, [
    { x: x - 33, y: shoulder + 10 },
    { x: x - 6, y: shoulder + 3 },
    { x: x + 22, y: shoulder + 9 },
  ], CHALK, 1.8, seed + 18, 0.7, 0.65);

  // Head with a profile.
  c.fillStyle = a(FILL, 1);
  c.beginPath();
  c.ellipse(x, headY, 18, 20, 0, 0, TAU);
  c.fill();
  chiselEllipse(c, x, headY, 18, 20, 0, CHALK, 2.5, seed + 50, 1);
  strokePts(c, [
    { x: x + 12, y: headY - 10 },
    { x: x + 19, y: headY + 1 },
    { x: x + 13, y: headY + 12 },
  ], CHALK, 1.6, seed + 51, 0.6, 0.8);
  strokePts(c, [{ x: x - 13, y: headY - 4 }, { x: x - 20, y: headY + 3 }], GREY, 1.3, seed + 52, 0.6, 0.6);
  // Eye and brow, just enough to read a face under the cap.
  c.fillStyle = a(CHALK, 0.85);
  c.beginPath();
  c.arc(x + 7, headY - 1, 2.3, 0, TAU);
  c.fill();
  strokePts(c, [{ x: x + 2, y: headY - 8 }, { x: x + 12, y: headY - 9 }], CHALK, 1.4, seed + 55, 0.5, 0.7);
  // Ear.
  strokePts(c, [{ x: x - 16, y: headY + 1 }, { x: x - 21, y: headY + 7 }, { x: x - 14, y: headY + 9 }], GREY, 1.2, seed + 56, 0.6, 0.55);
  // Beard / chin.
  strokePts(c, [{ x: x + 6, y: headY + 15 }, { x: x + 2, y: headY + 26 }], GREY, 1.2, seed + 53, 0.6, 0.5);
  // Neck.
  strokePts(c, [{ x: x - 3, y: headY + 16 }, { x: x - 4, y: shoulder + 2 }], CHALK, 2.2, seed + 54, 0.6, 0.85);

  if (!noCap) drawWingedCap(c, x, headY - 24, 1, 1, seed + 60);
}

function drawWingedCap(c, x, y, s, dim, seed) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  // Crown banded to the skull.
  fillSharp(c, [
    { x: -20, y: 6 },
    { x: -22, y: -8 },
    { x: 22, y: -8 },
    { x: 20, y: 6 },
  ], a(FILL, dim), CHALK, 2.2, seed, 0.5, dim);
  // Long board laid back over the crown: the Han official's mark.
  fillSharp(c, [
    { x: -48, y: -20 },
    { x: 18, y: -27 },
    { x: 25, y: -21 },
    { x: -45, y: -12 },
  ], a(FILL, dim), CHALK, 2.2, seed + 1, 0.6, dim);
  // Board ridges.
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [
      { x: -42, y: -17 + i * 1.4 },
      { x: 20, y: -24 + i * 1.4 },
    ], GREY, 1, seed + 3 + i, 0.6, 0.45 * dim);
  }
  // Band and front edge.
  strokePts(c, [{ x: -21, y: 3 }, { x: 21, y: 3 }], CHALK, 2, seed + 11, 0.5, 0.85 * dim);
  strokePts(c, [{ x: 22, y: -9 }, { x: 26, y: -20 }], CHALK, 1.6, seed + 12, 0.5, 0.7 * dim);
  c.restore();
}

// ---------------------------------------------------------------- live gag

function drawFlyingCap(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.local;
  const t0 = 4.0;
  const headY = CAP_MAN.gy - CAP_MAN.h + 24;
  if (t < t0) {
    drawWingedCap(c, CAP_MAN.x, headY - 24, 1, 1, 2601);
    return;
  }
  const p = clamp((t - t0) / 1.45);
  if (p >= 1) return;
  const x = CAP_MAN.x - 132 * p;
  const y = headY - 24 - 292 * p + 128 * p * p;
  c.save();
  c.globalAlpha = 1 - smoothstep(0.82, 1, p) * 0.85;
  c.translate(x, y);
  c.rotate(-0.2 + 6.2 * p);
  c.shadowColor = a(CHALK, 0.45);
  c.shadowBlur = 10;
  drawWingedCap(c, 0, 0, 1.12, 1, 2602);
  c.restore();

  // Motion arcs, fading as it tumbles.
  c.save();
  c.globalAlpha = 1 - p * 0.6;
  for (let i = 0; i < 3; i += 1) {
    const yy = headY - 30 - i * 13 - p * 60;
    strokePts(c, [
      { x: CAP_MAN.x - 30 - i * 8 - p * 20, y: yy },
      { x: CAP_MAN.x - 46 - i * 8 - p * 16, y: yy - 6 },
    ], CHALK, 1.2, 2630 + i, 0.6, 0.4);
  }
  c.restore();

  // Startle marks on the first frames.
  const q = clamp((t - t0) / 0.4);
  if (q < 1) {
    c.save();
    c.globalAlpha = (1 - q) * 0.85;
    for (let i = 0; i < 4; i += 1) {
      const ang = -2.4 + i * 0.5;
      const r0 = 24 + q * 14;
      const bx = CAP_MAN.x + Math.cos(ang) * r0;
      const by = headY - 28 + Math.sin(ang) * r0;
      strokePts(c, [
        { x: bx, y: by },
        { x: bx + Math.cos(ang) * 16, y: by + Math.sin(ang) * 16 },
      ], CHALK, 1.6, 2610 + i, 0.6, 0.8);
    }
    c.restore();
  }
}

function drawSeal(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.local;
  const start = 4.0;
  if (t < start - 0.02) return;
  const p = clamp((t - start) / 0.34);
  const pop = easeOut(p);
  const sc = 1.5 - 0.5 * pop;
  const cx = 606;
  const cy = 448;

  c.save();
  c.translate(cx, cy);
  c.scale(sc, sc);
  c.rotate(-0.05);
  c.globalAlpha = pop * 0.92;

  c.strokeStyle = a(SEAL, 0.32);
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, 52, 0, TAU);
  c.stroke();

  const rand = rngFor(2701);
  c.beginPath();
  const pts = 22;
  for (let i = 0; i < pts; i += 1) {
    const ang = (i / pts) * TAU;
    const r = 44 + (rand() - 0.5) * 4;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = a(SEAL, 0.9);
  c.fill();

  for (let i = 0; i < 26; i += 1) {
    c.fillStyle = a('#241a15', 0.35 + rand() * 0.3);
    c.beginPath();
    c.arc((rand() - 0.5) * 76, (rand() - 0.5) * 76, 0.8 + rand() * 2.4, 0, TAU);
    c.fill();
  }

  c.fillStyle = a(PAPER, 0.92);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 34, 600, CN_FONT, '0px');
  c.fillText('异', 0, -19);
  c.fillText('兽', 0, 21);
  c.strokeStyle = a(PAPER, 0.45);
  c.lineWidth = 1.3;
  c.strokeRect(-36, -37, 72, 74);
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawRiderWhite(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const S = 1.16;
  const ink = CHALK;
  const dim = GREY;

  c.save();
  c.translate(468, GY);
  c.scale(S, S);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // Wheels: the bicycle's spoked wheels rhyme with the chariot's.
  for (const wheel of [pose.wheels.rear, pose.wheels.front]) {
    chiselEllipse(c, wheel.x, wheel.y, wheel.r, wheel.r, 0, ink, 2.6, 3001 + wheel.x, 0.95);
    chiselEllipse(c, wheel.x, wheel.y, wheel.r - 5.5, wheel.r - 5.5, 0, dim, 1.1, 3010 + wheel.x, 0.8);
    for (let i = 0; i < 16; i += 1) {
      const ang = pose.wheelAngle + (i / 16) * TAU;
      strokePts(c, [
        { x: wheel.x + Math.cos(ang) * 4, y: wheel.y + Math.sin(ang) * 4 },
        { x: wheel.x + Math.cos(ang) * (wheel.r - 6), y: wheel.y + Math.sin(ang) * (wheel.r - 6) },
      ], i % 4 === 0 ? ink : dim, 0.95, 3020 + i + wheel.x, 0.45, 0.75);
    }
    chiselEllipse(c, wheel.x, wheel.y, 4.4, 4.4, 0, ink, 1.5, 3040 + wheel.x, 0.95);
    c.fillStyle = a(ink, 0.55);
    c.beginPath();
    c.arc(wheel.x, wheel.y, 1.8, 0, TAU);
    c.fill();
  }

  // Far crank and leg.
  c.save();
  c.globalAlpha = 0.5;
  strokePts(c, [pose.crankCenter, pose.pedals.far], dim, 3, 3101, 0.6, 1);
  c.fillStyle = a(dim, 0.9);
  c.fillRect(pose.pedals.far.x - 6, pose.pedals.far.y - 1.5, 13, 3);
  drawBirdLeg(c, pose.hip, pose.legs.far, dim, 0.55, 3102);
  c.restore();

  // Frame: double white lines, chiselled.
  const f = pose.frame;
  tube(c, f.rearHub, f.crank, ink, 1.9, 2.6, 3110);
  tube(c, f.crank, f.seatCluster, ink, 1.9, 2.6, 3111);
  tube(c, f.seatCluster, f.rearHub, ink, 1.7, 2.4, 3112);
  tube(c, f.crank, f.headTop, ink, 1.9, 2.6, 3113);
  tube(c, f.seatCluster, f.headTop, ink, 1.9, 2.6, 3114);
  tube(c, f.headTop, f.frontHub, ink, 1.8, 2.4, 3115);
  tube(c, f.seatCluster, { x: f.saddle.x, y: f.saddle.y - 2 }, ink, 1.6, 2.2, 3116);
  tube(c, f.headTop, f.stemTop, ink, 1.7, 2.2, 3117);

  // Handlebar and grip.
  strokePts(c, [
    f.stemTop,
    { x: 64, y: -146 },
    { x: 76, y: -148 },
    { x: pose.grip.x, y: pose.grip.y },
  ], ink, 2.3, 3120, 0.6, 0.95);
  strokePts(c, [
    { x: 58, y: -145 },
    { x: 70, y: -147 },
    { x: 82, y: -144 },
  ], dim, 1.2, 3121, 0.5, 0.6);

  // Saddle.
  fillShape(c, [
    { x: f.saddle.x - 24, y: f.saddle.y - 3 },
    { x: f.saddle.x + 14, y: f.saddle.y - 5 },
    { x: f.saddle.x + 18, y: f.saddle.y + 5 },
    { x: f.saddle.x - 22, y: f.saddle.y + 6 },
  ], a(FILL, 1), ink, 1.9, 3125, 0.6, 0.95);

  // Chainring, crank, chain.
  chiselEllipse(c, f.crank.x, f.crank.y, 19, 19, 0, ink, 2, 3130, 0.95);
  chiselEllipse(c, f.crank.x, f.crank.y, 13, 13, 0, dim, 1, 3131, 0.55);
  for (let i = 0; i < 12; i += 1) {
    const ang = (i / 12) * TAU;
    strokePts(c, [
      { x: f.crank.x + Math.cos(ang) * 19, y: f.crank.y + Math.sin(ang) * 19 },
      { x: f.crank.x + Math.cos(ang) * 23, y: f.crank.y + Math.sin(ang) * 23 },
    ], ink, 1.4, 3140 + i, 0.3, 0.8);
  }
  strokePts(c, [pose.crankCenter, pose.pedals.near], ink, 3.1, 3150, 0.5, 0.95);
  c.fillStyle = a(ink, 0.9);
  c.fillRect(pose.pedals.near.x - 7, pose.pedals.near.y - 2, 15, 4);
  strokePts(c, [
    { x: f.crank.x, y: f.crank.y - 19 },
    { x: f.rearHub.x, y: f.rearHub.y - 9 },
  ], dim, 1.1, 3151, 0.4, 0.55);
  strokePts(c, [
    { x: f.crank.x, y: f.crank.y + 19 },
    { x: f.rearHub.x, y: f.rearHub.y + 9 },
  ], dim, 1.1, 3152, 0.4, 0.55);

  // Near leg.
  drawBirdLeg(c, pose.hip, pose.legs.near, ink, 1, 3160);

  // Tail.
  const tail = pose.tail;
  fillShape(c, [
    { x: tail.x + 14, y: tail.y - 14 },
    { x: tail.x - 24, y: tail.y - 26 },
    { x: tail.x - 34, y: tail.y - 10 },
    { x: tail.x - 40, y: tail.y + 8 },
    { x: tail.x - 18, y: tail.y + 10 },
    { x: tail.x + 12, y: tail.y + 12 },
  ], a(FILL, 1), ink, 2.4, 3170, 0.7, 0.95);
  for (let i = 0; i < 4; i += 1) {
    strokePts(c, [
      { x: tail.x + 2, y: tail.y - 6 + i * 6 },
      { x: tail.x - 26, y: tail.y - 20 + i * 10 },
    ], i % 2 ? dim : ink, 1.1, 3171 + i, 0.6, 0.7);
  }

  // Body with feather rows.
  const b = pose.body;
  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  c.beginPath();
  c.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU);
  c.fillStyle = a(FILL, 1);
  c.fill();
  c.strokeStyle = a(ink, 0.98);
  c.lineWidth = 2.9;
  c.stroke();
  for (let i = 0; i < 4; i += 1) {
    const rx = b.rx * (0.88 - i * 0.2);
    c.beginPath();
    c.ellipse(-2 + i * 3, -10 + i * 12, rx, 5.5, 0.02, 0.1 * Math.PI, 0.92 * Math.PI);
    c.strokeStyle = a(dim, 0.85);
    c.lineWidth = 1.3;
    c.stroke();
    for (let k = 0; k < 3; k += 1) {
      const fx = -rx * 0.6 + k * (rx * 0.55);
      strokePts(c, [
        { x: fx, y: -8 + i * 12 },
        { x: fx + 4, y: -3 + i * 12 },
      ], ink, 1, 3190 + i * 5 + k, 0.5, 0.55);
    }
  }
  // Folded wing over the flank: the pelican's clearest identifier.
  c.beginPath();
  c.moveTo(-40, -6);
  c.quadraticCurveTo(-6, -30, 34, -12);
  c.quadraticCurveTo(20, 14, -18, 16);
  c.closePath();
  c.strokeStyle = a(ink, 0.9);
  c.lineWidth = 2;
  c.stroke();
  for (let i = 0; i < 4; i += 1) {
    strokePts(c, [
      { x: -26 + i * 3, y: -8 + i * 6 },
      { x: 26 - i * 2, y: -4 + i * 5 },
    ], dim, 1.2, 3205 + i, 0.6, 0.55);
  }
  c.restore();

  // Neck: dark fill + two white edges.
  const neck = bezier(pose.neck[0], pose.neck[1], pose.neck[2], pose.neck[3], 10);
  c.beginPath();
  c.moveTo(neck[0].x, neck[0].y);
  for (let i = 1; i < neck.length; i += 1) c.lineTo(neck[i].x, neck[i].y);
  c.strokeStyle = a(FILL, 1);
  c.lineWidth = 22;
  c.stroke();
  strokePts(c, offsetPts(neck, 10), ink, 2.2, 3210, 0.6, 0.95);
  strokePts(c, offsetPts(neck, -10), ink, 2.2, 3211, 0.6, 0.95);
  for (let i = 2; i < neck.length - 2; i += 2) {
    strokePts(c, [
      { x: neck[i].x - 6, y: neck[i].y },
      { x: neck[i].x + 6, y: neck[i].y + 3 },
    ], dim, 1, 3220 + i, 0.6, 0.6);
  }

  // Wing arm to the grip.
  const wing = bezier(
    { x: pose.shoulder.x - 8, y: pose.shoulder.y + 10 },
    { x: 42, y: -172 },
    { x: pose.grip.x - 4, y: pose.grip.y - 6 },
    { x: pose.grip.x - 2, y: pose.grip.y - 3 },
    9,
  );
  strokePts(c, offsetPts(wing, 7), ink, 2.1, 3230, 0.6, 0.95);
  strokePts(c, offsetPts(wing, -7), ink, 2.1, 3231, 0.6, 0.95);
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [
      { x: pose.grip.x - 8, y: pose.grip.y - 2 + i * 3 },
      { x: pose.grip.x - 22 - i * 3, y: pose.grip.y + 9 + i * 4 },
    ], dim, 1.2, 3240 + i, 0.6, 0.7);
  }

  // Head.
  const h = pose.head;
  c.beginPath();
  c.arc(h.x, h.y, 19, 0, TAU);
  c.fillStyle = a(FILL, 1);
  c.fill();
  chiselEllipse(c, h.x, h.y, 19, 19, 0, ink, 2.8, 3250, 0.98);
  for (let i = 0; i < 3; i += 1) {
    const ang = -2.55 + i * 0.18;
    strokePts(c, [
      { x: h.x + Math.cos(ang) * 15, y: h.y + Math.sin(ang) * 15 },
      { x: h.x + Math.cos(ang) * 28 - 4, y: h.y + Math.sin(ang) * 28 - 4 },
    ], dim, 1.4, 3255 + i, 0.6, 0.8);
  }

  // Beak: upper mandible, pouch and hatching.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  const pg = pose.pouch;
  strokePts(c, [
    { x: bb.x - 2, y: bb.y - 6 },
    { x: bb.x + 40, y: bb.y - 9 },
    { x: bt.x, y: bt.y - 3 },
  ], ink, 2.7, 3260, 0.6, 0.98);
  strokePts(c, [
    { x: bb.x - 2, y: bb.y + 1 },
    { x: bb.x + 44, y: bb.y + 2 },
    { x: bt.x - 10, y: bt.y - 1 },
  ], ink, 1.8, 3261, 0.6, 0.9);
  strokePts(c, bezier(
    { x: bb.x + 4, y: bb.y + 4 },
    { x: bb.x + 42, y: bb.y + 34 },
    { x: pg.x - 6, y: pg.y + 42 },
    { x: bt.x - 14, y: bt.y + 2 },
    9,
  ), ink, 2.3, 3262, 0.6, 0.95);
  strokePts(c, bezier(
    { x: bt.x - 14, y: bt.y + 2 },
    { x: pg.x - 2, y: pg.y + 46 },
    { x: bb.x + 24, y: bb.y + 58 },
    { x: bb.x + 4, y: bb.y + 4 },
    8,
  ), ink, 2, 3263, 0.6, 0.9);
  for (let i = 0; i < 3; i += 1) {
    strokePts(c, [
      { x: bb.x + 20 + i * 16, y: bb.y + 14 + i * 4 },
      { x: bb.x + 18 + i * 15, y: bb.y + 32 + i * 5 },
    ], dim, 1, 3270 + i, 0.6, 0.6);
  }

  // Eye.
  c.fillStyle = a(CHALK, 0.95);
  c.beginPath();
  c.arc(h.x + 7, h.y - 5, 4.6, 0, TAU);
  c.fill();
  const open = 1 - pose.blink;
  c.fillStyle = DEEP;
  c.beginPath();
  c.ellipse(h.x + 8.4, h.y - 5, 2.3, 2.3 * open + 0.4, 0, 0, TAU);
  c.fill();
  chiselEllipse(c, h.x + 7, h.y - 5, 5.4, 5.4, 0, ink, 1.1, 3280, 0.75);

  c.restore();
}

function drawBirdLeg(c, hip, leg, color, dim, seed) {
  strokePts(c, [hip, leg.knee], color, 8, seed, 0.6, dim);
  strokePts(c, [leg.knee, leg.ankle], color, 6.4, seed + 1, 0.6, dim);
  c.save();
  c.globalAlpha = dim;
  c.beginPath();
  c.moveTo(leg.ankle.x - 4, leg.ankle.y - 2);
  c.lineTo(leg.ankle.x + 12, leg.ankle.y - 1);
  c.lineTo(leg.ankle.x + 4, leg.ankle.y + 7);
  c.closePath();
  c.strokeStyle = color;
  c.lineWidth = 1.7;
  c.stroke();
  c.restore();
}

function drawRideDust(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const rand = rngFor(3302);
  c.save();
  for (let i = 0; i < 16; i += 1) {
    const phase = (t * 1.6 + i * 0.41) % 1;
    const x = 430 - phase * 96 - rand() * 24;
    const y = GY + 6 - phase * 34 - rand() * 18;
    const r = 1.6 + phase * 6;
    c.fillStyle = a(CHALK, (1 - phase) * 0.14);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- weathering

function drawWeathering(pg, c) {
  const rand = rngFor(4001);
  const x0 = CACHE.x0;
  const y0 = CACHE.y0;
  const w = CACHE.w;
  const h = CACHE.h;

  const crease = (pos, wobSeed, vertical) => {
    const pts = [];
    for (let u = 0; u <= 40; u += 1) {
      const k = u / 40;
      const base = vertical ? y0 + k * h : x0 + k * w;
      const off = pos + Math.sin(k * 9 + wobSeed) * 4;
      pts.push(vertical ? { x: off, y: base } : { x: base, y: off });
    }
    c.save();
    c.globalAlpha = 0.045;
    c.strokeStyle = PAPER;
    c.lineWidth = 22;
    pathFrom(c, pts, false);
    c.stroke();
    c.restore();
    strokePts(c, pts, '#000000', 2.4, 4100 + wobSeed, 0.4, 0.28);
    c.save();
    c.globalAlpha = 0.18;
    c.strokeStyle = PAPER;
    c.lineWidth = 1.1;
    c.translate(vertical ? 2.2 : 0, vertical ? 0 : 2.2);
    pathFrom(c, pts, false);
    c.stroke();
    c.restore();
  };
  crease(212, 3, true);
  crease(1014, 9, true);
  crease(330, 5, false);

  // Fine fibres over the ink.
  c.lineCap = 'round';
  for (let i = 0; i < 3000; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const len = 2 + rand() * 15;
    const ang = (rand() - 0.5) * 0.4;
    c.strokeStyle = a(rand() > 0.4 ? '#f1e8d6' : '#6d6657', 0.015 + rand() * 0.035);
    c.lineWidth = 0.5 + rand() * 0.7;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    c.stroke();
  }

  // Loose scuffs at the edges.
  for (let i = 0; i < 24; i += 1) {
    const top = rand() > 0.5;
    const x = x0 + rand() * w;
    const y = top ? y0 + 30 + rand() * 90 : y0 + h - 30 - rand() * 120;
    const len = 40 + rand() * 160;
    strokePts(c, [
      { x, y },
      { x: x + len * 0.5, y: y + (rand() - 0.5) * 8 },
      { x: x + len, y: y + (rand() - 0.5) * 5 },
    ], PAPER, 1 + rand() * 3.2, 4200 + i, 2.2, 0.03 + rand() * 0.07);
  }

  // Bright chisel slips.
  for (let i = 0; i < 14; i += 1) {
    const x = -600 + rand() * 1900;
    const y = -40 + rand() * 1050;
    const ang = -0.5 + rand() * 1.1;
    const len = 12 + rand() * 54;
    strokePts(c, [
      { x, y },
      { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len },
    ], CHALK, 0.8 + rand() * 1.4, 4300 + i, 0.5, 0.16 + rand() * 0.2);
  }

  // Ink tide at the sheet edges.
  const gr = c.createLinearGradient(x0, 0, x0 + 120, 0);
  gr.addColorStop(0, a('#000000', 0.35));
  gr.addColorStop(1, a('#000000', 0));
  c.fillStyle = gr;
  c.fillRect(x0, y0, 120, h);
  const gr2 = c.createLinearGradient(x0 + w, 0, x0 + w - 130, 0);
  gr2.addColorStop(0, a('#000000', 0.3));
  gr2.addColorStop(1, a('#000000', 0));
  c.fillStyle = gr2;
  c.fillRect(x0 + w - 130, y0, 130, h);
}

// ---------------------------------------------------------------- title

function drawRubbingTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const baseY = H - 156 * s + lift * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.3 * s);

  const px = x - 30 * s;
  const py = baseY - 116 * s;
  const pw = 664 * s;
  const ph = 184 * s;
  const rand = rngFor(4401);
  c.beginPath();
  for (let i = 0; i <= 18; i += 1) {
    c.lineTo(px + (i / 18) * pw, py + (rand() - 0.5) * 8 * s);
  }
  for (let i = 0; i <= 7; i += 1) {
    c.lineTo(px + pw + (rand() - 0.5) * 9 * s, py + (i / 7) * ph);
  }
  for (let i = 18; i >= 0; i -= 1) {
    c.lineTo(px + (i / 18) * pw, py + ph + (rand() - 0.5) * 8 * s);
  }
  for (let i = 7; i >= 0; i -= 1) {
    c.lineTo(px + (rand() - 0.5) * 9 * s, py + (i / 7) * ph);
  }
  c.closePath();
  c.fillStyle = 'rgba(6, 5, 4, 0.62)';
  c.fill();
  c.strokeStyle = 'rgba(217, 210, 194, 0.55)';
  c.lineWidth = 1.6 * s;
  c.stroke();
  c.beginPath();
  c.moveTo(px + 12 * s, py + 6 * s);
  c.lineTo(px + pw - 14 * s, py + 5 * s);
  c.moveTo(px + 16 * s, py + ph - 6 * s);
  c.lineTo(px + pw * 0.62, py + ph - 7 * s);
  c.strokeStyle = 'rgba(217, 210, 194, 0.24)';
  c.lineWidth = 1 * s;
  c.stroke();

  // Stone pits on the plate.
  for (let i = 0; i < 70; i += 1) {
    c.fillStyle = `rgba(217, 210, 194, ${0.025 + rand() * 0.07})`;
    c.beginPath();
    c.arc(px + rand() * pw, py + rand() * ph, (0.5 + rand() * 2) * s, 0, TAU);
    c.fill();
  }

  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 14 * s, 600, EN_FONT, '3px');
  c.fillStyle = 'rgba(168, 159, 141, 0.98)';
  c.fillText('03  /  20', x, baseY - 76 * s);

  setFont(c, 43 * s, 600, CN_FONT, '2px');
  c.fillStyle = '#ece5d6';
  c.fillText('汉画像石拓片', x, baseY - 22 * s);

  setFont(c, 18 * s, 500, EN_FONT, '2.6px');
  c.fillStyle = 'rgba(230, 221, 203, 0.8)';
  c.fillText('HAN STONE RUBBING', x, baseY + 7 * s);

  setFont(c, 16 * s, 400, CN_FONT, '1px');
  c.fillStyle = 'rgba(230, 221, 203, 0.92)';
  c.fillText('约100 · 东汉', x, baseY + 32 * s);

  // Faded vermilion seal at the right of the plate.
  c.save();
  c.translate(x + 540 * s, baseY - 14 * s);
  c.rotate(-0.04);
  c.fillStyle = 'rgba(161, 63, 40, 0.9)';
  c.fillRect(-29 * s, -42 * s, 58 * s, 58 * s);
  for (let i = 0; i < 16; i += 1) {
    c.fillStyle = 'rgba(6, 5, 4, 0.55)';
    c.beginPath();
    c.arc((rand() - 0.5) * 52 * s, (rand() - 0.5) * 52 * s, (0.6 + rand() * 1.8) * s, 0, TAU);
    c.fill();
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 26 * s, 600, CN_FONT, '0px');
  c.fillStyle = 'rgba(237, 229, 213, 0.95)';
  c.fillText('拓', 0, -7 * s);
  c.restore();

  c.restore();
}
