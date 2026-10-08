import { expect, test } from '@playwright/test';
import { jobs, mockStudio } from './studio-mocks';

test('owner media uses authenticated bytes and revokes object URLs on logout', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  await page.addInitScript(() => {
    const originalCreate = URL.createObjectURL.bind(URL);
    const originalRevoke = URL.revokeObjectURL.bind(URL);
    const audit = { created: [] as string[], revoked: [] as string[] };
    (window as unknown as { mediaAudit: typeof audit }).mediaAudit = audit;
    URL.createObjectURL = value => { const url = originalCreate(value); audit.created.push(url); return url; };
    URL.revokeObjectURL = url => { audit.revoked.push(url); originalRevoke(url); };
  });
  await page.goto('/library');
  await expect.poll(() => mock.mediaReads.length).toBeGreaterThan(0);
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();
  expect(mock.mediaReads.every(read => read.authorization?.startsWith('Bearer ') && !new URL(read.url).search)).toBe(true);
  expect(mock.submissions).toHaveLength(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /token|prompt|media|job/i.test(key)))).toEqual([]);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const audit = (window as unknown as { mediaAudit: { created: string[]; revoked: string[] } }).mediaAudit;
    return audit.created.length > 0 && audit.created.every(url => audit.revoked.includes(url));
  })).toBe(true);
  expect(mock.unexpectedRequests).toEqual([]);
});
