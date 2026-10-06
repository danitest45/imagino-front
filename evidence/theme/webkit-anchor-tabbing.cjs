// Local HTML only: reproduce this installed WebKit engine's default link tabbing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webkit } = require('playwright');

(async () => {
  const browser = await webkit.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<button id="start">Open</button><nav><a href="#a">How it works</a><a href="#b">Models</a></nav><input placeholder="After links">');
    const active = () => page.evaluate(() => ({
      tag: document.activeElement.tagName,
      text: document.activeElement.textContent,
      tabIndex: document.activeElement.tabIndex,
    }));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    const implicit = await active();
    await page.locator('a').evaluateAll(links => links.forEach(link => { link.tabIndex = 0; }));
    await page.locator('#start').focus();
    await page.keyboard.press('Tab');
    const explicit = await active();
    assert.equal(implicit.tag, 'INPUT');
    assert.equal(explicit.tag, 'A');
    assert.equal(explicit.text, 'How it works');
    const result = {
      scope: 'Local minimal HTML; no app, account, API or provider requests',
      engine: 'WebKit', version: browser.version(),
      implicitAnchorAfterTab: implicit,
      explicitTabIndexZeroAfterTab: explicit,
      conclusion: 'This engine skips implicit anchor tab stops. Explicit tabIndex=0 preserves mobile navigation link access without changing test assertions.',
    };
    fs.writeFileSync(path.join(__dirname, 'webkit-anchor-tabbing.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
