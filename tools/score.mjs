#!/usr/bin/env node
// tools/score.mjs — original score + SFX for 《鹈鹕测试》.
//
// Everything is synthesised offline from code: additive/FM voices, filtered
// noise, a Schroeder reverb, seeded jitter. No samples and no network audio.
// 120 BPM, 4/4, half-bar pickup, 20 era blocks of three bars, 6-bar outro.
//
//   node tools/score.mjs   ->  audio/score.wav
//   48 kHz, stereo, 16-bit PCM, 137.0 s.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 48000;
const DUR = 137;
const N = Math.round(SR * DUR);
const TAU = Math.PI * 2;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(HERE, '..', 'audio', 'score.wav');

// ---------------------------------------------------------------------------
// Buffers. `OUT` is swapped while the vapourwave source is rendered.

const dryL = new Float32Array(N);
const dryR = new Float32Array(N);
const sendL = new Float32Array(N);
const sendR = new Float32Array(N);
let OUT = { L: dryL, R: dryR, S: sendL, S2: sendR };

const panGains = (pan) => {
  const p = Math.max(-1, Math.min(1, pan));
  const a = ((p + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};

const spread = (i, n, width = 0.55) =>
  n <= 1 ? 0 : -width + (2 * width * i) / (n - 1);

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let NOISE_ID = 1;

// ---------------------------------------------------------------------------
// Additive voice.

function addPartials(o) {
  const {
    t, dur, freq, amp = 0.1, pan = 0, partials,
    attack = 0.004, decay = 0.5, release = 0.08,
    vib = 0, vibRate = 5, glide = 1, glideTime = 0.1, send = 0.25,
    am = 0, amRate = 8,
  } = o;
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0 || start < 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const atk = Math.max(1, Math.floor(attack * SR));
  const rel = Math.max(1, Math.floor(release * SR));
  const dk = Math.exp(-1 / (decay * SR));

  for (let pi = 0; pi < partials.length; pi += 1) {
    const [ratio, gain, dscale = 1] = partials[pi];
    const f = freq * ratio;
    if (f > SR * 0.46) continue;
    let phase = (pi * 0.73 + freq * 0.0017) % TAU;
    let inc = (TAU * f) / SR;
    let m = 1;
    const dki = Math.exp(-1 / (decay * dscale * SR));
    const a = amp * gain;
    for (let i = 0; i < len; i += 1) {
      if ((i & 63) === 0) {
        const x = i / SR;
        const g = 1 + (glide - 1) * Math.exp(-x / glideTime);
        const v = vib ? 1 + vib * Math.sin(TAU * vibRate * x) : 1;
        inc = (TAU * f * g * v) / SR;
      }
      phase += inc;
      let env = m;
      if (i < atk) env *= i / atk;
      const rem = len - i;
      if (rem < rel) env *= rem / rel;
      if (am) env *= 1 - am * (0.5 - 0.5 * Math.cos(TAU * amRate * (i / SR)));
      const s = Math.sin(phase) * env * a;
      L[start + i] += s * gl;
      R[start + i] += s * gr;
      if (S) S[start + i] += s * gl * send;
      if (S2) S2[start + i] += s * gr * send;
      m *= dki;
    }
  }
}

// ---------------------------------------------------------------------------
// Noise. Chamberlin state-variable filter, seeded.

function noiseBurst(o) {
  const {
    t, dur, amp, pan = 0, f0 = 1000, f1 = f0, q = 1.2,
    attack = 0.01, decay = 0.3, release = 0.05, send = 0.2,
    seed = 0, sweep = 0, cutMod = 0, cutRate = 0.3, mode = 'bp',
  } = o;
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0 || start < 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const r = rng((((seed || NOISE_ID++) * 0x9e3779b1) >>> 0));
  const atk = Math.max(1, Math.floor(attack * SR));
  const rel = Math.max(1, Math.floor(release * SR));
  const dk = Math.exp(-1 / (decay * SR));
  let low = 0;
  let band = 0;
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    const u = i / len;
    let fc = f0 * Math.pow(f1 / f0, sweep ? u : 0);
    if (cutMod) fc *= 1 + cutMod * Math.sin(TAU * cutRate * x);
    fc = Math.min(fc, SR * 0.42);
    const f = 2 * Math.sin((Math.PI * fc) / SR);
    const inp = r() * 2 - 1;
    low += f * band;
    const high = inp - low - (1 / q) * band;
    band += f * high;
    const y = mode === 'hp' ? high : mode === 'lp' ? low : band;
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    if (rem < rel) env *= rem / rel;
    const s = y * env * amp;
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    if (S) S[start + i] += s * gl * send;
    if (S2) S2[start + i] += s * gr * send;
    m *= dk;
  }
}

// ---------------------------------------------------------------------------
// Drums and one-shots.

function membrane(o) {
  const {
    t, dur = 0.4, amp = 0.15, pan = 0, f0 = 120, f1 = 45,
    drop = 0.06, decay = 0.25, attack = 0.0015, send = 0.1, click = 0.15,
  } = o;
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0 || start < 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const atk = Math.max(1, Math.floor(attack * SR));
  const dk = Math.exp(-1 / (decay * SR));
  let phase = 0;
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-x / drop);
    phase += (TAU * f) / SR;
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    const rel = Math.max(1, Math.floor(0.02 * SR));
    if (rem < rel) env *= rem / rel;
    const s = Math.sin(phase) * env * amp;
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    if (S) S[start + i] += s * gl * send;
    if (S2) S2[start + i] += s * gr * send;
    m *= dk;
  }
  if (click > 0) {
    noiseBurst({
      t, dur: Math.min(0.03, dur), amp: amp * click, pan,
      f0: 1800, q: 1.1, attack: 0.0005, decay: 0.008, send: send * 0.5,
    });
  }
}

const kick = (t, amp = 0.15, pan = 0, o = {}) =>
  membrane({ t, dur: o.dur ?? 0.42, amp, pan, f0: o.f0 ?? 115, f1: o.f1 ?? 42, drop: 0.055, decay: o.decay ?? 0.2, click: 0.2, send: 0.08 });

const softDrum = (t, amp = 0.05, pan = 0) =>
  membrane({ t, dur: 0.55, amp, pan, f0: 95, f1: 52, drop: 0.08, decay: 0.3, click: 0.12 });

const bigDrum = (t, amp = 0.12, pan = 0) =>
  membrane({ t, dur: 1.2, amp, pan, f0: 82, f1: 36, drop: 0.11, decay: 0.65, click: 0.18, send: 0.22 });

const handDrum = (t, amp = 0.09, pan = 0) =>
  membrane({ t, dur: 0.5, amp, pan, f0: 170, f1: 78, drop: 0.045, decay: 0.22, click: 0.35, send: 0.14 });

const timpani = (t, amp = 0.09, note = 38, pan = 0) =>
  membrane({ t, dur: 2.4, amp, pan, f0: midiHz(note) * 1.7, f1: midiHz(note), drop: 0.2, decay: 1.1, click: 0.2, send: 0.3 });

const logDrum = (t, amp = 0.08, pan = 0) =>
  membrane({ t, dur: 0.3, amp, pan, f0: 310, f1: 175, drop: 0.04, decay: 0.15, click: 0.3, send: 0.12 });

const tabla = (t, amp = 0.07, pan = 0, kind = 'na') =>
  membrane({
    t, dur: 0.28, amp, pan,
    f0: kind === 'tin' ? 340 : kind === 'ge' ? 160 : 240,
    f1: kind === 'tin' ? 250 : kind === 'ge' ? 90 : 150,
    drop: 0.03, decay: kind === 'ge' ? 0.24 : 0.13, click: 0.4, send: 0.16,
  });

function snare(t, amp = 0.08, pan = 0) {
  membrane({ t, dur: 0.22, amp: amp * 0.55, pan, f0: 220, f1: 150, drop: 0.04, decay: 0.1, click: 0.1, send: 0.1 });
  noiseBurst({ t, dur: 0.18, amp, pan, f0: 1900, q: 0.9, attack: 0.001, decay: 0.075, send: 0.18 });
}

function clap(t, amp = 0.06, pan = 0) {
  for (let i = 0; i < 3; i += 1) {
    noiseBurst({
      t: t + i * 0.011, dur: 0.12, amp: amp * (1 - i * 0.16), pan,
      f0: 1650, q: 1.1, attack: 0.0005, decay: 0.045, send: 0.16,
    });
  }
}

const hat = (t, amp = 0.03, pan = 0, len = 0.05) =>
  noiseBurst({ t, dur: len, amp, pan, f0: 7800, q: 1.4, attack: 0.0005, decay: len * 0.55, send: 0.05, mode: 'hp' });

const shaker = (t, amp = 0.02, pan = 0) =>
  noiseBurst({ t, dur: 0.09, amp, pan, f0: 5200, q: 2.4, attack: 0.004, decay: 0.045, send: 0.06 });

function wood(t, amp = 0.035, pan = 0, pitch = 900) {
  addPartials({
    t, dur: 0.11, freq: pitch, amp, pan,
    partials: [[1, 1, 0.7], [1.83, 0.35, 0.4], [2.71, 0.16, 0.25]],
    attack: 0.0008, decay: 0.045, release: 0.02, send: 0.18,
  });
  noiseBurst({ t, dur: 0.015, amp: amp * 0.3, pan, f0: 3000, q: 1.2, attack: 0.0004, decay: 0.007, send: 0.05 });
}

function clapper(t, amp = 0.03, pan = 0) {
  wood(t, amp, pan, 1250);
  wood(t + 0.012, amp * 0.6, -pan, 1750);
}

// ---------------------------------------------------------------------------
// Tonal instruments.

const PLUCK = {
  harp: { n: 7, decay: 1.5, roll: 1.15, atk: 0.004, B: 0.00002, send: 0.48, ds: 0.5 },
  pipa: { n: 12, decay: 0.62, roll: 0.92, atk: 0.002, B: 0.00009, send: 0.3, ds: 0.32 },
  guqin: { n: 6, decay: 1.9, roll: 1.4, atk: 0.005, B: 0.00001, send: 0.55, ds: 0.7 },
  shamisen: { n: 9, decay: 0.42, roll: 0.88, atk: 0.0015, B: 0.00014, send: 0.26, ds: 0.28 },
  sitar: { n: 12, decay: 1.25, roll: 0.8, atk: 0.002, B: 0.00012, send: 0.42, ds: 0.42 },
  piano: { n: 9, decay: 2.1, roll: 1.0, atk: 0.002, B: 0.000035, send: 0.42, ds: 0.48 },
};

