// Static scene art is expensive (thousands of strokes). Paint it once into a
// scene-space layer at 1.2 px/unit, then transform that layer with the camera.
// Layers are per page; each render worker builds its own copy.

const layers = new Map();

export const CACHE = {
  x0: -500,
  y0: -50,
  w: 2000,
  h: 1100,
  scale: 1.2,
};

export function cachedLayer(ctx, key, draw, opts = {}) {
  if (layers.has(key)) return layers.get(key);
  const {
    x0 = CACHE.x0,
    y0 = CACHE.y0,
    w = CACHE.w,
    h = CACHE.h,
    scale = CACHE.scale,
  } = opts;
  const pg = ctx.makeGraphics(Math.round(w * scale), Math.round(h * scale));
  pg.pixelDensity(1);
  const c = pg.drawingContext;
  c.save();
  c.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  draw(pg, c);
  c.restore();
  layers.set(key, pg);
  return pg;
}

export function drawCached(g, layer, opts = {}) {
  const {
    x0 = CACHE.x0,
    y0 = CACHE.y0,
    w = CACHE.w,
    h = CACHE.h,
  } = opts;
  if (!layer) return;
  g.drawingContext.drawImage(layer.canvas, x0, y0, w, h);
}

// A second, smaller cache for a layer that scrolls (herd, hand stencils).
export function clearLayerCache(prefix) {
  for (const key of layers.keys()) {
    if (key.startsWith(prefix)) layers.delete(key);
  }
}
