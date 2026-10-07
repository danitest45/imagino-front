// Authorized protected Preview test; no traces, screenshots, state export or secret logs.
const { chromium, expect } = require('@playwright/test');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const root = process.env.IMAGINO_WORKSPACE_ROOT;
const preview = 'https://imagino-front-git-feat-imagino-laun-348f6b-danitest45s-projects.vercel.app';
const api = 'https://imagino-api-ai-staging.onrender.com';
if (!root || process.env.IMAGINO_PREVIEW_SHARE_AUTHORIZED !== 'true') throw new Error('Explicit Preview share authorization and workspace root required.');
let stage = 'protected-preview-access', browser, context, token;
const result = { scope: 'real protected launch Preview and AI staging; existing synthetic assets only', providerPosts: 0, jobCreates: 0, blockedWrites: 0, blockedExternal: 0, checks: {} };
const mediaRequests = [], loginResponses = [];
const escaped = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
async function main() {
  const credentials = JSON.parse(readFileSync(join(root, 'private/generation-v2-credentials.json'), 'utf8'));
  const access = JSON.parse(readFileSync(join(root, 'private/launch-preview-access.json'), 'utf8'));
  const accessUrl = new URL(access.url);
  if (accessUrl.origin !== preview || !accessUrl.searchParams.has('_vercel_share')) throw new Error('Preview access origin mismatch.');
  const owner = credentials.accounts.find(a => a.Email === 'gen-v2-owner-20261002@example.invalid');
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (![preview, api].includes(url.origin)) { result.blockedExternal++; return route.abort(); }
    if (url.origin === api && !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
        !(request.method() === 'POST' && /^\/api\/(auth\/(login|refresh|logout)|generation\/quote)$/.test(url.pathname))) {
      result.blockedWrites++; return route.abort();
    }
    if (url.origin === api && /\/api\/generation\/jobs\/[^/]+\/(media|download)$/.test(url.pathname))
      mediaRequests.push({ bearer: request.headers().authorization?.startsWith('Bearer ') === true, queryEmpty: !url.search });
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    const audit = window.__launchMediaAudit = { created: [], revoked: [] };
    URL.createObjectURL = value => { const url = create(value); audit.created.push(url); return url; };
    URL.revokeObjectURL = url => { audit.revoked.push(url); revoke(url); };
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === api && url.pathname === '/api/auth/login' && response.status() === 200)
      loginResponses.push(response.json().then(data => { token = data.token; }));
  });
  await page.goto(accessUrl.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.goto(preview + '/login', { waitUntil: 'domcontentloaded' });
  stage = 'real-browser-login';
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(owner.Email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Image studio', exact: true })).toBeVisible();
  await Promise.all(loginResponses); if (!token) throw new Error('Application session absent.');
  result.checks.login = true;
  const auth = { Authorization: 'Bearer ' + token, Origin: preview };
  const proof = await (await context.request.get(api + '/api/generation/runway/e2e-video/proof', { headers: auth })).json();
  if (proof.paidGenerationEnabled !== false || proof.runwayRealSmokeEnabled !== false) throw new Error('Paid flags are not off.');
  result.checks.paidFlagsOff = true;
  const before = await (await context.request.get(api + '/api/users/credits', { headers: auth })).json();
  const history = await (await context.request.get(api + '/api/generation/jobs', { headers: auth })).json();
  const image = history.find(j => j.status === 'Completed' && j.mediaType === 'image');
  const video = history.find(j => j.status === 'Completed' && j.mediaType === 'video');
  if (!image || !video) throw new Error('Existing owner assets absent.');
  stage = 'real-assets-image-download';
  await page.goto(preview + '/library');
  await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible();
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();
  await page.getByRole('button', { name: new RegExp('^Open ' + escaped(image.displayName) + ', Completed') }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Your creation', exact: true });
  await expect(dialog.locator('img[src^="blob:"]')).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download', exact: true }).click();
  const stream = await (await downloadEvent).createReadStream();
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of stream) { hash.update(chunk); bytes += chunk.length; }
  result.checks.imageDownload = { bytes, sha256: hash.digest('hex') };
  const privateGate = JSON.parse(readFileSync(join(root, 'work/imagino-api-launch-readiness/docs/evidence/launch-readiness/staging-private-media-gate.json'), 'utf8'));
  const expectedImage = privateGate.migratedImages.find(row => row.jobId === image.id);
  if (!expectedImage || expectedImage.bytes !== bytes || expectedImage.sha256 !== result.checks.imageDownload.sha256) throw new Error('Downloaded image integrity mismatch.');
  result.checks.imageDownloadMatchesPrivateCopy = true;
  stage = 'real-reuse-animate-preparation';
  await dialog.getByRole('button', { name: 'Reuse prompt & settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Prompt', exact: true })).toHaveValue(image.prompt);
  result.checks.reuse = true;
  await page.goto(preview + '/create/video?job=' + encodeURIComponent(image.id) + '&action=animate');
  await expect(page.getByText('First frame prepared.', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'First frame 1', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Synthetic preparation only, no generation.');
  await expect(page.getByRole('button', { name: 'Generate video', exact: true })).toBeDisabled();
  result.checks.animatePreparedWithoutSpending = true;
  stage = 'real-video-playback';
  await page.goto(preview + '/library');
  await page.getByRole('group', { name: 'Filter assets by media' }).getByRole('button', { name: 'Videos', exact: true }).click();
  await page.getByRole('button', { name: new RegExp('^Open ' + escaped(video.displayName) + ', Completed') }).first().click();
  await expect.poll(() => page.locator('video').evaluate(el => el.readyState)).toBeGreaterThanOrEqual(2);
  await page.locator('video').evaluate(el => el.play());
  await expect.poll(() => page.locator('video').evaluate(el => el.currentTime)).toBeGreaterThan(0);
  result.checks.videoPlayback = true;
  await page.goto(preview + '/create/image');
  stage = 'real-themes';
  for (const theme of ['Dark', 'Light', 'System']) {
    await page.getByRole('button', { name: 'Appearance', exact: true }).click();
    await page.getByRole('menuitemradio', { name: theme, exact: true }).click();
    if (theme !== 'System') await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase());
  }
  result.checks.themes = true;
  result.checks.privateRequests = mediaRequests.length > 0 && mediaRequests.every(f => f.bearer && f.queryEmpty);
  if (!result.checks.privateRequests) throw new Error('Media auth transport failed.');
  if (await page.evaluate(() => Object.keys(localStorage).some(k => /token|prompt|media|job/i.test(k)))) throw new Error('Private browser persistence detected.');
  const after = await (await context.request.get(api + '/api/users/credits', { headers: auth })).json();
  const afterHistory = await (await context.request.get(api + '/api/generation/jobs', { headers: auth })).json();
  if (after.credits !== before.credits || afterHistory.length !== history.length || result.blockedWrites) throw new Error('Financial/write invariants failed.');
  result.checks.walletAndHistoryUnchanged = true;
  stage = 'real-logout-and-revocation';
  await expect(page.locator('img[src^="blob:"]').first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => page.evaluate(() => {
    const a = window.__launchMediaAudit; return a.created.length > 0 && a.created.every(u => a.revoked.includes(u));
  })).toBe(true);
  result.checks.logoutAndBlobRevocation = true; result.atUtc = new Date().toISOString();
  writeFileSync('launch-remote-browser-gate.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: 'PASS', ...result }));
}
main().catch(() => { console.error('Remote Preview gate BLOCKED at ' + stage + '; secret-bearing errors suppressed.'); process.exitCode = 1; })
  .finally(async () => {
    if (token && context) await context.request.post(api + '/api/auth/logout', { headers: { Origin: preview } }).catch(() => {});
    token = null; if (browser) await browser.close();
  });
