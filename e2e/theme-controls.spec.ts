import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseOption } from './select-helpers';
import { jobs, mockStudio, referencePath } from './studio-mocks';

type Preference = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';
const names = { system: 'System', light: 'Light', dark: 'Dark' } as const;

async function appearance(page: Page, preference: Preference) {
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page.getByRole('menuitemradio', { name: names[preference], exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', preference);
}

async function expectTheme(page: Page, preference: Preference, resolved: Theme) {
  await expect(page.locator('html')).toHaveAttribute('data-theme-preference', preference);
  await expect(page.locator('html')).toHaveAttribute('data-theme', resolved);
  await expect(page.locator('html')).toHaveCSS('color-scheme', resolved);
}

async function expectPreferenceMenu(page: Page, preference: Preference) {
  const trigger = page.getByRole('button', { name: 'Appearance', exact: true });
  await trigger.click();
  for (const value of ['system', 'light', 'dark'] as const) {
    await expect(page.getByRole('menuitemradio', { name: names[value], exact: true }))
      .toHaveAttribute('aria-checked', String(value === preference));
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
}

async function reviewComponents(page: Page) {
  await page.goto('/design-review');
  await chooseOption(page, 'Surface', 'Components');
  await expect(page.getByRole('combobox', { name: 'Example select', exact: true })).toBeVisible();
}

async function readyStudio(page: Page) {
  await page.goto('/create/image');
  // Auth initializes before the token-keyed workspace is stable for editing.
  await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
}

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrating|did not match|server rendered/i.test(message.text())) errors.push(message.text());
  });
  return errors;
}

for (const system of ['light', 'dark'] as const) {
  test(`first visit resolves System ${system} before the first rendered frame, without hydration errors`, async ({ page, context }) => {
    const mock = await mockStudio(context);
    const errors = collectRuntimeErrors(page);
    await page.emulateMedia({ colorScheme: system });
    await context.addInitScript(() => {
      const record = () => {
        if (!document.body?.children.length) { requestAnimationFrame(record); return; }
        (window as Window & { __firstThemeFrame?: unknown }).__firstThemeFrame = {
          preference: document.documentElement.getAttribute('data-theme-preference'),
          resolved: document.documentElement.getAttribute('data-theme'),
          scheme: getComputedStyle(document.documentElement).colorScheme,
          bodyVisibility: getComputedStyle(document.body).visibility,
          bodyOpacity: getComputedStyle(document.body).opacity,
        };
      };
      requestAnimationFrame(record);
    });
    await page.goto('/');
    await expectTheme(page, 'system', system);
    await expect.poll(() => page.evaluate(() => (window as Window & { __firstThemeFrame?: unknown }).__firstThemeFrame)).toEqual({
      preference: 'system', resolved: system, scheme: system, bodyVisibility: 'visible', bodyOpacity: '1',
    });
    await expectPreferenceMenu(page, 'system');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
}

test('System follows OS changes; manual overrides remain selected until returning to System', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/design-review');
  await expectTheme(page, 'system', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'system', 'dark');
  await expectPreferenceMenu(page, 'system');
  await appearance(page, 'light');
  await expectTheme(page, 'light', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'light', 'light');
  await page.emulateMedia({ colorScheme: 'light' });
  await appearance(page, 'dark');
  await expectTheme(page, 'dark', 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expectTheme(page, 'dark', 'dark');
  await appearance(page, 'system');
  await expectTheme(page, 'system', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'system', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('imagino-theme'))).toBe('system');
  expect(mock.historyRequests).toBe(0);
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('preference persists through client navigation, reload, logout and same-origin tabs', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/library');
  await appearance(page, 'dark');
  await page.getByRole('navigation', { name: 'Workspace navigation', exact: true }).getByRole('link', { name: 'Image', exact: true }).click();
  await expectTheme(page, 'dark', 'dark');
  await page.reload();
  await expectTheme(page, 'dark', 'dark');
  const other = await context.newPage();
  await other.emulateMedia({ colorScheme: 'light' });
  await other.goto('/design-review');
  await expectTheme(other, 'dark', 'dark');
  await appearance(other, 'light');
  await expectTheme(page, 'light', 'light');
  await appearance(page, 'dark');
  await expectTheme(other, 'dark', 'dark');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expectTheme(page, 'dark', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('imagino-theme'))).toBe('dark');
  await page.reload();
  await expectTheme(page, 'dark', 'dark');
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
  await other.close();
});

test('invalid storage and cross-tab removal safely return to System without errors', async ({ page, context }) => {
  await mockStudio(context);
  const errors = collectRuntimeErrors(page);
  await context.addInitScript(() => localStorage.setItem('imagino-theme', 'unexpected-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/design-review');
  await expectTheme(page, 'system', 'dark');
  await expectPreferenceMenu(page, 'system');
  await appearance(page, 'light');
  const other = await context.newPage();
  await other.goto('/design-review');
  // These writes cause real browser storage events in the first tab.
  await other.evaluate(() => localStorage.setItem('imagino-theme', 'invalid-again'));
  await expectTheme(page, 'system', 'dark');
  await appearance(page, 'light');
  await other.evaluate(() => localStorage.removeItem('imagino-theme'));
  await expectTheme(page, 'system', 'dark');
  expect(errors).toEqual([]);
  await other.close();
});

test('unavailable storage retains manual preference in memory and keeps navigation usable', async ({ page, context }) => {
  const mock = await mockStudio(context);
  const errors = collectRuntimeErrors(page);
  await context.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, { configurable: true, value: () => { throw new DOMException('Storage denied by test', 'SecurityError'); } });
    }
  });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expectTheme(page, 'system', 'light');
  await appearance(page, 'dark');
  await expectTheme(page, 'dark', 'dark');
  await page.getByRole('link', { name: 'Costs', exact: true }).first().click();
  await expectTheme(page, 'dark', 'dark');
  await page.emulateMedia({ colorScheme: 'dark' });
  await appearance(page, 'system');
  await expectTheme(page, 'system', 'dark');
  expect(errors).toEqual([]);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('stored dark preference is applied on the first rendered reload frame over a light system', async ({ page, context }) => {
  await mockStudio(context);
  await page.emulateMedia({ colorScheme: 'light' });
  await context.addInitScript(() => {
    localStorage.setItem('imagino-theme', 'dark');
    requestAnimationFrame(() => {
      (window as Window & { __reloadTheme?: string | null }).__reloadTheme = document.documentElement.getAttribute('data-theme');
    });
  });
  await page.goto('/');
  await expectTheme(page, 'dark', 'dark');
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as Window & { __reloadTheme?: string | null }).__reloadTheme)).toBe('dark');
  await expectTheme(page, 'dark', 'dark');
});

