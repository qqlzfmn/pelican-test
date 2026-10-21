// 20 — code aesthetic. A dark editor types out the rig while the SVG preview
// strokes the pelican and bicycle into being. Editor chrome, paper and panels
// are cached; only code text, diagnostics, the cursor and the live drawing move.
//
// The rider is painted from the shared rig pose in pen-and-ink linework, so the
// final frame is a finished drawing rather than a dark placeholder.

import { basePalette } from './_placeholder.js';
import { alpha, mix } from '../kit/color.js';
import { cachedLayer } from '../kit/cache.js';
import {
  clamp, smoothstep, easeOut, lerp, TAU, rngFor,
} from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { makeView } from '../main/camera.js';
import { CN_FONT, setFont } from '../kit/cards.js';

const pal = basePalette({
  bg: '#0d1117', bg2: '#111823', motif: '#58a6ff', accent: '#7ee787',
  ink: '#c9d1d9', titleInk: '#e6edf3', scrim: '#000000', ground: '#0a0f16',
  road: '#131b26', dash: '#58a6ff', body: '#e6edf3', beak: '#ffa657',
  rigInk: '#0b0f14',
});

// ---------------------------------------------------------------- constants

const MONO = '"SF Mono", Menlo, "DejaVu Sans Mono", monospace';
const CJK = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif';
const UI = '"Helvetica Neue", "SF Pro Text", Arial, sans-serif';

const BG = '#0d1117';
const PANEL = '#161b22';
const PANEL2 = '#0f141b';
const BORDER = '#21262d';
const BORDER2 = '#30363d';
const TEXT = '#c9d1d9';
const DIM = '#8b949e';
const MUTE = '#6e7681';
const COMMENT = '#7d8590';
const BLUE = '#58a6ff';
const GREEN = '#7ee787';
const ORANGE = '#ffa657';
const LINE_NO = '#484f58';

const WIN = { x0: -378, y0: 40, x1: 1378, y1: 950 };
const GUTTER_X = -318;
const CODE_X = -300;
const CODE_RIGHT = 414;
const PREVIEW_X = 420;
const PREVIEW_RIGHT = 1080;
const LAYERS_X = 1080;
const CODE_TOP = 182;
const LH = 38;
const FS = 25;

const ART = { x: 440, y: 190, w: 600, h: 566 };
const OX = 726;
const OY = 660;
const K = 1.5;

const INK = '#1f2733';
const INK2 = '#46525f';
const PAPER = '#f2ecdc';
const CREAM = '#fdfaf0';
const WING = '#e9dcc2';
const BEAK = '#d5892f';
const POUCH = '#eaa552';
const LEG = '#c4873c';
const LEG_INK = '#8a6a44';

// ---------------------------------------------------------------- copy

const CODE_LINES = [
  {
    start: 0.28, end: 0.74,
    tokens: [
      ['import', ORANGE], [' { ', TEXT], ['pelican', BLUE], [' } ', TEXT],
      ['from', ORANGE], [' ', TEXT], ["'./rig/s20.js'", GREEN], [';', TEXT],
    ],
  },
  {
    start: 0.80, end: 0.98,
    tokens: [
      ['const ', ORANGE], ['dignity', TEXT], [' = ', TEXT], ['0', BLUE], [';', TEXT],
    ],
  },
  {
    start: 1.04, end: 1.30,
    tokens: [
      ['pelican', BLUE], ['.', TEXT], ['stroke', BLUE], ['({', TEXT],
    ],
  },
  {
    start: 1.36, end: 1.66,
    tokens: [
      ['  wheels', TEXT], [': ', TEXT], ['svg', BLUE], ['.', TEXT],
      ['circle', BLUE], ['(', TEXT], ['50', BLUE], ['),', TEXT],
    ],
  },
  {
    start: 1.72, end: 2.02,
    tokens: [
      ['  frame', TEXT], [':  ', TEXT], ['svg', BLUE], ['.', TEXT],
      ['path', BLUE], ['(', TEXT], ['FRAME', TEXT], ['),', TEXT],
    ],
  },
  {
    start: 2.06, end: 2.32,
    tokens: [
      ['  wings', TEXT], [':  ', TEXT], ['svg', BLUE], ['.', TEXT],
      ['feathers', BLUE], ['(', TEXT], ['9', BLUE], [')', TEXT],
    ],
  },
  {
    start: 2.34, end: 2.42,
    tokens: [['});', TEXT]],
  },
  { start: 0, end: 0, blank: true },
  {
    start: 2.48, end: 3.00,
    tokens: [
      ['// TODO: ', COMMENT, 'italic'],
      ['不要被牛群发现', COMMENT, 'cn'],
    ],
  },
  {
    start: 3.25, end: 3.60,
    tokens: [
      ['while', ORANGE], [' (', TEXT], ['cows', TEXT], ['.', TEXT],
      ['nearby', BLUE], [') ', TEXT], ['hide', BLUE], ['();', TEXT],
    ],
  },
  {
    start: 3.68, end: 4.12,
    tokens: [
      ['export', ORANGE], [' ', TEXT], ['default', ORANGE], [' ', TEXT],
      ['pelican', BLUE], ['.', TEXT], ['ride', BLUE], ['();', TEXT],
    ],
  },
];

const LAYERS = [
  ['svg#rig', (S) => true],
  ['g#wheels', (S) => S.wheel > 0.92],
  ['g#frame', (S) => S.frame > 0.92],
  ['path#body', (S) => S.body > 0.92],
  ['g#wings', (S) => S.wing > 0.9],
  ['path#beak', (S) => S.beak > 0.85],
  ['path#pouch', (S) => S.beak > 0.97],
  ['g#legs', (S) => S.legs > 0.88],
  ['text#credit', (S) => S.detail > 0.8],
];

// ---------------------------------------------------------------- scene

export default {
  id: 's20',
  number: 20,
  cn: '代码美学',
  en: 'Code Aesthetic',
  year: '2020s · 大模型时代',
  palette: pal,

  camera(g) {
    return makeView(g, { cx: 500, cy: 500, zoom: 1 });
  },

  draw(g, ctx) {
    const c = g.drawingContext;
    const layer = cachedLayer(ctx, 's20-editor', drawChrome, {
      x0: -800, y0: -150, w: 2400, h: 1250,
    });
    c.drawImage(layer.canvas, -800, -150, 2400, 1250);

    const S = stages(ctx.local);
    drawCode(g, ctx, S);
    drawPreview(g, ctx, S);
    drawLayers(g, ctx, S);
    drawDiagnostics(g, ctx);
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawCodeTitle(g, opacity, lift);
  },
};

function stages(local) {
  const sp = (a, b) => clamp((local - a) / (b - a));
  return {
    wheel: sp(0.95, 1.74),
    rim: sp(1.38, 1.98),
    frame: sp(1.66, 2.44),
    body: sp(1.84, 2.4),
    neck: sp(1.98, 2.5),
    head: sp(2.3, 2.72),
    beak: sp(2.42, 2.96),
    wing: sp(2.54, 3.2),
    legs: sp(2.46, 3.12),
    detail: sp(3.6, 4.7),
    color: sp(3.9, 5.05),
    guides: 1 - smoothstep(3.5, 4.65, local),
    sel: 1 - smoothstep(4.45, 5.1, local),
    local,
  };
}

// ---------------------------------------------------------------- chrome

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

