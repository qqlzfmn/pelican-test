// 19 — vertical short video. The 16:9 frame narrows to a fictional 9:16 app.
// UI animation is quantised to 10 Hz; the video inside (road, rider) stays smooth.
// Drawn in screen space so the phone frame never zooms with the camera.

import { basePalette } from './_placeholder.js';
import { alpha } from '../kit/color.js';
import { rngFor, TAU, clamp } from '../kit/math.js';
import { rigPose } from '../rig/pose.js';
import { drawRig, neutralStyle } from '../rig/draw.js';
import { CN_FONT, EN_FONT, setFont } from '../kit/cards.js';
import { drawRoad } from '../kit/road.js';

const pal = basePalette({
  bg: '#111014', bg2: '#1b1820', motif: '#ff6f9f', accent: '#ff4f87',
  ink: '#f4f1ea', ground: '#ffd3e2', road: '#f3e2d6', dash: '#ffffff',
  body: '#fffaf1', beak: '#ff8a3d', rigInk: '#2b2420',
  titleInk: '#f6f1e8', scrim: '#050506',
});

const APP = '羽播';
const APP_EN = 'FEATHER';

const COMMENTS = [
  { t: 0.7, user: '@岩壁上的风', text: '它真的会骑。' },
  { t: 1.6, user: '@宋画里的小路人', text: '这条山路我走过。' },
  { t: 2.5, user: '@8bit咸鱼', text: '脚踏正好踩在拍子上。' },
  { t: 3.4, user: '@修勾不修图', text: '第 3 遍来看了。' },
  { t: 4.3, user: '@博物馆夜班', text: '已加入今晚展签。' },
  { t: 5.2, user: '@路过的牛', text: '让一让，我也要看。' },
];

export default {
  id: 's19',
  number: 19,
  cn: '竖屏短视频',
  en: 'Vertical Video',
  year: '2020s',
  palette: pal,

  draw(g, ctx) {
    const c = g.drawingContext;
    const W = g.width;
    const H = g.height;
    const qt = Math.floor(ctx.local * 10) / 10;

    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#050506';
    c.fillRect(0, 0, W, H);

    const r = {
      w: (H * 9) / 16,
      h: H,
      x: (W - (H * 9) / 16) / 2,
      y: 0,
    };
    const s = H / 1080;

    drawSideBars(c, W, H, r, s);
    drawPhone(g, ctx, r, s, qt);
    drawPhoneFrame(c, r, s);
    c.restore();
  },

  titleCard(g, { opacity = 1, lift = 0 } = {}) {
    drawVerticalTitle(g, opacity, lift);
  },
};

// ---------------------------------------------------------------- frame

function drawSideBars(c, W, H, r, s) {
  const gl = c.createLinearGradient(r.x, 0, r.x - 260 * s, 0);
  gl.addColorStop(0, 'rgba(255, 111, 159, 0.16)');
  gl.addColorStop(1, 'rgba(255, 111, 159, 0)');
  c.fillStyle = gl;
  c.fillRect(0, 0, r.x, H);

  const gr = c.createLinearGradient(r.x + r.w, 0, r.x + r.w + 260 * s, 0);
  gr.addColorStop(0, 'rgba(111, 212, 255, 0.13)');
  gr.addColorStop(1, 'rgba(111, 212, 255, 0)');
  c.fillStyle = gr;
  c.fillRect(r.x + r.w, 0, W - r.x - r.w, H);

  // A faint dot grid in the bars.
  c.fillStyle = 'rgba(255,255,255,0.035)';
  for (let x = 22 * s; x < W; x += 28 * s) {
    if (x > r.x - 20 * s && x < r.x + r.w + 20 * s) continue;
    for (let y = 24 * s; y < H; y += 28 * s) {
      c.fillRect(x, y, 1.2 * s, 1.2 * s);
    }
  }
}

