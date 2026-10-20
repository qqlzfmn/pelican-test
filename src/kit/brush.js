// Deterministic mark-making. Every random wobble comes from a seeded stream,
// so the same t always produces the same stroke.

import { clamp, lerp, rngFor, TAU } from './math.js';
import { alpha } from './color.js';

function ctxOf(g) {
  return g.drawingContext;
}

export function setup2D(g) {
  const c = ctxOf(g);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.miterLimit = 2;
}

export function polyline(g, pts, { color = '#000', weight = 2, closed = false } = {}) {
  if (!pts || pts.length < 2) return;
  const c = ctxOf(g);
  c.save();
  c.strokeStyle = color;
  c.lineWidth = weight;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  if (closed) c.closePath();
  c.stroke();
  c.restore();
}

// A slightly trembling stroke with a second, fainter pass. Reads as ink on paper.
export function inkStroke(
  g,
  pts,
  {
    color = '#241f1b',
    weight = 2.4,
    seed = 1,
    jitter = 0.7,
    passes = 2,
    alphaBase = 1,
    taper = true,
  } = {},
) {
  if (!pts || pts.length < 2) return;
  const rand = rngFor(seed);
  for (let pass = 0; pass < passes; pass += 1) {
    const jittered = pts.map((p, i) => {
      const edge = taper ? Math.sin((i / (pts.length - 1)) * Math.PI) : 1;
      return {
        x: p.x + (rand() - 0.5) * jitter * (pass ? 2.2 : 1),
        y: p.y + (rand() - 0.5) * jitter * (pass ? 2.2 : 1) - (pass ? 0.5 : 0),
      };
    });
    polyline(g, jittered, {
      color: alpha(color, (pass ? 0.32 : 1) * alphaBase),
      weight: weight * (pass ? 0.7 : 1),
    });
  }
}

export function smoothPoints(pts, samples = 12) {
  if (!pts || pts.length < 3) return pts || [];
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < samples; s += 1) {
      const u = s / samples;
      const u2 = u * u;
      const u3 = u2 * u;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * u +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * u +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Slightly irregular filled polygon (hand-painted edge).
export function wash(g, pts, { color = '#000', alphaBase = 0.3, wobble = 1.2, seed = 2 } = {}) {
  const rand = rngFor(seed);
  const c = ctxOf(g);
  c.save();
  c.fillStyle = alpha(color, alphaBase);
  c.beginPath();
  pts.forEach((p, i) => {
    const x = p.x + (rand() - 0.5) * wobble;
    const y = p.y + (rand() - 0.5) * wobble;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.closePath();
  c.fill();
  c.restore();
}

export function hatchRect(
  g,
  x,
  y,
  w,
  h,
  { color = '#000', alphaBase = 0.2, gap = 8, angle = -Math.PI / 4, weight = 1, seed = 3 } = {},
) {
  const rand = rngFor(seed);
  const c = ctxOf(g);
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  c.strokeStyle = alpha(color, alphaBase);
  c.lineWidth = weight;
  const diag = Math.hypot(w, h);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (let o = -diag; o <= diag; o += gap) {
    const j = (rand() - 0.5) * gap * 0.35;
    c.beginPath();
    c.moveTo(cx + nx * (o + j) - dx * diag, cy + ny * (o + j) - dy * diag);
    c.lineTo(cx + nx * (o + j) + dx * diag, cy + ny * (o + j) + dy * diag);
    c.stroke();
  }
  c.restore();
}

export function speckle(g, x, y, w, h, { color = '#000', count = 200, size = 1.2, alphaBase = 0.18, seed = 4 } = {}) {
  const rand = rngFor(seed);
  const c = ctxOf(g);
  c.save();
  c.fillStyle = alpha(color, alphaBase);
  for (let i = 0; i < count; i += 1) {
    const r = size * (0.35 + rand());
    c.beginPath();
    c.arc(x + rand() * w, y + rand() * h, r, 0, TAU);
    c.fill();
  }
  c.restore();
}

// Curved stroke through a list of control points (quadratic chain).
export function curve(g, pts, opts = {}) {
  if (!pts || pts.length < 2) return;
  const c = ctxOf(g);
  c.save();
  c.strokeStyle = opts.color || '#000';
  c.lineWidth = opts.weight ?? 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    c.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  c.stroke();
  c.restore();
}

export function taperedStroke(g, pts, { color = '#000', w0 = 8, w1 = 1, seed = 5 } = {}) {
  if (!pts || pts.length < 2) return;
  const rand = rngFor(seed);
  const c = ctxOf(g);
  c.save();
  c.fillStyle = color;
  c.beginPath();
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const r = pts[Math.max(0, i - 1)];
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const k = i / (pts.length - 1);
    const w = lerp(w0, w1, k) * (0.85 + rand() * 0.3);
    left.push({ x: p.x + (nx * w) / 2, y: p.y + (ny * w) / 2 });
    right.push({ x: p.x - (nx * w) / 2, y: p.y - (ny * w) / 2 });
  }
  c.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i += 1) c.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i -= 1) c.lineTo(right[i].x, right[i].y);
  c.closePath();
  c.fill();
  c.restore();
}

export function roundRect(g, x, y, w, h, r, { fill, stroke, weight = 2 } = {}) {
  const c = ctxOf(g);
  c.save();
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = weight;
    c.stroke();
  }
  c.restore();
}

export function clipRect(g, x, y, w, h, draw) {
  const c = ctxOf(g);
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  draw();
  c.restore();
}

export function gradient(g, x, y, w, h, stops, horizontal = false) {
  const c = ctxOf(g);
  const gr = horizontal
    ? c.createLinearGradient(x, y, x + w, y)
    : c.createLinearGradient(x, y, x, y + h);
  for (const [pos, color] of stops) gr.addColorStop(clamp(pos), color);
  c.save();
  c.fillStyle = gr;
  c.fillRect(x, y, w, h);
  c.restore();
}