function pluck(t, note, amp, pan, kind = 'harp', o = {}) {
  const cfg = PLUCK[kind] || PLUCK.harp;
  const specs = [];
  for (let n = 1; n <= cfg.n; n += 1) {
    const ratio = n * Math.sqrt(1 + cfg.B * n * n);
    specs.push([ratio, 1 / Math.pow(n, cfg.roll), 1 / (1 + cfg.ds * (n - 1))]);
  }
  addPartials({
    t, dur: o.dur ?? Math.min(kind === 'piano' ? 2.9 : 3.6, cfg.decay * 2.4), freq: midiHz(note), amp, pan,
    partials: specs, attack: cfg.atk, decay: o.decay ?? cfg.decay,
    release: 0.1, glide: o.glide ?? 1, glideTime: o.glideTime ?? 0.11,
    vib: o.vib ?? 0, vibRate: 5.6, send: o.send ?? cfg.send,
  });
  if (kind === 'piano') {
    noiseBurst({ t, dur: 0.03, amp: amp * 0.16, pan, f0: 2300, q: 0.8, attack: 0.001, decay: 0.02, send: 0.1 });
  } else if (kind === 'pipa' || kind === 'shamisen' || kind === 'sitar') {
    noiseBurst({ t, dur: 0.014, amp: amp * 0.12, pan, f0: 3200, q: 1, attack: 0.0004, decay: 0.009, send: 0.05 });
  }
  if (kind === 'sitar') {
    addPartials({
      t, dur: 0.55, freq: midiHz(note), amp: amp * 0.22, pan,
      partials: [[2.76, 1, 0.4], [4.07, 0.7, 0.3], [5.43, 0.4, 0.2]],
      attack: 0.001, decay: 0.18, release: 0.05, send: 0.3,
    });
  }
}

const harp = (t, n, a, p, o) => pluck(t, n, a, p, 'harp', o);
const pipa = (t, n, a, p, o) => pluck(t, n, a, p, 'pipa', o);
const guqin = (t, n, a, p, o) => pluck(t, n, a, p, 'guqin', o);
const shamisen = (t, n, a, p, o) => pluck(t, n, a, p, 'shamisen', o);
const sitar = (t, n, a, p, o) => pluck(t, n, a, p, 'sitar', o);
const piano = (t, n, a, p, o) => pluck(t, n, a, p, 'piano', o);

function bass(t, note, dur, amp = 0.08, pan = 0) {
  addPartials({
    t, dur, freq: midiHz(note), amp, pan,
    partials: [[1, 1, 1], [2, 0.38, 0.8], [3, 0.13, 0.6]],
    attack: 0.015, decay: 8, release: 0.1, send: 0.08,
  });
}

function stringsPad(t, dur, notes, amp, o = {}) {
  const layers = o.layers ?? 3;
  const detune = o.detune ?? 0.003;
  const partials = [];
  const harm = o.harmonics ?? 7;
  for (let n = 1; n <= harm; n += 1) partials.push([n, 1 / Math.pow(n, o.roll ?? 1.32), 1]);
  notes.forEach((note, i) => {
    const pan = o.pan ?? spread(i, notes.length, 0.55);
    for (let l = 0; l < layers; l += 1) {
      const d = (l - (layers - 1) / 2) * detune;
      addPartials({
        t, dur, freq: midiHz(note) * (1 + d),
        amp: (amp / layers / notes.length) * 0.92,
        pan: pan + (l - 1) * 0.16,
        partials, attack: o.attack ?? 0.4, decay: o.decay ?? 30,
        release: o.release ?? 0.5, vib: o.vib ?? 0.0015, vibRate: 4.2,
        send: o.send ?? 0.6, am: o.am ?? 0,
      });
    }
  });
}

function synthPad(t, dur, notes, amp, o = {}) {
  const partials = [[1, 1, 1], [2, 0.3, 0.9], [3, 0.12, 0.7], [4.01, 0.06, 0.5]];
  notes.forEach((note, i) => {
    addPartials({
      t, dur, freq: midiHz(note), amp: amp / notes.length * 0.62,
      pan: o.pan ?? spread(i, notes.length, 0.5), partials,
      attack: o.attack ?? 0.25, decay: o.decay ?? 12, release: o.release ?? 0.4,
      vib: 0.0022, vibRate: 0.9, send: o.send ?? 0.55,
    });
  });
}

function flute(t, note, dur, amp, pan, o = {}) {
  const kind = o.kind ?? 'bone';
  const cfg = {
    bone: { p: [[1, 1, 1], [2, 0.17, 0.85], [3, 0.11, 0.7], [4.02, 0.045, 0.5]], vib: 0.0035, atk: 0.035, breath: 0.42, bf: 1750, send: 0.5 },
    xiao: { p: [[1, 1, 1], [2, 0.12, 0.8], [3, 0.04, 0.6]], vib: 0.0048, atk: 0.09, breath: 0.55, bf: 2250, send: 0.55 },
    ocarina: { p: [[1, 1, 1], [2, 0.2, 0.8], [3, 0.055, 0.6]], vib: 0.0022, atk: 0.028, breath: 0.18, bf: 2900, send: 0.4 },
    dizi: { p: [[1, 1, 1], [2, 0.28, 0.8], [3, 0.18, 0.65], [4, 0.06, 0.45]], vib: 0.006, atk: 0.03, breath: 0.3, bf: 2700, send: 0.4 },
  }[kind];
  addPartials({
    t, dur, freq: midiHz(note), amp, pan, partials: cfg.p,
    attack: cfg.atk, decay: 30, release: Math.min(0.25, dur * 0.3),
    vib: cfg.vib, vibRate: 5.1, glide: o.bend ?? 1, glideTime: o.glideTime ?? 0.12,
    send: cfg.send,
  });
  noiseBurst({
    t, dur: Math.min(dur, 2.4), amp: amp * cfg.breath, pan,
    f0: cfg.bf, q: 1.8, attack: cfg.atk * 1.4, decay: 30,
    release: Math.min(0.25, dur * 0.3), cutMod: 0.12, cutRate: 4.7, send: cfg.send * 0.5,
  });
}

const bone = (t, n, d, a, p, o = {}) => flute(t, n, d, a, p, { ...o, kind: 'bone' });
const xiao = (t, n, d, a, p, o = {}) => flute(t, n, d, a, p, { ...o, kind: 'xiao' });
const ocarina = (t, n, d, a, p, o = {}) => flute(t, n, d, a, p, { ...o, kind: 'ocarina' });
const dizi = (t, n, d, a, p, o = {}) => flute(t, n, d, a, p, { ...o, kind: 'dizi' });

function reed(t, note, dur, amp, pan, o = {}) {
  const oboe = o.kind === 'oboe';
  const partials = oboe
    ? [[1, 1, 1], [2, 0.42, 0.9], [3, 0.5, 0.8], [4, 0.22, 0.7], [5, 0.28, 0.6], [6, 0.1, 0.5]]
    : [[1, 1, 1], [2, 0.22, 0.8], [3, 0.36, 0.7], [4, 0.1, 0.55], [5, 0.18, 0.5]];
  addPartials({
    t, dur, freq: midiHz(note), amp, pan, partials,
    attack: oboe ? 0.05 : 0.035, decay: 30, release: Math.min(0.2, dur * 0.25),
    vib: oboe ? 0.0045 : 0.0032, vibRate: oboe ? 5.4 : 4.6,
    glide: o.bend ?? 1, glideTime: 0.1, send: 0.42,
  });
  noiseBurst({
    t, dur: Math.min(dur, 2), amp: amp * 0.16, pan,
    f0: 2100, q: 1.6, attack: 0.04, decay: 20, release: 0.15, send: 0.2,
  });
}

const oboe = (t, n, d, a, p, o = {}) => reed(t, n, d, a, p, { ...o, kind: 'oboe' });

function voice(t, dur, note, amp, pan) {
  addPartials({
    t, dur, freq: midiHz(note), amp, pan,
    partials: [[1, 1, 1], [2, 0.55, 0.9], [3, 0.32, 0.8], [4, 0.12, 0.6], [5, 0.17, 0.55], [6, 0.05, 0.45]],
    attack: 0.45, decay: 30, release: 0.5, vib: 0.006, vibRate: 4.7, send: 0.65,
  });
  noiseBurst({ t, dur: Math.min(dur, 2), amp: amp * 0.12, pan, f0: 900, q: 1.2, attack: 0.5, decay: 20, release: 0.4, send: 0.4 });
}

function bell(t, note, amp, pan, o = {}) {
  const f = midiHz(note);
  const decay = o.decay ?? 2.2;
  const ratio = o.ratio ?? 1.41;
  const index = o.index ?? 2.2;
  const idxDecay = o.idxDecay ?? 0.4;
  const start = Math.round(t * SR);
  const len = Math.min(Math.round((o.dur ?? decay * 1.4) * SR), N - start);
  if (len <= 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const dk = Math.exp(-1 / (decay * SR));
  const atk = Math.max(1, Math.floor(0.002 * SR));
  const rel = Math.max(1, Math.floor(0.12 * SR));
  let car = 0;
  let mod = 0;
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    mod += (TAU * f * ratio) / SR;
    car += (TAU * f) / SR;
    const idx = index * Math.exp(-x / idxDecay);
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    if (rem < rel) env *= rem / rel;
    const s = Math.sin(car + idx * Math.sin(mod)) * env * amp;
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    if (S) S[start + i] += s * gl * (o.send ?? 0.55);
    if (S2) S2[start + i] += s * gr * (o.send ?? 0.55);
    m *= dk;
  }
}

const stone = (t, n, a, p) => bell(t, n, a, p, { ratio: 2.76, index: 2.8, decay: 1.15, idxDecay: 0.18, send: 0.45 });

function gamelan(t, note, amp, pan, o = {}) {
  const f = midiHz(note);
  const partials = [[1, 1, 0.55], [1.52, 0.55, 0.4], [2.71, 0.4, 0.3], [4.03, 0.22, 0.2], [5.43, 0.1, 0.12]];
  for (let l = 0; l < 2; l += 1) {
    addPartials({
      t, dur: o.dur ?? 2.6, freq: f * (l ? 1.0045 : 0.9962), amp: amp / 2,
      pan: pan + (l ? 0.12 : -0.12), partials,
      attack: 0.002, decay: o.decay ?? 1.9, release: 0.3, send: 0.55,
    });
  }
  noiseBurst({ t, dur: 0.02, amp: amp * 0.1, pan, f0: 3000, q: 1, attack: 0.0005, decay: 0.01, send: 0.2 });
}

function gong(t, note, amp, pan, o = {}) {
  const f = midiHz(note);
  const partials = [[1, 1, 1], [1.47, 0.6, 0.8], [2.09, 0.45, 0.65], [2.83, 0.3, 0.5], [3.76, 0.22, 0.4], [5.1, 0.12, 0.3]];
  addPartials({
    t, dur: o.dur ?? 4.5, freq: f, amp, pan, partials,
    attack: 0.008, decay: o.decay ?? 3.2, release: 0.8, send: 0.6,
  });
  noiseBurst({
    t, dur: 2.2, amp: amp * 0.25, pan, f0: f * 8, q: 0.8,
    attack: 0.01, decay: 1.2, release: 0.4, send: 0.5,
  });
}

// ---------------------------------------------------------------------------
// Chiptune / scope / FM.

