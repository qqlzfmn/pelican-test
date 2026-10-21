// 18 — Vaporwave. A VHS still-life: pastel dusk, neon perspective grid, low-poly
// palms, a marble bust that turns to watch the pelican, and floating original UI.
// Static art (sky, mountains, palms, bust body) is cached; the sun, grid, rider,
// head turn and tape glitch are live.

import { basePalette } from './_placeholder.js';
import { cachedLayer, drawCached } from '../kit/cache.js';
import { alpha, mix } from '../kit/color.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import {
  TAU, clamp, easeInOut, lerp, rngFor, smoothstep,
} from '../kit/math.js';
import { rigPose } from '../rig/pose.js';

const pal = basePalette({
  bg: '#2b1b4d', bg2: '#3b2270', motif: '#ff6fb5', accent: '#61e8e1',
  ink: '#120a24', titleInk: '#ffe8f7', scrim: '#0d0618', ground: '#241441',
  road: '#35205c', dash: '#8ff2ea', body: '#f7d8ef', beak: '#ff8a5c',
  rigInk: '#160b2a',
});

const HZ = 600;            // horizon
const VP = { x: 640, y: HZ };
const ROAD_Y = 820;
const HEAD = { x: 990, y: 592 };
const PLINTH = 816;

const CREAM = '#f7d8ef';
const PINK = '#ff6fb5';
const HOT = '#ff3fa4';
const CYAN = '#61e8e1';
const INDIGO = '#2b1b4d';

const FULL = { x0: -800, y0: -150, w: 2400, h: 1260 };
const PALMS_BOX = { x0: -180, y0: 300, w: 1700, h: 540 };
const BUST_BOX = { x0: 890, y0: 470, w: 340, h: 360 };

export default {
  id: 's18',
  number: 18,
  cn: '蒸汽波',
  en: 'Vaporwave',
  year: '2010s',
  motif: 'pyramid',
  palette: pal,

  draw(g, ctx) {
    const local = ctx.local;

    const sky = cachedLayer(ctx, 's18:sky', (pg) => paintSky(pg), FULL);
    const land = cachedLayer(ctx, 's18:land', (pg) => paintLand(pg), FULL);
    const palms = cachedLayer(ctx, 's18:palms', (pg) => paintPalms(pg), PALMS_BOX);
    const bust = cachedLayer(ctx, 's18:bust', (pg) => paintBust(pg), BUST_BOX);

    drawCached(g, sky, FULL);

    // Sun above the horizon, mountains and plane cached over its lower edge.
    drawSun(g, local);

    drawCached(g, land, FULL);

    // The continuous road, tinted to read as a neon causeway on the grid.
    ctx.road(g, {
      ground: '#271547',
      verge: '#33205e',
      road: '#2e1a53',
      edge: CYAN,
      dash: PINK,
      ink: '#120a24',
      dust: false,
    });

    drawPlaneDepth(g, local);
    drawGrid(g, local);
    drawBustHalo(g);

    drawCached(g, palms, PALMS_BOX);
    drawCached(g, bust, BUST_BOX);

    // Live head, plus RGB-split ghosts during the turn.
    drawBustHead(g, local);

    drawRider(g, ctx);
    drawUI(g, local);

    drawVHS(g, local);
    drawScanlines(g);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawVaporTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- cache: sky

function paintSky(g) {
  const c = g.drawingContext;
  const gr = c.createLinearGradient(0, -150, 0, HZ + 130);
  gr.addColorStop(0, '#0c182c');
  gr.addColorStop(0.16, '#141331');
  gr.addColorStop(0.32, '#2a1848');
  gr.addColorStop(0.52, '#3b2270');
  gr.addColorStop(0.7, '#6a2f86');
  gr.addColorStop(0.84, '#b7499d');
  gr.addColorStop(0.94, '#ef6fae');
  gr.addColorStop(1, '#ffc4d9');
  c.fillStyle = gr;
  c.fillRect(-800, -150, 2400, HZ + 300);

  // Sparse cold stars.
  const rand = rngFor('s18-stars');
  for (let i = 0; i < 130; i += 1) {
    const x = -780 + rand() * 2360;
    const y = -130 + Math.pow(rand(), 1.5) * 500;
    const a = 0.12 + rand() * 0.5;
    c.fillStyle = alpha(i % 9 === 0 ? CREAM : '#cbb8ee', a);
    const s = rand() < 0.14 ? 1.9 : 1.2;
    c.fillRect(x, y, s, s);
    if (rand() < 0.06) {
      c.fillStyle = alpha(CREAM, a * 0.4);
      c.fillRect(x - 3, y + 0.5, 8, 0.8);
      c.fillRect(x + 0.5, y - 3, 0.8, 8);
    }
  }

  // Wide horizontal haze strata (tape-band feel).
  for (let i = 0; i < 7; i += 1) {
    const y = 180 + i * 54;
    c.fillStyle = alpha('#ffffff', 0.018 + i * 0.004);
    c.fillRect(-800, y, 2400, 16 + i * 4);
  }

  // Faint distant wire ring, part of the horizon furniture.
  c.save();
  c.strokeStyle = alpha('#d8a6ff', 0.10);
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(VP.x, HZ - 2, 470, 90, 0, Math.PI, TAU);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- live sun

function drawSun(g, local) {
  const c = g.drawingContext;
  const pulse = beatPulse(local, 3.0, 0.34) + 0.6 * beatPulse(local, 1.0, 0.3);
  const cx = VP.x;
  const cy = 468 + 3.5 * Math.sin(local * 0.75) - 4 * pulse;
  const r = 212 + 4 * pulse;

  c.save();

  // Bloom.
  const glow = c.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 1.85);
  glow.addColorStop(0, alpha('#ffd7ee', 0.5));
  glow.addColorStop(0.45, alpha('#ff6fb5', 0.24));
  glow.addColorStop(1, alpha('#ff6fb5', 0));
  c.fillStyle = glow;
  c.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  // Cut sun: solid top, widening gaps toward the horizon.
  c.beginPath();
  c.arc(cx, cy, r, 0, TAU);
  c.clip();

  const grad = c.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, '#fff3cf');
  grad.addColorStop(0.24, '#ffdca0');
  grad.addColorStop(0.46, '#ffa7b8');
  grad.addColorStop(0.68, '#ff6fb5');
  grad.addColorStop(0.86, '#e2549f');
  grad.addColorStop(1, '#b93a92');
  c.fillStyle = grad;

  let y = cy - r;
  while (y < cy + r) {
    const t = (y - (cy - r)) / (2 * r);
    let h = 2.6;
    let gap = 0.7;
    if (t > 0.4) {
      const k = (t - 0.4) / 0.6;
      h = 2.4 + k * 2.6;
      gap = 2.4 + k * 62;
    }
    c.fillRect(cx - r, y, r * 2, h);
    y += h + gap;
  }

  // Inner rim.
  c.strokeStyle = alpha('#fff0fa', 0.35);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(cx, cy, r - 3, 0, TAU);
  c.stroke();
  c.restore();

  // Chromatic edge ghosts.
  c.save();
  c.strokeStyle = alpha(CYAN, 0.30);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx - 3, cy, r + 1, 0, TAU);
  c.stroke();
  c.strokeStyle = alpha(HOT, 0.32);
  c.beginPath();
  c.arc(cx + 3, cy, r + 1, 0, TAU);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- cache: land

function paintLand(g) {
  const c = g.drawingContext;

  // Plane.
  const plane = c.createLinearGradient(0, HZ, 0, 1100);
  plane.addColorStop(0, '#4a2678');
  plane.addColorStop(0.18, '#331c5e');
  plane.addColorStop(0.55, '#221244');
  plane.addColorStop(1, '#150b2c');
  c.fillStyle = plane;
  c.fillRect(-800, HZ, 2400, 520);

  // Reflected sun: a soft ellipse, so the glow has no hard tape edge.
  paintSunReflection(c, HZ, 1);

  // Low-poly ridges on both sides of the sun gate.
  const left = [
    { x: -800, y: HZ }, { x: -640, y: 548 }, { x: -560, y: 574 },
    { x: -470, y: 500 }, { x: -400, y: 540 }, { x: -300, y: 484 },
    { x: -210, y: 548 }, { x: -110, y: 524 }, { x: 10, y: 580 },
    { x: 120, y: HZ },
  ];
  const right = [
    { x: 900, y: HZ }, { x: 985, y: 552 }, { x: 1080, y: 508 },
    { x: 1165, y: 566 }, { x: 1260, y: 522 }, { x: 1360, y: 574 },
    { x: 1465, y: 540 }, { x: 1600, y: HZ },
  ];

  drawRidge(c, left, '#3c1f66', '#552e86', '#261041', 71);
  drawRidge(c, right, '#381c60', '#4f2b80', '#220e3c', 72);

  // A far, flatter ridge behind.
  c.fillStyle = alpha('#6a3d9c', 0.5);
  c.beginPath();
  c.moveTo(180, HZ);
  c.lineTo(300, 560);
  c.lineTo(430, 582);
  c.lineTo(560, 552);
  c.lineTo(700, 584);
  c.lineTo(820, 566);
  c.lineTo(930, HZ);
  c.closePath();
  c.fill();

  // Horizon: magenta line with cyan fringe.
  c.save();
  c.strokeStyle = alpha(CYAN, 0.45);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-800, HZ - 2.5);
  c.lineTo(1600, HZ - 2.5);
  c.stroke();
  c.strokeStyle = alpha('#ffcfeb', 0.9);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-800, HZ);
  c.lineTo(1600, HZ);
  c.stroke();
  c.strokeStyle = alpha(PINK, 0.85);
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-800, HZ + 3);
  c.lineTo(1600, HZ + 3);
  c.stroke();

  // Haze over the horizon.
  const haze = c.createLinearGradient(0, HZ - 60, 0, HZ + 60);
  haze.addColorStop(0, alpha('#ff9ecb', 0));
  haze.addColorStop(0.5, alpha('#ff9ecb', 0.14));
  haze.addColorStop(1, alpha('#ff9ecb', 0));
  c.fillStyle = haze;
  c.fillRect(-800, HZ - 60, 2400, 120);
  c.restore();
}

