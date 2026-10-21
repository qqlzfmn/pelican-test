// 4 — Tang baimiao. Even, unmodulated ink line on warm silk: no washes on the
// figure, no shading, a great deal of empty paper. The silk and the static
// linework (bamboo, rock, ground, faint clouds) are cached; the pelican, its
// streaming scarf and feathers, the apsara ribbon and the spiral wheel are
// painted live in ink.
//
// Wind: the gag bar lifts scarf and pouch and turns the front wheel into an ink
// spiral while the pelican keeps its composure.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { rngFor, TAU, smoothstep } from '../kit/math.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { paperCanvas } from '../kit/texture.js';
import { rigPose } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const PAPER = '#efe6d3';
const INK = '#2b2722';
const SEPIA = '#9c7b4f';
const SEAL = '#a8412c';

const pal = basePalette({
  bg: PAPER,
  bg2: '#e5d8be',
  motif: SEPIA,
  accent: '#8a6537',
  ink: INK,
  titleInk: INK,
  scrim: PAPER,
  ground: '#eadfc7',
  road: '#f2e9d7',
  dash: '#f2e9d7',
  verge: '#e3d6bb',
  body: '#f5eddd',
  beak: '#a9763f',
  rigInk: INK,
});

export default {
  id: 's04',
  number: 4,
  cn: '唐代白描',
  en: 'Tang Line Drawing',
  year: '约750 · 吴带当风',
  motif: 'ribbon',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    c.fillStyle = PAPER;
    c.fillRect(-800, -150, 2400, 1250);

    const silk = cachedLayer(ctx, 's04-silk', drawSilk);
    c.drawImage(silk.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    // Road as a pale silk band, its edges drawn in ink afterwards.
    ctx.road(g, {
      ground: '#ebe0ca',
      verge: '#e6dac1',
      road: '#f2e9d7',
      edge: '#f2e9d7',
      dash: '#f2e9d7',
      ink: INK,
      dust: false,
    });

    const statics = cachedLayer(ctx, 's04-lines', drawStaticLines);
    c.drawImage(statics.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    const wind = windAt(ctx.local);
    drawSkyRibbon(g, ctx, wind);
    drawDrift(g, ctx, wind);
    drawTangRider(g, ctx, wind);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawTangTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- wind

function windAt(local) {
  const ramp = smoothstep(1.15, 1.95, local) * (1 - smoothstep(4.95, 5.75, local));
  const pulse = 0.5 + 0.5 * Math.cos(TAU * local);
  return ramp * (0.6 + 0.4 * pulse);
}

function spiralAt(local) {
  return smoothstep(1.9, 2.25, local) * (1 - smoothstep(4.25, 4.85, local));
}

// ---------------------------------------------------------------- silk

function drawSilk(g, c) {
  const { x0, y0, w, h } = CACHE;

  c.fillStyle = PAPER;
  c.fillRect(x0, y0, w, h);

  const paper = paperCanvas(1500, 825, {
    tone: PAPER,
    seed: 44,
    fiber: 2200,
    specks: 4200,
  });
  c.save();
  c.globalAlpha = 0.92;
  c.drawImage(paper, x0, y0, w, h);
  c.restore();

  // Broad tea stains and a warm drift across the sheet.
  const rand = rngFor(404);
  for (let i = 0; i < 10; i += 1) {
    const sx = x0 + rand() * w;
    const sy = y0 + rand() * h;
    const r = 110 + rand() * 320;
    const gr = c.createRadialGradient(sx, sy, r * 0.08, sx, sy, r);
    gr.addColorStop(0, `rgba(156, 123, 79, ${0.035 + rand() * 0.05})`);
    gr.addColorStop(0.55, `rgba(156, 123, 79, ${0.015 + rand() * 0.02})`);
    gr.addColorStop(1, 'rgba(156, 123, 79, 0)');
    c.fillStyle = gr;
    c.fillRect(sx - r, sy - r, r * 2, r * 2);
  }

  // Silk weave: warp and weft, fine but continuous.
  c.save();
  c.lineCap = 'butt';
  for (let x = x0; x <= x0 + w; x += 3.2) {
    const j = (rand() - 0.5) * 0.8;
    c.strokeStyle = alpha(SEPIA, 0.045 + rand() * 0.03);
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(x + j, y0);
    c.lineTo(x + j, y0 + h);
    c.stroke();
  }
  for (let y = y0; y <= y0 + h; y += 3.2) {
    const j = (rand() - 0.5) * 0.8;
    c.strokeStyle = alpha(SEPIA, 0.038 + rand() * 0.026);
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(x0, y + j);
    c.lineTo(x0 + w, y + j);
    c.stroke();
  }
  for (let i = 0; i < 110; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    c.strokeStyle = alpha(SEPIA, 0.05 + rand() * 0.03);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y + 6 + rand() * 16);
    c.stroke();
  }
  c.restore();

  // Two soft creases, as if the scroll was rolled.
  for (const fx of [110, 1250]) {
    const gr = c.createLinearGradient(fx - 26, 0, fx + 30, 0);
    gr.addColorStop(0, 'rgba(90, 66, 40, 0)');
    gr.addColorStop(0.5, 'rgba(90, 66, 40, 0.05)');
    gr.addColorStop(0.62, 'rgba(255, 250, 238, 0.12)');
    gr.addColorStop(1, 'rgba(90, 66, 40, 0)');
    c.fillStyle = gr;
    c.fillRect(fx - 26, y0, 56, h);
  }

  // Loose fibres of silk.
  c.save();
  c.strokeStyle = 'rgba(255, 252, 244, 0.22)';
  c.lineWidth = 0.8;
  for (let i = 0; i < 540; i += 1) {
    const x = x0 + rand() * w;
    const y = y0 + rand() * h;
    const len = 4 + rand() * 16;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(
      x + len * 0.5,
      y + (rand() - 0.5) * 2,
      x + len,
      y + (rand() - 0.5) * 3,
    );
    c.stroke();
  }
  c.restore();

  const vg = c.createRadialGradient(
    x0 + w / 2,
    y0 + h * 0.46,
    Math.min(w, h) * 0.34,
    x0 + w / 2,
    y0 + h * 0.46,
    Math.max(w, h) * 0.7,
  );
  vg.addColorStop(0, 'rgba(90, 64, 36, 0)');
  vg.addColorStop(1, 'rgba(90, 64, 36, 0.14)');
  c.fillStyle = vg;
  c.fillRect(x0, y0, w, h);
}

// ---------------------------------------------------------------- static ink

function drawStaticLines(g, c) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  drawDistantGround(c);
  drawGroundInk(c);
  drawForegroundStones(c);
  drawForegroundReeds(c);
  drawBamboo(c, -300, 856, 1010, 0.2, 1, 701);
  drawBamboo(c, -196, 848, 790, 0.12, 0.52, 704);
  drawBamboo(c, -408, 846, 560, 0.08, 0.34, 707);
  drawRock(c, 1000, 850);
  drawGrass(c);
  drawCloudCurls(c);

  c.restore();
}

function drawDistantGround(c) {
  dry(c, [
    { x: -500, y: 726 }, { x: -360, y: 712 }, { x: -240, y: 720 },
    { x: -110, y: 700 }, { x: 40, y: 716 }, { x: 190, y: 706 },
    { x: 330, y: 722 }, { x: 470, y: 714 }, { x: 600, y: 724 },
  ], 1.7, 0.24, 311, 0.06);
  dry(c, [
    { x: 760, y: 736 }, { x: 900, y: 724 }, { x: 1040, y: 734 },
    { x: 1180, y: 722 }, { x: 1330, y: 732 }, { x: 1500, y: 724 },
  ], 1.4, 0.18, 312, 0.08);
}

function drawGroundInk(c) {
  const rand = rngFor(88);

  // Road edges: the far edge is almost lost, the near edge carries the weight.
  dry(c, [
    { x: -500, y: 809 }, { x: -60, y: 810 }, { x: 380, y: 808 },
    { x: 820, y: 810 }, { x: 1250, y: 808 }, { x: 1500, y: 809 },
  ], 2.2, 0.3, 331, 0.05);
  dry(c, [
    { x: -500, y: 918 }, { x: -120, y: 916 }, { x: 300, y: 919 },
    { x: 760, y: 916 }, { x: 1180, y: 918 }, { x: 1500, y: 917 },
  ], 2.9, 0.56, 332, 0.04);

  // Faint wheel tracks level with the tyres' actual contact line.
  for (let i = 0; i < 26; i += 1) {
    const x = -420 + rand() * 1860;
    const y = 854 + rand() * 8;
    const len = 10 + rand() * 46;
    c.strokeStyle = alpha(INK, 0.1 + rand() * 0.12);
    c.lineWidth = 1 + rand() * 0.8;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y - 1.5, x + len, y);
    c.stroke();
  }

  // Short cross-ticks give the road a brushed edge without filling it.
  for (let i = 0; i < 18; i += 1) {
    const x = -380 + rand() * 1800;
    const y = i % 2 ? 811 : 917;
    ink(c, [
      { x, y: y - 1 },
      { x: x + 6 + rand() * 8, y: y + 4 + rand() * 3 },
    ], 1.3, 0.22 + rand() * 0.12);
  }

  // Stones at the verges only.
  for (let i = 0; i < 20; i += 1) {
    const x = i < 10 ? -430 + rand() * 250 : 1180 + rand() * 300;
    const y = 842 + rand() * 26;
    const r = 2 + rand() * 5;
    c.strokeStyle = alpha(INK, 0.2 + rand() * 0.2);
    c.lineWidth = 1.1;
    c.beginPath();
    c.ellipse(x, y, r, r * 0.45, (rand() - 0.5) * 0.3, 0, TAU);
    c.stroke();
  }
}