function chip(o) {
  const {
    t, note, dur, amp, pan = 0, duty = 0.5, type = 'pulse',
    decay = 0.2, send = 0.1, slide = 0,
  } = o;
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const f = midiHz(note);
  let phase = 0;
  let lp = 0;
  const atk = Math.max(1, Math.floor(0.0015 * SR));
  const rel = Math.max(1, Math.floor(0.015 * SR));
  const dk = Math.exp(-1 / (decay * SR));
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    const ff = f * (1 + slide * (x / dur));
    phase += (TAU * ff) / SR;
    const ph = ((phase / TAU) % 1 + 1) % 1;
    let s;
    if (type === 'pulse') s = ph < duty ? 1 : -1;
    else if (type === 'tri') s = 4 * Math.abs(ph - 0.5) - 1;
    else s = Math.sin(phase);
    lp += 0.55 * (s - lp);
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    if (rem < rel) env *= rem / rel;
    const y = lp * env * amp;
    L[start + i] += y * gl;
    R[start + i] += y * gr;
    if (S) S[start + i] += y * gl * send;
    if (S2) S2[start + i] += y * gr * send;
    m *= dk;
  }
}

function beep(t, f0, f1, dur, amp, pan, o = {}) {
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const atk = Math.max(1, Math.floor((o.attack ?? 0.004) * SR));
  const rel = Math.max(1, Math.floor((o.release ?? 0.02) * SR));
  const dk = Math.exp(-1 / ((o.decay ?? 0.15) * SR));
  let phase = 0;
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    const f = f0 * Math.pow(f1 / f0, x / dur) * (1 + (o.vib ?? 0) * Math.sin(TAU * (o.vibRate ?? 6) * x));
    phase += (TAU * f) / SR;
    let s = Math.sin(phase);
    if (o.ring) s *= 0.55 + 0.45 * Math.sin(TAU * o.ring * x);
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    if (rem < rel) env *= rem / rel;
    const y = s * env * amp;
    L[start + i] += y * gl;
    R[start + i] += y * gr;
    if (S) S[start + i] += y * gl * (o.send ?? 0.15);
    if (S2) S2[start + i] += y * gr * (o.send ?? 0.15);
    m *= dk;
  }
}

function sweepTone(t, dur, f0, f1, amp, pan, o = {}) {
  const harm = o.harmonics ?? 3;
  for (let k = 1; k <= harm; k += 1) {
    const start = Math.round(t * SR);
    const len = Math.min(Math.round(dur * SR), N - start);
    if (len <= 0) continue;
    const L = OUT.L;
    const R = OUT.R;
    const [gl, gr] = panGains(pan);
    let phase = 0;
    const atk = Math.max(1, Math.floor((o.attack ?? 0.05) * SR));
    const rel = Math.max(1, Math.floor((o.release ?? 0.25) * SR));
    for (let i = 0; i < len; i += 1) {
      const x = i / SR;
      const f = f0 * Math.pow(f1 / f0, x / dur) * k * (1 + (o.vib ?? 0.008) * Math.sin(TAU * (o.vibRate ?? 6.2) * x));
      phase += (TAU * f) / SR;
      let env = 1;
      if (i < atk) env *= i / atk;
      const rem = len - i;
      if (rem < rel) env *= rem / rel;
      const s = Math.sin(phase) * env * (amp / Math.pow(k, 1.25));
      L[start + i] += s * gl;
      R[start + i] += s * gr;
      if (OUT.S) OUT.S[start + i] += s * gl * 0.5;
      if (OUT.S2) OUT.S2[start + i] += s * gr * 0.5;
    }
  }
}

function fmBell(t, note, dur, amp, pan, o = {}) {
  const f = midiHz(note);
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  let car = 0;
  let mod = 0;
  const atk = Math.max(1, Math.floor(0.002 * SR));
  const rel = Math.max(1, Math.floor(0.04 * SR));
  const dk = Math.exp(-1 / ((o.decay ?? 0.5) * SR));
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    mod += (TAU * f * (o.ratio ?? 2)) / SR;
    car += (TAU * f) / SR;
    const idx = (o.index ?? 2.6) * Math.exp(-x / 0.09);
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    if (rem < rel) env *= rem / rel;
    const s = Math.sin(car + idx * Math.sin(mod)) * env * amp;
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    if (S) S[start + i] += s * gl * (o.send ?? 0.25);
    if (S2) S2[start + i] += s * gr * (o.send ?? 0.25);
    m *= dk;
  }
}

// ---------------------------------------------------------------------------
// Sound effects.

function air(t, dur, amp, seed = 11) {
  noiseBurst({
    t, dur, amp, f0: 420, f1: 760, q: 0.65,
    attack: 0.9, decay: 30, release: 1.2,
    cutMod: 0.35, cutRate: 0.12, seed, send: 0.2,
  });
}

function river(t, dur, amp, seed = 31) {
  noiseBurst({
    t, dur, amp, f0: 620, f1: 980, q: 0.9,
    attack: 1.2, decay: 40, release: 1.4,
    cutMod: 0.28, cutRate: 0.27, seed, send: 0.25,
  });
  noiseBurst({
    t, dur, amp: amp * 0.45, f0: 1800, f1: 2600, q: 0.7,
    attack: 1.6, decay: 40, release: 1.4, cutMod: 0.4, cutRate: 0.51,
    seed: seed + 1, send: 0.2,
  });
}

function brush(t, amp = 0.02, pan = 0) {
  noiseBurst({
    t, dur: 0.38, amp, pan, f0: 2200, f1: 5600, q: 0.7,
    attack: 0.13, decay: 0.22, release: 0.1, send: 0.25,
  });
}

function chain(t, dur, amp = 0.007, seed = 41) {
  for (let x = t + 0.5; x < t + dur - 0.05; x += 1) {
    noiseBurst({
      t: x, dur: 0.06, amp, f0: 3600, q: 2.4,
      attack: 0.001, decay: 0.018, pan: ((Math.round(x * 2) % 3) - 1) * 0.3,
      seed: seed + Math.round(x * 10), send: 0.08,
    });
  }
}

function shutter(t, amp = 0.03, pan = 0) {
  noiseBurst({ t, dur: 0.035, amp, pan, f0: 3200, q: 1.2, attack: 0.0004, decay: 0.01, send: 0.15 });
  noiseBurst({ t: t + 0.045, dur: 0.06, amp: amp * 0.7, pan, f0: 1700, q: 1.1, attack: 0.0004, decay: 0.02, send: 0.15 });
}

function projector(t, dur, amp = 0.012) {
  for (let x = t; x < t + dur; x += 0.055) {
    noiseBurst({ t: x, dur: 0.02, amp, f0: 1500, q: 1.4, attack: 0.0004, decay: 0.006, send: 0.05 });
  }
  addPartials({
    t, dur, freq: 92, amp: amp * 0.6, pan: 0,
    partials: [[1, 1, 1], [2, 0.3, 1]], attack: 0.2, decay: 30, release: 0.3, send: 0.1,
  });
}

function crt(t, dur, amp = 0.01) {
  addPartials({
    t, dur, freq: 120, amp, pan: 0,
    partials: [[1, 1, 1], [2, 0.4, 1], [3, 0.15, 1]], attack: 0.15, decay: 30, release: 0.3, send: 0.05,
  });
  addPartials({
    t, dur, freq: 7750, amp: amp * 0.28, pan: 0,
    partials: [[1, 1, 1]], attack: 0.2, decay: 30, release: 0.3, send: 0.05,
  });
  noiseBurst({ t, dur, amp: amp * 0.18, f0: 3000, f1: 5500, q: 0.6, attack: 0.2, decay: 30, release: 0.3, send: 0, mode: 'hp' });
}

function zap(t, amp = 0.035, pan = 0) {
  noiseBurst({ t, dur: 0.28, amp, pan, f0: 6000, f1: 500, q: 0.7, attack: 0.003, decay: 0.12, sweep: 1, send: 0.3 });
  beep(t, 1800, 220, 0.32, amp * 0.55, pan, { decay: 0.16, vib: 0.02, vibRate: 15, send: 0.25 });
}

function tick(t, amp = 0.008, pan = 0) {
  noiseBurst({ t, dur: 0.022, amp, pan, f0: 2600, q: 1.4, attack: 0.0004, decay: 0.007, send: 0.05 });
}

function bikeBell(t, amp = 0.03, pan = 0) {
  for (let s = 0; s < 2; s += 1) {
    const tt = t + s * 0.055;
    const a = amp * (s ? 0.55 : 1);
    bell(tt, 96, a, pan, { ratio: 3.41, index: 3.5, decay: 0.55, idxDecay: 0.1, send: 0.3 });
    bell(tt, 99, a * 0.7, pan, { ratio: 2.91, index: 3, decay: 0.5, idxDecay: 0.1, send: 0.3 });
  }
}

function coin(t, amp = 0.05, pan = 0.15) {
  [86, 89, 93, 98].forEach((n, i) => {
    chip({
      t: t + i * 0.052, note: n, dur: 0.11, amp: amp * (1 - i * 0.08),
      pan, duty: 0.5, type: 'pulse', decay: 0.16, send: 0.2,
    });
  });
}

function blip(t, amp = 0.035, pan = -0.2) {
  beep(t, 1500, 1180, 0.09, amp, pan, { decay: 0.05, send: 0.2 });
  beep(t + 0.065, 1950, 1560, 0.08, amp * 0.8, pan, { decay: 0.045, send: 0.2 });
}

function tapeClick(t, amp = 0.03, pan = 0) {
  noiseBurst({ t, dur: 0.09, amp, pan, f0: 2400, q: 1.1, attack: 0.0005, decay: 0.025, send: 0.15 });
  membrane({ t, dur: 0.12, amp: amp * 0.7, pan, f0: 180, f1: 90, drop: 0.02, decay: 0.05, click: 0.1, send: 0.1 });
  noiseBurst({ t: t + 0.02, dur: 0.5, amp: amp * 0.18, pan, f0: 5200, q: 0.6, attack: 0.05, decay: 0.3, send: 0, mode: 'hp' });
}

// ---------------------------------------------------------------------------
// Harmony. 120 BPM, bar = 2 s, first downbeat at 1 s.

const CHORDS = {
  Dm9: [50, 53, 57, 60, 64],
  Bbmaj7: [46, 50, 53, 57],
  Fmaj9: [53, 57, 60, 64, 67],
  Csus2: [48, 55, 60, 62],
  Gm9: [43, 50, 53, 57, 58],
  A7sus: [45, 52, 57, 62],
};
const ROOTS = {
  Dm9: 38, Bbmaj7: 34, Fmaj9: 41, Csus2: 36, Gm9: 31, A7sus: 33,
};
const PROG = ['Dm9', 'Bbmaj7', 'Fmaj9', 'Csus2', 'Dm9', 'Gm9', 'Bbmaj7', 'A7sus'];

function chordAtBarK(k) {
  const name = PROG[(((k - 2) % 8) + 8) % 8];
  return { name, notes: CHORDS[name], root: ROOTS[name] };
}

const barChordAt = (t) => chordAtBarK(Math.round((t - 1) / 2));

function basses(s, amp = 0.07, dur = 1.94) {
  for (let b = 0; b < 3; b += 1) {
    const c = barChordAt(s + 2 * b);
    bass(s + 2 * b, c.root, dur, amp);
  }
}

function padBars(s, amp, o = {}) {
  for (let b = 0; b < 3; b += 1) {
    const c = barChordAt(s + 2 * b);
    stringsPad(s + 2 * b, 2.05, c.notes, amp, o);
  }
}