function drawRidge(c, pts, body, lit, dark, seed) {
  const rand = rngFor(seed);
  c.save();
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fillStyle = body;
  c.fill();

  // Facets down from each peak.
  for (let i = 1; i < pts.length - 1; i += 1) {
    const p = pts[i];
    if (p.y >= HZ - 6) continue;
    const w = 42 + rand() * 66;
    const d = 60 + rand() * 110;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x + w, HZ);
    c.lineTo(p.x - w * 0.4, HZ);
    c.closePath();
    c.fillStyle = alpha(i % 2 ? lit : dark, 0.35 + rand() * 0.2);
    c.fill();
  }

  // Sun-catching rim.
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.strokeStyle = alpha('#ff9ccb', 0.32);
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- live plane
// Road is drawn between the cached land and the grid; this restores depth over it
// and lays the sun's reflection on the near plane.

function drawPlaneDepth(g, local) {
  const c = g.drawingContext;
  const gr = c.createLinearGradient(0, HZ, 0, 1100);
  gr.addColorStop(0, 'rgba(21,11,42,0)');
  gr.addColorStop(0.35, 'rgba(21,11,42,0.22)');
  gr.addColorStop(1, 'rgba(15,8,30,0.72)');
  c.save();
  c.fillStyle = gr;
  c.fillRect(-800, HZ, 2400, 500);

  // Reflected sun shivering on the grid.
  const shimmer = 0.8 + 0.2 * Math.sin(local * 5.2);
  paintSunReflection(c, HZ, 0.9 * shimmer);

  // Bright cyan lip on the road, kept legible above the grid.
  c.strokeStyle = alpha(CYAN, 0.55);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-800, ROAD_Y - 26);
  c.lineTo(1600, ROAD_Y - 26);
  c.stroke();
  c.restore();
}

function paintSunReflection(c, top, mul = 1) {
  c.save();
  c.translate(VP.x, top);
  c.scale(0.62, 1.8);
  const gr = c.createRadialGradient(0, 30, 4, 0, 40, 230);
  gr.addColorStop(0, alpha('#ffb3d8', 0.32 * mul));
  gr.addColorStop(0.5, alpha('#ff6fb5', 0.13 * mul));
  gr.addColorStop(1, alpha('#ff6fb5', 0));
  c.fillStyle = gr;
  c.fillRect(-380, -80, 760, 520);
  c.restore();
}

function drawBustHalo(g) {
  const c = g.drawingContext;
  const glow = c.createRadialGradient(HEAD.x, 640, 30, HEAD.x, 640, 330);
  glow.addColorStop(0, 'rgba(255, 238, 250, 0.16)');
  glow.addColorStop(0.45, 'rgba(255, 145, 205, 0.07)');
  glow.addColorStop(1, 'rgba(255, 111, 181, 0)');
  c.save();
  c.fillStyle = glow;
  c.fillRect(HEAD.x - 350, 300, 700, 620);
  c.restore();
}

// ---------------------------------------------------------------- live grid

function drawGrid(g, local) {
  const c = g.drawingContext;
  const phase = (local * 0.40) % 1;

  c.save();

  // Vertical rails toward the vanishing point.
  for (let k = -9; k <= 9; k += 1) {
    const xb = VP.x + k * 270;
    const edge = Math.abs(k) / 9;
    c.strokeStyle = alpha(mix(CYAN, PINK, clamp(0.3 + edge * 0.5)), 0.30);
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(VP.x, VP.y);
    c.lineTo(xb, 1110);
    c.stroke();
    c.strokeStyle = alpha(PINK, 0.42 - edge * 0.1);
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(VP.x + 1.5, VP.y);
    c.lineTo(xb + 1.8, 1110);
    c.stroke();
  }

  // Horizontal rungs, scrolling toward the viewer.
  const N = 30;
  for (let i = 0; i < N; i += 1) {
    const u = (i + phase) / N;
    if (u <= 0.001) continue;
    const y = HZ + 510 * Math.pow(u, 2.5);
    if (y > 1105) continue;
    const fade = clamp(u * 3.2);
    const col = mix(CYAN, PINK, clamp(u * 1.6));
    c.strokeStyle = alpha(col, 0.14 + 0.5 * fade);
    c.lineWidth = 0.7 + 2.3 * u;
    c.beginPath();
    c.moveTo(-800, y);
    c.lineTo(1600, y);
    c.stroke();
    // Glow pass.
    c.strokeStyle = alpha(PINK, 0.10 * fade);
    c.lineWidth = 4 + 6 * u;
    c.beginPath();
    c.moveTo(-800, y);
    c.lineTo(1600, y);
    c.stroke();
  }

  // Vanishing point bloom.
  const gl = c.createRadialGradient(VP.x, HZ, 2, VP.x, HZ, 150);
  gl.addColorStop(0, alpha('#ffd9f0', 0.28));
  gl.addColorStop(1, alpha('#ff6fb5', 0));
  c.fillStyle = gl;
  c.fillRect(VP.x - 160, HZ - 60, 320, 150);
  c.restore();
}

// ---------------------------------------------------------------- cache: palms

function paintPalms(g) {
  const c = g.drawingContext;
  const palms = [
    { x: 36, base: 812, h: 432, lean: -0.14, seed: 41 },
    { x: 196, base: 762, h: 296, lean: 0.12, seed: 42 },
    { x: 1332, base: 810, h: 392, lean: 0.15, seed: 43 },
    { x: 1456, base: 756, h: 286, lean: -0.07, seed: 44 },
  ];
  palms.forEach((p) => drawPalm(c, p));
}

function drawPalm(c, { x, base, h, lean, seed }) {
  const rand = rngFor(seed);
  const trunkTop = { x: x + lean * h * 0.9, y: base - h * 0.84 };
  const seg = 8;

  c.save();

  // Trunk: faceted, segmented.
  for (let i = 0; i < seg; i += 1) {
    const t0 = i / seg;
    const t1 = (i + 1) / seg;
    const p0 = {
      x: x + lean * h * 0.9 * Math.pow(t0, 1.35),
      y: base - h * 0.84 * t0,
    };
    const p1 = {
      x: x + lean * h * 0.9 * Math.pow(t1, 1.35),
      y: base - h * 0.84 * t1,
    };
    const w0 = lerp(15, 5, t0);
    const w1 = lerp(15, 5, t1);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    c.beginPath();
    c.moveTo(p0.x + nx * w0, p0.y + ny * w0);
    c.lineTo(p1.x + nx * w1, p1.y + ny * w1);
    c.lineTo(p1.x - nx * w1 * 0.7, p1.y - ny * w1 * 0.7);
    c.lineTo(p0.x - nx * w0 * 0.7, p0.y - ny * w0 * 0.7);
    c.closePath();
    c.fillStyle = i % 2 ? '#2c1449' : '#371a58';
    c.fill();

    // Scaled band.
    c.strokeStyle = alpha('#ff8fc8', 0.22);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(p0.x + nx * w0, p0.y + ny * w0);
    c.lineTo(p0.x - nx * w0 * 0.7, p0.y - ny * w0 * 0.7);
    c.stroke();
  }

  // Sunlit trunk edge.
  c.strokeStyle = alpha('#ff7fc2', 0.5);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x + 12, base - 6);
  for (let i = 1; i <= seg; i += 1) {
    const t = i / seg;
    c.lineTo(x + lean * h * 0.9 * Math.pow(t, 1.35) + lerp(12, 4, t), base - h * 0.84 * t);
  }
  c.stroke();

  // Crown.
  c.fillStyle = '#24103d';
  c.beginPath();
  c.arc(trunkTop.x, trunkTop.y, 12, 0, TAU);
  c.fill();

  // Coconuts.
  c.fillStyle = '#2a1144';
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.arc(trunkTop.x - 8 + i * 8, trunkTop.y + 9 + (i % 2) * 4, 4.5, 0, TAU);
    c.fill();
  }

  const fronds = 9;
  for (let i = 0; i < fronds; i += 1) {
    const ang = -Math.PI + 0.10 + (i / (fronds - 1)) * (Math.PI - 0.2);
    const len = h * (0.34 + rand() * 0.14);
    drawFrond(c, trunkTop.x, trunkTop.y, ang, len, 21, seed * 7 + i, i % 2 === 0);
  }

  // A few dead fronds hanging at the crown.
  c.strokeStyle = alpha('#5b2c6f', 0.9);
  c.lineWidth = 2.4;
  for (let i = 0; i < 3; i += 1) {
    const a = 0.35 + i * 0.42;
    c.beginPath();
    c.moveTo(trunkTop.x, trunkTop.y + 6);
    c.quadraticCurveTo(
      trunkTop.x - Math.cos(a) * 26, trunkTop.y + 24,
      trunkTop.x - Math.cos(a) * 40, trunkTop.y + 48 + i * 8,
    );
    c.stroke();
  }

  c.restore();
}

