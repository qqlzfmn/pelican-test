// 17 — early chat client (2000s). A fictional desktop, a blue-chrome window,
// a contact list, and a received 256-colour GIF of the pelican riding. The GIF
// and the typing dots run at 10 Hz; the window shakes on the moment the reply
// lands. Drawn in screen space so the UI never swims with the camera.

import { basePalette } from './_placeholder.js';
import { clamp, easeOut, TAU } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, neutralStyle } from '../rig/draw.js';
import { EN_FONT, setFont } from '../kit/cards.js';

const pal = basePalette({
  bg: '#dfe7ee', bg2: '#cbd8e4', motif: '#4f7ea8', accent: '#2f76b5',
  ink: '#26313b', ground: '#c6d3df', road: '#b1c2d2', dash: '#f4f8fb',
  body: '#ffffff', beak: '#e0923c', rigInk: '#202a33',
});

const APP = '青鸟聊天';
const APP_VER = '2003';
const APP_EN = 'BLUEBIRD CHAT';

const UI = '"Tahoma", "Verdana", "PingFang SC", "Microsoft YaHei", sans-serif';
const UI_CN = '"PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif';

const STEEL = '#4f7ea8';
const DEEP = '#2f76b5';
const SILVER = '#dfe7ee';
const TEXT = '#26313b';
const MUTED = '#6b8091';

const CONTACTS = [
  { name: '路过的牛', note: '在线 · 一起骑车', kind: 'cow', active: true },
  { name: '岩壁上的风', note: '在线 · 山路组', kind: 'wind' },
  { name: '宋画里的小路人', note: '离开', kind: 'mountain' },
  { name: '8bit咸鱼', note: '在线 · 挂机中', kind: 'pixel' },
  { name: '博物馆夜班', note: '在线', kind: 'column' },
  { name: '修勾不修图', note: '手机在线', kind: 'dog' },
];

const GIF_NAME = '鹈鹕骑车.gif';
const GIF_META = '32 KB · 256 色 · 10 帧 · 140×84';

export default {
  id: 's17',
  number: 17,
  cn: '早期聊天窗口',
  en: 'Early Chat Client',
  year: '2000s',
  motif: 'grid',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const W = g.width;
    const H = g.height;
    const s = H / 1080;

    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);

    drawDesktop(c, W, H, s, ctx.local);

    const shake = windowShake(ctx.local, s);
    const L = layout(W, H, s);
    const compact = ctx.thumbnail || W < H * 1.2;
    c.save();
    c.translate(shake.x, shake.y);
    drawWindow(g, ctx, L, compact);
    c.restore();

    c.restore();
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawChatTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- layout

function layout(W, H, s) {
  const w = Math.min(1420 * s, W - 160 * s);
  const h = Math.min(830 * s, H - 190 * s);
  return {
    x: (W - w) / 2,
    y: Math.max(36 * s, (H - h) * 0.32),
    w,
    h,
    s,
  };
}

function windowShake(local, s) {
  let x = 0;
  let y = 0;
  // The reply lands on local 3.0; the frame rocks and settles.
  const pulses = [
    [3.0, 17],
    [4.0, 5],
  ];
  for (const [t0, amp] of pulses) {
    const dt = local - t0;
    if (dt < 0 || dt > 0.8) continue;
    const env = Math.exp(-dt * 7.4);
    x += Math.sin(dt * 62 + 1.0) * amp * env * s;
    y += Math.cos(dt * 51 + 0.4) * amp * 0.42 * env * s;
  }
  return { x, y };
}

// ---------------------------------------------------------------- desktop

