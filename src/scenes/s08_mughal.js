// 8 — Mughal miniature. A burnished-paper page with a gold floral border: a
// walled charbagh, a marble terrace and fountain, cypress and flowering trees.
// Four courtiers watch from four incompatible viewpoints; their heads turn one
// after another, and one offers the pelican a rose. The page and border are
// cached; the rider, heads, fountain and falling petals are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { rngFor, noise1, TAU, clamp, lerp, smoothstep } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { ROAD_Y } from '../kit/road.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

// ---------------------------------------------------------------- palette

const PAPER = '#efe0c2';
const PAPER_D = '#e3cfaa';
const PAPER_L = '#f7ecd2';
const GOLD = '#b78a33';
const GOLD_L = '#dcb968';
const GOLD_D = '#7d5a1b';
const INK = '#3a2c18';
const INK_SOFT = '#5a4626';
const EMERALD = '#2f6b4e';
const EMERALD_D = '#214b36';
const EMERALD_L = '#4d8862';
const ROSE = '#a34b3f';
const ROSE_D = '#7f352c';
const LAPIS = '#2b4f7d';
const LAPIS_L = '#557ba6';
const MARBLE = '#e9dcc0';
const MARBLE_L = '#f6edd8';
const SAND = '#cfb88d';
const WATER = '#5b8492';
const SKIN = '#d8ad84';
const SKIN_D = '#b98a63';

const pal = basePalette({
  bg: '#efe0c2', bg2: '#e0cca4', motif: '#2f6b4e', accent: '#b78a33',
  ink: '#3a2c18', titleInk: '#3a2c18', ground: '#d3bd91', road: '#c6ae82',
  dash: '#f7e9c8', body: '#f9f0d8', beak: '#c1903a', rigInk: '#27200f',
  scrim: '#2c2114',
});

// Page geometry. The frame sits inside the default camera so all four sides
// are on screen for the whole section.
const FRAME = { x0: -364, y0: 22, x1: 1396, y1: 976, band: 26 };
const FIELD = { x0: -338, y0: 48, x1: 1370, y1: 950 };
const HORIZON = 470;
const WALL_Y = 492;
const WALL_H = 30;
const GARDEN_BOTTOM = 730;

// The rider stands on the near marble walk, not on the garden level.
const RIDER_Y = ROAD_Y + 78;

const TER = { x0: 760, y0: 596, x1: 1240, y1: 724 };
const FOUNT = { x: 1000, y: 646, rx: 76, ry: 20 };

const COURT = [
  { x: 24, baseY: 722, s: 0.70, dir: 1, view: 'profile', robe: LAPIS, robe2: '#1d3857', trim: GOLD_L, t0: 1.90, target: 0.86, theta0: 0.06, beard: false, offering: false, seed: 31 },
  { x: 1148, baseY: 884, s: 1.06, dir: -1, view: 'front', robe: ROSE, robe2: ROSE_D, trim: GOLD_L, t0: 2.50, target: 1.06, theta0: 3.02, beard: true, offering: true, seed: 41 },
  { x: 700, baseY: 940, s: 1.26, dir: -1, view: 'back', robe: EMERALD, robe2: '#1b3d2c', trim: GOLD_L, t0: 3.15, target: 0.96, theta0: 3.10, beard: false, offering: false, seed: 47 },
  { x: 1296, baseY: 940, s: 1.30, dir: -1, view: 'tq', robe: '#8c6a2e', robe2: '#6b4e20', trim: '#f0dba6', staff: true, t0: 3.80, target: 1.18, theta0: -0.22, beard: true, offering: false, seed: 53 },
];

export default {
  id: 's08',
  number: 8,
  cn: '莫卧儿细密画',
  en: 'Mughal Miniature',
  year: '约1600 · 细密画',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    const page = cachedLayer(ctx, 's08-page', drawPage, { x0: CACHE.x0, y0: CACHE.y0, w: CACHE.w, h: CACHE.h });
    c.drawImage(page.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    // The marble walk is the road. It overwrites the lower garden, which is
    // then trimmed back by the border layer.
    ctx.road(g, {
      ground: '#cbb389',
      verge: '#c2ab80',
      road: '#e8d8b6',
      edge: '#b78a33',
      dash: '#c5a468',
      ink: '#5c4320',
      dust: false,
    });
    drawWalkInlay(g, ctx);
    drawTerraceApron(g);

    drawFountainLive(g, ctx);
    drawChannelRipples(g, ctx);

    drawServant(g, ctx);
    drawPlanter(g, 982, 944, 1);
    drawPlanter(g, 1218, 944, -1);
    for (const o of COURT) drawCourtier(g, ctx, o);

    drawPetals(g, ctx);
    drawRiderShadow(g);
    drawMughalRider(g, ctx);

    // Border last, so it crops the road and the figures at the page edge.
    const border = cachedLayer(ctx, 's08-border', drawBorder, { x0: CACHE.x0, y0: CACHE.y0, w: CACHE.w, h: CACHE.h });
    c.drawImage(border.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawGrain(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0, local = 0 } = {}) {
    drawMughalTitle(g, opacity, lift, local);
  },
};

// ---------------------------------------------------------------- primitives

function line(c, x1, y1, x2, y2, color, w = 1) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

function path(c, pts, color, w = 1, closed = false) {
  if (!pts.length) return;
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i][0], pts[i][1]);
  if (closed) c.closePath();
  c.stroke();
}

function poly(c, pts, fill, stroke = null, lw = 1) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.lineJoin = 'round';
    c.stroke();
  }
}

function ell(c, x, y, rx, ry, fill, stroke = null, lw = 1, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}

// A small eight-petal gold rosette.
function rosette(c, x, y, r, petal = GOLD_L, core = GOLD_D) {
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU;
    ell(c, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.52, r * 0.34, petal, GOLD_D, Math.max(0.5, r * 0.07), a);
  }
  c.fillStyle = core;
  c.beginPath();
  c.arc(x, y, r * 0.3, 0, TAU);
  c.fill();
  c.fillStyle = alpha(PAPER_L, 0.75);
  c.beginPath();
  c.arc(x - r * 0.08, y - r * 0.08, r * 0.1, 0, TAU);
  c.fill();
}

function leafSprig(c, x, y, len, ang, color = GOLD_D) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -len * 0.34, len, 0);
  c.quadraticCurveTo(len * 0.5, len * 0.2, 0, 0);
  c.fillStyle = color;
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------- page

function drawPage(g, c) {
  const rand = rngFor('s08-paper');

  // Burnished paper. Flat fields first, then mottle and sheen.
  c.fillStyle = PAPER;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.fillStyle = PAPER_D;
  c.fillRect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0);

  // Sky: warm parchment light, slightly deeper at the top.
  const sky = c.createLinearGradient(0, FIELD.y0, 0, HORIZON);
  sky.addColorStop(0, '#e8d2a6');
  sky.addColorStop(0.55, '#f1e3c2');
  sky.addColorStop(1, '#f6ecd6');
  c.fillStyle = sky;
  c.fillRect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, HORIZON - FIELD.y0);

  // Warm gold light pooling at the top of the page.
  const wash = c.createLinearGradient(0, FIELD.y0, 0, 260);
  wash.addColorStop(0, alpha(GOLD, 0.27));
  wash.addColorStop(1, alpha(GOLD, 0));
  c.fillStyle = wash;
  c.fillRect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, 260);

  drawClouds(c, rand);
  drawHills(c);
  drawDistantPalace(c);
  drawWalledGarden(c, rand);
  drawGardenPlan(c, rand);
  drawTerrace(c, rand);
  drawPavilion(c);
  drawTrees(c, rand);
  drawBirds(c);
  drawBranch(c, rand);

  // Edge tone: the page darkens where it has been handled.
  const edge = c.createLinearGradient(FIELD.x0, 0, FIELD.x0 + 90, 0);
  edge.addColorStop(0, alpha('#8d6d3c', 0.22));
  edge.addColorStop(1, alpha('#8d6d3c', 0));
  c.fillStyle = edge;
  c.fillRect(FIELD.x0, FIELD.y0, 90, FIELD.y1 - FIELD.y0);
  const edgeR = c.createLinearGradient(FIELD.x1, 0, FIELD.x1 - 90, 0);
  edgeR.addColorStop(0, alpha('#8d6d3c', 0.22));
  edgeR.addColorStop(1, alpha('#8d6d3c', 0));
  c.fillStyle = edgeR;
  c.fillRect(FIELD.x1 - 90, FIELD.y0, 90, FIELD.y1 - FIELD.y0);

  // Fibre and burnishing marks.
  for (let i = 0; i < 650; i += 1) {
    const x = FIELD.x0 + rand() * (FIELD.x1 - FIELD.x0);
    const y = FIELD.y0 + rand() * (FIELD.y1 - FIELD.y0);
    c.fillStyle = alpha(rand() > 0.5 ? '#8b6a3d' : '#fff8e6', 0.03 + rand() * 0.07);
    c.beginPath();
    c.arc(x, y, 0.4 + rand() * 1.5, 0, TAU);
    c.fill();
  }
  c.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    const y = FIELD.y0 + rand() * (FIELD.y1 - FIELD.y0);
    c.strokeStyle = alpha('#a1814c', 0.035 + rand() * 0.04);
    c.beginPath();
    c.moveTo(FIELD.x0, y);
    c.bezierCurveTo(200, y + (rand() - 0.5) * 12, 900, y + (rand() - 0.5) * 12, FIELD.x1, y + (rand() - 0.5) * 8);
    c.stroke();
  }
}

function drawClouds(c, rand) {
  // Flat gold cloud scrolls, the kind drawn in the upper margin of a page.
  c.save();
  for (let i = 0; i < 5; i += 1) {
    const cx = FIELD.x0 + 120 + i * 330 + rand() * 60;
    const cy = 120 + (i % 3) * 46 + rand() * 30;
    const sw = 90 + rand() * 60;
    c.strokeStyle = alpha(GOLD, 0.5);
    c.lineWidth = 1.9;
    c.beginPath();
    c.moveTo(cx - sw, cy);
    c.bezierCurveTo(cx - sw * 0.6, cy - 26, cx - sw * 0.2, cy - 24, cx - sw * 0.05, cy - 6);
    c.bezierCurveTo(cx + sw * 0.1, cy + 14, cx + sw * 0.45, cy + 10, cx + sw * 0.7, cy - 8);
    c.bezierCurveTo(cx + sw * 0.85, cy - 20, cx + sw, cy - 10, cx + sw, cy - 2);
    c.stroke();
    c.strokeStyle = alpha(PAPER_L, 0.55);
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(cx - sw * 0.8, cy - 4);
    c.quadraticCurveTo(cx, cy - 18, cx + sw * 0.55, cy - 6);
    c.stroke();
  }
  // A soft gold wash behind the clouds.
  c.fillStyle = alpha(GOLD_L, 0.09);
  c.fillRect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, 190);
  c.restore();
}

function drawHills(c) {
  const r = rngFor(808);
  const bands = [
    { y: 408, amp: 16, col: '#c9bc98', alpha: 0.9 },
    { y: 436, amp: 12, col: '#b9ac86', alpha: 0.9 },
    { y: 462, amp: 8, col: '#a9a47f', alpha: 0.8 },
  ];
  for (const b of bands) {
    c.beginPath();
    c.moveTo(FIELD.x0, HORIZON);
    for (let x = FIELD.x0; x <= FIELD.x1; x += 40) {
      c.lineTo(x, b.y + noise1(x * 0.008, r() * 1000) * b.amp);
    }
    c.lineTo(FIELD.x1, HORIZON);
    c.closePath();
    c.fillStyle = alpha(b.col, b.alpha);
    c.fill();
  }
  // A pale line of haze.
  c.fillStyle = alpha(PAPER_L, 0.35);
  c.fillRect(FIELD.x0, HORIZON - 18, FIELD.x1 - FIELD.x0, 18);
}