function drawForegroundStones(c) {
  const stones = [
    [-260, 1072, 96, 42, 0.1],
    [-118, 1094, 64, 30, -0.2],
    [36, 1082, 40, 20, 0.3],
    [1164, 1070, 74, 34, -0.1],
    [1300, 1090, 52, 24, 0.2],
  ];
  for (let s = 0; s < stones.length; s += 1) {
    const [cx, cy, rx, ry, rot] = stones[s];
    const rand = rngFor(940 + s);
    const loop = [];
    const n = 11;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU;
      const wob = 1 + (rand() - 0.5) * 0.3;
      loop.push({
        x: cx + Math.cos(a) * rx * wob * Math.cos(rot) - Math.sin(a) * ry * wob * Math.sin(rot),
        y: cy + Math.cos(a) * rx * wob * Math.sin(rot) + Math.sin(a) * ry * wob * Math.cos(rot),
      });
    }
    inkAngular(c, loop, 2.4, 0.3);
    ink(c, [
      { x: cx - rx * 0.3, y: cy - 2 },
      { x: cx + rx * 0.1, y: cy + 3 },
      { x: cx + rx * 0.4, y: cy - 1 },
    ], 1.4, 0.2);
  }

  // A bank edge running under the road, almost lost in the silk.
  dry(c, [
    { x: -500, y: 1012 },
    { x: -260, y: 1016 },
    { x: 60, y: 1010 },
    { x: 420, y: 1014 },
  ], 1.8, 0.16, 951, 0.05);
}

function drawForegroundReeds(c) {
  const rand = rngFor(521);
  for (let i = 0; i < 16; i += 1) {
    const x = -520 + rand() * 260;
    const baseY = 1040 + rand() * 60;
    const len = 150 + rand() * 170;
    const bend = 20 + rand() * 46;
    const pts = [];
    for (let k = 0; k <= 8; k += 1) {
      const u = k / 8;
      pts.push({
        x: x + bend * u * u + Math.sin(u * 2.4 + i) * 8 * u,
        y: baseY - len * u,
      });
    }
    ink(c, pts, 2 + rand() * 1.4, 0.42 + rand() * 0.2);
    if (i % 3 === 0) {
      // A seed head: a few short outward strokes.
      const tip = pts[8];
      for (let k = 0; k < 5; k += 1) {
        ink(c, [
          tip,
          { x: tip.x + 4 + k * 2, y: tip.y + 8 + k * 4 },
        ], 1.1, 0.35);
      }
    }
  }
}

