const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const snapshot = require('../src/data/generation-catalog-preview.json');

function route(env, fetch) {
  const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/generation/catalog/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports: exported, process: { env }, fetch, AbortSignal,
    require: name => name === 'next/server' ? { NextResponse: { json: (body, options) => ({ body, options }) } } : { default: snapshot },
  });
  return exported;
}
const enabled = { NEXT_PUBLIC_GENERATION_V2_ENABLED: 'true', NEXT_PUBLIC_API_URL: 'https://imagino-api-staging.onrender.com' };

test('catalog refuses disabled or non-staging targets before contacting a backend', async () => {
  for (const env of [{}, { ...enabled, NEXT_PUBLIC_API_URL: 'https://production.example' }]) {
    const response = await route(env, () => assert.fail('must not fetch')).GET();
    assert.equal(response.options.status, 404);
  }
});
test('healthy catalog preserves live capabilities and availability without caching', async () => {
  const response = await route(enabled, async (url, options) => {
    assert.equal(url, enabled.NEXT_PUBLIC_API_URL + '/api/generation/catalog');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ revision: 'live', models: [{ id: 'fixture', availability: 'synthetic_demo' }] }) };
  }).GET();
  assert.equal(response.body.source, 'live');
  assert.equal(response.body.models[0].availability, 'synthetic_demo');
  assert.equal(response.options.headers['Cache-Control'], 'no-store');
});
test('HTTP failure and network timeout expose only an explicitly unavailable preview', async () => {
  for (const fetch of [async () => ({ ok: false }), async () => { throw new Error('timeout'); }]) {
    const response = await route(enabled, fetch).GET();
    assert.equal(response.body.source, 'catalog_preview');
    assert.equal(response.body.models.length, 6);
    assert.ok(response.body.models.every(model => model.availability === 'deployment_pending'));
    assert.equal(response.options.headers['Cache-Control'], 'no-store');
    assert.ok(response.body.models.filter(model => model.mediaType === 'video').every(model => model.lifecycle === 'COMPATIBILITY' && model.retirementAt));
  }
});