function drawDesktop(c, W, H, s, local) {
  const grad = c.createLinearGradient(0, 0, W * 0.35, H);
  grad.addColorStop(0, '#8fb9d3');
  grad.addColorStop(0.46, '#5c8bad');
  grad.addColorStop(1, '#2f5b79');
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // Glossy diagonal weave, the wallpaper of the period.
  c.save();
  c.translate(W * 0.5, H * 0.42);
  c.rotate(-0.42);
  c.globalAlpha = 0.055;
  c.fillStyle = '#ffffff';
  for (let x = -W; x < W; x += 96 * s) {
    c.fillRect(x, -H, 34 * s, H * 2);
  }
  c.restore();

  // A broad soft swell in the upper right.
  const glow = c.createRadialGradient(W * 0.78, H * 0.18, 10 * s, W * 0.78, H * 0.18, W * 0.5);
  glow.addColorStop(0, 'rgba(218, 240, 252, 0.34)');
  glow.addColorStop(1, 'rgba(218, 240, 252, 0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Faint concentric ring, an original wallpaper motif.
  c.strokeStyle = 'rgba(255,255,255,0.10)';
  c.lineWidth = 1.4 * s;
  for (let i = 0; i < 5; i += 1) {
    c.beginPath();
    c.arc(W * 0.83, H * 0.74, (120 + i * 96) * s, 0, TAU);
    c.stroke();
  }

  drawDesktopIcons(c, W, H, s);
  drawTaskbar(c, W, H, s, local);
}

function drawDesktopIcons(c, W, H, s) {
  const icons = [
    { label: '我的鹈鹕', kind: 'bird' },
    { label: '聊天记录', kind: 'chat' },
    { label: '公路照片', kind: 'photo' },
    { label: '旧草稿', kind: 'doc' },
  ];
  const x = 46 * s;
  let y = 76 * s;
  for (const icon of icons) {
    const sz = 48 * s;
    c.save();
    c.shadowColor = 'rgba(6, 18, 28, 0.4)';
    c.shadowBlur = 8 * s;
    c.shadowOffsetY = 2 * s;
    bevel(c, x, y, sz, sz, '#eef4f9', {
      thick: 2 * s,
      light: 'rgba(255,255,255,0.95)',
      dark: 'rgba(88, 116, 139, 0.7)',
    });
    c.restore();
    drawTinyIcon(c, x + sz * 0.5, y + sz * 0.5, sz * 0.62, icon.kind, 1);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    setFont(c, 12.5 * s, 500, UI_CN, '0.2px');
    c.fillStyle = 'rgba(255,255,255,0.94)';
    c.shadowColor = 'rgba(4, 14, 24, 0.85)';
    c.shadowBlur = 4 * s;
    c.shadowOffsetY = 1 * s;
    c.fillText(icon.label, x + sz * 0.5, y + sz + 7 * s);
    c.shadowColor = 'transparent';
    y += sz + 44 * s;
  }
}

function drawTinyIcon(c, cx, cy, size, kind, alphaV = 1) {
  const u = size / 10;
  const px = (gx, gy, gw, gh, color) => {
    c.fillStyle = color;
    c.fillRect(Math.round(cx + (gx - 5) * u), Math.round(cy + (gy - 5) * u), Math.ceil(gw * u), Math.ceil(gh * u));
  };
  c.save();
  c.globalAlpha = alphaV;
  if (kind === 'bird') {
    px(2, 3, 4, 4, '#fdfbf2');
    px(1, 4, 1, 2, '#fdfbf2');
    px(6, 4, 3, 2, '#e0923c');
    px(6, 6, 2, 1, '#c9762a');
    px(4, 4, 1, 1, '#202a33');
    px(3, 8, 3, 1, '#2f76b5');
  } else if (kind === 'chat') {
    px(2, 3, 6, 4, '#2f76b5');
    px(3, 4, 4, 2, '#cfe6f8');
    px(3, 7, 1, 1, '#2f76b5');
  } else if (kind === 'photo') {
    px(2, 2, 6, 6, '#f4f8fb');
    px(3, 3, 4, 4, '#7fa8c4');
    px(4, 5, 2, 2, '#8a9d6c');
    px(3, 3, 1, 1, '#f2d98a');
  } else {
    px(3, 2, 4, 6, '#f7fafc');
    px(4, 3, 2, 1, '#8ba3b5');
    px(4, 5, 2, 1, '#8ba3b5');
    px(4, 7, 2, 1, '#8ba3b5');
  }
  c.restore();
}

function drawTaskbar(c, W, H, s, local) {
  const h = 56 * s;
  const y = H - h;
  c.save();
  group(c, () => {
    const gr = c.createLinearGradient(0, y, 0, H);
    gr.addColorStop(0, '#f2f7fb');
    gr.addColorStop(0.12, '#d6e2ec');
    gr.addColorStop(0.55, '#b9c9d7');
    gr.addColorStop(1, '#97abbb');
    c.fillStyle = gr;
    c.fillRect(0, y, W, h);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(0, y, W, 2 * s);
    c.fillStyle = 'rgba(40, 64, 84, 0.35)';
    c.fillRect(0, y, W, 1 * s);
  });

  // Launcher.
  const lx = 8 * s;
  const lw = 108 * s;
  const lh = h - 10 * s;
  const ly = y + 5 * s;
  const lg = c.createLinearGradient(0, ly, 0, ly + lh);
  lg.addColorStop(0, '#6fa6cf');
  lg.addColorStop(0.5, '#3d7fb2');
  lg.addColorStop(1, '#245f8f');
  rounded(c, lx, ly, lw, lh, 6 * s);
  c.fillStyle = lg;
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 1 * s;
  c.stroke();
  drawTinyIcon(c, lx + 24 * s, ly + lh * 0.5, 26 * s, 'bird', 1);
  text(c, '青鸟', lx + 44 * s, ly + lh * 0.5, 18 * s, '#ffffff', 700, UI_CN, 'left', 1 * s);

  // Running task; flashes while the gag message is unread.
  const tx = lx + lw + 10 * s;
  const tw = 176 * s;
  const flash = newMessageFlash(local);
  bevel(c, tx, ly, tw, lh, flash > 0 ? mixHex('#c6d5e2', '#f2c46c', flash) : '#c6d5e2', {
    thick: 2 * s,
    light: 'rgba(121, 145, 166, 0.8)',
    dark: 'rgba(255,255,255,0.9)',
  });
  drawTinyIcon(c, tx + 22 * s, ly + lh * 0.5, 24 * s, 'chat', 1);
  text(c, '青鸟聊天', tx + 42 * s, ly + lh * 0.5, 15 * s, '#2c3f4f', 600, UI_CN);
  if (flash > 0.02) {
    c.fillStyle = flash > 0.5 ? '#e0653f' : '#c9532f';
    c.beginPath();
    c.arc(tx + tw - 13 * s, ly + lh * 0.5, 8 * s, 0, TAU);
    c.fill();
    text(c, '1', tx + tw - 13 * s, ly + lh * 0.5 + 4 * s, 11 * s, '#ffffff', 700, UI, 'center');
  }

  // Tray.
  const rx = W - 150 * s;
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(rx - 12 * s, ly, 1 * s, lh);
  text(c, '36.6K', rx, ly + lh * 0.5, 12 * s, '#3a5265', 500, UI, 'left', '0.4px');
  const mm = 14 + Math.floor(local / 2);
  text(c, `21:${String(mm).padStart(2, '0')}`, W - 14 * s, ly + lh * 0.5, 16 * s, '#253a4a', 600, UI, 'right');
  c.restore();
}

// ---------------------------------------------------------------- window

function drawWindow(g, ctx, L, compact = false) {
  const c = g.drawingContext;
  const { x, y, w, h, s } = L;
  const pad = 3 * s;

  // Drop shadow + shell.
  c.save();
  c.shadowColor = 'rgba(5, 14, 24, 0.5)';
  c.shadowBlur = 42 * s;
  c.shadowOffsetY = 14 * s;
  c.fillStyle = SILVER;
  rounded(c, x, y, w, h, 7 * s);
  c.fill();
  c.restore();

  const shell = c.createLinearGradient(x, y, x + w, y + h);
  shell.addColorStop(0, '#f2f7fb');
  shell.addColorStop(0.5, '#dbe5ed');
  shell.addColorStop(1, '#c3d2de');
  rounded(c, x, y, w, h, 7 * s);
  c.fillStyle = shell;
  c.fill();

  // Shell bevel.
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = 1.2 * s;
  rounded(c, x + 0.6 * s, y + 0.6 * s, w - 1.2 * s, h - 1.2 * s, 7 * s);
  c.stroke();
  c.strokeStyle = 'rgba(87, 112, 132, 0.55)';
  rounded(c, x + w - 1 * s, y + h - 1 * s, 0, 0, 0);
  c.beginPath();
  c.moveTo(x + 7 * s, y + h - 0.5 * s);
  c.lineTo(x + w - 7 * s, y + h - 0.5 * s);
  c.moveTo(x + w - 0.5 * s, y + 7 * s);
  c.lineTo(x + w - 0.5 * s, y + h - 7 * s);
  c.stroke();

  c.save();
  rounded(c, x + pad, y + pad, w - pad * 2, h - pad * 2, 5 * s);
  c.clip();

  const inner = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 };
  const titleH = 54 * s;
  const menuH = 26 * s;
  const statusH = 22 * s;
  drawTitleBar(c, inner, titleH);
  drawMenuBar(c, inner, titleH, menuH);

  const body = {
    x: inner.x,
    y: inner.y + titleH + menuH,
    w: inner.w,
    h: inner.h - titleH - menuH - statusH,
  };
  const contactW = compact ? 0 : Math.min(292 * s, body.w * 0.3);
  const contacts = { x: body.x, y: body.y, w: contactW, h: body.h };
  const chat = { x: body.x + contactW, y: body.y, w: body.w - contactW, h: body.h };

  if (!compact) drawContacts(c, contacts, s);
  drawChat(g, ctx, chat, s, ctx.local);
  drawStatusBar(c, inner, titleH + menuH + body.h, statusH);

  c.restore();

  // Outer edge.
  c.strokeStyle = 'rgba(56, 79, 98, 0.75)';
  c.lineWidth = 1 * s;
  rounded(c, x + 0.5 * s, y + 0.5 * s, w - 1 * s, h - 1 * s, 7 * s);
  c.stroke();
}

