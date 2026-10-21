// 11 — Ukiyo-e, Hiroshige's Tokaido. A woodblock print on cream paper: flat
// Prussian-blue bokashi sky, Fuji, pine, milestone, teahouse, and a signpost
// for the fifty-three stations. A traveler bows to the pelican; a teahouse girl
// points out the mistake. Landscape and seated figures are cached; the keyblock
// rider, the bow, the pointing sleeve and the dust are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { rngFor, noise1, TAU, smoothstep } from '../kit/math.js';
import { cachedLayer } from '../kit/cache.js';
import { paperCanvas } from '../kit/texture.js';
import { rigPose } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const PRINT = { x0: -800, y0: -150, w: 2400, h: 1250 };
const HORIZON = 790;
const NEAR_EDGE = 926;

const PAPER = '#e7ddc7';
const PAPER_L = '#efe6d0';
const INK = '#1f2a33';
const DEEP = '#1b3d59';
const PRUSSIAN = '#254b6b';
const MID_BLUE = '#6f8fa3';
const PALE_BLUE = '#a9bfc7';
const VERM = '#b4452c';
const PINE = '#3f5b47';
const PINE_D = '#2d4636';
const OCHRE = '#c8a25a';
const BROWN = '#6b4b33';
const KIMONO = '#33536b';
const KIMONO_D = '#274256';

const pal = basePalette({
  bg: PAPER,
  bg2: '#d9ccb2',
  motif: PRUSSIAN,
  accent: VERM,
  ink: INK,
  titleInk: INK,
  ground: '#d6c7a6',
  road: '#c2ad86',
  dash: '#c2ad86',
  body: '#f6eedb',
  beak: '#c98a3f',
  rigInk: INK,
  scrim: PAPER,
});

