// Era title card, drawn in screen space so it stays legible regardless of camera.
// Format: 中文名 + English name + date, plus a small index.

import { alpha, luminance, mix } from './color.js';

const CN_FONT = '"Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';
const EN_FONT = '"Helvetica Neue", "Arial Narrow", Arial, sans-serif';

function setFont(c, size, weight, font, spacing = '0px') {
  c.font = `${weight} ${size}px ${font}`;
  if ('letterSpacing' in c) c.letterSpacing = spacing;
}

export function drawTitleCard(g, scene, { opacity = 1, lift = 0 } = {}) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const p = scene.palette;
  const ink = p.titleInk || p.ink || '#221d17';
  const accent = p.accent || '#b08d57';
  const x = 92 * s;
  const baseY = H - 156 * s + lift * s;

  c.save();
  c.globalAlpha = opacity;

  // Corner scrim, radial so it has no hard rectangular edge.
  // On light-ink eras it is a soft paper plate; on dark-ink eras, a dark plate.
  const scrimColor = p.scrim || (luminance(ink) > 0.55 ? '#050403' : mix(p.bg, '#2a2118', 0.3));
  const gr = c.createRadialGradient(0, H, 0, 0, H, W * 0.6);
  gr.addColorStop(0, alpha(scrimColor, 0.88));
  gr.addColorStop(0.42, alpha(scrimColor, 0.58));
  gr.addColorStop(1, alpha(scrimColor, 0));
  c.fillStyle = gr;
  c.fillRect(0, 0, W, H);

  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.shadowColor = alpha('#000000', 0.35);
  c.shadowBlur = 12 * s;
  c.shadowOffsetY = 2 * s;

  setFont(c, 15 * s, 600, EN_FONT, '3px');
  c.fillStyle = alpha(accent, 0.98);
  c.fillText(`${String(scene.number).padStart(2, '0')}  /  20`, x, baseY - 76 * s);

  setFont(c, 44 * s, 600, CN_FONT, '1px');
  c.fillStyle = ink;
  c.fillText(scene.cn, x, baseY - 24 * s);

  setFont(c, 19 * s, 500, EN_FONT, '2.4px');
  c.fillStyle = alpha(ink, 0.82);
  c.fillText(scene.en.toUpperCase(), x, baseY + 12 * s);

  setFont(c, 17 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(accent, 0.95);
  c.fillText(scene.year, x, baseY + 44 * s);

  c.shadowColor = 'transparent';
  c.strokeStyle = alpha(accent, 0.8);
  c.lineWidth = 1.5 * s;
  c.beginPath();
  c.moveTo(x, baseY - 93 * s);
  c.lineTo(x + 46 * s, baseY - 93 * s);
  c.stroke();
  c.restore();
}

export function drawEndCaption(g, text, { opacity = 1, y = 0.865, size = 34 } = {}) {
  const c = g.drawingContext;
  const s = g.height / 1080;
  c.save();
  c.globalAlpha = opacity;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  setFont(c, size * s, 500, CN_FONT, '2px');
  c.fillStyle = '#f1e9da';
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 18 * s;
  c.fillText(text, g.width / 2, g.height * y);
  c.restore();
}

export { CN_FONT, EN_FONT, setFont };