function drawFrond(c, cx, cy, ang, len, w, seed, cyanLit) {
  const rand = rngFor(seed);
  const N = 6;
  const spine = [];
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const a = ang + (i === 0 ? 0 : (rand() - 0.5) * 0.05);
    spine.push({
      x: cx + Math.cos(a) * len * t,
      y: cy + Math.sin(a) * len * t + len * 0.52 * t * t,
      w: w * (1 - t * 0.82),
      nx: -Math.sin(a),
      ny: Math.cos(a),
    });
  }
  c.beginPath();
  c.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i <= N; i += 1) {
    const p = spine[i];
    const jag = i % 2 === 0 ? 1 : 0.62;
    c.lineTo(p.x + p.nx * p.w * jag, p.y + p.ny * p.w * jag);
  }
  for (let i = N; i >= 0; i -= 1) {
    const p = spine[i];
    const jag = i % 2 === 0 ? 0.56 : 0.96;
    c.lineTo(p.x - p.nx * p.w * jag, p.y - p.ny * p.w * jag);
  }
  c.closePath();
  c.fillStyle = '#2a1145';
  c.fill();

  // Rim light, pink on one side, cyan on the other.
  c.strokeStyle = alpha(cyanLit ? CYAN : '#ff7fc2', cyanLit ? 0.36 : 0.5);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i <= N; i += 1) {
    const p = spine[i];
    c.lineTo(p.x + p.nx * p.w * 0.55, p.y + p.ny * p.w * 0.55);
  }
  c.stroke();

  // Midrib.
  c.strokeStyle = alpha('#0f0620', 0.7);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(spine[0].x, spine[0].y);
  for (let i = 1; i <= N; i += 1) c.lineTo(spine[i].x, spine[i].y);
  c.stroke();
}

// ---------------------------------------------------------------- cache: bust

function paintBust(g) {
  const c = g.drawingContext;
  const cx = HEAD.x;

  // Shadow on the plane.
  c.fillStyle = alpha('#0d0520', 0.5);
  c.beginPath();
  c.ellipse(cx, PLINTH + 10, 112, 13, 0, 0, TAU);
  c.fill();

  const marble = c.createLinearGradient(cx - 125, 0, cx + 125, 0);
  marble.addColorStop(0, '#fbeef9');
  marble.addColorStop(0.26, '#ecd4ec');
  marble.addColorStop(0.62, '#c69ad0');
  marble.addColorStop(1, '#986ebe');

  // Plinth: base block, fascia, carved die.
  fillQuad(c, [
    { x: cx - 114, y: PLINTH }, { x: cx + 104, y: PLINTH },
    { x: cx + 102, y: PLINTH - 22 }, { x: cx - 112, y: PLINTH - 22 },
  ], '#3a1f60');
  fillQuad(c, [
    { x: cx - 112, y: PLINTH - 22 }, { x: cx + 102, y: PLINTH - 22 },
    { x: cx + 100, y: PLINTH - 32 }, { x: cx - 110, y: PLINTH - 32 },
  ], '#f0d9ef');
  fillQuad(c, [
    { x: cx - 92, y: PLINTH - 32 }, { x: cx + 84, y: PLINTH - 32 },
    { x: cx + 80, y: PLINTH - 54 }, { x: cx - 88, y: PLINTH - 54 },
  ], marble);
  fillQuad(c, [
    { x: cx + 48, y: PLINTH - 54 }, { x: cx + 80, y: PLINTH - 54 },
    { x: cx + 84, y: PLINTH - 32 }, { x: cx + 52, y: PLINTH - 32 },
  ], alpha('#7c559e', 0.5));

  // Die fluting.
  c.strokeStyle = alpha('#9a72b6', 0.3);
  c.lineWidth = 1.2;
  for (let i = 0; i < 5; i += 1) {
    const x = cx - 66 + i * 34;
    c.beginPath();
    c.moveTo(x, PLINTH - 53);
    c.lineTo(x + 1.5, PLINTH - 33);
    c.stroke();
  }
  c.fillStyle = alpha(PINK, 0.9);
  c.fillRect(cx - 88, PLINTH - 31, 168, 1.8);
  c.fillStyle = alpha(CYAN, 0.45);
  c.fillRect(cx - 88, PLINTH - 28.5, 168, 1);

  // Torso, truncated at the chest.
  const body = c.createLinearGradient(cx - 128, 0, cx + 128, 0);
  body.addColorStop(0, '#fdf2fb');
  body.addColorStop(0.3, '#f0d9ef');
  body.addColorStop(0.66, '#cfa8d8');
  body.addColorStop(1, '#9b70bf');

  const torso = [
    { x: cx - 79, y: PLINTH - 54 },
    { x: cx - 100, y: PLINTH - 76 },
    { x: cx - 107, y: PLINTH - 102 },
    { x: cx - 96, y: PLINTH - 120 },
    { x: cx - 64, y: PLINTH - 134 },
    { x: cx - 38, y: PLINTH - 146 },
    { x: cx - 27, y: PLINTH - 150 },
    { x: cx + 26, y: PLINTH - 150 },
    { x: cx + 38, y: PLINTH - 144 },
    { x: cx + 65, y: PLINTH - 134 },
    { x: cx + 96, y: PLINTH - 120 },
    { x: cx + 107, y: PLINTH - 102 },
    { x: cx + 100, y: PLINTH - 76 },
    { x: cx + 79, y: PLINTH - 54 },
  ];
  softPath(c, torso);
  c.fillStyle = body;
  c.fill();

  // Drapery and shoulder modelling.
  c.save();
  softPath(c, torso);
  c.clip();
  // Shadow under the far shoulder.
  c.fillStyle = alpha('#9a70b8', 0.28);
  c.beginPath();
  c.moveTo(cx + 12, PLINTH - 160);
  c.lineTo(cx + 70, PLINTH - 138);
  c.lineTo(cx + 118, PLINTH - 54);
  c.lineTo(cx + 10, PLINTH - 54);
  c.closePath();
  c.fill();
  // Lit chest.
  c.fillStyle = alpha('#fff7fe', 0.5);
  c.beginPath();
  c.moveTo(cx - 116, PLINTH - 108);
  c.lineTo(cx - 52, PLINTH - 148);
  c.lineTo(cx - 8, PLINTH - 116);
  c.lineTo(cx - 20, PLINTH - 54);
  c.lineTo(cx - 96, PLINTH - 54);
  c.closePath();
  c.fill();

  // Cloth edge across the chest.
  c.fillStyle = alpha('#d5afd6', 0.62);
  c.beginPath();
  c.moveTo(cx - 104, PLINTH - 96);
  c.quadraticCurveTo(cx - 30, PLINTH - 118, cx + 24, PLINTH - 146);
  c.lineTo(cx + 36, PLINTH - 126);
  c.quadraticCurveTo(cx - 22, PLINTH - 98, cx - 102, PLINTH - 74);
  c.closePath();
  c.fill();
  c.strokeStyle = alpha('#86609f', 0.55);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(cx - 104, PLINTH - 96);
  c.quadraticCurveTo(cx - 30, PLINTH - 118, cx + 24, PLINTH - 146);
  c.stroke();
  c.strokeStyle = alpha('#fff4fd', 0.35);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx - 100, PLINTH - 92);
  c.quadraticCurveTo(cx - 28, PLINTH - 114, cx + 22, PLINTH - 140);
  c.stroke();

  // Folds.
  c.strokeStyle = alpha('#8a60a8', 0.28);
  c.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    const x0 = cx - 62 + i * 52;
    c.beginPath();
    c.moveTo(x0, PLINTH - 132 + i * 4);
    c.quadraticCurveTo(x0 + 16, PLINTH - 88, x0 - 6 + i * 3, PLINTH - 56);
    c.stroke();
  }

  // Marble veins.
  const rand = rngFor('s18-veins');
  c.strokeStyle = alpha('#7d579d', 0.1);
  c.lineWidth = 0.9;
  for (let i = 0; i < 4; i += 1) {
    const x0 = cx - 108 + rand() * 206;
    const y0 = PLINTH - 140 + rand() * 80;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(x0 + 12 * (rand() - 0.5), y0 + 14, x0 + 8 + rand() * 10, y0 + 28);
    c.stroke();
  }
  c.restore();

  // Chipped edge highlight along the top of the shoulders.
  c.strokeStyle = alpha('#fff4fd', 0.55);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(cx - 78, PLINTH - 133);
  c.quadraticCurveTo(cx - 30, PLINTH - 147, cx + 8, PLINTH - 146);
  c.stroke();

  // Cut edges of the truncated arms.
  c.strokeStyle = alpha('#9a72b6', 0.34);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(cx - 100, PLINTH - 112);
  c.quadraticCurveTo(cx - 98, PLINTH - 82, cx - 82, PLINTH - 56);
  c.stroke();
  c.beginPath();
  c.moveTo(cx + 100, PLINTH - 112);
  c.quadraticCurveTo(cx + 98, PLINTH - 82, cx + 82, PLINTH - 56);
  c.stroke();

  // Neck.
  const neck = c.createLinearGradient(cx - 26, 0, cx + 32, 0);
  neck.addColorStop(0, '#fbeef8');
  neck.addColorStop(0.5, '#ecd2ea');
  neck.addColorStop(1, '#b78ac9');
  fillQuad(c, [
    { x: cx - 23, y: PLINTH - 150 },
    { x: cx + 23, y: PLINTH - 150 },
    { x: cx + 26, y: PLINTH - 174 },
    { x: cx - 26, y: PLINTH - 174 },
  ], neck);
  c.strokeStyle = alpha('#8c63ac', 0.42);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(cx + 17, PLINTH - 150);
  c.lineTo(cx + 21, PLINTH - 172);
  c.stroke();
  // Collarbone.
  c.strokeStyle = alpha('#9a72b6', 0.4);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(cx - 54, PLINTH - 140);
  c.quadraticCurveTo(cx - 20, PLINTH - 150, cx - 4, PLINTH - 146);
  c.stroke();

  // Small carved medallion on the shoulder.
  c.fillStyle = alpha('#e9c8e4', 0.72);
  c.beginPath();
  c.arc(cx - 70, PLINTH - 130, 5.5, 0, TAU);
  c.fill();
  c.strokeStyle = alpha('#8c63ac', 0.55);
  c.lineWidth = 1;
  c.beginPath();
  c.arc(cx - 70, PLINTH - 130, 5.5, 0, TAU);
  c.stroke();
  c.beginPath();
  c.arc(cx - 70, PLINTH - 130, 2.4, 0, TAU);
  c.stroke();
}