export default {
  id: 's11',
  number: 11,
  cn: '浮世绘',
  en: 'Ukiyo-e',
  year: '1830s · 东海道',
  motif: 'fuji',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    // The road is live; the cached print leaves its band transparent.
    ctx.road(g, {
      ground: '#d8c9a8',
      verge: '#bda982',
      road: '#c2ad86',
      edge: '#c2ad86',
      dash: '#c2ad86',
      ink: '#2a302c',
      dust: false,
    });

    const layer = cachedLayer(ctx, 's11-ukiyo-print', drawPrint, PRINT);
    c.drawImage(layer.canvas, PRINT.x0, PRINT.y0, PRINT.w, PRINT.h);

    drawCartRuts(g);
    drawSteam(g, ctx);
    drawTeahouseGirl(g, ctx);
    drawBowingTraveler(g, ctx);
    drawUkiyoRider(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawUkiyoTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- primitives

function line(c, x1, y1, x2, y2, color, w) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'butt';
  c.lineJoin = 'miter';
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

function polyPath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

function fillPoly(c, pts, fill, stroke = INK, w = 2.2) {
  polyPath(c, pts);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

function disc(c, x, y, r, fill, stroke = INK, w = 2) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

function ctext(c, str, x, y, size, color, font = CN_FONT, weight = 600, spacing = '2px') {
  setFont(c, size, weight, font, spacing);
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(str, x, y);
}

// ---------------------------------------------------------------- the print

function drawPrint(g, c) {
  const rand = rngFor(1831);

  // Paper sheet. Punch out the road band by clipping the sheet to the two
  // areas above and below it, so the live road stays visible.
  const sheet = paperCanvas(1400, 780, {
    tone: PAPER, seed: 114, fiber: 3000, specks: 6600, laid: true,
  });
  c.save();
  c.beginPath();
  c.rect(PRINT.x0, PRINT.y0, PRINT.w, HORIZON - PRINT.y0);
  c.rect(PRINT.x0, NEAR_EDGE, PRINT.w, 1100 - NEAR_EDGE);
  c.clip();
  c.drawImage(sheet, PRINT.x0, PRINT.y0, PRINT.w, 1100 - PRINT.y0);
  c.restore();

  drawSky(c);
  drawFuji(c);
  drawRidges(c);
  drawClouds(c);
  drawTreeline(c);
  drawGeese(c);
  drawRoadPebbles(c, rand);
  drawPine(c);
  drawFallenNeedles(c);
  drawMilestone(c);
  drawTeahouse(c);
  drawSignpost(c);
  drawFarWalkers(c);
  drawForeground(c, rand);
  drawWear(c, rand);
}

function drawRoadPebbles(c, rand) {
  c.save();
  for (let i = 0; i < 34; i += 1) {
    const x = PRINT.x0 + rand() * PRINT.w;
    const y = 806 + rand() * 96;
    if (x > 640 && x < 760 && y > 830) continue;
    const rx = 1.6 + rand() * 4.2;
    const ry = 1 + rand() * 2.6;
    c.fillStyle = alpha('#9b8967', 0.35 + rand() * 0.2);
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(INK, 0.25);
    c.lineWidth = 0.8;
    c.stroke();
  }
  c.restore();
}

function drawSky(c) {
  c.save();
  c.beginPath();
  c.rect(PRINT.x0, PRINT.y0, PRINT.w, HORIZON - PRINT.y0);
  c.clip();

  const sky = c.createLinearGradient(0, PRINT.y0, 0, HORIZON);
  sky.addColorStop(0, alpha(DEEP, 1));
  sky.addColorStop(0.3, alpha('#2c5573', 0.98));
  sky.addColorStop(0.56, alpha('#5f819c', 0.94));
  sky.addColorStop(0.76, alpha('#9fb4bf', 0.84));
  sky.addColorStop(0.9, alpha('#c9d2cd', 0.55));
  sky.addColorStop(1, alpha(PAPER, 0.08));
  c.fillStyle = sky;
  c.fillRect(PRINT.x0, PRINT.y0, PRINT.w, HORIZON - PRINT.y0);

  // Bokashi wiped-block streaks.
  for (let y = PRINT.y0; y < HORIZON; y += 13) {
    const a = 0.018 + Math.abs(noise1(y * 0.027, 1831)) * 0.036;
    c.strokeStyle = alpha('#10263b', a);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(PRINT.x0, y + 0.5);
    c.lineTo(PRINT.x0 + PRINT.w, y + 0.5);
    c.stroke();
  }

  // Printed woodgrain: a few slow vertical waves in the blue block.
  c.strokeStyle = alpha('#0e2236', 0.05);
  c.lineWidth = 2.4;
  for (let i = 0; i < 7; i += 1) {
    const x = -700 + i * 330;
    c.beginPath();
    c.moveTo(x, 40);
    c.bezierCurveTo(x + 18, 220, x - 14, 430, x + 8, 720);
    c.stroke();
  }
  c.restore();
}

function drawFuji(c) {
  const body = [
    { x: 600, y: 762 }, { x: 650, y: 712 }, { x: 700, y: 656 },
    { x: 745, y: 600 }, { x: 785, y: 548 }, { x: 820, y: 498 },
    { x: 850, y: 452 }, { x: 878, y: 408 }, { x: 902, y: 368 },
    { x: 922, y: 330 }, { x: 940, y: 300 }, { x: 955, y: 278 },
    { x: 968, y: 268 }, { x: 980, y: 264 }, { x: 992, y: 272 },
    { x: 1005, y: 294 }, { x: 1022, y: 326 }, { x: 1042, y: 362 },
    { x: 1065, y: 404 }, { x: 1092, y: 450 }, { x: 1122, y: 500 },
    { x: 1158, y: 552 }, { x: 1198, y: 606 }, { x: 1245, y: 660 },
    { x: 1300, y: 710 }, { x: 1360, y: 752 },
  ];
  fillPoly(c, body, MID_BLUE, INK, 2.4);

  // Snow cap, keyblock outline, jagged snowline well above the roofline.
  c.beginPath();
  c.moveTo(884, 402);
  c.lineTo(902, 368);
  c.lineTo(922, 330);
  c.lineTo(940, 300);
  c.lineTo(955, 278);
  c.lineTo(968, 268);
  c.lineTo(980, 264);
  c.lineTo(992, 272);
  c.lineTo(1005, 294);
  c.lineTo(1022, 326);
  c.lineTo(1042, 362);
  c.lineTo(1058, 398);
  c.lineTo(1052, 416);
  c.lineTo(1045, 394);
  c.lineTo(1038, 406);
  c.lineTo(1031, 388);
  c.lineTo(1024, 420);
  c.lineTo(1017, 398);
  c.lineTo(1010, 410);
  c.lineTo(1003, 392);
  c.lineTo(996, 420);
  c.lineTo(989, 400);
  c.lineTo(982, 412);
  c.lineTo(975, 392);
  c.lineTo(968, 416);
  c.lineTo(961, 396);
  c.lineTo(954, 410);
  c.lineTo(947, 388);
  c.lineTo(940, 414);
  c.lineTo(933, 394);
  c.lineTo(926, 408);
  c.lineTo(919, 386);
  c.lineTo(912, 402);
  c.lineTo(905, 384);
  c.lineTo(898, 400);
  c.lineTo(891, 386);
  c.lineTo(884, 398);
  c.closePath();
  c.fillStyle = PAPER_L;
  c.fill();
  c.strokeStyle = alpha(INK, 0.75);
  c.lineWidth = 1.8;
  c.stroke();

  // Short rock creases near the summit; no long tent-pole lines.
  c.strokeStyle = alpha(INK, 0.28);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(955, 330);
  c.quadraticCurveTo(936, 360, 920, 396);
  c.moveTo(1010, 336);
  c.quadraticCurveTo(1028, 368, 1042, 398);
  c.stroke();
}

function wavyRidge(c, baseY, amp, seed, fill, w = 1.6) {
  c.beginPath();
  c.moveTo(-800, baseY + noise1(-5.6, seed) * amp);
  for (let x = -800; x <= 1600; x += 24) {
    const y = baseY
      + noise1(x * 0.007, seed) * amp
      + noise1(x * 0.024, seed + 7) * amp * 0.3;
    c.lineTo(x, y);
  }
  c.lineTo(1600, HORIZON);
  c.lineTo(-800, HORIZON);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = alpha(INK, 0.55);
  c.lineWidth = w;
  c.stroke();
}

function drawRidges(c) {
  wavyRidge(c, 704, 22, 91, '#a9bec4');
  wavyRidge(c, 746, 14, 92, '#8ea7a4');

  // Bank of mist at the foot of the mountain.
  c.fillStyle = alpha(PAPER_L, 0.82);
  c.beginPath();
  c.moveTo(-800, 756);
  for (let x = -800; x <= 1600; x += 40) {
    c.lineTo(x, 752 + noise1(x * 0.01, 41) * 8);
  }
  c.lineTo(1600, 792);
  c.lineTo(-800, 792);
  c.closePath();
  c.fill();
}

function cloudBand(c, x, y, w, h, seed) {
  const rand = rngFor(seed);
  c.beginPath();
  c.moveTo(x, y + h * 0.6);
  const n = 4;
  for (let i = 0; i < n; i += 1) {
    const x0 = x + (w / n) * i;
    const x1 = x + (w / n) * (i + 1);
    const cy = y + h * (0.22 + rand() * 0.42);
    c.quadraticCurveTo((x0 + x1) / 2, cy - h * 0.5, x1, y + h * 0.55);
  }
  c.lineTo(x + w, y + h);
  c.lineTo(x, y + h);
  c.closePath();
  c.fillStyle = alpha(PAPER_L, 0.9);
  c.fill();
  c.strokeStyle = alpha(INK, 0.3);
  c.lineWidth = 1.4;
  c.stroke();
}

function drawClouds(c) {
  cloudBand(c, -250, 330, 360, 32, 11);
  cloudBand(c, 1260, 430, 300, 28, 13);
}

function drawTreeline(c) {
  const rand = rngFor(77);
  c.save();
  c.beginPath();
  c.rect(PRINT.x0, 720, PRINT.w, HORIZON - 720);
  c.clip();
  let x = -790;
  while (x < 1600) {
    const step = 9 + rand() * 22;
    if (!(x > 900 && x < 1280)) {
      const cluster = rand() > 0.5 ? 1.25 : 0.85;
      const h = (8 + rand() * 20) * cluster;
      const y = 760 + rand() * 14;
      c.fillStyle = alpha(PINE_D, 0.5 + rand() * 0.28);
      c.beginPath();
      c.moveTo(x, y - h);
      c.lineTo(x + 5, y + 2);
      c.lineTo(x - 5, y + 2);
      c.closePath();
      c.fill();
    }
    x += step;
  }
  c.restore();
}

function drawGeese(c) {
  c.strokeStyle = alpha(INK, 0.78);
  c.lineWidth = 1.9;
  const flock = [
    [246, 176, 9], [278, 166, 7], [308, 184, 8],
    [338, 158, 6], [366, 172, 7], [394, 188, 5],
  ];
  for (const [x, y, s] of flock) {
    c.beginPath();
    c.moveTo(x - s, y - s * 0.45);
    c.quadraticCurveTo(x - s * 0.45, y, x, y);
    c.quadraticCurveTo(x + s * 0.45, y, x + s, y - s * 0.45);
    c.stroke();
  }
}

// ---------------------------------------------------------------- pine

function needlePad(c, cx, cy, rx, ry, seed, tone = PINE) {
  const rand = rngFor(seed);
  const n = 44;
  c.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * TAU;
    const wob = 1
      + 0.085 * Math.sin(a * 7 + seed * 0.7)
      + 0.045 * Math.sin(a * 13 + seed);
    const x = cx + Math.cos(a) * rx * wob;
    const y = cy + Math.sin(a) * ry * wob;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fillStyle = tone;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.1;
  c.stroke();

  // Needle fringe: short teeth only at the silhouette edge.
  c.strokeStyle = PINE_D;
  c.lineWidth = 1.15;
  for (let i = 0; i < 34; i += 1) {
    const a = rand() * TAU;
    const k = 0.96 + rand() * 0.05;
    const sx = cx + Math.cos(a) * rx * k;
    const sy = cy + Math.sin(a) * ry * k;
    const tx = cx + Math.cos(a) * rx * (k + 0.07 + rand() * 0.07);
    const ty = cy + Math.sin(a) * ry * (k + 0.07 + rand() * 0.07);
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(tx, ty);
    c.stroke();
  }

  // Interior needle texture: short dashes, flat ink, no shading.
  c.strokeStyle = alpha(PINE_D, 0.85);
  c.lineWidth = 1.05;
  for (let i = 0; i < 22; i += 1) {
    const a = rand() * TAU;
    const r = 0.25 + rand() * 0.6;
    const sx = cx + Math.cos(a) * rx * r;
    const sy = cy + Math.sin(a) * ry * r;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + 5 + rand() * 7, sy - 1 + rand() * 3);
    c.stroke();
  }

  // Branch line through the pad.
  c.strokeStyle = alpha(INK, 0.6);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(cx - rx * 0.8, cy + ry * 0.2);
  c.quadraticCurveTo(cx, cy - ry * 0.1, cx + rx * 0.85, cy + ry * 0.12);
  c.stroke();
}

function drawPine(c) {
  const trunk = [
    { x: 8, y: 822 }, { x: 24, y: 790 }, { x: 38, y: 734 },
    { x: 30, y: 676 }, { x: 54, y: 620 }, { x: 42, y: 566 },
    { x: 72, y: 514 }, { x: 62, y: 468 }, { x: 86, y: 428 },
    { x: 104, y: 448 }, { x: 92, y: 500 }, { x: 112, y: 552 },
    { x: 86, y: 610 }, { x: 108, y: 674 }, { x: 84, y: 744 },
    { x: 66, y: 806 }, { x: 54, y: 822 },
  ];
  fillPoly(c, trunk, BROWN, INK, 2.6);

  // Bark: short flat strokes, no shading.
  const rand = rngFor(88);
  c.strokeStyle = alpha(INK, 0.55);
  c.lineWidth = 1.3;
  for (let i = 0; i < 26; i += 1) {
    const y = 460 + rand() * 350;
    const x = 26 + (y < 620 ? rand() * 60 : rand() * 40);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 8 + rand() * 10, y + 4);
    c.stroke();
  }

  // Branches.
  const branches = [
    { pts: [{ x: 84, y: 520 }, { x: 150, y: 486 }, { x: 226, y: 462 }, { x: 300, y: 442 }], w: 7 },
    { pts: [{ x: 60, y: 600 }, { x: 4, y: 570 }, { x: -66, y: 552 }, { x: -140, y: 540 }], w: 7 },
    { pts: [{ x: 92, y: 440 }, { x: 150, y: 398 }, { x: 210, y: 380 }], w: 5.5 },
    { pts: [{ x: 42, y: 700 }, { x: -20, y: 676 }, { x: -80, y: 664 }], w: 5 },
    { pts: [{ x: 86, y: 610 }, { x: 140, y: 546 }, { x: 178, y: 490 }], w: 4.5 },
    { pts: [{ x: 62, y: 640 }, { x: 44, y: 616 }, { x: 36, y: 604 }], w: 4 },
    { pts: [{ x: 66, y: 470 }, { x: 20, y: 418 }, { x: -16, y: 394 }], w: 5 },
  ];
  for (const br of branches) {
    const pts = br.pts;
    c.strokeStyle = INK;
    c.lineWidth = br.w + 5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.strokeStyle = BROWN;
    c.lineWidth = br.w;
    c.stroke();
  }
  c.lineCap = 'butt';

  // A few deep-green pads read as back branches, not a cast shadow.
  needlePad(c, 300, 474, 56, 28, 201, PINE_D);
  needlePad(c, -126, 566, 46, 24, 202, PINE_D);
  needlePad(c, 62, 522, 42, 22, 203, PINE_D);

  needlePad(c, 340, 416, 70, 38, 301);
  needlePad(c, 250, 382, 76, 38, 302);
  needlePad(c, 160, 356, 70, 34, 303);
  needlePad(c, 68, 362, 66, 32, 304);
  needlePad(c, -30, 372, 64, 32, 305);
  needlePad(c, -118, 408, 58, 30, 306);
  needlePad(c, -176, 470, 52, 28, 307);
  needlePad(c, 182, 462, 50, 26, 308);
  needlePad(c, 20, 556, 44, 22, 309);
  needlePad(c, 312, 462, 40, 20, 310);
}

function drawFallenNeedles(c) {
  const rand = rngFor(411);
  c.lineCap = 'round';
  for (let i = 0; i < 30; i += 1) {
    const x = 100 + rand() * 340;
    const y = 866 + rand() * 58;
    const a = (rand() - 0.5) * 2.4;
    const len = 3 + rand() * 8;
    c.strokeStyle = rand() > 0.5 ? PINE_D : alpha(INK, 0.5);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  c.lineCap = 'butt';
}

// ---------------------------------------------------------------- milestone

function drawMilestone(c) {
  // Mound of the ichirizuka.
  fillPoly(c, [
    { x: 150, y: 826 }, { x: 164, y: 806 }, { x: 198, y: 796 },
    { x: 242, y: 798 }, { x: 270, y: 812 }, { x: 278, y: 826 },
  ], '#b3a681', INK, 1.8);

  // Stone stele.
  const stone = [
    { x: 190, y: 802 }, { x: 190, y: 746 }, { x: 198, y: 734 },
    { x: 240, y: 734 }, { x: 248, y: 746 }, { x: 248, y: 802 },
  ];
  fillPoly(c, stone, '#d5ccb4', INK, 2.1);

  const chars = ['一', '里', '塚'];
  chars.forEach((ch, i) => {
    ctext(c, ch, 219, 752 + i * 16, 15, INK, CN_FONT, 600, '0px');
  });

  // Grass tufts on the mound.
  c.strokeStyle = PINE_D;
  c.lineWidth = 1.6;
  const rand = rngFor(61);
  for (let i = 0; i < 22; i += 1) {
    const x = 152 + rand() * 124;
    const y = 808 + rand() * 16;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 3 + rand() * 6, y - 6 - rand() * 9);
    c.stroke();
  }
}

// ---------------------------------------------------------------- teahouse

function drawTeahouse(c) {
  // Back wall.
  fillPoly(c, [
    { x: 958, y: 646 }, { x: 1244, y: 646 }, { x: 1244, y: 822 },
    { x: 958, y: 822 },
  ], '#ded0b3', INK, 2.2);

  // Dark interior.
  fillPoly(c, [
    { x: 970, y: 664 }, { x: 1232, y: 664 }, { x: 1232, y: 806 },
    { x: 970, y: 806 },
  ], '#3a3b32', null, 0);

  // Counter and bench.
  fillPoly(c, [
    { x: 968, y: 786 }, { x: 1234, y: 786 }, { x: 1234, y: 800 },
    { x: 968, y: 800 },
  ], BROWN, INK, 1.8);
  // Vermilion cloth over part of the bench (the era accent inside the house).
  fillPoly(c, [
    { x: 1130, y: 780 }, { x: 1200, y: 780 }, { x: 1200, y: 798 },
    { x: 1130, y: 798 },
  ], VERM, INK, 1.6);

  // Posts.
  for (const x of [958, 1090, 1244]) {
    fillPoly(c, [
      { x: x - 5, y: 646 }, { x: x + 5, y: 646 }, { x: x + 5, y: 822 },
      { x: x - 5, y: 822 },
    ], BROWN, INK, 1.6);
  }

  // Roof: a broad thatch trapezoid with a ridge.
  const roof = [
    { x: 916, y: 624 }, { x: 952, y: 552 }, { x: 1074, y: 494 },
    { x: 1194, y: 538 }, { x: 1280, y: 624 }, { x: 1246, y: 640 },
    { x: 950, y: 640 },
  ];
  fillPoly(c, roof, '#5b5645', INK, 2.6);

  // Thatch strokes follow the slope, flat lines.
  c.strokeStyle = alpha('#3f3c32', 0.85);
  c.lineWidth = 1.5;
  const rand = rngFor(303);
  for (let i = 0; i < 90; i += 1) {
    const x = 930 + rand() * 336;
    const yTop = 500 + Math.abs(x - 1074) * 0.18;
    const y0 = yTop + rand() * 60;
    c.beginPath();
    c.moveTo(x, y0);
    c.lineTo(x - 2, Math.min(638, y0 + 8 + rand() * 14));
    c.stroke();
  }
  // Ridge cap.
  fillPoly(c, [
    { x: 1044, y: 492 }, { x: 1074, y: 482 }, { x: 1106, y: 486 },
    { x: 1216, y: 534 }, { x: 1204, y: 546 }, { x: 1100, y: 498 },
  ], '#2f3b3a', INK, 1.8);

  // Eave line and brackets.
  line(c, 916, 624, 1280, 624, INK, 2.8);
  for (const x of [946, 1046, 1146, 1246]) {
    line(c, x, 626, x, 644, INK, 2);
  }

  // Noren curtain, with a slipped indigo block (visible misregistration).
  c.fillStyle = alpha(PRUSSIAN, 0.45);
  c.fillRect(1120 - 3, 656 + 3, 78, 84);
  c.fillStyle = PRUSSIAN;
  c.fillRect(1120, 656, 78, 84);
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.strokeRect(1120, 656, 78, 84);
  line(c, 1159, 658, 1159, 738, INK, 1.5);
  disc(c, 1159, 690, 13, PAPER_L, INK, 1.4);
  ctext(c, '茶', 1159, 691, 16, PRUSSIAN, CN_FONT, 700, '0px');

  // Kettle on the counter, clear of the guests and the noren.
  disc(c, 1078, 772, 11, '#2b2b26', INK, 1.6);
  c.strokeStyle = INK;
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(1078, 772, 9, Math.PI * 0.9, Math.PI * 1.9);
  c.stroke();
  line(c, 1088, 768, 1097, 762, INK, 2);

  // Nobori banner at the right edge.
  line(c, 1272, 830, 1272, 598, INK, 5);
  line(c, 1272, 830, 1272, 598, BROWN, 2.4);
  c.fillStyle = VERM;
  c.fillRect(1254, 602, 42, 132);
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.strokeRect(1254, 602, 42, 132);
  c.strokeStyle = alpha(PAPER_L, 0.9);
  c.lineWidth = 1.2;
  c.strokeRect(1258, 606, 34, 124);
  ctext(c, '茶', 1275, 668, 26, PAPER_L, CN_FONT, 700, '0px');

  // Seated traveler on the bench.
  drawSeatedTraveler(c);
}

function drawSeatedTraveler(c) {
  c.save();
  c.translate(1210, 792);

  // Legs hanging.
  line(c, -8, 8, -18, 24, INK, 8);
  line(c, -8, 8, -18, 24, '#d8c9a8', 4);
  line(c, 10, 8, 4, 26, INK, 8);
  line(c, 10, 8, 4, 26, '#d8c9a8', 4);

  // Body, flat indigo.
  fillPoly(c, [
    { x: -18, y: 14 }, { x: 20, y: 14 }, { x: 15, y: -44 },
    { x: -15, y: -44 },
  ], '#4b6273', INK, 2);

  // Head.
  disc(c, -2, -56, 12, '#e8d3ae', INK, 1.8);
  // Kasa.
  fillPoly(c, [
    { x: -30, y: -60 }, { x: -2, y: -76 }, { x: 26, y: -60 },
    { x: 20, y: -56 }, { x: -24, y: -56 },
  ], OCHRE, INK, 1.6);
  line(c, -2, -76, -2, -88, INK, 2);

  // Tea cup.
  disc(c, -24, 4, 5, PAPER_L, INK, 1.4);
  c.restore();
}

// ---------------------------------------------------------------- signpost

function drawSignpost(c) {
  const px = 800;

  // Post and cap.
  fillPoly(c, [
    { x: px - 7, y: 822 }, { x: px + 7, y: 822 },
    { x: px + 7, y: 452 }, { x: px - 7, y: 452 },
  ], BROWN, INK, 2.2);
  for (let y = 470; y < 810; y += 26) {
    line(c, px - 5, y, px + 5, y + 3, alpha(INK, 0.35), 1);
  }
  fillPoly(c, [
    { x: px - 42, y: 456 }, { x: px, y: 432 }, { x: px + 42, y: 456 },
    { x: px + 34, y: 462 }, { x: px - 34, y: 462 },
  ], '#4f5147', INK, 2);
  drawCrow(c, px + 22, 431);

  // Top board: 東海道.
  board(c, px - 100, 470, 200, 58, '東海道', 38);
  // Lower board: 五十三次.
  board(c, px - 118, 548, 236, 58, '五十三次', 33);

  // Small hanging plaque: 鹈鹕, with a tiny print of the bird.
  const tagX = 756;
  const tagY = 620;
  line(c, px, 606, tagX + 28, 618, INK, 1.6);
  line(c, px, 606, tagX + 48, 618, INK, 1.6);
  fillPoly(c, [
    { x: tagX, y: tagY }, { x: tagX + 58, y: tagY },
    { x: tagX + 58, y: tagY + 128 }, { x: tagX, y: tagY + 128 },
  ], PAPER_L, INK, 2);

  // Tiny pelican: body, beak, wheel.
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(tagX + 24, tagY + 22, 13, 9, -0.18, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(tagX + 32, tagY + 18);
  c.lineTo(tagX + 50, tagY + 22);
  c.lineTo(tagX + 33, tagY + 27);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(tagX + 18, tagY + 38, 6, 0, TAU);
  c.strokeStyle = INK;
  c.lineWidth = 1.6;
  c.stroke();
  c.beginPath();
  c.arc(tagX + 38, tagY + 38, 6, 0, TAU);
  c.stroke();

  // Vertical gag text.
  ['鹈', '鹕'].forEach((ch, i) => {
    ctext(c, ch, tagX + 29, tagY + 68 + i * 28, 24, INK, CN_FONT, 700, '0px');
  });
}

function drawCrow(c, x, y) {
  c.save();
  c.translate(x, y);
  // Body.
  c.fillStyle = INK;
  c.strokeStyle = INK;
  c.lineWidth = 1.4;
  c.beginPath();
  c.ellipse(0, -7, 11, 7, -0.12, 0, TAU);
  c.fill();
  // Head.
  c.beginPath();
  c.arc(-10, -12, 5, 0, TAU);
  c.fill();
  // Beak.
  c.beginPath();
  c.moveTo(-14, -13);
  c.lineTo(-22, -11);
  c.lineTo(-14, -9);
  c.closePath();
  c.fill();
  // Tail.
  c.beginPath();
  c.moveTo(8, -8);
  c.lineTo(20, -3);
  c.lineTo(8, -3);
  c.closePath();
  c.fill();
  // Legs.
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-3, 0);
  c.lineTo(-3, 3);
  c.moveTo(4, 0);
  c.lineTo(4, 3);
  c.stroke();
  // Eye.
  c.fillStyle = PAPER_L;
  c.beginPath();
  c.arc(-11, -13, 1.1, 0, TAU);
  c.fill();
  c.restore();
}

function board(c, x, y, w, h, text, size) {
  // Cream block slipped a hair under the keyblock, as a print would.
  c.fillStyle = PAPER_L;
  c.fillRect(x + 1.5, y - 1.5, w, h);
  c.strokeStyle = INK;
  c.lineWidth = 2.4;
  c.strokeRect(x, y, w, h);
  c.lineWidth = 1;
  c.strokeRect(x + 5, y + 5, w - 10, h - 10);
  ctext(c, text, x + w / 2, y + h / 2 + 1, size, INK, CN_FONT, 700, text.length > 3 ? '1px' : '5px');
}

function drawFarWalkers(c) {
  // Two tiny pilgrims on the far edge of the road, walking toward the pass.
  for (const [x, h, col] of [[1332, 46, '#3f5a6e'], [1362, 41, '#4c6070']]) {
    const y = 812;
    line(c, x, y, x, y - h * 0.62, INK, 1.8);
    fillPoly(c, [
      { x: x - h * 0.13, y: y - h * 0.18 }, { x: x + h * 0.13, y: y - h * 0.18 },
      { x: x + h * 0.1, y: y - h * 0.62 }, { x: x - h * 0.1, y: y - h * 0.62 },
    ], col, INK, 1.2);
    disc(c, x, y - h * 0.72, h * 0.1, OCHRE, INK, 1.2);
    line(c, x + h * 0.05, y - h * 0.3, x + h * 0.3, y - h * 0.1, INK, 1.6);
  }
}

// ---------------------------------------------------------------- foreground

function drawForeground(c, rand) {
  // Flat ground below the near edge.
  c.fillStyle = alpha('#c9b997', 0.7);
  c.fillRect(PRINT.x0, NEAR_EDGE, PRINT.w, 1100 - NEAR_EDGE);
  c.fillStyle = alpha('#b7a67f', 0.55);
  c.fillRect(PRINT.x0, NEAR_EDGE, PRINT.w, 10);
  line(c, PRINT.x0, NEAR_EDGE, 1600, NEAR_EDGE, INK, 2.6);

  // Grass tufts along the verge.
  c.strokeStyle = PINE_D;
  c.lineWidth = 1.7;
  for (let i = 0; i < 56; i += 1) {
    const x = -790 + rand() * 2380;
    const y = NEAR_EDGE + 6 + rand() * 74;
    const len = 5 + rand() * 13;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (rand() - 0.5) * 8, y - len * 0.6, x + (rand() - 0.5) * 12, y - len);
    c.stroke();
  }
  c.strokeStyle = PINE;
  c.lineWidth = 1.2;
  for (let i = 0; i < 34; i += 1) {
    const x = -790 + rand() * 2380;
    const y = NEAR_EDGE + 8 + rand() * 60;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (rand() - 0.5) * 14, y - 6 - rand() * 10);
    c.stroke();
  }

  // A few flat stones.
  for (let i = 0; i < 12; i += 1) {
    const x = -700 + rand() * 2200;
    const y = NEAR_EDGE + 20 + rand() * 64;
    c.fillStyle = alpha('#8f8164', 0.45);
    c.beginPath();
    c.ellipse(x, y, 3 + rand() * 7, 2 + rand() * 4, 0, 0, TAU);
    c.fill();
  }

  // Tall reeds at the frame edges, cropped by the print.
  reedClump(c, 1358, 1008, 61);
  reedClump(c, 1300, 1026, 62);
  reedClump(c, -348, 1004, 63);
  reedClump(c, -292, 1022, 64);
  // A flat stone at the lower left.
  fillPoly(c, [
    { x: -210, y: 1012 }, { x: -180, y: 998 }, { x: -142, y: 1002 },
    { x: -126, y: 1014 }, { x: -188, y: 1020 },
  ], '#b3a681', INK, 1.8);
}