function drawTitleBar(c, inner, titleH) {
  const { x, y, w } = inner;
  const gr = c.createLinearGradient(x, y, x, y + titleH);
  gr.addColorStop(0, '#7fb1da');
  gr.addColorStop(0.14, '#4b8cc5');
  gr.addColorStop(0.52, '#2f76b5');
  gr.addColorStop(1, '#1e5d97');
  c.fillStyle = gr;
  c.fillRect(x, y, w, titleH);

  // Gloss.
  c.fillStyle = 'rgba(255,255,255,0.20)';
  c.fillRect(x, y + 1, w, titleH * 0.38);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(x, y + titleH * 0.38, w, titleH * 0.1);
  c.fillStyle = 'rgba(12, 40, 66, 0.28)';
  c.fillRect(x, y + titleH - 1, w, 1);

  const s = titleH / 54;
  // Original app mark: two speech plates.
  const ix = x + 12 * s;
  const iy = y + titleH * 0.5 - 15 * s;
  rounded(c, ix, iy, 26 * s, 20 * s, 3 * s);
  c.fillStyle = '#f4f9fd';
  c.fill();
  rounded(c, ix + 8 * s, iy + 8 * s, 24 * s, 18 * s, 3 * s);
  c.fillStyle = '#cfe6f6';
  c.fill();
  c.fillStyle = '#2f76b5';
  c.fillRect(ix + 12 * s, iy + 12 * s, 16 * s, 2 * s);
  c.fillRect(ix + 12 * s, iy + 17 * s, 10 * s, 2 * s);

  text(c, `${APP} ${APP_VER}`, x + 50 * s, y + titleH * 0.5 + 1 * s, 19 * s, '#ffffff', 700, UI_CN, 'left', 0.6 * s);
  text(c, '· 与 路过的牛 聊天中', x + 186 * s, y + titleH * 0.5 + 1 * s, 14 * s, 'rgba(238, 248, 255, 0.78)', 400, UI_CN);

  // Window controls.
  const bw = 24 * s;
  const bh = 20 * s;
  const gap = 4 * s;
  const by = y + (titleH - bh) / 2;
  const bx = x + w - (bw + gap) * 3 - 8 * s;
  const glyphs = ['min', 'max', 'close'];
  for (let i = 0; i < 3; i += 1) {
    const gx = bx + i * (bw + gap);
    bevel(c, gx, by, bw, bh, i === 2 ? '#d76b5f' : '#c9dcec', {
      thick: 1.4 * s,
      light: 'rgba(255,255,255,0.85)',
      dark: 'rgba(45, 80, 108, 0.6)',
    });
    c.strokeStyle = i === 2 ? '#ffffff' : '#2b4b64';
    c.lineWidth = 1.7 * s;
    c.lineCap = 'round';
    const mx = gx + bw * 0.5;
    const my = by + bh * 0.5;
    c.beginPath();
    if (i === 0) {
      c.moveTo(mx - 4 * s, my + 3 * s);
      c.lineTo(mx + 4 * s, my + 3 * s);
    } else if (i === 1) {
      c.rect(mx - 4 * s, my - 4 * s, 8 * s, 7 * s);
    } else {
      c.moveTo(mx - 4 * s, my - 4 * s);
      c.lineTo(mx + 4 * s, my + 4 * s);
      c.moveTo(mx + 4 * s, my - 4 * s);
      c.lineTo(mx - 4 * s, my + 4 * s);
    }
    c.stroke();
  }
}

function drawMenuBar(c, inner, titleH, menuH) {
  const { x, w } = inner;
  const y = inner.y + titleH;
  const gr = c.createLinearGradient(0, y, 0, y + menuH);
  gr.addColorStop(0, '#f4f8fb');
  gr.addColorStop(1, '#dde6ee');
  c.fillStyle = gr;
  c.fillRect(x, y, w, menuH);
  c.fillStyle = 'rgba(80, 105, 125, 0.45)';
  c.fillRect(x, y + menuH - 1, w, 1);

  const items = ['文件', '编辑', '查看', '工具', '帮助'];
  let mx = x + 14 * (menuH / 26);
  const size = 13 * (menuH / 26);
  for (const item of items) {
    text(c, item, mx, y + menuH * 0.54, size, '#2f4658', 400, UI_CN);
    mx += (item.length * size + 22 * (menuH / 26));
  }
  text(
    c,
    `好友在线 6 / 12   ·   连接正常`,
    x + w - 14 * (menuH / 26),
    y + menuH * 0.54,
    11.5 * (menuH / 26),
    '#62809a',
    400,
    UI_CN,
    'right',
    '0.4px',
  );
}

function drawStatusBar(c, inner, offsetY, statusH) {
  const { x, w } = inner;
  const y = inner.y + offsetY;
  const u = statusH / 22;
  const gr = c.createLinearGradient(0, y, 0, y + statusH);
  gr.addColorStop(0, '#e4ecf3');
  gr.addColorStop(1, '#cedae5');
  c.fillStyle = gr;
  c.fillRect(x, y, w, statusH);
  c.fillStyle = 'rgba(255,255,255,0.8)';
  c.fillRect(x, y, w, 1);
  text(c, '已连接  ·  36.6 Kbps  ·  代理：无', x + 12 * u, y + statusH * 0.55, 10.5 * u, '#5b7387', 400, UI_CN);
  text(c, `${APP_EN} ${APP_VER}`, x + w - 12 * u, y + statusH * 0.55, 10.5 * u, '#5b7387', 500, EN_FONT, 'right', '1.2px');
}

// ---------------------------------------------------------------- contacts

