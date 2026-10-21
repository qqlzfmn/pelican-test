// 6 — 清明上河图 / Along the River During Qingming. Silk, ink and pale mineral
// colour. The Rainbow Bridge arches over the river; the pelican crosses the
// apex, the crowd turns, a porter drops his basket and a cargo boat lowers its
// mast to pass beneath. Bridge, crowd and banks are cached; the rider, boat,
// water and five lookers are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import {
  rngFor, noise1, TAU, smoothstep, easeOut, easeInOut, lerp, clamp,
} from '../kit/math.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { paperCanvas } from '../kit/texture.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, neutralStyle } from '../rig/draw.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { SPEED } from '../kit/road.js';

const P = {
  paper: '#e8ddc4',
  paperDeep: '#d9c9a6',
  ink: '#31332a',
  ink2: '#4c4d3e',
  willow: '#5e6b52',
  willowPale: '#89947a',
  verm: '#a84b32',
  roof: '#7d7a6d',
  roofPale: '#9c9a8b',
  ochre: '#c3a274',
  ochrePale: '#d8bf96',
  water: '#97a599',
  waterDeep: '#7b8d84',
  mist: '#ded3b8',
  white: '#f4ecd8',
  skin: '#d8c09b',
};

const BR = {
  xL: -120,
  xR: 1080,
  apexX: 468,
  apexY: 560,
  baseY: 742,
  waterY: 782,
  deckRise: 182,
  archRise: 145,
};

const SIGN = { x: 1006, postH: 176, w: 66, h: 112 };

function archK(x) {
  const half = x < BR.apexX ? BR.apexX - BR.xL : BR.xR - BR.apexX;
  return (x - BR.apexX) / half;
}

function deckY(x) {
  const k = archK(x);
  if (Math.abs(k) >= 1) return BR.baseY;
  return BR.baseY - BR.deckRise * (1 - k * k);
}

function archY(x) {
  const k = archK(x);
  if (Math.abs(k) >= 1) return BR.waterY;
  return BR.waterY - BR.archRise * (1 - k * k);
}

// ------------------------------------------------------------------ helpers

function line(c, pts, color, w, a = 1, close = false) {
  c.save();
  c.strokeStyle = alpha(color, a);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  if (close) c.closePath();
  c.stroke();
  c.restore();
}

function curve(c, pts, color, w, a = 1) {
  if (pts.length < 2) return;
  c.save();
  c.strokeStyle = alpha(color, a);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i += 1) {
    c.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  }
  c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  c.stroke();
  c.restore();
}

function fill(c, pts, color, a = 1) {
  c.save();
  c.fillStyle = alpha(color, a);
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fill();
  c.restore();
}

function wobble(c, pts, color, a, seed, amp = 1) {
  const rand = rngFor(seed);
  const out = pts.map((p) => ({
    x: p.x + (rand() - 0.5) * amp,
    y: p.y + (rand() - 0.5) * amp,
  }));
  fill(c, out, color, a);
}

function arcPts(x0, x1, fn, step = 12) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) pts.push({ x, y: fn(x) });
  pts.push({ x: x1, y: fn(x1) });
  return pts;
}

function bandPts(x0, x1, top, bottom, step = 14) {
  const pts = [];
  for (let x = x0; x <= x1; x += step) pts.push({ x, y: top(x) });
  for (let x = x1; x >= x0; x -= step) pts.push({ x, y: bottom(x) });
  return pts;
}

// ------------------------------------------------------------------- scene

export default {
  id: 's06',
  number: 6,
  cn: '清明上河图',
  en: 'Along the River During Qingming',
  year: '约1100 · 汴京',
  motif: 'arch',
  palette: basePalette({
    bg: '#e8ddc4', bg2: '#d8c9aa', motif: '#5e6b52', accent: '#a84b32',
    ink: '#31332a', titleInk: '#2f3128', ground: '#c9b995', road: '#b8a57e',
    dash: '#f4e9cf', body: '#f8f0dd', beak: '#b56c35', rigInk: '#252620',
    scrim: '#e8ddc4',
  }),

  draw(g, ctx) {
    const c = g.drawingContext;

    // Full bleed: the silk continues past the cache.
    c.fillStyle = P.paper;
    c.fillRect(-1000, -300, 3000, 1600);

    const bg = cachedLayer(ctx, 's06-bg', drawBackground);
    c.drawImage(bg.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    const bridge = cachedLayer(ctx, 's06-bridge', drawBridge);
    c.drawImage(bridge.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawDeckMarks(g, ctx);
    drawLookers(g, ctx);
    drawRider(g, ctx);
    drawSign(g, ctx);
    drawWater(g, ctx);

    // The cargo boat crosses in front of the arch; its tall mast would strike
    // the bridge, so the crew lowers it on the beat.
    drawBoat(g, ctx);

    const fg = cachedLayer(ctx, 's06-fg', drawForeground);
    c.drawImage(fg.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawQingmingTitle(g, opacity, lift);
  },
};

// ------------------------------------------------------------- background

function drawBackground(pg, c) {
  drawSilk(c);
  drawSky(c);
  drawFarHills(c);
  drawFarTown(c);
  drawMist(c);
  drawBirds(c);
  drawWaterBase(c);
  drawBanks(c);
  drawRightShops(c);
  drawLeftShops(c);
  drawWillows(c);
  drawMooredBoats(c);
}

function drawSilk(c) {
  c.fillStyle = P.paper;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

  const sheet = paperCanvas(1500, 830, {
    tone: P.paper, seed: 606, fiber: 5200, specks: 11000, laid: false,
  });
  c.globalAlpha = 0.94;
  c.drawImage(sheet, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.globalAlpha = 1;

  // Silk weave: long, very faint horizontal threads.
  const rand = rngFor(607);
  c.save();
  for (let i = 0; i < 900; i += 1) {
    const y = CACHE.y0 + rand() * CACHE.h;
    const x = CACHE.x0 + rand() * CACHE.w;
    c.strokeStyle = alpha(rand() > 0.5 ? '#fffaf0' : '#9a8769', 0.035 + rand() * 0.03);
    c.lineWidth = 0.6 + rand() * 0.5;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 20 + rand() * 110, y + (rand() - 0.5) * 0.8);
    c.stroke();
  }
  c.restore();

  // A regular silk weave, kept faint but present at 1080p.
  c.save();
  c.lineWidth = 0.6;
  for (let y = CACHE.y0; y < CACHE.y0 + CACHE.h; y += 5) {
    c.strokeStyle = alpha(y % 10 === 0 ? '#fbf4e4' : '#b9a37f', 0.030);
    c.beginPath();
    c.moveTo(CACHE.x0, y);
    c.lineTo(CACHE.x0 + CACHE.w, y + 0.6);
    c.stroke();
  }
  for (let x = CACHE.x0; x < CACHE.x0 + CACHE.w; x += 11) {
    c.strokeStyle = alpha('#9c8767', 0.020);
    c.beginPath();
    c.moveTo(x, CACHE.y0);
    c.lineTo(x + 0.5, CACHE.y0 + CACHE.h);
    c.stroke();
  }
  // Slubs and thickened threads.
  const slub = rngFor(609);
  for (let i = 0; i < 120; i += 1) {
    const x = CACHE.x0 + slub() * CACHE.w;
    const y = CACHE.y0 + slub() * CACHE.h;
    c.strokeStyle = alpha(slub() > 0.5 ? '#fff8e8' : '#8f7a5a', 0.05 + slub() * 0.05);
    c.lineWidth = 0.8 + slub() * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 3 + slub() * 14, y + (slub() - 0.5) * 1.2);
    c.stroke();
  }
  c.restore();

  // Age: soft tea stains and darkened edges.
  const stains = [
    { x: -260, y: 180, r: 300, a: 0.06 },
    { x: 900, y: 330, r: 360, a: 0.055 },
    { x: 1320, y: 740, r: 260, a: 0.05 },
    { x: 180, y: 900, r: 320, a: 0.04 },
    { x: 640, y: 60, r: 220, a: 0.045 },
  ];
  for (const s of stains) {
    const gr = c.createRadialGradient(s.x, s.y, s.r * 0.1, s.x, s.y, s.r);
    gr.addColorStop(0, `rgba(140, 104, 54, ${s.a * 1.6})`);
    gr.addColorStop(0.65, `rgba(140, 104, 54, ${s.a * 0.6})`);
    gr.addColorStop(1, 'rgba(140, 104, 54, 0)');
    c.fillStyle = gr;
    c.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }

  // Two old creases.
  c.save();
  c.strokeStyle = alpha('#8a7452', 0.10);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-500, 330);
  c.quadraticCurveTo(220, 352, 1500, 300);
  c.stroke();
  c.strokeStyle = alpha('#fbf4e4', 0.20);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-500, 334);
  c.quadraticCurveTo(220, 356, 1500, 304);
  c.stroke();
  c.restore();

  // Paint loss: tiny pale scuffs.
  const rand2 = rngFor(608);
  for (let i = 0; i < 34; i += 1) {
    const x = CACHE.x0 + rand2() * CACHE.w;
    const y = CACHE.y0 + rand2() * CACHE.h;
    c.fillStyle = alpha('#f7f0de', 0.18 + rand2() * 0.2);
    c.beginPath();
    c.ellipse(x, y, 1 + rand2() * 5, 0.8 + rand2() * 2.4, rand2() * TAU, 0, TAU);
    c.fill();
  }
}

function drawSky(c) {
  const gr = c.createLinearGradient(0, -50, 0, 700);
  gr.addColorStop(0, '#efe7d2');
  gr.addColorStop(0.55, '#e9dfc6');
  gr.addColorStop(1, '#e3d6b9');
  c.fillStyle = gr;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, 760);

  // A faint warm veil in the upper right.
  const warm = c.createRadialGradient(980, 190, 40, 980, 190, 620);
  warm.addColorStop(0, 'rgba(226, 197, 146, 0.16)');
  warm.addColorStop(1, 'rgba(226, 197, 146, 0)');
  c.fillStyle = warm;
  c.fillRect(300, -50, 1300, 800);
}

function drawFarHills(c) {
  const ridgeA = arcPts(-520, 1540, (x) => (
    300
    + Math.sin(x * 0.0042 + 1.2) * 52
    + Math.sin(x * 0.0105 + 2.7) * 18
    + noise1(x * 0.006, 61) * 26
  ), 22);
  const ridgeB = arcPts(-520, 1540, (x) => (
    402
    + Math.sin(x * 0.0036 + 3.9) * 38
    + Math.sin(x * 0.0088 + 0.4) * 15
    + noise1(x * 0.008, 63) * 14
  ), 22);
  const ridgeC = arcPts(-520, 1540, (x) => (
    496
    + Math.sin(x * 0.0032 + 5.4) * 24
    + noise1(x * 0.011, 64) * 10
  ), 22);
  fill(c, [{ x: -520, y: 700 }, ...ridgeA, { x: 1540, y: 700 }], '#8e9888', 0.11);
  fill(c, [{ x: -520, y: 700 }, ...ridgeB, { x: 1540, y: 700 }], '#879488', 0.09);
  fill(c, [{ x: -520, y: 720 }, ...ridgeC, { x: 1540, y: 720 }], '#7f8c80', 0.07);

  // Washed hill contours.
  curve(c, ridgeA, P.ink2, 1.1, 0.09);
  curve(c, ridgeB, P.ink2, 0.9, 0.07);
  curve(c, ridgeC, P.ink2, 0.8, 0.05);

  // A distant ridge wash (wet ink) under each crest.
  const rand = rngFor(65);
  for (let i = 0; i < 90; i += 1) {
    const x = -500 + rand() * 2020;
    const y = 420 + rand() * 120;
    c.strokeStyle = alpha(P.ink2, 0.03 + rand() * 0.035);
    c.lineWidth = 1.4 + rand() * 2.6;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 20, y - 8, x + 44, y - 3);
    c.stroke();
  }
}

function roofShape(c, x, base, w, h, color, a) {
  const left = x - w / 2;
  const right = x + w / 2;
  const ridgeL = x - w * 0.28;
  const ridgeR = x + w * 0.28;
  const pts = [
    { x: left - w * 0.08, y: base },
    { x: left + w * 0.06, y: base - h * 0.38 },
    { x: ridgeL, y: base - h },
    { x: ridgeR, y: base - h },
    { x: right - w * 0.06, y: base - h * 0.38 },
    { x: right + w * 0.08, y: base },
  ];
  fill(c, pts, color, a);
  line(c, pts, P.ink, 0.8, a * 0.7);
  // Ridge and tile ribs.
  line(c, [{ x: ridgeL - 4, y: base - h }, { x: ridgeR + 4, y: base - h }], P.ink, 1.4, a * 0.95);
  line(c, [{ x: ridgeL - 2, y: base - h - 2 }, { x: ridgeR + 2, y: base - h - 2 }], P.ink, 0.8, a * 0.5);
  for (let i = 1; i < 9; i += 1) {
    const t = i / 9;
    const px = lerp(left, right, t);
    const topY = base - h * (1 - Math.abs(t - 0.5) * 1.4);
    line(c, [
      { x: px, y: topY },
      { x: lerp(px, x, 0.16), y: base - h * 0.06 },
    ], P.ink, 0.6, a * 0.65);
  }
  // Heavy eave shadow.
  line(c, [
    { x: left - w * 0.08, y: base + 1 },
    { x: x, y: base - h * 0.06 + 1 },
    { x: right + w * 0.08, y: base + 1 },
  ], P.ink, 1.6, a * 0.8);
}