// ---------------------------------------------------------------- live head

function headDir(local) {
  const k = smoothstep(2.28, 3.02, local);
  let d = lerp(1, -1, easeInOut(k));
  if (local > 3.02) {
    d += 0.085 * Math.sin((local - 3.02) * 24) * Math.exp(-(local - 3.02) * 5.5);
  }
  d += 0.012 * Math.sin(local * 0.9 + 0.4);
  return clamp(d, -1.12, 1.08);
}

function drawBustHead(g, local) {
  const c = g.drawingContext;
  const d = headDir(local);
  const dt = 0.01;
  const vel = (headDir(local + dt) - headDir(local - dt)) / (2 * dt);
  const turn = Math.abs(vel);
  const y = HEAD.y + 1.6 * Math.sin(local * 2.2);
  const x = HEAD.x + 5 * d;

  // Shadow cast on the neck.
  c.save();
  c.fillStyle = alpha('#7d5599', 0.22);
  c.beginPath();
  c.ellipse(HEAD.x + 2 * d, HEAD.y + 52, 25, 7, 0, 0, TAU);
  c.fill();
  c.restore();

  // Motion smear during the turn, in tape colours.
  if (turn > 0.4) {
    drawHeadSilhouette(c, d + Math.sign(vel) * 0.16, x + 5, y, alpha(CYAN, Math.min(0.28, turn * 0.03)));
    drawHeadSilhouette(c, d - Math.sign(vel) * 0.16, x - 5, y, alpha(HOT, Math.min(0.28, turn * 0.03)));
  }

  // Constant RGB fringe.
  drawHeadSilhouette(c, d, x - 2.4, y + 0.6, alpha(CYAN, 0.3));
  drawHeadSilhouette(c, d, x + 2.4, y - 0.6, alpha(HOT, 0.28));

  drawHead(c, d, x, y);
}

function drawHeadSilhouette(c, d, x, y, color) {
  c.save();
  c.translate(x, y);
  c.rotate(0.055 * d);
  c.fillStyle = color;
  hairPath(c, d);
  c.fill();
  skullPath(c, d);
  c.fill();
  nosePath(c, d);
  c.fill();
  c.restore();
}

function skullPath(c, d) {
  const pts = [
    { x: d * 2, y: -50 },
    { x: d * 24, y: -45 },
    { x: d * 34, y: -31 },
    { x: d * 37, y: -13 },
    { x: d * 35, y: 7 },
    { x: d * 31, y: 27 },
    { x: d * 25, y: 41 },
    { x: d * 13, y: 49 },
    { x: d * 2, y: 50 },
    { x: -d * 14, y: 44 },
    { x: -d * 27, y: 31 },
    { x: -d * 32, y: 12 },
    { x: -d * 32, y: -10 },
    { x: -d * 25, y: -33 },
    { x: -d * 10, y: -47 },
  ];
  softPath(c, pts);
}

function hairPath(c, d) {
  const pts = [
    { x: d * 2, y: -60 },
    { x: -d * 16, y: -65 },
    { x: -d * 34, y: -59 },
    { x: -d * 48, y: -47 },
    { x: -d * 57, y: -31 },
    { x: -d * 59, y: -8 },
    { x: -d * 55, y: 14 },
    { x: -d * 47, y: 32 },
    { x: -d * 35, y: 45 },
    { x: -d * 22, y: 43 },
    { x: -d * 27, y: 22 },
    { x: -d * 29, y: 4 },
    { x: -d * 27, y: -14 },
    { x: -d * 22, y: -32 },
    { x: -d * 12, y: -46 },
    { x: -d * 2, y: -52 },
  ];
  softPath(c, pts);
}

