const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const generation = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/generation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: generation });

test('catalog field types control defaults without provider-specific UI branches', () => {
  const model = { fields: [{ key: 'duration', type: 'integer', defaultValue: '4' }, { key: 'resolution', type: 'enum', defaultValue: '720p' }] };
  const settings = generation.defaultGenerationSettings(model);
  assert.equal(settings.duration, 4);
  assert.equal(settings.resolution, '720p');
});
test('video capability combinations fail before submission', () => {
  const model = { rules: [{ whenKey: 'resolution', whenValue: '1080p', requireKey: 'duration', allowedValues: ['8'] }] };
  const request = { settings: { resolution: '1080p', duration: 4 }, inputs: [] };
  assert.match(generation.generationConstraintError(model, request), /requires duration/);
  request.settings.duration = 8;
  assert.equal(generation.generationConstraintError(model, request), null);
  request.inputs = [{ role: 'lastFrame' }];
  assert.match(generation.generationConstraintError(model, request), /first frame/);
  request.inputs.push({ role: 'firstFrame' });
  request.settings.resolution = '720p'; request.settings.duration = 4;
  assert.match(generation.generationConstraintError(model, request), /8 second/);
});
test('only final generation states terminate processing', () => {
  for (const state of ['Queued', 'Starting', 'Processing']) assert.equal(generation.terminalGeneration(state), false);
  for (const state of ['Completed', 'Failed', 'Cancelled']) assert.equal(generation.terminalGeneration(state), true);
});

test('schema-required first frame blocks quote and submit until an owned asset is prepared', () => {
  const model = { inputs: [{ role: 'firstFrame', label: 'First frame', required: true, ownedAssetOnly: true }], rules: [] };
  const request = { settings: { duration: 5, resolution: '720p' }, inputs: [] };
  assert.match(generation.generationConstraintError(model, request), /first frame/);
  request.inputs = [{ role: 'firstFrame', data: 'data:image/png;base64,fixture' }];
  assert.match(generation.generationConstraintError(model, request), /Assets/);
  request.inputs[0].sourceAssetId = 'owned-bottle';
  assert.equal(generation.generationConstraintError(model, request), null);
});

test('legacy history states normalize without modifying stored jobs', () => {
  assert.equal(generation.normalizeLegacyGenerationStatus('Created'), 'Queued');
  assert.equal(generation.normalizeLegacyGenerationStatus('RUNNING'), 'Processing');
  assert.equal(generation.normalizeLegacyGenerationStatus('Pending'), 'Processing');
  assert.equal(generation.normalizeLegacyGenerationStatus('Completed'), 'Completed');
});
test('generation submission uses authenticated API and preserves caller idempotency', async () => {
  const calls = []; const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/generation-api.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: exported, require: name => name === './config' ? { apiUrl: path => 'https://staging.test' + path } : {
    fetchWithAuth: async (url, init) => { calls.push({ url, init }); return { json: async () => ({ id: 'same-job' }) }; },
  } });
  const request = { modelId: 'model', prompt: 'private', settings: { duration: 4 }, inputs: [], quoteId: 'quote' };
  await exported.createGeneration(request, 'same-idempotency-key');
  await exported.createGeneration(request, 'same-idempotency-key');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers['Idempotency-Key'], calls[1].init.headers['Idempotency-Key']);
  assert.deepEqual(JSON.parse(calls[0].init.body), request);
  assert.equal(calls[0].url, 'https://staging.test/api/generation/jobs');
});