function drawFarTown(c) {
  // The far bank sits above the arch springing. Its base is hidden by the
  // bridge; only the roofline reads, giving the city its depth.
  c.fillStyle = alpha('#cab58f', 0.20);
  c.fillRect(-520, 612, 2060, 140);
  line(c, [{ x: -520, y: 616 }, { x: 1540, y: 616 }], P.ink, 1.0, 0.14);

  // Back row: pale, low.
  const back = [
    { x: -430, base: 612, w: 130, h: 42, a: 0.10 },
    { x: -260, base: 610, w: 96, h: 34, a: 0.09 },
    { x: -40, base: 614, w: 116, h: 38, a: 0.09 },
    { x: 190, base: 616, w: 90, h: 30, a: 0.08 },
    { x: 620, base: 618, w: 124, h: 36, a: 0.08 },
    { x: 820, base: 620, w: 104, h: 32, a: 0.08 },
    { x: 1030, base: 622, w: 140, h: 40, a: 0.09 },
    { x: 1240, base: 624, w: 110, h: 34, a: 0.09 },
    { x: 1440, base: 626, w: 150, h: 42, a: 0.10 },
  ];
  for (const r of back) roofShape(c, r.x, r.base, r.w, r.h, P.roofPale, r.a);

  // Middle row: bigger halls and a gate tower at the right of the rider.
  const mid = [
    { x: -360, base: 638, w: 150, h: 66, a: 0.15 },
    { x: -170, base: 640, w: 120, h: 96, a: 0.16 },
    { x: 40, base: 642, w: 96, h: 54, a: 0.14 },
    { x: 250, base: 644, w: 110, h: 52, a: 0.13 },
    { x: 690, base: 646, w: 168, h: 112, a: 0.17 },
    { x: 880, base: 648, w: 120, h: 72, a: 0.15 },
    { x: 1080, base: 650, w: 140, h: 84, a: 0.15 },
    { x: 1300, base: 652, w: 170, h: 60, a: 0.14 },
    { x: 1480, base: 654, w: 120, h: 48, a: 0.13 },
  ];
  for (const r of mid) {
    const wallH = r.h * 0.55;
    c.fillStyle = alpha('#d0bb94', r.a * 0.8);
    c.fillRect(r.x - r.w * 0.4, r.base - wallH, r.w * 0.8, wallH);
    // Window marks.
    for (let i = 0; i < 4; i += 1) {
      const wx = r.x - r.w * 0.3 + i * r.w * 0.2;
      c.fillStyle = alpha(P.ink, r.a * 0.55);
      c.fillRect(wx, r.base - wallH * 0.7, 3, 7);
    }
    roofShape(c, r.x, r.base - wallH, r.w, r.h * 0.45, P.roof, r.a);
  }

  // Front row: tall buildings whose roofs break the bridge line.
  const front = [
    { x: -200, base: 658, w: 120, h: 118, a: 0.20 },
    { x: 150, base: 660, w: 90, h: 74, a: 0.17 },
    { x: 760, base: 662, w: 128, h: 136, a: 0.21 },
    { x: 940, base: 664, w: 90, h: 92, a: 0.18 },
    { x: 1180, base: 666, w: 150, h: 110, a: 0.19 },
    { x: 1390, base: 668, w: 120, h: 82, a: 0.17 },
  ];
  for (const r of front) {
    const wallH = r.h * 0.62;
    c.fillStyle = alpha('#ceb992', r.a * 0.85);
    c.fillRect(r.x - r.w * 0.42, r.base - wallH, r.w * 0.84, wallH);
    line(c, [
      { x: r.x - r.w * 0.42, y: r.base - wallH },
      { x: r.x - r.w * 0.42, y: r.base },
    ], P.ink, 0.9, r.a * 0.6);
    // Two-tier roof for the biggest halls.
    if (r.h > 100) {
      roofShape(c, r.x, r.base - wallH, r.w, r.h * 0.34, P.roof, r.a);
      roofShape(c, r.x, r.base - wallH + 18, r.w * 0.78, r.h * 0.22, P.roof, r.a * 0.95);
    } else {
      roofShape(c, r.x, r.base - wallH, r.w, r.h * 0.4, P.roof, r.a);
    }
  }

  // Distant pagoda, the landmark above the left bank.
  drawPagoda(c, 54, 648, 0.17);

  // A second, fainter pagoda at the far right.
  drawPagoda(c, 1508, 654, 0.09);

  // Distant willows and small trees between the roofs.
  for (let i = 0; i < 12; i += 1) {
    const x = -330 + i * 165 + noise1(i, 62) * 20;
    const h = 40 + (i % 3) * 16;
    c.strokeStyle = alpha(P.willow, 0.16);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, 650);
    c.lineTo(x + 2, 650 - h * 0.5);
    c.stroke();
    for (let k = 0; k < 6; k += 1) {
      const a = -0.2 - k * 0.12;
      c.beginPath();
      c.moveTo(x + 2, 650 - h * 0.5);
      c.quadraticCurveTo(
        x + 2 + Math.cos(a) * h * 0.5,
        650 - h * 0.5 + Math.sin(a) * h * 0.45,
        x + 2 + Math.cos(a) * h * 0.75,
        650 - h * 0.5 + Math.sin(a) * h * 0.8 + 8,
      );
      c.stroke();
    }
  }
}

function drawPagoda(c, x, base, a) {
  c.save();
  let y = base;
  for (let i = 0; i < 7; i += 1) {
    const w = 54 - i * 5.4;
    const h = 26;
    // Body.
    c.fillStyle = alpha('#cdb48c', a * 0.8);
    c.fillRect(x - w * 0.34, y - h, w * 0.68, h);
    line(c, [
      { x: x - w * 0.34, y: y - h }, { x: x - w * 0.34, y },
    ], P.ink, 1.0, a);
    line(c, [
      { x: x + w * 0.34, y: y - h }, { x: x + w * 0.34, y },
    ], P.ink, 1.0, a);
    // Window.
    c.fillStyle = alpha(P.ink, a * 0.5);
    c.fillRect(x - 2, y - h * 0.7, 4, h * 0.42);
    // Eaves.
    line(c, [
      { x: x - w * 0.78, y: y - h - 3 },
      { x: x - w * 0.38, y: y - h - 9 },
      { x: x, y: y - h - 12 },
      { x: x + w * 0.38, y: y - h - 9 },
      { x: x + w * 0.78, y: y - h - 3 },
    ], P.ink, 1.3, a * 1.15);
    // Tile shading under the eave.
    c.strokeStyle = alpha(P.ink, a * 0.30);
    c.lineWidth = 0.7;
    for (let k = 1; k < 4; k += 1) {
      c.beginPath();
      c.moveTo(x - w * 0.6, y - h - 4);
      c.lineTo(x + w * 0.6, y - h - 4);
      c.stroke();
    }
    y -= h + 7;
  }
  // Finial.
  line(c, [{ x, y: y + 2 }, { x, y: y - 22 }], P.ink, 1.5, a * 1.2);
  c.beginPath();
  c.fillStyle = alpha(P.ink, a);
  c.arc(x, y - 12, 2.4, 0, TAU);
  c.fill();
  c.restore();
}

function drawBirds(c) {
  const rand = rngFor(641);
  c.save();
  c.strokeStyle = alpha(P.ink, 0.38);
  c.lineWidth = 1.15;
  c.lineCap = 'round';
  for (let i = 0; i < 9; i += 1) {
    const x = 580 + rand() * 620;
    const y = 178 + rand() * 150;
    const s = 4 + rand() * 4;
    const flap = rand() > 0.5 ? 1 : 0.55;
    c.beginPath();
    c.moveTo(x - s, y + s * 0.3);
    c.quadraticCurveTo(x - s * 0.5, y - s * 0.5 * flap, x, y);
    c.quadraticCurveTo(x + s * 0.5, y - s * 0.5 * flap, x + s, y + s * 0.3);
    c.stroke();
  }
  c.restore();
}

function drawMist(c) {
  c.save();
  c.filter = 'blur(14px)';
  for (let i = 0; i < 7; i += 1) {
    const y = 610 + i * 20;
    const gr = c.createLinearGradient(0, y - 24, 0, y + 30);
    gr.addColorStop(0, 'rgba(233, 223, 200, 0)');
    gr.addColorStop(0.5, `rgba(233, 223, 200, ${0.14 - i * 0.012})`);
    gr.addColorStop(1, 'rgba(233, 223, 200, 0)');
    c.fillStyle = gr;
    c.fillRect(CACHE.x0, y - 24, CACHE.w, 54);
  }
  c.restore();
}

// The river is a single plane: it rises behind the bridge to the arch springing
// and opens into the foreground band. Seen side-on, the arch is a window onto
// the water rather than a hole in the silk.
function riverTop(x) {
  if (x > BR.xL && x < BR.xR) return archY(x);
  return BR.waterY;
}

function waterClipPath(c) {
  c.beginPath();
  c.moveTo(CACHE.x0, CACHE.y0 + CACHE.h);
  c.lineTo(CACHE.x0, BR.waterY);
  c.lineTo(BR.xL, BR.waterY);
  for (let x = BR.xL; x <= BR.xR; x += 8) c.lineTo(x, archY(x));
  c.lineTo(BR.xR, BR.waterY);
  c.lineTo(CACHE.x0 + CACHE.w, BR.waterY);
  c.lineTo(CACHE.x0 + CACHE.w, CACHE.y0 + CACHE.h);
  c.closePath();
}

function drawWaterBase(c) {
  const gr = c.createLinearGradient(0, 630, 0, CACHE.y0 + CACHE.h);
  gr.addColorStop(0, '#b1bcad');
  gr.addColorStop(0.22, '#a2b0a2');
  gr.addColorStop(0.52, '#92a296');
  gr.addColorStop(0.78, '#85968c');
  gr.addColorStop(1, '#788980');

  waterClipPath(c);
  c.fillStyle = gr;
  c.fill();

  // Broad, soft colour bands: the river is layered wash, not one flat fill.
  c.save();
  waterClipPath(c);
  c.clip();
  const bands = [
    { y: 660, h: 60, c: '#c0c9b7', a: 0.10 },
    { y: 745, h: 46, c: '#8a9a8d', a: 0.10 },
    { y: 840, h: 80, c: '#c4cebd', a: 0.08 },
    { y: 940, h: 90, c: '#6f8178', a: 0.10 },
    { y: 1035, h: 80, c: '#5f7168', a: 0.12 },
  ];
  for (const b of bands) {
    const bg = c.createLinearGradient(0, b.y, 0, b.y + b.h);
    bg.addColorStop(0, alpha(b.c, 0));
    bg.addColorStop(0.5, alpha(b.c, b.a));
    bg.addColorStop(1, alpha(b.c, 0));
    c.fillStyle = bg;
    c.fillRect(CACHE.x0, b.y, CACHE.w, b.h);
  }
  // Drift patches where the current turns.
  const patchRand = rngFor(622);
  for (let i = 0; i < 14; i += 1) {
    const px = CACHE.x0 + patchRand() * CACHE.w;
    const py = 800 + patchRand() * 280;
    const rx = 60 + patchRand() * 180;
    c.fillStyle = alpha(patchRand() > 0.5 ? '#a9b6a8' : '#7e9086', 0.05);
    c.beginPath();
    c.ellipse(px, py, rx, 14 + patchRand() * 20, (patchRand() - 0.5) * 0.2, 0, TAU);
    c.fill();
  }
  c.restore();

  // Wet edge along the arch springing.
  c.save();
  waterClipPath(c);
  c.clip();
  for (let x = BR.xL + 4; x < BR.xR - 4; x += 18) {
    const y = archY(x);
    c.strokeStyle = alpha('#5f6c60', 0.10);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(x, y + 2);
    c.lineTo(x + 12, y + 2);
    c.stroke();
  }
  c.restore();

  // Static ripples, weightier near the bottom.
  const rand = rngFor(621);
  for (let i = 0; i < 300; i += 1) {
    const y = 648 + rand() * 430;
    const x = CACHE.x0 + rand() * CACHE.w;
    if (y < riverTop(x) + 3) continue;
    const len = 8 + rand() * 70 + (y - 640) * 0.10;
    c.strokeStyle = alpha(rand() > 0.45 ? '#d2d9c7' : P.ink, 0.08 + rand() * 0.10);
    c.lineWidth = 0.6 + rand() * 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y - 1 - rand() * 2, x + len, y);
    c.stroke();
  }

  // Shadow deep under the arch.
  c.save();
  waterClipPath(c);
  c.clip();
  const shade = c.createLinearGradient(0, 637, 0, 760);
  shade.addColorStop(0, 'rgba(52, 61, 51, 0.30)');
  shade.addColorStop(1, 'rgba(52, 61, 51, 0)');
  c.fillStyle = shade;
  c.fillRect(BR.xL, 637, BR.xR - BR.xL, 150);
  c.restore();
}

function bankWall(c, x0, x1, top, seed) {
  const pts = [
    { x: x0, y: top }, { x: x1, y: top },
    { x: x1, y: BR.waterY + 24 }, { x: x0, y: BR.waterY + 24 },
  ];
  fill(c, pts, '#c2ae88', 0.55);
  const rand = rngFor(seed);
  for (let row = 0; row < 4; row += 1) {
    const y = top + row * 12 + 4;
    line(c, [{ x: x0, y }, { x: x1, y }], P.ink, 0.7, 0.22);
    for (let x = x0 + (row % 2) * 10; x < x1; x += 22) {
      line(c, [{ x, y: y - 12 }, { x, y }], P.ink, 0.6, 0.18);
    }
  }
  // Moss and wet darkening at the waterline.
  for (let i = 0; i < 26; i += 1) {
    const x = lerp(x0, x1, rand());
    c.fillStyle = alpha(P.willow, 0.10 + rand() * 0.12);
    c.beginPath();
    c.ellipse(x, top + 10 + rand() * 22, 4 + rand() * 10, 2 + rand() * 4, 0, 0, TAU);
    c.fill();
  }
}

function drawBanks(c) {
  // Left bank.
  fill(c, [
    { x: -520, y: 744 }, { x: -122, y: 744 },
    { x: -122, y: BR.waterY + 40 }, { x: -520, y: BR.waterY + 40 },
  ], '#cbb995', 0.95);
  bankWall(c, -196, -122, 748, 631);
  // Ground and grass strip.
  line(c, [{ x: -520, y: 744 }, { x: -122, y: 744 }], P.ink, 1.2, 0.4);
  const randA = rngFor(632);
  for (let i = 0; i < 62; i += 1) {
    const x = -520 + randA() * 396;
    line(c, [
      { x, y: 744 },
      { x: x + (randA() - 0.5) * 6, y: 744 - 4 - randA() * 8 },
    ], P.willow, 0.8, 0.3);
  }

  // Right bank and landing steps.
  fill(c, [
    { x: 1082, y: 748 }, { x: 1560, y: 748 },
    { x: 1560, y: BR.waterY + 40 }, { x: 1082, y: BR.waterY + 40 },
  ], '#cbb995', 0.95);
  bankWall(c, 1082, 1160, 750, 633);
  line(c, [{ x: 1082, y: 748 }, { x: 1560, y: 748 }], P.ink, 1.2, 0.4);
  const randB = rngFor(634);
  for (let i = 0; i < 60; i += 1) {
    const x = 1084 + randB() * 474;
    line(c, [
      { x, y: 748 },
      { x: x + (randB() - 0.5) * 8, y: 748 - 4 - randB() * 10 },
    ], P.willow, 0.8, 0.28);
  }

  // Steps from the right bank down to the water.
  for (let i = 0; i < 6; i += 1) {
    const y = 752 + i * 7;
    line(c, [{ x: 1038 + i * 4, y }, { x: 1088, y }], P.ink, 0.8, 0.32);
  }

  // Small piers / mooring posts.
  line(c, [{ x: 1210, y: 748 }, { x: 1210, y: 784 }], P.ink, 3, 0.45);
  c.fillStyle = alpha(P.ink, 0.4);
  c.beginPath();
  c.arc(1210, 748, 2.2, 0, TAU);
  c.fill();
}

function drawRightShops(c) {
  // Two-storey tavern at the bridge foot.
  drawShop(c, {
    x: 1258, base: 748, w: 190, wallH: 122, roofH: 50,
    storeys: 2, banner: true, awning: false, seed: 641,
  });
  // Single-storey shop behind the willow.
  drawShop(c, {
    x: 1428, base: 750, w: 160, wallH: 90, roofH: 40,
    storeys: 1, banner: false, awning: true, seed: 642,
  });
  drawShop(c, {
    x: 1128, base: 748, w: 104, wallH: 78, roofH: 34,
    storeys: 1, banner: false, awning: true, seed: 643,
  });

  // Street life on the right bank.
  drawFigure(c, 1098, 748, 36, { seed: 551, robe: '#c0ac84', hat: 'straw', facing: -1, sash: P.ink2 });
  drawFigure(c, 1120, 749, 31, { seed: 552, robe: '#b9c0a0', hat: 'cap', facing: -1, sash: P.verm });
  drawFigure(c, 1206, 748, 38, { seed: 553, robe: '#c9b68d', hat: 'cap', facing: -1, sash: P.ink2, load: 'bundle' });
  drawFigure(c, 1244, 749, 34, { seed: 554, robe: '#b3b795', hat: 'straw', facing: 1, sash: P.verm });
  drawDonkey(c, 1160, 750, { scale: 0.7 });
}

