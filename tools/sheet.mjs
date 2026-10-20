// Contact sheet for review: node tools/sheet.mjs --start 0 --end 137 --count 20
// Writes out/contact-sheet.png (1920x1080) with timecodes and era names.

import fs from 'node:fs/promises';
import { startServer } from './serve.mjs';
import { capture, launchBrowser, openApp } from './browser.mjs';
import scenes from '../src/scenes/index.js';
import { DURATION, sectionAt, sectionStart, timecode } from '../src/beat/timeline.js';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const start = Number(get('start', 0));
const end = Number(get('end', DURATION));
const count = Number(get('count', 20));
const out = get('out', 'out/contact-sheet.png');
const custom = get('times', '');
const perScene = args.includes('--scenes');
const cols = Number(get('cols', 5));
const label = get('label', 'phase 2 · three finished eras');

const times = custom
  ? custom.split(',').map(Number)
  : perScene
    ? [2.5, ...scenes.map((_, i) => sectionStart(i) + 3), 126.5, 135.2]
    : Array.from({ length: count }, (_, i) => start + ((i + 0.5) / count) * (end - start));

function labelAt(t) {
  const info = sectionAt(t);
  if (info.kind === 'intro') return '序 · INTRO';
  if (info.kind === 'outro') return '尾声 · OUTRO';
  const s = scenes[info.index];
  return `${String(s.number).padStart(2, '0')} · ${s.cn}`;
}

const srv = await startServer();
const browser = await launchBrowser();
let page;

try {
  page = await openApp(browser, srv.url, { t: times[0] });
  const shots = [];
  for (const t of times) {
    const buf = await capture(page, t);
    shots.push({ t, buf, label: labelAt(t) });
  }

  const cards = shots
    .map(
      ({ t, buf, label }) => `
      <figure>
        <img src="data:image/png;base64,${buf.toString('base64')}" />
        <figcaption><span>${timecode(t)}</span><span>${label}</span></figcaption>
      </figure>`,
    )
    .join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #11100e; color: #ece4d5;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; }
  body { padding: 26px 30px 24px; }
  header { display: flex; align-items: baseline; justify-content: space-between;
    margin: 0 4px 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(199,163,92,.3); }
  h1 { margin: 0; font-size: 17px; font-weight: 500; letter-spacing: .04em; }
  h1 span { font-family: "Songti SC", serif; }
  .meta { font-size: 11px; letter-spacing: .1em; color: #a89c88; text-transform: uppercase; }
  main { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 12px 14px; }
  figure { margin: 0; }
  img { width: 100%; display: block; border: 1px solid rgba(199,163,92,.18); }
  figcaption { display: flex; justify-content: space-between; gap: 6px;
    padding: 5px 1px 0; font-size: 10px; color: #b5a892; }
  figcaption span:first-child { font-variant-numeric: tabular-nums; color: #c7a35c; }
</style></head>
<body>
  <header>
    <h1><span>《鹈鹕测试》</span> · CONTACT SHEET</h1>
    <div class="meta">${timecode(times[0])} – ${timecode(times[times.length - 1])} · ${shots.length} frames · ${label}</div>
  </header>
  <main>${cards}</main>
</body></html>`;

  const sheet = await browser.newPage();
  await sheet.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await sheet.setContent(html, { waitUntil: 'load' });
  const sheetHeight = Math.max(
    1080,
    await sheet.evaluate(() => Math.ceil(document.body.getBoundingClientRect().height + 4)),
  );
  await sheet.setViewport({ width: 1920, height: sheetHeight, deviceScaleFactor: 1 });
  await fs.mkdir('out', { recursive: true });
  await sheet.screenshot({ path: out, type: 'png' });
  await sheet.close();
  console.log(`wrote ${out} (${shots.length} frames)`);
} finally {
  if (page) await page.close();
  await browser.close();
  await srv.close();
}
