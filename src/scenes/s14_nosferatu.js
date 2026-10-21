// 14 — Nosferatu. A silent-film hall: stone wall, tall arched window, a
// staircase falling out of the left edge, and a doorway with an original
// vampire silhouette. The pelican and bicycle exist only as a hard shadow
// climbing the wall. From local 5.55 the outline charges phosphor green and
// stays green at the cut (the director's 14→15 aperture is green too).
//
// The hall is cached at 1.2 px/unit. The shadow is quantised to 12 Hz; film
// gate weave, emulsion scratches, dust and exposure flicker are live.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { cachedLayer } from '../kit/cache.js';
import { noise1, rngFor, smoothstep, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, silhouetteStyle } from '../rig/draw.js';
import { CN_FONT, setFont } from '../kit/cards.js';

const BLACK = '#0d0b09';
const INK = '#080706';
const BONE = '#d8cdb8';
const GREEN = '#59ffb0';

const LAYER = { x0: -600, y0: -120, w: 2200, h: 1200 };

const FLOOR_Y = 962;
const WINDOW = { cx: 300, apex: 78, w: 250, h: 402 };
const DOOR = { cx: 1150, apex: 360, w: 210, h: 600 };

const SHADOW_STYLE = silhouetteStyle(INK);
const GREEN_STYLE = silhouetteStyle(GREEN);

const EN_SERIF = '"Didot", "Bodoni 72", "Times New Roman", serif';

