// 7 — Maya codex. One bark-paper screenfold page with glyph columns, red frame
// rules and flat codical linework. The pelican rides a glyph-bicycle in strict
// profile; a seated scribe deity watches. A thirteen-place bar-and-dot counter
// in the right margin records pedal revolutions and rolls over on the downbeat;
// the rabbit scribe taps it every second. Counter and rabbit are quantised to
// 10 Hz; the page itself is a cached painting.

import { basePalette } from './_placeholder.js';
import { alpha, mix } from '../kit/color.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { paperCanvas } from '../kit/texture.js';
import { clamp, rngFor, smoothstep, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { SPEED } from '../kit/road.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const BARK = '#c8a06a';
const BARK_D = '#b08653';
const RED = '#a8492f';
const RED_D = '#8d3a25';
const BLACK = '#2a1710';
const CREAM = '#f0d7a2';
const BODY = '#f4e0b4';
const JADE = '#2f7d76';

const PAGE_L = -338;
const PAGE_R = 1298;
const FOLD = 692;
const FRAME = { x: -296, y: 64, w: 1552, h: 872 };
const TOP_BAND = 216;
const FRIEZE_Y = 884;
const GROUND_BAND = { y: 786, h: 98 };
const PANEL = { x: 800, y: 240, w: 188, h: 400 };
const COUNT_X = 894;
const RING = { x: 894, y: 542, r: 38 };

const pal = basePalette({
  bg: BARK,
  bg2: BARK_D,
  motif: RED,
  accent: RED,
  ink: BLACK,
  titleInk: BLACK,
  ground: '#b88f58',
  road: '#b07e4d',
  dash: CREAM,
  body: BODY,
  beak: '#d9a25a',
  rigInk: BLACK,
  scrim: BARK,
});

export default {
  id: 's07',
  number: 7,
  cn: '玛雅抄本',
  en: 'Maya Codex',
  year: '约1200 · 抄本页',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const layer = cachedLayer(ctx, 's07-codex-page', drawPage);
    c.drawImage(layer.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);

    drawGroundScroll(g, ctx);
    drawCodexRider(g, ctx);
    drawCounter(g, ctx);
    drawRabbit(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawMayaTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- primitives

function line(c, x1, y1, x2, y2, color, w) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

function poly(c, pts, fill, stroke, w = 3) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.lineJoin = 'round';
    c.stroke();
  }
}

function disc(c, x, y, r, fill, stroke = null, w = 2.4) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = w;
    c.stroke();
  }
}

// A blocky codical glyph inside a box. Eight invented forms, three inks.
function drawGlyph(c, kind, x, y, w, h, tone = 'black') {
  const main = tone === 'red' ? RED : tone === 'jade' ? JADE : BLACK;
  const spare = tone === 'black' ? RED : BLACK;
  const lw = Math.max(2, w * 0.075);
  c.save();
  c.lineCap = 'butt';
  c.lineJoin = 'miter';
  c.strokeStyle = main;
  c.fillStyle = main;

  switch (kind % 8) {
    case 0: {
      // Stepped fret.
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(x + w * 0.12, y + h * 0.12);
      c.lineTo(x + w * 0.88, y + h * 0.12);
      c.lineTo(x + w * 0.88, y + h * 0.88);
      c.lineTo(x + w * 0.34, y + h * 0.88);
      c.lineTo(x + w * 0.34, y + h * 0.5);
      c.lineTo(x + w * 0.64, y + h * 0.5);
      c.lineTo(x + w * 0.64, y + h * 0.7);
      c.stroke();
      break;
    }
    case 1: {
      // Bar-and-dot cluster.
      c.fillRect(x + w * 0.14, y + h * 0.42, w * 0.72, h * 0.13);
      c.fillRect(x + w * 0.14, y + h * 0.66, w * 0.72, h * 0.13);
      disc(c, x + w * 0.5, y + h * 0.2, w * 0.1, spare);
      break;
    }
    case 2: {
      // Eye glyph.
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(x + w * 0.1, y + h * 0.5);
      c.quadraticCurveTo(x + w * 0.5, y + h * 0.18, x + w * 0.9, y + h * 0.5);
      c.quadraticCurveTo(x + w * 0.5, y + h * 0.82, x + w * 0.1, y + h * 0.5);
      c.stroke();
      disc(c, x + w * 0.5, y + h * 0.5, w * 0.13, main);
      for (let i = 0; i < 3; i += 1) {
        c.beginPath();
        c.moveTo(x + w * (0.3 + i * 0.2), y + h * 0.25);
        c.lineTo(x + w * (0.3 + i * 0.2), y + h * 0.1);
        c.stroke();
      }
      break;
    }
    case 3: {
      // Comb / feather glyph.
      c.fillRect(x + w * 0.1, y + h * 0.24, w * 0.8, h * 0.15);
      for (let i = 0; i < 4; i += 1) {
        c.fillRect(x + w * (0.16 + i * 0.19), y + h * 0.42, w * 0.1, h * 0.44);
      }
      break;
    }
    case 4: {
      // Shell with inner coil.
      c.lineWidth = lw;
      c.strokeRect(x + w * 0.16, y + h * 0.16, w * 0.68, h * 0.68);
      c.beginPath();
      c.arc(x + w * 0.5, y + h * 0.5, w * 0.2, -0.4, Math.PI * 1.3);
      c.stroke();
      break;
    }
    case 5: {
      // Quincunx of dots.
      const pts = [[0.5, 0.5], [0.18, 0.2], [0.82, 0.2], [0.18, 0.8], [0.82, 0.8]];
      pts.forEach(([px, py], i) => {
        disc(c, x + w * px, y + h * py, w * (i === 0 ? 0.11 : 0.075), i === 2 ? spare : main);
      });
      break;
    }
    case 6: {
      // Hooked bird head.
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(x + w * 0.16, y + h * 0.7);
      c.quadraticCurveTo(x + w * 0.2, y + h * 0.2, x + w * 0.56, y + h * 0.22);
      c.quadraticCurveTo(x + w * 0.86, y + h * 0.26, x + w * 0.78, y + h * 0.5);
      c.lineTo(x + w * 0.6, y + h * 0.44);
      c.quadraticCurveTo(x + w * 0.44, y + h * 0.6, x + w * 0.4, y + h * 0.84);
      c.stroke();
      disc(c, x + w * 0.58, y + h * 0.38, w * 0.05, spare);
      break;
    }
    default: {
      // Four-point star.
      c.beginPath();
      c.moveTo(x + w * 0.5, y + h * 0.06);
      c.lineTo(x + w * 0.62, y + h * 0.4);
      c.lineTo(x + w * 0.94, y + h * 0.5);
      c.lineTo(x + w * 0.62, y + h * 0.6);
      c.lineTo(x + w * 0.5, y + h * 0.94);
      c.lineTo(x + w * 0.38, y + h * 0.6);
      c.lineTo(x + w * 0.06, y + h * 0.5);
      c.lineTo(x + w * 0.38, y + h * 0.4);
      c.closePath();
      c.fill();
      disc(c, x + w * 0.5, y + h * 0.5, w * 0.08, spare);
      break;
    }
  }
  c.restore();
}

// ---------------------------------------------------------------- page