function reedClump(c, x, y, seed) {
  const rand = rngFor(seed);
  c.lineCap = 'round';
  for (let i = 0; i < 16; i += 1) {
    const bx = x + (rand() - 0.5) * 84;
    const h = 38 + rand() * 86;
    const lean = (rand() - 0.5) * 32;
    c.strokeStyle = i % 5 === 0 ? INK : PINE_D;
    c.lineWidth = 1.6 + rand() * 1.3;
    c.beginPath();
    c.moveTo(bx, y);
    c.quadraticCurveTo(bx + lean * 0.3, y - h * 0.6, bx + lean, y - h);
    c.stroke();
    if (i % 3 === 0) {
      c.fillStyle = alpha(OCHRE, 0.9);
      c.beginPath();
      c.ellipse(bx + lean, y - h, 2.4, 6, lean * 0.02, 0, TAU);
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 0.9;
      c.stroke();
    }
  }
  c.lineCap = 'butt';
}

function drawWear(c, rand) {
  // Paper absorbency: broad soft stains over the printed surface.
  for (let i = 0; i < 26; i += 1) {
    const x = PRINT.x0 + rand() * PRINT.w;
    const y = PRINT.y0 + rand() * (1100 - PRINT.y0);
    const r = 80 + rand() * 260;
    const warm = rand() > 0.5;
    const stain = c.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, alpha(warm ? '#8a6d42' : '#ffffff', 0.02 + rand() * 0.028));
    stain.addColorStop(1, alpha(warm ? '#8a6d42' : '#ffffff', 0));
    c.fillStyle = stain;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Block wear: small ink and paper flecks, deterministic.
  for (let i = 0; i < 190; i += 1) {
    const x = PRINT.x0 + rand() * PRINT.w;
    const y = PRINT.y0 + rand() * (1100 - PRINT.y0);
    const r = 0.5 + rand() * 1.7;
    c.fillStyle = alpha(rand() > 0.45 ? INK : PAPER_L, 0.05 + rand() * 0.1);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  // Paper fibres. Drawn with no ground, so they also sit over the live road.
  c.lineCap = 'round';
  for (let i = 0; i < 240; i += 1) {
    const x = PRINT.x0 + rand() * PRINT.w;
    const y = PRINT.y0 + rand() * (1100 - PRINT.y0);
    const len = 4 + rand() * 22;
    const a = (rand() - 0.5) * 0.5 + (rand() > 0.75 ? Math.PI / 2 : 0);
    c.strokeStyle = alpha(rand() > 0.5 ? '#7a5f3a' : '#fffaf0', 0.035 + rand() * 0.055);
    c.lineWidth = 0.6 + rand() * 0.8;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  c.lineCap = 'butt';

  // Three hairline scratches in the block.
  c.strokeStyle = alpha(INK, 0.08);
  c.lineWidth = 0.8;
  for (const [x, y, len] of [[-260, 240, 300], [620, 360, 210], [980, 660, 260]]) {
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y + 6, x + len, y + 2);
    c.stroke();
  }
}

// ---------------------------------------------------------------- live print

function drawCartRuts(g) {
  const c = g.drawingContext;
  c.save();
  // Flat tonal bands in the road, like separate colour blocks.
  c.fillStyle = alpha('#8f7a55', 0.055);
  c.fillRect(PRINT.x0, 800, PRINT.w, 34);
  c.fillStyle = alpha('#f2e7ce', 0.08);
  c.fillRect(PRINT.x0, 872, PRINT.w, 26);
  // Faint woodgrain in the flat road block.
  const grainRand = rngFor(1501);
  c.lineWidth = 1;
  for (let i = 0; i < 26; i += 1) {
    const y = 798 + i * 4.8;
    c.strokeStyle = alpha('#6e5a3b', 0.018 + grainRand() * 0.022);
    c.beginPath();
    c.moveTo(PRINT.x0, y);
    c.lineTo(1600, y + (grainRand() - 0.5) * 2);
    c.stroke();
  }
  c.strokeStyle = alpha(INK, 0.13);
  c.lineWidth = 2;
  for (const y of [844, 872, 898]) {
    c.beginPath();
    c.moveTo(PRINT.x0, y);
    c.lineTo(1600, y + 2);
    c.stroke();
  }
  c.restore();
}

function drawSteam(g, ctx) {
  const c = g.drawingContext;
  c.save();
  c.strokeStyle = alpha(PAPER_L, 0.7);
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const ph = ctx.local * 0.7 + i * 1.9;
    const x0 = 1078 + i * 5;
    c.beginPath();
    c.moveTo(x0, 762);
    c.bezierCurveTo(
      x0 + 16 + Math.sin(ph) * 8, 738,
      x0 - 16 + Math.cos(ph) * 8, 716,
      x0 + 4 + Math.sin(ph + 1.2) * 10, 694 - i * 4,
    );
    c.stroke();
  }
  c.restore();
}