function nosePath(c, d) {
  const pf = 0.55 + 0.45 * Math.abs(d);
  const tip = d * (12 + 25 * pf);
  const under = d * (10 + 21 * pf);
  const pts = [
    { x: d * 5, y: -8 },
    { x: d * 17, y: -4 },
    { x: d * 28, y: 4 },
    { x: tip, y: 12 },
    { x: under, y: 18 },
    { x: d * 9, y: 18 },
  ];
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

function drawHead(c, d, x, y) {
  c.save();
  c.translate(x, y);
  c.rotate(0.055 * d);

  // Light comes from the sun, off to the left of the bust.
  const marble = c.createLinearGradient(-46, -46, 44, 50);
  marble.addColorStop(0, '#fff6fd');
  marble.addColorStop(0.28, '#f4ddf1');
  marble.addColorStop(0.68, '#cba5d6');
  marble.addColorStop(1, '#a97cc2');

  // Hair mass.
  const hairGrad = c.createLinearGradient(-52, -40, 18, 44);
  hairGrad.addColorStop(0, '#dcc0e2');
  hairGrad.addColorStop(0.5, '#bb94cf');
  hairGrad.addColorStop(1, '#8d63ad');
  c.fillStyle = hairGrad;
  hairPath(c, d);
  c.fill();
  c.strokeStyle = alpha('#8f67ae', 0.45);
  c.lineWidth = 1.1;
  c.stroke();

  // Classical bun at the back.
  c.save();
  c.fillStyle = '#b286c6';
  c.beginPath();
  c.ellipse(-d * 48, 6, 17, 20, 0.2 * d, 0, TAU);
  c.fill();
  c.strokeStyle = alpha('#7d5599', 0.5);
  c.lineWidth = 1.1;
  c.stroke();
  c.strokeStyle = alpha('#8f67ae', 0.55);
  for (let i = -1; i <= 1; i += 1) {
    c.beginPath();
    c.arc(-d * 48, 6, 7 + i * 4.5, -2.4, 0.7);
    c.stroke();
  }
  c.fillStyle = alpha('#e7cdeb', 0.4);
  c.beginPath();
  c.ellipse(-d * 53, -2, 5, 8, 0.3 * d, 0, TAU);
  c.fill();
  c.restore();

  // Hair waves.
  c.save();
  hairPath(c, d);
  c.clip();
  const rand = rngFor(818);
  c.strokeStyle = alpha('#a778bb', 0.45);
  for (let i = 0; i < 7; i += 1) {
    const sx = -d * (22 + i * 5) + (rand() - 0.5) * 8;
    c.lineWidth = 1.1 + rand();
    c.beginPath();
    c.moveTo(sx, -52 + i * 4);
    c.bezierCurveTo(
      sx - d * 12, -30 + i * 3,
      sx + d * 2, -10 + i * 6,
      sx - d * 12, 20 + i * 5,
    );
    c.stroke();
  }
  c.fillStyle = alpha('#fff4fd', 0.30);
  c.beginPath();
  c.ellipse(-d * 34, -34, 11, 18, -0.4 * d, 0, TAU);
  c.fill();
  c.restore();

  // Hairline: two carved curls at the brow.
  c.strokeStyle = alpha('#a778bb', 0.55);
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(d * 13, -40, 7, 3.3, 5.6);
  c.stroke();
  c.beginPath();
  c.arc(d * 23, -34, 5, 3.2, 5.4);
  c.stroke();

  // Skull / face.
  skullPath(c, d);
  c.fillStyle = marble;
  c.fill();
  c.strokeStyle = alpha('#8d64a8', 0.34);
  c.lineWidth = 1;
  c.stroke();

  // Hairline wave over the forehead.
  c.beginPath();
  c.moveTo(d * 1, -51);
  c.quadraticCurveTo(d * 24, -49, d * 33, -35);
  c.quadraticCurveTo(d * 22, -37, d * 12, -38);
  c.quadraticCurveTo(d * 2, -41, -d * 10, -47);
  c.closePath();
  c.fillStyle = hairGrad;
  c.fill();
  c.strokeStyle = alpha('#8f67ae', 0.5);
  c.lineWidth = 1.1;
  c.stroke();
  c.strokeStyle = alpha('#7d559b', 0.55);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(d * 6, -45);
  c.quadraticCurveTo(d * 22, -43, d * 30, -34);
  c.stroke();

  // Jaw shading, opposite the gaze.
  c.save();
  skullPath(c, d);
  c.clip();
  const jaw = c.createLinearGradient(4, 0, 40, 0);
  jaw.addColorStop(0, alpha('#b98ec6', 0));
  jaw.addColorStop(1, alpha('#8f67ae', 0.4));
  c.fillStyle = jaw;
  c.fillRect(-60, -60, 120, 120);
  c.restore();

  // Ear on the far side.
  if (Math.abs(d) > 0.25) {
    c.save();
    c.globalAlpha = clamp((Math.abs(d) - 0.2) * 2.4);
    c.fillStyle = '#ddc0e4';
    c.strokeStyle = alpha('#8d64a8', 0.5);
    c.lineWidth = 0.9;
    c.beginPath();
    c.ellipse(-d * 33, 6, 5.2, 8.2, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = alpha('#8d64a8', 0.4);
    c.beginPath();
    c.arc(-d * 33, 5, 2.6, -1.2, 1.2);
    c.stroke();
    c.restore();
  }

  // Nose.
  nosePath(c, d);
  const noseGrad = c.createLinearGradient(-d * 10, -8, d * 40, 18);
  noseGrad.addColorStop(0, '#f6e0f2');
  noseGrad.addColorStop(0.55, '#e6c8e2');
  noseGrad.addColorStop(1, '#cba5d6');
  c.fillStyle = noseGrad;
  c.fill();
  c.strokeStyle = alpha('#9a70b1', 0.5);
  c.lineWidth = 1;
  c.stroke();
  c.strokeStyle = alpha('#fff6fd', 0.35);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(d * 8, -7);
  c.quadraticCurveTo(d * 24, 3, d * 34, 11);
  c.stroke();
  c.strokeStyle = alpha('#7f5699', 0.45);
  c.beginPath();
  c.moveTo(d * 14, 16);
  c.quadraticCurveTo(d * 28, 20, d * 40, 14);
  c.stroke();
  // Nostril.
  c.strokeStyle = alpha('#7f5699', 0.4);
  c.beginPath();
  c.arc(d * 38, 13, 2, 0.2, 2.4);
  c.stroke();

  // Brow.
  c.strokeStyle = alpha('#8d64a8', 0.5);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(d * 7, -16);
  c.quadraticCurveTo(d * 19, -21, d * 27, -14);
  c.stroke();

  // Eyes: near eye always, far eye as the head comes to front.
  drawMarbleEye(c, d * 18, -7, 0.95);
  if (Math.abs(d) < 0.8) {
    c.save();
    c.globalAlpha = clamp((0.8 - Math.abs(d)) * 1.6);
    drawMarbleEye(c, -d * 16, -8, 0.8);
    c.restore();
  }

  // Lips.
  c.strokeStyle = alpha('#8f4f78', 0.68);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(d * 19, 23);
  c.quadraticCurveTo(d * 26, 20.5, d * 30, 24);
  c.stroke();
  c.beginPath();
  c.moveTo(d * 19, 28);
  c.quadraticCurveTo(d * 26, 31.5, d * 30, 26.5);
  c.stroke();
  c.strokeStyle = alpha('#b57a99', 0.5);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(d * 21, 26);
  c.quadraticCurveTo(d * 25, 25, d * 28, 26);
  c.stroke();

  // Chin and jawline.
  c.strokeStyle = alpha('#a97fc0', 0.4);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(d * 30, 14);
  c.quadraticCurveTo(d * 28, 34, d * 12, 43);
  c.stroke();
  c.beginPath();
  c.moveTo(d * 18, 38);
  c.quadraticCurveTo(d * 24, 41, d * 24, 45);
  c.stroke();

  // Marble shine.
  c.fillStyle = alpha('#ffffff', 0.32);
  c.beginPath();
  c.ellipse(d * 4, -27, 10, 6.5, -0.5, 0, TAU);
  c.fill();
  c.fillStyle = alpha('#ffffff', 0.2);
  c.beginPath();
  c.ellipse(d * 26, 13, 4.5, 7, 0.3, 0, TAU);
  c.fill();

  // Crown highlight in the hair.
  c.strokeStyle = alpha('#fff2fb', 0.4);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(d * 0, -55);
  c.quadraticCurveTo(-d * 24, -60, -d * 38, -42);
  c.stroke();
  c.strokeStyle = alpha(PINK, 0.22);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(d * 0, -53.5);
  c.quadraticCurveTo(-d * 24, -58.5, -d * 37, -40.5);
  c.stroke();

  c.restore();
}

function drawMarbleEye(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = '#e7cde3';
  c.strokeStyle = alpha('#7f5699', 0.55);
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(0, 0, 8.5, 4.2, 0, 0, TAU);
  c.fill();
  c.stroke();
  // Carved iris.
  c.fillStyle = alpha('#9a70b1', 0.5);
  c.beginPath();
  c.arc(2, 0.2, 2.6, 0, TAU);
  c.fill();
  c.fillStyle = alpha('#5e3d74', 0.6);
  c.beginPath();
  c.arc(2.4, 0.2, 1.3, 0, TAU);
  c.fill();
  c.strokeStyle = alpha('#7f5699', 0.7);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-8, -1.6);
  c.quadraticCurveTo(0, -5.6, 8.6, -1.2);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const X = 468;
  const Y = ROAD_Y;

  c.save();
  // Ground shadow.
  c.fillStyle = alpha('#0b0420', 0.5);
  c.beginPath();
  c.ellipse(X + 4, Y + 7, 120, 11, 0, 0, TAU);
  c.fill();

  // RGB-split ghosts.
  c.save();
  c.globalAlpha = 0.42;
  c.translate(X - 3.4, Y + 1);
  painterLowRider(c, pose, CYAN, true);
  c.restore();

  c.save();
  c.globalAlpha = 0.42;
  c.translate(X + 3.4, Y - 1);
  painterLowRider(c, pose, HOT, true);
  c.restore();

  c.save();
  c.translate(X, Y);
  painterLowRider(c, pose, '#170b2e', false);
  c.restore();
  c.restore();
}

function painterLowRider(c, pose, color, ghost) {
  const ink = color;
  const light = ghost ? color : alpha('#a45ad0', 0.55);
  const metal = ghost ? color : '#4a2a70';

  c.save();

  drawPolyWheel(c, pose.wheels.rear, pose.wheelAngle, ink, metal);
  drawPolyWheel(c, pose.wheels.front, pose.wheelAngle, ink, metal);

  // Frame.
  const rh = pose.wheels.rear;
  const fh = pose.wheels.front;
  const crank = pose.crankCenter;
  const saddle = { x: -30, y: pose.saddle.y };
  const head = { x: 52, y: -130 };
  const bar = pose.grip;
  line(c, [rh, crank], ink, 6.5);
  line(c, [crank, saddle], ink, 6);
  line(c, [saddle, head], ink, 6);
  line(c, [crank, head], ink, 6.5);
  line(c, [rh, saddle], ink, 4.5);
  line(c, [fh, head], ink, 5.5);
  line(c, [head, bar], ink, 5);
  line(c, [head, { x: 60, y: -128 }], ink, 4);

  // Handlebar.
  line(c, [{ x: 74, y: -160 }, bar, { x: 92, y: -132 }], ink, 4.5);
  if (!ghost) {
    line(c, [{ x: 74, y: -160 }, bar], alpha(light, 0.8), 1.4);
  }

  // Saddle.
  c.fillStyle = ink;
  c.beginPath();
  c.moveTo(-48, -133);
  c.lineTo(-14, -136);
  c.lineTo(-12, -130);
  c.lineTo(-46, -128);
  c.closePath();
  c.fill();

  // Far leg first, behind the body.
  drawPolyLeg(c, pose.hip, pose.legs.far, ink, 9, 5, ghost ? 0.45 : 0.6);

  // Tail fan.
  const t0 = { x: -54, y: -180 };
  c.fillStyle = ink;
  for (let k = 0; k < 3; k += 1) {
    c.beginPath();
    c.moveTo(t0.x, t0.y);
    c.lineTo(-96 - k * 4, -204 + k * 15);
    c.lineTo(-86 - k * 2, -186 + k * 18);
    c.closePath();
    c.fill();
  }

  // Body: a rounded low-poly mass.
  const b = pose.body;
  const body = [];
  const n = 16;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    const k = 0.96 + 0.06 * Math.sin(i * 2.3 + 0.5);
    const lx = Math.cos(a) * b.rx * 0.94 * k;
    const ly = Math.sin(a) * b.ry * 0.9 * k;
    const cs = Math.cos(b.rot);
    const sn = Math.sin(b.rot);
    body.push({ x: b.x + lx * cs - ly * sn, y: b.y + lx * sn + ly * cs });
  }
  polyFill(c, body, ink);
  if (!ghost) {
    const cs = Math.cos(b.rot);
    const sn = Math.sin(b.rot);
    const top = [];
    for (let i = 3; i <= 9; i += 1) {
      const a = (i / n) * TAU;
      const lx = Math.cos(a) * b.rx * 0.93;
      const ly = Math.sin(a) * b.ry * 0.93;
      top.push({ x: b.x + lx * cs - ly * sn, y: b.y + lx * sn + ly * cs });
    }
    polyLine(c, top, alpha('#b06ad0', 0.55), 1.4);
  }

  // Neck strip.
  polyFill(c, ribbon(pose.neck, 17, 11), ink);

  // Head.
  polyFill(c, ngon(pose.head.x, pose.head.y, 23, 9, 0.35), ink);

  // Crest.
  c.beginPath();
  c.moveTo(pose.head.x - 6, pose.head.y - 14);
  c.lineTo(pose.head.x - 20, pose.head.y - 34);
  c.lineTo(pose.head.x - 22, pose.head.y - 16);
  c.lineTo(pose.head.x - 13, pose.head.y - 6);
  c.closePath();
  c.fillStyle = ink;
  c.fill();

  // Beak: long upper mandible plus hanging pouch.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  c.beginPath();
  c.moveTo(bb.x - 3, bb.y - 8);
  c.lineTo(bt.x + 5, bt.y - 6);
  c.lineTo(bt.x + 3, bt.y + 2);
  c.lineTo(bb.x + 2, bb.y + 6);
  c.closePath();
  c.fillStyle = ink;
  c.fill();

  c.beginPath();
  c.moveTo(bb.x + 2, bb.y + 4);
  c.lineTo(bt.x - 2, bt.y + 1);
  c.lineTo(pose.pouch.x + 2, pose.pouch.y + 8);
  c.lineTo(bb.x + 4, bb.y + 21);
  c.closePath();
  c.fillStyle = ink;
  c.fill();

  if (!ghost) {
    // Eye and rim light, so the bird still reads at silhouette scale.
    c.fillStyle = '#ffe6f4';
    c.beginPath();
    c.arc(pose.head.x + 10, pose.head.y - 7, 2.8, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(CYAN, 0.5);
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(bb.x + 2, bb.y - 8);
    c.lineTo(bt.x + 4, bt.y - 6);
    c.stroke();

    // Neck rim.
    c.strokeStyle = alpha('#b06ad0', 0.5);
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(pose.neck[0].x - 8, pose.neck[0].y);
    c.quadraticCurveTo(
      pose.neck[1].x - 7, pose.neck[1].y,
      pose.neck[2].x - 4, pose.neck[2].y,
    );
    c.stroke();

    // Pouch rim, so the beak and pouch read separately.
    c.strokeStyle = alpha(PINK, 0.55);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(bb.x + 5, bb.y + 20);
    c.quadraticCurveTo(pose.pouch.x, pose.pouch.y + 8, bt.x - 2, bt.y + 2);
    c.stroke();
  }

  // Wing reaching the bar.
  polyFill(c, ribbon([pose.shoulder, { x: 44, y: -168 }, pose.grip], 13, 5), ink);
  // Wrist feathers.
  c.fillStyle = ink;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(pose.grip.x - 2, pose.grip.y + 2 + i * 2.4);
    c.lineTo(pose.grip.x - 16 - i * 3, pose.grip.y + 9 + i * 5);
    c.lineTo(pose.grip.x - 4, pose.grip.y + 8 + i * 2.8);
    c.closePath();
    c.fill();
  }
  if (!ghost) {
    polyLine(
      c,
      [{ x: pose.shoulder.x - 5, y: pose.shoulder.y + 4 }, { x: 44, y: -169 }],
      alpha('#b06ad0', 0.4),
      1.2,
    );
  }

  // Near leg.
  drawPolyLeg(c, pose.hip, pose.legs.near, ink, 11, 6, 1);
  if (!ghost) {
    polyLine(
      c,
      [pose.hip, pose.legs.near.knee, pose.legs.near.ankle],
      alpha('#7a4aa4', 0.45),
      1.2,
    );
  }

  // Crank and pedals.
  line(c, [crank, pose.pedals.far], ink, 3.4);
  line(c, [crank, pose.pedals.near], ink, 3.4);
  c.fillStyle = ink;
  c.fillRect(pose.pedals.near.x - 7, pose.pedals.near.y - 2, 14, 4);
  c.fillRect(pose.pedals.far.x - 7, pose.pedals.far.y - 2, 14, 4);
  c.beginPath();
  c.arc(crank.x, crank.y, 5, 0, TAU);
  c.fill();

  c.restore();
}

