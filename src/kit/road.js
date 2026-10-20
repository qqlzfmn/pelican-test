// One continuous road for the whole film. The geometry never changes;
// only the palette, verge and background do, per era.

import { alpha, mix } from './color.js';
import { TAU, noise1, rngFor } from './math.js';

export const ROAD_Y = 820;
export const WHEEL_R = 50;
export const SPEED = TAU * WHEEL_R; // one crank revolution per second, 1:1 gearing

export function drawRoad(g, t, {
  ground = '#c9b899',
  verge = '#b3a184',
  road = '#8e8272',
  edge = '#d8ccb8',
  dash = '#e8ddc6',
  ink = '#3a332b',
  width = 1,
  dust = true,
} = {}) {
  const c = g.drawingContext;
  const scroll = (t * SPEED) % 240;

  // Verge / soil below the horizon.
  c.save();
  c.fillStyle = ground;
  c.fillRect(-1200, ROAD_Y - 90, 3600, 1200);

  // A soft strip of grass or grit.
  c.fillStyle = alpha(verge, 0.75);
  c.fillRect(-1200, ROAD_Y - 74, 3600, 44);

  // Road slab.
  c.fillStyle = road;
  c.fillRect(-1200, ROAD_Y - 26, 3600, 132);
  c.fillStyle = alpha('#ffffff', 0.05);
  c.fillRect(-1200, ROAD_Y - 26, 3600, 3);

  // Near edge and far edge.
  c.strokeStyle = alpha(edge, 0.9);
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(-1200, ROAD_Y - 26);
  c.lineTo(2400, ROAD_Y - 26);
  c.stroke();
  c.strokeStyle = alpha(ink, 0.18);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-1200, ROAD_Y + 106);
  c.lineTo(2400, ROAD_Y + 106);
  c.stroke();

  // Center dashes, scrolling with the wheel.
  c.fillStyle = alpha(dash, 0.72);
  for (let x = -1200 - scroll; x < 2400; x += 240) {
    c.fillRect(x, ROAD_Y + 36, 96, 7);
  }

  // Grit: deterministic, scrolls at the same rate.
  const rand = rngFor(91);
  c.fillStyle = alpha(ink, 0.14);
  for (let i = 0; i < 70; i += 1) {
    const base = rand() * 3600;
    const x = ((base - scroll) % 3600 + 3600) % 3600 - 1200;
    const y = ROAD_Y - 20 + rand() * 122;
    c.fillRect(x, y, 1 + rand() * 3, 1);
  }
  c.restore();

  if (dust) drawDust(g, t, { color: edge, ink, width });
}

function drawDust(g, t, { color, ink, width }) {
  const c = g.drawingContext;
  const rand = rngFor(23);
  c.save();
  for (let i = 0; i < 22; i += 1) {
    const seed = rand() * 1000;
    const x = -200 + ((seed * 13 + t * 40) % 1600);
    const y = ROAD_Y - 12 - ((seed * 7 + t * 9) % 70);
    const r = 1.5 + rand() * 4.5;
    const a = 0.05 + rand() * 0.08;
    c.fillStyle = alpha(color, a * width);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

// Long horizontal speed streaks, useful for the last bar of each era.
export function drawSpeedStreaks(g, t, { color = '#fff', amount = 0.08, y = ROAD_Y - 120 } = {}) {
  const c = g.drawingContext;
  c.save();
  c.strokeStyle = alpha(color, amount);
  c.lineWidth = 1;
  for (let i = 0; i < 14; i += 1) {
    const yy = y + i * 18 + noise1(i * 3.1 + t * 0.7, 7) * 8;
    const len = 90 + noise1(i * 1.7 + t, 9) * 140;
    const x = ((i * 197 - t * 300) % 1900 + 1900) % 1900 - 400;
    c.beginPath();
    c.moveTo(x, yy);
    c.lineTo(x + len, yy);
    c.stroke();
  }
  c.restore();
}

export function roadPaletteFor(palette) {
  return {
    ground: palette.ground || mix(palette.bg, '#000000', 0.12),
    verge: palette.verge || mix(palette.bg, '#000000', 0.2),
    road: palette.road || mix(palette.bg, '#000000', 0.3),
    edge: palette.edge || palette.accent,
    dash: palette.dash || palette.accent,
    ink: palette.ink,
  };
}