function drawTeahouseGirl(g, ctx) {
  const c = g.drawingContext;
  const wave = Math.sin(TAU * ctx.local) * 0.5 + Math.sin(TAU * ctx.local * 0.5) * 0.5;

  c.save();
  c.translate(1002, 854);
  c.scale(1.08, 1.08);

  // Kimono, widening at the hem.
  fillPoly(c, [
    { x: -28, y: 0 }, { x: 27, y: 0 }, { x: 18, y: -118 },
    { x: -18, y: -118 },
  ], KIMONO, INK, 2.2);
  // Cream under-robe at the hem.
  fillPoly(c, [
    { x: -28, y: 0 }, { x: 27, y: 0 }, { x: 25, y: -9 },
    { x: -26, y: -9 },
  ], PAPER_L, INK, 1.4);
  // Collar.
  fillPoly(c, [
    { x: -10, y: -116 }, { x: 0, y: -86 }, { x: 10, y: -116 },
    { x: 4, y: -116 }, { x: 0, y: -100 }, { x: -4, y: -116 },
  ], PAPER_L, INK, 1.2);
  // Obi.
  fillPoly(c, [
    { x: -23, y: -72 }, { x: 22, y: -72 }, { x: 21, y: -54 },
    { x: -22, y: -54 },
  ], OCHRE, INK, 1.6);
  line(c, -22, -63, 21, -63, alpha(INK, 0.5), 1.2);

  // Flat komon dots on the indigo.
  c.fillStyle = alpha(PAPER_L, 0.55);
  const dots = [[-14, -40], [-4, -30], [8, -44], [-16, -20], [4, -16], [14, -34], [-8, -50]];
  for (const [x, y] of dots) {
    c.beginPath();
    c.arc(x, y, 1.8, 0, TAU);
    c.fill();
  }

  // Sandals.
  line(c, -10, 2, -17, 8, INK, 5);
  line(c, 8, 2, 14, 8, INK, 5);

  // Head.
  disc(c, 0, -134, 13.5, '#f0ddbb', INK, 2);
  // Hair: black cap and bun, comb.
  c.fillStyle = '#232226';
  c.beginPath();
  c.arc(0, -137, 14.1, Math.PI * 1.0, Math.PI * 2.05);
  c.fill();
  c.beginPath();
  c.ellipse(11, -146, 7.5, 5, -0.5, 0, TAU);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-13, -138);
  c.quadraticCurveTo(-2, -150, 13, -140);
  c.stroke();
  // Vermilion comb.
  c.fillStyle = VERM;
  c.fillRect(-3, -152, 10, 3);

  // Face, looking left toward the pelican.
  c.fillStyle = INK;
  c.beginPath();
  c.ellipse(-5.5, -134, 1.7, 1.2, 0, 0, TAU);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(-9, -138.5);
  c.lineTo(-3, -138.2);
  c.stroke();
  c.beginPath();
  c.moveTo(-5, -127);
  c.lineTo(-1.5, -127);
  c.stroke();
  // Ear.
  c.beginPath();
  c.arc(11, -132, 3.2, -1.2, 1.2);
  c.stroke();

  // Hanging sleeve on the far side.
  fillPoly(c, [
    { x: 13, y: -112 }, { x: 26, y: -108 }, { x: 30, y: -64 },
    { x: 18, y: -66 },
  ], KIMONO_D, INK, 1.8);

  // Raised pointing sleeve: arm tube plus the big drape of a kimono sleeve.
  const hx = -70;
  const hy = -138 + wave * 2.4;
  fillPoly(c, [
    { x: -12, y: -114 }, { x: -28, y: -123 },
    { x: hx - 4, y: hy - 6 }, { x: hx + 3, y: hy + 5 },
    { x: -26, y: -96 },
  ], KIMONO, INK, 2);
  fillPoly(c, [
    { x: -40, y: -127 }, { x: hx - 1, y: hy - 3 },
    { x: hx + 3, y: hy + 9 }, { x: -38, y: -88 },
  ], KIMONO_D, INK, 1.8);
  // Cream cuff and inner sleeve edge.
  line(c, hx - 3, hy - 5, hx + 3, hy + 6, PAPER_L, 2.4);
  line(c, -28, -112, hx - 1, hy - 1, alpha(PAPER_L, 0.7), 1.2);
  // Hand and index finger.
  disc(c, hx - 2, hy - 1, 4.6, '#f0ddbb', INK, 1.3);
  line(c, hx - 5, hy - 3, hx - 12, hy - 8, INK, 2.4);
  line(c, hx - 5, hy + 2, hx - 11, hy - 1, INK, 1.8);

  c.restore();
}

