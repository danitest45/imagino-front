// Repeatable viewport evidence. Every API/external request is blocked; only
// /design-review local sample data is used. Run before and after at the same sizes.
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const phase = process.env.LAYOUT_PHASE || 'after';
if (!['before', 'after'].includes(phase)) throw new Error('LAYOUT_PHASE must be before or after');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3113';
const output = path.resolve(`evidence/layout-polish/${phase}`);
const desktop = [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
const mobile = [{ width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 900 }];
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext();
  const denied = [], errors = [], captures = [];
  const intercept = route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.continue();
    denied.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort('blockedbyclient');
  };
  await context.route('**/*', intercept);
  let page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function choose(label, value) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  async function review(surface, state = 'Result') {
    await page.goto(`${base}/design-review`);
    await page.getByRole('combobox', { name: 'Surface', exact: true }).waitFor();
    if (surface !== 'Image') await choose('Surface', surface);
    if (state !== 'Result') await choose('State', state);
    await expect(page.getByRole('combobox', { name: 'Surface', exact: true })).toHaveText(surface);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(async image => { image.loading = 'eager'; try { await image.decode(); } catch {} }));
    });
  }
  async function capture(name) {
    const bounds = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { x, y, width, height, top, bottom } = element.getBoundingClientRect();
        return { x, y, width, height, top, bottom, scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
      };
      return { viewport: { width: innerWidth, height: innerHeight, devicePixelRatio }, document: { height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, scrollTop: document.scrollingElement.scrollTop },
        sidebar: rect('.app-shell-sidebar'), controls: rect('.studio-control-scroll'), footer: rect('.studio-create-action'), result: rect('.studio-output'), canvas: rect('.studio-result-canvas, .studio-empty-canvas'), assets: rect('.library-content-scroll'),
        brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.alt) };
    });
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
    captures.push({ name, ...bounds });
    console.log(`${phase}/${name}`, JSON.stringify({ documentHeight: bounds.document.height, viewportHeight: bounds.viewport.height, controlScroll: bounds.controls?.scrollTop, resultTop: bounds.result?.top }));
  }
  async function scrollControls(fraction) {
    await page.evaluate(value => {
      window.scrollTo(0, 0);
      const controls = document.querySelector('.studio-control-scroll');
      if (controls) controls.scrollTop = (controls.scrollHeight - controls.clientHeight) * value;
    }, fraction);
  }
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const viewport of [...desktop, ...mobile]) {
      await page.setViewportSize(viewport);
      for (const surface of ['Image', 'Video']) {
        await review(surface);
        const label = `${theme}-${surface.toLowerCase()}-${viewport.width}x${viewport.height}`;
        await capture(`${label}-top`);
        if (theme === 'light') {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await capture(`${label}-document-bottom`);
          if (viewport.width >= 1120) {
            await scrollControls(0.5);
            await capture(`${label}-controls-half`);
            await scrollControls(1);
            await capture(`${label}-controls-bottom`);
          }
        }
      }
    }
  }
  if (phase === 'after') {
    await page.emulateMedia({ colorScheme: 'light' });
    for (const viewport of desktop) {
      await page.setViewportSize(viewport);
      await review('Video', 'Long video form');
      for (const [position, fraction] of [['top', 0], ['half', 0.5], ['bottom', 1]]) {
        await scrollControls(fraction);
        await capture(`light-long-video-${viewport.width}x${viewport.height}-${position}`);
      }
      await review('Assets', 'Long asset list');
      await capture(`light-long-assets-${viewport.width}x${viewport.height}-top`);
      await page.locator('.library-content-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
      await capture(`light-long-assets-${viewport.width}x${viewport.height}-bottom`);
    }
    await page.setViewportSize(desktop[0]);
    await page.emulateMedia({ colorScheme: 'light', forcedColors: 'active', reducedMotion: 'reduce' });
    await review('Video', 'Long video form');
    await scrollControls(1);
    await capture('forced-colors-long-video-1366x768-footer');
    const zoomContext = await browser.newContext({ viewport: { width: 384, height: 512 }, deviceScaleFactor: 2, colorScheme: 'light' });
    await zoomContext.route('**/*', intercept);
    page = await zoomContext.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await review('Video', 'Long video form');
    await capture('light-video-200percent-browser-zoom-equivalent-768x1024-top');
    await page.getByRole('button', { name: 'Generate video', exact: true }).scrollIntoViewIfNeeded();
    await capture('light-video-200percent-browser-zoom-equivalent-768x1024-footer');
  }
  const overflowFailures = phase === 'after' ? captures.filter(capture => capture.viewport.width >= 1120 && (capture.document.height > capture.viewport.height + 1 || capture.document.width > capture.viewport.width + 1)).map(capture => capture.name) : [];
  fs.writeFileSync(path.join(output, 'geometry.json'), JSON.stringify({ phase, browser: await browser.version(), scope: 'Local design-review fixtures; API/external requests blocked; no generation. 200% zoom equivalent uses 384×512 CSS pixels at DPR2 for a 768×1024 physical viewport.', denied, errors, overflowFailures, captures }, null, 2) + '\n');
  const beforePath = path.resolve('evidence/layout-polish/before/geometry.json');
  if (phase === 'after' && fs.existsSync(beforePath)) {
    const before = JSON.parse(fs.readFileSync(beforePath, 'utf8')).captures;
    const summarize = capture => ({ documentHeight: capture.document.height, documentWidth: capture.document.width, sidebarBottom: capture.sidebar?.bottom,
      footerBottom: capture.footer?.bottom, resultTop: capture.result?.top, canvasHeight: capture.canvas?.height });
    const comparison = captures.filter(capture => capture.name.endsWith('-top') && before.some(prior => prior.name === capture.name)).map(capture => ({ name: capture.name,
      viewport: capture.viewport, before: summarize(before.find(prior => prior.name === capture.name)), after: summarize(capture) }));
    fs.writeFileSync(path.resolve('evidence/layout-polish/comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
  }
  await browser.close();
  if (denied.length || errors.length || overflowFailures.length || captures.some(capture => capture.brokenImages.length)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
