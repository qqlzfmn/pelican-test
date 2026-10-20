// Phase 1 scaffolding: each era is a labelled colour block with its own palette
// and a simple motif. The real scene painters replace draw() file by file.

import { alpha, mix } from '../kit/color.js';
import { gradient, hatchRect, speckle } from '../kit/brush.js';
import { ROAD_Y, roadPaletteFor } from '../kit/road.js';
import { neutralStyle } from '../rig/draw.js';
import { rngFor, TAU } from '../kit/math.js';

export function basePalette(overrides = {}) {
  return {
    bg: '#efe7d6',
    bg2: '#e2d5bd',
    motif: '#8d7c63',
    accent: '#b08d57',
    ink: '#2a241d',
    titleInk: '#2a241d',
    ground: '#c7b79b',
    road: '#9d8e77',
    dash: '#f3e9d5',
    body: '#f7f0e3',
    beak: '#d0873a',
    rigInk: '#241f1a',
    ...overrides,
  };
}

export function paletteStyle(p) {
  return neutralStyle({
    ink: p.rigInk || p.ink,
    body: p.body,
    bodyShade: mix(p.body, p.rigInk || p.ink, 0.16),
    wing: mix(p.body, p.accent, 0.18),
    beak: p.beak,
    pouch: mix(p.beak, '#f2c06a', 0.35),
    leg: p.beak,
  });
}

export function placeholder(g, ctx, def) {
  const c = g.drawingContext;
  const p = def.palette;
  const n = def.number;

  // Full-bleed ground.
  gradient(g, -1200, -400, 3600, 1600, [
    [0, p.bg],
    [0.62, p.bg2],
    [1, mix(p.bg2, '#000000', 0.12)],
  ]);

  drawMotif(g, def, p);
  drawGhostNumber(g, n, p);
  drawBlockLabel(g, def, p);

  // Horizon and road.
  c.save();
  c.strokeStyle = alpha(p.ink, 0.18);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-1200, ROAD_Y - 140);
  c.lineTo(2400, ROAD_Y - 140);
  c.stroke();
  c.restore();

  // Simple parallax band behind the rider.
  const rand = rngFor(n * 71);
  c.save();
  for (let i = 0; i < 26; i += 1) {
    const x = -900 + ((i * 137 - ctx.t * 26) % 2500 + 2500) % 2500;
    const h = 20 + rand() * 90;
    c.fillStyle = alpha(p.motif, 0.08);
    c.fillRect(x, ROAD_Y - 140 - h, 8 + rand() * 60, h);
  }
  c.restore();

  ctx.road(g, roadPaletteFor(p));

  // The rider is the one continuous thing in the film.
  ctx.rider(g, 468, {
    style: paletteStyle(p),
    scale: 1.18,
  });

  // Edge marks so the frame reads as a plate, not a missing asset.
  c.save();
  c.strokeStyle = alpha(p.accent, 0.55);
  c.lineWidth = 2;
  c.strokeRect(-740, -320, 2600, 1420);
  c.restore();
}

function drawMotif(g, def, p) {
  const c = g.drawingContext;
  const kind = def.motif || 'disc';
  c.save();
  c.translate(860, 430);
  c.strokeStyle = alpha(p.motif, 0.32);
  c.fillStyle = alpha(p.motif, 0.13);
  c.lineWidth = 3;

  if (kind === 'disc') {
    c.beginPath();
    c.arc(0, 0, 300, 0, TAU);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(0, 0, 210, 0, TAU);
    c.stroke();
  } else if (kind === 'pyramid') {
    c.beginPath();
    c.moveTo(-340, 240);
    c.lineTo(0, -280);
    c.lineTo(340, 240);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-120, 240);
    c.lineTo(70, -90);
    c.lineTo(260, 240);
    c.stroke();
  } else if (kind === 'waves') {
    for (let j = 0; j < 7; j += 1) {
      c.beginPath();
      for (let x = -360; x <= 360; x += 12) {
        const y = j * 42 - 130 + Math.sin(x / 44 + j * 0.7) * 20;
        if (x === -360) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  } else if (kind === 'squares') {
    for (let j = 0; j < 5; j += 1) {
      const s = 320 - j * 52;
      c.strokeRect(-s, -s * 0.75, s * 2, s * 1.5);
    }
  } else if (kind === 'arch') {
    c.beginPath();
    c.arc(0, 80, 280, Math.PI, TAU);
    c.lineTo(280, 260);
    c.lineTo(-280, 260);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (kind === 'grid') {
    for (let j = -6; j <= 6; j += 1) {
      c.beginPath();
      c.moveTo(j * 44, -300);
      c.lineTo(j * 44, 300);
      c.stroke();
      c.beginPath();
      c.moveTo(-320, j * 44);
      c.lineTo(320, j * 44);
      c.stroke();
    }
  } else {
    c.beginPath();
    c.ellipse(0, 0, 330, 190, -0.35, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.restore();
}

function drawGhostNumber(g, n, p) {
  const c = g.drawingContext;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '600 430px "Bodoni 72", Didot, "Times New Roman", serif';
  c.fillStyle = alpha(p.motif, 0.16);
  c.fillText(String(n).padStart(2, '0'), 860, 430);
  c.restore();
}

function drawBlockLabel(g, def, p) {
  const c = g.drawingContext;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '500 21px "Helvetica Neue", Arial, sans-serif';
  if ('letterSpacing' in c) c.letterSpacing = '5px';
  c.fillStyle = alpha(p.ink, 0.5);
  c.fillText('占位色块  /  PLACEHOLDER', 500, 390);

  // Small registration cross; a print-shop cue that phase 1 is scaffolding.
  c.strokeStyle = alpha(p.accent, 0.45);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(500 - 7, 424);
  c.lineTo(500 + 7, 424);
  c.moveTo(500, 417);
  c.lineTo(500, 431);
  c.stroke();
  c.restore();
}

export function decorativeHatch(g, p) {
  hatchRect(g, -700, 0, 2500, 700, {
    color: p.ink,
    alphaBase: 0.035,
    gap: 26,
    angle: -0.6,
    weight: 1,
    seed: 33,
  });
  speckle(g, -700, 0, 2500, 800, {
    color: p.ink,
    count: 320,
    size: 1.2,
    alphaBase: 0.06,
    seed: 44,
  });
}
