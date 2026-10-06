const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const catalog = require('../src/data/generation-catalog-preview.json').models;
const models = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/generation-models.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: models });

test('model presentation preserves native identity and uses explicit catalog categories for intent', () => {
  const source = structuredClone(catalog);
  assert.equal(models.generationModelPresentation(catalog[0]).intent, 'fast');
  assert.equal(models.generationModelPresentation(catalog[1]).intent, 'studio');
  assert.equal(models.generationModelPresentation(catalog[2]).intent, 'reference');
  assert.equal(models.generationModelPresentation(catalog[1]).providerName, 'Black Forest Labs');
  assert.equal(models.generationModelPresentation(catalog[1]).nativeDisplayName, 'FLUX.2 Pro');
  for (const family of ['flare', 'sunburst']) {
    const view = models.generationModelPresentation({ ...catalog[1], providerModel: `gpt-image-2.5-${family}-2026-09-08` });
    assert.equal(view.providerName, 'OpenAI');
    assert.match(view.nativeDisplayName, /GPT Image 2.5/);
  }
  assert.deepEqual(catalog, source);
});

test('unknown providers are not inferred and future catalog metadata overrides the legacy adapter', () => {
  const unknown = { ...catalog[0], providerModel: 'unverified-gpt-flux', category: 'New' };
  assert.equal(models.generationModelPresentation(unknown).providerName, undefined);
  const declared = { ...unknown, presentation: { intent: 'recommended', providerName: 'Declared provider', nativeDisplayName: 'Native Model', shortDescription: 'Declared purpose', descriptors: ['Text & design'] } };
  const view = models.generationModelPresentation(declared);
  assert.equal(view.intent, 'recommended');
  assert.equal(view.providerName, 'Declared provider');
  assert.ok(view.descriptors.includes('Text & design'));
  assert.equal(view.description, 'Declared purpose');
});

test('picker groups by intent and searches model identity and schema capabilities without enabling unavailable items', () => {
  const matches = models.groupGenerationModels(catalog, 'Black Forest');
  assert.equal(matches.length, 2);
  assert.equal(matches[0].label, 'Fast');
  assert.equal(matches[1].label, 'Studio');
  const reference = models.groupGenerationModels(catalog, '', true).flatMap(group => group.models);
  assert.equal(reference.length, 2);
  assert.ok(reference.every(model => model.inputs.some(input => input.role === 'reference')));
  assert.equal(models.groupGenerationModels(catalog, 'no-such-model').length, 0);
  for (const availability of ['disabled', 'migration_required', 'deployment_pending', 'retired', 'unknown']) {
    assert.equal(models.isGenerationModelReady({ ...catalog[0], availability }), false);
  }
  assert.equal(models.isGenerationModelReady({ ...catalog[0], availability: 'ready' }), true);
  assert.equal(models.isGenerationModelReady({ ...catalog[0], availability: 'synthetic_demo' }), true);
});

test('compatible model transition preserves exact reference bytes and current settings without confirmation', () => {
  const reference = { role: 'reference', data: 'data:image/png;base64,unchanged' };
  const settings = { aspectRatio: '16:9', resolution: '4MP' };
  const plan = models.planGenerationModelChange(catalog[1], settings, [reference]);
  assert.equal(plan.requiresConfirmation, false);
  assert.equal(plan.inputs[0], reference);
  assert.equal(plan.settings.aspectRatio, '16:9');
  assert.equal(plan.settings.resolution, '4MP');
  assert.deepEqual(settings, { aspectRatio: '16:9', resolution: '4MP' });
});

test('incompatible model transition reports each removal while keeping compatible references and settings', () => {
  const target = { ...catalog[1], inputs: [{ role: 'reference', label: 'Reference', maxCount: 1 }] };
  const inputs = [{ role: 'reference', data: 'first' }, { role: 'reference', data: 'second' }, { role: 'firstFrame', data: 'third' }];
  const settings = { aspectRatio: '16:9', resolution: 'unsupported', quality: 'high' };
  const before = JSON.stringify({ target, inputs, settings });
  const plan = models.planGenerationModelChange(target, settings, inputs);
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.inputs.length, 1);
  assert.equal(plan.inputs[0].data, 'first');
  assert.equal(plan.removedInputs.length, 2);
  assert.equal(plan.changedSettings.length, 2);
  assert.equal(plan.settings.aspectRatio, '16:9');
  assert.equal(plan.settings.resolution, '1MP');
  assert.equal('quality' in plan.settings, false);
  assert.equal(JSON.stringify({ target, inputs, settings }), before);
});

test('video transitions apply declared field dependencies and preserve integer request values', () => {
  const plan = models.planGenerationModelChange(catalog[3], { resolution: '1080p', duration: 4, aspectRatio: '9:16' }, []);
  assert.equal(plan.settings.duration, 8);
  assert.equal(plan.settings.resolution, '1080p');
  assert.equal(plan.settings.aspectRatio, '9:16');
  assert.equal(plan.requiresConfirmation, true);
  assert.equal(plan.changedSettings[0], 'Duration (seconds)');
});