export default {
  id: 's14',
  number: 14,
  cn: '诺斯费拉图',
  en: 'Nosferatu',
  year: '1922',
  motif: 'arch',
  palette: basePalette({
    bg: '#151312', bg2: '#211d19', motif: '#6f6555', accent: '#a89672',
    ink: '#e8ddc4', titleInk: '#e9dec6', scrim: '#000000', ground: '#1c1916',
    road: '#26221d', dash: '#8f8069', body: '#d8cdb8', beak: '#a18455',
    rigInk: '#080706', green: GREEN,
  }),

  draw(g, ctx) {
    const c = g.drawingContext;
    const local = ctx.local;
    // Everything the shadow does is sampled at 12 Hz. Camera and film gate
    // weave stay quantised to the same film rate; the director owns the camera.
    const qt = Math.floor(local * 12) / 12;
    const frame = Math.round(local * 12);

    c.save();
    c.fillStyle = BLACK;
    c.fillRect(-1200, -400, 4400, 2000);

    // Film gate weave: the plate slides a unit or two inside the aperture.
    const wx = 1.5 * noise1(qt * 3.1, 1401) + 0.7 * noise1(qt * 8.3, 1402);
    const wy = 1.4 * noise1(qt * 2.7, 1403) + 0.5 * noise1(qt * 7.7, 1404);
    c.translate(wx, wy);

    const layer = cachedLayer(ctx, 's14-hall', drawHall, LAYER);
    c.drawImage(layer.canvas, LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);

    drawWindowFlicker(g, qt);
    drawMotes(g, qt);
    drawShadow(g, qt);

    c.restore();

    // Screen-space print damage. Reset the camera transform.
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    drawFilmOverlay(g, qt, frame);
    // Three grain plates cycled at 12 Hz: the emulsion boils.
    ctx.grain(g, 0.11, 1408 + (frame % 3));
    c.restore();
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawIntertitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- shadow

function shadowState(qt) {
  const p = smoothstep(0.05, 5.45, qt);
  return {
    p,
    x: 460 + 360 * p,
    y: 860 - 390 * p,
    scale: 0.62 + 0.83 * p,
  };
}

function paintRig(g, pose, style, st, grow, alphaMul = 1) {
  const c = g.drawingContext;
  c.save();
  c.globalAlpha *= alphaMul;
  c.translate(st.x, st.y);
  // A shallow lean: the shadow is projected from a low lamp, not pasted on.
  c.transform(1, 0, -0.055, 1, 0, 0);
  c.scale(st.scale * grow, st.scale * grow);
  drawRig(g, pose, style, { x: 0, y: 0, scale: 1, shadow: false });
  c.restore();
}

function drawShadow(g, qt) {
  const c = g.drawingContext;
  const st = shadowState(qt);
  const pose = rigPose(qt);

  const charge = smoothstep(5.55, 5.7, qt) * (0.78 + 0.22 * noise1(qt * 13, 1499));
  const jx = charge * 2.2 * noise1(qt * 21, 1488);
  const jy = charge * 2.0 * noise1(qt * 19, 1489);
  st.x += jx;
  st.y += jy;

  if (charge > 0.001) {
    // Phosphor bleeds into the plaster around the silhouette.
    const cx = st.x + 20 * st.scale;
    const cy = st.y - 112 * st.scale;
    const rad = 260 * st.scale;
    const glow = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
    glow.addColorStop(0, alpha(GREEN, 0.17 * charge));
    glow.addColorStop(0.5, alpha(GREEN, 0.06 * charge));
    glow.addColorStop(1, alpha(GREEN, 0));
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = glow;
    c.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    c.restore();

    // Outer bloom, then a charged edge; the black body goes on top.
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.shadowColor = alpha(GREEN, 0.85);
    c.shadowBlur = 30 * st.scale * charge;
    paintRig(g, pose, GREEN_STYLE, st, 1.055, 0.4 * charge);
    c.restore();

    c.save();
    c.globalCompositeOperation = 'lighter';
    paintRig(g, pose, GREEN_STYLE, st, 1.018, 0.9 * charge);
    c.restore();
  }

  paintRig(g, pose, SHADOW_STYLE, st, 1, 1);

  if (charge > 0.001) drawChargeSparks(g, st, qt, charge);
}

function drawChargeSparks(g, st, qt, charge) {
  const c = g.drawingContext;
  const frame = Math.round(qt * 12);
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (let i = 0; i < 22; i += 1) {
    const r = rngFor(14900 + i * 37 + frame * 13);
    const sx = st.x + (r() - 0.5) * 190 * st.scale;
    const sy = st.y - (6 + r() * 250) * st.scale;
    const len = (4 + r() * 16) * st.scale;
    c.strokeStyle = alpha(GREEN, (0.16 + r() * 0.55) * charge);
    c.lineWidth = 0.8 + r() * 1.5;
    c.beginPath();
    c.moveTo(sx, sy);
    c.lineTo(sx + (r() - 0.5) * 7, sy - len);
    c.stroke();
  }
  for (let i = 0; i < 5; i += 1) {
    const r = rngFor(15240 + i * 61 + frame * 7);
    c.fillStyle = alpha(GREEN, (0.3 + r() * 0.5) * charge);
    c.beginPath();
    c.arc(
      st.x + (r() - 0.5) * 150 * st.scale,
      st.y - (20 + r() * 230) * st.scale,
      (0.9 + r() * 1.6) * st.scale,
      0,
      TAU,
    );
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- live air

function drawWindowFlicker(g, qt) {
  const c = g.drawingContext;
  const f = 0.5 + 0.5 * noise1(qt * 4, 1450);
  const gl = c.createRadialGradient(300, 280, 30, 300, 280, 450);
  gl.addColorStop(0, alpha(BONE, 0.06 + 0.05 * f));
  gl.addColorStop(1, alpha(BONE, 0));
  c.fillStyle = gl;
  c.fillRect(-160, -60, 920, 940);
}

function drawMotes(g, qt) {
  const c = g.drawingContext;
  c.save();
  for (let i = 0; i < 26; i += 1) {
    const r = rngFor(14600 + i * 11);
    const x = 190 + r() * 560 + Math.sin(qt * 0.7 + i) * 8;
    const fall = (r() * 760 + qt * 23) % 660;
    const y = 980 - fall * 0.86;
    const a = 0.08 + r() * 0.22;
    c.fillStyle = alpha(BONE, a);
    c.beginPath();
    c.arc(x, y, 0.8 + r() * 1.7, 0, TAU);
    c.fill();
  }
  c.restore();
}

// ---------------------------------------------------------------- hall

function archPath(c, cx, apex, w, h) {
  const r = w / 2;
  c.beginPath();
  c.moveTo(cx - r, apex + r);
  c.arc(cx, apex + r, r, Math.PI, 0);
  c.lineTo(cx + r, apex + h);
  c.lineTo(cx - r, apex + h);
  c.closePath();
}

function fillPoly(c, pts, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fill();
}

function drawHall(g, c) {
  const rand = rngFor(1401);

  c.fillStyle = '#3c362c';
  c.fillRect(LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);

  // Moonlit upper left, soot-black lower right.
  const base = c.createLinearGradient(LAYER.x0, LAYER.y0, 1200, 1100);
  base.addColorStop(0, '#716b5d');
  base.addColorStop(0.36, '#514d42');
  base.addColorStop(0.7, '#2c2a24');
  base.addColorStop(1, '#12110e');
  c.fillStyle = base;
  c.fillRect(LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);

  // Damp blooms and smoke stains.
  for (let i = 0; i < 34; i += 1) {
    const cx = LAYER.x0 + rand() * LAYER.w;
    const cy = LAYER.y0 + rand() * LAYER.h;
    const r = 60 + rand() * 260;
    const light = rand() > 0.56;
    const gr = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, alpha(light ? '#b8ab8e' : '#0a0907', 0.03 + rand() * 0.055));
    gr.addColorStop(1, alpha(light ? '#b8ab8e' : '#0a0907', 0));
    c.fillStyle = gr;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // Plaster pitting.
  for (let i = 0; i < 900; i += 1) {
    const x = LAYER.x0 + rand() * LAYER.w;
    const y = LAYER.y0 + rand() * LAYER.h;
    c.fillStyle = alpha(rand() > 0.5 ? BONE : INK, 0.02 + rand() * 0.05);
    c.fillRect(x, y, 0.8 + rand() * 2.4, 0.8 + rand() * 2.4);
  }

  // Broad brushed strokes: the set is painted, not vector-filled.
  c.lineCap = 'round';
  for (let i = 0; i < 110; i += 1) {
    const x = LAYER.x0 + rand() * LAYER.w;
    const y = LAYER.y0 + rand() * LAYER.h;
    const len = 50 + rand() * 210;
    const ang = -0.62 + (rand() - 0.5) * 0.35;
    const light = rand() > 0.52;
    c.strokeStyle = alpha(light ? BONE : '#070605', 0.012 + rand() * 0.032);
    c.lineWidth = 6 + rand() * 26;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    c.stroke();
  }
  c.lineCap = 'butt';

  drawCourses(c);
  drawCrack(c, 448, 96, 144, 1431);
  drawCrack(c, 120, 620, 188, 1432);
  drawCrack(c, 902, 40, 168, 1433);
  drawCrack(c, 722, 780, 122, 1434);

  // A pale patch of bounced light behind the shadow's climb. It gives the
  // silhouette something to bite against without adding an off-screen lamp.
  const key = c.createRadialGradient(660, 560, 40, 660, 560, 400);
  key.addColorStop(0, alpha(BONE, 0.12));
  key.addColorStop(0.55, alpha(BONE, 0.055));
  key.addColorStop(1, alpha(BONE, 0));
  c.fillStyle = key;
  c.fillRect(180, 100, 900, 900);

  // Soot and damp: broad value blocks, painted rather than shaded.
  for (let i = 0; i < 16; i += 1) {
    const sx = [90, 760, 1100, 480, 1320][i % 5] + (rand() - 0.5) * 260;
    const sy = [120, 300, 700, 860, 930][i % 5] + (rand() - 0.5) * 180;
    const rr = 140 + rand() * 230;
    const sg = c.createRadialGradient(sx, sy, 0, sx, sy, rr);
    sg.addColorStop(0, alpha('#070605', 0.03 + rand() * 0.05));
    sg.addColorStop(1, alpha('#070605', 0));
    c.fillStyle = sg;
    c.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
  }

  drawWindow(c);
  drawShaft(c);
  drawDoor(c);

  // Floor: a black band with one weak catchlight.
  c.fillStyle = BLACK;
  c.fillRect(LAYER.x0, FLOOR_Y, LAYER.w, LAYER.h);
  c.strokeStyle = alpha(BONE, 0.16);
  c.lineWidth = 1.6;
  c.beginPath();
  for (let x = LAYER.x0; x <= LAYER.x0 + LAYER.w; x += 40) {
    const y = FLOOR_Y + noise1(x * 0.01, 1460) * 2.2;
    if (x === LAYER.x0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.04);
  c.beginPath();
  c.moveTo(LAYER.x0, FLOOR_Y + 46);
  c.lineTo(LAYER.x0 + LAYER.w, FLOOR_Y + 42);
  c.stroke();

  drawStairs(c);
}

function drawCourses(c) {
  for (let row = 0; row < 14; row += 1) {
    const y = 40 + row * 78;
    c.strokeStyle = alpha(INK, 0.15);
    c.lineWidth = 1.5;
    c.beginPath();
    for (let x = LAYER.x0; x <= LAYER.x0 + LAYER.w; x += 44) {
      const yy = y + noise1(x * 0.013 + row * 7.3, 1410 + row) * 3.2;
      if (x === LAYER.x0) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();

    c.strokeStyle = alpha(BONE, 0.035);
    c.lineWidth = 1;
    c.beginPath();
    for (let x = LAYER.x0; x <= LAYER.x0 + LAYER.w; x += 44) {
      const yy = y - 1.6 + noise1(x * 0.013 + row * 7.3, 1410 + row) * 3.2;
      if (x === LAYER.x0) c.moveTo(x, yy);
      else c.lineTo(x, yy);
    }
    c.stroke();

    const off = (row % 2) * 82;
    c.strokeStyle = alpha(INK, 0.12);
    c.lineWidth = 1.2;
    for (let x = LAYER.x0 + off; x <= LAYER.x0 + LAYER.w; x += 172) {
      const lean = noise1(x * 0.02 + row * 3.1, 1420 + row) * 3;
      c.beginPath();
      c.moveTo(x, y + 1);
      c.lineTo(x + lean, y + 78);
      c.stroke();
    }
  }
}

function drawCrack(c, x, y, len, seed) {
  const r = rngFor(seed);
  c.strokeStyle = alpha(INK, 0.4);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(x, y);
  let px = x;
  let py = y;
  for (let i = 0; i < 8; i += 1) {
    px += (r() - 0.5) * 20;
    py += len / 8;
    c.lineTo(px, py);
  }
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.06);
  c.lineWidth = 0.8;
  c.stroke();
}

function drawWindow(c) {
  const { cx, apex, w, h } = WINDOW;

  const halo = c.createRadialGradient(cx, apex + 150, 20, cx, apex + 150, 460);
  halo.addColorStop(0, alpha(BONE, 0.22));
  halo.addColorStop(0.5, alpha(BONE, 0.07));
  halo.addColorStop(1, alpha(BONE, 0));
  c.fillStyle = halo;
  c.fillRect(cx - 500, apex - 300, 1000, 900);

  // Stone surround.
  archPath(c, cx, apex - 24, w + 48, h + 24);
  c.fillStyle = '#57503f';
  c.fill();
  c.strokeStyle = alpha(INK, 0.6);
  c.lineWidth = 2.6;
  c.stroke();

  // Reveal, slightly darker than the surround.
  archPath(c, cx, apex - 6, w + 14, h + 6);
  c.fillStyle = '#3b362c';
  c.fill();

  // The glass: the brightest thing in the film.
  archPath(c, cx, apex, w, h);
  const glass = c.createLinearGradient(cx, apex, cx, apex + h);
  glass.addColorStop(0, '#f6eed9');
  glass.addColorStop(0.5, '#e3d9bf');
  glass.addColorStop(1, '#a89d84');
  c.fillStyle = glass;
  c.fill();
  // Blown-out moon core.
  const core = c.createRadialGradient(cx - 18, apex + 120, 4, cx - 18, apex + 120, 150);
  core.addColorStop(0, 'rgba(255, 250, 234, 0.5)');
  core.addColorStop(1, 'rgba(255, 250, 234, 0)');
  c.fillStyle = core;
  c.fill();
  c.save();
  archPath(c, cx, apex, w, h);
  c.clip();
  // uneven old glass
  const gr = rngFor(1470);
  for (let i = 0; i < 20; i += 1) {
    const gx = cx - w / 2 + gr() * w;
    const gy = apex + gr() * h;
    const rad = 18 + gr() * 60;
    const g2 = c.createRadialGradient(gx, gy, 0, gx, gy, rad);
    g2.addColorStop(0, alpha(gr() > 0.5 ? '#fff8e6' : '#8d846e', 0.07 + gr() * 0.08));
    g2.addColorStop(1, alpha('#8d846e', 0));
    c.fillStyle = g2;
    c.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
  }
  // a bare branch outside
  c.strokeStyle = alpha(INK, 0.4);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(cx + 90, apex - 10);
  c.bezierCurveTo(cx + 58, apex + 90, cx + 96, apex + 160, cx + 60, apex + 205);
  c.moveTo(cx + 78, apex + 106);
  c.lineTo(cx + 36, apex + 150);
  c.moveTo(cx + 92, apex + 158);
  c.lineTo(cx + 66, apex + 178);
  c.stroke();
  c.restore();

  // Mullions and glazing bars.
  c.strokeStyle = alpha('#14110d', 0.92);
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(cx, apex + 8);
  c.lineTo(cx, apex + h);
  c.moveTo(cx - w / 2, apex + 180);
  c.lineTo(cx + w / 2, apex + 180);
  c.moveTo(cx - w / 2, apex + 310);
  c.lineTo(cx + w / 2, apex + 310);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - w / 2 + 4, apex + 245);
  c.lineTo(cx + w / 2 - 4, apex + 245);
  c.stroke();

  // Sill and its cast shadow.
  c.fillStyle = '#6b6250';
  c.fillRect(cx - w / 2 - 30, apex + h, w + 60, 18);
  c.strokeStyle = alpha(INK, 0.7);
  c.lineWidth = 2;
  c.strokeRect(cx - w / 2 - 30, apex + h, w + 60, 18);
  c.fillStyle = alpha(INK, 0.5);
  c.fillRect(cx - w / 2 - 24, apex + h + 18, w + 48, 12);
}

function drawShaft(c) {
  const sill = WINDOW.apex + WINDOW.h;
  c.save();
  c.globalCompositeOperation = 'lighter';

  fillPoly(c, [
    { x: 185, y: sill }, { x: 415, y: sill },
    { x: 900, y: FLOOR_Y }, { x: 250, y: FLOOR_Y },
  ], alpha(BONE, 0.05));

  fillPoly(c, [
    { x: 248, y: sill }, { x: 352, y: sill },
    { x: 700, y: FLOOR_Y }, { x: 500, y: FLOOR_Y },
  ], alpha(BONE, 0.045));

  // Mullion bars in the beam.
  fillPoly(c, [
    { x: 294, y: sill }, { x: 306, y: sill },
    { x: 606, y: FLOOR_Y }, { x: 578, y: FLOOR_Y },
  ], alpha(BONE, 0.032));
  fillPoly(c, [
    { x: 330, y: sill }, { x: 344, y: sill },
    { x: 690, y: FLOOR_Y }, { x: 664, y: FLOOR_Y },
  ], alpha(BONE, 0.026));

  // A pool of light where the beam lands.
  const pool = c.createRadialGradient(470, 900, 10, 470, 900, 320);
  pool.addColorStop(0, alpha(BONE, 0.06));
  pool.addColorStop(1, alpha(BONE, 0));
  c.fillStyle = pool;
  c.fillRect(170, 580, 640, 400);
  c.restore();
}

function drawDoor(c) {
  const { cx, apex, w, h } = DOOR;

  archPath(c, cx, apex - 26, w + 52, h + 26);
  c.fillStyle = '#514a3a';
  c.fill();
  c.strokeStyle = alpha(INK, 0.65);
  c.lineWidth = 3;
  c.stroke();

  // Voussoirs.
  c.strokeStyle = alpha(INK, 0.35);
  c.lineWidth = 1.4;
  for (let i = 0; i <= 10; i += 1) {
    const a = Math.PI + (i / 10) * Math.PI;
    const r0 = w / 2 + 4;
    const r1 = w / 2 + 30;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * r0, apex - 26 + r0 + Math.sin(a) * r0);
    c.lineTo(cx + Math.cos(a) * r1, apex - 26 + r0 + Math.sin(a) * r1);
    c.stroke();
  }

  // The doorway is open; a low lamp has left the interior mid-grey.
  archPath(c, cx, apex, w, h);
  const lit = c.createRadialGradient(cx, apex + 330, 20, cx, apex + 330, 340);
  lit.addColorStop(0, '#786f5d');
  lit.addColorStop(0.55, '#514a3c');
  lit.addColorStop(1, '#2a261f');
  c.fillStyle = lit;
  c.fill();

  c.strokeStyle = alpha(INK, 0.5);
  c.lineWidth = 2;
  c.stroke();

  // Depth inside the opening: a shadowed inner reveal and a back wall.
  c.strokeStyle = alpha(INK, 0.32);
  c.lineWidth = 2.2;
  archPath(c, cx, apex + 26, w - 44, h - 26);
  c.stroke();
  c.strokeStyle = alpha(INK, 0.22);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(cx - 44, apex + 150);
  c.lineTo(cx - 44, apex + h - 10);
  c.moveTo(cx + 52, apex + 150);
  c.lineTo(cx + 52, apex + h - 10);
  c.stroke();
  c.fillStyle = alpha(INK, 0.18);
  c.fillRect(cx - 44, apex + h - 38, 96, 38);

  drawVampire(c, cx, apex + h);

  // Threshold.
  c.fillStyle = INK;
  c.fillRect(cx - w / 2, apex + h, w, 14);
  c.fillStyle = alpha(BONE, 0.1);
  c.fillRect(cx - w / 2, apex + h, w, 2);
}

// An original silhouette: gaunt skull, high collar, long split coat, and one
// hand lifted towards the shadow. Deliberately not a likeness of any actor.
function drawVampire(c, cx, feet) {
  const bx = cx - 8;
  const by = feet;

  c.save();
  c.fillStyle = INK;
  c.strokeStyle = INK;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  // High collar, standing behind the neck.
  c.beginPath();
  c.moveTo(bx - 32, by - 244);
  c.lineTo(bx - 29, by - 282);
  c.quadraticCurveTo(bx - 10, by - 298, bx + 8, by - 284);
  c.lineTo(bx + 30, by - 244);
  c.closePath();
  c.fill();

  // Long frock coat, split high enough to read against the dark threshold.
  c.beginPath();
  c.moveTo(bx - 46, by);
  c.lineTo(bx - 38, by - 104);
  c.lineTo(bx - 34, by - 190);
  c.lineTo(bx - 34, by - 238);
  c.quadraticCurveTo(bx - 8, by - 260, bx + 18, by - 246);
  c.lineTo(bx + 36, by - 228);
  c.lineTo(bx + 38, by - 150);
  c.lineTo(bx + 42, by - 72);
  c.lineTo(bx + 48, by);
  c.lineTo(bx + 18, by);
  c.lineTo(bx + 4, by - 108);
  c.lineTo(bx - 10, by);
  c.closePath();
  c.fill();

  // Neck.
  c.fillRect(bx - 12, by - 288, 18, 42);

  // Skull, leaning forward, in profile.
  c.beginPath();
  c.ellipse(bx - 11, by - 308, 16.5, 27, -0.08, 0, TAU);
  c.fill();
  // Jaw.
  c.beginPath();
  c.moveTo(bx - 26, by - 294);
  c.lineTo(bx - 6, by - 270);
  c.lineTo(bx - 18, by - 282);
  c.closePath();
  c.fill();
  // Small pointed ear.
  c.beginPath();
  c.moveTo(bx + 4, by - 316);
  c.lineTo(bx + 10, by - 321);
  c.lineTo(bx + 7, by - 305);
  c.closePath();
  c.fill();
  // Hooked nose, short enough to stay human.
  c.beginPath();
  c.moveTo(bx - 25, by - 308);
  c.lineTo(bx - 35, by - 300);
  c.lineTo(bx - 23, by - 294);
  c.lineTo(bx - 19, by - 298);
  c.closePath();
  c.fill();
  // Brow shelf.
  c.beginPath();
  c.moveTo(bx - 26, by - 311);
  c.lineTo(bx - 15, by - 317);
  c.lineTo(bx - 18, by - 310);
  c.closePath();
  c.fill();

  // Left arm bent upward, hand raised towards the shadow.
  c.lineWidth = 8.5;
  c.beginPath();
  c.moveTo(bx - 30, by - 240);
  c.lineTo(bx - 47, by - 206);
  c.lineTo(bx - 56, by - 238);
  c.stroke();
  c.lineWidth = 2.4;
  for (let i = 0; i < 4; i += 1) {
    c.beginPath();
    c.moveTo(bx - 56, by - 238);
    c.lineTo(bx - 68 + i * 3, by - 248 - i * 4);
    c.stroke();
  }

  // Right arm hangs at the coat.
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(bx + 30, by - 238);
  c.lineTo(bx + 43, by - 170);
  c.lineTo(bx + 40, by - 110);
  c.stroke();
  c.lineWidth = 2.4;
  for (let i = 0; i < 4; i += 1) {
    c.beginPath();
    c.moveTo(bx + 40, by - 110);
    c.lineTo(bx + 33 + i * 4, by - 86 + i * 3);
    c.stroke();
  }

  // Mantle edge and coat seams.
  c.strokeStyle = alpha(BONE, 0.17);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bx - 35, by - 238);
  c.quadraticCurveTo(bx - 6, by - 258, bx + 34, by - 226);
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.1);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(bx - 16, by - 244);
  c.lineTo(bx + 3, by - 112);
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.07);
  c.beginPath();
  c.moveTo(bx + 18, by - 230);
  c.lineTo(bx + 12, by - 112);
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.3);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(bx - 10, by - 2);
  c.lineTo(bx + 4, by - 108);
  c.lineTo(bx + 18, by - 2);
  c.stroke();
  c.strokeStyle = INK;

  // Rim light: the moon is to his left.
  c.strokeStyle = alpha(BONE, 0.4);
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(bx - 11, by - 308, 16.9, Math.PI * 0.6, Math.PI * 1.4);
  c.stroke();
  c.beginPath();
  c.moveTo(bx - 35, by - 300);
  c.lineTo(bx - 23, by - 294);
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.22);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(bx - 46, by - 2);
  c.lineTo(bx - 38, by - 104);
  c.lineTo(bx - 34, by - 190);
  c.stroke();
  c.beginPath();
  c.moveTo(bx - 30, by - 240);
  c.lineTo(bx - 47, by - 206);
  c.lineTo(bx - 56, by - 238);
  c.stroke();

  // One pale eye.
  c.fillStyle = alpha(BONE, 0.55);
  c.beginPath();
  c.arc(bx - 20, by - 309, 1.5, 0, TAU);
  c.fill();

  c.restore();
}