function drawBamboo(c, x0, baseY, height, lean, tone, seed) {
  const rand = rngFor(seed);
  const N = 13;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const y = baseY - height * t;
    const x =
      x0 +
      lean * height * t * t * 0.24 +
      Math.sin(t * 3.2 + seed * 0.4) * 7 * (1 - t * 0.4);
    const wdt = (6.2 - 2.6 * t) * (1 + 0.12 * Math.sin(i * 2.1));
    left.push({ x: x - wdt / 2, y });
    right.push({ x: x + wdt / 2, y });
  }

  dry(c, left, 2.6, 0.62 * tone, seed + 1, 0.035);
  dry(c, right, 2.6, 0.62 * tone, seed + 2, 0.035);

  for (let i = 1; i < N; i += 1) {
    const p = left[i];
    const q = right[i];
    ink(c, [
      { x: p.x - 1.8, y: p.y - 0.6 },
      { x: q.x + 1.8, y: q.y + 0.6 },
    ], 1.9, 0.64 * tone);
    if (i % 2 === 0) {
      ink(c, [
        { x: q.x + 1, y: q.y - 3 },
        { x: q.x + 1.4, y: q.y + 3 },
      ], 1.3, 0.4 * tone);
    }
  }

  // Leaf clusters: fanning, drooping, pushed right by the wind.
  for (let i = 2; i < N; i += 1) {
    if (i % 3 !== 2) continue;
    const node = i % 2 ? left[i] : right[i];
    const side = i % 2 ? -1 : 1;
    const branchLen = 22 + rand() * 48;
    const ang = side > 0 ? 0.1 + rand() * 0.5 : Math.PI - 0.1 - rand() * 0.55;
    const bx = node.x + Math.cos(ang) * branchLen;
    const by = node.y + Math.sin(ang) * branchLen * 0.75;
    ink(c, [node, { x: bx, y: by }], 1.4, 0.5 * tone);

    const leaves = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < leaves; k += 1) {
      const a = -0.35 + rand() * 1.15 + (side > 0 ? 0.2 : Math.PI * 0.7);
      const len = 18 + rand() * 24;
      brushLeaf(
        c,
        bx + (rand() - 0.5) * 10,
        by + (rand() - 0.5) * 10,
        a,
        len,
        2.4 + rand() * 1.6,
        INK,
        (0.36 + rand() * 0.26) * tone,
      );
    }
  }

  // Crown: two thin branches loaded with leaves, cut by the top of the sheet.
  for (let b = 0; b < 3; b += 1) {
    const node = left[N - 3 + b];
    const dir = b % 2 ? -1 : 1;
    const tipX = node.x + dir * (36 + b * 20);
    const tipY = node.y - 26 - b * 10;
    ink(c, [node, { x: tipX, y: tipY }], 1.3, 0.42 * tone);
    for (let k = 0; k < 7; k += 1) {
      const a = (dir > 0 ? -0.2 : Math.PI * 0.85) + (rand() - 0.5) * 1.5;
      brushLeaf(
        c,
        tipX + (rand() - 0.5) * 14,
        tipY + (rand() - 0.5) * 14,
        a,
        18 + rand() * 26,
        2.2 + rand() * 1.8,
        INK,
        (0.3 + rand() * 0.22) * tone,
      );
    }
  }
}

function drawRock(c, x, baseY) {
  const pts = [
    [-30, 0], [-44, -28], [-36, -58], [-50, -90], [-34, -122],
    [-48, -158], [-36, -190], [-54, -226], [-38, -262], [-46, -298],
    [-24, -328], [-6, -356], [18, -372], [30, -340], [22, -310],
    [40, -286], [42, -254], [62, -228], [52, -200], [70, -174],
    [60, -144], [80, -118], [64, -90], [82, -64], [66, -32], [44, 0],
  ];
  const outline = pts.map(([dx, dy]) => ({ x: x + dx, y: baseY + dy }));
  inkAngular(c, outline, 3.4, 0.9);

  // Hollows: drawn as wobbly loops, never perfect ovals.
  const holes = [
    [16, -262, 13, 25, 0.2, 17],
    [20, -150, 17, 29, -0.25, 19],
    [48, -96, 8, 13, 0.1, 11],
    [-12, -330, 7, 11, 0.4, 13],
  ];
  for (let h = 0; h < holes.length; h += 1) {
    const [dx, dy, rx, ry, rot, n] = holes[h];
    const loop = [];
    const hr = rngFor(670 + h);
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * TAU;
      const wob = 1 + (hr() - 0.5) * 0.34;
      loop.push({
        x: x + dx + Math.cos(a) * rx * wob * Math.cos(rot) - Math.sin(a) * ry * wob * Math.sin(rot),
        y: baseY + dy + Math.cos(a) * rx * wob * Math.sin(rot) + Math.sin(a) * ry * wob * Math.cos(rot),
      });
    }
    inkAngular(c, loop, 2.4, 0.78);
  }

  // Crevices: vertical, taut, like a stone folded by water.
  const crevices = [
    [[-30, -300], [-18, -252], [-30, -212]],
    [[32, -352], [42, -310], [32, -272]],
    [[58, -230], [46, -192], [60, -160]],
    [[14, -108], [34, -78], [22, -40]],
    [[-24, -104], [-8, -72], [-20, -34]],
    [[50, -300], [58, -274]],
  ];
  for (let i = 0; i < crevices.length; i += 1) {
    const line = crevices[i].map(([dx, dy]) => ({ x: x + dx, y: baseY + dy }));
    dry(c, line, 1.9, 0.55, 640 + i, 0.04);
  }

  // Base: the stone sits on the ground; there is no shadow in this drawing.
  dry(c, [
    { x: x - 36, y: baseY + 1 },
    { x: x + 20, y: baseY + 2 },
    { x: x + 90, y: baseY + 1 },
    { x: x + 150, y: baseY + 2 },
  ], 2.6, 0.42, 651, 0.03);

  for (let k = 0; k < 7; k += 1) {
    const gx = x - 34 + k * 30;
    const ang = -1.8 + k * 0.2;
    blade(c, gx, baseY + 2, ang + Math.PI * 0.5, 22 + (k % 3) * 12, 0.34);
  }
}

