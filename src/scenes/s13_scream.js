// 13 — The Scream (1893). Painted board: long wavy bands, a diagonal bridge
// railing, a blue-black fjord. The screamer holds the scream until the pelican
// rings its bell — then she is merely startled. The pelican is unbothered.
// Bridge and fjord are cached; sky bands, figures and the bell are live.

import { basePalette } from './_placeholder.js';
import { alpha, mix } from '../kit/color.js';
import { clamp, lerp, noise1, rngFor, smoothstep, TAU } from '../kit/math.js';
import { cachedLayer, drawCached } from '../kit/cache.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const pal = basePalette({
  bg: '#d4692e', bg2: '#b64925', motif: '#2c2f3a', accent: '#f0b35a',
  ink: '#24202a', titleInk: '#f7e3c4', ground: '#b5814a', road: '#c7965c',
  dash: '#8a5a33', body: '#f4e3c2', beak: '#c96329', rigInk: '#1d1a22',
  scrim: '#20232c',
});

const SKY_X0 = -900;
const SKY_X1 = 1800;
const DECK_FAR = 730;
const RIDER_X = 468;
const RIDER_S = 1.16;

// Band boundaries from the top of the frame down to the far edge of the bridge.
const BOUNDS = [
  -210, -140, -78, -12, 44, 96, 146, 194,
  240, 282, 322, 362, 402, 438, 468, 505, 760,
];
const BAND_COLORS = [
  '#a8481f', '#c8592a', '#4d5364', '#d4692e', '#e28a3e', '#f0b35a',
  '#e7a24c', '#b64925', '#c95c2d', '#6a6e7c', '#d4692e', '#e9a04f',
  '#f0b35a', '#e5b473', '#dc9a4e', '#f2cf95',
];

const MID = { x0: -880, y0: 380, w: 2640, h: 800 };
const ROAD_OPTS = {
  ground: '#a17f58',
  verge: '#ab8860',
  road: '#b28e63',
  edge: '#dcc197',
  dash: '#7d5636',
  ink: '#3a2c26',
  dust: false,
};

