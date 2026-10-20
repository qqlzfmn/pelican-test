// Outro: the wall. 20 framed answers and one empty press seat.
// Everything is drawn in 1920x1080 design units (scaled by s).

import { alpha } from '../kit/color.js';
import { clamp, easeInOut, smoothstep, TAU } from '../kit/math.js';
import { drawEndCaption, CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { clipRect } from '../kit/brush.js';
import { drawRig, silhouetteStyle } from '../rig/draw.js';
import { rigPose } from '../rig/pose.js';

const CELL = 236;
const GAP = 14;
const STEP = CELL + GAP;
const COLS = 7;
const START_X = 92;
const START_Y = 150;

const cellRect = (index) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: START_X + col * STEP,
    y: START_Y + row * STEP,
    w: CELL,
    h: CELL,
  };
};

const PRESS = cellRect(20);
const PRESS_CX = PRESS.x + CELL / 2;
const PRESS_CY = PRESS.y + CELL / 2;

export function drawOutro(g, local, thumbs) {
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;

  c.save();
  c.fillStyle = '#12100d';
  c.fillRect(0, 0, W, H);

  // Camera: pull back to reveal the 7x3 wall, hold, then push into the seat.
  const settle = smoothstep(0, 1.4, local);
  const push = easeInOut(smoothstep(1.8, 4.4, local));
  const zoom = (1 + 0.62 * push) * (1.18 - 0.18 * settle);
  const fx = 960 + (PRESS_CX - 960) * push;
  const fy = 540 + (PRESS_CY - 540) * push;

  c.save();
  c.translate(W / 2, H / 2);
  c.scale(zoom, zoom);
  c.translate(-fx * s, -fy * s);

  // Gallery wall, painted past every camera edge.
  c.fillStyle = '#191612';
  c.fillRect(-1400 * s, -900 * s, 4800 * s, 3000 * s);
  const wallGrad = c.createLinearGradient(0, 0, 0, H);
  wallGrad.addColorStop(0, 'rgba(255, 238, 205, 0.028)');
  wallGrad.addColorStop(0.55, 'rgba(0,0,0,0)');
  wallGrad.addColorStop(1, 'rgba(0,0,0,0.16)');
  c.fillStyle = wallGrad;
  c.fillRect(-1400 * s, -900 * s, 4800 * s, 3000 * s);

  // Soft pools of light on the wall.
  for (let i = 0; i < 5; i += 1) {
    const lx = (250 + i * 360) * s;
    const gr = c.createRadialGradient(lx, 150 * s, 10, lx, 150 * s, 360 * s);
    gr.addColorStop(0, 'rgba(255, 235, 200, 0.055)');
    gr.addColorStop(1, 'rgba(255, 235, 200, 0)');
    c.fillStyle = gr;
    c.fillRect(lx - 360 * s, -100 * s, 720 * s, 900 * s);
  }

  // A pool of light around the press seat, so the wall does not go black.
  {
    const gx = (PRESS_CX + 20) * s;
    const gy = (PRESS_CY - 30) * s;
    const gr = c.createRadialGradient(gx, gy, 10, gx, gy, 520 * s);
    gr.addColorStop(0, 'rgba(255, 238, 205, 0.1)');
    gr.addColorStop(0.5, 'rgba(255, 238, 205, 0.045)');
    gr.addColorStop(1, 'rgba(255, 238, 205, 0)');
    c.fillStyle = gr;
    c.fillRect(gx - 520 * s, gy - 520 * s, 1040 * s, 1040 * s);
  }

  for (let i = 0; i < 21; i += 1) {
    const r = cellRect(i);
    if (i === 20) drawPressCell(g, r, local, s);
    else drawFramedThumb(g, r, thumbs[i], i + 1, s);
  }
  c.restore();

  // Flashes on the press cell (screen space).
  let flash = 0;
  for (const beat of [2, 3, 4]) {
    flash = Math.max(flash, Math.exp(-Math.abs(local - beat) / 0.1));
  }
  if (flash > 0.01) drawFlash(g, local, zoom, fx, fy, flash, s);

  // Captions.
  const a1 = smoothstep(0.35, 0.7, local) * (1 - smoothstep(5.4, 5.8, local));
  const a2 = smoothstep(6.0, 6.35, local);
  if (a1 > 0) drawEndCaption(g, '「截至目前，人类共提交了 20 份答卷。」', { opacity: a1, y: 0.9, size: 34 });
  if (a2 > 0) drawEndCaption(g, '「鹈鹕本人对此尚未发表评论。」', { opacity: a2, y: 0.9, size: 34 });

  // Bottom rule.
  const ruleA = Math.max(a1, a2);
  if (ruleA > 0) {
    c.strokeStyle = alpha('#c7a35c', 0.55 * ruleA);
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.moveTo(W / 2 - 40 * s, H * 0.86);
    c.lineTo(W / 2 + 40 * s, H * 0.86);
    c.stroke();
  }

  c.restore();
}