function drawGrass(c) {
  const rand = rngFor(771);
  for (let i = 0; i < 26; i += 1) {
    const x = i < 13 ? -460 + rand() * 240 : 1180 + rand() * 300;
    const y = 828 + rand() * 20;
    const blades = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < blades; k += 1) {
      blade(c, x + k * 3, y, -Math.PI * 0.5 + (rand() - 0.5) * 0.9, 12 + rand() * 26, 0.3);
    }
  }
}

function blade(c, x, y, ang, len, a) {
  c.strokeStyle = alpha(INK, a);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(x, y);
  c.quadraticCurveTo(
    x + Math.cos(ang) * len * 0.55 + 3,
    y + Math.sin(ang) * len * 0.55,
    x + Math.cos(ang + 0.35) * len,
    y + Math.sin(ang + 0.35) * len,
  );
  c.stroke();
}

function drawCloudCurls(c) {
  for (let i = 0; i < 3; i += 1) {
    const cx = -240 + i * 210;
    const cy = 110 + (i % 2) * 46;
    const pts = [];
    for (let k = 0; k <= 34; k += 1) {
      const u = k / 34;
      const a = u * TAU * 1.2 + i;
      const r = 38 * (1 - u * 0.82);
      pts.push({ x: cx + Math.cos(a) * r + u * 66, y: cy + Math.sin(a) * r * 0.68 });
    }
    dry(c, pts, 1.5, 0.16, 900 + i, 0.05);
  }
}

// ---------------------------------------------------------------- sky ribbon

function drawSkyRibbon(g, ctx, wind) {
  const c = g.drawingContext;
  const local = ctx.local;
  const drift = Math.sin(local * 0.55) * 12;

  const top = [];
  const bottom = [];
  const N = 58;
  for (let i = 0; i < N; i += 1) {
    const s = i / (N - 1);
    const x = 70 + drift + s * 640 + Math.sin(s * 4.4 - local * 0.4) * 34;
    const y =
      222 -
      Math.sin(s * Math.PI * 1.75 + 0.35) * (66 + 16 * wind) +
      Math.sin(s * 9.2 + local * 0.8) * 18 +
      s * 70;
    const twist = 0.5 + 0.5 * Math.sin(s * 9.4 + local * 1.3);
    const taper = Math.sin(Math.PI * (0.1 + s * 0.8));
    const half = (2 + 14 * twist) * taper;
    top.push({ x, y: y - half });
    bottom.push({ x, y: y + half });
  }

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  dry(c, top, 2.4, 0.66, 1201, 0.045);
  dry(c, bottom, 2.4, 0.58, 1202, 0.045);

  for (let i = 7; i < N - 8; i += 8) {
    c.strokeStyle = alpha(INK, 0.34);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(top[i].x, top[i].y);
    c.lineTo(bottom[i].x, bottom[i].y);
    c.stroke();
  }

  // The right end curls up and over itself, like a flying sash.
  const end = top[N - 1];
  const curl = [];
  for (let k = 0; k <= 26; k += 1) {
    const u = k / 26;
    const a = -1.1 + u * TAU * 0.95;
    const r = 30 * (1 - u * 0.55);
    curl.push({ x: end.x + 12 + Math.cos(a) * r, y: end.y - 24 + Math.sin(a) * r });
  }
  ink(c, curl, 1.9, 0.5);
  ink(c, [
    bottom[N - 1],
    { x: bottom[N - 1].x + 44, y: bottom[N - 1].y + 34 },
    { x: bottom[N - 1].x + 34, y: bottom[N - 1].y + 62 },
  ], 1.7, 0.4);

  const start = top[0];
  const scarfCurl = [];
  for (let k = 0; k <= 20; k += 1) {
    const u = k / 20;
    const a = 1.9 - u * TAU * 0.8;
    const r = 24 * (1 - u * 0.5);
    scarfCurl.push({ x: start.x - 10 + Math.cos(a) * r, y: start.y + 8 + Math.sin(a) * r });
  }
  ink(c, scarfCurl, 1.5, 0.38);
  c.restore();
}

function drawDrift(g, ctx, wind) {
  if (wind < 0.04) return;
  const c = g.drawingContext;
  const local = ctx.local;
  c.save();
  for (let i = 0; i < 5; i += 1) {
    const x = -350 + (((i * 389 + local * (70 + i * 22)) % 1880) + 1880) % 1880;
    const y = 300 + i * 118 + Math.sin(local * 1.1 + i * 1.7) * 26;
    const edge = smoothstep(-390, -290, x) * (1 - smoothstep(1290, 1420, x));
    const a = wind * edge * (0.3 + i * 0.04);
    if (a < 0.02) continue;
    const ang = 0.2 + Math.sin(local * 1.6 + i) * 0.7;
    brushLeaf(c, x, y, ang, 24 + i * 6, 2.4, INK, a);
  }
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawTangRider(g, ctx, wind) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const spiral = spiralAt(ctx.local);

  c.save();
  c.translate(468, 855);
  c.scale(1.2, 1.2);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  drawGroundContact(c);

  // Far leg and crank, faint: the near side is what we read.
  drawLeg(c, pose.legs.far, pose.hip, 0.28, false);
  ink(c, [pose.crankCenter, pose.pedals.far], 1.8, 0.28);
  ink(c, [
    { x: pose.pedals.far.x - 7, y: pose.pedals.far.y - 1 },
    { x: pose.pedals.far.x + 7, y: pose.pedals.far.y },
  ], 1.7, 0.26);

  drawWheel(c, pose.wheels.rear, pose.wheelAngle, ctx.local, 0);
  drawWheel(c, pose.wheels.front, pose.wheelAngle, ctx.local, spiral);
  drawFrame(c, pose);

  drawTail(c, wind);
  drawPelican(c, pose, wind, ctx.local);
  drawLeg(c, pose.legs.near, pose.hip, 0.95, true);
  drawWingArm(c, pose);
  drawWindFeathers(c, pose, wind, ctx.local);
  drawScarf(c, wind, ctx.local);

  c.restore();
}