function drawPhoneFrame(c, r, s) {
  c.save();
  c.shadowColor = 'rgba(255, 95, 150, 0.35)';
  c.shadowBlur = 60 * s;
  c.strokeStyle = 'rgba(255, 255, 255, 0.26)';
  c.lineWidth = 3 * s;
  c.beginPath();
  c.roundRect(r.x - 2 * s, r.y - 2 * s, r.w + 4 * s, r.h + 4 * s, 38 * s);
  c.stroke();
  c.shadowColor = 'transparent';

  // Device edge highlight.
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.roundRect(r.x + 4 * s, r.y + 4 * s, r.w - 8 * s, r.h - 8 * s, 34 * s);
  c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- screen

function drawPhone(g, ctx, r, s, qt) {
  const c = g.drawingContext;
  const local = ctx.local;

  c.save();
  c.beginPath();
  c.roundRect(r.x, r.y, r.w, r.h, 36 * s);
  c.clip();

  drawVideo(g, ctx, r, s);
  drawScreenVignette(c, r, s);
  drawStatusBar(c, r, s);
  drawTabs(c, r, s);
  drawProgress(c, r, s, local);
  drawRail(c, r, s, qt, local);
  drawComments(c, r, s, qt);
  drawCaption(c, r, s, local);
  drawHeartBurst(c, r, s, qt);
  drawNotch(c, r, s);

  c.restore();
}

function drawVideo(g, ctx, r, s) {
  const c = g.drawingContext;
  const scale = r.h / 1000;
  const t = ctx.t;

  c.save();
  c.translate(r.x + r.w / 2, 0);
  c.scale(scale, scale);
  c.translate(-468, 0);

  // Sky and sun.
  const sky = c.createLinearGradient(0, -40, 0, 900);
  sky.addColorStop(0, '#ffd9e6');
  sky.addColorStop(0.38, '#ffc1d4');
  sky.addColorStop(0.7, '#ffe7cf');
  sky.addColorStop(1, '#f8cdb7');
  c.fillStyle = sky;
  c.fillRect(100, -40, 760, 1040);

  const sun = c.createRadialGradient(520, 330, 20, 520, 330, 250);
  sun.addColorStop(0, 'rgba(255, 255, 248, 0.95)');
  sun.addColorStop(0.25, 'rgba(255, 235, 215, 0.7)');
  sun.addColorStop(1, 'rgba(255, 222, 230, 0)');
  c.fillStyle = sun;
  c.fillRect(240, 60, 560, 560);
  c.fillStyle = 'rgba(255, 251, 238, 0.8)';
  c.beginPath();
  c.arc(520, 330, 78, 0, TAU);
  c.fill();

  // Soft clouds.
  for (let i = 0; i < 7; i += 1) {
    const x = 180 + ((i * 137 + t * 5) % 560);
    const y = 170 + (i % 3) * 80 + Math.sin(t * 0.4 + i) * 4;
    c.fillStyle = `rgba(255, 250, 245, ${0.18 + (i % 3) * 0.05})`;
    c.beginPath();
    c.ellipse(x, y, 95, 24, 0.05, 0, TAU);
    c.fill();
  }

  // Distant pastel hills.
  c.fillStyle = 'rgba(148, 205, 190, 0.45)';
  c.beginPath();
  c.moveTo(120, 800);
  c.quadraticCurveTo(260, 610, 430, 760);
  c.quadraticCurveTo(560, 660, 760, 800);
  c.lineTo(900, 900);
  c.lineTo(80, 900);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(120, 184, 174, 0.35)';
  c.beginPath();
  c.moveTo(90, 840);
  c.quadraticCurveTo(300, 700, 520, 830);
  c.quadraticCurveTo(680, 740, 900, 840);
  c.lineTo(900, 940);
  c.lineTo(80, 940);
  c.closePath();
  c.fill();

  // Ring light behind the rider.
  const ring = c.createRadialGradient(468, 540, 60, 468, 540, 330);
  ring.addColorStop(0, 'rgba(255, 255, 250, 0.32)');
  ring.addColorStop(0.6, 'rgba(255, 220, 235, 0.16)');
  ring.addColorStop(1, 'rgba(255, 220, 235, 0)');
  c.fillStyle = ring;
  c.fillRect(120, 200, 700, 680);
  c.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  c.lineWidth = 5;
  c.beginPath();
  c.arc(468, 540, 250, 0, TAU);
  c.stroke();

  // Road.
  drawRoad(g, t, {
    ground: '#f7c9d8',
    verge: '#efb6cb',
    road: '#f4e2d6',
    edge: '#fff8ee',
    dash: '#ffffff',
    ink: '#7b5060',
    dust: false,
  });

  // Petals.
  const rand = rngFor(919);
  c.fillStyle = 'rgba(255, 255, 255, 0.55)';
  for (let i = 0; i < 16; i += 1) {
    const x = 150 + ((i * 71 + t * 22) % 640);
    const y = 120 + ((i * 113 + t * 13) % 700);
    c.save();
    c.translate(x, y);
    c.rotate(t * 0.4 + i);
    c.beginPath();
    c.ellipse(0, 0, 5 + rand() * 4, 2.5 + rand() * 2, 0, 0, TAU);
    c.fill();
    c.restore();
  }

  // Rider.
  const style = neutralStyle({
    ink: '#2b2420',
    body: '#fffaf1',
    bodyShade: '#f0e3d2',
    wing: '#fff4e6',
    beak: '#ff8a3d',
    pouch: '#ffb36b',
    leg: '#ff9a55',
    eye: '#221c18',
    tire: '#242424',
    rim: '#b9afa4',
    metal: '#8f8880',
    saddle: '#e06786',
    chain: '#7d746b',
  });
  style.weight = 1.05;
  const pose = rigPose(t);
  drawRig(g, pose, style, { x: 468, y: 820, scale: 1.12, shadow: true });
  c.restore();
}

function drawScreenVignette(c, r, s) {
  const gr = c.createLinearGradient(0, r.h - 320 * s, 0, r.h);
  gr.addColorStop(0, 'rgba(20, 8, 15, 0)');
  gr.addColorStop(0.55, 'rgba(20, 8, 15, 0.45)');
  gr.addColorStop(1, 'rgba(20, 8, 15, 0.82)');
  c.fillStyle = gr;
  c.fillRect(r.x, r.h - 320 * s, r.w, 320 * s);

  const top = c.createLinearGradient(0, 0, 0, 190 * s);
  top.addColorStop(0, 'rgba(20, 8, 15, 0.46)');
  top.addColorStop(1, 'rgba(20, 8, 15, 0)');
  c.fillStyle = top;
  c.fillRect(r.x, 0, r.w, 190 * s);

  const right = c.createLinearGradient(r.x + r.w, 0, r.x + r.w - 104 * s, 0);
  right.addColorStop(0, 'rgba(15, 8, 14, 0.34)');
  right.addColorStop(0.6, 'rgba(15, 8, 14, 0.12)');
  right.addColorStop(1, 'rgba(15, 8, 14, 0)');
  c.fillStyle = right;
  c.fillRect(r.x + r.w - 104 * s, 120 * s, 104 * s, r.h - 180 * s);
}

function drawStatusBar(c, r, s) {
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  setFont(c, 12 * s, 600, EN_FONT, '0.5px');
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('9:41', r.x + 28 * s, 26 * s);

  // Signal, wifi, battery.
  const bx = r.x + r.w - 78 * s;
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 4; i += 1) {
    const h = (4 + i * 3) * s;
    c.fillRect(bx + i * 5 * s, 28 * s - h, 3 * s, h);
  }
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.arc(bx + 34 * s, 23 * s, 6 * s, -2.5, -0.6);
  c.stroke();
  c.beginPath();
  c.arc(bx + 34 * s, 23 * s, 2.6 * s, -2.5, -0.6);
  c.stroke();
  c.strokeRect(bx + 48 * s, 18 * s, 18 * s, 9 * s);
  c.fillRect(bx + 66 * s, 21 * s, 2 * s, 3 * s);
  c.fillRect(bx + 50 * s, 20 * s, 13 * s, 5 * s);
  c.restore();
}

