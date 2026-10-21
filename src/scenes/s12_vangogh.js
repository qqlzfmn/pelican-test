// 12 — The Starry Night. Impasto night: the whole sky is built from short,
// curved, direction-following strokes. Static sky, land and foreground are
// cached at 1.2 px/unit; the swirl highlights, the rider and a star that drops
// onto the road and becomes a spinning wheel are painted live.

import { basePalette } from './_placeholder.js';
import { clamp, lerp, rngFor, noise1, fbm1, easeInOut, TAU } from '../kit/math.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { rigPose } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { SPEED } from '../kit/road.js';

const pal = basePalette({
  bg: '#17294f', bg2: '#1f3a66', motif: '#e8c14f', accent: '#f2d46a',
  ink: '#0c1526', titleInk: '#f4e7bc', scrim: '#08101f', ground: '#1a3157',
  road: '#24406b', dash: '#f0d879', body: '#f2df9c', beak: '#dfa33f',
  rigInk: '#0a1222',
});

const VX = 660;
const VY = 300;
const MOON = { x: 948, y: 168, r: 66 };
const GAG_START = 2.15;
const LAND_Y = 762;

const BLUES = [
  ['#0f1f3a', '#1a3050'],
  ['#142847', '#20395f'],
  ['#183055', '#27466f'],
  ['#1d385f', '#2d5080'],
  ['#24457a', '#38639a'],
  ['#2c5088', '#4771a7'],
  ['#34598f', '#5980b2'],
];
const YELLOWS = [
  ['#bc9636', '#e0b642'],
  ['#d3ab42', '#f0cd5c'],
  ['#e8c14f', '#f7e6a2'],
];
const CYPRESS = ['#132218', '#1a2b1f', '#213528', '#283f2f'];
const CYPRESS_HI = ['#39543f', '#456149'];

const STARS = [
  [150, 200, 24], [300, 96, 18], [470, 150, 20], [700, 96, 15],
  [820, 210, 26], [1130, 250, 18], [1215, 120, 14],
  [1090, 545, 16], [180, 420, 20], [360, 520, 15],
  [775, 565, 13], [1262, 430, 15],
];

const RIDER_STYLE = {
  ink: '#0a1424', body: '#f0e2a8', bodyShade: '#d8c178', wing: '#d2b366',
  beak: '#e0a63a', pouch: '#ecc060', leg: '#dfa94a', eye: '#0a0d16',
  eyeWhite: '#fdf6da', tire: '#101d33', rim: '#c9a63f', metal: '#e8c14f',
  saddle: '#22314f', chain: '#3a4d70', outline: true, weight: 1.28,
  farAlpha: 0.5, shadow: 0,
};

export default {
  id: 's12',
  number: 12,
  cn: '星月夜',
  en: 'The Starry Night',
  year: '1889',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const pose = rigPose(ctx.t);

    c.save();
    c.fillStyle = pal.bg;
    c.fillRect(-900, -250, 2600, 1500);
    c.restore();

    // Road first: the land cache is painted over it, leaving the slab visible.
    ctx.road(g, {
      ground: '#121f38',
      verge: '#1b3155',
      road: '#20375c',
      edge: '#48699a',
      dash: '#e8c14f',
      ink: '#0a1424',
      dust: false,
    });

    const land = cachedLayer(ctx, 's12-land', drawLand);
    c.drawImage(land.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawLiveSwirl(g, ctx, pose);
    drawRoadPaint(g, ctx);

    const fg = cachedLayer(ctx, 's12-fg', drawForeground, {
      x0: -500, y0: 900, w: 2000, h: 220,
    });
    c.drawImage(fg.canvas, -500, 900, 2000, 220);

    drawRider(g, ctx, pose);
    drawStarWheel(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- flow field

function fieldAngle(x, y) {
  let vx = 1;
  let vy = -0.16 + 0.2 * Math.sin(x * 0.0035);

  const add = (cx, cy, strength, spin) => {
    const dx = x - cx;
    const dy = (y - cy) * 1.3;
    const r = Math.hypot(dx, dy) + 1;
    const f = strength * Math.exp(-r / 300);
    vx += (-dy / r) * spin * f;
    vy += (dx / r) * spin * f;
  };
  add(VX, VY, 2.7, 1);
  add(250, 210, 1.9, -1);
  add(1180, 520, 1.4, -1);
  add(430, 560, 1.1, 1);
  return Math.atan2(vy, vx);
}

function toneAt(x, y) {
  const dx = x - VX;
  const dy = (y - VY) * 1.2;
  const r = Math.hypot(dx, dy);
  const th = Math.atan2(dy, dx);
  let v = 0.5 + 0.24 * Math.sin(r * 0.03 - th * 2.1 + 0.6);
  v += 0.1 * Math.sin(r * 0.075 + th * 1.3);
  v += 0.16 * fbm1(x * 0.0045 + y * 0.002, 41);

  const dx2 = x - 250;
  const dy2 = (y - 220) * 1.3;
  v += 0.13 * Math.sin(Math.hypot(dx2, dy2) * 0.045 + Math.atan2(dy2, dx2) * 1.6);
  v += 0.05 * Math.sin(x * 0.008 + y * 0.02);
  // The sky deepens toward the land, so the rider reads against it.
  v -= clamp((y - 545) / 200) * 0.34;
  return v;
}

// A single loaded brush mark: body, plus a raised highlight on one edge.
function paint(c, x, y, ang, len, w, color, hi, { bend = 0.3, al = 1 } = {}) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const x0 = x - dx * len * 0.5;
  const y0 = y - dy * len * 0.5;
  const x1 = x + dx * len * 0.5;
  const y1 = y + dy * len * 0.5;
  const mx = x - dy * len * bend * 0.22;
  const my = y + dx * len * bend * 0.22;

  c.globalAlpha = al;
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx, my, x1, y1);
  c.stroke();

  if (hi) {
    const ox = -dy * w * 0.22;
    const oy = dx * w * 0.22;
    c.globalAlpha = al * 0.5;
    c.strokeStyle = hi;
    c.lineWidth = Math.max(0.8, w * 0.36);
    c.beginPath();
    c.moveTo(x0 + ox, y0 + oy);
    c.quadraticCurveTo(mx + ox, my + oy, x1 + ox, y1 + oy);
    c.stroke();
  }
}

// ---------------------------------------------------------------- land cache

function drawLand(g, c) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  c.fillStyle = '#101f3a';
  c.fillRect(-540, -90, 2080, 900);

  paintSky(c);
  drawSpiralArms(c);
  for (let i = 0; i < STARS.length; i += 1) {
    impastoStar(c, STARS[i][0], STARS[i][1], STARS[i][2], 300 + i * 17);
  }
  drawMoon(c);
  drawHills(c);
  drawVillage(c);
  drawCypress(c);
  drawWeave(c);

  c.restore();
}

