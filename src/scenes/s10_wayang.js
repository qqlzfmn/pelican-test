// 10 — Wayang kulit. A cotton screen lit by an oil lamp, seen from the shadow
// side: deep indigo surround, amber cloth, carved leather puppets with gold
// edges, punched pin holes and visible rods. The puppets are quantised to 10 Hz
// while the camera and the road stay smooth; the hard shadow trails one step.
// The rod nudges the pelican on the gag bar and it keeps riding.

import { basePalette } from './_placeholder.js';
import { CACHE, cachedLayer } from '../kit/cache.js';
import { alpha } from '../kit/color.js';
import { clamp, noise1, rngFor, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const INDIGO = '#191a26';
const AMBER = '#d99a3e';
const GOLD = '#e0b05a';
const LEATHER = '#312016';
const LEATHER_D = '#201511';
const HOLE = '#f6ce88';

const SCREEN = { x: -300, y: 92, w: 1620, h: 860 };
const BAND = 78;
const OUTER = {
  x: SCREEN.x - BAND,
  y: SCREEN.y - BAND,
  w: SCREEN.w + BAND * 2,
  h: SCREEN.h + BAND * 2,
};

const RIDER_X = 468;
const RIDER_Y = 820;
const RIDER_S = 2.02;
const COW_X = 175;
const COW_Y = 820;
const HAND = { x: 968, y: 846 };

const pal = basePalette({
  bg: INDIGO,
  bg2: '#232338',
  motif: AMBER,
  accent: GOLD,
  ink: '#f2d99f',
  titleInk: '#f6e2b4',
  scrim: '#08080e',
  ground: '#151622',
  road: '#202132',
  dash: '#c79a4c',
  body: '#e6c98a',
  beak: '#cf9b42',
  rigInk: '#0d0d17',
});

// Leather seen against the lamp: warm near-black body, gold cut edge, light
// through the punch holes. The shadow copy keeps the holes but loses the gold.
const TONE = {
  fill: LEATHER,
  dark: LEATHER_D,
  edge: GOLD,
  edgeA: 1,
  halo: 'rgba(226, 165, 82, 0.1)',
  pin: HOLE,
  pinA: 1,
  detail: 'rgba(224, 176, 90, 0.62)',
};

const SHADOW = {
  fill: '#050409',
  dark: '#030307',
  edge: '#050409',
  edgeA: 1,
  halo: null,
  pin: '#a8783f',
  pinA: 0.9,
  detail: 'rgba(150, 104, 56, 0.5)',
};

const HAND_TONE = {
  fill: '#3a2923',
  dark: '#241816',
  edge: '#d9a85c',
  edgeA: 0.9,
  halo: null,
  pin: HOLE,
  pinA: 0.8,
  detail: 'rgba(224, 176, 90, 0.5)',
};

const FAR = {
  ...TONE,
  fill: '#211510',
  dark: '#170f0c',
  edge: 'rgba(224, 176, 90, 0.66)',
  halo: null,
};

export default {
  id: 's10',
  number: 10,
  cn: '爪哇皮影戏',
  en: 'Wayang Kulit',
  year: '约1800',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    const screen = cachedLayer(ctx, 's10-screen', drawScreen);
    c.drawImage(screen.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    // Ten steps a second: the puppet advances in eight-to-twelve-hertz ticks.
    const STEP = 0.1;
    const qLocal = Math.floor(ctx.local / STEP + 1e-6) * STEP;
    const t0 = ctx.t - ctx.local;
    const qTime = t0 + qLocal;
    const lagTime = qTime - STEP;

    const pose = rigPose(qTime);
    const poseLag = rigPose(lagTime);
    const nudge = nudgeAt(qLocal);
    const nudgeLag = nudgeAt(Math.max(0, qLocal - STEP));

    c.save();
    clipScreen(c);

    // The earth is a smooth, scrolling band; only the puppets are stepped.
    ctx.road(g, {
      ground: '#17161f',
      verge: '#232031',
      road: '#1e1c28',
      edge: 'rgba(224, 176, 90, 0.24)',
      dash: 'rgba(199, 154, 76, 0.08)',
      ink: '#0d0c14',
      dust: false,
    });
    softenGroundEdge(g);
    drawGroundTufts(g, ctx);

    drawReeds(g, -204, 0.92, false);
    drawReeds(g, 1306, 1.05, true);

    // Shadows first: one step behind, hard-edged, down and to the right.
    drawRiderPuppet(g, poseLag, {
      x: RIDER_X + 44,
      y: RIDER_Y + 34,
      scale: RIDER_S * 1.012,
      tone: SHADOW,
      alpha: 0.86,
      nudge: nudgeLag,
    });
    drawCow(g, qLocal, {
      x: COW_X + 30,
      y: COW_Y + 24,
      scale: 0.97,
      tone: SHADOW,
      alpha: 0.8,
    });

    // Rods, then the leather in front of them.
    drawRods(g, nudge);
    drawCow(g, qLocal, {
      x: COW_X,
      y: COW_Y,
      scale: 0.95,
      tone: TONE,
      alpha: 1,
    });
    drawRiderPuppet(g, pose, {
      x: RIDER_X,
      y: RIDER_Y,
      scale: RIDER_S,
      tone: TONE,
      alpha: 1,
      nudge,
    });
    drawNudgeSpark(g, nudge);

    c.restore();

    const border = cachedLayer(ctx, 's10-border', drawBorder);
    c.drawImage(border.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawLampFlicker(g, ctx);
    drawDalangHand(g, ctx, qLocal);
    drawDust(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawWayangTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- helpers

function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function smoothClosedPath(c, pts) {
  const n = pts.length;
  const m0 = mid(pts[n - 1], pts[0]);
  c.beginPath();
  c.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i += 1) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % n]);
    c.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  c.closePath();
}

function smoothPath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const m = mid(pts[i], pts[i + 1]);
    c.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
  }
  const last = pts[pts.length - 1];
  c.lineTo(last.x, last.y);
}

function plate(c, pts, tone) {
  smoothClosedPath(c, pts);
  if (tone.halo) {
    c.strokeStyle = tone.halo;
    c.lineWidth = 9;
    c.lineJoin = 'round';
    c.stroke();
  }
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.7;
  c.stroke();
}

// A limb or rod of leather: gold cut edge, dark interior.
function tube(c, pts, w, tone, { halo = true } = {}) {
  c.lineCap = 'round';
  c.lineJoin = 'round';
  if (halo && tone.halo) {
    c.strokeStyle = tone.halo;
    c.lineWidth = w + 8;
    smoothPath(c, pts);
    c.stroke();
  }
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = w + 2.8;
  smoothPath(c, pts);
  c.stroke();
  c.strokeStyle = tone.fill;
  c.lineWidth = w;
  smoothPath(c, pts);
  c.stroke();
}

function pin(c, x, y, r, tone, a = 1) {
  c.fillStyle = alpha(tone.pin, tone.pinA * a);
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

function ring(c, x, y, r, color, w) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
}

function slit(c, x, y, len, ang, tone, w = 1.5) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.strokeStyle = alpha(tone.pin, tone.pinA * 0.96);
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-len / 2, 0);
  c.lineTo(len / 2, 0);
  c.stroke();
  c.restore();
}

function clipScreen(c) {
  c.beginPath();
  c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  c.clip();
}

// ---------------------------------------------------------------- screen