function drawStairs(c) {
  const n = 7;
  const x0 = -660;
  const tread = 136;
  const rise = 33;

  // Staircase profile, filled solid.
  c.fillStyle = INK;
  c.beginPath();
  c.moveTo(x0, FLOOR_Y);
  for (let i = 0; i < n; i += 1) {
    const sx = x0 + i * tread;
    const top = FLOOR_Y - (i + 1) * rise;
    c.lineTo(sx, top);
    c.lineTo(sx + tread, top);
  }
  c.lineTo(x0 + n * tread, FLOOR_Y + 140);
  c.lineTo(x0, FLOOR_Y + 140);
  c.closePath();
  c.fill();

  // Tread catchlights. Without these it is only a black wedge.
  for (let i = 0; i < n; i += 1) {
    const sx = x0 + i * tread;
    const top = FLOOR_Y - (i + 1) * rise;
    c.strokeStyle = alpha(BONE, 0.3);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(sx + 2, top + 1);
    c.lineTo(sx + tread - 3, top + 1);
    c.stroke();
    c.strokeStyle = alpha(BONE, 0.1);
    c.beginPath();
    c.moveTo(sx + 2, top + 3);
    c.lineTo(sx + 2, top + rise);
    c.stroke();
  }

  // Balusters and handrail.
  const railY = (x) => 860 - (x - x0) * 0.22;
  c.strokeStyle = INK;
  c.lineCap = 'butt';
  for (let i = 0; i < n; i += 1) {
    const sx = x0 + i * tread + tread * 0.5;
    const top = FLOOR_Y - (i + 1) * rise;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(sx, railY(sx));
    c.lineTo(sx, top);
    c.stroke();
  }
  c.lineCap = 'round';
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(x0 - 20, railY(x0 - 20));
  c.lineTo(x0 + n * tread, railY(x0 + n * tread));
  c.stroke();
  c.strokeStyle = alpha(BONE, 0.16);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x0 - 20, railY(x0 - 20) - 4);
  c.lineTo(x0 + n * tread, railY(x0 + n * tread) - 4);
  c.stroke();

  // Newel post.
  const nx = x0 + n * tread;
  c.fillStyle = INK;
  c.fillRect(nx - 6, 596, 13, FLOOR_Y - 596 - n * rise + 20);
  c.beginPath();
  c.arc(nx + 0.5, 592, 12, 0, TAU);
  c.fill();
  c.strokeStyle = alpha(BONE, 0.18);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(nx - 6, 800);
  c.lineTo(nx - 6, 640);
  c.stroke();
}

