// Game loop, input, save/load and the flow between dock -> cast -> haul.
(function (root) {
  'use strict';
  const KL = root.KL;
  const E = KL.Engine, R = KL.Render, UI = KL.UI, A = KL.Audio, Bot = KL.Bot;
  const { SPECIES, MUTATIONS, ZONES } = E.DATA;
  const KEY = 'kail.save.v1'; // kept from the working title so existing progress survives the rename
  const t = (k, v) => KL.t(k, v);

  const C = KL.SaveCodec;
  const ENC = KEY + '.enc'; // set once the browser copy is encoded; plain JSON after that is an edit

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        if (C.isEncoded(raw)) { const s = C.decode(raw); if (s) return E.migrate(s); }
        else if (!localStorage.getItem(ENC)) return E.migrate(JSON.parse(raw)); // save from before encoding
        localStorage.setItem(KEY + '.bad', raw); // changed by hand: keep it aside, start fresh
      }
    } catch (e) { /* fresh start */ }
    return E.newSave();
  }

  const g = {
    save: load(), stats: null, mode: 'dock', run: null, preview: null, haul: null,
    pondRate: 0, moon: false, sonar: false, cat: false, safeL: 0,
    target: null, manualT: 0, throw: null, lastX: null, pointer: { on: false, id: null, sx: 0, sy: 0 }, welcomed: false, keys: new Set(), lastSave: 0, autoT: 0, rateT: 0, landed: 0,
    zoneSeen: 0,

    refresh() {
      this.stats = E.stats(this.save);
      this.pondRate = E.pondRate(this.save);
      this.sonar = this.stats.sonar;
      this.cat = E.lv(this.save, 'cat') > 0;
    },
    persist() {
      this.save.lastSeen = Date.now();
      try { localStorage.setItem(KEY, C.encode(this.save)); localStorage.setItem(ENC, '1'); } catch (e) { /* storage full or blocked */ }
    },
    applySettings() {
      const st = this.save.settings;
      KL.setLang(st.lang || ((navigator.language || 'en').toLowerCase().startsWith('id') ? 'id' : 'en'));
      A.configure({ sound: st.sound, music: st.music });
      UI.translate();
      UI.hud();
      if (UI.layout) { UI.layout(); UI.lockOrientation(); }
      this.persist();
    },
    // The fish you see while docked are the fish of your next cast: the preview run *is* the next run.
    // keepSeed rebuilds the same sea after a purchase changed the stats; keep carries the fish
    // a finished cast left behind (E.carryOver), so collecting does not refill the whole sea.
    newPreview(keepSeed, keep) {
      const p = keepSeed ? this.preview : null;
      this.preview = E.newRun(this.save, { width: R.worldW, seed: p ? p.seed : undefined, keep: p ? p.keep : keep });
    },
    // the haul list shows value per row before the crate/bulk bonus; keep rows consistent with the total
    statsHaulMult(h) { return 1 + h.fullB + h.bulkB; },

    // tap on the sea: the gnome throws the hook there, and the cast starts where it lands
    cast(x) {
      if (this.mode !== 'dock' || UI.open || UI.menuOpen) return;
      this.refresh();
      if (!this.preview || this.preview.width !== R.worldW) this.newPreview();
      const w = R.worldW;
      const tx = Math.max(2, Math.min(w - 2, x != null ? x : this.lastX != null ? this.lastX : w * 0.5 + 10));
      this.lastX = tx;
      this.throw = { x: tx, t: 0, dur: 0.45 };
      this.mode = 'throw';
      UI.setMode('cast');
      UI.catchCount(0, this.stats.cap);
      UI.hint('');
      A.cast();
    },
    startRun() {
      const run = this.preview;
      this.preview = null;
      run.x = this.throw.x;
      this.throw = null;
      this.run = run;
      this.target = run.x;
      this.pointer.on = false;
      if (this.stickReset) this.stickReset();
      this.manualT = 0;
      this.mode = 'cast';
      this.moon = run.moon;
      R.startLine(run);
      R.ripple(run.x);
      R.burst(run.x, 1, 8);
      if (this.moon) UI.banner(t('moonNight'), '');
      if (this.save.casts < 3) UI.hint(t(UI.useStick() ? 'hintStick' : 'hintSteer'));
      KL.Music.activity = 1;
    },

    onEvent(ev) {
      const run = this.run;
      switch (ev.t) {
        case 'zone':
          if (ev.z > this.save.zone && ev.z > this.zoneSeen) {
            this.zoneSeen = ev.z;
            A.zone();
            UI.banner(t('newZone'), KL.name(ZONES[ev.z].name));
          }
          break;
        case 'hit':
          A.hit(); R.shake = 0.22; R.burst(run.x, run.y, 10);
          R.text(run.x, run.y, t('hit'), '#ff9a7a');
          this.buzz(35);
          break;
        case 'guard':
          A.guard(); R.burst(run.x, run.y, 6); R.text(run.x, run.y, t('guard'), '#b8a8ff');
          if (ev.o && ev.o.k === 'mine') R.boom(ev.o.x, ev.o.y, true);
          break;
        case 'sting':
          A.hit(); R.shake = 0.18; R.burst(run.x, run.y, 6);
          R.text(run.x, run.y, t('sting'), '#ff9a7a');
          this.buzz(35);
          break;
        case 'boom':
          A.hit(); A.bottom(); R.shake = 0.45; R.boom(ev.o.x, ev.o.y);
          R.text(ev.o.x, ev.o.y, t('boom'), '#ff6b3d', true);
          this.buzz(70);
          break;
        case 'lost':
          A.deny(); R.text(run.x, run.y, t('lost'), '#ff9a7a');
          UI.catchCount(run.caught.length, run.st.cap);
          break;
        case 'net': A.slow(); R.text(run.x, run.y, t('net'), '#e6d8bb'); break;
        case 'current': A.bubble(); R.text(run.x, run.y, t('current') + (ev.o.v > 0 ? ' >>' : ' <<'), '#8fd3e8'); break;
        case 'slow': A.slow(); R.text(run.x, run.y, t('slow'), '#8fd3e8'); break;
        case 'turn':
          if (ev.why === 'bottom') { A.bottom(); R.text(run.x, run.y, t('bottom'), '#f3ead7'); }
          if (this.save.casts < 3) UI.hint(t('hintCatch'));
          break;
        case 'catch': {
          const f = ev.f;
          const v = E.fishValue(this.save, run.st, f) * (f.twin ? 2 : 1);
          A.catchNote(ev.n, f.mut);
          R.burst(f.x, f.y, f.mut >= 0 ? 10 : 4);
          const label = f.mut >= 0 ? `${t(['mutBig', 'mutGold', 'mutPrism', 'mutTitan'][f.mut])}! +${KL.fmt(v)}` : `+${KL.fmt(v)}`;
          R.text(f.x, f.y, f.twin ? label + ' x2' : label, f.mut >= 1 ? '#ffd257' : f.mut === 0 ? '#9ad1ff' : '#f5b82e', f.mut >= 1);
          UI.catchCount(run.caught.length, run.st.cap);
          this.buzz(f.mut >= 1 ? 25 : 8);
          break;
        }
        case 'full': A.full(); R.text(run.x, run.y - 3, t('full'), '#ff6b3d', true); break;
        case 'surface': this.surface(); break;
      }
    },

    surface() {
      const run = this.run;
      A.surface();
      R.ripple(run.x);
      UI.hint('');
      this.haul = E.haul(this.save, run);
      this.landed = 0;
      run.caught.forEach((f, i) => R.fly(f, run.x, 0, i * Math.max(0.025, 0.08 - run.caught.length * 0.002)));
      this.mode = 'haul';
      UI.setMode('haul');
      KL.Music.activity = 0;
      const delay = Math.min(1.2, 0.35 + run.caught.length * 0.04);
      setTimeout(() => {
        UI.showHaul(this.haul, (m) => this.take(m));
        if (this.save.auto && this.stats.auto) this.autoT = 2.4;
      }, delay * 1000);
    },
    onLand() { A.coin(this.landed++); },

    take(mult) {
      if (this.mode !== 'haul') return;
      UI.hideHaul();
      this.autoT = 0;
      const h = this.haul;
      const { gained, fresh } = E.settle(this.save, h, mult);
      A.take(mult > 1 || h.items.some((i) => i.mut >= 1));
      UI.bump('coinPill');
      fresh.forEach((id, i) => setTimeout(() => {
        const sp = SPECIES[E.SP[id]];
        UI.toast(R.url(sp.sprite, sp.shadow ? 'shadow' : ''), t('newSpecies'), KL.name(sp.name));
        A.discover();
      }, 300 + i * 450));
      this.achCheck(300 + fresh.length * 450);
      this.mode = 'dock';
      const left = E.carryOver(this.run);
      this.run = null;
      this.refresh();
      this.newPreview(false, left);
      UI.setMode('dock');
      UI.hud();
      this.persist();
      if (this.save.auto && this.stats.auto) this.autoT = 1.2;
      return gained;
    },

    buzz(ms) { if (this.save.settings.haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* not allowed */ } },
    onBought() { this.refresh(); this.newPreview(true); this.achCheck(400); this.persist(); },
    onGear() { this.refresh(); this.newPreview(true); this.achCheck(400); this.persist(); },
    // unlocks achievements whose goal is met and shows them one after another
    achCheck(delay) {
      const s = this.save;
      E.markDay(s, new Date().toLocaleDateString('sv'), Date.now());
      const got = E.checkAch(s);
      // a pile of unlocks at once (an old save, a big jump) shows the rarest two and a summary
      const show = got.length > 3 ? got.slice().sort((x, y) => y.tier - x.tier).slice(0, 2) : got;
      show.forEach((a, i) => setTimeout(() => { UI.achToast(a); A.discover(); UI.bump('shellPill'); }, (delay || 0) + i * 700));
      if (got.length > show.length) setTimeout(() => UI.toast(null, t('achUnlocked'), t('achMore', { n: got.length - show.length })), (delay || 0) + show.length * 700);
      if (got.length) { UI.hud(); if (UI.open === 'book' && UI.paper === 'trophy') UI.renderTrophy(); }
      return got;
    },
    onSeason(gain) {
      this.refresh(); this.newPreview(true); this.achCheck(600); this.persist();
      UI.banner(t('season'), `+${gain} ${t('pearls')}`);
    },
    onScreenClosed() { this.refresh(); UI.hud(); if (this.save.auto && this.stats.auto && this.mode === 'dock') this.autoT = 1; },
    reset() {
      const settings = this.save.settings;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      this.save = E.newSave();
      this.save.settings = settings;
      this.zoneSeen = 0;
      this.refresh(); this.newPreview(); this.applySettings();
      UI.closeSheet('settings');
    },

    // ---------- save files ----------
    exportSave() {
      this.persist();
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      const data = C.encode({ game: 'gnome-line-sinker', v: 2, at: d.toISOString(), save: this.save });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' }));
      a.download = `gnome-line-sinker-${stamp}.sav`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      UI.toast(null, t('menuExport'), t('exportOk'));
    },
    importFile(file) {
      const bad = () => { A.deny(); UI.toast(null, t('menuImport'), t('importBad')); };
      file.text().then((txt) => {
        const obj = C.decode(txt);
        if (!obj) { bad(); return; } // plain JSON or a file that was changed
        const raw = obj.save;
        if (!raw || typeof raw !== 'object' || typeof raw.coins !== 'number' || !raw.nodes || typeof raw.nodes !== 'object') { bad(); return; }
        const apply = () => {
          this.save = E.migrate(raw);
          this.save.lastSeen = Date.now();
          this.zoneSeen = this.save.zone;
          this.refresh(); this.newPreview(); this.applySettings();
          UI.closeSheet('settings');
          if (UI.menuOpen) UI.openMenu();
          A.discover();
          UI.toast(null, t('menuImport'), t('importOk'));
        };
        if (UI.hasProgress()) {
          UI.modal(t('menuImport'), `<p>${t('importConfirm')}</p>`, [
            { label: t('back'), fn: () => {} },
            { label: t('menuImport'), cls: 'grow', icon: 'upload', fn: apply },
          ]);
        } else apply();
      }, bad);
    },
    onMenuClosed() {
      if (!this.welcomed) { this.welcomed = true; this.welcomeBack(); }
      if (this.save.auto && this.stats.auto && this.mode === 'dock') this.autoT = 1.5;
    },

    welcomeBack() {
      const s = this.save;
      if (!s.lastSeen) return;
      const away = (Date.now() - s.lastSeen) / 1000;
      if (away < 90 || !this.stats.pond) return;
      const off = E.offline(s, away);
      if (off.coins <= 0) return;
      const give = () => {
        s.coins += off.coins; s.seasonEarned += off.coins; s.lifetime += off.coins;
        A.take(false); UI.bump('coinPill'); UI.hud(); this.persist();
      };
      UI.modal(t('welcome'), `<p>${t('welcomeBody', { t: KL.fmtTime(off.seconds) })}</p>
        <div class="modal-big">${KL.ic('coin')}${KL.fmt(off.coins)}</div>
        ${off.capped ? `<p class="muted">${t('welcomeCap', { h: this.stats.offlineH })}</p>` : ''}`, [
        { label: t('take'), cls: 'btn-primary grow', icon: 'coin', fn: give },
      ]);
    },
  };

  // ---------- input ----------
  // Docked: tap the sea to cast there. Casting: the hook chases your finger or cursor (it lags
  // behind like a weight on a line); let go and it keeps going straight.
  const cv = document.getElementById('game');
  const toWorld = (cx, cy) => ({ x: (cx * R.dpr / R.S - R.ox) / E.PXM, y: R.camY + cy * R.dpr / R.S / E.PXM });
  cv.addEventListener('pointerdown', (e) => {
    if (g.mode === 'dock') {
      if (UI.open || UI.menuOpen) return;
      const w = toWorld(e.clientX, e.clientY);
      if (w.y > 0.5) g.cast(w.x);
      return;
    }
    if (g.mode !== 'cast') return;
    g.pointer = { on: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, touch: e.pointerType !== 'mouse' };
    g.manualT = 1.5;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', (e) => {
    if (g.mode !== 'cast') return;
    const p = g.pointer;
    if ((p.on && p.id === e.pointerId) || e.pointerType === 'mouse') {
      g.pointer = { on: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, touch: e.pointerType !== 'mouse' };
      g.manualT = 1.5;
    }
  });
  const endDrag = (e) => { if (g.pointer.id === e.pointerId && g.pointer.touch) g.pointer.on = false; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  // joystick: an analog stick for the thumb; x moves the hook sideways, y pulls it up or down
  const stickEl = document.getElementById('stick'), knob = stickEl.querySelector('.stick-knob');
  g.stick = { on: false, id: null, x: 0, y: 0 };
  const stickAt = (e) => {
    const r = stickEl.getBoundingClientRect(), rad = r.width / 2;
    let dx = (e.clientX - r.left - rad) / rad, dy = (e.clientY - r.top - rad) / rad;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    g.stick.x = dx; g.stick.y = dy;
    knob.style.transform = `translate(${dx * rad * 0.6}px, ${dy * rad * 0.6}px)`;
  };
  g.stickReset = () => {
    g.stick = { on: false, id: null, x: 0, y: 0 };
    knob.style.transform = '';
    stickEl.classList.remove('on');
  };
  const stickEnd = (e) => { if (g.stick.id === e.pointerId) g.stickReset(); };
  stickEl.addEventListener('pointerdown', (e) => {
    if (g.mode !== 'cast') return;
    e.preventDefault();
    g.stick.on = true; g.stick.id = e.pointerId; g.manualT = 1.5;
    try { stickEl.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    stickEl.classList.add('on');
    stickAt(e);
  });
  stickEl.addEventListener('pointermove', (e) => { if (g.stick.on && g.stick.id === e.pointerId) { stickAt(e); g.manualT = 1.5; } });
  stickEl.addEventListener('pointerup', stickEnd);
  stickEl.addEventListener('pointercancel', stickEnd);
  addEventListener('keydown', (e) => {
    g.keys.add(e.key.toLowerCase());
    if (e.key === ' ' || e.key === 'Enter') {
      if (g.mode === 'dock' && !UI.open && !UI.menuOpen) { e.preventDefault(); g.cast(); } else if (g.mode === 'haul' && UI.open === 'haul') { e.preventDefault(); g.take(1); }
    }
    if (e.key === 'Escape' && UI.menuOpen && !UI.open) { UI.closeMenu(); return; }
    if (e.key === 'Escape') { if (UI.open === 'tree' || UI.open === 'book') UI.closeScreens(); else if (UI.open === 'settings') UI.closeSheet('settings'); }
  });
  addEventListener('keyup', (e) => g.keys.delete(e.key.toLowerCase()));
  document.getElementById('castBtn').onclick = () => g.cast();
  document.getElementById('autoBtn').onclick = () => {
    g.save.auto = !g.save.auto;
    A.click();
    UI.toast(null, t('auto'), t(g.save.auto ? 'autoOn' : 'autoOff'));
    if (g.save.auto && g.mode === 'dock') g.autoT = 0.6;
    UI.hud(); g.persist();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) g.persist(); });
  addEventListener('pagehide', () => g.persist());

  // ---------- loop ----------
  let last = 0, hudT = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const s = g.save;
    s.playTime += dt;
    // fish pen income ticks all the time
    if (g.pondRate > 0) { const c = g.pondRate * dt; s.coins += c; s.seasonEarned += c; s.lifetime += c; }
    g.rateT -= dt;
    if (g.rateT <= 0) { g.rateT = 2; g.pondRate = E.pondRate(s); }

    if (g.mode === 'throw') {
      g.throw.t += dt;
      if (g.throw.t >= g.throw.dur) g.startRun();
    }
    if (g.mode === 'cast' && g.run) {
      const run = g.run;
      const sp = g.stats.steer * 1.1;
      const k = g.keys;
      let tgt = null;
      const kx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
      const ky = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
      // dead zone plus a squared curve: small pushes nudge the hook, only a full push moves it fast
      const st = g.stick, dead = (v) => (Math.abs(v) < 0.2 ? 0 : Math.sign(v) * ((Math.abs(v) - 0.2) / 0.8) ** 2);
      if (kx || ky) {
        g.pointer.on = false; g.manualT = 1.5;
        g.target = Math.max(1, Math.min(R.worldW - 1, g.target + kx * sp * dt));
        tgt = ky ? { x: g.target, y: run.y + ky * 12 } : g.target;
      } else if (st.on) {
        const jx = dead(st.x), jy = dead(st.y);
        g.pointer.on = false; g.manualT = 1.5;
        // the aim never runs far ahead of the hook, so letting go stops it close to where it is
        g.target = Math.max(run.x - 5, Math.min(run.x + 5, g.target + jx * sp * 0.75 * dt));
        g.target = Math.max(1, Math.min(R.worldW - 1, g.target));
        tgt = jy ? { x: g.target, y: run.y + jy * 8 } : g.target;
      } else if (g.pointer.on) {
        tgt = toWorld(g.pointer.sx, g.pointer.sy);
        g.target = tgt.x;
      } else tgt = g.target;
      g.manualT -= dt;
      if (s.auto && g.stats.auto && g.manualT <= 0) { tgt = Bot.steer(run, g.stats.autoSkill, dt); g.target = tgt; }
      E.stepRun(run, dt, tgt);
      UI.lineLeft(run.phase === 'down' ? E.lineLeft(run) : -1, E.lineLeft(run) / run.st.line);
      for (const ev of run.events.slice()) g.onEvent(ev);
    } else if (g.preview) {
      for (const f of g.preview.fish) {
        f.x += f.vx * dt; f.ph += dt * 2.5;
        if (f.x < -3) f.x = R.worldW + 3; else if (f.x > R.worldW + 3) f.x = -3;
      }
    }
    if (g.mode === 'dock' && g.autoT > 0 && !UI.open && !UI.menuOpen) { g.autoT -= dt; if (g.autoT <= 0 && s.auto && g.stats.auto) g.cast(); }
    if (g.mode === 'haul' && g.autoT > 0 && UI.open === 'haul') { g.autoT -= dt; if (g.autoT <= 0) g.take(1); }

    const mid = R.frame(g, dt);
    const depth = g.mode === 'cast' && g.run ? g.run.y : Math.max(0, mid);
    A.setDepth(Math.min(1, Math.pow(depth / 1400, 0.7)));
    KL.Music.mood = depth > 200 ? 'deep' : 'sun';
    if (g.mode === 'dock' && Math.random() < dt / 25) A.gull();

    hudT -= dt;
    if (hudT <= 0) { hudT = 0.12; UI.hud(); }
    if (now - g.lastSave > 5000) { g.lastSave = now; if (g.mode !== 'cast') g.achCheck(); g.persist(); if (KL.Global) KL.Global.tick(g.save); }
    requestAnimationFrame(loop);
  }

  // ---------- boot ----------
  const img = new Image();
  img.src = KL.ATLAS_PNG || 'img/atlas.png';
  const fonts = document.fonts ? document.fonts.load('600 16px Pixelify').catch(() => {}) : Promise.resolve();
  Promise.all([new Promise((r) => { img.onload = r; img.onerror = r; }), fonts]).then(() => {
    R.init(cv, img);
    g.safeL = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-l')) || 0;
    g.refresh();
    UI.g = g;
    g.applySettings();
    UI.init(g);
    g.zoneSeen = g.save.zone;
    g.newPreview();
    UI.setMode('dock');
    UI.hud();
    UI.openMenu();
    KL.Update.onOutdated = (v) => {
      if (UI.menuOpen) UI.updateNotice();
      document.getElementById('menuBadge').classList.remove('hidden');
      if (!UI.menuOpen) UI.toast(null, t('updateNew') + ' (v' + v + ')', t('updateHow'));
    };
    KL.Update.start();
    E.markDay(g.save, new Date().toLocaleDateString('sv'), Date.now());
    E.checkAch(g.save);
    if (g.save.seenAch == null) g.save.seenAch = 0;
    g.persist();
    requestAnimationFrame((n) => { last = n; loop(n); });
  });

  // test hook (smoke tests and screenshots)
  root.__kail = {
    g, E,
    give(coins, pearls) { g.save.coins += coins || 0; if (pearls) { g.save.pearls += pearls; g.save.pearlsEver += pearls; } g.refresh(); UI.hud(); },
    setNodes(map) { Object.assign(g.save.nodes, map); g.refresh(); UI.hud(); },
    cast: (x) => g.cast(x),
    shells(n) { E.addShells(g.save, n); UI.hud(); },
    rec(map) { Object.assign(g.save.rec, map); g.achCheck(); UI.hud(); },
  };
})(this);