function drawChrome(g, c) {
  // ------------------------------------------------------------ backdrop
  const gr = c.createRadialGradient(640, 240, 80, 560, 520, 1500);
  gr.addColorStop(0, '#16202c');
  gr.addColorStop(0.42, '#0e151e');
  gr.addColorStop(1, '#080b10');
  c.fillStyle = gr;
  c.fillRect(-800, -150, 2400, 1250);

  // faint blueprint dot grid across the bleed
  c.fillStyle = 'rgba(90, 130, 170, 0.10)';
  for (let y = -140; y < 1100; y += 46) {
    for (let x = -800; x < 1600; x += 46) {
      c.fillRect(x, y, 1.4, 1.4);
    }
  }

  // a cold glow behind the window, and a warm glow near the paper
  const glow = c.createRadialGradient(760, 430, 20, 760, 430, 720);
  glow.addColorStop(0, 'rgba(88, 166, 255, 0.075)');
  glow.addColorStop(1, 'rgba(88, 166, 255, 0)');
  c.fillStyle = glow;
  c.fillRect(-800, -150, 2400, 1250);

  // ------------------------------------------------------------ window
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.7)';
  c.shadowBlur = 70;
  c.shadowOffsetY = 26;
  c.fillStyle = BG;
  rr(c, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 8);
  c.fill();
  c.restore();

  c.save();
  rr(c, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 8);
  c.clip();

  // title bar
  c.fillStyle = PANEL;
  c.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, 50);
  c.fillStyle = BORDER;
  c.fillRect(WIN.x0, 89, WIN.x1 - WIN.x0, 1);

  // traffic lights
  const dots = [ORANGE, GREEN, BLUE];
  dots.forEach((col, i) => {
    c.fillStyle = mix(col, PANEL, 0.28);
    c.beginPath();
    c.arc(-354 + i * 20, 65, 5.2, 0, TAU);
    c.fill();
  });

  // breadcrumb
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  setFont(c, 12.5, 400, UI, '0.2px');
  const crumbs = [
    ['pelican', DIM], [' / ', MUTE], ['src', DIM], [' / ', MUTE],
    ['scenes', DIM], [' / ', MUTE], ['s20_code.js', TEXT],
  ];
  let bx = -286;
  for (const [s, col] of crumbs) {
    c.fillStyle = col;
    c.fillText(s, bx, 70);
    bx += c.measureText(s).width;
  }

  setFont(c, 11.5, 400, UI, '1.4px');
  c.textAlign = 'right';
  c.fillStyle = MUTE;
  c.fillText('SVG  ·  UTF-8  ·  120 BPM', 1362, 70);

  // tabs
  c.textAlign = 'left';
  const tabs = [
    ['s20_code.js', BLUE, true],
    ['pelican.svg', GREEN, false],
    ['preview.svg', ORANGE, false],
  ];
  c.fillStyle = BG;
  c.fillRect(WIN.x0, 90, WIN.x1 - WIN.x0, 42);
  c.fillStyle = BORDER;
  c.fillRect(WIN.x0, 131, WIN.x1 - WIN.x0, 1);

  // active tab plate
  c.fillStyle = '#10161e';
  c.fillRect(WIN.x0, 90, 186, 41);
  c.fillStyle = BLUE;
  c.fillRect(WIN.x0, 90, 186, 2);
  c.fillStyle = BORDER;
  c.fillRect(-204, 90, 1, 41);

  tabs.forEach(([label, col, active], i) => {
    const x = i === 0 ? -368 : i === 1 ? -182 : -54;
    c.fillStyle = col;
    rr(c, x, 106, 8, 8, 1.6);
    c.fill();
    setFont(c, 13, active ? 500 : 400, MONO, '0px');
    c.fillStyle = active ? TEXT : MUTE;
    c.fillText(label, x + 15, 115);
    if (active) {
      c.fillStyle = ORANGE;
      c.beginPath();
      c.arc(x + 15 + c.measureText(label).width + 12, 111, 2.6, 0, TAU);
      c.fill();
    }
  });
  setFont(c, 14, 400, UI, '0px');
  c.fillStyle = MUTE;
  c.fillText('⋯', 1362, 117);

  // ------------------------------------------------------------ panes
  c.fillStyle = BG;
  c.fillRect(WIN.x0, 132, WIN.x1 - WIN.x0, 770);

  // gutter
  c.fillStyle = BG;
  c.fillRect(WIN.x0, 132, GUTTER_X - WIN.x0, 770);
  c.fillStyle = BORDER;
  c.fillRect(GUTTER_X, 132, 1, 770);

  // line numbers
  c.textAlign = 'right';
  setFont(c, 15, 400, MONO, '0px');
  c.fillStyle = LINE_NO;
  for (let i = 0; i < CODE_LINES.length; i += 1) {
    c.fillText(String(i + 1), -330, CODE_TOP + i * LH);
  }

  // indent guides
  c.textAlign = 'left';
  c.strokeStyle = 'rgba(120, 140, 165, 0.11)';
  c.lineWidth = 0.8;
  for (let k = 1; k <= 2; k += 1) {
    const x = CODE_X + k * 27;
    c.beginPath();
    c.moveTo(x, 148);
    c.lineTo(x, 610);
    c.stroke();
  }

  // sticky scroll breadcrumb
  c.save();
  c.globalAlpha = 0.62;
  c.strokeStyle = MUTE;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(CODE_X + 2, 152);
  c.lineTo(CODE_X + 7, 156.5);
  c.lineTo(CODE_X + 2, 161);
  c.stroke();
  setFont(c, 11.5, 400, MONO, '0.3px');
  c.fillStyle = MUTE;
  c.fillText('pelican.stroke({', CODE_X + 16, 160);
  c.restore();

  // scrollbar
  c.fillStyle = 'rgba(110, 118, 129, 0.09)';
  rr(c, 402, 148, 4.5, 420, 2.2);
  c.fill();
  c.fillStyle = 'rgba(139, 148, 158, 0.2)';
  rr(c, 402, 148, 4.5, 170, 2.2);
  c.fill();

  // pane dividers
  c.fillStyle = BORDER;
  c.fillRect(PREVIEW_X, 132, 1, 770);
  c.fillRect(LAYERS_X, 132, 1, 770);

  // preview header
  setFont(c, 10.5, 600, UI, '2.2px');
  c.fillStyle = DIM;
  c.fillText('PREVIEW', 440, 161);
  setFont(c, 11, 400, MONO, '0px');
  c.fillStyle = MUTE;
  c.fillText('rig.svg', 508, 161);

  // zoom pill
  rr(c, 984, 146, 80, 22, 4);
  c.strokeStyle = BORDER2;
  c.lineWidth = 1;
  c.stroke();
  c.textAlign = 'center';
  setFont(c, 10.5, 500, MONO, '0px');
  c.fillStyle = DIM;
  c.fillText('100%', 1024, 161);
  c.textAlign = 'left';

  // layers header
  c.fillStyle = PANEL2;
  c.fillRect(LAYERS_X + 1, 132, WIN.x1 - LAYERS_X - 1, 44);
  c.fillStyle = BORDER;
  c.fillRect(LAYERS_X + 1, 175, WIN.x1 - LAYERS_X - 1, 1);
  setFont(c, 10.5, 600, UI, '2.2px');
  c.fillStyle = DIM;
  c.fillText('LAYERS', 1096, 161);

  // ------------------------------------------------------------ artboard
  drawArtboard(c);

  // ------------------------------------------------------------ status bar
  c.fillStyle = PANEL;
  c.fillRect(WIN.x0, 902, WIN.x1 - WIN.x0, 48);
  c.fillStyle = BORDER2;
  c.fillRect(WIN.x0, 902, WIN.x1 - WIN.x0, 1);

  c.textAlign = 'left';
  setFont(c, 11, 400, UI, '0.4px');
  c.fillStyle = MUTE;
  c.fillText('main*', -366, 931);
  c.fillStyle = GREEN;
  c.beginPath();
  c.arc(-330, 927, 2.6, 0, TAU);
  c.fill();

  c.textAlign = 'right';
  c.fillStyle = DIM;
  const status = ['s20_code.js', 'Spaces: 2', 'UTF-8', 'JavaScript'];
  let sx = 1362;
  for (let i = status.length - 1; i >= 0; i -= 1) {
    c.fillText(status[i], sx, 931);
    sx -= c.measureText(status[i]).width + 22;
  }

  c.restore();

  // window border
  c.strokeStyle = BORDER2;
  c.lineWidth = 1.2;
  rr(c, WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 8);
  c.stroke();
}