function drawPolyWheel(c, wheel, angle, ink, metal) {
  c.save();
  c.translate(wheel.x, wheel.y);
  polyLine(c, ngon(0, 0, wheel.r, 14, angle), ink, 7.5, true);
  polyLine(c, ngon(0, 0, wheel.r - 5, 14, -angle * 0.7), metal, 1.6, true);
  for (let i = 0; i < 6; i += 1) {
    const a = angle + (i / 6) * TAU;
    c.strokeStyle = metal;
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * (wheel.r - 6), Math.sin(a) * (wheel.r - 6));
    c.stroke();
  }
  c.fillStyle = ink;
  c.beginPath();
  c.arc(0, 0, 4, 0, TAU);
  c.fill();
  c.restore();
}

function drawPolyLeg(c, hip, leg, ink, w0, w1, a) {
  c.save();
  c.globalAlpha *= a;
  const poly = ribbon([hip, leg.knee, leg.ankle], w0, w1);
  polyFill(c, poly, ink);
  // Foot.
  c.fillStyle = ink;
  c.fillRect(leg.ankle.x - 4, leg.ankle.y - 2, 12, 4);
  c.restore();
}

function ngon(cx, cy, r, n, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = rot + (i / n) * TAU;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function ribbon(pts, w0, w1) {
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = pts.length === 1 ? 0 : i / (pts.length - 1);
    const w = lerp(w0, w1, t) / 2;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  return left.concat(right.reverse());
}

function polyFill(c, pts, fill) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

function polyLine(c, pts, color, w, closed = false) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  if (closed) c.closePath();
  c.stroke();
}

function line(c, pts, color, w) {
  polyLine(c, pts, color, w);
}

// ---------------------------------------------------------------- floating UI

function drawUI(g, local) {
  const c = g.drawingContext;

  // Radio window.
  drawRadioWindow(c, -322, 152, local);

  // Search pill.
  drawSearchPill(c, 800, 138, local);

  // Wireframe pyramid.
  drawWirePyramid(c, 268, 292, local);

  // "PLEASE REWIND" sticker.
  drawRewindSticker(c, 1108, 292, local);

  // Tape OSD.
  c.save();
  setFont(c, 17, 500, EN_FONT, '3px');
  c.fillStyle = alpha(CREAM, 0.65);
  c.fillText('▶ PLAY', -322, 92);
  c.textAlign = 'right';
  c.fillText('SP', 1390, 92);
  setFont(c, 12, 400, EN_FONT, '2px');
  c.fillStyle = alpha(CREAM, 0.42);
  c.fillText('T-120  ·  TRACKING', 1390, 112);
  c.restore();
}