// A dry brush smudge and two short ground lines: the tyres press on the silk.
function drawGroundContact(c) {
  for (const wx of [-72, 72]) {
    c.save();
    c.translate(wx, 3);
    c.scale(1, 0.16);
    const gr = c.createRadialGradient(0, 0, 4, 0, 0, 48);
    gr.addColorStop(0, alpha(INK, 0.19));
    gr.addColorStop(0.55, alpha(INK, 0.09));
    gr.addColorStop(1, alpha(INK, 0));
    c.fillStyle = gr;
    c.beginPath();
    c.arc(0, 0, 48, 0, TAU);
    c.fill();
    c.restore();

    ink(c, [
      { x: wx - 42, y: 1.2 },
      { x: wx - 26, y: 1.6 },
      { x: wx - 8, y: 1.4 },
    ], 2.4, 0.42);
    ink(c, [
      { x: wx + 10, y: 1.5 },
      { x: wx + 26, y: 1.2 },
      { x: wx + 44, y: 1.5 },
    ], 2.1, 0.34);
  }
}

function drawWheel(c, wheel, angle, local, spiral) {
  c.save();
  c.translate(wheel.x, wheel.y);

  c.strokeStyle = alpha(INK, 0.95);
  c.lineWidth = 3.1;
  c.beginPath();
  c.arc(0, 0, wheel.r, 0, TAU);
  c.stroke();

  c.strokeStyle = alpha(INK, 0.6);
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(0, 0, wheel.r - 4.5, 0, TAU);
  c.stroke();

  if (spiral < 0.96) {
    const a = 0.34 * (1 - spiral);
    c.strokeStyle = alpha(INK, a);
    c.lineWidth = 0.9;
    for (let i = 0; i < 8; i += 1) {
      const th = angle + (i / 8) * TAU;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(th) * (wheel.r - 5), Math.sin(th) * (wheel.r - 5));
      c.stroke();
    }
  }

  // The gag: the wheel gives up its geometry and becomes one ink spiral.
  if (spiral > 0.02) {
    c.strokeStyle = alpha(INK, 0.92 * spiral);
    c.lineWidth = 2.4;
    c.beginPath();
    const turns = 2.55;
    const steps = 150;
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      const r = 3 + (wheel.r - 8) * u;
      const th = angle * 0.5 + u * turns * TAU + local * 1.4;
      const x = Math.cos(th) * r;
      const y = Math.sin(th) * r;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();

    if (spiral > 0.5) {
      const tail = [];
      const baseTh = angle * 0.5 + turns * TAU + local * 1.4;
      for (let i = 0; i <= 16; i += 1) {
        const u = i / 16;
        const th = baseTh + u * 1.5;
        const r = wheel.r - 8 + u * 20;
        tail.push({ x: Math.cos(th) * r, y: Math.sin(th) * r * 0.8 });
      }
      ink(c, tail, 1.5, 0.5 * spiral);
    }
  }

  c.fillStyle = alpha(INK, 0.9);
  c.beginPath();
  c.arc(0, 0, 2.4, 0, TAU);
  c.fill();
  c.restore();
}

function drawFrame(c, pose) {
  const f = pose.frame;
  const lines = [
    [f.rearHub, f.seatCluster],
    [f.rearHub, f.crank],
    [f.seatCluster, f.crank],
    [f.seatCluster, f.headTop],
    [f.crank, f.headTop],
    [f.headTop, f.frontHub],
  ];
  for (let i = 0; i < lines.length; i += 1) {
    ink(c, lines[i], i < 2 ? 2.1 : 2.6, i < 2 ? 0.72 : 0.94);
  }

  ink(c, [
    { x: f.headTop.x + 1, y: f.headTop.y + 4 },
    { x: f.headTop.x + 8, y: f.headTop.y - 1 },
  ], 1.9, 0.8);
  ink(c, [
    { x: f.headTop.x - 2, y: f.headTop.y + 2 },
    { x: f.frontHub.x, y: f.frontHub.y },
  ], 2.2, 0.85);

  // Saddle: one line, one curve, a nose.
  ink(c, [
    { x: f.seatCluster.x - 14, y: f.seatCluster.y - 3 },
    { x: f.seatCluster.x - 2, y: f.seatCluster.y - 8 },
    { x: f.seatCluster.x + 12, y: f.seatCluster.y - 5 },
  ], 3, 0.92);

  // Handlebar and stem.
  ink(c, [
    f.stemTop,
    { x: f.grip.x - 6, y: f.grip.y - 2 },
    { x: f.grip.x + 2, y: f.grip.y + 3 },
    { x: f.grip.x - 1, y: f.grip.y + 10 },
  ], 2.4, 0.9);
  ink(c, [
    { x: f.headTop.x + 2, y: f.headTop.y - 3 },
    { x: f.stemTop.x, y: f.stemTop.y - 1 },
  ], 2.1, 0.75);

  // Chainring and chain.
  c.strokeStyle = alpha(INK, 0.72);
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(f.crank.x, f.crank.y, 9.5, 0, TAU);
  c.stroke();
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + 0.4;
    ink(c, [
      { x: f.crank.x, y: f.crank.y },
      { x: f.crank.x + Math.cos(a) * 8, y: f.crank.y + Math.sin(a) * 8 },
    ], 1, 0.4);
  }
  ink(c, [
    { x: f.crank.x, y: f.crank.y - 9 },
    { x: f.rearHub.x, y: f.rearHub.y - 1 },
  ], 1.2, 0.4);
  ink(c, [
    { x: f.crank.x, y: f.crank.y + 9 },
    { x: f.rearHub.x, y: f.rearHub.y + 1 },
  ], 1.2, 0.34);
}

function drawLeg(c, leg, hip0, a, near) {
  const hip = near
    ? { x: hip0.x - 1, y: -136 }
    : { x: hip0.x + 2, y: -138 };
  const knee = leg.knee;
  const ankle = leg.ankle;

  if (near) {
    limbTube(c, [hip, knee, ankle], 10.5, 6.5, a);
  } else {
    ink(c, [hip, knee], 4.4, a, INK);
    ink(c, [knee, ankle], 3.6, a, INK);
  }

  const fx = ankle.x;
  const fy = ankle.y;
  ink(c, [
    { x: fx - 7, y: fy - 2 },
    { x: fx + 10, y: fy - 1 },
  ], 2.4, a * 0.95);
  ink(c, [
    { x: fx + 10, y: fy - 1 },
    { x: fx + 2, y: fy + 7 },
    { x: fx - 7, y: fy - 2 },
  ], 2.2, a * 0.9);
  if (near) {
    ink(c, [
      { x: fx + 2, y: fy + 7 },
      { x: fx + 10, y: fy - 1 },
    ], 1.5, a * 0.7);
  }
}

