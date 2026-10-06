const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const { default: AxeBuilder } = require('@axe-core/playwright');
const output = path.resolve('evidence/rebrand');
fs.mkdirSync(output, { recursive: true });
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3110';
async function images(page) {
  await page.evaluate(async () => { for (const img of document.images) { img.loading = 'eager'; if (!img.complete) await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; setTimeout(resolve, 5000); }); } await document.fonts.ready; });
}
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = []; const checks = [];
  page.on('pageerror', e => errors.push(e.message));
  // Visual checks never need a real session or an external network request.
  await page.route('**/*', route => { const url = new URL(route.request().url()); if (['127.0.0.1','localhost'].includes(url.hostname)) return route.continue(); return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }); });
  async function capture(name, accessibility = false) {
    await images(page);
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
    const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, title: document.title, brokenImages: [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.alt), overlays: document.querySelectorAll('[data-nextjs-dialog]').length }));
    let violations = [];
    if (accessibility) violations = (await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }));
    checks.push({ name, ...metrics, accessibilityAudited: accessibility, violations });
    console.log(name, JSON.stringify({ overflow:metrics.scrollWidth > metrics.width, broken:metrics.brokenImages.length, violations:violations.length }));
  }
  for (const width of [320,390,768,1440,1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base, { waitUntil: 'networkidle' });
    await capture(`landing-${width}`, width === 390 || width === 1440);
    await page.goto(base + '/design-review', { waitUntil: 'networkidle' });
    await capture(`create-result-${width}`, width === 320 || width === 1440);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const state of ['Empty','Reference','Queued','Starting','Processing','Refunded','Failed','Cancelled','No balance','Unavailable','Loading','Signed out','Error']) {
    await page.getByLabel('State',{exact:true}).selectOption(state);
    await capture(`create-${state.toLowerCase().replaceAll(' ','-')}`, ['Empty','Refunded','No balance','Error'].includes(state));
  }
  await page.getByLabel('State',{exact:true}).selectOption('Result');
  await page.getByLabel('Surface',{exact:true}).selectOption('Library');
  await capture('library-full',true);
  await page.getByRole('button', {name:/Open Studio Image/}).first().click();
  await capture('library-detail',true);
  await page.keyboard.press('Escape');
  checks.push({ name:'detail-focus-return', focused: await page.getByRole('button',{name:/Open Studio Image/}).first().evaluate(e=>e===document.activeElement) });
  await page.getByRole('searchbox').fill('glass');
  await capture('library-filtered',true);
  await page.getByRole('searchbox').fill('no matching result');
  await capture('library-filtered-empty');
  await page.getByLabel('State',{exact:true}).selectOption('Empty');
  await capture('library-empty',true);
  await page.getByLabel('Surface',{exact:true}).selectOption('Account');
  await capture('account-sample',true);
  await page.getByLabel('Surface',{exact:true}).selectOption('Costs');
  await capture('costs-sample',true);
  await page.getByLabel('Surface',{exact:true}).selectOption('Components');
  await capture('components',true);
  for (const width of [320,390,768,1440,1920]) {
    await page.setViewportSize({width,height:1000});
    await page.goto(base+'/design-review',{waitUntil:'networkidle'});
    await page.getByLabel('Surface',{exact:true}).selectOption('Library');
    await capture(`library-${width}`,width===320);
    for (const route of ['login','pricing']) { await page.goto(base+'/'+route,{waitUntil:'networkidle'}); await capture(`${route}-${width}`,width===320); }
  }
  await page.setViewportSize({width:1440,height:1000});
  for (const route of ['/create/image','/library','/login','/profile','/pricing','/register','/create/video']) {
    await page.goto(base + route,{waitUntil:'networkidle'});
    await capture('real' + route.replaceAll('/','-'),true);
  }
  // 200% text-only zoom: double every computed text size, preserving authored boxes.
  await page.goto(base + '/design-review',{waitUntil:'networkidle'});
  await page.evaluate(() => { const sizes = [...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]); sizes.forEach(([e,size])=>{ e.style.fontSize = `${size*2}px`; }); });
  await capture('create-text-200',true);
  await page.goto(base,{waitUntil:'networkidle'});
  await page.evaluate(() => { const sizes = [...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]); sizes.forEach(([e,size])=>{ e.style.fontSize = `${size*2}px`; }); });
  await capture('landing-text-200',true);
  await page.setViewportSize({width:1440,height:1000});
  for (const [route,name] of [['/','baseline-landing-1440'],['/create/image','baseline-create-1440']]) { await page.goto('http://127.0.0.1:3111'+route,{waitUntil:'networkidle'}); await capture(name); }
  fs.writeFileSync(path.join(output,'visual-results.json'),JSON.stringify({checks,errors},null,2));
  await browser.close();
  if (checks.some(c=>c.scrollWidth>c.width || c.violations?.length || c.brokenImages?.length) || errors.length) process.exitCode = 1;
}
main().catch(e=>{ console.error(e); process.exit(1); });
