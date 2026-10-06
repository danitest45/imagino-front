// Compiled local UI evidence only. HTTP is intercepted before any API/proxy route.
const { chromium, firefox, webkit } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const engine = process.env.PLAYWRIGHT_ENGINE || 'chromium';
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3110';
const output = path.resolve('evidence/theme', engine);
const catalog = require('../src/data/generation-catalog-preview.json');
const drivers = { chromium, firefox, webkit, opera: chromium };
if (!drivers[engine]) throw new Error('PLAYWRIGHT_ENGINE must be chromium, firefox, webkit or opera.');
if (engine === 'opera' && !process.env.PLAYWRIGHT_EXECUTABLE_PATH) throw new Error('Opera capture requires its verified executable path; Chromium alone is not an Opera test.');
fs.mkdirSync(output, { recursive: true });

async function main() {
  const browser = await drivers[engine].launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : {}), ...(engine === 'opera' ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: 'light' });
  const denied = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (local && url.pathname === '/api/generation/catalog') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...catalog, models: catalog.models.map(model => ({ ...model, availability: 'deployment_pending' })) }) });
    if (local && !url.pathname.startsWith('/api/')) return route.continue();
    denied.push(`${route.request().method()} ${url.pathname}`);
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  const page = await context.newPage();
  const checks = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function choose(label, option) {
    await page.getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  }
  async function review(surface = 'Create', state = 'Result') {
    await page.goto(`${base}/design-review`, { waitUntil: 'networkidle' });
    if (surface !== 'Create') await choose('Surface', surface);
    if (state !== 'Result') await choose('State', state);
  }
  async function capture(name, axe = false) {
    await page.evaluate(async () => {
      for (const image of document.images) {
        image.loading = 'eager';
        if (!image.complete) await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; setTimeout(resolve, 5000); });
      }
      await document.fonts.ready;
    });
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    const metrics = await page.evaluate(() => ({
      width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      preference: document.documentElement.dataset.themePreference, theme: document.documentElement.dataset.theme,
      forcedColorsActive: matchMedia('(forced-colors: active)').matches,
      reducedMotionActive: matchMedia('(prefers-reduced-motion: reduce)').matches,
      brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => image.alt),
      focusedRole: document.activeElement?.getAttribute('role'),
      popups: [...document.querySelectorAll('[role="listbox"], [role="menu"]')].map(element => {
        const box = element.getBoundingClientRect();
        return { role: element.getAttribute('role'), x: box.x, y: box.y, width: box.width, height: box.height, inDialog: !!element.closest('dialog[open]') };
      }),
    }));
    const violations = axe ? (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(value => ({ id: value.id, impact: value.impact, description: value.description, nodes: value.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })) : [];
    checks.push({ name, ...metrics, accessibilityAudited: axe, violations });
    console.log(name, JSON.stringify({ overflow: metrics.scrollWidth > metrics.width, broken: metrics.brokenImages.length, accessibilityAudited: axe, violations: violations.length }));
  }
  for (const theme of ['light', 'dark']) {
    await page.goto(base);
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('menuitemradio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click();
    for (const [width, height] of [[320, 900], [390, 844], [768, 1024], [1366, 768], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.goto(base, { waitUntil: 'networkidle' });
      await capture(`${theme}-landing-${width}`, width === 320 || width === 1366);
      await review();
      await capture(`${theme}-create-result-${width}`, width === 1366);
      await review('Library');
      await capture(`${theme}-library-${width}`, width === 320 || width === 1366);
      if ([390, 1366].includes(width)) {
        for (const state of ['Empty', 'Reference']) { await review('Create', state); await capture(`${theme}-create-${state.toLowerCase()}-${width}`, width === 1366); }
        await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
        await capture(`${theme}-login-${width}`, true);
        for (const surface of ['Account', 'Costs']) { await review(surface); await capture(`${theme}-${surface.toLowerCase()}-${width}`, true); }
      }
      if ([320, 1366].includes(width)) {
        await review('Components');
        await capture(`${theme}-components-${width}`, true);
        await page.getByRole('button', { name: 'Appearance', exact: true }).click();
        await capture(`${theme}-appearance-open-${width}`, true);
        await page.keyboard.press('Escape');
        await page.getByRole('combobox', { name: 'Example select', exact: true }).click();
        await capture(`${theme}-select-open-${width}`, true);
        await page.keyboard.press('Escape');
        await page.getByRole('combobox', { name: 'Long options', exact: true }).click();
        await page.getByRole('option', { name: 'Option 24', exact: true }).scrollIntoViewIfNeeded();
        await capture(`${theme}-select-long-${width}`, width === 1366);
        await page.keyboard.press('Escape');
        await page.getByRole('combobox', { name: 'Edge select', exact: true }).click();
        await capture(`${theme}-select-edge-${width}`, width === 1366);
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Open sample dialog', exact: true }).click();
        await page.getByRole('combobox', { name: 'Dialog select', exact: true }).click();
        await capture(`${theme}-select-dialog-${width}`, true);
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    for (const state of ['Error', 'Loading', 'Unavailable', 'No balance', 'Queued', 'Processing', 'Failed']) {
      await review('Create', state);
      await capture(`${theme}-create-${state.toLowerCase().replaceAll(' ', '-')}`, true);
    }
    await review('Library');
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await capture(`${theme}-library-filter-open`, true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Open Studio Image/ }).first().click();
    await capture(`${theme}-library-detail`, true);
    await page.keyboard.press('Escape');
    await review('Components');
    await page.getByRole('button', { name: 'Sample information', exact: true }).hover();
    await capture(`${theme}-tooltip`, true);
    await page.getByRole('button', { name: 'Primary', exact: true }).click();
    await capture(`${theme}-toast`, true);
    for (const [url, label] of [[base, 'landing'], [`${base}/design-review`, 'create']]) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => {
        const sizes = [...document.querySelectorAll('body *')].map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
        sizes.forEach(([element, size]) => { element.style.fontSize = `${size * 2}px`; });
      });
      await capture(`${theme}-${label}-text-200`, true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await review('Create', 'Processing');
    await capture(`${theme}-reduced-motion`, true);
    await page.emulateMedia({ reducedMotion: 'no-preference', forcedColors: 'active' });
    await review('Components');
    await page.getByRole('combobox', { name: 'Example select', exact: true }).click();
    await capture(`${theme}-forced-colors-select`);
    await page.keyboard.press('Escape');
    await page.emulateMedia({ forcedColors: 'none' });
    // Legacy route shells are reviewed signed out with intercepted HTTP.
    for (const route of ['images', 'videos']) { await page.goto(`${base}/${route}`, { waitUntil: 'networkidle' }); await capture(`${theme}-legacy-${route}`); }
  }
  fs.writeFileSync(path.join(output, 'visual-results.json'), JSON.stringify({
    environment: `${engine}; local compiled build; design-review sample states and HTTP-intercepted signed-out routes; no real session, generation or remote verification`,
    checks, errors, interceptedApiRequests: denied,
  }, null, 2));
  await browser.close();
  if (errors.length || checks.some(check => check.scrollWidth > check.width || check.brokenImages.length || check.violations.length)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
