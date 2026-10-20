// Paints a pose. Styles can override colors and turn outlines off;
// silhouette mode is used by the shadow-play and outro.

import { alpha, mix, shade } from '../kit/color.js';
import { TAU } from '../kit/math.js';

export function neutralStyle(palette = {}) {
  return {
    ink: palette.ink || '#2b2620',
    body: palette.body || '#f4eddf',
    bodyShade: palette.bodyShade || '#ded2bd',
    wing: palette.wing || '#e6dac5',
    beak: palette.beak || '#d98a34',
    pouch: palette.pouch || '#e8a95a',
    leg: palette.leg || '#d98a34',
    eye: '#17130f',
    eyeWhite: '#fffdf7',
    tire: '#221f1c',
    rim: '#8b8274',
    metal: '#9a9387',
    saddle: '#4a392c',
    chain: '#5b554c',
    outline: true,
    weight: 1,
    farAlpha: 0.55,
    shadow: 0.22,
  };
}

export function silhouetteStyle(color = '#141312') {
  const s = neutralStyle();
  Object.assign(s, {
    ink: color,
    body: color,
    bodyShade: color,
    wing: color,
    beak: color,
    pouch: color,
    leg: color,
    eye: color,
    eyeWhite: color,
    tire: color,
    rim: color,
    metal: color,
    saddle: color,
    chain: color,
    outline: false,
    weight: 1,
    farAlpha: 1,
    shadow: 0.3,
  });
  return s;
}

function line(c, pts, color, w) {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.stroke();
}

function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
}

function limb(c, a, b, w, color, ink, outline, weight) {
  if (outline) line(c, [a, b], ink, (w + 3.4) * weight);
  line(c, [a, b], color, w * weight);
}

function drawWheel(c, wheel, angle, s) {
  c.save();
  c.translate(wheel.x, wheel.y);

  // Tire.
  c.strokeStyle = s.tire;
  c.lineWidth = 7.5 * s.weight;
  c.beginPath();
  c.arc(0, 0, wheel.r, 0, TAU);
  c.stroke();

  // Rim.
  c.strokeStyle = s.rim;
  c.lineWidth = 1.9 * s.weight;
  c.beginPath();
  c.arc(0, 0, wheel.r - 4.6, 0, TAU);
  c.stroke();

  // Spokes.
  c.strokeStyle = alpha(s.rim, 0.85);
  c.lineWidth = 1.1 * s.weight;
  for (let i = 0; i < 12; i += 1) {
    const a = angle + (i / 12) * TAU;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * (wheel.r - 5), Math.sin(a) * (wheel.r - 5));
    c.stroke();
  }

  // Valve dot: makes the wheel rotation legible.
  c.fillStyle = s.metal;
  c.beginPath();
  c.arc(Math.cos(angle) * (wheel.r - 9), Math.sin(angle) * (wheel.r - 9), 2, 0, TAU);
  c.fill();

  // Hub.
  c.fillStyle = s.metal;
  c.beginPath();
  c.arc(0, 0, 4, 0, TAU);
  c.fill();
  c.restore();
}

function drawLeg(c, leg, s, near) {
  const color = near ? s.leg : mix(s.leg, s.ink, 0.45);
  const ink = near ? s.ink : mix(s.ink, s.body, 0.25);
  limb(c, leg.hip || leg.ankle, leg.knee, 8, color, ink, s.outline, s.weight);
  limb(c, leg.knee, leg.ankle, 6.5, color, ink, s.outline, s.weight);
  // Webbed foot.
  c.save();
  c.translate(leg.ankle.x, leg.ankle.y);
  c.fillStyle = color;
  c.strokeStyle = ink;
  c.lineWidth = 2 * s.weight;
  poly(c, [
    { x: -3, y: -2 },
    { x: 12, y: -1 },
    { x: 4, y: 7 },
  ]);
  c.fill();
  if (s.outline) c.stroke();
  c.restore();
}