function drawArtboard(c) {
  // shadow
  c.save();
  c.shadowColor = 'rgba(0, 0, 0, 0.5)';
  c.shadowBlur = 26;
  c.shadowOffsetY = 10;
  c.fillStyle = PAPER;
  rr(c, ART.x, ART.y, ART.w, ART.h, 3);
  c.fill();
  c.restore();

  // paper
  const pg = c.createLinearGradient(ART.x, ART.y, ART.x, ART.y + ART.h);
  pg.addColorStop(0, '#f6f1e4');
  pg.addColorStop(0.55, '#f1ebdb');
  pg.addColorStop(1, '#eae3d1');
  c.fillStyle = pg;
  c.fillRect(ART.x, ART.y, ART.w, ART.h);

  // paper fibre: deterministic speckle
  c.save();
  c.beginPath();
  c.rect(ART.x, ART.y, ART.w, ART.h);
  c.clip();
  const speck = rngFor(2020);
  for (let i = 0; i < 2600; i += 1) {
    const x = ART.x + speck() * ART.w;
    const y = ART.y + speck() * ART.h;
    const r = 0.4 + speck() * 1.1;
    c.fillStyle = speck() > 0.55
      ? 'rgba(120, 106, 82, 0.09)'
      : 'rgba(255, 252, 244, 0.22)';
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.restore();

  // dot grid
  c.save();
  c.beginPath();
  c.rect(ART.x, ART.y, ART.w, ART.h);
  c.clip();
  c.fillStyle = 'rgba(70, 82, 96, 0.13)';
  for (let y = ART.y + 14; y < ART.y + ART.h; y += 24) {
    for (let x = ART.x + 14; x < ART.x + ART.w; x += 24) {
      c.fillRect(x, y, 1.1, 1.1);
    }
  }
  c.restore();

  // margin guide
  c.save();
  c.strokeStyle = 'rgba(88, 166, 255, 0.20)';
  c.lineWidth = 0.8;
  c.setLineDash([4, 5]);
  c.strokeRect(ART.x + 34, ART.y + 34, ART.w - 68, ART.h - 68);
  c.setLineDash([]);
  c.restore();

  // registration marks
  c.save();
  c.strokeStyle = 'rgba(70, 82, 96, 0.35)';
  c.lineWidth = 0.8;
  const marks = [
    [ART.x + 12, ART.y + 12], [ART.x + ART.w - 12, ART.y + 12],
    [ART.x + 12, ART.y + ART.h - 12], [ART.x + ART.w - 12, ART.y + ART.h - 12],
  ];
  for (const [x, y] of marks) {
    c.beginPath();
    c.moveTo(x - 4, y);
    c.lineTo(x + 4, y);
    c.moveTo(x, y - 4);
    c.lineTo(x, y + 4);
    c.stroke();
  }
  c.restore();

  // border
  c.strokeStyle = '#d6cdb9';
  c.lineWidth = 1;
  rr(c, ART.x, ART.y, ART.w, ART.h, 3);
  c.stroke();

  // artboard label
  c.textAlign = 'left';
  setFont(c, 9, 500, MONO, '1px');
  c.fillStyle = 'rgba(90, 92, 82, 0.55)';
  c.fillText('ARTBOARD 01  ·  1000 × 1000', ART.x + 12, ART.y + ART.h - 10);
  c.textAlign = 'left';
}

// ---------------------------------------------------------------- code

function fontFor(c, kind, size, weight = 400) {
  if (kind === 'cn') c.font = `${weight} ${size}px ${CJK}`;
  else if (kind === 'italic') c.font = `italic ${weight} ${size}px ${MONO}`;
  else c.font = `${weight} ${size}px ${MONO}`;
  if ('letterSpacing' in c) c.letterSpacing = '0px';
}

function revealFor(line, local) {
  if (line.blank) return 0;
  const n = line.tokens.reduce((a, t) => a + Array.from(t[0]).length, 0);
  if (local <= line.start) return 0;
  if (local >= line.end) return n;
  return Math.floor(n * clamp((local - line.start) / (line.end - line.start)));
}

function drawTokens(c, tokens, x, baseline, reveal) {
  let used = 0;
  const spans = [];
  for (const [text, color, kind] of tokens) {
    const full = Array.from(text);
    if (used >= reveal) break;
    const take = full.slice(0, reveal - used).join('');
    fontFor(c, kind, FS);
    c.fillStyle = color;
    c.fillText(take, x, baseline);
    const w = c.measureText(take).width;
    spans.push({ x, w, kind });
    x += w;
    used += full.length;
  }
  return { x, spans };
}

function drawCode(g, ctx, S) {
  const c = g.drawingContext;
  const local = ctx.local;

  // which line is being typed
  let lastStarted = -1;
  let typing = -1;
  for (let i = 0; i < CODE_LINES.length; i += 1) {
    const line = CODE_LINES[i];
    if (line.blank) continue;
    if (local >= line.start) lastStarted = i;
    if (local >= line.start && local < line.end) typing = i;
  }
  const caretLine = typing >= 0 ? typing : Math.max(0, lastStarted);

  c.save();
  c.beginPath();
  c.rect(WIN.x0, 132, CODE_RIGHT - WIN.x0, 770);
  c.clip();

  // active line plate
  if (caretLine >= 0) {
    const by = CODE_TOP + caretLine * LH;
    c.fillStyle = 'rgba(255, 255, 255, 0.035)';
    c.fillRect(GUTTER_X + 1, by - 27, CODE_RIGHT - GUTTER_X - 1, LH);
  }

  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';

  let caretX = CODE_X;
  const caretY = CODE_TOP + Math.max(0, caretLine) * LH;

  for (let i = 0; i < CODE_LINES.length; i += 1) {
    const line = CODE_LINES[i];
    if (line.blank) continue;
    const reveal = revealFor(line, local);
    if (reveal <= 0) continue;
    const base = CODE_TOP + i * LH;
    const res = drawTokens(c, line.tokens, CODE_X, base, reveal);
    if (i === caretLine) caretX = res.x;

    // linter squiggle under the declared-but-unused token
    if (i === 1 && local > 2.96) {
      fontFor(c, 'mono', FS);
      const pre = 'const ';
      const word = 'dignity';
      const wx = CODE_X + c.measureText(pre).width;
      const ww = c.measureText(word).width;
      c.save();
      c.strokeStyle = alpha(ORANGE, 0.95);
      c.lineWidth = 2;
      c.setLineDash([2.4, 2.4]);
      c.beginPath();
      c.moveTo(wx, base + 7);
      c.lineTo(wx + ww, base + 7);
      c.stroke();
      c.restore();
    }
  }

  // beat blink, keyed to the global clock so it lands on the downbeats
  const onBeat = (ctx.t * 2) % 1 < 0.62;
  if (caretLine >= 0 && onBeat) {
    c.fillStyle = alpha(BLUE, 0.95);
    c.fillRect(caretX + 1.5, caretY - 24, 2.6, 30);
    c.save();
    c.shadowColor = alpha(BLUE, 0.55);
    c.shadowBlur = 10;
    c.fillRect(caretX + 1.5, caretY - 24, 2.6, 30);
    c.restore();
  }

  // gutter marker for the warning
  if (local > 2.96) {
    c.fillStyle = alpha(ORANGE, 0.9);
    c.fillRect(WIN.x0 + 6, CODE_TOP + LH - 15, 3.2, 3.2);
  }

  c.restore();
}

// ---------------------------------------------------------------- diagnostics

function drawDiagnostics(g, ctx) {
  const c = g.drawingContext;
  const local = ctx.local;
  const panelY = 792;
  const p = clamp((local - 2.94) / 0.06);
  const pulse = Math.exp(-Math.pow((local - 3.0) / 0.3, 2));

  c.save();
  // panel chrome
  c.fillStyle = PANEL2;
  c.fillRect(PREVIEW_X + 1, panelY, WIN.x1 - PREVIEW_X - 1, 110);
  c.strokeStyle = BORDER;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(PREVIEW_X + 1, panelY);
  c.lineTo(WIN.x1, panelY);
  c.stroke();

  // header
  setFont(c, 10.5, 600, UI, '1.8px');
  c.fillStyle = p > 0.05 ? ORANGE : DIM;
  c.textAlign = 'left';
  c.fillText('PROBLEMS', 440, panelY + 24);

  // count badge
  const bx = 440 + c.measureText('PROBLEMS').width + 10;
  c.fillStyle = p > 0.05 ? alpha(ORANGE, 0.9) : 'rgba(139, 148, 158, 0.3)';
  rr(c, bx, panelY + 13, 15, 14, 3);
  c.fill();
  setFont(c, 9.5, 600, UI, '0px');
  c.fillStyle = '#0d1117';
  c.textAlign = 'center';
  c.fillText(p > 0.05 ? '1' : '0', bx + 7.5, panelY + 24.5);

  c.textAlign = 'right';
  setFont(c, 10, 400, MONO, '0px');
  c.fillStyle = MUTE;
  c.fillText('s20_code.js   JavaScript', 1362, panelY + 24);

  if (p > 0.01) {
    c.globalAlpha = p;
    const slide = (1 - easeOut(p)) * 14;

    // warning row
    c.textAlign = 'left';
    const rowY = panelY + 64 + slide;

    // row tint
    c.fillStyle = `rgba(255, 166, 87, ${0.05 + 0.05 * pulse})`;
    c.fillRect(PREVIEW_X + 1, panelY + 38, WIN.x1 - PREVIEW_X - 1, 54);

    // icon: amber triangle with a bang
    const ix = 440;
    c.strokeStyle = ORANGE;
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(ix + 8, rowY - 14);
    c.lineTo(ix + 16, rowY + 1);
    c.lineTo(ix, rowY + 1);
    c.closePath();
    c.stroke();
    c.fillStyle = ORANGE;
    c.fillRect(ix + 7.3, rowY - 8.6, 1.6, 5);
    c.fillRect(ix + 7.3, rowY - 1.8, 1.6, 1.7);

    c.fillStyle = ORANGE;
    setFont(c, 13, 600, MONO, '0.3px');
    c.fillText('warning', 468, rowY);

    setFont(c, 15.5, 400, MONO, '0px');
    c.fillStyle = '#e6edf3';
    c.fillText('unused variable: dignity', 542, rowY);

    setFont(c, 11.5, 400, MONO, '0px');
    c.fillStyle = MUTE;
    c.fillText('s20_code.js:2:7', 836, rowY);

    // a short amber rule under the row while it pulses
    c.strokeStyle = alpha(ORANGE, 0.25 + 0.55 * pulse);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(440, panelY + 73);
    c.lineTo(440 + 610 * easeOut(p), panelY + 73);
    c.stroke();
  }

  c.restore();
}

// ---------------------------------------------------------------- layers

function drawLayers(g, ctx, S) {
  const c = g.drawingContext;
  const rows = LAYERS;
  let active = -1;
  for (let i = 0; i < rows.length; i += 1) {
    if (!rows[i][1](S)) { active = i; break; }
  }

  c.save();
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  rows.forEach(([label, done], i) => {
    const y = 214 + i * 34;
    const isDone = done(S);
    const isActive = i === active;

    if (isActive) {
      c.fillStyle = 'rgba(88, 166, 255, 0.08)';
      c.fillRect(LAYERS_X + 1, y - 20, WIN.x1 - LAYERS_X - 1, 30);
      c.fillStyle = alpha(BLUE, 0.9);
      c.fillRect(LAYERS_X + 1, y - 20, 2, 30);
    }

    // disclosure chevron
    c.strokeStyle = isDone ? alpha(GREEN, 0.55) : MUTE;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(1097, y - 10);
    c.lineTo(1102, y - 5.5);
    c.lineTo(1097, y - 1);
    c.stroke();

    // node dot
    c.fillStyle = isDone ? GREEN : (isActive ? BLUE : 'rgba(139, 148, 158, 0.35)');
    c.beginPath();
    c.arc(1114, y - 6, 2.8, 0, TAU);
    c.fill();

    setFont(c, 12.5, 400, MONO, '0px');
    c.fillStyle = isDone ? TEXT : (isActive ? DIM : MUTE);
    c.fillText(label, 1126, y);

    // check
    const cx = 1352;
    const cy = y - 6;
    if (isDone) {
      c.strokeStyle = GREEN;
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(cx - 6, cy);
      c.lineTo(cx - 1.5, cy + 4.2);
      c.lineTo(cx + 6, cy - 4.4);
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(139, 148, 158, 0.28)';
      c.lineWidth = 1;
      rr(c, cx - 5.5, cy - 5.5, 11, 11, 2);
      c.stroke();
    }
  });

  // inspector block
  c.strokeStyle = BORDER;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(1096, 532);
  c.lineTo(1362, 532);
  c.stroke();

  setFont(c, 10.5, 600, UI, '1.8px');
  c.fillStyle = DIM;
  c.fillText('INSPECTOR', 1096, 556);

  const props = [
    ['viewBox', '0 0 1000 1000'],
    ['stroke', '#1e2732'],
    ['zoom', '150%'],
  ];
  props.forEach(([k, v], i) => {
    const y = 582 + i * 26;
    setFont(c, 11, 400, MONO, '0px');
    c.fillStyle = MUTE;
    c.fillText(k, 1096, y);
    c.textAlign = 'right';
    c.fillStyle = DIM;
    c.fillText(v, 1362, y);
    c.textAlign = 'left';
  });

  // palette swatches
  setFont(c, 10.5, 600, UI, '1.8px');
  c.fillStyle = DIM;
  c.fillText('PALETTE', 1096, 690);
  const swatches = [BG, BLUE, GREEN, ORANGE, TEXT];
  swatches.forEach((col, i) => {
    const x = 1096 + i * 32;
    c.fillStyle = col;
    rr(c, x, 704, 22, 22, 3);
    c.fill();
    c.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    c.lineWidth = 1;
    c.stroke();
  });

  setFont(c, 9.5, 400, MONO, '0.4px');
  c.fillStyle = MUTE;
  c.fillText('DARK  ·  SYNTAX  ·  2020s', 1096, 744);

  c.restore();
}

// ---------------------------------------------------------------- preview

function drawPreview(g, ctx, S) {
  const c = g.drawingContext;
  const pose = rigPose(ctx.t);

  c.save();
  c.beginPath();
  c.rect(ART.x + 1, ART.y + 1, ART.w - 2, ART.h - 2);
  c.clip();

  // construction guides, drawn under the ink
  drawGuides(c, pose, S);

  // the live drawing
  c.save();
  c.translate(OX, OY);
  c.scale(K, K);
  paintRider(c, pose, S);
  drawSelection(c, pose, S);
  drawPen(c, pose, S);
  c.restore();

  drawAnnotations(c, S);
  c.restore();

  // preview footer: path progress
  const done = LAYERS.filter(([, f]) => f(S)).length;
  c.textAlign = 'left';
  setFont(c, 10.5, 400, MONO, '0.4px');
  c.fillStyle = MUTE;
  c.fillText('rig.svg  ·  stroke build', 440, 780);
  c.textAlign = 'right';
  c.fillStyle = done === LAYERS.length ? GREEN : DIM;
  c.fillText(`${done} / ${LAYERS.length} paths`, 1064, 780);
  c.textAlign = 'left';
}

function drawGuides(c, pose, S) {
  if (S.guides <= 0.01) return;
  const a = 0.42 * S.guides;
  c.save();
  c.translate(OX, OY);
  c.scale(K, K);
  c.globalAlpha = a;
  c.strokeStyle = BLUE;
  c.lineWidth = 0.7;
  c.setLineDash([3.4, 4]);

  // baseline
  c.beginPath();
  c.moveTo(-160, 0);
  c.lineTo(205, 0);
  c.stroke();

  // wheel construction
  c.beginPath();
  c.arc(-72, -50, 50, 0, TAU);
  c.stroke();
  c.beginPath();
  c.arc(72, -50, 50, 0, TAU);
  c.stroke();

  // head
  c.beginPath();
  c.arc(pose.head.x, pose.head.y, 23, 0, TAU);
  c.stroke();

  // spine
  c.beginPath();
  c.moveTo(0, -292);
  c.lineTo(0, 10);
  c.stroke();

  c.setLineDash([]);
  // hub crosses
  c.lineWidth = 0.9;
  for (const hub of [{ x: -72, y: -50 }, { x: 72, y: -50 }]) {
    c.beginPath();
    c.moveTo(hub.x - 6, hub.y);
    c.lineTo(hub.x + 6, hub.y);
    c.moveTo(hub.x, hub.y - 6);
    c.lineTo(hub.x, hub.y + 6);
    c.stroke();
  }
  c.restore();
}

function drawAnnotations(c, S) {
  const a = smoothstep(0.7, 1.4, S.local) * 0.55;
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = BLUE;
  c.fillStyle = BLUE;
  c.lineWidth = 0.8;

  // radius callout, clear of the drawing
  c.beginPath();
  c.moveTo(900, 470);
  c.lineTo(884, 508);
  c.stroke();
  c.beginPath();
  c.arc(884, 508, 1.6, 0, TAU);
  c.fill();
  setFont(c, 9.5, 500, MONO, '0.6px');
  c.textAlign = 'left';
  c.fillText('r 50', 906, 472);

  // asset signature, bottom right of the paper
  c.textAlign = 'right';
  setFont(c, 9.5, 500, MONO, '1px');
  c.fillStyle = 'rgba(70, 82, 96, 0.8)';
  c.fillText('PELICAN · SVG', 1026, 738);
  c.restore();
}

// ---------------------------------------------------------------- ink rider

function partialArc(c, x, y, r, a0, a1, color, w, alp = 1) {
  if (a1 <= a0 + 1e-4) return;
  c.save();
  c.globalAlpha = alp;
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x, y, r, a0, a1);
  c.stroke();
  c.restore();
}

