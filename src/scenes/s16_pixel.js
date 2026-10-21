// 16 — 8-bit arcade. The whole frame is rasterised into a 380×210 pixel buffer
// (5 scene units per pixel) and blitted back with nearest-neighbour scaling, so
// every mark sits on the era's integer grid. Gameplay (scroll, coins, jump,
// pedals, banner) is quantised to 10 Hz; the camera stays smooth.
//
// The level is invented: navy sky, parallax hills, a tile floor with a pit, a
// coin arc and a "1UP" banner. The pelican keeps pedalling in mid-air.

import { basePalette } from './_placeholder.js';
import { cachedLayer } from '../kit/cache.js';
import { rigPose } from '../rig/pose.js';
import { clamp, rngFor } from '../kit/math.js';
import { CN_FONT, setFont } from '../kit/cards.js';

// ---------------------------------------------------------------- pixel grid

const W = 380; // buffer pixels
const H = 210;
const OX = -440; // scene units at buffer (0,0)
const OY = -25;
const CELL = 5; // scene units per pixel

const NAVY = '#101a38';
const BG2 = '#182752';
const MID = '#22336b';
const DEEP = '#0a0f22';
const MAG = '#e7438d';
const CYAN = '#4de1ff';
const YEL = '#f7d94c';
const WHITE = '#f2f4f8';

const GROUND = 169; // buffer row of scene y = 820
const RIDER_X = 182; // buffer col of scene x ≈ 470
const SCROLL = 70; // buffer px per second (350 scene units/s)
const PIT_W = 30;
const PIT_BEAT = 3.0; // local second the pit passes under the rider

const pal = basePalette({
  bg: '#101a38',
  bg2: '#182752',
  motif: MAG,
  accent: CYAN,
  ink: '#0a0f22',
  titleInk: '#eaf7ff',
  scrim: '#000000',
  ground: '#0c1630',
  road: '#14204a',
  dash: YEL,
  body: WHITE,
  beak: '#f7a531',
  rigInk: DEEP,
});

