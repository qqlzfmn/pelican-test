// Intro: a solemn documentary title card for a field that does not exist.
// Paper, source citation, and one sketched plate.

import { alpha } from '../kit/color.js';
import { drawPaper, grain, vignette } from '../kit/texture.js';
import { clipRect, polyline, hatchRect } from '../kit/brush.js';
import { smoothstep, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, neutralStyle } from '../rig/draw.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const INK = '#2c241b';
const PAPER = '#efe4cf';

export function drawIntro(g, t) {
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;

  c.save();
  c.fillStyle = PAPER;
  c.fillRect(0, 0, W, H);
  drawPaper(g, { tone: PAPER, seed: 12, fiber: 3200, specks: 9000, laid: true });

  // Plate edge.
  c.strokeStyle = alpha(INK, 0.22);
  c.lineWidth = 1 * s;
  c.strokeRect(62 * s, 62 * s, W - 124 * s, H - 124 * s);
  c.strokeStyle = alpha(INK, 0.1);
  c.strokeRect(70 * s, 70 * s, W - 140 * s, H - 140 * s);

  // Masthead.
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  setFont(c, 27 * s, 600, CN_FONT, '1px');
  c.fillStyle = INK;
  c.fillText('鹈鹕骑行艺术通史', 132 * s, 128 * s);
  setFont(c, 12 * s, 500, EN_FONT, '4.5px');
  c.fillStyle = alpha(INK, 0.62);
  c.fillText('A PELICAN TEST  ·  VOL. I', 133 * s, 153 * s);

  c.textAlign = 'right';
  setFont(c, 12 * s, 500, EN_FONT, '3.5px');
  c.fillStyle = alpha(INK, 0.55);
  c.fillText('PLATE I  /  MMXXVI', W - 132 * s, 128 * s);
  c.textAlign = 'left';

  // Rule.
  c.strokeStyle = alpha(INK, 0.28);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(132 * s, 176 * s);
  c.lineTo(W - 132 * s, 176 * s);
  c.stroke();

  // Sketch plate, top right.
  const panel = {
    x: 1112 * s,
    y: 214 * s,
    w: 648 * s,
    h: 472 * s,
  };
  const panelAlpha = smoothstep(0.35, 1.15, t);
  drawPlate(g, panel, t, panelAlpha);

  // Subtitles.
  const a1in = smoothstep(0.78, 1.05, t);
  const a1out = 1 - smoothstep(4.3, 4.55, t);
  const a2in = smoothstep(3.86, 4.08, t);
  const a2out = 1 - smoothstep(4.5, 4.7, t);
  const a2 = a2in * a2out;
  const a1 = a1in * a1out * (1 - 0.45 * a2);

  drawSubtitle(g, '人类自古以来就痴迷于画鹈鹕骑自行车。', 1, a1, 772 * s, 54 * s);
  drawSubtitle(g, '——早在自行车被发明之前。', 2, a2, 862 * s, 54 * s);

  // Source line.
  const sa = smoothstep(4.05, 4.3, t);
  c.save();
  c.globalAlpha = sa * 0.8;
  c.textAlign = 'right';
  setFont(c, 19 * s, 400, CN_FONT, '0.5px');
  c.fillStyle = alpha(INK, 0.85);
  c.fillText('——《鹈鹕骑行艺术通史》，卷一（虚构书名）', W - 132 * s, 962 * s);
  c.restore();

  // Opening fade.
  const fade = 1 - smoothstep(0, 0.55, t);
  if (fade > 0) {
    c.fillStyle = alpha('#000000', fade);
    c.fillRect(0, 0, W, H);
  }

  grain(g, 0.028, 3);
  vignette(g, 0.14, '40, 28, 16');
  c.restore();
}

