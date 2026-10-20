// Parametric pelican + bicycle skeleton.
// One pose function feeds every era; the era only supplies its own painter.
// Units: scene units, ground at y = 0, rider faces +x.

import { TAU } from '../kit/math.js';

export const RIG = {
  wheelR: 50,
  rearHub: { x: -72, y: -50 },
  frontHub: { x: 72, y: -50 },
  crank: { x: 2, y: -54 },
  crankR: 17,
  hip: { x: -16, y: -148 },
  shoulder: { x: 18, y: -186 },
  saddle: { x: -30, y: -132 },
  headTube: { x: 52, y: -130 },
  grip: { x: 80, y: -144 },
};

function solveLeg(hip, target, l1, l2) {
  const dx = target.x - hip.x;
  const dy = target.y - hip.y;
  const d = Math.max(1e-4, Math.min(l1 + l2 - 0.001, Math.hypot(dx, dy)));
  const ux = dx / Math.hypot(dx, dy);
  const uy = dy / Math.hypot(dx, dy);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const base = { x: hip.x + ux * a, y: hip.y + uy * a };
  const k1 = { x: base.x - uy * h, y: base.y + ux * h };
  const k2 = { x: base.x + uy * h, y: base.y - ux * h };
  // Knee points forward (towards +x).
  const knee = k1.x > k2.x ? k1 : k2;
  return { knee, ankle: target };
}

export function rigPose(t, { cadence = 1 } = {}) {
  const crank = TAU * t * cadence;
  const bob = Math.sin(crank * 2) * 1.8;
  const sway = Math.sin(crank) * 1.2;

  const pedals = {
    near: {
      x: RIG.crank.x + Math.cos(crank) * RIG.crankR,
      y: RIG.crank.y + Math.sin(crank) * RIG.crankR,
    },
    far: {
      x: RIG.crank.x - Math.cos(crank) * RIG.crankR,
      y: RIG.crank.y - Math.sin(crank) * RIG.crankR,
    },
  };

  const hip = { x: RIG.hip.x + sway * 0.3, y: RIG.hip.y + bob };
  const shoulder = { x: RIG.shoulder.x + sway * 0.5, y: RIG.shoulder.y + bob * 1.2 };
  const head = {
    x: 64 + sway * 0.9 + Math.sin(crank * 2 + 0.7) * 1.2,
    y: -224 + bob * 1.5 + Math.cos(crank * 2 + 0.7) * 1.4,
  };

  const legs = {
    near: solveLeg(hip, { x: pedals.near.x, y: pedals.near.y - 4 }, 62, 58),
    far: solveLeg(hip, { x: pedals.far.x, y: pedals.far.y - 4 }, 62, 58),
  };

  // Blink roughly every 3.7 s, for 0.14 s.
  const blinkPhase = ((t + 1.1) % 3.7) / 3.7;
  const blink = Math.max(0, 1 - Math.abs(blinkPhase - 0.5) / 0.028);

  return {
    t,
    crank,
    wheelAngle: -TAU * t,
    bob,
    sway,
    blink,
    hip,
    shoulder,
    head,
    beak: {
      base: { x: head.x + 14, y: head.y + 2 },
      tip: { x: head.x + 104, y: head.y + 8 },
    },
    pouch: { x: head.x + 62, y: head.y + 34 },
    neck: [
      { x: shoulder.x + 6, y: shoulder.y - 4 },
      { x: shoulder.x + 22, y: shoulder.y - 24 },
      { x: head.x - 18, y: head.y + 12 },
      { x: head.x - 6, y: head.y + 2 },
    ],
    body: { x: -4, y: -172 + bob * 1.1, rx: 58, ry: 37, rot: -0.12 },
    tail: { x: -62, y: -176 + bob, spread: 18 },
    saddle: RIG.saddle,
    grip: { x: RIG.grip.x, y: RIG.grip.y + bob * 0.2 },
    shoulderBar: { x: 58, y: -146 },
    wheels: {
      rear: { ...RIG.rearHub, r: RIG.wheelR },
      front: { ...RIG.frontHub, r: RIG.wheelR },
    },
    crankCenter: RIG.crank,
    crankR: RIG.crankR,
    pedals,
    legs,
    frame: {
      rearHub: RIG.rearHub,
      frontHub: RIG.frontHub,
      crank: RIG.crank,
      saddle: RIG.saddle,
      headTube: RIG.headTube,
      grip: RIG.grip,
      seatCluster: { x: -30, y: -130 },
      headTop: { x: 52, y: -134 },
      stemTop: { x: 60, y: -142 },
    },
  };
}
