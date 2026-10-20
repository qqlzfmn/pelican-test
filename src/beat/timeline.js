// Musical + editorial clock.
//
// 120 BPM, 4/4 => one beat = 0.5 s, one bar = 2 s.
// The film opens with a half-bar pickup, so the first downbeat is at t = 1 s.
// Intro = 2 bars (+ pickup) = 5 s. Every era = 3 bars = 6 s. Outro = 6 bars = 12 s.
// Total 2:17 (137 s), and every frame crossing lands on a strong beat.

export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2 s
export const PICKUP = BAR / 2; // 1 s
export const INTRO_BARS = 2;
export const SECTION_BARS = 3;
export const OUTRO_BARS = 6;
export const SECTION_COUNT = 20;

export const INTRO_END = PICKUP + INTRO_BARS * BAR; // 5
export const SECTION_LEN = SECTION_BARS * BAR; // 6
export const SECTIONS_START = INTRO_END; // 5
export const OUTRO_START = SECTIONS_START + SECTION_COUNT * SECTION_LEN; // 125
export const DURATION = OUTRO_START + OUTRO_BARS * BAR; // 137
export const FPS = 60; // decided after the 30/60 fps pan test (see README)

export const mod = (a, n) => ((a % n) + n) % n;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => {
  const x = clamp(k);
  return x * x * (3 - 2 * x);
};

export const sectionStart = (i) => SECTIONS_START + i * SECTION_LEN;
export const sectionEnd = (i) => sectionStart(i) + SECTION_LEN;

// Nearest strong beat (half-note pulse: beats 0 and 2 of every bar).
// Strong beats after the pickup sit on every whole second: 1, 2, 3, ...
export function strongPulse(t, decay = 0.16) {
  if (t < PICKUP) return 0;
  const nearest = Math.max(PICKUP, Math.round(t));
  return Math.exp(-Math.abs(t - nearest) / decay);
}

// Nearest bar downbeat (1, 3, 5, ...). Used for frame crossings.
export function downbeatPulse(t, decay = 0.16) {
  if (t < PICKUP) return 0;
  const nearest = PICKUP + 2 * Math.round((t - PICKUP) / 2);
  return Math.exp(-Math.abs(t - nearest) / decay);
}

export function timeInBar(t) {
  return mod(t - PICKUP, BAR) / BAR;
}

export function beatPhase(t) {
  return mod((t - PICKUP) / BEAT, 1);
}

export function clock(t) {
  const totalBeats = (t - PICKUP) / BEAT;
  return {
    bar: Math.floor((t - PICKUP) / BAR),
    beat: Math.floor(totalBeats),
    beatInBar: Math.floor(mod(totalBeats, 4)),
    phase: mod(totalBeats, 1),
    strong: strongPulse(t),
    downbeat: downbeatPulse(t),
  };
}

export function sectionAt(t) {
  const time = clamp(t, 0, DURATION - 1e-6);
  if (time < INTRO_END) {
    return {
      kind: 'intro',
      index: -1,
      start: 0,
      end: INTRO_END,
      duration: INTRO_END,
      local: time,
      number: null,
    };
  }
  if (time >= OUTRO_START) {
    return {
      kind: 'outro',
      index: SECTION_COUNT,
      start: OUTRO_START,
      end: DURATION,
      duration: DURATION - OUTRO_START,
      local: time - OUTRO_START,
      number: null,
    };
  }
  const i = Math.min(
    SECTION_COUNT - 1,
    Math.floor((time - SECTIONS_START) / SECTION_LEN),
  );
  const start = sectionStart(i);
  return {
    kind: 'section',
    index: i,
    start,
    end: start + SECTION_LEN,
    duration: SECTION_LEN,
    local: time - start,
    number: i + 1,
  };
}

// All frame-crossing times, including intro->1 and 20->outro.
export const BOUNDARIES = [
  SECTIONS_START,
  ...Array.from({ length: SECTION_COUNT - 1 }, (_, i) => sectionStart(i + 1)),
  OUTRO_START,
];

export function boundaryNear(t, window = 0.32) {
  let best = null;
  let bestDist = Infinity;
  for (const b of BOUNDARIES) {
    const d = Math.abs(t - b);
    if (d <= window && d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best;
}

export function timecode(t) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