function drawTabs(c, r, s) {
  c.save();
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  setFont(c, 13 * s, 700, CN_FONT, '0.5px');
  c.fillStyle = 'rgba(255,255,255,0.96)';
  c.fillText(APP, r.x + 26 * s, 62 * s);
  setFont(c, 8 * s, 500, EN_FONT, '2px');
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillText(APP_EN, r.x + 26 * s, 76 * s);

  c.textAlign = 'center';
  setFont(c, 14 * s, 500, CN_FONT, '0px');
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.fillText('关注', r.x + r.w * 0.46, 66 * s);
  setFont(c, 15 * s, 700, CN_FONT, '0px');
  c.fillStyle = '#ffffff';
  c.fillText('推荐', r.x + r.w * 0.58, 66 * s);
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.moveTo(r.x + r.w * 0.58 - 12 * s, 77 * s);
  c.lineTo(r.x + r.w * 0.58 + 12 * s, 77 * s);
  c.stroke();

  // Search glyph.
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 1.8 * s;
  c.beginPath();
  c.arc(r.x + r.w - 34 * s, 64 * s, 6 * s, 0, TAU);
  c.stroke();
  c.beginPath();
  c.moveTo(r.x + r.w - 29 * s, 69 * s);
  c.lineTo(r.x + r.w - 24 * s, 74 * s);
  c.stroke();
  c.restore();
}