function drawWalledGarden(c, rand) {
  // Sandstone wall with crenellations and one arched gate.
  const y = WALL_Y;
  const h = WALL_H;
  c.fillStyle = '#bd8660';
  c.fillRect(FIELD.x0, y, FIELD.x1 - FIELD.x0, h);
  c.fillStyle = alpha('#a06f4b', 0.55);
  c.fillRect(FIELD.x0, y + h - 7, FIELD.x1 - FIELD.x0, 7);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(FIELD.x0, y);
  c.lineTo(FIELD.x1, y);
  c.moveTo(FIELD.x0, y + h);
  c.lineTo(FIELD.x1, y + h);
  c.stroke();

  // Brick joints.
  c.strokeStyle = alpha('#6d4a30', 0.22);
  c.lineWidth = 0.8;
  for (let yy = y + 6; yy < y + h; yy += 6) {
    c.beginPath();
    c.moveTo(FIELD.x0, yy);
    c.lineTo(FIELD.x1, yy);
    c.stroke();
  }
  // Crenellations.
  for (let x = FIELD.x0; x < FIELD.x1; x += 26) {
    c.fillStyle = '#bd8660';
    c.fillRect(x, y - 5, 15, 5);
    c.strokeStyle = alpha(INK_SOFT, 0.7);
    c.lineWidth = 0.8;
    c.strokeRect(x, y - 5, 15, 5);
  }

  // Gate: a pointed arch with a small dome, left of the rider.
  const gx = 300;
  poly(c, [
    [gx - 46, y + h], [gx - 46, y - 24], [gx - 34, y - 44],
    [gx, y - 56], [gx + 34, y - 44], [gx + 46, y - 24], [gx + 46, y + h - 12],
  ], '#c8936c', INK_SOFT, 1.2);
  // Dome.
  c.beginPath();
  c.ellipse(gx, y - 52, 24, 20, 0, Math.PI, TAU);
  c.fillStyle = MARBLE;
  c.fill();
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 1.1;
  c.stroke();
  line(c, gx, y - 74, gx, y - 84, GOLD, 2);
  ell(c, gx, y - 86, 3, 3, GOLD_L, GOLD_D, 0.8);
  // Opening.
  c.beginPath();
  c.moveTo(gx - 14, y + h);
  c.lineTo(gx - 14, y - 14);
  c.quadraticCurveTo(gx, y - 40, gx + 14, y - 14);
  c.lineTo(gx + 14, y + h);
  c.closePath();
  c.fillStyle = '#3c3a2e';
  c.fill();
  c.strokeStyle = GOLD;
  c.lineWidth = 1;
  c.stroke();
  // Gold tile band on the wall.
  c.fillStyle = alpha(GOLD, 0.45);
  c.fillRect(FIELD.x0, y + 3, FIELD.x1 - FIELD.x0, 1.6);
}

function drawGardenPlan(c, rand) {
  // High-view flat charbagh. No vanishing point; beds read as a plan.
  c.fillStyle = '#a9a875';
  c.fillRect(FIELD.x0, WALL_Y + WALL_H, FIELD.x1 - FIELD.x0, GARDEN_BOTTOM - (WALL_Y + WALL_H));

  const beds = [
    { x: -310, y: 552, w: 350, h: 60 },
    { x: 96, y: 552, w: 330, h: 60 },
    { x: -310, y: 638, w: 350, h: 74 },
    { x: 96, y: 638, w: 330, h: 74 },
    { x: 470, y: 552, w: 250, h: 62 },
    { x: 470, y: 638, w: 250, h: 74 },
    { x: 1256, y: 552, w: 96, h: 62 },
    { x: 1256, y: 638, w: 96, h: 74 },
  ];
  for (let i = 0; i < beds.length; i += 1) drawParterre(c, beds[i], i);

  // Gravel walks between the beds.
  c.fillStyle = '#d9c8a6';
  c.fillRect(60, 522, 28, 208);
  c.fillRect(432, 522, 28, 208);
  c.fillRect(1240, 522, 12, 208);
  c.fillStyle = alpha('#fff6de', 0.35);
  c.fillRect(60, 522, 2, 208);

  // The cross canal: the horizontal arm of the charbagh.
  c.fillStyle = '#4e7889';
  c.fillRect(FIELD.x0, 616, 1098, 20);
  c.fillStyle = alpha(LAPIS_L, 0.35);
  c.fillRect(FIELD.x0, 618, 1098, 6);
  c.strokeStyle = GOLD;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(FIELD.x0, 616);
  c.lineTo(760, 616);
  c.moveTo(FIELD.x0, 636);
  c.lineTo(760, 636);
  c.stroke();
  // Fine ripples and lily pads.
  c.strokeStyle = alpha('#e8f3ee', 0.4);
  c.lineWidth = 0.7;
  for (let x = FIELD.x0 + 20; x < 750; x += 46) {
    c.beginPath();
    c.moveTo(x, 624);
    c.quadraticCurveTo(x + 8, 621, x + 16, 624);
    c.stroke();
    if ((x / 46) % 5 === 0) {
      ell(c, x + 4, 629, 3.4, 2.2, EMERALD, GOLD_D, 0.5);
      ell(c, x + 5, 628.4, 1.4, 0.9, PAPER_L, null, 0);
    }
  }
  // Bridges where the vertical walks cross.
  for (const bx of [60, 432]) {
    c.fillStyle = MARBLE;
    c.fillRect(bx - 4, 613, 36, 26);
    c.strokeStyle = INK_SOFT;
    c.lineWidth = 0.9;
    c.strokeRect(bx - 4, 613, 36, 26);
    c.strokeStyle = alpha(GOLD, 0.7);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(bx, 615);
    c.lineTo(bx + 28, 615);
    c.moveTo(bx, 637);
    c.lineTo(bx + 28, 637);
    c.stroke();
    // A shadow under the arch.
    c.strokeStyle = alpha(INK_SOFT, 0.5);
    c.beginPath();
    c.arc(bx + 14, 636, 10, Math.PI, TAU);
    c.stroke();
  }

  // Gravel apron in front of the beds, where the first courtier stands.
  c.fillStyle = '#cbba95';
  c.fillRect(FIELD.x0, 714, FIELD.x1 - FIELD.x0, 16);
  c.strokeStyle = alpha(GOLD, 0.35);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(FIELD.x0, 714.5);
  c.lineTo(FIELD.x1, 714.5);
  c.stroke();
  for (let i = 0; i < 220; i += 1) {
    const x = FIELD.x0 + rand() * (FIELD.x1 - FIELD.x0);
    const y = 716 + rand() * 12;
    c.fillStyle = alpha(rand() > 0.5 ? '#fff3d8' : '#8f7a50', 0.16);
    c.fillRect(x, y, 1.5, 1.2);
  }

  // Small cypress accents inside the parterres.
  for (const [x, base, h] of [[-268, 710, 52], [-36, 710, 46], [144, 710, 44], [404, 710, 50]]) {
    drawCypress(c, x, base, h, 15);
  }

  // Low hedge line along the wall base.
  for (let x = FIELD.x0; x < FIELD.x1; x += 12) {
    const rr = rngFor(`s08-hedge${x}`);
    ell(c, x, WALL_Y + WALL_H + 2, 7, 5 + rr() * 2, alpha(EMERALD_D, 0.85), null, 0);
  }
  speckleGarden(c, rand);
}

function drawParterre(c, b, i) {
  const r = rngFor(`s08-bed${i}`);
  poly(c, [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]], EMERALD_D, GOLD_D, 1.1);
  poly(c, [[b.x + 3, b.y + 3], [b.x + b.w - 3, b.y + 3], [b.x + b.w - 3, b.y + b.h - 3], [b.x + 3, b.y + b.h - 3]], EMERALD, null, 0);
  // Inner gold rule.
  c.strokeStyle = alpha(GOLD_L, 0.55);
  c.lineWidth = 0.8;
  c.strokeRect(b.x + 6.5, b.y + 6.5, b.w - 13, b.h - 13);

  // Fine leaf strokes.
  c.strokeStyle = alpha(EMERALD_L, 0.6);
  c.lineWidth = 0.7;
  for (let k = 0; k < 46; k += 1) {
    const x = b.x + 8 + r() * (b.w - 16);
    const y = b.y + 8 + r() * (b.h - 16);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 2, y - 3, x + 4.4, y - 1.6);
    c.stroke();
  }

  // Flowers: tiny rosettes in rose, gold and ivory.
  const n = Math.round((b.w * b.h) / 430);
  for (let k = 0; k < n; k += 1) {
    const x = b.x + 10 + r() * (b.w - 20);
    const y = b.y + 10 + r() * (b.h - 20);
    const kind = r();
    const col = kind < 0.34 ? ROSE : kind < 0.5 ? LAPIS_L : kind < 0.76 ? GOLD_L : PAPER_L;
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * TAU + r();
      c.fillStyle = alpha(col, 0.9);
      c.beginPath();
      c.arc(x + Math.cos(a) * 1.7, y + Math.sin(a) * 1.7, 1.25, 0, TAU);
      c.fill();
    }
    c.fillStyle = GOLD_D;
    c.beginPath();
    c.arc(x, y, 0.9, 0, TAU);
    c.fill();
  }

  // Upright tulips in alternating beds, breaking the dotted texture.
  if (i % 2 === 0) {
    const rows = Math.max(3, Math.round(b.w / 60));
    for (let k = 0; k < rows; k += 1) {
      const x = b.x + 22 + (k / Math.max(1, rows - 1)) * (b.w - 44);
      const y = b.y + b.h - 14 - (k % 2) * 5;
      c.strokeStyle = EMERALD_D;
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 0.8, y - 13);
      c.stroke();
      const col = k % 3 === 0 ? ROSE : k % 3 === 1 ? PAPER_L : GOLD_L;
      poly(c, [[x - 2.6, y - 16], [x - 1.4, y - 11], [x - 2.4, y - 9], [x - 3.4, y - 12]], col, ROSE_D, 0.4);
      poly(c, [[x + 0.8, y - 17], [x + 2.8, y - 12], [x + 1.2, y - 9], [x - 0.6, y - 12]], col, ROSE_D, 0.4);
      leafSprig(c, x - 0.4, y - 4, 6, -2.2, EMERALD_L);
    }
  }
}

function speckleGarden(c, rand) {
  c.fillStyle = alpha(PAPER_L, 0.1);
  for (let i = 0; i < 120; i += 1) {
    const x = FIELD.x0 + rand() * (FIELD.x1 - FIELD.x0);
    const y = 526 + rand() * 200;
    c.fillRect(x, y, 1.4, 1.4);
  }
}

function drawTerrace(c, rand) {
  // Marble platform: flat fill, fine inlay, no shadow.
  poly(c, [[TER.x0, TER.y0], [TER.x1, TER.y0], [TER.x1, TER.y1], [TER.x0, TER.y1]], MARBLE, INK_SOFT, 1.3);
  poly(c, [[TER.x0 + 5, TER.y0 + 5], [TER.x1 - 5, TER.y0 + 5], [TER.x1 - 5, TER.y1 - 6], [TER.x0 + 5, TER.y1 - 6]], MARBLE_L, null, 0);

  // Inlay border with little gold diamonds.
  c.strokeStyle = alpha(GOLD, 0.8);
  c.lineWidth = 1.4;
  c.strokeRect(TER.x0 + 10, TER.y0 + 10, TER.x1 - TER.x0 - 20, TER.y1 - TER.y0 - 22);
  c.strokeStyle = alpha(LAPIS, 0.5);
  c.lineWidth = 0.8;
  c.strokeRect(TER.x0 + 15, TER.y0 + 15, TER.x1 - TER.x0 - 30, TER.y1 - TER.y0 - 32);
  for (let x = TER.x0 + 26; x < TER.x1 - 20; x += 34) {
    poly(c, [[x, TER.y0 + 10], [x + 5, TER.y0 + 15], [x, TER.y0 + 20], [x - 5, TER.y0 + 15]], GOLD_L, null, 0);
    poly(c, [[x, TER.y1 - 16], [x + 5, TER.y1 - 11], [x, TER.y1 - 6], [x - 5, TER.y1 - 11]], GOLD_L, null, 0);
  }

  // Marble veins.
  c.strokeStyle = alpha('#a99a7a', 0.28);
  c.lineWidth = 0.7;
  for (let i = 0; i < 9; i += 1) {
    const x = TER.x0 + 30 + rand() * (TER.x1 - TER.x0 - 60);
    const y = TER.y0 + 34 + rand() * (TER.y1 - TER.y0 - 70);
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 30, y - 8, x + 60, y + 12, x + 110, y - 4);
    c.stroke();
  }

  // Steps down to the walk.
  for (let i = 0; i < 3; i += 1) {
    c.fillStyle = i % 2 ? MARBLE : '#dfd0b1';
    c.fillRect(TER.x0 + 60 + i * 8, TER.y1 + i * 5, TER.x1 - TER.x0 - 120 - i * 16, 4);
    c.strokeStyle = alpha(INK_SOFT, 0.55);
    c.lineWidth = 0.7;
    c.strokeRect(TER.x0 + 60 + i * 8, TER.y1 + i * 5, TER.x1 - TER.x0 - 120 - i * 16, 4);
  }

  // Balustrade along the top and sides.
  drawBalustrade(c, TER.x0, TER.y0, TER.x1, TER.y0);
  drawBalustrade(c, TER.x0, TER.y0, TER.x0, TER.y1);
  drawBalustrade(c, TER.x1, TER.y0, TER.x1, TER.y1);

  drawCarpet(c);

  // Fountain basin (the water itself is live).
  ell(c, FOUNT.x, FOUNT.y, FOUNT.rx + 8, FOUNT.ry + 6, MARBLE, INK_SOFT, 1.2);
  ell(c, FOUNT.x, FOUNT.y, FOUNT.rx, FOUNT.ry, WATER, GOLD, 1.4);
  ell(c, FOUNT.x, FOUNT.y - 2, FOUNT.rx - 3, FOUNT.ry - 2, alpha(LAPIS_L, 0.5), null, 0);
  // Basin inlay.
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU;
    ell(c, FOUNT.x + Math.cos(a) * (FOUNT.rx + 4), FOUNT.y + Math.sin(a) * (FOUNT.ry + 3), 2.2, 1.6, GOLD_L, null, 0);
  }
  // Pedestal.
  c.fillStyle = MARBLE_L;
  c.fillRect(FOUNT.x - 6, FOUNT.y - 34, 12, 24);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.9;
  c.strokeRect(FOUNT.x - 6, FOUNT.y - 34, 12, 24);
  ell(c, FOUNT.x, FOUNT.y - 32, 9, 3.4, MARBLE, INK_SOFT, 0.9);
  // Scalloped rim decor.
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU;
    c.strokeStyle = alpha(GOLD, 0.6);
    c.lineWidth = 0.7;
    c.beginPath();
    c.arc(FOUNT.x + Math.cos(a) * 42, FOUNT.y + Math.sin(a) * 12, 5, 0, TAU);
    c.stroke();
  }
}

