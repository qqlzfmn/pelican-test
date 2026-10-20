// Scheduler: one pure renderAt(t) for preview and frame export.
// It owns the camera, the through-frame transition, title cards and the thumbs.

import scenes from '../scenes/index.js';
import { paletteStyle } from '../scenes/_placeholder.js';
import { ROAD_Y, drawRoad, roadPaletteFor } from '../kit/road.js';
import { grain, vignette } from '../kit/texture.js';
import { drawRig } from '../rig/draw.js';
import { rigPose } from '../rig/pose.js';
import { drawTitleCard } from '../kit/cards.js';
import { smoothstep } from '../kit/math.js';
import {
  DURATION,
  OUTRO_START,
  SECTION_LEN,
  SECTIONS_START,
  boundaryNear,
  clamp,
  sectionAt,
  sectionStart,
} from '../beat/timeline.js';
import { applyView, makeView, sceneCamera } from './camera.js';
import { apertureAt, drawFrameBorder, transitionAmount } from './transitions.js';
import { drawIntro } from './intro.js';
import { drawOutro } from './outro.js';

export class Director {
  constructor(p) {
    this.p = p;
    this.thumbs = null;
  }

  renderAt(t) {
    const g = this.p;
    const time = clamp(t, 0, DURATION);
    g.background(10);

    const info = sectionAt(time);
    this.drawActive(g, info, time);

    const b = boundaryNear(time, 0.28);
    if (b !== null && time < b - 1e-4) {
      const k = transitionAmount(time, b, 0.28);
      if (k > 0) {
        const next = this.nextAfter(b);
        const rect = apertureAt(g.width, g.height, k);
        const c = g.drawingContext;
        c.save();
        c.beginPath();
        c.rect(rect.x, rect.y, rect.w, rect.h);
        c.clip();
        this.drawPiece(g, next.kind, next.index, time, { title: false });
        c.restore();
        drawFrameBorder(g, rect, k, '#c7a35c');
      }
    }

    if (info.kind === 'section') {
      grain(g, 0.035, 5);
      vignette(g, 0.2);
    } else if (info.kind === 'outro') {
      grain(g, 0.05, 9);
      vignette(g, 0.32);
    }
  }

  drawActive(g, info, t) {
    if (info.kind === 'intro') {
      drawIntro(g, t);
      return;
    }
    if (info.kind === 'outro') {
      this.ensureThumbs();
      drawOutro(g, info.local, this.thumbs);
      return;
    }
    this.drawSection(g, info.index, t, { title: true });
  }

  drawPiece(g, kind, index, t, { title = false } = {}) {
    if (kind === 'intro') {
      drawIntro(g, t);
    } else if (kind === 'outro') {
      this.ensureThumbs();
      drawOutro(g, clamp(t - OUTRO_START, 0, 12), this.thumbs);
    } else {
      this.drawSection(g, index, t, { title });
    }
  }

  drawSection(g, index, t, { title = true, thumbnail = false } = {}) {
    const scene = scenes[index];
    const local = clamp(t - sectionStart(index), 0, SECTION_LEN);
    const view =
      !thumbnail && typeof scene.camera === 'function'
        ? scene.camera(g, local, t)
        : sceneCamera(g, index, t);

    // Backstop fill; every scene also paints its own bleed.
    g.drawingContext.save();
    g.drawingContext.fillStyle = scene.palette.bg;
    g.drawingContext.fillRect(0, 0, g.width, g.height);
    g.drawingContext.restore();

    g.push();
    applyView(g, view);
    scene.draw(g, this.makeCtx(g, index, t, local, view, { thumbnail }));
    g.pop();

    if (title) {
      const aIn = smoothstep(0.35, 0.85, local);
      const aOut = 1 - smoothstep(4.85, 5.3, local);
      const opacity = aIn * aOut;
      if (opacity > 0.001) {
        const cardOpts = {
          opacity,
          lift: (1 - aIn) * 14,
          local,
          t,
        };
        if (typeof scene.titleCard === 'function') {
          scene.titleCard(g, cardOpts);
        } else {
          drawTitleCard(g, scene, cardOpts);
        }
      }
    }
  }

  makeCtx(g, index, t, local, view, { thumbnail = false } = {}) {
    const scene = scenes[index];
    const palette = scene.palette;
    const style = paletteStyle(palette);
    const roadDefaults = roadPaletteFor(palette);

    return {
      t,
      local,
      index,
      scene,
      view,
      thumbnail,
      style,
      makeGraphics: (w, h) => this.p.createGraphics(w, h),
      road: (target, opts = {}) => drawRoad(target, t, { ...roadDefaults, ...opts }),
      rider: (target, x, opts = {}) => {
        const pose = rigPose(t + (opts.poseOffset || 0), { cadence: opts.cadence || 1 });
        drawRig(target, pose, opts.style || style, {
          x,
          y: opts.y ?? ROAD_Y,
          scale: opts.scale ?? 1.16,
          flip: opts.flip || false,
          shadow: opts.shadow !== false,
        });
      },
      grain: (target, amount = 0.05, seed = 5) => grain(target, amount, seed),
      style,
    };
  }

  nextAfter(boundary) {
    if (Math.abs(boundary - SECTIONS_START) < 1e-4) {
      return { kind: 'section', index: 0 };
    }
    if (Math.abs(boundary - OUTRO_START) < 1e-4) {
      return { kind: 'outro', index: 20 };
    }
    const index = Math.round((boundary - SECTIONS_START) / SECTION_LEN);
    return { kind: 'section', index: Math.min(19, index) };
  }

  // 20 thumbnails, rendered once at the gag bar. Used by the outro wall.
  ensureThumbs() {
    if (this.thumbs) return this.thumbs;
    const size = 256;
    this.thumbs = scenes.map((scene, index) => {
      const pg = this.p.createGraphics(size, size);
      pg.pixelDensity(1);
      pg.background(scene.palette.bg);
      const t = sectionStart(index) + 3.0;
      const local = 3.0;
      const view = makeView(pg, { cx: 500, cy: 500, zoom: 1 });
      const ctx = this.makeCtx(pg, index, t, local, view, { thumbnail: true });
      pg.push();
      applyView(pg, view);
      scene.draw(pg, ctx);
      pg.pop();
      return pg;
    });
    return this.thumbs;
  }
}