function drawScreen(pg, c) {
  // The indigo surround beyond the cloth — matches the director's backstop so
  // the cached plate has no visible boundary.
  c.fillStyle = INDIGO;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

  // Woven battens in the dark, barely there.
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.012)';
  for (let x = CACHE.x0; x < CACHE.x0 + CACHE.w; x += 74) {
    c.fillRect(x, CACHE.y0, 30, CACHE.h);
  }
  c.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = CACHE.x0; x < CACHE.x0 + CACHE.w; x += 148) {
    c.fillRect(x, CACHE.y0, 2.5, CACHE.h);
  }
  c.restore();

  c.save();
  clipScreen(c);

  // Cloth ground colour.
  c.fillStyle = '#8a6350';
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // The lamp: one broad warm pool, low and left of centre, dying to indigo.
  const lamp = c.createRadialGradient(430, 452, 40, 430, 452, 1170);
  lamp.addColorStop(0, '#f3c97f');
  lamp.addColorStop(0.14, '#eab469');
  lamp.addColorStop(0.32, '#d2954f');
  lamp.addColorStop(0.48, '#a9734a');
  lamp.addColorStop(0.6, '#7d5548');
  lamp.addColorStop(0.72, '#4e3d4f');
  lamp.addColorStop(0.84, '#302f47');
  lamp.addColorStop(0.93, '#242436');
  lamp.addColorStop(1, '#1a1a27');
  c.fillStyle = lamp;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // Hot core just behind the pelican's head and the handlebar.
  const core = c.createRadialGradient(560, 470, 10, 560, 470, 460);
  core.addColorStop(0, 'rgba(255, 243, 210, 0.52)');
  core.addColorStop(0.45, 'rgba(255, 224, 168, 0.2)');
  core.addColorStop(1, 'rgba(255, 210, 150, 0)');
  c.fillStyle = core;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // Cool indigo creeping in from the lower right, so the screen holds depth.
  const cool = c.createRadialGradient(1240, 900, 60, 1240, 900, 760);
  cool.addColorStop(0, 'rgba(28, 30, 54, 0.5)');
  cool.addColorStop(0.6, 'rgba(28, 30, 54, 0.2)');
  cool.addColorStop(1, 'rgba(28, 30, 54, 0)');
  c.fillStyle = cool;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // Night at the four corners of the cloth.
  for (const [cx, cy] of [
    [SCREEN.x - 40, SCREEN.y - 40],
    [SCREEN.x + SCREEN.w + 40, SCREEN.y - 40],
    [SCREEN.x - 40, SCREEN.y + SCREEN.h + 40],
    [SCREEN.x + SCREEN.w + 40, SCREEN.y + SCREEN.h + 40],
  ]) {
    const cg = c.createRadialGradient(cx, cy, 30, cx, cy, 700);
    cg.addColorStop(0, 'rgba(14, 15, 28, 0.62)');
    cg.addColorStop(0.5, 'rgba(16, 17, 32, 0.24)');
    cg.addColorStop(1, 'rgba(16, 17, 32, 0)');
    c.fillStyle = cg;
    c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  }

  // Cloth weave: warp and weft, plus slubs.
  c.save();
  c.strokeStyle = 'rgba(74, 44, 26, 0.07)';
  c.lineWidth = 1.1;
  for (let y = SCREEN.y; y < SCREEN.y + SCREEN.h; y += 4.2) {
    c.beginPath();
    c.moveTo(SCREEN.x, y);
    c.lineTo(SCREEN.x + SCREEN.w, y);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255, 238, 200, 0.055)';
  for (let x = SCREEN.x; x < SCREEN.x + SCREEN.w; x += 5.1) {
    c.beginPath();
    c.moveTo(x, SCREEN.y);
    c.lineTo(x, SCREEN.y + SCREEN.h);
    c.stroke();
  }

  const rand = rngFor('s10-cloth');
  for (let i = 0; i < 420; i += 1) {
    const x = SCREEN.x + rand() * SCREEN.w;
    const y = SCREEN.y + rand() * SCREEN.h;
    const w = 5 + rand() * 34;
    const h = 1 + rand() * 2.2;
    c.fillStyle = rand() > 0.5
      ? `rgba(255, 240, 206, ${0.02 + rand() * 0.03})`
      : `rgba(60, 34, 22, ${0.02 + rand() * 0.035})`;
    c.beginPath();
    c.ellipse(x, y, w, h, rand() * 0.3, 0, TAU);
    c.fill();
  }
  c.restore();

  // Old folds and lamp smoke: wide, soft, low contrast.
  const creases = [
    { x: 90, w: 54, a: 0.05 },
    { x: 856, w: 80, a: 0.06 },
    { x: 1210, w: 46, a: 0.05 },
    { x: 430, w: 26, a: 0.035 },
  ];
  for (const f of creases) {
    const gr = c.createLinearGradient(f.x - f.w, 0, f.x + f.w, 0);
    gr.addColorStop(0, 'rgba(48, 30, 30, 0)');
    gr.addColorStop(0.5, `rgba(44, 28, 30, ${f.a})`);
    gr.addColorStop(1, 'rgba(48, 30, 30, 0)');
    c.fillStyle = gr;
    c.fillRect(f.x - f.w, SCREEN.y, f.w * 2, SCREEN.h);
  }

  const smoke = c.createRadialGradient(250, 40, 20, 250, 60, 420);
  smoke.addColorStop(0, 'rgba(40, 24, 18, 0.18)');
  smoke.addColorStop(0.55, 'rgba(40, 24, 18, 0.07)');
  smoke.addColorStop(1, 'rgba(40, 24, 18, 0)');
  c.fillStyle = smoke;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // Fine cracks in the cloth, one brighter fold near the lower edge.
  c.strokeStyle = 'rgba(56, 34, 26, 0.16)';
  c.lineWidth = 1.1;
  for (let i = 0; i < 7; i += 1) {
    const x0 = SCREEN.x + 120 + rand() * 1250;
    const y0 = SCREEN.y + 90 + rand() * 620;
    c.beginPath();
    c.moveTo(x0, y0);
    c.bezierCurveTo(
      x0 + 22 + rand() * 30, y0 + 16,
      x0 + 8 + rand() * 40, y0 + 44,
      x0 + 34 + rand() * 40, y0 + 70 + rand() * 30,
    );
    c.stroke();
  }

  // Inner shadow around the cloth edge (the frame blocks the lamp).
  const edgeDark = c.createLinearGradient(0, SCREEN.y, 0, SCREEN.y + 150);
  edgeDark.addColorStop(0, 'rgba(12, 11, 18, 0.5)');
  edgeDark.addColorStop(1, 'rgba(12, 11, 18, 0)');
  c.fillStyle = edgeDark;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, 150);
  const edgeL = c.createLinearGradient(SCREEN.x, 0, SCREEN.x + 160, 0);
  edgeL.addColorStop(0, 'rgba(12, 11, 18, 0.42)');
  edgeL.addColorStop(1, 'rgba(12, 11, 18, 0)');
  c.fillStyle = edgeL;
  c.fillRect(SCREEN.x, SCREEN.y, 160, SCREEN.h);

  c.restore();
}

function softenGroundEdge(g) {
  const c = g.drawingContext;
  const gr = c.createLinearGradient(0, 700, 0, 790);
  gr.addColorStop(0, 'rgba(38, 32, 40, 0)');
  gr.addColorStop(1, 'rgba(28, 25, 36, 0.35)');
  c.fillStyle = gr;
  c.fillRect(SCREEN.x, 700, SCREEN.w, 90);
}