function drawCarpet(c) {
  const x0 = 792;
  const y0 = 606;
  const w = 142;
  const h = 92;
  // Field and border.
  poly(c, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], '#8f3a30', INK, 1.1);
  poly(c, [[x0 + 6, y0 + 6], [x0 + w - 6, y0 + 6], [x0 + w - 6, y0 + h - 6], [x0 + 6, y0 + h - 6]], ROSE, null, 0);
  c.strokeStyle = GOLD;
  c.lineWidth = 1.3;
  c.strokeRect(x0 + 10, y0 + 10, w - 20, h - 20);
  c.strokeStyle = alpha(GOLD_L, 0.8);
  c.lineWidth = 0.7;
  c.strokeRect(x0 + 14, y0 + 14, w - 28, h - 28);

  // Gold lattice in the field.
  c.strokeStyle = alpha(GOLD_L, 0.35);
  c.lineWidth = 0.6;
  for (let d = -h; d < w; d += 13) {
    c.beginPath();
    c.moveTo(x0 + 15 + d, y0 + 15);
    c.lineTo(x0 + 15 + d + h - 30, y0 + h - 15);
    c.stroke();
    c.beginPath();
    c.moveTo(x0 + 15 + d + h - 30, y0 + 15);
    c.lineTo(x0 + 15 + d, y0 + h - 15);
    c.stroke();
  }
  // Central medallion: an ivory star, small enough to sit behind a figure.
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU;
    poly(c, [
      [cx + Math.cos(a) * 4, cy + Math.sin(a) * 3],
      [cx + Math.cos(a + 0.2) * 10, cy + Math.sin(a + 0.2) * 7],
      [cx + Math.cos(a + 0.4) * 4, cy + Math.sin(a + 0.4) * 3],
    ], alpha(PAPER_L, 0.9), GOLD_D, 0.5);
  }
  ell(c, cx, cy, 4.5, 3.2, alpha(GOLD_L, 0.95), GOLD_D, 0.6);
  ell(c, cx, cy, 1.4, 1.2, ROSE, null, 0);
  // Corner blossoms.
  for (const [px, py] of [[x0 + 20, y0 + 20], [x0 + w - 20, y0 + 20], [x0 + 20, y0 + h - 20], [x0 + w - 20, y0 + h - 20]]) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * TAU;
      c.fillStyle = alpha(PAPER_L, 0.9);
      c.beginPath();
      c.arc(px + Math.cos(a) * 4.4, py + Math.sin(a) * 4.4, 2.6, 0, TAU);
      c.fill();
    }
    c.fillStyle = GOLD;
    c.beginPath();
    c.arc(px, py, 2, 0, TAU);
    c.fill();
  }
  // Fringe along the near edge.
  c.strokeStyle = GOLD_L;
  c.lineWidth = 0.8;
  for (let x = x0 + 2; x < x0 + w; x += 5) {
    c.beginPath();
    c.moveTo(x, y0 + h);
    c.lineTo(x + 1, y0 + h + 4);
    c.stroke();
  }
}

function drawBalustrade(c, x1, y1, x2, y2) {
  const horiz = y1 === y2;
  const len = horiz ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const n = Math.max(2, Math.floor(len / 22));
  c.strokeStyle = alpha(INK_SOFT, 0.8);
  c.lineWidth = 1.1;
  if (horiz) {
    line(c, x1, y1 - 9, x2, y1 - 9, alpha(MARBLE_L, 0.95), 3);
    line(c, x1, y1 - 9, x2, y1 - 9, alpha(INK_SOFT, 0.7), 0.9);
  } else {
    line(c, x1, y1, x1, y2, alpha(MARBLE_L, 0.95), 3);
    line(c, x1, y1, x1, y2, alpha(INK_SOFT, 0.7), 0.9);
  }
  for (let i = 0; i <= n; i += 1) {
    const px = horiz ? x1 + ((x2 - x1) * i) / n : x1;
    const py = horiz ? y1 : y1 + ((y2 - y1) * i) / n;
    if (horiz) drawPost(c, px, py - 10);
    else c.fillStyle = alpha(MARBLE_L, 0.9), c.fillRect(px - 2, py - 4, 4, 7);
  }
  // Small gold domes at the corners.
  if (horiz) {
    ell(c, x1, y1 - 16, 4, 3.4, MARBLE, GOLD_D, 0.7);
    ell(c, x2, y1 - 16, 4, 3.4, MARBLE, GOLD_D, 0.7);
  }
}

function drawPost(c, x, y) {
  c.fillStyle = MARBLE_L;
  c.fillRect(x - 2.4, y - 9, 4.8, 10);
  c.strokeStyle = alpha(INK_SOFT, 0.7);
  c.lineWidth = 0.7;
  c.strokeRect(x - 2.4, y - 9, 4.8, 10);
  c.fillStyle = alpha(GOLD, 0.55);
  c.fillRect(x - 3.4, y - 11, 6.8, 2);
  c.beginPath();
  c.arc(x, y - 12, 2.2, 0, TAU);
  c.fillStyle = MARBLE_L;
  c.fill();
}

function drawPavilion(c) {
  // A small marble chhatri behind the terrace, on the right.
  const x = 1296;
  const y = 600;
  c.fillStyle = '#d9c9a8';
  c.fillRect(x - 30, y - 4, 60, 8);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.9;
  c.strokeRect(x - 30, y - 4, 60, 8);

  for (let i = 0; i < 4; i += 1) {
    const px = x - 20 + i * 13.4;
    line(c, px, y - 4, px, y - 44, MARBLE_L, 3.4);
    line(c, px, y - 4, px, y - 44, alpha(INK_SOFT, 0.7), 0.7);
  }
  // Entablature.
  c.fillStyle = MARBLE_L;
  c.fillRect(x - 26, y - 50, 52, 7);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.9;
  c.strokeRect(x - 26, y - 50, 52, 7);
  c.fillStyle = alpha(GOLD, 0.65);
  c.fillRect(x - 26, y - 48, 52, 1.4);

  // Onion dome.
  c.beginPath();
  c.moveTo(x - 17, y - 50);
  c.bezierCurveTo(x - 20, y - 68, x - 4, y - 70, x, y - 84);
  c.bezierCurveTo(x + 4, y - 70, x + 20, y - 68, x + 17, y - 50);
  c.closePath();
  c.fillStyle = MARBLE;
  c.fill();
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 1;
  c.stroke();
  // Dome ribs.
  for (let i = -2; i <= 2; i += 1) {
    c.strokeStyle = alpha(GOLD, 0.5);
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(x + i * 6, y - 52);
    c.quadraticCurveTo(x + i * 7.5, y - 68, x, y - 82);
    c.stroke();
  }
  line(c, x, y - 84, x, y - 96, GOLD, 1.6);
  ell(c, x, y - 98, 3, 4, GOLD_L, GOLD_D, 0.7);
  ell(c, x - 6, y - 96, 2.4, 2.4, GOLD_L, null, 0);
  ell(c, x + 6, y - 96, 2.4, 2.4, GOLD_L, null, 0);
}

function drawTrees(c, rand) {
  // Cypress: dark emerald flame shapes with fine leaf marks.
  const cypress = [
    [-260, 518, 190, 34], [-150, 518, 155, 28], [20, 518, 175, 30],
    [660, 514, 205, 36], [700, 518, 150, 26], [1270, 512, 175, 30],
  ];
  for (const [x, base, h, w] of cypress) drawCypress(c, x, base, h, w);

  // Flowering trees: ivory and rose blossom masses.
  drawFlowerTree(c, 600, 522, 96, 44, 1);
  drawFlowerTree(c, 116, 520, 86, 40, 3);
  drawFlowerTree(c, 1214, 522, 78, 36, 4);
  drawFlowerTree(c, 1330, 524, 110, 46, 2);

  // A pair of small shrubs in the beds.
  drawShrub(c, -180, 748, 46, 20);
  drawShrub(c, 620, 748, 42, 19);
}

function drawCypress(c, x, base, h, w) {
  const r = rngFor(`s08-cy${x}`);
  c.beginPath();
  c.moveTo(x - w * 0.5, base);
  c.bezierCurveTo(x - w * 0.62, base - h * 0.42, x - w * 0.2, base - h * 0.72, x + 1, base - h);
  c.bezierCurveTo(x + w * 0.2, base - h * 0.72, x + w * 0.62, base - h * 0.42, x + w * 0.5, base);
  c.closePath();
  c.fillStyle = EMERALD_D;
  c.fill();
  c.strokeStyle = alpha(INK, 0.85);
  c.lineWidth = 1.2;
  c.stroke();

  // Inner light: a narrow column off-centre.
  c.beginPath();
  c.moveTo(x - w * 0.16, base - 4);
  c.bezierCurveTo(x - w * 0.22, base - h * 0.5, x - w * 0.1, base - h * 0.78, x + 2, base - h * 0.94);
  c.bezierCurveTo(x + w * 0.12, base - h * 0.7, x + w * 0.16, base - h * 0.4, x + w * 0.1, base - 4);
  c.closePath();
  c.fillStyle = alpha(EMERALD_L, 0.55);
  c.fill();

  // Leaf marks, gold-green.
  c.strokeStyle = alpha('#8fae7c', 0.5);
  c.lineWidth = 0.7;
  for (let i = 0; i < 34; i += 1) {
    const t = 0.08 + r() * 0.86;
    const yy = base - h * t;
    const spread = w * 0.5 * (1 - t * 0.75);
    const xx = x + (r() * 2 - 1) * spread;
    c.beginPath();
    c.moveTo(xx, yy);
    c.quadraticCurveTo(xx + 2.4, yy - 2, xx + 4.6, yy - 0.8);
    c.stroke();
  }
  // A gold rim on the light side.
  c.strokeStyle = alpha(GOLD, 0.35);
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(x + w * 0.2, base - h * 0.72);
  c.quadraticCurveTo(x + w * 0.34, base - h * 0.4, x + w * 0.3, base - h * 0.1);
  c.stroke();
}

function drawFlowerTree(c, x, base, h, spread, seed) {
  const r = rngFor(`s08-tree${seed}`);
  // Trunk.
  c.strokeStyle = '#6e5430';
  c.lineWidth = 4.6;
  c.beginPath();
  c.moveTo(x, base);
  c.bezierCurveTo(x - 3, base - h * 0.4, x + 4, base - h * 0.6, x - 2, base - h * 0.8);
  c.stroke();
  c.strokeStyle = alpha('#8d6c3e', 0.8);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x, base);
  c.bezierCurveTo(x - 2, base - h * 0.4, x + 5, base - h * 0.6, x, base - h * 0.8);
  c.stroke();
  // Branches.
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI * 0.9 + (i / 4) * Math.PI * 0.8;
    c.strokeStyle = '#7a5c33';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, base - h * 0.62);
    c.quadraticCurveTo(x + Math.cos(a) * spread * 0.5, base - h * 0.78, x + Math.cos(a) * spread * 0.9, base - h * 0.88);
    c.stroke();
  }
  // Blossom mass: small flat circles.
  const cx = x - 2;
  const cy = base - h * 0.9;
  for (let i = 0; i < 58; i += 1) {
    const a = r() * TAU;
    const rad = Math.pow(r(), 0.6) * spread * 0.95;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad * 0.55;
    const col = r() < 0.5 ? PAPER_L : r() < 0.7 ? ROSE : GOLD_L;
    c.fillStyle = alpha(col, 0.9);
    c.beginPath();
    c.arc(px, py, 2.2 + r() * 2.4, 0, TAU);
    c.fill();
    if (r() < 0.35) {
      c.fillStyle = alpha(GOLD_D, 0.7);
      c.beginPath();
      c.arc(px, py, 0.7, 0, TAU);
      c.fill();
    }
  }
  // A few trunk knots.
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 0.7;
  c.beginPath();
  c.arc(x - 2, base - h * 0.28, 3, 0, TAU);
  c.stroke();
}

function drawShrub(c, x, y, w, h) {
  c.beginPath();
  c.ellipse(x, y, w * 0.5, h, 0, Math.PI, TAU);
  c.fillStyle = EMERALD;
  c.fill();
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.9;
  c.stroke();
  const r = rngFor(`s08-sh${x}`);
  for (let i = 0; i < 18; i += 1) {
    const px = x + (r() * 2 - 1) * w * 0.42;
    const py = y - r() * h * 0.9;
    c.fillStyle = r() < 0.5 ? ROSE : GOLD_L;
    c.beginPath();
    c.arc(px, py, 1.2, 0, TAU);
    c.fill();
  }
}