function drawPage(g, c) {
  const rand = rngFor(707);

  c.fillStyle = BARK;
  c.fillRect(CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  const paper = paperCanvas(1500, 840, {
    tone: BARK, seed: 7071, fiber: 9000, specks: 18000,
  });
  c.globalAlpha = 0.94;
  c.drawImage(paper, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
  c.globalAlpha = 1;

  drawPageEdges(c, rand);
  drawCrease(c);
  drawFrame(c);
  drawGlyphBands(c, rand);
  drawDeity(c, rand);
  drawCounterPanel(c, rand);
  drawGroundBand(c, rand);
  drawWear(c, rand);
}

function drawPageEdges(c, rand) {
  const dark = mix(BARK_D, BLACK, 0.42);

  // Surface the folded sheet sits on.
  c.fillStyle = dark;
  c.fillRect(CACHE.x0, CACHE.y0, PAGE_L - CACHE.x0, CACHE.h);
  c.fillRect(PAGE_R, CACHE.y0, CACHE.x0 + CACHE.w - PAGE_R, CACHE.h);

  // Cut page edges: a lighter fibrous core then a hairline shadow.
  c.fillStyle = mix(BARK, CREAM, 0.18);
  c.fillRect(PAGE_L - 8, CACHE.y0, 8, CACHE.h);
  c.fillRect(PAGE_R, CACHE.y0, 8, CACHE.h);
  line(c, PAGE_L - 8, CACHE.y0, PAGE_L - 8, CACHE.y0 + CACHE.h, alpha(BLACK, 0.5), 1.4);
  line(c, PAGE_R + 8, CACHE.y0, PAGE_R + 8, CACHE.y0 + CACHE.h, alpha(BLACK, 0.5), 1.4);
  line(c, PAGE_L, CACHE.y0, PAGE_L, CACHE.y0 + CACHE.h, alpha(BLACK, 0.32), 1.2);
  line(c, PAGE_R, CACHE.y0, PAGE_R, CACHE.y0 + CACHE.h, alpha(BLACK, 0.32), 1.2);

  // Deckle flecks along the cut edges.
  c.fillStyle = alpha(CREAM, 0.3);
  for (let i = 0; i < 90; i += 1) {
    const y = CACHE.y0 + rand() * CACHE.h;
    c.fillRect(PAGE_L - 10 + rand() * 8, y, 1 + rand() * 2, 2 + rand() * 6);
    c.fillRect(PAGE_R + 1 + rand() * 8, y, 1 + rand() * 2, 2 + rand() * 6);
  }
}

function drawCrease(c) {
  // One fold: a soft valley shadow with a worn highlight on the near side.
  const gr = c.createLinearGradient(FOLD - 14, 0, FOLD + 26, 0);
  gr.addColorStop(0, alpha(BLACK, 0));
  gr.addColorStop(0.4, alpha(BLACK, 0.14));
  gr.addColorStop(0.55, alpha(BLACK, 0.05));
  gr.addColorStop(1, alpha(BLACK, 0));
  c.fillStyle = gr;
  c.fillRect(FOLD - 14, CACHE.y0, 40, CACHE.h);

  line(c, FOLD, CACHE.y0, FOLD, CACHE.y0 + CACHE.h, alpha(BLACK, 0.42), 1.8);
  line(c, FOLD - 2.2, CACHE.y0, FOLD - 2.2, CACHE.y0 + CACHE.h, alpha(CREAM, 0.34), 1.2);

  // The right leaf catches slightly more light.
  c.fillStyle = alpha(CREAM, 0.045);
  c.fillRect(FOLD + 3, CACHE.y0, PAGE_R - FOLD, CACHE.h);
  c.fillStyle = alpha(BLACK, 0.03);
  c.fillRect(PAGE_L, CACHE.y0, FOLD - PAGE_L, CACHE.h);
}

function drawFrame(c) {
  const F = FRAME;
  c.save();
  c.lineJoin = 'miter';
  c.strokeStyle = RED;
  c.lineWidth = 8;
  c.strokeRect(F.x, F.y, F.w, F.h);
  c.strokeStyle = BLACK;
  c.lineWidth = 2;
  c.strokeRect(F.x + 12, F.y + 12, F.w - 24, F.h - 24);
  c.strokeStyle = alpha(RED, 0.8);
  c.lineWidth = 2.2;
  c.strokeRect(F.x + 19, F.y + 19, F.w - 38, F.h - 38);

  // Register rules.
  c.strokeStyle = RED;
  c.lineWidth = 5;
  line(c, F.x + 8, TOP_BAND, F.x + F.w - 8, TOP_BAND, RED, 5);
  line(c, F.x + 8, FRIEZE_Y, F.x + F.w - 8, FRIEZE_Y, RED, 4);
  line(c, F.x + 8, TOP_BAND + 6, F.x + F.w - 8, TOP_BAND + 6, alpha(BLACK, 0.45), 1.2);

  // Corner frets.
  const corners = [
    [F.x + 19, F.y + 19, 1, 1],
    [F.x + F.w - 19, F.y + 19, -1, 1],
    [F.x + 19, F.y + F.h - 19, 1, -1],
    [F.x + F.w - 19, F.y + F.h - 19, -1, -1],
  ];
  corners.forEach(([x, y, sx, sy]) => {
    c.strokeStyle = BLACK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, y + sy * 26);
    c.lineTo(x, y);
    c.lineTo(x + sx * 26, y);
    c.stroke();
    c.fillStyle = RED;
    c.fillRect(x + (sx > 0 ? 6 : -14), y + (sy > 0 ? 6 : -14), 8, 8);
  });
  c.restore();
}

function drawGlyphBands(c, rand) {
  const F = FRAME;

  // Top band: three rows of glph columns, as a codex ruling.
  const x0 = F.x + 24;
  const x1 = F.x + F.w - 24;
  for (let x = x0, col = 0; x + 40 < x1; x += 58, col += 1) {
    const tones = [];
    for (let r = 0; r < 3; r += 1) {
      const pick = rand();
      tones.push(pick > 0.84 ? 'red' : pick > 0.78 ? 'jade' : 'black');
    }
    const kinds = [
      Math.floor(rand() * 8),
      Math.floor(rand() * 8),
      Math.floor(rand() * 8),
    ];
    for (let r = 0; r < 3; r += 1) {
      drawGlyph(c, kinds[r], x, F.y + 30 + r * 44, 40, 36, tones[r]);
    }
    if (col % 4 === 3) {
      line(c, x + 49, F.y + 26, x + 49, TOP_BAND - 26, alpha(RED, 0.5), 1.6);
    }
  }

  // Left margin: a tall column of larger glyphs.
  const leftKinds = [0, 5, 2, 1, 4];
  leftKinds.forEach((k, i) => {
    drawGlyph(c, k, F.x + 22, 236 + i * 96, 86, 82, i === 2 ? 'red' : 'black');
  });

  // Right margin: its own column, so the page is ruled both sides.
  const rightKinds = [7, 3, 0, 6];
  rightKinds.forEach((k, i) => {
    drawGlyph(c, k, 1064, 250 + i * 100, 84, 76, i === 1 ? 'jade' : 'black');
  });

  // Small captions above the scribe.
  drawGlyph(c, 2, 152, 396, 40, 38, 'black');
  drawGlyph(c, 0, 196, 396, 40, 38, 'red');
  drawGlyph(c, 5, 152, 440, 40, 38, 'black');

  // A caption band across the empty sky of the left page, ruling it like a
  // text column rather than leaving a brown field.
  const capY = 286;
  const capKinds = [7, 2, 1, 4, 0, 5, 3];
  capKinds.forEach((k, i) => {
    drawGlyph(c, k, -104 + i * 46, capY, 34, 32, i === 3 ? 'red' : i === 5 ? 'jade' : 'black');
  });
  line(c, -108, capY + 44, 226, capY + 44, alpha(RED, 0.7), 2.6);
  line(c, -108, capY + 48, 226, capY + 48, alpha(BLACK, 0.3), 1);

  // Narrow column against the fold on the right leaf.
  drawGlyph(c, 3, 712, 250, 54, 70, 'black');
  drawGlyph(c, 1, 712, 344, 54, 70, 'red');
  drawGlyph(c, 6, 712, 438, 54, 70, 'black');

  // Small column under the margin glyphs, right of the rabbit.
  drawGlyph(c, 4, 1064, 560, 72, 72, 'black');
  drawGlyph(c, 7, 1064, 656, 72, 72, 'red');
  drawGlyph(c, 0, 1064, 752, 72, 72, 'black');

  // Bottom frieze: a repeated glyph beat under the main register.
  for (let x = F.x + 26, i = 0; x < F.x + F.w - 44; x += 54, i += 1) {
    drawGlyph(c, (i * 3 + 1) % 8, x, FRIEZE_Y + 12, 30, 27, i % 5 === 2 ? 'red' : 'black');
  }
}

// ---------------------------------------------------------------- scribe deity

function drawDeity(c, rand) {
  const bx = 218;

  // Glyph bench.
  poly(c, [
    { x: bx - 104, y: 792 }, { x: bx + 96, y: 792 },
    { x: bx + 104, y: 812 }, { x: bx - 112, y: 812 },
  ], BLACK, null);
  c.fillStyle = RED;
  c.fillRect(bx - 76, 796, 20, 10);
  c.fillRect(bx - 44, 796, 42, 5);
  c.fillRect(bx + 6, 798, 8, 8);

  // Seated in profile: the far leg folds under, the near thigh comes forward
  // and the shin drops to a flat foot.
  c.lineCap = 'round';
  const legs = [
    { hip: { x: bx + 2, y: 692 }, knee: { x: bx - 22, y: 758 }, foot: { x: bx + 20, y: 782 }, w: 27, col: mix(RED, BLACK, 0.32) },
    { hip: { x: bx + 10, y: 686 }, knee: { x: bx + 68, y: 742 }, foot: { x: bx + 56, y: 784 }, w: 34, col: RED },
  ];
  legs.forEach((L, i) => {
    c.strokeStyle = BLACK;
    c.lineWidth = L.w + 10;
    c.beginPath();
    c.moveTo(L.hip.x, L.hip.y);
    c.quadraticCurveTo(L.knee.x, L.knee.y - 14, L.knee.x, L.knee.y);
    c.quadraticCurveTo(L.knee.x + 2, L.knee.y + 22, L.foot.x, L.foot.y);
    c.stroke();
    c.strokeStyle = L.col;
    c.lineWidth = L.w;
    c.beginPath();
    c.moveTo(L.hip.x, L.hip.y);
    c.quadraticCurveTo(L.knee.x, L.knee.y - 14, L.knee.x, L.knee.y);
    c.quadraticCurveTo(L.knee.x + 2, L.knee.y + 22, L.foot.x, L.foot.y);
    c.stroke();
    disc(c, L.knee.x, L.knee.y - 4, i === 1 ? 7 : 5.4, JADE, BLACK, 2.2);
  });

  // Folded feet, resting flat on the bench.
  c.fillStyle = BLACK;
  c.beginPath();
  c.roundRect(bx + 44, 778, 34, 12, 5);
  c.fill();
  c.beginPath();
  c.roundRect(bx + 4, 780, 30, 11, 5);
  c.fill();

  // Torso with red body paint and a shell pendant.
  poly(c, [
    { x: bx - 40, y: 692 }, { x: bx + 34, y: 692 },
    { x: bx + 42, y: 616 }, { x: bx + 30, y: 588 },
    { x: bx - 24, y: 590 }, { x: bx - 42, y: 622 },
  ], BODY, BLACK, 4);
  poly(c, [
    { x: bx - 36, y: 664 }, { x: bx + 30, y: 652 },
    { x: bx + 24, y: 620 }, { x: bx - 32, y: 636 },
  ], RED, null);
  // Jade necklace.
  for (let i = 0; i < 5; i += 1) {
    disc(c, bx - 18 + i * 11, 646 + Math.abs(i - 2) * 2.5, 4.6, JADE, BLACK, 1.4);
  }
  disc(c, bx + 2, 670, 7, CREAM, BLACK, 2);

  // Far arm: bent low, steadying the open page.
  c.strokeStyle = BLACK;
  c.lineWidth = 17;
  c.beginPath();
  c.moveTo(bx + 12, 606);
  c.quadraticCurveTo(bx + 4, 656, bx + 26, 694);
  c.stroke();
  c.strokeStyle = mix(BODY, RED, 0.3);
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(bx + 12, 606);
  c.quadraticCurveTo(bx + 4, 656, bx + 26, 694);
  c.stroke();

  // Armbands and a red shoulder patch.
  c.fillStyle = RED;
  c.fillRect(bx + 26, 618, 8, 14);
  c.fillRect(bx + 6, 646, 8, 12);
  poly(c, [
    { x: bx - 40, y: 610 }, { x: bx - 12, y: 602 },
    { x: bx - 16, y: 624 }, { x: bx - 40, y: 632 },
  ], alpha(RED, 0.9), null);

  // Near arm, raised with a reed pen.
  c.strokeStyle = BLACK;
  c.lineWidth = 19;
  c.beginPath();
  c.moveTo(bx + 30, 610);
  c.quadraticCurveTo(bx + 62, 644, bx + 52, 682);
  c.stroke();
  c.strokeStyle = BODY;
  c.lineWidth = 11;
  c.beginPath();
  c.moveTo(bx + 30, 610);
  c.quadraticCurveTo(bx + 62, 644, bx + 52, 682);
  c.stroke();
  disc(c, bx + 52, 682, 6, RED, BLACK, 2);

  // Open page on the lap, with glyph bars.
  c.save();
  c.translate(bx + 34, 704);
  c.rotate(-0.12);
  c.fillStyle = CREAM;
  c.fillRect(-24, -8, 62, 34);
  c.strokeStyle = BLACK;
  c.lineWidth = 2.4;
  c.strokeRect(-24, -8, 62, 34);
  c.fillStyle = BLACK;
  c.fillRect(-16, 0, 20, 3.5);
  c.fillRect(-16, 8, 34, 3.5);
  c.fillRect(-16, 16, 26, 3.5);
  c.restore();

  // Reed pen.
  line(c, bx + 52, 682, bx + 78, 710, BLACK, 4);
  c.fillStyle = RED;
  c.beginPath();
  c.moveTo(bx + 78, 710);
  c.lineTo(bx + 86, 720);
  c.lineTo(bx + 74, 716);
  c.closePath();
  c.fill();

  // Head: strict profile, long nose, sloping forehead.
  const hx = bx + 16;
  const hy = 560;
  poly(c, [
    { x: hx - 30, y: hy + 8 }, { x: hx - 28, y: hy - 22 },
    { x: hx - 4, y: hy - 36 }, { x: hx + 18, y: hy - 28 },
    { x: hx + 26, y: hy - 12 }, { x: hx + 40, y: hy + 4 },
    { x: hx + 40, y: hy + 12 }, { x: hx + 26, y: hy + 12 },
    { x: hx + 24, y: hy + 26 }, { x: hx + 6, y: hy + 32 },
    { x: hx - 18, y: hy + 28 },
  ], BODY, BLACK, 4);

  // Hair and face paint.
  poly(c, [
    { x: hx - 30, y: hy + 8 }, { x: hx - 28, y: hy - 22 },
    { x: hx - 4, y: hy - 36 }, { x: hx + 6, y: hy - 26 },
    { x: hx - 2, y: hy - 6 }, { x: hx - 20, y: hy + 2 },
  ], BLACK, null);
  c.fillStyle = alpha(RED, 0.9);
  c.fillRect(hx + 2, hy + 8, 18, 10);

  // Eye, brow, mouth.
  c.lineWidth = 2.6;
  c.strokeStyle = BLACK;
  c.beginPath();
  c.moveTo(hx + 2, hy - 8);
  c.quadraticCurveTo(hx + 13, hy - 13, hx + 23, hy - 6);
  c.stroke();
  disc(c, hx + 12, hy - 4, 3.4, BLACK);
  line(c, hx + 26, hy + 16, hx + 36, hy + 16, BLACK, 2.2);

  // Earspool: jade flange with a cream core and a pendant bar.
  disc(c, hx - 12, hy + 12, 11, JADE, BLACK, 2.8);
  disc(c, hx - 12, hy + 12, 5, CREAM, BLACK, 1.6);
  c.fillStyle = BLACK;
  c.fillRect(hx - 15, hy + 24, 6, 14);

  // Headdress: stepped crown, red and jade blocks, swept feathers.
  poly(c, [
    { x: hx - 32, y: hy - 18 }, { x: hx - 38, y: hy - 50 },
    { x: hx - 18, y: hy - 58 }, { x: hx - 12, y: hy - 42 },
    { x: hx + 4, y: hy - 66 }, { x: hx + 22, y: hy - 54 },
    { x: hx + 16, y: hy - 36 }, { x: hx + 2, y: hy - 34 },
  ], RED, BLACK, 3.4);
  c.fillStyle = JADE;
  c.fillRect(hx - 30, hy - 48, 12, 10);
  c.fillStyle = BLACK;
  c.fillRect(hx - 8, hy - 46, 10, 8);
  c.fillStyle = CREAM;
  c.fillRect(hx + 2, hy - 44, 8, 6);

  // Feathers behind the crown.
  c.strokeStyle = BLACK;
  c.lineWidth = 7;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(hx - 30, hy - 40);
    c.quadraticCurveTo(hx - 64 - i * 5, hy - 74 - i * 14, hx - 92 - i * 4, hy - 66 - i * 16);
    c.stroke();
  }
  c.strokeStyle = JADE;
  c.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(hx - 30, hy - 40);
    c.quadraticCurveTo(hx - 64 - i * 5, hy - 74 - i * 14, hx - 92 - i * 4, hy - 66 - i * 16);
    c.stroke();
  }

  // A small stray glyph carved beside the bench.
  drawGlyph(c, 1, 90, 748, 34, 30, 'red');
  if (rand() > 0.5) drawGlyph(c, 5, 132, 748, 30, 30, 'black');
}

