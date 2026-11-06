// Visual probe post paintCells fix: screenshot a painted case + finished case.
const { chromium } = require('playwright-core');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt','--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  const state = () => page.evaluate(() => window.__caseCraft());
  await page.goto('file:///home/hatch/workspace/playables-inspired/case-craft/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  await page.click('#btn-start', { force: true });
  await page.waitForTimeout(400);
  // wipe via real canvas clicks
  for (let i = 0; i < 10; i++) {
    const s = await state();
    if (s.step !== 0 || !s.smudges.length) break;
    const box = await page.locator('#game').boundingBox();
    await page.mouse.click(box.x + s.smudges[0].x / 100 * box.width, box.y + s.smudges[0].y / 100 * box.height);
    await page.waitForTimeout(120);
  }
  let s = await state();
  console.log('after wipe:', JSON.stringify({ step: s.step, wipeLeft: s.wipeLeft }));
  // paint: pick colour, real drag sweeps
  const COLOURS = ['coral','ocean','mint','sunny','grape','peach','rose','teal'];
  await page.locator('#toolbar .swatch').nth(COLOURS.indexOf(s.colour)).click({ force: true });
  const box = await page.locator('#game').boundingBox();
  for (let row = 0; row < 6; row++) {
    const y = 140 + row * 58;
    const px = (lx, ly) => [box.x + lx / 480 * box.width, box.y + ly / 560 * box.height];
    const [x1, y1] = px(150, y), [x2, y2] = px(330, y);
    await page.mouse.move(x1, y1); await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 6 }); await page.mouse.move(x1, y1, { steps: 4 });
    await page.mouse.up(); await page.waitForTimeout(80);
    if ((await state()).step !== 1) break;
  }
  s = await state();
  console.log('after paint:', JSON.stringify({ step: s.step, paintPct: s.paintPct }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-shots/09-painted-postfix.png' });
  // pattern + sticker + deliver for a finished-case shot
  await page.locator('#toolbar .tbtn', { hasText: s.patternName }).first().click({ force: true });
  await page.waitForTimeout(200);
  s = await state();
  const need = s.stickersNeeded[0];
  const label = need.type === 'smile' ? 'Smiley' : need.type.charAt(0).toUpperCase() + need.type.slice(1);
  await page.locator('#toolbar .tbtn', { hasText: label }).first().click({ force: true });
  await page.waitForTimeout(120);
  const [cx, cy] = [box.x + 240 / 480 * box.width, box.y + 300 / 560 * box.height];
  await page.mouse.click(cx, cy);
  await page.waitForTimeout(400);
  s = await state();
  console.log('after stickers:', JSON.stringify({ step: s.step, placed: s.stickersPlaced }));
  await page.screenshot({ path: 'test-shots/10-finished-postfix.png' });
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  await browser.close();
})();
