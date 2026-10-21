// 2 — Egyptian tomb painting, Thebes, c. 1300 BC.
// Painted plaster over mudbrick: three registers, a hieroglyph frieze with a
// cartouche, a strict-profile pelican on a bicycle, a seated scribe keeping
// count, an offering table, and a lower register of lotus, bread and cat.
// The wall is cached. The pelican is live and snaps into canonical profile on
// the strong beat, freezing for half a beat while the wheels keep turning;
// the scribe's reed arm and tally marks are live and quantised to 12 Hz.

import { basePalette } from './_placeholder.js';
import { alpha, mix } from '../kit/color.js';
import { clamp, rngFor, TAU } from '../kit/math.js';
import { cachedLayer, drawCached } from '../kit/cache.js';
import { rigPose, RIG } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const pal = basePalette({
  bg: '#d8c49c',
  bg2: '#c9b083',
  motif: '#2b4d7a',
  accent: '#c9a24e',
  ink: '#24211c',
  titleInk: '#1d2723',
  ground: '#c1a776',
  road: '#a8792b',
  dash: '#f1e6c8',
  body: '#f1e6c8',
  beak: '#b47a2a',
  rigInk: '#24211c',
});

// ---------------------------------------------------------------- constants

const C = {
  plaster: '#d8c49c',
  plasterLt: '#e7d9b8',
  plasterDk: '#c2a878',
  ink: '#24211c',
  lapis: '#2b4d7a',
  lapisDk: '#213c5e',
  turq: '#2f8b86',
  ochre: '#b47a2a',
  ochreDk: '#8d5b1c',
  red: '#a9502f',
  linen: '#f1e6c8',
  gold: '#c9a24e',
  skin: '#bb8a52',
  skinDk: '#9c6d3a',
  mud: '#9f7a49',
};

const WALL = { x0: -800, y0: -150, w: 2400, h: 1250 };

const REG = {
  topBand: 60,
  glyphBase: 292,
  floor: 820,
  floorBase: 860,
  bottom: 1060,
};

const RX = 468;
const RY = 820;
const RS = 1.5;

const SCRIBE = { sx: 1000, shoulder: { x: 992, y: 726 } };
const CELL = { x0: 870, x1: 896, y0: 692, step: 23, h: 18 };

