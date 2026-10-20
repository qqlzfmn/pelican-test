// Camera for the era sections. Scenes are authored in a 1000-unit-tall space;
// the camera shows 1000 units vertically at zoom 1 and 1777.8 units horizontally
// at 16:9, so scenes paint a little bleed past the page.
//
// Scene pages are 1000 x 1000; the extra horizontal area is road/atmosphere.

import { clamp } from '../kit/math.js';
import { SECTION_LEN, sectionStart } from '../beat/timeline.js';

export function makeView(g, { cx = 500, cy = 500, zoom = 1 } = {}) {
  return {
    w: g.width,
    h: g.height,
    cx,
    cy,
    zoom,
    scale: (g.height / 1000) * zoom,
  };
}

export function applyView(g, view) {
  const c = g.drawingContext;
  c.translate(g.width / 2, g.height / 2);
  c.scale(view.scale, view.scale);
  c.translate(-view.cx, -view.cy);
}

export function sceneCamera(g, index, t) {
  const local = clamp(t - sectionStart(index), 0, SECTION_LEN);
  // Sway starts and ends at zero, so the cut never reframes the rider.
  const drift = Math.sin((Math.PI * local) / SECTION_LEN);

  // A breath of push-in at each frame crossing.
  const edge = 0.34;
  const pushIn = 0.055 * Math.pow(1 - clamp(local / edge), 2);
  const pushOut = 0.055 * Math.pow(clamp((local - (SECTION_LEN - edge)) / edge), 2);

  return makeView(g, {
    cx: 500 + 26 * drift,
    cy: 500,
    zoom: 1 + pushIn + pushOut,
  });
}

export function screenToScene(view, x, y) {
  return {
    x: view.cx + (x - view.w / 2) / view.scale,
    y: view.cy + (y - view.h / 2) / view.scale,
  };
}