// ---------------------------------------------------------------- print

function drawFilmOverlay(g, qt, frame) {
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const inset = 12 * s;
  const rad = 30 * s;

  // The gate is a rounded rectangle punched out of black.
  c.save();
  c.fillStyle = '#000000';
  c.beginPath();
  c.rect(0, 0, W, H);
  c.roundRect(inset, inset, W - inset * 2, H - inset * 2, rad);
  c.fill('evenodd');
  c.restore();

  c.save();
  c.beginPath();
  c.roundRect(inset, inset, W - inset * 2, H - inset * 2, rad);
  c.clip();

  // Exposure flicker, sampled at the same 12 Hz as the shadow.
  const rand = rngFor(14000 + frame);
  const flicker = 0.012 + 0.034 * rand();
  c.fillStyle = `rgba(216, 205, 184, ${flicker.toFixed(4)})`;
  c.fillRect(0, 0, W, H);
  if (rand() > 0.87) {
    c.fillStyle = 'rgba(0, 0, 0, 0.09)';
    c.fillRect(0, 0, W, H);
  }

  // Emulsion scratches: a fixed set that wanders and flickers.
  const sr = rngFor(14777);
  for (let i = 0; i < 8; i += 1) {
    const base = 40 * s + sr() * (W - 80 * s);
    const amp = (2 + sr() * 7) * s;
    const x = base + noise1(qt * 0.35 + i * 2.3, 1500 + i) * amp;
    const a = (0.04 + sr() * 0.12) * (0.5 + 0.5 * rngFor(8000 + i * 97 + frame)());
    c.strokeStyle = `rgba(238, 229, 208, ${a.toFixed(4)})`;
    c.lineWidth = (0.7 + sr() * 0.9) * s;
    const y0 = inset + sr() * H * 0.24;
    const y1 = H - inset - sr() * H * 0.18;
    c.beginPath();
    c.moveTo(x, y0);
    c.lineTo(x + (sr() - 0.5) * 2 * s, (y0 + y1) / 2);
    c.lineTo(x, y1);
    c.stroke();
  }

  // Two deeper scratches that hold for the whole scene.
  c.strokeStyle = `rgba(240, 233, 214, ${0.12 + 0.05 * noise1(qt * 2, 1520)})`;
  c.lineWidth = 1.1 * s;
  c.beginPath();
  c.moveTo(W * 0.355 + noise1(qt * 0.5, 1521) * 4 * s, inset);
  c.lineTo(W * 0.357, H - inset);
  c.stroke();
  c.strokeStyle = 'rgba(240, 233, 214, 0.055)';
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.moveTo(W * 0.62 + noise1(qt * 0.4, 1522) * 5 * s, inset);
  c.lineTo(W * 0.618, H - inset);
  c.stroke();

  // One heavy black hair from the print.
  c.strokeStyle = `rgba(0, 0, 0, ${0.12 + 0.09 * rngFor(7800 + frame)()})`;
  c.lineWidth = 2.1 * s;
  c.beginPath();
  c.moveTo(W * 0.74 + noise1(qt, 1510) * 5 * s, 30 * s);
  c.bezierCurveTo(W * 0.76, H * 0.3, W * 0.71, H * 0.6, W * 0.75, H - 30 * s);
  c.stroke();

  // Dust and emulsion specks, stable for a few frames.
  const dustFrame = Math.floor(frame / 4);
  const dr = rngFor(15500 + dustFrame);
  for (let i = 0; i < 34; i += 1) {
    const x = inset + dr() * (W - inset * 2);
    const y = inset + dr() * (H - inset * 2);
    const r = (0.6 + dr() * 1.9) * s;
    c.fillStyle = dr() > 0.42
      ? `rgba(240, 231, 210, ${(0.07 + dr() * 0.22).toFixed(3)})`
      : `rgba(0, 0, 0, ${(0.14 + dr() * 0.28).toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  // Coarse grain clumps: heavy emulsion, visible at video scale.
  const cg = rngFor(15800 + frame);
  for (let i = 0; i < 160; i += 1) {
    const x = inset + cg() * (W - inset * 2);
    const y = inset + cg() * (H - inset * 2);
    const r = (0.7 + cg() * 2.2) * s;
    const light = cg() > 0.5;
    c.fillStyle = light
      ? `rgba(232, 223, 202, ${(0.015 + cg() * 0.05).toFixed(3)})`
      : `rgba(0, 0, 0, ${(0.02 + cg() * 0.06).toFixed(3)})`;
    c.fillRect(x, y, r, r);
  }

  // Heavy vignette on top of the director's.
  const vg = c.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.3,
    W / 2, H / 2, Math.max(W, H) * 0.7,
  );
  vg.addColorStop(0, 'rgba(8, 7, 6, 0)');
  vg.addColorStop(0.65, 'rgba(8, 7, 6, 0.2)');
  vg.addColorStop(1, 'rgba(8, 7, 6, 0.55)');
  c.fillStyle = vg;
  c.fillRect(0, 0, W, H);

  c.restore();
}

// ---------------------------------------------------------------- title

function drawIntertitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;

  const w = 622 * s;
  const h = 166 * s;
  const x = 66 * s;
  const y = H - 42 * s - h + lift * s;

  c.save();
  c.globalAlpha = opacity;

  // Black intertitle plate with a printed double rule.
  c.fillStyle = 'rgba(7, 6, 5, 0.97)';
  c.fillRect(x, y, w, h);
  // Uneven exposure on the card itself.
  c.save();
  c.globalCompositeOperation = 'lighter';
  const wash = c.createLinearGradient(x, y, x + w, y + h);
  wash.addColorStop(0, 'rgba(216, 205, 184, 0.05)');
  wash.addColorStop(0.45, 'rgba(216, 205, 184, 0.008)');
  wash.addColorStop(1, 'rgba(216, 205, 184, 0)');
  c.fillStyle = wash;
  c.fillRect(x, y, w, h);
  c.restore();
  c.strokeStyle = alpha(BONE, 0.82);
  c.lineWidth = 1.8 * s;
  c.strokeRect(x, y, w, h);
  c.strokeStyle = alpha(BONE, 0.34);
  c.lineWidth = 1 * s;
  c.strokeRect(x + 7.8 * s, y + 7 * s, w - 14 * s, h - 14 * s);

  // Corner lozenges.
  c.fillStyle = alpha(BONE, 0.55);
  const corners = [
    [x + 7 * s, y + 7 * s], [x + w - 7 * s, y + 7 * s],
    [x + 7 * s, y + h - 7 * s], [x + w - 7 * s, y + h - 7 * s],
  ];
  for (const [px, py] of corners) {
    c.save();
    c.translate(px, py);
    c.rotate(Math.PI / 4);
    c.fillRect(-2.6 * s, -2.6 * s, 5.2 * s, 5.2 * s);
    c.restore();
  }

  // Top ornament: a rule broken by a fleuron.
  const ox = x + w / 2;
  const oy = y + 16 * s;
  c.strokeStyle = alpha(BONE, 0.45);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(ox - 64 * s, oy);
  c.lineTo(ox - 16 * s, oy);
  c.moveTo(ox + 16 * s, oy);
  c.lineTo(ox + 64 * s, oy);
  c.stroke();
  c.fillStyle = alpha(BONE, 0.62);
  c.save();
  c.translate(ox, oy);
  c.rotate(Math.PI / 4);
  c.fillRect(-3.4 * s, -3.4 * s, 6.8 * s, 6.8 * s);
  c.restore();
  c.beginPath();
  c.arc(ox - 12 * s, oy, 1.2 * s, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(ox + 12 * s, oy, 1.2 * s, 0, TAU);
  c.fill();

  // A few specks caught in the printed card.
  const tr = rngFor(1499);
  for (let i = 0; i < 12; i += 1) {
    const sx = x + 6 * s + tr() * (w - 12 * s);
    const sy = y + 6 * s + tr() * (h - 12 * s);
    c.fillStyle = tr() > 0.5
      ? `rgba(232, 223, 202, ${(0.04 + tr() * 0.1).toFixed(3)})`
      : `rgba(0, 0, 0, ${(0.1 + tr() * 0.2).toFixed(3)})`;
    c.fillRect(sx, sy, (0.6 + tr() * 1.4) * s, (0.6 + tr() * 1.4) * s);
  }

  // Main titles.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 37 * s, 600, CN_FONT, '2px');
  c.fillStyle = alpha(BONE, 0.97);
  c.fillText('诺斯费拉图', x + 27 * s, y + 79 * s);

  setFont(c, 12.5 * s, 500, EN_SERIF, '4.4px');
  c.fillStyle = alpha(BONE, 0.8);
  c.fillText('NOSFERATU', x + 28 * s, y + 102 * s);

  // Right block: year and process.
  c.strokeStyle = alpha(BONE, 0.26);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + w - 172 * s, y + 40 * s);
  c.lineTo(x + w - 172 * s, y + 116 * s);
  c.stroke();

  setFont(c, 21 * s, 500, EN_SERIF, '1px');
  c.fillStyle = alpha(BONE, 0.88);
  c.fillText('1922', x + w - 148 * s, y + 68 * s);

  setFont(c, 11.5 * s, 400, CN_FONT, '1.2px');
  c.fillStyle = alpha(BONE, 0.66);
  c.fillText('无声电影', x + w - 148 * s, y + 90 * s);
  setFont(c, 8 * s, 500, EN_SERIF, '1.6px');
  c.fillStyle = alpha(BONE, 0.46);
  c.fillText('SILENT FILM', x + w - 148 * s, y + 105 * s);

  // The intertitle's one line of dialogue.
  setFont(c, 13 * s, 400, CN_FONT, '0.8px');
  c.fillStyle = alpha(BONE, 0.62);
  c.fillText('影子先到。', x + 28 * s, y + 136 * s);

  setFont(c, 9.2 * s, 500, EN_SERIF, '1.9px');
  c.fillStyle = alpha(BONE, 0.44);
  c.fillText('THE SHADOW ARRIVES FIRST', x + 28 * s, y + 152 * s);

  c.restore();
}