function drawBirds(c) {
  // Three cranes in flight, white with gold wing tips.
  const spots = [[700, 196, 1], [754, 220, 0.86], [806, 188, 0.78]];
  for (const [x, y, s] of spots) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    ell(c, 0, 0, 10, 4.2, PAPER_L, INK_SOFT, 0.8, -0.1);
    c.strokeStyle = alpha(PAPER_L, 0.95);
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(-2, -1);
    c.quadraticCurveTo(2, -11, 12, -15);
    c.stroke();
    c.strokeStyle = alpha(GOLD, 0.8);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(2, -8);
    c.lineTo(12, -15);
    c.stroke();
    c.strokeStyle = PAPER_L;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-9, 0);
    c.quadraticCurveTo(-16, -5, -20, -10);
    c.stroke();
    c.fillStyle = alpha(INK_SOFT, 0.8);
    c.beginPath();
    c.arc(-21, -11, 1.4, 0, TAU);
    c.fill();
    line(c, -22, -11, -27, -9, GOLD, 1);
    c.strokeStyle = alpha(INK_SOFT, 0.55);
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(8, 1);
    c.lineTo(15, 3);
    c.moveTo(8, 2);
    c.lineTo(14, 5);
    c.stroke();
    c.restore();
  }
}

function drawDistantPalace(c) {
  // A pale sandstone fort on the horizon, flattened into the distance.
  const base = HORIZON - 4;
  const fill = '#cdb68c';
  const outline = alpha('#7c6136', 0.55);
  // Long wall with merlons.
  c.fillStyle = fill;
  c.fillRect(820, base - 34, 300, 34);
  for (let x = 824; x < 1118; x += 14) {
    c.fillRect(x, base - 39, 8, 5);
  }
  // Central block and gate.
  c.fillRect(920, base - 66, 100, 32);
  c.fillRect(946, base - 88, 48, 24);
  c.strokeStyle = outline;
  c.lineWidth = 0.9;
  c.strokeRect(820, base - 34, 300, 34);
  c.strokeRect(920, base - 66, 100, 32);
  c.strokeRect(946, base - 88, 48, 24);
  // Domed pavilions on the flanks.
  for (const [dx, dh] of [[862, 44], [1072, 40]]) {
    c.fillStyle = fill;
    c.fillRect(dx - 16, base - 34 - dh, 32, dh);
    c.strokeStyle = outline;
    c.strokeRect(dx - 16, base - 34 - dh, 32, dh);
    c.beginPath();
    c.ellipse(dx, base - 34 - dh, 17, 15, 0, Math.PI, TAU);
    c.fillStyle = MARBLE;
    c.fill();
    c.strokeStyle = outline;
    c.stroke();
    line(c, dx, base - 34 - dh - 15, dx, base - 34 - dh - 23, GOLD, 1.2);
  }
  // Central dome and finial.
  c.beginPath();
  c.ellipse(970, base - 88, 19, 17, 0, Math.PI, TAU);
  c.fillStyle = MARBLE;
  c.fill();
  c.strokeStyle = outline;
  c.lineWidth = 1;
  c.stroke();
  line(c, 970, base - 105, 970, base - 116, GOLD, 1.6);
  ell(c, 970, base - 118, 2.6, 3.2, GOLD_L, GOLD_D, 0.6);

  // Small dark windows.
  c.fillStyle = alpha('#4a3a24', 0.55);
  for (let i = 0; i < 7; i += 1) {
    c.fillRect(844 + i * 38, base - 24, 3.4, 8);
  }
  // Haze wash over the base.
  c.fillStyle = alpha(PAPER_L, 0.28);
  c.fillRect(800, base - 20, 340, 20);
}

function drawBranch(c, rand) {
  // A flowering branch enters from the upper left, as a page framing device.
  c.strokeStyle = '#5f4526';
  c.lineWidth = 5.6;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(108, 30);
  c.bezierCurveTo(126, 68, 132, 104, 162, 140);
  c.bezierCurveTo(198, 178, 258, 196, 286, 234);
  c.bezierCurveTo(310, 264, 330, 276, 366, 300);
  c.stroke();
  c.strokeStyle = alpha('#8d6a3a', 0.9);
  c.lineWidth = 1.4;
  c.stroke();

  // Twigs.
  const twigs = [
    [176, 150, 128, 176], [222, 178, 236, 136], [258, 214, 300, 190],
    [322, 266, 286, 300], [300, 232, 344, 214], [352, 284, 386, 304],
  ];
  c.strokeStyle = '#5f4526';
  c.lineWidth = 1.8;
  for (const [x1, y1, x2, y2] of twigs) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2 + 6, (y1 + y2) / 2 - 8, x2, y2);
    c.stroke();
  }

  // Leaves and blossoms along the branch.
  const spots = [
    [142, 104, 1], [166, 144, 0], [204, 168, 1], [232, 184, 1],
    [262, 202, 0], [288, 226, 1], [312, 250, 0], [338, 274, 1],
    [120, 72, 0], [156, 166, 0], [222, 140, 1], [268, 258, 1],
    [322, 206, 0], [360, 292, 1], [246, 226, 1], [192, 196, 0],
    [300, 280, 1], [352, 250, 0], [96, 44, 1],
  ];
  for (const [x, y, blossom] of spots) {
    if (blossom) {
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * TAU + rand();
        ell(c, x + Math.cos(a) * 5.2, y + Math.sin(a) * 5.2, 4, 2.6, PAPER_L, alpha(GOLD, 0.5), 0.6, a);
      }
      c.fillStyle = ROSE;
      c.beginPath();
      c.arc(x, y, 2, 0, TAU);
      c.fill();
      c.fillStyle = GOLD_L;
      c.beginPath();
      c.arc(x, y, 0.9, 0, TAU);
      c.fill();
    } else {
      // A leaf pair.
      leafSprig(c, x - 4, y, 13, -1.1 + rand() * 0.4, EMERALD);
      leafSprig(c, x + 2, y + 3, 11, 0.5 + rand() * 0.3, EMERALD_D);
      c.strokeStyle = alpha(GOLD_D, 0.35);
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(x - 4, y);
      c.lineTo(x + 6, y + 2);
      c.stroke();
    }
  }
}



function drawBorder(g, c) {
  const { x0, y0, x1, y1, band } = FRAME;
  const ix0 = FIELD.x0;
  const iy0 = FIELD.y0;
  const ix1 = FIELD.x1;
  const iy1 = FIELD.y1;

  // Paper margin outside the painted field (this layer is on top of the road).
  c.fillStyle = PAPER;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, iy0 - CACHE.y0);
  c.fillRect(CACHE.x0, iy1, CACHE.w, CACHE.y0 + CACHE.h - iy1);
  c.fillRect(CACHE.x0, iy0, ix0 - CACHE.x0, iy1 - iy0);
  c.fillRect(ix1, iy0, CACHE.x0 + CACHE.w - ix1, iy1 - iy0);

  // Gold band.
  c.fillStyle = '#c49a45';
  c.fillRect(x0, y0, x1 - x0, iy0 - y0);
  c.fillRect(x0, iy1, x1 - x0, y1 - iy1);
  c.fillRect(x0, iy0, ix0 - x0, iy1 - iy0);
  c.fillRect(ix1, iy0, x1 - ix1, iy1 - iy0);

  // Band shading: a lighter inner pass.
  c.fillStyle = alpha('#e3c476', 0.55);
  c.fillRect(x0 + 3, y0 + 3, x1 - x0 - 6, (iy0 - y0) * 0.45);
  c.fillRect(x0 + 3, iy1 + (y1 - iy1) * 0.55, x1 - x0 - 6, (y1 - iy1) * 0.4);

  // Rules at both edges of the band.
  const rules = [
    [x0, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, y1], [x1, y0, x1, y1],
    [ix0, iy0, ix1, iy0], [ix0, iy1, ix1, iy1], [ix0, iy0, ix0, iy1], [ix1, iy0, ix1, iy1],
  ];
  for (let i = 0; i < rules.length; i += 1) {
    const [ax, ay, bx, by] = rules[i];
    line(c, ax, ay, bx, by, i < 4 ? GOLD_D : INK, i < 4 ? 1.2 : 1.4);
  }

  // A thin lapis rule just inside the gold, the way album pages are framed.
  c.strokeStyle = alpha(LAPIS, 0.5);
  c.lineWidth = 2.2;
  c.strokeRect(ix0 + 1, iy0 + 1, ix1 - ix0 - 2, iy1 - iy0 - 2);
  c.strokeStyle = alpha(GOLD, 0.55);
  c.lineWidth = 0.9;
  c.strokeRect(ix0 + 5, iy0 + 5, ix1 - ix0 - 10, iy1 - iy0 - 10);

  // Small gold arabesques in the four field corners.
  for (const [cx, cy, sx, sy] of [[ix0, iy0, 1, 1], [ix1, iy0, -1, 1], [ix0, iy1, 1, -1], [ix1, iy1, -1, -1]]) {
    c.strokeStyle = alpha(GOLD, 0.6);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(cx + sx * 8, cy + sy * 34);
    c.bezierCurveTo(cx + sx * 20, cy + sy * 24, cx + sx * 24, cy + sy * 20, cx + sx * 34, cy + sy * 8);
    c.stroke();
    c.strokeStyle = alpha(GOLD_D, 0.55);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(cx + sx * 12, cy + sy * 46);
    c.quadraticCurveTo(cx + sx * 26, cy + sy * 30, cx + sx * 46, cy + sy * 12);
    c.stroke();
    leafSprig(c, cx + sx * 18, cy + sy * 30, 9, sx > 0 ? (sy > 0 ? 0.6 : -0.6) : (sy > 0 ? Math.PI - 0.6 : Math.PI + 0.6), alpha(GOLD, 0.7));
    rosette(c, cx + sx * 22, cy + sy * 22, 3.6, GOLD_L, ROSE_D);
  }

  // Vine along the middle of the band.
  const mid = band / 2;
  drawVineRow(c, x0 + 24, y0 + mid, x1 - 24, y0 + mid, true, 1);
  drawVineRow(c, x0 + 24, y1 - mid, x1 - 24, y1 - mid, true, 2);
  drawVineRow(c, x0 + mid, y0 + 24, x0 + mid, y1 - 24, false, 3);
  drawVineRow(c, x1 - mid, y0 + 24, x1 - mid, y1 - 24, false, 4);

  // Corner squares with a larger rosette and arabesque leaves.
  for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    c.fillStyle = alpha(GOLD_D, 0.5);
    c.fillRect(cx - 13, cy - 13, 26, 26);
    c.strokeStyle = INK;
    c.lineWidth = 1.2;
    c.strokeRect(cx - 13, cy - 13, 26, 26);
    rosette(c, cx, cy, 9.5, GOLD_L, ROSE_D);
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * TAU + Math.PI / 4;
      leafSprig(c, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 7, a, alpha(GOLD_D, 0.9));
    }
  }

  // Burnish sheen across the band.
  c.fillStyle = alpha(PAPER_L, 0.08);
  for (let y = y0; y < y1; y += 9) {
    c.fillRect(x0, y, x1 - x0, 1);
  }
}

function drawVineRow(c, x1, y1, x2, y2, horiz, seed) {
  const r = rngFor(`s08-vine${seed}`);
  const len = horiz ? x2 - x1 : y2 - y1;
  const step = 7;
  const amp = 3.6;
  const pts = [];
  for (let d = 0; d <= len; d += step) {
    const off = Math.sin(d * 0.07 + seed) * amp;
    pts.push(horiz ? [x1 + d, y1 + off] : [x1 + off, y1 + d]);
  }
  path(c, pts, GOLD_D, 1.1);
  // Leaves alternate either side.
  for (let d = 28; d < len - 12; d += 34) {
    const off = Math.sin(d * 0.07 + seed) * amp;
    const ang = horiz ? (Math.sin(d * 0.07 + seed) > 0 ? -0.9 : 0.9) : (Math.sin(d * 0.07 + seed) > 0 ? -0.9 : 0.9) + Math.PI / 2;
    const px = horiz ? x1 + d : x1 + off;
    const py = horiz ? y1 + off : y1 + d;
    leafSprig(c, px, py, 7.5, ang, alpha(GOLD_D, 0.95));
  }
  // Rosettes at intervals.
  const n = Math.max(2, Math.floor(len / 78));
  for (let i = 0; i <= n; i += 1) {
    const d = (i / n) * len;
    const off = Math.sin(d * 0.07 + seed) * amp;
    const px = horiz ? x1 + d : x1 + off;
    const py = horiz ? y1 + off : y1 + d;
    rosette(c, px, py, 6.4, GOLD_L, ROSE_D);
    if (i % 2 === 0) {
      // A tiny ivory blossom beside the gold one.
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * TAU;
        c.fillStyle = alpha(PAPER_L, 0.9);
        c.beginPath();
        c.arc(px + Math.cos(a) * 8.4, py + Math.sin(a) * 8.4, 1.7, 0, TAU);
        c.fill();
      }
      c.fillStyle = ROSE;
      c.beginPath();
      c.arc(px, py, 1.9, 0, TAU);
      c.fill();
    }
  }
  // Ensure determinism even if the loop count changes.
  return r();
}