export default {
  id: 's13',
  number: 13,
  cn: '呐喊',
  en: 'The Scream',
  year: '1893',
  motif: 'waves',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;

    // Painted board showing through the thin paint.
    c.fillStyle = '#bd7b46';
    c.fillRect(-950, -280, 2800, 1480);

    drawSky(g, ctx);

    // The bridge deck is the film's road, seen in flat ochre.
    ctx.road(g, ROAD_OPTS);

    const mid = cachedLayer(ctx, 's13-bridge', drawMid, MID);
    drawCached(g, mid, MID);

    drawWalkers(g, ctx);
    drawScreamer(g, ctx);

    ctx.rider(g, RIDER_X, {
      scale: RIDER_S,
      style: { ...ctx.style, leg: '#a8542b', pouch: '#d98a44' },
    });
    drawBell(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawScreamTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- beat

function pulseAt(local) {
  const fr = local - Math.floor(local);
  const base = fr < 0.5 ? Math.pow(1 - fr / 0.5, 2) : 0;
  const gag = Math.exp(-Math.pow((local - 2.0) / 0.3, 2));
  return Math.min(1.15, base + gag * 0.65);
}

function ringAt(local) {
  let best = 0;
  for (let s = 1; s <= 5; s += 1) {
    const fr = local - s;
    if (fr >= 0 && fr < 0.7) best = Math.max(best, 1 - fr / 0.7);
  }
  return best;
}

// ---------------------------------------------------------------- sky

function waveY(base, i, x, t, ampScale) {
  const a = (9 + (i % 5) * 4) * ampScale;
  return base
    + Math.sin(x * 0.0021 + t * 0.3 + i * 0.62) * (15 + (i % 3) * 6) * ampScale
    + Math.sin(x * 0.0058 + t * 0.5 + i * 0.9) * a
    + Math.sin(x * 0.0141 - t * 0.8 + i * 1.7) * a * 0.3
    + noise1(x * 0.006 + i * 5.3 + t * 0.25, 131 + i) * a * 0.6
    + Math.sin(x * 0.027 + i * 3.1 + t * 0.8) * 2.6
    + x * 0.03;
}

function contour(c, base, i, t, ampScale, reverse = false) {
  const step = 44;
  if (reverse) {
    for (let x = SKY_X1; x >= SKY_X0; x -= step) {
      c.lineTo(x, waveY(base, i, x, t, ampScale));
    }
  } else {
    for (let x = SKY_X0; x <= SKY_X1; x += step) {
      c.lineTo(x, waveY(base, i, x, t, ampScale));
    }
  }
}

function drawSky(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const pulse = pulseAt(ctx.local);
  const ampScale = 1 + 0.55 * pulse;

  c.save();
  c.lineJoin = 'round';
  c.fillStyle = BAND_COLORS[BAND_COLORS.length - 1];
  c.fillRect(SKY_X0, -280, SKY_X1 - SKY_X0, 1060);

  for (let i = 0; i < BAND_COLORS.length; i += 1) {
    const top = BOUNDS[i];
    const bot = BOUNDS[i + 1];
    const color = BAND_COLORS[i];

    c.beginPath();
    c.moveTo(SKY_X0, waveY(top, i, SKY_X0, t, ampScale));
    contour(c, top, i, t, ampScale, false);
    if (i === BAND_COLORS.length - 1) {
      c.lineTo(SKY_X1, 762);
      c.lineTo(SKY_X0, 762);
    } else {
      contour(c, bot, i + 1, t, ampScale, true);
    }
    c.closePath();
    c.fillStyle = color;
    c.fill();

    // Painted contour: a darker edge with a lighter ridge just above it.
    c.beginPath();
    c.moveTo(SKY_X0, waveY(top, i, SKY_X0, t, ampScale) - 2.4);
    contour(c, top, i, t, ampScale, false);
    c.strokeStyle = alpha(mix(color, '#3a2c28', 0.55), 0.55);
    c.lineWidth = 3.4;
    c.stroke();

    if (bot - top > 34) {
      c.beginPath();
      const midY = lerp(top, bot, 0.45);
      c.moveTo(SKY_X0, waveY(midY, i, SKY_X0, t, ampScale) + 3);
      contour(c, midY, i, t, ampScale, false);
      c.strokeStyle = alpha(mix(color, '#f7dfb0', 0.5), 0.3);
      c.lineWidth = 2.2;
      c.stroke();
    }

    // Loaded-brush drags following the contour.
    const rand = rngFor(900 + i);
    for (let k = 0; k < 5; k += 1) {
      const x0 = SKY_X0 + rand() * (SKY_X1 - SKY_X0);
      const len = 70 + rand() * 190;
      const yy = waveY(top + 6 + rand() * Math.max(4, bot - top) * 0.7, i, x0, t, ampScale);
      c.beginPath();
      c.moveTo(x0, yy);
      c.quadraticCurveTo(
        x0 + len * 0.5,
        yy + Math.sin(x0 * 0.006 + t * 0.6 + k) * 9,
        x0 + len,
        yy + Math.sin(x0 * 0.006 + t * 0.6 + k + 1.2) * 6,
      );
      c.strokeStyle = alpha(rand() > 0.42 ? mix(color, '#2c2f3a', 0.4) : mix(color, '#f9e2b6', 0.55), 0.16 + rand() * 0.2);
      c.lineWidth = 2.4 + rand() * 6;
      c.stroke();
    }
  }

  // Blue-grey paint dragged in from the upper left, as in the painting.
  drawSkyCold(c, t);

  // The sky breathes: two broad pale bands swell on the beat.
  if (pulse > 0.02) {
    c.globalAlpha = 0.075 * pulse;
    c.strokeStyle = '#f8d9a4';
    c.lineCap = 'round';
    for (const i of [3, 7]) {
      c.beginPath();
      c.moveTo(SKY_X0, waveY(BOUNDS[i], i, SKY_X0, t, ampScale));
      contour(c, BOUNDS[i], i, t, ampScale, false);
      c.lineWidth = 44;
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  c.restore();
}

function paintRibbon(c, x0, y0, x1, y1, w, bow, color, a, seed = 0) {
  const N = 18;
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i += 1) {
    const u = i / N;
    const x = lerp(x0, x1, u);
    const y = lerp(y0, y1, u)
      + Math.sin(u * Math.PI) * bow
      + Math.sin(u * 8 + seed) * Math.abs(bow) * 0.16;
    const taper = Math.pow(Math.sin(Math.PI * u), 0.4);
    const ww = w * (0.35 + 0.65 * taper) * (1 - 0.3 * u);
    top.push([x, y - ww * 0.5]);
    bot.push([x, y + ww * 0.5]);
  }
  c.beginPath();
  c.moveTo(top[0][0], top[0][1]);
  for (let i = 1; i <= N; i += 1) c.lineTo(top[i][0], top[i][1]);
  for (let i = N; i >= 0; i -= 1) c.lineTo(bot[i][0], bot[i][1]);
  c.closePath();
  c.fillStyle = alpha(color, a);
  c.fill();
}

function skySwath(c, color, base, i, x0, x1, thick, t) {
  const taper = (x) => Math.pow(clamp((x1 - x) / (x1 - x0)), 0.55);
  c.beginPath();
  for (let x = x0; x <= x1; x += 40) {
    const y = waveY(base, i, x, t, 1) - thick * 0.5 * taper(x);
    if (x === x0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  for (let x = x1; x >= x0; x -= 40) {
    c.lineTo(x, waveY(base, i, x, t, 1) + thick * 0.5 * taper(x));
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}

function drawSkyCold(c, t) {
  const rand = rngFor(443);

  // Cold paint dragged in from the left as opaque swaths, not veils.
  skySwath(c, '#6d7386', 250, 6, -920, 780, 58, t);
  skySwath(c, '#4b5265', 344, 10, -920, 1010, 76, t);
  skySwath(c, '#383f50', 150, 3, -920, 620, 52, t);
  skySwath(c, '#d4713a', 424, 13, -920, 1180, 26, t);
  skySwath(c, '#c85e2d', 60, 1, -920, 420, 40, t);

  // Fine drawn contours: the sky is also line work.
  for (let k = 0; k < 26; k += 1) {
    const i = Math.floor(rand() * 15);
    const span = BOUNDS[i + 1] - BOUNDS[i];
    const base = BOUNDS[i] + rand() * span;
    const x0 = -900 + rand() * 1150;
    const x1 = x0 + 200 + rand() * 900;
    const jit = (rand() - 0.5) * 6;
    const col = k % 4 === 3
      ? mix(BAND_COLORS[i], '#f7dfb0', 0.6)
      : mix(BAND_COLORS[i], '#2c2f3a', 0.62);
    c.beginPath();
    for (let x = x0; x <= x1; x += 34) {
      const y = waveY(base, i, x, t, 1)
        + Math.sin(x * 0.012 + k * 1.7) * 3 + jit;
      if (x === x0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = alpha(col, 0.42);
    c.lineWidth = 1.8 + rand() * 3;
    c.stroke();
  }

  // Long lines that cross every band, as in the painting.
  for (let k = 0; k < 3; k += 1) {
    c.beginPath();
    for (let x = -900; x <= 1650; x += 46) {
      const u = (x + 900) / 2550;
      const y = 380 - u * 300
        + Math.sin(u * Math.PI * 3.1 + k * 1.6) * (46 + k * 14)
        + k * 60
        + Math.sin(x * 0.01 + k * 2.3) * 12;
      if (x === -900) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = alpha(k % 2 ? '#2c2f3a' : '#8f3a22', 0.24);
    c.lineWidth = 3.4;
    c.stroke();
  }
}

// ---------------------------------------------------------------- bridge cache

function drawMid(g, c) {
  drawWater(c);
  drawFarRailing(c);
  drawDeck(c);
  drawRail(c);
  drawDaubs(c);
}

function drawWater(c) {
  c.save();
  c.fillStyle = '#2b303d';
  c.fillRect(-880, 462, 2640, 282);

  // Flat, irregular water bands: six broad strokes, not a grating.
  const WAVES = [
    [482, 9, '#7b8294', 0.3],
    [499, 12, '#3d4457', 0.5],
    [526, 20, '#575e71', 0.34],
    [560, 26, '#333a4b', 0.52],
    [600, 34, '#4a5164', 0.3],
    [648, 32, '#2f3647', 0.52],
    [692, 22, '#3f4658', 0.38],
  ];
  for (let i = 0; i < WAVES.length; i += 1) {
    const [base, h, col, a] = WAVES[i];
    c.beginPath();
    c.moveTo(-880, base);
    for (let x = -880; x <= 1760; x += 56) {
      c.lineTo(x, base + Math.sin(x * 0.0045 + i * 1.7) * 7
        + noise1(x * 0.006 + i, 91) * 9);
    }
    for (let x = 1760; x >= -880; x -= 56) {
      c.lineTo(x, base + h + Math.sin(x * 0.0045 + i * 1.7 + 0.4) * 7
        + noise1(x * 0.006 + i + 4, 91) * 9);
    }
    c.closePath();
    c.fillStyle = alpha(col, a);
    c.fill();
  }

  // Ochre reflections under the open water.
  const rand = rngFor(613);
  for (let i = 0; i < 9; i += 1) {
    const y = 560 + i * 19 + rand() * 5;
    const x0 = 590 + rand() * 180;
    const len = 120 + rand() * 260;
    c.beginPath();
    c.moveTo(x0, y);
    for (let k = 0; k <= 6; k += 1) {
      c.lineTo(x0 + (len * k) / 6, y + Math.sin(k * 0.9 + i) * 3);
    }
    c.strokeStyle = alpha(i % 3 === 0 ? '#b8522a' : '#e0a35c', 0.32 + rand() * 0.16);
    c.lineWidth = 3 + rand() * 3;
    c.stroke();
  }

  // Long flat water strokes: the fjord is paint, not a wall.
  const randW = rngFor(1517);
  for (let i = 0; i < 7; i += 1) {
    const y = 505 + randW() * 210;
    const x0 = -880 + randW() * 1700;
    const len = 160 + randW() * 520;
    paintRibbon(
      c, x0, y, x0 + len, y + (randW() - 0.5) * 10,
      4 + randW() * 7, (randW() - 0.5) * 20,
      i % 4 === 0 ? '#7d8496' : i % 4 === 1 ? '#3b4254' : '#5a6174',
      0.08 + randW() * 0.08, i * 1.9,
    );
  }

  // Two dark headlands, their shores sloping into the fjord.
  landMass(c, -880, 640, 466, 1, 130);
  landMass(c, 1010, 1760, 452, 2, -150);
  headlandStrikes(c, -860, 500, 466, 1);
  headlandStrikes(c, 1030, 1580, 452, 2);

  // A boat, almost a mark.
  c.fillStyle = '#e6cfab';
  c.beginPath();
  c.moveTo(438, 502);
  c.lineTo(440, 490);
  c.lineTo(447, 500);
  c.closePath();
  c.fill();
  c.strokeStyle = alpha('#1c1f28', 0.8);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(432, 503);
  c.lineTo(452, 503);
  c.stroke();
  c.strokeStyle = alpha('#e0a35c', 0.35);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(435, 510);
  c.lineTo(450, 510);
  c.stroke();

  // Deck far edge.
  c.beginPath();
  c.moveTo(-880, 731);
  for (let x = -880; x <= 1760; x += 60) {
    c.lineTo(x, 730 + Math.sin(x * 0.003 + 0.8) * 2.4);
  }
  c.strokeStyle = alpha('#efcd96', 0.75);
  c.lineWidth = 3;
  c.stroke();
  c.restore();
}

function headlandStrikes(c, x0, x1, ridge, seed) {
  const rand = rngFor(seed * 91);
  for (let i = 0; i < 12; i += 1) {
    const x = x0 + rand() * (x1 - x0 - 120);
    const top = ridge + Math.sin(x * 0.0055 + seed * 2.1) * 12
      + noise1(x * 0.011 + seed, 41) * 16;
    const y = top + 16 + rand() * 80;
    const len = 60 + rand() * 180;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y + (rand() - 0.5) * 10, x + len, y + (rand() - 0.5) * 6);
    c.strokeStyle = alpha(i % 3 === 0 ? '#3d4457' : '#5f6779', 0.22 + rand() * 0.14);
    c.lineWidth = 3 + rand() * 7;
    c.stroke();
  }
}

function landMass(c, x0, x1, ridge, seed, foot = 0) {
  const leftShore = x0 < 0;
  c.beginPath();
  if (leftShore) c.moveTo(x0, 742);
  else c.moveTo(x0 + foot, 742);
  for (let x = x0; x <= x1; x += 40) {
    c.lineTo(x, ridge + Math.sin(x * 0.0055 + seed * 2.1) * 12
      + noise1(x * 0.011 + seed, 41) * 16);
  }
  if (leftShore) c.lineTo(x1 + foot, 742);
  else c.lineTo(x1, 742);
  c.closePath();
  c.fillStyle = '#252a36';
  c.fill();

  // A lighter rim where the water catches the sky.
  c.beginPath();
  for (let x = x0; x <= x1; x += 40) {
    const y = ridge + Math.sin(x * 0.0055 + seed * 2.1) * 12
      + noise1(x * 0.011 + seed, 41) * 16;
    if (x === x0) c.moveTo(x, y + 3);
    else c.lineTo(x, y + 3);
  }
  c.strokeStyle = alpha('#6c7181', 0.45);
  c.lineWidth = 2;
  c.stroke();
}

function drawFarRailing(c) {
  const y = 724;
  c.save();
  c.strokeStyle = alpha('#2a221e', 0.55);
  c.lineWidth = 3;
  c.beginPath();
  for (let x = 620; x <= 1760; x += 58) {
    const yy = y + Math.sin(x * 0.006) * 1.6;
    if (x === 620) c.moveTo(x, yy);
    else c.lineTo(x, yy);
  }
  c.stroke();
  for (let x = 620; x <= 1760; x += 160) {
    c.beginPath();
    c.moveTo(x, y + 2);
    c.lineTo(x - 1, 739);
    c.stroke();
  }
  c.restore();
}

function seamY(k, x) {
  const base = DECK_FAR + 385 * Math.pow(k / 9, 1.5);
  return base - (x - 450) * 0.008 + Math.sin(x * 0.0035 + k * 1.4) * 2;
}

function drawDeck(c) {
  // Bridge planks: tight at the far edge, wide and heavy in the foreground.
  for (let k = 1; k <= 9; k += 1) {
    c.beginPath();
    c.moveTo(-880, seamY(k, -880));
    for (let x = -880; x <= 1760; x += 56) c.lineTo(x, seamY(k, x));
    c.strokeStyle = alpha('#6b4526', 0.42);
    c.lineWidth = 2.6;
    c.stroke();

    c.beginPath();
    c.moveTo(-880, seamY(k, -880) - 3);
    for (let x = -880; x <= 1760; x += 56) c.lineTo(x, seamY(k, x) - 3);
    c.strokeStyle = alpha('#e4c08a', 0.3);
    c.lineWidth = 1.4;
    c.stroke();
  }

  // Worn patches and grit on the deck.
  const rand = rngFor(97);
  for (let i = 0; i < 46; i += 1) {
    const x = -820 + rand() * 2500;
    const y = 745 + rand() * 380;
    const len = 12 + rand() * 40;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y + (rand() - 0.5) * 4, x + len, y + (rand() - 0.5) * 3);
    c.strokeStyle = alpha(rand() > 0.5 ? '#7a4d2b' : '#eccb95', 0.1 + rand() * 0.1);
    c.lineWidth = 1 + rand() * 2;
    c.stroke();
  }
}

function drawRail(c) {
  const ax = -880;
  const ay = 902;
  const bx = 366;
  const by = 566;
  const baseAy = 1120;
  const baseBy = 744;

  const railY = (u) => lerp(ay, by, u) + Math.sin(u * 6 + 0.4) * 2.4;
  const baseY = (u) => lerp(baseAy, baseBy, u);

  const railPts = [];
  for (let u = 0; u <= 1.0001; u += 0.02) {
    railPts.push({ x: lerp(ax, bx, u), y: railY(u) });
  }

  // Cast shadow along the deck, parallel to the rail.
  c.beginPath();
  railPts.forEach((p, i) => {
    const u = i / (railPts.length - 1);
    const yy = baseY(u) - 8;
    if (i === 0) c.moveTo(p.x + 20, yy);
    else c.lineTo(p.x + 20, yy);
  });
  c.strokeStyle = alpha('#2c2020', 0.16);
  c.lineWidth = 34;
  c.stroke();

  // Lower rail.
  drawRailStroke(c, railPts, 48, 8, '#3a2a22');
  drawRailStroke(c, railPts, 45, 5, '#96622f');

  // Heavy top rail.
  drawRailStroke(c, railPts, 0, 27, '#2e231e');
  drawRailStroke(c, railPts, -1, 21, '#b0763d');
  drawRailStroke(c, railPts, -6, 7, '#ecc78c');

  const postUs = [0.08, 0.31, 0.55, 0.79, 1];
  for (const u of postUs) {
    const px = lerp(ax, bx, u);
    const py = railY(u);
    const h = baseY(u) - py;
    const w = 20 - 9 * u;
    c.save();
    c.translate(px, py);
    c.beginPath();
    c.moveTo(-w / 2 - 2, 6);
    c.lineTo(-w / 2 + 1, h);
    c.lineTo(w / 2 - 1, h);
    c.lineTo(w / 2 + 2, 6);
    c.closePath();
    c.fillStyle = '#a56f3a';
    c.fill();
    c.strokeStyle = '#33241d';
    c.lineWidth = 2.6;
    c.stroke();
    c.beginPath();
    c.moveTo(-w / 2 + 4, h * 0.18);
    c.lineTo(-w / 2 + 5, h - 4);
    c.strokeStyle = alpha('#ecc78c', 0.6);
    c.lineWidth = 2.2;
    c.stroke();
    // Cap and bolt.
    c.fillStyle = '#d8a568';
    c.fillRect(-w / 2 - 4, -5, w + 8, 8);
    c.strokeStyle = '#33241d';
    c.lineWidth = 1.8;
    c.strokeRect(-w / 2 - 4, -5, w + 8, 8);
    c.fillStyle = '#3a2a20';
    c.beginPath();
    c.arc(0, 2, 1.8, 0, TAU);
    c.fill();
    c.restore();
  }

  // Roof of the rail continues beyond the last post, as a short return.
  c.beginPath();
  c.moveTo(bx - 2, by);
  c.lineTo(bx + 34, by - 10);
  c.strokeStyle = '#b0763d';
  c.lineWidth = 14;
  c.lineCap = 'round';
  c.stroke();
}

function drawRailStroke(c, pts, dy, width, color) {
  c.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) c.moveTo(p.x, p.y + dy);
    else c.lineTo(p.x, p.y + dy);
  });
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
}

function drawDaubs(c) {
  const rand = rngFor(2207);
  for (let i = 0; i < 120; i += 1) {
    const x = -840 + rand() * 2560;
    const y = 452 + rand() * 680;
    const len = 8 + rand() * 24;
    const light = rand() > 0.5;
    const col = y < 730
      ? (light ? '#7b8193' : '#1d2029')
      : (light ? '#e7c690' : '#7b4c29');
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + len * 0.5, y + (rand() - 0.5) * 6, x + len, y + (rand() - 0.5) * 4);
    c.strokeStyle = alpha(col, 0.06 + rand() * 0.08);
    c.lineWidth = 1.6 + rand() * 2.6;
    c.stroke();
  }
}

// ---------------------------------------------------------------- walkers

function drawWalkers(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const k = smoothstep(2.0, 2.4, ctx.local);
  const drift = ctx.local * 5.5;
  const people = [
    { x: 950, h: 104, ph: 0 },
    { x: 1004, h: 92, ph: 1.9 },
  ];

  for (const p of people) {
    const x = p.x - drift;
    const foot = 756;
    const step = Math.sin(t * 3.4 + p.ph);
    const hipY = foot - p.h * 0.44;
    const shoulderY = foot - p.h * 0.78;
    const headY = foot - p.h + 5;

    c.save();
    c.lineCap = 'round';

    // Legs.
    c.strokeStyle = '#23242e';
    c.lineWidth = 4.2;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(x, hipY);
      c.lineTo(x + s * 7.5 * step, foot);
      c.stroke();
    }

    // Coat.
    c.beginPath();
    c.moveTo(x - 8.5, hipY + 6);
    c.lineTo(x - 7.5, shoulderY);
    c.quadraticCurveTo(x, shoulderY - 8, x + 7.5, shoulderY);
    c.lineTo(x + 8.5, hipY + 6);
    c.closePath();
    c.fillStyle = '#454d60';
    c.fill();
    c.strokeStyle = '#141821';
    c.lineWidth = 1.8;
    c.stroke();

    // A coat highlight so the pair reads at distance.
    c.beginPath();
    c.moveTo(x - 6.4, shoulderY + 8);
    c.lineTo(x - 7, hipY + 2);
    c.strokeStyle = alpha('#a3aab9', 0.6);
    c.lineWidth = 2;
    c.stroke();

    // Head, turned towards the rider once the bell has rung.
    const hx = x - 1 - 3 * k;
    c.beginPath();
    c.arc(hx, headY, 6.6, 0, TAU);
    c.fillStyle = '#f0cfa0';
    c.fill();
    c.strokeStyle = '#2a201b';
    c.lineWidth = 1.4;
    c.stroke();
    // Dark hair, cut away from the face so the turn reads.
    c.fillStyle = '#2c2a2a';
    c.beginPath();
    c.arc(hx + 2.2, headY - 1.8, 5.8, Math.PI * 0.92, Math.PI * 2.05);
    c.fill();
    // Face dot: they are looking at the pelican.
    c.fillStyle = alpha('#1d1a1f', 0.55 + 0.35 * k);
    c.beginPath();
    c.arc(hx - 3.4, headY + 0.5, 1.2, 0, TAU);
    c.fill();
    c.restore();
  }
}

// ---------------------------------------------------------------- screamer

function drawScreamer(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const t = ctx.t;
  const pulse = pulseAt(local);
  const k = smoothstep(2.0, 2.4, local);
  const k2 = smoothstep(4.3, 5.2, local);
  const shake = Math.sin(t * 19) * 1.1 * (1 - k);

  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // The figure is built facing the viewer at x=190 and mirrored into the right
  // foreground so she faces the approaching pelican.
  c.translate(800, 0);
  c.scale(-1, 1);
  c.translate(-190, 0);

  // Shadow on the deck.
  c.fillStyle = alpha('#241b1c', 0.3);
  c.beginPath();
  c.ellipse(190, 932, 92, 13, 0, 0, TAU);
  c.fill();

  drawEcho(c, 196, 604, pulse, k, t);

  // ---- robe
  const robe = [
    [88, 934], [103, 898], [111, 860], [119, 822], [114, 786],
    [124, 754], [131, 720], [141, 692], [156, 673], [172, 664],
    [190, 679], [208, 664], [225, 673], [238, 691], [246, 721],
    [254, 756], [259, 796], [265, 838], [274, 878], [281, 914],
    [269, 934], [235, 941], [196, 934], [157, 942], [119, 938],
  ];
  c.beginPath();
  c.moveTo(robe[0][0], robe[0][1]);
  for (let i = 1; i < robe.length; i += 1) {
    const [x, y] = robe[i];
    c.lineTo(x, y + shake * 0.4);
  }
  c.closePath();
  c.fillStyle = '#2c2f3a';
  c.fill();
  c.strokeStyle = '#171a22';
  c.lineWidth = 3.4;
  c.stroke();

  // The robe is paint, not a silhouette: vertical wavy strokes.
  const rand = rngFor(313);
  c.save();
  c.clip();
  for (let i = 0; i < 26; i += 1) {
    const x = 108 + rand() * 162;
    const y = 676 + rand() * 250;
    const len = 40 + rand() * 110;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (rand() - 0.5) * 16, y + len * 0.5, x + (rand() - 0.5) * 10, y + len);
    c.strokeStyle = alpha(i % 4 === 0 ? '#4d5266' : '#1c1f29', 0.35 + rand() * 0.3);
    c.lineWidth = 2 + rand() * 5;
    c.stroke();
  }
  // One blood-red fold at the collar.
  c.beginPath();
  c.moveTo(160, 690);
  c.quadraticCurveTo(190, 712, 220, 690);
  c.quadraticCurveTo(192, 704, 168, 700);
  c.closePath();
  c.fillStyle = alpha('#8f3420', 0.55);
  c.fill();
  c.restore();

  // Rim light along the right side, the side facing the pelican.
  c.beginPath();
  c.moveTo(226, 672);
  c.quadraticCurveTo(252, 740, 254, 800);
  c.quadraticCurveTo(262, 862, 280, 916);
  c.strokeStyle = alpha('#f2c489', 0.62);
  c.lineWidth = 4.2;
  c.stroke();

  // ---- arms & hands (positions lerp from scream to startled)
  const shoulderL = [154, 688];
  const shoulderR = [228, 689];
  const handLs = [151, 614];
  const handRs = [225, 611];
  const handLk = [146, 748];
  const handRk = [236, 750];
  const ctrlLs = [128, 648];
  const ctrlRs = [252, 644];
  const ctrlLk = [138, 722];
  const ctrlRk = [246, 724];

  const handL = [lerp(handLs[0], handLk[0], k) + shake, lerp(handLs[1], handLk[1], k)];
  const handR = [lerp(handRs[0], handRk[0], k) - shake, lerp(handRs[1], handRk[1], k)];
  const ctrlL = [lerp(ctrlLs[0], ctrlLk[0], k), lerp(ctrlLs[1], ctrlLk[1], k)];
  const ctrlR = [lerp(ctrlRs[0], ctrlRk[0], k), lerp(ctrlRs[1], ctrlRk[1], k)];

  for (const side of [-1, 1]) {
    const sh = side < 0 ? shoulderL : shoulderR;
    const ctrl = side < 0 ? ctrlL : ctrlR;
    const hand = side < 0 ? handL : handR;
    c.beginPath();
    c.moveTo(sh[0], sh[1]);
    c.quadraticCurveTo(ctrl[0], ctrl[1], hand[0], hand[1]);
    c.strokeStyle = '#242732';
    c.lineWidth = 19;
    c.stroke();
    c.strokeStyle = alpha('#141821', 0.9);
    c.lineWidth = 15;
    c.stroke();
    // Sleeve highlight.
    c.beginPath();
    c.moveTo(sh[0] - side * 3, sh[1] + 6);
    c.quadraticCurveTo(ctrl[0] - side * 2, ctrl[1] + 4, hand[0] - side * 1, hand[1] + 4);
    c.strokeStyle = alpha('#596078', 0.3);
    c.lineWidth = 2.6;
    c.stroke();
  }

  // ---- head
  const hx = 190 + 7 * k + 5 * k2;
  const hy = 602 - 2 * k + shake;
  const rx = 33;
  const ry = 44;

  c.beginPath();
  c.moveTo(hx - rx, hy + 6);
  c.quadraticCurveTo(hx - rx - 2, hy - ry * 0.85, hx - 8, hy - ry);
  c.quadraticCurveTo(hx + rx * 0.9, hy - ry * 0.9, hx + rx, hy - 2);
  c.quadraticCurveTo(hx + rx * 0.95, hy + ry * 0.85, hx + 4, hy + ry);
  c.quadraticCurveTo(hx - rx * 0.85, hy + ry * 0.9, hx - rx, hy + 6);
  c.closePath();
  c.fillStyle = '#e3b97f';
  c.fill();
  c.strokeStyle = '#5c3a26';
  c.lineWidth = 2.6;
  c.stroke();

  // Olive shadow on the far cheek.
  c.beginPath();
  c.moveTo(hx - rx + 3, hy - 8);
  c.quadraticCurveTo(hx - 12, hy + 14, hx - 10, hy + ry * 0.8);
  c.quadraticCurveTo(hx - 22, hy + 9, hx - rx + 3, hy - 8);
  c.fillStyle = alpha('#a9834f', 0.6);
  c.fill();

  // Hair, a thin dark sweep along the crown.
  c.beginPath();
  c.moveTo(hx - 31, hy - 8);
  c.quadraticCurveTo(hx - 24, hy - ry - 2, hx + 4, hy - ry + 2);
  c.quadraticCurveTo(hx + 24, hy - ry + 8, hx + 28, hy - 22);
  c.quadraticCurveTo(hx + 14, hy - ry + 16, hx - 6, hy - ry + 14);
  c.quadraticCurveTo(hx - 22, hy - ry + 16, hx - 31, hy - 8);
  c.closePath();
  c.fillStyle = alpha('#2a2622', 0.9);
  c.fill();

  // Eyes: wide, hollow, tracking the pelican.
  const eyeL = [hx - 13 + 4 * k, hy - 13];
  const eyeR = [hx + 12 + 6 * k, hy - 14];
  for (const [i, e] of [eyeL, eyeR].entries()) {
    c.beginPath();
    c.ellipse(e[0], e[1], 8.5 + 1.6 * k, 10.5 + 1.4 * k, 0, 0, TAU);
    c.fillStyle = '#f4e4c6';
    c.fill();
    c.strokeStyle = alpha('#3d2b1f', 0.85);
    c.lineWidth = 1.3;
    c.stroke();
    c.beginPath();
    c.arc(e[0] + 2.4 + 2.6 * k, e[1] + 0.8, 3.6, 0, TAU);
    c.fillStyle = '#1b1720';
    c.fill();
    // Brow: low and knotted while screaming, lifted when startled.
    c.beginPath();
    c.moveTo(e[0] - 9, e[1] - 15 - 3 * k);
    c.quadraticCurveTo(e[0], e[1] - 19 - 4 * k, e[0] + 8, e[1] - 14 - 5 * k);
    c.strokeStyle = '#33261c';
    c.lineWidth = 2.2;
    c.stroke();
    if (i === 1) {
      // A small catchlight so the face survives the grain.
      c.fillStyle = alpha('#ffffff', 0.75);
      c.beginPath();
      c.arc(e[0] + 4 + 2.6 * k, e[1] - 2.4, 1.1, 0, TAU);
      c.fill();
    }
  }

  // Nose and cheek lines.
  c.strokeStyle = alpha('#6d4a2e', 0.75);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(hx + 1, hy - 4);
  c.quadraticCurveTo(hx + 5, hy + 4, hx, hy + 8);
  c.stroke();
  c.beginPath();
  c.moveTo(hx - 20, hy + 16);
  c.quadraticCurveTo(hx - 16, hy + 26, hx - 10, hy + 30);
  c.stroke();
  c.beginPath();
  c.moveTo(hx + 21, hy + 14);
  c.quadraticCurveTo(hx + 17, hy + 25, hx + 10, hy + 30);
  c.stroke();

  // Mouth: the whole gag lives here.
  const mrx = lerp(15.5, 8.5, k) + pulse * 1.4;
  const mry = lerp(25, 10.5, k) + pulse * 2.2;
  const mx = hx + 2 + 1.5 * k;
  const my = hy + 26;
  c.beginPath();
  c.ellipse(mx, my, mrx, mry, 0, 0, TAU);
  c.fillStyle = '#191522';
  c.fill();
  c.strokeStyle = alpha('#5b3324', 0.9);
  c.lineWidth = 2;
  c.stroke();
  if (k < 0.7) {
    // Tongue of a scream, not a smile.
    c.beginPath();
    c.ellipse(mx, my + mry * 0.45, mrx * 0.55, mry * 0.3, 0, 0, TAU);
    c.fillStyle = alpha('#8d3a2c', 0.55);
    c.fill();
  }

  // ---- hands in front of the face
  if (k < 0.5) {
    const a = 1 - k * 2;
    drawHand(c, handL[0], handL[1], -0.18, a);
    drawHand(c, handR[0], handR[1], 0.18, a);
  } else {
    const a = (k - 0.5) * 2;
    drawFist(c, handL[0], handL[1] - 2, a);
    drawFist(c, handR[0], handR[1] - 2, a);
  }

  c.restore();
}

function drawHand(c, x, y, rot, a) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = clamp(a);
  c.beginPath();
  c.moveTo(-8, -20);
  c.quadraticCurveTo(1, -26, 9, -18);
  c.quadraticCurveTo(12, -4, 8, 12);
  c.quadraticCurveTo(0, 18, -8, 12);
  c.quadraticCurveTo(-12, -4, -8, -20);
  c.closePath();
  c.fillStyle = '#2a2d39';
  c.fill();
  c.strokeStyle = '#141821';
  c.lineWidth = 2.4;
  c.stroke();
  // Fingers along the cheek.
  c.strokeStyle = alpha('#5b6078', 0.7);
  c.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(-4, -14 + i * 9);
    c.quadraticCurveTo(3, -12 + i * 9, 7, -8 + i * 9);
    c.stroke();
  }
  c.restore();
}

