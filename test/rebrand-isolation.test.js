const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync('next.config.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function config(env) { const module = { exports: {} }; vm.runInNewContext(code, { process: {env}, exports: module.exports, module }); }
test('all isolated branches refuse production, wrong API, wrong bucket and missing feature gate', () => {
  for (const branch of ['codex/imagino-ai-revival-v2','feat/imagino-working-studio','feat/imagino-creative-hub-core']) {
    const correct = { VERCEL_GIT_COMMIT_REF:branch, VERCEL_ENV:'preview', NEXT_PUBLIC_API_URL:'https://imagino-api-ai-staging.onrender.com', MEDIA_ALLOWED_HOSTS:'pub-56f86851d1884a3b8e7a73f1624e4239.r2.dev', NEXT_PUBLIC_GENERATION_V2_ENABLED:'true' };
    assert.doesNotThrow(()=>config(correct));
    for (const [key,value] of [['VERCEL_ENV','production'],['NEXT_PUBLIC_API_URL','https://other.test'],['MEDIA_ALLOWED_HOSTS','other.test'],['NEXT_PUBLIC_GENERATION_V2_ENABLED','false']]) assert.throws(()=>config({...correct,[key]:value}),/isolated staging Preview/);
  }
});
