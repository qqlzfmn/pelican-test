// Build the 1920x1080 Bilibili cover from four of the film's own frames.
//   node tools/cover.mjs
// Writes out/cover.png. No external images or fonts are fetched.

import fs from 'node:fs/promises';
import puppeteer from 'puppeteer';

const tiles = [
  'out/Qingming_a.png',
  'out/s12_v_74.0.png',
  'out/Egypt_a.png',
  'out/s20_c.png',
];

const imgs = await Promise.all(
  tiles.map(async (p) => (await fs.readFile(p)).toString('base64')),
);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1920px; height: 1080px; overflow: hidden; background: #080706; }
  .grid { position: absolute; inset: 0; display: grid; grid-template-columns: 1fr 1fr;
           grid-template-rows: 1fr 1fr; gap: 6px; }
  .grid img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .shade { position: absolute; inset: 0;
    background:
      linear-gradient(90deg, rgba(8,7,6,.96) 0%, rgba(8,7,6,.88) 32%, rgba(8,7,6,.42) 62%, rgba(8,7,6,.15) 100%),
      linear-gradient(0deg, rgba(8,7,6,.7), transparent 42%);
  }
  .copy { position: absolute; left: 92px; top: 118px; width: 1120px; color: #f4ead8; }
  .kicker { font: 600 25px/1.2 -apple-system, "Helvetica Neue", sans-serif;
            letter-spacing: .26em; color: #d8b36a; text-transform: uppercase; }
  h1 { margin: 30px 0 0; font: 900 190px/.92 "Songti SC", "STSong", serif;
       letter-spacing: .02em; text-shadow: 0 8px 42px rgba(0,0,0,.6); }
  .en { margin-top: 26px; font: 500 43px/1.1 -apple-system, "Helvetica Neue", sans-serif;
        letter-spacing: .19em; color: #f4ead8; }
  .rule { width: 172px; height: 3px; background: #c7a35c; margin: 32px 0 28px; }
  .sub { font: 400 40px/1.55 "Songti SC", "STSong", serif; color: #e6d8bf; }
  .meta { position: absolute; left: 94px; bottom: 78px; display: flex; gap: 26px;
          font: 600 21px/1 -apple-system, "Helvetica Neue", sans-serif;
          letter-spacing: .12em; color: #bfae95; }
  .meta span { border-left: 1px solid rgba(199,163,92,.55); padding-left: 22px; }
  .meta span:first-child { border-left: 0; padding-left: 0; color: #d8b36a; }
  .badge { position: absolute; right: 76px; top: 70px; padding: 12px 18px;
           border: 1px solid rgba(244,234,216,.5); color: #f4ead8;
           font: 600 18px/1 -apple-system, "Helvetica Neue", sans-serif;
           letter-spacing: .15em; }
</style></head><body>
  <div class="grid">
    <img src="data:image/png;base64,${imgs[0]}">
    <img src="data:image/png;base64,${imgs[1]}">
    <img src="data:image/png;base64,${imgs[2]}">
    <img src="data:image/png;base64,${imgs[3]}">
  </div>
  <div class="shade"></div>
  <div class="copy">
    <div class="kicker">A DEEPSEEK-ASSISTED FILM · 20 ERAS</div>
    <h1>鹈鹕测试</h1>
    <div class="en">THE PELICAN TEST</div>
    <div class="rule"></div>
    <div class="sub">人类画了六千年的鹈鹕骑车<br>每一帧，都是代码。</div>
  </div>
  <div class="badge">DEEPSEEK · 1080P · 60FPS</div>
  <div class="meta"><span>137 SEC</span><span>20 ART ERAS</span><span>DEEPSEEK + P5.JS + SYNTH</span></div>
</body></html>`;

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--allow-file-access-from-files', '--font-render-hinting=none'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: 'out/cover.png', type: 'png' });
  console.log('wrote out/cover.png');
} finally {
  await browser.close();
}
