// Read-only deployment and CORS observations. No credentials or generation calls.
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const origin = process.argv[2];
  if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Pass the exact HTTPS Preview origin.');
  const api = 'https://imagino-api-ai-staging.onrender.com';
  const preflight = await fetch(api + '/api/auth/login', {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' },
    signal: AbortSignal.timeout(45000),
  });
  const routes = await Promise.all(['/', '/design-review'].map(async route => {
    const response = await fetch(origin + route, { redirect: 'manual', signal: AbortSignal.timeout(45000) });
    const html = await response.text();
    return { route, status: response.status, location: response.headers.get('location')?.split('?')[0] || null, noindex: /name="robots"[^>]+noindex/.test(html), workingStudioHeadline: html.includes('Explore campaign visuals from your references'), reviewControls: html.includes('Design review controls') };
  }));
  const result = { checkedAt: new Date().toISOString(), origin, api, preflight: { status: preflight.status, allowOrigin: preflight.headers.get('access-control-allow-origin'), allowCredentials: preflight.headers.get('access-control-allow-credentials'), accepted: preflight.headers.get('access-control-allow-origin') === origin }, routes, scope: 'Unauthenticated read-only requests. No remote authenticated E2E or browser-download PASS is implied.' };
  const output = process.argv[3] || 'evidence/rebrand/remote-preview.json';
  fs.writeFileSync(path.resolve(__dirname, '..', output), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