function drawGroundTufts(g, ctx) {
  const c = g.drawingContext;
  const scroll = (ctx.t * TAU * 50) % 170;
  c.save();
  c.lineCap = 'round';
  for (let i = 0; i < 12; i += 1) {
    const x = -430 + i * 170 - scroll;
    const y = 856 + (i % 3) * 26;
    const h = 12 + (i % 4) * 5;
    c.strokeStyle = 'rgba(12, 10, 16, 0.72)';
    c.lineWidth = 2.4;
    for (let k = -1; k <= 1; k += 1) {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + k * 6, y - h * 0.6, x + k * 10, y - h);
      c.stroke();
    }
    c.strokeStyle = 'rgba(224, 176, 90, 0.22)';
    c.lineWidth = 0.9;
    for (let k = -1; k <= 1; k += 1) {
      c.beginPath();
      c.moveTo(x - 0.6, y);
      c.quadraticCurveTo(x + k * 6 - 0.6, y - h * 0.6, x + k * 10 - 0.6, y - h);
      c.stroke();
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- border

function drawBorder(pg, c) {
  // Transparent outside the ring, so the screen cache shows through.
  c.beginPath();
  c.rect(OUTER.x, OUTER.y, OUTER.w, OUTER.h);
  c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  c.fillStyle = '#15141f';
  c.fill('evenodd');

  // A warm inner bevel where the lamp grazes the frame.
  c.save();
  clipRing(c);
  const bev = c.createLinearGradient(0, OUTER.y, 0, SCREEN.y);
  bev.addColorStop(0, 'rgba(0,0,0,0.4)');
  bev.addColorStop(1, 'rgba(226, 165, 82, 0.12)');
  c.fillStyle = bev;
  c.fillRect(OUTER.x, OUTER.y, OUTER.w, OUTER.h);
  c.restore();

  // Gold rails.
  c.strokeStyle = alpha(GOLD, 0.92);
  c.lineWidth = 2.6;
  c.strokeRect(OUTER.x + 6, OUTER.y + 6, OUTER.w - 12, OUTER.h - 12);
  c.strokeStyle = alpha(GOLD, 0.78);
  c.lineWidth = 2.2;
  c.strokeRect(SCREEN.x - 7, SCREEN.y - 7, SCREEN.w + 14, SCREEN.h + 14);
  c.strokeStyle = alpha(GOLD, 0.3);
  c.lineWidth = 1;
  c.strokeRect(OUTER.x + 14, OUTER.y + 14, OUTER.w - 28, OUTER.h - 28);

  // Running vine in the top and bottom bands.
  drawVineRow(c, OUTER.x + 34, OUTER.x + OUTER.w - 34, OUTER.y + 21, 1);
  drawVineRow(c, OUTER.x + 34, OUTER.x + OUTER.w - 34, OUTER.y + OUTER.h - 33, -1);

  // Side bands: a vertical chain of leaves and dots.
  drawVineCol(c, OUTER.x + 21, OUTER.y + 64, OUTER.y + OUTER.h - 64, 1);
  drawVineCol(c, OUTER.x + OUTER.w - 21, OUTER.y + 64, OUTER.y + OUTER.h - 64, -1);

  // Pin holes punched through the frame.
  const rand = rngFor('s10-border-holes');
  for (let i = 0; i < 120; i += 1) {
    const side = i % 4;
    let x;
    let y;
    if (side === 0) {
      x = OUTER.x + 46 + rand() * (OUTER.w - 92);
      y = OUTER.y + 38 + rand() * 8;
    } else if (side === 1) {
      x = OUTER.x + 46 + rand() * (OUTER.w - 92);
      y = OUTER.y + OUTER.h - 46 - rand() * 8;
    } else if (side === 2) {
      x = OUTER.x + 38 + rand() * 8;
      y = OUTER.y + 60 + rand() * (OUTER.h - 120);
    } else {
      x = OUTER.x + OUTER.w - 46 - rand() * 8;
      y = OUTER.y + 60 + rand() * (OUTER.h - 120);
    }
    c.fillStyle = alpha(HOLE, 0.35 + rand() * 0.3);
    c.beginPath();
    c.arc(x, y, 0.9 + rand() * 0.8, 0, TAU);
    c.fill();
  }

  // Corner blocks.
  cornerBlock(c, OUTER.x + 6, OUTER.y + 6, 1, 1);
  cornerBlock(c, OUTER.x + OUTER.w - 6, OUTER.y + 6, -1, 1);
  cornerBlock(c, OUTER.x + 6, OUTER.y + OUTER.h - 6, 1, -1);
  cornerBlock(c, OUTER.x + OUTER.w - 6, OUTER.y + OUTER.h - 6, -1, -1);
}

function clipRing(c) {
  c.beginPath();
  c.rect(OUTER.x, OUTER.y, OUTER.w, OUTER.h);
  c.rect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  c.clip('evenodd');
}

function drawVineRow(c, x0, x1, y, dir) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = alpha(GOLD, 0.78);
  c.lineWidth = 1.4;
  for (let x = x0; x < x1 - 46; x += 52) {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 13, y - 7 * dir, x + 26, y + 7 * dir, x + 39, y);
    c.stroke();
    c.beginPath();
    c.arc(x + 6, y + 5 * dir, 3.1, 0.3, Math.PI * 1.55);
    c.stroke();
    c.beginPath();
    c.arc(x + 33, y + 3 * dir, 2.4, Math.PI * 0.2, Math.PI * 1.9);
    c.stroke();
    pin(c, x + 46, y, 1.7, { pin: GOLD, pinA: 0.85 });
  }
  // Tumpal teeth at the inner edge.
  c.fillStyle = alpha(GOLD, 0.32);
  const teeth = dir > 0 ? SCREEN.y - 15 : SCREEN.y + SCREEN.h + 15;
  for (let x = x0 + 12; x < x1 - 12; x += 40) {
    c.beginPath();
    c.moveTo(x, teeth + 9 * dir);
    c.lineTo(x + 11, teeth - 3 * dir);
    c.lineTo(x + 22, teeth + 9 * dir);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawVineCol(c, x, y0, y1, dir) {
  c.save();
  c.strokeStyle = alpha(GOLD, 0.62);
  c.lineWidth = 1.3;
  for (let y = y0; y < y1 - 52; y += 58) {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x - 7 * dir, y + 14, x + 7 * dir, y + 30, x, y + 44);
    c.stroke();
    c.beginPath();
    c.arc(x - 4 * dir, y + 12, 3, 0.4, Math.PI * 1.65);
    c.stroke();
    pin(c, x, y + 48, 1.5, { pin: GOLD, pinA: 0.8 });
  }
  c.restore();
}

function cornerBlock(c, x, y, sx, sy) {
  c.save();
  c.translate(x, y);
  c.scale(sx, sy);
  c.fillStyle = alpha(GOLD, 0.18);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(62, 0);
  c.lineTo(62, 12);
  c.lineTo(14, 12);
  c.lineTo(12, 62);
  c.lineTo(0, 62);
  c.closePath();
  c.fill();
  c.strokeStyle = alpha(GOLD, 0.8);
  c.lineWidth = 1.6;
  c.stroke();
  // Diamond and four petals.
  c.beginPath();
  c.moveTo(24, 24);
  c.lineTo(36, 30);
  c.lineTo(24, 36);
  c.lineTo(12, 30);
  c.closePath();
  c.fillStyle = alpha(GOLD, 0.5);
  c.fill();
  c.strokeStyle = alpha(GOLD, 0.9);
  c.lineWidth = 1.2;
  c.stroke();
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + Math.PI / 4;
    c.beginPath();
    c.moveTo(24 + Math.cos(a) * 8, 30 + Math.sin(a) * 8);
    c.quadraticCurveTo(
      24 + Math.cos(a) * 17, 30 + Math.sin(a) * 17,
      24 + Math.cos(a) * 25, 30 + Math.sin(a) * 25,
    );
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- plants

function drawReeds(g, x, s, flip) {
  const c = g.drawingContext;
  c.save();
  c.translate(x, 844);
  c.scale(flip ? -s : s, s);
  const stalks = [
    { lean: 0.18, h: 196, w: 4.4 },
    { lean: 0.34, h: 152, w: 3.6 },
    { lean: 0.06, h: 124, w: 3.4 },
    { lean: 0.48, h: 176, w: 3.0 },
  ];
  for (let i = 0; i < stalks.length; i += 1) {
    const st = stalks[i];
    const top = { x: st.lean * 120, y: -st.h };
    tube(c, [{ x: 0, y: 0 }, { x: st.lean * 70, y: -st.h * 0.55 }, top], st.w, TONE);
    // Leaves: pointed blades alternating up the stalk.
    for (let k = 0; k < 3; k += 1) {
      const yy = -st.h * (0.32 + k * 0.2);
      const xx = st.lean * (yy * -0.35);
      const dir = k % 2 === 0 ? 1 : -1;
      c.beginPath();
      c.moveTo(xx, yy);
      c.quadraticCurveTo(
        xx + 34 * dir, yy - 12,
        xx + 24 * dir, yy - 34,
      );
      c.quadraticCurveTo(xx + 12 * dir, yy - 16, xx, yy);
      c.fillStyle = TONE.fill;
      c.fill();
      c.strokeStyle = alpha(TONE.edge, 0.85);
      c.lineWidth = 1.2;
      c.stroke();
      pin(c, xx + 11 * dir, yy - 12, 1.1, TONE, 0.8);
    }
    // Seed head.
    for (let k = 0; k < 5; k += 1) {
      pin(c, top.x + (k - 2) * 2.6, top.y - 4 - (k % 2) * 3, 1.3, TONE, 0.9);
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawRiderPuppet(g, pose, opts) {
  const c = g.drawingContext;
  const { x, y, scale, tone } = opts;
  const nudge = opts.nudge || 0;
  const far = tone === SHADOW ? tone : FAR;

  c.save();
  c.globalAlpha = (opts.alpha ?? 1);
  c.translate(x, y);
  c.scale(scale, scale);

  // The rod's jab tips the whole puppet, then it recovers.
  c.translate(pose.hip.x, pose.hip.y);
  c.rotate(0.05 * nudge);
  c.translate(-pose.hip.x + 5 * nudge, -pose.hip.y);

  drawPuppetWheel(c, pose.wheels.rear, pose.wheelAngle, tone);
  drawPuppetWheel(c, pose.wheels.front, pose.wheelAngle, tone);

  // Far leg, dimmer, behind the frame.
  drawPuppetLeg(c, pose.hip, pose.legs.far, far, false);
  drawPuppetFoot(c, pose.pedals.far, far, false);

  drawPuppetFrame(c, pose, tone);
  drawPuppetCrank(c, pose, tone);

  // Tail fan behind the body.
  drawPuppetTail(c, pose, tone, nudge);
  drawPuppetBody(c, tone);
  drawPuppetWing(c, tone);
  drawPuppetLeg(c, pose.hip, pose.legs.near, tone, true);
  drawPuppetFoot(c, pose.pedals.near, tone, true);
  drawPuppetNeck(c, pose, tone);
  drawPuppetHead(c, pose, tone, nudge);
  drawPuppetBeak(c, pose, tone);
  drawPuppetRumpClamp(c, tone, nudge);

  // Articulation pins: this is a jointed object, not a drawing.
  pin(c, pose.hip.x, pose.hip.y, 2.4, tone);
  pin(c, pose.shoulder.x, pose.shoulder.y, 2.2, tone);
  pin(c, pose.wheels.rear.x, pose.wheels.rear.y, 2.4, tone);
  pin(c, pose.wheels.front.x, pose.wheels.front.y, 2.4, tone);

  c.restore();
}

function drawPuppetWheel(c, wheel, angle, tone) {
  const R = wheel.r;
  c.save();
  c.translate(wheel.x, wheel.y);

  if (tone.halo) {
    c.strokeStyle = tone.halo;
    c.lineWidth = 13;
    c.beginPath();
    c.arc(0, 0, R - 2, 0, TAU);
    c.stroke();
  }

  // Felloe: a dark ring with gold cut edges.
  c.strokeStyle = tone.fill;
  c.lineWidth = 7.4;
  c.beginPath();
  c.arc(0, 0, R - 3.4, 0, TAU);
  c.stroke();
  ring(c, 0, 0, R - 0.4, alpha(tone.edge, tone.edgeA), 1.5);
  ring(c, 0, 0, R - 6.4, alpha(tone.edge, tone.edgeA * 0.8), 1.1);

  // Spokes are cut slots of leather; the lamp shows between them.
  c.strokeStyle = tone.fill;
  c.lineWidth = 2.6;
  c.lineCap = 'round';
  for (let i = 0; i < 10; i += 1) {
    const a = angle + (i / 10) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
    c.lineTo(Math.cos(a) * (R - 7), Math.sin(a) * (R - 7));
    c.stroke();
  }
  c.strokeStyle = alpha(tone.detail || tone.edge, 0.5);
  c.lineWidth = 0.9;
  for (let i = 0; i < 10; i += 1) {
    const a = angle + (i / 10) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    c.lineTo(Math.cos(a) * (R - 8), Math.sin(a) * (R - 8));
    c.stroke();
  }

  // Pin holes in the felloe, one between each pair of spokes.
  for (let i = 0; i < 10; i += 1) {
    const a = angle + ((i + 0.5) / 10) * TAU;
    pin(c, Math.cos(a) * (R - 11.5), Math.sin(a) * (R - 11.5), 1.15, tone, 0.95);
  }

  // Hub with a cut star.
  c.fillStyle = tone.fill;
  c.beginPath();
  c.arc(0, 0, 5.4, 0, TAU);
  c.fill();
  ring(c, 0, 0, 5.4, alpha(tone.edge, tone.edgeA), 1.3);
  pin(c, 0, 0, 1.7, tone);
  c.restore();
}

function drawPuppetFrame(c, pose, tone) {
  const f = pose.frame;
  const joint = f.seatCluster;
  tube(c, [f.rearHub, joint], 4.6, tone);
  tube(c, [joint, f.crank], 4.4, tone);
  tube(c, [f.rearHub, f.crank], 3.8, tone);
  tube(c, [joint, f.saddle], 4.2, tone);
  tube(c, [joint, f.headTube], 4.8, tone);
  tube(c, [f.headTube, f.crank], 5.0, tone);
  tube(c, [f.headTube, f.frontHub], 4.2, tone);
  tube(c, [f.headTop, f.stemTop, { x: 74, y: -146 }, f.grip], 4.0, tone);
  tube(c, [f.stemTop, { x: 64, y: -150 }], 2.6, tone);

  // Saddle plate.
  smoothClosedPath(c, [
    { x: f.saddle.x - 13, y: f.saddle.y - 2 },
    { x: f.saddle.x - 4, y: f.saddle.y - 6 },
    { x: f.saddle.x + 12, y: f.saddle.y - 3 },
    { x: f.saddle.x + 9, y: f.saddle.y + 4 },
    { x: f.saddle.x - 9, y: f.saddle.y + 5 },
  ]);
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
  c.lineWidth = 1.3;
  c.stroke();

  // Chain line from the crank to the rear hub.
  c.strokeStyle = alpha(tone.detail || tone.edge, 0.55);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(f.rearHub.x, f.rearHub.y - 6);
  c.lineTo(f.crank.x, f.crank.y - 12);
  c.moveTo(f.rearHub.x, f.rearHub.y + 6);
  c.lineTo(f.crank.x, f.crank.y + 10);
  c.stroke();

  // A carved scroll in the frame triangle.
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.5);
  c.lineWidth = 1.1;
  c.beginPath();
  c.arc(-14, -98, 7, 0.4, Math.PI * 1.5);
  c.stroke();
  pin(c, -8, -104, 1.2, tone, 0.8);
}

function drawPuppetCrank(c, pose, tone) {
  const cc = pose.crankCenter;
  c.save();
  c.translate(cc.x, cc.y);
  c.strokeStyle = tone.fill;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, 12.6, 0, TAU);
  c.stroke();
  ring(c, 0, 0, 12.6, alpha(tone.edge, tone.edgeA * 0.85), 1.2);
  // Chainring cut-outs.
  for (let i = 0; i < 8; i += 1) {
    const a = pose.crank + (i / 8) * TAU;
    pin(c, Math.cos(a) * 7.6, Math.sin(a) * 7.6, 1.25, tone, 0.9);
  }
  pin(c, 0, 0, 2, tone);
  c.restore();
}

function drawPuppetLeg(c, hip, leg, tone, near) {
  const knee = leg.knee;
  const ankle = leg.ankle;
  tube(c, [hip, knee, ankle], near ? 4.8 : 4.4, tone, { halo: false });

  // Knee pin and shank cut-outs.
  ring(c, knee.x, knee.y, 4.2, alpha(tone.edge, tone.edgeA * 0.9), 1.2);
  pin(c, knee.x, knee.y, 1.5, tone);
  const mx = (knee.x + ankle.x) / 2;
  const my = (knee.y + ankle.y) / 2;
  slit(c, mx, my - 1, 7, Math.atan2(ankle.y - knee.y, ankle.x - knee.x) + Math.PI / 2, tone, 1.1);

  // Thigh perforations.
  const tx = (hip.x + knee.x) / 2;
  const ty = (hip.y + knee.y) / 2;
  for (let i = -1; i <= 1; i += 1) {
    pin(c, tx + i * 3.6, ty + i * 2.4, 1.15, tone, 0.85);
  }
}

function drawPuppetFoot(c, pedal, tone, near) {
  c.save();
  c.translate(pedal.x, pedal.y);
  c.beginPath();
  c.moveTo(-8, -2);
  c.lineTo(9, -4);
  c.lineTo(11, 2);
  c.lineTo(-6, 4);
  c.closePath();
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * (near ? 0.9 : 0.5));
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
}

function drawPuppetBody(c, tone) {
  const body = [
    { x: -66, y: -150 },
    { x: -58, y: -186 },
    { x: -30, y: -202 },
    { x: 8, y: -208 },
    { x: 44, y: -198 },
    { x: 62, y: -180 },
    { x: 60, y: -158 },
    { x: 46, y: -140 },
    { x: 18, y: -132 },
    { x: -24, y: -132 },
    { x: -56, y: -140 },
  ];
  plate(c, body, tone);

  // Breast line: the bird's chest plates over the ribcage.
  c.strokeStyle = alpha(tone.detail || tone.edge, 0.55);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(52, -192);
  c.quadraticCurveTo(63, -168, 50, -143);
  c.stroke();

  // Inner translucency: the leather is thin where it is carved.
  if (tone.halo) {
    const gr = c.createRadialGradient(6, -170, 8, 6, -170, 70);
    gr.addColorStop(0, 'rgba(206, 130, 56, 0.38)');
    gr.addColorStop(0.55, 'rgba(196, 120, 50, 0.16)');
    gr.addColorStop(1, 'rgba(196, 120, 50, 0)');
    smoothClosedPath(c, body);
    c.fillStyle = gr;
    c.fill();
  }

  // Breast row and belly perforations: sparse, so the plate stays a plate.
  for (let i = 0; i < 3; i += 1) {
    const a = -0.4 + i * 0.34;
    pin(c, 51 + Math.cos(a) * 5, -170 + Math.sin(a) * 22, 1.1, tone, 0.8);
  }
  for (let i = 0; i < 3; i += 1) {
    pin(c, -26 + i * 15, -138 + Math.sin(i * 1.7) * 2.5, 1.0, tone, 0.6);
  }

  // Breast carving: three nested arcs and a scroll, cut with a fine blade.
  c.strokeStyle = alpha(tone.detail || tone.edge, 0.45);
  c.lineWidth = 1.1;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.arc(30, -166 - i * 6, 12 + i * 3, 0.15, 1.15);
    c.stroke();
  }
  c.beginPath();
  c.arc(-40, -150, 6.2, 0.3, Math.PI * 1.7);
  c.stroke();
  for (let i = 0; i < 3; i += 1) {
    pin(c, -38 + i * 20, -132, 1.0, tone, 0.55);
  }
}

function drawPuppetWing(c, tone) {
  // Primaries first: three long blades sweeping back over the tail.
  const primaries = [
    { bx: -22, by: -180, tx: -74, ty: -199, w: 9 },
    { bx: -26, by: -172, tx: -82, ty: -182, w: 9.5 },
    { bx: -28, by: -163, tx: -76, ty: -166, w: 8.5 },
  ];
  for (let i = 0; i < primaries.length; i += 1) {
    const p = primaries[i];
    const dx = p.tx - p.bx;
    const dy = p.ty - p.by;
    const nx = (-dy / Math.hypot(dx, dy)) * p.w;
    const ny = (dx / Math.hypot(dx, dy)) * p.w;
    c.beginPath();
    c.moveTo(p.bx + nx, p.by + ny);
    c.quadraticCurveTo((p.bx + p.tx) / 2 + nx * 1.5, (p.by + p.ty) / 2 + ny * 1.5, p.tx, p.ty);
    c.quadraticCurveTo((p.bx + p.tx) / 2 - nx * 0.6, (p.by + p.ty) / 2 - ny * 0.6, p.bx - nx, p.by - ny);
    c.closePath();
    c.fillStyle = tone === SHADOW ? tone.fill : '#2b1c15';
    c.fill();
    c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.85);
    c.lineWidth = 1.4;
    c.stroke();
    pin(c, p.tx + 4, p.ty + 2, 1.1, tone, 0.8);
  }

  // Coverts plate over the base of the primaries.
  const wing = [
    { x: -38, y: -187 },
    { x: -12, y: -196 },
    { x: 14, y: -190 },
    { x: 26, y: -176 },
    { x: 18, y: -163 },
    { x: -6, y: -157 },
    { x: -28, y: -160 },
    { x: -40, y: -172 },
  ];
  // The wing is a separate plate laid over the body: a hard under-shadow.
  smoothClosedPath(c, wing);
  c.save();
  c.translate(3, 5);
  c.fillStyle = 'rgba(12, 8, 10, 0.5)';
  c.fill();
  c.restore();
  smoothClosedPath(c, wing);
  c.fillStyle = tone === SHADOW ? tone.fill : '#573b27';
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 2.1;
  c.stroke();

  // Three quiet feather veins across the coverts.
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(10, -182 + i * 4);
    c.quadraticCurveTo(-12, -176 + i * 6, -34, -172 + i * 5);
    c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.4);
    c.lineWidth = 1.1;
    c.stroke();
  }

  // Two short rows of punch holes along the leading edge.
  for (let r = 0; r < 2; r += 1) {
    for (let i = 0; i < 4; i += 1) {
      pin(c, -12 + i * 9 + r * 3, -190 + r * 6, 1.1, tone, 0.9);
    }
  }

  // Scroll at the shoulder.
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.7);
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(2, -175, 6.6, 0.4, Math.PI * 1.72);
  c.stroke();
  c.beginPath();
  c.arc(2, -175, 2.8, 0.4, Math.PI * 1.9);
  c.stroke();

  // Wing shoulder joint.
  ring(c, 18, -181, 4, alpha(tone.edge, tone.edgeA * 0.8), 1.1);
  pin(c, 18, -181, 1.3, tone);

  // Notched trailing edge: three cut-out curls.
  for (let i = 0; i < 3; i += 1) {
    const x = 2 + i * 10;
    c.beginPath();
    c.arc(x, -160, 3.4, -0.2, Math.PI * 1.1);
    c.strokeStyle = alpha(tone.pin, 0.8);
    c.lineWidth = 1.3;
    c.stroke();
  }
}