// ---------------------------------------------------------------- walk

function drawWalkInlay(g, ctx) {
  const c = g.drawingContext;
  const scroll = (ctx.t * TAU * 50) % 160;
  c.save();
  // Gold inlay lines along the walk edges.
  line(c, -1200, ROAD_Y - 24, 2400, ROAD_Y - 24, alpha(GOLD, 0.55), 1.2);
  line(c, -1200, ROAD_Y + 104, 2400, ROAD_Y + 104, alpha(GOLD, 0.45), 1.2);
  // Marble joints scrolling with the wheels.
  c.strokeStyle = alpha('#a8905f', 0.28);
  c.lineWidth = 0.9;
  for (let x = -1200 - scroll; x < 2400; x += 160) {
    c.beginPath();
    c.moveTo(x, ROAD_Y - 22);
    c.lineTo(x - 46, ROAD_Y + 104);
    c.stroke();
  }
  // Fine peck marks.
  const r = rngFor('s08-walk');
  c.fillStyle = alpha('#8c6d3a', 0.18);
  for (let i = 0; i < 160; i += 1) {
    const x = -1200 + ((r() * 3600 + scroll * 0.4) % 3600);
    const y = ROAD_Y - 20 + r() * 122;
    c.fillRect(x, y, 1.2 + r() * 2, 1);
  }

  // A marble ledge in front of the walk; the foreground courtiers stand on it.
  c.fillStyle = '#ddcda9';
  c.fillRect(-1200, ROAD_Y + 112, 3600, 62);
  line(c, -1200, ROAD_Y + 112, 2400, ROAD_Y + 112, alpha(GOLD, 0.7), 1.4);
  line(c, -1200, ROAD_Y + 121, 2400, ROAD_Y + 121, alpha('#a98f5c', 0.4), 0.9);
  c.strokeStyle = alpha('#a98f5c', 0.3);
  c.lineWidth = 0.9;
  const ledgeScroll = (ctx.t * TAU * 50 * 0.45) % 150;
  for (let x = -1200 - ledgeScroll; x < 2400; x += 150) {
    c.beginPath();
    c.moveTo(x, ROAD_Y + 121);
    c.lineTo(x - 22, ROAD_Y + 174);
    c.stroke();
  }
  // A tiny gold palmette row along the ledge.
  for (let x = -1200 - ledgeScroll; x < 2400; x += 150) {
    const s = 1;
    c.strokeStyle = alpha(GOLD, 0.5);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(x + 60, ROAD_Y + 158);
    c.quadraticCurveTo(x + 66, ROAD_Y + 148, x + 72, ROAD_Y + 158);
    c.stroke();
    c.beginPath();
    c.moveTo(x + 60, ROAD_Y + 158);
    c.quadraticCurveTo(x + 66 + 4 * s, ROAD_Y + 146, x + 78, ROAD_Y + 156);
    c.stroke();
    ell(c, x + 72, ROAD_Y + 154, 1.6, 1.6, GOLD_L, null, 0);
  }

  // Large palmette medallions in the centre of the walk.
  for (let x = -1200 - scroll; x < 2400; x += 240) {
    c.strokeStyle = alpha(GOLD, 0.28);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(x + 60, ROAD_Y + 58, 22, 0, TAU);
    c.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      c.beginPath();
      c.moveTo(x + 60 + Math.cos(a) * 8, ROAD_Y + 58 + Math.sin(a) * 8);
      c.quadraticCurveTo(x + 60 + Math.cos(a + 0.3) * 16, ROAD_Y + 58 + Math.sin(a + 0.3) * 16,
        x + 60 + Math.cos(a) * 21, ROAD_Y + 58 + Math.sin(a) * 21);
      c.stroke();
    }
    ell(c, x + 60, ROAD_Y + 58, 3, 3, alpha(ROSE, 0.4), null, 0);
  }

  // Gold lozenges inlaid along both edges of the walk.
  for (let x = -1200 - scroll; x < 2400; x += 160) {
    for (const yy of [ROAD_Y - 14, ROAD_Y + 92]) {
      c.fillStyle = alpha(GOLD, 0.65);
      poly(c, [[x, yy], [x + 5, yy + 3], [x, yy + 6], [x - 5, yy + 3]], GOLD_L, GOLD_D, 0.6);
      c.fillStyle = alpha(ROSE, 0.8);
      c.beginPath();
      c.arc(x, yy + 3, 1.1, 0, TAU);
      c.fill();
    }
  }
  c.restore();
}

// The terrace stair, drawn live because the road paints over the page below
// y=730. Three broad steps bring the marble down to the walk.
function drawTerraceApron(g) {
  const c = g.drawingContext;
  const steps = [
    { y: 726, h: 16, w: 420 },
    { y: 742, h: 18, w: 450 },
    { y: 760, h: 20, w: 480 },
    { y: 780, h: 14, w: 510 },
  ];
  for (let i = 0; i < steps.length; i += 1) {
    const st = steps[i];
    const x = 1000 - st.w / 2;
    c.fillStyle = i % 2 ? '#e2d3b4' : MARBLE_L;
    c.fillRect(x, st.y, st.w, st.h);
    c.strokeStyle = alpha(INK_SOFT, 0.75);
    c.lineWidth = 0.9;
    c.strokeRect(x, st.y, st.w, st.h);
    // Gold nosing along the top of each riser.
    line(c, x + 4, st.y + 0.5, x + st.w - 4, st.y + 0.5, alpha(GOLD, 0.8), 1.1);
    // Fine joints.
    c.strokeStyle = alpha('#a89268', 0.3);
    c.lineWidth = 0.7;
    for (let jx = x + 40; jx < x + st.w - 20; jx += 52) {
      c.beginPath();
      c.moveTo(jx, st.y + 3);
      c.lineTo(jx + 5, st.y + st.h - 3);
      c.stroke();
    }
  }
  // Gold lozenges across the last landing.
  for (let i = 0; i < 7; i += 1) {
    const x = 790 + i * 62;
    poly(c, [[x, 784], [x + 4, 787], [x, 790], [x - 4, 787]], alpha(GOLD, 0.6), GOLD_D, 0.5);
  }
  // A soft ink shadow under the bottom step.
  c.strokeStyle = alpha(INK_SOFT, 0.3);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(745, 794.5);
  c.lineTo(1255, 794.5);
  c.stroke();
}

// ---------------------------------------------------------------- live water

function drawFountainLive(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const x = FOUNT.x;
  const baseY = FOUNT.y - 32;

  // Jet: a fine arc that shivers, plus falling drops.
  c.save();
  c.strokeStyle = alpha('#f3f7ef', 0.9);
  c.lineWidth = 1.3;
  const sway = Math.sin(local * 2.1) * 2.2 + Math.sin(local * 4.7) * 0.8;
  c.beginPath();
  c.moveTo(x, baseY);
  c.quadraticCurveTo(x + sway, baseY - 54, x + sway * 2.2, baseY - 70);
  c.stroke();
  c.strokeStyle = alpha('#cfe6e4', 0.55);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(x - 2, baseY - 2);
  c.quadraticCurveTo(x - 12 + sway, baseY - 34, x - 20 + sway, baseY - 52);
  c.stroke();
  c.beginPath();
  c.moveTo(x + 2, baseY - 2);
  c.quadraticCurveTo(x + 12 + sway, baseY - 34, x + 20 + sway, baseY - 52);
  c.stroke();

  // Droplets.
  for (let i = 0; i < 7; i += 1) {
    const ph = ((local * 0.9 + i * 0.13) % 1);
    const yy = baseY - 70 + ph * 46;
    const xx = x + sway * 2 + Math.sin(i * 2.3 + local) * 4 + (ph - 0.5) * 6;
    c.fillStyle = alpha('#ffffff', 0.75 * (1 - ph * 0.5));
    c.beginPath();
    c.arc(xx, yy, 1.1, 0, TAU);
    c.fill();
  }

  // Ripples on the basin.
  for (let i = 0; i < 3; i += 1) {
    const ph = ((local * 0.45 + i / 3) % 1);
    c.strokeStyle = alpha('#eaf4ef', 0.34 * (1 - ph));
    c.lineWidth = 0.9;
    c.beginPath();
    c.ellipse(x, FOUNT.y, 12 + ph * 54, 3 + ph * 13, 0, 0, TAU);
    c.stroke();
  }
  // Sparkle.
  const tw = Math.max(0, Math.sin(local * 3.3));
  c.strokeStyle = alpha(GOLD_L, 0.5 * tw);
  c.lineWidth = 0.9;
  line(c, x - 4, FOUNT.y - 36, x + 4, FOUNT.y - 36, alpha(GOLD_L, 0.5 * tw), 0.9);
  line(c, x, FOUNT.y - 40, x, FOUNT.y - 32, alpha(GOLD_L, 0.5 * tw), 0.9);
  c.restore();
}