function drawRadioWindow(c, x, y, local) {
  const w = 316;
  const h = 158;
  c.save();

  c.shadowColor = alpha(PINK, 0.5);
  c.shadowBlur = 24;
  c.fillStyle = 'rgba(24, 12, 48, 0.86)';
  c.fillRect(x, y, w, h);
  c.shadowColor = 'transparent';

  // Chrome frame.
  const chrome = c.createLinearGradient(x, y, x + w, y + h);
  chrome.addColorStop(0, '#fbe9fa');
  chrome.addColorStop(0.3, '#a98cc9');
  chrome.addColorStop(0.55, '#fff3fd');
  chrome.addColorStop(0.8, '#9a7cbd');
  chrome.addColorStop(1, '#ffc7e6');
  c.strokeStyle = chrome;
  c.lineWidth = 3;
  c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

  // Title bar.
  const bar = c.createLinearGradient(x, y, x + w, y);
  bar.addColorStop(0, '#543193');
  bar.addColorStop(1, '#b04f9e');
  c.fillStyle = bar;
  c.fillRect(x + 3, y + 3, w - 6, 26);
  c.fillStyle = alpha('#fff1fb', 0.98);
  setFont(c, 12, 600, CN_FONT, '1px');
  c.fillText('晚风电台', x + 12, y + 22);
  setFont(c, 9, 500, EN_FONT, '2px');
  c.fillStyle = alpha(CREAM, 0.62);
  c.fillText('NIGHT BREEZE FM · 88.1', x + 92, y + 21);

  // Status.
  setFont(c, 11, 500, EN_FONT, '1.4px');
  c.fillStyle = alpha(CYAN, 0.9);
  c.fillText('▷ ON AIR', x + 12, y + 54);

  const blink = (Math.floor(local * 4) % 2 === 0) ? 1 : 0.25;
  c.fillStyle = alpha(PINK, 0.5 + 0.45 * blink);
  c.beginPath();
  c.arc(x + 232, y + 50, 4.5, 0, TAU);
  c.fill();

  setFont(c, 10, 400, EN_FONT, '1px');
  c.fillStyle = alpha(CREAM, 0.6);
  c.fillText('02:14 / 06:00', x + 12, y + 76);

  // Progress.
  c.fillStyle = alpha('#ffffff', 0.12);
  c.fillRect(x + 12, y + 84, 240, 3);
  c.fillStyle = PINK;
  c.fillRect(x + 12, y + 84, 96, 3);
  c.fillStyle = CREAM;
  c.fillRect(x + 106, y + 82, 3, 7);

  // Equaliser, quantised to 8 Hz.
  const qt = Math.floor(local * 8) / 8;
  const rand = rngFor(Math.round(qt * 31) + 401);
  for (let i = 0; i < 22; i += 1) {
    const bh = 4 + rand() * 20;
    const col = i < 7 ? CYAN : i < 15 ? PINK : '#c58bff';
    c.fillStyle = alpha(col, 0.75);
    c.fillRect(x + 12 + i * 9, y + 128 - bh, 4, bh);
  }

  setFont(c, 9, 400, EN_FONT, '1.6px');
  c.fillStyle = alpha(CREAM, 0.45);
  c.fillText('SIDE A · NIGHT DRIVE', x + 12, y + 148);
  c.textAlign = 'right';
  c.fillText('STEREO', x + 300, y + 148);
  c.restore();
}

function drawSearchPill(c, x, y, local) {
  const w = 252;
  const h = 42;
  c.save();
  const bob = Math.sin(local * 0.9) * 2;
  c.translate(0, bob);
  c.fillStyle = 'rgba(27, 14, 52, 0.66)';
  c.strokeStyle = alpha(PINK, 0.7);
  c.lineWidth = 1.6;
  c.beginPath();
  c.roundRect(x, y, w, h, 21);
  c.fill();
  c.stroke();

  c.strokeStyle = alpha(CREAM, 0.8);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x + 22, y + 19, 6, 0, TAU);
  c.stroke();
  c.beginPath();
  c.moveTo(x + 26.5, y + 24.5);
  c.lineTo(x + 31, y + 29);
  c.stroke();

  setFont(c, 13, 400, CN_FONT, '1px');
  c.fillStyle = alpha(CREAM, 0.82);
  c.fillText('搜索回忆', x + 40, y + 27);
  setFont(c, 10, 500, EN_FONT, '1.4px');
  c.fillStyle = alpha(CREAM, 0.42);
  c.fillText('SEARCH', x + 112, y + 26);

  // Cursor.
  const cx = x + 218;
  const cyy = y + 26 + Math.sin(local * 3.2) * 2;
  c.fillStyle = alpha(CYAN, 0.9);
  c.beginPath();
  c.moveTo(cx, cyy);
  c.lineTo(cx, cyy + 14);
  c.lineTo(cx + 4, cyy + 10);
  c.lineTo(cx + 9, cyy + 13);
  c.lineTo(cx + 11, cyy + 9);
  c.lineTo(cx + 6, cyy + 6);
  c.lineTo(cx + 10, cyy + 3);
  c.closePath();
  c.fill();
  c.restore();
}

function drawWirePyramid(c, x, y, local) {
  c.save();
  const bob = Math.sin(local * 1.1 + 2) * 4;
  c.translate(x, y + bob);
  c.strokeStyle = alpha(CYAN, 0.55);
  c.lineWidth = 1.1;
  const top = { x: 0, y: -46 };
  const l = { x: -40, y: 22 };
  const r = { x: 40, y: 22 };
  const f = { x: 0, y: 38 };
  c.beginPath();
  c.moveTo(top.x, top.y); c.lineTo(l.x, l.y); c.lineTo(f.x, f.y); c.lineTo(r.x, r.y); c.closePath();
  c.moveTo(top.x, top.y); c.lineTo(f.x, f.y);
  c.stroke();
  c.strokeStyle = alpha(PINK, 0.4);
  c.beginPath();
  c.moveTo(l.x, l.y); c.lineTo(r.x, r.y);
  c.stroke();

  // Crosshair.
  c.strokeStyle = alpha(CREAM, 0.3);
  c.setLineDash([3, 5]);
  c.beginPath();
  c.moveTo(-60, 0); c.lineTo(60, 0);
  c.moveTo(0, -64); c.lineTo(0, 56);
  c.stroke();
  c.setLineDash([]);

  setFont(c, 9, 500, EN_FONT, '1.8px');
  c.fillStyle = alpha(CREAM, 0.48);
  c.fillText('OBJ 07 / ROOM', -58, 60);
  c.restore();
}

function drawRewindSticker(c, x, y, local) {
  c.save();
  c.translate(x, y + Math.sin(local * 0.8 + 1) * 3);
  c.rotate(-0.11);

  c.shadowColor = alpha('#10061f', 0.6);
  c.shadowBlur = 14;
  c.shadowOffsetY = 4;
  c.fillStyle = '#f7dcef';
  c.fillRect(-104, -58, 208, 116);
  c.shadowColor = 'transparent';

  c.strokeStyle = alpha(PINK, 0.95);
  c.lineWidth = 3;
  c.strokeRect(-104, -58, 208, 116);

  // Top rule and tape number.
  c.strokeStyle = alpha(PINK, 0.6);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-88, -38);
  c.lineTo(88, -38);
  c.stroke();

  setFont(c, 8, 500, EN_FONT, '1.8px');
  c.textAlign = 'left';
  c.fillStyle = alpha(INDIGO, 0.62);
  c.fillText('NO.18 · KEEP TAPE', -88, -45);

  setFont(c, 26, 600, CN_FONT, '6px');
  c.textAlign = 'center';
  c.fillStyle = INDIGO;
  c.fillText('请 倒 带', 0, 4);

  setFont(c, 12, 600, EN_FONT, '3px');
  c.fillStyle = alpha('#6a2f86', 0.95);
  c.fillText('PLEASE REWIND', 0, 24);

  // Rewind glyph under the text.
  c.fillStyle = PINK;
  c.beginPath();
  c.moveTo(-16, 50);
  c.lineTo(-4, 42);
  c.lineTo(-4, 58);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(-3, 50);
  c.lineTo(9, 42);
  c.lineTo(9, 58);
  c.closePath();
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------- tape

function beatPulse(local, at, w) {
  const d = Math.abs(local - at);
  if (d > w) return 0;
  const k = 1 - d / w;
  return k * k;
}

function glitchAmount(local) {
  return clamp(
    beatPulse(local, 3.0, 0.34) * 1.0
    + beatPulse(local, 1.0, 0.16) * 0.55
    + beatPulse(local, 2.0, 0.10) * 0.4
    + beatPulse(local, 5.0, 0.22) * 0.7,
  );
}