function drawFist(c, x, y, a) {
  c.save();
  c.globalAlpha = clamp(a);
  c.fillStyle = '#2a2d39';
  c.strokeStyle = '#141821';
  c.lineWidth = 2.4;
  c.beginPath();
  c.ellipse(x, y, 11, 13, -0.2, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = alpha('#5b6078', 0.6);
  c.lineWidth = 1.8;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(x - 7, y - 5 + i * 6);
    c.lineTo(x + 6, y - 6 + i * 6);
    c.stroke();
  }
  c.restore();
}

function drawEcho(c, cx, cy, pulse, k, t) {
  const strength = 0.6 - 0.36 * k;
  c.save();
  for (let i = 0; i < 3; i += 1) {
    const r0 = 82 + i * 33 + pulse * 9;
    c.beginPath();
    const A0 = -3.05;
    const A1 = 1.05;
    for (let a = 0; a <= 54; a += 1) {
      const ang = A0 + (a / 54) * (A1 - A0);
      const rr = r0 + Math.sin(ang * 2.3 + t * 1.5 + i * 1.4) * (9 + i * 5)
        + noise1(a * 0.7 + i * 5, 71) * 7;
      const x = cx + Math.cos(ang) * rr * 1.04;
      const y = cy + Math.sin(ang) * rr * 0.94;
      if (a === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.strokeStyle = alpha(i === 1 ? '#b64925' : '#f0b35a', strength * (1 - i * 0.14));
    c.lineWidth = 6.4 - i * 1.2;
    c.lineCap = 'round';
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- bell

function drawBell(g, ctx) {
  const c = g.drawingContext;
  const bx = 573;
  const by = 646;
  const env = ringAt(ctx.local);
  const pulse = pulseAt(ctx.local);

  if (env > 0.01) {
    c.save();
    for (let i = 0; i < 3; i += 1) {
      const r = 18 + i * 16 + (1 - env) * 30;
      c.beginPath();
      c.arc(bx + 2, by - 12, r, -2.6, 0.35);
      c.strokeStyle = alpha('#f6d9a0', env * (0.8 - i * 0.18));
      c.lineWidth = 2.4;
      c.stroke();
    }
    c.restore();
  }

  // Bell itself.
  c.save();
  c.strokeStyle = '#3a2a20';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(bx - 6, by + 2);
  c.lineTo(bx - 13, by + 12);
  c.stroke();
  c.translate(bx, by);
  c.scale(1.9, 1.9);
  c.beginPath();
  c.moveTo(-8, -2);
  c.quadraticCurveTo(-7, -14, 0, -15);
  c.quadraticCurveTo(7, -14, 8, -2);
  c.closePath();
  c.fillStyle = '#e0b05a';
  c.fill();
  c.strokeStyle = '#3a2a20';
  c.lineWidth = 1.8;
  c.stroke();
  c.fillStyle = '#f6dc9e';
  c.beginPath();
  c.ellipse(-3, -9, 2.2, 3.6, -0.4, 0, TAU);
  c.fill();
  c.strokeStyle = '#3a2a20';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(9, -3);
  c.lineTo(13, -7);
  c.stroke();
  c.fillStyle = '#3a2a20';
  c.beginPath();
  c.arc(0, -1, 1.4, 0, TAU);
  c.fill();
  c.restore();

  // A tiny ochre flick on the beat, kept off the water so no disc shows.
  if (pulse > 0.3) {
    c.save();
    c.globalAlpha = 0.5 * pulse;
    c.fillStyle = '#f6d9a0';
    c.beginPath();
    c.arc(bx + 2, by - 12, 3.2, 0, TAU);
    c.fill();
    c.restore();
  }
}

// ---------------------------------------------------------------- title

function drawScreamTitle(g, opacity, lift) {
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

  const px = x - 26 * s;
  const py = baseY - 104 * s;
  const pw = 620 * s;
  const ph = 166 * s;

  // Wavy orange/black panel.
  c.beginPath();
  for (let i = 0; i <= 22; i += 1) {
    const xx = px + (i / 22) * pw;
    c.lineTo(xx, py + Math.sin(i * 0.85) * 5 * s + Math.sin(i * 2.1) * 2 * s);
  }
  for (let i = 22; i >= 0; i -= 1) {
    const xx = px + (i / 22) * pw;
    c.lineTo(xx, py + ph + Math.sin(i * 0.75 + 1.2) * 5 * s + Math.sin(i * 1.9) * 2 * s);
  }
  c.closePath();
  c.fillStyle = alpha('#20232c', 0.9);
  c.fill();
  c.strokeStyle = alpha('#f0b35a', 0.7);
  c.lineWidth = 2 * s;
  c.stroke();

  c.save();
  c.clip();
  // Orange bands inside the panel, weighted to the right of the text.
  const bands = [
    { fy: 0.2, w: 9, col: '#d4692e', a: 0.85 },
    { fy: 0.34, w: 4, col: '#b64925', a: 0.8 },
    { fy: 0.5, w: 14, col: '#d4692e', a: 0.9 },
    { fy: 0.64, w: 4, col: '#f0b35a', a: 0.65 },
    { fy: 0.8, w: 8, col: '#b64925', a: 0.8 },
  ];
  for (const b of bands) {
    c.beginPath();
    for (let i = 0; i <= 30; i += 1) {
      const xx = px + pw * 0.52 + (i / 30) * pw * 0.46;
      const yy = py + ph * b.fy + Math.sin(i * 0.7 + b.fy * 6) * 8 * s;
      if (i === 0) c.moveTo(xx, yy);
      else c.lineTo(xx, yy);
    }
    c.strokeStyle = alpha(b.col, b.a);
    c.lineWidth = b.w * s;
    c.stroke();
  }

  // A small screaming mouth mark at the right edge.
  c.beginPath();
  c.ellipse(px + pw - 82 * s, py + ph * 0.58, 12 * s, 25 * s, 0.12, 0, TAU);
  c.fillStyle = '#171a22';
  c.fill();
  c.strokeStyle = alpha('#f0b35a', 0.95);
  c.lineWidth = 2.4 * s;
  c.stroke();
  c.restore();

  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 8 * s;

  setFont(c, 13 * s, 600, EN_FONT, '3px');
  c.fillStyle = alpha('#f0b35a', 0.95);
  c.fillText('13  /  20', x, baseY - 70 * s);

  setFont(c, 38 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#f7e3c4';
  c.fillText('呐喊', x, baseY - 23 * s);

  setFont(c, 17 * s, 500, EN_FONT, '2.4px');
  c.fillStyle = alpha('#f7e3c4', 0.85);
  c.fillText('THE SCREAM', x, baseY + 7 * s);

  setFont(c, 14 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha('#f0b35a', 0.98);
  c.fillText('1893 · 蒙克', x, baseY + 34 * s);

  c.shadowColor = 'transparent';
  c.restore();
}