function drawLeftShops(c) {
  drawShop(c, {
    x: -318, base: 744, w: 158, wallH: 100, roofH: 42,
    storeys: 2, banner: true, awning: false, seed: 644,
  });
  drawShop(c, {
    x: -444, base: 744, w: 128, wallH: 82, roofH: 36,
    storeys: 1, banner: false, awning: true, seed: 645,
  });
  drawShop(c, {
    x: -208, base: 744, w: 104, wallH: 78, roofH: 34,
    storeys: 1, banner: false, awning: true, seed: 646,
  });

  // Street life on the left bank.
  drawFigure(c, -268, 744, 35, { seed: 561, robe: '#c4b087', hat: 'cap', facing: 1, sash: P.ink2 });
  drawFigure(c, -242, 744, 31, { seed: 562, robe: '#b9c0a0', hat: 'straw', facing: 1, sash: P.verm });
  drawFigure(c, -160, 744, 37, { seed: 563, robe: '#c9b68d', hat: 'cap', facing: 1, sash: P.ink2, load: 'pole' });
  drawFigure(c, -190, 744, 28, { seed: 564, robe: '#c6b48c', hat: 'cap', facing: 1, child: true, sash: P.verm });
  drawBareTree(c, -258, 744, 118, 571);
}

function drawBareTree(c, x, base, h, seed) {
  const rand = rngFor(seed);
  // Trunk.
  const trunk = [];
  for (let i = 0; i <= 6; i += 1) {
    const k = i / 6;
    trunk.push({
      x: x + Math.sin(k * 2.6 + 0.4) * 7 + k * 5,
      y: base - k * h * 0.65,
    });
  }
  curve(c, trunk, P.ink, 4.0, 0.72);
  curve(c, trunk.map((p) => ({ x: p.x + 1.6, y: p.y })), P.ink, 1.2, 0.3);
  // Branches.
  for (let i = 0; i < 11; i += 1) {
    const by = base - h * (0.34 + rand() * 0.34);
    const bx = x + 4 + (rand() - 0.5) * 8;
    const a = -1.2 - rand() * 0.9;
    const len = h * (0.16 + rand() * 0.22);
    const ex = bx + Math.cos(a) * len * (rand() > 0.5 ? 1 : -1);
    const ey = by + Math.sin(a) * len;
    curve(c, [
      { x: bx, y: by },
      { x: (bx + ex) / 2 + (rand() - 0.5) * 10, y: (by + ey) / 2 },
      { x: ex, y: ey },
    ], P.ink, 1.6 + rand() * 1.2, 0.5);
    // Twigs.
    for (let k = 0; k < 3; k += 1) {
      const tx = lerp(bx, ex, 0.6 + k * 0.12);
      const ty = lerp(by, ey, 0.6 + k * 0.12);
      line(c, [
        { x: tx, y: ty },
        { x: tx + (rand() - 0.5) * 16, y: ty - 4 - rand() * 14 },
      ], P.ink, 1.0, 0.42);
    }
  }
  // Sparse ink leaves.
  for (let i = 0; i < 18; i += 1) {
    const lx = x + (rand() - 0.5) * 70;
    const ly = base - h * (0.55 + rand() * 0.4);
    c.fillStyle = alpha(P.willow, 0.25 + rand() * 0.2);
    c.beginPath();
    c.ellipse(lx, ly, 2 + rand() * 2.4, 1 + rand() * 1.4, rand() * TAU, 0, TAU);
    c.fill();
  }
}

function drawShop(c, o) {
  const { x, base, w, wallH, roofH, storeys, banner, awning, seed } = o;
  const rand = rngFor(seed);
  const left = x - w / 2;
  const right = x + w / 2;
  const wallY = base - wallH;

  // Wall.
  c.fillStyle = alpha('#d4bd95', 0.88);
  c.fillRect(left, wallY, w, wallH);
  // Plaster texture.
  for (let i = 0; i < 26; i += 1) {
    const px = left + rand() * w;
    const py = wallY + rand() * wallH;
    c.fillStyle = alpha(rand() > 0.5 ? '#bda579' : '#e6d4ae', 0.10 + rand() * 0.10);
    c.fillRect(px, py, 3 + rand() * 16, 1 + rand() * 3);
  }

  // Timber frame.
  line(c, [{ x: left, y: wallY }, { x: left, y: base }], P.ink, 1.6, 0.55);
  line(c, [{ x: right, y: wallY }, { x: right, y: base }], P.ink, 1.6, 0.55);
  line(c, [{ x: left, y: base }, { x: right, y: base }], P.ink, 1.2, 0.5);
  if (storeys === 2) {
    const mid = wallY + wallH * 0.46;
    line(c, [{ x: left, y: mid }, { x: right, y: mid }], P.ink, 1.2, 0.4);
    // Upper balcony rail.
    for (let px = left + 6; px < right; px += 14) {
      line(c, [{ x: px, y: mid }, { x: px, y: mid - 12 }], P.ink, 0.8, 0.32);
    }
    line(c, [{ x: left + 2, y: mid - 12 }, { x: right - 2, y: mid - 12 }], P.ink, 1, 0.4);
    // Upper windows.
    for (let i = 0; i < 3; i += 1) {
      const wx = left + w * (0.18 + i * 0.32);
      c.fillStyle = alpha('#8f7a58', 0.32);
      c.fillRect(wx - 10, mid + 12, 20, 22);
      line(c, [{ x: wx - 10, y: mid + 12 }, { x: wx + 10, y: mid + 12 }], P.ink, 0.8, 0.4);
    }
  }

  // Open shopfront: dark interior with a counter.
  const doorW = w * 0.46;
  c.fillStyle = alpha('#4a4434', 0.28);
  c.fillRect(x - doorW / 2, base - 42, doorW, 42);
  line(c, [
    { x: x - doorW / 2, y: base - 42 }, { x: x + doorW / 2, y: base - 42 },
    { x: x + doorW / 2, y: base }, { x: x - doorW / 2, y: base },
  ], P.ink, 1.1, 0.5);
  line(c, [{ x: x - doorW / 2, y: base - 24 }, { x: x + doorW / 2, y: base - 24 }], P.ink, 1.4, 0.4);

  // Side window.
  c.fillStyle = alpha('#9b8560', 0.26);
  c.fillRect(right - w * 0.22, base - 56, w * 0.14, 20);
  line(c, [
    { x: right - w * 0.22, y: base - 56 }, { x: right - w * 0.08, y: base - 56 },
    { x: right - w * 0.08, y: base - 36 }, { x: right - w * 0.22, y: base - 36 },
  ], P.ink, 0.7, 0.4);

  // Awning.
  if (awning) {
    const ay = base - 60;
    fill(c, [
      { x: left - 10, y: ay }, { x: left + 6, y: ay - 16 },
      { x: right - 6, y: ay - 16 }, { x: right + 10, y: ay },
    ], '#d8c7a2', 0.80);
    line(c, [
      { x: left - 10, y: ay }, { x: left + 6, y: ay - 16 },
      { x: right - 6, y: ay - 16 }, { x: right + 10, y: ay },
    ], P.ink, 1.1, 0.45);
    for (let px = left + 4; px < right; px += 12) {
      line(c, [{ x: px, y: ay - 16 }, { x: px + 3, y: ay }], P.ink, 0.6, 0.22);
    }
  }

  // Roof.
  roofShape(c, x, wallY, w + 26, roofH, P.roof, 0.32);
  // Eave line and shadow.
  line(c, [
    { x: left - 18, y: wallY + 2 },
    { x: x, y: wallY - 6 },
    { x: right + 18, y: wallY + 2 },
  ], P.ink, 1.4, 0.5);
  c.fillStyle = alpha(P.ink, 0.10);
  c.fillRect(left - 6, wallY + 2, w + 12, 6);

  // Counter plinth and street shadow.
  c.fillStyle = alpha(P.ink, 0.16);
  c.fillRect(left - 4, base, w + 8, 5);
  line(c, [{ x: left - 4, y: base }, { x: right + 4, y: base }], P.ink, 1.4, 0.4);

  // Signboard above the door.
  const sbW = Math.min(56, doorW * 0.82);
  c.fillStyle = alpha('#3d3a2d', 0.88);
  c.fillRect(x - sbW / 2, base - 62, sbW, 13);
  c.strokeStyle = alpha(P.white, 0.55);
  c.lineWidth = 0.6;
  c.strokeRect(x - sbW / 2 + 1.5, base - 60.5, sbW - 3, 10);
  c.fillStyle = alpha(P.white, 0.72);
  for (let i = 0; i < 3; i += 1) {
    c.fillRect(x - sbW / 2 + 7 + i * (sbW / 3.4), base - 58, 2.6, 4.6);
  }

  // Hanging goods and a lantern.
  if (banner) {
    c.fillStyle = alpha(P.verm, 0.75);
    c.fillRect(right - 18, wallY + 18, 12, 32);
    line(c, [{ x: right - 6, y: wallY + 18 }, { x: right - 6, y: wallY + 52 }], P.ink, 0.8, 0.4);
    c.fillStyle = alpha(P.white, 0.75);
    c.fillRect(right - 15, wallY + 26, 6, 2);
    c.fillRect(right - 15, wallY + 34, 6, 2);
  }
  // Small counter wares.
  for (let i = 0; i < 5; i += 1) {
    const px = x - doorW / 2 + 5 + i * (doorW / 6);
    c.fillStyle = alpha(i % 2 ? P.ochre : '#a9a189', 0.6);
    c.beginPath();
    c.arc(px, base - 47, 2.4, 0, TAU);
    c.fill();
  }
}

function drawWillows(c) {
  drawWillow(c, 1182, 750, 340, 651);
  drawWillow(c, -368, 744, 290, 652);
  // A smaller willow at the left of the far town.
  drawWillow(c, -238, 650, 96, 653);
}

function drawWillow(c, x, base, h, seed) {
  const rand = rngFor(seed);
  const top = base - h;
  const lean = 16;

  // Trunk.
  const trunk = [];
  for (let i = 0; i <= 8; i += 1) {
    const k = i / 8;
    trunk.push({
      x: x + Math.sin(k * 2.2) * lean * 0.4 + k * lean,
      y: base - k * h * 0.52,
    });
  }
  curve(c, trunk, P.ink, 3.8, 0.72);
  curve(c, trunk.map((p) => ({ x: p.x + 2, y: p.y })), P.ink, 1, 0.25);

  // Canopy wash.
  const cx = x + lean + 6;
  const cy = top + h * 0.28;
  const gr = c.createRadialGradient(cx, cy, 8, cx, cy, h * 0.52);
  gr.addColorStop(0, alpha(P.willow, 0.34));
  gr.addColorStop(0.6, alpha(P.willow, 0.20));
  gr.addColorStop(1, alpha(P.willow, 0));
  c.fillStyle = gr;
  c.beginPath();
  c.ellipse(cx, cy, h * 0.52, h * 0.42, -0.14, 0, TAU);
  c.fill();

  // Branches.
  for (let i = 0; i < 9; i += 1) {
    const a = -1.1 - i * 0.14 + (rand() - 0.5) * 0.2;
    const bx = x + lean * 0.8;
    const by = base - h * 0.5;
    const len = h * (0.32 + rand() * 0.2);
    const ex = bx + Math.cos(a) * len;
    const ey = by + Math.sin(a) * len * 0.7;
    curve(c, [
      { x: bx, y: by },
      { x: lerp(bx, ex, 0.5) + (rand() - 0.5) * 8, y: lerp(by, ey, 0.5) - 12 },
      { x: ex, y: ey },
    ], P.ink, 1.1, 0.34);
  }

  // Hanging strands with leaves.
  const strands = 40;
  for (let i = 0; i < strands; i += 1) {
    const sx = x + lean + (rand() - 0.5) * h * 0.72;
    const sy = top + 20 + rand() * h * 0.34;
    const len = h * 0.24 + rand() * h * 0.3;
    const sway = 4 + rand() * 10;
    const pts = [
      { x: sx, y: sy },
      { x: sx + sway * 0.3, y: sy + len * 0.4 },
      { x: sx + sway, y: sy + len * 0.78 },
      { x: sx + sway * 1.3, y: sy + len },
    ];
    curve(c, pts, P.willow, 1.0, 0.42 + rand() * 0.24);
    for (let k = 1; k < 7; k += 1) {
      const t = k / 7;
      const lx = sx + sway * 1.3 * t;
      const ly = sy + len * t;
      c.strokeStyle = alpha(P.willow, 0.32 + rand() * 0.24);
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx + 2 + rand() * 4, ly + 1 + rand() * 3);
      c.stroke();
    }
  }

  // A few pale leaf clusters for body.
  for (let i = 0; i < 20; i += 1) {
    const lx = cx + (rand() - 0.5) * h * 0.9;
    const ly = cy + (rand() - 0.5) * h * 0.5;
    c.fillStyle = alpha(P.willowPale, 0.10 + rand() * 0.10);
    c.beginPath();
    c.ellipse(lx, ly, 6 + rand() * 12, 3 + rand() * 5, rand() * TAU, 0, TAU);
    c.fill();
  }
}

function drawMooredBoats(c) {
  // A small punt at the right bank.
  drawSmallBoat(c, 1228, 792, 86, 0.8);
  // A ferry in the wide water behind the bridge, far right.
  drawSmallBoat(c, 1430, 800, 64, 0.55);
  // Mooring rope.
  curve(c, [
    { x: 1250, y: 780 }, { x: 1256, y: 784 }, { x: 1262, y: 790 },
  ], P.ink, 0.9, 0.35);
}

function drawSmallBoat(c, x, y, len, a) {
  fill(c, [
    { x: x - len / 2, y },
    { x: x - len * 0.4, y: y + 7 },
    { x: x + len * 0.42, y: y + 7 },
    { x: x + len / 2, y: y - 2 },
    { x: x + len * 0.36, y: y + 2 },
    { x: x - len * 0.36, y: y + 2 },
  ], '#b99a6e', a * 0.55);
  line(c, [
    { x: x - len / 2, y }, { x: x - len * 0.4, y: y + 7 },
    { x: x + len * 0.42, y: y + 7 }, { x: x + len / 2, y: y - 2 },
  ], P.ink, 1, a * 0.6);
  // Canopy.
  c.strokeStyle = alpha(P.ink, a * 0.6);
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x, y + 1, len * 0.16, Math.PI, TAU);
  c.stroke();
  // Fisherman.
  c.fillStyle = alpha(P.ink, a * 0.7);
  c.beginPath();
  c.ellipse(x + len * 0.2, y - 2, 3, 5, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(x + len * 0.2 - 5, y - 5);
  c.lineTo(x + len * 0.2 + 5, y - 5);
  c.lineTo(x + len * 0.2, y - 9);
  c.closePath();
  c.fill();
}

// ------------------------------------------------------------------ bridge