export default {
  id: 's02',
  number: 2,
  cn: '埃及壁画',
  en: 'Egyptian Tomb Painting',
  year: '约前1300 · 底比斯',
  palette: pal,

  draw(g, ctx) {
    const layer = cachedLayer(ctx, 's02-wall', drawWall, WALL);
    drawCached(g, layer, WALL);

    drawGuideLines(g, ctx); // canonical construction grid, behind the bird
    drawRider(g, ctx);
    drawTally(g, ctx);
    drawFlakes(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawEgyptTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- wall base

function plasterCanvas(w = 320, h = 190, seed = 7) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c2 = cv.getContext('2d');
  const img = c2.createImageData(w, h);
  const n = 48;
  const grids = [0, 1, 2].map((k) => {
    const rand = rngFor(seed + k * 131);
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
  const dark = [193, 166, 122];
  const base = [216, 196, 156];
  const light = [232, 217, 182];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = (x / w) * 5;
      const v = (y / h) * 5;
      let f =
        0.54 * sample(grids[0], u, v) +
        0.3 * sample(grids[1], u * 3.2 + 9, v * 3.2 + 4) +
        0.16 * sample(grids[2], u * 9.1 + 2, v * 9.1 + 17);
      f = clamp((f - 0.2) * 1.6);
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
  c2.putImageData(img, 0, 0);
  return cv;
}

function drawWall(pg, c) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // Plaster ground.
  c.fillStyle = C.plaster;
  c.fillRect(WALL.x0, WALL.y0, WALL.w, WALL.h);
  c.globalAlpha = 0.92;
  c.drawImage(plasterCanvas(), WALL.x0, WALL.y0, WALL.w, WALL.h);
  c.globalAlpha = 0.3;
  c.drawImage(plasterCanvas(640, 360, 23), WALL.x0, WALL.y0, WALL.w, WALL.h);
  c.globalAlpha = 1;

  // Broad age stains: lamp soot at the top, damp along the base.
  const stain = (x, y, r, col, a) => {
    const gr = c.createRadialGradient(x, y, r * 0.1, x, y, r);
    gr.addColorStop(0, alpha(col, a));
    gr.addColorStop(1, alpha(col, 0));
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  stain(600, -80, 620, '#8d6d3e', 0.16);
  stain(1380, 60, 420, '#7c5c30', 0.12);
  stain(-420, 500, 420, '#9a7a48', 0.09);
  stain(700, 980, 460, '#8c6b3c', 0.1);
  stain(260, 640, 300, '#f6ead0', 0.12);

  // Plaster repairs and trowel patches, laid on with a soft edge.
  const rand = rngFor(901);
  for (let i = 0; i < 8; i += 1) {
    const x = WALL.x0 + 100 + rand() * (WALL.w - 200);
    const y = WALL.y0 + 160 + rand() * (WALL.h - 320);
    const r = 70 + rand() * 130;
    const pts = blob(c, x, y, r, 900 + i, 0.6, 11, 0.26);
    polyPath(c, pts);
    c.fillStyle = alpha(i % 2 ? '#e4d5b1' : '#c9b081', 0.13);
    c.fill();
    c.strokeStyle = alpha(C.ochreDk, 0.1);
    c.lineWidth = 2;
    c.stroke();
  }
  // Lime wash drips from the top band.
  for (let i = 0; i < 9; i += 1) {
    const x = WALL.x0 + rand() * WALL.w;
    const len = 60 + rand() * 220;
    c.fillStyle = alpha('#efe3c6', 0.07);
    c.fillRect(x, 70, 16 + rand() * 30, len);
  }
  // Aggregate pits in the plaster.
  c.fillStyle = alpha('#6f5734', 0.16);
  for (let i = 0; i < 220; i += 1) {
    const x = WALL.x0 + rand() * WALL.w;
    const y = WALL.y0 + rand() * WALL.h;
    c.beginPath();
    c.ellipse(x, y, 0.8 + rand() * 2.2, 0.6 + rand() * 1.4, rand() * TAU, 0, TAU);
    c.fill();
  }

  drawFaintGrid(c);
  drawRegisters(c);
  drawKhekerFrieze(c);
  drawBottomRegister(c);
  drawScribeStatic(c);
  drawOfferingTable(c);
  drawCaptionColumns(c);
  drawGlyphFrieze(c);
  drawCartouche(c);
  drawUnfinishedSketch(c);
  drawCracks(c);
  drawPaintLoss(c);
  drawEdgeDamage(c);
  drawPigmentGrain(c);

  c.restore();
}

// ---------------------------------------------------------------- registers

function drawFaintGrid(c) {
  const rand = rngFor(311);
  c.save();
  c.strokeStyle = alpha(C.red, 0.13);
  c.lineWidth = 1.15;
  for (let x = WALL.x0; x <= 1600; x += 84) {
    c.beginPath();
    for (let y = 300; y <= 830; y += 42) {
      const xx = x + (rand() - 0.5) * 1.8;
      if (y === 300) c.moveTo(xx, y);
      else c.lineTo(xx, y);
    }
    c.stroke();
  }
  for (let y = 300; y <= 830; y += 84) {
    c.beginPath();
    for (let x = WALL.x0; x <= 1600; x += 42) {
      const yy = y + (rand() - 0.5) * 1.6;
      if (x === WALL.x0) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();
  }
  c.restore();
}

function drawRegisters(c) {
  // Top border: dark band with a row of gold ticks.
  c.fillStyle = C.ink;
  c.fillRect(WALL.x0, 58, WALL.w, 12);
  c.fillStyle = alpha(C.gold, 0.85);
  for (let x = WALL.x0 + 6; x < 1600; x += 26) {
    c.fillRect(x, 61, 12, 3);
  }

  // Register baselines.
  const line = (y, w, col) => {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(WALL.x0, y);
    c.lineTo(1600, y);
    c.stroke();
  };
  line(REG.glyphBase, 3.2, C.ink);
  line(REG.glyphBase + 6, 1.4, alpha(C.ochre, 0.55));

  // Painted floor that carries the bicycle.
  c.fillStyle = C.ochreDk;
  c.fillRect(WALL.x0, REG.floor, WALL.w, REG.floorBase - REG.floor);
  c.fillStyle = alpha(C.ochre, 0.5);
  c.fillRect(WALL.x0, REG.floor + 3, WALL.w, 8);
  line(REG.floor, 2.6, C.ink);
  // Turquoise water zigzag: the painted ground convention.
  c.strokeStyle = C.turq;
  c.lineWidth = 3;
  c.beginPath();
  for (let x = WALL.x0; x <= 1600; x += 23) {
    const yy = REG.floor + 24;
    const z = Math.sin((x / 23) * Math.PI) * 5;
    if (x === WALL.x0) c.moveTo(x, yy + z);
    else c.lineTo(x, yy + z);
  }
  c.stroke();
  c.strokeStyle = alpha(C.linen, 0.35);
  c.lineWidth = 1;
  for (let x = WALL.x0; x < 1600; x += 46) {
    c.beginPath();
    c.moveTo(x, REG.floor + 20);
    c.lineTo(x + 12, REG.floor + 20);
    c.stroke();
  }
  // Block joints across the painted floor.
  c.strokeStyle = alpha(C.ink, 0.32);
  c.lineWidth = 1.4;
  const jr = rngFor(1717);
  for (let x = WALL.x0; x < 1600; x += 96) {
    const lean = (jr() - 0.5) * 5;
    c.beginPath();
    c.moveTo(x + lean, REG.floor + 3);
    c.lineTo(x - lean, REG.floorBase - 3);
    c.stroke();
  }
  c.strokeStyle = alpha(C.linen, 0.22);
  c.lineWidth = 1;
  for (let x = WALL.x0 + 48; x < 1600; x += 96) {
    c.beginPath();
    c.moveTo(x, REG.floor + 5);
    c.lineTo(x, REG.floorBase - 5);
    c.stroke();
  }

  // Middle / bottom separator.
  line(REG.floorBase, 4, C.ink);
  line(REG.floorBase + 5, 1.6, alpha(C.ochre, 0.6));
  line(REG.bottom, 3, C.ink);

  // A slim turquoise rule under the glyph register.
  c.strokeStyle = alpha(C.turq, 0.45);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(WALL.x0, 303);
  c.lineTo(1600, 303);
  c.stroke();
}

function drawKhekerFrieze(c) {
  const cols = [C.lapis, C.ochre, C.turq];
  let i = 0;
  for (let x = WALL.x0; x < 1600; x += 38) {
    const col = cols[i % 3];
    c.beginPath();
    c.moveTo(x, 56);
    c.lineTo(x, 24);
    c.quadraticCurveTo(x, 2, x + 19, 2);
    c.quadraticCurveTo(x + 38, 2, x + 38, 24);
    c.lineTo(x + 38, 56);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    c.stroke();
    // Inner binding.
    c.strokeStyle = alpha(C.ink, 0.55);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x + 7, 44);
    c.quadraticCurveTo(x + 19, 30, x + 31, 44);
    c.stroke();
    i += 1;
  }
}

// ---------------------------------------------------------------- glyphs

function glyphPath(c, kind, x, y, h, col) {
  const ink = C.ink;
  const lw = Math.max(2, h * 0.055);
  c.lineWidth = lw;
  c.strokeStyle = ink;
  c.fillStyle = col;

  switch (kind) {
    case 'ankh': {
      const cy = y - h * 0.72;
      c.beginPath();
      c.ellipse(x, cy, h * 0.17, h * 0.21, 0, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(x, cy + h * 0.2);
      c.lineTo(x, y);
      c.moveTo(x - h * 0.26, y - h * 0.44);
      c.lineTo(x + h * 0.26, y - h * 0.44);
      c.stroke();
      break;
    }
    case 'water': {
      c.beginPath();
      c.moveTo(x - h * 0.36, y - h * 0.3);
      for (let i = 0; i < 4; i += 1) {
        const dx = h * 0.18;
        c.lineTo(x - h * 0.36 + dx * (i * 2 + 1), y - h * 0.44);
        c.lineTo(x - h * 0.36 + dx * (i * 2 + 2), y - h * 0.3);
      }
      c.stroke();
      break;
    }
    case 'eye': {
      const ey = y - h * 0.5;
      c.beginPath();
      c.moveTo(x - h * 0.32, ey);
      c.quadraticCurveTo(x, ey - h * 0.2, x + h * 0.3, ey);
      c.quadraticCurveTo(x, ey + h * 0.17, x - h * 0.32, ey);
      c.closePath();
      c.fillStyle = C.linen;
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(x + h * 0.03, ey, h * 0.09, 0, TAU);
      c.fillStyle = ink;
      c.fill();
      c.beginPath();
      c.moveTo(x - h * 0.3, ey + h * 0.02);
      c.lineTo(x - h * 0.46, ey + h * 0.1);
      c.stroke();
      break;
    }
    case 'bird': {
      c.beginPath();
      c.ellipse(x, y - h * 0.4, h * 0.2, h * 0.13, -0.1, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(x + h * 0.13, y - h * 0.62, h * 0.08, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(x + h * 0.2, y - h * 0.62);
      c.lineTo(x + h * 0.36, y - h * 0.6);
      c.moveTo(x - h * 0.02, y - h * 0.28);
      c.lineTo(x - h * 0.02, y);
      c.moveTo(x + h * 0.08, y - h * 0.28);
      c.lineTo(x + h * 0.08, y);
      c.moveTo(x - h * 0.16, y - h * 0.42);
      c.lineTo(x - h * 0.32, y - h * 0.5);
      c.stroke();
      break;
    }
    case 'reed': {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - h * 0.13, y - h * 0.5, x + h * 0.02, y - h * 0.96);
      c.quadraticCurveTo(x + h * 0.15, y - h * 0.5, x, y);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      break;
    }
    case 'loaf': {
      c.beginPath();
      c.moveTo(x - h * 0.26, y);
      c.quadraticCurveTo(x, y - h * 0.52, x + h * 0.26, y);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(x - h * 0.3, y);
      c.lineTo(x + h * 0.3, y);
      c.stroke();
      break;
    }
    case 'sun': {
      c.beginPath();
      c.arc(x, y - h * 0.34, h * 0.22, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(x, y - h * 0.34, h * 0.08, 0, TAU);
      c.fillStyle = ink;
      c.fill();
      break;
    }
    case 'cobra': {
      c.beginPath();
      c.moveTo(x - h * 0.14, y);
      c.bezierCurveTo(x + h * 0.16, y - h * 0.3, x - h * 0.16, y - h * 0.6, x + h * 0.04, y - h * 0.78);
      c.lineWidth = h * 0.1;
      c.strokeStyle = col;
      c.stroke();
      c.lineWidth = lw;
      c.strokeStyle = ink;
      c.beginPath();
      c.ellipse(x + h * 0.04, y - h * 0.82, h * 0.11, h * 0.08, 0, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      break;
    }
    case 'djed': {
      c.fillStyle = col;
      c.fillRect(x - h * 0.07, y - h * 0.86, h * 0.14, h * 0.86);
      c.strokeRect(x - h * 0.07, y - h * 0.86, h * 0.14, h * 0.86);
      for (let i = 0; i < 4; i += 1) {
        const yy = y - h * 0.86 + i * h * 0.12;
        c.fillStyle = ink;
        c.fillRect(x - h * 0.18, yy, h * 0.36, h * 0.045);
      }
      c.beginPath();
      c.moveTo(x - h * 0.24, y);
      c.lineTo(x + h * 0.24, y);
      c.stroke();
      break;
    }
    case 'arm': {
      c.beginPath();
      c.lineWidth = h * 0.12;
      c.strokeStyle = col;
      c.moveTo(x - h * 0.1, y - h * 0.1);
      c.lineTo(x + h * 0.08, y - h * 0.48);
      c.lineTo(x + h * 0.28, y - h * 0.52);
      c.stroke();
      c.lineWidth = lw;
      c.strokeStyle = ink;
      c.beginPath();
      c.arc(x + h * 0.28, y - h * 0.52, h * 0.06, 0, TAU);
      c.fillStyle = col;
      c.fill();
      c.stroke();
      break;
    }
    case 'feather': {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - h * 0.18, y - h * 0.5, x - h * 0.02, y - h * 0.98);
      c.quadraticCurveTo(x + h * 0.17, y - h * 0.52, x, y);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(x, y - h * 0.06);
      c.lineTo(x, y - h * 0.9);
      c.strokeStyle = ink;
      c.lineWidth = 1.4;
      c.stroke();
      break;
    }
    case 'basket': {
      c.beginPath();
      c.moveTo(x - h * 0.28, y - h * 0.24);
      c.quadraticCurveTo(x, y + h * 0.06, x + h * 0.28, y - h * 0.24);
      c.lineTo(x + h * 0.24, y - h * 0.3);
      c.lineTo(x - h * 0.24, y - h * 0.3);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      break;
    }
    default: {
      // Invented sign: a block with two tails.
      c.fillStyle = col;
      c.fillRect(x - h * 0.2, y - h * 0.6, h * 0.4, h * 0.36);
      c.strokeRect(x - h * 0.2, y - h * 0.6, h * 0.4, h * 0.36);
      c.beginPath();
      c.moveTo(x - h * 0.1, y - h * 0.24);
      c.lineTo(x - h * 0.1, y);
      c.moveTo(x + h * 0.1, y - h * 0.24);
      c.lineTo(x + h * 0.1, y - h * 0.1);
      c.stroke();
      break;
    }
  }
}

const GLYPHS = [
  'ankh', 'water', 'eye', 'bird', 'reed', 'loaf', 'sun', 'cobra',
  'djed', 'arm', 'feather', 'basket', 'bird', 'water', 'ankh', 'stool',
];

function drawGlyphFrieze(c) {
  const rand = rngFor(1207);
  const cols = [C.lapis, C.ochre, C.turq, C.lapisDk];
  let x = -770;
  let i = 0;
  while (x < 1560) {
    if (x > 398 && x < 806) {
      x = 806;
      continue;
    }
    const h = 72 + rand() * 46;
    const kind = GLYPHS[Math.floor(rand() * GLYPHS.length)];
    const col = cols[Math.floor(rand() * cols.length)];
    glyphPath(c, kind, x, 286, h, col);
    x += h * 0.5 + 16 + rand() * 18;
    i += 1;
    if (i > 90) break;
  }

  // Flanking signs for the cartouche.
  glyphPath(c, 'ankh', 392, 286, 98, C.lapis);
  glyphPath(c, 'eye', 812, 286, 86, C.turq);
}

function drawCartouche(c) {
  const cx = 600;
  const L = cx - 168;
  const R = cx + 168;
  const T = 136;
  const B = 286;

  c.save();
  c.beginPath();
  c.moveTo(L + 24, T);
  c.lineTo(R - 24, T);
  c.quadraticCurveTo(R + 4, T, R + 10, T + 70);
  c.quadraticCurveTo(R + 16, B - 24, R - 20, B);
  c.lineTo(L + 20, B);
  c.quadraticCurveTo(L - 16, B - 24, L - 10, T + 70);
  c.quadraticCurveTo(L - 4, T, L + 24, T);
  c.closePath();
  c.fillStyle = alpha(C.plasterLt, 0.9);
  c.fill();
  c.strokeStyle = C.ink;
  c.lineWidth = 4.2;
  c.stroke();

  // Rope binding, inner.
  c.strokeStyle = alpha(C.ochre, 0.8);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(L + 10, T + 12);
  c.lineTo(R - 10, T + 12);
  c.stroke();

  // The name.
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  setFont(c, 52, 600, CN_FONT, '8px');
  c.fillStyle = C.lapisDk;
  c.fillText('鹈鹕测试', cx, 246);
  c.textAlign = 'left';

  // Base bar and tie.
  c.strokeStyle = C.ink;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(L + 6, B + 4);
  c.lineTo(R - 6, B + 4);
  c.stroke();
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(cx + 62, B + 6);
  c.lineTo(cx + 62, B + 22);
  c.lineTo(cx + 78, B + 26);
  c.stroke();

  // Faint red guide around the new panel.
  c.strokeStyle = alpha(C.red, 0.18);
  c.lineWidth = 1.2;
  c.strokeRect(L - 14, T - 12, R - L + 28, B - T + 26);
  c.restore();
}

// ---------------------------------------------------------------- scribe

const SCRIBE_S = 1.14;

function scribeSpace(c) {
  c.translate(1000, 858);
  c.scale(SCRIBE_S, SCRIBE_S);
  c.translate(-1000, -858);
}

function drawScribeStatic(c) {
  const ink = C.ink;
  c.save();
  scribeSpace(c);

  // Low seat.
  c.fillStyle = C.ochreDk;
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.beginPath();
  c.rect(972, 820, 54, 40);
  c.fill();
  c.stroke();
  c.strokeStyle = alpha(C.linen, 0.35);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(978, 834);
  c.lineTo(1020, 834);
  c.stroke();

  // Seat cushion.
  c.fillStyle = C.linen;
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.beginPath();
  c.ellipse(999, 820, 32, 7, 0, 0, TAU);
  c.fill();
  c.stroke();

  // Crossed legs, in ochre skin.
  const leg = (pts) => {
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
    c.fillStyle = C.skin;
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2.4;
    c.stroke();
  };
  leg([
    { x: 996, y: 806 }, { x: 950, y: 818 }, { x: 932, y: 842 },
    { x: 944, y: 852 }, { x: 966, y: 844 }, { x: 990, y: 836 },
  ]);
  leg([
    { x: 1010, y: 810 }, { x: 974, y: 832 }, { x: 952, y: 848 },
    { x: 962, y: 856 }, { x: 992, y: 844 }, { x: 1016, y: 828 },
  ]);

  // Torso, leaning slightly forward.
  c.beginPath();
  c.moveTo(976, 734);
  c.lineTo(1004, 722);
  c.lineTo(1020, 800);
  c.lineTo(990, 814);
  c.closePath();
  c.fillStyle = C.skin;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.8;
  c.stroke();

  // Linen kilt over the lap.
  c.beginPath();
  c.moveTo(982, 786);
  c.lineTo(1022, 784);
  c.lineTo(1018, 830);
  c.lineTo(1002, 842);
  c.lineTo(978, 832);
  c.closePath();
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.stroke();
  c.strokeStyle = alpha(C.ink, 0.5);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(986, 800);
  c.lineTo(1018, 798);
  c.stroke();

  // Left arm and palette.
  const arm = (a, b, w) => {
    c.strokeStyle = ink;
    c.lineWidth = w + 4;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.strokeStyle = C.skin;
    c.lineWidth = w;
    c.stroke();
  };
  arm({ x: 984, y: 738 }, { x: 962, y: 770 }, 7);
  arm({ x: 962, y: 770 }, { x: 944, y: 790 }, 6);
  c.fillStyle = C.skin;
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(942, 790, 5, 0, TAU);
  c.fill();
  c.stroke();

  // Palette with two paint wells.
  c.save();
  c.translate(922, 796);
  c.rotate(-0.1);
  c.fillStyle = C.ochre;
  c.strokeStyle = ink;
  c.lineWidth = 2.2;
  c.beginPath();
  c.rect(0, 0, 42, 16);
  c.fill();
  c.stroke();
  c.fillStyle = C.turq;
  c.beginPath();
  c.arc(10, 8, 3.6, 0, TAU);
  c.fill();
  c.fillStyle = C.lapis;
  c.beginPath();
  c.arc(22, 8, 3.6, 0, TAU);
  c.fill();
  c.fillStyle = C.linen;
  c.beginPath();
  c.arc(34, 8, 3.6, 0, TAU);
  c.fill();
  c.restore();

  // Neck.
  c.strokeStyle = C.skin;
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(982, 726);
  c.lineTo(980, 714);
  c.stroke();
  c.strokeStyle = ink;
  c.lineWidth = 1.6;
  c.globalAlpha = 0.5;
  c.beginPath();
  c.moveTo(976, 726);
  c.lineTo(975, 712);
  c.stroke();
  c.globalAlpha = 1;

  // Head in strict profile, facing left.
  c.fillStyle = C.skin;
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.beginPath();
  c.ellipse(975, 700, 14, 17, 0, 0, TAU);
  c.fill();
  c.stroke();
  // Nose and chin.
  c.beginPath();
  c.moveTo(963, 697);
  c.lineTo(956, 703);
  c.lineTo(963, 707);
  c.stroke();
  c.beginPath();
  c.moveTo(964, 712);
  c.quadraticCurveTo(972, 718, 980, 714);
  c.stroke();

  // Black wig: heavy, covering the ear and hanging behind.
  c.beginPath();
  c.moveTo(962, 686);
  c.quadraticCurveTo(976, 676, 989, 686);
  c.lineTo(994, 706);
  c.quadraticCurveTo(1000, 730, 994, 744);
  c.lineTo(982, 738);
  c.quadraticCurveTo(990, 718, 986, 704);
  c.quadraticCurveTo(984, 694, 968, 692);
  c.closePath();
  c.fillStyle = C.ink;
  c.fill();
  // Wig band.
  c.strokeStyle = C.lapis;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(962, 692);
  c.quadraticCurveTo(976, 684, 989, 694);
  c.stroke();

  // Eye, frontal in the profile head.
  c.save();
  c.beginPath();
  c.moveTo(965, 701);
  c.quadraticCurveTo(971, 697, 977, 701);
  c.quadraticCurveTo(971, 705, 965, 701);
  c.closePath();
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 1.6;
  c.stroke();
  c.fillStyle = ink;
  c.beginPath();
  c.arc(971.5, 701, 2, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(965, 700);
  c.lineTo(957, 699);
  c.stroke();
  c.restore();

  // Ear.
  c.fillStyle = C.skinDk;
  c.beginPath();
  c.ellipse(983, 704, 3.4, 5, 0.2, 0, TAU);
  c.fill();

  // Papyrus sheet on a small stand.
  c.fillStyle = C.linen;
  c.strokeStyle = ink;
  c.lineWidth = 2.6;
  c.beginPath();
  c.moveTo(858, 682);
  c.quadraticCurveTo(882, 672, 906, 682);
  c.lineTo(906, 822);
  c.quadraticCurveTo(882, 830, 858, 822);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = C.ochreDk;
  c.fillRect(852, 820, 60, 10);
  c.strokeRect(852, 820, 60, 10);

  // Tally cells.
  c.strokeStyle = alpha(C.ink, 0.55);
  c.lineWidth = 1.3;
  for (let k = 1; k <= 5; k += 1) {
    const y = CELL.y0 + (k - 1) * CELL.step;
    c.strokeRect(CELL.x0, y, CELL.x1 - CELL.x0, CELL.h);
  }
  // A smudged earlier group on the left of the sheet.
  c.fillStyle = alpha(C.ink, 0.35);
  for (let k = 0; k < 3; k += 1) {
    c.fillRect(866, 700 + k * 9, 2.4, 6);
  }
  c.restore();
}

function drawCaptionColumns(c) {
  const cols = [
    { x: 1150, kinds: ['ankh', 'reed', 'water', 'loaf'] },
    { x: 1222, kinds: ['bird', 'water', 'basket'] },
  ];
  const colours = [C.lapis, C.ochre, C.turq];
  for (let ci = 0; ci < cols.length; ci += 1) {
    const col = cols[ci];
    let y = 700;
    for (let k = 0; k < col.kinds.length; k += 1) {
      glyphPath(c, col.kinds[k], col.x, y, 46, colours[(k + ci) % 3]);
      y -= 58;
    }
    // Ruling lines.
    c.strokeStyle = alpha(C.ink, 0.42);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(col.x - 30, 470);
    c.lineTo(col.x - 30, 710);
    c.moveTo(col.x + 30, 470);
    c.lineTo(col.x + 30, 710);
    c.stroke();
  }
}

function drawOfferingTable(c) {
  const ink = C.ink;
  // Legs and slab.
  c.strokeStyle = ink;
  c.lineWidth = 4;
  c.fillStyle = C.ochreDk;
  c.beginPath();
  c.rect(1112, 790, 150, 12);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(1126, 802);
  c.lineTo(1122, 856);
  c.lineTo(1136, 856);
  c.lineTo(1138, 802);
  c.closePath();
  c.fillStyle = C.ochreDk;
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(1244, 802);
  c.lineTo(1248, 856);
  c.lineTo(1234, 856);
  c.lineTo(1232, 802);
  c.closePath();
  c.fill();
  c.stroke();

  // Loaves.
  const loaf = (x, w, h, col) => {
    c.beginPath();
    c.moveTo(x - w, 790);
    c.quadraticCurveTo(x, 790 - h, x + w, 790);
    c.closePath();
    c.fillStyle = col;
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2.2;
    c.stroke();
  };
  loaf(1178, 16, 34, C.ochre);
  loaf(1210, 15, 30, C.linen);
  loaf(1240, 14, 40, C.turq);

  // Jar.
  c.beginPath();
  c.moveTo(1140, 790);
  c.quadraticCurveTo(1130, 770, 1142, 752);
  c.lineTo(1156, 752);
  c.quadraticCurveTo(1168, 770, 1158, 790);
  c.closePath();
  c.fillStyle = C.lapis;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.stroke();
  c.fillStyle = C.lapisDk;
  c.fillRect(1140, 748, 18, 5);

  // Lotus and grapes.
  c.strokeStyle = C.turq;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(1268, 790);
  c.quadraticCurveTo(1264, 764, 1270, 744);
  c.stroke();
  c.fillStyle = C.lapis;
  c.strokeStyle = ink;
  c.lineWidth = 1.8;
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i - 2) * 0.36;
    c.beginPath();
    c.ellipse(1270 + Math.cos(a) * 8, 738 + Math.sin(a) * 8, 6, 10, a + Math.PI / 2, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.fillStyle = C.linen;
  c.beginPath();
  c.arc(1270, 736, 4, 0, TAU);
  c.fill();

  const rand = rngFor(66);
  for (let i = 0; i < 9; i += 1) {
    c.fillStyle = i % 2 ? C.lapis : C.turq;
    c.beginPath();
    c.arc(1196 + rand() * 20, 774 + rand() * 12, 2.4, 0, TAU);
    c.fill();
  }
}

// ---------------------------------------------------------------- bottom register

function drawBottomRegister(c) {
  const ink = C.ink;
  const base = 1004;

  // Water band.
  c.strokeStyle = C.turq;
  c.lineWidth = 2.6;
  c.beginPath();
  for (let x = 600; x <= 1560; x += 20) {
    const z = Math.sin((x - 600) / 20 * Math.PI) * 5;
    if (x === 600) c.moveTo(x, 946 + z);
    else c.lineTo(x, 946 + z);
  }
  c.stroke();

  // Lotus clump.
  const lotus = (x, h, open) => {
    c.strokeStyle = C.turq;
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x - 8, base - h * 0.5, x, base - h);
    c.stroke();
    c.fillStyle = open ? C.lapis : C.turq;
    c.strokeStyle = ink;
    c.lineWidth = 1.6;
    if (open) {
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i - 2) * 0.32;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * 7, base - h + Math.sin(a) * 7, 4.6, 8, a + Math.PI / 2, 0, TAU);
        c.fill();
        c.stroke();
      }
    } else {
      c.beginPath();
      c.moveTo(x, base - h - 10);
      c.quadraticCurveTo(x + 7, base - h + 4, x, base - h + 8);
      c.quadraticCurveTo(x - 7, base - h + 4, x, base - h - 10);
      c.fill();
      c.stroke();
    }
  };
  lotus(1060, 96, true);
  lotus(1092, 76, false);
  lotus(1120, 110, true);
  lotus(1152, 62, false);
  lotus(1196, 88, true);
  lotus(700, 72, false);
  lotus(-460, 88, true);

  // Papyrus umbel.
  c.strokeStyle = C.turq;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(1250, base);
  c.lineTo(1252, 928);
  c.stroke();
  c.strokeStyle = ink;
  c.lineWidth = 1.2;
  for (let i = -3; i <= 3; i += 1) {
    c.beginPath();
    c.moveTo(1252, 928);
    c.lineTo(1252 + i * 9, 906);
    c.stroke();
  }
  c.fillStyle = C.turq;
  for (let i = -3; i <= 3; i += 1) {
    c.beginPath();
    c.arc(1252 + i * 9, 905, 3, 0, TAU);
    c.fill();
  }

  // Bread loaves on a mat.
  c.fillStyle = alpha(C.ochre, 0.4);
  c.fillRect(1310, 982, 150, 12);
  const rand = rngFor(818);
  for (let i = 0; i < 4; i += 1) {
    const x = 1324 + i * 34;
    c.beginPath();
    c.moveTo(x - 14, 982);
    c.quadraticCurveTo(x, 982 - 30 - rand() * 8, x + 14, 982);
    c.closePath();
    c.fillStyle = i % 2 ? C.ochre : C.linen;
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2;
    c.stroke();
  }

  // Cat, seated in profile, facing right.
  c.save();
  c.translate(795, 978);
  c.scale(1.25, 1.25);
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.fillStyle = C.ochre;
  c.beginPath();
  c.moveTo(-16, 0);
  c.quadraticCurveTo(-24, -30, -12, -46);
  c.quadraticCurveTo(0, -56, 12, -44);
  c.quadraticCurveTo(20, -26, 12, 0);
  c.closePath();
  c.fill();
  c.stroke();
  // Head.
  c.beginPath();
  c.arc(8, -54, 11, 0, TAU);
  c.fill();
  c.stroke();
  // Ears.
  c.beginPath();
  c.moveTo(1, -62);
  c.lineTo(2, -72);
  c.lineTo(8, -64);
  c.moveTo(11, -64);
  c.lineTo(17, -72);
  c.lineTo(17, -61);
  c.stroke();
  // Eye and nose.
  c.fillStyle = ink;
  c.beginPath();
  c.arc(12, -55, 2.2, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(19, -53);
  c.lineTo(22, -51);
  c.lineTo(19, -50);
  c.fill();
  // Collar.
  c.strokeStyle = C.turq;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(8, -50, 9, 0.15, Math.PI - 0.15);
  c.stroke();
  // Curled tail around the feet.
  c.strokeStyle = C.ochre;
  c.lineWidth = 4.4;
  c.beginPath();
  c.moveTo(-14, -4);
  c.quadraticCurveTo(-40, 2, -26, 8);
  c.quadraticCurveTo(-8, 12, 8, 8);
  c.stroke();
  c.strokeStyle = ink;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-16, 0);
  c.lineTo(-16, -30);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- damage

function drawUnfinishedSketch(c) {
  // Artist's red-ochre underdrawing of a foot, half washed over with plaster.
  c.save();
  c.strokeStyle = alpha(C.red, 0.5);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(172, 812);
  c.lineTo(184, 772);
  c.quadraticCurveTo(214, 762, 252, 776);
  c.lineTo(268, 790);
  c.quadraticCurveTo(276, 800, 262, 806);
  c.lineTo(232, 800);
  c.stroke();
  // Toes.
  for (let i = 0; i < 4; i += 1) {
    c.beginPath();
    c.moveTo(236 + i * 8, 782 - i * 2);
    c.lineTo(244 + i * 7, 798 - i * 3);
    c.stroke();
  }
  // Ankle and shin, breaking off mid-stroke.
  c.beginPath();
  c.moveTo(184, 772);
  c.lineTo(176, 754);
  c.lineTo(168, 726);
  c.stroke();
  // A second, earlier foot at the left, nearly erased.
  c.strokeStyle = alpha(C.red, 0.3);
  c.beginPath();
  c.moveTo(96, 828);
  c.lineTo(106, 794);
  c.quadraticCurveTo(130, 786, 160, 798);
  c.lineTo(172, 810);
  c.stroke();
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(148 + i * 7, 802 - i * 2);
    c.lineTo(154 + i * 6, 814 - i * 3);
    c.stroke();
  }
  // Grid around the sketch.
  c.strokeStyle = alpha(C.red, 0.2);
  c.lineWidth = 1;
  for (let x = 60; x <= 300; x += 36) {
    c.beginPath();
    c.moveTo(x, 710);
    c.lineTo(x, 830);
    c.stroke();
  }
  for (let y = 710; y <= 830; y += 36) {
    c.beginPath();
    c.moveTo(60, y);
    c.lineTo(300, y);
    c.stroke();
  }
  // Plaster wash over the right side: unfinished under the paint.
  c.fillStyle = alpha(C.plaster, 0.55);
  c.beginPath();
  c.moveTo(226, 758);
  c.lineTo(286, 752);
  c.lineTo(292, 818);
  c.lineTo(222, 822);
  c.closePath();
  c.fill();
  c.restore();
}

function drawCracks(c) {
  const rand = rngFor(404);
  const crack = (x, y, len, ang, w) => {
    c.strokeStyle = alpha(C.ink, 0.26);
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x, y);
    let px = x;
    let py = y;
    let a = ang;
    const seg = 7 + Math.floor(rand() * 5);
    for (let i = 0; i < seg; i += 1) {
      a += (rand() - 0.5) * 0.7;
      px += Math.cos(a) * (len / seg);
      py += Math.sin(a) * (len / seg);
      c.lineTo(px, py);
    }
    c.stroke();
    if (rand() > 0.55) {
      c.strokeStyle = alpha(C.ink, 0.16);
      c.lineWidth = w * 0.7;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px + (rand() - 0.5) * 60, py + 30 + rand() * 40);
      c.stroke();
    }
  };
  crack(-320, 120, 260, 0.7, 1.3);
  crack(980, -20, 300, 1.35, 1.2);
  crack(1360, 300, 240, 1.8, 1.1);
  crack(1560, 640, 300, 1.2, 1.4);
  crack(-120, 860, 220, -0.9, 1.2);
  crack(420, 420, 190, 2.3, 1);
  crack(700, 960, 210, -0.4, 1.1);
  crack(-620, 380, 300, 0.4, 1.2);
  crack(80, 300, 240, 1.5, 1);
  crack(300, 620, 200, -0.5, 1.1);
  crack(1280, 760, 180, 2.6, 1);
  crack(880, 500, 150, 0.9, 0.9);
}

function blob(c, cx, cy, r, seed, squish = 0.78, n = 16, wob = 0.24) {
  const rand = rngFor(seed);
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    const rr = r * (1 - wob + rand() * wob * 2);
    pts.push({
      x: cx + Math.cos(a) * rr * 1.1,
      y: cy + Math.sin(a) * rr * squish,
    });
  }
  return pts;
}

function polyPath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

function paintLoss(c, cx, cy, r, seed, squish = 0.72) {
  const pts = blob(c, cx, cy, r, seed, squish);
  c.save();
  // Recessed edge.
  polyPath(c, pts);
  c.fillStyle = alpha(C.ochreDk, 0.35);
  c.fill();
  c.translate(1.5, 2);
  polyPath(c, pts);
  c.fillStyle = '#ddcb9f';
  c.fill();
  c.restore();
  // Exposed plaster is lighter and a touch cooler.
  c.save();
  c.globalAlpha = 0.45;
  const inner = blob(c, cx, cy, r * 0.7, seed + 11, squish, 13, 0.3);
  polyPath(c, inner);
  c.fillStyle = '#e7d8b6';
  c.fill();
  c.restore();
  // Loose flakes at the rim.
  const rand = rngFor(seed + 3);
  for (let i = 0; i < 10; i += 1) {
    const a = rand() * TAU;
    const rr = r * (1.02 + rand() * 0.18);
    c.fillStyle = alpha(rand() > 0.5 ? C.plasterLt : C.plasterDk, 0.5);
    c.beginPath();
    c.ellipse(cx + Math.cos(a) * rr * 1.1, cy + Math.sin(a) * rr * squish, 2 + rand() * 6, 1.4 + rand() * 4, a, 0, TAU);
    c.fill();
  }
}

function drawPaintLoss(c) {
  paintLoss(c, 1430, 48, 128, 21);
  paintLoss(c, -520, 210, 96, 33);
  paintLoss(c, 876, 214, 48, 47, 0.9);
  paintLoss(c, 1520, 700, 90, 59, 0.85);
  paintLoss(c, 1500, 1006, 108, 71);
  paintLoss(c, -700, 900, 84, 83);
  paintLoss(c, 1140, 330, 44, 97, 0.6);
  paintLoss(c, 330, 120, 36, 109);
  // Fine chips.
  const rand = rngFor(131);
  c.save();
  for (let i = 0; i < 46; i += 1) {
    const x = WALL.x0 + rand() * WALL.w;
    const y = WALL.y0 + rand() * WALL.h;
    if (x > 340 && x < 720 && y > 430 && y < 830) continue;
    const rr = 1.4 + rand() * 5;
    c.fillStyle = alpha(rand() > 0.4 ? C.plasterLt : C.linen, 0.55);
    c.beginPath();
    c.ellipse(x, y, rr, rr * 0.7, rand() * TAU, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawEdgeDamage(c) {
  // A chipped corner at the top right exposing mudbrick and straw.
  const rand = rngFor(515);
  c.save();
  c.beginPath();
  c.moveTo(1240, -40);
  c.lineTo(1600, -40);
  c.lineTo(1600, 96);
  c.lineTo(1528, 78);
  c.lineTo(1476, 92);
  c.lineTo(1420, 58);
  c.lineTo(1360, 66);
  c.lineTo(1310, 34);
  c.lineTo(1240, 44);
  c.closePath();
  c.fillStyle = C.mud;
  c.fill();
  c.strokeStyle = alpha(C.ink, 0.4);
  c.lineWidth = 2;
  c.stroke();
  // Straw temper.
  c.strokeStyle = alpha(C.linen, 0.45);
  c.lineWidth = 1.3;
  for (let i = 0; i < 22; i += 1) {
    const x = 1260 + rand() * 330;
    const y = -20 + rand() * 90;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 6 + rand() * 14, y + (rand() - 0.5) * 8);
    c.stroke();
  }
  c.restore();

  // Crumbled lower right edge.
  c.save();
  c.beginPath();
  c.moveTo(1600, 1040);
  c.lineTo(1600, 1100);
  c.lineTo(1200, 1100);
  c.lineTo(1230, 1064);
  c.lineTo(1300, 1058);
  c.lineTo(1360, 1024);
  c.lineTo(1430, 1042);
  c.lineTo(1500, 1008);
  c.lineTo(1560, 1022);
  c.closePath();
  c.fillStyle = alpha(C.mud, 0.9);
  c.fill();
  c.restore();
}

function drawPigmentGrain(c) {
  const rand = rngFor(707);
  c.save();
  for (let i = 0; i < 2600; i += 1) {
    const x = WALL.x0 + rand() * WALL.w;
    const y = WALL.y0 + rand() * WALL.h;
    const light = rand() > 0.5;
    c.fillStyle = alpha(light ? '#f2e3c2' : '#8a7046', 0.03 + rand() * 0.07);
    c.fillRect(x, y, 0.8 + rand() * 1.6, 0.8 + rand() * 1.6);
  }
  // Craquelure on the painted bands.
  c.strokeStyle = alpha(C.ink, 0.08);
  c.lineWidth = 0.7;
  for (let i = 0; i < 120; i += 1) {
    const x = WALL.x0 + rand() * WALL.w;
    const y = 60 + rand() * 900;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 4 + rand() * 12, y + (rand() - 0.5) * 8);
    c.stroke();
  }
  c.restore();
}

// ---------------------------------------------------------------- rider: live

function isFrozen(local) {
  return (local >= 2.0 && local < 2.5) || (local >= 4.0 && local < 4.5);
}

function guideAlpha(local) {
  let a = 0;
  const windows = [
    [2.0, 2.5],
    [4.0, 4.5],
  ];
  for (const [s, e] of windows) {
    if (local >= s - 0.1 && local <= e) a = Math.max(a, 1);
    else if (local > e && local < e + 1.25) {
      a = Math.max(a, 1 - (local - e) / 1.25);
    }
  }
  return a;
}

function drawGuideLines(g, ctx) {
  const a = guideAlpha(ctx.local);
  if (a <= 0.01) return;
  const c = g.drawingContext;
  const x0 = RX - 140;
  const x1 = RX + (170 + 20) * RS;
  const y0 = 352;
  const y1 = 828;
  c.save();
  c.globalAlpha = a * 0.55;
  c.strokeStyle = C.red;
  c.lineWidth = 1.3;
  // Construction box.
  c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // Canonical axes: ground, hubs, head, beak tip.
  const langs = [
    [y1, x0, x1],
    [RY - 50 * RS, x0 - 14, x1 + 14],
    [RY - 284 * RS, x0 - 14, x1 + 14],
    [y0 + 8, x0 + 40, x1 - 40],
  ];
  for (const [y, ax, bx] of langs) {
    c.beginPath();
    c.moveTo(ax, y);
    c.lineTo(bx, y);
    c.stroke();
  }
  for (const x of [RX - 72 * RS, RX + 2 * RS, RX + 128 * RS, RX + 170 * RS]) {
    c.beginPath();
    c.moveTo(x, y0 - 8);
    c.lineTo(x, y1 + 8);
    c.stroke();
  }
  // Small crosses at the key points.
  c.lineWidth = 1;
  for (const [x, y] of [[RX - 72 * RS, RY - 50 * RS], [RX + 72 * RS, RY - 50 * RS]]) {
    c.beginPath();
    c.moveTo(x - 5, y);
    c.lineTo(x + 5, y);
    c.moveTo(x, y - 5);
    c.lineTo(x, y + 5);
    c.stroke();
  }
  c.restore();
}

function frameOf(pose) {
  return {
    rearHub: { x: RIG.rearHub.x, y: RIG.rearHub.y },
    frontHub: { x: RIG.frontHub.x, y: RIG.frontHub.y },
    crank: { x: RIG.crank.x, y: RIG.crank.y },
    seatCluster: { x: -30, y: -130 },
    headTop: { x: 52, y: -134 },
    stemTop: { x: 60, y: -142 },
    saddle: { x: -30, y: -132 },
    ...pose.frame,
  };
}

function canonicalPose(t) {
  const hip = { x: -16, y: -146 };
  const crank = { x: 2, y: -54 };
  return {
    wheelAngle: -TAU * t,
    wheels: {
      rear: { x: -72, y: -50, r: 50 },
      front: { x: 72, y: -50, r: 50 },
    },
    frame: {
      rearHub: { x: -72, y: -50 },
      frontHub: { x: 72, y: -50 },
      crank: { x: 2, y: -54 },
      saddle: { x: -30, y: -132 },
      headTube: { x: 52, y: -130 },
      seatCluster: { x: -30, y: -130 },
      headTop: { x: 52, y: -134 },
      stemTop: { x: 60, y: -142 },
    },
    grip: { x: 80, y: -144 },
    saddle: { x: -30, y: -132 },
    hip,
    legs: {
      near: { knee: { x: 36, y: -112 }, ankle: { x: 22, y: -58 }, hip },
      far: { knee: { x: 24, y: -100 }, ankle: { x: -20, y: -58 }, hip },
    },
    pedals: { near: { x: 20, y: -54 }, far: { x: -18, y: -54 } },
    crankCenter: crank,
    crankR: 17,
    body: { x: -6, y: -170, rx: 62, ry: 38 },
    head: { x: 34, y: -258 },
  };
}

function drawRider(g, ctx) {
  const c = g.drawingContext;
  const frozen = isFrozen(ctx.local);
  const pose = frozen ? canonicalPose(ctx.t) : rigPose(ctx.t);

  c.save();
  c.translate(RX, RY);
  c.scale(RS, RS);
  paintBicycle(c, pose, frozen);
  paintBird(c, pose, frozen);
  paintedLegs(c, pose, frozen);
  c.restore();
}

// ---------------------------------------------------------------- bicycle

function strokeLine(c, a, b, col, w) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
}

function paintWheel(c, w, angle) {
  c.save();
  c.translate(w.x, w.y);
  // Tire.
  c.strokeStyle = C.ink;
  c.lineWidth = 13;
  c.beginPath();
  c.arc(0, 0, w.r - 5, 0, TAU);
  c.stroke();
  c.strokeStyle = C.ochreDk;
  c.lineWidth = 8;
  c.beginPath();
  c.arc(0, 0, w.r - 5, 0, TAU);
  c.stroke();
  // Rim.
  c.strokeStyle = C.ink;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, w.r - 12, 0, TAU);
  c.stroke();
  c.strokeStyle = C.turq;
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, w.r - 14, 0, TAU);
  c.stroke();
  // Spokes.
  for (let i = 0; i < 8; i += 1) {
    const a = angle + (i / 8) * TAU;
    const gold = i === 0;
    c.strokeStyle = C.ink;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * (w.r - 15), Math.sin(a) * (w.r - 15));
    c.stroke();
    c.strokeStyle = gold ? C.gold : C.ochre;
    c.lineWidth = 1.7;
    c.stroke();
  }
  // Hub.
  c.fillStyle = C.lapis;
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 5.5, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = C.linen;
  c.beginPath();
  c.arc(0, 0, 1.8, 0, TAU);
  c.fill();
  c.restore();
}