// ---------------------------------------------------------------- counter panel

function drawCounterPanel(c) {
  const p = PANEL;

  // A pale field so black numerals sit cleanly.
  c.fillStyle = alpha(CREAM, 0.2);
  c.fillRect(p.x, p.y, p.w, p.h);
  c.strokeStyle = RED;
  c.lineWidth = 6;
  c.strokeRect(p.x, p.y, p.w, p.h);
  c.strokeStyle = BLACK;
  c.lineWidth = 2;
  c.strokeRect(p.x + 9, p.y + 9, p.w - 18, p.h - 18);
  c.strokeStyle = alpha(BLACK, 0.35);
  c.lineWidth = 1.2;
  c.strokeRect(p.x + 15, p.y + 15, p.w - 30, p.h - 30);

  // Panel corner studs.
  const corners = [
    [p.x + 9, p.y + 9], [p.x + p.w - 9, p.y + 9],
    [p.x + 9, p.y + p.h - 9], [p.x + p.w - 9, p.y + p.h - 9],
  ];
  c.fillStyle = RED;
  corners.forEach(([x, y]) => c.fillRect(x - 5, y - 5, 10, 10));

  // Header: a small wheel glyph and a label.
  c.save();
  c.translate(p.x + 36, p.y + 44);
  c.strokeStyle = BLACK;
  c.lineWidth = 3.4;
  c.beginPath();
  c.arc(0, 0, 15, 0, TAU);
  c.stroke();
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU;
    line(c, 0, 0, Math.cos(a) * 12, Math.sin(a) * 12, RED, 2);
  }
  disc(c, 0, 0, 3.6, BLACK);
  c.restore();
  drawGlyph(c, 2, p.x + 58, p.y + 27, 32, 30, 'black');
  drawGlyph(c, 1, p.x + 94, p.y + 27, 32, 30, 'red');
  drawGlyph(c, 6, p.x + 130, p.y + 27, 32, 30, 'black');

  // Rule between the label and the numeral.
  line(c, p.x + 18, p.y + 74, p.x + p.w - 18, p.y + 74, RED, 3);

  // Ruled bar places remain visible, so the panel reads as a register.
  c.strokeStyle = alpha(BLACK, 0.2);
  c.lineWidth = 1.4;
  for (let i = 0; i < 2; i += 1) {
    c.strokeRect(COUNT_X - 74, 398 + i * 38, 148, 28);
  }
  c.beginPath();
  c.moveTo(COUNT_X - 74, 376);
  c.lineTo(COUNT_X + 74, 376);
  c.stroke();
  c.beginPath();
  c.moveTo(p.x + 22, 476);
  c.lineTo(p.x + p.w - 22, 476);
  c.stroke();

  // The trecena ring: thirteen slots, one for each count.
  c.save();
  c.strokeStyle = alpha(BLACK, 0.5);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(RING.x, RING.y, RING.r, 0, TAU);
  c.stroke();
  c.strokeStyle = alpha(BLACK, 0.25);
  c.lineWidth = 1.2;
  for (let i = 0; i < 13; i += 1) {
    const a = -Math.PI / 2 + (i / 13) * TAU;
    disc(c, RING.x + Math.cos(a) * RING.r, RING.y + Math.sin(a) * RING.r, 3.4, alpha(BLACK, 0.4));
  }
  c.restore();

  // Caption glyphs at the foot of the panel.
  drawGlyph(c, 0, p.x + 24, p.y + 342, 30, 30, 'black');
  drawGlyph(c, 3, p.x + 66, p.y + 342, 30, 30, 'red');
  line(c, p.x + 110, p.y + 350, p.x + 184, p.y + 350, alpha(BLACK, 0.55), 2.4);
  line(c, p.x + 110, p.y + 360, p.x + 168, p.y + 360, alpha(BLACK, 0.35), 1.8);
}

