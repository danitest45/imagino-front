import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { jobs, mockStudio } from './studio-mocks';

test('Preview stays noindex and records controlled local navigation baselines', async ({ page, context }) => {
  const mock = await mockStudio(context, jobs);
  const measurements = [];
  for (const path of ['/', '/create/image', '/library']) {
    await page.goto(path);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    measurements.push(await page.evaluate(path => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return { path, ttfbMs: navigation.responseStart, domContentLoadedMs: navigation.domContentLoadedEventEnd,
        scriptRequests: resources.filter(r => r.initiatorType === 'script').length,
        scriptTransferBytes: resources.filter(r => r.initiatorType === 'script').reduce((sum, r) => sum + r.transferSize, 0) };
    }, path));
  }
  const robots = await page.request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /');
  expect(await (await page.request.get('/sitemap.xml')).text()).not.toContain('vercel.app');
  expect(await page.locator('link[rel="canonical"]').count()).toBe(0);
  writeFileSync('launch-browser-baseline.json', JSON.stringify({ scope: 'single local Chromium navigation, mocked API; not production latency/LCP', measurements, historyRequests: mock.historyRequests, mediaReads: mock.mediaReads.length, providerPosts: mock.submissions.length }, null, 2));
  expect(mock.unexpectedRequests).toEqual([]);
  expect(mock.submissions).toHaveLength(0);
});