function drawChannelRipples(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  // Water channel from the fountain to the walk.
  const x0 = 984;
  const w = 32;
  c.save();
  c.fillStyle = alpha(WATER, 0.85);
  c.fillRect(x0, FOUNT.y + 8, w, GARDEN_BOTTOM - FOUNT.y - 8);
  c.strokeStyle = alpha(GOLD, 0.55);
  c.lineWidth = 0.9;
  c.strokeRect(x0, FOUNT.y + 8, w, GARDEN_BOTTOM - FOUNT.y - 8);
  c.strokeStyle = alpha('#e8f3ee', 0.45);
  c.lineWidth = 0.7;
  for (let i = 0; i < 5; i += 1) {
    const yy = FOUNT.y + 18 + i * 14 + Math.sin(local * 1.4 + i) * 1.4;
    c.beginPath();
    c.moveTo(x0 + 5, yy);
    c.quadraticCurveTo(x0 + w * 0.5, yy - 2.6, x0 + w - 5, yy);
    c.stroke();
  }
  // A slow shimmer travelling along the cross canal.
  c.strokeStyle = alpha('#eaf4ee', 0.3);
  c.lineWidth = 0.8;
  for (let i = 0; i < 4; i += 1) {
    const x = FIELD.x0 + (((local * 26 + i * 280) % 1050));
    c.beginPath();
    c.moveTo(x, 625);
    c.quadraticCurveTo(x + 12, 622, x + 26, 625);
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- courtiers

function drawCourtier(g, ctx, o) {
  const c = g.drawingContext;
  const local = ctx.local;
  const t = clamp((local - o.t0) / 0.52);
  const turned = smoothstep(0, 1, t);
  const theta = lerp(o.theta0, o.target, turned);
  // After the turn the head keeps a small, late settle.
  const settle = turned * Math.sin(local * 2.2 + o.seed) * 0.035;
  const tilt = turned * Math.sin(local * 1.7 + o.seed * 0.7) * 0.05;

  c.save();
  c.translate(o.x, o.baseY);
  c.scale(o.s * o.dir, o.s);
  if (o.view === 'profile') c.scale(0.84, 1);

  // Feet / pointed shoes.
  poly(c, [[-12, -2], [4, -4], [24, -1], [24, 2], [-12, 2]], '#5b4326', INK, 1);
  poly(c, [[-20, -6], [-8, -8], [7, -5], [7, -2], [-20, -2]], '#6b4e2c', INK, 1);

  // Churidar legs.
  poly(c, [[-10, -64], [4, -64], [6, -8], [-4, -8]], '#e8dcc0', INK_SOFT, 0.9);
  poly(c, [[6, -66], [18, -66], [18, -12], [8, -12]], '#dccfae', INK_SOFT, 0.9);
  c.strokeStyle = alpha(INK_SOFT, 0.4);
  c.lineWidth = 0.6;
  for (let i = 0; i < 5; i += 1) {
    line(c, -8, -54 + i * 9, 4, -56 + i * 9, alpha(INK_SOFT, 0.3), 0.6);
  }

  // Jama coat: narrow shoulders, flared skirt.
  const coat = [
    [-22, -162], [18, -162], [26, -146], [18, -112], [24, -92], [34, -62], [28, -54],
    [-2, -56], [-28, -56], [-34, -70], [-26, -104], [-20, -128],
  ];
  poly(c, coat, o.robe, INK, 1.15);

  // Front overlap panel.
  poly(c, [[18, -158], [24, -144], [20, -108], [26, -62], [18, -58], [12, -100], [14, -140]], alpha('#000000', 0.1), null, 0);
  c.strokeStyle = alpha(INK, 0.75);
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(18, -158);
  c.bezierCurveTo(26, -136, 16, -110, 26, -62);
  c.stroke();

  if (o.view === 'back') {
    // Seen from behind: a stole down the back, a centre seam and a sash bow.
    poly(c, [[-11, -163], [12, -163], [18, -58], [-16, -58]], alpha(o.robe2, 0.9), GOLD_D, 0.8);
    c.strokeStyle = alpha(GOLD, 0.45);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-8, -158);
    c.lineTo(-12, -62);
    c.moveTo(9, -158);
    c.lineTo(14, -62);
    c.stroke();
    c.strokeStyle = alpha(INK, 0.5);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(0, -160);
    c.lineTo(1, -60);
    c.stroke();
    // Sleeves at the sides.
    c.strokeStyle = o.robe2;
    c.lineWidth = 7;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-19, -150);
    c.quadraticCurveTo(-28, -124, -22, -100);
    c.stroke();
    c.beginPath();
    c.moveTo(18, -150);
    c.quadraticCurveTo(28, -124, 22, -100);
    c.stroke();
    c.strokeStyle = alpha(INK, 0.85);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-19, -150);
    c.quadraticCurveTo(-28, -124, -22, -100);
    c.stroke();
    c.beginPath();
    c.moveTo(18, -150);
    c.quadraticCurveTo(28, -124, 22, -100);
    c.stroke();
    ell(c, -22, -98, 3.2, 2.8, SKIN, INK_SOFT, 0.6);
    ell(c, 22, -98, 3.2, 2.8, SKIN, INK_SOFT, 0.6);
    // Sash bow at the back.
    ell(c, -4, -98, 4.2, 2.6, GOLD, GOLD_D, 0.7, -0.6);
    ell(c, 4, -98, 4.2, 2.6, GOLD, GOLD_D, 0.7, 0.6);
    ell(c, 0, -98, 2, 2, ROSE, GOLD_D, 0.6);
  } else if (o.view === 'front') {
    // A front-fastened jama with a broad gold collar.
    poly(c, [[-19, -160], [-8, -160], [0, -136], [8, -160], [19, -160], [8, -128], [-8, -128]], alpha(GOLD, 0.85), GOLD_D, 0.7);
    c.strokeStyle = alpha(GOLD_L, 0.7);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-16, -142);
    c.quadraticCurveTo(0, -120, 16, -142);
    c.stroke();
  } else if (o.view === 'tq') {
    // A chapan draped over one shoulder.
    poly(c, [[-26, -164], [-4, -166], [8, -128], [-6, -108], [-24, -118]], o.robe2, GOLD_D, 0.8);
    c.strokeStyle = alpha(GOLD, 0.55);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-24, -160);
    c.quadraticCurveTo(-6, -146, 6, -132);
    c.stroke();
  }

  // Gold buttons.
  for (let i = 0; i < 5; i += 1) {
    c.fillStyle = o.trim;
    c.beginPath();
    c.arc(18 + i * 0.6, -148 + i * 17, 1.2, 0, TAU);
    c.fill();
  }

  // Scattered gold florets on the cloth.
  if (o.view !== 'back') {
    for (let i = 0; i < 6; i += 1) {
      const fx = -16 + ((i * 37) % 32);
      const fy = -140 + ((i * 23) % 66);
      c.fillStyle = alpha(o.trim, 0.55);
      c.beginPath();
      c.arc(fx, fy, 1.1, 0, TAU);
      c.fill();
    }
  }

  // Sash (patka) with a small floral motif.
  poly(c, [[-27, -108], [24, -104], [25, -92], [-26, -96]], o.trim, GOLD_D, 0.8);
  c.strokeStyle = alpha(ROSE_D, 0.8);
  c.lineWidth = 0.7;
  c.beginPath();
  c.arc(0, -100, 2.6, 0, TAU);
  c.stroke();
  // Sash tail.
  poly(c, [[12, -94], [20, -92], [24, -56], [16, -58]], o.trim, GOLD_D, 0.7);

  // Whole-cloth fold lines and a gold hem.
  c.strokeStyle = alpha(INK, 0.32);
  c.lineWidth = 0.8;
  for (const [ax, ay, bx2, by2] of [[-14, -92, -24, -58], [-2, -90, -6, -57], [10, -92, 17, -58]]) {
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo((ax + bx2) / 2 + 3, (ay + by2) / 2, bx2, by2);
    c.stroke();
  }
  line(c, -27, -56, 27, -56, alpha(GOLD, 0.6), 0.9);
  // Shoulder seam.
  c.strokeStyle = alpha(INK, 0.4);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-18, -152);
  c.quadraticCurveTo(0, -144, 18, -150);
  c.stroke();

  // Far arm (behind coat).
  c.strokeStyle = o.robe2;
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-14, -150);
  c.quadraticCurveTo(-26, -122, -18, -98);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.8);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-14, -150);
  c.quadraticCurveTo(-26, -122, -18, -98);
  c.stroke();
  ell(c, -18, -96, 3.4, 3, SKIN, INK_SOFT, 0.7);

  // Near arm: lowered, or raised to offer a rose.
  const offer = o.offering ? smoothstep(2.7, 3.15, local) : 0;
  if (offer > 0.001) {
    const ex = lerp(12, 30, offer);
    const ey = lerp(-96, -128, offer);
    const hx = lerp(18, 48, offer);
    const hy = lerp(-92, -148, offer);
    c.strokeStyle = o.robe;
    c.lineWidth = 7.2;
    c.beginPath();
    c.moveTo(12, -150);
    c.quadraticCurveTo(ex + 6, ey, hx, hy);
    c.stroke();
    c.strokeStyle = alpha(INK, 0.85);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(12, -150);
    c.quadraticCurveTo(ex + 6, ey, hx, hy);
    c.stroke();
    // Gold cuff.
    line(c, hx - 5, hy + 1, hx + 3, hy - 2, o.trim, 2.4);
    ell(c, hx + 3, hy - 1, 3.6, 3.2, SKIN, INK_SOFT, 0.7);
    // The offered rose.
    const rx = hx + 9;
    const ry = hy - 9;
    c.strokeStyle = EMERALD_D;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(hx + 2, hy - 2);
    c.quadraticCurveTo(rx - 1, ry + 6, rx, ry);
    c.stroke();
    leafSprig(c, hx + 4, hy - 2, 6, -0.8, EMERALD_D);
    for (let p = 0; p < 6; p += 1) {
      const a = (p / 6) * TAU + 0.3;
      ell(c, rx + Math.cos(a) * 3.4, ry + Math.sin(a) * 3.4, 2.6, 1.9, p % 2 ? ROSE : '#c96352', ROSE_D, 0.6, a);
    }
    c.fillStyle = GOLD_L;
    c.beginPath();
    c.arc(rx, ry, 1.6, 0, TAU);
    c.fill();
  } else {
    c.strokeStyle = o.robe;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(14, -150);
    c.quadraticCurveTo(26, -124, 20, -100);
    c.stroke();
    c.strokeStyle = alpha(INK, 0.85);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(14, -150);
    c.quadraticCurveTo(26, -124, 20, -100);
    c.stroke();
    ell(c, 20, -98, 3.4, 3, SKIN, INK_SOFT, 0.7);
  }

  if (o.staff) {
    // A court staff, held upright in the far hand.
    c.strokeStyle = '#4e3a22';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(-24, -100);
    c.lineTo(-22, 4);
    c.stroke();
    c.strokeStyle = alpha(GOLD, 0.8);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(-23.4, -98);
    c.lineTo(-21.4, 2);
    c.stroke();
    ell(c, -24, -108, 4, 6, GOLD, GOLD_D, 0.7);
    ell(c, -24, -114, 2, 2.4, ROSE, GOLD_D, 0.6);
    // The hand closing on it.
    ell(c, -23, -98, 3.2, 3, SKIN, INK_SOFT, 0.6);
  }

  // Neck.
  c.fillStyle = SKIN_D;
  c.fillRect(-4, -172, 9, 12);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.7;
  c.strokeRect(-4, -172, 9, 12);

  // Head, drawn at the origin then turned.
  c.save();
  c.translate(1, -184);
  c.rotate(tilt);
  drawHead(c, theta + settle, o);
  c.restore();

  c.restore();
}

// theta 0 = facing the viewer, +π/2 = profile to the local +x, π = back.
function drawHead(c, theta, o) {
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const hw = 8.8 + 4.6 * Math.abs(cos);
  const hh = 12.2;

  // Back of the head / hair. Beardless faces sit almost flush in the hair.
  ell(c, 0, -1, hw + (o.beard ? 1.6 : 0.9), hh + (o.beard ? 2.2 : 0.6), '#2c2419', null, 0);

  // Nape and a knot at the back while the head is turned away.
  if (cos < 0.25) {
    c.save();
    c.globalAlpha = clamp((0.25 - cos) / 1.1);
    ell(c, 0, 7, hw * 0.86, hh * 0.8, '#241d14', null, 0);
    ell(c, 0, -4, 3.4, 3.4, '#3c3020', INK, 0.6);
    c.strokeStyle = GOLD;
    c.lineWidth = 0.9;
    c.beginPath();
    c.arc(0, -4, 5, -0.4, 2.4);
    c.stroke();
    line(c, 0, 1, 1.6, 9, GOLD, 0.9);
    ell(c, 1.6, 10, 1.2, 1.2, GOLD_L, null, 0);
    c.restore();
  }

  // Face oval.
  if (cos > 0.02) {
    c.save();
    c.globalAlpha = clamp((cos - 0.02) / 0.3);
    ell(c, 0, 0, hw, hh, SKIN, INK, 1);
    ell(c, 2.6 * cos, 3, 3.4, 2.2, alpha('#c0715a', 0.32), null, 0);
    c.restore();
  }

  // Ear on the receding side, with a gold earring.
  const ex = -sin * (hw - 1.2);
  if (Math.abs(sin) > 0.25) {
    ell(c, ex, 1, 2.4, 3.4, SKIN_D, INK_SOFT, 0.6);
    c.fillStyle = GOLD_L;
    c.beginPath();
    c.arc(ex + 0.4, 4.6, 1.1, 0, TAU);
    c.fill();
  }

  // Turban: wrapped, wider than the head, with a small gold band.
  const tw = 13.5 + 2.6 * Math.abs(cos);
  ell(c, 0, -13.6, tw, 9.4, o.beard ? '#e8dcc2' : PAPER_L, INK, 1.05);
  c.strokeStyle = alpha(INK_SOFT, 0.4);
  c.lineWidth = 0.7;
  for (let i = 0; i < 2; i += 1) {
    c.beginPath();
    c.moveTo(-tw * 0.62, -17.4 + i * 4.6);
    c.quadraticCurveTo(0, -21.4 + i * 4, tw * 0.62, -16.4 + i * 4.6);
    c.stroke();
  }
  // A small folded end of the wrap at the back.
  c.strokeStyle = alpha(INK_SOFT, 0.5);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-tw * 0.9, -14);
  c.quadraticCurveTo(-tw * 0.6, -9, -tw * 0.45, -12);
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-tw + 0.8, -8.4);
  c.quadraticCurveTo(0, -5.4, tw - 0.8, -8.4);
  c.stroke();
  if (cos > -0.2) {
    c.fillStyle = ROSE;
    c.beginPath();
    c.arc(sin * 2.2, -8.2, 1.7, 0, TAU);
    c.fill();
    c.fillStyle = GOLD_L;
    c.beginPath();
    c.arc(sin * 2.2, -8.2, 0.7, 0, TAU);
    c.fill();
  }
  c.strokeStyle = alpha(PAPER_L, 0.9);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(2, -22);
  c.quadraticCurveTo(5, -29, 9, -30);
  c.stroke();
  c.strokeStyle = alpha(GOLD_D, 0.8);
  c.beginPath();
  c.moveTo(2, -22);
  c.quadraticCurveTo(4, -27, 7, -29);
  c.stroke();

  // Face features, foreshortened by the turn.
  if (cos > 0.16) {
    c.save();
    c.globalAlpha = clamp((cos - 0.16) / 0.35);
    const eyeY = -1.6;
    const eo = 3.4 * cos;
    for (const sx of [-eo, eo]) {
      c.strokeStyle = INK;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(sx - 2.2, eyeY);
      c.quadraticCurveTo(sx, eyeY - 2, sx + 2.2, eyeY);
      c.stroke();
      c.fillStyle = INK;
      c.beginPath();
      c.arc(sx, eyeY - 0.3, 1.05, 0, TAU);
      c.fill();
      c.strokeStyle = alpha(INK, 0.75);
      c.lineWidth = 0.9;
      c.beginPath();
      c.moveTo(sx - 2.7, eyeY - 3.2);
      c.quadraticCurveTo(sx, eyeY - 4.8, sx + 2.7, eyeY - 3.4);
      c.stroke();
    }
    c.strokeStyle = alpha(INK_SOFT, 0.9);
    c.lineWidth = 0.9;
    if (cos > 0.5) {
      c.beginPath();
      c.moveTo(0.4 * sin, 0.4);
      c.lineTo(-0.8 * sin, 2.8);
      c.lineTo(1.6 * sin, 2.9);
      c.stroke();
    } else {
      c.beginPath();
      c.moveTo(sin * (hw - 2), eyeY + 0.2);
      c.quadraticCurveTo(sin * (hw + 2), 1.4, sin * (hw - 3), 2.2);
      c.stroke();
    }
    c.strokeStyle = alpha(ROSE_D, 0.95);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-1.6 * cos, 4.4);
    c.quadraticCurveTo(0, 5.2, 1.6 * cos, 4.4);
    c.stroke();
    c.restore();
  }

  if (o.beard) {
    c.fillStyle = alpha('#2c2419', 0.92);
    c.beginPath();
    c.ellipse(sin * 1.6, 6.4, 4 + 1.5 * Math.abs(cos), 3.4, 0, 0, TAU);
    c.fill();
  }
}

