import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { GenerationJob, GenerationModel, GenerationRequest } from '../src/types/generation';

export const TEST_TOKEN = 'local-playwright-session-not-a-real-token';
export const referencePath = path.join(__dirname, 'fixtures', 'reference.png');
const referenceBytes = readFileSync(referencePath);
const apiOrigin = 'https://imagino-api-ai-staging.onrender.com';

export const models: GenerationModel[] = [
  { id: 'test-reference', version: 'fixture-v1', displayName: 'Studio Image', category: 'Test', description: 'Controlled browser test model with reference input.', mediaType: 'image', providerModel: 'mock/image', capabilities: ['textToImage', 'imageToImage'], availability: 'ready', startingCredits: 10, rules: [], inputs: [{ role: 'reference', label: 'Reference image', maxCount: 2 }], fields: [{ key: 'aspectRatio', label: 'Aspect ratio', type: 'enum', defaultValue: '1:1', options: ['1:1', '4:3', '16:9'] }, { key: 'resolution', label: 'Resolution', type: 'enum', defaultValue: '1K', options: ['1K', '2K'] }] },
  { id: 'test-prompt', version: 'fixture-v1', displayName: 'Prompt Image', category: 'Test', description: 'Controlled browser test model without reference input.', mediaType: 'image', providerModel: 'mock/prompt', capabilities: ['textToImage'], availability: 'ready', startingCredits: 8, rules: [], inputs: [], fields: [{ key: 'aspectRatio', label: 'Aspect ratio', type: 'enum', defaultValue: '1:1', options: ['1:1', '16:9'] }] },
];

export const jobs: GenerationJob[] = [
  { id: 'owned-bottle', modelId: 'test-reference', displayName: 'Studio Image', mediaType: 'image', status: 'Completed', creditState: 'Charged', credits: 15, prompt: 'Blue bottle in a quiet studio', settings: { aspectRatio: '4:3', resolution: '1K' }, outputUrl: 'https://test-media.invalid/bottle.png', errorCode: null, createdAt: '2026-10-05T12:00:00Z' },
  { id: 'owned-car', modelId: 'test-prompt', displayName: 'Prompt Image', mediaType: 'image', status: 'Completed', creditState: 'Charged', credits: 8, prompt: 'Red car beside a white house', settings: { aspectRatio: '16:9' }, outputUrl: 'https://test-media.invalid/car.png', errorCode: null, createdAt: '2026-10-04T12:00:00Z' },
  { id: 'owned-failed', modelId: 'test-reference', displayName: 'Studio Image', mediaType: 'image', status: 'Failed', creditState: 'Refunded', credits: 15, prompt: 'A leaf on a stone surface', settings: { aspectRatio: '1:1', resolution: '1K' }, outputUrl: null, errorCode: 'synthetic_provider_failure', createdAt: '2026-10-03T12:00:00Z' },
];

type CapturedRequest = { body: GenerationRequest; rawBody: string; authorization?: string; key?: string };
type PendingResponse = () => Promise<void>;

/** All external requests are intercepted. The local catalog and image proxy are
 * also intercepted so neither Next route can contact the real API or media host.
 * An unexpected endpoint is aborted and recorded, never forwarded. */
