// Real-click test for Case Craft: Design Studio. Usage: node test.js <url> <outdir>
const { chromium } = require('playwright-core');
const fs = require('fs');
const [url, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: detail || '' }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : '')); }
const COLOURS = ['coral','ocean','mint','sunny','grape','peach','rose','teal'];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader','--allow-file-access-from-files','--hatch-webgl-allowed-domains-file=/home/hatch/workspace/tools/pw-shot/webgl-policy.txt','--hatch-webgl-allowed-domains-sha256=dc8a0e5eec744f6590a4c1889139c00568ffedc3eced6d0a1a5127e35f9ccd16'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' | ' + (e.stack||'').split('\n').slice(0,3).join(' / ')));
  page.on('crash', () => errors.push('PAGE CRASHED'));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  const state = () => page.evaluate(() => window.__caseCraft ? window.__caseCraft() : null);
  const clickCanvasPct = async (px, py) => {
    const box = await page.locator('#game').boundingBox();
    await page.mouse.click(box.x + px / 100 * box.width, box.y + py / 100 * box.height);
  };
  const clickCanvasXY = async (x, y) => { // logical 480x560 coords
    const box = await page.locator('#game').boundingBox();
    await page.mouse.click(box.x + x / 480 * box.width, box.y + y / 560 * box.height);
  };

  async function doWipe() {
    for (let i = 0; i < 12; i++) {
      const s = await state();
      if (!s || s.step !== 0) return s;
      if (!s.smudges.length) return s;
      await clickCanvasPct(s.smudges[0].x, s.smudges[0].y);
      await page.waitForTimeout(60);
    }
    return state();
  }
  async function doPaint() {
    // Paint via synthetic pointer events dispatched on the canvas (same
    // handlers as real input). Real drag painting was already proven in
    // test-a; this keeps the 20-level playthrough fast enough to run
    // while the VM is heavily loaded.
    const s0 = await state();
    const ci = COLOURS.indexOf(s0.colour);
    await page.locator('#toolbar .swatch').nth(ci).click({ force: true });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      const cv = document.getElementById('game');
      const rect = cv.getBoundingClientRect();
      const opts = (x, y) => ({ bubbles: true, cancelable: true, pointerId: 1, clientX: rect.left + x / 480 * rect.width, clientY: rect.top + y / 560 * rect.height, isPrimary: true });
      cv.dispatchEvent(new PointerEvent('pointerdown', opts(200, 200)));
      for (let row = 0; row < 16; row++) {
        const y = 130 + row * 20;
        for (let x = 150; x <= 330; x += 15) cv.dispatchEvent(new PointerEvent('pointermove', opts(x, y)));
      }
      window.dispatchEvent(new PointerEvent('pointerup', opts(200, 200)));
    });
    await page.waitForTimeout(200);
    return state();
  }
  async function doPattern(correct) {
    const s = await state();
    const name = correct ? s.patternName : (s.patternName === 'Plain' ? 'Polka Dots' : 'Plain');
    await page.locator('#toolbar .tbtn', { hasText: name }).first().click({ force: true });
    await page.waitForTimeout(200);
    return state();
  }
  async function doStickers() {
    for (let i = 0; i < 12; i++) {
      const s = await state();
      if (!s || s.step !== 3) return s;
      const need = s.stickersNeeded.find(n => n.have < n.need);
      if (!need) return s;
      // find sticker button by its label text
      const btn = page.locator('#toolbar .tbtn', { hasText: need.type === 'smile' ? 'Smiley' : need.type.charAt(0).toUpperCase() + need.type.slice(1) }).first();
      await btn.click({ force: true });
      await page.waitForTimeout(120);
      const spots = [[200, 220], [280, 260], [200, 330], [280, 380], [240, 300], [210, 420], [290, 430], [240, 200]];
      const spot = spots[(s.stickersPlaced) % spots.length];
      await clickCanvasXY(spot[0], spot[1]);
      await page.waitForTimeout(150);
    }
    return state();
  }
  async function playLevel() {
    let s = await doWipe();
    if (s.step !== 1) return s;
    s = await doPaint();
    if (s.step !== 2) return s;
    s = await doPattern(true);
    if (s.step !== 3) return s;
    s = await doStickers();
    return s;
  }

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);
  let s = await state();
  check('loads, menu screen', s && s.screen === 'menu', JSON.stringify(s));
  await page.click('#btn-start', { force: true });
  await page.waitForTimeout(400);
  s = await state();
  check('start -> playing level 1', s && s.screen === 'playing' && s.level === 1, JSON.stringify(s));
  // Full playthrough 1..20 (level 1 replayed clean this time)
  let won = false, guard = 0;
  while (guard++ < 60) {
    s = await state();
    console.log('LOOP guard=' + guard + ' ' + JSON.stringify(s && {screen:s.screen, level:s.level, step:s.step, paint:s.paintPct, placed:s.stickersPlaced, mistakes:s.mistakes, stars:s.totalStars}));
    if (!s) break;
    if (s.screen === 'win') { won = true; break; }
    if (s.screen === 'playing') {
      if (s.level === 10 && s.step === 0) await page.screenshot({ path: outdir + '/06-level10.png' });
      if (s.level === 20 && s.step === 0) await page.screenshot({ path: outdir + '/07-level20.png' });
      s = await playLevel();
      await page.waitForTimeout(300);
      s = await state();
      if (s.screen === 'playing' && s.step === 4) { await page.click('#btn-deliver', { force: true }); await page.waitForTimeout(400); }
    } else if (s.screen === 'clear') {
      await page.click('#btn-next', { force: true }); await page.waitForTimeout(400);
    } else break;
  }
  s = await state();
  check('full playthrough -> win screen after 20 customers', won && s.screen === 'win', JSON.stringify(s) + ' guard=' + guard);
  await page.screenshot({ path: outdir + '/08-win.png' });
  check('win: totalStars>0, score>0', s && s.totalStars > 0 && s.score > 0, JSON.stringify(s));

  console.log(errors.length ? 'CONSOLE/PAGE ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  const failed = results.filter(r => !r.ok).length;
  console.log('RESULT: ' + (results.length - failed) + '/' + results.length + ' checks passed');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
