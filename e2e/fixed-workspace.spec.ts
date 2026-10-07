import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { jobs, mockStudio } from './studio-mocks';
import { chooseOption } from './select-helpers';
import catalog from '../src/data/generation-catalog-preview.json';
import type { GenerationModel } from '../src/types/generation';

const desktop = [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }];
const mobile = [{ width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 900 }];
const manyJobs = Array.from({ length: 30 }, (_, index) => ({ ...jobs[index % jobs.length], id: `layout-owned-${index}`, prompt: `Owned layout fixture ${index}` }));

async function documentGeometry(page: Page) {
  return page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth, viewportHeight: innerHeight, viewportWidth: innerWidth, scrollTop: document.scrollingElement?.scrollTop ?? 0 }));
}
async function inViewport(element: Locator, page: Page) {
  await expect(element).toBeVisible();
  const box = await element.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
}
async function fixedShell(page: Page) {
  await expect.poll(async () => (await documentGeometry(page)).height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  const geometry = await documentGeometry(page);
  expect(geometry.width).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.scrollTop).toBe(0);
  const sidebar = await page.getByRole('complementary', { name: 'Creative workspace', exact: true }).boundingBox();
  expect(sidebar).not.toBeNull();
  expect(sidebar!.y + sidebar!.height).toBeCloseTo(geometry.viewportHeight, 0);
  await inViewport(page.locator('.app-shell-utilities').first(), page);
}
async function openReview(page: Page, state: string) {
  await page.goto('/design-review');
  await chooseOption(page, 'State', state);
  await expect(page.getByRole('combobox', { name: 'State', exact: true })).toHaveText(state);
}