function pathLength(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i += 1) {
    n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return n;
}

function partialStroke(c, pts, p, color, w, alp = 1) {
  if (p <= 0 || pts.length < 2) return;
  const target = pathLength(pts) * clamp(p);
  c.save();
  c.globalAlpha = alp;
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  let acc = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + d <= target) {
      c.lineTo(b.x, b.y);
      acc += d;
    } else {
      const f = d < 1e-6 ? 0 : (target - acc) / d;
      c.lineTo(lerp(a.x, b.x, f), lerp(a.y, b.y, f));
      break;
    }
  }
  c.stroke();
  c.restore();
}

function pointAlong(pts, p) {
  const target = pathLength(pts) * clamp(p);
  let acc = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + d >= target) {
      const f = d < 1e-6 ? 0 : (target - acc) / d;
      return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
    }
    acc += d;
  }
  return pts[pts.length - 1];
}

function ellipsePts(cx, cy, rx, ry, rot) {
  const out = [];
  const n = 44;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push({
      x: cx + x * Math.cos(rot) - y * Math.sin(rot),
      y: cy + x * Math.sin(rot) + y * Math.cos(rot),
    });
  }
  return out;
}

function cubicPts(p0, c1, c2, p3, n = 18) {
  const out = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y,
    });
  }
  return out;
}