function drawPuppetNeck(c, pose, tone) {
  const pts = pose.neck;
  tube(c, pts, 15, tone);

  // Scale pattern along the neck.
  for (let i = 0; i < 5; i += 1) {
    const t = 0.14 + i * 0.16;
    const idx = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
    const a = pts[idx];
    const b = pts[idx + 1];
    const u = t * (pts.length - 1) - idx;
    const x = a.x + (b.x - a.x) * u;
    const y = a.y + (b.y - a.y) * u;
    const ang = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    for (let k = -1; k <= 1; k += 1) {
      pin(c, x + Math.cos(ang) * k * 3.4, y + Math.sin(ang) * k * 3.4, 1.1, tone, 0.8);
    }
  }
}

function drawPuppetHead(c, pose, tone, nudge) {
  const h = pose.head;
  const hr = 15;
  c.save();
  c.translate(h.x, h.y);
  c.rotate(-0.05 + 0.03 * Math.sin(pose.crank) + 0.06 * nudge);

  // Skull.
  c.beginPath();
  c.arc(0, 0, hr, 0, TAU);
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.6;
  c.stroke();
  if (tone.halo) {
    const gr = c.createRadialGradient(-2, 3, 2, -2, 3, 16);
    gr.addColorStop(0, 'rgba(210, 140, 60, 0.3)');
    gr.addColorStop(1, 'rgba(210, 140, 60, 0)');
    c.beginPath();
    c.arc(0, 0, hr, 0, TAU);
    c.fillStyle = gr;
    c.fill();
  }

  // Crest: two carved quills swept back.
  for (let i = 0; i < 2; i += 1) {
    const a = -2.45 + i * 0.42;
    c.beginPath();
    c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
    c.quadraticCurveTo(
      Math.cos(a) * 22, Math.sin(a) * 22 - 6,
      Math.cos(a) * 30, Math.sin(a) * 30 + 2,
    );
    c.strokeStyle = tone.fill;
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.stroke();
    c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
    c.lineWidth = 1.3;
    c.stroke();
  }

  // Eye: a punched hole with a dark bead, plus a carved brow.
  pin(c, 5, -3, 4.2, tone);
  c.fillStyle = tone.dark;
  c.beginPath();
  c.arc(6, -3, 1.8, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.85);
  c.lineWidth = 1.3;
  c.beginPath();
  c.arc(5, -3, 5.6, -2.5, -0.5);
  c.stroke();

  // Cheek perforations.
  pin(c, -2, 6, 1.2, tone, 0.8);
  pin(c, -6, 2, 1.0, tone, 0.7);
  c.restore();
}