for (const viewport of desktop) {
  test(`Image and Video keep shell, footer and recent results within ${viewport.width}×${viewport.height}`, async ({ page, context }) => {
    const mock = await mockStudio(context, manyJobs);
    mock.models.push({ ...catalog.models.find(model => model.mediaType === 'video') as GenerationModel, availability: 'migration_required' });
    await page.setViewportSize(viewport);
    for (const kind of ['image', 'video']) {
      await page.goto(`/create/${kind}`);
      await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
      await expect(page.locator('.studio-recents').getByRole('button')).toHaveCount(8);
      await fixedShell(page);
      await inViewport(page.locator('.studio-create-action'), page);
      await inViewport(page.locator('.studio-output'), page);
      await inViewport(page.locator('.studio-recents'), page);
      await inViewport(page.getByRole('button', { name: new RegExp(`^Generate ${kind}`) }), page);
      const canvas = page.locator('.studio-result-canvas');
      const before = await canvas.boundingBox();
      expect(before!.height).toBeGreaterThan(96);
      await page.locator('.studio-control-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
      const after = await canvas.boundingBox();
      expect(after!.y).toBeCloseTo(before!.y, 0);
      expect(after!.height).toBeCloseTo(before!.height, 0);
      await fixedShell(page);
      await inViewport(page.locator('.studio-create-action'), page);
    }
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });

  test(`long Video scrolls its controls while sidebar, result and Generate stay fixed at ${viewport.width}×${viewport.height}`, async ({ page, context }) => {
    const mock = await mockStudio(context);
    await page.setViewportSize(viewport);
    await openReview(page, 'Long video form');
    await expect(page.getByRole('button', { name: 'Model Video layout sample', exact: true })).toBeVisible();
    const scroll = page.locator('.studio-control-scroll');
    const before = await page.locator('.studio-empty-canvas').boundingBox();
    const footerBefore = await page.locator('.studio-create-action').boundingBox();
    await fixedShell(page);
    expect(await scroll.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(100);
    const scrollBox = await scroll.boundingBox();
    await page.mouse.move(scrollBox!.x + scrollBox!.width / 2, scrollBox!.y + scrollBox!.height / 2);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    for (const fraction of [0.5, 1]) {
      await scroll.evaluate((element, ratio) => { element.scrollTop = (element.scrollHeight - element.clientHeight) * ratio; }, fraction);
      const after = await page.locator('.studio-empty-canvas').boundingBox();
      const footerAfter = await page.locator('.studio-create-action').boundingBox();
      expect(after!.y).toBeCloseTo(before!.y, 0);
      expect(after!.height).toBeCloseTo(before!.height, 0);
      expect(footerAfter!.y).toBeCloseTo(footerBefore!.y, 0);
      await fixedShell(page);
      await inViewport(page.getByRole('button', { name: 'Generate video', exact: true }), page);
    }
    await scroll.evaluate(element => { element.scrollTop = 0; });
    await page.getByRole('textbox', { name: 'Prompt', exact: true }).focus();
    const lastSetting = page.getByRole('combobox', { name: 'Audio', exact: true });
    for (let count = 0; count < 12 && !(await lastSetting.evaluate(element => element === document.activeElement)); count++) await page.keyboard.press('Tab');
    await expect(lastSetting).toBeFocused();
    const focusBox = await lastSetting.boundingBox();
    const regionBox = await scroll.boundingBox();
    expect(focusBox!.y).toBeGreaterThanOrEqual(regionBox!.y - 1);
    expect(focusBox!.y + focusBox!.height).toBeLessThanOrEqual(regionBox!.y + regionBox!.height + 1);
    expect(focusBox!.y + focusBox!.height).toBeLessThanOrEqual(footerBefore!.y + 1);
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageUp');
    await inViewport(page.getByRole('button', { name: 'Generate video', exact: true }), page);
    await fixedShell(page);
    if (viewport.width === 1366) expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    expect(mock.quotes).toHaveLength(0);
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
}

test('30 Assets scroll inside the workspace while sidebar remains at viewport bottom', async ({ page, context }) => {
  const mock = await mockStudio(context, manyJobs);
  await page.setViewportSize(desktop[0]);
  await page.goto('/library');
  const cards = page.getByRole('button', { name: /^Open .* (Completed|Failed),/ });
  await expect(cards).toHaveCount(30);
  const content = page.locator('.library-content-scroll');
  expect(await content.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(100);
  await fixedShell(page);
  const sidebarBefore = await page.locator('.app-shell-sidebar').boundingBox();
  await cards.last().focus();
  await expect(cards.last()).toBeFocused();
  await inViewport(cards.last(), page);
  expect(await content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  const sidebarAfter = await page.locator('.app-shell-sidebar').boundingBox();
  expect(sidebarAfter).toEqual(sidebarBefore);
  await fixedShell(page);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

for (const viewport of mobile) {
  test(`long Video keeps a natural document flow and reachable footer at ${viewport.width}×${viewport.height}`, async ({ page, context }) => {
    const mock = await mockStudio(context);
    await page.setViewportSize(viewport);
    await openReview(page, 'Long video form');
    const geometry = await documentGeometry(page);
    expect(geometry.height).toBeGreaterThan(viewport.height);
    expect(geometry.width).toBeLessThanOrEqual(viewport.width + 1);
    const controls = page.locator('.studio-control-scroll');
    expect(await controls.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1);
    const generate = page.getByRole('button', { name: 'Generate video', exact: true });
    await generate.scrollIntoViewIfNeeded();
    await inViewport(generate, page);
    expect((await documentGeometry(page)).scrollTop).toBeGreaterThan(0);
    await page.locator('.studio-output').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'Your next idea starts here.', exact: true })).toBeVisible();
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
}

test('200% browser zoom layout equivalent leaves long form settings and Generate operable', async ({ browser, baseURL }) => {
  // A 768×1024 physical viewport at 200% has 384×512 CSS pixels. This tests
  // browser-zoom reflow and pointer geometry, not CSS zoom or text-only resizing.
  const context = await browser.newContext({ baseURL, viewport: { width: 384, height: 512 }, deviceScaleFactor: 2 });
  const mock = await mockStudio(context);
  const page = await context.newPage();
  await openReview(page, 'Long video form');
  const prompt = page.getByRole('textbox', { name: 'Prompt', exact: true });
  await prompt.fill('A keyboard-accessible scene at two hundred percent.');
  await chooseOption(page, 'Audio', 'Disabled');
  const generate = page.getByRole('button', { name: 'Generate video', exact: true });
  await generate.scrollIntoViewIfNeeded();
  await inViewport(generate, page);
  await expect(generate).toBeDisabled();
  expect(await prompt.inputValue()).toContain('two hundred percent');
  expect((await documentGeometry(page)).width).toBeLessThanOrEqual(385);
  expect(await page.evaluate(() => devicePixelRatio)).toBe(2);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
  await context.close();
});