function drawContacts(c, r, s) {
  const { x, y, w, h } = r;
  const gr = c.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, '#eef4f9');
  gr.addColorStop(1, '#dfe9f1');
  c.fillStyle = gr;
  c.fillRect(x, y, w, h);

  // Header.
  const hh = 30 * s;
  c.fillStyle = 'rgba(203, 219, 231, 0.8)';
  c.fillRect(x, y, w, hh);
  c.fillStyle = 'rgba(79, 126, 168, 0.35)';
  c.fillRect(x, y + hh - 1, w, 1);
  text(c, '好友列表', x + 12 * s, y + hh * 0.56, 12.5 * s, '#3a5972', 700, UI_CN, 'left', '0.6px');
  text(c, '6 / 12', x + w - 12 * s, y + hh * 0.56, 11 * s, '#6d8496', 400, UI, 'right');

  // Group row.
  const gy = y + hh;
  const gh = 24 * s;
  c.fillStyle = 'rgba(214, 228, 238, 0.7)';
  c.fillRect(x, gy, w, gh);
  const ax = x + 10 * s;
  const ay = gy + gh * 0.5;
  c.fillStyle = '#5b7b94';
  c.beginPath();
  c.moveTo(ax, ay - 3 * s);
  c.lineTo(ax + 6 * s, ay - 3 * s);
  c.lineTo(ax + 3 * s, ay + 2 * s);
  c.closePath();
  c.fill();
  text(c, '一起骑车', x + 21 * s, gy + gh * 0.58, 11.5 * s, '#48657d', 600, UI_CN);
  text(c, '6 人在线', x + w - 10 * s, gy + gh * 0.58, 10.5 * s, '#7b91a3', 400, UI_CN, 'right');

  // Rows.
  const rowH = Math.min(52 * s, (h - hh - gh - 46 * s) / CONTACTS.length);
  let ry = gy + gh + 4 * s;
  CONTACTS.forEach((person, i) => {
    const selected = person.active;
    if (selected) {
      const sel = c.createLinearGradient(x, ry, x + w, ry + rowH);
      sel.addColorStop(0, '#3c82bd');
      sel.addColorStop(1, '#2c6ba5');
      c.fillStyle = sel;
      c.fillRect(x + 1, ry, w - 2, rowH);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.fillRect(x + 1, ry, 2 * s, rowH);
    } else if (i % 2 === 1) {
      c.fillStyle = 'rgba(255,255,255,0.32)';
      c.fillRect(x + 1, ry, w - 2, rowH);
    }

    const av = Math.min(32 * s, rowH - 12 * s);
    const ax2 = x + 9 * s;
    const ay2 = ry + (rowH - av) / 2;
    c.fillStyle = selected ? '#eaf4fb' : '#f7fafc';
    c.fillRect(ax2, ay2, av, av);
    c.strokeStyle = selected ? 'rgba(255,255,255,0.75)' : 'rgba(122, 146, 165, 0.7)';
    c.lineWidth = 1 * s;
    c.strokeRect(ax2, ay2, av, av);
    drawPixelAvatar(c, ax2, ay2, av, person.kind);

    const nameColor = selected ? '#ffffff' : '#2b3f50';
    const noteColor = selected ? 'rgba(235, 246, 255, 0.82)' : '#6e8597';
    text(c, person.name, ax2 + av + 9 * s, ry + rowH * 0.42, 13 * s, nameColor, 600, UI_CN);
    text(c, person.note, ax2 + av + 9 * s, ry + rowH * 0.42 + 15 * s, 10.5 * s, noteColor, 400, UI_CN);

    const dot = person.note.startsWith('在线') ? '#4cb56b' : '#d0a640';
    c.fillStyle = selected ? 'rgba(255,255,255,0.9)' : dot;
    c.beginPath();
    c.arc(x + w - 12 * s, ry + rowH * 0.44, 2.6 * s, 0, TAU);
    c.fill();

    ry += rowH;
  });

  // Footer buttons.
  const fy = y + h - 36 * s;
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(x, fy - 8 * s, w, 1);
  const bw = (w - 24 * s) / 2;
  smallButton(c, x + 9 * s, fy, bw, 24 * s, '添加好友', s);
  smallButton(c, x + 15 * s + bw, fy, bw, 24 * s, '群组', s);
}

function drawPixelAvatar(c, x, y, size, kind) {
  const u = size / 10;
  const px = (gx, gy, gw, gh, color) => {
    c.fillStyle = color;
    c.fillRect(Math.round(x + gx * u), Math.round(y + gy * u), Math.ceil(gw * u), Math.ceil(gh * u));
  };
  if (kind === 'cow') {
    px(0, 0, 10, 10, '#e9eef2');
    px(2, 2, 6, 6, '#fdfaf4');
    px(3, 1, 2, 2, '#3a3f46');
    px(7, 3, 2, 2, '#3a3f46');
    px(3, 4, 1, 1, '#20262c');
    px(6, 4, 1, 1, '#20262c');
    px(3, 6, 4, 2, '#e8b7b0');
    px(4, 7, 1, 1, '#8e5a55');
    px(6, 7, 1, 1, '#8e5a55');
    px(1, 2, 1, 3, '#fdfaf4');
    px(8, 2, 1, 3, '#fdfaf4');
  } else if (kind === 'wind') {
    px(0, 0, 10, 10, '#cfe4f2');
    px(2, 3, 6, 1, '#3f7fae');
    px(1, 5, 7, 1, '#3f7fae');
    px(3, 7, 5, 1, '#3f7fae');
    px(8, 2, 1, 1, '#8fb8d2');
  } else if (kind === 'mountain') {
    px(0, 0, 10, 10, '#dfe9de');
    px(1, 7, 8, 2, '#7d9a72');
    px(2, 5, 2, 2, '#6d8a78');
    px(4, 3, 2, 2, '#587a66');
    px(6, 4, 3, 3, '#6d8a78');
    px(7, 2, 1, 1, '#f4f7ee');
  } else if (kind === 'pixel') {
    px(0, 0, 10, 10, '#243448');
    px(1, 1, 4, 4, '#f2d36b');
    px(5, 1, 4, 4, '#e0647a');
    px(1, 5, 4, 4, '#5fbfa8');
    px(5, 5, 4, 4, '#7aa8e0');
  } else if (kind === 'column') {
    px(0, 0, 10, 10, '#e9e4d8');
    px(2, 7, 6, 1, '#8a7f6b');
    px(3, 3, 1, 4, '#b3a894');
    px(5, 3, 1, 4, '#b3a894');
    px(7, 3, 1, 4, '#b3a894');
    px(2, 2, 6, 1, '#8a7f6b');
  } else {
    px(0, 0, 10, 10, '#e6edf2');
    px(3, 2, 4, 5, '#b98a5f');
    px(2, 2, 1, 3, '#8d6844');
    px(7, 2, 1, 3, '#8d6844');
    px(4, 3, 1, 1, '#2b2b2b');
    px(6, 3, 1, 1, '#2b2b2b');
    px(5, 5, 1, 1, '#5a3f2b');
  }
}

// ---------------------------------------------------------------- chat pane

