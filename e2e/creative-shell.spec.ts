import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { jobs, mockStudio } from './studio-mocks';

async function openNavigation(page: Page) {
  const opener = page.getByRole('button', { name: 'Open workspace navigation', exact: true });
  await opener.click();
  const drawer = page.getByRole('dialog', { name: 'Workspace navigation', exact: true });
  await expect(drawer).toBeVisible();
  return { drawer, opener };
}

async function expectNoOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const width of [320, 390, 768]) {
  test(`workspace drawer supports focus, routes and theme persistence at ${width}px`, async ({ page, context }) => {
    const mock = await mockStudio(context, jobs);
    mock.models.push({ ...mock.models[0], id: 'test-video', displayName: 'Migration video', mediaType: 'video', providerModel: 'mock/video', availability: 'migration_required', capabilities: ['textToVideo'], inputs: [], fields: [] });
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/create/image');
    await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
    await expectNoOverflow(page);

    const { drawer, opener } = await openNavigation(page);
    await expect(drawer.getByRole('link', { name: 'Image', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(drawer.getByText('80 credits', { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    const bounds = await drawer.boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Shift+Tab');
    expect(await drawer.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(opener).toBeFocused();

    await opener.click();
    await drawer.getByRole('button', { name: 'Appearance', exact: true }).click();
    await drawer.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(drawer).toBeVisible();
    const appearance = drawer.getByRole('button', { name: 'Appearance', exact: true });
    await appearance.click();
    await page.keyboard.press('Escape');
    await expect(drawer.getByRole('menu')).toHaveCount(0);
    await expect(drawer).toBeVisible();
    await expect(appearance).toBeFocused();

    await drawer.getByRole('link', { name: 'Video', exact: true }).click();
    await expect(page).toHaveURL(/\/create\/video$/);
    await expect(drawer).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Model Migration video', exact: true })).toBeVisible();
    await expect(page.getByText(/Generation is unavailable for this model|This model needs an update before generation can be enabled/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Generate/, exact: false })).toBeDisabled();
    await expectNoOverflow(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await openNavigation(page);
    await drawer.getByRole('link', { name: 'Image', exact: true }).click();
    await expect(page).toHaveURL(/\/create\/image$/);
    await openNavigation(page);
    await drawer.getByRole('link', { name: 'Assets', exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await openNavigation(page);
    await drawer.getByRole('link', { name: 'Account', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
    await expectNoOverflow(page);
    expect(mock.quotes).toHaveLength(0);
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
}

for (const width of [1366, 1440, 1920]) {
  test(`desktop workspace has one labeled sidebar and contained content at ${width}px`, async ({ page, context }) => {
    const mock = await mockStudio(context, jobs);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/create/image');
    const navigation = page.getByRole('navigation', { name: 'Workspace navigation', exact: true });
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Image', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Open workspace navigation', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
    await expect(page.getByText('80 credits', { exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await navigation.getByRole('link', { name: 'Assets', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Assets', exact: true })).toHaveAttribute('aria-current', 'page');
    await expectNoOverflow(page);
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
}

test('mobile drawer has no axe violations and releases focus when resized to desktop', async ({ page, context }) => {
  await mockStudio(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/create/image');
  const { drawer } = await openNavigation(page);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Workspace navigation', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Assets', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
});