// The page's count: one count per pedal revolution, running 1–13 and rolling
// over to 1 on the downbeat. Sampled at 10 Hz so the marks step like a codex.
function counterAt(local) {
  const qt = Math.floor(local * 10) / 10;
  const step = Math.floor(qt + 1e-6);
  const n = ((12 + step - 1) % 13) + 1;
  return { qt, step, n, since: qt - step };
}

function drawCounter(g, ctx) {
  const c = g.drawingContext;
  const { n, since } = counterAt(ctx.local);
  const roll = n === 1 && since < 0.75;

  // Ink flash behind the numeral on rollover, contained by the panel.
  if (roll) {
    const k = smoothstep(0, 0.14, since) * (1 - smoothstep(0.35, 0.8, since));
    const cx = COUNT_X;
    const cy = 366;
    c.save();
    c.beginPath();
    c.rect(PANEL.x + 12, PANEL.y + 86, PANEL.w - 24, 136);
    c.clip();
    c.globalAlpha = 0.55 * k;
    c.strokeStyle = RED;
    c.lineWidth = 4;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU + 0.2;
      const r0 = 56 + k * 20;
      const r1 = 76 + k * 26;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.85);
      c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.85);
      c.stroke();
    }
    c.restore();
  }

  const bars = Math.floor(n / 5);
  const dots = n % 5;

  // Dots above; bars below. The classic vigesimal notation.
  for (let i = 0; i < dots; i += 1) {
    const dx = COUNT_X + (i - (dots - 1) / 2) * 44;
    disc(c, dx, 350, 15.5, BLACK);
    disc(c, dx - 3.5, 345.5, 3.4, alpha(CREAM, 0.5));
  }
  for (let i = 0; i < bars; i += 1) {
    const y = 398 + i * 38;
    c.fillStyle = BLACK;
    c.fillRect(COUNT_X - 74, y, 148, 28);
    c.fillStyle = RED;
    c.fillRect(COUNT_X - 74, y + 7, 6, 14);
    c.fillRect(COUNT_X + 68, y + 7, 6, 14);
  }

  // Trecena ring: the live position in the thirteen-count cycle.
  const a = -Math.PI / 2 + ((n - 1) / 13) * TAU;
  const px = RING.x + Math.cos(a) * RING.r;
  const py = RING.y + Math.sin(a) * RING.r;
  disc(c, px, py, 7.6, RED, BLACK, 2.4);
  disc(c, RING.x, RING.y, 6, BLACK);
  line(c, RING.x, RING.y, px, py, alpha(RED, 0.85), 3);
  // A little upright bar inside the ring, so it reads as a glyph not a dial.
  line(c, RING.x - 12, RING.y + 16, RING.x + 12, RING.y + 16, BLACK, 2.6);
  line(c, RING.x - 12, RING.y + 22, RING.x + 12, RING.y + 22, BLACK, 2.6);

  // On rollover the numeral is stamped with a red diamond, a fresh count.
  if (roll) {
    const k = 1 - smoothstep(0.4, 0.8, since);
    c.save();
    c.globalAlpha = k;
    c.strokeStyle = RED;
    c.lineWidth = 3.4;
    const cy = 366;
    const ry = 40 + (1 - k) * 8;
    c.beginPath();
    c.moveTo(COUNT_X, cy - ry);
    c.lineTo(COUNT_X + 66, cy);
    c.lineTo(COUNT_X, cy + ry);
    c.lineTo(COUNT_X - 66, cy);
    c.closePath();
    c.stroke();
    c.restore();
  }
}

