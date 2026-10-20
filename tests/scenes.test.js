import test from 'node:test';
import assert from 'node:assert/strict';
import scenes from '../src/scenes/index.js';
import { SECTION_COUNT, sectionStart } from '../src/beat/timeline.js';

const paletteKeys = [
  'bg', 'bg2', 'motif', 'accent', 'ink', 'titleInk',
  'ground', 'road', 'dash', 'body', 'beak', 'rigInk',
];

test('exactly 20 unique eras in order', () => {
  assert.equal(scenes.length, SECTION_COUNT);
  const ids = new Set();
  scenes.forEach((s, i) => {
    assert.equal(s.number, i + 1);
    assert.equal(s.id, `s${String(i + 1).padStart(2, '0')}`);
    assert.ok(!ids.has(s.id));
    ids.add(s.id);
  });
});

test('every era satisfies the scene contract', () => {
  for (const s of scenes) {
    for (const key of ['cn', 'en', 'year']) {
      assert.equal(typeof s[key], 'string');
      assert.ok(s[key].length > 0);
    }
    assert.equal(typeof s.draw, 'function');
    if (s.camera !== undefined) assert.equal(typeof s.camera, 'function');
    if (s.titleCard !== undefined) assert.equal(typeof s.titleCard, 'function');
    for (const key of paletteKeys) {
      assert.match(s.palette[key], /^(#|rgb)/, `${s.id}.${key}`);
    }
  }
});

test('scene ids line up with timeline slots', () => {
  scenes.forEach((s, i) => {
    assert.equal(sectionStart(i), 5 + i * 6);
  });
});
