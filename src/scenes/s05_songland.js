// 5 — Song landscape. Monumental ink mountain, mist, waterfall, a tiny cyclist.
// The camera starts wide, then pushes in to find the pelican. The mountain is
// cached; mist, water, birds and the rider are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { rngFor, noise1, TAU, smoothstep, easeInOut, lerp } from '../kit/math.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { paperCanvas } from '../kit/texture.js';
import { makeView } from '../main/camera.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, neutralStyle } from '../rig/draw.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const pal = basePalette({
  bg: '#e9e2d2', bg2: '#d8d2c1', motif: '#67736c', accent: '#7d6a4a',
  ink: '#2b3531', ground: '#c9c2b1', road: '#b9b2a1', dash: '#f2ecdd',
  body: '#f3efe4', beak: '#a87a45', rigInk: '#2b3531',
  scrim: '#e9e2d2',
});

const PAPER = '#e9e2d2';
const INK = '#28322e';
const MID = '#66736b';
const LIGHT = '#a9b1a6';
const MOSS = '#5f6d58';
const SEAL = '#a33f2a';

const PEAK = [
  { x: -500, y: 820 }, { x: -500, y: 40 }, { x: -360, y: 60 },
  { x: -300, y: 180 }, { x: -210, y: 110 }, { x: -120, y: 260 },
  { x: -30, y: 210 }, { x: 70, y: 350 }, { x: 150, y: 320 },
  { x: 230, y: 460 }, { x: 300, y: 430 }, { x: 370, y: 570 },
  { x: 440, y: 530 }, { x: 500, y: 660 }, { x: 570, y: 610 },
  { x: 620, y: 740 }, { x: 680, y: 820 },
];