function catmull(pts, seg = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < seg; j += 1) {
      const t = j / seg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t
          + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
          + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t
          + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
          + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function ribbon(center, w0, w1) {
  const A = [];
  const B = [];
  for (let i = 0; i < center.length; i += 1) {
    const a = center[Math.max(0, i - 1)];
    const b = center[Math.min(center.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.max(1e-4, Math.hypot(dx, dy));
    const nx = -dy / l;
    const ny = dx / l;
    const w = lerp(w0, w1, i / (center.length - 1)) / 2;
    A.push({ x: center[i].x + nx * w, y: center[i].y + ny * w });
    B.push({ x: center[i].x - nx * w, y: center[i].y - ny * w });
  }
  return { A, B };
}

function fillPolygon(c, pts, color, alp = 1) {
  if (alp <= 0.01) return;
  c.save();
  c.globalAlpha = alp;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i += 1) c.lineTo(pts[i].x, pts[i].y);
  c.closePath();
  c.fill();
  c.restore();
}

function paintRider(c, pose, S) {
  const b = pose.body;

  // cast shadow, laid down last in the build but under the ink
  if (S.detail > 0.03) {
    c.save();
    c.globalAlpha = smoothstep(0.05, 0.5, S.detail);
    c.translate(0, 3);
    c.scale(1, 0.11);
    const sg = c.createRadialGradient(0, 0, 10, 0, 0, 168);
    sg.addColorStop(0, 'rgba(96, 86, 66, 0.42)');
    sg.addColorStop(0.5, 'rgba(104, 94, 74, 0.18)');
    sg.addColorStop(1, 'rgba(104, 94, 74, 0)');
    c.fillStyle = sg;
    c.beginPath();
    c.arc(0, 0, 168, 0, TAU);
    c.fill();
    c.restore();
  }

  // far leg, behind the machine
  paintLeg(c, pose, S, 'far');

  paintWheels(c, pose, S, pose.wheelAngle);
  paintFrame(c, pose, S);

  // ---------------------------------------------------------- neck
  // Painted before the body so the breast contour covers its root.
  if (S.neck > 0.02) {
    const nk = [
      { x: b.x + 42, y: b.y + 10 },
      { x: b.x + 55, y: b.y - 26 },
      { x: pose.head.x - 12, y: pose.head.y + 16 },
      { x: pose.head.x - 1, y: pose.head.y + 8 },
    ];
    const center = catmull(nk, 10);
    const rb = ribbon(center, 28, 16);
    const poly = [...rb.A, ...rb.B.slice().reverse()];
    fillPolygon(c, poly, CREAM, smoothstep(0.35, 0.86, S.neck) * 0.99);
    if (S.neck > 0.45) {
      c.save();
      c.globalAlpha = smoothstep(0.45, 0.95, S.neck);
      c.beginPath();
      c.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i += 1) c.lineTo(poly[i].x, poly[i].y);
      c.closePath();
      c.clip();
      const ng = c.createLinearGradient(pose.head.x - 30, 0, pose.head.x + 10, 0);
      ng.addColorStop(0, 'rgba(176, 154, 118, 0.26)');
      ng.addColorStop(0.55, 'rgba(176, 154, 118, 0.10)');
      ng.addColorStop(1, 'rgba(255, 250, 238, 0.2)');
      c.fillStyle = ng;
      c.fillRect(pose.head.x - 60, pose.head.y - 20, 140, 120);
      c.restore();
    }
    // throat shading
    if (S.neck > 0.6) {
      c.save();
      c.globalAlpha = smoothstep(0.6, 1, S.neck) * 0.22;
      c.strokeStyle = '#b9a482';
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(center[center.length - 1].x - 4, center[center.length - 1].y + 2);
      for (let i = center.length - 2; i >= 4; i -= 1) c.lineTo(center[i].x + 3, center[i].y + 5);
      c.stroke();
      c.restore();
    }
    partialStroke(c, rb.A, S.neck, INK, 2.4);
    partialStroke(c, rb.B, S.neck, INK, 2.4);
    if (S.neck > 0.82) {
      c.save();
      c.globalAlpha = smoothstep(0.82, 1, S.neck) * 0.35;
      c.strokeStyle = INK;
      c.lineWidth = 0.9;
      for (let i = 0; i < 3; i += 1) {
        const idx = 6 + i * 4;
        const a = center[Math.min(center.length - 1, idx)];
        const b2 = center[Math.min(center.length - 1, idx + 3)];
        c.beginPath();
        c.moveTo(a.x + 2, a.y);
        c.quadraticCurveTo((a.x + b2.x) / 2 + 2, (a.y + b2.y) / 2 + 3, b2.x + 1, b2.y + 2);
        c.stroke();
      }
      c.restore();
    }
  }

  // ---------------------------------------------------------- body
  const bp = [
    { x: b.x + 42, y: b.y - 24 },
    { x: b.x + 57, y: b.y - 3 },
    { x: b.x + 48, y: b.y + 18 },
    { x: b.x + 26, y: b.y + 31 },
    { x: b.x - 4, y: b.y + 35 },
    { x: b.x - 34, y: b.y + 26 },
    { x: b.x - 52, y: b.y + 6 },
    { x: b.x - 46, y: b.y - 16 },
    { x: b.x - 24, y: b.y - 31 },
    { x: b.x + 12, y: b.y - 33 },
  ];
  const body = catmull(bp, 7);
  body.push(body[0]);

  fillPolygon(c, body, CREAM, smoothstep(0.62, 0.92, S.body) * 0.97);

  // soft underside wash, clipped to the body
  if (S.detail > 0.02) {
    c.save();
    c.globalAlpha = smoothstep(0, 0.5, S.detail);
    c.beginPath();
    c.moveTo(body[0].x, body[0].y);
    for (let i = 1; i < body.length; i += 1) c.lineTo(body[i].x, body[i].y);
    c.closePath();
    c.clip();
    const sh = c.createLinearGradient(0, b.y - 30, 0, b.y + 40);
    sh.addColorStop(0, 'rgba(196, 180, 150, 0)');
    sh.addColorStop(1, 'rgba(172, 152, 116, 0.34)');
    c.fillStyle = sh;
    c.fillRect(b.x - 70, b.y - 40, 140, 90);
    c.restore();
  }

  partialStroke(c, body, S.body, INK, 2.5);

  // ---------------------------------------------------------- wing and tail
  paintWing(c, pose, S);

  // near leg
  paintLeg(c, pose, S, 'near');

  // ---------------------------------------------------------- head
  paintHead(c, pose, S);

  if (S.detail > 0.02) paintDetails(c, pose, S);
}

function paintLeg(c, pose, S, which) {
  const near = which === 'near';
  const leg = pose.legs[which];
  const hip = {
    x: pose.hip.x + (near ? 10 : 8),
    y: pose.hip.y + (near ? 17 : 19),
  };
  const knee = leg.knee;
  const ankle = leg.ankle;
  const p = clamp((S.legs - (near ? 0.12 : 0)) / 0.88);
  if (p <= 0.01) return;

  const center = catmull([
    hip,
    { x: (hip.x + knee.x) / 2 + 5, y: (hip.y + knee.y) / 2 - 2 },
    knee,
    { x: (knee.x + ankle.x) / 2 - 3, y: (knee.y + ankle.y) / 2 },
    ankle,
  ], 8);
  const col = mix(LEG_INK, LEG, S.color);
  const op = near ? 1 : 0.32;
  const rb = ribbon(center, near ? 7.6 : 6, 3);
  const poly = [...rb.A, ...rb.B.slice().reverse()];

  fillPolygon(c, poly, col, smoothstep(0.15, 0.6, p) * op);
  partialStroke(c, rb.A, p, INK, 1.5, op);
  partialStroke(c, rb.B, p, INK, 1.5, op);

  // knee bulge
  if (p > 0.45) {
    c.save();
    c.globalAlpha = smoothstep(0.45, 0.9, p) * op * 0.9;
    c.fillStyle = col;
    c.strokeStyle = INK;
    c.lineWidth = 1;
    c.beginPath();
    c.arc(knee.x, knee.y, 3.2, 0, TAU);
    c.fill();
    c.stroke();
    c.restore();
  }

  // thigh feathering where it leaves the belly
  if (p > 0.5) {
    c.save();
    c.globalAlpha = smoothstep(0.5, 0.9, p) * op * 0.85;
    c.strokeStyle = INK;
    c.lineWidth = 1.1;
    for (let i = 0; i < 3; i += 1) {
      c.beginPath();
      c.moveTo(hip.x - 5 + i * 5, hip.y - 2);
      c.quadraticCurveTo(hip.x - 8 + i * 5, hip.y + 6, hip.x - 3 + i * 5, hip.y + 12);
      c.stroke();
    }
    c.restore();
  }

  if (p > 0.7) {
    c.save();
    c.globalAlpha = op * smoothstep(0.7, 1, p);
    c.fillStyle = col;
    c.strokeStyle = INK;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(ankle.x - 4, ankle.y - 2);
    c.lineTo(ankle.x + 10, ankle.y - 2);
    c.quadraticCurveTo(ankle.x + 9, ankle.y + 5, ankle.x + 3, ankle.y + 5);
    c.quadraticCurveTo(ankle.x - 2, ankle.y + 3, ankle.x - 4, ankle.y - 2);
    c.fill();
    c.stroke();
    c.lineWidth = 0.9;
    c.strokeStyle = alpha(INK, 0.7);
    for (let i = 0; i < 2; i += 1) {
      c.beginPath();
      c.moveTo(ankle.x + 8 - i * 4, ankle.y + 1);
      c.lineTo(ankle.x + 1 - i * 6, ankle.y + 5);
      c.stroke();
    }
    // ankle joint
    c.fillStyle = mix(LEG_INK, LEG, S.color * 0.6);
    c.beginPath();
    c.arc(ankle.x, ankle.y, 1.8, 0, TAU);
    c.fill();
    c.restore();
  }
}

function paintWheels(c, pose, S, angle) {
  const wheels = [
    { hub: pose.wheels.rear, delay: 0.14 },
    { hub: pose.wheels.front, delay: 0 },
  ];
  for (const { hub, delay } of wheels) {
    const p = clamp((S.wheel - delay) / (1 - delay));
    if (p <= 0) continue;

    // tire: paper-white core with an ink band, then a fine rim
    partialArc(c, hub.x, hub.y, 50, -Math.PI / 2, -Math.PI / 2 + TAU * p, INK, 3.1);
    if (p > 0.55) {
      partialArc(c, hub.x, hub.y, 48.1, -Math.PI / 2, -Math.PI / 2 + TAU * p, PAPER, 1.5);
    }

    const rp = clamp((S.rim - delay) / (1 - delay));
    if (rp > 0) {
      partialArc(c, hub.x, hub.y, 44.6, -Math.PI / 2, -Math.PI / 2 + TAU * rp, INK2, 1.0, 0.95);
      partialArc(c, hub.x, hub.y, 43.4, -Math.PI / 2, -Math.PI / 2 + TAU * rp, INK2, 0.6, 0.55);
    }

    if (rp > 0.2) {
      const sa = clamp((rp - 0.2) / 0.6);
      c.save();
      c.globalAlpha = sa * 0.85;
      c.strokeStyle = INK2;
      c.lineWidth = 0.75;
      for (let i = 0; i < 12; i += 1) {
        const a = angle + (i / 12) * TAU;
        const off = i % 2 ? 4.2 : 0;
        c.beginPath();
        c.moveTo(hub.x + Math.cos(a) * 4.2, hub.y + Math.sin(a) * 4.2);
        c.lineTo(hub.x + Math.cos(a + off * 0.02) * 43.2, hub.y + Math.sin(a + off * 0.02) * 43.2);
        c.stroke();
      }
      c.fillStyle = CREAM;
      c.strokeStyle = INK;
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(hub.x, hub.y, 4.4, 0, TAU);
      c.fill();
      c.stroke();
      // valve, so rotation reads
      c.fillStyle = INK2;
      c.beginPath();
      c.arc(hub.x + Math.cos(angle + 0.6) * 38, hub.y + Math.sin(angle + 0.6) * 38, 1.4, 0, TAU);
      c.fill();
      c.restore();
    }

    if (S.detail > 0.05) {
      c.save();
      c.globalAlpha = smoothstep(0.05, 0.6, S.detail) * 0.6;
      c.strokeStyle = INK;
      c.lineWidth = 1;
      for (let i = 0; i < 30; i += 1) {
        const a = angle * 0.4 + (i / 30) * TAU;
        c.beginPath();
        c.moveTo(hub.x + Math.cos(a) * 51.2, hub.y + Math.sin(a) * 51.2);
        c.lineTo(hub.x + Math.cos(a) * 53.6, hub.y + Math.sin(a) * 53.6);
        c.stroke();
      }
      c.restore();
    }
  }
}

function paintFrame(c, pose, S) {
  if (S.frame <= 0) return;
  const f = pose.frame;
  const tubes = [
    [f.rearHub, f.crank],
    [f.crank, f.seatCluster],
    [f.seatCluster, f.rearHub],
    [f.crank, f.headTop],
    [f.seatCluster, f.headTop],
    [f.headTop, f.frontHub],
    [f.seatCluster, { x: f.saddle.x, y: f.saddle.y - 3 }],
    [f.headTop, f.stemTop],
    [f.stemTop, f.grip],
  ];

  tubes.forEach(([a, b], i) => {
    const p = clamp((S.frame - i * 0.055) / 0.56);
    partialStroke(c, [a, b], p, INK, 2.6);
    if (p > 0.99) {
      c.save();
      c.fillStyle = INK;
      c.beginPath();
      c.arc(a.x, a.y, 1.6, 0, TAU);
      c.fill();
      c.restore();
    }
  });

  const bar = clamp((S.frame - 0.62) / 0.22);
  if (bar > 0) {
    // drop handlebar from the stem
    const hb = catmull([
      { x: f.stemTop.x - 2, y: f.stemTop.y - 2 },
      f.grip,
      { x: f.grip.x + 1, y: f.grip.y + 8 },
      { x: f.grip.x - 7, y: f.grip.y + 9 },
    ], 6);
    partialStroke(c, hb, bar, INK, 2.2);
    if (bar > 0.6) {
      c.save();
      c.globalAlpha = smoothstep(0.6, 1, bar);
      c.strokeStyle = INK2;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(f.grip.x - 2, f.grip.y + 2);
      c.lineTo(f.grip.x + 6, f.grip.y + 5);
      c.stroke();
      c.restore();
    }
  }

  if (S.frame > 0.7) {
    const fa = clamp((S.frame - 0.7) / 0.3);
    c.save();
    c.globalAlpha = fa * 0.8;
    c.strokeStyle = INK2;
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(f.crank.x, f.crank.y - 19);
    c.lineTo(f.rearHub.x, f.rearHub.y - 9);
    c.moveTo(f.crank.x, f.crank.y + 19);
    c.lineTo(f.rearHub.x, f.rearHub.y + 9);
    c.stroke();
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(f.crank.x, f.crank.y, 7, 0, TAU);
    c.stroke();
    c.restore();
  }

  const cp = clamp((S.frame - 0.8) / 0.2);
  if (cp > 0) {
    c.save();
    c.globalAlpha = cp;
    c.strokeStyle = INK;
    c.lineWidth = 2.1;
    c.beginPath();
    c.moveTo(f.crank.x, f.crank.y);
    c.lineTo(pose.pedals.near.x, pose.pedals.near.y);
    c.stroke();
    c.save();
    c.globalAlpha = cp * 0.4;
    c.beginPath();
    c.moveTo(f.crank.x, f.crank.y);
    c.lineTo(pose.pedals.far.x, pose.pedals.far.y);
    c.stroke();
    c.restore();
    c.fillStyle = INK;
    c.fillRect(pose.pedals.near.x - 7.5, pose.pedals.near.y - 2, 15, 3.6);
    c.restore();
  }

  if (S.frame > 0.9) {
    c.save();
    c.globalAlpha = smoothstep(0.9, 1, S.frame);
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(f.saddle.x - 16, f.saddle.y - 2);
    c.quadraticCurveTo(f.saddle.x - 8, f.saddle.y - 7, f.saddle.x + 10, f.saddle.y - 4);
    c.quadraticCurveTo(f.saddle.x + 6, f.saddle.y + 2, f.saddle.x - 6, f.saddle.y + 1);
    c.quadraticCurveTo(f.saddle.x - 13, f.saddle.y + 2, f.saddle.x - 16, f.saddle.y - 2);
    c.fill();
    c.restore();
  }
}

function paintWing(c, pose, S) {
  const b = pose.body;
  const patchPts = [
    { x: b.x - 36, y: b.y - 24 },
    { x: b.x - 4, y: b.y - 36 },
    { x: b.x + 26, y: b.y - 22 },
    { x: b.x + 28, y: b.y - 4 },
    { x: b.x + 4, y: b.y + 9 },
    { x: b.x - 26, y: b.y + 10 },
    { x: b.x - 38, y: b.y - 2 },
  ];
  const patch = catmull(patchPts, 7);
  patch.push(patch[0]);

  if (S.wing > 0.02) {
    fillPolygon(c, patch, WING, smoothstep(0.35, 0.85, S.wing));
    // wing shadow along the body
    if (S.detail > 0.02) {
      c.save();
      c.globalAlpha = smoothstep(0, 0.5, S.detail) * 0.5;
      c.beginPath();
      c.moveTo(patch[0].x, patch[0].y);
      for (let i = 1; i < patch.length; i += 1) c.lineTo(patch[i].x, patch[i].y);
      c.closePath();
      c.clip();
      const wg = c.createLinearGradient(0, b.y - 30, 0, b.y + 24);
      wg.addColorStop(0, 'rgba(160, 140, 105, 0)');
      wg.addColorStop(1, 'rgba(160, 140, 105, 0.28)');
      c.fillStyle = wg;
      c.fillRect(b.x - 60, b.y - 40, 120, 80);
      c.restore();
    }
    partialStroke(c, patch, S.wing, INK, 2.1);
  }

  // primaries: three broad, overlapping flight feathers
  if (S.wing > 0.16) {
    const tips = [
      { x: b.x - 74, y: b.y - 8 },
      { x: b.x - 77, y: b.y + 1 },
      { x: b.x - 70, y: b.y + 10 },
    ];
    tips.forEach((tip, i) => {
      const p = clamp((S.wing - 0.16 - i * 0.1) / 0.55);
      if (p <= 0) return;
      const base = { x: b.x - 28 - i * 3, y: b.y - 11 + i * 5 };
      const bow = i === 1 ? 4 : 1;
      const center = catmull([
        base,
        { x: (base.x + tip.x) / 2 - 3, y: (base.y + tip.y) / 2 + bow - 2 },
        tip,
      ], 7);
      const rb = ribbon(center, 15, 1.2);
      fillPolygon(c, [...rb.A, ...rb.B.slice().reverse()], i === 2 ? mix(WING, INK, 0.05) : WING, smoothstep(0.25, 0.85, p));
      partialStroke(c, rb.A, p, INK, 1.4);
      partialStroke(c, rb.B, p, INK, 1.4);
      // quill line down the middle of each feather
      if (p > 0.4) {
        c.save();
        c.globalAlpha = smoothstep(0.4, 0.9, p) * 0.32;
        c.strokeStyle = INK;
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(center[0].x, center[0].y);
        const mid = Math.floor(center.length * 0.82);
        for (let k = 1; k <= mid; k += 1) c.lineTo(center[k].x, center[k].y);
        c.stroke();
        c.restore();
      }
    });
  }

  // covert feather lines
  if (S.wing > 0.72) {
    c.save();
    c.globalAlpha = smoothstep(0.72, 1, S.wing) * 0.5;
    c.strokeStyle = INK;
    c.lineWidth = 0.9;
    for (let i = 0; i < 4; i += 1) {
      c.beginPath();
      c.moveTo(b.x - 24 + i * 12, b.y - 28 + i * 4);
      c.quadraticCurveTo(b.x - 16 + i * 12, b.y - 16 + i * 4, b.x - 24 + i * 11, b.y - 6 + i * 3);
      c.stroke();
    }
    c.restore();
  }
}

function paintHead(c, pose, S) {
  const h = pose.head;
  if (S.head <= 0.02) return;

  const hp = [
    { x: h.x - 19, y: h.y + 8 },
    { x: h.x - 23, y: h.y - 8 },
    { x: h.x - 10, y: h.y - 21 },
    { x: h.x + 8, y: h.y - 21 },
    { x: h.x + 21, y: h.y - 11 },
    { x: h.x + 24, y: h.y + 2 },
    { x: h.x + 15, y: h.y + 13 },
    { x: h.x - 3, y: h.y + 19 },
  ];
  const head = catmull(hp, 6);
  head.push(head[0]);
  fillPolygon(c, head, CREAM, smoothstep(0.55, 0.9, S.head) * 0.98);
  if (S.head > 0.6) {
    c.save();
    c.globalAlpha = smoothstep(0.6, 1, S.head) * 0.8;
    c.beginPath();
    c.moveTo(head[0].x, head[0].y);
    for (let i = 1; i < head.length; i += 1) c.lineTo(head[i].x, head[i].y);
    c.closePath();
    c.clip();
    const hg = c.createLinearGradient(0, h.y - 22, 0, h.y + 18);
    hg.addColorStop(0, 'rgba(196, 176, 140, 0)');
    hg.addColorStop(1, 'rgba(186, 164, 124, 0.24)');
    c.fillStyle = hg;
    c.fillRect(h.x - 26, h.y - 24, 52, 48);
    c.restore();
  }
  partialStroke(c, head, S.head, INK, 2.3);

  // crown crease and cheek
  if (S.head > 0.72) {
    c.save();
    c.globalAlpha = smoothstep(0.72, 1, S.head) * 0.45;
    c.strokeStyle = INK2;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(h.x - 12, h.y - 12);
    c.quadraticCurveTo(h.x - 2, h.y - 16, h.x + 9, h.y - 12);
    c.stroke();
    c.globalAlpha = smoothstep(0.72, 1, S.head) * 0.3;
    c.beginPath();
    c.moveTo(h.x - 1, h.y + 8);
    c.quadraticCurveTo(h.x + 8, h.y + 12, h.x + 16, h.y + 6);
    c.stroke();
    c.restore();
  }

  // tiny nape tuft
  if (S.head > 0.85) {
    c.save();
    c.globalAlpha = smoothstep(0.85, 1, S.head) * 0.85;
    c.strokeStyle = INK;
    c.lineWidth = 1.4;
    for (let i = 0; i < 2; i += 1) {
      c.beginPath();
      c.moveTo(h.x - 19, h.y - 1 + i * 3);
      c.quadraticCurveTo(h.x - 23, h.y - 4 + i * 3, h.x - 24, h.y - 8 + i * 4);
      c.stroke();
    }
    c.restore();
  }

  if (S.beak > 0.02) {
    const base = { x: h.x + 18, y: h.y + 2 };
    const tip = { x: h.x + 104, y: h.y + 14 };
    const center = cubicPts(
      base,
      { x: h.x + 46, y: h.y },
      { x: h.x + 84, y: h.y + 7 },
      tip,
      22,
    );
    const upper = ribbon(center, 9.4, 1.8);
    const beakFill = mix('#e8b877', '#c67d24', smoothstep(0.1, 0.85, S.color));

    // gular pouch sits under the mandible; its lip follows the beak's lower edge
    const pp = clamp((S.beak - 0.22) / 0.78);
    let pouchPoly = null;
    if (pp > 0) {
      const belly = cubicPts(
        { x: base.x + 2, y: base.y + 7 },
        { x: base.x + 12, y: base.y + 57 },
        { x: base.x + 72, y: base.y + 51 },
        { x: tip.x - 10, y: tip.y + 9 },
        22,
      );
      const lip = center.slice().reverse().map((pt, i, arr) => ({
        x: pt.x,
        y: pt.y + 1.4 + (i / arr.length) * 1.8,
      }));
      pouchPoly = [...belly, { x: tip.x, y: tip.y + 5 }, ...lip];
      const pouchFill = mix('#e8b877', POUCH, smoothstep(0.05, 0.85, S.color));
      fillPolygon(c, pouchPoly, pouchFill, smoothstep(0.4, 0.88, pp) * 0.98);
      if (S.color > 0.15) {
        c.save();
        c.globalAlpha = smoothstep(0.15, 0.6, S.color) * smoothstep(0.4, 0.88, pp);
        c.beginPath();
        c.moveTo(pouchPoly[0].x, pouchPoly[0].y);
        for (let i = 1; i < pouchPoly.length; i += 1) c.lineTo(pouchPoly[i].x, pouchPoly[i].y);
        c.closePath();
        c.clip();
        const pg2 = c.createLinearGradient(0, base.y + 2, 0, base.y + 52);
        pg2.addColorStop(0, 'rgba(255, 232, 184, 0.35)');
        pg2.addColorStop(0.55, 'rgba(255, 220, 158, 0.05)');
        pg2.addColorStop(1, 'rgba(150, 84, 18, 0.28)');
        c.fillStyle = pg2;
        c.fillRect(base.x - 10, base.y - 4, 130, 70);
        c.restore();
      }
    }

    // upper mandible over the pouch, so the seam is one clean beak line
    fillPolygon(c, [...upper.A, ...upper.B.slice().reverse()], beakFill, smoothstep(0.3, 0.78, S.beak));
    partialStroke(c, upper.A, S.beak, INK, 1.7);
    partialStroke(c, upper.B, S.beak, INK, 2.0);
    // ridge along the culmen
    if (S.beak > 0.7) {
      c.save();
      c.globalAlpha = smoothstep(0.7, 1, S.beak) * 0.28;
      c.strokeStyle = '#7a4a12';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(base.x + 8, base.y + 1);
      c.quadraticCurveTo(base.x + 48, base.y + 2, tip.x - 10, tip.y - 4);
      c.stroke();
      c.restore();
    }

    if (pouchPoly) {
      partialStroke(c, pouchPoly, pp, INK, 1.8);
      if (pp > 0.7) {
        c.save();
        c.globalAlpha = smoothstep(0.7, 1, pp) * 0.4;
        c.strokeStyle = INK;
        c.lineWidth = 1;
        for (let i = 0; i < 3; i += 1) {
          c.beginPath();
          c.moveTo(base.x + 15 + i * 12, base.y + 12 + i * 3);
          c.quadraticCurveTo(base.x + 28 + i * 12, base.y + 36 + i * 2, base.x + 48 + i * 10, base.y + 40 + i);
          c.stroke();
        }
        c.restore();
      }
    }

    // hooked nail at the tip
    if (S.beak > 0.8) {
      c.save();
      c.globalAlpha = smoothstep(0.8, 1, S.beak);
      c.strokeStyle = INK;
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(tip.x - 2, tip.y - 2);
      c.quadraticCurveTo(tip.x + 6, tip.y + 2, tip.x + 2, tip.y + 8);
      c.stroke();
      c.fillStyle = mix('#f1e6d0', '#9a5a1c', smoothstep(0.2, 1, S.color));
      c.beginPath();
      c.ellipse(tip.x - 1, tip.y + 1, 4, 3, 0.5, 0, TAU);
      c.fill();
      c.restore();
    }
  }

  // eye
  if (S.head > 0.82) {
    const ea = smoothstep(0.82, 1, S.head);
    const ex = h.x + 9;
    const ey = h.y - 6;
    c.save();
    c.globalAlpha = ea;
    c.fillStyle = '#fffdf6';
    c.strokeStyle = INK;
    c.lineWidth = 1.1;
    c.beginPath();
    c.ellipse(ex, ey, 5.2, 4.2, 0, 0, TAU);
    c.fill();
    c.stroke();
    if (pose.blink < 0.5) {
      c.fillStyle = INK;
      c.beginPath();
      c.arc(ex + 1.1, ey + 0.3, 2.15, 0, TAU);
      c.fill();
      c.fillStyle = '#fffdf6';
      c.beginPath();
      c.arc(ex + 2.2, ey - 1, 0.8, 0, TAU);
      c.fill();
    } else {
      c.strokeStyle = INK;
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(ex - 5, ey + 1);
      c.quadraticCurveTo(ex, ey + 3, ex + 5, ey - 1);
      c.stroke();
    }
    // brow
    c.globalAlpha = ea * 0.65;
    c.strokeStyle = INK;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(ex - 6, ey - 5.4);
    c.quadraticCurveTo(ex + 1, ey - 7.6, ex + 7, ey - 4);
    c.stroke();
    c.restore();
  }

  // nostril line
  if (S.beak > 0.7) {
    c.save();
    c.globalAlpha = smoothstep(0.7, 1, S.beak) * 0.75;
    c.strokeStyle = INK;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(h.x + 26, h.y + 1);
    c.quadraticCurveTo(h.x + 31, h.y + 1, h.x + 35, h.y + 3);
    c.stroke();
    c.restore();
  }
}

function paintDetails(c, pose, S) {
  const d = S.detail;
  if (d <= 0.02) return;
  const b = pose.body;
  c.save();
  c.globalAlpha = smoothstep(0, 0.4, d);

  // body feather hatching
  c.strokeStyle = INK2;
  c.lineWidth = 0.9;
  for (let i = 0; i < 13; i += 1) {
    const t = i / 12;
    const x = b.x - 34 + t * 66;
    const y = b.y + 14 + Math.sin(t * Math.PI) * 12;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 4, y + 7, x + 1, y + 12);
    c.stroke();
  }

  // frame shadow under the bird
  c.globalAlpha = smoothstep(0.1, 0.6, d) * 0.3;
  c.strokeStyle = '#7d725c';
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(b.x - 34, b.y + 24);
  c.quadraticCurveTo(b.x - 2, b.y + 32, b.x + 24, b.y + 22);
  c.stroke();

  // contact shadow where the body meets the top tube
  c.globalAlpha = smoothstep(0.2, 0.7, d) * 0.35;
  c.strokeStyle = '#6f6653';
  c.lineWidth = 3.2;
  c.beginPath();
  c.moveTo(b.x + 34, b.y + 34);
  c.lineTo(b.x + 46, b.y + 35);
  c.stroke();

  // ground contact accents
  c.globalAlpha = smoothstep(0.1, 0.6, d) * 0.55;
  c.fillStyle = '#7c725c';
  for (const hub of [pose.wheels.rear, pose.wheels.front]) {
    c.beginPath();
    c.ellipse(hub.x, 2, 14, 2.2, 0, 0, TAU);
    c.fill();
  }
  // ground hatching under the contact patches
  c.globalAlpha = smoothstep(0.2, 0.7, d) * 0.3;
  c.strokeStyle = '#7c725c';
  c.lineWidth = 0.8;
  for (const hub of [pose.wheels.rear, pose.wheels.front]) {
    for (let i = -2; i <= 2; i += 1) {
      c.beginPath();
      c.moveTo(hub.x + i * 6 - 4, 5);
      c.lineTo(hub.x + i * 6 + 2, 9);
      c.stroke();
    }
  }

  // back feathers along the spine
  c.globalAlpha = smoothstep(0, 0.4, d) * 0.4;
  c.strokeStyle = INK2;
  c.lineWidth = 0.9;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(b.x + 32 - i * 12, b.y - 26 + i * 3);
    c.quadraticCurveTo(b.x + 27 - i * 12, b.y - 19 + i * 3, b.x + 31 - i * 11, b.y - 12 + i * 3);
    c.stroke();
  }

  // breast feathers, blending the neck into the body
  c.globalAlpha = smoothstep(0, 0.4, d) * 0.55;
  c.strokeStyle = INK;
  c.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.moveTo(b.x + 34 + i * 5, b.y - 12 + i * 5);
    c.quadraticCurveTo(b.x + 26 + i * 5, b.y - 4 + i * 5, b.x + 30 + i * 4, b.y + 6 + i * 4);
    c.stroke();
  }

  // front brake and cable
  c.globalAlpha = smoothstep(0.1, 0.5, d) * 0.8;
  c.strokeStyle = INK;
  c.lineWidth = 1.2;
  const hub = pose.wheels.front;
  c.beginPath();
  c.arc(hub.x + 2, hub.y - 48, 6.5, Math.PI * 0.15, Math.PI * 0.85);
  c.stroke();
  c.beginPath();
  c.moveTo(hub.x + 4, hub.y - 54);
  c.quadraticCurveTo(hub.x + 12, hub.y - 72, hub.x + 20, hub.y - 84);
  c.stroke();

  // a couple of pencil construction remnants, kept very faint
  c.globalAlpha = 0.12;
  c.strokeStyle = BLUE;
  c.lineWidth = 0.6;
  c.beginPath();
  c.moveTo(-120, 0);
  c.lineTo(150, 0);
  c.stroke();

  c.restore();
}