// ---------------------------------------------------------------------------
// The twenty eras. Each starts with its own timbre and states the D-E motif.

function secSahara(s) {
  air(s, 6, 0.012, 101);
  chain(s, 6, 0.005, 102);
  basses(s, 0.052);
  const hits = [[0, 0.068, 0.1], [1.5, 0.034, -0.25], [2, 0.058, 0.2], [3.5, 0.03, -0.3],
    [4, 0.062, 0.15], [5.25, 0.034, -0.2], [5.75, 0.045, 0.25]];
  hits.forEach(([o, a, p]) => handDrum(s + o, a, p));
  bone(s, 74, 1.3, 0.062, -0.15, { bend: 0.985 });
  bone(s + 0.5, 76, 1.55, 0.06, 0.12);
  bone(s + 2, 76, 1.0, 0.052, 0.2, { bend: 0.99 });
  bone(s + 2.75, 74, 1.6, 0.055, 0.15, { bend: 0.968 });
  voice(s + 2.3, 1.8, 50, 0.034, -0.3);
  bone(s + 4, 74, 0.85, 0.06, -0.1);
  bone(s + 4.5, 76, 1.0, 0.06, 0.06);
  bone(s + 5.12, 81, 0.75, 0.052, 0.16);
  noiseBurst({ t: s + 5.15, dur: 0.75, amp: 0.01, f0: 340, f1: 1100, q: 0.75, attack: 0.3, decay: 1, sweep: 1, seed: 103 });
}

function secEgypt(s) {
  air(s, 6, 0.007, 201);
  chain(s, 6, 0.005, 202);
  basses(s, 0.048);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    const c = barChordAt(t);
    const arp = c.notes.map((n) => n + 12);
    for (let j = 0; j < 8; j += 1) {
      harp(t + j * 0.25, arp[(j + (b % 2)) % arp.length], 0.021, j % 2 ? 0.28 : -0.28, { dur: 0.9 });
    }
  }
  reed(s, 74, 1.4, 0.06, -0.12);
  reed(s + 0.5, 76, 1.55, 0.058, 0.14);
  reed(s + 2, 76, 1.0, 0.055, 0.2, { bend: 1.012 });
  reed(s + 2.8, 74, 1.5, 0.05, 0.1);
  reed(s + 4, 74, 0.85, 0.058, -0.15);
  reed(s + 4.5, 76, 0.9, 0.058, 0.02);
  reed(s + 5.0, 81, 0.95, 0.056, 0.16);
  for (let j = 0; j < 6; j += 1) clapper(s + 0.5 + j, 0.016, j % 2 ? 0.25 : -0.25);
}

function secHan(s) {
  air(s, 6, 0.006, 301);
  basses(s, 0.055, 1.96);
  [0, 2, 4].forEach((o) => { bigDrum(s + o, 0.078, 0); bigDrum(s + o + 1.5, 0.03, 0.3); });
  stone(s, 74, 0.06, -0.12);
  stone(s + 0.5, 76, 0.057, 0.1);
  stone(s + 2, 76, 0.054, 0.2);
  stone(s + 2.75, 74, 0.05, -0.2);
  stone(s + 4, 74, 0.058, -0.15);
  stone(s + 4.5, 76, 0.055, 0.15);
  stone(s + 5.1, 81, 0.053, 0.25);
  stone(s + 3.55, 69, 0.025, -0.35);
  stone(s + 3.56, 71, 0.02, 0.35);
  for (let j = 0; j < 7; j += 1) {
    bigDrum(s + 5.15 + j * 0.12, 0.02 + j * 0.003, j % 2 ? 0.25 : -0.25);
  }
}

function secTang(s) {
  air(s, 6, 0.009, 401);
  chain(s, 6, 0.005, 402);
  basses(s, 0.045);
  guqin(s, 62, 0.07, -0.12, { glide: 0.93, glideTime: 0.16 });
  guqin(s + 0.5, 64, 0.066, 0.12, { glide: 0.98 });
  guqin(s + 1.2, 69, 0.04, 0.28, { dur: 2.2 });
  guqin(s + 1.6, 74, 0.035, -0.3, { dur: 2 });
  guqin(s + 2, 64, 0.057, 0.02, { glide: 0.95, glideTime: 0.2 });
  guqin(s + 2.6, 62, 0.05, 0.12);
  for (let j = 0; j < 12; j += 1) {
    pipa(s + 2.95 + j * 0.085, j % 2 ? 76 : 74, 0.021, 0.12, { dur: 0.4 });
  }
  [62, 64, 65, 67, 69, 71, 74, 76].forEach((n, j) => {
    pipa(s + 4.2 + j * 0.18, n, 0.034 + j * 0.002, -0.32 + j * 0.09, { dur: 0.75 });
  });
  wood(s + 1, 0.018, -0.4);
  wood(s + 3, 0.018, 0.4);
}

function secSong(s) {
  air(s, 6, 0.011, 501);
  padBars(s, 0.027, { detune: 0.0025, attack: 0.65, harmonics: 9, send: 0.65 });
  basses(s, 0.042, 2.05);
  xiao(s, 62, 1.6, 0.066, -0.15);
  xiao(s + 0.6, 64, 1.75, 0.063, 0.1);
  xiao(s + 2, 64, 1.2, 0.058, 0.16);
  xiao(s + 2.9, 62, 1.75, 0.053, 0.08);
  bell(s + 3.4, 81, 0.023, 0.3, { decay: 3, ratio: 1.41, send: 0.6 });
  xiao(s + 4, 62, 1.0, 0.063, -0.1);
  xiao(s + 4.6, 64, 1.2, 0.067, 0.0);
  xiao(s + 5.15, 67, 1.0, 0.053, 0.16);
  softDrum(s, 0.04, -0.15);
  softDrum(s + 2, 0.034, 0.1);
  softDrum(s + 4, 0.046, -0.1);
}

function secQingming(s) {
  river(s, 6, 0.011, 601);
  basses(s, 0.055);
  gong(s, 38, 0.042, -0.2, { dur: 5, decay: 3.6 });
  gong(s + 4, 38, 0.035, 0.2, { dur: 4, decay: 3 });
  pipa(s, 74, 0.06, -0.1);
  pipa(s + 0.5, 76, 0.057, 0.14);
  pipa(s + 2, 76, 0.052, 0.15);
  pipa(s + 2.4, 74, 0.05, 0.05);
  pipa(s + 2.8, 69, 0.043, -0.15);
  dizi(s, 74, 1.1, 0.04, 0.18);
  dizi(s + 2, 76, 1.0, 0.036, -0.18);
  dizi(s + 4, 79, 0.9, 0.038, 0.12);
  [62, 64, 65, 67, 69, 71, 74, 76].forEach((n, j) => {
    pipa(s + 4.1 + j * 0.15, n, 0.034 + j * 0.0018, -0.3 + j * 0.08, { dur: 0.6 });
  });
  for (let j = 0; j < 6; j += 1) {
    wood(s + 0.5 + j, 0.024, j % 2 ? 0.28 : -0.28, j % 2 ? 1150 : 880);
  }
  [[0.6, 1400], [1.9, 1650], [3.3, 1250], [4.7, 1500], [5.4, 1800]].forEach(([o, f], i) => {
    beep(s + o, f, f * 0.94, 0.07, 0.012, i % 2 ? 0.3 : -0.3, { decay: 0.045 });
  });
}

function secMaya(s) {
  air(s, 6, 0.007, 701);
  basses(s, 0.05);
  ocarina(s, 74, 1.25, 0.07, -0.12);
  ocarina(s + 0.5, 76, 1.4, 0.067, 0.12);
  ocarina(s + 2, 76, 0.95, 0.061, 0.16);
  ocarina(s + 2.7, 74, 1.3, 0.06, 0.05);
  ocarina(s + 4, 74, 0.8, 0.065, -0.1);
  ocarina(s + 4.5, 76, 0.8, 0.067, 0.05);
  ocarina(s + 5.0, 79, 0.9, 0.061, 0.16);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    [[0, 0.075], [0.75, 0.05], [1.5, 0.064], [1.75, 0.036]].forEach(([o, a]) => logDrum(t + o, a, o === 0 ? -0.15 : 0.2));
  }
  for (let j = 0; j < 12; j += 1) shaker(s + j * 0.5, 0.012, j % 2 ? 0.3 : -0.3);
}

function secMughal(s) {
  air(s, 6, 0.005, 801);
  tanpura(s, 6, 0.015);
  basses(s, 0.055);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    [[0, 'na', 0.06], [0.5, 'ge', 0.048], [0.75, 'tin', 0.036], [1.5, 'na', 0.048], [1.75, 'tin', 0.032]]
      .forEach(([o, k, a]) => tabla(t + o, a, o === 0 ? -0.15 : 0.18, k));
  }
  sitar(s, 62, 0.07, -0.12, { glide: 0.985, dur: 1.8 });
  sitar(s + 0.5, 64, 0.067, 0.12, { dur: 1.8 });
  sitar(s + 1.0, 69, 0.041, 0.25, { dur: 1.4 });
  sitar(s + 2, 64, 0.058, 0.05, { glide: 0.99, dur: 1.2 });
  [62, 64, 65, 67, 69, 71, 72, 74].forEach((n, j) => {
    sitar(s + 2.6 + j * 0.1, n, 0.03, -0.3 + j * 0.08, { dur: 0.55 });
  });
  sitar(s + 4, 62, 0.068, -0.1, { dur: 1.6 });
  sitar(s + 4.5, 64, 0.066, 0.1, { dur: 1.6 });
  sitar(s + 5.1, 69, 0.058, 0.2, { dur: 1.2, glide: 1.015 });
  for (let j = 0; j < 8; j += 1) tabla(s + 4.8 + j * 0.14, 0.024 + j * 0.004, j % 2 ? 0.25 : -0.25, j % 3 ? 'na' : 'ge');
}

function secBada(s) {
  air(s, 6, 0.012, 901);
  addPartials({ t: s, dur: 6, freq: midiHz(38), amp: 0.022, pan: 0, partials: [[1, 1, 1], [2, 0.15, 1]], attack: 1.2, decay: 40, release: 1, send: 0.2 });
  guqin(s, 50, 0.06, -0.1, { dur: 3, glide: 0.96, glideTime: 0.25 });
  guqin(s + 1.0, 52, 0.05, 0.12, { dur: 3, glide: 1.01 });
  guqin(s + 2, 52, 0.055, 0.1, { dur: 2.8, glide: 0.965 });
  guqin(s + 2.8, 50, 0.045, -0.1, { dur: 2.5 });
  guqin(s + 3.4, 69, 0.026, 0.3, { dur: 2.5 });
  guqin(s + 4, 50, 0.058, -0.1, { dur: 3 });
  guqin(s + 5.1, 52, 0.045, 0.15, { dur: 2, glide: 0.97 });
  brush(s + 0.2, 0.014, -0.3);
  brush(s + 2.2, 0.012, 0.3);
  brush(s + 4.2, 0.014, -0.25);
  softDrum(s, 0.02, 0);
  softDrum(s + 2, 0.018, 0);
  softDrum(s + 4, 0.022, 0);
}

