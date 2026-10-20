// "Through the frame" crossing. The next era is revealed inside a physical
// picture frame that grows to swallow the screen on the downbeat.

import { alpha } from '../kit/color.js';
import { clamp, easeInOut, smoothstep } from '../kit/math.js';

export function apertureAt(W, H, k) {
  const grow = easeInOut(clamp(k));
  const scale = 0.06 + 0.94 * grow;
  const w = W * scale;
  const h = H * scale;
  // Start over the rider / road, then settle to screen centre.
  const cx = W * (0.47 + 0.03 * grow);
  const cy = H * (0.72 - 0.22 * grow);
  return { x: cx - w / 2, y: cy - h / 2, w, h, k: grow };
}

export function drawFrameBorder(g, rect, k, accent = '#c7a35c') {
  const c = g.drawingContext;
  const s = g.height / 1080;
  const scale = rect.w / g.width;
  const lip = 13 * s * (0.35 + 0.65 * scale);
  const inner = 5 * s * (0.5 + 0.5 * scale);

  c.save();

  // Outer shadow so the frame sits above the outgoing painting.
  // Stroke only: the incoming scene must stay visible inside the aperture.
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 28 * s;
  c.shadowOffsetY = 8 * s;
  c.strokeStyle = '#1a1510';
  c.lineWidth = lip * 2;
  c.strokeRect(rect.x - lip, rect.y - lip, rect.w + lip * 2, rect.h + lip * 2);
  c.shadowColor = 'transparent';

  // Gilt moulding.
  const grd = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grd.addColorStop(0, '#e6cf96');
  grd.addColorStop(0.28, accent);
  grd.addColorStop(0.55, '#8a6a34');
  grd.addColorStop(0.8, '#d9bb7d');
  grd.addColorStop(1, '#6f5327');
  c.fillStyle = grd;
  c.fillRect(rect.x - lip, rect.y - lip, rect.w + lip * 2, lip);
  c.fillRect(rect.x - lip, rect.y + rect.h, rect.w + lip * 2, lip);
  c.fillRect(rect.x - lip, rect.y, lip, rect.h);
  c.fillRect(rect.x + rect.w, rect.y, lip, rect.h);

  // Inner lip.
  c.strokeStyle = alpha('#2a2014', 0.9);
  c.lineWidth = inner;
  c.strokeRect(rect.x - inner / 2, rect.y - inner / 2, rect.w + inner, rect.h + inner);

  // Glass / varnish glare along the top edge.
  const gloss = c.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  gloss.addColorStop(0, 'rgba(255,255,255,0.09)');
  gloss.addColorStop(0.35, 'rgba(255,255,255,0.0)');
  c.fillStyle = gloss;
  c.fillRect(rect.x, rect.y, rect.w, rect.h);

  c.restore();
}

export function transitionAmount(t, boundary, window = 0.34) {
  if (t >= boundary || t < boundary - window) return 0;
  return smoothstep(boundary - window, boundary, t);
}