function drawPlate(g, panel, t, opacity) {
  const c = g.drawingContext;
  const s = g.height / 1080;
  if (opacity <= 0) return;

  c.save();
  c.globalAlpha = opacity;

  // Drop shadow.
  c.shadowColor = 'rgba(45,30,12,0.28)';
  c.shadowBlur = 34 * s;
  c.shadowOffsetY = 12 * s;
  c.fillStyle = '#f6eedb';
  c.fillRect(panel.x, panel.y, panel.w, panel.h);
  c.shadowColor = 'transparent';

  // Mat + plate.
  c.strokeStyle = alpha(INK, 0.34);
  c.lineWidth = 1.4 * s;
  c.strokeRect(panel.x, panel.y, panel.w, panel.h);
  c.strokeStyle = alpha(INK, 0.18);
  c.lineWidth = 1 * s;
  c.strokeRect(panel.x + 13 * s, panel.y + 13 * s, panel.w - 26 * s, panel.h - 26 * s);

  const inner = {
    x: panel.x + 22 * s,
    y: panel.y + 22 * s,
    w: panel.w - 44 * s,
    h: panel.h - 44 * s,
  };

  clipRect(g, inner.x, inner.y, inner.w, inner.h, () => {
    c.fillStyle = '#f2e7d1';
    c.fillRect(inner.x, inner.y, inner.w, inner.h);

    // Construction grid, faint.
    c.strokeStyle = alpha('#6d5b42', 0.08);
    c.lineWidth = 1 * s;
    for (let x = inner.x; x <= inner.x + inner.w; x += 32 * s) {
      c.beginPath();
      c.moveTo(x, inner.y);
      c.lineTo(x, inner.y + inner.h);
      c.stroke();
    }
    for (let y = inner.y; y <= inner.y + inner.h; y += 32 * s) {
      c.beginPath();
      c.moveTo(inner.x, y);
      c.lineTo(inner.x + inner.w, y);
      c.stroke();
    }

    // Ground line + hatching.
    const groundY = inner.y + inner.h - 52 * s;
    polyline(g, [
      { x: inner.x + 10 * s, y: groundY },
      { x: inner.x + inner.w - 10 * s, y: groundY },
    ], { color: alpha('#5c4933', 0.55), weight: 1.6 * s });
    hatchRect(g, inner.x, groundY, inner.w, 40 * s, {
      color: '#5c4933',
      alphaBase: 0.15,
      gap: 7 * s,
      angle: -0.35,
      weight: 1 * s,
      seed: 82,
    });

    const style = neutralStyle({
      ink: '#4a3927',
      body: '#efe1c6',
      bodyShade: '#d8c3a0',
      wing: '#e2d0ae',
      beak: '#a9753c',
      pouch: '#bd8a4b',
      leg: '#a9753c',
      rim: '#77654f',
      saddle: '#5a4633',
      metal: '#8b7a61',
    });
    style.weight = 1;

    const pose = rigPose(t, { cadence: 0.55 });
    drawRig(g, pose, style, {
      x: inner.x + inner.w * 0.5,
      y: groundY + 2 * s,
      scale: 1.28 * s,
      shadow: true,
    });

    // Handwritten plate marks.
    c.strokeStyle = alpha('#5b4831', 0.35);
    c.lineWidth = 1 * s;
    c.beginPath();
    c.moveTo(inner.x + 18 * s, inner.y + 18 * s);
    c.lineTo(inner.x + 18 * s, inner.y + 40 * s);
    c.moveTo(inner.x + 18 * s, inner.y + 18 * s);
    c.lineTo(inner.x + 40 * s, inner.y + 18 * s);
    c.stroke();

    c.save();
    c.translate(inner.x + inner.w * 0.5, inner.y + 38 * s);
    c.textAlign = 'center';
    setFont(c, 13 * s, 500, EN_FONT, '4px');
    c.fillStyle = alpha('#5b4831', 0.6);
    c.fillText('ANATOMIA PELECANI CYCLISTAE', 0, 0);
    c.restore();

    // A few ink flecks / foxing.
    c.fillStyle = alpha('#7b5c37', 0.12);
    for (let i = 0; i < 30; i += 1) {
      const x = inner.x + ((i * 137) % inner.w);
      const y = inner.y + ((i * 89) % inner.h);
      c.beginPath();
      c.arc(x, y, 0.8 * s + (i % 3) * 0.5 * s, 0, TAU);
      c.fill();
    }
  });

  // Caption.
  c.textAlign = 'center';
  setFont(c, 21 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(INK, 0.8);
  c.fillText('图一  鹈鹕骑行图（摹本）', panel.x + panel.w / 2, panel.y + panel.h + 34 * s);
  setFont(c, 11 * s, 500, EN_FONT, '3px');
  c.fillStyle = alpha(INK, 0.5);
  c.fillText('FIG. 1 — PELICAN ON A BICYCLE (AFTER A LOST ORIGINAL)', panel.x + panel.w / 2, panel.y + panel.h + 52 * s);

  c.restore();
}

function drawSubtitle(g, text, n, opacity, y, size) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const s = g.height / 1080;
  c.save();
  c.globalAlpha = opacity;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, size, 500, CN_FONT, '2px');
  c.fillStyle = INK;
  c.shadowColor = 'rgba(60,40,15,0.12)';
  c.shadowBlur = 10 * s;
  const lift = (1 - opacity) * 8 * s;
  c.fillText(text, g.width / 2, y + lift);
  c.restore();
}
