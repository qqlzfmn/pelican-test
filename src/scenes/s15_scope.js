// 15 — Oscilloscope vector display. A round green CRT on an inert instrument
// panel: graticule, scanlines, phosphor bloom and persistence trails, with the
// pelican/bicycle closing as a hairline vector trace. The rider is rebuilt from
// the shared rig pose, then folded into a 3:2 Lissajous knot for one beat when
// the hand at the edge turns the display knob to X-Y. Additive compositing
// throughout; the scene opens on a full green frame so 14→15 reads as one hit.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { cachedLayer, CACHE } from '../kit/cache.js';
import { clamp, lerp, noise1, rngFor, smoothstep, TAU } from '../kit/math.js';
import { rigPose, RIG } from '../rig/pose.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';

const BLACK = '#020604';
const PHOS = '#42f59e';
const BRIGHT = '#7dffbf';
const HOT = '#dcffec';

const TUBE = { x: 500, y: 476, r: 420 };
const FIG = { x: 468, y: 822, s: 1.52 };
const KNOT = { x: 500, y: 638, ax: 196, ay: 134 };
const KNOB = { x: 1062, y: 742, r: 46 };

const pal = basePalette({
  bg: BLACK, bg2: '#03100a', motif: PHOS, accent: BRIGHT,
  ink: '#0a1a10', titleInk: '#8effc4', scrim: '#000000', ground: '#020a06',
  road: '#031108', dash: '#2adf8c', body: '#3aef9c', beak: '#6dffb5',
  rigInk: '#0b2a18',
});

export default {
  id: 's15',
  number: 15,
  cn: '示波器矢量图',
  en: 'Oscilloscope Vector Display',
  year: '1950s',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const t = ctx.t;
    const local = ctx.local;
    const layer = cachedLayer(ctx, 's15-scope-static', drawStatic);

    c.save();
    c.fillStyle = BLACK;
    c.fillRect(-800, -150, 2400, 1250);

    // Whole tube image trembles a little: bright flat areas are the worst on
    // a real scope, so the beam jitter is strongest on the figure (below).
    const jx = noise1(t * 6.4, 31) * 1.1;
    const jy = noise1(t * 4.3, 77) * 0.7;
    c.save();
    c.translate(jx, jy);
    c.drawImage(layer.canvas, CACHE.x0, CACHE.y0, CACHE.w, CACHE.h);
    c.restore();

    c.save();
    clipTube(c);
    drawPhosphorField(c, t, local);
    drawGroundTrace(c, t);
    drawCalibrationTrace(c, t);
    drawFigure(c, t, local);
    drawModeReadout(c, local);
    drawScanlines(c, t, local);
    c.globalCompositeOperation = 'source-over';
    drawTubeVignette(c);
    c.restore();

    drawControlPanel(c, ctx);
    drawHandoffFlash(c, local);
    c.restore();
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawScopeTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- timing

function gagAmount(local) {
  return smoothstep(2.62, 2.8, local) * (1 - smoothstep(3.12, 3.23, local));
}

// ---------------------------------------------------------------- static CRT

function clipTube(c) {
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r - 1, 0, TAU);
  c.clip();
}