function drawBridge(pg, c) {
  // Stone abutments anchor the timber arch in the banks.
  for (const foot of [BR.xL, BR.xR]) {
    const dir = foot === BR.xL ? 1 : -1;
    const pts = [
      { x: foot - 34 * dir, y: 738 },
      { x: foot + 6 * dir, y: 738 },
      { x: foot + 6 * dir, y: 812 },
      { x: foot - 34 * dir, y: 812 },
    ];
    fill(c, pts, '#b7a482', 0.95);
    line(c, pts, P.ink, 2.0, 0.7, true);
    for (let row = 0; row < 4; row += 1) {
      const y = 746 + row * 16;
      line(c, [
        { x: foot - 34 * dir, y },
        { x: foot + 6 * dir, y },
      ], P.ink, 1.0, 0.36);
      line(c, [
        { x: foot - 14 * dir, y: y - 16 },
        { x: foot - 14 * dir, y },
      ], P.ink, 0.9, 0.3);
    }
    // Cutwater shadow.
    line(c, [
      { x: foot - 30 * dir, y: 810 },
      { x: foot - 20 * dir, y: 780 },
    ], P.ink, 1.0, 0.4);
  }

  // Structural band between deck and arch.
  const band = bandPts(BR.xL, BR.xR, deckY, archY, 10);
  fill(c, band, '#9f7e50', 0.84);
  wobble(c, band.slice(0, band.length / 2), '#8a6c40', 0.18, 701, 2);

  // Shadow cast by the deck onto the structure.
  const shadow = bandPts(BR.xL, BR.xR, deckY, (x) => deckY(x) + 26, 12);
  fill(c, shadow, '#5c5038', 0.24);

  // Uneven timber tone: pools of darker wash inside the band.
  c.save();
  c.beginPath();
  c.moveTo(band[0].x, band[0].y);
  for (let i = 1; i < band.length; i += 1) c.lineTo(band[i].x, band[i].y);
  c.closePath();
  c.clip();
  const washRand = rngFor(714);
  for (let i = 0; i < 30; i += 1) {
    const wx = BR.xL + washRand() * (BR.xR - BR.xL);
    const top = deckY(wx);
    const bot = archY(wx);
    const wy = top + washRand() * Math.max(4, bot - top);
    c.fillStyle = alpha(washRand() > 0.45 ? '#7c6036' : '#d0b07c', 0.05 + washRand() * 0.06);
    c.beginPath();
    c.ellipse(wx, wy, 18 + washRand() * 44, 4 + washRand() * 10, 0, 0, TAU);
    c.fill();
  }
  c.restore();

  // Longitudinal beams following the arch: two heavy chords and lighter rails.
  for (const off of [16, 31]) {
    curve(c, arcPts(BR.xL + 6, BR.xR - 6, (x) => archY(x) - off, 14), P.ink, 3.4, 0.55);
    curve(c, arcPts(BR.xL + 6, BR.xR - 6, (x) => archY(x) - off - 2, 14), '#6a5434', 1.2, 0.5);
  }
  for (const off of [8, 24, 39]) {
    curve(c, arcPts(BR.xL + 8, BR.xR - 8, (x) => archY(x) - off, 16), P.ink, 1.6, 0.5);
  }
  // Dark beam under the deck.
  curve(c, arcPts(BR.xL + 6, BR.xR - 6, (x) => deckY(x) + 12, 14), P.ink, 3.0, 0.5);
  // Radial struts from arch to deck.
  for (let x = BR.xL + 12; x < BR.xR - 10; x += 26) {
    const yTop = deckY(x) + 8;
    const yBot = archY(x) - 6;
    if (yBot - yTop < 6) continue;
    line(c, [{ x, y: yTop }, { x: x + 5, y: yBot }], P.ink, 1.0, 0.38);
  }
  // X bracing in the lower band.
  for (let x = BR.xL + 16; x < BR.xR - 32; x += 26) {
    const yTopA = archY(x) - 10;
    const yTopB = archY(x + 26) - 10;
    const yBotA = archY(x) - 34;
    const yBotB = archY(x + 26) - 34;
    line(c, [{ x, y: yTopA }, { x: x + 26, y: yBotB }], P.ink, 1.0, 0.36);
    line(c, [{ x, y: yBotA }, { x: x + 26, y: yTopB }], P.ink, 1.0, 0.36);
  }
  // Weave: two crossing runs of short beams, the Rainbow Bridge's signature.
  for (let x = BR.xL + 6; x < BR.xR - 60; x += 64) {
    const a = { x, y: archY(x) - 14 };
    const b = { x: x + 58, y: deckY(x + 58) + 6 };
    line(c, [a, b], '#5f4c2e', 2.4, 0.46);
    const a2 = { x, y: deckY(x) + 6 };
    const b2 = { x: x + 58, y: archY(x + 58) - 14 };
    line(c, [a2, b2], '#5f4c2e', 2.4, 0.38);
  }

  // Wood grain: short strokes following the arch, so the band is timber rather
  // than a poured shape.
  const grain = rngFor(711);
  for (let i = 0; i < 340; i += 1) {
    const x = BR.xL + 6 + grain() * (BR.xR - BR.xL - 12);
    const top = deckY(x) + 6;
    const bot = archY(x) - 6;
    if (bot - top < 5) continue;
    const y = top + grain() * (bot - top);
    const slope = (archY(x + 10) - archY(x - 10)) / 20;
    const len = 6 + grain() * 20;
    c.strokeStyle = alpha(grain() > 0.5 ? '#6b5534' : '#cbb083', 0.10 + grain() * 0.12);
    c.lineWidth = 0.7 + grain() * 1.1;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + len, y + slope * len);
    c.stroke();
  }

  // Arch outline: the silhouette that matters.
  curve(c, arcPts(BR.xL, BR.xR, archY, 8), P.ink, 3.4, 0.9);
  curve(c, arcPts(BR.xL, BR.xR, (x) => archY(x) + 3, 8), P.ink, 1.4, 0.28);
  // A broken brush line rides the clean one, so the edge is drawn, not poured.
  const edgeRand = rngFor(712);
  const edgePts = arcPts(BR.xL + 4, BR.xR - 4, archY, 12).map((p) => ({
    x: p.x + (edgeRand() - 0.5) * 2.4,
    y: p.y + (edgeRand() - 0.5) * 2.6,
  }));
  line(c, edgePts, P.ink, 1.3, 0.42);
  // Wash bleed below the arch.
  const bleedRand = rngFor(713);
  for (let i = 0; i < 26; i += 1) {
    const bx = BR.xL + 10 + bleedRand() * (BR.xR - BR.xL - 20);
    c.fillStyle = alpha('#4d4a37', 0.05 + bleedRand() * 0.05);
    c.beginPath();
    c.ellipse(bx, archY(bx) + 4 + bleedRand() * 4, 6 + bleedRand() * 16, 1.5 + bleedRand() * 2.5, 0, 0, TAU);
    c.fill();
  }
  // Protruding beam ends along the arch.
  for (let x = BR.xL + 18; x < BR.xR - 14; x += 26) {
    const y = archY(x);
    line(c, [
      { x: x - 3, y: y - 2 },
      { x: x - 3, y: y + 6 },
      { x: x + 5, y: y + 6 },
      { x: x + 5, y: y + 2 },
    ], P.ink, 1.2, 0.42);
  }
  // Ink bleed under the arch, grounding it on the water.
  const bleed = [];
  for (let x = BR.xL; x <= BR.xR; x += 10) bleed.push({ x, y: archY(x) + 2 });
  for (let x = BR.xR; x >= BR.xL; x -= 10) bleed.push({ x, y: archY(x) + 11 });
  fill(c, bleed, '#4a4736', 0.10);

  // Deck walkway.
  const walk = bandPts(BR.xL, BR.xR, (x) => deckY(x) - 11, (x) => deckY(x) + 3, 10);
  fill(c, walk, '#dcc495', 0.98);
  curve(c, arcPts(BR.xL, BR.xR, (x) => deckY(x) - 11, 8), P.ink, 2.3, 0.72);
  curve(c, arcPts(BR.xL, BR.xR, (x) => deckY(x) + 3, 8), P.ink, 1.6, 0.46);
  // Plank shadows at the deck edge.
  for (let x = BR.xL + 10; x < BR.xR - 8; x += 34) {
    line(c, [
      { x, y: deckY(x) - 10 },
      { x, y: deckY(x) + 2 },
    ], P.ink, 0.7, 0.16);
  }

  // Deck beam ends poking out.
  for (let x = BR.xL + 18; x < BR.xR - 10; x += 48) {
    line(c, [
      { x, y: deckY(x) + 3 },
      { x, y: deckY(x) + 13 },
      { x: x + 5, y: deckY(x) + 15 },
    ], P.ink, 1.3, 0.38);
  }

  // Far railing: posts and two rails.
  const railTop = (x) => deckY(x) - 34;
  const railMid = (x) => deckY(x) - 17;
  curve(c, arcPts(BR.xL + 10, BR.xR - 10, railTop, 14), P.ink, 2.4, 0.72);
  curve(c, arcPts(BR.xL + 10, BR.xR - 10, railMid, 14), P.ink, 1.3, 0.42);
  for (let x = BR.xL + 14; x < BR.xR - 10; x += 28) {
    line(c, [{ x, y: deckY(x) - 4 }, { x, y: railTop(x) }], P.ink, 1.5, 0.58);
    line(c, [
      { x: x - 4, y: railTop(x) },
      { x: x, y: railTop(x) - 4 },
      { x: x + 4, y: railTop(x) },
    ], P.ink, 1.0, 0.42);
  }

  // Bridge sign posts (plaque is live).
  for (const sx of [SIGN.x - 32, SIGN.x + 32]) {
    line(c, [{ x: sx, y: deckY(sx) + 2 }, { x: sx, y: deckY(sx) - SIGN.postH }], P.ink, 3.4, 0.78);
    line(c, [{ x: sx - 2, y: deckY(sx) }, { x: sx - 2, y: deckY(sx) - SIGN.postH + 8 }], '#8a7048', 1.3, 0.5);
    // Brace.
    line(c, [
      { x: sx, y: deckY(sx) - SIGN.postH * 0.62 },
      { x: sx + (sx < SIGN.x ? -16 : 16), y: deckY(sx) - SIGN.postH * 0.80 },
    ], P.ink, 1.1, 0.42);
  }
  line(c, [
    { x: SIGN.x - 40, y: deckY(SIGN.x) - SIGN.postH + 2 },
    { x: SIGN.x + 40, y: deckY(SIGN.x) - SIGN.postH + 2 },
  ], P.ink, 2.8, 0.78);
  // Hanging hook.
  line(c, [
    { x: SIGN.x, y: deckY(SIGN.x) - SIGN.postH + 2 },
    { x: SIGN.x, y: deckY(SIGN.x) - SIGN.postH + 14 },
  ], P.ink, 1.5, 0.65);

  drawCrowd(c);

  // Near railing, in front of the crowd: this is what gives the deck depth.
  const nearTop = (x) => deckY(x) - 15;
  const nearMid = (x) => deckY(x) - 8;
  curve(c, arcPts(BR.xL + 6, BR.xR - 6, nearTop, 10), P.ink, 2.6, 0.78);
  curve(c, arcPts(BR.xL + 6, BR.xR - 6, nearMid, 10), P.ink, 1.3, 0.42);
  for (let x = BR.xL + 12; x < BR.xR - 8; x += 26) {
    line(c, [{ x, y: deckY(x) + 5 }, { x, y: nearTop(x) }], P.ink, 1.7, 0.62);
    line(c, [
      { x: x - 3, y: nearTop(x) },
      { x: x, y: nearTop(x) - 3 },
      { x: x + 3, y: nearTop(x) },
    ], P.ink, 1.1, 0.46);
  }

  // Near kerb, drawn after the crowd so the deck edge reads in front.
  curve(c, arcPts(BR.xL + 4, BR.xR - 4, (x) => deckY(x) + 6, 10), P.ink, 2.8, 0.62);
  for (let x = BR.xL + 22; x < BR.xR - 10; x += 60) {
    line(c, [{ x, y: deckY(x) + 6 }, { x, y: deckY(x) + 13 }], P.ink, 1.2, 0.32);
  }
}

// ------------------------------------------------------------------ crowd

function robeFill(c, x, base, h, robe, a = 0.9) {
  const w = h * 0.30;
  const shoulder = base - h * 0.76;
  const pts = [
    { x: x - w * 0.60, y: base },
    { x: x - w * 0.46, y: base - h * 0.34 },
    { x: x - w * 0.40, y: shoulder },
    { x: x, y: shoulder - h * 0.07 },
    { x: x + w * 0.40, y: shoulder },
    { x: x + w * 0.46, y: base - h * 0.34 },
    { x: x + w * 0.60, y: base },
  ];
  fill(c, pts, robe, a);
  line(c, pts, P.ink, Math.max(0.8, h * 0.032), 0.72, true);
}