function drawBowingTraveler(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const settle = smoothstep(0.8, 2.0, local);
  const nod = Math.sin(TAU * (local - 2)) * smoothstep(1.6, 2.2, local);
  const bow = 0.5 + settle * 0.2 + nod * 0.055;

  c.save();
  c.translate(704, 884);

  // Lower robe and gaiters.
  fillPoly(c, [
    { x: -22, y: 0 }, { x: 20, y: 0 }, { x: 17, y: -44 },
    { x: 14, y: -72 }, { x: -16, y: -72 }, { x: -19, y: -44 },
  ], '#3d586c', INK, 2.2);
  // Split hem.
  line(c, 0, -4, 0, -42, INK, 1.4);
  // Gaiters, narrow strips with ties.
  fillPoly(c, [
    { x: -19, y: 0 }, { x: -7, y: 0 }, { x: -7, y: -14 }, { x: -17, y: -14 },
  ], PAPER_L, INK, 1.3);
  fillPoly(c, [
    { x: 4, y: 0 }, { x: 18, y: 0 }, { x: 16, y: -14 }, { x: 4, y: -14 },
  ], PAPER_L, INK, 1.3);
  line(c, -17, -10, -7, -10, INK, 1);
  line(c, 4, -10, 16, -10, INK, 1);
  // Straw sandals.
  line(c, -19, 0, -7, 2, INK, 4);
  line(c, 4, 1, 18, 2, INK, 4);

  // Bundle on the back (drawn before the torso): a flat pack, no ball.
  c.save();
  c.translate(16, -56);
  c.rotate(-bow * 0.45);
  fillPoly(c, [
    { x: -18, y: -12 }, { x: 12, y: -12 }, { x: 15, y: 12 }, { x: -15, y: 14 },
  ], '#d8c9a8', INK, 1.8);
  // Rolled mat on top of the pack.
  c.beginPath();
  c.ellipse(-1, -15, 16, 4.5, 0, 0, TAU);
  c.fillStyle = '#c4b08b';
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.3;
  c.stroke();
  // Ties.
  line(c, -4, -11, -4, 12, VERM, 2.2);
  line(c, -14, 0, 7, 0, alpha(INK, 0.5), 1.2);
  c.restore();

  // Torso and head rotate into the bow.
  c.save();
  c.translate(0, -68);
  c.rotate(-bow);

  // Torso.
  fillPoly(c, [
    { x: -17, y: 4 }, { x: 16, y: 4 }, { x: 13, y: -64 },
    { x: -13, y: -64 },
  ], '#3d586c', INK, 2.2);
  // Cream collar lines at the nape.
  line(c, -9, -64, -4, -48, PAPER_L, 2.4);
  line(c, 9, -64, 4, -48, PAPER_L, 2.4);
  // Obi.
  fillPoly(c, [
    { x: -17, y: -8 }, { x: 16, y: -8 }, { x: 16, y: -24 },
    { x: -17, y: -24 },
  ], OCHRE, INK, 1.4);
  // Back seam.
  line(c, 9, -60, 11, -30, alpha(INK, 0.4), 1.2);

  // Sleeves hanging toward the knees.
  fillPoly(c, [
    { x: -12, y: -60 }, { x: -24, y: -56 }, { x: -20, y: -6 },
    { x: -8, y: -4 },
  ], KIMONO_D, INK, 1.8);
  fillPoly(c, [
    { x: 11, y: -60 }, { x: 22, y: -56 }, { x: 18, y: -8 },
    { x: 7, y: -6 },
  ], '#314c60', INK, 1.8);
  // Hands.
  disc(c, -16, -1, 4, '#e8d3ae', INK, 1.2);
  disc(c, 14, -2, 4, '#e8d3ae', INK, 1.2);

  // Head, bowed.
  disc(c, 0, -78, 11.5, '#e8d3ae', INK, 1.9);
  c.fillStyle = '#232226';
  c.beginPath();
  c.arc(0, -80, 11.8, Math.PI * 1.0, Math.PI * 2.0);
  c.fill();
  // Topknot.
  c.beginPath();
  c.ellipse(7, -91, 5, 3, 0.4, 0, TAU);
  c.fill();
  // Downcast eye.
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-8, -77);
  c.lineTo(-3, -76);
  c.stroke();

  // Kasa hat.
  fillPoly(c, [
    { x: -34, y: -84 }, { x: 0, y: -108 }, { x: 34, y: -84 },
    { x: 26, y: -80 }, { x: -26, y: -80 },
  ], OCHRE, INK, 1.9);
  line(c, 0, -108, 0, -118, INK, 2.2);
  // Hat ribs.
  c.strokeStyle = alpha(INK, 0.35);
  c.lineWidth = 1;
  for (const x of [-22, -11, 11, 22]) {
    c.beginPath();
    c.moveTo(0, -106);
    c.lineTo(x, -82);
    c.stroke();
  }

  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- pelican