function drawPuppetBeak(c, pose, tone) {
  const h = pose.head;
  const bx = h.x + 8;
  const by = h.y + 1;

  // Pouch first, hanging under the mandible: long, sagging, not a bowl.
  smoothClosedPath(c, [
    { x: bx + 2, y: by + 5 },
    { x: bx + 40, y: by + 9 },
    { x: bx + 74, y: by + 10 },
    { x: bx + 98, y: by + 15 },
    { x: bx + 92, y: by + 32 },
    { x: bx + 68, y: by + 50 },
    { x: bx + 40, y: by + 46 },
    { x: bx + 16, y: by + 28 },
    { x: bx + 4, y: by + 16 },
  ]);
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.4;
  c.stroke();
  if (tone.halo) {
    const gr = c.createLinearGradient(bx, by + 8, bx + 70, by + 46);
    gr.addColorStop(0, 'rgba(214, 140, 58, 0.34)');
    gr.addColorStop(1, 'rgba(214, 140, 58, 0.05)');
    smoothClosedPath(c, [
      { x: bx + 2, y: by + 5 },
      { x: bx + 40, y: by + 9 },
      { x: bx + 74, y: by + 10 },
      { x: bx + 98, y: by + 15 },
      { x: bx + 92, y: by + 32 },
      { x: bx + 68, y: by + 50 },
      { x: bx + 40, y: by + 46 },
      { x: bx + 16, y: by + 28 },
      { x: bx + 4, y: by + 16 },
    ]);
    c.fillStyle = gr;
    c.fill();
  }

  // Pouch lattice: punched slits following the sag.
  for (let r = 0; r < 3; r += 1) {
    for (let i = 0; i < 4 - r; i += 1) {
      const px = bx + 24 + i * 17 + r * 6;
      const py = by + 19 + r * 8 + (px - bx) * 0.06;
      slit(c, px, py, 5.4, 0.3, tone, 1.1);
    }
  }

  // Upper mandible: a long, thick blade with a hooked nail.
  smoothClosedPath(c, [
    { x: bx - 4, y: by - 11 },
    { x: bx + 36, y: by - 11 },
    { x: bx + 76, y: by - 4 },
    { x: bx + 100, y: by + 5 },
    { x: bx + 106, y: by + 22 },
    { x: bx + 99, y: by + 24 },
    { x: bx + 94, y: by + 12 },
    { x: bx + 70, y: by + 4 },
    { x: bx + 34, y: by + 1 },
    { x: bx + 2, y: by + 3 },
  ]);
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.6;
  c.stroke();

  // The mandible seam and the nail.
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.8);
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(bx + 6, by - 3);
  c.quadraticCurveTo(bx + 50, by - 2, bx + 96, by + 6);
  c.stroke();
  pin(c, bx + 99, by + 8, 2.4, tone);
  pin(c, bx + 24, by - 5, 1.2, tone, 0.85);
  pin(c, bx + 58, by - 3, 1.0, tone, 0.8);
  pin(c, bx + 84, by + 1, 1.0, tone, 0.75);

  // Mandible notch at the base.
  slit(c, bx + 10, by + 1, 8, -0.4, tone, 1.3);
}

