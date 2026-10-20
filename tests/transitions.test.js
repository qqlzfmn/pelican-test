import test from 'node:test';
import assert from 'node:assert/strict';
import { apertureAt, transitionAmount } from '../src/main/transitions.js';

const W = 1920;
const H = 1080;

test('aperture starts as a small frame over the rider and ends full-screen', () => {
  const a = apertureAt(W, H, 0);
  assert.ok(a.w < W * 0.1);
  assert.ok(a.h < H * 0.1);
  assert.ok(a.x < W / 2 && a.y < H);
  const b = apertureAt(W, H, 1);
  assert.ok(Math.abs(b.w - W) < 1e-6);
  assert.ok(Math.abs(b.h - H) < 1e-6);
  assert.ok(Math.abs(b.x) < 1e-6);
  assert.ok(Math.abs(b.y) < 1e-6);
});

test('aperture grows monotonically and always contains its own centre', () => {
  let last = -1;
  for (let k = 0; k <= 1; k += 0.05) {
    const r = apertureAt(W, H, k);
    assert.ok(r.w > last);
    last = r.w;
    assert.ok(r.w > 0 && r.h > 0);
  }
});

test('transition is zero outside the window and one at the cut', () => {
  assert.equal(transitionAmount(4.0, 5, 0.28), 0);
  assert.equal(transitionAmount(5.0, 5, 0.28), 0);
  assert.ok(transitionAmount(4.9, 5, 0.28) > 0.5);
  assert.equal(transitionAmount(4.71, 5, 0.28), 0);
});