// ---------------------------------------------------------------- servant

function drawPlanter(g, x, base, dir) {
  const c = g.drawingContext;
  c.save();
  c.translate(x, base);
  c.scale(dir, 1);
  // Marble pot.
  poly(c, [[-15, -26], [15, -26], [11, 0], [-11, 0]], MARBLE_L, INK_SOFT, 1.1);
  c.fillStyle = alpha(GOLD, 0.8);
  c.fillRect(-16, -28, 32, 4);
  c.strokeStyle = INK_SOFT;
  c.lineWidth = 0.8;
  c.strokeRect(-16, -28, 32, 4);
  c.strokeStyle = alpha(GOLD, 0.4);
  c.lineWidth = 0.7;
  line(c, -8, -20, -5, 0, alpha(GOLD, 0.35), 0.7);
  line(c, 8, -20, 5, 0, alpha(GOLD, 0.35), 0.7);
  // Bush.
  ell(c, 0, -42, 19, 16, EMERALD_D, INK_SOFT, 0.9);
  ell(c, -6, -46, 11, 9, EMERALD, null, 0);
  c.strokeStyle = alpha(EMERALD_L, 0.6);
  c.lineWidth = 0.7;
  for (let i = 0; i < 8; i += 1) {
    const a = -2.4 + i * 0.35;
    c.beginPath();
    c.moveTo(0, -36);
    c.quadraticCurveTo(Math.cos(a) * 14, -40, Math.cos(a) * 20, -50 - Math.sin(a) * 6);
    c.stroke();
  }
  const r = rngFor(`s08-pot${x}`);
  for (let i = 0; i < 9; i += 1) {
    const px = -14 + r() * 28;
    const py = -56 + r() * 18;
    for (let p = 0; p < 5; p += 1) {
      const a = (p / 5) * TAU;
      c.fillStyle = alpha(i % 3 === 0 ? PAPER_L : ROSE, 0.92);
      c.beginPath();
      c.arc(px + Math.cos(a) * 1.7, py + Math.sin(a) * 1.7, 1.3, 0, TAU);
      c.fill();
    }
    c.fillStyle = GOLD;
    c.beginPath();
    c.arc(px, py, 0.8, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawServant(g, ctx) {
  const c = g.drawingContext;
  // A servant at the terrace edge, frozen mid-pour: the flask is tipped, the
  // stream has stopped, and one drop hangs in the air.
  c.save();
  c.translate(828, 734);
  c.scale(0.78 * -1, 0.78); // facing left, pouring over the carpet

  // Shoes and legs, set apart.
  poly(c, [[-12, -2], [-2, -4], [10, -1], [10, 2], [-12, 2]], '#5b4326', INK, 0.8);
  poly(c, [[2, -3], [12, -3], [22, 0], [22, 3], [2, 3]], '#5b4326', INK, 0.8);
  poly(c, [[-10, -62], [-2, -62], [-2, -4], [-9, -4]], '#e5d8bb', INK_SOFT, 0.8);
  poly(c, [[4, -62], [12, -62], [15, -6], [7, -6]], '#dccdaa', INK_SOFT, 0.8);

  // Long grey-green coat with a gold sash.
  poly(c, [[-17, -134], [14, -134], [23, -70], [18, -56], [-20, -56], [-26, -88]], '#7d8a7a', INK, 1);
  poly(c, [[-24, -90], [20, -88], [20, -80], [-24, -82]], GOLD, GOLD_D, 0.7);
  c.strokeStyle = alpha(INK, 0.35);
  c.lineWidth = 0.7;
  line(c, -6, -58, -10, -76, alpha(INK, 0.3), 0.7);
  line(c, 6, -58, 8, -76, alpha(INK, 0.3), 0.7);

  // Head looking down at the cup.
  c.fillStyle = SKIN_D;
  c.fillRect(-3, -146, 8, 14);
  ell(c, 1, -154, 9, 10, SKIN, INK, 0.9);
  // Turban.
  ell(c, 0, -164, 11.5, 7, PAPER_L, INK_SOFT, 0.8);
  line(c, -10, -160, 10, -160, GOLD, 1);
  ell(c, 4, -160, 1.2, 1.2, ROSE, null, 0);
  // Downcast eye and nose.
  c.fillStyle = INK;
  c.beginPath();
  c.arc(5.4, -155, 1, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(INK_SOFT, 0.9);
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(8.4, -154);
  c.lineTo(9.6, -151.4);
  c.stroke();
  c.strokeStyle = alpha(ROSE_D, 0.9);
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(7.6, -149.6);
  c.lineTo(10.4, -149.8);
  c.stroke();

  // Upper arm reaching forward and up, forearm down to the flask.
  c.strokeStyle = '#7d8a7a';
  c.lineWidth = 5.6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(8, -130);
  c.quadraticCurveTo(24, -132, 32, -126);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.85);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(8, -130);
  c.quadraticCurveTo(24, -132, 32, -126);
  c.stroke();
  // Lower arm to the cup.
  c.strokeStyle = '#6f7c6d';
  c.lineWidth = 5.2;
  c.beginPath();
  c.moveTo(9, -128);
  c.quadraticCurveTo(26, -118, 30, -106);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.85);
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(9, -128);
  c.quadraticCurveTo(26, -118, 30, -106);
  c.stroke();
  // Hands.
  ell(c, 33, -125, 3.2, 2.8, SKIN, INK_SOFT, 0.6);
  ell(c, 30, -104, 3.2, 2.8, SKIN, INK_SOFT, 0.6);

  // Ewer, tipped.
  c.save();
  c.translate(38, -134);
  c.rotate(1.05);
  ell(c, 0, 0, 5.6, 8, GOLD, GOLD_D, 0.9);
  ell(c, 0, -2, 3, 4, alpha(GOLD_L, 0.9), null, 0);
  c.fillStyle = GOLD_D;
  c.fillRect(-1.4, -10.4, 2.8, 3.2);
  // Handle.
  c.strokeStyle = GOLD_D;
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(-5, 0, 4, -1.4, 1.4);
  c.stroke();
  // Spout.
  poly(c, [[1, -4], [6, -8], [7.6, -6], [3, -1]], GOLD_L, GOLD_D, 0.7);
  c.restore();

  // The stopped stream and a suspended drop.
  c.strokeStyle = alpha('#f7fbf4', 0.95);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(48, -140);
  c.quadraticCurveTo(49, -126, 46, -115);
  c.stroke();
  c.strokeStyle = alpha('#9fbfc4', 0.85);
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(48.6, -139);
  c.quadraticCurveTo(50, -126, 47, -115);
  c.stroke();
  // The drop that never falls.
  ell(c, 46.6, -109, 1.6, 2.6, '#f7fbf4', '#7f9ea6', 0.6);
  ell(c, 46.2, -110, 0.5, 0.8, alpha('#ffffff', 0.95), null, 0);

  // Cup, with a blue line of liquid.
  poly(c, [[36, -106], [46, -106], [44.4, -97], [38, -97]], MARBLE_L, INK_SOFT, 0.8);
  c.strokeStyle = GOLD;
  c.lineWidth = 1;
  line(c, 37, -104, 45, -104, GOLD, 1);
  c.restore();
}

// ---------------------------------------------------------------- petals

function drawPetals(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  c.save();
  for (let i = 0; i < 14; i += 1) {
    const r = rngFor(`s08-petal${i}`);
    const baseX = FIELD.x0 + 260 + r() * 1400;
    const speed = 16 + r() * 12;
    const y = ((local * speed + r() * 380) % 420) + 500;
    const x = baseX + Math.sin(local * 0.8 + i) * 14 + y * 0.16;
    const rot = local * 0.7 + i;
    const col = i % 3 === 0 ? ROSE : i % 3 === 1 ? PAPER_L : GOLD_L;
    c.save();
    c.translate((x + 1400) % 1600 - 100, y);
    c.rotate(rot);
    c.fillStyle = alpha(col, 0.85);
    c.beginPath();
    c.ellipse(0, 0, 2.6, 1.4, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(ROSE_D, 0.35);
    c.lineWidth = 0.4;
    c.stroke();
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawRiderShadow(g) {
  // Flat ink smudges under the tyres, in the miniature's own line language.
  const c = g.drawingContext;
  const S = 1.16;
  c.save();
  for (const dx of [-72, 72]) {
    const wx = 468 + dx * S;
    c.beginPath();
    c.ellipse(wx, RIDER_Y + 2.6, 34, 4.8, 0, 0, TAU);
    c.fillStyle = alpha(INK, 0.13);
    c.fill();
    c.beginPath();
    c.ellipse(wx, RIDER_Y + 1.4, 24, 2.3, 0, 0, TAU);
    c.fillStyle = alpha(INK, 0.22);
    c.fill();
    line(c, wx - 34, RIDER_Y + 1, wx + 34, RIDER_Y + 1, alpha(INK, 0.3), 1.1);
    // A few dry-brush ticks, not a soft gradient.
    for (let i = 0; i < 4; i += 1) {
      line(c, wx - 22 + i * 12, RIDER_Y + 5, wx - 16 + i * 12, RIDER_Y + 8, alpha(INK, 0.12), 0.8);
    }
  }
  c.restore();
}

function drawMughalRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const S = 1.16;
  const X = 468;
  const Y = RIDER_Y;

  c.save();
  c.translate(X, Y);
  c.scale(S, S);

  // Far wheel, near wheel.
  drawMiniWheel(c, pose.wheels.rear, pose.wheelAngle);
  drawMiniWheel(c, pose.wheels.front, pose.wheelAngle);

  // Far leg behind the frame.
  drawMiniLeg(c, pose, false);

  // Frame.
  const f = pose.frame;
  const seg = [
    [f.rearHub, f.seatCluster], [f.seatCluster, f.crank], [f.rearHub, f.crank],
    [f.crank, f.headTop], [f.seatCluster, f.headTop], [f.headTop, f.frontHub],
    [f.headTop, f.stemTop], [f.stemTop, pose.grip],
  ];
  c.lineCap = 'round';
  for (const [a, b] of seg) {
    line(c, a.x, a.y, b.x, b.y, INK, 3.2);
    line(c, a.x, a.y, b.x, b.y, '#a97c2e', 1.7);
  }
  // Wheel hubs and crank rosette.
  for (const w of [pose.wheels.rear, pose.wheels.front]) {
    ell(c, w.x, w.y, 5, 5, GOLD, GOLD_D, 0.8);
    rosette(c, w.x, w.y, 3.4, GOLD_L, ROSE_D);
  }
  // Chainring and chain.
  c.strokeStyle = alpha(GOLD, 0.75);
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(pose.crankCenter.x, pose.crankCenter.y, 18, 0, TAU);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.55);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(pose.crankCenter.x, pose.crankCenter.y - 18);
  c.lineTo(pose.frame.rearHub.x, pose.frame.rearHub.y - 9);
  c.moveTo(pose.crankCenter.x, pose.crankCenter.y + 18);
  c.lineTo(pose.frame.rearHub.x, pose.frame.rearHub.y + 9);
  c.stroke();
  rosette(c, pose.crankCenter.x, pose.crankCenter.y, 4.2, GOLD_L, ROSE_D);
  // Saddle.
  poly(c, [[-42, -136], [-22, -138], [-18, -130], [-34, -127]], ROSE, INK, 0.9);

  // Pelican.
  drawPelican(c, pose);

  // Near leg over the frame, with a feathered haunch.
  ell(c, pose.hip.x + 2, pose.hip.y + 2, 11, 14, '#f2e4c4', INK, 1, -0.3);
  drawMiniLeg(c, pose, true);

  // Handlebar grip.
  ell(c, pose.grip.x, pose.grip.y, 5.2, 3.4, ROSE, INK, 0.8, -0.3);
  c.restore();
}

function drawMiniWheel(c, wheel, angle) {
  c.save();
  c.translate(wheel.x, wheel.y);
  // Tire drawn as two fine lines, not a fat modern tyre.
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, wheel.r, 0, TAU);
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(0, 0, wheel.r - 3.2, 0, TAU);
  c.stroke();
  c.strokeStyle = alpha(GOLD_D, 0.85);
  c.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const a = angle + (i / 12) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
    c.lineTo(Math.cos(a) * (wheel.r - 6), Math.sin(a) * (wheel.r - 6));
    c.stroke();
  }
  // Twelve-petal wheel rosette at the hub.
  rosette(c, 0, 0, 5, GOLD_L, ROSE_D);
  c.fillStyle = ROSE;
  c.beginPath();
  c.arc(Math.cos(angle) * (wheel.r - 10), Math.sin(angle) * (wheel.r - 10), 2, 0, TAU);
  c.fill();
  c.restore();
}

function drawMiniLeg(c, pose, near) {
  const leg = near ? pose.legs.near : pose.legs.far;
  const hip = pose.hip;
  const col = near ? '#f2e6cc' : '#d9c8a6';
  const w = near ? 8 : 7;
  // Thigh to knee, knee to ankle.
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = w + 3;
  c.beginPath();
  c.moveTo(hip.x, hip.y);
  c.quadraticCurveTo(leg.knee.x, leg.knee.y - 2, leg.knee.x, leg.knee.y);
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w;
  c.stroke();
  c.strokeStyle = INK;
  c.lineWidth = w - 2 + 3;
  c.beginPath();
  c.moveTo(leg.knee.x, leg.knee.y);
  c.lineTo(leg.ankle.x, leg.ankle.y);
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = w - 2;
  c.stroke();
  // Webbed foot on the pedal.
  const a = leg.ankle;
  poly(c, [[a.x - 3, a.y], [a.x + 9, a.y - 1], [a.x + 10, a.y + 3], [a.x - 5, a.y + 3]], near ? GOLD_L : GOLD, INK, 0.7);
  // Pedal.
  line(c, a.x - 6, a.y + 3, a.x + 10, a.y + 3, INK, 1.4);
}

function drawPelican(c, pose) {
  const BODY = '#f8efd8';
  const SHADE = '#e9d7b3';
  const WING = '#f2e4c4';
  const tail = pose.tail;

  // Tail: one flat fan, cut into feathers with a fine comb.
  const tailPts = [
    [tail.x + 14, tail.y - 14],
    [tail.x - 26, tail.y - 25],
    [tail.x - 38, tail.y - 8],
    [tail.x - 34, tail.y + 10],
    [tail.x - 14, tail.y + 10],
    [tail.x + 12, tail.y + 12],
  ];
  poly(c, tailPts, SHADE, INK, 1.3);
  c.strokeStyle = alpha(GOLD_D, 0.6);
  c.lineWidth = 0.8;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(tail.x + 4, tail.y - 4 + i * 7);
    c.lineTo(tail.x - 24, tail.y - 17 + i * 9);
    c.stroke();
  }

  // Body.
  const b = pose.body;
  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  ell(c, 0, 0, b.rx, b.ry, BODY, INK, 1.6);
  ell(c, 2, 10, b.rx * 0.76, b.ry * 0.52, alpha(SHADE, 0.7), null, 0);
  // A gold feather arc along the flank.
  c.strokeStyle = alpha(GOLD, 0.4);
  c.lineWidth = 0.9;
  c.beginPath();
  c.arc(-4, 2, 33, 0.2, 2.1);
  c.stroke();
  c.beginPath();
  c.arc(-6, 4, 25, 0.35, 1.9);
  c.stroke();
  c.restore();

  // Neck.
  const nk = pose.neck;
  c.strokeStyle = INK;
  c.lineWidth = 17.5;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(nk[0].x, nk[0].y);
  c.quadraticCurveTo(14, -206, 32, -214);
  c.quadraticCurveTo(48, -221, nk[3].x, nk[3].y);
  c.stroke();
  c.strokeStyle = BODY;
  c.lineWidth = 14;
  c.stroke();

  // Gold collar band across the base of the neck.
  const ta = Math.atan2(nk[1].y - nk[0].y, nk[1].x - nk[0].x);
  const nx = Math.cos(ta + Math.PI / 2);
  const ny = Math.sin(ta + Math.PI / 2);
  const cx0 = nk[0].x + Math.cos(ta) * 7;
  const cy0 = nk[0].y + Math.sin(ta) * 7;
  c.strokeStyle = GOLD;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx0 + nx * 8, cy0 + ny * 8);
  c.lineTo(cx0 - nx * 8, cy0 - ny * 8);
  c.stroke();
  ell(c, cx0 - nx * 8, cy0 - ny * 8, 1.8, 1.8, ROSE, null, 0);

  // Head.
  const h = pose.head;
  ell(c, h.x, h.y, 17.5, 15.5, BODY, INK, 1.4);
  // Crest.
  c.strokeStyle = alpha(GOLD, 0.85);
  c.lineWidth = 1.6;
  for (let i = 0; i < 3; i += 1) {
    const a = -2.5 + i * 0.18;
    c.beginPath();
    c.moveTo(h.x + Math.cos(a) * 14, h.y + Math.sin(a) * 14);
    c.lineTo(h.x + Math.cos(a) * 25 - 4, h.y + Math.sin(a) * 25 - 4);
    c.stroke();
  }
  // Eye: white, gold ring, dark iris.
  c.fillStyle = '#fbf4e4';
  c.beginPath();
  c.arc(h.x + 7, h.y - 5, 5.4, 0, TAU);
  c.fill();
  c.strokeStyle = GOLD;
  c.lineWidth = 1.1;
  c.stroke();
  c.fillStyle = INK;
  c.beginPath();
  c.arc(h.x + 8.2, h.y - 5, 2.9, 0, TAU);
  c.fill();
  c.fillStyle = alpha(PAPER_L, 0.95);
  c.beginPath();
  c.arc(h.x + 9.2, h.y - 6.4, 0.9, 0, TAU);
  c.fill();
  // Blush.
  ell(c, h.x + 1, h.y + 3, 3.8, 2.3, alpha('#c0715a', 0.3), null, 0);

  // Beak and pouch.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  const pg = pose.pouch;
  // Pouch first.
  c.fillStyle = '#efdab0';
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bb.x + 2, bb.y + 2);
  c.quadraticCurveTo(bb.x + 54, bb.y + 10, bt.x - 8, bt.y + 3);
  c.quadraticCurveTo(pg.x - 8, pg.y + 10, bb.x + 8, bb.y + 20);
  c.quadraticCurveTo(bb.x - 2, bb.y + 10, bb.x + 2, bb.y + 2);
  c.closePath();
  c.fill();
  c.stroke();
  // Pouch creases.
  c.strokeStyle = alpha(ROSE_D, 0.4);
  c.lineWidth = 0.7;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(bb.x + 16 + i * 10, bb.y + 7 + i * 2);
    c.quadraticCurveTo(bb.x + 40 + i * 8, bb.y + 20 + i * 2, bb.x + 62 + i * 5, bb.y + 17 + i);
    c.stroke();
  }
  // Upper mandible.
  c.fillStyle = '#c9953a';
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bb.x - 3, bb.y - 7);
  c.quadraticCurveTo(bb.x + 34, bb.y - 9, bt.x, bt.y - 3);
  c.quadraticCurveTo(bb.x + 52, bb.y + 2, bb.x - 3, bb.y + 3);
  c.closePath();
  c.fill();
  c.stroke();
  // Ridge and nostril.
  c.strokeStyle = alpha(GOLD_L, 0.9);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(bb.x + 6, bb.y - 3);
  c.quadraticCurveTo(bb.x + 44, bb.y - 4, bt.x - 5, bt.y - 1);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.55);
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(bb.x + 8, bb.y);
  c.lineTo(bb.x + 14, bb.y + 0.5);
  c.stroke();

  // Near wing: an arm to the handlebar, in the shared rig's pose.
  const sh = pose.shoulder;
  const gr = pose.grip;
  const wingPath = () => {
    c.beginPath();
    c.moveTo(sh.x - 8, sh.y + 10);
    c.quadraticCurveTo(42, -172, gr.x - 2, gr.y - 4);
  };
  c.strokeStyle = INK;
  c.lineWidth = 19;
  c.lineCap = 'round';
  wingPath();
  c.stroke();
  c.strokeStyle = WING;
  c.lineWidth = 13.5;
  wingPath();
  c.stroke();
  // A gold line along the wing.
  c.strokeStyle = alpha(GOLD, 0.7);
  c.lineWidth = 1.2;
  wingPath();
  c.stroke();
  // Wrist feathers.
  for (let i = 0; i < 4; i += 1) {
    const fx = gr.x - 4 + i * 2;
    const fy = gr.y + 2 + i * 2;
    c.strokeStyle = i === 0 ? INK : WING;
    c.lineWidth = i === 0 ? 2.4 : 3.4;
    c.beginPath();
    c.moveTo(fx, fy);
    c.lineTo(fx - 9 - i * 2, fy + 7 + i * 2);
    c.stroke();
  }
  // Gold "hand" at the grip.
  ell(c, gr.x - 1, gr.y - 2, 4.5, 3.4, alpha(GOLD, 0.9), GOLD_D, 0.7);

  // Gold breast pendant.
  c.strokeStyle = GOLD;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(b.x + 26, b.y - 28);
  c.quadraticCurveTo(b.x + 31, b.y - 20, b.x + 28, b.y - 14);
  c.stroke();
  ell(c, b.x + 28, b.y - 11, 2.8, 2.8, ROSE, GOLD_D, 0.8);
}