function secWayang(s) {
  air(s, 6, 0.005, 1001);
  basses(s, 0.058);
  gong(s, 33, 0.052, -0.15, { dur: 5, decay: 3.2 });
  gong(s + 4, 33, 0.045, 0.15, { dur: 4, decay: 2.8 });
  gamelan(s, 74, 0.075, -0.15);
  gamelan(s + 0.5, 76, 0.071, 0.15);
  gamelan(s + 2, 76, 0.067, 0.2);
  gamelan(s + 2.5, 74, 0.062, -0.2);
  gamelan(s + 2.75, 81, 0.05, 0.1);
  gamelan(s + 4, 74, 0.075, -0.15);
  gamelan(s + 4.5, 76, 0.071, 0.15);
  gamelan(s + 5.0, 81, 0.062, 0.25);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    [[0, 0.07], [0.5, 0.045], [1.0, 0.055], [1.5, 0.04]].forEach(([o, a]) => handDrum(t + o, a, o === 0 ? 0.2 : -0.2));
  }
}

function secUkiyo(s) {
  air(s, 6, 0.005, 1101);
  chain(s, 6, 0.005, 1102);
  basses(s, 0.058);
  shamisen(s, 62, 0.085, -0.12, { glide: 0.97 });
  shamisen(s + 0.5, 64, 0.08, 0.12);
  shamisen(s + 1.5, 69, 0.048, 0.25);
  shamisen(s + 2, 64, 0.07, 0.1, { glide: 0.98 });
  shamisen(s + 2.5, 62, 0.066, -0.1);
  [62, 64, 65, 67, 69, 71, 74, 76].forEach((n, j) => {
    shamisen(s + 4 + j * 0.12, n, 0.03 + j * 0.0018, -0.3 + j * 0.08, { dur: 0.4 });
  });
  [0, 2, 4].forEach((o) => kick(s + o, 0.055, 0, { f0: 95, f1: 48, decay: 0.18 }));
  for (let j = 0; j < 6; j += 1) wood(s + 0.5 + j, 0.026, j % 2 ? 0.25 : -0.25, j % 2 ? 1250 : 950);
}

function secVanGogh(s) {
  air(s, 6, 0.007, 1201);
  padBars(s, 0.028, { detune: 0.004, attack: 0.35, harmonics: 10, send: 0.65 });
  basses(s, 0.058);
  oboe(s, 74, 1.3, 0.07, -0.12);
  oboe(s + 0.5, 76, 1.5, 0.067, 0.12);
  oboe(s + 2, 76, 1.0, 0.065, 0.18);
  oboe(s + 2.6, 74, 1.5, 0.06, 0.1);
  oboe(s + 4, 74, 1.1, 0.07, -0.1);
  oboe(s + 4.5, 76, 1.2, 0.073, 0.05);
  oboe(s + 5.1, 79, 1.0, 0.065, 0.15);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    const c = barChordAt(t);
    for (let j = 0; j < 8; j += 1) {
      harp(t + j * 0.25, c.notes[(j + 2) % c.notes.length] + 12, 0.014, j % 2 ? 0.35 : -0.35, { dur: 1.1 });
    }
    timpani(t, 0.045, c.root, -0.1);
  }
  stringsPad(s + 4, 2.05, [74, 77, 81, 86], 0.018, { attack: 0.5, detune: 0.004, send: 0.7 });
}

function secMunch(s) {
  air(s, 6, 0.008, 1301);
  basses(s, 0.06);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    const c = barChordAt(t);
    const det = [0.006, 0.014, 0.022][b];
    stringsPad(t, 2.05, c.notes, 0.028, { detune: det, attack: 0.25, vib: 0.004, harmonics: 11, send: 0.7 });
    timpani(t, 0.05, c.root, 0);
  }
  bell(s, 81, 0.034, 0.3, { decay: 3.4, ratio: 1.41, send: 0.7 });
  bell(s + 4, 82, 0.03, -0.3, { decay: 3.2, ratio: 1.41, send: 0.7 });
  // Motif on high, detuned strings.
  [74, 76].forEach((n, j) => {
    addPartials({
      t: s + j * 0.5, dur: 2.0, freq: midiHz(n), amp: 0.055, pan: j ? 0.15 : -0.15,
      partials: [[1, 1, 1], [2, 0.5, 0.9], [3, 0.4, 0.8], [4, 0.25, 0.7], [5, 0.16, 0.6]],
      attack: 0.08, decay: 1.4, release: 0.35, vib: 0.007, vibRate: 6.6, glide: 0.985, glideTime: 0.2, send: 0.65,
    });
  });
  // The scream: a bent high cluster, released before the next bar.
  sweepTone(s + 2.35, 1.15, 740, 1180, 0.045, 0.1, { harmonics: 4, vib: 0.022, vibRate: 7.2, attack: 0.12, release: 0.35 });
  noiseBurst({ t: s + 2.35, dur: 1.2, amp: 0.022, pan: 0.1, f0: 1200, f1: 2600, q: 2.2, attack: 0.15, decay: 0.8, sweep: 1, send: 0.5 });
  sweepTone(s + 4.0, 1.6, 1180, 640, 0.02, -0.2, { harmonics: 3, vib: 0.012, vibRate: 5.4, attack: 0.2, release: 0.6 });
  for (let j = 0; j < 8; j += 1) bigDrum(s + 4.9 + j * 0.12, 0.025 + j * 0.005, j % 2 ? 0.2 : -0.2);
}

function secNosferatu(s) {
  projector(s, 6, 0.008);
  basses(s, 0.045);
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    const c = barChordAt(t);
    addPartials({
      t, dur: 2.1, freq: midiHz(c.root), amp: 0.026, pan: 0,
      partials: [[1, 1, 1], [2, 0.4, 1], [3, 0.18, 1], [4, 0.09, 1], [6, 0.04, 1]],
      attack: 0.08, decay: 30, release: 0.25, vib: 0.0012, vibRate: 5.6, send: 0.3,
    });
    stringsPad(t, 2.05, c.notes.slice(1, 4), 0.014, { detune: 0.005, attack: 0.4, am: 0.55, amRate: 8.8, send: 0.55 });
    piano(t, c.root + 12, 0.042, -0.1, { dur: 1.9 });
  }
  piano(s, 50, 0.055, -0.1, { dur: 2.2 });
  piano(s + 0.5, 52, 0.052, 0.12, { dur: 2.2 });
  piano(s + 2, 52, 0.05, 0.12, { dur: 2 });
  piano(s + 2.5, 50, 0.046, -0.1, { dur: 2 });
  piano(s + 4, 50, 0.052, -0.1, { dur: 2 });
  piano(s + 4.5, 52, 0.05, 0.1, { dur: 2 });
  // A bright upright octave keeps the silent-film line present above the organ.
  piano(s + 0.5, 76, 0.024, 0.22, { dur: 1.6 });
  piano(s + 2.5, 74, 0.022, -0.22, { dur: 1.6 });
  piano(s + 4.5, 76, 0.022, 0.2, { dur: 1.6 });
  stringsPad(s, 6, [74, 81], 0.012, { attack: 0.9, harmonics: 6, send: 0.65 });
  for (let j = 0; j < 10; j += 1) {
    piano(s + 4.6 + j * 0.12, j % 2 ? 52 : 50, 0.024 + j * 0.0025, j % 2 ? 0.2 : -0.2, { dur: 0.35 });
  }
  bigDrum(s + 4.9, 0.035, 0);
  for (let j = 0; j < 8; j += 1) bigDrum(s + 5.1 + j * 0.1, 0.018 + j * 0.004, j % 2 ? 0.2 : -0.2);
  zap(s + 5.75, 0.018, 0.3);
}

function secScope(s) {
  crt(s, 6, 0.012);
  basses(s, 0.058);
  [0, 2, 4].forEach((o) => {
    kick(s + o, 0.052, 0, { f0: 80, f1: 38, decay: 0.22 });
    beep(s + o, midiHz(38), midiHz(38), 0.35, 0.04, 0, { decay: 0.28, send: 0.05 });
  });
  beep(s, midiHz(74), midiHz(74), 0.35, 0.1, -0.2, { decay: 0.22, send: 0.08 });
  beep(s + 0.5, midiHz(76), midiHz(76), 0.4, 0.098, 0.2, { decay: 0.25, send: 0.08 });
  beep(s + 2, midiHz(76), midiHz(76), 0.3, 0.09, 0.2, { decay: 0.18, send: 0.08 });
  beep(s + 2.5, midiHz(74), midiHz(74), 0.5, 0.085, -0.2, { decay: 0.3, send: 0.08 });
  // Knob-turn gag: the pitch bends into a Lissajous wobble and snaps back.
  beep(s + 3.05, midiHz(74) * 1.02, midiHz(60), 0.55, 0.07, 0.05, { decay: 0.5, ring: 31, vib: 0.06, vibRate: 19, send: 0.12 });
  beep(s + 3.05, midiHz(74) * 1.5, midiHz(88), 0.5, 0.032, -0.3, { decay: 0.45, ring: 23, send: 0.1 });
  beep(s + 3.65, midiHz(74), midiHz(74), 0.3, 0.1, 0.1, { decay: 0.18, send: 0.08 });
  beep(s + 4, midiHz(74), midiHz(74), 0.25, 0.09, -0.2, { decay: 0.14, send: 0.08 });
  beep(s + 4.25, midiHz(76), midiHz(76), 0.25, 0.09, 0.2, { decay: 0.14, send: 0.08 });
  beep(s + 4.5, midiHz(79), midiHz(79), 0.25, 0.085, -0.15, { decay: 0.14, send: 0.08 });
  beep(s + 4.75, midiHz(81), midiHz(81), 0.25, 0.08, 0.15, { decay: 0.14, send: 0.08 });
  beep(s + 5.0, midiHz(86), midiHz(86), 0.9, 0.075, 0, { decay: 0.5, send: 0.1 });
  for (let j = 0; j < 16; j += 1) tick(s + 4.4 + j * 0.09, 0.006, j % 2 ? 0.4 : -0.4);
}

function secPixel(s) {
  const roots = [barChordAt(s).root, barChordAt(s + 2).root, barChordAt(s + 4).root];
  for (let b = 0; b < 3; b += 1) {
    const t = s + b * 2;
    for (let j = 0; j < 8; j += 1) {
      chip({ t: t + j * 0.25, note: roots[b], dur: 0.22, amp: 0.075, pan: 0, duty: 0.5, type: 'tri', decay: 0.2, send: 0.06 });
    }
    for (let j = 0; j < 4; j += 1) {
      kick(t + j * 0.5, 0.095, 0);
      if (j % 2) snare(t + j * 0.5, 0.06, 0.1);
      hat(t + j * 0.5 + 0.25, 0.028, -0.2, 0.04);
    }
  }
  [[0, 74, 0.11], [0.5, 76, 0.105], [2, 76, 0.1], [2.5, 74, 0.092],
    [4, 74, 0.11], [4.5, 76, 0.105], [5, 81, 0.095]].forEach(([o, n, a]) => {
    chip({ t: s + o, note: n, dur: 0.42, amp: a, pan: -0.1, duty: 0.25, type: 'pulse', decay: 0.3, send: 0.12 });
    chip({ t: s + o, note: n - 12, dur: 0.38, amp: a * 0.35, pan: 0.2, duty: 0.5, type: 'pulse', decay: 0.3, send: 0.1 });
  });
  coin(s + 3, 0.075, 0.15);
  noiseBurst({ t: s + 3, dur: 0.3, amp: 0.02, f0: 7000, q: 0.7, attack: 0.001, decay: 0.12, send: 0.2, mode: 'hp' });
  for (let j = 0; j < 16; j += 1) {
    const n = [74, 76, 77, 81, 84, 86][j % 6];
    chip({ t: s + 4.1 + j * 0.11, note: n, dur: 0.1, amp: 0.05 + j * 0.002, pan: -0.35 + (j % 3) * 0.35, duty: 0.25, type: 'pulse', decay: 0.1, send: 0.1 });
  }
}