function drawSelection(c, pose, S) {
  // handled inside paintRider? no: drawn after for crisp blue UI
  const a = S.sel;
  if (a <= 0.02) return;
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = alpha(BLUE, 0.72);
  c.lineWidth = 1;
  c.setLineDash([6, 5]);
  c.strokeRect(-152, -300, 348, 318);
  c.setLineDash([]);

  c.fillStyle = '#f8f5ea';
  c.strokeStyle = BLUE;
  c.lineWidth = 1.2;
  const handles = [
    [-152, -300], [22, -300], [196, -300],
    [-152, -141], [196, -141],
    [-152, 18], [22, 18], [196, 18],
  ];
  for (const [x, y] of handles) {
    c.beginPath();
    c.rect(x - 3.4, y - 3.4, 6.8, 6.8);
    c.fill();
    c.stroke();
  }

  // anchor nodes on the drawing
  const nodes = [
    { x: pose.wheels.rear.x, y: pose.wheels.rear.y },
    { x: pose.wheels.front.x, y: pose.wheels.front.y },
    { x: pose.head.x, y: pose.head.y },
    { x: pose.beak.tip.x, y: pose.beak.tip.y },
  ];
  c.fillStyle = BLUE;
  c.strokeStyle = '#f8f5ea';
  c.lineWidth = 1;
  for (const n of nodes) {
    c.beginPath();
    c.rect(n.x - 2.6, n.y - 2.6, 5.2, 5.2);
    c.fill();
    c.stroke();
  }
  c.restore();
}