function drawFigure(c, x, base, h, o = {}) {
  const ink = o.ink || P.ink;
  const facing = o.facing ?? -1;
  const lw = Math.max(0.9, h * 0.032);
  const headR = h * 0.10;
  const headY = base - h * 0.86;
  const rand = rngFor(o.seed || 1);

  robeFill(c, x, base, h, o.robe || '#dccdab', o.robeA ?? 0.9);

  // Legs.
  const legY = base - h * 0.02;
  line(c, [{ x: x - h * 0.06, y: base }, { x: x - h * 0.11, y: legY - h * 0.02 }], ink, lw, 0.8);
  line(c, [{ x: x + h * 0.05, y: base }, { x: x + h * 0.02, y: legY - h * 0.02 }], ink, lw, 0.8);

  // Sash.
  line(c, [
    { x: x - h * 0.14, y: base - h * 0.38 },
    { x: x + h * 0.14, y: base - h * 0.40 },
  ], o.sash || P.verm, Math.max(0.8, h * 0.035), 0.7);

  // Head and neck.
  line(c, [
    { x: x, y: base - h * 0.72 },
    { x: x + facing * 1, y: headY + headR },
  ], ink, lw * 1.2, 0.8);
  c.fillStyle = alpha(o.skin || P.skin, 0.95);
  c.beginPath();
  c.arc(x + facing * headR * 0.2, headY, headR, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(ink, 0.75);
  c.lineWidth = lw * 0.8;
  c.beginPath();
  c.arc(x + facing * headR * 0.2, headY, headR, 0, TAU);
  c.stroke();

  // Hats.
  const hat = o.hat || 'cap';
  if (hat === 'straw') {
    c.fillStyle = alpha('#b79a68', 0.9);
    c.beginPath();
    c.ellipse(x + facing * headR * 0.2, headY - headR * 0.5, headR * 2.3, headR * 0.8, 0, 0, TAU);
    c.fill();
    line(c, [
      { x: x - headR * 2, y: headY - headR * 0.5 },
      { x: x + headR * 2, y: headY - headR * 0.5 },
    ], ink, lw * 0.7, 0.6);
    c.fillStyle = alpha('#a98c5b', 0.9);
    c.beginPath();
    c.moveTo(x - headR * 0.9, headY - headR * 0.7);
    c.lineTo(x + headR * 0.9, headY - headR * 0.7);
    c.lineTo(x, headY - headR * 1.9);
    c.closePath();
    c.fill();
  } else if (hat === 'official') {
    c.fillStyle = alpha('#3c3a30', 0.9);
    c.beginPath();
    c.roundRect(x - headR * 1.4, headY - headR * 1.8, headR * 2.8, headR * 1.1, 1);
    c.fill();
    line(c, [
      { x: x - headR * 2.4, y: headY - headR * 1.5 },
      { x: x + headR * 2.4, y: headY - headR * 1.5 },
    ], ink, lw * 0.8, 0.7);
  } else {
    c.fillStyle = alpha('#3d3b31', 0.88);
    c.beginPath();
    c.arc(x + facing * headR * 0.2, headY - headR * 0.55, headR * 0.92, Math.PI, TAU);
    c.fill();
    c.fillRect(x + facing * headR * 0.2 - headR * 0.9, headY - headR * 0.6, headR * 1.8, headR * 0.5);
  }

  // Arms.
  if (o.load === 'pole') {
    const poleY = base - h * 0.78;
    line(c, [
      { x: x - h * 0.45, y: poleY + h * 0.06 },
      { x: x + h * 0.45, y: poleY - h * 0.06 },
    ], '#6d5738', Math.max(0.9, h * 0.035), 0.9);
    for (const side of [-1, 1]) {
      const bx = x + side * h * 0.36;
      const by = poleY + side * -h * 0.04 + h * 0.22;
      line(c, [{ x: x + side * h * 0.36, y: poleY + side * -h * 0.04 }, { x: bx, y: by }], ink, lw * 0.7, 0.6);
      fill(c, [
        { x: bx - h * 0.11, y: by }, { x: bx + h * 0.11, y: by },
        { x: bx + h * 0.08, y: by + h * 0.16 }, { x: bx - h * 0.08, y: by + h * 0.16 },
      ], '#b08d5e', 0.8);
      line(c, [
        { x: bx - h * 0.11, y: by }, { x: bx + h * 0.11, y: by },
        { x: bx + h * 0.08, y: by + h * 0.16 }, { x: bx - h * 0.08, y: by + h * 0.16 },
      ], ink, lw * 0.7, 0.7, true);
    }
  } else {
    line(c, [
      { x: x + facing * h * 0.16, y: base - h * 0.62 },
      { x: x + facing * h * 0.26, y: base - h * 0.40 },
    ], ink, lw * 1.2, 0.75);
    line(c, [
      { x: x - facing * h * 0.12, y: base - h * 0.60 },
      { x: x - facing * h * 0.18, y: base - h * 0.42 },
    ], ink, lw * 1.2, 0.55);
  }

  if (o.load === 'bundle') {
    c.fillStyle = alpha('#a98a5c', 0.8);
    c.beginPath();
    c.ellipse(x - facing * h * 0.18, base - h * 0.66, h * 0.14, h * 0.10, 0.2, 0, TAU);
    c.fill();
  }
  if (o.child) {
    c.fillStyle = alpha('#3d3b31', 0.85);
    c.beginPath();
    c.arc(x + facing * headR * 0.2, headY - headR * 1.0, headR * 0.55, 0, TAU);
    c.fill();
  }
  // Occasional tiny red accent.
  if (o.dot) {
    c.fillStyle = alpha(P.verm, 0.55);
    c.beginPath();
    c.arc(x + rand() * 2, base - h * 0.52, 1.5, 0, TAU);
    c.fill();
  }
}

function drawDonkey(c, x, base, o = {}) {
  const s = o.scale || 1;
  const ink = P.ink;
  const bodyY = base - 24 * s;
  // Legs.
  for (const dx of [-14, -6, 8, 15]) {
    line(c, [{ x: x + dx * s, y: bodyY }, { x: x + dx * s + 1, y: base }], ink, 1.6 * s, 0.7);
  }
  // Body.
  c.fillStyle = alpha('#a99a83', 0.85);
  c.beginPath();
  c.ellipse(x, bodyY, 21 * s, 11 * s, 0, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(ink, 0.65);
  c.lineWidth = 1.3 * s;
  c.stroke();
  // Neck and head.
  line(c, [
    { x: x + 16 * s, y: bodyY - 4 * s },
    { x: x + 24 * s, y: bodyY - 18 * s },
  ], ink, 4 * s, 0.75);
  c.fillStyle = alpha('#a99a83', 0.9);
  c.beginPath();
  c.ellipse(x + 26 * s, bodyY - 20 * s, 6 * s, 4 * s, -0.5, 0, TAU);
  c.fill();
  // Ears.
  line(c, [{ x: x + 24 * s, y: bodyY - 23 * s }, { x: x + 23 * s, y: bodyY - 30 * s }], ink, 1.2 * s, 0.7);
  line(c, [{ x: x + 28 * s, y: bodyY - 23 * s }, { x: x + 29 * s, y: bodyY - 30 * s }], ink, 1.2 * s, 0.7);
  // Tail.
  line(c, [{ x: x - 21 * s, y: bodyY }, { x: x - 27 * s, y: bodyY + 10 * s }], ink, 1.2 * s, 0.6);
  // Load.
  c.fillStyle = alpha('#b89a68', 0.8);
  c.fillRect(x - 16 * s, bodyY - 13 * s, 12 * s, 10 * s);
  c.fillRect(x + 2 * s, bodyY - 13 * s, 12 * s, 10 * s);
  line(c, [
    { x: x - 16 * s, y: bodyY - 13 * s }, { x: x + 14 * s, y: bodyY - 13 * s },
  ], ink, 1.0 * s, 0.5);
}

function drawCart(c, x, base, o = {}) {
  const s = o.scale || 1;
  const ink = P.ink;
  // Wheels.
  for (const dx of [-18, 18]) {
    c.strokeStyle = alpha(ink, 0.75);
    c.lineWidth = 2.2 * s;
    c.beginPath();
    c.arc(x + dx * s, base - 12 * s, 11 * s, 0, TAU);
    c.stroke();
    c.lineWidth = 1.0 * s;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU;
      c.beginPath();
      c.moveTo(x + dx * s, base - 12 * s);
      c.lineTo(x + dx * s + Math.cos(a) * 10 * s, base - 12 * s + Math.sin(a) * 10 * s);
      c.stroke();
    }
  }
  // Bed.
  c.fillStyle = alpha('#b49a6e', 0.9);
  c.fillRect(x - 30 * s, base - 24 * s, 60 * s, 8 * s);
  line(c, [
    { x: x - 30 * s, y: base - 24 * s }, { x: x + 30 * s, y: base - 24 * s },
    { x: x + 30 * s, y: base - 16 * s }, { x: x - 30 * s, y: base - 16 * s },
  ], ink, 1.1 * s, 0.6, true);
  // Sacks.
  for (let i = 0; i < 3; i += 1) {
    c.fillStyle = alpha('#cbb08a', 0.85);
    c.beginPath();
    c.ellipse(x - 18 * s + i * 17 * s, base - 30 * s, 8 * s, 6 * s, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(ink, 0.45);
    c.lineWidth = 0.9 * s;
    c.stroke();
  }
  // Shafts and a porter in front.
  line(c, [
    { x: x + 30 * s, y: base - 20 * s },
    { x: x + 48 * s, y: base - 30 * s },
  ], ink, 1.8 * s, 0.7);
}

function drawSedan(c, x, base, o = {}) {
  const s = o.scale || 1;
  const ink = P.ink;
  // Poles.
  line(c, [{ x: x - 46 * s, y: base - 38 * s }, { x: x + 46 * s, y: base - 38 * s }], ink, 2.4 * s, 0.7);
  line(c, [{ x: x - 46 * s, y: base - 30 * s }, { x: x + 46 * s, y: base - 30 * s }], ink, 2.0 * s, 0.6);
  // Cabin.
  c.fillStyle = alpha('#c9ad7c', 0.9);
  c.beginPath();
  c.roundRect(x - 24 * s, base - 54 * s, 48 * s, 26 * s, 4 * s);
  c.fill();
  c.strokeStyle = alpha(ink, 0.65);
  c.lineWidth = 1.4 * s;
  c.stroke();
  // Curtains.
  for (let i = 0; i < 3; i += 1) {
    line(c, [
      { x: x - 18 * s + i * 15 * s, y: base - 50 * s },
      { x: x - 18 * s + i * 15 * s, y: base - 30 * s },
    ], ink, 0.8 * s, 0.35);
  }
  // Roof.
  line(c, [
    { x: x - 28 * s, y: base - 54 * s },
    { x: x - 16 * s, y: base - 62 * s },
    { x: x + 16 * s, y: base - 62 * s },
    { x: x + 28 * s, y: base - 54 * s },
  ], ink, 1.8 * s, 0.65);
  // Bearers.
  for (const bx of [x - 52 * s, x + 52 * s]) {
    line(c, [{ x: bx, y: base - 34 * s }, { x: bx, y: base - 6 * s }], ink, 3.2 * s, 0.55);
    c.fillStyle = alpha('#3d3b31', 0.85);
    c.beginPath();
    c.arc(bx, base - 40 * s, 3.4 * s, 0, TAU);
    c.fill();
  }
}

function drawCrowd(c) {
  const rand = rngFor(661);

  // Far file: the crowd on the other side of the deck, smaller and paler.
  for (let i = 0; i < 16; i += 1) {
    const x = -80 + i * 69 + (rand() - 0.5) * 24;
    const h = 31 + rand() * 9;
    drawFigure(c, x, deckY(x) - 10, h, {
      seed: 500 + i,
      robe: i % 3 === 0 ? '#b0aa8c' : '#c2b795',
      robeA: 0.72,
      hat: i % 4 === 0 ? 'straw' : 'cap',
      facing: i % 2 ? 1 : -1,
      sash: P.ink2,
    });
  }

  // Left approach: two streams of porters and walkers.
  for (let i = 0; i < 9; i += 1) {
    const x = -98 + i * 42 + rand() * 12;
    const h = 38 + rand() * 12;
    drawFigure(c, x, deckY(x) + 1, h, {
      seed: 670 + i,
      robe: i % 3 === 0 ? '#8a7d5c' : i % 3 === 1 ? '#c0ae83' : '#a89468',
      hat: i % 4 === 0 ? 'straw' : 'cap',
      load: i % 3 === 0 ? 'pole' : null,
      facing: 1,
      sash: i % 2 ? P.ink2 : P.verm,
    });
  }
  drawDonkey(c, -58, deckY(-58), { scale: 0.8 });
  drawSedan(c, 52, deckY(52), { scale: 0.76 });

  // Two latecomers closing the gap behind the pelican.
  drawFigure(c, 312, deckY(312) + 1, 37, {
    seed: 681, robe: '#a89066', hat: 'straw', facing: 1, sash: P.ink2, load: 'pole',
  });
  drawFigure(c, 356, deckY(356) + 1, 32, {
    seed: 682, robe: '#c0ae83', hat: 'cap', facing: 1, sash: P.verm, load: 'bundle',
  });

  // Right approach: four knots of traffic, overlapping shoulder to shoulder.
  const knots = [
    { x0: 598, x1: 664, n: 6 },
    { x0: 686, x1: 756, n: 6 },
    { x0: 786, x1: 852, n: 6 },
    { x0: 902, x1: 930, n: 2 },
    { x0: 958, x1: 1000, n: 4 },
    { x0: 1022, x1: 1064, n: 4 },
  ];
  let idx = 0;
  for (const knot of knots) {
    for (let i = 0; i < knot.n; i += 1) {
      idx += 1;
      const t = knot.n === 1 ? 0.5 : i / (knot.n - 1);
      const x = lerp(knot.x0, knot.x1, t) + (rand() - 0.5) * 6;
      const h = 36 + rand() * 15;
      const kind = idx % 7;
      drawFigure(c, x, deckY(x) + 1, h, {
        seed: 800 + idx,
        robe: kind === 0 ? '#7c8068' : kind === 2 ? '#a58d61' : kind === 4 ? '#8e8c72' : '#b7a67f',
        robeA: 0.9 + rand() * 0.08,
        hat: kind === 4 ? 'straw' : kind === 6 ? 'official' : 'cap',
        load: kind === 1 ? 'pole' : kind === 5 ? 'bundle' : null,
        facing: x > 720 ? -1 : 1,
        sash: kind === 2 ? P.verm : P.ink2,
        dot: kind === 3,
      });
      if (idx % 4 === 2) {
        drawFigure(c, x + 8, deckY(x + 8) + 1, 21 + rand() * 4, {
          seed: 900 + idx,
          robe: '#bfae86',
          hat: 'cap',
          facing: -1,
          child: true,
          sash: P.verm,
        });
      }
    }
  }

  // A stalled cart in the jam.
  drawCart(c, 936, deckY(936), { scale: 0.92 });

  // Two dogs / small animals at the edges.
  c.strokeStyle = alpha(P.ink, 0.6);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(300, deckY(300) - 7);
  c.quadraticCurveTo(311, deckY(300) - 14, 320, deckY(300) - 8);
  c.stroke();
  c.beginPath();
  c.arc(324, deckY(324) - 11, 2.6, 0, TAU);
  c.stroke();
  c.beginPath();
  c.moveTo(324, deckY(324) - 9);
  c.lineTo(330, deckY(324) - 16);
  c.stroke();
}

// ----------------------------------------------------------------- live

function drawDeckMarks(g, ctx) {
  const c = g.drawingContext;
  const phase = (ctx.t * SPEED * 0.42) % 26;
  c.save();
  c.globalAlpha = 0.35;
  for (let x = BR.xL + 8; x < BR.xR - 6; x += 26) {
    const px = x - phase;
    if (px < BR.xL + 4) continue;
    if (px > 330 && px < 610) continue;
    const y = deckY(px) - 4;
    line(c, [{ x: px, y: y - 3 }, { x: px, y: y + 4 }], P.ink, 0.9, 0.22);
  }
  c.restore();

  // Dust behind the rear wheel.
  const rand = rngFor(Math.floor(ctx.t * 8));
  c.save();
  for (let i = 0; i < 4; i += 1) {
    const x = 380 - rand() * 40;
    const y = deckY(468) - 2 - rand() * 8;
    c.fillStyle = alpha('#efe4ca', 0.10 + rand() * 0.10);
    c.beginPath();
    c.ellipse(x, y, 5 + rand() * 10, 2 + rand() * 3, 0, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawLooker(c, x, base, h, o = {}) {
  const turn = o.turn || 0;
  const lean = o.lean || 0;
  const ink = P.ink;
  const lw = Math.max(0.9, h * 0.032);
  const headR = h * 0.10;
  const shoulderY = base - h * 0.76;
  const headBase = { x: x + turn * h * 0.20, y: base - h * 0.86 + Math.abs(turn) * h * 0.014 };

  // Body with a slight lean toward the rider.
  c.save();
  c.translate(x, base);
  c.rotate(lean * -0.10 + turn * 0.035);
  c.translate(-x, -base);
  robeFill(c, x, base, h, o.robe || '#ded0b0', 0.94);

  // Legs.
  line(c, [{ x: x - h * 0.05, y: base - 2 }, { x: x - h * 0.10, y: base }], ink, lw, 0.8);
  line(c, [{ x: x + h * 0.05, y: base - 2 }, { x: x + h * 0.02, y: base }], ink, lw, 0.8);

  // Sash.
  line(c, [
    { x: x - h * 0.14, y: base - h * 0.38 },
    { x: x + h * 0.14, y: base - h * 0.40 },
  ], o.sash || P.verm, Math.max(0.8, h * 0.036), 0.8);

  // Arms.
  if (o.point && turn < -0.1) {
    // Pointing left at the pelican.
    line(c, [
      { x: x - h * 0.10, y: shoulderY + h * 0.06 },
      { x: x - h * 0.28, y: shoulderY + h * 0.02 },
      { x: x - h * 0.44, y: shoulderY - h * 0.06 },
    ], ink, lw * 1.1, 0.8);
  } else {
    line(c, [
      { x: x - h * 0.12, y: shoulderY + h * 0.06 },
      { x: x - h * 0.15, y: base - h * 0.36 },
    ], ink, lw * 1.1, 0.65);
  }
  line(c, [
    { x: x + h * 0.12, y: shoulderY + h * 0.06 },
    { x: x + h * 0.18, y: base - h * 0.40 },
  ], ink, lw * 1.1, 0.6);

  // Neck.
  line(c, [
    { x: x + 1, y: shoulderY + 2 },
    { x: headBase.x, y: headBase.y + headR * 0.9 },
  ], ink, lw * 1.3, 0.85);

  // Head.
  c.fillStyle = alpha(P.skin, 0.97);
  c.beginPath();
  c.arc(headBase.x, headBase.y, headR, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(ink, 0.8);
  c.lineWidth = lw * 0.8;
  c.stroke();

  // Face: eye and brow shift with the turn.
  const fx = headBase.x + turn * headR * 0.55;
  c.fillStyle = alpha(ink, 0.9);
  c.beginPath();
  c.arc(fx, headBase.y - headR * 0.12, Math.max(0.6, headR * 0.13), 0, TAU);
  c.fill();
  line(c, [
    { x: fx - headR * 0.4, y: headBase.y - headR * 0.42 },
    { x: fx + headR * 0.3, y: headBase.y - headR * 0.38 },
  ], ink, Math.max(0.6, lw * 0.6), 0.6);
  // Profile nose makes the direction of the turn readable.
  c.fillStyle = alpha(P.skin, 0.95);
  c.beginPath();
  c.moveTo(headBase.x + turn * headR * 0.78, headBase.y - headR * 0.12);
  c.lineTo(headBase.x + turn * headR * 1.30, headBase.y + headR * 0.12);
  c.lineTo(headBase.x + turn * headR * 0.70, headBase.y + headR * 0.36);
  c.closePath();
  c.fill();
  c.strokeStyle = alpha(ink, 0.7);
  c.lineWidth = Math.max(0.5, lw * 0.55);
  c.stroke();

  // Hat.
  if (o.hat === 'official') {
    c.fillStyle = alpha('#3c3a30', 0.9);
    c.beginPath();
    c.roundRect(headBase.x - headR * 1.5, headBase.y - headR * 2.0, headR * 3, headR * 1.2, 1);
    c.fill();
    line(c, [
      { x: headBase.x - headR * 2.6, y: headBase.y - headR * 1.6 },
      { x: headBase.x + headR * 2.6, y: headBase.y - headR * 1.6 },
    ], ink, lw * 0.8, 0.75);
  } else if (o.hat === 'straw') {
    c.fillStyle = alpha('#b79a68', 0.95);
    c.beginPath();
    c.ellipse(headBase.x, headBase.y - headR * 0.55, headR * 2.4, headR * 0.8, 0, 0, TAU);
    c.fill();
    line(c, [
      { x: headBase.x - headR * 2.1, y: headBase.y - headR * 0.55 },
      { x: headBase.x + headR * 2.1, y: headBase.y - headR * 0.55 },
    ], ink, lw * 0.7, 0.65);
    c.fillStyle = alpha('#a98c5b', 0.95);
    c.beginPath();
    c.moveTo(headBase.x - headR * 0.85, headBase.y - headR * 0.7);
    c.lineTo(headBase.x + headR * 0.85, headBase.y - headR * 0.7);
    c.lineTo(headBase.x, headBase.y - headR * 2.0);
    c.closePath();
    c.fill();
  } else {
    c.fillStyle = alpha('#3d3b31', 0.92);
    c.beginPath();
    c.arc(headBase.x, headBase.y - headR * 0.6, headR * 0.95, Math.PI, TAU);
    c.fill();
    c.fillRect(headBase.x - headR * 0.95, headBase.y - headR * 0.68, headR * 1.9, headR * 0.55);
    // Bun for the woman.
    if (o.bun) {
      c.beginPath();
      c.arc(headBase.x + headR * 0.9, headBase.y - headR * 1.1, headR * 0.5, 0, TAU);
      c.fill();
    }
  }

  if (o.child) {
    c.fillStyle = alpha('#3d3b31', 0.9);
    c.beginPath();
    c.arc(headBase.x, headBase.y - headR * 1.4, headR * 0.45, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawLookers(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;

  // Staggered head turns; they stay turned to watch the pelican.
  const turnFor = (delay) => easeOut(smoothstep(delay, delay + 0.28, local));
  const leanFor = (delay) => smoothstep(delay + 0.2, delay + 0.6, local);

  // Woman at the apex.
  const x1 = 668;
  drawLooker(c, x1, deckY(x1) + 2, 48, {
    turn: lerp(0.42, -0.95, turnFor(2.78)),
    lean: leanFor(2.78),
    hat: 'cap',
    bun: true,
    robe: '#b98a6a',
    sash: P.verm,
    point: false,
  });

  // Child, pointing.
  const x2 = 614;
  drawLooker(c, x2, deckY(x2) + 2, 34, {
    turn: lerp(0.45, -1.0, turnFor(2.92)),
    lean: leanFor(2.92),
    hat: 'cap',
    child: true,
    robe: '#d3c3a2',
    sash: P.verm,
    point: true,
  });

  // Official.
  const x3 = 770;
  drawLooker(c, x3, deckY(x3) + 2, 56, {
    turn: lerp(0.35, -0.85, turnFor(2.66)),
    lean: leanFor(2.66),
    hat: 'official',
    robe: '#8fa08e',
    sash: '#3d3b31',
  });

  // Far walker.
  const x4 = 832;
  drawLooker(c, x4, deckY(x4) + 2, 50, {
    turn: lerp(0.30, -0.90, turnFor(3.08)),
    lean: leanFor(3.08),
    hat: 'straw',
    robe: '#c9b78e',
    sash: P.ink2,
  });

  // The porter with the basket — the gadget of the scene.
  drawBasketPorter(c, ctx, 890);
}

function drawBasketPorter(c, ctx, x) {
  const local = ctx.local;
  const base = deckY(x) + 2;
  const h = 56;
  const stumble = smoothstep(2.2, 2.55, local);
  const reach = smoothstep(2.5, 2.9, local) * (1 - smoothstep(3.4, 4.0, local));
  const alarm = smoothstep(3.0, 3.3, local);
  const turn = lerp(0.35, -1.0, easeOut(smoothstep(2.94, 3.2, local)));

  // Body, leaning forward during the stumble.
  c.save();
  c.translate(x, base);
  c.rotate(stumble * 0.12 - reach * 0.10);
  c.translate(-x, -base);
  robeFill(c, x, base, h, '#a38a63', 0.96);
  line(c, [{ x: x - h * 0.05, y: base - 2 }, { x: x - h * 0.11, y: base }], P.ink, 1.4, 0.8);
  line(c, [{ x: x + h * 0.05, y: base - 2 }, { x: x + h * 0.10, y: base }], P.ink, 1.4, 0.8);
  line(c, [
    { x: x - h * 0.14, y: base - h * 0.38 },
    { x: x + h * 0.14, y: base - h * 0.40 },
  ], P.verm, 1.5, 0.75);

  const headY = base - h * 0.86;
  const headX = x + turn * 9;
  line(c, [{ x, y: base - h * 0.72 }, { x: headX, y: headY + 4.5 }], P.ink, 1.9, 0.85);
  c.fillStyle = alpha(P.skin, 0.97);
  c.beginPath();
  c.arc(headX, headY, 5.2, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(P.ink, 0.8);
  c.lineWidth = 1.1;
  c.stroke();
  c.fillStyle = alpha('#3d3b31', 0.92);
  c.beginPath();
  c.arc(headX, headY - 3.6, 4.9, Math.PI, TAU);
  c.fill();
  c.fillRect(headX - 4.9, headY - 4.0, 9.8, 2.6);

  // Eyes / mouth when alarmed.
  c.fillStyle = alpha(P.ink, 0.9);
  c.beginPath();
  c.arc(headX - 1.5, headY - 0.5, 0.7, 0, TAU);
  c.fill();
  if (alarm > 0.05) {
    c.beginPath();
    c.ellipse(headX - 0.5, headY + 2.4, 1.0, 0.6 + alarm, 0, 0, TAU);
    c.fill();
  }

  // Shoulder pole and the remaining basket (or empty pole after the drop).
  const poleY = base - h * 0.80;
  line(c, [
    { x: x - h * 0.40, y: poleY + 4 },
    { x: x + h * 0.42, y: poleY - 4 },
  ], '#6d5738', 1.7, 0.9);
  if (local < 2.9) {
    // Basket hanging at the left end of the pole.
    const bx = x - h * 0.34;
    const by = poleY + 12 + stumble * 6;
    c.strokeStyle = alpha(P.ink, 0.7);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(bx, poleY + 3);
    c.lineTo(bx, by);
    c.stroke();
    drawBasket(c, bx, by, 1.3, 0.95);
  } else {
    // After the drop: two empty hooks swing.
    line(c, [
      { x: x + h * 0.36, y: poleY - 3 },
      { x: x + h * 0.30, y: poleY + 14 + Math.sin(local * 8) * 2 },
    ], P.ink, 0.8, 0.5);
  }

  // Arms: one holds the pole, one reaches for the falling basket.
  line(c, [
    { x: x + h * 0.12, y: base - h * 0.60 },
    { x: x + h * 0.34, y: poleY + 2 },
  ], P.ink, 1.6, 0.8);
  if (reach > 0.02) {
    line(c, [
      { x: x - h * 0.12, y: base - h * 0.60 },
      { x: x - h * 0.26 - reach * 10, y: base - h * 0.48 + reach * 14 },
    ], P.ink, 1.6, 0.8);
  } else {
    line(c, [
      { x: x - h * 0.12, y: base - h * 0.60 },
      { x: x - h * 0.20, y: base - h * 0.42 },
    ], P.ink, 1.5, 0.65);
  }

  // Alarm marks on the beat.
  if (alarm > 0.05) {
    const a = alarm * (0.7 + 0.3 * Math.sin(local * 10));
    c.strokeStyle = alpha(P.ink, 0.55 * a);
    c.lineWidth = 1.2;
    for (let i = 0; i < 2; i += 1) {
      c.beginPath();
      c.moveTo(headX + 8 + i * 6, headY - 8 - i * 2);
      c.lineTo(headX + 13 + i * 6, headY - 15 - i * 2);
      c.stroke();
    }
  }
  c.restore();

  // The falling basket and its contents.
  drawBasketDrop(c, ctx, x, base);
}

function drawBasket(c, x, y, s, a) {
  const w = 8 * s;
  const h = 13 * s;
  // Woven body.
  fill(c, [
    { x: x - w, y: y },
    { x: x + w, y: y },
    { x: x + w * 0.82, y: y + h },
    { x: x - w * 0.82, y: y + h },
  ], '#b08b55', a);
  line(c, [
    { x: x - w, y: y }, { x: x + w, y: y },
    { x: x + w * 0.82, y: y + h },
    { x: x - w * 0.82, y: y + h },
  ], P.ink, 1.4 * s, 0.9, true);
  // Weave.
  for (let i = 1; i <= 3; i += 1) {
    const yy = y + (h * i) / 4;
    line(c, [
      { x: x - lerp(w, w * 0.82, i / 4), y: yy },
      { x: x + lerp(w, w * 0.82, i / 4), y: yy },
    ], P.ink, 0.7 * s, 0.55);
  }
  for (let i = -2; i <= 2; i += 1) {
    line(c, [
      { x: x + i * w * 0.3, y: y + 1 },
      { x: x + i * w * 0.25, y: y + h - 1 },
    ], '#7d5f38', 0.7 * s, 0.4);
  }
  // Open mouth with a dark interior.
  c.fillStyle = alpha('#5c4527', 0.75);
  c.beginPath();
  c.ellipse(x, y, w, w * 0.30, 0, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(P.ink, 0.85);
  c.lineWidth = 1.1 * s;
  c.stroke();
  // Contents peeking over the rim.
  c.fillStyle = alpha('#a9b58a', 0.95);
  c.beginPath();
  c.arc(x - w * 0.25, y - w * 0.10, w * 0.26, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(x + w * 0.25, y - w * 0.06, w * 0.24, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(P.willow, 0.7);
  c.lineWidth = 0.6 * s;
  c.stroke();
}

function drawBasketDrop(c, ctx, porterX, base) {
  const local = ctx.local;
  if (local < 2.42) return;
  const t = local - 2.42;
  // Fall, bounce, roll down the deck.
  const fall = clamp(t / 0.5);
  const bounce = Math.sin(clamp((t - 0.5) / 0.35) * Math.PI) * (t > 0.5 && t < 0.85 ? 1 : 0);
  const x = porterX - 18 + easeOut(clamp((t - 0.45) / 1.6)) * 46;
  const y = lerp(base - 104, base - 26, fall) - bounce * 12;
  const rot = t * 2.6 + 0.3;
  c.save();
  c.translate(x, y);
  c.rotate(rot * 0.55);
  drawBasket(c, 0, 0, 1.8, 0.97);
  c.restore();

  // Impact ticks on landing.
  if (t > 0.35 && t < 0.85) {
    c.strokeStyle = alpha(P.ink, 0.28);
    c.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      c.moveTo(x - 18 + i * 12, base - 18 - i * 2);
      c.lineTo(x - 24 + i * 12, base - 26 - i * 2);
      c.stroke();
    }
  }

  // Spilled cabbages and persimmons.
  const spill = clamp((t - 0.55) / 0.7);
  if (spill > 0) {
    const rand = rngFor(771);
    for (let i = 0; i < 7; i += 1) {
      const sx = x + (rand() - 0.5) * 76 * spill;
      const sy = base - 4 - rand() * 8 * spill;
      if (i < 4) {
        c.fillStyle = alpha('#a9b58a', 0.85);
        c.beginPath();
        c.arc(sx, sy, 5.2, 0, TAU);
        c.fill();
        c.strokeStyle = alpha(P.willow, 0.6);
        c.lineWidth = 0.7;
        c.stroke();
        c.beginPath();
        c.arc(sx, sy, 1.4, 0.3, 3.5);
        c.stroke();
      } else {
        c.fillStyle = alpha(P.verm, 0.8);
        c.beginPath();
        c.arc(sx, sy, 3.4, 0, TAU);
        c.fill();
      }
    }
  }
}

// ------------------------------------------------------------------ rider

function drawRider(g, ctx) {
  const style = neutralStyle({
    ink: '#2c2e26',
    body: '#f7f0dd',
    bodyShade: '#d9d1bb',
    wing: '#ece3cd',
    beak: '#b56c35',
    pouch: '#c98d4e',
    leg: '#9a6a3b',
    eye: '#20221c',
    eyeWhite: '#fffdf4',
    tire: '#2b2c24',
    rim: '#5d5b4a',
    metal: '#6f6c5b',
    saddle: '#4c4032',
    chain: '#5a5848',
  });
  style.weight = 0.98;
  style.farAlpha = 0.42;
  style.shadow = 0.16;

  const pose = rigPose(ctx.t);
  const x = 468;
  const y = deckY(x);

  // A soft contact shadow on the deck planks.
  const c = g.drawingContext;
  c.save();
  c.translate(x, y + 3);
  c.scale(1, 0.12);
  const gr = c.createRadialGradient(0, 0, 10, 0, 0, 110);
  gr.addColorStop(0, 'rgba(56, 50, 38, 0.30)');
  gr.addColorStop(1, 'rgba(56, 50, 38, 0)');
  c.fillStyle = gr;
  c.beginPath();
  c.arc(0, 0, 110, 0, TAU);
  c.fill();
  c.restore();

  drawRig(g, pose, style, { x, y, scale: 0.78, shadow: false });
  // Tire contact marks.
  c.save();
  c.strokeStyle = alpha('#3a3527', 0.35);
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(x - 84, y + 1);
  c.lineTo(x - 62, y + 1);
  c.moveTo(x + 50, y + 1);
  c.lineTo(x + 72, y + 1);
  c.stroke();
  c.restore();
}

// ------------------------------------------------------------------- sign

function drawSign(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const topY = deckY(SIGN.x) - SIGN.postH + 14;
  const kick = Math.exp(-Math.pow((local - 3.02) / 0.28, 2));
  const angle = 0.045 * Math.sin(local * 1.6) + 0.10 * kick * Math.sin((local - 3.02) * 24);

  // Ropes.
  c.save();
  c.strokeStyle = alpha(P.ink, 0.7);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(SIGN.x - 14, topY);
  c.lineTo(SIGN.x - 14, topY + 8);
  c.moveTo(SIGN.x + 14, topY);
  c.lineTo(SIGN.x + 14, topY + 8);
  c.stroke();
  c.restore();

  c.save();
  c.translate(SIGN.x, topY + 8);
  c.rotate(angle);
  const w = SIGN.w;
  const h = SIGN.h;

  // Board.
  c.fillStyle = alpha('#d9c39a', 0.98);
  c.fillRect(-w / 2, 0, w, h);
  c.strokeStyle = alpha(P.ink, 0.85);
  c.lineWidth = 2.0;
  c.strokeRect(-w / 2, 0, w, h);
  c.strokeStyle = alpha(P.verm, 0.85);
  c.lineWidth = 3.2;
  c.strokeRect(-w / 2 + 4, 4, w - 8, h - 8);
  c.strokeStyle = alpha(P.ink, 0.4);
  c.lineWidth = 0.8;
  c.strokeRect(-w / 2 + 7, 7, w - 14, h - 14);

  // Wood grain.
  const rand = rngFor(881);
  for (let i = 0; i < 12; i += 1) {
    c.strokeStyle = alpha('#8f764f', 0.08 + rand() * 0.06);
    c.lineWidth = 0.7;
    c.beginPath();
    const gy = 10 + rand() * (h - 20);
    c.moveTo(-w / 2 + 6, gy);
    c.quadraticCurveTo(0, gy + (rand() - 0.5) * 4, w / 2 - 6, gy);
    c.stroke();
  }

  // Vertical characters 虹桥.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 38, 600, CN_FONT, '0px');
  c.fillStyle = alpha(P.ink, 0.96);
  c.fillText('虹', 0, 40);
  c.fillText('桥', 0, 84);

  // Small red seal.
  c.fillStyle = alpha(P.verm, 0.9);
  c.fillRect(-11, h - 20, 22, 14);
  c.fillStyle = alpha(P.white, 0.9);
  setFont(c, 10, 600, CN_FONT, '0px');
  c.fillText('宋', 0, h - 13);

  c.restore();

  // Motion ticks when the sign is struck by the crowd.
  if (kick > 0.08) {
    c.save();
    c.strokeStyle = alpha(P.ink, 0.30 * kick);
    c.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      c.moveTo(SIGN.x + w / 2 + 7 + i * 4, topY + 24 + i * 10);
      c.lineTo(SIGN.x + w / 2 + 13 + i * 4, topY + 20 + i * 10);
      c.stroke();
    }
    c.restore();
  }
}

// ------------------------------------------------------------------ water

function drawWater(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const y0 = BR.waterY;

  c.save();
  waterClipPath(c);
  c.clip();

  // Broad inverted arch shadow, broken by the current.
  const refl = [];
  for (let x = BR.xL; x <= BR.xR; x += 12) {
    const depth = (BR.waterY - archY(x)) * 0.55;
    refl.push({ x, y: y0 + 4 + depth + Math.sin(x * 0.07 + local) * 2 });
  }
  for (let x = BR.xR; x >= BR.xL; x -= 12) refl.push({ x, y: y0 + 6 });
  fill(c, refl, '#4e5b4f', 0.10);

  // Inverted bridge reflection: a wobbling arch.
  c.save();
  c.lineWidth = 2.6;
  for (let k = 0; k < 4; k += 1) {
    const off = 10 + k * 16;
    const pts = [];
    for (let x = BR.xL; x <= BR.xR; x += 14) {
      const depth = (BR.waterY - archY(x)) * (0.26 + k * 0.09);
      const wob = Math.sin(x * 0.055 + local * 1.3 + k * 1.1) * 2.6
        + noise1(x * 0.02 + local * 0.5, 51 + k) * 1.8;
      pts.push({ x: x + wob, y: y0 + off + depth });
    }
    c.strokeStyle = alpha('#4f5d52', 0.20 + k * 0.04);
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
  }
  c.restore();

  // Vertical broken reflections of the crowd and railing.
  const rand = rngFor(701);
  for (let i = 0; i < 150; i += 1) {
    const x = BR.xL + rand() * (BR.xR - BR.xL);
    const top = archY(x);
    const y = Math.max(y0 + 8, top) + rand() * 150;
    const len = 3 + rand() * 18;
    c.strokeStyle = alpha(P.ink, 0.06 + rand() * 0.07);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x + Math.sin(local * 1.2 + i) * 1.4, y);
    c.lineTo(x + Math.sin(local * 1.2 + i) * 1.4, y + len);
    c.stroke();
  }

  // Willow reflection at the right bank.
  for (let i = 0; i < 44; i += 1) {
    const x = 1120 + rand() * 300;
    const y = y0 + 6 + rand() * 170;
    c.strokeStyle = alpha(P.willow, 0.07 + rand() * 0.08);
    c.lineWidth = 1.0;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(local * 1.4 + i * 0.8) * 3, y + 8 + rand() * 26);
    c.stroke();
  }
  // Left-bank shop reflection.
  for (let i = 0; i < 36; i += 1) {
    const x = -420 + rand() * 300;
    const y = y0 + 6 + rand() * 120;
    c.strokeStyle = alpha(P.ink, 0.05 + rand() * 0.05);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(local * 1.1 + i) * 2.4, y + 5 + rand() * 18);
    c.stroke();
  }

  // Live ripples, drifting at different speeds; the clip keeps them inside
  // the river, including the water seen through the arch.
  for (let row = 0; row < 58; row += 1) {
    const depth = row / 57;
    const y = y0 - 128 + depth * 446 + noise1(row * 0.6, 71) * 2.4;
    const speed = 6 + depth * 28;
    const phase = (ctx.t * speed + row * 47) % 300;
    const lw = 0.9 + depth * 1.7;
    for (let k = 0; k < 7; k += 1) {
      const x = -900 + k * 400 + phase - 300;
      const len = 16 + depth * 70 + ((row * 13) % 24);
      const a = 0.08 + depth * 0.16;
      c.strokeStyle = alpha(row % 3 === 0 ? '#ccd4c2' : '#58665b', a);
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + len * 0.5, y - 0.8 - depth * 1.6, x + len, y);
      c.stroke();
    }
  }

  // A few bright glints near the foreground.
  for (let i = 0; i < 18; i += 1) {
    const x = -400 + ((i * 137 + ctx.t * 9) % 1700);
    const y = y0 + 140 + (i * 31) % 150;
    c.strokeStyle = alpha('#ececda', 0.20);
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 12 + (i % 4) * 7, y);
    c.stroke();
  }

  // Near-water wave crests: a stronger foreground note.
  for (let i = 0; i < 26; i += 1) {
    const x = -520 + ((i * 97 + ctx.t * 14) % 1900);
    const y = 1010 + (i * 29) % 74;
    const len = 26 + (i % 5) * 16;
    c.strokeStyle = alpha('#e1e3cf', 0.16 + (i % 3) * 0.05);
    c.lineWidth = 1.4 + (i % 3) * 0.6;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.4, y - 3, x + len * 0.7, y);
    c.quadraticCurveTo(x + len * 0.85, y + 1.6, x + len, y);
    c.stroke();
    c.strokeStyle = alpha('#54645a', 0.10);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(x + 4, y + 4);
    c.lineTo(x + len * 0.9, y + 4);
    c.stroke();
  }

  c.restore();
}

// -------------------------------------------------------------- foreground

function drawForeground(pg, c) {
  // A cropped foreground sampan at the lower left.
  drawForegroundSampan(c, 34, 976);
  // Reeds at the lower right.
  drawReeds(c, 1170, 930, 360, 741);
  // Three ducks and lotus pads in the near water.
  drawDuck(c, 742, 960, 1.35);
  drawDuck(c, 794, 976, 1.1);
  drawDuck(c, 1052, 1002, 1.2);
  const rand = rngFor(761);
  for (let i = 0; i < 12; i += 1) {
    const x = -180 + rand() * 520 + (i > 6 ? 900 : 0);
    const y = 1006 + rand() * 70;
    c.fillStyle = alpha(P.willow, 0.20 + rand() * 0.12);
    c.beginPath();
    c.ellipse(x, y, 8 + rand() * 9, 3 + rand() * 2.5, (rand() - 0.5) * 0.5, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(P.ink, 0.15);
    c.lineWidth = 0.7;
    c.stroke();
  }
}

function drawForegroundSampan(c, x, y) {
  const s = 1.35;
  // Hull.
  fill(c, [
    { x: x - 92 * s, y: y },
    { x: x - 74 * s, y: y + 20 * s },
    { x: x + 78 * s, y: y + 18 * s },
    { x: x + 114 * s, y: y - 12 * s },
    { x: x + 92 * s, y: y - 2 * s },
    { x: x - 74 * s, y: y },
  ], '#b99769', 0.88);
  line(c, [
    { x: x - 92 * s, y: y },
    { x: x - 74 * s, y: y + 20 * s },
    { x: x + 78 * s, y: y + 18 * s },
    { x: x + 114 * s, y: y - 12 * s },
  ], P.ink, 2.0, 0.68);
  // Plank lines.
  for (let i = 0; i < 5; i += 1) {
    line(c, [
      { x: x - 80 * s + i * 30 * s, y: y + 8 * s },
      { x: x - 68 * s + i * 30 * s, y: y + 18 * s },
    ], P.ink, 0.8, 0.25);
  }
  // Canopy.
  c.fillStyle = alpha('#a08d6b', 0.72);
  c.beginPath();
  c.moveTo(x - 46 * s, y - 2);
  c.quadraticCurveTo(x - 8 * s, y - 56 * s, x + 46 * s, y - 2);
  c.closePath();
  c.fill();
  line(c, [
    { x: x - 46 * s, y: y - 2 },
    { x: x - 8 * s, y: y - 56 * s },
    { x: x + 46 * s, y: y - 2 },
  ], P.ink, 2.2, 0.7);
  // Mat ribs.
  for (let i = 1; i < 6; i += 1) {
    const t = i / 6;
    line(c, [
      { x: lerp(x - 46 * s, x + 46 * s, t), y: y - 2 },
      { x: lerp(x - 42 * s, x + 36 * s, t), y: y - 2 - 42 * s * Math.sin(t * Math.PI) },
    ], P.ink, 0.8, 0.2);
  }
  // Fisherman at the stern.
  c.fillStyle = alpha('#6b6350', 0.9);
  c.beginPath();
  c.ellipse(x - 70 * s, y - 18 * s, 8, 13, -0.18, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(x - 84 * s, y - 22 * s);
  c.lineTo(x - 56 * s, y - 22 * s);
  c.lineTo(x - 70 * s, y - 35 * s);
  c.closePath();
  c.fill();
  // Pole.
  line(c, [
    { x: x - 62 * s, y: y - 18 * s },
    { x: x + 40 * s, y: y - 52 * s },
  ], '#6d5738', 2, 0.7);
  // Waterline.
  line(c, [
    { x: x - 100 * s, y: y + 6 },
    { x: x + 120 * s, y: y + 2 },
  ], '#d7dcc8', 2.2, 0.35);
}

function drawReeds(c, x, y, w, seed) {
  const rand = rngFor(seed);
  for (let i = 0; i < 56; i += 1) {
    const px = x + rand() * w;
    const h = 40 + rand() * 96;
    const lean = (rand() - 0.5) * 26;
    const a = 0.25 + rand() * 0.35;
    c.strokeStyle = alpha(P.willow, a);
    c.lineWidth = 0.9 + rand() * 1.2;
    c.beginPath();
    c.moveTo(px, y + rand() * 40);
    c.quadraticCurveTo(px + lean * 0.4, y - h * 0.55, px + lean, y - h);
    c.stroke();
    // Seed head.
    if (rand() > 0.55) {
      c.fillStyle = alpha('#8b7c5b', a * 0.9);
      c.beginPath();
      c.ellipse(px + lean, y - h, 1.8, 5, lean * 0.02, 0, TAU);
      c.fill();
    }
  }
}

function drawDuck(c, x, y, s) {
  c.fillStyle = alpha('#8d8a72', 0.75);
  c.beginPath();
  c.ellipse(x, y, 9 * s, 5 * s, 0, 0, TAU);
  c.fill();
  c.fillStyle = alpha('#5f5d4c', 0.8);
  c.beginPath();
  c.arc(x + 8 * s, y - 4 * s, 3.2 * s, 0, TAU);
  c.fill();
  c.fillStyle = alpha(P.verm, 0.6);
  c.beginPath();
  c.moveTo(x + 10 * s, y - 5 * s);
  c.lineTo(x + 15 * s, y - 4 * s);
  c.lineTo(x + 10 * s, y - 3 * s);
  c.closePath();
  c.fill();
}

// ----------------------------------------------------------------- boat

function drawBoat(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const x = 830 - 44 * local;
  const y = 780; // waterline; the arch frames the boat
  const s = 1.24;

  const mastPhase = smoothstep(0.25, 1.45, local);
  const mastAngle = 0.15 + 1.20 * easeInOut(mastPhase);
  const duck = smoothstep(2.82, 3.06, local) * (1 - smoothstep(3.55, 4.0, local));
  const wake = Math.sin(local * 2.0) * 0.5;

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Broken hull reflection in the near water.
  for (let i = 0; i < 14; i += 1) {
    const rx = -78 + i * 11;
    c.strokeStyle = alpha('#5d685c', 0.10 + (i % 3) * 0.035);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(rx, 16 + Math.sin(local * 2 + i) * 1.2);
    c.lineTo(rx + 4, 30 + Math.cos(local * 1.7 + i) * 2);
    c.stroke();
  }

  // Hull: low bow at the left, high stern at the right.
  const hull = [
    { x: -90, y: -6 },
    { x: -82, y: 8 },
    { x: -58, y: 16 },
    { x: -16, y: 20 },
    { x: 40, y: 18 },
    { x: 76, y: 10 },
    { x: 92, y: -4 },
    { x: 80, y: -12 },
    { x: 44, y: -16 },
    { x: -16, y: -15 },
    { x: -64, y: -11 },
  ];
  fill(c, hull, '#b69563', 0.97);
  line(c, hull, P.ink, 2.6, 0.88, true);
  // Plank lines.
  for (let i = 0; i < 4; i += 1) {
    curve(c, [
      { x: -80 + i * 2, y: 0 + i * 4 },
      { x: -10, y: 3 + i * 4 },
      { x: 78 - i * 2, y: -2 + i * 4 },
    ], P.ink, 0.8, 0.38);
  }
  // Gunwale and its stanchions.
  line(c, [
    { x: -90, y: -6 }, { x: -64, y: -11 },
    { x: -16, y: -15 }, { x: 44, y: -16 },
    { x: 80, y: -12 }, { x: 92, y: -4 },
  ], P.ink, 2.4, 0.85);
  for (let i = 0; i < 7; i += 1) {
    const px = -58 + i * 22;
    line(c, [{ x: px, y: -13 }, { x: px, y: -5 }], P.ink, 1.0, 0.4);
  }

  // Stern platform, raised.
  fill(c, [
    { x: 54, y: -14 }, { x: 58, y: -30 },
    { x: 88, y: -27 }, { x: 92, y: -6 },
  ], '#b99a6a', 0.95);
  line(c, [
    { x: 54, y: -14 }, { x: 58, y: -30 },
    { x: 88, y: -27 }, { x: 92, y: -6 },
  ], P.ink, 1.6, 0.7, true);

  // Cabin with a curved mat roof.
  fill(c, [
    { x: -30, y: -14 }, { x: -30, y: -34 },
    { x: -20, y: -48 }, { x: 30, y: -48 },
    { x: 34, y: -36 }, { x: 38, y: -14 },
  ], '#c6ab7a', 0.97);
  line(c, [
    { x: -30, y: -14 }, { x: -30, y: -34 },
    { x: -20, y: -48 }, { x: 30, y: -48 },
    { x: 34, y: -36 }, { x: 38, y: -14 },
  ], P.ink, 2.0, 0.85);
  // Roof curve.
  curve(c, [
    { x: -22, y: -48 }, { x: 4, y: -42 }, { x: 30, y: -48 },
  ], P.ink, 2.2, 0.8);
  // Mat canopy ribs.
  for (let i = 1; i < 8; i += 1) {
    const px = -22 + i * 7.4;
    line(c, [
      { x: px, y: -14 },
      { x: px, y: -45 + Math.sin((i / 8) * Math.PI) * 4 },
    ], P.ink, 0.9, 0.36);
  }
  // Cabin door and window.
  c.fillStyle = alpha('#4d4636', 0.38);
  c.fillRect(-14, -38, 15, 24);
  c.fillRect(10, -38, 12, 13);
  line(c, [{ x: -14, y: -30 }, { x: 1, y: -30 }], P.ink, 0.8, 0.4);
  // Roof edge highlight.
  line(c, [
    { x: -20, y: -49 }, { x: 30, y: -49 },
  ], '#e0cda4', 1.0, 0.5);

  // Cargo bundles on the bow deck.
  for (let i = 0; i < 2; i += 1) {
    c.fillStyle = alpha('#cbb58a', 0.9);
    c.beginPath();
    c.ellipse(-52 + i * 12, -12, 7, 5, 0.1, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(P.ink, 0.5);
    c.lineWidth = 0.8;
    c.stroke();
    line(c, [
      { x: -55 + i * 12, y: -15 },
      { x: -49 + i * 12, y: -9 },
    ], P.ink, 0.7, 0.3);
  }

  // Mast, hinged at the cabin roof and lowered toward the stern.
  const mastBase = { x: 2, y: -48 };
  const tipX = mastBase.x + Math.sin(mastAngle) * 122;
  const tipY = mastBase.y + Math.cos(mastAngle) * -122;
  c.save();
  c.translate(mastBase.x, mastBase.y);
  c.rotate(mastAngle);
  line(c, [{ x: 0, y: 0 }, { x: 0, y: -122 }], '#6b5434', 4.0, 0.96);
  line(c, [{ x: -1.6, y: -6 }, { x: -1.6, y: -116 }], '#4e3c23', 1.2, 0.5);
  line(c, [{ x: -3, y: -120 }, { x: 3, y: -120 }], P.ink, 1.4, 0.7);
  // Furled sail, rolled tight against the mast.
  fill(c, [
    { x: -2.6, y: -114 }, { x: 2.6, y: -114 },
    { x: 2.2, y: -74 }, { x: -2.2, y: -74 },
  ], '#cfc0a0', 0.92);
  line(c, [
    { x: -2.6, y: -114 }, { x: 2.6, y: -114 },
    { x: 2.2, y: -74 }, { x: -2.2, y: -74 },
  ], P.ink, 1.0, 0.6, true);
  for (let i = 0; i < 4; i += 1) {
    line(c, [
      { x: -2.7, y: -106 + i * 9 },
      { x: 2.7, y: -104 + i * 9 },
    ], P.ink, 0.7, 0.4);
  }
  // Yard across the furled sail.
  line(c, [{ x: -12, y: -112 }, { x: 12, y: -112 }], '#6b5434', 1.6, 0.7);
  // Stay from the masthead toward the bow.
  line(c, [{ x: 0, y: -118 }, { x: -70, y: -54 }], P.ink, 0.8, 0.38);
  c.restore();

  // Stern crutch: the lowered mast rides in a Y post.
  line(c, [{ x: 64, y: -30 }, { x: 64, y: -70 }], '#6b5434', 2.4, 0.8);
  line(c, [{ x: 64, y: -70 }, { x: 59, y: -78 }], '#6b5434', 2.0, 0.75);
  line(c, [{ x: 64, y: -70 }, { x: 69, y: -78 }], '#6b5434', 2.0, 0.75);
  if (mastPhase > 0.85) {
    // Lashing the mast down.
    line(c, [
      { x: 56, y: -70 },
      { x: 64, y: -76 },
      { x: 72, y: -70 },
    ], P.ink, 1.0, 0.45);
  }

  // Block at the masthead.
  c.fillStyle = alpha('#4e3c23', 0.85);
  c.beginPath();
  c.arc(tipX, tipY, 2.6, 0, TAU);
  c.fill();

  // Halyard being hauled by the mast man.
  curve(c, [
    { x: tipX, y: tipY },
    { x: tipX + 8, y: tipY + 34 },
    { x: 34, y: -64 },
    { x: 38, y: -50 },
  ], P.ink, 0.9, 0.45);

  // Boatmen.
  // Stern steering oar.
  line(c, [
    { x: 68, y: -24 },
    { x: 88, y: -2 },
    { x: 104, y: 18 },
  ], '#6b5434', 3.0, 0.85);
  // Stern man.
  boatman(c, 72, -26, 1.05, 0, 0);
  // Mast man on the cabin roof.
  boatman(c, 28, -48, 0.95, mastPhase * 0.9, 0.2);
  // Bow man, ducks on the beat.
  boatman(c, -58, -13, 1.05, duck, 0);
  // Bow pole, laid along the deck.
  line(c, [
    { x: -50, y: -12 },
    { x: -86, y: -28 },
  ], '#6d5738', 2.0, 0.7);
  if (duck > 0.05) {
    // Reflected hat/arms marks for the duck.
    c.strokeStyle = alpha(P.ink, 0.25 * duck);
    c.lineWidth = 1;
    for (let i = 0; i < 2; i += 1) {
      c.beginPath();
      c.moveTo(-70 + i * 6, -34 - duck * 6);
      c.lineTo(-66 + i * 6, -42 - duck * 6);
      c.stroke();
    }
  }

  // Wake.
  c.strokeStyle = alpha('#dde1cd', 0.28);
  c.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(-84, 6 + i * 3);
    c.quadraticCurveTo(-120 - i * 12, 10 + i * 4 + wake, -150 - i * 16, 8 + i * 4);
    c.stroke();
  }
  // Bow wave.
  c.beginPath();
  c.moveTo(80, 4);
  c.quadraticCurveTo(92, 9, 102, 12);
  c.strokeStyle = alpha('#eef0de', 0.32);
  c.stroke();

  c.restore();
}

function boatman(c, x, y, s, duck, reach) {
  const h = 30 * s;
  const k = 1 - duck * 0.45;
  const hh = h * k;
  const lean = duck * 0.48 + reach * 0.12;
  c.save();
  c.translate(x, y);
  c.rotate(lean);
  // Body, compressed as he ducks.
  fill(c, [
    { x: -5 * s, y: 0 }, { x: -4 * s, y: -hh * 0.55 },
    { x: 0, y: -hh * 0.78 }, { x: 4 * s, y: -hh * 0.55 },
    { x: 5 * s, y: 0 },
  ], '#cbb68c', 0.95);
  // Head.
  const headY = -hh * 0.78 - 3.4 * s;
  c.fillStyle = alpha(P.skin, 0.95);
  c.beginPath();
  c.arc(0, headY, 3.8 * s, 0, TAU);
  c.fill();
  // Straw hat.
  c.fillStyle = alpha('#a98c5b', 0.95);
  c.beginPath();
  c.ellipse(0, headY - 2.2 * s, 9.4 * s, 3.2 * s, 0, 0, TAU);
  c.fill();
  // Arms: one holds the hat when ducking, otherwise they trail.
  if (duck > 0.25) {
    line(c, [
      { x: 2 * s, y: -hh * 0.55 },
      { x: 7 * s, y: headY - 1 * s },
    ], P.ink, 1.4, 0.75);
    line(c, [
      { x: -2 * s, y: -hh * 0.55 },
      { x: -7 * s, y: headY - 1 * s },
    ], P.ink, 1.4, 0.7);
  } else {
    line(c, [
      { x: 2 * s, y: -hh * 0.55 }, { x: 9 * s, y: -hh * 0.42 },
    ], P.ink, 1.4, 0.75);
    line(c, [
      { x: -2 * s, y: -hh * 0.55 }, { x: -7 * s, y: -hh * 0.40 },
    ], P.ink, 1.4, 0.65);
  }
  c.restore();
}

// ----------------------------------------------------------------- title

function drawQingmingTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const w = 164 * s;
  const h = 414 * s;
  const x = W - w - 306 * s;
  const y = 40 * s + lift * s;

  c.save();
  c.globalAlpha = opacity;

  // Projecting bracket and short cords, so the board still hangs as a shop sign.
  c.strokeStyle = alpha(P.ink, 0.62);
  c.lineWidth = 3.2 * s;
  c.beginPath();
  c.moveTo(x - 12 * s, y - 14 * s);
  c.lineTo(x + w + 12 * s, y - 14 * s);
  c.stroke();
  c.fillStyle = alpha(P.ink, 0.55);
  for (const bx of [x - 12 * s, x + w + 12 * s]) {
    c.beginPath();
    c.arc(bx, y - 14 * s, 3.2 * s, 0, TAU);
    c.fill();
  }
  c.strokeStyle = alpha(P.ink, 0.4);
  c.lineWidth = 1.1 * s;
  c.beginPath();
  c.moveTo(x - 12 * s, y - 12 * s);
  c.lineTo(x + 4 * s, y + 2 * s);
  c.moveTo(x + w + 12 * s, y - 12 * s);
  c.lineTo(x + w - 4 * s, y + 2 * s);
  c.stroke();
  c.strokeStyle = alpha(P.ink, 0.5);
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.moveTo(x + w * 0.28, y - 13 * s);
  c.lineTo(x + w * 0.28, y + 2 * s);
  c.moveTo(x + w * 0.72, y - 13 * s);
  c.lineTo(x + w * 0.72, y + 2 * s);
  c.stroke();

  // Board with shadow.
  c.save();
  c.shadowColor = 'rgba(45, 34, 20, 0.35)';
  c.shadowBlur = 18 * s;
  c.shadowOffsetY = 5 * s;
  c.fillStyle = '#e6d8ba';
  c.fillRect(x, y, w, h);
  c.restore();

  // Aged paper panel.
  c.fillStyle = alpha('#efe4ca', 0.96);
  c.fillRect(x + 6 * s, y + 6 * s, w - 12 * s, h - 12 * s);

  // Double ink border and a vermilion rule.
  c.strokeStyle = alpha(P.ink, 0.85);
  c.lineWidth = 2.4 * s;
  c.strokeRect(x + 1 * s, y + 1 * s, w - 2 * s, h - 2 * s);
  c.strokeStyle = alpha(P.ink, 0.5);
  c.lineWidth = 0.9 * s;
  c.strokeRect(x + 9 * s, y + 9 * s, w - 18 * s, h - 18 * s);
  c.strokeStyle = alpha(P.verm, 0.75);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(x + 14 * s, y + 16 * s);
  c.lineTo(x + 14 * s, y + h - 66 * s);
  c.stroke();

  // Wood grain.
  const rand = rngFor(951);
  for (let i = 0; i < 18; i += 1) {
    c.strokeStyle = alpha('#8f764f', 0.05 + rand() * 0.04);
    c.lineWidth = (0.6 + rand() * 0.7) * s;
    c.beginPath();
    const gy = y + 12 * s + rand() * (h - 24) * s;
    c.moveTo(x + 10 * s, gy);
    c.bezierCurveTo(
      x + w * 0.35, gy + (rand() - 0.5) * 4 * s,
      x + w * 0.65, gy + (rand() - 0.5) * 4 * s,
      x + w - 10 * s, gy,
    );
    c.stroke();
  }

  // Index line.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 12 * s, 600, EN_FONT, '2.6px');
  c.fillStyle = alpha(P.verm, 0.95);
  c.fillText('06  /  20', x + 25 * s, y + 36 * s);

  // Vertical Chinese title.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 43 * s, 600, CN_FONT, '1px');
  c.fillStyle = alpha(P.ink, 0.97);
  const chars = ['清', '明', '上', '河', '图'];
  chars.forEach((ch, i) => {
    c.fillText(ch, x + w * 0.55, y + (82 + i * 58) * s);
  });

  // A thin vertical rule beside the title, like a shop-sign frame.
  c.strokeStyle = alpha(P.ink, 0.28);
  c.lineWidth = 0.9 * s;
  c.beginPath();
  c.moveTo(x + w * 0.80, y + 110 * s);
  c.lineTo(x + w * 0.80, y + 330 * s);
  c.stroke();
  // Vertical date, in the manner of a colophon.
  c.textAlign = 'center';
  setFont(c, 10.5 * s, 400, CN_FONT, '0.5px');
  c.fillStyle = alpha(P.ink, 0.76);
  ['约', '一', '一', '〇', '〇'].forEach((ch, i) => {
    c.fillText(ch, x + w * 0.86, y + (124 + i * 19) * s);
  });

  // A small carved diamond ornament below the rule.
  c.save();
  c.translate(x + w * 0.80, y + 344 * s);
  c.rotate(Math.PI / 4);
  c.strokeStyle = alpha(P.verm, 0.55);
  c.lineWidth = 0.9 * s;
  c.strokeRect(-3 * s, -3 * s, 6 * s, 6 * s);
  c.restore();

  // Seal.
  c.fillStyle = alpha(P.verm, 0.92);
  c.fillRect(x + w - 52 * s, y + 20 * s, 32 * s, 32 * s);
  c.fillStyle = alpha(P.white, 0.95);
  setFont(c, 20 * s, 600, CN_FONT, '0px');
  c.textBaseline = 'middle';
  c.fillText('鹈', x + w - 36 * s, y + 37 * s);

  // English and date.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 10.5 * s, 500, EN_FONT, '1.2px');
  c.fillStyle = alpha(P.ink, 0.82);
  c.fillText('ALONG THE RIVER', x + 25 * s, y + h - 28 * s);
  c.fillText('DURING QINGMING', x + 25 * s, y + h - 15 * s);

  c.restore();
}
