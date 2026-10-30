// Browser smoke test: loads the game in landscape phone size, plays casts, opens every screen,
// fails on any console error. Saves screenshots when a folder is given.
// Usage: node scripts/smoke.js http://localhost:8124/ [shots-dir]
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8124/';
const shots = process.argv[3];
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__kail && window.__kail.g.stats);
  await page.waitForTimeout(600);
  const shot = async (name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: `${shots}/${name}.png` }); } };
  await shot('0-menu');
  await page.click('#menuPlay');
  await page.waitForTimeout(300);
  await shot('1-dock');
  const sea = { x: 560, y: 330 }; // a point on the water, right of the boat

  // play two casts by hand-ish: cast, steer with the bot until the haul shows, collect
  for (let i = 0; i < 2; i++) {
    const before = await page.evaluate(() => { const p = window.__kail.g.preview; window.__prev = p; return p.fish.length; });
    await page.mouse.click(sea.x, sea.y);
    if (i === 0) { await page.waitForTimeout(200); await shot('1b-throw'); }
    await page.waitForFunction(() => window.__kail.g.mode === 'cast');
    // the sea you saw while docked is the sea you cast into
    const same = await page.evaluate(() => window.__kail.g.run === window.__prev);
    if (!same || !before) errors.push('cast run is not the previewed run');
    await page.evaluate(() => { const k = window.__kail; k.g.save.auto = true; k.g.stats.auto = true; k.g.stats.autoSkill = 0.8; });
    if (i === 1) {
      // steer by hand for a moment: the hook chases the cursor
      for (let k = 0; k < 6; k++) { await page.mouse.move(300 + k * 40, 300); await page.waitForTimeout(80); }
      await shot('2-cast');
    }
    await page.waitForSelector('#haul.open', { timeout: 30000 });
    await page.waitForTimeout(900);
    if (i === 1) await shot('3-haul');
    await page.evaluate(() => { window.__kail.g.save.auto = false; });
    await page.click('#haulTake');
    await page.waitForTimeout(300);
  }
  const s1 = await page.evaluate(() => ({ coins: window.__kail.g.save.coins, casts: window.__kail.g.save.casts }));
  if (s1.casts !== 2) errors.push('expected 2 casts, got ' + s1.casts);

  // mid-game state for screenshots of the deep sea, the tree and the book
  await page.evaluate(() => {
    const k = window.__kail;
    k.setNodes({ line1: 5, line2: 5, line3: 4, cap1: 5, cap2: 4, cap3: 2, val1: 8, val2: 4, reel1: 4, guard: 3, steer: 2, sink1: 3, pond1: 1, pond2: 3, luck1: 4, eye: 2, goldsc: 1, sonar: 1, reach1: 3, full: 2, junk: 1, auto: 1, fall1: 1 });
    k.give(2e6);
    for (const sp of k.E.DATA.SPECIES.slice(0, 22)) k.g.save.caught[sp.id] = 12;
    k.g.save.variants['clown:gold'] = 1; k.g.save.zone = 3; k.g.save.bestEver = 380;
  });
  await page.click('#treeBtn');
  await page.waitForTimeout(500);
  await shot('4-tree');
  // buy whatever is selected
  await page.evaluate(() => { const b = document.getElementById('buyBtn'); b && b.click(); });
  await page.click('#treeClose');
  await page.click('#bookBtn');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelectorAll('.rail-btn')[1].click(); });
  await page.waitForTimeout(200);
  await shot('5-book');
  await page.click('#bookClose');
  await page.mouse.click(sea.x, sea.y);
  await page.evaluate(() => { const k = window.__kail; k.g.save.auto = true; k.g.stats.autoSkill = 0.9; });
  await page.waitForFunction(() => window.__kail.g.run && window.__kail.g.run.y > 300, null, { timeout: 30000 });
  await shot('6-deep');
  await page.waitForFunction(() => window.__kail.g.run && window.__kail.g.run.phase === 'up' && window.__kail.g.run.caught.length > 2, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  await shot('7-reel');
  await page.waitForSelector('#haul.open', { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#haulTake');
  await page.waitForTimeout(400);
  // achievements from the first cast, the trophy room, the share card and the shop
  const ach = await page.evaluate(() => Object.keys(window.__kail.g.save.ach).length);
  if (!ach) errors.push('no achievement after the first casts');
  await page.click('#trophyBtn');
  await page.waitForTimeout(300);
  await shot('11-trophies');
  await page.evaluate(() => { document.querySelectorAll('.rail-btn')[1].click(); });
  await page.waitForTimeout(200);
  await shot('12-activity');
  await page.evaluate(() => { document.querySelectorAll('.rail-btn')[2].click(); });
  await page.waitForSelector('.share-img');
  const card = await page.evaluate(() => { const i = document.querySelector('.share-img'); return [i.naturalWidth, i.naturalHeight]; });
  if (card[0] !== 1080 || card[1] !== 1350) errors.push('share card size ' + card);
  const [png] = await Promise.all([page.waitForEvent('download'), page.click('#shareSave')]);
  if (!/\.png$/.test(png.suggestedFilename())) errors.push('share image name ' + png.suggestedFilename());
  await shot('13-share');
  await page.click('#bookClose');
  await page.evaluate(() => window.__kail.shells(40));
  await page.click('#shopBtn');
  await page.waitForTimeout(300);
  await page.click('.card.gear [data-act=buy]');
  await page.waitForTimeout(200);
  await shot('14-shop');
  const skin = await page.evaluate(() => window.__kail.g.save.gear.skin);
  if (skin === 'classic') errors.push('buying an outfit did not put it on');
  await page.click('#bookClose');
  await page.waitForTimeout(200);
  // save to file and load it back
  const casts = await page.evaluate(() => window.__kail.g.save.casts);
  await page.click('#menuBtn');
  await page.waitForTimeout(300);
  await shot('9-menu-progress');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#menuExport')]);
  const file = (shots || '/tmp') + '/save.json';
  await dl.saveAs(file);
  await page.evaluate(() => { window.__kail.g.save.casts = 999; });
  await page.setInputFiles('#importFile', file);
  await page.waitForSelector('#modalBtns .grow');
  await page.click('#modalBtns .grow');
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => window.__kail.g.save.casts);
  if (back !== casts) errors.push(`import gave casts ${back}, expected ${casts}`);
  await page.click('#menuCredits');
  await page.waitForTimeout(300);
  await shot('10-credits');
  await page.click('#modalBtns .grow');
  await page.click('#menuPlay');
  await page.waitForTimeout(300);
  await page.click('#setBtn');
  await page.waitForTimeout(300);
  await shot('8-settings');
  console.log(JSON.stringify(await page.evaluate(() => ({ coins: Math.round(window.__kail.g.save.coins), casts: window.__kail.g.save.casts, mode: window.__kail.g.mode }))));
  // portrait phone: bottom bar, panning camera, a full cast
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const pp = await pctx.newPage();
  pp.on('pageerror', (e) => errors.push('portrait: ' + e));
  await pp.goto(url);
  await pp.waitForFunction(() => window.__kail && window.__kail.g.stats);
  await pp.click('#menuPlay');
  if (!(await pp.evaluate(() => document.body.classList.contains('port')))) errors.push('portrait layout not applied');
  await pp.touchscreen.tap(300, 500);
  await pp.evaluate(() => { const k = window.__kail; k.g.save.auto = true; k.g.stats.autoSkill = 0.9; k.g.manualT = 0; });
  await pp.waitForSelector('#haul.open', { timeout: 30000 });
  await pp.waitForTimeout(500);
  await pp.screenshot({ path: (shots || '/tmp') + '/15-portrait-haul.png' });
  await pp.click('#haulTake');
  await pctx.close();
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
  console.log('smoke ok');
})();