function drawVHS(g, local) {
  const c = g.drawingContext;
  const glitch = glitchAmount(local);

  // Rolling tracking band, always faintly present.
  const rollY = -150 + ((local * 210) % 1320);
  c.fillStyle = alpha('#0a0420', 0.10);
  c.fillRect(-800, rollY, 2400, 62);
  c.fillStyle = alpha('#ffffff', 0.045);
  c.fillRect(-800, rollY + 60, 2400, 2.4);

  if (glitch > 0.012) {
    const cv = g.canvas;
    const bandY = 0.40 + 0.014 * Math.sin(local * 2.7);
    const tears = [
      { f: bandY, h: 0.026, dx: 0.036 },
      { f: 0.735 + 0.02 * Math.sin(local * 5.1), h: 0.034, dx: -0.04 },
      { f: 0.875, h: 0.014, dx: 0.03 },
    ];

    // Tape tear: the frame itself slips sideways inside thin bands.
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    tears.forEach((b, i) => {
      const y = Math.round(cv.height * b.f);
      const h = Math.max(3, Math.round(cv.height * b.h * (0.55 + glitch)));
      const dx = Math.round(cv.width * b.dx * glitch * Math.sin(local * 9.3 + i * 2.2));
      c.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
    });
    c.restore();

    // Noise and chroma smears over the tears, in screen space.
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    const W = cv.width;
    const H = cv.height;
    const qt = Math.floor(local * 16);
    const rand = rngFor(900 + qt);
    tears.forEach((b, i) => {
      const y = H * b.f;
      const h = Math.max(3, H * b.h * (0.55 + glitch));
      for (let k = 0; k < 84; k += 1) {
        const yy = y + rand() * h;
        const xx = rand() * W;
        const ww = W * (0.002 + rand() * 0.06);
        const pick = rand();
        c.fillStyle = pick < 0.6
          ? alpha('#ffffff', 0.05 + rand() * 0.2)
          : pick < 0.82
            ? alpha(CYAN, 0.08 + rand() * 0.24)
            : alpha(HOT, 0.08 + rand() * 0.24);
        c.fillRect(xx, yy, ww, 1 + rand() * 2.4);
      }
      // Hard tape edges plus chroma fringes.
      c.fillStyle = alpha('#0a0420', 0.28);
      c.fillRect(0, y, W, 1.8);
      c.fillRect(0, y + h - 1.8, W, 1.8);
      c.fillStyle = alpha('#ffffff', 0.10 + 0.24 * glitch);
      c.fillRect(0, y + h * 0.42, W, 1.2);
      c.fillStyle = alpha(CYAN, 0.2 * glitch);
      c.fillRect(0, y - 4, W, 3.2);
      c.fillStyle = alpha(HOT, 0.2 * glitch);
      c.fillRect(0, y + h + 1, W, 3.6);
    });
    c.restore();
  }

  // Head-switching noise at the foot of the tape.
  const qt = Math.floor(local * 18);
  const rand = rngFor(1234 + qt);
  for (let i = 0; i < 9; i += 1) {
    const yy = 986 + i * 6;
    c.fillStyle = i % 2
      ? alpha('#0b0420', 0.5)
      : alpha('#e9d4ff', 0.05 + rand() * 0.16);
    c.fillRect(-800, yy, 2400, 3.4);
    c.fillStyle = alpha('#ffffff', 0.05 + rand() * 0.22);
    for (let j = 0; j < 14; j += 1) {
      c.fillRect(-800 + rand() * 2400, yy + rand() * 2.4, 8 + rand() * 60, 1.1);
    }
  }

  // CRT vignette.
  const vig = c.createRadialGradient(VP.x, 560, 260, VP.x, 560, 1150);
  vig.addColorStop(0, 'rgba(8,3,18,0)');
  vig.addColorStop(0.62, 'rgba(8,3,18,0.16)');
  vig.addColorStop(1, 'rgba(5,2,12,0.62)');
  c.fillStyle = vig;
  c.fillRect(-800, -150, 2400, 1260);
}

function drawScanlines(g) {
  const c = g.drawingContext;
  c.save();
  for (let i = 0; i < 380; i += 1) {
    const y = -140 + i * 3.35;
    if (i % 5 === 0) {
      c.fillStyle = 'rgba(8, 2, 20, 0.085)';
    } else {
      c.fillStyle = 'rgba(8, 2, 20, 0.032)';
    }
    c.fillRect(-800, y, 2400, 1.4);
    if (i % 37 === 0) {
      c.fillStyle = 'rgba(255, 230, 250, 0.035)';
      c.fillRect(-800, y + 1.6, 2400, 1);
    }
  }

  // Slight chroma band along the top and bottom edges.
  c.fillStyle = alpha(CYAN, 0.05);
  c.fillRect(-800, -150, 2400, 90);
  c.fillStyle = alpha(HOT, 0.05);
  c.fillRect(-800, 1000, 2400, 110);
  c.restore();
}

// ---------------------------------------------------------------- geometry

function softPath(c, pts) {
  const n = pts.length;
  c.beginPath();
  c.moveTo((pts[n - 1].x + pts[0].x) / 2, (pts[n - 1].y + pts[0].y) / 2);
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    c.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  c.closePath();
}

function fillQuad(c, pts, fill) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
}

// ---------------------------------------------------------------- title card

function drawVaporTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const y = H - 232 * s + lift * 0.7 * s;
  const w = 566 * s;
  const h = 138 * s;

  c.save();
  c.globalAlpha = opacity;

  // Soft pink glow behind the label.
  c.shadowColor = alpha(PINK, 0.7);
  c.shadowBlur = 34 * s;
  c.fillStyle = alpha('#1a0d30', 0.9);
  c.beginPath();
  c.roundRect(x, y, w, h, 9 * s);
  c.fill();
  c.shadowColor = 'transparent';

  // Chrome shell.
  const chrome = c.createLinearGradient(x, y, x, y + h);
  chrome.addColorStop(0, '#fff6ff');
  chrome.addColorStop(0.16, '#b7a3d4');
  chrome.addColorStop(0.34, '#ffffff');
  chrome.addColorStop(0.52, '#e8a8d6');
  chrome.addColorStop(0.7, '#8f78b6');
  chrome.addColorStop(0.86, '#ffe6fb');
  chrome.addColorStop(1, '#a98cc9');
  c.fillStyle = chrome;
  c.beginPath();
  c.roundRect(x, y, w, h, 9 * s);
  c.fill();

  // Dark inset.
  c.fillStyle = 'rgba(20, 10, 38, 0.94)';
  c.beginPath();
  c.roundRect(x + 7 * s, y + 7 * s, w - 14 * s, h - 14 * s, 5 * s);
  c.fill();

  // Chrome top strip.
  c.fillStyle = alpha('#e9d9f2', 0.94);
  c.fillRect(x + 9 * s, y + 9 * s, w - 18 * s, 27 * s);
  const strip = c.createLinearGradient(x, y, x + w, y);
  strip.addColorStop(0, 'rgba(255,255,255,0.55)');
  strip.addColorStop(0.45, 'rgba(190,160,220,0.15)');
  strip.addColorStop(1, 'rgba(255,190,230,0.5)');
  c.fillStyle = strip;
  c.fillRect(x + 9 * s, y + 9 * s, w - 18 * s, 27 * s);

  setFont(c, 12 * s, 700, EN_FONT, '2.6px');
  c.textAlign = 'left';
  c.fillStyle = '#3a2160';
  c.fillText('▶ PLAY', x + 18 * s, y + 28 * s);
  c.fillStyle = alpha('#3a2160', 0.72);
  c.fillText('T-120  ·  SP  ·  STEREO', x + 96 * s, y + 28 * s);
  c.textAlign = 'right';
  c.fillText('00:03:07', x + w - 18 * s, y + 28 * s);

  // Pink label plate.
  const plate = c.createLinearGradient(x, y + 40 * s, x + w, y + h);
  plate.addColorStop(0, '#ff8cc4');
  plate.addColorStop(0.55, '#ff6fb5');
  plate.addColorStop(1, '#d94c9e');
  c.fillStyle = plate;
  c.fillRect(x + 9 * s, y + 42 * s, w - 18 * s, 70 * s);

  // Label scanlines.
  c.fillStyle = 'rgba(255, 255, 255, 0.10)';
  for (let i = 0; i < 9; i += 1) {
    c.fillRect(x + 9 * s, y + (44 + i * 7.6) * s, w - 18 * s, 1.2 * s);
  }

  // Index.
  setFont(c, 42 * s, 800, EN_FONT, '1px');
  c.textAlign = 'left';
  c.fillStyle = '#2b1b4d';
  c.fillText('18', x + 20 * s, y + 90 * s);
  setFont(c, 11 * s, 700, EN_FONT, '1.6px');
  c.fillStyle = alpha('#2b1b4d', 0.66);
  c.fillText('/ 20', x + 20 * s, y + 104 * s);

  c.strokeStyle = alpha('#2b1b4d', 0.35);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(x + 70 * s, y + 56 * s);
  c.lineTo(x + 70 * s, y + 100 * s);
  c.stroke();

  // Titles.
  setFont(c, 29 * s, 700, CN_FONT, '3px');
  c.fillStyle = '#24123f';
  c.fillText('蒸汽波', x + 86 * s, y + 83 * s);

  setFont(c, 12.5 * s, 700, EN_FONT, '4.4px');
  c.fillStyle = alpha('#2b1b4d', 0.9);
  c.fillText('VAPORWAVE', x + 87 * s, y + 101 * s);

  setFont(c, 11 * s, 500, EN_FONT, '2px');
  c.fillStyle = alpha(CREAM, 0.74);
  c.fillText('2010s  ·  请倒带', x + 20 * s, y + 125 * s);

  // Cassette reels at the right end.
  for (let i = 0; i < 2; i += 1) {
    const rx = x + w - 92 * s + i * 54 * s;
    const ry = y + 78 * s;
    c.strokeStyle = alpha('#2b1b4d', 0.55);
    c.lineWidth = 2 * s;
    c.beginPath();
    c.arc(rx, ry, 15 * s, 0, TAU);
    c.stroke();
    c.strokeStyle = alpha('#fff0fa', 0.8);
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.arc(rx, ry, 9 * s, 0, TAU);
    c.stroke();
    c.fillStyle = alpha('#2b1b4d', 0.5);
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * TAU;
      c.fillRect(rx + Math.cos(a) * 11 * s - 1 * s, ry + Math.sin(a) * 11 * s - 1 * s, 2 * s, 2 * s);
    }
  }

  // Barcode on the dark lower strip.
  c.fillStyle = alpha(CREAM, 0.55);
  for (let i = 0; i < 16; i += 1) {
    const bw = (i % 3 === 0 ? 3 : 1.2) * s;
    c.fillRect(x + w - 108 * s + i * 5 * s, y + 116 * s, bw, 13 * s);
  }

  c.restore();
}