function drawStatic(pg, c) {
  c.fillStyle = BLACK;
  c.fillRect(-800, -150, 2400, 1250);

  // Green spill bleeding off the glass onto the bench.
  let gr = c.createRadialGradient(TUBE.x, TUBE.y, TUBE.r * 0.86, TUBE.x, TUBE.y, TUBE.r * 1.9);
  gr.addColorStop(0, alpha(PHOS, 0.22));
  gr.addColorStop(0.45, alpha(PHOS, 0.07));
  gr.addColorStop(1, alpha(PHOS, 0));
  c.fillStyle = gr;
  c.fillRect(-800, -150, 2400, 1250);

  // Cast shadow under the instrument.
  c.save();
  c.translate(TUBE.x, TUBE.y + TUBE.r + 64);
  c.scale(1, 0.16);
  const sg = c.createRadialGradient(0, 0, 0, 0, 0, TUBE.r * 1.2);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg;
  c.beginPath();
  c.arc(0, 0, TUBE.r * 1.2, 0, TAU);
  c.fill();
  c.restore();

  // Bezel: a heavy ring of dark moulding with two machined steps.
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r + 42, 0, TAU);
  c.fillStyle = '#070c09';
  c.fill();
  c.lineWidth = 12;
  c.strokeStyle = '#0d1711';
  c.stroke();
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r + 24, 0, TAU);
  c.lineWidth = 3;
  c.strokeStyle = '#16241b';
  c.stroke();
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r + 3, 0, TAU);
  c.lineWidth = 5;
  c.strokeStyle = '#1d2f23';
  c.stroke();

  // Glass: phosphor-black, brighter where the beam sits.
  gr = c.createRadialGradient(TUBE.x - 70, TUBE.y - 90, TUBE.r * 0.05, TUBE.x, TUBE.y, TUBE.r * 1.02);
  gr.addColorStop(0, '#0a2117');
  gr.addColorStop(0.42, '#05140d');
  gr.addColorStop(0.82, '#020b06');
  gr.addColorStop(1, '#010504');
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r, 0, TAU);
  c.fillStyle = gr;
  c.fill();

  c.save();
  clipTube(c);

  // Graticule.
  const R = TUBE.r;
  const step = 42;
  for (let i = -10; i <= 10; i += 1) {
    const x = TUBE.x + i * step;
    const major = i % 5 === 0;
    c.strokeStyle = alpha(PHOS, major ? 0.22 : 0.1);
    c.lineWidth = major ? 1.1 : 0.8;
    c.beginPath();
    c.moveTo(x, TUBE.y - R);
    c.lineTo(x, TUBE.y + R);
    c.stroke();

    const y = TUBE.y + i * step;
    c.beginPath();
    c.moveTo(TUBE.x - R, y);
    c.lineTo(TUBE.x + R, y);
    c.stroke();
  }

  // Centre axes and graduations: the fine ruling of an instrument face.
  c.strokeStyle = alpha(PHOS, 0.32);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(TUBE.x - R, TUBE.y);
  c.lineTo(TUBE.x + R, TUBE.y);
  c.moveTo(TUBE.x, TUBE.y - R);
  c.lineTo(TUBE.x, TUBE.y + R);
  c.stroke();

  c.strokeStyle = alpha(PHOS, 0.26);
  c.lineWidth = 0.9;
  for (let i = -19; i <= 19; i += 1) {
    const x = TUBE.x + i * (step / 2);
    c.beginPath();
    c.moveTo(x, TUBE.y - 4);
    c.lineTo(x, TUBE.y + 4);
    c.stroke();
    const y = TUBE.y + i * (step / 2);
    c.beginPath();
    c.moveTo(TUBE.x - 4, y);
    c.lineTo(TUBE.x + 4, y);
    c.stroke();
  }

  // Instrument printing in the corners of the grid.
  c.fillStyle = alpha(PHOS, 0.55);
  setFont(c, 11, 600, EN_FONT, '1.4px');
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText('CH 1', TUBE.x - R + 26, TUBE.y - R + 38);
  c.fillText('2 V / DIV', TUBE.x - R + 26, TUBE.y + R - 46);
  c.textAlign = 'right';
  c.fillText('P1', TUBE.x + R - 26, TUBE.y - R + 38);
  c.fillText('TRIG', TUBE.x + R - 26, TUBE.y + R - 46);
  c.textAlign = 'center';
  c.fillStyle = alpha(PHOS, 0.34);
  setFont(c, 9, 500, EN_FONT, '2px');
  c.fillText('1 mS / DIV', TUBE.x, TUBE.y + R - 46);

  // Circle ruler at the edge of the graticule.
  c.strokeStyle = alpha(PHOS, 0.18);
  c.lineWidth = 1;
  c.setLineDash([5, 9]);
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, R - 17, 0, TAU);
  c.stroke();
  c.setLineDash([]);

  // Grime, faint burn-in and a couple of curved scratches on the glass.
  const rand = rngFor(15015);
  for (let i = 0; i < 240; i += 1) {
    const a = rand() * TAU;
    const rr = Math.sqrt(rand()) * R;
    c.fillStyle = alpha(PHOS, 0.015 + rand() * 0.05);
    c.beginPath();
    c.arc(TUBE.x + Math.cos(a) * rr, TUBE.y + Math.sin(a) * rr, 0.5 + rand() * 1.3, 0, TAU);
    c.fill();
  }
  for (let i = 0; i < 5; i += 1) {
    const y0 = TUBE.y - R * 0.55 + rand() * R * 1.1;
    c.strokeStyle = `rgba(180, 230, 205, ${0.02 + rand() * 0.03})`;
    c.lineWidth = 0.8 + rand() * 1.4;
    c.beginPath();
    c.arc(TUBE.x + (rand() - 0.5) * 500, TUBE.y + (rand() - 0.5) * 500, 280 + rand() * 240, 0.1, 1.9);
    c.stroke();
  }

  // A thin sheen along the upper-left of the glass.
  c.strokeStyle = 'rgba(200, 255, 230, 0.05)';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, R * 0.86, Math.PI * 1.09, Math.PI * 1.3);
  c.stroke();
  c.restore();

  // Bright rim just inside the mask.
  c.beginPath();
  c.arc(TUBE.x, TUBE.y, TUBE.r - 4, 0, TAU);
  c.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  c.lineWidth = 8;
  c.stroke();
}

// ---------------------------------------------------------------- live glow

function drawPhosphorField(c, t, local) {
  const gag = gagAmount(local);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const gr = c.createRadialGradient(TUBE.x - 20, TUBE.y + 150, 10, TUBE.x, TUBE.y + 120, 430);
  gr.addColorStop(0, alpha(PHOS, 0.075 + gag * 0.05));
  gr.addColorStop(0.5, alpha(PHOS, 0.03));
  gr.addColorStop(1, alpha(PHOS, 0));
  c.fillStyle = gr;
  c.fillRect(TUBE.x - 460, TUBE.y - 460, 920, 920);

  // The beam's resting spot, a hot centre that pulses with the mains hum.
  const hum = 0.028 + 0.012 * (0.5 + 0.5 * Math.sin(t * TAU * 60));
  const g2 = c.createRadialGradient(TUBE.x, TUBE.y, 0, TUBE.x, TUBE.y, 220);
  g2.addColorStop(0, alpha(HOT, hum));
  g2.addColorStop(1, alpha(HOT, 0));
  c.fillStyle = g2;
  c.fillRect(TUBE.x - 260, TUBE.y - 260, 520, 520);
  c.restore();
}