// ---------------------------------------------------------------- ground

function drawGroundBand(c, rand) {
  const b = GROUND_BAND;
  c.fillStyle = alpha(RED, 0.26);
  c.fillRect(FRAME.x + 20, b.y, FRAME.w - 40, b.h);
  c.fillStyle = alpha(RED_D, 0.18);
  c.fillRect(FRAME.x + 20, b.y + b.h - 34, FRAME.w - 40, 34);
  line(c, FRAME.x + 20, b.y, FRAME.x + FRAME.w - 20, b.y, RED, 3.6);
  line(c, FRAME.x + 20, b.y + 4, FRAME.x + FRAME.w - 20, b.y + 4, alpha(BLACK, 0.45), 1.4);
  line(c, FRAME.x + 20, b.y + b.h, FRAME.x + FRAME.w - 20, b.y + b.h, RED, 3);
  line(c, FRAME.x + 20, b.y + b.h - 4, FRAME.x + FRAME.w - 20, b.y + b.h - 4, alpha(BLACK, 0.4), 1.2);

  // Static grain in the earth band.
  c.fillStyle = alpha(BLACK, 0.26);
  for (let i = 0; i < 260; i += 1) {
    const x = FRAME.x + 20 + rand() * (FRAME.w - 40);
    const y = b.y + 10 + rand() * (b.h - 20);
    c.fillRect(x, y, 1 + rand() * 4, 1.4);
  }
  // Short red grit strokes, like earth drawing.
  c.strokeStyle = alpha(RED_D, 0.5);
  c.lineWidth = 1.2;
  for (let i = 0; i < 40; i += 1) {
    const x = FRAME.x + 30 + rand() * (FRAME.w - 60);
    const y = b.y + 16 + rand() * (b.h - 32);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 4 + rand() * 9, y + 1);
    c.stroke();
  }

  // Rabbit's mat, part of the fixed page.
  c.fillStyle = BLACK;
  c.beginPath();
  c.roundRect(824, 848, 176, 26, 4);
  c.fill();
  c.fillStyle = RED;
  c.fillRect(836, 856, 20, 10);
  c.fillRect(866, 858, 40, 5);
  c.fillRect(920, 856, 10, 10);
  c.fillStyle = CREAM;
  c.fillRect(948, 858, 34, 5);
}

function drawGroundScroll(g, ctx) {
  const c = g.drawingContext;
  const scroll = (ctx.t * SPEED) % 330;
  c.save();
  c.beginPath();
  c.rect(FRAME.x + 20, GROUND_BAND.y + 2, FRAME.w - 40, GROUND_BAND.h - 4);
  c.clip();
  for (let i = 0; i < 10; i += 1) {
    const x = FRAME.x + 20 + ((((i * 330 - scroll) % 3300) + 3300) % 3300);
    if (x < FRAME.x + 5 || x > FRAME.x + FRAME.w - 10) continue;
    const kind = i % 4;
    c.save();
    c.globalAlpha = 0.78;
    if (kind === 0) {
      drawGlyph(c, 1, x, 820, 42, 38, 'black');
    } else if (kind === 1) {
      drawGlyph(c, 0, x, 820, 44, 38, 'red');
    } else if (kind === 2) {
      drawGlyph(c, 3, x, 818, 38, 34, 'black');
    } else {
      drawGlyph(c, 5, x, 820, 38, 34, 'black');
    }
    c.restore();
  }
  c.restore();
}

// ---------------------------------------------------------------- rider

function drawGlyphWheel(c, wheel, angle) {
  const r = wheel.r;
  c.save();
  c.translate(wheel.x, wheel.y);
  disc(c, 0, 0, r - 9, CREAM);
  disc(c, 0, 0, r, null, BLACK, 9.5);
  disc(c, 0, 0, r - 7, null, RED, 3);
  disc(c, 0, 0, r - 15, null, alpha(BLACK, 0.3), 1.1);

  // Four stepped spokes rotate; the glyph doubles as the odometer's wheel.
  c.rotate(angle);
  c.strokeStyle = BLACK;
  c.lineWidth = 4.4;
  c.lineCap = 'butt';
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.beginPath();
    c.moveTo(ca * 11, sa * 11);
    c.lineTo(ca * (r - 15), sa * (r - 15));
    c.stroke();
    c.beginPath();
    c.moveTo(ca * (r - 15), sa * (r - 15));
    c.lineTo(ca * (r - 22) - sa * 7, sa * (r - 22) + ca * 7);
    c.stroke();
  }
  disc(c, 0, 0, 7.5, RED, BLACK, 2.4);
  disc(c, Math.cos(0.9) * (r - 24), Math.sin(0.9) * (r - 24), 3.6, JADE);
  c.restore();
}