export default {
  id: 's05',
  number: 5,
  cn: '宋代山水',
  en: 'Song Landscape',
  year: '约1000 · 溪山行旅',
  palette: pal,

  camera(g, local) {
    const push = easeInOut(smoothstep(1.1, 3.5, local));
    const settle = smoothstep(4.7, 6, local) * 0.1;
    return makeView(g, {
      cx: 500 + 18 * push,
      cy: 500 + 218 * push,
      zoom: 1 + 0.55 * push + settle,
    });
  },

  draw(g, ctx) {
    const c = g.drawingContext;
    const layer = cachedLayer(ctx, 's05-mountain', drawMountain, {
      x0: CACHE.x0, y0: CACHE.y0, w: CACHE.w, h: CACHE.h,
    });
    c.drawImage(layer.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawMist(g, ctx);
    drawBirds(g, ctx);
    drawTrailMarks(g, ctx);
    drawSongRider(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawSongTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- mountain

function drawMountain(g, c) {
  const rand = rngFor(501);

  // Paper / silk.
  c.fillStyle = PAPER;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  const paper = paperCanvas(1400, 770, {
    tone: PAPER, seed: 55, fiber: 3000, specks: 6200, laid: true,
  });
  c.globalAlpha = 0.9;
  c.drawImage(paper, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.globalAlpha = 1;

  // Distant ranges, wet and pale.
  drawDistantRange(c, [
    { x: -500, y: 520 }, { x: -380, y: 390 }, { x: -260, y: 470 },
    { x: -100, y: 330 }, { x: 60, y: 460 }, { x: 250, y: 360 },
    { x: 420, y: 500 }, { x: 620, y: 400 }, { x: 840, y: 510 },
    { x: 1020, y: 380 }, { x: 1240, y: 500 }, { x: 1500, y: 430 },
    { x: 1500, y: 800 }, { x: -500, y: 800 },
  ], 0.16, 91);
  drawDistantRange(c, [
    { x: -500, y: 610 }, { x: -300, y: 500 }, { x: -120, y: 570 },
    { x: 80, y: 470 }, { x: 260, y: 590 }, { x: 430, y: 520 },
    { x: 620, y: 610 }, { x: 800, y: 520 }, { x: 1000, y: 600 },
    { x: 1230, y: 510 }, { x: 1500, y: 590 }, { x: 1500, y: 850 },
    { x: -500, y: 850 },
  ], 0.12, 92);

  // A mid-value ridge behind the cliff: depth without clutter.
  fillOrganicPoly(c, [
    { x: 360, y: 820 }, { x: 440, y: 640 }, { x: 520, y: 500 },
    { x: 600, y: 380 }, { x: 690, y: 320 }, { x: 780, y: 430 },
    { x: 860, y: 560 }, { x: 960, y: 820 },
  ], 'rgba(112, 126, 116, 0.18)', 41);

  // Right-hand distant peak, to balance the cliff.
  fillPoly(c, [
    { x: 900, y: 820 }, { x: 960, y: 690 }, { x: 1030, y: 600 },
    { x: 1100, y: 500 }, { x: 1160, y: 610 }, { x: 1240, y: 710 },
    { x: 1320, y: 820 },
  ], 'rgba(126, 138, 129, 0.12)');

  // The cliff: an ink bleed, a solid body, then a dark base.
  c.save();
  c.translate(0, 8);
  fillOrganicPoly(c, PEAK, 'rgba(102, 114, 106, 0.18)', 21);
  c.restore();
  fillOrganicPoly(c, PEAK, 'rgba(67, 84, 75, 0.9)', 22);

  // Dark base, clipped to the cliff.
  c.save();
  c.beginPath();
  c.moveTo(PEAK[0].x, PEAK[0].y);
  for (let i = 1; i < PEAK.length; i += 1) c.lineTo(PEAK[i].x, PEAK[i].y);
  c.closePath();
  c.clip();
  const baseGrad = c.createLinearGradient(0, 420, 0, 830);
  baseGrad.addColorStop(0, 'rgba(33, 45, 39, 0)');
  baseGrad.addColorStop(1, 'rgba(33, 45, 39, 0.45)');
  c.fillStyle = baseGrad;
  c.fillRect(-520, 400, 1240, 440);
  c.restore();

  const leftFlank = [
    { x: -500, y: 40 }, { x: -360, y: 60 }, { x: -300, y: 180 },
    { x: -210, y: 110 }, { x: -120, y: 260 }, { x: -30, y: 210 },
    { x: 70, y: 350 }, { x: 120, y: 820 }, { x: -500, y: 820 },
  ];
  fillOrganicPoly(c, leftFlank, 'rgba(30, 44, 37, 0.46)', 23);

  const litEdge = [
    { x: 70, y: 350 }, { x: 150, y: 320 }, { x: 230, y: 460 },
    { x: 300, y: 430 }, { x: 370, y: 570 }, { x: 440, y: 530 },
    { x: 500, y: 660 }, { x: 570, y: 610 }, { x: 620, y: 740 },
    { x: 680, y: 820 }, { x: 610, y: 820 }, { x: 550, y: 640 },
    { x: 480, y: 580 }, { x: 410, y: 520 }, { x: 340, y: 470 },
    { x: 270, y: 410 }, { x: 190, y: 380 }, { x: 120, y: 320 },
  ];
  fillOrganicPoly(c, litEdge, 'rgba(231, 228, 210, 0.28)', 24);

  // Wash variation: many soft ink pools, clipped to the mass.
  c.save();
  c.beginPath();
  c.moveTo(PEAK[0].x, PEAK[0].y);
  for (let i = 1; i < PEAK.length; i += 1) c.lineTo(PEAK[i].x, PEAK[i].y);
  c.closePath();
  c.clip();
  c.filter = 'blur(9px)';
  for (let i = 0; i < 110; i += 1) {
    const x = -470 + rand() * 1120;
    const y = 80 + rand() * 720;
    const rx = 18 + rand() * 90;
    const ry = 10 + rand() * 46;
    const dark = rand() > 0.45;
    c.fillStyle = alpha(dark ? '#1e3129' : '#edf0e4', 0.08 + rand() * 0.12);
    c.beginPath();
    c.ellipse(x, y, rx, ry, rand() * 0.5 - 0.25, 0, TAU);
    c.fill();
  }
  // A darker wet base.
  const wet = c.createLinearGradient(0, 560, 0, 840);
  wet.addColorStop(0, 'rgba(40, 53, 47, 0)');
  wet.addColorStop(1, 'rgba(22, 36, 29, 0.46)');
  c.fillStyle = wet;
  c.fillRect(250, 540, 780, 300);
  c.filter = 'none';
  c.restore();

  // Rough outer edge: a brush contour over the vector silhouette.
  c.strokeStyle = alpha(INK, 0.24);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(PEAK[0].x, PEAK[0].y);
  for (let i = 1; i < PEAK.length; i += 1) {
    const a = PEAK[i - 1];
    const b = PEAK[i];
    for (let k = 1; k <= 4; k += 1) {
      const x = lerp(a.x, b.x, k / 4) + (rand() - 0.5) * 4;
      const y = lerp(a.y, b.y, k / 4) + (rand() - 0.5) * 4;
      c.lineTo(x, y);
    }
  }
  c.stroke();

  // Ridges: dark structural folds.
  const ridges = [
    [{ x: -420, y: 60 }, { x: -400, y: 280 }, { x: -360, y: 520 }, { x: -300, y: 820 }],
    [{ x: -330, y: 90 }, { x: -300, y: 300 }, { x: -240, y: 550 }, { x: -180, y: 820 }],
    [{ x: -220, y: 140 }, { x: -180, y: 360 }, { x: -120, y: 600 }, { x: -60, y: 820 }],
    [{ x: -110, y: 230 }, { x: -60, y: 430 }, { x: 0, y: 650 }, { x: 60, y: 820 }],
    [{ x: 0, y: 300 }, { x: 70, y: 500 }, { x: 150, y: 700 }, { x: 230, y: 820 }],
    [{ x: 100, y: 360 }, { x: 190, y: 560 }, { x: 280, y: 760 }],
    [{ x: 220, y: 440 }, { x: 310, y: 620 }, { x: 400, y: 820 }],
    [{ x: 340, y: 540 }, { x: 430, y: 700 }, { x: 500, y: 820 }],
  ];
  c.save();
  c.beginPath();
  c.moveTo(PEAK[0].x, PEAK[0].y);
  for (let i = 1; i < PEAK.length; i += 1) c.lineTo(PEAK[i].x, PEAK[i].y);
  c.closePath();
  c.clip();
  for (let i = 0; i < ridges.length; i += 1) {
    c.strokeStyle = alpha(INK, 0.18 + i * 0.02);
    c.lineWidth = 2.2;
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(ridges[i][0].x, ridges[i][0].y);
    for (let k = 1; k < ridges[i].length; k += 1) {
      const p = ridges[i][k];
      c.lineTo(p.x + (rand() - 0.5) * 6, p.y);
    }
    c.stroke();
  }

  // Texture strokes (cun): short, dense, following the ridges.
  for (let i = 0; i < 3000; i += 1) {
    const ridge = ridges[Math.floor(rand() * ridges.length)];
    const k = rand() * (ridge.length - 1);
    const i0 = Math.floor(k);
    const f = k - i0;
    const a = ridge[Math.min(ridge.length - 1, i0)];
    const b = ridge[Math.min(ridge.length - 1, i0 + 1)];
    const px = lerp(a.x, b.x, f) + (rand() - 0.5) * 130;
    const py = lerp(a.y, b.y, f) + (rand() - 0.5) * 34;
    if (py > 810) continue;
    const slope = Math.atan2(b.y - a.y, b.x - a.x);
    const len = 2 + rand() * 9;
    c.strokeStyle = alpha(INK, 0.03 + rand() * 0.1);
    c.lineWidth = 0.7 + rand() * 1.4;
    c.beginPath();
    c.moveTo(px, py);
    c.quadraticCurveTo(
      px + Math.cos(slope + 0.7 + (rand() - 0.5) * 0.6) * len * 0.5,
      py + Math.sin(slope + 0.7) * len * 0.5 + (rand() - 0.5) * 4,
      px + Math.cos(slope + (rand() - 0.5) * 0.5) * len,
      py + Math.sin(slope) * len,
    );
    c.stroke();
  }

  // Rock bands and moss dots.
  for (let band = 0; band < 9; band += 1) {
    const y = 220 + band * 64 + (rand() - 0.5) * 14;
    c.strokeStyle = alpha(INK, 0.1 + rand() * 0.08);
    c.lineWidth = 1.2;
    c.beginPath();
    for (let x = -480; x < 650; x += 18) {
      const yy = y + noise1(x * 0.01 + band, 900 + band) * 8;
      if (x === -480) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
  }

  // Heavy strata ledges.
  for (const base of [300, 410, 520, 635, 735]) {
    c.beginPath();
    for (let x = -470; x < 640; x += 22) {
      const yy = base + noise1(x * 0.009 + base, 940) * 10;
      if (x === -470) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.strokeStyle = alpha(INK, 0.28);
    c.lineWidth = 3.4;
    c.stroke();
    c.strokeStyle = alpha('#e9e5d5', 0.22);
    c.lineWidth = 1.1;
    c.stroke();
  }
  c.fillStyle = alpha(MOSS, 0.35);
  for (let i = 0; i < 750; i += 1) {
    const x = -470 + rand() * 1100;
    const y = 180 + rand() * 620;
    c.beginPath();
    c.arc(x, y, 0.6 + rand() * 1.6, 0, TAU);
    c.fill();
  }
  c.restore();

  // Light along the top edge.
  c.fillStyle = 'rgba(240, 237, 222, 0.16)';
  c.beginPath();
  c.moveTo(-500, 40);
  c.lineTo(-360, 60);
  c.lineTo(-300, 180);
  c.lineTo(-210, 110);
  c.lineTo(-120, 260);
  c.lineTo(-30, 210);
  c.lineTo(70, 350);
  c.lineTo(30, 380);
  c.lineTo(-140, 280);
  c.lineTo(-360, 190);
  c.lineTo(-500, 120);
  c.closePath();
  c.fill();

  // Pines on the cliff and in the right foreground.
  drawPine(c, 0, 520, 150, 1.0);
  drawPine(c, 145, 400, 125, 0.9);
  drawPine(c, 265, 600, 110, 0.85);
  drawPine(c, 395, 700, 95, 0.8);

  // The mountain trail.
  drawTrail(c, rand);

  // Colophon-like vertical marks, faint, on the left paper.
  c.save();
  c.globalAlpha = 0.32;
  c.strokeStyle = alpha(INK, 0.4);
  c.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(70 + i * 18, 250);
    c.lineTo(70 + i * 18, 390);
    c.stroke();
  }
  c.restore();
}

function fillPoly(c, pts, color) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

// Rounded, slightly irregular silhouette: brush edge rather than vector.
function fillOrganicPoly(c, pts, color, seed = 1) {
  const rand = rngFor(seed);
  const n = pts.length;
  const mid = (a, b) => ({
    x: (a.x + b.x) / 2 + (rand() - 0.5) * 3,
    y: (a.y + b.y) / 2 + (rand() - 0.5) * 3,
  });
  const start = mid(pts[n - 1], pts[0]);
  c.beginPath();
  c.moveTo(start.x, start.y);
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    c.quadraticCurveTo(p.x + (rand() - 0.5) * 2.5, p.y + (rand() - 0.5) * 2.5, m.x, m.y);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function drawDistantRange(c, pts, a, seed) {
  const rand = rngFor(seed);
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) {
    const p = pts[i];
    c.lineTo(p.x + (rand() - 0.5) * 18, p.y + (rand() - 0.5) * 12);
  }
  c.closePath();
  c.fillStyle = alpha(rand() > 0.5 ? '#aeb6ac' : '#c3c3b4', a);
  c.fill();
}



function drawPine(c, x, y, h, scale) {
  const rand = rngFor(Math.round(x * 3 + y));
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // Leaning trunk, thick at the base.
  c.strokeStyle = alpha(INK, 0.88);
  c.lineWidth = 4.8;
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(-8, -h * 0.3, -14, -h * 0.62, -5, -h * 0.98);
  c.stroke();
  c.lineWidth = 1.6;
  c.strokeStyle = alpha(INK, 0.42);
  c.beginPath();
  c.moveTo(-3, -h * 0.16);
  c.quadraticCurveTo(-9, -h * 0.42, -8, -h * 0.72);
  c.stroke();

  // Tiers of horizontal foliage, smaller with height.
  const tiers = [0.32, 0.5, 0.66, 0.8, 0.91];
  const widths = [0.34, 0.3, 0.24, 0.17, 0.1];
  for (let ti = 0; ti < tiers.length; ti += 1) {
    const ty = -h * tiers[ti];
    const half = h * widths[ti];
    const sides = ti === tiers.length - 1 ? [0] : [-1, 1];
    for (const side of sides) {
      const cx = -4 + side * half * 0.55;
      const cy = ty - h * 0.012;
      const bw = side === 0 ? half * 0.9 : half * 0.95;
      // Branch.
      c.strokeStyle = alpha(INK, 0.62);
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(-3, ty + h * 0.04);
      c.quadraticCurveTo(cx * 0.6, ty - h * 0.03, cx, cy);
      c.stroke();

      // Foliage mass: a flat, jagged cloud.
      c.fillStyle = alpha(INK, 0.26);
      c.beginPath();
      c.moveTo(cx - bw, cy + h * 0.01);
      c.quadraticCurveTo(cx - bw * 0.5, cy - h * 0.05, cx, cy - h * 0.04);
      c.quadraticCurveTo(cx + bw * 0.55, cy - h * 0.055, cx + bw, cy + h * 0.005);
      for (let k = 1; k <= 6; k += 1) {
        c.lineTo(cx + bw - (k / 6) * bw * 2, cy + h * 0.018 + (k % 2) * h * 0.01);
      }
      c.closePath();
      c.fill();

      // Needle fringe.
      c.strokeStyle = alpha(INK, 0.6);
      c.lineWidth = 0.8;
      for (let i = 0; i < 16; i += 1) {
        const ox = cx + (rand() - 0.5) * bw * 2;
        const oy = cy + h * 0.015;
        const len = h * (0.02 + rand() * 0.025);
        c.beginPath();
        c.moveTo(ox, oy);
        c.lineTo(ox + (rand() - 0.5) * 5, oy + len);
        c.stroke();
      }
      // A few upward twigs.
      c.strokeStyle = alpha(INK, 0.36);
      for (let i = 0; i < 4; i += 1) {
        const ox = cx + (rand() - 0.5) * bw * 1.5;
        c.beginPath();
        c.moveTo(ox, cy);
        c.lineTo(ox + (rand() - 0.5) * 8, cy - h * (0.02 + rand() * 0.02));
        c.stroke();
      }
      // Moss on the branch.
      c.fillStyle = alpha(MOSS, 0.4);
      for (let i = 0; i < 3; i += 1) {
        c.beginPath();
        c.arc(cx + (rand() - 0.5) * bw * 1.2, cy + h * 0.01, 0.5 + rand() * 1, 0, TAU);
        c.fill();
      }
    }
  }
  c.restore();
}







function drawTrail(c, rand) {
  // A narrow stone ledge, floating in mist.
  c.beginPath();
  c.moveTo(-500, 818);
  for (let x = -500; x <= 1500; x += 30) {
    c.lineTo(x, 818 + noise1(x * 0.004, 7) * 4);
  }
  for (let x = 1500; x >= -500; x -= 30) {
    c.lineTo(x, 838 + noise1(x * 0.004, 8) * 5);
  }
  c.closePath();
  c.fillStyle = 'rgba(166, 168, 151, 0.72)';
  c.fill();
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.6;
  c.stroke();

  // Stones along the ledge.
  let x = -520;
  while (x < 1520) {
    const w = 22 + rand() * 40;
    const y = 821 + rand() * 7;
    const h = 8 + rand() * 6;
    c.beginPath();
    c.moveTo(x + 2, y);
    c.lineTo(x + w - 2, y + (rand() - 0.5) * 3);
    c.lineTo(x + w - 3, y + h);
    c.lineTo(x + 3, y + h + (rand() - 0.5) * 2);
    c.closePath();
    c.fillStyle = alpha(rand() > 0.5 ? '#c7c4ae' : '#b3b19c', 0.35 + rand() * 0.2);
    c.fill();
    c.strokeStyle = alpha(INK, 0.24);
    c.lineWidth = 0.8;
    c.stroke();
    x += w + 4 + rand() * 8;
  }

  // Dark underside and mist below.
  const face = c.createLinearGradient(0, 838, 0, 930);
  face.addColorStop(0, 'rgba(38, 52, 44, 0.5)');
  face.addColorStop(0.35, 'rgba(50, 65, 56, 0.22)');
  face.addColorStop(1, 'rgba(233, 226, 210, 0)');
  c.fillStyle = face;
  c.fillRect(-500, 838, 2000, 100);
  for (let i = 0; i < 40; i += 1) {
    const px = -480 + rand() * 1960;
    const py = 842 + rand() * 54;
    c.strokeStyle = alpha(INK, 0.08 + rand() * 0.12);
    c.lineWidth = 0.8 + rand() * 1.2;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + (rand() - 0.5) * 12, py + 8 + rand() * 26);
    c.stroke();
  }

  // Grass and pebbles on the ledge.
  for (let i = 0; i < 44; i += 1) {
    const px = -420 + rand() * 1940;
    const py = 816 + rand() * 4;
    c.strokeStyle = alpha(MOSS, 0.3 + rand() * 0.2);
    c.lineWidth = 0.8;
    for (let k = 0; k < 4; k += 1) {
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + (k - 1.5) * 4, py - 6 - rand() * 8);
      c.stroke();
    }
  }
  for (let i = 0; i < 70; i += 1) {
    c.fillStyle = alpha(INK, 0.06 + rand() * 0.12);
    c.beginPath();
    c.arc(-400 + rand() * 1800, 820 + rand() * 16, 0.5 + rand() * 1.8, 0, TAU);
    c.fill();
  }
}



// ---------------------------------------------------------------- live ink

function drawMist(g, ctx) {
  const c = g.drawingContext;
  const rand = rngFor(610);
  // Mist is mostly empty paper. Only the cliff foot dissolves.
  c.save();
  c.filter = 'blur(24px)';
  const drift = Math.sin(ctx.local * 0.3) * 24;
  c.beginPath();
  for (let x = -1100; x <= 2700; x += 50) {
    const y = 690 + drift + noise1(x * 0.003 + 2.1, 611) * 12;
    if (x === -1100) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  for (let x = 2700; x >= -1100; x -= 50) {
    const y = 780 + drift + noise1(x * 0.003 + 3.4, 612) * 12;
    c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = 'rgba(238, 232, 218, 0.2)';
  c.fill();
  c.restore();

  // Threads at the base of the cliff.
  c.save();
  c.filter = 'blur(4px)';
  c.strokeStyle = 'rgba(246, 242, 230, 0.22)';
  c.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const y = 690 + rand() * 100;
    const x = -400 + ((rand() * 1600 + ctx.local * 14) % 1600);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 70, y - 6, x + 150 + rand() * 60, y + 2);
    c.stroke();
  }
  c.restore();
}



function drawBirds(g, ctx) {
  const c = g.drawingContext;
  c.save();
  c.strokeStyle = alpha(INK, 0.4);
  c.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    const x = 260 + ((i * 190 + ctx.local * 10) % 900);
    const y = 190 + i * 48 + Math.sin(ctx.local * 0.8 + i) * 6;
    c.beginPath();
    c.moveTo(x - 6, y);
    c.quadraticCurveTo(x - 2, y - 4, x, y);
    c.quadraticCurveTo(x + 2, y - 4, x + 6, y);
    c.stroke();
  }
  c.restore();
}

function drawTrailMarks(g, ctx) {
  const c = g.drawingContext;
  const rand = rngFor(630);
  const scroll = (ctx.t * 190) % 2100;
  c.save();
  // Stone slabs move under the wheels, keeping the trail alive.
  for (let i = 0; i < 34; i += 1) {
    const x = -700 + (((i * 83 - scroll) % 2100) + 2100) % 2100;
    const y = 823 + rand() * 22;
    const w = 20 + rand() * 34;
    c.fillStyle = alpha(rand() > 0.5 ? '#d8d1bd' : '#c6c0ad', 0.18 + rand() * 0.2);
    c.beginPath();
    c.ellipse(x, y, w / 2, 2 + rand() * 2, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(INK, 0.12 + rand() * 0.12);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(x - w / 2, y + 1);
    c.lineTo(x + w / 2, y + 1);
    c.stroke();
  }
  // Pebbles and cracks.
  for (let i = 0; i < 18; i += 1) {
    const x = 200 + ((i * 73 - ctx.local * 26) % 900 + 900) % 900;
    const y = 846 + rand() * 10;
    c.strokeStyle = alpha(INK, 0.12 + rand() * 0.1);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 8 + rand() * 10, y + 1);
    c.stroke();
  }
  c.restore();
}

function drawSongRider(g, ctx) {
  const style = neutralStyle({
    ink: '#2b3531',
    body: '#f4f0e3',
    bodyShade: '#d7d3c5',
    wing: '#ebe7d9',
    beak: '#a87a45',
    pouch: '#c39a62',
    leg: '#8f6d47',
    eye: '#202622',
    tire: '#202825',
    rim: '#3d4842',
    metal: '#6c766e',
    saddle: '#4a4133',
    chain: '#5b665e',
  });
  style.weight = 0.92;
  style.farAlpha = 0.4;
  const pose = rigPose(ctx.t);
  drawRig(g, pose, style, {
    x: 468,
    y: 820,
    scale: 0.46,
    shadow: true,
  });
}

// ---------------------------------------------------------------- title

function drawSongTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = W - 190 * s;
  const y = 96 * s + lift * 0.2 * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.25 * s);

  // A thin colophon rule; the paper itself is the panel.
  c.strokeStyle = 'rgba(43, 53, 49, 0.22)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 12 * s, y + 20 * s);
  c.lineTo(x + 12 * s, y + 450 * s);
  c.stroke();

  // Vertical title.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 36 * s, 600, CN_FONT, '2px');
  c.fillStyle = INK;
  const chars = ['宋', '代', '山', '水'];
  chars.forEach((ch, i) => {
    c.fillText(ch, x + 70 * s, (144 + i * 46) * s);
  });

  // Index + English + year.
  c.textAlign = 'left';
  setFont(c, 11 * s, 600, EN_FONT, '2.4px');
  c.fillStyle = alpha(SEAL, 0.95);
  c.fillText('05  /  20', x + 18 * s, (366) * s);

  setFont(c, 12 * s, 500, EN_FONT, '1.2px');
  c.fillStyle = alpha(INK, 0.8);
  c.fillText('SONG LANDSCAPE', x + 18 * s, (394) * s);

  setFont(c, 13 * s, 400, CN_FONT, '0.2px');
  c.fillStyle = alpha(INK, 0.68);
  c.fillText('约1000 · 溪山行旅', x + 18 * s, (420) * s);

  // Seal.
  c.fillStyle = alpha(SEAL, 0.9);
  c.fillRect(x + 82 * s, y + 366 * s, 36 * s, 36 * s);
  c.fillStyle = 'rgba(244, 238, 224, 0.95)';
  c.font = `600 ${21 * s}px ${CN_FONT}`;
  c.textAlign = 'center';
  c.fillText('鹈', x + 100 * s, y + 385 * s);

  c.restore();
}