function drawTail(c, wind) {
  const lift = wind * 11;
  const pts = [
    { x: -46, y: -186 },
    { x: -74, y: -197 - lift * 0.5 },
    { x: -96, y: -191 - lift },
    { x: -90, y: -175 - lift * 0.3 },
    { x: -68, y: -163 },
    { x: -48, y: -164 },
  ];
  fillLoop(c, pts, PAPER);
  inkLoop(c, pts, 2.8, 0.86);
  for (let i = 0; i < 3; i += 1) {
    ink(c, [
      { x: -52, y: -181 + i * 5 },
      { x: -86 + i * 2, y: -190 + i * 7 - lift },
    ], 1.6, 0.5);
  }
}

function drawPelican(c, pose, wind, local) {
  c.save();
  c.translate(0, pose.bob * 1.2);

  const b = pose.body;
  const hx = pose.head.x;
  const hy = pose.head.y - 6;
  const bodyPts = ellipsePts(b.x, b.y, b.rx, b.ry, b.rot, 32);
  const headPts = ellipsePts(hx, hy, 21, 20, -0.05, 28);

  // Silhouette in the colour of the silk: the rig's shapes overlap, but a
  // baimiao figure must read as one clean outline, so paper fills erase seams.
  fillLoop(c, bodyPts, PAPER);
  inkLoop(c, bodyPts, 3.4, 0.96);

  // Neck: a thick tube laid over the body line, capped by the skull.
  const neckLeft = [
    { x: 12, y: -192 },
    { x: 24, y: -203 },
    { x: 33, y: -215 },
    { x: 43, y: -226 },
    { x: 52, y: -231 },
  ];
  const neckRight = [
    { x: 28, y: -181 },
    { x: 40, y: -189 },
    { x: 48, y: -199 },
    { x: 55, y: -211 },
    { x: 61, y: -216 },
  ];
  const neck = [...neckLeft, ...neckRight.slice().reverse()];
  fillLoop(c, neck, PAPER);
  ink(c, neckLeft, 3, 0.92);
  ink(c, neckRight, 3, 0.92);

  // Head cap.
  fillLoop(c, headPts, PAPER);
  inkLoop(c, headPts, 3.2, 0.96);

  // Folded wing on the flank.
  ink(c, [
    { x: 34, y: -196 },
    { x: 10, y: -188 },
    { x: -16, y: -180 },
    { x: -40, y: -173 },
    { x: -52, y: -168 },
  ], 2.5, 0.82);
  ink(c, [
    { x: 28, y: -186 },
    { x: 0, y: -178 },
    { x: -24, y: -172 },
  ], 2, 0.58);
  ink(c, [
    { x: 20, y: -199 },
    { x: 12, y: -192 },
  ], 1.7, 0.45);
  ink(c, [
    { x: 8, y: -194 },
    { x: 0, y: -187 },
  ], 1.7, 0.4);

  // A few breast and flank feathers: structure, never shading.
  ink(c, [
    { x: 36, y: -166 },
    { x: 24, y: -159 },
    { x: 12, y: -156 },
  ], 1.6, 0.42);
  ink(c, [
    { x: 30, y: -153 },
    { x: 16, y: -147 },
    { x: 3, y: -146 },
  ], 1.4, 0.32);
  ink(c, [
    { x: -30, y: -188 },
    { x: -42, y: -181 },
  ], 1.5, 0.35);

  // Crest at the back of the skull.
  ink(c, [
    { x: hx - 17, y: hy - 9 },
    { x: hx - 29, y: hy - 17 },
  ], 2.5, 0.72);
  ink(c, [
    { x: hx - 16, y: hy - 2 },
    { x: hx - 30, y: hy - 5 },
  ], 2.2, 0.55);

  // Beak: long, level, entirely without apology.
  const tipX = hx + 110;
  const tipY = hy + 8;
  ink(c, [
    { x: hx + 18, y: hy - 9 },
    { x: hx + 46, y: hy - 6 },
    { x: hx + 80, y: hy - 1 },
    { x: tipX, y: tipY },
  ], 3.2, 0.97);
  ink(c, [
    { x: hx + 17, y: hy + 7 },
    { x: hx + 50, y: hy + 7.5 },
    { x: hx + 86, y: hy + 8 },
    { x: tipX, y: tipY },
  ], 2.2, 0.86);

  ink(c, [
    { x: hx + 19, y: hy - 2 },
    { x: hx + 27, y: hy + 3 },
  ], 1.3, 0.5);
  ink(c, [
    { x: hx + 38, y: hy - 4 },
    { x: hx + 43, y: hy - 2 },
  ], 1.2, 0.5);
  ink(c, [
    { x: hx + 36, y: hy - 1 },
    { x: hx + 94, y: hy + 5 },
  ], 1, 0.24);

  // Pouch: hangs at rest, lifts and swings when the gust arrives.
  const sagX = hx + 56 + 18 * wind;
  const sagY = hy + 40 - 12 * wind + Math.sin(local * 5.6) * 3.6 * wind;
  const pouch = [
    { x: hx + 19, y: hy + 7 },
    { x: hx + 32, y: hy + 21 - 6 * wind },
    { x: sagX, y: sagY },
    { x: sagX + 24, y: hy + 20 - 6 * wind },
    { x: hx + 108, y: hy + 8 },
  ];
  fillLoop(c, pouch, PAPER);
  ink(c, pouch, 2.7, 0.9);

  if (wind > 0.25) {
    ink(c, [
      { x: hx + 38, y: hy + 21 },
      { x: hx + 42, y: hy + 29 - 8 * wind },
    ], 1.2, 0.4 * wind);
    ink(c, [
      { x: hx + 68, y: hy + 20 },
      { x: hx + 72, y: hy + 28 - 7 * wind },
    ], 1.2, 0.34 * wind);
  }

  // Eye: a dot and a level lid. Nothing else moves.
  c.fillStyle = alpha(INK, 0.95);
  c.beginPath();
  c.arc(hx + 8, hy - 7, 2.6, 0, TAU);
  c.fill();
  ink(c, [
    { x: hx + 1, y: hy - 11.5 },
    { x: hx + 15, y: hy - 11 },
  ], 1.3, 0.7);

  c.restore();
}