export function drawRig(g, pose, style, { x = 0, y = 0, scale = 1, flip = false, shadow = true } = {}) {
  const c = g.drawingContext;
  const s = style;
  c.save();
  c.translate(x, y);
  c.scale(scale * (flip ? -1 : 1), scale);

  if (shadow) {
    const gr = c.createRadialGradient(0, 3, 4, 0, 3, 150);
    gr.addColorStop(0, alpha('#1c1712', s.shadow));
    gr.addColorStop(1, alpha('#1c1712', 0));
    c.fillStyle = gr;
    c.save();
    c.scale(1, 0.16);
    c.beginPath();
    c.arc(0, 20, 150, 0, TAU);
    c.fill();
    c.restore();
  }

  // Far crank + pedal + leg.
  const farLeg = {
    knee: pose.legs.far.knee,
    ankle: pose.legs.far.ankle,
    hip: pose.hip,
  };
  c.save();
  c.globalAlpha = s.farAlpha;
  line(c, [pose.crankCenter, pose.pedals.far], s.metal, 3 * s.weight);
  c.fillStyle = s.saddle;
  c.fillRect(pose.pedals.far.x - 7, pose.pedals.far.y - 2, 14, 3.5);
  drawLeg(c, farLeg, s, false);
  c.restore();

  // Wheels.
  drawWheel(c, pose.wheels.rear, pose.wheelAngle, s);
  drawWheel(c, pose.wheels.front, pose.wheelAngle, s);

  // Chain.
  c.strokeStyle = alpha(s.chain, 0.8);
  c.lineWidth = 1.2 * s.weight;
  c.beginPath();
  c.moveTo(pose.frame.crank.x, pose.frame.crank.y - 19);
  c.lineTo(pose.frame.rearHub.x, pose.frame.rearHub.y - 9);
  c.moveTo(pose.frame.crank.x, pose.frame.crank.y + 19);
  c.lineTo(pose.frame.rearHub.x, pose.frame.rearHub.y + 9);
  c.stroke();

  // Frame tubes.
  const f = pose.frame;
  const tubes = [
    [f.rearHub, f.crank],
    [f.crank, f.seatCluster],
    [f.seatCluster, f.rearHub],
    [f.crank, f.headTop],
    [f.seatCluster, f.headTop],
    [f.headTop, f.frontHub],
    [f.seatCluster, { x: f.saddle.x, y: f.saddle.y - 2 }],
    [f.headTop, f.stemTop],
  ];
  for (const [a, b] of tubes) {
    if (s.outline) line(c, [a, b], s.ink, 8.2 * s.weight);
    line(c, [a, b], s.rim, 4.6 * s.weight);
  }

  // Handlebar.
  const bar = [
    f.stemTop,
    { x: 64, y: -146 },
    { x: 76, y: -148 },
    { x: pose.grip.x, y: pose.grip.y },
  ];
  if (s.outline) line(c, bar, s.ink, 7.5 * s.weight);
  line(c, bar, s.rim, 4.2 * s.weight);

  // Saddle.
  c.fillStyle = s.saddle;
  c.strokeStyle = s.ink;
  c.lineWidth = 2.4 * s.weight;
  c.beginPath();
  c.ellipse(f.saddle.x - 4, f.saddle.y - 1, 21, 6.5, -0.05, 0, TAU);
  c.fill();
  if (s.outline) c.stroke();

  // Chainring + near crank + pedal.
  c.fillStyle = alpha(s.rim, 0.28);
  c.strokeStyle = s.rim;
  c.lineWidth = 2.4 * s.weight;
  c.beginPath();
  c.arc(f.crank.x, f.crank.y, 19, 0, TAU);
  c.fill();
  c.stroke();
  line(c, [pose.crankCenter, pose.pedals.near], s.metal, 3.4 * s.weight);
  c.fillStyle = s.saddle;
  c.fillRect(pose.pedals.near.x - 8, pose.pedals.near.y - 2, 15, 4);

  // Near leg.
  drawLeg(c, { ...pose.legs.near, hip: pose.hip }, s, true);

  // Tail.
  const tail = pose.tail;
  const tailPts = [
    { x: tail.x + 14, y: tail.y - 14 },
    { x: tail.x - 24, y: tail.y - 26 },
    { x: tail.x - 34, y: tail.y - 10 },
    { x: tail.x - 40, y: tail.y + 8 },
    { x: tail.x - 18, y: tail.y + 10 },
    { x: tail.x + 12, y: tail.y + 12 },
  ];
  c.fillStyle = s.bodyShade;
  c.strokeStyle = s.ink;
  c.lineWidth = 2.8 * s.weight;
  poly(c, tailPts);
  c.fill();
  if (s.outline) c.stroke();
  for (let i = 0; i < 3; i += 1) {
    line(
      c,
      [
        { x: tail.x + 2, y: tail.y - 4 + i * 6 },
        { x: tail.x - 22, y: tail.y - 18 + i * 9 },
      ],
      alpha(s.ink, 0.5),
      1.2 * s.weight,
    );
  }

  // Body.
  const b = pose.body;
  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  c.fillStyle = s.body;
  c.strokeStyle = s.ink;
  c.lineWidth = 3.2 * s.weight;
  c.beginPath();
  c.ellipse(0, 0, b.rx, b.ry, 0, 0, TAU);
  c.fill();
  if (s.outline) c.stroke();
  // Belly shade.
  c.fillStyle = alpha(s.bodyShade, 0.75);
  c.beginPath();
  c.ellipse(2, 10, b.rx * 0.78, b.ry * 0.55, 0.06, 0, TAU);
  c.fill();
  c.restore();

  // Neck: thick under-stroke + body fill.
  const neckPts = pose.neck;
  if (s.outline) {
    c.strokeStyle = s.ink;
    c.lineWidth = 24 * s.weight;
    c.beginPath();
    c.moveTo(neckPts[0].x, neckPts[0].y);
    c.bezierCurveTo(
      neckPts[1].x, neckPts[1].y,
      neckPts[2].x, neckPts[2].y,
      neckPts[3].x, neckPts[3].y,
    );
    c.stroke();
  }
  c.strokeStyle = s.body;
  c.lineWidth = 18 * s.weight;
  c.beginPath();
  c.moveTo(neckPts[0].x, neckPts[0].y);
  c.bezierCurveTo(
    neckPts[1].x, neckPts[1].y,
    neckPts[2].x, neckPts[2].y,
    neckPts[3].x, neckPts[3].y,
  );
  c.stroke();

  // Near wing: an arm to the bar, with a small feather fan at the wrist.
  const sh = pose.shoulder;
  const gr = pose.grip;
  const wingPath = () => {
    c.beginPath();
    c.moveTo(sh.x - 8, sh.y + 10);
    c.quadraticCurveTo(42, -172, gr.x - 2, gr.y - 4);
  };
  if (s.outline) {
    c.strokeStyle = s.ink;
    c.lineWidth = 21 * s.weight;
    wingPath();
    c.stroke();
  }
  c.strokeStyle = s.wing;
  c.lineWidth = 15 * s.weight;
  wingPath();
  c.stroke();

  // Wrist feathers.
  for (let i = 0; i < 4; i += 1) {
    const fx = gr.x - 4 + i * 2;
    const fy = gr.y + 2 + i * 2;
    c.strokeStyle = i === 0 ? s.ink : s.wing;
    c.lineWidth = (i === 0 ? 2.4 : 3.4) * s.weight;
    c.beginPath();
    c.moveTo(fx, fy);
    c.lineTo(fx - 10 - i * 2, fy + 8 + i * 2);
    c.stroke();
  }
  line(
    c,
    [
      { x: sh.x + 4, y: sh.y + 8 },
      { x: 48, y: -164 },
    ],
    alpha(s.ink, 0.4),
    1.3 * s.weight,
  );

  // Head.
  const h = pose.head;
  c.fillStyle = s.body;
  c.strokeStyle = s.ink;
  c.lineWidth = 3 * s.weight;
  c.beginPath();
  c.arc(h.x, h.y, 19, 0, TAU);
  c.fill();
  if (s.outline) c.stroke();

  // Crest.
  for (let i = 0; i < 3; i += 1) {
    const a = -2.5 + i * 0.18;
    line(
      c,
      [
        { x: h.x + Math.cos(a) * 15, y: h.y + Math.sin(a) * 15 },
        { x: h.x + Math.cos(a) * 27 - 4, y: h.y + Math.sin(a) * 27 - 4 },
      ],
      s.bodyShade,
      3.2 * s.weight,
    );
  }

  // Beak: upper mandible + pouch.
  const bb = pose.beak.base;
  const bt = pose.beak.tip;
  const pg = pose.pouch;
  c.fillStyle = s.beak;
  c.strokeStyle = s.ink;
  c.lineWidth = 2.6 * s.weight;
  c.beginPath();
  c.moveTo(bb.x - 2, bb.y - 6);
  c.quadraticCurveTo(bb.x + 34, bb.y - 8, bt.x, bt.y - 3);
  c.quadraticCurveTo(bb.x + 52, bb.y + 2, bb.x - 2, bb.y + 2);
  c.closePath();
  c.fill();
  if (s.outline) c.stroke();

  c.fillStyle = s.pouch;
  c.beginPath();
  c.moveTo(bb.x + 2, bb.y + 2);
  c.quadraticCurveTo(bb.x + 54, bb.y + 8, bt.x - 16, bt.y + 2);
  c.quadraticCurveTo(pg.x - 10, pg.y + 12, bb.x + 8, bb.y + 18);
  c.quadraticCurveTo(bb.x - 2, bb.y + 10, bb.x + 2, bb.y + 2);
  c.closePath();
  c.fill();
  if (s.outline) c.stroke();

  // Beak ridge.
  line(c, [
    { x: bb.x + 4, y: bb.y - 1 },
    { x: bt.x - 4, y: bt.y + 1 },
  ], alpha(s.ink, 0.55), 1.2 * s.weight);

  // Eye / blink.
  if (s.eyeWhite !== s.ink) {
    c.fillStyle = s.eyeWhite;
    c.beginPath();
    c.arc(h.x + 7, h.y - 5, 5.2, 0, TAU);
    c.fill();
    const open = 1 - pose.blink;
    c.fillStyle = s.eye;
    c.beginPath();
    c.ellipse(h.x + 8.4, h.y - 5, 2.8, 2.8 * open, 0, 0, TAU);
    c.fill();
    c.strokeStyle = alpha(s.ink, 0.7);
    c.lineWidth = 1.1 * s.weight;
    c.beginPath();
    c.arc(h.x + 7, h.y - 5, 5.2, -2.7, -0.5);
    c.stroke();
  }

  c.restore();
}
