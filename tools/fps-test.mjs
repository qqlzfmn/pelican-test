// Compare 30 vs 60 fps on a camera-pan window. Produces two short clips.
//   node tools/fps-test.mjs --start 5 --seconds 2

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startServer } from './serve.mjs';
import { capture, launchBrowser, openApp } from './browser.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const start = Number(get('start', 5));
const seconds = Number(get('seconds', 2));

const srv = await startServer();
const browser = await launchBrowser();
const results = [];

try {
  for (const fps of [30, 60]) {
    const dir = `out/fps-test/${fps}`;
    await fs.mkdir(dir, { recursive: true });
    const page = await openApp(browser, srv.url, { t: start });
    const n = Math.round(seconds * fps);
    const t0 = Date.now();
    for (let i = 0; i < n; i += 1) {
      await capture(page, start + i / fps, path.join(dir, `f${String(i).padStart(5, '0')}.png`));
    }
    const elapsed = (Date.now() - t0) / 1000;
    await page.close();
    const mp4 = `out/fps-test/pan_${fps}fps.mp4`;
    execFileSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(fps), '-start_number', '0',
      '-i', path.join(dir, 'f%05d.png'),
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', mp4,
    ]);
    results.push({ fps, frames: n, elapsed, ms: (elapsed * 1000) / n, mp4 });
  }
} finally {
  await browser.close();
  await srv.close();
}

for (const r of results) {
  console.log(`${r.fps}fps: ${r.frames} frames in ${r.elapsed.toFixed(1)}s = ${r.ms.toFixed(0)} ms/frame -> ${r.mp4}`);
}
console.log('Decide by looking at the two clips: 60fps doubles frames and export time.');