function drawProgress(c, r, s, local) {
  const x = r.x + 24 * s;
  const y = 90 * s;
  const w = r.w - 48 * s;
  const p = clamp(local / 6, 0, 1);
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.roundRect(x, y, w, 3 * s, 2 * s);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.98)';
  c.beginPath();
  c.roundRect(x, y, Math.max(3 * s, w * p), 3 * s, 2 * s);
  c.fill();
  c.fillStyle = '#ff7ba8';
  c.beginPath();
  c.arc(x + w * p, y + 1.5 * s, 4 * s, 0, TAU);
  c.fill();
  c.restore();
}

function drawRail(c, r, s, qt, local) {
  const x = r.x + r.w - 42 * s;
  const pulse = (() => {
    const p = Math.abs(local - 3);
    return Math.max(0, 1 - p / 0.25);
  })();
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  // Avatar.
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath();
  c.arc(x, 342 * s, 23 * s, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.arc(x, 342 * s, 26 * s, 0, TAU);
  c.stroke();
  // Mini pelican glyph.
  c.fillStyle = '#ff8a3d';
  c.beginPath();
  c.ellipse(x + 2 * s, 342 * s, 12 * s, 9 * s, -0.2, 0, TAU);
  c.fill();
  c.fillStyle = '#2b2420';
  c.beginPath();
  c.arc(x - 2 * s, 338 * s, 2.2 * s, 0, TAU);
  c.fill();

  // Heart.
  const hs = 1 + pulse * 0.18;
  c.save();
  c.translate(x, 458 * s);
  c.scale(hs, hs);
  drawHeart(c, 0, 0, 15 * s, pulse > 0.4 ? '#ff4f87' : 'rgba(255,255,255,0.92)');
  c.restore();
  setFont(c, 12 * s, 600, EN_FONT, '0.3px');
  c.fillStyle = 'rgba(255,255,255,0.95)';
  const likes = 124382 + Math.floor(local / 2) * 137;
  c.fillText(formatCount(likes), x, 492 * s);

  // Comment.
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.roundRect(x - 15 * s, 556 * s, 30 * s, 24 * s, 8 * s);
  c.fill();
  c.fillStyle = '#1b1520';
  for (let i = -1; i <= 1; i += 1) {
    c.beginPath();
    c.arc(x + i * 6 * s, 568 * s, 1.8 * s, 0, TAU);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.95)';
  setFont(c, 11 * s, 600, EN_FONT, '0.2px');
  c.fillText(formatCount(3082 + Math.floor(local / 2) * 3), x, 594 * s);

  // Share arrow.
  c.strokeStyle = 'rgba(255,255,255,0.92)';
  c.lineWidth = 2.2 * s;
  c.beginPath();
  c.moveTo(x - 12 * s, 662 * s);
  c.quadraticCurveTo(x + 4 * s, 676 * s, x + 14 * s, 650 * s);
  c.lineTo(x + 8 * s, 654 * s);
  c.moveTo(x + 14 * s, 650 * s);
  c.lineTo(x + 4 * s, 644 * s);
  c.stroke();
  setFont(c, 11 * s, 500, CN_FONT, '0px');
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillText('分享', x, 698 * s);

  // Spinning disc.
  c.save();
  c.translate(x, 770 * s);
  c.rotate(qt * 0.9);
  c.fillStyle = 'rgba(18, 14, 20, 0.9)';
  c.beginPath();
  c.arc(0, 0, 22 * s, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.36)';
  c.lineWidth = 1 * s;
  for (let i = 0; i < 3; i += 1) {
    c.beginPath();
    c.arc(0, 0, (8 + i * 4) * s, 0, TAU);
    c.stroke();
  }
  c.fillStyle = '#ff7ba8';
  c.beginPath();
  c.arc(0, 0, 5 * s, 0, TAU);
  c.fill();
  c.restore();
  c.restore();
}

function drawComments(c, r, s, qt) {
  c.save();
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  for (let i = 0; i < COMMENTS.length; i += 1) {
    const cm = COMMENTS[i];
    const p = (qt - cm.t) / 2.7;
    if (p <= 0 || p >= 1) continue;
    const lane = i % 3;
    const y = 360 * s + lane * 58 * s - p * 90 * s;
    const x = r.x + 22 * s + (Math.sin(cm.t * 3) + 1) * 10 * s;
    const a = Math.sin(Math.PI * p) * 0.94;
    c.globalAlpha = a;
    c.fillStyle = 'rgba(14, 9, 16, 0.72)';
    c.beginPath();
    c.roundRect(x, y, 286 * s, 40 * s, 10 * s);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.1)';
    c.lineWidth = 0.7 * s;
    c.stroke();
    setFont(c, 10 * s, 600, CN_FONT, '0px');
    c.fillStyle = 'rgba(255, 169, 199, 0.98)';
    c.fillText(cm.user, x + 11 * s, y + 13 * s);
    setFont(c, 11 * s, 400, CN_FONT, '0px');
    c.fillStyle = 'rgba(255,255,255,0.98)';
    c.fillText(cm.text, x + 11 * s, y + 29 * s);
  }
  c.restore();
}