function drawScanlines(c, t, local) {
  c.save();
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(0, 5, 2, 0.26)';
  const top = TUBE.y - TUBE.r;
  for (let y = top; y < TUBE.y + TUBE.r; y += 5.4) {
    c.fillRect(TUBE.x - TUBE.r, y, TUBE.r * 2, 1.8);
  }

  // Rolling refresh band, additive so it lifts the phosphor it crosses.
  c.globalCompositeOperation = 'lighter';
  const by = top + ((local * 148) % (TUBE.r * 2));
  const band = c.createLinearGradient(0, by - 60, 0, by + 60);
  band.addColorStop(0, alpha(PHOS, 0));
  band.addColorStop(0.5, alpha(PHOS, 0.045));
  band.addColorStop(1, alpha(PHOS, 0));
  c.fillStyle = band;
  c.fillRect(TUBE.x - TUBE.r, by - 60, TUBE.r * 2, 120);
  c.restore();
}

// The display's own annotation flips to X-Y when the knot appears.
function drawModeReadout(c, local) {
  const gag = gagAmount(local);
  if (gag < 0.03) return;
  const x = TUBE.x + 252;
  const y = TUBE.y - 246;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.textAlign = 'right';
  c.textBaseline = 'alphabetic';
  setFont(c, 24, 600, EN_FONT, '4px');
  c.fillStyle = alpha(HOT, 0.92 * gag);
  c.shadowColor = alpha(PHOS, 0.9);
  c.shadowBlur = 18;
  c.fillText('X-Y', x, y);
  c.shadowBlur = 0;
  setFont(c, 9, 500, EN_FONT, '2px');
  c.fillStyle = alpha(PHOS, 0.65 * gag);
  c.fillText('HORIZ MODE', x, y + 17);
  c.restore();
}

function drawTubeVignette(c) {
  const gr = c.createRadialGradient(TUBE.x, TUBE.y, TUBE.r * 0.5, TUBE.x, TUBE.y, TUBE.r * 1.01);
  gr.addColorStop(0, 'rgba(0,4,2,0)');
  gr.addColorStop(0.72, 'rgba(0,4,2,0.18)');
  gr.addColorStop(1, 'rgba(0,2,1,0.92)');
  c.fillStyle = gr;
  c.fillRect(TUBE.x - TUBE.r, TUBE.y - TUBE.r, TUBE.r * 2, TUBE.r * 2);
}

// The "road": a graticule baseline with ticks streaming under the wheels.
function drawGroundTrace(c, t) {
  const y = FIG.y;
  const R = TUBE.r;
  const off = (t * 157) % 36;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = alpha(PHOS, 0.3);
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(TUBE.x - R, y);
  c.lineTo(TUBE.x + R, y);
  c.stroke();

  c.strokeStyle = alpha(PHOS, 0.2);
  c.lineWidth = 1;
  for (let x = TUBE.x - R - off; x < TUBE.x + R; x += 36) {
    c.beginPath();
    c.moveTo(x, y + 3);
    c.lineTo(x, y + 11);
    c.stroke();
    c.beginPath();
    c.moveTo(x + 18, y - 3);
    c.lineTo(x + 18, y - 7);
    c.stroke();
  }

  // A low-amplitude signal hum riding the ground line.
  c.strokeStyle = alpha(BRIGHT, 0.16);
  c.lineWidth = 0.9;
  c.beginPath();
  for (let i = 0; i <= 120; i += 1) {
    const x = TUBE.x - R + (i / 120) * R * 2;
    const v = noise1(x * 0.02 + t * 1.6, 15) * 4;
    if (i === 0) c.moveTo(x, y + v);
    else c.lineTo(x, y + v);
  }
  c.stroke();
  c.restore();
}

// A calibration square wave near the top of the graticule: the instrument is
// not just a drawing surface, it is measuring something.
function drawCalibrationTrace(c, t) {
  const y = 274;
  const step = 62;
  const amp = 22;
  const x0 = 268;
  const x1 = 792;
  const shift = (t * 28) % step;

  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineJoin = 'miter';

  for (const pass of [{ w: 8, a: 0.09 }, { w: 1.7, a: 0.4 }]) {
    c.strokeStyle = alpha(PHOS, pass.a);
    c.lineWidth = pass.w;
    c.beginPath();
    let x = x0 - step - shift;
    c.moveTo(x, y - amp);
    let high = true;
    for (let i = 0; i < 11; i += 1) {
      const nx = x + step;
      if (i > 0) c.lineTo(x, y + (high ? -amp : amp));
      c.lineTo(nx, y + (high ? -amp : amp));
      high = !high;
      x = nx;
    }
    c.stroke();
  }

  c.fillStyle = alpha(PHOS, 0.34);
  setFont(c, 9, 500, EN_FONT, '2px');
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText('CAL · 1 kHz', x0, y + 52);
  c.fillStyle = alpha(PHOS, 0.5);
  c.fillRect(x1 - 44, y - 2, 8, 4);
  c.restore();
}

// ---------------------------------------------------------------- vector rig

function circlePts(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

function quadPts(a, b, ctl, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i += 1) {
    const k = i / n;
    const m = 1 - k;
    pts.push({
      x: m * m * a.x + 2 * m * k * ctl.x + k * k * b.x,
      y: m * m * a.y + 2 * m * k * ctl.y + k * k * b.y,
    });
  }
  return pts;
}