export default {
  id: 's16',
  number: 16,
  cn: '8-bit 像素游戏',
  en: '8-Bit Arcade',
  year: '1980s',
  motif: 'squares',
  palette: pal,

  draw(g, ctx) {
    const buf = bufferFor(ctx);
    const c = buf.drawingContext;
    const qt = Math.round(clamp(ctx.local, 0, 6) * 10) / 10;
    const step = Math.round(qt * 10);

    paintSky(c, step);
    paintHills(c, qt);
    paintClouds(c, qt);
    paintBlocks(c, qt);
    paintGround(c, qt);
    paintPit(c, qt);
    paintCoins(c, qt, step);
    paintGagText(c, qt, step);
    paintRider(c, qt);
    paintBanner(c, qt, step);
    paintHud(c, ctx, qt);
    paintScanlines(c);

    const gc = g.drawingContext;
    const prev = gc.imageSmoothingEnabled;
    gc.save();
    gc.imageSmoothingEnabled = false;
    gc.fillStyle = NAVY;
    gc.fillRect(-1200, -400, 3600, 1600);
    gc.drawImage(buf.canvas, OX, OY, W * CELL, H * CELL);
    gc.restore();
    gc.imageSmoothingEnabled = prev;
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawLevelCard(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- buffer

let buf = null;

function bufferFor(ctx) {
  if (!buf) {
    buf = ctx.makeGraphics(W, H);
    buf.pixelDensity(1);
  }
  return buf;
}

// ---------------------------------------------------------------- primitives

function R(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function pxl(c, x0, y0, x1, y1, color, t = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const ex = Math.round(x1);
  const ey = Math.round(y1);
  const dx = Math.abs(ex - x);
  const dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1;
  const sy = y < ey ? 1 : -1;
  let err = dx + dy;
  c.fillStyle = color;
  for (;;) {
    c.fillRect(x - ((t - 1) >> 1), y - ((t - 1) >> 1), t, t);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function ellipsePx(c, cx, cy, rx, ry, color) {
  const cxr = Math.round(cx);
  const cyr = Math.round(cy);
  c.fillStyle = color;
  for (let dy = -ry; dy <= ry; dy += 1) {
    const k = 1 - (dy * dy) / (ry * ry + 0.0001);
    const half = Math.floor(rx * Math.sqrt(Math.max(0, k)));
    if (half < 0) continue;
    c.fillRect(cxr - half, cyr + dy, half * 2 + 1, 1);
  }
}

function discPx(c, cx, cy, r, color) {
  ellipsePx(c, cx, cy, r, r, color);
}

function ringPx(c, cx, cy, r, th, color) {
  const cxr = Math.round(cx);
  const cyr = Math.round(cy);
  c.fillStyle = color;
  const inner = r - th;
  for (let dy = -r; dy <= r; dy += 1) {
    const h = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    const hi = inner >= 0 ? Math.floor(Math.sqrt(Math.max(0, inner * inner - dy * dy))) : -1;
    if (hi < 0) {
      c.fillRect(cxr - h, cyr + dy, h * 2 + 1, 1);
    } else {
      c.fillRect(cxr - h, cyr + dy, h - hi, 1);
      c.fillRect(cxr + hi + 1, cyr + dy, h - hi, 1);
    }
  }
}

// ---------------------------------------------------------------- 5×7 font

const FONT = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
};

function text(c, str, x, y, color, scale = 1) {
  c.fillStyle = color;
  const s = Math.max(1, Math.round(scale));
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of String(str).toUpperCase()) {
    const gph = FONT[ch] || FONT['?'];
    for (let row = 0; row < 7; row += 1) {
      const line = gph[row];
      for (let col = 0; col < 5; col += 1) {
        if (line[col] === '1') c.fillRect(cx + col * s, cy + row * s, s, s);
      }
    }
    cx += 6 * s;
  }
}

const MINI = {
  B: ['110', '101', '110', '101', '110'],
  U: ['101', '101', '101', '101', '111'],
  G: ['011', '100', '101', '101', '011'],
  '?': ['110', '001', '010', '000', '010'],
};

function miniText(c, str, x, y, color) {
  c.fillStyle = color;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of String(str).toUpperCase()) {
    const gph = MINI[ch] || MINI['?'];
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (gph[row][col] === '1') c.fillRect(cx + col, cy + row, 1, 1);
      }
    }
    cx += 4;
  }
}

// ---------------------------------------------------------------- world

const STARS = (() => {
  const r = rngFor(1602);
  const out = [];
  for (let i = 0; i < 54; i += 1) {
    out.push({
      x: 8 + Math.floor(r() * 364),
      y: 8 + Math.floor(r() * 106),
      c: r() > 0.68 ? CYAN : WHITE,
    });
  }
  return out;
})();

function paintSky(c, step) {
  R(c, 0, 0, W, H, NAVY);
  // Horizon bands, sky cooling towards the ground.
  R(c, 0, 120, W, 12, '#121e40');
  R(c, 0, 132, W, 12, '#152246');
  R(c, 0, 144, W, 14, BG2);
  for (let i = 0; i < STARS.length; i += 1) {
    if ((i + step) % 11 === 0) continue;
    const st = STARS[i];
    R(c, st.x, st.y, 1, 1, st.c);
  }
}

function hillLayer(c, phase, base, amp, freq, color, crest) {
  c.fillStyle = color;
  for (let x = 0; x < W; x += 1) {
    const u = (x + phase) * freq;
    const h = Math.round(
      amp * (0.5 + 0.5 * Math.sin(u)) + amp * 0.4 * (0.5 + 0.5 * Math.sin(u * 2.3 + 1.2)),
    );
    c.fillRect(x, base - h, 1, h + 1);
  }
  if (crest) {
    c.fillStyle = crest;
    for (let x = 0; x < W; x += 2) {
      const u = (x + phase) * freq;
      const h = Math.round(
        amp * (0.5 + 0.5 * Math.sin(u)) + amp * 0.4 * (0.5 + 0.5 * Math.sin(u * 2.3 + 1.2)),
      );
      if (h > 2) c.fillRect(x, base - h, 1, 1);
    }
  }
}

function paintHills(c, qt) {
  const sc = Math.round(qt * SCROLL);
  hillLayer(c, Math.round(sc * 0.18), GROUND - 1, 26, 0.042, '#1d2d5c', null);
  hillLayer(c, Math.round(sc * 0.42), GROUND, 14, 0.075, MID, MAG);
}

function cloud(c, x, y) {
  R(c, x, y, 8, 3, BG2);
  R(c, x + 2, y - 2, 5, 3, BG2);
  R(c, x + 8, y + 1, 4, 2, BG2);
  R(c, x + 2, y - 2, 2, 1, CYAN);
}

function paintClouds(c, qt) {
  const sc = Math.round(qt * SCROLL);
  const x1 = ((140 - Math.round(sc * 0.12)) % 430 + 430) % 430 - 30;
  const x2 = ((300 - Math.round(sc * 0.08)) % 470 + 470) % 470 - 40;
  cloud(c, x1, 52);
  cloud(c, x2, 88);
}

function blockRun(c, x, y, tiles) {
  for (let i = 0; i < tiles; i += 1) {
    const tx = x + i * 8;
    R(c, tx, y, 8, 8, MID);
    R(c, tx, y, 8, 1, CYAN);
    R(c, tx, y + 7, 8, 1, DEEP);
    R(c, tx, y, 1, 8, DEEP);
    R(c, tx + 3, y + 3, 2, 2, MAG);
  }
}

function paintBlocks(c, qt) {
  const off = Math.round(qt * SCROLL);
  const wrap = (v) => ((v % 600) + 600) % 600 - 60;
  blockRun(c, wrap(236 - off), 74, 4);
  blockRun(c, wrap(468 - off), 58, 3);
}

function paintGround(c, qt) {
  const off = Math.round(qt * SCROLL) % 16;
  R(c, 0, GROUND, W, H - GROUND, '#14204a');

  c.fillStyle = DEEP;
  for (let x = -off; x < W; x += 16) c.fillRect(x, GROUND + 3, 1, H - GROUND - 3);
  for (let y = GROUND + 12; y < H; y += 9) c.fillRect(0, y, W, 1);

  c.fillStyle = MAG;
  for (let i = 0; i < 20; i += 1) {
    const x = ((i * 31 + off * 2) % W + W) % W;
    const y = GROUND + 5 + (i % 4) * 9;
    c.fillRect(x, y, 2, 1);
  }

  R(c, 0, GROUND, W, 2, CYAN);
  R(c, 0, GROUND + 2, W, 1, DEEP);
}

function pitCenter(qt) {
  return RIDER_X + (PIT_BEAT - qt) * SCROLL;
}

function paintPit(c, qt) {
  const cx = Math.round(pitCenter(qt));
  const x0 = cx - PIT_W / 2;
  if (x0 > W || x0 + PIT_W < 0) return;

  R(c, x0, GROUND, PIT_W, H - GROUND, '#05070f');
  R(c, x0, GROUND, 1, H - GROUND, CYAN);
  R(c, x0 + PIT_W - 1, GROUND, 1, H - GROUND, MAG);

  c.fillStyle = MAG;
  for (let y = GROUND + 8; y < H - 2; y += 12) c.fillRect(x0 + 4, y, PIT_W - 8, 2);
  c.fillStyle = '#141a30';
  for (let y = GROUND + 14; y < H; y += 12) c.fillRect(x0 + 6, y, PIT_W - 12, 1);

  R(c, x0, GROUND, 2, 2, WHITE);
  R(c, x0 + PIT_W - 2, GROUND, 2, 2, WHITE);
}

function coinAt(c, x, y, phase) {
  const rx = [3, 2, 3, 2][phase % 4];
  ellipsePx(c, x, y, rx + 1, 4, DEEP);
  ellipsePx(c, x, y, rx, 3, YEL);
  R(c, x - rx + 1, y - 2, 1, 2, WHITE);
  R(c, x + rx - 1, y + 1, 1, 2, '#c99a22');
}

function paintCoins(c, qt, step) {
  const cx = pitCenter(qt);
  const offs = [-26, -13, 0, 13, 26];
  const rows = [126, 118, 112, 118, 126];
  for (let i = 0; i < offs.length; i += 1) {
    if (i === 2 && qt >= PIT_BEAT - 1e-6) continue;
    coinAt(c, Math.round(cx) + offs[i], rows[i], step + i);
  }
}

// ---------------------------------------------------------------- rider

function wheel(c, cx, cy, r, angle) {
  ringPx(c, cx, cy, r, 2, WHITE);
  ringPx(c, cx, cy, r - 2, 1, '#9fc6ee');
  R(c, cx - 1, cy - 1, 3, 3, MAG);
  for (let k = 0; k < 4; k += 1) {
    const a = angle + (k * Math.PI) / 2;
    const ex = cx + Math.round(Math.cos(a) * (r - 3));
    const ey = cy + Math.round(Math.sin(a) * (r - 3));
    pxl(c, cx, cy, ex, ey, CYAN, 1);
  }
}

function leg(c, hip, knee, ankle, color) {
  pxl(c, hip.x, hip.y, knee.x, knee.y, color, 2);
  pxl(c, knee.x, knee.y, ankle.x, ankle.y, color, 2);
  R(c, ankle.x - 1, ankle.y, 3, 2, color);
}

function paintRider(c, qt) {
  const p = rigPose(qt);
  const baseX = RIDER_X;
  const baseY = GROUND;

  const jumpU = clamp((qt - 2.2) / 1.6, 0, 1);
  const lift = qt >= 2.2 && qt <= 3.8 ? Math.round(Math.sin(Math.PI * jumpU) * 26) : 0;
  const gy = baseY - lift;

  const X = (v) => baseX + Math.round(v / CELL);
  const Y = (v) => gy + Math.round(v / CELL);

  // Grounded shadow.
  if (lift < 3) {
    c.fillStyle = 'rgba(5,7,15,0.55)';
    ellipsePx(c, baseX + 1, baseY + 1, 16, 2, 'rgba(5,7,15,0.55)');
  }

  const hip = { x: X(p.hip.x), y: Y(p.hip.y) };
  const far = p.legs.far;
  const near = p.legs.near;

  // Far leg behind the machine.
  leg(c, hip, { x: X(far.knee.x), y: Y(far.knee.y) }, { x: X(far.ankle.x), y: Y(far.ankle.y) }, '#8d2f5c');

  // Wheels.
  wheel(c, X(p.wheels.rear.x), Y(p.wheels.rear.y), 10, p.wheelAngle);
  wheel(c, X(p.wheels.front.x), Y(p.wheels.front.y), 10, p.wheelAngle);

  // Frame.
  const rh = p.frame.rearHub;
  const fh = p.frame.frontHub;
  const cr = p.frame.crank;
  const sd = p.frame.saddle;
  const ht = p.frame.headTube;
  const gr = p.frame.grip;
  const seat = p.frame.seatCluster;

  pxl(c, X(rh.x), Y(rh.y), X(cr.x), Y(cr.y), MAG, 2);
  pxl(c, X(cr.x), Y(cr.y), X(sd.x), Y(sd.y), MAG, 2);
  pxl(c, X(sd.x), Y(sd.y), X(ht.x), Y(ht.y), MAG, 2);
  pxl(c, X(cr.x), Y(cr.y), X(ht.x), Y(ht.y), MAG, 2);
  pxl(c, X(ht.x), Y(ht.y), X(fh.x), Y(fh.y), MAG, 2);
  pxl(c, X(ht.x), Y(ht.y), X(gr.x), Y(gr.y), MAG, 1);
  pxl(c, X(sd.x), Y(sd.y), X(seat.x), Y(seat.y), MAG, 1);
  R(c, X(sd.x) - 3, Y(sd.y) - 1, 6, 2, MAG);
  R(c, X(gr.x) - 1, Y(gr.y) - 1, 4, 2, CYAN);

  // Crank and pedals.
  ringPx(c, X(cr.x), Y(cr.y), 3, 1, CYAN);
  R(c, X(p.pedals.far.x), Y(p.pedals.far.y), 2, 1, WHITE);
  R(c, X(p.pedals.near.x), Y(p.pedals.near.y), 3, 1, WHITE);

  // Pelican tail.
  pxl(c, X(-46), Y(-176), X(-66), Y(-186), WHITE, 2);
  pxl(c, X(-46), Y(-174), X(-68), Y(-172), WHITE, 2);

  // Body: ellipse with a one-pixel outline.
  const b = p.body;
  ellipsePx(c, X(b.x), Y(b.y), Math.round(b.rx / CELL) + 1, Math.round(b.ry / CELL) + 1, DEEP);
  ellipsePx(c, X(b.x), Y(b.y), Math.round(b.rx / CELL), Math.round(b.ry / CELL), WHITE);

  // Wing.
  ellipsePx(c, X(-8), Y(-176), 7, 3, CYAN);
  ellipsePx(c, X(-10), Y(-175), 4, 2, WHITE);

  // Neck, head, beak.
  const nk = p.neck;
  for (let i = 0; i < nk.length - 1; i += 1) {
    pxl(c, X(nk[i].x), Y(nk[i].y), X(nk[i + 1].x), Y(nk[i + 1].y), DEEP, 4);
  }
  for (let i = 0; i < nk.length - 1; i += 1) {
    pxl(c, X(nk[i].x), Y(nk[i].y), X(nk[i + 1].x), Y(nk[i + 1].y), WHITE, 2);
  }

  const hx = X(p.head.x);
  const hy = Y(p.head.y);
  discPx(c, hx, hy, 5, DEEP);
  discPx(c, hx, hy, 4, WHITE);

  // Pouch first, then the upper mandible.
  const po = p.pouch;
  ellipsePx(c, X(po.x), Y(po.y), 7, 5, DEEP);
  ellipsePx(c, X(po.x), Y(po.y), 6, 4, YEL);
  ellipsePx(c, X(po.x - 2), Y(po.y + 1), 3, 2, '#ffa94f');

  const bk = p.beak;
  pxl(c, X(bk.base.x), Y(bk.base.y), X(bk.tip.x), Y(bk.tip.y), YEL, 3);
  R(c, X(bk.tip.x), Y(bk.tip.y) - 1, 2, 2, '#c99a22');
  R(c, hx + 1, hy - 2, 2, 2, DEEP);

  // Near leg over the frame.
  leg(c, hip, { x: X(near.knee.x), y: Y(near.knee.y) }, { x: X(near.ankle.x), y: Y(near.ankle.y) }, YEL);

  // Pedal on the near foot.
  R(c, X(p.pedals.near.x) - 1, Y(p.pedals.near.y), 4, 1, WHITE);
}

// ---------------------------------------------------------------- HUD / gag

function paintBanner(c, qt, step) {
  if (qt < PIT_BEAT - 1e-6 || qt > 4.2) return;
  const flash = Math.floor((qt - PIT_BEAT) * 10) % 2 === 0;
  const plate = flash ? MAG : DEEP;
  const ink = flash ? WHITE : YEL;

  R(c, 142, 30, 96, 24, DEEP);
  R(c, 143, 31, 94, 22, plate);
  R(c, 143, 31, 94, 1, WHITE);
  R(c, 143, 52, 94, 1, WHITE);
  R(c, 143, 31, 1, 22, WHITE);
  R(c, 236, 31, 1, 22, WHITE);

  // Tiny pelican head icon.
  R(c, 150, 36, 9, 7, WHITE);
  R(c, 151, 35, 5, 2, WHITE);
  R(c, 159, 38, 6, 3, YEL);
  R(c, 161, 40, 3, 2, YEL);
  R(c, 153, 38, 2, 2, DEEP);

  text(c, '1UP', 168, 35, ink, 2);
}

function paintGagText(c, qt, step) {
  const got = qt >= PIT_BEAT - 1e-6;
  if (got) {
    const t = qt - PIT_BEAT;
    if (t < 0.4) {
      const cx = RIDER_X;
      const cy = 112;
      R(c, cx - 6, cy, 13, 1, WHITE);
      R(c, cx, cy - 6, 1, 13, WHITE);
      R(c, cx - 4, cy - 4, 2, 2, CYAN);
      R(c, cx + 3, cy - 4, 2, 2, MAG);
      R(c, cx - 4, cy + 3, 2, 2, MAG);
      R(c, cx + 3, cy + 3, 2, 2, CYAN);
    }
    if (t < 0.7) {
      const rise = Math.round(Math.min(14, t * 24));
      text(c, '+200', RIDER_X + 14, 88 - rise, WHITE, 1);
    }
  }

  // The flickering bug report, in a 3x5 face so it stays tiny.
  if (step % 7 < 2) {
    miniText(c, 'BUG?', 308, 27, MAG);
  }
}

function hudChrome(pg, c) {
  text(c, 'SCORE', 26, 8, CYAN, 1);
  text(c, 'COIN', 104, 8, CYAN, 1);
  text(c, 'WORLD', 176, 8, CYAN, 1);
  text(c, 'TIME', 244, 8, CYAN, 1);
  text(c, 'HI', 308, 8, CYAN, 1);
  // Coin icon for the counter.
  discPx(c, 106, 20, 3, YEL);
  R(c, 105, 18, 1, 1, WHITE);
}

function paintHud(c, ctx, qt) {
  const hud = cachedLayer(ctx, 's16-hud', hudChrome, { x0: 0, y0: 0, w: W, h: H, scale: 1 });
  c.drawImage(hud.canvas, 0, 0);

  const got = qt >= PIT_BEAT - 1e-6;
  const score = 8200 + (got ? 200 : 0);
  text(c, String(score).padStart(6, '0'), 26, 17, WHITE, 1);
  text(c, got ? '08' : '07', 112, 17, YEL, 1);
  text(c, '16', 176, 17, WHITE, 1);
  text(c, '305', 244, 17, WHITE, 1);
  text(c, '12000', 308, 17, WHITE, 1);
}

function paintScanlines(c) {
  c.fillStyle = 'rgba(3,5,12,0.16)';
  for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1);
  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.fillRect(0, 0, W, 2);
  c.fillRect(0, H - 2, W, 2);
}

