import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR,
  DURATION,
  OUTRO_START,
  PICKUP,
  SECTION_COUNT,
  SECTION_LEN,
  SECTIONS_START,
  clock,
  sectionAt,
  sectionStart,
  strongPulse,
} from '../src/beat/timeline.js';

test('film length and grid', () => {
  assert.equal(DURATION, 137);
  assert.equal(BAR, 2);
  assert.equal(SECTION_LEN, 6);
  assert.equal(SECTIONS_START, 5);
  assert.equal(OUTRO_START, 125);
  assert.equal(SECTION_COUNT, 20);
});

test('every era boundary is a downbeat on the half-bar pickup grid', () => {
  for (let i = 0; i < SECTION_COUNT; i += 1) {
    const start = sectionStart(i);
    const bars = (start - PICKUP) / BAR;
    assert.ok(Number.isInteger(bars), `scene ${i + 1} start ${start} is not a bar`);
    assert.ok(Math.abs(strongPulse(start) - 1) < 1e-9);
  }
  assert.ok(Math.abs(strongPulse(OUTRO_START) - 1) < 1e-9);
});

test('sectionAt covers intro, every era and outro without gaps', () => {
  assert.equal(sectionAt(0).kind, 'intro');
  assert.equal(sectionAt(4.999).kind, 'intro');
  assert.equal(sectionAt(5).kind, 'section');
  assert.equal(sectionAt(5).index, 0);
  assert.equal(sectionAt(10.999).index, 0);
  assert.equal(sectionAt(11).index, 1);
  assert.equal(sectionAt(124.999).index, 19);
  assert.equal(sectionAt(125).kind, 'outro');
  assert.equal(sectionAt(137).kind, 'outro');
});

test('local time is clamped at each section', () => {
  assert.ok(Math.abs(sectionAt(5).local - 0) < 1e-9);
  assert.ok(Math.abs(sectionAt(10.5).local - 5.5) < 1e-9);
  assert.ok(Math.abs(sectionAt(125).local - 0) < 1e-9);
  assert.ok(Math.abs(sectionAt(136.5).local - 11.5) < 1e-9);
});

test('strong pulse peaks on whole seconds and decays', () => {
  assert.ok(strongPulse(10) > 0.999);
  assert.ok(strongPulse(10.25) < 0.3);
  assert.ok(strongPulse(0.5) === 0);
});

test('musical clock', () => {
  const c = clock(1);
  assert.equal(c.bar, 0);
  assert.equal(c.beat, 0);
  assert.equal(c.beatInBar, 0);
  assert.ok(Math.abs(clock(2).phase) < 1e-9);
  assert.equal(clock(3).bar, 1);
  assert.equal(clock(3).beatInBar, 0);
});
