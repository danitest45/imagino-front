import { expect, test } from '@playwright/test';
import { mockStudio, TEST_TOKEN } from './studio-mocks';

test('login waits for hydration and preserves entered credentials on slow JavaScript', async ({ page, context }) => {
  const mock = await mockStudio(context);
  mock.authenticated = false;
  const captured: { email: string; password: string }[] = [];
  await context.route('https://imagino-api-ai-staging.onrender.com/api/auth/login', async route => {
    if (route.request().method() === 'OPTIONS') return route.fallback();
    captured.push(route.request().postDataJSON());
    mock.authenticated = true;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: {
      'Access-Control-Allow-Origin': 'http://127.0.0.1:3110', 'Access-Control-Allow-Credentials': 'true',
    }, body: JSON.stringify({ token: TEST_TOKEN }) });
  });
  let release!: () => void;
  const scripts = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async route => { await scripts; await route.continue(); });
  await page.goto('/login', { waitUntil: 'commit' });
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeEnabled();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('synthetic-login@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('local-fixture-not-a-real-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Image studio', exact: true })).toBeVisible();
  expect(captured).toEqual([{ email: 'synthetic-login@example.invalid', password: 'local-fixture-not-a-real-password' }]);
  expect(mock.submissions).toHaveLength(0);
  expect(mock.unexpectedRequests).toEqual([]);
});