// ---------------------------------------------------------------- grain

function drawGrain(g, ctx) {
  const c = g.drawingContext;
  const r = rngFor(`s08-grain${Math.floor(ctx.local * 3)}`);
  c.save();
  c.globalAlpha = 0.05;
  c.fillStyle = '#4a3520';
  for (let i = 0; i < 220; i += 1) {
    const x = -700 + r() * 2200;
    const y = -40 + r() * 1040;
    c.fillRect(x, y, 1.2, 1.2);
  }
  c.restore();
  // A faint gold dust in the sky.
  c.save();
  c.fillStyle = alpha(GOLD_L, 0.16);
  for (let i = 0; i < 40; i += 1) {
    const x = 200 + r() * 1000;
    const y = 90 + r() * 330;
    c.beginPath();
    c.arc(x, y, 0.8 + r() * 1.1, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- title

function drawMughalTitle(g, opacity, lift, local) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;

  const x = 92 * s;
  const baseY = H - 158 * s + lift * s;
  const pw = 660 * s;
  const ph = 182 * s;
  const px = x - 30 * s;
  const py = baseY - 126 * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.3 * s);

  // Deep emerald plate with a gold double frame.
  const plate = c.createLinearGradient(px, py, px, py + ph);
  plate.addColorStop(0, 'rgba(28, 56, 44, 0.94)');
  plate.addColorStop(1, 'rgba(20, 40, 32, 0.96)');
  c.fillStyle = plate;
  c.fillRect(px, py, pw, ph);
  c.strokeStyle = GOLD;
  c.lineWidth = 4 * s;
  c.strokeRect(px + 3 * s, py + 3 * s, pw - 6 * s, ph - 6 * s);
  c.strokeStyle = GOLD_L;
  c.lineWidth = 1.2 * s;
  c.strokeRect(px + 11 * s, py + 11 * s, pw - 22 * s, ph - 22 * s);

  // Gold vine along the top inside the frame.
  c.strokeStyle = alpha(GOLD_L, 0.6);
  c.lineWidth = 0.9 * s;
  c.beginPath();
  c.moveTo(px + 26 * s, py + 20 * s);
  for (let i = 0; i <= 12; i += 1) {
    const xx = px + 26 * s + (i / 12) * (pw - 52 * s);
    c.lineTo(xx, py + 20 * s + Math.sin(i * 0.9) * 2.2 * s);
  }
  c.stroke();

  // Corner rosettes.
  for (const [cx, cy] of [[px + 26 * s, py + 26 * s], [px + pw - 26 * s, py + 26 * s], [px + 26 * s, py + ph - 26 * s], [px + pw - 26 * s, py + ph - 26 * s]]) {
    rosette(c, cx, cy, 7 * s, GOLD_L, ROSE_D);
  }

  // Text.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  setFont(c, 14 * s, 600, EN_FONT, '3px');
  c.fillStyle = alpha(GOLD_L, 0.95);
  c.fillText('08  /  20', x, baseY - 78 * s);

  setFont(c, 42 * s, 500, CN_FONT, '1px');
  c.fillStyle = '#f6ead2';
  c.fillText('莫卧儿细密画', x, baseY - 26 * s);

  setFont(c, 18 * s, 500, EN_FONT, '2.6px');
  c.fillStyle = alpha('#e8d7b2', 0.9);
  c.fillText('MUGHAL MINIATURE', x, baseY + 8 * s);

  setFont(c, 16 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(GOLD_L, 0.95);
  c.fillText('约1600 · 细密画', x, baseY + 32 * s);

  // A small gold divider and a sprig at the right of the plate.
  c.strokeStyle = alpha(GOLD_L, 0.8);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x, baseY + 44 * s);
  c.lineTo(x + 74 * s, baseY + 44 * s);
  c.stroke();
  leafSprig(c, px + pw - 74 * s, py + ph * 0.52, 22 * s, -0.4, alpha(GOLD_L, 0.75));
  leafSprig(c, px + pw - 74 * s, py + ph * 0.52, 18 * s, 2.6, alpha(GOLD_L, 0.55));
  c.fillStyle = ROSE;
  c.beginPath();
  c.arc(px + pw - 74 * s, py + ph * 0.52, 3 * s, 0, TAU);
  c.fill();

  c.restore();
}
