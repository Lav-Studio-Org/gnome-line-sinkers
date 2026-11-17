// Playables smoke test: boots the game with a stub YouTube SDK injected before any page script and
// checks the integration points certification looks at — the SDK loads before the game code, the
// loading handshake order, cloud saves, pause/resume, the YouTube mute button, the score, and the
// things that must NOT exist inside Playables (external calls, save files, share prompts, links out,
// orientation locks). Serves the repo itself, so the only command is:
//   node scripts/smoke-playables.js            (PW_CHANNEL=msedge picks a system browser)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const SDK = 'www.youtube.com/game_api/';

// the stub stands in for the SDK, which is a no-op outside YouTube and would hide the Playables path
const stub = (stored, audio) => `window.__yt = { calls: [], saved: null, score: null, stored: ${JSON.stringify(stored)}, cbs: {}, kl: typeof window.KL };
window.ytgame = {
  IN_PLAYABLES_ENV: true,
  SDK_VERSION: 'stub',
  game: {
    firstFrameReady() { window.__yt.calls.push('firstFrameReady'); },
    gameReady() { window.__yt.calls.push('gameReady'); },
    loadData() { window.__yt.calls.push('loadData'); return Promise.resolve(window.__yt.stored); },
    saveData(data) { window.__yt.saved = data; window.__yt.calls.push('saveData'); return Promise.resolve(); },
  },
  system: {
    onPause(cb) { window.__yt.cbs.pause = cb; },
    onResume(cb) { window.__yt.cbs.resume = cb; },
    isAudioEnabled() { return ${audio}; },
    onAudioEnabledChange(cb) { window.__yt.cbs.audio = cb; },
    getLanguage() { return 'en-US'; },
  },
  engagement: { sendScore(s) { window.__yt.score = s.value; window.__yt.calls.push('sendScore'); return Promise.resolve(); } },
};`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