function drawGlyphBike(c, pose) {
  const f = pose.frame;
  const tubes = [
    [f.rearHub, f.crank],
    [f.crank, f.seatCluster],
    [f.seatCluster, f.rearHub],
    [f.seatCluster, f.headTop],
    [f.headTop, f.frontHub],
    [f.crank, f.headTube],
  ];

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // Heavy black under-stroke, flat cream core: a carved glyph bar.
  c.strokeStyle = BLACK;
  c.lineWidth = 13;
  tubes.forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  });
  c.strokeStyle = CREAM;
  c.lineWidth = 6;
  tubes.forEach(([a, b]) => {
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
  });

  // Glyph stitched into the rear triangle: the bicycle is a written object.
  drawGlyph(c, 0, -54, -104, 26, 30, 'red');
  c.fillStyle = RED;
  c.fillRect(-24, -126, 34, 3.4);
  c.fillRect(-20, -119, 26, 3.4);
  disc(c, 44, -132, 3.2, JADE);

  // Head-tube medallion: a four-dot glyph tying the frame to the counter.
  disc(c, 56, -124, 10, CREAM, BLACK, 3);
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * TAU + Math.PI / 4;
    disc(c, 56 + Math.cos(a) * 5.2, -124 + Math.sin(a) * 5.2, 1.8, RED);
  }

  // Seat cluster glyph and saddle.
  c.fillStyle = BLACK;
  c.beginPath();
  c.roundRect(-47, -139, 40, 10, 4);
  c.fill();
  c.fillStyle = RED;
  c.fillRect(-41, -136, 18, 4);
  disc(c, -12, -134, 4, JADE);

  // Handlebar: a raised bar with a turquoise grip.
  line(c, f.stemTop.x, f.stemTop.y, f.grip.x, f.grip.y, BLACK, 9);
  line(c, f.stemTop.x, f.stemTop.y, f.grip.x, f.grip.y, CREAM, 4);
  disc(c, f.grip.x, f.grip.y, 5.6, JADE, BLACK, 2);
  line(c, f.headTop.x, f.headTop.y, f.headTube.x, f.headTube.y, BLACK, 11);

  // Chainring: a small disk of dots.
  const cr = pose.crankCenter;
  disc(c, cr.x, cr.y, 17, CREAM, BLACK, 3.4);
  disc(c, cr.x, cr.y, 11, null, alpha(BLACK, 0.5), 1.4);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU;
    disc(c, cr.x + Math.cos(a) * 13, cr.y + Math.sin(a) * 13, 1.8, RED);
  }
  disc(c, cr.x, cr.y, 4, BLACK);

  // Chain: two flat lines.
  line(c, cr.x - 6, cr.y - 14, f.rearHub.x + 2, f.rearHub.y - 3, alpha(BLACK, 0.7), 1.6);
  line(c, cr.x - 6, cr.y + 14, f.rearHub.x + 2, f.rearHub.y + 3, alpha(BLACK, 0.7), 1.6);
  c.restore();

  // Cranks and pedals.
  line(c, cr.x, cr.y, pose.pedals.near.x, pose.pedals.near.y, BLACK, 5);
  line(c, pose.pedals.far.x, pose.pedals.far.y, cr.x, cr.y, BLACK, 4.2);
  c.fillStyle = BLACK;
  c.beginPath();
  c.roundRect(pose.pedals.near.x - 8, pose.pedals.near.y - 4, 20, 8, 2);
  c.fill();
  c.beginPath();
  c.roundRect(pose.pedals.far.x - 8, pose.pedals.far.y - 4, 18, 7, 2);
  c.fill();
}

function drawLeg(c, hip, leg, near) {
  const skin = near ? RED : mix(RED, BLACK, 0.36);
  const ink = near ? BLACK : mix(BLACK, BARK, 0.28);
  // Bow the limb forward of the straight frame tubes, so a red leg never
  // reads as part of the bicycle.
  const vx = leg.ankle.x - hip.x;
  const vy = leg.ankle.y - hip.y;
  const vl = Math.max(1, Math.hypot(vx, vy));
  const bow = near ? 8 : 6;
  const cx = leg.knee.x - (vy / vl) * bow;
  const cy = leg.knee.y + (vx / vl) * bow;

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = ink;
  c.lineWidth = near ? 25 : 20;
  c.beginPath();
  c.moveTo(hip.x, hip.y);
  c.quadraticCurveTo(cx, cy, leg.ankle.x, leg.ankle.y);
  c.stroke();
  c.strokeStyle = skin;
  c.lineWidth = near ? 15 : 11;
  c.beginPath();
  c.moveTo(hip.x, hip.y);
  c.quadraticCurveTo(cx, cy, leg.ankle.x, leg.ankle.y);
  c.stroke();

  // Knee ornament, anklet and a webbed foot on the pedal.
  disc(c, leg.knee.x, leg.knee.y, near ? 6 : 5, JADE, ink, 1.8);
  disc(c, leg.ankle.x, leg.ankle.y - 3, 3.6, JADE, ink, 1.4);
  c.fillStyle = ink;
  c.beginPath();
  c.moveTo(leg.ankle.x - 4, leg.ankle.y - 2);
  c.lineTo(leg.ankle.x + 16, leg.ankle.y + 1);
  c.lineTo(leg.ankle.x + 4, leg.ankle.y + 8);
  c.closePath();
  c.fill();
  c.restore();
}