function paintLeg(c, hip, knee, ankle, dark, pedal) {
  const ink = C.ink;
  const col = dark ? mix(C.ochre, C.ink, 0.32) : '#c68a33';
  const w = (base) => (dark ? base * 0.9 : base);
  // Pedal under the foot.
  c.fillStyle = C.ochreDk;
  c.strokeStyle = C.ink;
  c.lineWidth = 1.6;
  c.beginPath();
  c.rect(pedal.x - 8, pedal.y - 3.4, 18, 5.4);
  c.fill();
  c.stroke();
  // Thigh.
  strokeLine(c, hip, knee, ink, w(16));
  strokeLine(c, hip, knee, col, w(10.6));
  // Knee.
  c.fillStyle = col;
  c.strokeStyle = ink;
  c.lineWidth = 1.8;
  c.beginPath();
  c.arc(knee.x, knee.y, w(6), 0, TAU);
  c.fill();
  c.stroke();
  // Shin.
  strokeLine(c, knee, ankle, ink, w(12));
  strokeLine(c, knee, ankle, col, w(7.6));
  // Anklet.
  c.strokeStyle = C.lapis;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ankle.x - 5, ankle.y - 6);
  c.lineTo(ankle.x + 6, ankle.y - 5);
  c.stroke();
  c.strokeStyle = C.gold;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(ankle.x - 5, ankle.y - 8);
  c.lineTo(ankle.x + 6, ankle.y - 7);
  c.stroke();
  // Webbed foot on the pedal.
  c.beginPath();
  c.moveTo(ankle.x - 5, ankle.y - 3);
  c.lineTo(ankle.x + 18, ankle.y - 4);
  c.lineTo(ankle.x + 17, ankle.y + 4);
  c.lineTo(ankle.x + 4, ankle.y + 7);
  c.lineTo(ankle.x - 6, ankle.y + 4);
  c.closePath();
  c.fillStyle = col;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.2;
  c.stroke();
  c.strokeStyle = alpha(ink, 0.6);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(ankle.x + 6, ankle.y);
  c.lineTo(ankle.x + 14, ankle.y - 1);
  c.stroke();
}