function drawPuppetTail(c, pose, tone, nudge) {
  const tail = pose.tail;
  const base = { x: tail.x, y: tail.y };
  for (let i = 0; i < 3; i += 1) {
    const a = Math.PI + 0.28 + i * 0.22 + 0.18 * nudge;
    const len = 28 + i * 4;
    const tip = {
      x: base.x + Math.cos(a) * len,
      y: base.y + Math.sin(a) * len - 4,
    };
    const nx = Math.cos(a + Math.PI / 2) * 7.5;
    const ny = Math.sin(a + Math.PI / 2) * 7.5;
    c.beginPath();
    c.moveTo(base.x + nx, base.y + ny);
    c.quadraticCurveTo(
      base.x + Math.cos(a) * len * 0.6 + nx * 1.4,
      base.y + Math.sin(a) * len * 0.6 + ny * 1.4,
      tip.x, tip.y,
    );
    c.quadraticCurveTo(
      base.x + Math.cos(a) * len * 0.6 - nx,
      base.y + Math.sin(a) * len * 0.6 - ny,
      base.x - nx, base.y - ny,
    );
    c.closePath();
    c.fillStyle = tone.fill;
    c.fill();
    c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
    c.lineWidth = 1.3;
    c.stroke();
    slit(c, base.x + Math.cos(a) * 18, base.y + Math.sin(a) * 18, 6, a + 0.3, tone, 1.0);
  }
  pin(c, base.x - 56, base.y - 4, 1.4, tone, 0.9);
}

function drawPuppetRumpClamp(c, tone, nudge) {
  // The carved socket where the main rod enters the puppet.
  c.save();
  c.translate(-50, -168 + nudge * 2);
  c.rotate(-0.32);
  c.fillStyle = tone.dark;
  c.fillRect(-7, -5, 14, 10);
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.95);
  c.lineWidth = 1.3;
  c.strokeRect(-7, -5, 14, 10);
  pin(c, 0, 0, 2, tone);
  c.restore();
}

// ---------------------------------------------------------------- cow

function drawCow(g, qLocal, opts) {
  const c = g.drawingContext;
  const { x, y, scale, tone } = opts;
  const a = opts.alpha;
  const bobA = Math.sin(TAU * qLocal * 0.42) * 0.07;
  const flick = Math.sin(TAU * qLocal * 0.5 + 1.2);
  const farFill = tone === SHADOW ? tone.fill : '#1b120f';

  c.save();
  c.globalAlpha = a;
  c.translate(x, y);
  c.scale(scale, scale);

  // Legs: four short columns, the far pair sunk into the dark.
  const legs = [
    { x: -46, far: true },
    { x: -28, far: false },
    { x: 32, far: false },
    { x: 48, far: true },
  ];
  for (const L of legs) {
    const fill = L.far ? farFill : tone.fill;
    const edge = L.far ? alpha(tone.edge, tone.edgeA * 0.4) : alpha(tone.edge, tone.edgeA * 0.9);
    c.lineCap = 'butt';
    c.strokeStyle = fill;
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(L.x, -74);
    c.lineTo(L.x + (L.far ? -3 : 2), -36);
    c.lineTo(L.x + (L.far ? -1 : 2), -5);
    c.stroke();
    c.strokeStyle = edge;
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(L.x - 5, -71);
    c.lineTo(L.x - 5 + (L.far ? -3 : 2), -36);
    c.lineTo(L.x - 5 + (L.far ? -1 : 2), -6);
    c.stroke();
    pin(c, L.x + (L.far ? -3 : 2), -38, 0.9, tone, L.far ? 0.4 : 0.8);
    // Hoof.
    c.fillStyle = tone.dark;
    c.fillRect(L.x - 6 + (L.far ? -1 : 2), -6, 12, 6);
    c.strokeStyle = edge;
    c.lineWidth = 0.9;
    c.strokeRect(L.x - 6 + (L.far ? -1 : 2), -6, 12, 6);
  }

  // Tail with a tuft; it flicks on the half-second.
  c.save();
  c.translate(-62, -124);
  c.rotate(0.12 + flick * 0.12);
  c.strokeStyle = tone.fill;
  c.lineWidth = 4.6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(-10, 24, -8, 44);
  c.stroke();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.7);
  c.lineWidth = 1.1;
  c.stroke();
  for (let i = 0; i < 3; i += 1) {
    pin(c, -9 + i * 2.2, 46 + i * 2.4, 1.6, tone, 0.9);
  }
  c.restore();

  // Barrel body with a hump.
  smoothClosedPath(c, [
    { x: -64, y: -96 },
    { x: -60, y: -128 },
    { x: -38, y: -146 },
    { x: -12, y: -151 },
    { x: 18, y: -146 },
    { x: 48, y: -134 },
    { x: 62, y: -112 },
    { x: 56, y: -86 },
    { x: 32, y: -72 },
    { x: -8, y: -66 },
    { x: -42, y: -72 },
    { x: -62, y: -82 },
  ]);
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.6;
  c.stroke();

  // Hump plate.
  smoothClosedPath(c, [
    { x: -40, y: -140 },
    { x: -22, y: -158 },
    { x: 0, y: -156 },
    { x: 10, y: -142 },
  ]);
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
  c.lineWidth = 1.1;
  c.stroke();

  // Rib slots and spine punch holes.
  for (let i = 0; i < 5; i += 1) {
    slit(c, -34 + i * 16, -96, 9, 1.38, tone, 1.25);
  }
  for (let i = 0; i < 7; i += 1) {
    pin(c, -48 + i * 15, -136 + Math.sin(i * 0.9) * 2.6, 1.1, tone, 0.85);
  }
  // Shoulder scroll.
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.6);
  c.lineWidth = 1.1;
  c.beginPath();
  c.arc(28, -110, 9, 0.5, Math.PI * 1.6);
  c.stroke();

  // Head group, nodding.
  c.save();
  c.translate(54, -138);
  c.rotate(bobA);
  c.translate(-54, 138);

  // Neck and dewlap.
  tube(c, [{ x: 44, y: -132 }, { x: 62, y: -140 }], 19, tone);
  smoothClosedPath(c, [
    { x: 52, y: -122 },
    { x: 68, y: -126 },
    { x: 72, y: -108 },
    { x: 60, y: -104 },
    { x: 50, y: -112 },
  ]);
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
  c.lineWidth = 1.2;
  c.stroke();

  // Skull.
  smoothClosedPath(c, [
    { x: 54, y: -158 },
    { x: 76, y: -164 },
    { x: 92, y: -152 },
    { x: 94, y: -134 },
    { x: 84, y: -122 },
    { x: 66, y: -124 },
    { x: 54, y: -138 },
  ]);
  c.fillStyle = tone.fill;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.5;
  c.stroke();

  // Muzzle.
  smoothClosedPath(c, [
    { x: 84, y: -136 },
    { x: 104, y: -132 },
    { x: 106, y: -118 },
    { x: 90, y: -114 },
    { x: 82, y: -122 },
  ]);
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.85);
  c.lineWidth = 1.2;
  c.stroke();
  pin(c, 96, -126, 1.2, tone, 0.9);
  pin(c, 101, -124, 1.0, tone, 0.8);

  // Horns: two cut crescents sweeping up and back.
  for (let s = 0; s < 2; s += 1) {
    const bx = 66 + s * 10;
    const by = -158 - s * 2;
    c.beginPath();
    c.moveTo(bx, by);
    c.quadraticCurveTo(bx - 4, by - 26, bx - 22 - s * 6, by - 30);
    c.quadraticCurveTo(bx - 10 - s * 4, by - 16, bx - 4, by + 2);
    c.closePath();
    c.fillStyle = tone.fill;
    c.fill();
    c.strokeStyle = alpha(tone.edge, tone.edgeA * (s ? 0.55 : 0.95));
    c.lineWidth = 1.3;
    c.stroke();
  }

  // Ear, eye, cheek hole.
  c.beginPath();
  c.ellipse(70, -148, 11, 5, -0.35, 0, TAU);
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.85);
  c.lineWidth = 1.1;
  c.stroke();
  pin(c, 80, -146, 3.2, tone);
  c.fillStyle = tone.dark;
  c.beginPath();
  c.arc(80.8, -146, 1.3, 0, TAU);
  c.fill();
  pin(c, 68, -132, 1.2, tone, 0.7);
  c.restore();

  // Bell at the throat.
  c.strokeStyle = alpha(tone.edge, tone.edgeA * 0.9);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(52, -116);
  c.quadraticCurveTo(58, -104, 55, -96);
  c.stroke();
  c.beginPath();
  c.moveTo(50, -100);
  c.lineTo(62, -100);
  c.lineTo(59, -88);
  c.lineTo(53, -88);
  c.closePath();
  c.fillStyle = tone.dark;
  c.fill();
  c.strokeStyle = alpha(tone.edge, tone.edgeA);
  c.lineWidth = 1.1;
  c.stroke();
  pin(c, 56, -94, 1, tone, 0.9);

  c.restore();
}