function drawPelican(c, pose) {
  const body = pose.body;

  // Tail: three stepped feather bars behind the body.
  for (let i = 0; i < 3; i += 1) {
    const droop = i * 7;
    poly(c, [
      { x: -54, y: -184 + droop },
      { x: -96 - i * 4, y: -196 + droop + i * 3 },
      { x: -88 - i * 4, y: -176 + droop + i * 3 },
      { x: -48, y: -168 + droop },
    ], i === 1 ? RED : BODY, BLACK, 3.2);
  }

  // Body: a flat cream mass with a heavy outline.
  c.save();
  c.translate(body.x, body.y);
  c.rotate(body.rot);
  c.beginPath();
  c.ellipse(0, 0, body.rx * 1.07, body.ry * 1.08, 0, 0, TAU);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 5;
  c.stroke();

  // Wing: a stepped red fret with cream feather lines.
  poly(c, [
    { x: -44, y: -18 }, { x: 6, y: -24 }, { x: 22, y: -10 },
    { x: 8, y: -2 }, { x: 18, y: 10 }, { x: -2, y: 6 },
    { x: -8, y: 20 }, { x: -32, y: 12 }, { x: -46, y: 4 },
  ], RED, BLACK, 3.4);
  c.strokeStyle = alpha(CREAM, 0.8);
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(-34, -10);
  c.lineTo(4, -14);
  c.lineTo(8, -4);
  c.lineTo(0, 2);
  c.lineTo(4, 12);
  c.stroke();
  c.beginPath();
  c.moveTo(-38, 2);
  c.lineTo(-28, 4);
  c.lineTo(-22, 16);
  c.stroke();
  disc(c, 8, -12, 3.4, JADE, BLACK, 1.4);

  // Small glyph stitched into the shoulder, like a scribal mark.
  c.restore();

  // Neck: an S-curve from the chest, painted over the body so the profile
  // reads at a glance, as in codical bird portraits.
  const h = pose.head;
  const neckStart = { x: pose.shoulder.x + 2, y: pose.shoulder.y + 8 };
  const neckMid = { x: h.x - 32, y: h.y + 62 };
  const neckEnd = { x: h.x - 6, y: h.y + 20 };
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = BLACK;
  c.lineWidth = 25;
  c.beginPath();
  c.moveTo(neckStart.x, neckStart.y);
  c.quadraticCurveTo(neckMid.x, neckMid.y, neckEnd.x, neckEnd.y);
  c.stroke();
  c.strokeStyle = BODY;
  c.lineWidth = 16;
  c.beginPath();
  c.moveTo(neckStart.x, neckStart.y);
  c.quadraticCurveTo(neckMid.x, neckMid.y, neckEnd.x, neckEnd.y);
  c.stroke();
  // Neck bands: two red glyph rings.
  c.strokeStyle = alpha(RED, 0.85);
  c.lineWidth = 3.6;
  for (let i = 0; i < 2; i += 1) {
    const k = 0.32 + i * 0.22;
    const nx = (1 - k) * (1 - k) * neckStart.x + 2 * (1 - k) * k * neckMid.x + k * k * neckEnd.x;
    const ny = (1 - k) * (1 - k) * neckStart.y + 2 * (1 - k) * k * neckMid.y + k * k * neckEnd.y;
    c.beginPath();
    c.moveTo(nx - 8, ny + 3);
    c.lineTo(nx + 8, ny - 5);
    c.stroke();
  }
  c.restore();

  // Crest: three block feathers fanned behind the head.
  for (let i = 0; i < 3; i += 1) {
    c.save();
    c.translate(h.x - 15, h.y + 1);
    c.rotate(-1.02 + i * 0.3);
    c.beginPath();
    c.roundRect(-6, -36, 12, 34, 5);
    c.fillStyle = i === 1 ? RED : BODY;
    c.fill();
    c.strokeStyle = BLACK;
    c.lineWidth = 3;
    c.stroke();
    if (i === 1) {
      c.fillStyle = CREAM;
      c.fillRect(-3.4, -30, 6.8, 3);
    }
    c.restore();
  }

  // Head.
  c.beginPath();
  c.ellipse(h.x, h.y, 23, 20, -0.12, 0, TAU);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 4.2;
  c.stroke();

  // Beak: long upper mandible, slight downward hook.
  const base = pose.beak.base;
  const tip = pose.beak.tip;
  c.beginPath();
  c.moveTo(base.x - 2, base.y - 12);
  c.bezierCurveTo(base.x + 44, base.y - 18, tip.x - 34, tip.y - 8, tip.x, tip.y);
  c.lineTo(tip.x - 2, tip.y + 8);
  c.bezierCurveTo(base.x + 48, base.y + 10, base.x + 18, base.y + 12, base.x + 2, base.y + 8);
  c.closePath();
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 4;
  c.stroke();

  // Hooked tip and the mandible seam.
  c.beginPath();
  c.moveTo(tip.x + 2, tip.y - 2);
  c.lineTo(tip.x + 2, tip.y + 12);
  c.lineTo(tip.x - 7, tip.y + 8);
  c.closePath();
  c.fillStyle = BLACK;
  c.fill();
  line(c, base.x + 10, base.y + 2, tip.x - 8, tip.y + 4, alpha(RED, 0.8), 2.4);

  // Nostril bar.
  line(c, base.x + 16, base.y - 6, base.x + 30, base.y - 6, BLACK, 2.4);

  // Pouch: a flat red bag under the mandible.
  c.beginPath();
  c.moveTo(base.x + 8, base.y + 6);
  c.bezierCurveTo(base.x + 42, base.y + 38, tip.x - 36, tip.y + 40, tip.x - 8, tip.y + 7);
  c.quadraticCurveTo(base.x + 54, base.y + 22, base.x + 8, base.y + 6);
  c.closePath();
  c.fillStyle = RED;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 3.4;
  c.stroke();
  c.strokeStyle = alpha(CREAM, 0.6);
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(base.x + 26, base.y + 18);
  c.quadraticCurveTo(base.x + 58, base.y + 26, base.x + 68, base.y + 22);
  c.stroke();

  // Eye, brow, jade earspool.
  disc(c, h.x + 4, h.y - 2, 9, CREAM, BLACK, 2.6);
  if (pose.blink > 0.5) {
    line(c, h.x - 4, h.y - 2, h.x + 12, h.y - 2, BLACK, 2.6);
  } else {
    disc(c, h.x + 6, h.y - 2, 3.8, BLACK);
    disc(c, h.x + 7.2, h.y - 3.4, 1.2, CREAM);
  }
  line(c, h.x - 6, h.y - 14, h.x + 12, h.y - 11, RED, 3.2);
  disc(c, h.x - 12, h.y + 10, 6.4, JADE, BLACK, 2);
  disc(c, h.x - 12, h.y + 10, 2.4, CREAM, BLACK, 1);

  // A red cheek bar, read as codical face paint.
  c.fillStyle = alpha(RED, 0.9);
  c.fillRect(h.x - 2, h.y + 8, 10, 3.4);
}

function drawCodexRider(g, ctx) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);
  c.save();
  c.translate(468, 820);
  c.scale(1.16, 1.16);

  drawGlyphWheel(c, pose.wheels.rear, pose.wheelAngle);
  drawGlyphWheel(c, pose.wheels.front, pose.wheelAngle);
  drawLeg(c, pose.hip, pose.legs.far, false);
  drawGlyphBike(c, pose);
  drawPelican(c, pose);
  drawLeg(c, pose.hip, pose.legs.near, true);

  c.restore();
}

// ---------------------------------------------------------------- rabbit scribe

