// Parallel frame export.
//   node tools/render.mjs --from 0 --to 8219 --fps 60 --workers 4
// Frames land as frames/f00000.png ... ready for ffmpeg.

import fs from 'node:fs/promises';
import path from 'node:path';
import { startServer } from './serve.mjs';
import { capture, launchBrowser, openApp } from './browser.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const fps = Number(get('fps', 60));
const from = Number(get('from', 0));
const to = Number(get('to', Math.round(137 * fps) - 1));
const workers = Math.max(1, Number(get('workers', 4)));
const outDir = get('out', 'frames');
const step = Math.max(1, Number(get('step', 1)));
const skipExisting = has('skip-existing');

if (!(fps > 0) || !(to >= from)) {
  console.error('usage: node tools/render.mjs --fps 60 --from 0 --to 8219 --workers 4');
  process.exit(1);
}

await fs.mkdir(outDir, { recursive: true });

const frames = [];
for (let f = from; f <= to; f += step) frames.push(f);

const total = frames.length;
let done = 0;
let failed = null;
const started = Date.now();
const srv = await startServer();
const browser = await launchBrowser();

console.log(
  `rendering ${total} frames @ ${fps}fps into ${outDir} with ${workers} worker(s)`,
);

const chunks = Array.from({ length: workers }, () => []);
frames.forEach((f, i) => chunks[i % workers].push(f));

async function worker(chunk, id) {
  if (!chunk.length) return;
  const page = await openApp(browser, srv.url, { t: chunk[0] / fps });
  for (const f of chunk) {
    if (failed) return;
    const file = path.join(outDir, `f${String(f).padStart(5, '0')}.png`);
    if (skipExisting) {
      try {
        const st = await fs.stat(file);
        if (st.size > 0) {
          done += 1;
          continue;
        }
      } catch {}
    }
    await capture(page, f / fps, file);
    done += 1;
    if (done % 30 === 0 || done === total) {
      const sec = (Date.now() - started) / 1000;
      const rate = done / sec;
      const eta = (total - done) / Math.max(0.01, rate);
      console.log(
        `  ${done}/${total}  ${rate.toFixed(1)} fps  elapsed ${sec.toFixed(1)}s  eta ${eta.toFixed(1)}s  [w${id}]`,
      );
    }
  }
  await page.close();
}

try {
  await Promise.all(chunks.map((chunk, i) => worker(chunk, i)));
} catch (err) {
  failed = err;
  console.error(err);
} finally {
  await browser.close();
  await srv.close();
}

if (failed) process.exit(1);
const sec = (Date.now() - started) / 1000;
console.log(
  `done: ${total} frames in ${sec.toFixed(1)}s (${(total / sec).toFixed(1)} fps, ${((sec / total) * 1000).toFixed(0)} ms/frame)`,
);
