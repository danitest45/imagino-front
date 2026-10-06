import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { jobs, mockStudio, referencePath, TEST_TOKEN } from './studio-mocks';
import { chooseOption } from './select-helpers';

async function captureMockEvidence(page: Page, name: string) {
  const directory = path.resolve(process.env.PLAYWRIGHT_EVIDENCE_DIR || 'evidence/rebrand');
  await mkdir(directory, { recursive: true });
  // This label belongs to test evidence, never to the shipped interface.
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.id = 'http-mock-evidence-label';
    banner.textContent = 'HTTP-mocked browser test — local fixture · no real account or generation';
    banner.style.cssText = 'position:relative;z-index:9999;padding:10px 16px;background:#202421;color:#fff;font:14px/1.4 sans-serif;text-align:center;';
    document.body.prepend(banner);
  });
  try { await page.screenshot({ path: path.join(directory, name), fullPage: true }); }
  finally { await page.evaluate(() => document.getElementById('http-mock-evidence-label')?.remove()); }
}

async function openStudio(page: Page) {
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();
}

test('current quote is invalidated by prompt, settings and reference changes', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await openStudio(page);
  const prompt = page.getByRole('textbox', { name: 'Describe your idea' });
  await prompt.fill('A bottle in soft light');
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeEnabled();

  mock.holdQuotes = true;
  mock.quoteCredits = 21;
  await prompt.fill('A bottle in warm afternoon light');
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.quotes.at(-1)?.body.prompt).toBe('A bottle in warm afternoon light');
  await mock.releaseQuotes();
  await expect(page.getByRole('button', { name: 'Create image · 21 credits', exact: true })).toBeEnabled();

  mock.quoteCredits = 23;
  await chooseOption(page, 'Aspect ratio', '16:9');
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.quotes.at(-1)?.body.settings.aspectRatio).toBe('16:9');
  await mock.releaseQuotes();
  await expect(page.getByRole('button', { name: 'Create image · 23 credits', exact: true })).toBeEnabled();

  await page.getByRole('button', { name: 'With a reference', exact: true }).click();
  mock.quoteCredits = 25;
  await page.getByLabel('Upload Reference image', { exact: true }).setInputFiles(referencePath);
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.quotes.at(-1)?.body.inputs).toHaveLength(1);
  expect(mock.quotes.at(-1)?.body.inputs[0].data).toMatch(/^data:image\/png;base64,/);
  await mock.releaseQuotes();
  await expect(page.getByRole('button', { name: 'Create image · 25 credits', exact: true })).toBeEnabled();

  await page.getByRole('button', { name: 'Remove Reference image 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.quotes.at(-1)?.body.inputs).toEqual([]);
  await mock.releaseQuotes();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('upload rejects unsupported files and prepares a valid public local reference', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await openStudio(page);
  await page.getByRole('button', { name: 'With a reference', exact: true }).click();
  const upload = page.getByLabel('Upload Reference image', { exact: true });
  await upload.setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('No image content') });
  await expect(page.getByRole('form', { name: 'Create image controls' }).getByRole('alert')).toContainText('Use a PNG, JPEG or WebP image up to 10 MB.');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toHaveCount(0);
  expect(mock.quotes).toHaveLength(0);
  await upload.setInputFiles(referencePath);
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Create image controls' }).getByRole('alert')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Where do you want to take it?' }).fill('Explore a calm green background');
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeEnabled();
  expect(mock.quotes.at(-1)?.body.inputs[0].role).toBe('reference');
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('model change preserves references and settings until the user confirms', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await openStudio(page);
  await page.getByRole('textbox', { name: 'Describe your idea' }).fill('Keep this creative direction');
  await chooseOption(page, 'Aspect ratio', '4:3');
  await page.getByRole('button', { name: 'With a reference', exact: true }).click();
  await page.getByLabel('Upload Reference image', { exact: true }).setInputFiles(referencePath);
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Model Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose your model', exact: true }).getByRole('button', { name: /^Prompt Image/ }).click();
  const confirmation = page.getByRole('dialog', { name: 'Change model?', exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Keep current model', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveText('4:3');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Where do you want to take it?' })).toHaveValue('Keep this creative direction');

  await page.getByRole('button', { name: 'Model Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose your model', exact: true }).getByRole('button', { name: /^Prompt Image/ }).click();
  await confirmation.getByRole('button', { name: 'Change model', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Model Prompt Image', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue('Keep this creative direction');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveText('1:1');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'With a reference', exact: true })).toBeDisabled();
  await expect.poll(() => mock.quotes.at(-1)?.body.modelId).toBe('test-prompt');
  expect(mock.quotes.at(-1)?.body.inputs).toEqual([]);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('duplicate click is blocked and ambiguous submission replays the exact body and key', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.failedSubmissions = 1;
  mock.holdSubmissions = true;
  await openStudio(page);
  await page.getByRole('textbox', { name: 'Describe your idea' }).fill('A single deliberate creation');
  const create = page.getByRole('button', { name: 'Create image · 15 credits', exact: true });
  await expect(create).toBeEnabled();
  await create.dblclick();
  await expect(page.getByRole('button', { name: 'Submitting…', exact: true })).toBeDisabled();
  await expect.poll(() => mock.submissions.length).toBe(1);
  await mock.releaseSubmissions();
  await expect(page.getByRole('form', { name: 'Create image controls' }).getByRole('alert')).toContainText('submission outcome is unknown');
  await expect(page.getByRole('button', { name: 'Check submission', exact: true })).toBeEnabled();
  const original = mock.submissions[0];
  expect(original.key).toMatch(/^[0-9a-f-]{36}$/);
  expect(original.authorization).toBe(`Bearer ${TEST_TOKEN}`);
  expect(original.body.quoteId).toBe(mock.quotes.length ? `quote-${mock.quotes.length}` : 'missing');
  mock.holdSubmissions = false;
  await page.getByRole('button', { name: 'Check submission', exact: true }).click();
  await expect.poll(() => mock.submissions.length).toBe(2);
  expect(mock.submissions[1].rawBody).toBe(original.rawBody);
  expect(mock.submissions[1].key).toBe(original.key);
  await expect(page.getByRole('region', { name: 'Creation result' })).toContainText('Reserved');
  expect(mock.jobs.filter(job => job.id === 'owned-created')).toHaveLength(1);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Library filters loaded jobs and restores keyboard focus after detail Escape', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/library');
  const cards = page.getByRole('button', { name: /^Open .* (Completed|Failed),/ });
  await expect(cards).toHaveCount(3);
  await expect(page.getByText('Up to 30 recent jobs · search and filters apply to loaded results.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search loaded creations' }).fill('bottle');
  await expect(cards).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search loaded creations' }).fill('');
  await chooseOption(page, 'Model', 'Prompt Image');
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAccessibleName(/Prompt Image/);
  await chooseOption(page, 'Status', 'Failed');
  await expect(page.getByRole('heading', { name: 'No creations match these filters.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(cards).toHaveCount(3);
  const opener = page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Your creation', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(jobs[0].prompt, { exact: true })).toBeVisible();
  await expect(dialog.getByText('Charged', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Use as reference downloads the owned result and prepares a new input without generating', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true }).click();
  await captureMockEvidence(page, 'http-mock-reference-before.png');
  await page.getByRole('dialog', { name: 'Your creation', exact: true }).getByRole('button', { name: 'Use as reference', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByText('Source: Studio Image · selected creation', { exact: true })).toBeVisible();
  expect(mock.downloads).toHaveLength(1);
  expect(mock.downloads[0].id).toBe('owned-bottle');
  expect(mock.downloads[0].authorization).toBe(`Bearer ${TEST_TOKEN}`);
  expect(new URL(mock.downloads[0].url).search).toBe('');
  expect(mock.submissions).toHaveLength(0);
  await page.getByRole('textbox', { name: 'Where do you want to take it?' }).fill('Explore a warmer variation');
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeEnabled();
  expect(mock.quotes.at(-1)?.body.inputs).toHaveLength(1);
  expect(mock.submissions).toHaveLength(0);
  await captureMockEvidence(page, 'http-mock-reference-prepared.png');
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Reuse restores prompt and supported settings but does not invent original references', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true }).click();
  await page.getByRole('dialog', { name: 'Your creation', exact: true }).getByRole('button', { name: 'Reuse prompt & settings', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue(jobs[0].prompt);
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveText('4:3');
  await expect(page.getByText('Prompt and supported settings restored. Original reference files are not included.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeEnabled();
  expect(mock.quotes.at(-1)?.body.inputs).toEqual([]);
  expect(mock.downloads).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('failed reference download preserves the current prompt and settings', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  mock.failDownloads = true;
  await openStudio(page);
  await page.getByRole('textbox', { name: 'Describe your idea' }).fill('Keep this unsent draft');
  await chooseOption(page, 'Aspect ratio', '16:9');
  await page.getByRole('region', { name: 'Creation result' }).getByRole('button', { name: 'Use as reference', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Create image controls' }).getByRole('alert')).toContainText('Reference could not be prepared.');
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue('Keep this unsent draft');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveText('16:9');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toHaveCount(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Library shows distinct empty, unavailable and signed-out states', async ({ page, context }) => {
  const mock = await mockStudio(context);
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'A place for your possibilities.' })).toBeVisible();
  mock.failHistory = true;
  await page.reload();
  await expect(page.getByRole('alert').filter({ hasText: 'Your Library could not refresh.' })).toContainText('Your Library could not refresh.');
  await expect(page.getByRole('heading', { name: 'A place for your possibilities.' })).toHaveCount(0);
  mock.authenticated = false;
  await page.reload();
  await expect(page.getByRole('link', { name: 'Sign in to view Library', exact: true })).toBeVisible();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('logout clears private Library immediately even when the logout request fails', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  mock.holdLogout = true;
  await page.goto('/library');
  await expect(page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign in to view Library', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Open .* (Completed|Failed),/ })).toHaveCount(0);
  await expect.poll(() => mock.pendingLogout.length).toBe(1);
  const historyBefore = mock.historyRequests;
  await mock.releaseLogout();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/library');
  await expect(page.getByRole('link', { name: 'Sign in to view Library', exact: true })).toBeVisible();
  expect(mock.historyRequests).toBe(historyBefore);
  expect(mock.logoutRequests).toBe(1);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('expired quote cannot submit while its replacement is pending', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.quoteExpiresInMs = 900;
  await openStudio(page);
  await page.getByRole('textbox', { name: 'Describe your idea' }).fill('A scene with a current quote');
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeEnabled();
  mock.holdQuotes = true;
  mock.quoteCredits = 18;
  await expect(page.getByText('The previous quote expired. Calculating the current cost.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.quotes).toHaveLength(2);
  mock.quoteExpiresInMs = 60_000;
  await mock.releaseQuotes();
  await expect(page.getByRole('button', { name: 'Create image · 18 credits', exact: true })).toBeEnabled();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('deployment-pending model cannot quote or submit for an authenticated account', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.models[0].availability = 'deployment_pending';
  await openStudio(page);
  await page.getByRole('textbox', { name: 'Describe your idea' }).fill('This idea must remain an unsent draft');
  await expect(page.getByText('Generation unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('Creation is currently unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create image', exact: true })).toBeDisabled();
  await chooseOption(page, 'Aspect ratio', '16:9');
  // Observe beyond the 450 ms quote debounce to catch an accidentally queued request.
  await page.waitForTimeout(700);
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('design review sends no account or generation HTTP and disables sample actions', async ({ page, context }) => {
  const mock = await mockStudio(context);
  const apiRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) apiRequests.push(`${request.method()} ${url.pathname}`);
  });
  await page.goto('/design-review');
  await expect(page.getByText('Design preview — sample data', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create image · 15 credits', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Use as reference', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reuse prompt & settings', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
  await chooseOption(page, 'State', 'Reference');
  await expect(page.getByLabel('Upload Reference images', { exact: true })).toBeDisabled();
  await chooseOption(page, 'State', 'Queued');
  await expect(page.getByRole('button', { name: 'Cancel job', exact: true })).toBeDisabled();
  await chooseOption(page, 'Surface', 'Library');
  await page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true }).click();
  const detail = page.getByRole('dialog', { name: 'Your creation', exact: true });
  await expect(detail.getByRole('button', { name: 'Use as reference', exact: true })).toBeDisabled();
  await expect(detail.getByRole('button', { name: 'Download', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await chooseOption(page, 'Surface', 'Account');
  await expect(page.getByRole('heading', { name: 'Sample account', exact: true })).toBeVisible();
  await chooseOption(page, 'Surface', 'Costs');
  await expect(page.getByRole('heading', { name: 'Explore now. Purchases are unavailable.', exact: true })).toBeVisible();
  expect(apiRequests).toEqual([]);
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.downloads).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('mobile navigation supports keyboard activation, Escape focus return and route change at 320 px', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.authenticated = false;
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open navigation', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await expect(menu).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'How it works', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Models', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Costs', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Know what it costs.');
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});
