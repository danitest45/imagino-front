const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function billing(response) {
  const calls=[];
  const exports={};
  const code=ts.transpileModule(fs.readFileSync('src/lib/billing.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,URL,require:n=>n==='./config'?{apiUrl:p=>'https://staging.test'+p}:{fetchWithAuth:async(url,init)=>{calls.push({url,init});return {ok:true,json:async()=>response};}}});
  return {api:exports,calls};
}
test('checkout sends only selected plan with authenticated fetch',async()=>{
  const {api,calls}=billing({url:'https://checkout.stripe.com/test_fixture'});
  await api.createCheckoutSession('PRO');
  assert.deepEqual(JSON.parse(calls[0].init.body),{plan:'PRO'});
  assert.equal(calls[0].url,'https://staging.test/api/billing/checkout');
  assert.equal(calls[0].init.credentials,'include');
});
test('portal posts no client economic settings',async()=>{
  const {api,calls}=billing({url:'https://billing.stripe.com/p/session/test_fixture'});
  await api.createPortalSession();
  assert.equal(calls[0].init.method,'POST');
  assert.equal(calls[0].init.body,undefined);
  assert.equal(calls[0].url,'https://staging.test/api/billing/portal');
});
test('server billing state is fetched without session_id authority',async()=>{
  const {api,calls}=billing({plan:'PRO',credits:100,hasPaidInvoice:true});
  const result=await api.getBillingMe();
  assert.equal(result.credits,100);
  assert.equal(calls[0].url,'https://staging.test/api/billing/me');
});
for(const url of ['http://checkout.stripe.com/x','https://checkout.stripe.com.evil.test/x','https://evil.test/x','https://user@checkout.stripe.com/x']) {
  test('unsafe Checkout destination rejected: '+url,async()=>{
    const {api}=billing({url});await assert.rejects(api.createCheckoutSession('PRO'));
  });
}