test('theme changes preserve prompt, references, quote, selected result and scroll without creation or requote', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.emulateMedia({ colorScheme: 'light' });
  await readyStudio(page);
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Keep this unsent working draft');
  await chooseOption(page, 'Aspect ratio', '16:9');
  await page.getByLabel('Upload Reference image', { exact: true }).setInputFiles(referencePath);
  const reference = page.getByRole('img', { name: 'Reference image 1', exact: true });
  await expect(reference).toBeVisible();
  const create = page.getByRole('button', { name: 'Generate image · 15 credits', exact: true });
  await expect(create).toBeEnabled();
  const source = await reference.getAttribute('src');
  const quoted = mock.quotes.length;
  const body = JSON.stringify(mock.quotes.at(-1)?.body);
  await page.evaluate(() => {
    (window as Window & { __originalPrompt?: Element | null }).__originalPrompt = document.getElementById('generation-prompt');
    window.scrollTo({ top: 250, behavior: 'instant' });
  });
  const scroll = await page.evaluate(() => scrollY);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'system', 'dark');
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
  expect(await page.evaluate(() => (window as Window & { __originalPrompt?: Element | null }).__originalPrompt === document.getElementById('generation-prompt'))).toBe(true);
  await appearance(page, 'light');
  await expect(page.getByRole('textbox', { name: 'Prompt' })).toHaveValue('Keep this unsent working draft');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio', exact: true })).toHaveText('16:9');
  await expect(reference).toHaveAttribute('src', source!);
  await expect(reference).toHaveCSS('filter', 'none');
  await expect(reference).toHaveCSS('opacity', '1');
  await expect(page.getByRole('region', { name: 'Creation result' })).toContainText('Studio Image');
  await expect(create).toBeEnabled();
  await page.waitForTimeout(550); // Observe beyond the quote debounce.
  expect(mock.quotes).toHaveLength(quoted);
  expect(JSON.stringify(mock.quotes.at(-1)?.body)).toBe(body);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('controlled numeric and enum selects preserve request types and never submit their form', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.models[0].fields.push({ key: 'steps', label: 'Steps', type: 'integer', defaultValue: '4', options: ['4', '8'] });
  await readyStudio(page);
  await page.getByRole('textbox', { name: 'Prompt' }).fill('Check controlled schema settings');
  await expect(page.getByRole('button', { name: 'Generate image · 15 credits', exact: true })).toBeEnabled();
  await chooseOption(page, 'Steps', '8');
  await chooseOption(page, 'Aspect ratio', '16:9');
  await expect.poll(() => mock.quotes.at(-1)?.body.settings).toEqual({ aspectRatio: '16:9', resolution: '1K', steps: 8 });
  await page.getByRole('combobox', { name: 'Resolution', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox', { name: 'Resolution', exact: true })).toHaveText('2K');
  await expect.poll(() => mock.quotes.at(-1)?.body.settings.resolution).toBe('2K');
  await appearance(page, 'dark');
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('select placeholder, disabled item, arrows, Home/End, typeahead and Escape are operable', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await reviewComponents(page);
  const trigger = page.getByRole('combobox', { name: 'Example select', exact: true, includeHidden: true });
  await expect(trigger).toHaveText('Choose an option');
  await expect(page.getByRole('combobox', { name: 'Empty options', exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Disabled select', exact: true })).toBeDisabled();
  await trigger.focus();
  await page.keyboard.press('Space');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option', { name: 'Unavailable model', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'Fast Image', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: 'Studio Image', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Fast Image', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText('Fast Image');
  await expect(trigger).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('s');
  await expect(page.getByRole('option', { name: 'Studio Image', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveText('Studio Image');
  await trigger.click();
  await expect(page.getByRole('option', { name: 'Studio Image', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await chooseOption(page, 'All options', 'Fast Image');
  await chooseOption(page, 'All options', 'All models');
  await page.getByRole('combobox', { name: 'All options', exact: true }).click();
  await expect(page.getByRole('option', { name: 'All models', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('long options scroll, stay readable and fit the mobile viewport near its edge', async ({ page, context }) => {
  await mockStudio(context);
  await page.setViewportSize({ width: 320, height: 640 });
  await reviewComponents(page);
  const trigger = page.getByRole('combobox', { name: 'Long options', exact: true });
  await trigger.click();
  const last = page.getByRole('option', { name: 'Option 24', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeVisible();
  await last.click();
  await expect(trigger).toHaveText('Option 24');
  await trigger.click();
  const longLabel = 'A deliberately long option label that remains readable on a narrow screen without hiding its meaning';
  const long = page.getByRole('option', { name: longLabel, exact: true });
  await long.scrollIntoViewIfNeeded();
  await expect(long).toBeVisible();
  expect(await long.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await long.click();
  await expect(trigger).toHaveText(longLabel);
  const edge = page.getByRole('combobox', { name: 'Edge select', exact: true });
  await edge.scrollIntoViewIfNeeded();
  await edge.click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const box = await list.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(edge).toBeFocused();
});

test('dialog select is in the top layer and Escape closes the popup before the parent', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await reviewComponents(page);
  const opener = page.getByRole('button', { name: 'Open sample dialog', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'A clear next step', exact: true });
  const trigger = dialog.getByRole('combobox', { name: 'Dialog select', exact: true });
  await trigger.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.getByRole('option', { name: 'Fast Image', exact: true }).click();
  await expect(trigger).toHaveText('Fast Image');
  await expect(dialog).toBeVisible();
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();
  const dialogAppearance = dialog.getByRole('button', { name: 'Appearance', exact: true });
  await dialogAppearance.click();
  await expect(dialog.getByRole('menu', { name: 'Appearance', exact: true })).toBeVisible();
  await dialog.getByRole('menuitemradio', { name: 'Dark', exact: true }).click();
  await expectTheme(page, 'dark', 'dark');
  await expect(dialog).toBeVisible();
  await dialogAppearance.click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('menu')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(dialogAppearance).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('changing System theme while a popup is open preserves focus, selection and popup validity', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await page.emulateMedia({ colorScheme: 'light' });
  await reviewComponents(page);
  await chooseOption(page, 'Example select', 'Fast Image');
  const trigger = page.getByRole('combobox', { name: 'Example select', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const selected = page.getByRole('option', { name: 'Fast Image', exact: true });
  await expect(selected).toBeFocused();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expectTheme(page, 'system', 'dark');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveText('Fast Image');
  await expect(trigger).toBeFocused();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

for (const theme of ['light', 'dark'] as const) {
  test(`Appearance and Select open popups have no axe violations in ${theme}`, async ({ page, context }) => {
    await mockStudio(context);
    await reviewComponents(page);
    await appearance(page, theme);
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('combobox', { name: 'Example select', exact: true }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
  });
}

test.describe('touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('touch can open, choose and dismiss selectors and Appearance without generation', async ({ page, context }) => {
    const mock = await mockStudio(context);
    await page.goto('/design-review');
    const surface = page.getByRole('combobox', { name: 'Surface', exact: true });
    await surface.tap();
    await page.getByRole('option', { name: 'Assets', exact: true }).tap();
    await expect(surface).toHaveText('Assets');
    await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
    await surface.tap();
    await page.keyboard.press('Escape');
    await expect(surface).toBeFocused();
    await page.getByRole('button', { name: 'Open workspace navigation', exact: true }).tap();
    await page.getByRole('dialog', { name: 'Workspace navigation', exact: true }).getByRole('button', { name: 'Appearance', exact: true }).tap();
    await page.getByRole('menuitemradio', { name: 'Dark', exact: true }).tap();
    await expectTheme(page, 'dark', 'dark');
    expect(mock.historyRequests).toBe(0);
    expect(mock.submissions).toHaveLength(0);
    expect(mock.unexpectedRequests).toEqual([]);
  });
});

test('without JavaScript the landing stays visible and follows a dark system via CSS', async ({ browser, baseURL }) => {
  const context: BrowserContext = await browser.newContext({ javaScriptEnabled: false, colorScheme: 'dark', baseURL });
  await mockStudio(context);
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const styles = await page.locator('body').evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, visibility: style.visibility, opacity: style.opacity };
  });
  expect(styles.visibility).toBe('visible');
  expect(styles.opacity).toBe('1');
  const channels = styles.background.match(/\d+/g)?.slice(0, 3).map(Number);
  expect(channels).toHaveLength(3);
  expect(Math.max(...channels!)).toBeLessThan(80);
  await context.close();
});