function penTip(pose, S) {
  if (S.wheel > 0 && S.wheel < 1) {
    const a = -Math.PI / 2 + TAU * S.wheel;
    return { x: 72 + Math.cos(a) * 50, y: -50 + Math.sin(a) * 50 };
  }
  if (S.frame > 0 && S.frame < 1) {
    const f = pose.frame;
    const tubes = [
      [f.rearHub, f.crank], [f.crank, f.seatCluster], [f.seatCluster, f.rearHub],
      [f.crank, f.headTop], [f.seatCluster, f.headTop], [f.headTop, f.frontHub],
      [f.seatCluster, f.saddle], [f.headTop, f.stemTop], [f.stemTop, f.grip],
    ];
    for (let i = 0; i < tubes.length; i += 1) {
      const p = clamp((S.frame - i * 0.055) / 0.56);
      if (p > 0 && p < 1) return pointAlong(tubes[i], p);
    }
  }
  if (S.body > 0 && S.body < 1) {
    const pts = ellipsePts(pose.body.x, pose.body.y, pose.body.rx, pose.body.ry, pose.body.rot);
    return pointAlong(pts, S.body);
  }
  if (S.neck > 0 && S.neck < 1) {
    return pointAlong(catmull(pose.neck, 9), S.neck);
  }
  if (S.beak > 0 && S.beak < 1) {
    return pointAlong(cubicPts(
      pose.beak.base,
      { x: pose.beak.base.x + 34, y: pose.beak.base.y + 4 },
      { x: pose.beak.base.x + 70, y: pose.beak.base.y + 7 },
      pose.beak.tip,
    ), S.beak);
  }
  if (S.wing > 0 && S.wing < 1) {
    const b = pose.body;
    return { x: b.x - 30 - 50 * S.wing, y: b.y + 4 + 26 * S.wing };
  }
  if (S.legs > 0 && S.legs < 1) {
    return pose.legs.near.ankle;
  }
  return null;
}

