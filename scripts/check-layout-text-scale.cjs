// Read-only pressure check: double computed font sizes of the rendered sample.
// This supplements the browser-zoom layout emulation in fixed-workspace.spec.ts.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3113';
const output = path.resolve('evidence/layout-polish');
async function doubleComputedFonts(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const fonts = [document.body, ...document.body.querySelectorAll('*')].filter(element => element instanceof HTMLElement)
      .map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
    for (const [element, size] of fonts) element.style.setProperty('font-size', `${size * 2}px`, 'important');
    return fonts.length;
  });
}
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const blocked = [], errors = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1', 'localhost'].includes(url.hostname) && !url.pathname.startsWith('/api/')) return route.continue();
    blocked.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/design-review`);
  await page.getByRole('combobox', { name: 'State', exact: true }).click();
  await page.getByRole('option', { name: 'Long video form', exact: true }).click();
  const count = await doubleComputedFonts(page);
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Text scaling check, without a generation.');
  const audio = page.getByRole('combobox', { name: 'Audio', exact: true });
  await audio.click();
  await page.getByRole('option', { name: 'Disabled', exact: true }).click();
  const geometry = await page.evaluate(() => {
    const rect = selector => {
      const element = document.querySelector(selector), box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, height: box.height, width: box.width, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, fontSize: getComputedStyle(element).fontSize };
    };
    return { width: innerWidth, height: innerHeight, documentHeight: document.documentElement.scrollHeight, documentWidth: document.documentElement.scrollWidth,
      controls: rect('.studio-control-scroll'), footer: rect('.studio-create-action'), generate: rect('.studio-create-button'), lastSetting: rect('#generation-setting-sampleAudio') };
  });
  const lastSettingVisible = geometry.lastSetting.top >= geometry.controls.top - 1 && geometry.lastSetting.bottom <= geometry.controls.bottom + 1;
  const generateVisible = geometry.generate.top >= 0 && geometry.generate.bottom <= geometry.height + 1;
  fs.mkdirSync(output, { recursive: true });
  await page.screenshot({ path: path.join(output, 'doubled-computed-text-1366x768.png'), fullPage: false });
  const audioValue = await audio.textContent();
  const statusCases = [];
  for (const state of ['Failed', 'Queued']) {
    await page.goto(`${base}/design-review`);
    await page.getByRole('combobox', { name: 'State', exact: true }).click();
    await page.getByRole('option', { name: state, exact: true }).click();
    const region = page.locator('.studio-result-state');
    await region.waitFor();
    const elementsScaled = await doubleComputedFonts(page);
    const measure = () => region.evaluate(element => {
      const rect = target => {
        const box = target.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      return { region: rect(element), heading: rect(element.querySelector('h3')), lastParagraph: rect(element.querySelector('p:last-child')),
        scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
        documentHeight: document.documentElement.scrollHeight, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
    });
    await region.evaluate(element => { element.scrollTop = 0; });
    const top = await measure();
    const firstHeadingReachable = top.scrollTop === 0 && top.heading.top >= top.region.top - 1;
    await page.screenshot({ path: path.join(output, `doubled-computed-text-${state.toLowerCase()}-1366x768-top.png`), fullPage: false });
    await region.evaluate(element => { element.scrollTop = element.scrollHeight; });
    const bottom = await measure();
    const lastParagraphReachable = bottom.lastParagraph.bottom <= bottom.region.bottom + 1 && bottom.lastParagraph.bottom >= bottom.region.top;
    await page.screenshot({ path: path.join(output, `doubled-computed-text-${state.toLowerCase()}-1366x768-bottom.png`), fullPage: false });
    statusCases.push({ state, elementsScaled, firstHeadingReachable, lastParagraphReachable, top, bottom });
  }
  const result = { method: 'Double precomputed font sizes on all currently rendered HTML elements in the local Long video form, Failed and Queued fixtures; no CSS zoom. Newly mounted popup content retains its normal type size. Separate browser-zoom emulation checks whole-interface reflow.', elementsScaled: count, audioValue, lastSettingVisible, generateVisible, blocked, errors, geometry, statusCases };
  fs.writeFileSync(path.join(output, 'doubled-computed-text.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (!lastSettingVisible || !generateVisible || blocked.length || errors.length || geometry.documentWidth > geometry.width + 1 ||
    statusCases.some(status => !status.firstHeadingReachable || !status.lastParagraphReachable || status.bottom.documentWidth > status.bottom.viewportWidth + 1)) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
