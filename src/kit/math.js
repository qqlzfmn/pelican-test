// Small deterministic math helpers. No Math.random in drawing code.

export const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFor(seed) {
  return mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
}

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
export const smoothstep = (a, b, x) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
export const smooth = (k) => {
  const x = clamp(k);
  return x * x * (3 - 2 * x);
};
export const easeInOut = (k) => {
  const x = clamp(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);

// Smooth 1D value noise in [-1, 1], deterministic.
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const r = rngFor(seed + i * 374761393);
  const a = r() * 2 - 1;
  const b = rngFor(seed + (i + 1) * 374761393)() * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u);
}

export function fbm1(x, seed = 0, octaves = 3) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise1(x * freq, seed + i * 101) * amp;
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}