function paintSky(c) {
  const rand = rngFor(1889);
  for (let gy = -80; gy < 745; gy += 11) {
    for (let gx = -530; gx < 1520; gx += 13) {
      const x = gx + (rand() - 0.5) * 13;
      const y = gy + (rand() - 0.5) * 11;
      const ang = fieldAngle(x, y);
      const t = toneAt(x, y);
      const len = 16 + rand() * 24;
      const r = rand();

      let base;
      let hi;
      let w;
      if (t > 0.87) {
        const p = YELLOWS[2];
        base = p[0];
        hi = p[1];
        w = 5.5 + rand() * 4;
      } else if (t > 0.72) {
        const p = YELLOWS[r > 0.5 ? 1 : 0];
        base = p[0];
        hi = p[1];
        w = 5 + rand() * 4.5;
      } else if (t > 0.58) {
        const p = BLUES[4 + Math.floor(r * 3)];
        base = p[0];
        hi = p[1];
        w = 5 + rand() * 4;
      } else if (t > 0.42) {
        const p = BLUES[2 + Math.floor(r * 3)];
        base = p[0];
        hi = p[1];
        w = 4.5 + rand() * 3.6;
      } else if (t > 0.28) {
        const p = BLUES[Math.floor(r * 3)];
        base = p[0];
        hi = p[1];
        w = 4 + rand() * 3.2;
      } else {
        base = '#0c1930';
        hi = '#152949';
        w = 4 + rand() * 3;
      }
      paint(c, x, y, ang, len, w, base, r > 0.35 ? hi : null, {
        bend: 0.25 + rand() * 0.5,
        al: 0.92,
      });
    }
  }
}

// Long spiral arms make the vortex read at a glance; short strokes alone
// dissolve into texture at 1080p.
function drawSpiralArms(c) {
  const arms = [
    { cx: VX, cy: VY, n: 7, r0: 80, r1: 470, dir: 1, sy: 0.74 },
    { cx: 250, cy: 210, n: 4, r0: 50, r1: 280, dir: -1, sy: 0.86 },
    { cx: 1180, cy: 520, n: 3, r0: 40, r1: 220, dir: -1, sy: 0.7 },
  ];
  for (const a of arms) {
    for (let arm = 0; arm < a.n; arm += 1) {
      const a0 = (arm / a.n) * TAU + 0.4;
      for (let s = 0; s < 34; s += 1) {
        const u = s / 34;
        const r = a.r0 + u * (a.r1 - a.r0);
        const ang = a0 + u * 2.4 * a.dir;
        const x = a.cx + Math.cos(ang) * r;
        const y = a.cy + Math.sin(ang) * r * a.sy;
        if (y > 700) continue;
        const k = arm % 3;
        const col = k === 0 ? '#3a6398' : k === 1 ? '#24457a' : '#1b3762';
        paint(c, x, y, ang + Math.PI / 2 * a.dir, 24 + (1 - u) * 34, 4.2, col, '#4f7aad', {
          bend: 0.55,
          al: 0.42,
        });
      }
    }
  }
}

function impastoStar(c, x, y, r, seed) {
  const rand = rngFor(seed);
  c.save();
  c.globalAlpha = 0.32;
  c.fillStyle = '#0d1d36';
  c.beginPath();
  c.arc(x, y, r * 2.1, 0, TAU);
  c.fill();
  c.restore();

  // A broken ring of thick daubs, then radial rays of uneven length.
  const n = 13;
  for (let i = 0; i < n; i += 1) {
    if (rand() < 0.18) continue;
    const a = (i / n) * TAU + (rand() - 0.5) * 0.22;
    const rr = r * (0.95 + (rand() - 0.5) * 0.3);
    paint(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a + Math.PI / 2,
      r * (0.55 + rand() * 0.55), 4.4 + rand() * 2.6,
      rand() > 0.5 ? '#e8c14f' : '#d9b348', '#f7e9bd', { bend: 0.5, al: 0.94 });
  }
  const rays = 7;
  for (let i = 0; i < rays; i += 1) {
    const a = (i / rays) * TAU + 0.32 + (rand() - 0.5) * 0.2;
    const rr = r * (1.5 + rand() * 0.45);
    paint(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a,
      r * (0.4 + rand() * 0.45), 3.2, '#f2d46a', '#fbf2cd', {
        bend: 0.2, al: 0.7,
      });
  }
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#f2d46a';
  c.beginPath();
  c.arc(x, y, r * 0.56, 0, TAU);
  c.fill();
  c.fillStyle = '#fbf2cd';
  c.beginPath();
  c.arc(x - r * 0.08, y - r * 0.08, r * 0.34, 0, TAU);
  c.fill();
  c.restore();
}