function drawFramedThumb(g, r, thumb, number, s) {
  const c = g.drawingContext;
  const x = r.x * s;
  const y = r.y * s;
  const w = r.w * s;
  const h = r.h * s;

  c.save();
  // Frame.
  c.fillStyle = '#2a231a';
  c.fillRect(x - 5 * s, y - 5 * s, w + 10 * s, h + 10 * s);
  c.strokeStyle = '#6f5732';
  c.lineWidth = 1.6 * s;
  c.strokeRect(x - 5 * s, y - 5 * s, w + 10 * s, h + 10 * s);
  c.strokeStyle = 'rgba(224, 195, 133, 0.35)';
  c.lineWidth = 0.9 * s;
  c.strokeRect(x - 2.5 * s, y - 2.5 * s, w + 5 * s, h + 5 * s);

  // Mat.
  c.fillStyle = '#0e0c0a';
  c.fillRect(x + 8 * s, y + 8 * s, w - 16 * s, h - 16 * s);

  if (thumb) {
    c.drawImage(thumb.canvas, x + 13 * s, y + 13 * s, w - 26 * s, h - 26 * s);
  } else {
    c.fillStyle = '#1f1b16';
    c.fillRect(x + 13 * s, y + 13 * s, w - 26 * s, h - 26 * s);
  }

  // Brass number plate.
  c.fillStyle = 'rgba(201, 173, 112, 0.85)';
  c.fillRect(x + w - 26 * s, y + h - 15 * s, 18 * s, 8 * s);
  c.fillStyle = '#211b12';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, 5.6 * s, 600, EN_FONT, '0px');
  c.fillText(String(number).padStart(2, '0'), x + w - 17 * s, y + h - 10.6 * s);

  // Glass sheen.
  const gl = c.createLinearGradient(x, y, x + w, y + h);
  gl.addColorStop(0, 'rgba(255,255,255,0.055)');
  gl.addColorStop(0.35, 'rgba(255,255,255,0)');
  gl.addColorStop(1, 'rgba(255,255,255,0.03)');
  c.fillStyle = gl;
  c.fillRect(x + 8 * s, y + 8 * s, w - 16 * s, h - 16 * s);
  c.restore();
}