// ---------------------------------------------------------------- title card

function drawLevelCard(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const Hpx = g.height;
  const s = Hpx / 1080;
  const x = 92 * s;
  const baseY = Hpx - 156 * s + lift * s;

  const px = Math.max(1, Math.round(3 * s));
  const px2 = Math.max(1, Math.round(2 * s));
  const plateX = x - 18 * s;
  const plateY = baseY - 106 * s;
  const plateW = 408 * s;
  const plateH = 136 * s;

  c.save();
  c.globalAlpha = opacity;

  // Block plate.
  c.fillStyle = 'rgba(5,8,18,0.86)';
  c.fillRect(plateX, plateY, plateW, plateH);
  c.fillStyle = MAG;
  c.fillRect(plateX, plateY, plateW, 3 * s);
  c.fillRect(plateX, plateY + plateH - 3 * s, plateW, 3 * s);
  c.fillRect(plateX, plateY, 3 * s, plateH);
  c.fillRect(plateX + plateW - 3 * s, plateY, 3 * s, plateH);
  c.fillStyle = CYAN;
  c.fillRect(plateX + 7 * s, plateY + 7 * s, 15 * s, 2 * s);
  c.fillRect(plateX + 7 * s, plateY + 7 * s, 2 * s, 10 * s);
  c.fillRect(plateX + plateW - 22 * s, plateY + plateH - 9 * s, 15 * s, 2 * s);
  c.fillRect(plateX + plateW - 9 * s, plateY + plateH - 17 * s, 2 * s, 10 * s);

  // World / level line, in the pixel face.
  drawPixelTextScreen(c, 'WORLD 16', x, baseY - 90 * s, px, YEL);

  // Chinese title stays legible in a compact serif.
  setFont(c, 34 * s, 600, CN_FONT, '1px');
  c.fillStyle = WHITE;
  c.fillText('8-bit 像素游戏', x, baseY - 40 * s);

  drawPixelTextScreen(c, '8-BIT ARCADE', x, baseY - 22 * s, px2, CYAN);
  drawPixelTextScreen(c, '1980S - 1 PLAYER', x, baseY + 10 * s, px2, YEL);

  c.restore();
}

// Title-card pixel lettering in screen space (sizes are already scaled).
function drawPixelTextScreen(c, str, x, y, px, color) {
  c.fillStyle = color;
  let cx = Math.round(x);
  const cy = Math.round(y);
  for (const ch of String(str).toUpperCase()) {
    const gph = FONT[ch] || FONT['?'];
    for (let row = 0; row < 7; row += 1) {
      const line = gph[row];
      for (let col = 0; col < 5; col += 1) {
        if (line[col] === '1') c.fillRect(cx + col * px, cy + row * px, px, px);
      }
    }
    cx += 6 * px;
  }
}
