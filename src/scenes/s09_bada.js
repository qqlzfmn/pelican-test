// 9 — Bada Shanren, expressionist ink. Off-white paper, enormous empty space,
// a handful of loaded and dry strokes: rock, dry branch, lone fish. The rider is
// painted with the same brush, not with the neutral rig painter. The fish turns
// its signature side-eye on the downbeat; the pelican blinks first.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import {
  lerp, smoothstep, rngFor, noise1, TAU,
} from '../kit/math.js';
import { smoothPoints } from '../kit/brush.js';
import { rigPose } from '../rig/pose.js';
import { cachedLayer } from '../kit/cache.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { SPEED } from '../kit/road.js';

const PAPER = '#eee9de';
const PAPER_L = '#f3eee4';
const PAPER_D = '#e6dfd0';
const INK = '#23211d';
const WASH = '#857e6e';
const SEAL = '#a33f2a';

const GROUND = 820;
const RIDER_X = 468;
const RIDER_S = 0.95;

export default {
  id: 's09',
  number: 9,
  cn: '八大山人写意',
  en: 'Bada Shanren, Expressionist Ink',
  year: '约1690',
  motif: 'blob',
  palette: basePalette({
    bg: PAPER, bg2: PAPER_D, motif: INK, accent: SEAL,
    ink: INK, titleInk: INK, ground: '#e4ddce', road: '#e9e2d5',
    dash: '#efe9dc', body: PAPER_L, beak: '#b9a98c', rigInk: INK,
    scrim: PAPER,
  }),

  draw(g, ctx) {
    const c = g.drawingContext;
    const art = cachedLayer(ctx, 's09-ink', drawPaper, {
      x0: -800, y0: -150, w: 2400, h: 1250,
    });
    c.drawImage(art.canvas, -800, -150, 2400, 1250);

    drawGroundTicks(g, ctx);
    drawFish(g, ctx);
    drawBadaRider(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawBadaTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- brush

// A loaded stroke that runs dry: tapered width, random breaks and a couple of
// bristle hairs at the edge. All randomness is seeded.
function dryStroke(c, pts, {
  color = INK, width = 3.2, seed = 1, alphaBase = 0.92,
  gaps = 0.12, taper = true, angular = false,
} = {}) {
  if (!pts || pts.length < 2) return;
  const rand = rngFor(seed);
  const sp = angular
    ? pts.flatMap((p, i) => {
      if (i === 0) return [p];
      const a = pts[i - 1];
      return [
        { x: lerp(a.x, p.x, 0.5), y: lerp(a.y, p.y, 0.5) },
        p,
      ];
    })
    : smoothPoints(pts, Math.max(6, Math.round(pts.length * 4)));
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let i = 1; i < sp.length; i += 1) {
    if (rand() < gaps) continue;
    const a = sp[i - 1];
    const b = sp[i];
    const t = i / (sp.length - 1);
    const w = width * (taper ? lerp(1, 0.34, t) : 1) * (0.72 + rand() * 0.55);
    c.strokeStyle = alpha(color, alphaBase * (0.5 + rand() * 0.5));
    c.lineWidth = Math.max(0.6, w);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    // Bristle hairs, only on the loaded half of the stroke.
    if (t < 0.72 && rand() < 0.3) {
      const nx = -(b.y - a.y);
      const ny = b.x - a.x;
      const m = Math.hypot(nx, ny) || 1;
      const off = w * (0.5 + rand() * 0.7);
      c.strokeStyle = alpha(color, alphaBase * 0.18 * rand());
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(a.x + (nx / m) * off, a.y + (ny / m) * off);
      c.lineTo(b.x + (nx / m) * off, b.y + (ny / m) * off);
      c.stroke();
    }
  }
  c.restore();
}

// Filled tapered band, for the neck and beak. Dry edge included.
function inkBand(c, pts, w0, w1, {
  seed = 1, color = INK, alphaBase = 1,
} = {}) {
  if (!pts || pts.length < 2) return;
  const rand = rngFor(seed);
  const sp = smoothPoints(pts, 16);
  const left = [];
  const right = [];
  for (let i = 0; i < sp.length; i += 1) {
    const p = sp[i];
    const a = sp[Math.max(0, i - 1)];
    const b = sp[Math.min(sp.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = i / (sp.length - 1);
    const w = lerp(w0, w1, t) * (0.94 + rand() * 0.12) * 0.5;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  c.save();
  c.beginPath();
  c.moveTo(left[0].x, left[0].y);
  for (const p of left) c.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i -= 1) c.lineTo(right[i].x, right[i].y);
  c.closePath();
  c.fillStyle = alpha(color, alphaBase);
  c.fill();
  c.restore();
}

function inkBlob(c, x, y, rx, ry, rot, seed = 1) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  const N = 22;
  for (let i = 0; i <= N; i += 1) {
    const a = (i / N) * TAU;
    const wobble = 1 + noise1(i * 0.85, seed) * 0.082;
    const px = Math.cos(a) * rx * wobble;
    const py = Math.sin(a) * ry * wobble;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = INK;
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------- static paper

function drawPaper(g, c) {
  // Substrate: warm off-white, a breath darker at the extremities.
  const grad = c.createLinearGradient(-800, -150, 1600, 1100);
  grad.addColorStop(0, PAPER_L);
  grad.addColorStop(0.55, PAPER);
  grad.addColorStop(1, PAPER_D);
  c.fillStyle = grad;
  c.fillRect(-800, -150, 2400, 1250);

  // A few large, nearly invisible washes: the unevenness of old paper.
  const rand = rngFor(907);
  for (let i = 0; i < 9; i += 1) {
    const x = -700 + rand() * 2200;
    const y = -100 + rand() * 1150;
    const r = 120 + rand() * 320;
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, alpha(rand() > 0.45 ? '#cbbfa8' : '#ffffff', 0.028));
    rg.addColorStop(1, alpha('#cbbfa8', 0));
    c.fillStyle = rg;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Paper fibres.
  c.save();
  c.lineWidth = 0.6;
  for (let i = 0; i < 1500; i += 1) {
    const x = -800 + rand() * 2400;
    const y = -150 + rand() * 1250;
    const len = 1 + rand() * 9;
    const a = (rand() - 0.5) * 0.55;
    c.strokeStyle = alpha(rand() > 0.5 ? WASH : '#c9bfae', 0.018 + rand() * 0.038);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    c.stroke();
  }
  c.restore();

  drawGround(c);
  drawBranch(c);
  drawRock(c);
  drawSeal(c);
}

// The barest ground: one pale wash and a single dry passage under the wheels.
function drawGround(c) {
  c.save();
  const rand = rngFor(911);
  // Soft, edgeless wash: no horizon band across the paper.
  const soil = c.createLinearGradient(0, 776, 0, 868);
  soil.addColorStop(0, alpha(WASH, 0));
  soil.addColorStop(0.55, alpha(WASH, 0.075));
  soil.addColorStop(1, alpha(WASH, 0));
  c.fillStyle = soil;
  c.fillRect(-800, 776, 2400, 92);

  // Dry horizontal passage; broken, fast, no outline.
  const pts = [];
  for (let x = 250; x <= 690; x += 22) {
    pts.push({ x, y: 825 + noise1(x * 0.02, 8) * 3 });
  }
  dryStroke(c, pts, { width: 3.4, seed: 912, alphaBase: 0.34, gaps: 0.18 });

  // Two little grass ticks at the rock foot.
  for (let i = 0; i < 3; i += 1) {
    const x = 150 + i * 26 + rand() * 8;
    const h = 14 + rand() * 18;
    dryStroke(c, [
      { x, y: 826 },
      { x: x + (rand() - 0.5) * 8, y: 826 - h * 0.6 },
      { x: x + (rand() - 0.5) * 12, y: 826 - h },
    ], { width: 1.6, seed: 920 + i, alphaBase: 0.5, gaps: 0.08 });
  }
  c.restore();
}

// A dry branch from the top-left corner: angular, sparse, almost no ink.
function drawBranch(c) {
  const main = [
    { x: -360, y: -40 },
    { x: -310, y: 10 },
    { x: -252, y: 40 },
    { x: -206, y: 34 },
    { x: -154, y: 62 },
    { x: -88, y: 78 },
    { x: -16, y: 92 },
    { x: 52, y: 96 },
    { x: 116, y: 86 },
    { x: 170, y: 68 },
  ];
  dryStroke(c, main, {
    width: 10, seed: 931, alphaBase: 0.95, gaps: 0.035, angular: true,
  });

  const fork1 = [
    { x: -150, y: 78 },
    { x: -128, y: 30 },
    { x: -118, y: -14 },
    { x: -92, y: -44 },
  ];
  dryStroke(c, fork1, { width: 3.6, seed: 932, alphaBase: 0.78, gaps: 0.12, angular: true });

  const fork2 = [
    { x: 34, y: 107 },
    { x: 46, y: 138 },
    { x: 40, y: 162 },
  ];
  dryStroke(c, fork2, { width: 3.2, seed: 933, alphaBase: 0.78, gaps: 0.08, angular: true });

  const fork3 = [
    { x: 122, y: 95 },
    { x: 144, y: 66 },
    { x: 154, y: 44 },
  ];
  dryStroke(c, fork3, { width: 2.8, seed: 934, alphaBase: 0.74, gaps: 0.1, angular: true });

  // Three buds, each a single loaded dot.
  const buds = [[-92, -44], [40, 162], [154, 44]];
  c.save();
  for (let i = 0; i < buds.length; i += 1) {
    c.fillStyle = alpha(INK, 0.8);
    c.beginPath();
    c.arc(buds[i][0], buds[i][1], 2.6, 0, TAU);
    c.fill();
  }
  c.restore();
}

// The rock: two thin washes, one dry contour, two texture strokes. No fill.
function drawRock(c) {
  c.save();
  c.translate(-24, 0);
  // Angular, notched silhouette: a rock, not a hill.
  const outline = [
    { x: 112, y: 828 },
    { x: 116, y: 790 },
    { x: 126, y: 752 },
    { x: 148, y: 730 },
    { x: 140, y: 700 },
    { x: 160, y: 668 },
    { x: 190, y: 656 },
    { x: 214, y: 666 },
    { x: 220, y: 694 },
    { x: 244, y: 700 },
    { x: 268, y: 680 },
    { x: 294, y: 688 },
    { x: 314, y: 716 },
    { x: 324, y: 752 },
    { x: 316, y: 788 },
    { x: 328, y: 812 },
    { x: 326, y: 828 },
  ];

  c.save();
  c.filter = 'blur(2.5px)';
  c.beginPath();
  c.moveTo(outline[0].x, outline[0].y);
  for (const p of outline) c.lineTo(p.x, p.y);
  c.lineTo(326, 838);
  c.lineTo(112, 838);
  c.closePath();
  c.fillStyle = alpha(WASH, 0.3);
  c.fill();

  // A darker damp foot, offset inwards.
  c.beginPath();
  c.moveTo(150, 812);
  c.lineTo(164, 764);
  c.lineTo(196, 736);
  c.lineTo(244, 726);
  c.lineTo(292, 742);
  c.lineTo(322, 776);
  c.lineTo(330, 816);
  c.lineTo(312, 828);
  c.lineTo(176, 828);
  c.closePath();
  c.fillStyle = alpha(WASH, 0.24);
  c.fill();
  c.filter = 'none';

  // A shallow hollow low in the rock: reserved paper, one dry edge.
  c.beginPath();
  c.ellipse(234, 792, 15, 20, -0.28, 0, TAU);
  c.fillStyle = alpha(PAPER, 0.36);
  c.fill();
  dryStroke(c, [
    { x: 220, y: 784 },
    { x: 216, y: 796 },
    { x: 222, y: 808 },
  ], { width: 1.3, seed: 940, alphaBase: 0.38, gaps: 0.2 });
  c.restore();

  // Wet contour on the shoulder only; it fades away at the base.
  dryStroke(c, outline.slice(1, 10), {
    width: 5.2, seed: 941, alphaBase: 0.9, gaps: 0.035, angular: true,
  });
  dryStroke(c, outline.slice(9, 17), {
    width: 3.6, seed: 944, alphaBase: 0.62, gaps: 0.05, angular: true,
  });
  // Two dry texture strokes inside the mass.
  dryStroke(c, [
    { x: 186, y: 792 },
    { x: 202, y: 758 },
    { x: 226, y: 738 },
  ], { width: 1.8, seed: 942, alphaBase: 0.42, gaps: 0.22 });
  dryStroke(c, [
    { x: 280, y: 808 },
    { x: 296, y: 776 },
    { x: 322, y: 758 },
  ], { width: 1.5, seed: 943, alphaBase: 0.34, gaps: 0.26 });

  c.restore();
}

// Artist's seal, on the empty paper below the branch.
function drawSeal(c) {
  const x = 46;
  const y = 744;
  const w = 28;
  c.save();
  c.fillStyle = alpha(SEAL, 0.9);
  c.fillRect(x, y, w, w);
  // Slightly chewed edge, like a stone seal.
  c.fillStyle = alpha(PAPER, 0.85);
  c.beginPath();
  c.arc(x + 1, y + 6, 1.6, 0, TAU);
  c.arc(x + w - 1, y + w - 9, 1.4, 0, TAU);
  c.fill();
  c.fillStyle = alpha(PAPER, 0.96);
  setFont(c, 18, 600, CN_FONT, '0px');
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('鹈', x + w / 2, y + w / 2 + 1);
  c.restore();
}

// ---------------------------------------------------------------- fish

function drawFish(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const turn = smoothstep(1.95, 2.35, local);
  const bob = Math.sin(local * 1.15 + 0.4) * 4;
  const angle = 0.02 - 0.42 * turn;
  const flick = Math.sin(local * 5.4) * 0.11 * turn;
  const cx = 936 - 20 * turn;
  const cy = 300 + bob;

  c.save();
  c.translate(cx, cy);
  c.rotate(angle);

  // Plump, slightly drooping body: a fish, not a leaf.
  const body = [
    { x: -66, y: 0 },
    { x: -58, y: -16 },
    { x: -34, y: -28 },
    { x: -2, y: -31 },
    { x: 30, y: -27 },
    { x: 52, y: -15 },
    { x: 58, y: -1 },
    { x: 52, y: 13 },
    { x: 30, y: 23 },
    { x: 0, y: 27 },
    { x: -30, y: 25 },
    { x: -54, y: 16 },
  ];
  const loop = smoothPoints([...body, body[0]], 10);

  c.save();
  c.beginPath();
  c.moveTo(loop[0].x, loop[0].y);
  for (let i = 1; i < loop.length; i += 1) c.lineTo(loop[i].x, loop[i].y);
  c.closePath();
  c.fillStyle = alpha(WASH, 0.11);
  c.fill();
  c.clip();
  c.fillStyle = alpha(WASH, 0.16);
  c.beginPath();
  c.ellipse(-6, 10, 48, 13, 0.04, 0, TAU);
  c.fill();
  c.restore();

  // One contour, dry at the tail end.
  dryStroke(c, loop, {
    width: 3.2, seed: 951, alphaBase: 0.95, gaps: 0.12, taper: false,
  });

  // Tail: three loaded flicks and a wash between them.
  c.save();
  c.translate(54, 1);
  c.rotate(flick);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(34, -24);
  c.lineTo(42, -2);
  c.lineTo(36, 20);
  c.closePath();
  c.fillStyle = alpha(WASH, 0.1);
  c.fill();
  dryStroke(c, [{ x: 0, y: -1 }, { x: 22, y: -14 }, { x: 38, y: -23 }], {
    width: 3.2, seed: 952, alphaBase: 0.86, gaps: 0.08,
  });
  dryStroke(c, [{ x: 2, y: 0 }, { x: 26, y: -1 }, { x: 44, y: -2 }], {
    width: 2.6, seed: 953, alphaBase: 0.8, gaps: 0.12,
  });
  dryStroke(c, [{ x: 2, y: 2 }, { x: 22, y: 12 }, { x: 38, y: 20 }], {
    width: 3, seed: 954, alphaBase: 0.84, gaps: 0.08,
  });
  c.restore();

  // Dorsal fin: three ribs off the back.
  for (let i = 0; i < 3; i += 1) {
    dryStroke(c, [
      { x: -12 + i * 12, y: -29 },
      { x: -4 + i * 12, y: -38 - i * 2 },
      { x: 2 + i * 12, y: -44 - i * 2 },
    ], { width: 1.8, seed: 960 + i, alphaBase: 0.62, gaps: 0.12 });
  }

  // Pectoral fin and gill.
  dryStroke(c, [
    { x: 0, y: 10 },
    { x: -4, y: 23 },
    { x: -16, y: 30 },
  ], { width: 2.1, seed: 964, alphaBase: 0.68, gaps: 0.08 });
  dryStroke(c, [
    { x: -32, y: -18 },
    { x: -27, y: -3 },
    { x: -32, y: 13 },
  ], { width: 2.2, seed: 965, alphaBase: 0.55, gaps: 0.14 });

  // Mouth: a small down-turned hook, the permanent sneer.
  dryStroke(c, [
    { x: -66, y: 0 },
    { x: -58, y: -3 },
    { x: -51, y: -5 },
  ], { width: 2.2, seed: 966, alphaBase: 0.85, gaps: 0.04 });

  // Eye, large and hooded. The pupil slides into the corner on the turn.
  const ex = -44;
  const ey = -6;
  c.fillStyle = alpha(PAPER, 0.92);
  c.beginPath();
  c.arc(ex, ey, 11, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(INK, 0.95);
  c.lineWidth = 2.6;
  c.beginPath();
  c.arc(ex, ey, 11, 0, TAU);
  c.stroke();
  const px = ex + lerp(-2.2, -4.6, turn);
  const py = ey + lerp(1.4, 4.2, turn);
  c.fillStyle = INK;
  c.beginPath();
  c.arc(px, py, 4.8, 0, TAU);
  c.fill();
  // Heavy lid: the Bada side-eye.
  dryStroke(c, [
    { x: ex - 12, y: ey - 9 },
    { x: ex - 2, y: ey - 13 },
    { x: ex + 10, y: ey - 10 },
  ], { width: 2.8, seed: 967, alphaBase: 0.85, gaps: 0.03 });
  c.restore();
}

// ---------------------------------------------------------------- rider

function blinkAt(local) {
  const start = 2.86;
  const end = 3.2;
  if (local < start || local > end) return 0;
  return Math.sin(Math.PI * ((local - start) / (end - start)));
}

function drawWheel(c, wheel, angle, seed) {
  const rand = rngFor(seed);
  const N = 26;
  for (let i = 0; i < N; i += 1) {
    if (rand() < 0.15) continue;
    const a0 = (i / N) * TAU;
    const a1 = ((i + 1.02) / N) * TAU;
    c.strokeStyle = alpha(INK, 0.55 + rand() * 0.45);
    c.lineWidth = 3.4 * (0.65 + rand() * 0.5);
    c.beginPath();
    c.arc(wheel.x, wheel.y, wheel.r, a0, a1);
    c.stroke();
  }
  // Three spokes: enough to read rotation, no more.
  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 1.1;
  for (let i = 0; i < 3; i += 1) {
    const a = angle + (i / 3) * TAU;
    c.beginPath();
    c.moveTo(wheel.x + Math.cos(a) * 3, wheel.y + Math.sin(a) * 3);
    c.lineTo(wheel.x + Math.cos(a) * (wheel.r - 4), wheel.y + Math.sin(a) * (wheel.r - 4));
    c.stroke();
  }
  c.fillStyle = alpha(INK, 0.85);
  c.beginPath();
  c.arc(wheel.x, wheel.y, 3.2, 0, TAU);
  c.fill();
}

function drawBadaRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  const blink = blinkAt(ctx.local);

  c.save();
  c.translate(RIDER_X, GROUND);
  c.scale(RIDER_S, RIDER_S);

  // Slight ground contact wash.
  c.save();
  c.scale(1, 0.16);
  const under = c.createRadialGradient(0, 0, 2, 0, 0, 100);
  under.addColorStop(0, alpha(WASH, 0.16));
  under.addColorStop(1, alpha(WASH, 0));
  c.fillStyle = under;
  c.beginPath();
  c.arc(0, 2, 100, 0, TAU);
  c.fill();
  c.restore();

  drawWheel(c, pose.wheels.rear, pose.wheelAngle, 971);
  drawWheel(c, pose.wheels.front, pose.wheelAngle, 972);

  // Far leg, faint.
  dryStroke(c, [pose.hip, pose.legs.far.knee, pose.legs.far.ankle], {
    width: 8.6, seed: 973, alphaBase: 0.28, gaps: 0.08,
  });

  // Frame: five strokes.
  const f = pose.frame;
  dryStroke(c, [f.rearHub, f.seatCluster], { width: 4.2, seed: 974, alphaBase: 0.92, gaps: 0.05 });
  dryStroke(c, [f.seatCluster, f.crank], { width: 4.2, seed: 975, alphaBase: 0.92, gaps: 0.05 });
  dryStroke(c, [f.crank, f.headTop], { width: 4.2, seed: 976, alphaBase: 0.92, gaps: 0.05 });
  dryStroke(c, [f.seatCluster, f.headTop], { width: 3.8, seed: 977, alphaBase: 0.88, gaps: 0.06 });
  dryStroke(c, [f.headTop, f.frontHub], { width: 4, seed: 978, alphaBase: 0.92, gaps: 0.05 });
  dryStroke(c, [f.headTop, f.grip], { width: 3.4, seed: 979, alphaBase: 0.9, gaps: 0.06 });
  // Handlebar nub.
  dryStroke(c, [{ x: f.grip.x - 2, y: f.grip.y - 1 }, { x: f.grip.x + 7, y: f.grip.y - 6 }], {
    width: 3, seed: 980, alphaBase: 0.82, gaps: 0.05,
  });

  // Chainring, crank, pedal: two small marks.
  c.strokeStyle = alpha(INK, 0.7);
  c.lineWidth = 1.9;
  c.beginPath();
  c.arc(pose.crankCenter.x, pose.crankCenter.y, 11, 0, TAU);
  c.stroke();
  dryStroke(c, [pose.crankCenter, pose.pedals.near], { width: 2.2, seed: 981, alphaBase: 0.8, gaps: 0.05 });
  c.fillStyle = alpha(INK, 0.85);
  c.fillRect(pose.pedals.near.x - 6, pose.pedals.near.y - 1.5, 13, 3);

  // Near leg, loaded.
  dryStroke(c, [pose.hip, pose.legs.near.knee, pose.legs.near.ankle], {
    width: 9.6, seed: 982, alphaBase: 0.92, gaps: 0.05,
  });

  // Saddle.
  dryStroke(c, [
    { x: pose.saddle.x - 14, y: pose.saddle.y - 2 },
    { x: pose.saddle.x + 4, y: pose.saddle.y - 4 },
  ], { width: 5, seed: 983, alphaBase: 0.9, gaps: 0.03 });

  // Tail as three loaded flicks, not a filled wedge or whiskers.
  const tail = pose.tail;
  inkBand(c, [
    { x: tail.x + 14, y: tail.y - 3 },
    { x: tail.x - 10, y: tail.y - 12 },
    { x: tail.x - 29, y: tail.y - 14 },
  ], 11, 1.5, { seed: 984 });
  inkBand(c, [
    { x: tail.x + 14, y: tail.y + 1 },
    { x: tail.x - 13, y: tail.y - 2 },
    { x: tail.x - 34, y: tail.y - 2 },
  ], 9, 1.2, { seed: 985 });
  inkBand(c, [
    { x: tail.x + 14, y: tail.y + 4 },
    { x: tail.x - 9, y: tail.y + 10 },
    { x: tail.x - 26, y: tail.y + 12 },
  ], 8, 1.2, { seed: 986 });

  // Body: one wet mass, a little longer than tall.
  const body = pose.body;
  inkBlob(c, body.x, body.y + 8, 52, 35, body.rot, 12);

  // Neck: short and thick, so the bird reads pelican rather than stork.
  const head = { x: pose.head.x + 2, y: pose.head.y - 4 };
  const neckPts = [
    { x: pose.shoulder.x + 2, y: pose.shoulder.y + 2 },
    { x: pose.shoulder.x + 13, y: pose.shoulder.y - 12 },
    { x: head.x - 12, y: head.y + 13 },
    { x: head.x - 4, y: head.y + 5 },
  ];
  inkBand(c, neckPts, 26, 13, { seed: 986 });
  inkBlob(c, head.x, head.y, 17.5, 15.5, -0.12, 7);

  // One short crest feather at the back of the skull.
  dryStroke(c, [
    { x: head.x - 9, y: head.y - 7 },
    { x: head.x - 17, y: head.y - 13 },
    { x: head.x - 22, y: head.y - 14 },
  ], { width: 2.6, seed: 987, alphaBase: 0.78, gaps: 0.04 });

  // Beak: a long, slightly hooked line with a thin lower edge.
  const beak = {
    base: { x: head.x + 12, y: head.y + 4 },
    tip: { x: head.x + 86, y: head.y + 19 },
  };
  inkBand(c, [
    beak.base,
    { x: beak.base.x + 40, y: beak.base.y + 4 },
    { x: beak.tip.x, y: beak.tip.y },
  ], 10, 2.4, { seed: 989 });
  dryStroke(c, [
    { x: beak.base.x + 3, y: beak.base.y + 7 },
    { x: beak.base.x + 48, y: beak.base.y + 10 },
    { x: beak.tip.x - 2, y: beak.tip.y + 1 },
  ], { width: 1.3, seed: 990, alphaBase: 0.6, gaps: 0.1 });

  // Pouch: a pale hanging bag, open along the mandible. One lower contour only.
  const pouch = { x: head.x + 46, y: head.y + 42 };
  const p0 = { x: beak.base.x + 2, y: beak.base.y + 9 };
  const p3 = { x: beak.tip.x - 6, y: beak.tip.y + 3 };
  // Only the hanging lower edge; the mandible and empty paper make the bag.
  dryStroke(c, [
    p0,
    { x: pouch.x - 8, y: pouch.y + 8 },
    { x: pouch.x + 2, y: pouch.y + 24 },
    p3,
  ], { width: 3, seed: 991, alphaBase: 0.8, gaps: 0.04 });
  // A short inner crease.
  dryStroke(c, [
    { x: pouch.x - 12, y: pouch.y + 10 },
    { x: pouch.x + 3, y: pouch.y + 20 },
    { x: pouch.x + 20, y: pouch.y + 10 },
  ], { width: 1.4, seed: 992, alphaBase: 0.28, gaps: 0.12 });

  // Wing/arm to the handlebar.
  dryStroke(c, [
    { x: pose.shoulder.x - 2, y: pose.shoulder.y + 6 },
    { x: 34, y: -168 },
    { x: pose.grip.x - 2, y: pose.grip.y - 2 },
  ], { width: 11, seed: 988, alphaBase: 0.92, gaps: 0.04 });

  // Eye: the signature rolled side-eye, then the blink.
  const ex = head.x + 4;
  const ey = head.y - 5;
  c.save();
  if (blink > 0.6) {
    dryStroke(c, [
      { x: ex - 7, y: ey + 1 },
      { x: ex, y: ey + 4 },
      { x: ex + 7, y: ey + 1 },
    ], { width: 2.4, seed: 991, alphaBase: 0.95, gaps: 0.02 });
  } else {
    const ry = Math.max(0.8, 6.6 * (1 - blink * 0.55));
    c.fillStyle = alpha(PAPER, 0.95);
    c.beginPath();
    c.ellipse(ex, ey, 6.6, ry, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(INK, 0.95);
    c.lineWidth = 1.7;
    c.beginPath();
    c.ellipse(ex, ey, 6.6, ry, 0, 0, TAU);
    c.stroke();
    c.fillStyle = INK;
    c.beginPath();
    c.arc(ex + 2.9, ey - 1.5, 3.1, 0, TAU);
    c.fill();
    // Upper lid: makes the eye hooded and rolls the gaze to the corner.
    c.strokeStyle = alpha(INK, 0.92);
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(ex - 7.6, ey - 2.4);
    c.quadraticCurveTo(ex + 1, ey - 9.6, ex + 8, ey - 1.8);
    c.stroke();
  }
  c.restore();

  c.restore();
}

// ---------------------------------------------------------------- ground ticks

function drawGroundTicks(g, ctx) {
  const c = g.drawingContext;
  const scroll = (ctx.t * SPEED) % 460;
  c.save();
  for (let i = 0; i < 3; i += 1) {
    const x = -60 + (((i * 460 + 140 - scroll) % 1380) + 1380) % 1380;
    dryStroke(c, [
      { x, y: 828 },
      { x: x + 14, y: 829 },
      { x: x + 28, y: 827 },
    ], { width: 1.6, seed: 995 + i, alphaBase: 0.2, gaps: 0.16 });
  }
  c.restore();
}

// ---------------------------------------------------------------- title

function drawBadaTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const colX = W - 146 * s;
  const top = 92 * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.35 * s);

  // Thin rule right of the column; the paper is the panel.
  c.strokeStyle = alpha(INK, 0.26);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(colX + 34 * s, top - 4 * s);
  c.lineTo(colX + 34 * s, top + 250 * s);
  c.stroke();

  // Vertical calligraphy.
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 44 * s, 500, CN_FONT, '0px');
  c.fillStyle = INK;
  const chars = ['八', '大', '山', '人'];
  chars.forEach((ch, i) => {
    c.fillText(ch, colX, top + (34 + i * 50) * s);
  });

  // Small 写意 to the left of the column.
  setFont(c, 19 * s, 400, CN_FONT, '0px');
  c.fillStyle = alpha(INK, 0.78);
  ['写', '意'].forEach((ch, i) => {
    c.fillText(ch, colX - 40 * s, top + (150 + i * 25) * s);
  });

  // Seal under the column.
  const sw = 38 * s;
  const sx = colX - sw / 2;
  const sy = top + 258 * s;
  c.fillStyle = alpha(SEAL, 0.93);
  c.fillRect(sx, sy, sw, sw);
  c.fillStyle = alpha(PAPER, 0.97);
  setFont(c, 24 * s, 600, CN_FONT, '0px');
  c.fillText('鹈', colX, sy + sw / 2 + 1 * s);

  // Index, English, date; left of the seal, aligned on a quiet baseline.
  c.textAlign = 'left';
  setFont(c, 12 * s, 600, EN_FONT, '2.6px');
  c.fillStyle = alpha(SEAL, 0.95);
  c.fillText('09  /  20', colX - 220 * s, top + 296 * s);

  setFont(c, 14 * s, 500, EN_FONT, '1.6px');
  c.fillStyle = alpha(INK, 0.86);
  c.fillText('BADA SHANREN', colX - 220 * s, top + 320 * s);

  setFont(c, 14 * s, 400, CN_FONT, '0.6px');
  c.fillStyle = alpha(INK, 0.66);
  c.fillText('约1690 · 写意', colX - 220 * s, top + 342 * s);

  // A single dry horizontal mark to close the colophon.
  dryStroke(c, [
    { x: colX - 220 * s, y: top + 116 * s },
    { x: colX - 180 * s, y: top + 115 * s },
  ], { width: 1.4 * s, seed: 999, alphaBase: 0.4, gaps: 0.12 });

  c.restore();
}