function drawMoon(c) {
  const { x, y, r } = MOON;
  // Halo: loose, uneven rings, not compass circles.
  const rand = rngFor(517);
  for (let ring = 0; ring < 3; ring += 1) {
    const rr = r + 22 + ring * 26;
    const n = 16 + ring * 5;
    for (let i = 0; i < n; i += 1) {
      if (rand() < 0.14) continue;
      const a = (i / n) * TAU + (rand() - 0.5) * 0.16;
      paint(c, x + Math.cos(a) * (rr + (rand() - 0.5) * 9),
        y + Math.sin(a) * (rr + (rand() - 0.5) * 9), a + Math.PI / 2,
        16 + rand() * 20, 4.4, '#d3ab42', '#f2d46a', {
          bend: 0.55, al: 0.46 - ring * 0.1,
        });
    }
  }

  // Crescent: bright moon disc with a dark bite taken out of its left side.
  c.save();
  c.beginPath();
  c.arc(x, y, r + 6, 0, TAU);
  c.arc(x - 44, y + 8, r - 2, 0, TAU, true);
  c.clip();
  const mr = rngFor(907);
  for (let i = 0; i < 300; i += 1) {
    const px = x - r - 8 + mr() * (r * 2 + 16);
    const py = y - r - 8 + mr() * (r * 2 + 16);
    const a = Math.atan2(py - y, px - x) + Math.PI / 2;
    paint(c, px, py, a + (mr() - 0.5) * 0.5, 15 + mr() * 16, 5 + mr() * 4,
      mr() > 0.4 ? '#e8c14f' : '#f2d46a', '#fbf2cd', { bend: 0.4, al: 0.96 });
  }
  c.restore();

  // The bite is sky, not a hole: paint it back in with blue daubs.
  c.save();
  c.beginPath();
  c.arc(x - 44, y + 8, r - 2, 0, TAU);
  c.clip();
  const br = rngFor(908);
  for (let i = 0; i < 90; i += 1) {
    const px = x - 44 - r + br() * (r * 2);
    const py = y + 8 - r + br() * (r * 2);
    const a = Math.atan2(py - y, px - x) + Math.PI / 2;
    paint(c, px, py, a + (br() - 0.5) * 0.5, 14 + br() * 18, 4 + br() * 3.4,
      br() > 0.6 ? '#223c63' : '#182f52', '#2c4a76', { bend: 0.5, al: 0.9 });
  }
  c.restore();

  // A thin warm rim on the lit side only.
  c.save();
  c.strokeStyle = '#f2d46a';
  c.lineWidth = 3;
  c.globalAlpha = 0.55;
  c.beginPath();
  c.arc(x, y, r + 6, -1.35, 1.35);
  c.stroke();
  c.restore();
}