function drawChat(g, ctx, chat, s, local) {
  const c = g.drawingContext;
  const { x, y, w, h } = chat;

  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();

  c.fillStyle = '#fbfcfd';
  c.fillRect(x, y, w, h);

  const headerH = 44 * s;
  const typingH = 28 * s;
  const inputH = 84 * s;

  drawChatHeader(c, x, y, w, headerH, s);
  drawTypingStrip(c, x, y + headerH, w, typingH, s, local);

  const msgRect = {
    x,
    y: y + headerH + typingH,
    w,
    h: h - headerH - typingH - inputH,
  };
  drawMessages(g, ctx, msgRect, s, local);

  drawInput(c, x, y + h - inputH, w, inputH, s, local);
  c.restore();
}

function drawChatHeader(c, x, y, w, h, s) {
  const gr = c.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#f5faff');
  gr.addColorStop(1, '#e3edf5');
  c.fillStyle = gr;
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(111, 143, 167, 0.45)';
  c.fillRect(x, y + h - 1, w, 1);

  const av = 32 * s;
  const ax = x + 10 * s;
  const ay = y + (h - av) / 2;
  c.fillStyle = '#eef5fa';
  c.fillRect(ax, ay, av, av);
  c.strokeStyle = 'rgba(100, 128, 150, 0.7)';
  c.lineWidth = 1 * s;
  c.strokeRect(ax, ay, av, av);
  drawPixelAvatar(c, ax, ay, av, 'cow');

  text(c, '路过的牛', ax + av + 10 * s, y + h * 0.42, 16 * s, '#23394b', 700, UI_CN);
  text(c, '在线  ·  同城  ·  一起骑车', ax + av + 10 * s, y + h * 0.42 + 16 * s, 10.5 * s, '#6a8397', 400, UI_CN);

  text(c, '签名：路让一让。', x + w - 14 * s, y + h * 0.56, 11 * s, '#6a8397', 400, UI_CN, 'right');
}

