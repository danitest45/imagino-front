import { expect, test, type Page } from '@playwright/test';
import { jobs, mockStudio, referencePath, TEST_TOKEN } from './studio-mocks';

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
  await page.getByRole('combobox', { name: 'Aspect ratio' }).selectOption('16:9');
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
  await page.getByRole('combobox', { name: 'Aspect ratio' }).selectOption('4:3');
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
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveValue('4:3');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Where do you want to take it?' })).toHaveValue('Keep this creative direction');

  await page.getByRole('button', { name: 'Model Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose your model', exact: true }).getByRole('button', { name: /^Prompt Image/ }).click();
  await confirmation.getByRole('button', { name: 'Change model', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Model Prompt Image', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue('Keep this creative direction');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveValue('1:1');
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
  await page.getByRole('combobox', { name: 'Model', exact: true }).selectOption('test-prompt');
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAccessibleName(/Prompt Image/);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('Failed');
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
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Reuse restores prompt and supported settings but does not invent original references', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/library');
  await page.getByRole('button', { name: 'Open Studio Image, Completed, Oct 5, 2026', exact: true }).click();
  await page.getByRole('dialog', { name: 'Your creation', exact: true }).getByRole('button', { name: 'Reuse prompt & settings', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue(jobs[0].prompt);
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveValue('4:3');
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
  await page.getByRole('combobox', { name: 'Aspect ratio' }).selectOption('16:9');
  await page.getByRole('region', { name: 'Creation result' }).getByRole('button', { name: 'Use as reference', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Create image controls' }).getByRole('alert')).toContainText('Reference could not be prepared.');
  await expect(page.getByRole('textbox', { name: 'Describe your idea' })).toHaveValue('Keep this unsent draft');
  await expect(page.getByRole('combobox', { name: 'Aspect ratio' })).toHaveValue('16:9');
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
