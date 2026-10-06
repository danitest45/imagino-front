const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadAuth(fetch) {
  const source = fs.readFileSync('src/lib/auth.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, fetch, Headers,
    require: (name) => name === './config' ? { apiUrl: (path) => `https://api.test${path}` } : { buildProblem: async () => new Error('API error') },
  });
  return exports;
}

test('an old account response cannot refresh or retry using the new account', async () => {
  let resolveRequest;
  const calls = [];
  const auth = loadAuth((url) => { calls.push(url); return new Promise(resolve => { resolveRequest = resolve; }); });
  auth.setAccessToken('account-a');
  const pending = auth.fetchWithAuth('https://api.test/private');
  auth.setAccessToken('account-b');
  resolveRequest({ status: 401, ok: false });
  await assert.rejects(pending, /session changed/);
  assert.deepEqual(calls, ['https://api.test/private']);
  assert.equal(auth.getAccessToken(), 'account-b');
});

test('logout clears the memory token even if the network rejects revocation', async () => {
  const auth = loadAuth(async () => { throw new Error('offline'); });
  auth.setAccessToken('account-a');
  const pending = auth.logoutRequest();
  assert.equal(auth.getAccessToken(), null);
  await assert.rejects(pending, /offline/);
  assert.equal(auth.getAccessToken(), null);
});

test('concurrent refresh requests share one cookie rotation and keep JWT in memory', async () => {
  let resolveFetch;
  const calls = [];
  const auth = loadAuth((url, init) => {
    calls.push({ url, init });
    return new Promise((resolve) => { resolveFetch = resolve; });
  });
  const first = auth.refreshAccessToken();
  const second = auth.refreshAccessToken();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.test/api/auth/refresh');
  assert.equal(calls[0].init.credentials, 'include');
  resolveFetch({ ok: true, json: async () => ({ token: 'test-jwt' }) });
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(auth.getAccessToken(), 'test-jwt');
  assert.equal(calls[0].url.includes('token='), false);
});

test('logout waits for cookie rotation and revokes the rotated session', async () => {
  let resolveRefresh;
  let cookie = 'old-cookie';
  const sessions = new Set([cookie]);
  const calls = [];
  const auth = loadAuth((url, init) => {
    assert.equal(init.credentials, 'include');
    if (url.endsWith('/refresh')) {
      calls.push('refresh');
      if (!sessions.delete(cookie)) return Promise.resolve({ ok: false, status: 401 });
      return new Promise((resolve) => {
        resolveRefresh = () => {
          cookie = 'rotated-cookie';
          sessions.add(cookie);
          resolve({ ok: true, json: async () => ({ token: 'late-jwt' }) });
        };
      });
    }
    calls.push('logout');
    sessions.delete(cookie);
    cookie = null;
    return Promise.resolve({ ok: true });
  });
  auth.setAccessToken('old-jwt');
  const pending = auth.refreshAccessToken();
  const logout = auth.logoutRequest();
  assert.deepEqual(calls, ['refresh']);
  assert.equal(await auth.refreshAccessToken(), false);
  assert.deepEqual(calls, ['refresh']);
  resolveRefresh();
  await logout;
  assert.equal(await pending, false);
  assert.deepEqual(calls, ['refresh', 'logout']);
  assert.equal(auth.getAccessToken(), null);
  assert.equal(cookie, null);
  assert.equal(sessions.size, 0);
  assert.equal(await auth.refreshAccessToken(), false);
});

test('concurrent logout requests share one revocation and block new refreshes', async () => {
  let resolveLogout;
  const calls = [];
  const auth = loadAuth((url) => {
    calls.push(url);
    return new Promise((resolve) => { resolveLogout = resolve; });
  });
  auth.setAccessToken('old-jwt');
  const first = auth.logoutRequest();
  const second = auth.logoutRequest();
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'https://api.test/api/auth/logout');
  assert.equal(await auth.refreshAccessToken(), false);
  resolveLogout({ ok: true });
  await Promise.all([first, second]);
  assert.equal(auth.getAccessToken(), null);
});