function traceBody(c, b) {
  c.beginPath();
  c.moveTo(b.x - 56, b.y + 2);
  c.bezierCurveTo(b.x - 52, b.y - 22, b.x - 22, b.y - 38, b.x + 8, b.y - 36);
  c.bezierCurveTo(b.x + 38, b.y - 34, b.x + 54, b.y - 16, b.x + 52, b.y + 2);
  c.bezierCurveTo(b.x + 50, b.y + 24, b.x + 22, b.y + 38, b.x - 10, b.y + 36);
  c.bezierCurveTo(b.x - 38, b.y + 34, b.x - 56, b.y + 20, b.x - 56, b.y + 2);
  c.closePath();
}

function paintBicycle(c, pose, frozen) {
  const f = frameOf(pose);

  // Wheels.
  paintWheel(c, pose.wheels.rear, pose.wheelAngle);
  paintWheel(c, pose.wheels.front, pose.wheelAngle);

  // Chain.
  c.strokeStyle = alpha(C.ink, 0.65);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(f.crank.x, f.crank.y - 15);
  c.lineTo(f.rearHub.x, f.rearHub.y - 7);
  c.moveTo(f.crank.x, f.crank.y + 15);
  c.lineTo(f.rearHub.x, f.rearHub.y + 7);
  c.stroke();

  // Frame tubes: dark ground, lapis paint, gold lug dots.
  const tubes = [
    [f.rearHub, f.crank],
    [f.crank, f.seatCluster],
    [f.seatCluster, f.rearHub],
    [f.crank, f.headTop],
    [f.seatCluster, f.headTop],
    [f.headTop, f.frontHub],
    [f.seatCluster, { x: f.saddle.x, y: f.saddle.y - 3 }],
    [f.headTop, f.stemTop],
  ];
  for (const [a, b] of tubes) {
    strokeLine(c, a, b, C.ink, 8.4);
    strokeLine(c, a, b, C.lapis, 4.8);
  }
  for (const p of [f.rearHub, f.crank, f.seatCluster, f.headTop, f.frontHub]) {
    c.fillStyle = C.gold;
    c.strokeStyle = C.ink;
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(p.x, p.y, 3, 0, TAU);
    c.fill();
    c.stroke();
  }

  // Handlebar.
  const bar = [
    { x: 52, y: -130 },
    { x: 62, y: -148 },
    { x: 78, y: -156 },
    { x: 91, y: -152 },
    { x: 84, y: -144 },
  ];
  c.strokeStyle = C.ink;
  c.lineWidth = 8.4;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(bar[0].x, bar[0].y);
  for (let i = 1; i < bar.length; i += 1) c.lineTo(bar[i].x, bar[i].y);
  c.stroke();
  c.strokeStyle = C.ochre;
  c.lineWidth = 4.6;
  c.stroke();
  // Grip end.
  c.fillStyle = C.ink;
  c.beginPath();
  c.arc(84, -144, 3.6, 0, TAU);
  c.fill();

  // Saddle.
  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(f.saddle.x - 4, f.saddle.y - 1, 21, 6, -0.06, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(C.ochre, 0.8);
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(f.saddle.x - 4, f.saddle.y - 2, 17, 3, -0.06, 0, TAU);
  c.stroke();

  // Chainring and near crank.
  c.fillStyle = alpha(C.lapis, 0.4);
  c.strokeStyle = C.lapis;
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(f.crank.x, f.crank.y, 12, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = alpha(C.ink, 0.65);
  c.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU;
    c.beginPath();
    c.moveTo(f.crank.x + Math.cos(a) * 5, f.crank.y + Math.sin(a) * 5);
    c.lineTo(f.crank.x + Math.cos(a) * 11, f.crank.y + Math.sin(a) * 11);
    c.stroke();
  }
}

// Both legs are painted in profile over the machine and under-slung from the
// belly, so the strict-profile canon shows them clearly.
function paintedLegs(c, pose, frozen) {
  const body = {
    x: pose.body.x,
    y: pose.body.y + 5 - (frozen ? 0 : 2),
  };
  const bowKnee = (hip, ankle, bow) => {
    const dx = ankle.x - hip.x;
    const dy = ankle.y - hip.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    return {
      x: (hip.x + ankle.x) / 2 + (dy / len) * bow,
      y: (hip.y + ankle.y) / 2 - (dx / len) * bow,
    };
  };

  const hipN = { x: body.x + 10, y: body.y + 30 };
  const hipF = { x: body.x - 4, y: body.y + 28 };
  const ankleN = pose.legs.near.ankle;
  const ankleF = pose.legs.far.ankle;

  // Far pedal and leg.
  c.save();
  c.globalAlpha = 0.92;
  strokeLine(c, pose.crankCenter, pose.pedals.far, alpha(C.ink, 0.55), 3);
  paintLeg(c, hipF, bowKnee(hipF, ankleF, 18), ankleF, true, pose.pedals.far);
  c.restore();

  // Near pedal and leg.
  strokeLine(c, pose.crankCenter, pose.pedals.near, C.ink, 4.2);
  paintLeg(c, hipN, bowKnee(hipN, ankleN, 24), ankleN, false, pose.pedals.near);
}

// ---------------------------------------------------------------- pelican

function paintBird(c, pose, frozen) {
  const ink = C.ink;
  const body = {
    x: pose.body.x,
    y: pose.body.y + 5 - (frozen ? 0 : 2),
    rx: 60,
    ry: 37,
  };
  // Canonical: neck vertical, head high, beak level. Riding: head lower and
  // pushed forward, so the snap back into the canon is visible.
  const head = frozen
    ? { x: body.x + 32, y: body.y - 114 }
    : { x: pose.head.x + 2, y: pose.head.y - 52 };

  // Tail: three short feathers, fanned and rounded.
  for (let i = 0; i < 3; i += 1) {
    const y0 = body.y - 12 + i * 10;
    const tx = body.x - 78;
    const ty = body.y - 22 + i * 17;
    c.beginPath();
    c.moveTo(body.x - 30, y0 - 7);
    c.quadraticCurveTo(body.x - 66, ty - 10, tx + 4, ty - 5);
    c.quadraticCurveTo(tx - 4, ty, tx + 4, ty + 6);
    c.quadraticCurveTo(body.x - 66, ty + 10, body.x - 30, y0 + 8);
    c.closePath();
    c.fillStyle = i === 1 ? C.linen : mix(C.linen, C.ochre, 0.22);
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 2.4;
    c.stroke();
    // Lapis band near the tip.
    c.strokeStyle = C.lapis;
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(tx + 26, ty - 6);
    c.lineTo(tx + 12, ty + 7);
    c.stroke();
  }

  // Neck first, so the body covers its root cleanly.
  const nb = { x: body.x + 18, y: body.y - body.ry + 6 };
  const hb = { x: head.x - 2, y: head.y + 18 };
  c.beginPath();
  c.moveTo(nb.x - 22, nb.y + 6);
  c.bezierCurveTo(nb.x + 2, nb.y - 44, hb.x - 28, hb.y + 36, hb.x - 20, hb.y);
  c.lineTo(hb.x + 13, hb.y - 6);
  c.bezierCurveTo(nb.x + 30, nb.y - 46, nb.x + 25, nb.y - 10, nb.x + 22, nb.y + 16);
  c.closePath();
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 3;
  c.stroke();

  // Body: chest forward, belly low, back gently arched.
  traceBody(c, body);
  c.fillStyle = mix(C.linen, C.ochre, 0.14);
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 3.2;
  c.stroke();

  // Head.
  c.beginPath();
  c.ellipse(head.x, head.y, 26, 24, 0, 0, TAU);
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 3.2;
  c.stroke();
  // A painted feather crest.
  c.beginPath();
  c.moveTo(head.x - 8, head.y - 19);
  c.quadraticCurveTo(head.x - 18, head.y - 32, head.x - 28, head.y - 29);
  c.quadraticCurveTo(head.x - 18, head.y - 23, head.x - 13, head.y - 12);
  c.closePath();
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.stroke();

  // Beak: deep upper mandible and a hanging pouch.
  const tip = { x: head.x + 122, y: head.y + 6 };
  c.beginPath();
  c.moveTo(head.x + 8, head.y - 18);
  c.quadraticCurveTo(head.x + 62, head.y - 16, tip.x - 12, head.y - 4);
  c.quadraticCurveTo(tip.x, head.y + 1, tip.x - 2, head.y + 5);
  c.quadraticCurveTo(head.x + 58, head.y + 12, head.x + 6, head.y + 8);
  c.closePath();
  c.fillStyle = C.ochre;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 3;
  c.stroke();
  // Pouch, hung from the lower mandible.
  c.beginPath();
  c.moveTo(head.x + 4, head.y + 10);
  c.bezierCurveTo(head.x + 22, head.y + 56, head.x + 76, head.y + 70, tip.x - 16, head.y + 9);
  c.quadraticCurveTo(tip.x - 8, head.y + 7, tip.x - 8, head.y + 4);
  c.lineTo(head.x + 14, head.y + 4);
  c.closePath();
  c.fillStyle = mix(C.linen, C.ochre, 0.24);
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.8;
  c.stroke();
  // Pouch folds.
  c.strokeStyle = alpha(ink, 0.42);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(head.x + 18, head.y + 18);
  c.quadraticCurveTo(head.x + 48, head.y + 52, head.x + 88, head.y + 44);
  c.stroke();
  c.beginPath();
  c.moveTo(head.x + 16, head.y + 12);
  c.quadraticCurveTo(head.x + 42, head.y + 38, head.x + 74, head.y + 32);
  c.stroke();
  // Bill line.
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(head.x + 12, head.y + 6);
  c.quadraticCurveTo(head.x + 60, head.y + 10, tip.x - 4, head.y + 4);
  c.stroke();
  // Nostril.
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(head.x + 22, head.y - 10);
  c.lineTo(head.x + 36, head.y - 9);
  c.stroke();

  // Frontal Egyptian eye.
  const ex = head.x + 3;
  const ey = head.y - 7;
  c.beginPath();
  c.moveTo(ex - 11, ey);
  c.quadraticCurveTo(ex, ey - 9, ex + 10, ey - 1);
  c.quadraticCurveTo(ex, ey + 8, ex - 11, ey);
  c.closePath();
  c.fillStyle = C.linen;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 2.4;
  c.stroke();
  c.fillStyle = C.lapis;
  c.beginPath();
  c.arc(ex + 1, ey - 0.5, 4.4, 0, TAU);
  c.fill();
  c.fillStyle = ink;
  c.beginPath();
  c.arc(ex + 1, ey - 0.5, 2, 0, TAU);
  c.fill();
  // Kohl lid, tail and brow.
  c.strokeStyle = ink;
  c.lineWidth = 3.6;
  c.beginPath();
  c.moveTo(ex - 12, ey + 1);
  c.quadraticCurveTo(ex, ey - 10, ex + 10, ey - 1.5);
  c.stroke();
  c.lineWidth = 2.8;
  c.beginPath();
  c.moveTo(ex - 11, ey + 1);
  c.lineTo(ex - 30, ey + 2);
  c.stroke();
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(ex - 22, ey - 14);
  c.quadraticCurveTo(ex - 4, ey - 19, ex + 8, ey - 12);
  c.stroke();

  // Wing: a lapis field clipped to the flank, with painted feather bands.
  c.save();
  traceBody(c, body);
  c.clip();
  c.beginPath();
  c.moveTo(body.x + 38, body.y - 14);
  c.bezierCurveTo(body.x + 26, body.y - 36, body.x - 20, body.y - 40, body.x - 44, body.y - 28);
  c.bezierCurveTo(body.x - 62, body.y - 14, body.x - 62, body.y + 14, body.x - 44, body.y + 26);
  c.bezierCurveTo(body.x - 20, body.y + 40, body.x + 12, body.y + 32, body.x + 25, body.y + 18);
  c.bezierCurveTo(body.x + 33, body.y + 6, body.x + 39, body.y - 4, body.x + 38, body.y - 14);
  c.closePath();
  c.fillStyle = C.lapis;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 3.2;
  c.stroke();

  // Bands of feathers following the wing contour.
  const wingBands = [
    { col: C.turq, w: 5, dy: -10 },
    { col: C.linen, w: 3.8, dy: -1 },
    { col: C.gold, w: 2.4, dy: 8 },
  ];
  for (const band of wingBands) {
    c.strokeStyle = band.col;
    c.lineWidth = band.w;
    c.beginPath();
    c.moveTo(body.x - 42, body.y - 10 + band.dy);
    c.bezierCurveTo(
      body.x - 18, body.y - 4 + band.dy,
      body.x + 2, body.y - 2 + band.dy,
      body.x + 26, body.y - 14 + band.dy,
    );
    c.stroke();
  }
  // Feather separators across the bands.
  c.strokeStyle = alpha(ink, 0.55);
  c.lineWidth = 1.4;
  for (let i = 0; i < 6; i += 1) {
    const x = body.x - 34 + i * 11;
    const y = body.y - 12 + Math.sin((i / 6) * Math.PI) * 4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 3, y + 22 - i * 1.4);
    c.stroke();
  }
  // Scalloped feather edge along the bottom of the wing.
  c.strokeStyle = C.turq;
  c.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    const x = body.x - 26 + i * 11;
    const y = body.y + 20 - i * 1;
    c.beginPath();
    c.arc(x, y, 5.5, 0.05 * Math.PI, 0.95 * Math.PI);
    c.stroke();
  }
  // Gold beads on the leading edge.
  c.fillStyle = C.gold;
  for (let i = 0; i < 4; i += 1) {
    const t = i / 3;
    c.beginPath();
    c.arc(body.x + 22 - t * 60, body.y - 26 + Math.sin(t * Math.PI) * 6, 1.8, 0, TAU);
    c.fill();
  }
  c.restore();
  // Restore the body silhouette over the clipped wing.
  traceBody(c, body);
  c.strokeStyle = ink;
  c.lineWidth = 3.2;
  c.stroke();

  // Near wing reaching the handlebar.
  const armPts = [
    { x: body.x + 30, y: body.y - 22 },
    { x: body.x + 58, y: body.y - 6 },
    { x: pose.grip.x - 2, y: pose.grip.y + 5 },
  ];
  c.strokeStyle = ink;
  c.lineWidth = 15;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(armPts[0].x, armPts[0].y);
  c.quadraticCurveTo(armPts[1].x, armPts[1].y, armPts[2].x, armPts[2].y);
  c.stroke();
  c.strokeStyle = C.linen;
  c.lineWidth = 9.5;
  c.stroke();
  // Two lapis feather bands on the arm.
  c.strokeStyle = C.lapis;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(armPts[0].x + 8, armPts[0].y - 4);
  c.quadraticCurveTo(armPts[1].x, armPts[1].y - 2, armPts[2].x - 6, armPts[2].y + 2);
  c.stroke();
  // Feathered wingtip wrapped around the grip.
  c.fillStyle = C.linen;
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(pose.grip.x - 9, pose.grip.y - 3);
  c.quadraticCurveTo(pose.grip.x + 1, pose.grip.y - 12, pose.grip.x + 12, pose.grip.y - 3);
  c.quadraticCurveTo(pose.grip.x + 16, pose.grip.y + 6, pose.grip.x + 4, pose.grip.y + 8);
  c.quadraticCurveTo(pose.grip.x - 7, pose.grip.y + 8, pose.grip.x - 9, pose.grip.y - 3);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = alpha(ink, 0.55);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(pose.grip.x - 4, pose.grip.y - 4);
  c.lineTo(pose.grip.x + 8, pose.grip.y - 2);
  c.moveTo(pose.grip.x - 4, pose.grip.y + 1);
  c.lineTo(pose.grip.x + 9, pose.grip.y + 3);
  c.stroke();

  // Broad collar around the neck.
  const collarY = nb.y - 34;
  const collar = [C.lapis, C.turq, C.ochre];
  for (let i = 0; i < 3; i += 1) {
    const yy = collarY + i * 5;
    c.strokeStyle = collar[i];
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(nb.x - 13, yy - 2);
    c.quadraticCurveTo(nb.x + 6, yy + 11, nb.x + 25, yy - 2);
    c.stroke();
    if (i === 1) {
      c.fillStyle = C.gold;
      for (let k = -2; k <= 2; k += 1) {
        c.beginPath();
        c.arc(nb.x + 6 + k * 7, yy + 7 - Math.abs(k) * 2, 1.4, 0, TAU);
        c.fill();
      }
    }
  }
  // Pendant.
  c.fillStyle = C.lapis;
  c.strokeStyle = ink;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(nb.x + 6, collarY + 19);
  c.lineTo(nb.x + 11, collarY + 26);
  c.lineTo(nb.x + 6, collarY + 33);
  c.lineTo(nb.x + 1, collarY + 26);
  c.closePath();
  c.fill();
  c.stroke();
}