function drawCaption(c, r, s, local) {
  const x = r.x + 26 * s;
  const y = r.h - 156 * s;
  c.save();
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.shadowColor = 'rgba(20,8,15,0.5)';
  c.shadowBlur = 10 * s;

  setFont(c, 17 * s, 700, CN_FONT, '0.4px');
  c.fillStyle = '#ffffff';
  c.fillText('@鹈鹕骑行日记', x, y);

  setFont(c, 14 * s, 400, CN_FONT, '0.2px');
  c.fillStyle = 'rgba(255,255,255,0.98)';
  c.fillText('今天也在练习不打翻鱼。', x, y + 25 * s);
  c.fillText('第 20 次路过人类的美术馆。', x, y + 46 * s);

  setFont(c, 12.5 * s, 500, CN_FONT, '0.6px');
  c.fillStyle = 'rgba(255, 196, 216, 1)';
  c.fillText('#鹈鹕测试  #骑行  #一路画过去', x, y + 71 * s);

  setFont(c, 11 * s, 500, CN_FONT, '0.4px');
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillText('♫ 原创配乐 · 鹈鹕骑车', x, y + 93 * s);

  // A small "LIVE" style chip is deliberately not used; this is a recording.
  c.textAlign = 'right';
  setFont(c, 8 * s, 500, EN_FONT, '2px');
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillText('9:16  ·  PHONE CUT', r.x + r.w - 26 * s, y + 82 * s);
  c.restore();
}

