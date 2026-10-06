import { defineConfig } from '@playwright/test';

const engine = process.env.PLAYWRIGHT_ENGINE || 'chromium';
if (!['chromium', 'firefox', 'webkit', 'opera'].includes(engine)) throw new Error('Invalid PLAYWRIGHT_ENGINE');
if (engine === 'opera' && !process.env.PLAYWRIGHT_EXECUTABLE_PATH) throw new Error('Opera needs its installed executable path');
export default defineConfig({
  testDir: './e2e', timeout: 45000, expect: { timeout: 10000 },
  fullyParallel: false, workers: 1,
  reporter: [['list'], ['json', { outputFile: `evidence/theme/browser-${engine}.json` }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3110',
    browserName: (engine === 'opera' ? 'chromium' : engine) as 'chromium' | 'firefox' | 'webkit',
    ...(engine === 'chromium' ? { channel: 'chrome', launchOptions: { args: ['--no-sandbox'] } } : {}),
    ...(engine === 'opera' ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH, args: ['--no-sandbox'] } } : {}),
    headless: true, viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
});