function drawWingArm(c, pose) {
  const gr = pose.grip;
  const upper = [
    { x: 22, y: -198 },
    { x: 40, y: -190 },
    { x: 58, y: -176 },
    { x: gr.x - 2, y: gr.y - 8 },
  ];
  const lower = [
    { x: 14, y: -184 },
    { x: 36, y: -174 },
    { x: 54, y: -160 },
    { x: gr.x - 4, y: gr.y - 1 },
  ];
  ink(c, upper, 2.7, 0.92);
  ink(c, lower, 2.5, 0.82);

  // Three short coverts along the wing's leading edge.
  for (let i = 0; i < 3; i += 1) {
    ink(c, [
      { x: 28 + i * 10, y: -192 + i * 6 },
      { x: 38 + i * 11, y: -186 + i * 7 },
    ], 1.6, 0.5);
  }

  // Wrist: a small hooked hand over the grip.
  ink(c, [
    { x: gr.x - 2, y: gr.y - 6 },
    { x: gr.x + 4, y: gr.y - 3 },
    { x: gr.x - 4, y: gr.y },
  ], 2.2, 0.85);

  ink(c, [
    { x: 52, y: -163 },
    { x: 58, y: -156 },
  ], 1.5, 0.4);
}

function drawWindFeathers(c, pose, wind, local) {
  const rand = rngFor(912);
  const gr = pose.grip;
  const bases = [
    { x: gr.x - 24, y: gr.y - 12, lift: 26 },
    { x: gr.x - 14, y: gr.y - 8, lift: 34 },
    { x: gr.x - 4, y: gr.y - 4, lift: 30 },
    { x: gr.x + 2, y: gr.y + 2, lift: 20 },
    { x: gr.x + 4, y: gr.y + 8, lift: 10 },
  ];
  for (let i = 0; i < bases.length; i += 1) {
    const b = bases[i];
    const reach = 48 + i * 14 + (112 + i * 22) * wind;
    const pts = [];
    for (let k = 0; k <= 16; k += 1) {
      const u = k / 16;
      pts.push({
        x: b.x + reach * u,
        y:
          b.y +
          8 * u -
          Math.sin(u * Math.PI * 0.8) * (b.lift + 12 * wind) +
          Math.sin(u * 3.2 - local * 1.9 + i * 1.3) * (3 + 8 * wind) * u +
          (rand() - 0.5) * 1.4,
      });
    }
    ink(c, pts, 2.3 - i * 0.16, 0.8 - i * 0.075);
  }
  // Two short coverts behind the wrist.
  ink(c, [
    { x: gr.x + 2, y: gr.y + 4 },
    { x: gr.x + 34, y: gr.y + 2 },
    { x: gr.x + 60, y: gr.y - 4 },
  ], 1.6, 0.45);
}

function drawScarf(c, wind, local) {
  const s0 = { x: 31, y: -238 };
  const top = [];
  const bottom = [];
  const N = 44;
  for (let i = 0; i < N; i += 1) {
    const s = i / (N - 1);
    const climb = Math.sin(Math.min(1, s * 2.4) * Math.PI * 0.5);
    const x =
      s0.x + s * (212 + 52 * wind) + Math.sin(s * 5.2 - local * 0.7) * 14;
    const y =
      s0.y -
      (24 + 58 * wind) * climb +
      s * s * (64 + 20 * (1 - wind)) -
      s * 10 +
      Math.sin(s * 8.6 - local * 2.2) * (6 + 10 * wind) * (0.25 + s * 0.75);
    const twist = 0.5 + 0.5 * Math.sin(s * 7.6 + local * 1.2 - 0.7);
    const taper = Math.sin(Math.PI * (0.12 + 0.78 * s));
    const half = (2 + 6 * twist) * taper;
    top.push({ x, y: y - half });
    bottom.push({ x, y: y + half });
  }
  dry(c, top, 2.3, 0.86, 1501, 0.03);
  dry(c, bottom, 2.3, 0.78, 1502, 0.03);

  // A fold line inside the band, so it reads as cloth and not as a wire.
  for (let i = 6; i < N - 6; i += 7) {
    ink(c, [
      { x: top[i].x + 3, y: top[i].y + 4 },
      { x: bottom[i].x - 3, y: bottom[i].y - 4 },
    ], 1, 0.3);
  }

  // Knot at the nape, two short turns of cloth.
  ink(c, [
    { x: 28, y: -230 },
    { x: 38, y: -240 },
    { x: 48, y: -236 },
  ], 2.2, 0.86);
  ink(c, [
    { x: 31, y: -235 },
    { x: 42, y: -229 },
  ], 1.3, 0.5);

  // Two free ends: the top one races, the lower one lags.
  const endTop = top[N - 1];
  const endBot = bottom[N - 1];
  ink(c, [
    endTop,
    { x: endTop.x + 26 + 18 * wind, y: endTop.y - 14 - 16 * wind },
    { x: endTop.x + 52 + 34 * wind, y: endTop.y - 4 - 26 * wind },
  ], 1.9, 0.62);
  ink(c, [
    endBot,
    { x: endBot.x + 20, y: endBot.y + 18 + 8 * wind },
    { x: endBot.x + 8, y: endBot.y + 48 + 12 * wind },
  ], 1.8, 0.52);

}

// ---------------------------------------------------------------- title

function drawTangTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = W - 248 * s;
  const y = 74 * s + lift * 0.3 * s;

  c.save();
  c.globalAlpha = opacity;

  // A soft silk panel: the colophon sits on the sheet, not on a rectangle.
  const gr = c.createRadialGradient(
    x + 62 * s,
    y + 220 * s,
    40 * s,
    x + 62 * s,
    y + 220 * s,
    320 * s,
  );
  gr.addColorStop(0, alpha(PAPER, 0.9));
  gr.addColorStop(0.55, alpha(PAPER, 0.66));
  gr.addColorStop(1, alpha(PAPER, 0));
  c.fillStyle = gr;
  c.fillRect(x - 130 * s, y - 70 * s, 440 * s, 580 * s);

  // Column rules bound the inscription only.
  c.strokeStyle = alpha(INK, 0.58);
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.moveTo(x, y + 4 * s);
  c.lineTo(x, y + 276 * s);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.34);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 130 * s, y + 4 * s);
  c.lineTo(x + 130 * s, y + 276 * s);
  c.stroke();

  // Vertical title.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 44 * s, 500, CN_FONT, '0px');
  c.fillStyle = alpha(INK, 0.95);
  const chars = ['唐', '代', '白', '描'];
  chars.forEach((ch, i) => {
    c.fillText(ch, x + 65 * s, y + (52 + i * 58) * s);
  });

  c.strokeStyle = alpha(INK, 0.42);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 40 * s, y + 292 * s);
  c.lineTo(x + 90 * s, y + 292 * s);
  c.stroke();

  // English and date sit under the column, small and quiet.
  setFont(c, 13 * s, 500, EN_FONT, '1.7px');
  c.fillStyle = alpha(INK, 0.74);
  c.fillText('TANG', x + 65 * s, y + 316 * s);
  c.fillText('LINE DRAWING', x + 65 * s, y + 334 * s);

  setFont(c, 13 * s, 400, CN_FONT, '0.4px');
  c.fillStyle = alpha(SEPIA, 0.95);
  c.fillText('约750 · 吴带当风', x + 65 * s, y + 362 * s);

  setFont(c, 11 * s, 600, EN_FONT, '2.2px');
  c.fillStyle = alpha(SEAL, 0.9);
  c.fillText('04  /  20', x + 65 * s, y + 386 * s);

  // Seal: 白 in a red square, pressed slightly off-square.
  c.save();
  c.translate(x + 65 * s, y + 432 * s);
  c.rotate(-0.035);
  c.fillStyle = alpha(SEAL, 0.9);
  c.fillRect(-18 * s, -18 * s, 36 * s, 36 * s);
  c.strokeStyle = alpha('#f6ecda', 0.5);
  c.lineWidth = 1 * s;
  c.strokeRect(-14 * s, -14 * s, 28 * s, 28 * s);
  setFont(c, 23 * s, 600, CN_FONT, '0px');
  c.fillStyle = alpha('#f7eedc', 0.96);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('白', 0, 1 * s);
  c.restore();

  c.restore();
}

// ---------------------------------------------------------------- ink helpers

function trace(c, pts, closed = false) {
  if (!pts || pts.length < 2) return;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    c.lineTo(pts[1].x, pts[1].y);
  } else {
    for (let i = 1; i < pts.length - 1; i += 1) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    c.lineTo(last.x, last.y);
  }
  if (closed) c.closePath();
}

function ink(c, pts, w = 2, a = 1, color = INK) {
  if (!pts || pts.length < 2) return;
  c.save();
  c.strokeStyle = alpha(color, a);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  trace(c, pts, false);
  c.stroke();
  c.restore();
}

function ellipsePts(cx, cy, rx, ry, rot = 0, n = 28) {
  const out = [];
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    const px = Math.cos(a) * rx;
    const py = Math.sin(a) * ry;
    out.push({ x: cx + px * cos - py * sin, y: cy + px * sin + py * cos });
  }
  return out;
}

// A limb drawn as two edges with the silk showing between them, so it crosses
// the bicycle frame without becoming another tube.
function limbTube(c, pts, w0, w1, a = 1) {
  const samples = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p = pts[i];
    const q = pts[i + 1];
    for (let k = 0; k < 7; k += 1) {
      const t = k / 7;
      samples.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  samples.push(pts[pts.length - 1]);
  const left = [];
  const right = [];
  for (let i = 0; i < samples.length; i += 1) {
    const p = samples[i];
    const q = samples[Math.min(samples.length - 1, i + 1)];
    const r = samples[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const u = i / (samples.length - 1);
    const w = (w0 + (w1 - w0) * u) / 2;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const loop = [...left, ...right.slice().reverse()];
  fillLoop(c, loop, PAPER);
  ink(c, left, 2.5, a);
  ink(c, right, 2.5, a);
}

// Stone is cut, not brushed: straight segments with live corners.
function inkAngular(c, pts, w = 2, a = 1, color = INK) {
  if (!pts || pts.length < 2) return;
  c.save();
  c.strokeStyle = alpha(color, a);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'miter';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.stroke();
  c.restore();
}

function fillLoop(c, pts, color) {
  if (!pts || pts.length < 3) return;
  c.save();
  c.fillStyle = color;
  c.beginPath();
  trace(c, pts, true);
  c.fill();
  c.restore();
}

function inkLoop(c, pts, w = 2, a = 1, color = INK) {
  if (!pts || pts.length < 2) return;
  c.save();
  c.strokeStyle = alpha(color, a);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  trace(c, pts, true);
  c.stroke();
  c.restore();
}

// A stroke with dry-brush breaks: the silk takes the ink unevenly.
function dry(c, pts, w, a, seed, gap = 0.06) {
  if (!pts || pts.length < 2) return;
  const rand = rngFor(seed);
  let run = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) {
    run.push(pts[i]);
    if (run.length > 4 && i < pts.length - 5 && rand() < gap) {
      ink(c, run, w, a);
      run = [pts[i]];
    }
  }
  if (run.length > 1) ink(c, run, w, a);
}

function brushLeaf(c, x, y, ang, len, wid, color, a, bow = 0.34) {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const nx = -sa;
  const ny = ca;
  const left = [];
  const right = [];
  const steps = 9;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const bend = Math.sin(Math.PI * t) * len * bow;
    const cx = x + ca * len * t + nx * bend;
    const cy = y + sa * len * t + ny * bend;
    const tx = ca + nx * Math.cos(Math.PI * t) * Math.PI * bow;
    const ty = sa + ny * Math.cos(Math.PI * t) * Math.PI * bow;
    const tl = Math.hypot(tx, ty) || 1;
    const wx = -ty / tl;
    const wy = tx / tl;
    const w = wid * Math.sin(Math.PI * Math.pow(t, 0.72));
    left.push({ x: cx + wx * w, y: cy + wy * w });
    right.push({ x: cx - wx * w, y: cy - wy * w });
  }
  c.save();
  c.fillStyle = alpha(color, a);
  c.beginPath();
  c.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i += 1) c.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i -= 1) c.lineTo(right[i].x, right[i].y);
  c.closePath();
  c.fill();
  c.restore();
}