function secChat(s) {
  basses(s, 0.068);
  kick(s, 0.075, 0); kick(s + 1, 0.062, 0); kick(s + 2, 0.075, 0); kick(s + 3, 0.07, 0);
  kick(s + 4, 0.075, 0); kick(s + 5, 0.062, 0);
  [0.5, 1.5, 2.5, 3.5, 4.5, 5.5].forEach((o, i) => clap(s + o, 0.045, i % 2 ? 0.2 : -0.2));
  for (let j = 0; j < 12; j += 1) hat(s + j * 0.5 + 0.25, 0.016, 0.3, 0.04);
  // MIDI-style ringtone: the motif on a bright FM bell.
  fmBell(s, 86, 0.55, 0.08, -0.15, { ratio: 2, index: 3.2, decay: 0.5, send: 0.25 });
  fmBell(s + 0.5, 88, 0.65, 0.073, 0.15, { ratio: 2, index: 3.2, decay: 0.5, send: 0.25 });
  fmBell(s + 2, 88, 0.55, 0.07, 0.15, { ratio: 2, index: 3.2, decay: 0.5, send: 0.25 });
  fmBell(s + 2.5, 86, 0.6, 0.066, -0.15, { ratio: 2, index: 3.2, decay: 0.5, send: 0.25 });
  [86, 89, 93, 98].forEach((n, j) => {
    chip({ t: s + 4 + j * 0.12, note: n, dur: 0.15, amp: 0.045, pan: -0.3 + j * 0.2, duty: 0.5, type: 'pulse', decay: 0.2, send: 0.15 });
  });
  blip(s + 0.5, 0.045, 0.25);
  blip(s + 1.25, 0.038, -0.3);
  blip(s + 3, 0.06, 0.2);
  kick(s + 3, 0.09, 0.1, { f0: 90, f1: 38, decay: 0.3 });
  blip(s + 4.5, 0.042, -0.2);
  blip(s + 5.6, 0.036, 0.3);
  synthPad(s, 6, [50, 57, 62, 65, 69], 0.036, { attack: 0.8, pan: 0, send: 0.5 });
  synthPad(s, 6, [74, 81, 86], 0.018, { attack: 0.5, pan: 0, send: 0.4 });
}

function secVapor(s) {
  // The tape buffer is rendered and spliced in separately; this is the bed.
  addPartials({ t: s, dur: 6, freq: midiHz(38), amp: 0.02, pan: 0, partials: [[1, 1, 1], [2, 0.2, 1]], attack: 0.8, decay: 40, release: 0.8, send: 0.2 });
  chain(s, 6, 0.003, 1801);
}

function secVertical(s) {
  air(s, 6, 0.004, 1901);
  basses(s, 0.085);
  for (let j = 0; j < 12; j += 1) {
    const t = s + j * 0.5;
    kick(t, 0.105, 0);
    if (j % 2) clap(t, 0.052, 0.15);
    hat(t + 0.25, 0.022, -0.25, 0.04);
    if (j < 11) hat(t + 0.125, 0.01, 0.3, 0.03);
  }
  [74, 76, 76, 74, 74, 76, 81].forEach((n, j) => {
    const t = s + [0, 0.5, 2, 2.5, 4, 4.5, 5][j];
    chip({ t, note: n, dur: 0.45, amp: 0.085, pan: -0.1, duty: 0.25, type: 'pulse', decay: 0.35, send: 0.2 });
    synthPad(t, 0.9, [n - 24, n - 17, n - 12], 0.016, { attack: 0.05, release: 0.2, send: 0.4 });
  });
  for (let j = 0; j < 12; j += 1) {
    const c = barChordAt(s + (j < 4 ? 0 : j < 8 ? 2 : 4));
    bass(s + j * 0.5, c.root, 0.32, 0.055);
  }
  beep(s + 2.5, 1600, 1900, 0.08, 0.02, 0.35, { decay: 0.05, send: 0.2 });
  beep(s + 4.5, 1900, 2300, 0.08, 0.018, -0.35, { decay: 0.05, send: 0.2 });
  for (let j = 0; j < 8; j += 1) tick(s + 4.8 + j * 0.09, 0.006, j % 2 ? 0.4 : -0.4);
}

function secCode(s) {
  air(s, 6, 0.015, 2001);
  basses(s, 0.062);
  synthPad(s, 6, [50, 57, 60, 64, 65], 0.024, { attack: 0.6, send: 0.65 });
  piano(s, 74, 0.072, -0.15);
  piano(s + 0.5, 76, 0.068, 0.15);
  piano(s + 2, 76, 0.065, 0.18);
  piano(s + 2.5, 74, 0.058, 0.05);
  piano(s + 4, 74, 0.065, -0.15);
  piano(s + 4.5, 76, 0.065, 0.1);
  piano(s + 5, 81, 0.058, 0.2);
  for (let j = 0; j < 24; j += 1) tick(s + j * 0.25, 0.0045 + (j % 4 === 0 ? 0.002 : 0), j % 2 ? 0.35 : -0.35);
  bell(s + 2, 86, 0.02, 0.25, { decay: 2.2 });
  bell(s + 4, 88, 0.018, -0.25, { decay: 2.2 });
  timpani(s + 4, 0.035, 26, 0);
  // Resolve into the outro.
  bass(s + 5, 38, 0.95, 0.05);
  synthPad(s + 5, 1.0, [50, 57, 62, 64], 0.018, { attack: 0.2, release: 0.3, send: 0.6 });
}

function tanpura(t, dur, amp) {
  for (let b = 0; b < 3; b += 1) {
    const tt = t + b * 2;
    bass(tt, 38, 2.1, amp, -0.1);
    bass(tt, 45, 2.1, amp * 0.7, 0.1);
  }
  bass(t, 26, dur, amp * 0.5, 0);
}

const SECTIONS = [
  secSahara, secEgypt, secHan, secTang,
  secSong, secQingming, secMaya, secMughal,
  secBada, secWayang, secUkiyo, secVanGogh,
  secMunch, secNosferatu, secScope, secPixel,
  secChat, secVapor, secVertical, secCode,
];

// ---------------------------------------------------------------------------
// Transitions.

function transition(b, i) {
  const style = [
    'wind', 'reed', 'chisel', 'brush', 'air', 'page', 'log', 'tabla',
    'brush', 'gong', 'wood', 'string', 'bell', 'projector', 'zap', 'crt',
    'blip', 'tape', 'shutter', 'keys', 'ending',
  ][i];
  noiseBurst({
    t: b - 0.55, dur: 0.72, amp: 0.022, f0: 300, f1: 2600, q: 0.7,
    attack: 0.15, decay: 0.4, release: 0.08, sweep: 1, send: 0.25, seed: 3000 + i,
  });
  kick(b, 0.045, 0);
  if (style === 'wind') {
    noiseBurst({ t: b - 0.3, dur: 0.55, amp: 0.012, f0: 350, f1: 900, q: 0.7, attack: 0.2, decay: 0.5, sweep: 1, send: 0.2 });
    bikeBell(b + 0.02, 0.018, 0.3);
  } else if (style === 'reed') {
    reed(b + 0.04, 81, 0.12, 0.02, 0.2, { bend: 0.96 });
  } else if (style === 'chisel') {
    noiseBurst({ t: b + 0.01, dur: 0.05, amp: 0.022, pan: 0.2, f0: 2800, q: 2, attack: 0.0005, decay: 0.012, send: 0.15 });
  } else if (style === 'brush') {
    brush(b + 0.01, 0.014, -0.2);
  } else if (style === 'air') {
    noiseBurst({ t: b - 0.2, dur: 0.7, amp: 0.01, f0: 700, f1: 400, q: 0.6, attack: 0.3, decay: 0.6, send: 0.2 });
  } else if (style === 'page') {
    noiseBurst({ t: b + 0.01, dur: 0.3, amp: 0.018, pan: 0.1, f0: 1200, f1: 2600, q: 0.8, attack: 0.12, decay: 0.15, sweep: 1, send: 0.2 });
  } else if (style === 'log') {
    logDrum(b + 0.01, 0.05, -0.2);
    logDrum(b + 0.16, 0.035, 0.2);
  } else if (style === 'tabla') {
    tabla(b + 0.01, 0.045, 0.2, 'na');
    tabla(b + 0.14, 0.03, -0.2, 'tin');
  } else if (style === 'gong') {
    gong(b, 33, 0.035, 0, { dur: 2.5, decay: 1.8 });
  } else if (style === 'wood') {
    wood(b + 0.01, 0.03, 0.3, 1100);
  } else if (style === 'string') {
    stringsPad(b, 0.7, [62, 65, 69, 74], 0.02, { attack: 0.2, release: 0.4, send: 0.6 });
  } else if (style === 'bell') {
    bell(b + 0.01, 86, 0.028, 0.3, { decay: 1.8 });
  } else if (style === 'projector') {
    projector(b - 0.3, 0.55, 0.01);
  } else if (style === 'zap') {
    // The 14 -> 15 shadow is electrified.
    zap(b - 0.18, 0.021, 0.1);
  } else if (style === 'crt') {
    crt(b - 0.25, 0.5, 0.008);
    coin(b + 0.02, 0.025, -0.2);
  } else if (style === 'blip') {
    blip(b + 0.02, 0.026, 0.25);
  } else if (style === 'tape') {
    tapeClick(b - 0.05, 0.03, 0);
  } else if (style === 'shutter') {
    shutter(b + 0.01, 0.025, 0.2);
  } else if (style === 'keys') {
    for (let j = 0; j < 8; j += 1) tick(b - 0.2 + j * 0.045, 0.006, j % 2 ? 0.3 : -0.3);
  } else if (style === 'ending') {
    gong(b, 38, 0.045, 0, { dur: 4, decay: 3 });
    bikeBell(b + 0.05, 0.022, -0.2);
  }
}

// ---------------------------------------------------------------------------
// Intro and outro.