function ukiyoWheel(c, wheel, angle) {
  c.save();
  c.translate(wheel.x, wheel.y);

  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.beginPath();
  c.arc(0, 0, wheel.r, 0, TAU);
  c.stroke();

  c.strokeStyle = PRUSSIAN;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, wheel.r - 5, 0, TAU);
  c.stroke();

  c.strokeStyle = alpha(INK, 0.82);
  c.lineWidth = 1.5;
  for (let i = 0; i < 8; i += 1) {
    const a = angle + (i / 8) * TAU;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * (wheel.r - 6), Math.sin(a) * (wheel.r - 6));
    c.stroke();
  }

  // Vermilion valve block: the one spinning accent.
  c.fillStyle = VERM;
  c.beginPath();
  c.arc(Math.cos(angle) * (wheel.r - 11), Math.sin(angle) * (wheel.r - 11), 2.6, 0, TAU);
  c.fill();

  disc(c, 0, 0, 4.2, PAPER_L, INK, 1.8);
  c.restore();
}

function ukiyoLimb(c, a, b, w, fill) {
  line(c, a.x, a.y, b.x, b.y, INK, w + 4);
  line(c, a.x, a.y, b.x, b.y, fill, w);
}

function ukiyoLeg(c, hip, leg, far) {
  const col = far ? '#9a8a6c' : '#c98a3f';
  ukiyoLimb(c, hip, leg.knee, 6.5, col);
  ukiyoLimb(c, leg.knee, leg.ankle, 5.5, col);
  line(c, leg.ankle.x - 7, leg.ankle.y + 1, leg.ankle.x + 7, leg.ankle.y + 1, INK, 4.5);
}