// ---------------------------------------------------------------- rods

function riderPoints() {
  // Attachment points in scene space (the claw sockets on the leather).
  return {
    rump: { x: RIDER_X + -50 * RIDER_S, y: RIDER_Y + -168 * RIDER_S },
    tail: { x: RIDER_X + -66 * RIDER_S, y: RIDER_Y + -188 * RIDER_S },
    bar: { x: RIDER_X + 78 * RIDER_S, y: RIDER_Y + -144 * RIDER_S },
  };
}

function drawRod(c, from, to, w, tone) {
  // The shaft glints on its upper edge.
  c.lineCap = 'round';
  c.strokeStyle = 'rgba(10, 7, 10, 0.92)';
  c.lineWidth = w + 1.6;
  c.beginPath();
  c.moveTo(from.x, from.y);
  c.lineTo(to.x, to.y);
  c.stroke();
  c.strokeStyle = '#2e2119';
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(from.x, from.y);
  c.lineTo(to.x, to.y);
  c.stroke();
  c.strokeStyle = tone;
  c.lineWidth = Math.max(0.9, w * 0.32);
  c.beginPath();
  c.moveTo(from.x - w * 0.22, from.y - w * 0.34);
  c.lineTo(to.x - w * 0.22, to.y - w * 0.34);
  c.stroke();
}

function drawRods(g, nudge) {
  const c = g.drawingContext;
  const P = riderPoints();
  const hand = { x: HAND.x + 26, y: HAND.y + 6 };

  drawRod(c, P.rump, hand, 5.2, 'rgba(224, 176, 90, 0.6)');
  drawRod(c, P.tail, { x: hand.x - 6, y: hand.y + 2 }, 4.0, 'rgba(224, 176, 90, 0.5)');
  drawRod(c, P.bar, { x: hand.x - 16, y: hand.y - 2 }, 3.4, 'rgba(224, 176, 90, 0.45)');

  // The cow's own central rod, plain and vertical.
  drawRod(c, { x: COW_X - 18, y: COW_Y - 104 }, { x: COW_X - 44, y: 1020 }, 3.6, 'rgba(224, 176, 90, 0.42)');

  // Brass ferrule bands near the hand, so the bundle reads as held rods.
  const ang = Math.atan2(hand.y - P.rump.y, hand.x - P.rump.x);
  for (let i = 0; i < 3; i += 1) {
    const t = 0.86 + i * 0.04;
    const px = P.rump.x + (hand.x - P.rump.x) * t;
    const py = P.rump.y + (hand.y - P.rump.y) * t;
    c.strokeStyle = alpha(GOLD, 0.45);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(px - Math.cos(ang + Math.PI / 2) * 4.2, py - Math.sin(ang + Math.PI / 2) * 4.2);
    c.lineTo(px + Math.cos(ang + Math.PI / 2) * 4.2, py + Math.sin(ang + Math.PI / 2) * 4.2);
    c.stroke();
  }

  // The tip of the nudge rod, pressed into the rump socket.
  if (nudge > 0.02) {
    c.strokeStyle = alpha(GOLD, 0.8 * nudge);
    c.lineWidth = 2.2;
    c.beginPath();
    c.arc(P.rump.x, P.rump.y, 7 + 3 * nudge, 0, TAU);
    c.stroke();
  }
}

function drawNudgeSpark(g, nudge) {
  if (nudge <= 0.05) return;
  const c = g.drawingContext;
  // The nudge rod contacts the tail root, at the silhouette edge.
  const P = riderPoints().tail;
  const a = clamp(nudge, 0, 1);
  c.save();
  c.translate(P.x, P.y);
  c.lineCap = 'round';
  // Dark backing so the rays read over leather and screen alike.
  c.strokeStyle = 'rgba(10, 7, 9, 0.55)';
  c.lineWidth = 7;
  for (let i = 0; i < 6; i += 1) {
    const ang = -1.1 + i * 0.48;
    const r0 = 12 + a * 6;
    const r1 = r0 + 18 + 12 * a;
    c.beginPath();
    c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    c.stroke();
  }
  c.strokeStyle = alpha('#fff0c8', 0.8 + 0.2 * a);
  c.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const ang = -1.1 + i * 0.48;
    const r0 = 12 + a * 6;
    const r1 = r0 + 18 + 12 * a;
    c.beginPath();
    c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    c.stroke();
  }
  // A bright contact bead where the rod meets the leather.
  c.fillStyle = alpha('#fff6d8', 0.6 + 0.4 * a);
  c.beginPath();
  c.arc(0, 0, 4, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(GOLD, 0.85);
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(0, 0, 8 + 2 * a, 0, TAU);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- hand

function drawDalangHand(g, ctx, qLocal) {
  const c = g.drawingContext;
  const breath = Math.sin(TAU * qLocal * 0.25) * 1.6;
  c.save();
  c.translate(HAND.x, HAND.y + breath);
  c.scale(1.22, 1.22);
  c.rotate(-0.06);

  // Forearm running off the bottom edge, with a batik cuff ring.
  c.lineCap = 'round';
  c.strokeStyle = '#2a1f1d';
  c.lineWidth = 54;
  c.beginPath();
  c.moveTo(52, 150);
  c.quadraticCurveTo(34, 92, 12, 30);
  c.stroke();
  c.strokeStyle = 'rgba(224, 176, 90, 0.2)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(26, 150);
  c.quadraticCurveTo(9, 92, -13, 34);
  c.stroke();
  // Cuff: two rails and a row of punched diamonds.
  c.save();
  c.translate(22, 84);
  c.rotate(-0.22);
  c.strokeStyle = alpha(GOLD, 0.55);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-28, 0);
  c.lineTo(30, -8);
  c.moveTo(-30, 14);
  c.lineTo(28, 6);
  c.stroke();
  for (let i = 0; i < 5; i += 1) {
    const x = -22 + i * 12;
    const y = 3 - i * 1.4;
    c.beginPath();
    c.moveTo(x, y - 4);
    c.lineTo(x + 4, y);
    c.lineTo(x, y + 4);
    c.lineTo(x - 4, y);
    c.closePath();
    c.fillStyle = alpha(GOLD, 0.35);
    c.fill();
  }
  c.restore();

  // Forearm tapering into the wrist.
  c.lineCap = 'round';
  c.strokeStyle = '#2a1f1d';
  c.lineWidth = 46;
  c.beginPath();
  c.moveTo(46, 150);
  c.quadraticCurveTo(44, 74, 40, 26);
  c.stroke();
  c.strokeStyle = 'rgba(224, 176, 90, 0.28)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(24, 150);
  c.quadraticCurveTo(22, 76, 18, 28);
  c.stroke();

  // The back of the hand: a leather plate angled into the grip.
  const palm = [
    { x: 16, y: -30 },
    { x: 50, y: -24 },
    { x: 64, y: 4 },
    { x: 54, y: 34 },
    { x: 24, y: 44 },
    { x: 0, y: 26 },
    { x: -6, y: 0 },
  ];
  smoothClosedPath(c, palm);
  c.fillStyle = '#33241f';
  c.fill();
  c.strokeStyle = alpha(GOLD, 0.7);
  c.lineWidth = 1.8;
  c.stroke();

  // Knuckle creases.
  c.strokeStyle = alpha(GOLD, 0.32);
  c.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(14, -14 + i * 15);
    c.quadraticCurveTo(30, -12 + i * 15, 46, -10 + i * 15);
    c.stroke();
  }

  // Four fingers curling over the rod bundle; each a gold-edged leather tube.
  const fingers = [
    { y: -16, len: 40, drop: 20, w: 16 },
    { y: 0, len: 44, drop: 22, w: 16.5 },
    { y: 15, len: 40, drop: 20, w: 15.5 },
    { y: 29, len: 33, drop: 16, w: 14 },
  ];
  for (let i = 0; i < fingers.length; i += 1) {
    const f = fingers[i];
    tube(c, [
      { x: 8, y: f.y },
      { x: -16, y: f.y + 4 },
      { x: -30, y: f.y + 10 },
      { x: -f.len, y: f.y + f.drop },
    ], f.w, HAND_TONE);
    pin(c, -f.len + 2, f.y + f.drop, 2.2, HAND_TONE, 0.75);
    ring(c, -f.len + 2, f.y + f.drop, 4.2, alpha(GOLD, 0.38), 1.1);
  }

  // Thumb pressing down on the rod bundle from above.
  tube(c, [
    { x: 34, y: -26 },
    { x: 8, y: -34 },
    { x: -18, y: -26 },
  ], 18, HAND_TONE);

  // Punch holes across the back of the hand.
  for (let i = 0; i < 4; i += 1) {
    pin(c, 28 + i * 7, 16 + Math.sin(i * 1.3) * 4, 1.2, HAND_TONE, 0.5);
  }

  c.restore();
}