function renderIntro() {
  noiseBurst({
    t: 0, dur: 5, amp: 0.012, f0: 260, f1: 620, q: 0.7,
    attack: 1.2, decay: 25, release: 1, cutMod: 0.3, cutRate: 0.13, seed: 4001,
  });
  kick(0.02, 0.055, 0, { f0: 92, f1: 38, dur: 0.6, decay: 0.28 });
  kick(0.2, 0.032, 0);
  kick(0.62, 0.028, 0);
  [1, 2, 3, 4].forEach((t, i) => {
    kick(t, 0.052 - i * 0.005, 0, { decay: 0.18 });
    kick(t + 0.14, 0.028, 0, { decay: 0.14 });
  });
  stringsPad(0.4, 4.6, [38, 45, 50, 57], 0.026, { detune: 0.003, attack: 1.2, harmonics: 10, send: 0.55 });
  stringsPad(2.2, 2.8, [50, 57, 62, 65], 0.018, { detune: 0.004, attack: 1.0, send: 0.6 });
  piano(1, 62, 0.085, -0.1);
  piano(1.5, 64, 0.08, 0.1);
  piano(3, 64, 0.068, 0.15);
  piano(3.5, 62, 0.072, 0.15);
  bell(1, 86, 0.022, 0.3, { decay: 2.8 });
  bell(3, 88, 0.018, -0.3, { decay: 2.8 });
  bigDrum(4, 0.055, 0);
  noiseBurst({
    t: 4.2, dur: 0.78, amp: 0.028, f0: 400, f1: 2500, q: 0.8,
    attack: 0.2, decay: 1, release: 0.05, sweep: 1, send: 0.2, seed: 4002,
  });
  bikeBell(4.86, 0.03, 0.25);
}

function renderOutro() {
  const o = 125;
  stringsPad(o, 4.2, [50, 57, 60, 64, 65], 0.036, { attack: 0.8, detune: 0.003, send: 0.6 });
  stringsPad(o + 4, 4.2, [46, 53, 57, 62], 0.031, { attack: 0.9, detune: 0.003, send: 0.6 });
  stringsPad(o + 8, 4.2, [50, 57, 62, 65], 0.028, { attack: 0.9, detune: 0.003, send: 0.6 });
  piano(o, 62, 0.095, -0.12);
  piano(o + 0.5, 64, 0.09, 0.12);
  piano(o + 2, 64, 0.083, 0.15);
  piano(o + 2.5, 62, 0.077, 0.1);
  [62, 65, 69, 74].forEach((n, i) => harp(o + 1 + i * 0.25, n + 12, 0.018, i % 2 ? 0.3 : -0.3));
  // Camera push + press flashes.
  [127, 128, 129].forEach((t, i) => {
    shutter(t, 0.028 - i * 0.004, i % 2 ? 0.2 : -0.2);
    bigDrum(t, 0.028, 0);
  });
  reed(o + 2, 62, 0.7, 0.026, -0.25, { bend: 0.985 });
  reed(o + 2.5, 64, 0.8, 0.024, 0.25);
  gong(o + 4, 38, 0.035, 0, { dur: 4, decay: 2.6 });
  piano(o + 4, 62, 0.07, -0.15);
  piano(o + 4.5, 64, 0.068, 0.15);
  gamelan(o + 4.1, 74, 0.026, 0.3);
  shamisen(o + 4.6, 69, 0.022, -0.3, { dur: 0.8 });
  sitar(o + 5.1, 74, 0.02, 0.2, { dur: 0.9 });
  // Caption two: strip back.
  piano(o + 6, 62, 0.06, -0.1);
  piano(o + 7, 64, 0.055, 0.12);
  piano(o + 8, 62, 0.05, -0.1);
  harp(o + 7.5, 69, 0.02, 0.25);
  // Final note, the rider flashes past, a single bell.
  const f = 135;
  bass(f, 26, 1.9, 0.06, 0);
  piano(f, 50, 0.065, -0.1, { dur: 2.5 });
  piano(f + 0.04, 57, 0.05, 0.1, { dur: 2.4 });
  piano(f + 0.08, 62, 0.045, 0.15, { dur: 2.3 });
  bell(f, 86, 0.02, 0.2, { decay: 2.4, send: 0.6 });
  bikeBell(f + 0.2, 0.038, 0.15);
  stringsPad(f, 1.9, [50, 57, 62, 64], 0.02, { attack: 0.15, release: 0.6, send: 0.6 });
  // Tail handled by the master fade (135.9 -> 137).
}

// ---------------------------------------------------------------------------
// Vapourwave: a 151.2 BPM smooth-jazz source in F-sharp, played back at 0.7937
// through a tape chain (lowpass, wow, hiss), with a half-beat stutter.

function epiano(t, note, dur, amp, pan) {
  const f = midiHz(note);
  const start = Math.round(t * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  if (len <= 0) return;
  const L = OUT.L;
  const R = OUT.R;
  const S = OUT.S;
  const S2 = OUT.S2;
  const [gl, gr] = panGains(pan);
  const atk = Math.max(1, Math.floor(0.005 * SR));
  const dk = Math.exp(-1 / (0.9 * SR));
  let car = 0;
  let mod = 0;
  let m = 1;
  for (let i = 0; i < len; i += 1) {
    const x = i / SR;
    mod += (TAU * f) / SR;
    car += (TAU * f) / SR;
    const idx = 1.1 + 1.9 * Math.exp(-x / 0.35);
    let env = m;
    if (i < atk) env *= i / atk;
    const rem = len - i;
    const rel = Math.max(1, Math.floor(0.12 * SR));
    if (rem < rel) env *= rem / rel;
    const s = Math.sin(car + idx * Math.sin(mod)) * env * amp;
    L[start + i] += s * gl;
    R[start + i] += s * gr;
    if (S) S[start + i] += s * gl * 0.55;
    if (S2) S2[start + i] += s * gr * 0.55;
    m *= dk;
  }
}

function sax(t, note, dur, amp, pan) {
  const f = midiHz(note);
  const partials = [];
  for (let n = 1; n <= 12; n += 1) {
    const form = n === 4 || n === 5 ? 1.5 : n === 8 ? 1.2 : 1;
    partials.push([n, (1 / Math.pow(n, 1.05)) * form, 1]);
  }
  addPartials({
    t, dur, freq: f, amp, pan, partials,
    attack: 0.06, decay: 18, release: 0.25, vib: 0.006, vibRate: 5.2,
    glide: 0.992, glideTime: 0.18, send: 0.6,
  });
  noiseBurst({ t, dur: Math.min(dur, 1.5), amp: amp * 0.12, pan, f0: 2400, q: 1.4, attack: 0.08, decay: 10, release: 0.2, send: 0.4 });
}

function fretless(t, note, dur, amp, pan) {
  addPartials({
    t, dur, freq: midiHz(note), amp, pan,
    partials: [[1, 1, 1], [2, 0.42, 0.85], [3, 0.12, 0.6]],
    attack: 0.04, decay: 10, release: 0.2, vib: 0.003, vibRate: 4.2,
    glide: 0.985, glideTime: 0.12, send: 0.3,
  });
}

function renderVaporSource() {
  const V = Math.round(SR * 7);
  const vL = new Float32Array(V);
  const vR = new Float32Array(V);
  const vS = new Float32Array(V);
  const vS2 = new Float32Array(V);
  const prev = OUT;
  OUT = { L: vL, R: vR, S: vS, S2: vS2 };

  const bar = (60 / 151.2) * 4; // 1.5873 s
  const starts = [0, bar, bar * 2, bar * 3, bar * 4];
  const chords = [[52, 56, 59, 64], [54, 57, 61, 64, 68], [47, 50, 54, 57, 61], [52, 56, 59, 64], [52, 56, 59, 64]];
  const roots = [40, 42, 35, 40, 40];

  for (let b = 0; b < 4; b += 1) {
    const t = starts[b];
    chords[b].forEach((n, j) => epiano(t + j * 0.012, n, 1.45, 0.038, -0.35 + j * 0.22));
    fretless(t, roots[b], 1.45, 0.075, -0.05);
    // Gated-reverb 80s kit.
    kick(t, 0.06, 0, { f0: 100, f1: 45, decay: 0.18 });
    kick(t + bar / 2, 0.055, 0, { f0: 100, f1: 45, decay: 0.18 });
    snare(t + bar / 4, 0.05, 0.1);
    snare(t + (bar * 3) / 4, 0.05, 0.1);
    for (let j = 0; j < 8; j += 1) hat(t + j * (bar / 8), j % 2 ? 0.012 : 0.02, 0.25, 0.04);
    for (let j = 0; j < 4; j += 1) {
      tabla(t + j * (bar / 4) + bar / 8, 0.018, -0.3, 'tin');
    }
  }

  // Sax motif, a fourth up so the tape lands back on D-E.
  sax(starts[0], 66, 0.42, 0.06, -0.05);
  sax(starts[0] + 0.397, 68, 0.52, 0.058, 0.05);
  sax(starts[1] + 0.05, 68, 0.4, 0.055, 0.1);
  sax(starts[1] + 0.45, 66, 0.5, 0.052, 0.05);
  sax(starts[2] + 0.08, 69, 0.35, 0.05, 0);
  sax(starts[2] + 0.42, 71, 0.35, 0.05, 0.1);
  sax(starts[2] + 0.78, 73, 0.45, 0.048, 0.15);
  sax(starts[3] + 0.05, 66, 0.4, 0.055, -0.05);
  sax(starts[3] + 0.45, 68, 0.5, 0.052, 0.05);

  // Source reverb.
  const wL = new Float32Array(V);
  const wR = new Float32Array(V);
  reverb(vS, vS2, wL, wR, V, { feedback: 0.72, damp: 0.4, out: 0.11 });
  for (let i = 0; i < V; i += 1) { vL[i] += wL[i] * 0.9; vR[i] += wR[i] * 0.9; }

  OUT = prev;
  return { L: vL, R: vR, len: V };
}

function resampleVapor(src) {
  const outLen = Math.round(6 * SR);
  const tL = new Float32Array(outLen);
  const tR = new Float32Array(outLen);
  const base = Math.pow(2, -4 / 12); // 0.7937
  let pos = 0;
  for (let i = 0; i < outLen; i += 1) {
    const u = i / SR;
    let rate = base;
    if (u < 0.6) rate = base + (1 - base) * Math.exp(-u / 0.18);
    if (u > 5.4) rate = base + (1 - base) * Math.exp(-(6 - u) / 0.18);
    rate *= 1 + 0.0018 * Math.sin(TAU * 0.5 * u) + 0.0007 * Math.sin(TAU * 1.7 * u + 1.3);
    pos += rate;
    const idx = Math.floor(pos);
    if (idx >= src.len - 2) break;
    const f = pos - idx;
    tL[i] = src.L[idx] + (src.L[idx + 1] - src.L[idx]) * f;
    tR[i] = src.R[idx] + (src.R[idx + 1] - src.R[idx]) * f;
  }
  // Two-pole 4 kHz lowpass, then a 35 Hz highpass.
  let l1 = 0; let l2 = 0; let r1 = 0; let r2 = 0;
  const a = 1 - Math.exp(-TAU * 3800 / SR);
  const hp = 1 - Math.exp(-TAU * 35 / SR);
  let hl = 0; let hr = 0;
  for (let i = 0; i < outLen; i += 1) {
    l1 += a * (tL[i] - l1); l2 += a * (l1 - l2); tL[i] = l2;
    r1 += a * (tR[i] - r1); r2 += a * (r1 - r2); tR[i] = r2;
    hl += hp * (tL[i] - hl); tL[i] -= hl;
    hr += hp * (tR[i] - hr); tR[i] -= hr;
  }
  // Half-beat stutter in bar 2 (absolute 109.35 -> 110.15).
  const st = Math.round(2.35 * SR);
  const chunk = Math.round(0.2 * SR);
  const copyL = tL.slice(st, st + chunk);
  const copyR = tR.slice(st, st + chunk);
  for (let k = 0; k < 4; k += 1) {
    const off = st + k * chunk;
    for (let j = 0; j < chunk; j += 1) {
      const g = Math.min(1, j / (0.003 * SR)) * Math.min(1, (chunk - j) / (0.003 * SR));
      tL[off + j] = copyL[j] * g;
      tR[off + j] = copyR[j] * g;
    }
  }
  return { L: tL, R: tR };
}

function spliceVapor() {
  const src = renderVaporSource();
  const tape = resampleVapor(src);
  const start = Math.round(107 * SR);
  const gain = 0.9;
  for (let i = 0; i < tape.L.length; i += 1) {
    dryL[start + i] += tape.L[i] * gain;
    dryR[start + i] += tape.R[i] * gain;
    sendL[start + i] += tape.L[i] * gain * 0.35;
    sendR[start + i] += tape.R[i] * gain * 0.35;
  }
  // Tape hiss under the section.
  noiseBurst({
    t: 107, dur: 6, amp: 0.0022, f0: 4800, q: 0.5,
    attack: 0.3, decay: 30, release: 0.3, send: 0, mode: 'hp', seed: 5001,
  });
  tapeClick(109.35, 0.018, 0);
  tapeClick(110.0, 0.014, 0.15);
  tapeClick(110.15, 0.016, 0);
}

// ---------------------------------------------------------------------------
// Reverb and master.

function reverb(inL, inR, outL, outR, len, o = {}) {
  const feedback = o.feedback ?? 0.86;
  const damp = o.damp ?? 0.22;
  const out = o.out ?? 0.105;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [225, 556, 441, 341];
  for (let ch = 0; ch < 2; ch += 1) {
    const inp = ch === 0 ? inL : inR;
    const outp = ch === 0 ? outL : outR;
    const pre = Math.round(0.024 * SR);
    for (let ci = 0; ci < combs.length; ci += 1) {
      const d = Math.round((combs[ci] * SR) / 44100) + ch * 17 + ci * 3;
      const buf = new Float32Array(d);
      let idx = 0;
      let filt = 0;
      const fb = feedback - ci * 0.004;
      for (let i = 0; i < len; i += 1) {
        const x = i >= pre ? inp[i - pre] : 0;
        const y = buf[idx];
        filt = y * (1 - damp) + filt * damp;
        buf[idx] = x + filt * fb;
        outp[i] += y * out;
        idx += 1;
        if (idx >= d) idx = 0;
      }
    }
    for (let ai = 0; ai < aps.length; ai += 1) {
      const d = Math.round((aps[ai] * SR) / 44100) + ch * 11;
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < len; i += 1) {
        const x = outp[i];
        const y = buf[idx];
        buf[idx] = x + y * 0.5;
        outp[i] = y - x;
        idx += 1;
        if (idx >= d) idx = 0;
      }
    }
  }
}

