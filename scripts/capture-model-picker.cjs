// Local compiled UI evidence: design-review fixtures only; all API/external HTTP rejected.
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3110';
  const output = path.resolve('evidence/theme/chromium');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ serviceWorkers: 'block', colorScheme: 'light' });
  const rejectedRequests = [];
  const errors = [];
  const checks = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.continue();
    rejectedRequests.push(`${route.request().method()} ${url.pathname}`);
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const theme of ['light', 'dark']) {
      await page.goto(`${base}/design-review`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Appearance', exact: true }).click();
      await page.getByRole('menuitemradio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click();
      for (const [width, height] of [[1366, 768], [320, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(`${base}/design-review`, { waitUntil: 'networkidle' });
        const trigger = page.getByRole('button', { name: 'Model Studio Image', exact: true });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: 'Choose your model', exact: true });
        await dialog.waitFor({ state: 'visible' });
        await page.evaluate(() => document.fonts.ready);
        const name = `${theme}-model-picker-${width}`;
        await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
        if (!await dialog.isVisible()) throw new Error(`${name}: modal closed during capture`);
        const metrics = await dialog.evaluate(element => {
          const box = element.getBoundingClientRect();
          return {
            theme: document.documentElement.dataset.theme,
            viewport: { width: innerWidth, height: innerHeight },
            dialog: { x: box.x, y: box.y, width: box.width, height: box.height },
            clipped: box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight,
            scrollWidth: document.documentElement.scrollWidth,
            selectedModels: [...element.querySelectorAll('button[aria-pressed="true"]')].map(button => button.querySelector('strong')?.textContent),
            focusInside: element.contains(document.activeElement),
          };
        });
        const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(value => ({
          id: value.id, impact: value.impact, nodes: value.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
        }));
        await page.keyboard.press('Escape');
        const focusReturned = await trigger.evaluate(element => document.activeElement === element);
        checks.push({ name, ...metrics, focusReturned, violations });
        console.log(name, JSON.stringify({ clipped: metrics.clipped, focusReturned, violations: violations.length }));
      }
    }
    fs.writeFileSync(path.join(output, 'model-picker-results.json'), JSON.stringify({
      environment: 'Chromium/Chrome; local compiled build; design-review Create sample fixture; all API/external HTTP rejected; no real session or generation.',
      checks, errors, rejectedRequests,
    }, null, 2) + '\n');
    if (errors.length || checks.some(check => check.clipped || check.scrollWidth > check.viewport.width || !check.focusInside || !check.focusReturned || check.violations.length)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