export async function mockStudio(context: BrowserContext, initialJobs: GenerationJob[] = []) {
  const state = {
    authenticated: true,
    jobs: structuredClone(initialJobs),
    models: structuredClone(models),
    quoteCredits: 15,
    quoteExpiresInMs: 60_000,
    holdQuotes: false,
    holdSubmissions: false,
    holdLogout: false,
    failedSubmissions: 0,
    failDownloads: false,
    failHistory: false,
    quotes: [] as CapturedRequest[],
    submissions: [] as CapturedRequest[],
    downloads: [] as { id: string; authorization?: string; url: string }[],
    historyRequests: 0,
    logoutRequests: 0,
    unexpectedRequests: [] as string[],
    pendingQuotes: [] as PendingResponse[],
    pendingSubmissions: [] as PendingResponse[],
    pendingLogout: [] as PendingResponse[],
    async releaseQuotes() { await Promise.all(this.pendingQuotes.splice(0).map(respond => respond())); },
    async releaseSubmissions() { await Promise.all(this.pendingSubmissions.splice(0).map(respond => respond())); },
    async releaseLogout() { await Promise.all(this.pendingLogout.splice(0).map(respond => respond())); },
  };

  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
    const api = url.origin === apiOrigin;
    const headers = {
      'access-control-allow-origin': request.headers().origin || 'http://127.0.0.1:3110',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, Idempotency-Key',
    };
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    const capture = (): CapturedRequest => ({ body: request.postDataJSON(), rawBody: request.postData() || '', authorization: request.headers().authorization, key: request.headers()['idempotency-key'] });
    const defer = (queue: PendingResponse[], respond: PendingResponse) => new Promise<void>(resolve => {
      queue.push(async () => { try { await respond(); } finally { resolve(); } });
    });

    if (api && request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (local && url.pathname === '/api/generation/catalog') return json({ models: state.models });
    if (local && url.pathname === '/api/images/optimize') return route.fulfill({ status: 200, contentType: 'image/png', body: referenceBytes });
    if (api && url.pathname === '/api/auth/refresh') return state.authenticated ? json({ token: TEST_TOKEN }) : json({ status: 401, title: 'No test session' }, 401);
    if (api && url.pathname === '/api/auth/logout') {
      state.authenticated = false;
      state.logoutRequests += 1;
      const respond = () => route.abort('failed');
      return state.holdLogout ? defer(state.pendingLogout, respond) : respond();
    }
    if (api && url.pathname === '/api/users/credits') return json({ credits: 80 });
    if (api && url.pathname === '/api/generation/quote') {
      state.quotes.push(capture());
      const quoteId = `quote-${state.quotes.length}`;
      const credits = state.quoteCredits;
      const respond = () => json({ quoteId, credits, providerCostEstimateUsd: 0, expiresAt: new Date(Date.now() + state.quoteExpiresInMs).toISOString() });
      return state.holdQuotes ? defer(state.pendingQuotes, respond) : respond();
    }
    if (api && url.pathname === '/api/generation/jobs' && request.method() === 'GET') {
      state.historyRequests += 1;
      return state.failHistory ? json({ status: 503, title: 'Test history unavailable', detail: 'The controlled history response failed.' }, 503) : json(state.jobs);
    }
    if (api && url.pathname === '/api/generation/jobs' && request.method() === 'POST') {
      const captured = capture();
      state.submissions.push(captured);
      const attempt = state.submissions.length;
      const respond = async () => {
        if (attempt <= state.failedSubmissions) return route.abort('failed');
        const result: GenerationJob = { id: 'owned-created', modelId: captured.body.modelId, displayName: 'Studio Image', mediaType: 'image', status: 'Queued', creditState: 'Reserved', credits: 15, prompt: captured.body.prompt, settings: Object.fromEntries(Object.entries(captured.body.settings).map(([key, value]) => [key, String(value)])), outputUrl: null, errorCode: null, createdAt: '2026-10-05T13:00:00Z' };
        state.jobs = [result, ...state.jobs.filter(job => job.id !== result.id)];
        await json(result);
      };
      return state.holdSubmissions ? defer(state.pendingSubmissions, respond) : respond();
    }
    const download = url.pathname.match(/^\/api\/generation\/jobs\/([^/]+)\/download$/);
    if (api && download) {
      state.downloads.push({ id: download[1], authorization: request.headers().authorization, url: request.url() });
      if (state.failDownloads) return json({ status: 503, title: 'Test download unavailable', detail: 'The controlled download response failed.' }, 503);
      return route.fulfill({ status: 200, headers, contentType: 'image/png', body: referenceBytes });
    }
    if (local && !url.pathname.startsWith('/api/')) return route.continue();
    state.unexpectedRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
    await route.abort('blockedbyclient');
  });

  return state;
}
