// Compiled local fixtures with Chromium forced-colors emulation; API/external HTTP rejected.
const { chromium } = require('playwright');
const { expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3110';
  const output = path.resolve('evidence/theme/chromium');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, colorScheme: 'light', serviceWorkers: 'block' });
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
      await page.emulateMedia({ forcedColors: 'none' });
      await page.goto(`${base}/design-review`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Appearance', exact: true }).click();
      await page.getByRole('menuitemradio', { name: theme === 'light' ? 'Light' : 'Dark', exact: true }).click();
      await page.getByRole('combobox', { name: 'Surface', exact: true }).click();
      await page.getByRole('option', { name: 'Components', exact: true }).click();
      await page.emulateMedia({ forcedColors: 'active' });
      for (const kind of ['select', 'appearance']) {
        const trigger = kind === 'select'
          ? page.getByRole('combobox', { name: 'Example select', exact: true })
          : page.getByRole('button', { name: 'Appearance', exact: true });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const popup = page.getByRole(kind === 'select' ? 'listbox' : 'menu');
        await popup.waitFor({ state: 'visible' });
        await expect(popup.getByRole(kind === 'select' ? 'option' : 'menuitemradio').first()).toBeFocused();
        if (kind === 'appearance') {
          await page.keyboard.press('ArrowDown');
          await expect(popup.getByRole('menuitemradio', { name: 'Light', exact: true })).toBeFocused();
        }
        await page.evaluate(() => document.fonts.ready);
        const name = `${theme}-forced-colors-${kind}`;
        await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: false });
        if (!await popup.isVisible()) throw new Error(`${name}: popup closed during capture`);
        const metrics = await popup.evaluate(element => {
          const focus = document.activeElement;
          const style = getComputedStyle(focus);
          const box = element.getBoundingClientRect();
          return {
            theme: document.documentElement.dataset.theme,
            forcedColorsActive: matchMedia('(forced-colors: active)').matches,
            viewport: { width: innerWidth, height: innerHeight },
            popup: { x: box.x, y: box.y, width: box.width, height: box.height },
            clipped: box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight,
            focusInside: element.contains(focus), focusedRole: focus.getAttribute('role'),
            focusedText: focus.textContent, foreground: style.color,
            background: style.backgroundColor, outline: style.outlineColor,
            forcedColorAdjust: style.forcedColorAdjust,
          };
        });
        const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.map(value => ({
          id: value.id, impact: value.impact, nodes: value.nodes.map(node => ({ target: node.target, summary: node.failureSummary })),
        }));
        await page.keyboard.press('Escape');
        await expect(popup).toBeHidden({ timeout: 2000 });
        await expect(trigger).toBeFocused({ timeout: 2000 });
        const focusReturned = await trigger.evaluate(element => document.activeElement === element);
        checks.push({ name, ...metrics, focusReturned, violations });
        console.log(name, JSON.stringify({ focusedText: metrics.focusedText, clipped: metrics.clipped, focusReturned, violations: violations.length }));
      }
    }
    fs.writeFileSync(path.join(output, 'forced-colors-results.json'), JSON.stringify({
      environment: 'Chromium/Chrome forced-colors emulation; local compiled design-review Components fixture; all API/external HTTP rejected; no real session or generation. Visual inspection supplements axe because forced-color text backplates are browser-rendered.',
      checks, errors, rejectedRequests,
    }, null, 2) + '\n');
    if (errors.length || checks.some(check => !check.forcedColorsActive || check.clipped || !check.focusInside || !check.focusReturned || check.forcedColorAdjust !== 'auto' || check.violations.length)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