function drawTypingStrip(c, x, y, w, h, s, local) {
  c.fillStyle = '#dcecf7';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.fillRect(x, y, w, 1);
  c.fillStyle = 'rgba(84, 128, 163, 0.28)';
  c.fillRect(x, y + h - 1, w, 1);

  // Small pencil mark.
  c.strokeStyle = '#4a82ad';
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.moveTo(x + 14 * s, y + h * 0.62);
  c.lineTo(x + 23 * s, y + h * 0.36);
  c.lineTo(x + 26 * s, y + h * 0.42);
  c.lineTo(x + 17 * s, y + h * 0.68);
  c.closePath();
  c.stroke();

  text(c, '对方正在输入', x + 34 * s, y + h * 0.58, 12.5 * s, '#2f6f9f', 600, UI_CN);

  // Three dots, quantised to 10 Hz.
  const phase = Math.floor(local * 10 + 1e-6);
  const dotX = x + 34 * s + 82 * s;
  for (let i = 0; i < 3; i += 1) {
    const wave = 0.5 + 0.5 * Math.cos((phase / 10) * TAU - i * 1.15);
    c.globalAlpha = 0.38 + wave * 0.62;
    c.fillStyle = '#1f5d8e';
    c.beginPath();
    c.arc(dotX + i * 8.5 * s, y + h * 0.53, 2.5 * s, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;

  text(c, '今天 21:06 上线', x + w - 14 * s, y + h * 0.58, 10 * s, '#6f8ca3', 400, UI_CN, 'right');
}

function drawMessages(g, ctx, r, s, local) {
  const c = g.drawingContext;
  const { x, w } = r;
  const frames = gifFrames(g, ctx);

  const padX = 18 * s;
  const innerW = w - padX * 2;
  let my = r.y + 14 * s;

  // Date divider.
  divider(c, x + padX, my + 6 * s, innerW, '2003 年 8 月 14 日  21:06', s);
  my += 30 * s;

  // Incoming line.
  drawIncoming(c, x + padX, my, innerW, s, {
    avatar: 'cow',
    name: '路过的牛',
    time: '21:06',
    text: '在吗？给你看个好东西，昨天在路上拍的。',
  });
  my += 20 * s + 34 * s;

  // Received GIF.
  const gifW = Math.min(420 * s, innerW - 48 * s);
  const gifH = gifW * (84 / 140);
  const gx = x + padX + 44 * s;
  const frameY = my + 18 * s;
  text(c, '路过的牛', gx, my + 10 * s, 10.5 * s, '#6b8294', 600, UI_CN);
  text(c, '21:07', gx + 52 * s, my + 10 * s, 10 * s, '#93a6b5', 400, UI);
  drawGifFrame(c, frames, gx, frameY, gifW, gifH, s, local);
  my = frameY + gifH + 15 * s;
  text(c, GIF_NAME, gx, my, 10 * s, '#6b8294', 500, UI_CN);
  text(c, GIF_META, gx + 94 * s, my, 10 * s, '#93a6b5', 400, UI_CN);
  my += 18 * s;

  // Outgoing.
  drawOutgoing(c, x, my, w, s, '这…是你拍的？', '21:08');
  my += 40 * s;

  // The gag reply, arriving on the downbeat.
  const gagP = reveal(local, 2.8, 0.22);
  if (gagP > 0.001) {
    const saved = c.globalAlpha;
    c.globalAlpha = saved * gagP;
    const gy2 = my + (1 - gagP) * 12 * s;
    const hl = reveal(local, 2.9, 1.05);
    if (hl > 0 && hl < 1) {
      c.fillStyle = `rgba(255, 238, 176, ${0.3 * (1 - hl)})`;
      c.fillRect(x + padX + 40 * s, gy2 - 8 * s, innerW - 48 * s, 36 * s);
    }
    drawIncoming(c, x + padX, gy2, innerW, s, {
      avatar: 'cow',
      name: '路过的牛',
      time: '21:09',
      text: '这个 GIF 我存了',
      bold: true,
    });
    c.globalAlpha = saved;
    my += 38 * s;
  }

  // Transfer notice.
  const noteP = reveal(local, 3.15, 0.3);
  if (noteP > 0.001) {
    const saved = c.globalAlpha;
    c.globalAlpha = saved * noteP;
    text(
      c,
      '系统：已将 鹈鹕骑车.gif 保存到【我的文档 \\ 图片】',
      x + w * 0.5,
      my + 8 * s,
      9.8 * s,
      '#8a9dab',
      400,
      UI_CN,
      'center',
    );
    c.globalAlpha = saved;
    my += 18 * s;
  }

  // A small answering message near the exit.
  const replyP = reveal(local, 4.45, 0.26);
  if (replyP > 0.001) {
    const saved = c.globalAlpha;
    c.globalAlpha = saved * replyP;
    drawOutgoing(c, x, my + (1 - replyP) * 10 * s, w, s, '我也存了。回头传你原图。', '21:09', true);
    c.globalAlpha = saved;
  }
}

function drawIncoming(c, x, y, w, s, { avatar, name, time, text: line, bold = false }) {
  const av = 32 * s;
  c.fillStyle = '#eef5fa';
  c.fillRect(x, y, av, av);
  c.strokeStyle = 'rgba(112, 140, 160, 0.65)';
  c.lineWidth = 1 * s;
  c.strokeRect(x, y, av, av);
  drawPixelAvatar(c, x, y, av, avatar);

  const tx = x + av + 10 * s;
  text(c, name, tx, y + 11 * s, 10.5 * s, '#6b8294', 600, UI_CN);
  text(c, time, tx + (name.length * 13 + 10) * s, y + 11 * s, 10 * s, '#93a6b5', 400, UI);
  text(c, line, tx, y + 31 * s, 14.5 * s, bold ? '#1f3c56' : '#283b4a', bold ? 700 : 400, UI_CN);
  void w;
}

function drawOutgoing(c, x, y, w, s, line, time, small = false) {
  const size = small ? 13 * s : 14 * s;
  setFont(c, size, 400, UI_CN);
  const tw = c.measureText(line).width;
  const bw = Math.min(tw + 22 * s, w - 90 * s);
  const bh = size + 14 * s;
  const bx = x + w - 20 * s - bw;
  c.fillStyle = '#dcebf7';
  c.fillRect(bx, y, bw, bh);
  c.strokeStyle = 'rgba(126, 168, 199, 0.8)';
  c.lineWidth = 1 * s;
  c.strokeRect(bx, y, bw, bh);
  text(c, line, bx + 10 * s, y + bh * 0.5 + size * 0.34, size, '#21435f', 400, UI_CN);
  text(c, time, bx - 8 * s, y + bh * 0.5 + 3 * s, 9.5 * s, '#93a6b5', 400, UI, 'right');
}

function drawGifFrame(c, frames, x, y, w, h, s, local) {
  // Outer bevel.
  bevel(c, x - 3 * s, y - 3 * s, w + 6 * s, h + 6 * s, '#c9d7e2', {
    thick: 2 * s,
    light: 'rgba(255,255,255,0.9)',
    dark: 'rgba(98, 122, 141, 0.6)',
  });
  c.fillStyle = '#1c2a35';
  c.fillRect(x, y, w, h);

  const idx = Math.floor(local * 10 + 1e-6) % 10;
  const fr = frames[idx];
  if (fr) {
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(fr.canvas, x + 2 * s, y + 2 * s, w - 4 * s, h - 4 * s);
    c.restore();
  }

  // Inset shadow at the top edge of the media well.
  const gr = c.createLinearGradient(0, y, 0, y + 10 * s);
  gr.addColorStop(0, 'rgba(10, 24, 34, 0.28)');
  gr.addColorStop(1, 'rgba(10, 24, 34, 0)');
  c.fillStyle = gr;
  c.fillRect(x + 2 * s, y + 2 * s, w - 4 * s, 10 * s);

  // A period-authentic GIF tag.
  const tw = 30 * s;
  const th = 14 * s;
  c.fillStyle = 'rgba(28, 42, 53, 0.82)';
  c.fillRect(x + w - tw - 4 * s, y + h - th - 4 * s, tw, th);
  text(c, 'GIF', x + w - tw * 0.5 - 4 * s, y + h - th * 0.5 - 4 * s + 3 * s, 8.5 * s, '#e8f2f8', 700, EN_FONT, 'center', '1px');
}

function drawInput(c, x, y, w, h, s, local) {
  c.fillStyle = '#eef4f8';
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(108, 140, 164, 0.5)';
  c.fillRect(x, y, w, 1);

  // Formatting row.
  const ty = y + 8 * s;
  const bs = 20 * s;
  const labels = ['B', 'I', '字', '☺', '▣'];
  for (let i = 0; i < labels.length; i += 1) {
    const bx = x + 12 * s + i * (bs + 5 * s);
    bevel(c, bx, ty, bs, bs, '#e4edf5', {
      thick: 1 * s,
      light: 'rgba(255,255,255,0.95)',
      dark: 'rgba(108, 133, 154, 0.5)',
    });
    text(c, labels[i], bx + bs * 0.5, ty + bs * 0.58, 11 * s, i === 1 ? '#2f6f9f' : '#3c5568', i === 0 ? 700 : 400, i === 1 ? EN_FONT : UI_CN, 'center');
  }
  text(c, '0 / 200', x + w - 118 * s, ty + bs * 0.62, 9.5 * s, '#8299a9', 400, UI, 'right');

  // Field.
  const fx = x + 12 * s;
  const fw = w - 12 * s - 104 * s;
  const fy = y + 34 * s;
  const fh = 38 * s;
  c.fillStyle = '#ffffff';
  c.fillRect(fx, fy, fw, fh);
  c.fillStyle = 'rgba(105, 130, 150, 0.55)';
  c.fillRect(fx, fy, fw, 1);
  c.fillRect(fx, fy, 1, fh);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(fx, fy + fh - 1, fw, 1);
  c.fillRect(fx + fw - 1, fy, 1, fh);

  text(c, '输入消息…（Enter 发送）', fx + 10 * s, fy + fh * 0.55, 12.5 * s, '#9aabb8', 400, UI_CN);
  const caretOn = Math.floor(local * 10 + 1e-6) % 10 < 5;
  if (caretOn) {
    c.fillStyle = '#2f6f9f';
    c.fillRect(fx + 10 * s + 142 * s, fy + 9 * s, 1.4 * s, fh - 18 * s);
  }

  // Send button.
  const sx = x + w - 86 * s;
  const sy = fy;
  const sw = 74 * s;
  const sh = fh;
  const sg = c.createLinearGradient(0, sy, 0, sy + sh);
  sg.addColorStop(0, '#6fa6cf');
  sg.addColorStop(0.5, '#3d7fb2');
  sg.addColorStop(1, '#245f8f');
  c.fillStyle = sg;
  c.fillRect(sx, sy, sw, sh);
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 1 * s;
  c.strokeRect(sx + 0.5 * s, sy + 0.5 * s, sw - 1 * s, sh - 1 * s);
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.fillRect(sx + 1 * s, sy + 1 * s, sw - 2 * s, sh * 0.38);
  text(c, '发送', sx + sw * 0.5, sy + sh * 0.5 + 5 * s, 14 * s, '#ffffff', 700, UI_CN, 'center', 2 * s);
}

function divider(c, x, y, w, label, s) {
  c.save();
  c.strokeStyle = 'rgba(148, 170, 186, 0.45)';
  c.lineWidth = 1 * s;
  const tw = 156 * s;
  const cx = x + w * 0.5;
  c.beginPath();
  c.moveTo(cx - tw * 0.5 - 14 * s, y);
  c.lineTo(cx - tw * 0.5, y);
  c.moveTo(cx + tw * 0.5, y);
  c.lineTo(cx + tw * 0.5 + 14 * s, y);
  c.stroke();
  c.fillStyle = 'rgba(238, 244, 248, 0.9)';
  c.fillRect(cx - tw * 0.5, y - 8 * s, tw, 16 * s);
  text(c, label, cx, y + 3.4 * s, 9.5 * s, '#8da1b0', 400, UI_CN, 'center', '0.5px');
  c.restore();
}

// ---------------------------------------------------------------- GIF

const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

function gifFrames(g, ctx) {
  if (g._s17gifFrames) return g._s17gifFrames;
  const GW = 140;
  const GH = 84;
  const frames = [];
  const style = gifStyle();
  for (let i = 0; i < 10; i += 1) {
    const pg = ctx.makeGraphics(GW, GH);
    pg.pixelDensity(1);
    paintGifFrame(pg, i, style);
    quantise(pg, GW, GH);
    frames.push(pg);
  }
  g._s17gifFrames = frames;
  return frames;
}

function gifStyle() {
  return neutralStyle({
    ink: '#243746',
    body: '#f7f3e6',
    bodyShade: '#d8d3c3',
    wing: '#e3ddcd',
    beak: '#e0923c',
    pouch: '#eeb05f',
    leg: '#d98a34',
    tire: '#1d2b36',
    rim: '#5d7c94',
    metal: '#8798a5',
    saddle: '#4a3a2c',
    chain: '#3e4d5a',
    outline: true,
    weight: 1,
    farAlpha: 0.6,
    shadow: 0,
  });
}

function paintGifFrame(pg, i, style) {
  const c = pg.drawingContext;
  const W = 140;
  const H = 84;

  // Banded sky (dithering supplies the in-between tones).
  c.fillStyle = '#8fbedd';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#a5cde5';
  c.fillRect(0, 12, W, 16);
  c.fillStyle = '#bcdced';
  c.fillRect(0, 28, W, 12);
  c.fillStyle = '#d4e9f2';
  c.fillRect(0, 40, W, 10);

  // Sun.
  c.fillStyle = '#f6e7ad';
  c.beginPath();
  c.arc(112, 17, 9, 0, TAU);
  c.fill();
  c.fillStyle = '#fbefc6';
  c.beginPath();
  c.arc(110, 15, 4.5, 0, TAU);
  c.fill();

  // Blocky clouds.
  const clouds = [[22, 17, 14], [50, 27, 10], [86, 11, 8]];
  for (const [cx, cy, cw] of clouds) {
    c.fillStyle = '#f2f8fb';
    c.fillRect(cx, cy, cw + 10, 5);
    c.fillRect(cx + 4, cy - 4, cw, 5);
    c.fillStyle = '#dcebf3';
    c.fillRect(cx, cy + 5, cw + 10, 2);
  }

  // Hills.
  c.fillStyle = '#8ba68e';
  c.beginPath();
  c.moveTo(0, 60);
  c.lineTo(24, 44);
  c.lineTo(46, 57);
  c.lineTo(70, 48);
  c.lineTo(96, 58);
  c.lineTo(124, 46);
  c.lineTo(140, 58);
  c.lineTo(140, 66);
  c.lineTo(0, 66);
  c.closePath();
  c.fill();
  c.fillStyle = '#75927b';
  c.beginPath();
  c.moveTo(0, 64);
  c.lineTo(34, 56);
  c.lineTo(66, 62);
  c.lineTo(102, 55);
  c.lineTo(140, 63);
  c.lineTo(140, 70);
  c.lineTo(0, 70);
  c.closePath();
  c.fill();

  // Verge + road.
  c.fillStyle = '#a8b694';
  c.fillRect(0, 64, W, 6);
  c.fillStyle = '#cbb894';
  c.fillRect(0, 69, W, 15);
  c.fillStyle = '#b7a37f';
  c.fillRect(0, 78, W, 6);

  // Dashes scroll a little each of the ten frames.
  c.fillStyle = '#f1e6cc';
  const off = (i * 4) % 22;
  for (let dx = -off; dx < W; dx += 22) {
    c.fillRect(dx, 75, 9, 2.5);
  }

  // Rider.
  const pose = rigPose(2 + i / 10);
  drawRig(pg, pose, style, { x: 70, y: 81.5, scale: 0.32, shadow: false });

  // A deliberate 2-pixel eye so the pelican survives the 256-colour dither.
  const ex = 70 + (pose.head.x + 8.4) * 0.32;
  const ey = 81.5 + (pose.head.y - 5) * 0.32;
  c.fillStyle = '#f2ede0';
  c.fillRect(Math.round(ex) - 1.5, Math.round(ey) - 1.5, 3, 3);
  c.fillStyle = '#1b2430';
  c.fillRect(Math.round(ex) - 0.5, Math.round(ey) - 0.5, 2, 2);

  // Two dust pixels behind the rear wheel, stepping with the loop.
  c.fillStyle = '#d8caae';
  const fade = 0.6 + 0.2 * Math.sin((i / 10) * TAU);
  c.globalAlpha = fade;
  c.fillRect(44 - (i % 3) * 2, 76, 4, 2);
  c.fillRect(38 - (i % 4) * 2, 78, 3, 2);
  c.globalAlpha = 1;
}

function quantise(pg, w, h) {
  const c = pg.drawingContext;
  const img = c.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const k = (y * w + x) * 4;
      const th = BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5;
      d[k] = qChan(d[k], 8, th);
      d[k + 1] = qChan(d[k + 1], 8, th);
      d[k + 2] = qChan(d[k + 2], 4, th);
      d[k + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
}

function qChan(v, levels, th) {
  const step = 255 / (levels - 1);
  const n = Math.round((v + th * step * 0.9) / step);
  return Math.round(clamp(n, 0, levels - 1) * step);
}

// ---------------------------------------------------------------- title

function drawChatTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const W = g.width;
  const H = g.height;
  const s = H / 1080;
  const x = 92 * s;
  const w = 430 * s;
  const h = 136 * s;
  const y = H - 252 * s + lift * 0.35 * s;

  c.save();
  c.globalAlpha = opacity;

  // Soft dark scrim so the silver card reads over the desktop.
  const scrim = c.createRadialGradient(0, H, 0, 0, H, W * 0.55);
  scrim.addColorStop(0, 'rgba(7, 19, 30, 0.82)');
  scrim.addColorStop(0.45, 'rgba(7, 19, 30, 0.4)');
  scrim.addColorStop(1, 'rgba(7, 19, 30, 0)');
  c.fillStyle = scrim;
  c.fillRect(0, 0, W, H);

  // Shadow, then the mini window.
  c.save();
  c.shadowColor = 'rgba(3, 10, 18, 0.6)';
  c.shadowBlur = 24 * s;
  c.shadowOffsetY = 7 * s;
  c.fillStyle = '#dce6ee';
  rounded(c, x, y, w, h, 5 * s);
  c.fill();
  c.restore();

  const body = c.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, '#f4f8fb');
  body.addColorStop(1, '#c9d8e3');
  rounded(c, x, y, w, h, 5 * s);
  c.fillStyle = body;
  c.fill();

  // Title bar.
  const tb = 30 * s;
  c.save();
  rounded(c, x + 2 * s, y + 2 * s, w - 4 * s, h - 4 * s, 4 * s);
  c.clip();
  const tg = c.createLinearGradient(0, y, 0, y + tb);
  tg.addColorStop(0, '#6ca6d2');
  tg.addColorStop(0.5, '#3578b2');
  tg.addColorStop(1, '#225f93');
  c.fillStyle = tg;
  c.fillRect(x, y, w, tb);
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fillRect(x, y + 2 * s, w, tb * 0.4);
  c.restore();

  // Title bar text + controls.
  text(c, `${APP} ${APP_VER}`, x + 12 * s, y + tb * 0.62, 12.5 * s, '#ffffff', 700, UI_CN, 'left', 0.6 * s);
  text(c, '—  对话窗口', x + 106 * s, y + tb * 0.62, 10 * s, 'rgba(234,246,255,0.72)', 400, UI_CN);
  for (let i = 0; i < 3; i += 1) {
    const bw = 14 * s;
    const bx = x + w - 12 * s - (bw + 3 * s) * (3 - i);
    bevel(c, bx, y + 8 * s, bw, 14 * s, i === 2 ? '#d76b5f' : '#c9dcec', {
      thick: 1 * s,
      light: 'rgba(255,255,255,0.8)',
      dark: 'rgba(45,80,108,0.55)',
    });
    c.strokeStyle = i === 2 ? '#fff' : '#2b4b64';
    c.lineWidth = 1 * s;
    c.beginPath();
    if (i === 0) {
      c.moveTo(bx + 4 * s, y + 19 * s);
      c.lineTo(bx + 10 * s, y + 19 * s);
    } else if (i === 1) {
      c.rect(bx + 4 * s, y + 11 * s, 6 * s, 6 * s);
    } else {
      c.moveTo(bx + 4 * s, y + 12 * s);
      c.lineTo(bx + 10 * s, y + 18 * s);
      c.moveTo(bx + 10 * s, y + 12 * s);
      c.lineTo(bx + 4 * s, y + 18 * s);
    }
    c.stroke();
  }

  // Body: index, names, era line, tiny pixel pelican.
  const by = y + tb + 14 * s;
  text(c, '17', x + 14 * s, by + 26 * s, 32 * s, '#2f76b5', 700, UI, 'left', '1px');
  text(c, '早期聊天窗口', x + 74 * s, by + 20 * s, 21 * s, '#22384a', 700, UI_CN, 'left', 0.5 * s);
  text(c, 'EARLY CHAT CLIENT', x + 75 * s, by + 38 * s, 9.5 * s, '#547691', 600, EN_FONT, 'left', '2px');
  text(c, '2000s  ·  拨号  ·  256 色 GIF', x + 75 * s, by + 58 * s, 10 * s, '#6b8396', 400, UI_CN, 'left', '0.5px');

  const ax = x + w - 54 * s;
  const ay = by + 2 * s;
  bevel(c, ax - 3 * s, ay - 3 * s, 44 * s, 44 * s, '#e8f1f7', {
    thick: 1.5 * s,
    light: 'rgba(255,255,255,0.95)',
    dark: 'rgba(96,124,146,0.6)',
  });
  drawPixelPelican(c, ax, ay, 38 * s);

  c.restore();
}

function drawPixelPelican(c, x, y, size) {
  const u = size / 12;
  const px = (gx, gy, gw, gh, color) => {
    c.fillStyle = color;
    c.fillRect(x + gx * u, y + gy * u, gw * u, gh * u);
  };
  px(0, 0, 12, 12, '#bcd7e8');
  px(1, 4, 6, 4, '#fbf6e8');
  px(2, 3, 3, 2, '#fbf6e8');
  px(3, 7, 4, 2, '#d8d2c1');
  px(7, 4, 4, 2, '#e0923c');
  px(10, 5, 1, 1, '#c9762a');
  px(4, 2, 1, 1, '#202a33');
  px(2, 9, 1, 1, '#4f7ea8');
  px(9, 9, 1, 1, '#4f7ea8');
}

// ---------------------------------------------------------------- helpers

function text(c, str, x, y, size, color, weight = 400, family = UI, align = 'left', spacing = '0px') {
  setFont(c, size, weight, family, spacing);
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillStyle = color;
  c.fillText(str, x, y);
}

function rounded(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function bevel(c, x, y, w, h, fill, { thick = 1, light = 'rgba(255,255,255,0.9)', dark = 'rgba(80,105,125,0.6)' } = {}) {
  c.fillStyle = fill;
  c.fillRect(x, y, w, h);
  c.fillStyle = light;
  c.fillRect(x, y, w, thick);
  c.fillRect(x, y, thick, h);
  c.fillStyle = dark;
  c.fillRect(x, y + h - thick, w, thick);
  c.fillRect(x + w - thick, y, thick, h);
}

function smallButton(c, x, y, w, h, label, s) {
  bevel(c, x, y, w, h, '#e7eff6', {
    thick: 1.2 * s,
    light: 'rgba(255,255,255,0.95)',
    dark: 'rgba(106, 132, 153, 0.55)',
  });
  text(c, label, x + w * 0.5, y + h * 0.58, 10.5 * s, '#3e5b72', 500, UI_CN, 'center');
}

function reveal(local, t0, dur) {
  if (local < t0) return 0;
  return easeOut(clamp((local - t0) / dur));
}

function newMessageFlash(local) {
  if (local < 2.9 || local > 4.7) return 0;
  const ramp = clamp((local - 2.9) / 0.12);
  const out = 1 - clamp((local - 4.2) / 0.5);
  const pulse = 0.5 + 0.5 * Math.sin((local - 2.9) * TAU * 1.9);
  return clamp(ramp * out * (0.55 + 0.45 * pulse));
}

function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const f = clamp(k);
  const ch = (shift) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * f);
  };
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function group(c, fn) {
  c.save();
  fn();
  c.restore();
}
