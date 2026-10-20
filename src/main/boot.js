import { Director } from './director.js';
import scenes from '../scenes/index.js';
import { DURATION, FPS, clamp, sectionAt, timecode } from '../beat/timeline.js';

const params = new URLSearchParams(location.search);
const RENDER = params.get('render') === '1';
const START = clamp(parseFloat(params.get('t') || '0') || 0, 0, DURATION);
const AUTOPLAY = !RENDER && params.get('play') !== '0';

if (RENDER) document.body.classList.add('render');

const stage = document.getElementById('stage');
const playBtn = document.getElementById('play');
const seek = document.getElementById('seek');
const sceneLabel = document.getElementById('scene-label');
const timeLabel = document.getElementById('time-label');

const clock = {
  t: START,
  base: START,
  t0: 0,
  playing: false,
  raf: 0,
};

let director = null;
let p5inst = null;

new window.p5((p) => {
  p5inst = p;

  p.setup = () => {
    const canvas = p.createCanvas(1920, 1080);
    canvas.parent(stage);
    p.pixelDensity(1);
    p.noLoop();
    p.background(0);
    p.frameRate(60);
    if (p.drawingContext) {
      p.drawingContext.imageSmoothingEnabled = true;
      p.drawingContext.lineCap = 'round';
      p.drawingContext.lineJoin = 'round';
    }

    director = new Director(p);
    window.__director = director;

    const ready = () => {
      drawAt(START);
      window.__ready = true;
      if (AUTOPLAY) play();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(ready);
    } else {
      ready();
    }
  };

  p.draw = () => {
    director.renderAt(clock.t);
  };
}, stage);

function drawAt(t) {
  clock.t = clamp(t, 0, DURATION);
  p5inst.redraw();
  updateUI();
}

function loop(now) {
  if (!clock.playing) return;
  clock.t = clock.base + (now - clock.t0) / 1000;
  if (clock.t >= DURATION) {
    clock.t = DURATION;
    clock.playing = false;
    updatePlayButton();
  }
  drawAt(clock.t);
  if (clock.playing) clock.raf = requestAnimationFrame(loop);
}

function play() {
  if (clock.t >= DURATION) clock.t = 0;
  clock.base = clock.t;
  clock.t0 = performance.now();
  clock.playing = true;
  updatePlayButton();
  cancelAnimationFrame(clock.raf);
  clock.raf = requestAnimationFrame(loop);
}

function pause() {
  clock.playing = false;
  cancelAnimationFrame(clock.raf);
  updatePlayButton();
}

function toggle() {
  if (clock.playing) pause();
  else play();
}

function seekTo(t) {
  clock.t = clamp(t, 0, DURATION);
  clock.base = clock.t;
  clock.t0 = performance.now();
  if (!clock.playing) {
    drawAt(clock.t);
  }
}

function updatePlayButton() {
  if (!playBtn) return;
  playBtn.textContent = clock.playing ? '❚❚' : '▶';
  playBtn.setAttribute('aria-label', clock.playing ? '暂停' : '播放');
}

function updateUI() {
  if (RENDER) return;
  if (seek && document.activeElement !== seek) {
    seek.value = String(clock.t);
  }
  if (timeLabel) {
    timeLabel.textContent = `${timecode(clock.t)} / ${timecode(DURATION)}`;
  }
  if (sceneLabel) {
    const info = sectionAt(clock.t);
    if (info.kind === 'intro') sceneLabel.textContent = '序  ·  INTRO';
    else if (info.kind === 'outro') sceneLabel.textContent = '尾声  ·  OUTRO';
    else {
      const sc = scenes[info.index];
      sceneLabel.textContent = `${String(sc.number).padStart(2, '0')}  ·  ${sc.cn}`;
    }
  }
}

if (seek) {
  seek.min = '0';
  seek.max = String(DURATION);
  seek.step = '0.01';
  seek.value = String(START);
  seek.addEventListener('input', () => seekTo(parseFloat(seek.value)));
}
if (playBtn) playBtn.addEventListener('click', toggle);

window.addEventListener('keydown', (e) => {
  if (RENDER) return;
  if (e.code === 'Space') {
    e.preventDefault();
    toggle();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    seekTo(clock.t + (e.shiftKey ? 1 / FPS : 1));
    if (clock.playing) {
      clock.base = clock.t;
      clock.t0 = performance.now();
    }
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    seekTo(clock.t - (e.shiftKey ? 1 / FPS : 1));
    if (clock.playing) {
      clock.base = clock.t;
      clock.t0 = performance.now();
    }
  } else if (e.code === 'Home') {
    seekTo(0);
  } else if (e.code === 'End') {
    seekTo(DURATION);
  }
});

// Deterministic export hook. Called by tools/shot.mjs and tools/render.mjs.
window.__renderAt = (t) => {
  clock.playing = false;
  cancelAnimationFrame(clock.raf);
  drawAt(t);
  return true;
};

window.__duration = DURATION;
window.__fps = FPS;
window.__scenes = scenes;
