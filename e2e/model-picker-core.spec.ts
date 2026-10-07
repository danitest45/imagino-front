import { expect, test } from '@playwright/test';
import { jobs, mockStudio, models, referencePath } from './studio-mocks';
import { chooseOption } from './select-helpers';

test('large model catalog supports intent groups, search, keyboard choice and Escape focus return', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.models.push(...Array.from({ length: 6 }, (_, index) => ({
    ...structuredClone(models[0]), id: `extra-${index}`, displayName: `Extra ${index}`,
    presentation: { intent: 'recommended' as const, providerName: 'Fixture provider', nativeDisplayName: `Fixture ${index}`, shortDescription: 'Explicit sample metadata' },
  })));
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const opener = page.getByRole('button', { name: 'Model Studio Image', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const picker = page.getByRole('dialog', { name: 'Choose your model', exact: true });
  await expect(picker.getByRole('heading', { name: 'Recommended', exact: true })).toBeVisible();
  const search = picker.getByRole('searchbox', { name: 'Search models', exact: true });
  await search.fill('Extra 5');
  await expect(picker.getByRole('button', { name: /^Choose / })).toHaveCount(1);
  await expect(picker.getByText('Fixture provider · Fixture 5')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(picker.getByRole('button', { name: 'Choose Extra 5', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker).toHaveCount(0);
  const selected = page.getByRole('button', { name: 'Model Extra 5', exact: true });
  await expect(selected).toBeFocused();
  await selected.press('Enter');
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(selected).toBeFocused();
  expect(mock.quotes).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('compatible model change preserves reference bytes and supported settings, and invalidates its quote', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.models.push({ ...structuredClone(models[0]), id: 'compatible', displayName: 'Compatible Image', fields: [
    ...structuredClone(models[0].fields), { key: 'quality', label: 'Quality', type: 'enum', defaultValue: 'standard', options: ['standard', 'high'] },
  ] });
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Keep this idea and its reference');
  await chooseOption(page, 'Aspect ratio', '4:3');
  await page.getByLabel('Upload Reference image', { exact: true }).setInputFiles(referencePath);
  await expect(page.getByRole('button', { name: 'Generate image · 15 credits', exact: true })).toBeEnabled();
  const originalReference = mock.quotes.at(-1)?.body.inputs[0].data;
  mock.holdQuotes = true;
  mock.quoteCredits = 18;
  await page.getByRole('button', { name: 'Model Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose your model' }).getByRole('button', { name: 'Choose Compatible Image', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Change model?', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Model Compatible Image', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Aspect ratio', exact: true })).toHaveText('4:3');
  await expect(page.getByRole('combobox', { name: 'Quality', exact: true })).toHaveText('standard');
  await expect(page.getByRole('button', { name: 'Generate image', exact: true })).toBeDisabled();
  await expect.poll(() => mock.pendingQuotes.length).toBe(1);
  expect(mock.quotes.at(-1)?.body.inputs[0].data).toBe(originalReference);
  expect(mock.quotes.at(-1)?.body.settings).toEqual({ aspectRatio: '4:3', resolution: '1K', quality: 'standard' });
  await mock.releaseQuotes();
  await expect(page.getByRole('button', { name: 'Generate image · 18 credits', exact: true })).toBeEnabled();
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('unavailable models expose controls without allowing selection for spending or quotes', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.models.push({ ...structuredClone(models[0]), id: 'unavailable', displayName: 'Migrating Image', availability: 'migration_required' });
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Explore these controls');
  await expect(page.getByRole('button', { name: 'Generate image · 15 credits', exact: true })).toBeEnabled();
  const previousQuotes = mock.quotes.length;
  await page.getByRole('button', { name: 'Model Studio Image', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Choose your model', exact: true });
  await expect(picker.getByRole('button', { name: 'Choose Migrating Image', exact: true })).toBeDisabled();
  await picker.getByRole('button', { name: 'View controls for Migrating Image', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Model Migrating Image', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate image', exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Aspect ratio', exact: true })).toBeVisible();
  await expect(page.getByText(/needs an update before generation/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Controls are inspectable, no spending');
  await chooseOption(page, 'Aspect ratio', '16:9');
  expect(mock.quotes).toHaveLength(previousQuotes);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('canceling an asset-driven model change clears the pending reference and restores its actual opener', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  mock.models = [{ ...structuredClone(models[1]), fields: [
    ...structuredClone(models[1].fields), { key: 'style', label: 'Style', type: 'enum', defaultValue: 'neutral', options: ['neutral', 'bold'] },
  ] }, structuredClone(models[0])];
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Model Prompt Image', exact: true })).toBeVisible();
  const referenceAction = page.getByRole('region', { name: 'Creation result' }).getByRole('button', { name: 'Use as reference', exact: true });
  await referenceAction.click();
  const picker = page.getByRole('dialog', { name: 'Choose a reference-capable model', exact: true });
  await picker.getByRole('button', { name: 'Choose Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Change model?', exact: true }).getByRole('button', { name: 'Keep current model', exact: true }).click();
  await expect(referenceAction).toBeFocused();
  expect(mock.downloads).toHaveLength(0);

  await page.getByRole('button', { name: 'Model Prompt Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Choose your model', exact: true }).getByRole('button', { name: 'Choose Studio Image', exact: true }).click();
  await page.getByRole('dialog', { name: 'Change model?', exact: true }).getByRole('button', { name: 'Change model', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Model Studio Image', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toHaveCount(0);
  expect(mock.downloads).toHaveLength(0);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});

test('cross-media reuse confirms before replacing an existing prompt and reference', async ({ page, context }) => {
  const video = { ...jobs[0], id: 'owned-video', modelId: 'test-video', displayName: 'Video study', mediaType: 'video' as const, status: 'Failed' as const, creditState: 'Refunded' as const, outputUrl: null };
  const mock = await mockStudio(context, [video]);
  mock.models.push({ ...structuredClone(models[1]), id: 'test-video', displayName: 'Video study', mediaType: 'video', category: 'Motion', capabilities: ['textToVideo'] });
  await page.goto('/create/image');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('My current image direction');
  await page.getByLabel('Upload Reference image', { exact: true }).setInputFiles(referencePath);
  const reuse = page.getByRole('region', { name: 'Creation result' }).getByRole('button', { name: 'Reuse prompt & settings', exact: true });
  await reuse.click();
  const confirmation = page.getByRole('dialog', { name: 'Continue in another studio?', exact: true });
  await confirmation.getByRole('button', { name: 'Keep current setup', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/image$/);
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue('My current image direction');
  await expect(page.getByRole('img', { name: 'Reference image 1', exact: true })).toBeVisible();
  await reuse.click();
  await confirmation.getByRole('button', { name: 'Continue with asset', exact: true }).click();
  await expect(page).toHaveURL(/\/create\/video$/);
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue(video.prompt);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});
