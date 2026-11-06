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
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
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
    const s0 = await state();
    const ci = COLOURS.indexOf(s0.colour);
    await page.locator('#toolbar .swatch').nth(ci).click();
    await page.waitForTimeout(150);
    // sweep-drag across the case in a grid so every paint cell is hit
    const box = await page.locator('#game').boundingBox();
    const toPx = (lx, ly) => [box.x + lx / 480 * box.width, box.y + ly / 560 * box.height];
    for (let row = 0; row < 6; row++) {
      const y = 140 + row * 58;
      const [x1, y1] = toPx(150, y), [x2, y2] = toPx(330, y);
      await page.mouse.move(x1, y1);
      await page.mouse.down();
      await page.mouse.move(x2, y2, { steps: 6 });
      await page.mouse.move(x1, y1, { steps: 4 });
      await page.mouse.up();
      await page.waitForTimeout(30);
      const s = await state();
      if (s.step !== 1) break;
    }
    return state();
  }
  async function doPattern(correct) {
    const s = await state();
    const name = correct ? s.patternName : (s.patternName === 'Plain' ? 'Polka Dots' : 'Plain');
    await page.locator('#toolbar .tbtn', { hasText: name }).first().click();
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
      await btn.click();
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
  check('loads, hook present, menu screen', s && s.screen === 'menu', JSON.stringify(s));
  await page.screenshot({ path: outdir + '/01-menu.png' });

  await page.click('#btn-start');
  await page.waitForTimeout(400);
  s = await state();
  check('start -> playing level 1, step wipe, 3 smudges', s && s.screen === 'playing' && s.level === 1 && s.step === 0 && s.wipeLeft === 3, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/02-level1-wipe.png' });

  // Wipe level 1
  s = await doWipe();
  check('wipe all smudges -> paint step', s && s.step === 1, JSON.stringify(s));

  // Wrong colour: pick a different swatch, drag on case, paint must not advance
  const wrongCi = (COLOURS.indexOf(s.colour) + 1) % COLOURS.length;
  await page.locator('#toolbar .swatch').nth(wrongCi).click();
  await page.waitForTimeout(100);
  const box = await page.locator('#game').boundingBox();
  await page.mouse.move(box.x + 200 / 480 * box.width, box.y + 250 / 560 * box.height);
  await page.mouse.down();
  await page.mouse.move(box.x + 300 / 480 * box.width, box.y + 350 / 560 * box.height, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  s = await state();
  check('wrong colour drag: paintPct stays 0, mistakes+1', s.paintPct === 0 && s.mistakes === 1, JSON.stringify(s));

  // Paint correctly
  s = await doPaint();
  check('paint to target -> pattern step', s && s.step === 2 && s.paintPct >= s.paintTarget, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/03-level1-painted.png' });

  // Wrong pattern
  const m0 = s.mistakes;
  s = await doPattern(false);
  check('wrong pattern: stays on pattern step, mistakes+1', s.step === 2 && s.mistakes === m0 + 1, JSON.stringify(s));
  s = await doPattern(true);
  check('correct pattern -> stickers step', s && s.step === 3, JSON.stringify(s));

  // Wrong sticker: select a sticker not requested, tap case
  const allTypes = ['star','heart','flower','moon','bolt','paw','smile','rocket','crown','gem'];
  const neededTypes = s.stickersNeeded.map(n => n.type);
  const wrongType = allTypes.find(t => !neededTypes.includes(t));
  const wrongLabel = wrongType === 'smile' ? 'Smiley' : wrongType.charAt(0).toUpperCase() + wrongType.slice(1);
  await page.locator('#toolbar .tbtn', { hasText: wrongLabel }).first().click();
  await page.waitForTimeout(120);
  await clickCanvasXY(240, 300);
  await page.waitForTimeout(150);
  s = await state();
  check('wrong sticker tap: not placed, mistakes+1', s.stickersPlaced === 0 && s.mistakes === m0 + 2, JSON.stringify(s));

  // Place correct stickers -> deliver step
  s = await doStickers();
  check('stickers placed -> deliver step', s && s.step === 4 && s.canDeliver, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/04-level1-done.png' });

  // Deliver -> clear screen, 2 stars (2 mistakes)
  await page.click('#btn-deliver');
  await page.waitForTimeout(400);
  s = await state();
  check('deliver -> clear screen, stars 1 (3 mistakes), score 125', s && s.screen === 'clear' && s.starsEarned[0] === 1 && s.score === 125, JSON.stringify(s));
  await page.screenshot({ path: outdir + '/05-clear.png' });

  // Next -> level 2
  await page.click('#btn-next');
  await page.waitForTimeout(400);
  s = await state();
  check('next -> playing level 2', s && s.screen === 'playing' && s.level === 2, JSON.stringify(s));

  // Pause / resume / mute
  await page.click('#btn-pause'); await page.waitForTimeout(200); s = await state();
  check('pause -> paused', s.paused === true, JSON.stringify(s));
  await page.click('#btn-resume'); await page.waitForTimeout(200); s = await state();
  check('resume -> playing, not paused', s.screen === 'playing' && s.paused === false, JSON.stringify(s));
  await page.click('#btn-mute'); s = await state();
  check('mute toggles on', s.muted === true, JSON.stringify(s));
  await page.click('#btn-mute');

  // Levels overlay: pick level 1
  await page.click('#btn-levels'); await page.waitForTimeout(300);
  check('levels overlay opens', await page.locator('#ov-levels:not(.hidden)').count() === 1, '');
  await page.locator('#levels-grid .lv').nth(0).click(); await page.waitForTimeout(400);
  s = await state();
  check('level select -> level 1 playing', s && s.screen === 'playing' && s.level === 1, JSON.stringify(s));

  console.log(errors.length ? 'CONSOLE/PAGE ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
  const failed = results.filter(r => !r.ok).length;
  console.log('RESULT: ' + (results.length - failed) + '/' + results.length + ' checks passed');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
