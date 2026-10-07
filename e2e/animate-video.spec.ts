import { expect, test } from '@playwright/test';
import { jobs, mockStudio, referencePath } from './studio-mocks';
import { readFileSync } from 'node:fs';

test('Image to Animate prepares an authenticated first frame and waits for explicit Generate', async ({ page, context }) => {
  const mock = await mockStudio(context, [jobs[1], jobs[0], jobs[2]]);
  mock.models.push({ id: 'mock-fast-video', version: 'staging-v1', displayName: 'Fast Video (experimental)', category: 'Motion',
    description: 'Controlled video fixture', mediaType: 'video', providerModel: 'grok_imagine_1_5_lite', availability: 'ready', startingCredits: 54,
    capabilities: ['imageToVideo', 'firstFrame'], rules: [], inputs: [{ role: 'firstFrame', label: 'First frame', maxCount: 1, required: true, ownedAssetOnly: true }],
    fields: [{ key: 'duration', label: 'Duration (seconds)', type: 'integer', defaultValue: '5', options: ['5'] },
      { key: 'resolution', label: 'Resolution', type: 'enum', defaultValue: '720p', options: ['720p'] }] });
  mock.quoteCredits = 54;
  await page.goto('/library');
  await page.getByRole('button', { name: /^Open Studio Image, Completed/ }).click();
  await page.getByRole('dialog', { name: 'Your creation', exact: true }).getByRole('button', { name: 'Animate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Video studio', exact: true })).toBeVisible();
  await expect(page.getByText('First frame prepared.', { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Creation result' }).getByRole('heading', { name: 'Studio Image', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'First frame 1', exact: true })).toHaveAttribute('src', 'data:image/png;base64,' + readFileSync(referencePath).toString('base64'));
  expect(mock.downloads.some(value => value.id === 'owned-bottle' && value.authorization)).toBe(true);
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('A slow elegant push-in toward the blue bottle.');
  await expect(page.getByRole('button', { name: 'Generate video · 54 credits', exact: true })).toBeEnabled();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.quotes.at(-1)?.body.inputs[0].sourceAssetId).toBe('owned-bottle');
  expect(mock.quotes.at(-1)?.body.settings).toEqual({ duration: 5, resolution: '720p' });
  await page.screenshot({ path: 'evidence/runway-video/animate-prepared-local.png', fullPage: true });
  expect(mock.unexpectedRequests).toEqual([]);
});

test('foreign or failed asset cannot prepare Animate or submit a video', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.goto('/create/video?job=foreign-asset&action=animate');
  await expect(page.getByText('This creation is not available', { exact: false })).toBeVisible();
  expect(mock.downloads).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
});

test('provider disabled allows owned Animate preparation while spending stays blocked', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  mock.models.push({ id: 'disabled-video', version: 'staging-v1', displayName: 'Disabled Video', category: 'Motion',
    description: 'No spending authorization', mediaType: 'video', providerModel: 'controlled-fixture', availability: 'disabled', startingCredits: 54,
    capabilities: ['imageToVideo'], rules: [], inputs: [{ role: 'firstFrame', label: 'First frame', maxCount: 1, required: true, ownedAssetOnly: true }],
    fields: [{ key: 'duration', label: 'Duration (seconds)', type: 'integer', defaultValue: '5', options: ['5'] }] });
  await page.goto('/library');
  await page.getByRole('button', { name: /^Open Studio Image, Completed/ }).click();
  await page.getByRole('dialog', { name: 'Your creation', exact: true }).getByRole('button', { name: 'Animate', exact: true }).click();
  await expect(page.getByText('First frame prepared.', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'First frame 1', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Synthetic preparation only.');
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
  expect(mock.downloads.some(value => value.id === 'owned-bottle' && value.authorization)).toBe(true);
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});
