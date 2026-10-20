import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

export const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 1 };

export async function launchBrowser({ headless = true } = {}) {
  return puppeteer.launch({
    headless,
    defaultViewport: VIEWPORT,
    args: [
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--font-render-hinting=none',
      '--hide-scrollbars',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--mute-audio',
    ],
  });
}

export async function openApp(browser, baseUrl, { t = 0 } = {}) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  const url = `${baseUrl}/?render=1&t=${t}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 120000 });
  return page;
}

export async function capture(page, t, outPath) {
  await page.evaluate((time) => window.__renderAt(time), t);
  // optimizeForSpeed is ~4x faster here; ffmpeg re-encodes anyway.
  const buffer = await page.screenshot({ type: 'png', optimizeForSpeed: true });
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, buffer);
  }
  return buffer;
}