function drawPressCell(g, r, local, s) {
  const c = g.drawingContext;
  const x = r.x * s;
  const y = r.y * s;
  const w = r.w * s;
  const h = r.h * s;

  c.save();
  // Frame, brighter than the others.
  c.fillStyle = '#3a2f1e';
  c.fillRect(x - 6 * s, y - 6 * s, w + 12 * s, h + 12 * s);
  const fr = c.createLinearGradient(x, y, x + w, y + h);
  fr.addColorStop(0, '#e6cf96');
  fr.addColorStop(0.5, '#a4823f');
  fr.addColorStop(1, '#d7b974');
  c.strokeStyle = fr;
  c.lineWidth = 2.4 * s;
  c.strokeRect(x - 5 * s, y - 5 * s, w + 10 * s, h + 10 * s);
  c.fillStyle = '#0e0c0a';
  c.fillRect(x + 8 * s, y + 8 * s, w - 16 * s, h - 16 * s);

  const ix = x + 12 * s;
  const iy = y + 12 * s;
  const iw = w - 24 * s;
  const ih = h - 24 * s;

  clipRect(g, ix, iy, iw, ih, () => {
    // Press room.
    const bg = c.createLinearGradient(ix, iy, ix, iy + ih);
    bg.addColorStop(0, '#d9cfbc');
    bg.addColorStop(1, '#bcae96');
    c.fillStyle = bg;
    c.fillRect(ix, iy, iw, ih);

    // Back wall panel + floor.
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.fillRect(ix + 10 * s, iy + 10 * s, iw - 20 * s, ih * 0.52);
    c.fillStyle = '#a2947c';
    c.fillRect(ix, iy + ih * 0.72, iw, ih * 0.28);

    // Spotlight cone.
    const cone = c.createLinearGradient(ix + iw / 2, iy, ix + iw / 2, iy + ih * 0.8);
    cone.addColorStop(0, 'rgba(255, 244, 214, 0.5)');
    cone.addColorStop(1, 'rgba(255, 244, 214, 0)');
    c.fillStyle = cone;
    c.beginPath();
    c.moveTo(ix + iw * 0.34, iy);
    c.lineTo(ix + iw * 0.66, iy);
    c.lineTo(ix + iw * 0.88, iy + ih * 0.8);
    c.lineTo(ix + iw * 0.12, iy + ih * 0.8);
    c.closePath();
    c.fill();

    // Pelican charge past, behind the table. Gone before the freeze.
    const prog = clamp((local - 9.55) / 0.8);
    if (prog > 0 && prog < 1) {
      const px = ix - 26 * s + prog * (iw + 52 * s);
      drawRig(g, rigPose(125 + local), silhouetteStyle('#171310'), {
        x: px,
        y: iy + ih - 10 * s,
        scale: 0.36 * s,
        shadow: false,
      });
    }

    // Empty chair.
    const cx = ix + iw * 0.5;
    const chairY = iy + ih * 0.36;
    c.fillStyle = '#564a3b';
    c.strokeStyle = '#332c23';
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.roundRect(cx - 21 * s, chairY, 42 * s, 50 * s, 6 * s);
    c.fill();
    c.stroke();
    // Back slats.
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1 * s;
    for (let i = -1; i <= 1; i += 1) {
      c.beginPath();
      c.moveTo(cx + i * 10 * s, chairY + 5 * s);
      c.lineTo(cx + i * 10 * s, chairY + 45 * s);
      c.stroke();
    }
    // Seat and arms.
    c.fillStyle = '#75654e';
    c.beginPath();
    c.roundRect(cx - 25 * s, chairY + 47 * s, 50 * s, 12 * s, 4 * s);
    c.fill();
    c.strokeStyle = '#3f362b';
    c.lineWidth = 2.4 * s;
    c.beginPath();
    c.moveTo(cx - 25 * s, chairY + 30 * s);
    c.lineTo(cx - 25 * s, chairY + 48 * s);
    c.moveTo(cx + 25 * s, chairY + 30 * s);
    c.lineTo(cx + 25 * s, chairY + 48 * s);
    c.stroke();
    // Legs.
    c.strokeStyle = '#3a3228';
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(cx - 18 * s, chairY + 59 * s);
    c.lineTo(cx - 18 * s, iy + ih * 0.86);
    c.moveTo(cx + 18 * s, chairY + 59 * s);
    c.lineTo(cx + 18 * s, iy + ih * 0.86);
    c.stroke();

    // Table.
    const tableY = iy + ih * 0.74;
    c.fillStyle = '#6b5942';
    c.fillRect(ix + 10 * s, tableY, iw - 20 * s, ih * 0.11);
    c.fillStyle = '#7d6a4e';
    c.fillRect(ix + 10 * s, tableY, iw - 20 * s, 4 * s);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(ix + 10 * s, tableY + ih * 0.11 - 3 * s, iw - 20 * s, 3 * s);

    // Microphones: generic, no outlet marks.
    const micBase = tableY + 1 * s;
    for (let i = 0; i < 5; i += 1) {
      const mx = cx + (i - 2) * 18 * s;
      const topX = cx + (i - 2) * 8 * s;
      const topY = tableY - (48 + (i % 2) * 6) * s;
      c.strokeStyle = '#5c554a';
      c.lineWidth = 1.8 * s;
      c.beginPath();
      c.moveTo(mx, micBase);
      c.lineTo(topX, topY);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 0.6 * s;
      c.beginPath();
      c.moveTo(mx - 0.6 * s, micBase);
      c.lineTo(topX - 0.6 * s, topY);
      c.stroke();
      c.fillStyle = '#232019';
      c.beginPath();
      c.ellipse(topX, topY, 4.6 * s, 7.2 * s, (i - 2) * 0.09, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.32)';
      c.lineWidth = 0.7 * s;
      c.beginPath();
      c.ellipse(topX, topY, 3.2 * s, 5.4 * s, (i - 2) * 0.09, -2.7, -0.6);
      c.stroke();
    }

    // Placard.
    const px0 = cx - 26 * s;
    const py0 = tableY + 5 * s;
    c.fillStyle = '#f2ecdf';
    c.fillRect(px0, py0, 52 * s, 12 * s);
    c.strokeStyle = 'rgba(60,45,25,0.5)';
    c.lineWidth = 0.6 * s;
    c.strokeRect(px0, py0, 52 * s, 12 * s);
    c.fillStyle = '#2e2519';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    setFont(c, 6.6 * s, 600, CN_FONT, '0.2px');
    c.fillText('鹈鹕（本人）', cx, py0 + 6.2 * s);

    // Glass sheen.
    const sh = c.createLinearGradient(ix, iy, ix + iw, iy + ih);
    sh.addColorStop(0, 'rgba(255,255,255,0.1)');
    sh.addColorStop(0.4, 'rgba(255,255,255,0)');
    c.fillStyle = sh;
    c.fillRect(ix, iy, iw, ih);
  });

  // Small caption under the cell.
  c.textAlign = 'center';
  c.textBaseline = 'top';
  setFont(c, 8 * s, 500, EN_FONT, '1px');
  c.fillStyle = alpha('#d9c69a', 0.75);
  c.fillText('PRESS CONFERENCE', x + w / 2, y + h + 8 * s);
  c.restore();
}

function drawFlash(g, local, zoom, fx, fy, pulse, s) {
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const sx = W / 2 + (PRESS_CX - fx) * zoom * s;
  const sy = H / 2 + (PRESS_CY - fy) * zoom * s;
  const r = 230 * zoom * s;

  c.save();
  c.globalCompositeOperation = 'screen';
  const gr = c.createRadialGradient(sx, sy, 0, sx, sy, r);
  gr.addColorStop(0, `rgba(255, 252, 240, ${0.48 * pulse})`);
  gr.addColorStop(0.4, `rgba(255, 246, 220, ${0.2 * pulse})`);
  gr.addColorStop(1, 'rgba(255, 246, 220, 0)');
  c.fillStyle = gr;
  c.fillRect(sx - r, sy - r, r * 2, r * 2);
  c.restore();
}