function curvePts(src, per = 5) {
  const pts = [];
  const p = [src[0], ...src, src[src.length - 1]];
  for (let i = 1; i < p.length - 2; i += 1) {
    for (let j = 0; j < per; j += 1) {
      const k = j / per;
      const k2 = k * k;
      const k3 = k2 * k;
      pts.push({
        x: 0.5 * ((2 * p[i].x) + (-p[i - 1].x + p[i + 1].x) * k
          + (2 * p[i - 1].x - 5 * p[i].x + 4 * p[i + 1].x - p[i + 2].x) * k2
          + (-p[i - 1].x + 3 * p[i].x - 3 * p[i + 1].x + p[i + 2].x) * k3),
        y: 0.5 * ((2 * p[i].y) + (-p[i - 1].y + p[i + 1].y) * k
          + (2 * p[i - 1].y - 5 * p[i].y + 4 * p[i + 1].y - p[i + 2].y) * k2
          + (-p[i - 1].y + 3 * p[i].y - 3 * p[i + 1].y + p[i + 2].y) * k3),
      });
    }
  }
  pts.push(src[src.length - 1]);
  return pts;
}

function closedCurvePts(src, per = 6) {
  const n = src.length;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const p0 = src[(i - 1 + n) % n];
    const p1 = src[i];
    const p2 = src[(i + 1) % n];
    const p3 = src[(i + 2) % n];
    for (let j = 0; j < per; j += 1) {
      const k = j / per;
      const k2 = k * k;
      const k3 = k2 * k;
      pts.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * k
          + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * k2
          + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * k3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * k
          + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * k2
          + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * k3),
      });
    }
  }
  return pts;
}

function legPoints(pose) {
  const hipNear = { x: -2 + pose.sway * 0.3, y: -152 + pose.bob };
  const hipFar = { x: -10 + pose.sway * 0.3, y: -150 + pose.bob };
  const ankNear = { x: pose.pedals.near.x, y: pose.pedals.near.y - 7 };
  const ankFar = { x: pose.pedals.far.x, y: pose.pedals.far.y - 7 };
  return {
    hipNear,
    hipFar,
    ankNear,
    ankFar,
    kneeNear: {
      x: (hipNear.x + ankNear.x) / 2 + 34,
      y: (hipNear.y + ankNear.y) / 2 - 5,
    },
    kneeFar: {
      x: (hipFar.x + ankFar.x) / 2 + 25,
      y: (hipFar.y + ankFar.y) / 2 - 2,
    },
  };
}