function drawRabbit(g, ctx) {
  const c = g.drawingContext;
  const { n, since } = counterAt(ctx.local);

  const tap = since < 0.34 ? Math.sin(Math.PI * clamp(since / 0.34)) : 0;
  const leap = n === 1 && since < 0.6 ? Math.sin(Math.PI * clamp(since / 0.6)) : 0;
  const bob = -3 * tap - 11 * leap;

  c.save();
  c.translate(0, bob);

  // Long ears: laid back, more so on the rollover leap.
  const earK = 0.35 + 0.4 * leap;
  for (let i = 0; i < 2; i += 1) {
    c.save();
    c.translate(894 + i * 13, 732 - i * 2);
    c.rotate(-0.78 - earK * 0.5 + i * 0.34);
    c.beginPath();
    c.ellipse(0, -34, 11, 35, 0, 0, TAU);
    c.fillStyle = BODY;
    c.fill();
    c.strokeStyle = BLACK;
    c.lineWidth = 3.2;
    c.stroke();
    c.beginPath();
    c.ellipse(0, -34, 4.6, 24, 0, 0, TAU);
    c.fillStyle = RED;
    c.fill();
    c.restore();
  }

  // Haunch and body.
  c.beginPath();
  c.ellipse(878, 822, 38, 32, -0.08, 0, TAU);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 4;
  c.stroke();

  c.beginPath();
  c.ellipse(912, 790, 27, 34, 0.22, 0, TAU);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 3.6;
  c.stroke();

  // Head in profile, looking up at the panel.
  c.beginPath();
  c.ellipse(930, 748, 26, 22, -0.18, 0, TAU);
  c.fillStyle = BODY;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 3.6;
  c.stroke();

  // Muzzle and nose.
  poly(c, [
    { x: 942, y: 740 }, { x: 962, y: 742 },
    { x: 958, y: 754 }, { x: 942, y: 756 },
  ], BODY, BLACK, 2.6);
  disc(c, 959, 745, 3, RED);

  // Eye.
  disc(c, 938, 742, 4.4, BLACK);
  disc(c, 939, 740.4, 1.4, CREAM);

  // Whiskers.
  c.strokeStyle = alpha(BLACK, 0.7);
  c.lineWidth = 1.4;
  for (let i = 0; i < 2; i += 1) {
    c.beginPath();
    c.moveTo(958, 750);
    c.lineTo(982, 746 + i * 6);
    c.stroke();
  }

  // Back leg and foot on the mat.
  c.fillStyle = BLACK;
  c.beginPath();
  c.roundRect(884, 842, 34, 9, 3);
  c.fill();

  // Front paw and writing brush, reaching to the counter.
  const brushX = 966;
  const brushY = 666 - tap * 10 - leap * 14;
  c.strokeStyle = BLACK;
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(928, 782);
  c.quadraticCurveTo(958, 758, brushX - 6, brushY + 12);
  c.stroke();
  c.strokeStyle = BODY;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(928, 782);
  c.quadraticCurveTo(958, 758, brushX - 6, brushY + 12);
  c.stroke();

  // Brush: a reed handle with a red nib.
  line(c, brushX - 4, brushY + 18, brushX + 8, brushY - 10, BLACK, 3.4);
  c.beginPath();
  c.moveTo(brushX + 8, brushY - 10);
  c.lineTo(brushX + 14, brushY - 24);
  c.lineTo(brushX + 2, brushY - 17);
  c.closePath();
  c.fillStyle = RED;
  c.fill();
  c.strokeStyle = BLACK;
  c.lineWidth = 1.6;
  c.stroke();

  // Jade bead necklace and tail.
  for (let i = 0; i < 3; i += 1) {
    disc(c, 900 + i * 8, 768 + Math.abs(i - 1) * 2, 3.2, JADE, BLACK, 1.2);
  }
  disc(c, 856, 806, 7, CREAM, BLACK, 2);

  c.restore();
}

// ---------------------------------------------------------------- wear

function drawWear(c, rand) {
  // Abrasion where the page has been handled.
  c.save();
  c.globalAlpha = 0.5;
  c.fillStyle = mix(BARK, CREAM, 0.35);
  for (let i = 0; i < 26; i += 1) {
    const onVertical = rand() > 0.5;
    const x = onVertical
      ? (rand() > 0.5 ? PAGE_R - 8 - rand() * 30 : PAGE_L + 4 + rand() * 30)
      : PAGE_L + rand() * (PAGE_R - PAGE_L);
    const y = onVertical ? rand() * 1000 : rand() * 40 + 940;
    c.beginPath();
    c.ellipse(x, y, 2 + rand() * 9, 1 + rand() * 5, rand() * TAU, 0, TAU);
    c.fill();
  }
  c.restore();

  // Fine bark cracks.
  c.strokeStyle = alpha(BLACK, 0.14);
  c.lineWidth = 1;
  for (let i = 0; i < 7; i += 1) {
    let x = PAGE_L + 40 + rand() * (PAGE_R - PAGE_L - 80);
    let y = rand() * 940;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 5; k += 1) {
      x += (rand() - 0.5) * 26;
      y += rand() * 22;
      c.lineTo(x, y);
    }
    c.stroke();
  }

  // Pigment mottle over the whole sheet.
  c.fillStyle = alpha(RED_D, 0.05);
  for (let i = 0; i < 60; i += 1) {
    c.beginPath();
    c.ellipse(PAGE_L + rand() * (PAGE_R - PAGE_L), rand() * 1000, 20 + rand() * 60, 14 + rand() * 40, 0, 0, TAU);
    c.fill();
  }
}

// ---------------------------------------------------------------- title

function drawMayaTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;
  const w = 486 * s;
  const h = 172 * s;
  const x = 92 * s;
  const y = H - 82 * s - h;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.5 * s);

  // Carved slab.
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = 22 * s;
  c.shadowOffsetY = 6 * s;
  c.fillStyle = BLACK;
  c.fillRect(x, y, w, h);
  c.shadowColor = 'transparent';

  // Tooled stone grain.
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.strokeStyle = alpha(CREAM, 0.05);
  c.lineWidth = 1 * s;
  for (let i = 0; i < 14; i += 1) {
    const gy = y + (i / 14) * h;
    c.beginPath();
    c.moveTo(x, gy);
    c.lineTo(x + w, gy + 1.5 * s);
    c.stroke();
  }
  c.restore();

  // Red carved border and hairline.
  c.strokeStyle = RED;
  c.lineWidth = 5 * s;
  c.strokeRect(x + 8 * s, y + 8 * s, w - 16 * s, h - 16 * s);
  c.strokeStyle = alpha(CREAM, 0.45);
  c.lineWidth = 1 * s;
  c.strokeRect(x + 15 * s, y + 15 * s, w - 30 * s, h - 30 * s);

  // Corner inlays.
  c.fillStyle = RED;
  [
    [x + 8 * s, y + 8 * s], [x + w - 20 * s, y + 8 * s],
    [x + 8 * s, y + h - 20 * s], [x + w - 20 * s, y + h - 20 * s],
  ].forEach(([cx, cy]) => c.fillRect(cx, cy, 12 * s, 12 * s));

  // Text block.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  setFont(c, 12 * s, 600, EN_FONT, '3px');
  c.fillStyle = RED;
  c.fillText('07  /  20', x + 30 * s, y + 38 * s);

  setFont(c, 38 * s, 600, CN_FONT, '2px');
  c.fillStyle = CREAM;
  c.fillText('玛雅抄本', x + 28 * s, y + 84 * s);

  setFont(c, 14 * s, 500, EN_FONT, '3.2px');
  c.fillStyle = alpha(CREAM, 0.88);
  c.fillText('MAYA CODEX', x + 30 * s, y + 108 * s);

  setFont(c, 14 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(CREAM, 0.7);
  c.fillText('约1200 · 抄本页 · 第 7 页', x + 30 * s, y + 134 * s);

  // Bar-and-dot numeral block (thirteen) at the right.
  const nx = x + w - 118 * s;
  line(c, nx - 18 * s, y + 30 * s, nx - 18 * s, y + h - 30 * s, alpha(CREAM, 0.28), 1 * s);

  for (let i = 0; i < 3; i += 1) {
    disc(c, nx + 12 * s + i * 32 * s, y + 50 * s, 8 * s, RED, alpha(CREAM, 0.25), 1 * s);
  }
  c.fillStyle = CREAM;
  c.fillRect(nx, y + 74 * s, 82 * s, 9 * s);
  c.fillRect(nx, y + 94 * s, 82 * s, 9 * s);
  c.fillStyle = RED;
  c.fillRect(nx, y + 74 * s, 82 * s, 2.4 * s);
  c.fillRect(nx, y + 94 * s, 82 * s, 2.4 * s);

  // Small carved caption under the numeral.
  setFont(c, 8 * s, 500, EN_FONT, '1.4px');
  c.fillStyle = alpha(CREAM, 0.55);
  c.fillText('PEDAL COUNT', nx, y + 128 * s);

  c.restore();
}