function drawHills(c) {
  const paintBand = (seed, topBase, colA, colB, alphaTop) => {
    c.beginPath();
    c.moveTo(-540, 820);
    for (let x = -540; x <= 1540; x += 16) {
      const y = topBase + noise1(x * 0.004, seed) * 22 + noise1(x * 0.014, seed + 3) * 7;
      c.lineTo(x, y);
    }
    c.lineTo(1540, 830);
    c.lineTo(-540, 830);
    c.closePath();
    c.fillStyle = colA;
    c.fill();

    c.save();
    c.clip();
    const rand = rngFor(seed + 11);
    for (let i = 0; i < 520; i += 1) {
      const x = -540 + rand() * 2080;
      const y = topBase - 20 + rand() * 140;
      paint(c, x, y, -0.1 + (rand() - 0.5) * 0.35, 16 + rand() * 22, 4 + rand() * 4,
        rand() > 0.7 ? colB : colA, '#2f4d74', { bend: 0.35, al: alphaTop });
    }
    c.restore();
  };

  paintBand(77, 668, '#203b60', '#2c4d79', 0.85);
  paintBand(131, 714, '#1a3155', '#244069', 0.9);

  // Dark field ridges just above the road, with a ragged lower edge.
  c.save();
  c.fillStyle = '#101f38';
  c.beginPath();
  c.moveTo(-540, 786);
  for (let x = -540; x <= 1540; x += 18) {
    c.lineTo(x, 776 + noise1(x * 0.01, 211) * 12);
  }
  for (let x = 1540; x >= -540; x -= 30) {
    c.lineTo(x, 824 + noise1(x * 0.013, 213) * 12);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function drawVillage(c) {
  const rand = rngFor(444);
  // Ground the village sits on, lit from behind by the last of the sky.
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#132742';
  c.beginPath();
  c.moveTo(560, 800);
  for (let x = 560; x <= 1330; x += 18) {
    c.lineTo(x, 748 + noise1(x * 0.008, 31) * 12);
  }
  c.lineTo(1330, 812);
  c.lineTo(560, 812);
  c.closePath();
  c.fill();
  c.clip();
  const gr = rngFor(447);
  for (let i = 0; i < 190; i += 1) {
    const x = 552 + gr() * 790;
    const y = 716 + gr() * 84;
    paint(c, x, y, -0.02 + (gr() - 0.5) * 0.1, 16 + gr() * 26, 4 + gr() * 3.4,
      gr() > 0.6 ? '#4a6285' : gr() > 0.3 ? '#33527a' : '#2a476e',
      '#6b83a4', { bend: 0.25, al: 0.5 });
  }
  // A warm line just above the roofs.
  for (let i = 0; i < 46; i += 1) {
    const x = 560 + gr() * 770;
    paint(c, x, 728 + gr() * 16, 0.015, 18 + gr() * 22, 3.2,
      '#a08a3e', '#d3b45a', { bend: 0.2, al: 0.3 });
  }
  c.restore();

  const houses = [
    [600, 770, 54, 40], [660, 778, 38, 26], [706, 760, 62, 46],
    [774, 780, 34, 24], [818, 768, 56, 38], [878, 780, 38, 26],
    [938, 758, 60, 44], [1002, 776, 40, 28], [1056, 752, 66, 50],
    [1126, 780, 36, 26], [1170, 766, 52, 36], [1232, 778, 42, 30],
    [1284, 770, 48, 34],
  ];
  for (let i = 0; i < houses.length; i += 1) {
    drawHouse(c, houses[i], i, rand);
  }

  // Church: tower and spire, the one tall vertical in the village.
  drawChurch(c);
}

function drawHouse(c, h, i, rand) {
  const [x, y, w, ht] = h;

  // Wall: a near-black mass with painted daubs, never a clean rectangle.
  c.save();
  c.globalAlpha = 1;
  c.beginPath();
  c.rect(x, y - ht, w, ht);
  c.fillStyle = '#0a1424';
  c.fill();
  c.clip();
  for (let s = 0; s < 16; s += 1) {
    paint(c, x + rand() * w, y - ht + rand() * ht, 0.02, 8 + rand() * 13, 3.4,
      rand() > 0.5 ? '#0f1c30' : '#13233a', '#22405f', { bend: 0.3, al: 0.95 });
  }
  c.restore();

  // Roof.
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#071120';
  c.beginPath();
  c.moveTo(x - 5, y - ht + 1);
  c.lineTo(x + w / 2, y - ht - ht * 0.66);
  c.lineTo(x + w + 5, y - ht + 1);
  c.closePath();
  c.fill();
  paint(c, x + w / 2, y - ht - ht * 0.24, 0.04, w * 0.92, 3, '#1b3350', '#3d5f88', {
    bend: 0.3, al: 0.9,
  });
  // Chimney.
  if (i % 3 === 0) {
    c.fillStyle = '#071120';
    c.fillRect(x + w * 0.72, y - ht - ht * 0.62, 7, 14);
  }
  c.restore();

  // Lit windows: amber daubs, the only warm notes in the village.
  const n = w > 56 ? 3 : w > 42 ? 2 : 1;
  for (let k = 0; k < n; k += 1) {
    const wx = x + (w / (n + 1)) * (k + 1);
    const wy = y - ht * 0.42;
    paint(c, wx, wy, 0.05, 8, 4.2, '#e8c14f', '#f7e9bd', { al: 0.95 });
    paint(c, wx, wy - 5, 1.56, 8, 2.8, '#d3ab42', null, { al: 0.85 });
  }
  if (i % 5 === 2) {
    // One cold window breaks the warm row.
    paint(c, x + w * 0.5, y - ht * 0.72, 0.04, 7, 3.4, '#9fbfd6', '#d8ecf4', {
      al: 0.8,
    });
  }

  if (i % 4 === 1) {
    // A thin cypress among the houses.
    c.save();
    c.fillStyle = '#101d16';
    c.beginPath();
    c.moveTo(x + w / 2 - 6, y - 2);
    c.quadraticCurveTo(x + w / 2 + 8, y - 30, x + w / 2 + 1, y - 56);
    c.quadraticCurveTo(x + w / 2 + 11, y - 30, x + w / 2 + 7, y - 2);
    c.closePath();
    c.fill();
    c.restore();
  }
}

function drawChurch(c) {
  const x = 900;
  const base = 772;
  // Nave.
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#081322';
  c.fillRect(x - 46, base - 34, 92, 34);
  c.beginPath();
  c.moveTo(x - 50, base - 34);
  c.lineTo(x, base - 58);
  c.lineTo(x + 50, base - 34);
  c.closePath();
  c.fill();
  c.restore();

  // Tower.
  c.save();
  c.globalAlpha = 1;
  c.fillStyle = '#0a1526';
  c.fillRect(x - 14, base - 76, 28, 76);
  for (let s = 0; s < 14; s += 1) {
    paint(c, x - 12 + (s % 3) * 9, base - 72 + s * 5, 0.02, 9, 3, '#132643', '#2a4c78', {
      al: 0.9,
    });
  }
  // Spire.
  c.globalAlpha = 1;
  c.fillStyle = '#06101f';
  c.beginPath();
  c.moveTo(x - 18, base - 74);
  c.lineTo(x, base - 156);
  c.lineTo(x + 18, base - 74);
  c.closePath();
  c.fill();
  paint(c, x - 5, base - 112, -1.18, 44, 3.4, '#1a3354', '#3d6391', { al: 0.9 });
  // Tall lit window.
  paint(c, x, base - 54, 1.56, 20, 4.4, '#e8c14f', '#f7e9bd', { al: 0.95 });
  paint(c, x - 26, base - 18, 0.05, 9, 3.6, '#e8c14f', '#f7e9bd', { al: 0.85 });
  paint(c, x + 26, base - 18, 0.05, 9, 3.6, '#e8c14f', '#f7e9bd', { al: 0.85 });
  c.restore();
}

function cypressSpine(u) {
  return 26 + 54 * Math.pow(u, 1.25) + Math.sin(u * 4.6 + 0.3) * 16;
}

function cypressHalf(u) {
  return 106 * Math.pow(1 - u, 0.8) * (0.38 + 0.62 * Math.abs(Math.sin(u * 9.2 + 0.35)))
    + 6 * Math.sin(u * 19);
}

function drawCypress(c) {
  const N = 22;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i += 1) {
    const u = i / N;
    const y = lerp(904, 26, Math.pow(u, 0.93));
    const spine = cypressSpine(u);
    const half = cypressHalf(u);
    left.push([spine - half * (0.92 + 0.16 * noise1(u * 9, 5)), y]);
    right.push([spine + half * (0.94 + 0.14 * noise1(u * 9, 6)), y]);
  }

  c.save();
  c.beginPath();
  c.moveTo(left[0][0], left[0][1]);
  for (const p of left) c.lineTo(p[0], p[1]);
  c.lineTo(cypressSpine(1), 12);
  for (let i = right.length - 1; i >= 0; i -= 1) c.lineTo(right[i][0], right[i][1]);
  // Ragged root line, not a straight cut.
  for (let i = 1; i <= 7; i += 1) {
    const t = i / 7;
    const bx = lerp(right[0][0], left[0][0], t);
    const by = 904 + noise1(t * 5.5, 12) * 16;
    c.lineTo(bx, by);
  }
  c.closePath();
  c.clip();

  c.fillStyle = '#0d1a13';
  c.globalAlpha = 1;
  c.fillRect(-140, 0, 360, 930);

  const rand = rngFor(717);
  for (let i = 0; i < 1500; i += 1) {
    const x = -80 + rand() * 240;
    const y = 8 + rand() * 930;
    const k = rand();
    const col = CYPRESS[Math.floor(k * CYPRESS.length)];
    const hi = k > 0.78 ? CYPRESS_HI[Math.floor(rand() * CYPRESS_HI.length)] : null;
    paint(c, x, y, -Math.PI / 2 + (rand() - 0.5) * 0.6, 10 + rand() * 32, 3.2 + rand() * 4.2,
      col, hi, { bend: 0.45 + rand() * 0.65, al: 0.9 });
  }
  // Ochre touches, the little warm flecks in the dark foliage.
  for (let i = 0; i < 90; i += 1) {
    const x = -40 + rand() * 190;
    const y = 80 + rand() * 800;
    paint(c, x, y, -1.4 + rand() * 0.5, 8 + rand() * 12, 2.6,
      i % 3 ? '#4a4326' : '#6b5a2c', '#8a7838', { bend: 0.4, al: 0.5 });
  }
  // Lit foliage daubs, so the tree is not one black mass.
  for (let i = 0; i < 170; i += 1) {
    const x = -40 + rand() * 190;
    const y = 40 + rand() * 840;
    paint(c, x, y, -1.5 + rand() * 0.5, 8 + rand() * 14, 2.2 + rand() * 1.6,
      i % 3 ? '#2b4132' : '#3a5540', '#547056', { bend: 0.5, al: 0.6 });
  }
  c.restore();

  // Flaming edge: licks that break the silhouette into tongues.
  const er = rngFor(718);
  for (let i = 0; i < 40; i += 1) {
    const side = i % 2 ? 1 : -1;
    const y = 60 + er() * 820;
    const u = clamp((1 - (y - 26) / 876) ** (1 / 0.93), 0, 1);
    const spine = cypressSpine(u);
    const half = cypressHalf(u) + 4;
    const x = spine + side * half;
    paint(c, x, y, -Math.PI / 2 + side * (0.3 + er() * 0.4), 18 + er() * 30,
      4 + er() * 3.4, '#101d15', '#1d3024', { bend: 0.7, al: 0.95 });
  }

  // Root shadow on the road.
  for (let i = 0; i < 14; i += 1) {
    paint(c, -16 + i * 12, 898 + noise1(i * 0.9, 4) * 8, 0.06, 28, 5, '#0a1420', null, {
      al: 0.45,
    });
  }
}

function drawWeave(c) {
  c.save();
  c.strokeStyle = 'rgba(220, 232, 255, 0.035)';
  c.lineWidth = 0.8;
  c.beginPath();
  for (let x = -520; x < 1520; x += 5.5) {
    c.moveTo(x, -80);
    c.lineTo(x, 812);
  }
  for (let y = -70; y < 812; y += 5.5) {
    c.moveTo(-520, y);
    c.lineTo(1520, y);
  }
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- live swirl

function drawLiveSwirl(g, ctx, pose) {
  const c = g.drawingContext;
  c.save();
  const ph = ctx.local * 0.2 + pose.crank * 0.07;
  const rings = [
    { cx: VX, cy: VY, r0: 120, r1: 230, n: 26, col: '#3d679c', hi: '#6a8fc0', al: 0.26, dir: 1 },
    { cx: VX, cy: VY, r0: 250, r1: 340, n: 30, col: '#e8c14f', hi: '#f7e9bd', al: 0.3, dir: 1 },
    { cx: VX, cy: VY, r0: 62, r1: 110, n: 18, col: '#f2d46a', hi: '#fbf2cd', al: 0.22, dir: 1 },
    { cx: 250, cy: 210, r0: 60, r1: 240, n: 24, col: '#2f5488', hi: '#547bac', al: 0.28, dir: -1 },
    { cx: 1180, cy: 520, r0: 40, r1: 190, n: 16, col: '#35598a', hi: '#5b7fae', al: 0.26, dir: -1 },
  ];

  for (const s of rings) {
    for (let i = 0; i < s.n; i += 1) {
      const u = ((i * 13) % s.n) / s.n;
      const a = (i / s.n) * TAU * s.dir + ph;
      const r = lerp(s.r0, s.r1, u);
      const x = s.cx + Math.cos(a) * r;
      const y = s.cy + Math.sin(a) * r * 0.78;
      if (y > 690) continue;
      if (Math.hypot(x - MOON.x, y - MOON.y) < 135) continue;
      const len = 24 + 16 * Math.sin(u * TAU * 2 + ph);
      paint(c, x, y, a + (Math.PI / 2) * s.dir + 0.25, len, 6.2, s.col, s.hi, {
        bend: 0.55, al: s.al,
      });
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- road

function drawRoadPaint(g, ctx) {
  const c = g.drawingContext;
  c.save();
  c.lineCap = 'round';
  const scroll = (ctx.t * SPEED) % 2080;
  const rand = rngFor(1207);

  for (let i = 0; i < 230; i += 1) {
    const bx = rand() * 2080;
    const y = 800 + rand() * 118;
    const x = ((bx - scroll) % 2080 + 2080) % 2080 - 560;
    const k = rand();
    paint(c, x, y, -0.02 + (rand() - 0.5) * 0.1, 16 + rand() * 30, 3.4 + rand() * 4,
      k > 0.7 ? '#2f4e7c' : k > 0.35 ? '#24406b' : '#1b335c',
      '#4a709f', { bend: 0.18, al: 0.92 });
  }

  // Center line: short painted dashes riding the same scroll.
  const step = 240;
  for (let n = -6; n < 14; n += 1) {
    const x0 = n * step - scroll + 34;
    const dabs = 4 + Math.floor(rand() * 3);
    for (let d = 0; d < dabs; d += 1) {
      paint(c, x0 + d * 17, 858 + (rand() - 0.5) * 3, 0.025, 13 + rand() * 8, 4.4 + rand() * 1.6,
        d % 2 ? '#e8c14f' : '#f0d879', '#f8eaae', { bend: 0.14, al: 0.9 });
    }
  }

  // Near edge: a dark impasto band, then the far edge's broken light.
  for (let i = 0; i < 90; i += 1) {
    const bx = rand() * 2080;
    const x = ((bx - scroll) % 2080 + 2080) % 2080 - 560;
    paint(c, x, 918 + (rand() - 0.5) * 8, 0.01, 18 + rand() * 24, 4.4,
      '#0e1c33', '#1e3556', { bend: 0.2, al: 0.8 });
  }
  for (let i = 0; i < 80; i += 1) {
    const bx = rand() * 2080;
    const x = ((bx - scroll) % 2080 + 2080) % 2080 - 560;
    paint(c, x, 795 + (rand() - 0.5) * 4, 0.01, 12 + rand() * 18, 2.6,
      '#48699a', '#6a8fbd', { bend: 0.15, al: 0.7 });
  }
  c.restore();
}

// ---------------------------------------------------------------- foreground

function drawForeground(g, c) {
  c.save();
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-500, 944);
  for (let x = -500; x <= 1500; x += 22) {
    c.lineTo(x, 930 + noise1(x * 0.011, 8) * 16);
  }
  c.lineTo(1500, 1120);
  c.lineTo(-500, 1120);
  c.closePath();
  c.fillStyle = '#0b1729';
  c.globalAlpha = 1;
  c.fill();

  c.save();
  c.clip();
  const rand = rngFor(1301);
  for (let i = 0; i < 750; i += 1) {
    const x = -500 + rand() * 2000;
    const y = 928 + rand() * 190;
    const k = rand();
    paint(c, x, y, -0.04 + (rand() - 0.5) * 0.14, 18 + rand() * 34, 4 + rand() * 5,
      k > 0.72 ? '#16294a' : k > 0.4 ? '#10203a' : '#0b1729',
      k > 0.6 ? '#223f66' : '#16284a', { bend: 0.3, al: 0.9 });
  }
  // A fringe of yellow-green at the road edge, tying the palette down.
  for (let i = 0; i < 90; i += 1) {
    const x = -500 + rand() * 2000;
    paint(c, x, 934 + rand() * 10, -1.2 + rand() * 0.6, 6 + rand() * 10, 3,
      i % 3 ? '#7c7a3a' : '#b39a42', null, { al: 0.55 });
  }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawRider(g, ctx, pose) {
  const c = g.drawingContext;
  const S = 1.16;

  // Painted ground shadow.
  for (let i = 0; i < 9; i += 1) {
    paint(c, 380 + i * 22, 823, 0.02, 26, 4.5, '#0c1928', null, { al: 0.5 });
  }

  ctx.rider(g, 468, { style: { ...ctx.style, ...RIDER_STYLE }, shadow: false, scale: S });

  // Body texture: short pale strokes clipped to the pelican's body.
  const bx = 468 + pose.body.x * S;
  const by = 820 + pose.body.y * S;
  c.save();
  c.translate(bx, by);
  c.rotate(pose.body.rot);
  c.beginPath();
  c.ellipse(0, 0, pose.body.rx * S, pose.body.ry * S, 0, 0, TAU);
  c.clip();
  const rand = rngFor(918);
  for (let i = 0; i < 34; i += 1) {
    const x = (rand() - 0.5) * pose.body.rx * 1.7 * S;
    const y = (rand() - 0.5) * pose.body.ry * 1.7 * S;
    paint(c, x, y, -0.06 + (rand() - 0.5) * 0.3, 12 + rand() * 16, 3 + rand() * 2.4,
      rand() > 0.4 ? '#f6eab4' : '#e8d494', '#fdf6da', { bend: 0.4, al: 0.75 });
  }
  c.restore();

  // Beak, head, pouch, tail and frame are painted in rig space so the
  // impasto language carries across the whole figure.
  paintRiderTexture(c, pose, S);

  // Wheel rims get a rim-light of yellow impasto.
  const wheels = [
    { x: 468 + (-72) * S, y: 820 - 50 * S },
    { x: 468 + 72 * S, y: 820 - 50 * S },
  ];
  const rr = rngFor(919);
  for (let w = 0; w < 2; w += 1) {
    for (let i = 0; i < 16; i += 1) {
      if (rr() < 0.18) continue;
      const a = (i / 16) * TAU + 0.1 + rr() * 0.06;
      const rad = 50 * S + (rr() - 0.5) * 2.5;
      const wx = wheels[w].x + Math.cos(a) * rad;
      const wy = wheels[w].y + Math.sin(a) * rad;
      paint(c, wx, wy, a + Math.PI / 2, 12 + rr() * 7, 3 + rr() * 1.6,
        rr() > 0.4 ? '#d9b348' : '#f0d879', '#f7e9bd', {
          bend: 0.2, al: 0.6 + rr() * 0.25,
        });
    }
  }
}

function paintRiderTexture(c, pose, S) {
  const rand = rngFor(921);
  c.save();
  c.translate(468, 820);
  c.scale(S, S);

  const h = pose.head;
  const eye = { x: h.x + 7, y: h.y - 5 };

  // Head, keeping clear of the eye.
  c.save();
  c.beginPath();
  c.arc(h.x, h.y, 19, 0, TAU);
  c.clip();
  for (let i = 0; i < 32; i += 1) {
    const a = rand() * TAU;
    const rr = Math.sqrt(rand()) * 18;
    const px = h.x + Math.cos(a) * rr;
    const py = h.y + Math.sin(a) * rr;
    if (Math.hypot(px - eye.x, py - eye.y) < 10.5) continue;
    paint(c, px, py, -0.25 + rand() * 0.5, 6 + rand() * 8, 2 + rand() * 1.6,
      rand() > 0.4 ? '#f6eab4' : '#e6d28c', '#fdf6da', { bend: 0.4, al: 0.8 });
  }
  c.restore();

  // Beak.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  const bx = bt.x - bb.x;
  const by = bt.y - bb.y;
  const bang = Math.atan2(by, bx);
  c.save();
  c.beginPath();
  c.moveTo(bb.x - 2, bb.y - 6);
  c.quadraticCurveTo(bb.x + 34, bb.y - 8, bt.x, bt.y - 3);
  c.quadraticCurveTo(bb.x + 52, bb.y + 2, bb.x - 2, bb.y + 2);
  c.closePath();
  c.clip();
  for (let i = 0; i < 18; i += 1) {
    const t = rand();
    const px = bb.x + bx * t;
    const py = bb.y + by * t - 4 + rand() * 4;
    paint(c, px, py, bang + (rand() - 0.5) * 0.25, 8 + rand() * 10, 2 + rand() * 1.6,
      rand() > 0.5 ? '#e8b23e' : '#f0c766', '#f7e0a0', { bend: 0.25, al: 0.85 });
  }
  c.restore();

  // Pouch.
  c.save();
  c.beginPath();
  c.ellipse(bb.x + 44, bb.y + 11, 32, 12, 0.06, 0, TAU);
  c.clip();
  for (let i = 0; i < 24; i += 1) {
    const px = bb.x + 12 + rand() * 64;
    const py = bb.y - 1 + rand() * 22;
    paint(c, px, py, 0.1 + (rand() - 0.5) * 0.35, 7 + rand() * 9, 2.2 + rand() * 1.6,
      rand() > 0.5 ? '#e0a63a' : '#ecc060', '#f6dca0', { bend: 0.4, al: 0.8 });
  }
  c.restore();

  // Mandible seam and pouch underside, so the bill reads as two parts.
  c.save();
  c.strokeStyle = '#94631f';
  c.globalAlpha = 0.85;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(bb.x + 2, bb.y + 2);
  c.quadraticCurveTo(bb.x + 54, bb.y + 8, bt.x - 16, bt.y + 2);
  c.stroke();
  c.strokeStyle = '#7a5119';
  c.globalAlpha = 0.7;
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(bb.x + 8, bb.y + 17);
  c.quadraticCurveTo(bb.x + 36, bb.y + 26, bb.x + 66, bb.y + 18);
  c.stroke();
  c.restore();

  // Tail.
  const tl = pose.tail;
  c.save();
  c.beginPath();
  c.moveTo(tl.x + 14, tl.y - 14);
  c.lineTo(tl.x - 24, tl.y - 26);
  c.lineTo(tl.x - 34, tl.y - 10);
  c.lineTo(tl.x - 40, tl.y + 8);
  c.lineTo(tl.x - 18, tl.y + 10);
  c.lineTo(tl.x + 12, tl.y + 12);
  c.closePath();
  c.clip();
  for (let i = 0; i < 18; i += 1) {
    const px = tl.x - 38 + rand() * 50;
    const py = tl.y - 24 + rand() * 34;
    paint(c, px, py, -2.9 + rand() * 0.4, 8 + rand() * 10, 2.4, '#d8c178', '#f0e2a8', {
      bend: 0.3, al: 0.7,
    });
  }
  c.restore();

  // Wing dashes across the arm to the bar.
  const sh = pose.shoulder;
  const gr = pose.grip;
  for (let i = 0; i < 12; i += 1) {
    const t = rand();
    const px = lerp(sh.x - 6, gr.x - 2, t);
    const py = lerp(sh.y + 8, gr.y - 4, t) - 4;
    paint(c, px, py, -0.15 + rand() * 0.2, 6 + rand() * 8, 2.2 + rand() * 1.4,
      '#e6ce86', '#f6eab4', { bend: 0.3, al: 0.7 });
  }

  // Neck: short strokes along the curve, so the funnel is painted too.
  const nk = pose.neck;
  for (let i = 0; i < 16; i += 1) {
    const u = i / 15;
    const v = 1 - u;
    const px = v * v * v * nk[0].x + 3 * v * v * u * nk[1].x
      + 3 * v * u * u * nk[2].x + u * u * u * nk[3].x;
    const py = v * v * v * nk[0].y + 3 * v * v * u * nk[1].y
      + 3 * v * u * u * nk[2].y + u * u * u * nk[3].y;
    paint(c, px + (rand() - 0.5) * 8, py + (rand() - 0.5) * 6, 1.2 + (rand() - 0.5) * 0.5,
      7 + rand() * 7, 2 + rand() * 1.4,
      rand() > 0.5 ? '#f0e2a8' : '#e6d28c', '#fdf6da', { bend: 0.35, al: 0.7 });
  }

  // Frame tubes get a painted ridge so the bike is not a vector diagram.
  const frame = pose.frame;
  const tubes = [
    [frame.rearHub, frame.crank], [frame.crank, frame.seatCluster],
    [frame.seatCluster, frame.rearHub], [frame.crank, frame.headTop],
    [frame.seatCluster, frame.headTop], [frame.headTop, frame.frontHub],
  ];
  for (const [a, b] of tubes) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    paint(c, mid.x + 1.4, mid.y + 1.6, ang, len, 3.6, '#8a6420', null, {
      bend: 0.05, al: 0.6,
    });
    paint(c, mid.x - 1.2, mid.y - 1.4, ang, len, 3, '#e8c14f', '#fbf2cd', {
      bend: 0.05, al: 0.75,
    });
  }

  // Leg highlights.
  for (const leg of [pose.legs.near, pose.legs.far]) {
    const hip = pose.hip;
    const m1 = { x: (hip.x + leg.knee.x) / 2, y: (hip.y + leg.knee.y) / 2 };
    paint(c, m1.x, m1.y, Math.atan2(leg.knee.y - hip.y, leg.knee.x - hip.x),
      Math.hypot(leg.knee.x - hip.x, leg.knee.y - hip.y) * 0.7, 2.6, '#e8b23e', '#f7e0a0', {
        bend: 0.05, al: 0.5,
      });
  }

  c.restore();
}

// ---------------------------------------------------------------- star wheel
function paintRing(c, cx, cy, r, w, color, hi, al, seed, segments, bend = 0.12) {
  const rand = rngFor(seed);
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * TAU + 0.02;
    const rr = r + (rand() - 0.5) * 2.4;
    paint(c, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2,
      (rr * TAU) / segments + 2.5, w * (0.85 + rand() * 0.3), color, hi, {
        bend, al,
      });
  }
}

function drawStarWheel(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const k = clamp((local - GAG_START) / 0.85);
  const e = easeInOut(k);

  // Cubic descent from its home in the sky to the road ahead of the bike.
  const u = e;
  const v = 1 - u;
  const p0x = 820;
  const p0y = 210;
  const p1x = 930;
  const p1y = 430;
  const p2x = 790;
  const p2y = 660;
  const p3x = 722;
  const p3y = LAND_Y;
  let x = v * v * v * p0x + 3 * v * v * u * p1x + 3 * v * u * u * p2x + u * u * u * p3x;
  let y = v * v * v * p0y + 3 * v * v * u * p1y + 3 * v * u * u * p2y + u * u * u * p3y;

  const roll = Math.max(0, local - 3);
  if (roll > 0) {
    x = 722 + roll * 195;
    y = LAND_Y - Math.exp(-roll * 4.5) * 26 * Math.abs(Math.sin(roll * 11));
  }

  const r = lerp(26, 56, e);
  const spin = local * 8.2;

  c.save();
  c.lineCap = 'round';

  // Pre-landing: still a star, its rings unspooling.
  if (e < 0.98) {
    const sa = 1 - e;
    for (let ring = 0; ring < 3; ring += 1) {
      const rr = r * (0.6 + ring * 0.4);
      paintRing(c, x, y, rr, 3.6 + ring * 0.8, ring ? '#f2d46a' : '#e8c14f', '#f7e9bd',
        sa * 0.85, 1200 + ring, 14 + ring * 4, 0.4);
    }
    const rand = rngFor(1250);
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + spin * 0.15;
      paint(c, x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5, a,
        r * 0.7, 3.2, '#f2d46a', null, { al: sa * 0.8, bend: 0.2 });
      if (rand() > 0.7) {
        paint(c, x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9, a + 0.4,
          r * 0.4, 2.6, '#f7e9bd', null, { al: sa * 0.6 });
      }
    }
  }

  // The wheel proper.
  if (e > 0.02) {
    const wa = clamp(e * 1.1);
    const tire = clamp((e - 0.25) / 0.55);
    paintRing(c, x, y, r + 5, 6.5, '#0d1a2e', '#294469', 0.9 * tire, 1299, 24, 0.14);
    paintRing(c, x, y, r, 8.5, '#e8c14f', '#f7e9bd', 0.95 * wa, 1300, 22, 0.15);
    paintRing(c, x, y, r * 0.98, 3.4, '#f2d46a', null, 0.8 * wa, 1301, 26, 0.1);
    paintRing(c, x, y, r * 0.68, 3.2, '#d3ab42', '#f7e9bd', 0.85 * wa, 1302, 20, 0.2);
    paintRing(c, x, y, r * 0.6, 2.2, '#e8c14f', null, 0.7 * wa, 1303, 18, 0.2);

    // Spokes, spinning with the crank.
    for (let i = 0; i < 8; i += 1) {
      const a = spin + (i / 8) * TAU;
      paint(c, x + Math.cos(a) * r * 0.36, y + Math.sin(a) * r * 0.36,
        a, r * 0.72, 3.2, '#e8c14f', '#fbf2cd', { bend: 0.05, al: 0.9 * wa });
    }
    // Hub.
    c.globalAlpha = wa;
    c.fillStyle = '#f7e9bd';
    c.beginPath();
    c.arc(x, y, 5.2, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
  }

  // Paint trail left on the road and spiralling up into the swirl.
  if (roll > 0.02) {
    const a = clamp((roll - 0.02) / 0.7);
    for (let i = 0; i < 10; i += 1) {
      const bx = x - 60 - i * 27;
      const by = LAND_Y + 2 - i * 2.5 - Math.sin(i * 0.6) * 10;
      paint(c, bx, by, -0.08 + i * 0.015, 28 + i * 3.4, 6.6 - i * 0.35,
        i % 3 ? '#e8c14f' : '#f2d46a', '#f7e9bd', {
          bend: 0.6, al: a * (0.55 - i * 0.045),
        });
    }
  }
  const lift = clamp((local - 2.95) / 0.5) * (1 - clamp((local - 4.6) / 0.9));
  if (lift > 0.01) {
    for (let i = 0; i < 16; i += 1) {
      const u2 = i / 15;
      const sx = lerp(x - 20, VX + 40, u2);
      const sy = lerp(LAND_Y - 40, 430, u2) + Math.sin(u2 * 5.2) * 34;
      paint(c, sx, sy, -0.7 + u2 * 0.9, 20 + u2 * 16, 5, '#e8c14f', '#f7e9bd', {
        bend: 0.7, al: lift * 0.38 * (1 - u2 * 0.3),
      });
    }
  }

  c.restore();
}

// ---------------------------------------------------------------- title

function brushText(c, text, x, y, size, weight, font, color, seed, spacing) {
  const rand = rngFor(seed);
  setFont(c, size, weight, font, spacing);
  c.fillStyle = color;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const base = c.globalAlpha;
  for (let pass = 0; pass < 3; pass += 1) {
    c.save();
    c.translate(x + (rand() - 0.5) * 1.8, y + (rand() - 0.5) * 1.6);
    c.rotate((rand() - 0.5) * 0.014);
    c.globalAlpha = base * (pass === 0 ? 1 : 0.42);
    c.fillText(text, 0, 0);
    c.restore();
  }
}

function drawTitle(g, opacity, lift) {
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const baseY = H - 156 * s + lift * s;

  c.save();
  c.globalAlpha = opacity;

  // A soft painted scrim, not a UI panel: darkness pooled at the corner and
  // brushed out into the sky.
  const gx = x + 190 * s;
  const gy = H + 30 * s;
  const grd = c.createRadialGradient(gx, gy, 0, gx, gy, 700 * s);
  grd.addColorStop(0, 'rgba(6, 12, 24, 0.95)');
  grd.addColorStop(0.4, 'rgba(7, 14, 28, 0.68)');
  grd.addColorStop(0.75, 'rgba(8, 16, 32, 0.28)');
  grd.addColorStop(1, 'rgba(8, 16, 32, 0)');
  c.fillStyle = grd;
  c.fillRect(0, H - 800 * s, 1200 * s, 820 * s);

  // A few blue daubs so the scrim is painted, not poured.
  const rand = rngFor(1889);
  for (let i = 0; i < 40; i += 1) {
    const px = x - 20 * s + rand() * 560 * s;
    const py = baseY - 84 * s + rand() * 130 * s;
    paint(c, px, py, -0.02 + (rand() - 0.5) * 0.12, 12 * s + rand() * 24 * s,
      3.2 * s + rand() * 2.6 * s, rand() > 0.6 ? '#1f3a66' : '#17294f',
      '#2f5488', { bend: 0.3, al: 0.28 * opacity });
  }

  // Yellow brush lettering.
  c.globalAlpha = opacity;
  brushText(c, '12  /  20', x, baseY - 72 * s, 15 * s, 600, EN_FONT, '#f0d879', 71, '3px');
  brushText(c, '星月夜', x, baseY - 18 * s, 48 * s, 600, CN_FONT, '#f2d46a', 72, '1px');
  brushText(c, 'THE STARRY NIGHT', x, baseY + 16 * s, 19 * s, 500, EN_FONT, '#f6e6b4', 73, '2.6px');
  brushText(c, '1889 · 圣雷米', x, baseY + 46 * s, 17 * s, 400, CN_FONT, '#e8c14f', 74, '1px');

  // Brush rule under the number.
  for (let i = 0; i < 8; i += 1) {
    paint(c, x + i * 7 * s, baseY - 92 * s, 0.01, 10 * s, 3.4 * s,
      i % 3 ? '#e8c14f' : '#f2d46a', '#f7e9bd', { al: 0.85 * opacity });
  }
  c.restore();
}