function drawHeartBurst(c, r, s, qt) {
  const start = 2.95;
  const p = (qt - start) / 1.1;
  if (p <= 0 || p >= 1) return;
  const rand = rngFor(929);
  const x = r.x + r.w - 42 * s;
  c.save();
  for (let i = 0; i < 20; i += 1) {
    const ox = (rand() - 0.5) * 90 * s;
    const oy = -p * (100 + rand() * 120) * s;
    const a = Math.sin(Math.PI * p) * 0.75;
    c.globalAlpha = a;
    c.fillStyle = i % 3 === 0 ? '#ffd36e' : '#ff6f9f';
    drawHeart(c, x + ox, 458 * s + oy, (6 + rand() * 6) * s, c.fillStyle);
  }
  c.restore();
}

function drawHeart(c, x, y, size, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + size * 0.35);
  c.bezierCurveTo(
    x - size * 1.1, y - size * 0.4,
    x - size * 0.45, y - size * 1.1,
    x, y - size * 0.45,
  );
  c.bezierCurveTo(
    x + size * 0.45, y - size * 1.1,
    x + size * 1.1, y - size * 0.4,
    x, y + size * 0.35,
  );
  c.fill();
}

function drawNotch(c, r, s) {
  c.save();
  c.fillStyle = '#050506';
  c.beginPath();
  c.roundRect(r.x + r.w / 2 - 55 * s, 7 * s, 110 * s, 20 * s, 10 * s);
  c.fill();
  c.fillStyle = 'rgba(70, 80, 100, 0.9)';
  c.beginPath();
  c.arc(r.x + r.w / 2 + 38 * s, 17 * s, 2.4 * s, 0, TAU);
  c.fill();
  c.restore();
}

function formatCount(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

// ---------------------------------------------------------------- title

function drawVerticalTitle(g, opacity, lift) {
  if (opacity <= 0.001) return;
  const c = g.drawingContext;
  const H = g.height;
  const W = g.width;
  const s = H / 1080;
  const x = 70 * s;
  const y = 150 * s + lift * 0.3 * s;

  c.save();
  c.globalAlpha = opacity;

  // Big index.
  setFont(c, 108 * s, 600, EN_FONT, '4px');
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = 'rgba(255,255,255,0.94)';
  c.fillText('19', x, y + 92 * s);
  c.strokeStyle = 'rgba(255,111,159,0.7)';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.moveTo(x, y + 112 * s);
  c.lineTo(x + 160 * s, y + 112 * s);
  c.stroke();

  setFont(c, 31 * s, 600, CN_FONT, '1px');
  c.fillStyle = '#f8f4ea';
  c.fillText('竖屏短视频', x, y + 168 * s);

  setFont(c, 13 * s, 500, EN_FONT, '3px');
  c.fillStyle = 'rgba(255, 126, 168, 0.95)';
  c.fillText('VERTICAL VIDEO', x, y + 198 * s);

  setFont(c, 14 * s, 400, CN_FONT, '0.4px');
  c.fillStyle = 'rgba(255,255,255,0.56)';
  c.fillText('2020s · 9:16', x, y + 226 * s);

  // A small phone outline.
  c.strokeStyle = 'rgba(255,255,255,0.28)';
  c.lineWidth = 1.4 * s;
  c.beginPath();
  c.roundRect(x, y + 270 * s, 54 * s, 96 * s, 8 * s);
  c.stroke();
  c.fillStyle = 'rgba(255, 111, 159, 0.5)';
  c.beginPath();
  c.roundRect(x + 7 * s, y + 280 * s, 40 * s, 76 * s, 5 * s);
  c.fill();

  setFont(c, 10 * s, 500, EN_FONT, '1.6px');
  c.fillStyle = 'rgba(255,255,255,0.34)';
  c.fillText('ONE TAKE / NO CUT', x, y + 402 * s);

  // Right bar: a thin vertical line, no content.
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(W - 52 * s, 120 * s);
  c.lineTo(W - 52 * s, H - 120 * s);
  c.stroke();

  c.restore();
}
