// Render one frame: node tools/shot.mjs --t 12.5 --out out/shot.png
import { startServer } from './serve.mjs';
import { capture, launchBrowser, openApp } from './browser.mjs';

const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const t = Number(get('t', 0));
const out = get('out', `out/shot_${t}.png`);

const srv = await startServer();
const browser = await launchBrowser();
try {
  const page = await openApp(browser, srv.url, { t });
  await capture(page, t, out);
  console.log(`wrote ${out} @ t=${t}s`);
} finally {
  await browser.close();
  await srv.close();
}