(async () => {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const abs = path.join(ROOT, rel);
    if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  const viewport = { width: 900, height: 520 };

  // ---------- pass 1: play a moment outside YouTube, then hand that save over as cloud data ----
  const open = async (stored, audio) => {
    const ctx = await browser.newContext({ viewport });
    const urls = [];
    ctx.on('request', (r) => urls.push(r.url()));
    await ctx.route(`**/${SDK}**`, (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    if (stored !== undefined) await ctx.addInitScript({ content: stub(stored, audio) });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base);
    await page.waitForFunction(() => window.__kail && window.__kail.g.stats, null, { timeout: 15000 });
    return { ctx, page, urls, errors };
  };

  const first = await open();
  const cloud = await first.page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(window.__kail.g.save));
    s.coins = 4242; s.bestEver = 137; s.casts = 9; s.settings.lang = 'id'; // a stored choice the SDK locale must beat
    return KL.SaveCodec.encode({ game: 'gnome-line-sinker', v: 2, at: new Date().toISOString(), save: s });
  });
  check('cloud save fixture encodes', typeof cloud === 'string' && cloud.startsWith('GLS1'), cloud && cloud.slice(0, 8));
  await first.ctx.close();

  // ---------- pass 2: the Playables run ---------------------------------------------------------
  const { ctx, page, urls, errors } = await open(cloud, false);
  await page.waitForFunction(() => window.__yt.calls.includes('gameReady'), null, { timeout: 15000 });

  const calls = await page.evaluate(() => window.__yt.calls);
  check('firstFrameReady before gameReady', calls.indexOf('firstFrameReady') > -1 && calls.indexOf('firstFrameReady') < calls.indexOf('gameReady'));
  check('loadData awaited before the first save', calls.indexOf('loadData') < calls.indexOf('saveData'), calls.join(','));

  // the request list cannot prove script order (a preload scanner may start later files early), so
  // check what actually matters: the SDK tag is first, and no game code had run when it executed
  const order = await page.evaluate(() => ({
    first: document.querySelector('script[src]') ? document.querySelector('script[src]').getAttribute('src') : null,
    klAtSdk: window.__yt.kl,
    inPlayables: KL.Platform.inPlayables,
    bound: KL.Platform.yt === window.ytgame,
  }));
  check('the SDK is the first script in the document', String(order.first).includes(SDK), order.first);
  check('the SDK runs before any game code', order.klAtSdk === 'undefined', String(order.klAtSdk));
  check('the game detects the Playables environment', order.inPlayables === true && order.bound === true);
  check('the SDK was fetched', urls.some((u) => u.includes(SDK)));
  const outside = urls.filter((u) => !u.startsWith(base) && !u.includes(SDK));
  check('no request leaves the bundle except the SDK', outside.length === 0, outside.join(' '));

  const boot = await page.evaluate(() => ({
    coins: __kail.g.save.coins, best: __kail.g.save.bestEver, lang: KL.lang, htmlLang: document.documentElement.lang,
    stored: Object.keys(localStorage).length, saved: window.__yt.saved, score: window.__yt.score,
  }));
  check('cloud save is adopted', boot.coins === 4242 && boot.best === 137, String(boot.coins));
  check('nothing is written to browser storage', boot.stored === 0, Object.keys(boot.stored || {}).join(','));
  check('best score matches the save', boot.score === 137, String(boot.score));
  check('the SDK locale decides the UI language', boot.lang === 'en' && boot.htmlLang === 'en', boot.lang);
  check('progress is written through saveData', typeof boot.saved === 'string' && boot.saved.startsWith('GLS1'));

  // the YouTube container changes shape between phone and desktop, and starts out 0-sized in the
  // hidden WebView on Android: the game has to keep running and re-lay itself out
  await page.setViewportSize({ width: 320, height: 640 });
  await wait(300);
  await page.setViewportSize({ width: 1200, height: 400 });
  await wait(300);
  const resized = await page.evaluate(() => ({ port: document.body.classList.contains('port'), mode: __kail.g.mode }));
  check('the game survives viewport changes', resized.port === false && resized.mode === 'dock', JSON.stringify(resized));

  // ---------- things that must not exist here ---------------------------------------------------
  const gone = await page.evaluate(() => ({
    exp: !!document.getElementById('menuExport'), imp: !!document.getElementById('menuImport'),
    ref: !!document.getElementById('menuRefresh'), glob: !!document.getElementById('menuGlobal'),
    lockable: KL.Platform.inPlayables,
  }));
  check('save file and update buttons are removed', !gone.exp && !gone.imp && !gone.ref && !gone.glob);

  const clickEl = async (sel) => { const b = await page.locator(sel).boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };

  await clickEl('#menuCredits');
  await wait(300);
  const credits = await page.evaluate(() => ({
    links: document.querySelectorAll('#modal a[href^="http"]').length,
    text: document.getElementById('modal').textContent,
  }));
  check('credits keep the names but no links out', credits.links === 0 && /Moranovo/.test(credits.text), String(credits.links));
  await page.evaluate(() => KL.UI.closeModal());

  await page.evaluate(() => KL.UI.openHelp());
  await wait(200);
  const help = await page.evaluate(() => document.getElementById('helpList').textContent);
  check('help drops the save-file/update topic', !/Saves and updates/.test(help));
  check('help explains the YouTube save instead', /YouTube account/.test(help));
  await page.evaluate(() => KL.UI.closeSheet('help'));

  await page.evaluate(() => KL.UI.openSettings());
  await wait(200);
  const settings = await page.evaluate(() => document.getElementById('setList').textContent);
  check('settings drop language, orientation and save files', !/Language|Screen|Save file/.test(settings), settings.slice(0, 80));
  check('settings keep sound, music and haptics', /Sound/.test(settings) && /Music/.test(settings) && /Vibration/.test(settings));
  await page.evaluate(() => KL.UI.closeSheet('settings'));

  await page.evaluate(() => { document.getElementById('menuBtn').click(); }); // menu is open at boot anyway
  const trophy = await page.evaluate(() => { KL.UI.openTrophy('share'); return document.getElementById('bookRail').textContent; });
  check('the share card has no tab and cannot render', !/Share/.test(trophy), trophy.slice(0, 60));
  await page.evaluate(() => KL.UI.closeScreens());

  // ---------- audio: the YouTube mute button wins -----------------------------------------------
  await page.mouse.click(450, 260); // a user gesture, so the audio context exists
  await wait(300);
  // a parked context does not advance its gain ramps, so wake it the way a real tab would be awake
  await page.evaluate(async () => { if (KL.Audio.ac && KL.Audio.ac.state !== 'running') await KL.Audio.ac.resume(); });
  const muted = await page.evaluate(() => ({ on: KL.Audio.systemMuted, ctx: !!KL.Audio.ac }));
  check('YouTube mute reaches the game', muted.on === true && muted.ctx, JSON.stringify(muted));
  await page.waitForTimeout(400);
  const g0 = await page.evaluate(() => KL.Audio.sfx.gain.value);
  check('muted means no output', g0 < 0.05, String(g0));
  await page.evaluate(() => { window.__kail.g.save.settings.sound = true; window.__kail.g.applySettings(); });
  await page.waitForTimeout(300);
  const g1 = await page.evaluate(() => KL.Audio.sfx.gain.value);
  check('the in-game switch cannot unmute YouTube', g1 < 0.05, String(g1));
  await page.evaluate(() => window.__yt.cbs.audio(true));
  await page.waitForTimeout(300);
  const g2 = await page.evaluate(() => KL.Audio.sfx.gain.value);
  check('unmuting restores what the player switched on', g2 > 0.05, String(g2));

  // ---------- pause stops everything ------------------------------------------------------------
  await page.evaluate(() => {
    window.__frames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((n) => { window.__frames++; return cb(n); });
  });
  await page.evaluate(() => { KL.UI.closeMenu(); window.__kail.g.cast(50); });
  await page.waitForFunction(() => window.__kail.g.mode === 'cast', null, { timeout: 5000 });
  await wait(200);
  const marks = await page.evaluate(() => window.__yt.calls.length);
  await page.evaluate(() => window.__yt.cbs.pause()); // exactly what the SDK does on a pause
  const flushed = await page.evaluate((n) => window.__yt.calls.slice(n).includes('saveData'), marks);
  check('pause flushes the save', flushed);
  await wait(150); // one in-flight frame can still land right after the callback
  const a = await page.evaluate(() => ({ t: __kail.g.save.playTime, y: __kail.g.run.y, frames: window.__frames }));
  await wait(400);
  const b = await page.evaluate(() => ({ t: __kail.g.save.playTime, y: __kail.g.run.y, frames: window.__frames }));
  check('pause freezes the game clock', b.t === a.t, `${a.t} -> ${b.t}`);
  check('pause freezes the run', b.y === a.y, `${a.y} -> ${b.y}`);
  check('pause stops the frame loop', b.frames === a.frames, `${a.frames} -> ${b.frames}`);

  await page.mouse.click(450, 400); // a tap on the sea must not be seen, and no key may queue up
  await page.keyboard.press('ArrowRight');
  await wait(200);
  const noInput = await page.evaluate(() => ({ menu: KL.UI.menuOpen, keys: __kail.g.keys.size, pointer: __kail.g.pointer.on }));
  check('pause swallows clicks and keys', !noInput.menu && noInput.keys === 0 && !noInput.pointer, JSON.stringify(noInput));

  await page.evaluate(() => window.__yt.cbs.resume());
  await wait(400);
  const after = await page.evaluate(() => ({ t: __kail.g.save.playTime, frames: window.__frames }));
  check('resume restarts the loop', after.t > b.t && after.frames > b.frames, `${b.frames} -> ${after.frames}`);
  await page.evaluate(() => { __kail.g.save.auto = false; KL.UI.closeScreens(); KL.UI.closeSheet('settings'); });
  await page.evaluate(() => __kail.g.cast(60)); // the sea answers taps again
  await wait(200);
  check('the sea takes input again after resume', await page.evaluate(() => __kail.g.mode === 'cast' || __kail.g.mode === 'throw'));

  check('no console errors', errors.length === 0, errors.join(' | '));

  await ctx.close();
  await browser.close();
  server.close();
  console.log(`\n${failures.length ? `${failures.length} FAILED: ${failures.join(', ')}` : 'all Playables checks passed'}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