// ---------------------------------------------------------------- live air

function drawLampFlicker(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const f = noise1(t * 5.3, 12);
  const gr = c.createRadialGradient(440, 452, 40, 440, 452, 760);
  gr.addColorStop(0, `rgba(255, 196, 116, ${0.035 + 0.018 * (f + 1)})`);
  gr.addColorStop(0.6, `rgba(255, 176, 96, ${0.012 + 0.008 * (f + 1)})`);
  gr.addColorStop(1, 'rgba(255, 176, 96, 0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = gr;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);

  // A second, smaller pool where the lamp reaches the dalang's hand.
  const handGlow = c.createRadialGradient(940, 810, 20, 940, 810, 300);
  handGlow.addColorStop(0, `rgba(255, 190, 110, ${0.05 + 0.02 * (f + 1)})`);
  handGlow.addColorStop(1, 'rgba(255, 190, 110, 0)');
  c.fillStyle = handGlow;
  c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  c.restore();
}

function drawDust(g, ctx) {
  const c = g.drawingContext;
  const rand = rngFor('s10-dust');
  const t = ctx.t;
  c.save();
  for (let i = 0; i < 26; i += 1) {
    const bx = SCREEN.x + 80 + rand() * (SCREEN.w - 160);
    const by = SCREEN.y + 80 + rand() * (SCREEN.h - 200);
    const sp = 7 + rand() * 12;
    const y = SCREEN.y + 60 + (((by - SCREEN.y - 60 - t * sp) % (SCREEN.h - 120)) + (SCREEN.h - 120)) % (SCREEN.h - 120);
    const x = bx + Math.sin(t * 0.5 + i * 1.7) * 16;
    const r = 0.9 + rand() * 1.4;
    c.fillStyle = `rgba(255, 226, 172, ${0.06 + rand() * 0.1})`;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- gag

function nudgeAt(local) {
  // A jab every two seconds, centred on local 1.0, 3.0 and 5.0 — the gag still
  // catches it at local 3.0.
  const d = ((((local - 3.0 + 1) % 2) + 2) % 2) - 1;
  const a = Math.abs(d);
  if (a > 0.2) return 0;
  return Math.sin((1 - a / 0.2) * (Math.PI / 2));
}

// ---------------------------------------------------------------- title

function drawWayangTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const s = g.height / 1080;
  const W = 474 * s;
  const H = 208 * s;
  const x = 64 * s;
  const y = g.height - 42 * s - H + lift * s;

  c.save();
  c.globalAlpha = opacity;

  // Carved shadow-play plate.
  c.fillStyle = 'rgba(0, 0, 0, 0.42)';
  c.fillRect(x + 7 * s, y + 9 * s, W, H);

  c.fillStyle = 'rgba(17, 17, 28, 0.94)';
  c.fillRect(x, y, W, H);

  const warm = c.createLinearGradient(x, y, x + W, y + H);
  warm.addColorStop(0, 'rgba(224, 176, 90, 0.12)');
  warm.addColorStop(0.5, 'rgba(224, 176, 90, 0.02)');
  warm.addColorStop(1, 'rgba(60, 50, 80, 0.12)');
  c.fillStyle = warm;
  c.fillRect(x, y, W, H);

  c.strokeStyle = alpha(GOLD, 0.95);
  c.lineWidth = 2.4 * s;
  c.strokeRect(x + 7 * s, y + 7 * s, W - 14 * s, H - 14 * s);
  c.strokeStyle = alpha(GOLD, 0.4);
  c.lineWidth = 1 * s;
  c.strokeRect(x + 15 * s, y + 15 * s, W - 30 * s, H - 30 * s);

  // Corner curls: four small carved hooks.
  const curl = (cx, cy, sx, sy) => {
    c.save();
    c.translate(cx, cy);
    c.scale(sx, sy);
    c.strokeStyle = alpha(GOLD, 0.9);
    c.lineWidth = 1.6 * s;
    c.beginPath();
    c.arc(0, 0, 6 * s, 0.2, Math.PI * 1.55);
    c.stroke();
    c.beginPath();
    c.moveTo(6 * s, 4 * s);
    c.quadraticCurveTo(14 * s, 7 * s, 18 * s, 1 * s);
    c.stroke();
    c.restore();
  };
  curl(x + 29 * s, y + 30 * s, 1, 1);
  curl(x + W - 29 * s, y + 30 * s, -1, 1);
  curl(x + 29 * s, y + H - 30 * s, 1, -1);
  curl(x + W - 29 * s, y + H - 30 * s, -1, -1);

  const tx = x + 32 * s;

  setFont(c, 12 * s, 600, EN_FONT, '2.6px');
  c.fillStyle = alpha(GOLD, 0.86);
  c.textAlign = 'right';
  c.fillText('10  /  20', x + W - 64 * s, y + H - 32 * s);
  c.textAlign = 'left';

  // A small punched rosette balances the text block.
  const rx = x + W - 74 * s;
  const ry = y + 84 * s;
  c.strokeStyle = alpha(GOLD, 0.45);
  c.lineWidth = 1.2 * s;
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + Math.PI / 4;
    c.beginPath();
    c.moveTo(rx + Math.cos(a) * 6 * s, ry + Math.sin(a) * 6 * s);
    c.lineTo(rx + Math.cos(a) * 15 * s, ry + Math.sin(a) * 15 * s);
    c.stroke();
  }
  c.beginPath();
  c.arc(rx, ry, 4 * s, 0, TAU);
  c.fillStyle = alpha(HOLE, 0.5);
  c.fill();
  c.beginPath();
  c.arc(rx, ry, 18 * s, 0, TAU);
  c.strokeStyle = alpha(GOLD, 0.3);
  c.stroke();

  setFont(c, 37 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#f5d99f';
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 8 * s;
  c.fillText('爪哇皮影戏', tx, y + 88 * s);
  c.shadowColor = 'transparent';

  c.strokeStyle = alpha(GOLD, 0.42);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(tx, y + 104 * s);
  c.lineTo(x + W - 32 * s, y + 104 * s);
  c.stroke();
  // Holes punched along the rule.
  for (let i = 0; i < 8; i += 1) {
    c.fillStyle = alpha(HOLE, 0.35);
    c.beginPath();
    c.arc(tx + 10 * s + i * 22 * s, y + 104 * s, 1.1 * s, 0, TAU);
    c.fill();
  }

  setFont(c, 15 * s, 500, EN_FONT, '3.2px');
  c.fillStyle = '#e6c48d';
  c.fillText('WAYANG KULIT', tx, y + 132 * s);

  setFont(c, 15 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(GOLD, 0.92);
  c.fillText('约1800 · 中爪哇', tx, y + 164 * s);

  c.restore();
}