function figureSegments(pose) {
  const segs = [];
  const add = (pts, w = 2.8, closed = false) => {
    if (pts && pts.length > 1) segs.push({ pts, w, closed });
  };

  // Wheels and spokes.
  for (const key of ['rear', 'front']) {
    const wh = pose.wheels[key];
    add(circlePts(wh.x, wh.y, wh.r, 36), 3.1, true);
    add(circlePts(wh.x, wh.y, wh.r - 5, 32), 1.1, true);
    for (let i = 0; i < 6; i += 1) {
      const a = pose.wheelAngle + i * (Math.PI / 6);
      add([
        { x: wh.x + Math.cos(a) * (wh.r - 6), y: wh.y + Math.sin(a) * (wh.r - 6) },
        { x: wh.x - Math.cos(a) * (wh.r - 6), y: wh.y - Math.sin(a) * (wh.r - 6) },
      ], 0.85);
    }
  }

  const R = RIG;
  add([R.rearHub, R.saddle, R.crank, R.rearHub], 3.2, true);
  add([R.saddle, R.headTube], 3.1);
  add([R.crank, R.headTube], 3.1);
  add([R.headTube, R.frontHub], 3.1);
  add([R.headTube, pose.shoulderBar, pose.grip], 2.7);
  add([R.frontHub, pose.grip], 1.5);
  add([
    { x: R.saddle.x - 17, y: R.saddle.y + 1 },
    { x: R.saddle.x + 13, y: R.saddle.y - 3 },
  ], 3.4);
  add([R.crank, pose.pedals.near], 1.8);
  add([R.crank, pose.pedals.far], 1.2);
  add(circlePts(R.crank.x, R.crank.y, 13, 18), 1.6, true);
  add([
    { x: R.crank.x, y: R.crank.y - 13 },
    { x: R.rearHub.x, y: R.rearHub.y - 6 },
  ], 1.1);
  add([
    { x: R.crank.x, y: R.crank.y + 13 },
    { x: R.rearHub.x, y: R.rearHub.y + 6 },
  ], 1.1);

  // Legs: hand-placed in front of the frame so the pedalling reads.
  const L = legPoints(pose);
  add([L.hipFar, L.kneeFar, L.ankFar], 3.4);
  add([L.hipNear, L.kneeNear, L.ankNear], 6.2);
  add([
    { x: L.ankNear.x - 10, y: L.ankNear.y + 2 },
    { x: L.ankNear.x + 10, y: L.ankNear.y - 4 },
  ], 4.2);
  add([
    { x: L.ankFar.x - 8, y: L.ankFar.y + 2 },
    { x: L.ankFar.x + 8, y: L.ankFar.y - 3 },
  ], 2.8);

  // Body: a teardrop sitting on the saddle.
  const bx = -12 + pose.sway * 0.3;
  const by = -172 + pose.bob * 1.1;
  const bodyPts = [
    { x: bx + 30, y: by - 4 },
    { x: bx + 18, y: by - 24 },
    { x: bx - 2, y: by - 30 },
    { x: bx - 24, y: by - 26 },
    { x: bx - 42, y: by - 9 },
    { x: bx - 40, y: by + 8 },
    { x: bx - 22, y: by + 22 },
    { x: bx, y: by + 26 },
    { x: bx + 20, y: by + 14 },
  ].map((p) => ({ x: bx + (p.x - bx) * 0.86, y: by + 4 + (p.y - by) * 0.86 }));
  add(closedCurvePts(bodyPts, 6), 3.3, true);


  // Three short tail feathers.
  add([{ x: bx - 36, y: by - 8 }, { x: bx - 58, y: by - 16 }], 2.3);
  add([{ x: bx - 38, y: by - 2 }, { x: bx - 62, y: by - 7 }], 2.1);
  add([{ x: bx - 36, y: by + 4 }, { x: bx - 54, y: by + 2 }], 1.7);

  // Seated hip, then the legs below.
  add([{ x: bx - 2, y: by + 26 }, { x: RIG.saddle.x + 12, y: RIG.saddle.y - 2 }], 4.8);

  // Neck: an S from the chest to the head.
  const head = { x: pose.head.x + 4, y: pose.head.y - 26 };
  add(curvePts([
    { x: bx + 26, y: by - 20 },
    { x: 34, y: -222 },
    { x: 50, y: -238 },
    { x: head.x - 4, y: head.y + 12 },
  ], 7), 5.0);
  add(circlePts(head.x, head.y, 18, 22), 3.2, true);

  const h = head;
  add(quadPts(
    { x: h.x + 12, y: h.y + 1 },
    { x: h.x + 104, y: h.y + 10 },
    { x: h.x + 62, y: h.y - 3 },
    12,
  ), 3.5);
  add(quadPts(
    { x: h.x + 14, y: h.y + 8 },
    { x: h.x + 102, y: h.y + 15 },
    { x: h.x + 70, y: h.y + 62 },
    16,
  ), 2.9);
  add(quadPts(
    { x: h.x + 26, y: h.y + 12 },
    { x: h.x + 84, y: h.y + 18 },
    { x: h.x + 72, y: h.y + 44 },
    10,
  ), 1.2);
  // Small crest at the back of the head.
  add([
    { x: h.x - 12, y: h.y - 6 },
    { x: h.x - 22, y: h.y - 12 },
  ], 1.8);
  add([
    { x: h.x - 11, y: h.y - 1 },
    { x: h.x - 21, y: h.y - 3 },
  ], 1.4);

  // Near wing reaching forward to the bar, below the neck.
  add([
    { x: bx + 32, y: by + 2 },
    { x: 46, y: -168 },
    { x: 64, y: -154 },
    { x: pose.grip.x - 4, y: pose.grip.y - 2 },
    pose.grip,
  ], 3.2);
  add([{ x: 30, y: -178 }, { x: 44, y: -166 }], 1.5);

  let total = 1;
  for (const s of segs) {
    let len = 0;
    for (let i = 1; i < s.pts.length; i += 1) {
      len += Math.hypot(s.pts[i].x - s.pts[i - 1].x, s.pts[i].y - s.pts[i - 1].y);
    }
    if (s.closed) {
      const a = s.pts[0];
      const b = s.pts[s.pts.length - 1];
      len += Math.hypot(a.x - b.x, a.y - b.y);
    }
    s.len = len;
    total += len;
  }
  return { segs, total };
}

function knotPoint(u, t, phase) {
  const th = u * TAU + 0.3 * Math.sin(t * 1.9) + phase;
  return {
    x: KNOT.x + Math.sin(th * 3 + 0.6) * KNOT.ax,
    y: KNOT.y + Math.sin(th * 2 + 0.1) * KNOT.ay,
  };
}

function scopePoint(p, ox = 0, oy = 0) {
  return { x: FIG.x + p.x * FIG.s + ox, y: FIG.y + p.y * FIG.s + oy };
}

function drawSegs(c, geo, { morph = 0, knotPhase = 0, alphaBase = 1, core = true, ox = 0, oy = 0, t = 0 } = {}) {
  const { segs, total } = geo;
  const passes = core
    ? [
      { w: 30, a: 0.022 },
      { w: 13, a: 0.055 },
      { w: 5, a: 0.16 },
      { w: 1.9, a: 0.95 },
    ]
    : [
      { w: 18, a: 0.07 },
      { w: 7, a: 0.14 },
      { w: 3.4, a: 0.34 },
    ];

  const mapped = [];
  let run = 0;
  for (const s of segs) {
    const pts = [];
    const u0 = run / total;
    const u1 = (run + s.len) / total;
    if (morph > 0.3) {
      // Resample in knot parameter space: sparse frame segments would
      // otherwise cut straight chords across the Lissajous loops.
      const steps = Math.max(3, Math.min(60, Math.ceil((u1 - u0) * 190)));
      const a = scopePoint(s.pts[0], ox, oy);
      const b = scopePoint(s.pts[s.pts.length - 1], ox, oy);
      for (let j = 0; j <= steps; j += 1) {
        const k = j / steps;
        const uu = u0 + (u1 - u0) * k;
        const kp = knotPoint(uu - Math.floor(uu), t, knotPhase);
        pts.push({
          x: lerp(lerp(a.x, b.x, k), kp.x, morph),
          y: lerp(lerp(a.y, b.y, k), kp.y, morph),
        });
      }
    } else {
      for (let i = 0; i < s.pts.length; i += 1) {
        const sp = scopePoint(s.pts[i], ox, oy);
        pts.push(sp);
      }
    }
    mapped.push(pts);
    run += s.len;
  }

  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const pass of passes) {
    for (let si = 0; si < segs.length; si += 1) {
      const s = segs[si];
      const pts = mapped[si];
      c.strokeStyle = alpha(PHOS, Math.min(1, pass.a * alphaBase));
      c.lineWidth = pass.w * (s.w / 3) * FIG.s;
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
      if (s.closed) c.closePath();
      c.stroke();
    }
  }
  c.restore();
}