function ukiyoPelican(c, pose) {
  // Tail.
  const tail = pose.tail;
  fillPoly(c, [
    { x: tail.x + 12, y: tail.y - 12 },
    { x: tail.x - 26, y: tail.y - 24 },
    { x: tail.x - 38, y: tail.y - 8 },
    { x: tail.x - 40, y: tail.y + 8 },
    { x: tail.x - 16, y: tail.y + 10 },
    { x: tail.x + 10, y: tail.y + 12 },
  ], '#eadfc7', INK, 2.4);
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    line(c, tail.x + 2, tail.y - 6 + i * 6, tail.x - 24, tail.y - 18 + i * 9, alpha(INK, 0.45), 1.2);
  }

  // Body.
  const b = pose.body;
  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  c.beginPath();
  c.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU);
  c.fillStyle = '#f6eedb';
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.8;
  c.stroke();
  // Flat belly plate, a separate cream block.
  c.fillStyle = '#ece0c6';
  c.beginPath();
  c.ellipse(4, 11, b.rx * 0.74, b.ry * 0.48, 0.05, 0, TAU);
  c.fill();
  // Keyblock feather lines on the rear.
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.2;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(-36 + i * 8, -18);
    c.quadraticCurveTo(-24 + i * 8, 0, -34 + i * 8, 18);
    c.stroke();
  }
  c.restore();

  // Neck.
  const n = pose.neck;
  c.strokeStyle = INK;
  c.lineWidth = 23;
  c.beginPath();
  c.moveTo(n[0].x, n[0].y);
  c.bezierCurveTo(n[1].x, n[1].y, n[2].x, n[2].y, n[3].x, n[3].y);
  c.stroke();
  c.strokeStyle = '#f6eedb';
  c.lineWidth = 16.5;
  c.stroke();

  // Head.
  const h = pose.head;
  disc(c, h.x, h.y, 18.5, '#f6eedb', INK, 2.7);

  // Crest.
  c.strokeStyle = INK;
  c.lineWidth = 2.4;
  for (let i = 0; i < 3; i += 1) {
    const a = -2.55 + i * 0.2;
    c.beginPath();
    c.moveTo(h.x + Math.cos(a) * 14, h.y + Math.sin(a) * 14);
    c.lineTo(h.x + Math.cos(a) * 26 - 3, h.y + Math.sin(a) * 26 - 3);
    c.stroke();
  }

  // Beak and pouch, flat ochre.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  const pg = pose.pouch;
  c.beginPath();
  c.moveTo(bb.x - 2, bb.y - 6);
  c.quadraticCurveTo(bb.x + 34, bb.y - 8, bt.x, bt.y - 3);
  c.quadraticCurveTo(bb.x + 52, bb.y + 2, bb.x - 2, bb.y + 2);
  c.closePath();
  c.fillStyle = '#c98a3f';
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2.3;
  c.stroke();

  c.beginPath();
  c.moveTo(bb.x + 2, bb.y + 2);
  c.quadraticCurveTo(bb.x + 54, bb.y + 8, bt.x - 16, bt.y + 2);
  c.quadraticCurveTo(pg.x - 10, pg.y + 12, bb.x + 8, bb.y + 18);
  c.quadraticCurveTo(bb.x - 2, bb.y + 10, bb.x + 2, bb.y + 2);
  c.closePath();
  c.fillStyle = '#d9a25a';
  c.fill();
  c.stroke();
  line(c, bb.x + 4, bb.y - 1, bt.x - 4, bt.y + 1, alpha(INK, 0.55), 1.2);

  // Eye: ink dot, cream glint, flat brow.
  c.fillStyle = PAPER_L;
  c.beginPath();
  c.arc(h.x + 7, h.y - 5, 4.6, 0, TAU);
  c.fill();
  c.fillStyle = INK;
  const open = 1 - pose.blink;
  c.beginPath();
  c.ellipse(h.x + 8.2, h.y - 5, 2.4, 2.4 * open, 0, 0, TAU);
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(h.x + 2, h.y - 11);
  c.quadraticCurveTo(h.x + 10, h.y - 13, h.x + 15, h.y - 9);
  c.stroke();

  // Near wing reaching the bar, flat with feather lines.
  const sh = pose.shoulder;
  const grip = pose.grip;
  c.strokeStyle = INK;
  c.lineWidth = 19;
  c.beginPath();
  c.moveTo(sh.x - 8, sh.y + 10);
  c.quadraticCurveTo(42, -172, grip.x - 2, grip.y - 3);
  c.stroke();
  c.strokeStyle = '#e8dbc0';
  c.lineWidth = 13;
  c.stroke();
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.2;
  for (let i = 0; i < 4; i += 1) {
    c.beginPath();
    c.moveTo(sh.x - 2 + i * 6, sh.y + 6 - i * 3);
    c.quadraticCurveTo(46 + i * 4, -168 - i * 2, grip.x - 4 + i * 2, grip.y - 8 + i * 4);
    c.stroke();
  }
  // Wrist feathers.
  c.strokeStyle = INK;
  c.lineWidth = 1.8;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(grip.x - 4, grip.y + 2);
    c.lineTo(grip.x - 14 - i * 3, grip.y + 10 + i * 3);
    c.stroke();
  }
}

function drawUkiyoRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);

  c.save();
  c.translate(468, 878);
  c.scale(1.16, 1.16);

  // Flat woodblock contact ruts under the tyres.
  c.save();
  c.fillStyle = alpha(INK, 0.2);
  for (const wx of [-72, 72]) {
    c.beginPath();
    c.ellipse(wx, 2, 42, 4.2, 0, 0, TAU);
    c.fill();
  }
  c.restore();

  // Wheels.
  ukiyoWheel(c, pose.wheels.rear, pose.wheelAngle);
  ukiyoWheel(c, pose.wheels.front, pose.wheelAngle);

  // Far leg, flat muted ochre.
  c.save();
  c.globalAlpha = 0.55;
  ukiyoLeg(c, pose.hip, pose.legs.far, true);
  c.restore();

  // Frame: vermilion lacquer with a keyblock edge.
  const f = pose.frame;
  const tubes = [
    [f.rearHub, f.crank],
    [f.crank, f.seatCluster],
    [f.seatCluster, f.rearHub],
    [f.crank, f.headTop],
    [f.seatCluster, f.headTop],
    [f.headTop, f.frontHub],
    [f.seatCluster, { x: f.saddle.x, y: f.saddle.y - 2 }],
  ];
  for (const [a, b] of tubes) {
    line(c, a.x, a.y, b.x, b.y, INK, 8.6);
    line(c, a.x, a.y, b.x, b.y, VERM, 4.4);
  }

  // Chainring and crank.
  disc(c, f.crank.x, f.crank.y, 18, PAPER_L, INK, 2.4);
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.2;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU + pose.crank;
    line(c, f.crank.x, f.crank.y, f.crank.x + Math.cos(a) * 15, f.crank.y + Math.sin(a) * 15, alpha(INK, 0.45), 1.2);
  }
  line(c, pose.crankCenter.x, pose.crankCenter.y, pose.pedals.near.x, pose.pedals.near.y, INK, 5);
  c.fillStyle = INK;
  c.fillRect(pose.pedals.near.x - 8, pose.pedals.near.y - 2, 16, 4);
  c.fillStyle = '#7f8c8a';
  c.fillRect(pose.pedals.far.x - 7, pose.pedals.far.y - 2, 14, 3.5);

  // Saddle and a vermilion saddle cloth peeking out at the sides.
  fillPoly(c, [
    { x: f.saddle.x - 27, y: f.saddle.y - 2 }, { x: f.saddle.x + 20, y: f.saddle.y - 2 },
    { x: f.saddle.x + 18, y: f.saddle.y + 9 }, { x: f.saddle.x - 25, y: f.saddle.y + 9 },
  ], VERM, INK, 1.8);
  c.beginPath();
  c.ellipse(f.saddle.x - 4, f.saddle.y - 3, 21, 6, -0.05, 0, TAU);
  c.fillStyle = INK;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 2;
  c.stroke();

  // Handlebar.
  line(c, f.stemTop.x, f.stemTop.y, 64, -146, INK, 7.6);
  line(c, 64, -146, 76, -148, INK, 7.6);
  line(c, 76, -148, pose.grip.x, pose.grip.y, INK, 7.6);
  line(c, 62, -146, pose.grip.x, pose.grip.y, PRUSSIAN, 3.6);

  // Pelican.
  ukiyoPelican(c, pose);

  // Near leg sits over the frame, foot on the near pedal.
  ukiyoLeg(c, pose.hip, pose.legs.near, false);

  c.restore();
}

// ---------------------------------------------------------------- title

function drawUkiyoTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const w = 140 * s;
  const h = 366 * s;
  const x = W - 206 * s;
  const y = 64 * s + lift * 0.3 * s;

  c.save();
  c.globalAlpha = opacity;

  // Paper panel with keyblock border.
  c.fillStyle = '#efe6d0';
  c.fillRect(x, y, w, h);
  c.strokeStyle = INK;
  c.lineWidth = 2.6 * s;
  c.strokeRect(x, y, w, h);
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1 * s;
  c.strokeRect(x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s);

  // Index in vermilion.
  setFont(c, 12 * s, 700, EN_FONT, '2px');
  c.fillStyle = VERM;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('11  /  20', x + w / 2, y + 24 * s);

  // Vertical Chinese title.
  const chars = ['浮', '世', '绘'];
  chars.forEach((ch, i) => {
    ctext(c, ch, x + w / 2, y + (62 + i * 52) * s, 42 * s, INK, CN_FONT, 600, '1px');
  });

  // Hairline rule.
  c.strokeStyle = alpha(INK, 0.45);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 30 * s, y + 202 * s);
  c.lineTo(x + w - 30 * s, y + 202 * s);
  c.stroke();

  // English and date.
  setFont(c, 14 * s, 600, EN_FONT, '1.6px');
  c.fillStyle = INK;
  c.fillText('UKIYO-E', x + w / 2, y + 224 * s);
  setFont(c, 12 * s, 400, EN_FONT, '1.2px');
  c.fillStyle = alpha(INK, 0.78);
  c.fillText('1830s', x + w / 2, y + 246 * s);
  ctext(c, '东海道', x + w / 2, y + 270 * s, 14 * s, alpha(INK, 0.9), CN_FONT, 500, '1px');

  // Red seal, two white characters.
  const sw = 42 * s;
  const sh = 50 * s;
  const sx = x + w / 2 - sw / 2;
  const sy = y + 288 * s;
  c.fillStyle = VERM;
  c.fillRect(sx, sy, sw, sh);
  c.strokeStyle = alpha(INK, 0.25);
  c.lineWidth = 1 * s;
  c.strokeRect(sx, sy, sw, sh);
  ctext(c, '鹈', x + w / 2, sy + 15 * s, 20 * s, '#f4ead6', CN_FONT, 700, '0px');
  ctext(c, '鹕', x + w / 2, sy + 36 * s, 20 * s, '#f4ead6', CN_FONT, 700, '0px');

  // Slight block slip on the seal: a vermilion ghost edge.
  c.fillStyle = alpha(VERM, 0.35);
  c.fillRect(sx + 2 * s, sy + 2 * s, sw, 2 * s);

  c.restore();
}
