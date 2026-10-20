// 1 — Saharan rock art (Tassili style). Ochre and kaolin on a sandstone wall.
// The herd stops; the pelican does not. Base rock and figures are cached; the
// rider, tails, dust and path texture are live.

import { basePalette } from './_placeholder.js';
import { alpha, mix } from '../kit/color.js';
import { rngFor, noise1, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { SPEED } from '../kit/road.js';

const pal = basePalette({
  bg: '#c98a4e', bg2: '#b9743f', motif: '#8d3f20', accent: '#f6e2b8',
  ink: '#3a1e11', titleInk: '#2f1a0e', ground: '#b97b3c', road: '#a86a32',
  dash: '#f1d9a5', body: '#f6ead1', beak: '#b4552b', rigInk: '#2a160c',
  scrim: '#3a1e11',
});

const CATTLE = [
  { x: 980, h: 116, color: '#e8d5b0', seed: 11, hump: 0.5 },
  { x: 1160, h: 136, color: '#8f3520', seed: 12, hump: 0.8, dots: true },
  { x: 1330, h: 96, color: '#f0dcb4', seed: 13, hump: 0.4 },
  { x: 1500, h: 126, color: '#6f2a18', seed: 14, hump: 0.7, dots: true },
  { x: 1245, h: 70, color: '#d9b07c', seed: 15, hump: 0.3, calf: true },
];
const HERD_SCROLL = 42;
const HERD_X0 = 500;
const HERD_Y0 = 450;

export default {
  id: 's01',
  number: 1,
  cn: '撒哈拉岩画',
  en: 'Saharan Rock Art',
  year: '约前4000 · 塔西里',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const rock = cachedLayer(ctx, 's01-rock', drawRock, {
      x0: CACHE.x0, y0: CACHE.y0, w: CACHE.w, h: CACHE.h,
    });
    c.drawImage(rock.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
    drawFarBank(g);

    const scroll = ctx.local * HERD_SCROLL;
    const herd = cachedLayer(ctx, 's01-herd', drawHerd, {
      x0: HERD_X0, y0: HERD_Y0, w: 1600, h: 600,
    });
    c.drawImage(herd.canvas, HERD_X0 - scroll, HERD_Y0, 1600, 600);

    drawLiveTails(c, ctx, scroll);
    drawPath(g, ctx);
    drawRockRider(g, ctx);
    drawDust(g, ctx);
    drawScratches(c, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0, local = 0 } = {}) {
    drawRockTitle(g, opacity, lift, local);
  },
};

// ---------------------------------------------------------------- rock base

function rockNoiseCanvas(w = 700, h = 420, seed = 7) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const n = 64;
  const grids = [0, 1, 2].map((k) => {
    const rand = rngFor(seed + k * 97);
    const a = new Float32Array(n * n);
    for (let i = 0; i < a.length; i += 1) a[i] = rand();
    return a;
  });
  const sample = (grid, x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % n) + n) % n;
    const y0 = ((iy % n) + n) % n;
    const x1 = (x0 + 1) % n;
    const y1 = (y0 + 1) % n;
    const a = grid[y0 * n + x0];
    const b = grid[y0 * n + x1];
    const c = grid[y1 * n + x0];
    const d = grid[y1 * n + x1];
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
  const dark = [128, 66, 34];
  const base = [189, 124, 69];
  const light = [225, 170, 104];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = (x / w) * 6;
      const v = (y / h) * 6;
      let f =
        0.5 * sample(grids[0], u, v) +
        0.32 * sample(grids[1], u * 3.1 + 11, v * 3.1 + 7) +
        0.18 * sample(grids[2], u * 8.3 + 3, v * 8.3 + 19);
      f = Math.max(0, Math.min(1, (f - 0.2) * 1.55));
      let r;
      let g;
      let b;
      if (f < 0.5) {
        const k = f * 2;
        r = dark[0] + (base[0] - dark[0]) * k;
        g = dark[1] + (base[1] - dark[1]) * k;
        b = dark[2] + (base[2] - dark[2]) * k;
      } else {
        const k = (f - 0.5) * 2;
        r = base[0] + (light[0] - base[0]) * k;
        g = base[1] + (light[1] - base[1]) * k;
        b = base[2] + (light[2] - base[2]) * k;
      }
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function drawRock(g, c) {
  const rand = rngFor(101);
  c.fillStyle = '#bd7c45';
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.globalAlpha = 0.9;
  c.drawImage(rockNoiseCanvas(), CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.globalAlpha = 1;

  // Broad mineral patches.
  for (let i = 0; i < 34; i += 1) {
    const x = CACHE.x0 + rand() * CACHE.w;
    const y = CACHE.y0 + rand() * CACHE.h;
    const r = 80 + rand() * 320;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.55;
    gr.addColorStop(0, alpha(light ? '#e0aa63' : '#8f4f2b', 0.1 + rand() * 0.14));
    gr.addColorStop(1, alpha(light ? '#e0aa63' : '#8f4f2b', 0));
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Sedimentary strata.
  for (let band = 0; band < 11; band += 1) {
    const yBase = CACHE.y0 + 30 + band * 96;
    c.beginPath();
    for (let x = CACHE.x0 - 20; x <= CACHE.x0 + CACHE.w + 20; x += 24) {
      const y = yBase + noise1(x * 0.003 + band * 4.1, 7 + band) * 20;
      if (x === CACHE.x0 - 20) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    for (let x = CACHE.x0 + CACHE.w + 20; x >= CACHE.x0 - 20; x -= 24) {
      const y = yBase + 14 + noise1(x * 0.0027 + band * 2.3, 71 + band) * 18;
      c.lineTo(x, y);
    }
    c.closePath();
    c.fillStyle = alpha(band % 3 === 0 ? '#8d4a27' : '#dda15b', 0.08 + (band % 4) * 0.015);
    c.fill();
  }

  // Granular rock noise.
  for (let i = 0; i < 21000; i += 1) {
    const x = CACHE.x0 + rand() * CACHE.w;
    const y = CACHE.y0 + rand() * CACHE.h;
    const r = 0.4 + rand() * 1.8;
    c.fillStyle = alpha(rand() > 0.55 ? '#5b2c18' : '#f0c283', 0.04 + rand() * 0.14);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  // Cracks and flaking edges.
  for (let i = 0; i < 14; i += 1) {
    const x = CACHE.x0 + 80 + rand() * (CACHE.w - 160);
    const y = CACHE.y0 + rand() * 240;
    drawCrack(c, x, y, 80 + rand() * 190, rand, 200 + i);
  }
  for (let i = 0; i < 9; i += 1) {
    const x = CACHE.x0 + 100 + rand() * (CACHE.w - 200);
    const y = CACHE.y0 + CACHE.h - 210 - rand() * 120;
    drawCrack(c, x, y, 60 + rand() * 140, rand, 300 + i);
  }

  // A low, jagged cave overhang. It frames the wall without becoming a dune.
  const edge = [
    [-500, 178], [-380, 148], [-300, 168], [-210, 122], [-120, 150],
    [-40, 108], [50, 138], [140, 96], [230, 126], [330, 82],
    [420, 110], [510, 62], [600, 88], [660, 42],
  ];
  c.beginPath();
  c.moveTo(CACHE.x0 - 60, CACHE.y0 - 60);
  c.lineTo(700, CACHE.y0 - 60);
  for (let i = edge.length - 1; i >= 0; i -= 1) c.lineTo(edge[i][0], edge[i][1]);
  c.closePath();
  const oh = c.createLinearGradient(0, -50, 0, 190);
  oh.addColorStop(0, 'rgba(46, 20, 9, 0.98)');
  oh.addColorStop(0.6, 'rgba(78, 35, 16, 0.94)');
  oh.addColorStop(1, 'rgba(122, 58, 27, 0.72)');
  c.fillStyle = oh;
  c.fill();
  c.strokeStyle = 'rgba(232, 172, 101, 0.24)';
  c.lineWidth = 2.4;
  c.stroke();

  // Chips and cracks hanging from the lip.
  const orand = rngFor(812);
  for (let i = 0; i < 26; i += 1) {
    const x = -460 + orand() * 1080;
    const y = 90 + orand() * 90;
    c.strokeStyle = alpha('#3c1a0c', 0.25 + orand() * 0.25);
    c.lineWidth = 0.8 + orand() * 1.2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (orand() - 0.5) * 22, y + 12 + orand() * 40);
    c.stroke();
  }
  c.fillStyle = 'rgba(226, 170, 99, 0.12)';
  for (let i = 0; i < 900; i += 1) {
    c.beginPath();
    c.arc(-500 + orand() * 1120, orand() * 170, 0.5 + orand() * 1.8, 0, TAU);
    c.fill();
  }

  // A lit rim under the overhang.
  c.beginPath();
  c.moveTo(660, 42);
  for (let i = edge.length - 1; i >= 0; i -= 1) c.lineTo(edge[i][0] + 2, edge[i][1] + 4);
  c.strokeStyle = 'rgba(238, 186, 112, 0.28)';
  c.lineWidth = 2.2;
  c.stroke();

  // Texture inside the dark mass.
  c.save();
  c.beginPath();
  c.moveTo(-560, -110);
  c.lineTo(700, -110);
  for (let i = edge.length - 1; i >= 0; i -= 1) c.lineTo(edge[i][0], edge[i][1]);
  c.closePath();
  c.clip();
  for (let i = 0; i < 55; i += 1) {
    const x = -520 + orand() * 1180;
    const w = 8 + orand() * 60;
    c.fillStyle = alpha(orand() > 0.5 ? '#2b1207' : '#a26333', 0.04 + orand() * 0.09);
    c.fillRect(x, -60, w, 260);
  }
  c.fillStyle = 'rgba(226,170,99,0.1)';
  for (let i = 0; i < 500; i += 1) {
    c.beginPath();
    c.arc(-520 + orand() * 1180, orand() * 180, 0.5 + orand() * 2, 0, TAU);
    c.fill();
  }
  c.restore();

  // Broad mineral drips below the lip.
  for (let i = 0; i < 9; i += 1) {
    const x = -340 + i * 118 + (orand() - 0.5) * 35;
    const len = 40 + orand() * 170;
    const y0 = 120 + orand() * 40;
    const gr = c.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, 'rgba(72, 32, 14, 0.35)');
    gr.addColorStop(1, 'rgba(72, 32, 14, 0)');
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(x - 4, y0);
    c.lineTo(x + 4, y0);
    c.lineTo(x + 9, y0 + len);
    c.lineTo(x - 7, y0 + len);
    c.closePath();
    c.fill();
  }

  const btm = c.createLinearGradient(0, 760, 0, 1060);
  btm.addColorStop(0, 'rgba(70, 35, 16, 0)');
  btm.addColorStop(1, 'rgba(52, 25, 11, 0.38)');
  c.fillStyle = btm;
  c.fillRect(CACHE.x0, 760, CACHE.w, 300);

  // Older painted figures and animals, weathering into the wall.
  drawProcession(c, 190, 500, 801);

  // Hand stencils on the wall.
  drawHandCluster(c, -80, 400, 1.35, 21);
  drawHandCluster(c, 1130, 240, 1.05, 22);
  drawHandCluster(c, 1240, 600, 0.8, 23);

  // Faded older marks: dots, a spiral, a ghost wheel.
  c.save();
  c.globalAlpha = 0.5;
  for (let i = 0; i < 7; i += 1) {
    c.fillStyle = alpha('#7b2f1a', 0.4);
    c.beginPath();
    c.arc(240 + i * 15, 560 + (i % 2) * 8, 3, 0, TAU);
    c.fill();
  }
  c.strokeStyle = alpha('#7b2f1a', 0.35);
  c.lineWidth = 3;
  c.beginPath();
  for (let a = 0; a < TAU * 2.1; a += 0.16) {
    const r = 12 + a * 3.5;
    const x = 180 + Math.cos(a) * r;
    const y = 470 + Math.sin(a) * r;
    if (a === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.restore();
}



function drawProcession(c, x, y, seed) {
  const rand = rngFor(seed);
  c.save();
  c.translate(x, y);
  c.globalAlpha = 0.32;
  c.strokeStyle = '#6a2a17';
  c.fillStyle = 'rgba(144, 56, 29, 0.5)';
  c.lineWidth = 2.4;
  c.lineCap = 'round';

  for (let i = 0; i < 7; i += 1) {
    const px = i * 74 + (rand() - 0.5) * 12;
    const ph = 46 + rand() * 22;
    const py = (rand() - 0.5) * 10;
    // Human: head, body, legs, spear.
    c.beginPath();
    c.arc(px, py - ph, ph * 0.16, 0, TAU);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(px, py - ph * 0.84);
    c.lineTo(px, py - ph * 0.34);
    c.moveTo(px, py - ph * 0.34);
    c.lineTo(px - 7, py);
    c.moveTo(px, py - ph * 0.34);
    c.lineTo(px + 8, py);
    c.moveTo(px - 2, py - ph * 0.64);
    c.lineTo(px - 12, py - ph * 0.42);
    c.stroke();
    c.beginPath();
    c.moveTo(px + 12, py + 6);
    c.lineTo(px + 13, py - ph * 1.15);
    c.stroke();
  }

  // Small horned animals between the figures.
  for (let i = 0; i < 3; i += 1) {
    const px = 250 + i * 150;
    const py = 38 + rand() * 16;
    c.beginPath();
    c.ellipse(px, py - 12, 22, 11, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(px - 22, py - 12);
    c.lineTo(px - 30, py - 24);
    c.lineTo(px - 36, py - 14);
    c.moveTo(px - 22, py - 14);
    c.lineTo(px - 34, py - 10);
    c.stroke();
    for (const lx of [-12, 8]) {
      c.beginPath();
      c.moveTo(px + lx, py - 4);
      c.lineTo(px + lx, py + 8);
      c.stroke();
    }
  }
  c.restore();
}





function drawCrack(c, x, y, len, rand, seed) {
  let px = x;
  let py = y;
  let ang = Math.PI / 2 + (rand() - 0.5) * 0.8;
  c.strokeStyle = alpha('#4a2412', 0.18 + rand() * 0.2);
  c.lineWidth = 0.8 + rand() * 1.4;
  c.beginPath();
  c.moveTo(px, py);
  for (let i = 0; i < 9; i += 1) {
    ang += (rand() - 0.5) * 0.36;
    px += Math.cos(ang) * (len / 9);
    py += Math.sin(ang) * (len / 9);
    c.lineTo(px, py);
    if (rand() > 0.72) {
      c.moveTo(px, py);
      c.lineTo(px + (rand() - 0.5) * 36, py + rand() * 40);
      c.moveTo(px, py);
    }
  }
  c.stroke();
}

// ---------------------------------------------------------------- hand stencils

function handPath(c, x, y, s, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  c.beginPath();
  c.ellipse(0, 0, 11, 15, 0, 0, TAU);
  const fingers = [
    [-9, -15, -0.25, 20],
    [-4, -18, -0.1, 23],
    [1, -18, 0.04, 22],
    [6, -16, 0.18, 19],
    [10, -12, 0.34, 15],
  ];
  for (const [fx, fy, a, len] of fingers) {
    c.save();
    c.translate(fx, fy);
    c.rotate(a);
    c.ellipse(0, -len / 2, 3.2, len / 2, 0, 0, TAU);
    c.restore();
  }
  c.moveTo(-10, 8);
  c.ellipse(-12, 10, 4, 7, 0.7, 0, TAU);
  c.closePath();
  c.restore();
}

function drawHandCluster(c, x, y, s, seed) {
  const rand = rngFor(seed);
  c.save();
  // Negative stencil: lighter hand, pigment halo around it.
  c.fillStyle = 'rgba(235, 195, 133, 0.85)';
  handPath(c, x, y, s, -0.25);
  c.fill();
  c.strokeStyle = 'rgba(120, 45, 22, 0.5)';
  c.lineWidth = 1.5;
  handPath(c, x, y, s, -0.25);
  c.stroke();

  for (let i = 0; i < 240; i += 1) {
    const a = rand() * TAU;
    const r = s * (26 + rand() * 28);
    c.fillStyle = alpha('#7d301c', 0.08 + rand() * 0.28);
    c.beginPath();
    c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.15, 0.6 + rand() * 2.4, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- herd

function drawFarBank(g) {
  const c = g.drawingContext;
  c.save();
  c.fillStyle = 'rgba(154, 88, 44, 0.55)';
  c.fillRect(-1200, 738, 3600, 84);
  c.strokeStyle = 'rgba(82, 36, 17, 0.45)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-1200, 739);
  c.lineTo(2400, 739);
  c.stroke();
  const gr = c.createLinearGradient(0, 738, 0, 822);
  gr.addColorStop(0, 'rgba(70, 32, 14, 0.0)');
  gr.addColorStop(1, 'rgba(70, 32, 14, 0.22)');
  c.fillStyle = gr;
  c.fillRect(-1200, 738, 3600, 84);
  c.restore();
}

function drawCow(c, sx, sy, h, color, seed, opts = {}) {
  const rand = rngFor(seed);
  const w = h * 1.62;
  const ink = 'rgba(58, 21, 10, 0.92)';
  const hump = opts.hump || 0.5;
  c.save();
  c.translate(sx, sy);
  const legW = Math.max(2, h * 0.045);

  // Contact shadow on the far bank.
  c.fillStyle = 'rgba(64, 27, 12, 0.2)';
  c.beginPath();
  c.ellipse(0, 0, w * 0.55, h * 0.045, 0, 0, TAU);
  c.fill();

  // Legs and hooves.
  c.strokeStyle = ink;
  c.lineWidth = legW;
  for (const k of [-0.37, -0.15, 0.16, 0.38]) {
    c.beginPath();
    c.moveTo(w * k, -h * 0.34);
    c.lineTo(w * k + (rand() - 0.5) * 4, -h * 0.03);
    c.stroke();
  }
  c.fillStyle = ink;
  for (const k of [-0.37, -0.15, 0.16, 0.38]) {
    c.beginPath();
    c.ellipse(w * k, -h * 0.02, h * 0.04, h * 0.022, 0, 0, TAU);
    c.fill();
  }

  // Body with a pronounced zebu hump.
  c.fillStyle = alpha(color, 0.95);
  c.strokeStyle = ink;
  c.lineWidth = Math.max(2.4, h * 0.042);
  c.beginPath();
  c.moveTo(-w * 0.5, -h * 0.36);
  c.lineTo(-w * 0.51, -h * 0.58);
  c.quadraticCurveTo(-w * 0.46, -h * 0.72, -w * 0.32, -h * 0.72);
  c.quadraticCurveTo(-w * 0.16, -h * 0.72, -w * 0.08, -h * (0.72 + 0.18 * hump));
  c.quadraticCurveTo(-w * 0.01, -h * (0.8 + 0.12 * hump), w * 0.09, -h * 0.74);
  c.quadraticCurveTo(w * 0.22, -h * 0.7, w * 0.4, -h * 0.66);
  c.quadraticCurveTo(w * 0.51, -h * 0.62, w * 0.5, -h * 0.46);
  c.quadraticCurveTo(w * 0.49, -h * 0.34, w * 0.3, -h * 0.33);
  c.quadraticCurveTo(-w * 0.12, -h * 0.28, -w * 0.5, -h * 0.36);
  c.closePath();
  c.fill();
  c.stroke();

  // A second, offset stroke: paint applied in more than one pass.
  c.save();
  c.globalAlpha = 0.35;
  c.translate(1.4, -1.2);
  c.stroke();
  c.restore();

  // Worn patches: let the rock show through the pigment.
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i += 1) {
    c.fillStyle = 'rgba(0,0,0,0.45)';
    c.beginPath();
    c.ellipse(
      -w * 0.3 + rand() * w * 0.65,
      -h * 0.58 + rand() * h * 0.22,
      2 + rand() * 7,
      1 + rand() * 4,
      rand(),
      0,
      TAU,
    );
    c.fill();
  }
  c.restore();

  // Short neck and head, facing left toward the rider.
  const hx = -w * 0.54;
  const hy = -h * 0.66;
  c.fillStyle = alpha(color, 0.97);
  c.strokeStyle = ink;
  c.lineWidth = Math.max(2.2, h * 0.04);
  c.beginPath();
  c.moveTo(-w * 0.4, -h * 0.74);
  c.quadraticCurveTo(-w * 0.54, -h * 0.76, hx + h * 0.07, hy - h * 0.02);
  c.lineTo(hx + h * 0.02, hy + h * 0.11);
  c.quadraticCurveTo(-w * 0.46, -h * 0.5, -w * 0.36, -h * 0.48);
  c.closePath();
  c.fill();
  c.stroke();

  // Dewlap hanging under the neck.
  c.fillStyle = alpha(color, 0.8);
  c.beginPath();
  c.moveTo(-w * 0.48, -h * 0.62);
  c.quadraticCurveTo(-w * 0.42, -h * 0.38, -w * 0.3, -h * 0.36);
  c.quadraticCurveTo(-w * 0.38, -h * 0.46, -w * 0.4, -h * 0.62);
  c.closePath();
  c.fill();
  c.stroke();

  c.beginPath();
  c.ellipse(hx, hy, h * 0.18, h * 0.125, -0.1, 0, TAU);
  c.fill();
  c.stroke();
  // Snout.
  c.beginPath();
  c.ellipse(hx - h * 0.12, hy + h * 0.025, h * 0.082, h * 0.05, -0.15, 0, TAU);
  c.fill();
  c.stroke();
  // Nostril.
  c.fillStyle = 'rgba(58,21,10,0.55)';
  c.beginPath();
  c.arc(hx - h * 0.175, hy + h * 0.02, h * 0.014, 0, TAU);
  c.fill();

  // Lyre horns in profile, plus an ear.
  c.strokeStyle = ink;
  c.lineWidth = Math.max(2, h * 0.034);
  c.beginPath();
  c.moveTo(hx - h * 0.02, hy - h * 0.1);
  c.quadraticCurveTo(hx - h * 0.14, hy - h * 0.36, hx - h * 0.3, hy - h * 0.26);
  c.stroke();
  c.lineWidth = Math.max(1.5, h * 0.024);
  c.beginPath();
  c.moveTo(hx + h * 0.03, hy - h * 0.1);
  c.quadraticCurveTo(hx - h * 0.06, hy - h * 0.31, hx - h * 0.2, hy - h * 0.28);
  c.stroke();
  c.beginPath();
  c.ellipse(hx + h * 0.12, hy - h * 0.03, h * 0.055, h * 0.025, 0.5, 0, TAU);
  c.stroke();

  // Eye.
  c.fillStyle = 'rgba(58,21,10,0.75)';
  c.beginPath();
  c.arc(hx + h * 0.03, hy - h * 0.012, h * 0.018, 0, TAU);
  c.fill();

  // Hide markings.
  if (opts.dots) {
    c.fillStyle = alpha('#f0d7a2', 0.7);
    for (let i = 0; i < 16; i += 1) {
      c.beginPath();
      c.arc(-w * 0.3 + rand() * w * 0.58, -h * 0.58 + rand() * h * 0.2, 1.2 + rand() * 1.8, 0, TAU);
      c.fill();
    }
  }
  if (opts.stripe) {
    c.strokeStyle = alpha('#f0d7a2', 0.55);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-w * 0.25, -h * 0.66);
    c.lineTo(-w * 0.12, -h * 0.4);
    c.stroke();
  }
  if (opts.calf) {
    c.strokeStyle = alpha('#3c170b', 0.6);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(w * 0.42, -h * 0.6);
    c.lineTo(w * 0.54, -h * 0.8);
    c.stroke();
  }

  // Pigment flecks around the figure.
  c.fillStyle = alpha(color, 0.55);
  for (let i = 0; i < 10; i += 1) {
    c.beginPath();
    c.arc((rand() - 0.2) * w, -h * (0.2 + rand() * 0.65), 0.8 + rand() * 1.6, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawHerder(c, x, y, h, color, seed, pointing = false) {
  const ink = 'rgba(58, 22, 11, 0.9)';
  c.save();
  c.translate(x, y);
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.fillStyle = alpha(color, 0.95);

  // Legs with feet.
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-h * 0.04, -h * 0.4);
  c.lineTo(-h * 0.1, -h * 0.01);
  c.moveTo(h * 0.04, -h * 0.4);
  c.lineTo(h * 0.11, -h * 0.01);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-h * 0.1, 0);
  c.lineTo(-h * 0.16, 0);
  c.moveTo(h * 0.11, 0);
  c.lineTo(h * 0.17, 0);
  c.stroke();

  // Tunic.
  c.beginPath();
  c.moveTo(-h * 0.12, -h * 0.4);
  c.lineTo(-h * 0.13, -h * 0.76);
  c.lineTo(h * 0.1, -h * 0.78);
  c.lineTo(h * 0.14, -h * 0.4);
  c.lineTo(h * 0.05, -h * 0.36);
  c.lineTo(-h * 0.04, -h * 0.38);
  c.closePath();
  c.fill();
  c.stroke();

  // Belt.
  c.strokeStyle = alpha('#7d301c', 0.85);
  c.lineWidth = h * 0.045;
  c.beginPath();
  c.moveTo(-h * 0.12, -h * 0.53);
  c.lineTo(h * 0.13, -h * 0.54);
  c.stroke();

  // Head, neck, hair.
  c.fillStyle = alpha(color, 0.98);
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, -h * 0.87, h * 0.088, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = alpha('#3c170b', 0.85);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, -h * 0.9, h * 0.1, Math.PI * 1.05, Math.PI * 1.95);
  c.stroke();

  // Arms: one points at the pelican, the other holds a spear.
  c.strokeStyle = ink;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-h * 0.1, -h * 0.68);
  c.lineTo(-h * (pointing ? 0.3 : 0.22), -h * (pointing ? 0.76 : 0.5));
  c.moveTo(h * 0.08, -h * 0.68);
  c.lineTo(h * 0.18, -h * 0.52);
  c.stroke();
  c.fillStyle = alpha(color, 0.95);
  c.beginPath();
  c.arc(-h * (pointing ? 0.31 : 0.23), -h * (pointing ? 0.77 : 0.51), h * 0.03, 0, TAU);
  c.fill();

  // Spear.
  c.strokeStyle = 'rgba(58,22,11,0.75)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(h * 0.19, 0);
  c.lineTo(h * 0.22, -h * 1.2);
  c.stroke();
  c.beginPath();
  c.moveTo(h * 0.22, -h * 1.2);
  c.lineTo(h * 0.17, -h * 1.08);
  c.moveTo(h * 0.22, -h * 1.2);
  c.lineTo(h * 0.28, -h * 1.1);
  c.stroke();

  // Hip bag.
  c.fillStyle = alpha('#7d301c', 0.7);
  c.beginPath();
  c.ellipse(-h * 0.12, -h * 0.44, h * 0.045, h * 0.06, 0.2, 0, TAU);
  c.fill();
  c.restore();
}

function drawHerd(g, c) {
  // The layer transform maps scene coords to this 1600x600 window, so draw
  // in scene coordinates (not window-local ones).
  const base = 760;
  drawCow(c, 980, base, 116, '#e8d5b0', 11, { hump: 0.5 });
  drawCow(c, 1160, base, 136, '#8f3520', 12, { hump: 0.8, dots: true });
  drawCow(c, 1330, base, 96, '#f0dcb4', 13, { hump: 0.4 });
  drawCow(c, 1500, base, 126, '#6f2a18', 14, { hump: 0.7, dots: true });
  drawCow(c, 1245, base, 70, '#d9b07c', 15, { hump: 0.3, calf: true });
  drawHerder(c, 880, base, 124, '#e5cda6', 31, true);
  drawHerder(c, 1060, base, 116, '#a34b2c', 32, false);

  // A few ochre marks between the animals.
  const rand = rngFor(55);
  c.fillStyle = alpha('#7d301c', 0.5);
  for (let i = 0; i < 14; i += 1) {
    c.beginPath();
    c.arc(520 + rand() * 900, 210 + rand() * 250, 1.5 + rand() * 3, 0, TAU);
    c.fill();
  }
}

function drawLiveTails(c, ctx, scroll) {
  const t = ctx.t;
  for (const cow of CATTLE) {
    const x = cow.x - scroll;
    if (x < -150 || x > 1550) continue;
    const y = 760;
    const flick = Math.sin(t * 2.1 + cow.seed) * 0.28;
    c.strokeStyle = alpha('#4b2112', 0.8);
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x + cow.h * 0.5, y - cow.h * 0.5);
    c.quadraticCurveTo(
      x + cow.h * 0.78,
      y - cow.h * (0.45 + flick),
      x + cow.h * 0.74,
      y - cow.h * (0.2 + flick * 0.5),
    );
    c.stroke();
    c.fillStyle = alpha('#4b2112', 0.8);
    c.beginPath();
    c.arc(x + cow.h * 0.74, y - cow.h * (0.2 + flick * 0.5), 2.4, 0, TAU);
    c.fill();
  }
}

// ---------------------------------------------------------------- path

function drawPath(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  c.save();
  c.fillStyle = '#cf9558';
  c.fillRect(-1200, 820, 3600, 150);
  c.fillStyle = alpha('#e3b06f', 0.5);
  c.fillRect(-1200, 820, 3600, 10);
  c.fillStyle = alpha('#7b3a1f', 0.22);
  c.fillRect(-1200, 955, 3600, 60);

  // Two wheel ruts, scrolled.
  const scroll = (t * SPEED) % 180;
  c.strokeStyle = alpha('#81401f', 0.35);
  c.lineWidth = 2.2;
  for (const yy of [853, 878]) {
    c.beginPath();
    c.moveTo(-1200, yy);
    c.lineTo(2400, yy);
    c.stroke();
  }
  c.strokeStyle = alpha('#f0cf95', 0.28);
  c.lineWidth = 1.4;
  for (let x = -1200 - scroll; x < 2400; x += 180) {
    c.beginPath();
    c.moveTo(x, 903);
    c.lineTo(x + 72, 903);
    c.stroke();
  }

  // Pebbles and cracked earth.
  const rand = rngFor(88);
  for (let i = 0; i < 120; i += 1) {
    const x = -1200 + ((i * 193 - t * SPEED * 0.55) % 3600 + 3600) % 3600;
    const y = 826 + rand() * 124;
    c.fillStyle = alpha(rand() > 0.5 ? '#7b3a1f' : '#f2d49e', 0.14 + rand() * 0.2);
    c.beginPath();
    c.ellipse(x, y, 1 + rand() * 4, 0.7 + rand() * 1.6, rand(), 0, TAU);
    c.fill();
  }

  // Larger stones and hoofprints.
  const srand = rngFor(707);
  for (let i = 0; i < 16; i += 1) {
    const x = -1000 + ((i * 271 - t * 34) % 3200 + 3200) % 3200;
    const y = 842 + srand() * 112;
    const r = 2 + srand() * 7;
    c.fillStyle = alpha(srand() > 0.5 ? '#6c321a' : '#f0cf95', 0.18 + srand() * 0.2);
    c.beginPath();
    c.ellipse(x, y, r, r * 0.55, srand(), 0, TAU);
    c.fill();
  }
  c.strokeStyle = alpha('#63301a', 0.28);
  c.lineWidth = 2;
  for (let i = 0; i < 9; i += 1) {
    const x = -900 + ((i * 337 - t * SPEED * 0.8) % 3000 + 3000) % 3000;
    const y = 880 + (i % 2) * 16;
    c.beginPath();
    c.arc(x, y, 5, 0.2, Math.PI - 0.2);
    c.stroke();
  }

  // Dry grass at the edge.
  for (let i = 0; i < 26; i += 1) {
    const x = -1100 + ((i * 151 - t * 22) % 3200 + 3200) % 3200;
    const y = 812 + srand() * 6;
    c.strokeStyle = alpha('#7a4a20', 0.25);
    c.lineWidth = 1;
    for (let k = 0; k < 3; k += 1) {
      c.beginPath();
      c.moveTo(x + k * 2, y);
      c.lineTo(x + (k - 1) * 5, y - 8 - srand() * 8);
      c.stroke();
    }
  }

  // Powdered pigment along the path edge.
  c.fillStyle = alpha('#f6e2b8', 0.18);
  c.beginPath();
  c.ellipse(430, 815, 180, 16, 0, 0, TAU);
  c.fill();

  // Foreground rocks at the bottom right.
  c.fillStyle = alpha('#76401f', 0.65);
  c.beginPath();
  c.ellipse(1580, 1060, 210, 70, -0.1, 0, TAU);
  c.fill();
  c.fillStyle = alpha('#8f5528', 0.5);
  c.beginPath();
  c.ellipse(1810, 1040, 130, 50, 0.15, 0, TAU);
  c.fill();
  c.strokeStyle = alpha('#4d2611', 0.35);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(1580, 1060, 210, Math.PI, TAU);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- rider

function roughStroke(c, pts, color, width, seed, jitter = 1.2, passes = 2) {
  const rand = rngFor(seed);
  for (let p = 0; p < passes; p += 1) {
    c.strokeStyle = alpha(color, p === 0 ? 1 : 0.35);
    c.lineWidth = width * (p === 0 ? 1 : 0.7);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < pts.length; i += 1) {
      const x = pts[i].x + (rand() - 0.5) * jitter * (p ? 2 : 1);
      const y = pts[i].y + (rand() - 0.5) * jitter * (p ? 2 : 1);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
}

function roughCircle(c, x, y, r, color, width, seed, fill = null) {
  const rand = rngFor(seed);
  c.beginPath();
  for (let i = 0; i <= 20; i += 1) {
    const a = (i / 20) * TAU;
    const rr = r + (rand() - 0.5) * 3.2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}

function drawRockRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const scale = 0.96;
  const X = 468;
  const Y = 820;
  const ink = '#6f2b18';
  const body = '#f1e0bf';
  const shade = '#d8b987';
  const red = '#a54225';
  const tire = '#3d2215';

  c.save();
  c.translate(X, Y);
  c.scale(scale, scale);

  // Ground shadow, powdered pigment.
  const sh = c.createRadialGradient(0, 4, 2, 0, 4, 150);
  sh.addColorStop(0, alpha('#5a2a16', 0.28));
  sh.addColorStop(1, alpha('#5a2a16', 0));
  c.fillStyle = sh;
  c.save();
  c.scale(1, 0.14);
  c.beginPath();
  c.arc(0, 26, 150, 0, TAU);
  c.fill();
  c.restore();

  // Wheels.
  for (const w of [pose.wheels.rear, pose.wheels.front]) {
    c.save();
    c.translate(w.x, w.y);
    roughCircle(c, 0, 0, w.r, tire, 6, 41 + w.x, null);
    c.strokeStyle = alpha(red, 0.85);
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, w.r - 3, 0, TAU);
    c.stroke();
    c.strokeStyle = alpha(ink, 0.9);
    c.lineWidth = 1.5;
    for (let i = 0; i < 7; i += 1) {
      const a = pose.wheelAngle + (i / 7) * TAU;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(a) * (w.r - 5), Math.sin(a) * (w.r - 5));
      c.stroke();
    }
    c.fillStyle = red;
    c.beginPath();
    c.arc(0, 0, 4.5, 0, TAU);
    c.fill();
    c.restore();
  }

  // Far leg + crank.
  c.save();
  c.globalAlpha = 0.55;
  roughStroke(c, [pose.crankCenter, pose.pedals.far], ink, 3.2, 71);
  roughStroke(c, [pose.hip, pose.legs.far.knee, pose.legs.far.ankle], shade, 7, 72);
  c.restore();

  // Frame.
  roughStroke(c, [pose.frame.rearHub, pose.frame.crank], red, 5.2, 73);
  roughStroke(c, [pose.frame.crank, pose.frame.seatCluster], red, 5, 74);
  roughStroke(c, [pose.frame.seatCluster, pose.frame.rearHub], red, 4.6, 75);
  roughStroke(c, [pose.frame.crank, pose.frame.headTop], red, 5.2, 76);
  roughStroke(c, [pose.frame.seatCluster, pose.frame.headTop], red, 4.8, 77);
  roughStroke(c, [pose.frame.headTop, pose.frame.frontHub], ink, 4.4, 78);
  roughStroke(c, [pose.frame.headTop, pose.grip], ink, 4, 79);

  // Chainring + crank + near leg.
  roughCircle(c, pose.crankCenter.x, pose.crankCenter.y, 18, ink, 2.2, 80);
  roughStroke(c, [pose.crankCenter, pose.pedals.near], ink, 3.6, 81);
  c.fillStyle = ink;
  c.fillRect(pose.pedals.near.x - 8, pose.pedals.near.y - 2, 16, 4);
  roughStroke(c, [pose.hip, pose.legs.near.knee, pose.legs.near.ankle], red, 8.2, 82);
  c.fillStyle = red;
  c.beginPath();
  c.arc(pose.legs.near.ankle.x, pose.legs.near.ankle.y, 3.4, 0, TAU);
  c.fill();

  // Saddle.
  c.fillStyle = ink;
  c.beginPath();
  c.ellipse(pose.saddle.x - 3, pose.saddle.y - 1, 20, 6, -0.06, 0, TAU);
  c.fill();

  // Tail.
  c.fillStyle = shade;
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(-44, -180);
  c.lineTo(-78, -194);
  c.lineTo(-84, -166);
  c.lineTo(-58, -154);
  c.closePath();
  c.fill();
  c.stroke();

  // Body.
  c.save();
  c.translate(pose.body.x, pose.body.y);
  c.rotate(pose.body.rot);
  c.fillStyle = body;
  c.strokeStyle = ink;
  c.lineWidth = 3.2;
  c.beginPath();
  c.ellipse(0, 0, pose.body.rx, pose.body.ry, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = alpha(shade, 0.55);
  c.beginPath();
  c.ellipse(0, 9, pose.body.rx * 0.7, pose.body.ry * 0.5, 0.05, 0, TAU);
  c.fill();
  c.restore();

  // Neck.
  roughStroke(c, pose.neck, ink, 20, 84, 1.4, 1);
  roughStroke(c, pose.neck, body, 14, 85, 1.2, 1);

  // Head.
  roughCircle(c, pose.head.x, pose.head.y, 18, ink, 3, 86, body);
  // Beak.
  c.fillStyle = red;
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(pose.beak.base.x - 2, pose.beak.base.y - 5);
  c.lineTo(pose.beak.tip.x, pose.beak.tip.y - 2);
  c.lineTo(pose.beak.base.x, pose.beak.base.y + 2);
  c.closePath();
  c.fill();
  c.stroke();
  // Pouch.
  c.fillStyle = mix(red, '#e6a04c', 0.42);
  c.beginPath();
  c.moveTo(pose.beak.base.x + 2, pose.beak.base.y);
  c.quadraticCurveTo(pose.pouch.x + 18, pose.pouch.y + 10, pose.beak.tip.x - 12, pose.beak.tip.y + 2);
  c.quadraticCurveTo(pose.pouch.x, pose.pouch.y + 14, pose.beak.base.x + 4, pose.beak.base.y + 14);
  c.closePath();
  c.fill();
  c.stroke();
  // Eye.
  c.fillStyle = '#f4e7ce';
  c.beginPath();
  c.arc(pose.head.x + 7, pose.head.y - 5, 4.6, 0, TAU);
  c.fill();
  c.fillStyle = ink;
  c.beginPath();
  c.arc(pose.head.x + 8, pose.head.y - 5, 2.1, 0, TAU);
  c.fill();

  // Wing to the handlebar.
  roughStroke(c, [
    { x: pose.shoulder.x, y: pose.shoulder.y + 8 },
    { x: 30, y: -168 },
    { x: pose.grip.x, y: pose.grip.y - 2 },
  ], ink, 18, 87, 1.5, 1);
  roughStroke(c, [
    { x: pose.shoulder.x, y: pose.shoulder.y + 8 },
    { x: 30, y: -168 },
    { x: pose.grip.x, y: pose.grip.y - 2 },
  ], body, 12, 88, 1.2, 1);

  // Paint spatter and a few drips.
  const rand = rngFor(99);
  for (let i = 0; i < 55; i += 1) {
    const x = (rand() - 0.5) * 300;
    const y = (rand() - 0.5) * 250 - 80;
    c.fillStyle = alpha(rand() > 0.55 ? red : ink, 0.12 + rand() * 0.2);
    c.beginPath();
    c.arc(x, y, 0.6 + rand() * 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawDust(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const rand = rngFor(202);
  c.save();
  for (let i = 0; i < 18; i += 1) {
    const phase = (t * 1.8 + i * 0.37) % 1;
    const x = 430 - phase * 90 - rand() * 20;
    const y = 822 - phase * 28 - rand() * 16;
    const r = 2 + phase * 7;
    c.fillStyle = alpha('#f2d49e', (1 - phase) * 0.2);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawScratches(c, ctx) {
  // A little heat shimmer / floating dust over the whole wall.
  const rand = rngFor(303);
  c.save();
  for (let i = 0; i < 16; i += 1) {
    const x = -300 + ((i * 233 + ctx.t * 8) % 1700);
    const y = 180 + rand() * 620;
    c.fillStyle = alpha('#f6e2b8', 0.05 + rand() * 0.06);
    c.beginPath();
    c.arc(x, y, 0.8 + rand() * 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- title

function drawRockTitle(g, opacity, lift, local) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const baseY = H - 156 * s + lift * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.3 * s);

  // Painted ochre panel, rough edges.
  const rand = rngFor(404);
  c.beginPath();
  const px = x - 28 * s;
  const py = baseY - 112 * s;
  const pw = 760 * s;
  const ph = 176 * s;
  for (let i = 0; i <= 14; i += 1) {
    const xx = px + (i / 14) * pw;
    c.lineTo(xx, py + (rand() - 0.5) * 9 * s);
  }
  for (let i = 0; i <= 6; i += 1) {
    c.lineTo(px + pw + (rand() - 0.5) * 11 * s, py + (i / 6) * ph);
  }
  for (let i = 14; i >= 0; i -= 1) {
    c.lineTo(px + (i / 14) * pw, py + ph + (rand() - 0.5) * 9 * s);
  }
  for (let i = 6; i >= 0; i -= 1) {
    c.lineTo(px + (rand() - 0.5) * 11 * s, py + (i / 6) * ph);
  }
  c.closePath();
  c.fillStyle = 'rgba(72, 30, 15, 0.74)';
  c.fill();
  c.strokeStyle = 'rgba(246, 226, 184, 0.5)';
  c.lineWidth = 1.5 * s;
  c.stroke();

  // Pigment grain on the card.
  for (let i = 0; i < 110; i += 1) {
    c.fillStyle = alpha(rand() > 0.5 ? '#f6e2b8' : '#2f1209', 0.06 + rand() * 0.1);
    c.beginPath();
    c.arc(px + rand() * pw, py + rand() * ph, 0.5 + rand() * 1.6, 0, TAU);
    c.fill();
  }

  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 14 * s, 600, EN_FONT, '3px');
  c.fillStyle = 'rgba(246, 226, 184, 0.95)';
  c.fillText('01  /  20', x, baseY - 78 * s);

  setFont(c, 42 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#f6e2b8';
  c.fillText('撒哈拉岩画', x, baseY - 26 * s);

  setFont(c, 18 * s, 500, EN_FONT, '2.4px');
  c.fillStyle = 'rgba(246, 226, 184, 0.82)';
  c.fillText('SAHARAN ROCK ART', x, baseY + 8 * s);

  setFont(c, 15 * s, 400, CN_FONT, '1px');
  c.fillStyle = 'rgba(246, 226, 184, 0.98)';
  c.fillText('约前4000 · 塔西里', x, baseY + 24 * s);

  // A small positive handprint at the right of the panel.
  c.save();
  c.fillStyle = 'rgba(226, 168, 101, 0.8)';
  handPath(c, px + pw - 46 * s, py + 62 * s, 0.85 * s, -0.2);
  c.fill();
  c.restore();

  c.restore();
}