function drawKnotCurve(c, gag, t) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  const phases = [0, 0.02, 0.045];
  for (let pi = 0; pi < phases.length; pi += 1) {
    const a = (pi === 0 ? 0.9 : 0.28) * gag;
    const pts = [];
    for (let i = 0; i <= 240; i += 1) pts.push(knotPoint(i / 240, t, phases[pi]));
    for (const pass of [{ w: 22, a: 0.05 }, { w: 8, a: 0.16 }, { w: 2.6, a: 0.95 }]) {
      c.strokeStyle = alpha(pi === 0 ? BRIGHT : PHOS, pass.a * a);
      c.lineWidth = pass.w;
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
      c.stroke();
    }
  }
  c.restore();
}

function jointDots(c, pose, a) {
  if (a <= 0.01) return;
  const head = { x: pose.head.x + 4, y: pose.head.y - 26 };
  const pts = [
    { x: head.x + 10, y: head.y - 7 },
    RIG.rearHub, RIG.frontHub, RIG.crank, RIG.saddle, pose.grip,
    legPoints(pose).kneeNear, legPoints(pose).kneeFar,
    { x: pose.pedals.near.x, y: pose.pedals.near.y },
    { x: pose.pedals.far.x, y: pose.pedals.far.y },
  ];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const sp = scopePoint(p);
    c.fillStyle = alpha(PHOS, 0.16 * a);
    c.beginPath();
    c.arc(sp.x, sp.y, 7, 0, TAU);
    c.fill();
    c.fillStyle = alpha(HOT, 0.9 * a);
    c.beginPath();
    c.arc(sp.x, sp.y, 2.2, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawFigure(c, t, local) {
  const gag = gagAmount(local);
  const jx = noise1(t * 9.1, 55) * 1.4 + gag * 2.2 * noise1(t * 26, 9);
  const jy = noise1(t * 7.7, 91) * 0.9 + gag * 1.4 * noise1(t * 21, 12);

  c.save();
  c.translate(jx, jy);

  // Persistence: older beam positions held briefly by the phosphor.
  for (let k = 4; k >= 1; k -= 1) {
    const older = rigPose(t - k * 0.055);
    const geo = figureSegments(older);
    drawSegs(c, geo, {
      morph: gag,
      knotPhase: -k * 0.05,
      alphaBase: 0.55 / (k + 0.35),
      core: false,
      ox: -k * 3.2,
      oy: k * 1.1,
      t,
    });
  }

  if (gag > 0.02) drawKnotCurve(c, gag, t);

  const pose = rigPose(t);
  drawSegs(c, figureSegments(pose), { morph: gag, alphaBase: 1, core: true, t });
  jointDots(c, pose, (1 - gag * 0.85) * clamp(0.5 + local * 0.5));
  c.restore();
}

// ---------------------------------------------------------------- controls

function drawControlPanel(c, ctx) {
  const local = ctx.local;
  const gag = gagAmount(local);
  const handIn = smoothstep(0.8, 1.3, local);

  c.save();

  // Panel plate.
  rr(c, 952, 632, 236, 318, 8);
  c.fillStyle = '#050906';
  c.fill();
  c.strokeStyle = alpha('#24382b', 0.9);
  c.lineWidth = 1.6;
  c.stroke();

  // Panel screws.
  for (const [sx, sy] of [[966, 646], [1174, 646], [966, 936], [1174, 936]]) {
    c.fillStyle = '#0d1510';
    c.beginPath();
    c.arc(sx, sy, 3.4, 0, TAU);
    c.fill();
  }

  setFont(c, 12, 600, EN_FONT, '2px');
  c.fillStyle = alpha(PHOS, 0.5);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillText('HORIZ DISPLAY', 972, 674);

  // Scale ticks all round the knob: TIME left, X-Y right.
  c.strokeStyle = alpha(PHOS, 0.38);
  c.lineWidth = 1;
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * TAU;
    const r0 = KNOB.r + 12;
    const r1 = KNOB.r + (i % 4 === 0 ? 21 : 17);
    c.beginPath();
    c.moveTo(KNOB.x + Math.cos(a) * r0, KNOB.y + Math.sin(a) * r0);
    c.lineTo(KNOB.x + Math.cos(a) * r1, KNOB.y + Math.sin(a) * r1);
    c.stroke();
  }
  setFont(c, 9, 600, EN_FONT, '1px');
  c.fillStyle = alpha(PHOS, 0.42);
  c.textAlign = 'center';
  c.fillText('TIME', KNOB.x - 82, KNOB.y + 64);

  // Amplitude readout, blinking with the sweep.
  setFont(c, 10, 500, EN_FONT, '1px');
  c.fillStyle = alpha(PHOS, 0.4);
  c.textAlign = 'left';
  c.fillText('GAIN  2.0 V/DIV', 972, 916);

  // Lamp.
  c.globalCompositeOperation = 'lighter';
  const lamp = 0.5 + 0.3 * Math.sin(ctx.t * 3.1);
  c.fillStyle = alpha(PHOS, 0.55 * lamp);
  c.beginPath();
  c.arc(1160, 675, 7, 0, TAU);
  c.fill();
  c.fillStyle = alpha(PHOS, 0.14 * lamp);
  c.beginPath();
  c.arc(1160, 675, 15, 0, TAU);
  c.fill();
  c.globalCompositeOperation = 'source-over';

  // Knob body.
  const base = -2.5 + 0.06 * Math.sin(ctx.t * 1.3);
  const angle = base + gag * 2.35;

  c.beginPath();
  c.arc(KNOB.x, KNOB.y, KNOB.r + 5, 0, TAU);
  c.fillStyle = '#020604';
  c.fill();
  c.beginPath();
  c.arc(KNOB.x, KNOB.y, KNOB.r, 0, TAU);
  c.fillStyle = '#0a120d';
  c.fill();
  c.strokeStyle = '#1e2e24';
  c.lineWidth = 2.4;
  c.stroke();
  c.beginPath();
  c.arc(KNOB.x, KNOB.y, KNOB.r - 9, 0, TAU);
  c.strokeStyle = '#162018';
  c.lineWidth = 2;
  c.stroke();

  // Knurling.
  c.save();
  c.translate(KNOB.x, KNOB.y);
  c.rotate(angle);
  c.strokeStyle = 'rgba(70, 90, 78, 0.5)';
  c.lineWidth = 1;
  for (let i = 0; i < 24; i += 1) {
    const a = (i / 24) * TAU;
    c.beginPath();
    c.moveTo(Math.cos(a) * (KNOB.r - 8), Math.sin(a) * (KNOB.r - 8));
    c.lineTo(Math.cos(a) * (KNOB.r - 2), Math.sin(a) * (KNOB.r - 2));
    c.stroke();
  }
  // Pointer.
  c.strokeStyle = '#9db9a8';
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(KNOB.r - 10, 0);
  c.stroke();
  c.restore();

  c.beginPath();
  c.arc(KNOB.x, KNOB.y, 7, 0, TAU);
  c.fillStyle = '#060b08';
  c.fill();
  c.strokeStyle = '#26382c';
  c.lineWidth = 1.4;
  c.stroke();

  // Green light catching the knob and panel edge.
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = alpha(PHOS, 0.2);
  c.lineWidth = 2;
  c.beginPath();
  c.arc(KNOB.x, KNOB.y, KNOB.r - 3, 2.4, 4.4);
  c.stroke();
  c.restore();

  // The hand: a dark silhouette with a thin green rim from the tube.
  drawHand(c, ctx, handIn, gag);
}

function drawHand(c, ctx, handIn, gag) {
  const off = (1 - handIn) * 340;
  const breath = Math.sin(ctx.t * 1.1) * 1.6;
  const shake = gag > 0.35 ? Math.sin(ctx.t * 52) * 2.2 * gag : 0;

  c.save();
  c.translate(KNOB.x + 18 + shake, KNOB.y + 8 + off + breath);
  c.rotate(-0.04 + Math.sin(ctx.t * 0.8 + 1) * 0.01 + gag * 0.42);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const skin = '#17271e';
  const rim = 0.34;

  const paint = (build, w) => {
    build();
    c.strokeStyle = alpha(PHOS, rim);
    c.lineWidth = w + 5;
    c.stroke();
    build();
    c.strokeStyle = skin;
    c.lineWidth = w;
    c.stroke();
  };

  // Forearm from the lower-right corner of the frame.
  paint(() => {
    c.beginPath();
    c.moveTo(384, 404);
    c.lineTo(162, 128);
  }, 66);

  // Shirt cuff.
  c.save();
  c.translate(326, 344);
  c.rotate(-0.72);
  c.fillStyle = '#18261d';
  c.fillRect(-46, -68, 92, 136);
  c.strokeStyle = 'rgba(66, 245, 158, 0.26)';
  c.lineWidth = 2;
  c.strokeRect(-46, -68, 92, 136);
  c.fillStyle = 'rgba(0, 0, 0, 0.42)';
  c.fillRect(-46, -18, 92, 9);
  c.restore();

  // Palm, just to the right of the knob.
  c.beginPath();
  c.ellipse(122, 96, 47, 41, -0.5, 0, TAU);
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = alpha(PHOS, rim);
  c.lineWidth = 3;
  c.stroke();

  // Tube-facing green kiss along the palm edge.
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = alpha(PHOS, 0.06);
  c.beginPath();
  c.ellipse(110, 66, 34, 22, -0.5, 0, TAU);
  c.fill();
  c.restore();

  // Fingers wrapping the right rim of the dial. Tips land at radius 44.
  const fingers = [
    { s: [96, 58], e: [24, -37], w: 22, b: 16 },
    { s: [102, 74], e: [40, -20], w: 23, b: 14 },
    { s: [100, 92], e: [44, 4], w: 23, b: 12 },
    { s: [92, 108], e: [35, 26], w: 20, b: 12 },
  ];

  for (const f of fingers) {
    const mx = (f.s[0] + f.e[0]) / 2;
    const my = (f.s[1] + f.e[1]) / 2;
    const d = Math.hypot(mx, my) || 1;
    const cx = mx + (mx / d) * f.b;
    const cy = my + (my / d) * f.b;
    paint(() => {
      c.beginPath();
      c.moveTo(f.s[0], f.s[1]);
      c.quadraticCurveTo(cx, cy, f.e[0], f.e[1]);
    }, f.w);
  }

  // Thumb below, pinching the near rim.
  paint(() => {
    c.beginPath();
    c.moveTo(112, 132);
    c.quadraticCurveTo(48, 116, 4, 52);
  }, 28);

  // Creases across the palm.
  c.strokeStyle = 'rgba(2, 6, 4, 0.75)';
  c.lineWidth = 3;
  for (let i = 0; i < 2; i += 1) {
    const y = 92 + i * 16;
    c.beginPath();
    c.moveTo(150 - i * 6, y);
    c.quadraticCurveTo(128 - i * 4, y + 6, 110 - i * 4, y + 9);
    c.stroke();
  }

  // Fingernails: the fastest way for a silhouette to read as a hand.
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = alpha(HOT, 0.24);
  c.lineWidth = 2;
  for (const f of fingers) {
    c.beginPath();
    c.arc(f.e[0] + 5, f.e[1] - 2, 5, 3.3, 4.9);
    c.stroke();
  }
  c.restore();

  c.restore();
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ---------------------------------------------------------------- hand-off

function drawHandoffFlash(c, local) {
  const flash = Math.pow(Math.max(0, 1 - local / 0.62), 2.1);
  if (flash <= 0.002) return;
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = alpha('#59ffb0', 0.62 * flash);
  c.fillRect(-800, -150, 2400, 1250);
  const gr = c.createRadialGradient(TUBE.x, TUBE.y, 0, TUBE.x, TUBE.y, TUBE.r * 1.1);
  gr.addColorStop(0, alpha('#d8ffe9', 0.5 * flash));
  gr.addColorStop(0.6, alpha('#59ffb0', 0.18 * flash));
  gr.addColorStop(1, alpha('#59ffb0', 0));
  c.fillStyle = gr;
  c.fillRect(-800, -150, 2400, 1250);
  c.restore();
}

// ---------------------------------------------------------------- title

function drawScopeTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;
  const x = 78 * s;
  const w = 566 * s;
  const h = 124 * s;
  const y = H - 96 * s - h + lift * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, 0);

  // Instrument-label plate: dark bezel, thin phosphor rule.
  rr(c, x, y, w, h, 7 * s);
  c.fillStyle = 'rgba(2, 8, 5, 0.88)';
  c.fill();
  c.strokeStyle = alpha(PHOS, 0.5);
  c.lineWidth = 1.4 * s;
  c.stroke();

  // Corner ticks, like a screen-printed panel.
  c.strokeStyle = alpha(PHOS, 0.65);
  c.lineWidth = 1.6 * s;
  const tick = 9 * s;
  for (const [px, py, dx, dy] of [
    [x + 10 * s, y + 10 * s, 1, 1],
    [x + w - 10 * s, y + 10 * s, -1, 1],
    [x + 10 * s, y + h - 10 * s, 1, -1],
    [x + w - 10 * s, y + h - 10 * s, -1, -1],
  ]) {
    c.beginPath();
    c.moveTo(px, py + dy * tick);
    c.lineTo(px, py);
    c.lineTo(px + dx * tick, py);
    c.stroke();
  }

  // Faint scanlines inside the plate.
  c.fillStyle = 'rgba(66, 245, 158, 0.05)';
  for (let yy = y + 2 * s; yy < y + h; yy += 4 * s) c.fillRect(x + 2 * s, yy, w - 4 * s, 1 * s);

  const tx = x + 22 * s;
  setFont(c, 11.5 * s, 600, EN_FONT, '2.6px');
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = alpha(PHOS, 0.85);
  c.fillText('INSTRUMENT 15 / 20', tx, y + 25 * s);
  c.textAlign = 'right';
  c.fillStyle = alpha(PHOS, 0.55);
  c.fillText('TYPE 304-A · P1', x + w - 22 * s, y + 25 * s);

  c.textAlign = 'left';
  setFont(c, 40 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#8effc4';
  c.shadowColor = alpha(PHOS, 0.45);
  c.shadowBlur = 12 * s;
  c.fillText('示波器矢量图', tx, y + 70 * s);
  c.shadowBlur = 0;

  setFont(c, 14.5 * s, 600, EN_FONT, '3.2px');
  c.fillStyle = alpha(BRIGHT, 0.92);
  c.fillText('OSCILLOSCOPE VECTOR DISPLAY', tx, y + 94 * s);

  setFont(c, 11 * s, 400, CN_FONT, '1px');
  c.fillStyle = alpha(PHOS, 0.6);
  c.fillText('1950s · 阴极射线管 · 3:2 李萨如', tx, y + 113 * s);

  // A small live sine trace and a blinking cursor in the plate header.
  c.strokeStyle = alpha(PHOS, 0.55);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const px = x + w - 176 * s + (i / 60) * 120 * s;
    const py = y + 58 * s + Math.sin(i * 0.42) * 9 * s;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();
  c.restore();
}
