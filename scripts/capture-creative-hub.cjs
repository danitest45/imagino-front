// Local presentation evidence. Never forward an API or external request.
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3112';
const output = path.resolve('evidence/creative-hub/screenshots');
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const denied = [], errors = [], checks = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.continue();
    denied.push(`${route.request().method()} ${url.origin}${url.pathname}`);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  async function choose(label, value) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: value, exact: true }).click();
  }
  async function review(surface, state = 'Result') {
    await page.goto(`${base}/design-review`);
    await page.getByRole('combobox', { name: 'Surface', exact: true }).waitFor();
    if (surface !== 'Image') await choose('Surface', surface);
    await expect(page.getByRole('combobox', { name: 'Surface', exact: true })).toHaveText(surface);
    if (state !== 'Result') await choose('State', state);
  }
  async function capture(name, audit = false, viewport = false) {
    await page.evaluate(async () => {
      for (const image of document.images) {
        image.loading = 'eager';
        if (!image.complete) await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; setTimeout(resolve, 5000); });
      }
      await document.fonts.ready;
    });
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: !viewport });
    const metrics = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      theme: document.documentElement.dataset.theme,
      brokenImages: [...document.images].filter(image => !image.complete || !image.naturalWidth).map(image => image.alt),
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(element => {
        const box = element.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    }));
    const violations = audit ? (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })) })) : [];
    checks.push({ name, ...metrics, audited: audit, violations });
    console.log(name, JSON.stringify({ overflow: metrics.scrollWidth > metrics.width, broken: metrics.brokenImages.length, violations: violations.length }));
  }
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 390, 768, 1366, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      for (const surface of ['Image', 'Video', 'Assets']) {
        await review(surface);
        await capture(`${theme}-${surface.toLowerCase()}-${width}`, [320, 1366].includes(width));
      }
      if ([390, 1366].includes(width)) {
        for (const state of ['Empty', 'Error', 'Queued', 'Refunded', 'Alternate settings']) {
          await review('Image', state);
          await capture(`${theme}-${state.toLowerCase().replaceAll(' ', '-')}-${width}`, state === 'Error');
        }
        await review('Image', 'Model picker');
        await page.getByRole('dialog', { name: 'Choose your model', exact: true }).waitFor();
        await capture(`${theme}-picker-${width}`, true, true);
        await page.keyboard.press('Escape');
        if (width === 390) {
          await page.getByRole('button', { name: 'Open workspace navigation', exact: true }).click();
          await capture(`${theme}-drawer-${width}`, true, true);
          await page.keyboard.press('Escape');
        }
      }
    }
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce', forcedColors: 'active' });
  await review('Image', 'Model picker');
  await page.getByRole('dialog', { name: 'Choose your model', exact: true }).waitFor();
  await capture('forced-colors-picker-768', true, true);
  await page.keyboard.press('Escape');
  await page.emulateMedia({ forcedColors: 'none' });
  await review('Image');
  await page.addStyleTag({ content: 'body { zoom: 2; }' });
  await capture('200-percent-zoom-768', true);
  const result = { browser: await browser.version(), scope: 'Local sample fixtures only; no account, API, generation, provider, or payment calls.', denied, errors, checks };
  fs.writeFileSync(path.join(output, '..', 'visual-checks.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  if (denied.length || errors.length || checks.some(c => c.scrollWidth > c.width || c.brokenImages.length || c.violations.length)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
