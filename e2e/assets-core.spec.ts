import { expect, test } from '@playwright/test';
import { jobs, mockStudio } from './studio-mocks';
import { chooseOption } from './select-helpers';

test('Assets exposes only loaded media and filters confirmed refunds independently from failure', async ({ page, context }) => {
  const mock = await mockStudio(context, [...jobs, {
    ...jobs[2], id: 'owned-video-failed', mediaType: 'video', displayName: 'Video study', prompt: 'A camera move around a bottle',
  }]);
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
  const media = page.getByRole('group', { name: 'Filter assets by media' });
  await expect(media.getByRole('button', { name: 'Videos', exact: true })).toBeVisible();
  await media.getByRole('button', { name: 'Videos', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Open .* (Completed|Failed),/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Open Video study, Failed/ })).toBeVisible();
  await chooseOption(page, 'Status', 'Refunded');
  await expect(page.getByRole('button', { name: /^Open .* (Completed|Failed),/ })).toHaveCount(1);
  await media.getByRole('button', { name: 'Images', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Open .* (Completed|Failed),/ })).toHaveCount(1);
  await page.getByRole('button', { name: /^Open Studio Image, Failed/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Your creation', exact: true });
  await expect(dialog.getByText('The server confirmed your credits were returned.', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Reuse prompt & settings', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('button', { name: 'Use as reference', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Download', exact: true })).toHaveCount(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('Assets keeps last-30 scope and hides absent media controls', async ({ page, context }) => {
  const history = Array.from({ length: 31 }, (_, index) => ({ ...jobs[0], id: `owned-${index}`, prompt: index === 30 ? 'Outside loaded history' : `Loaded image ${index}` }));
  const mock = await mockStudio(context, history);
  await page.goto('/library');
  await expect(page.getByRole('button', { name: /^Open .* (Completed|Failed),/ })).toHaveCount(30);
  await expect(page.getByRole('group', { name: 'Filter assets by media' }).getByRole('button', { name: 'Videos', exact: true })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search loaded creations' }).fill('Outside loaded history');
  await expect(page.getByRole('heading', { name: 'No creations match these filters.' })).toBeVisible();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('selecting a recent asset updates the main workspace without leaving Image', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/create/image');
  const selected = page.getByRole('region', { name: 'Creation result' });
  await expect(selected.getByRole('heading', { name: 'Studio Image', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open Prompt Image, Completed, Oct 4, 2026', exact: true }).click();
  await expect(selected.getByRole('heading', { name: 'Prompt Image', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByRole('button', { name: 'Open Prompt Image, Completed, Oct 4, 2026', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(mock.submissions).toHaveLength(0);
  expect(mock.downloads).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('design review shows Video migration and Assets from local samples without API work', async ({ page, context }) => {
  const mock = await mockStudio(context);
  const apiRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  await page.goto('/design-review');
  await chooseOption(page, 'Surface', 'Video');
  await expect(page.getByRole('button', { name: 'Model Fast Video', exact: true })).toContainText('Model update required');
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
  await chooseOption(page, 'Surface', 'Assets');
  await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
  await page.getByRole('group', { name: 'Filter assets by media' }).getByRole('button', { name: 'Videos', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Open Fast Video, Failed/ })).toBeVisible();
  expect(apiRequests).toEqual([]);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