// Mix automation, in dB, one value per cue: intro, s01..s20, outro.
// The raw synth balance is bright and mid-forward; these rides give the film
// its shape: restrained early, a build from Van Gogh, a peak at 8-bit/chat,
// a tape-flattened strip-back, and a quiet resolve.
const SECTION_DB = [
  -2.2, -3.7, -3.6, -2.3, -3.3, -3.5, -1.9, -2.8, -2.7, -0.9,
  -2.4, 0.7, -5.2, -0.6, -1.0, 2.6, 2.8, 3.9, -1.1, -0.3, -4.3, -2.0,
];

const CUE_TIMES = [0, 5];
for (let i = 0; i < 20; i += 1) CUE_TIMES.push(11 + i * 6);
CUE_TIMES.push(137);

function automationDb(t) {
  if (t <= CUE_TIMES[0]) return SECTION_DB[0];
  let i = 0;
  while (i + 1 < CUE_TIMES.length && t >= CUE_TIMES[i + 1]) i += 1;
  const cur = SECTION_DB[Math.min(i, SECTION_DB.length - 1)];
  // 100 ms crossfade centred on each cue boundary, so the continuous pedal and
  // air never step.
  if (i > 0) {
    const b = CUE_TIMES[i];
    if (t < b + 0.05) {
      const prev = SECTION_DB[i - 1];
      const k = clamp((t - (b - 0.05)) / 0.1, 0, 1);
      return prev + (cur - prev) * k;
    }
  }
  if (i + 1 < CUE_TIMES.length && i + 1 < SECTION_DB.length) {
    const nb = CUE_TIMES[i + 1];
    if (t > nb - 0.05) {
      const next = SECTION_DB[i + 1];
      const k = clamp((t - (nb - 0.05)) / 0.1, 0, 1);
      return cur + (next - cur) * k;
    }
  }
  return cur;
}

function master() {
  const wetL = new Float32Array(N);
  const wetR = new Float32Array(N);
  reverb(sendL, sendR, wetL, wetR, N);

  const finalL = new Float32Array(N);
  const finalR = new Float32Array(N);

  // Highpass the wet path lightly, sum, remove sub-32 Hz rumble, compress.
  let hL = 0;
  let hR = 0;
  const a = 1 - Math.exp(-TAU * 150 / SR);
  let hpL1 = 0;
  let hpL2 = 0;
  let hpR1 = 0;
  let hpR2 = 0;
  const hpA = 1 - Math.exp(-TAU * 32 / SR);
  let env = 0;
  let gain = 1;
  const atk = 1 - Math.exp(-1 / (0.008 * SR));
  const rel = 1 - Math.exp(-1 / (0.25 * SR));
  const thresh = 0.22;
  for (let i = 0; i < N; i += 1) {
    hL += a * (wetL[i] - hL);
    hR += a * (wetR[i] - hR);
    let l = dryL[i] + (wetL[i] - hL) * 0.62;
    let r = dryR[i] + (wetR[i] - hR) * 0.62;
    hpL1 += hpA * (l - hpL1);
    l -= hpL1;
    hpL2 += hpA * (l - hpL2);
    l -= hpL2;
    hpR1 += hpA * (r - hpR1);
    r -= hpR1;
    hpR2 += hpA * (r - hpR2);
    r -= hpR2;
    if (i < 0.01 * SR) {
      const g = i / (0.01 * SR);
      l *= g; r *= g;
    }
    const peak = Math.max(Math.abs(l), Math.abs(r));
    if (peak > env) env += (peak - env) * atk;
    else env += (peak - env) * rel;
    const over = env / thresh;
    const target = over > 1 ? Math.pow(over, -0.55) : 1;
    gain += (target - gain) * (target < gain ? 0.0025 : 0.00012);
    l *= gain; r *= gain;
    finalL[i] = l;
    finalR[i] = r;
  }

  // Cue automation, soft ceiling, then normalise to -1.5 dBFS.
  const limit = (x) => (Math.abs(x) > 0.8
    ? Math.sign(x) * (0.8 + 0.2 * Math.tanh((Math.abs(x) - 0.8) / 0.2))
    : x);
  let peak = 0;
  for (let i = 0; i < N; i += 1) {
    const g = Math.pow(10, automationDb(i / SR) / 20);
    const l = limit(finalL[i] * g);
    const r = limit(finalR[i] * g);
    finalL[i] = l;
    finalR[i] = r;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
  }
  const norm = Math.pow(10, -1.5 / 20) / peak;
  let sum = 0;
  for (let i = 0; i < N; i += 1) {
    finalL[i] *= norm;
    finalR[i] *= norm;
    sum += finalL[i] * finalL[i] + finalR[i] * finalR[i];
  }

  // Tail fade: silence by 137.0.
  const fadeStart = 135.9;
  const fadeLen = DUR - fadeStart;
  for (let i = Math.round(fadeStart * SR); i < N; i += 1) {
    const x = (i / SR - fadeStart) / fadeLen;
    const g = Math.pow(Math.max(0, 1 - x), 2.2);
    finalL[i] *= g;
    finalR[i] *= g;
  }
  finalL[N - 1] = 0;
  finalR[N - 1] = 0;

  return { L: finalL, R: finalR, peak: db(peak * norm), rms: db(Math.sqrt(sum / (2 * N))) };
}

// ---------------------------------------------------------------------------
// WAV.

function writeWav(path, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  const r = rng(0x51ed270b);
  for (let i = 0; i < n; i += 1) {
    const d1 = r() - r();
    const d2 = r() - r();
    const tail = i >= n - 2;
    const l = tail ? 0 : clamp(L[i] + d1 / 32768, -1, 1);
    const rr = tail ? 0 : clamp(R[i] + d2 / 32768, -1, 1);
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(rr * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

// ---------------------------------------------------------------------------
// Score.

function score() {
  // A very quiet D pedal and room tone hold the film together.
  addPartials({
    t: 0, dur: DUR, freq: midiHz(26), amp: 0.012, pan: 0,
    partials: [[1, 1, 1], [2, 0.18, 1]], attack: 2, decay: 220,
    release: 1.2, vib: 0.0008, vibRate: 0.07, send: 0.12,
  });
  noiseBurst({
    t: 0, dur: DUR, amp: 0.0028, f0: 700, f1: 1100, q: 0.5,
    attack: 2, decay: 400, release: 2, cutMod: 0.3, cutRate: 0.05, send: 0, seed: 6001,
  });

  renderIntro();

  SECTIONS.forEach((fn, i) => fn(5 + i * 6));

  // Transitions at every frame crossing, plus the final crossing into the outro.
  for (let i = 0; i <= 20; i += 1) transition(5 + i * 6, i);

  // The gag SFX live inside their era functions so the picture and sound
  // share one cue sheet; here we only splice the tape insert.
  spliceVapor();

  renderOutro();

  return master();
}

const t0 = Date.now();
const result = score();
const { L, R, peak, rms } = result;

// Per-cue RMS, printed for balance checks.
const rows = [];
const spans = [['intro', 0, 5]];
for (let i = 0; i < 20; i += 1) spans.push([`s${String(i + 1).padStart(2, '0')}`, 5 + i * 6, 11 + i * 6]);
spans.push(['outro', 125, 137]);
for (const [label, s, e] of spans) {
  const a = Math.round(s * SR);
  const b = Math.min(N, Math.round(e * SR));
  let sum = 0;
  for (let i = a; i < b; i += 1) sum += L[i] * L[i] + R[i] * R[i];
  rows.push([label, db(Math.sqrt(sum / (2 * (b - a))))]);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeWav(OUT_PATH, L, R);

console.log(`wrote ${OUT_PATH}`);
console.log(`duration ${(N / SR).toFixed(3)} s  rate ${SR}  channels 2  pcm_s16le`);
console.log(`peak ${peak.toFixed(2)} dBFS   rms ${rms.toFixed(2)} dBFS`);
console.log(`render ${(Date.now() - t0) / 1000}s`);
console.log(rows.map(([label, v]) => `${label.padEnd(6)} ${v.toFixed(1)} dB`).join('\n'));