function drawPen(c, pose, S) {
  const tip = penTip(pose, S);
  if (!tip) return;
  c.save();
  c.shadowColor = alpha(BLUE, 0.8);
  c.shadowBlur = 10;
  c.fillStyle = BLUE;
  c.beginPath();
  c.arc(tip.x, tip.y, 3.2, 0, TAU);
  c.fill();
  c.shadowColor = 'transparent';
  c.fillStyle = '#f8f5ea';
  c.beginPath();
  c.arc(tip.x, tip.y, 1.1, 0, TAU);
  c.fill();
  c.restore();
}

// ---------------------------------------------------------------- title

function drawCodeTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const s = H / 1080;
  const w = 520 * s;
  const h = 144 * s;
  const x = 92 * s;
  const y = H - 236 * s + lift * 0.7 * s;
  const tabW = 210 * s;
  const tabH = 34 * s;

  c.save();
  c.globalAlpha = opacity;
  c.translate(0, lift * 0.35 * s);

  // glow
  const gl = c.createRadialGradient(x + w * 0.4, y + h, 10, x + w * 0.4, y + h, w * 0.8);
  gl.addColorStop(0, 'rgba(88, 166, 255, 0.14)');
  gl.addColorStop(1, 'rgba(88, 166, 255, 0)');
  c.fillStyle = gl;
  c.fillRect(x - 40 * s, y - 50 * s, w + 80 * s, h + 110 * s);

  // plate shadow
  c.shadowColor = 'rgba(0, 0, 0, 0.6)';
  c.shadowBlur = 30 * s;
  c.shadowOffsetY = 10 * s;
  c.fillStyle = 'rgba(11, 15, 20, 0.96)';
  rr(c, x, y, w, h, 6 * s);
  c.fill();
  c.shadowColor = 'transparent';

  // tab, sitting on the plate's top edge
  c.fillStyle = '#121a24';
  c.beginPath();
  c.moveTo(x, y + 1);
  c.lineTo(x, y - tabH + 6 * s);
  c.quadraticCurveTo(x, y - tabH, x + 6 * s, y - tabH);
  c.lineTo(x + tabW - 6 * s, y - tabH);
  c.quadraticCurveTo(x + tabW, y - tabH, x + tabW, y - tabH + 6 * s);
  c.lineTo(x + tabW, y + 1);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(48, 54, 61, 0.95)';
  c.lineWidth = 1 * s;
  c.stroke();

  // accent: syntax colours along the tab and plate edge
  const acc = c.createLinearGradient(x, 0, x + tabW, 0);
  acc.addColorStop(0, BLUE);
  acc.addColorStop(0.6, GREEN);
  acc.addColorStop(1, ORANGE);
  c.fillStyle = acc;
  c.fillRect(x + 1 * s, y - tabH + 1 * s, tabW - 2 * s, 2.2 * s);

  // tab label
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = BLUE;
  rr(c, x + 16 * s, y - 19 * s, 9 * s, 9 * s, 2 * s);
  c.fill();
  setFont(c, 12 * s, 500, MONO, '0.2px');
  c.fillStyle = alpha(DIM, 0.95);
  c.fillText('s20_code.js', x + 32 * s, y - 10 * s);
  c.fillStyle = ORANGE;
  c.beginPath();
  c.arc(x + 32 * s + c.measureText('s20_code.js').width + 11 * s, y - 15 * s, 2.4 * s, 0, TAU);
  c.fill();

  // plate border and inner top rule
  c.strokeStyle = 'rgba(48, 54, 61, 0.95)';
  c.lineWidth = 1 * s;
  rr(c, x, y, w, h, 6 * s);
  c.stroke();

  c.textAlign = 'right';
  setFont(c, 10.5 * s, 500, UI, '1.2px');
  c.fillStyle = alpha(GREEN, 0.92);
  c.fillText('● SYNCED', x + w - 18 * s, y + 24 * s);
  c.textAlign = 'left';

  c.strokeStyle = 'rgba(48, 54, 61, 0.75)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(x + 18 * s, y + 36 * s);
  c.lineTo(x + w - 18 * s, y + 36 * s);
  c.stroke();

  // title
  setFont(c, 36 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#e6edf3';
  c.fillText('代码美学', x + 18 * s, y + 78 * s);

  setFont(c, 13 * s, 500, UI, '3.2px');
  c.fillStyle = alpha(BLUE, 0.95);
  c.fillText('CODE AESTHETIC', x + 20 * s, y + 102 * s);

  setFont(c, 12 * s, 400, MONO, '0.2px');
  c.fillStyle = alpha(DIM, 0.9);
  c.fillText('20 / 20  ·  2020s  ·  120 BPM', x + 19 * s, y + 126 * s);

  // tiny code motif at the right of the plate
  const mx = x + w - 146 * s;
  const my = y + 58 * s;
  const motif = [
    [BLUE, 94, 3],
    [GREEN, 62, 3],
    [ORANGE, 34, 3],
    [alpha(TEXT, 0.35), 76, 3],
  ];
  motif.forEach(([col, len, hh], i) => {
    c.fillStyle = col;
    c.globalAlpha = opacity * 0.5;
    c.fillRect(mx, my + i * 12 * s, len * s, hh * s);
  });
  c.globalAlpha = opacity;

  c.restore();
}
