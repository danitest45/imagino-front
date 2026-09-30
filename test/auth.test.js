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

test('an in-flight refresh cannot restore authentication after logout', async () => {
  let resolveRefresh;
  const auth = loadAuth((url) => url.endsWith('/refresh') ? new Promise((resolve) => { resolveRefresh = resolve; }) : Promise.resolve({ ok: true }));
  auth.setAccessToken('old-jwt');
  const pending = auth.refreshAccessToken();
  await auth.logoutRequest();
  resolveRefresh({ ok: true, json: async () => ({ token: 'late-jwt' }) });
  assert.equal(await pending, false);
  assert.equal(auth.getAccessToken(), null);
});
