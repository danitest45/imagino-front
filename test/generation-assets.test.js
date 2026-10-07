const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assets = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/generation-assets.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: assets });
const job = { id: 'owned-image', modelId: 'model-a', displayName: 'Studio Image', mediaType: 'image', status: 'Completed', creditState: 'Charged', prompt: 'Blue bottle', outputUrl: '/fixture.png' };
const ids = (value) => Array.from(value, (action) => action.id);

test('asset actions require owned history and implemented capability contracts', () => {
  assert.deepEqual(ids(assets.availableAssetActions(job, { owned: false, canReference: true })), []);
  assert.deepEqual(ids(assets.availableAssetActions(job, { owned: true, canReference: true })), ['reference', 'reuse', 'download']);
  assert.deepEqual(ids(assets.availableAssetActions(job, { owned: true, canReference: false })), ['reuse', 'download']);
  assert.deepEqual(ids(assets.availableAssetActions({ ...job, mediaType: 'video' }, { owned: true, canReference: true })), ['reuse', 'download']);
  for (const status of ['Queued', 'Starting', 'Processing', 'Failed', 'Cancelled']) {
    assert.deepEqual(ids(assets.availableAssetActions({ ...job, status }, { owned: true, canReference: true })), ['reuse']);
  }
});

test('reference preparation follows a real image reference input schema, never an edit capability label', () => {
  assert.equal(assets.catalogSupportsReference([{ mediaType: 'image', capabilities: ['imageEditing'], inputs: [] }]), false);
  assert.equal(assets.catalogSupportsReference([{ mediaType: 'video', inputs: [{ role: 'firstFrame', maxCount: 1 }] }]), false);
  assert.equal(assets.catalogSupportsReference([{ mediaType: 'image', availability: 'disabled', inputs: [{ role: 'reference', maxCount: 2 }] }]), true);
  assert.equal(assets.catalogSupportsReference([{ mediaType: 'image', inputs: [{ role: 'reference', maxCount: 0 }] }]), false);
});

test('Animate requires an owned completed image and an owned first-frame video contract', () => {
  const model = { mediaType: 'video', availability: 'approval_required', capabilities: ['imageToVideo'], inputs: [{ role: 'firstFrame', maxCount: 1, ownedAssetOnly: true }] };
  assert.equal(assets.catalogSupportsAnimate([model]), true);
  assert.equal(assets.catalogSupportsAnimate([{ ...model, inputs: [] }]), false);
  assert.equal(assets.catalogSupportsAnimate([{ ...model, availability: 'disabled' }]), false);
  assert.deepEqual(ids(assets.availableAssetActions(job, { owned: true, canReference: false, canAnimate: true })), ['animate', 'reuse', 'download']);
  assert.deepEqual(ids(assets.availableAssetActions(job, { owned: false, canReference: false, canAnimate: true })), []);
  assert.deepEqual(ids(assets.availableAssetActions({ ...job, mediaType: 'video' }, { owned: true, canReference: false, canAnimate: true })), ['reuse', 'download']);
  for (const status of ['Queued', 'Starting', 'Processing', 'Failed', 'Cancelled'])
    assert.deepEqual(ids(assets.availableAssetActions({ ...job, status }, { owned: true, canReference: false, canAnimate: true })), ['reuse']);
});

test('media filters are derived only from loaded assets', () => {
  assert.deepEqual(Array.from(assets.assetMediaFilters([])), ['all']);
  assert.deepEqual(Array.from(assets.assetMediaFilters([job])), ['all', 'image']);
  assert.deepEqual(Array.from(assets.assetMediaFilters([{ ...job, mediaType: 'video' }])), ['all', 'video']);
  assert.deepEqual(Array.from(assets.assetMediaFilters([job, { ...job, mediaType: 'video' }])), ['all', 'image', 'video']);
});

test('asset filters combine media, model, prompt and confirmed refund state without mutating history', () => {
  const jobs = [job, { ...job, id: 'video-refunded', modelId: 'model-b', mediaType: 'video', status: 'Failed', creditState: 'Refunded' }, { ...job, id: 'image-failed', status: 'Failed', creditState: 'Reserved' }];
  assert.deepEqual(ids(assets.filterAssets(jobs, { media: 'video', model: 'model-b', query: '  BLUE ', status: 'Refunded' })), ['video-refunded']);
  assert.deepEqual(ids(assets.filterAssets(jobs, { status: 'Failed' })), ['video-refunded', 'image-failed']);
  assert.deepEqual(ids(assets.filterAssets(jobs, { query: 'refunded' })), ['video-refunded']);
  assert.deepEqual(ids(assets.filterAssets(jobs, { media: 'image', status: 'Refunded' })), []);
  assert.equal(jobs[1].status, 'Failed');
  assert.equal(jobs.length, 3);
});
