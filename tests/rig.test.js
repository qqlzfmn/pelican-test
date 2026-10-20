import test from 'node:test';
import assert from 'node:assert/strict';
import { rigPose, RIG } from '../src/rig/pose.js';

const finite = (v, path = 'pose') => {
  if (typeof v === 'number') {
    assert.ok(Number.isFinite(v), `${path} is not finite`);
  } else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) finite(x, `${path}.${k}`);
  }
};

test('pose is finite over the film', () => {
  for (let t = 0; t <= 137; t += 3.7) finite(rigPose(t));
});

test('crank completes one revolution per second and pedals stay opposite', () => {
  const a = rigPose(0);
  const b = rigPose(1);
  assert.ok(Math.abs(b.crank - a.crank - Math.PI * 2) < 1e-9);
  const dx = b.pedals.near.x - b.crankCenter.x;
  const dy = b.pedals.near.y - b.crankCenter.y;
  const fx = b.pedals.far.x - b.crankCenter.x;
  const fy = b.pedals.far.y - b.crankCenter.y;
  assert.ok(Math.abs(dx + fx) < 1e-9);
  assert.ok(Math.abs(dy + fy) < 1e-9);
  assert.ok(Math.abs(Math.hypot(dx, dy) - RIG.crankR) < 1e-9);
});

test('leg IK keeps thigh and shin at their rest lengths', () => {
  for (let t = 0; t < 12; t += 0.37) {
    const p = rigPose(t);
    for (const side of ['near', 'far']) {
      const hip = p.hip;
      const { knee, ankle } = p.legs[side];
      assert.ok(Math.abs(Math.hypot(knee.x - hip.x, knee.y - hip.y) - 62) < 1e-6);
      assert.ok(Math.abs(Math.hypot(ankle.x - knee.x, ankle.y - knee.y) - 58) < 1e-6);
    }
  }
});

test('pose is continuous across a frame step and a scene cut', () => {
  const step = rigPose(20)['head'];
  const next = rigPose(20 + 1 / 60)['head'];
  assert.ok(Math.hypot(next.x - step.x, next.y - step.y) < 2);
  const cutA = rigPose(10.999);
  const cutB = rigPose(11.001);
  assert.ok(Math.hypot(cutB.crank - cutA.crank, 0) < 0.02);
});

test('wheels roll in the direction of travel', () => {
  assert.ok(rigPose(0).wheelAngle === 0);
  assert.ok(rigPose(0.25).wheelAngle < -1.5);
});