// ---------------------------------------------------------------- scribe: live

function drawTally(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const q = Math.floor(local * 12) / 12;
  let count = 0;
  for (let k = 1; k <= 5; k += 1) {
    if (q >= k + 0.06) count = k;
  }
  const latest = count;
  const ph = q - Math.floor(q);
  const tapping = latest > 0 && ph < 0.26 ? 1 : 0;

  const cellY = (k) => CELL.y0 + (k - 1) * CELL.step;
  const markY = latest ? cellY(latest) + CELL.h / 2 : cellY(1) + CELL.h / 2;

  c.save();
  scribeSpace(c);

  // Marks already made.
  for (let k = 1; k <= 5; k += 1) {
    if (q < k + 0.06) break;
    const yTop = cellY(k) + 3;
    const yBot = cellY(k) + CELL.h - 3;
    c.strokeStyle = C.ink;
    c.lineWidth = k === latest ? 5.4 : 4.6;
    c.beginPath();
    c.moveTo(882, yTop);
    c.lineTo(884, yTop + (yBot - yTop) * 0.5);
    c.lineTo(881, yBot);
    c.stroke();
  }

  // Arm.
  const sh = SCRIBE.shoulder;
  const elbowR = { x: 960, y: 760 };
  const elbowT = { x: 950, y: 772 };
  const handR = { x: 906, y: 744 };
  const handT = { x: 893, y: markY };
  const elbow = {
    x: elbowR.x + (elbowT.x - elbowR.x) * tapping,
    y: elbowR.y + (elbowT.y - elbowR.y) * tapping,
  };
  const hand = {
    x: handR.x + (handT.x - handR.x) * tapping,
    y: handR.y + (handT.y - handR.y) * tapping,
  };

  const limb = (a, b, w) => {
    c.strokeStyle = C.ink;
    c.lineWidth = w + 3.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.stroke();
    c.strokeStyle = C.skin;
    c.lineWidth = w;
    c.stroke();
  };
  limb(sh, elbow, 6.4);
  limb(elbow, hand, 5.2);

  // Hand and reed.
  c.fillStyle = C.skin;
  c.strokeStyle = C.ink;
  c.lineWidth = 1.8;
  c.beginPath();
  c.arc(hand.x, hand.y, 4.4, 0, TAU);
  c.fill();
  c.stroke();
  c.strokeStyle = C.ochre;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(hand.x - 2, hand.y + 1);
  c.lineTo(884, markY + 4);
  c.stroke();
  c.strokeStyle = C.ink;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(884, markY + 4);
  c.lineTo(882, markY + 2);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- flakes

function drawFlakes(g, ctx) {
  const c = g.drawingContext;
  const t = ctx.t;
  const rand = rngFor(77);
  c.save();
  for (let i = 0; i < 16; i += 1) {
    const ph = (t * 1.5 + i * 0.37) % 1;
    const x = RX - 96 - ph * 140 - rand() * 12;
    const y = RY - 6 - ph * 52 - rand() * 8;
    const r = 1.1 + (1 - ph) * 2.4;
    c.fillStyle = alpha(i % 3 === 0 ? C.linen : C.ochre, (1 - ph) * 0.5);
    c.beginPath();
    c.ellipse(x, y, r, r * 0.7, rand() * TAU, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- title card

function wedjat(c, x, y, u, col) {
  c.save();
  c.strokeStyle = col;
  c.lineWidth = Math.max(1.6, u * 0.09);
  c.lineCap = 'round';
  // Eye.
  c.beginPath();
  c.moveTo(x - u, y);
  c.quadraticCurveTo(x, y - u * 0.55, x + u, y);
  c.quadraticCurveTo(x, y + u * 0.5, x - u, y);
  c.closePath();
  c.stroke();
  c.fillStyle = col;
  c.beginPath();
  c.arc(x + u * 0.08, y - u * 0.02, u * 0.22, 0, TAU);
  c.fill();
  // Brow.
  c.lineWidth = Math.max(2, u * 0.13);
  c.beginPath();
  c.moveTo(x - u * 0.95, y - u * 0.55);
  c.quadraticCurveTo(x, y - u * 0.9, x + u * 0.9, y - u * 0.55);
  c.stroke();
  // Kohl tail.
  c.lineWidth = Math.max(1.4, u * 0.075);
  c.beginPath();
  c.moveTo(x - u * 0.95, y + u * 0.05);
  c.lineTo(x - u * 1.55, y + u * 0.38);
  c.lineTo(x - u * 1.25, y + u * 0.55);
  c.stroke();
  // Teardrop and curl.
  c.beginPath();
  c.moveTo(x + u * 0.26, y + u * 0.3);
  c.lineTo(x + u * 0.12, y + u * 1.15);
  c.quadraticCurveTo(x + u * 0.1, y + u * 1.4, x + u * 0.4, y + u * 1.35);
  c.stroke();
  c.restore();
}

function drawEgyptTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const y = H - 268 * s + lift * s;
  const w = 628 * s;
  const h = 168 * s;
  const rand = rngFor(909);

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.25 * s);

  // Carved cartouche panel.
  const rr = h / 2;
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();

  const gr = c.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#35598a');
  gr.addColorStop(0.5, '#2b4d7a');
  gr.addColorStop(1, '#20385a');
  c.fillStyle = gr;
  c.fill();

  // Gold frame, double.
  c.strokeStyle = '#d2ab5c';
  c.lineWidth = 3 * s;
  c.stroke();
  c.strokeStyle = 'rgba(241, 230, 200, 0.35)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 7 * s, y + 7 * s);
  c.lineTo(x + w - 7 * s, y + 7 * s);
  c.lineTo(x + w - 7 * s, y + h - 7 * s);
  c.lineTo(x + 7 * s, y + h - 7 * s);
  c.closePath();
  c.stroke();

  // Painted inner band at the left.
  c.fillStyle = 'rgba(201, 162, 78, 0.16)';
  c.fillRect(x + 14 * s, y + 14 * s, 5 * s, h - 28 * s);

  // Chips and wear on the panel.
  for (let i = 0; i < 26; i += 1) {
    const px = x + 6 * s + rand() * (w - 12 * s);
    const py = y + 5 * s + rand() * (h - 10 * s);
    const nearEdge = px < x + 14 * s || px > x + w - 14 * s || py < y + 10 * s || py > y + h - 10 * s;
    c.fillStyle = alpha(rand() > 0.45 ? '#d8c49c' : '#f1e6c8', nearEdge ? 0.55 : 0.1);
    c.beginPath();
    c.ellipse(px, py, (1 + rand() * 3) * s, (0.8 + rand() * 2) * s, rand() * TAU, 0, TAU);
    c.fill();
  }

  // Text.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(0, 0, 0, 0.4)';
  c.shadowBlur = 8 * s;
  c.shadowOffsetY = 2 * s;

  setFont(c, 14 * s, 600, EN_FONT, '3px');
  c.fillStyle = '#e2c37a';
  c.fillText('02  /  20', x + 34 * s, y + 38 * s);

  setFont(c, 44 * s, 600, CN_FONT, '2px');
  c.fillStyle = '#f6ecd2';
  c.fillText('埃及壁画', x + 32 * s, y + 92 * s);

  setFont(c, 17 * s, 500, EN_FONT, '2.6px');
  c.fillStyle = 'rgba(241, 230, 200, 0.88)';
  c.fillText('EGYPTIAN TOMB PAINTING', x + 33 * s, y + 121 * s);

  setFont(c, 16 * s, 400, CN_FONT, '1px');
  c.fillStyle = '#e2c37a';
  c.fillText('约前1300 · 底比斯', x + 33 * s, y + 149 * s);

  c.shadowColor = 'transparent';
  wedjat(c, x + w - 78 * s, y + h * 0.5 - 6 * s, 32 * s, '#d8b464');

  // Base bar and tie under the panel.
  c.strokeStyle = '#c9a24e';
  c.lineWidth = 3 * s;
  c.beginPath();
  c.moveTo(x + 8 * s, y + h + 9 * s);
  c.lineTo(x + w - 8 * s, y + h + 9 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(x + w * 0.62, y + h + 10 * s);
  c.lineTo(x + w * 0.62, y + h + 22 * s);
  c.lineTo(x + w * 0.62 + 12 * s, y + h + 25 * s);
  c.stroke();

  c.restore();
}
