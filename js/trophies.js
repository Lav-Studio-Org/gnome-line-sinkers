// Trophy room (achievements, activity stats, share card) and the shop for gnome outfits and
// boats. Both use the paper screen layout of the fishdex (#book), so they look like one family.
(function (root) {
  'use strict';
  const KL = root.KL;
  const UI = KL.UI;
  const E = KL.Engine;
  const { SPECIES, MUTATIONS, ZONES, ACH, SHELL_PAY, GEAR } = E.DATA;
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => KL.t(k, v);
  const ic = KL.ic;
  const TIER_COL = ['var(--paper-3)', 'var(--sea)', 'var(--pearl)', 'var(--gold)', 'var(--accent)'];
  const TIER_HEX = ['#cdb995', '#8fd3e8', '#b8a8ff', '#f5b82e', '#ff6b3d'];
  // public address of the game, for share texts (empty until it is hosted)
  const SHARE_URL = 'https://gnome.assamimuzaki.work/';

  const fishVar = (mut, sp) => (mut === 1 ? 'gold' : mut === 2 ? 'prism2' : sp && sp.shadow ? 'shadow' : '');
  const inl = (name, acc) => ic(name).replace('class="ic"', `class="ic" style="display:inline;width:1em;height:1em;vertical-align:-2px;--acc:${acc}"`);

  Object.assign(UI, {
    // ---------- shared paper screen ----------
    paperOpen(kind) {
      if (this.g.mode === 'cast' || this.g.mode === 'throw') return false;
      this.closeSheet('settings');
      this.open = 'book';
      this.paper = kind;
      $('book').classList.add('open');
      $('book').setAttribute('aria-hidden', 'false');
      $('book').dataset.kind = kind;
      return true;
    },
    railButtons(title, tabs, cur, pick) {
      const rail = $('bookRail');
      rail.innerHTML = `<h2 style="color:var(--paper);padding:4px 10px 8px">${title}</h2>`;
      for (const tb of tabs) {
        const b = document.createElement('button');
        b.className = 'rail-btn' + (tb.id === cur ? ' on' : '');
        b.innerHTML = `${ic(tb.icon).replace('class="ic"', 'class="ic rail-ic"')}<span>${tb.label}</span><small>${tb.small || ''}</small>`;
        b.onclick = () => { KL.Audio.click(); pick(tb.id); };
        rail.appendChild(b);
      }
    },

    // ---------- trophies ----------
    openTrophy(tab) {
      if (!this.paperOpen('trophy')) return;
      this.trophyTab = tab || this.trophyTab || 'ach';
      this.g.save.seenAch = Object.keys(this.g.save.ach).length;
      this.renderTrophy();
    },
    renderTrophy() {
      const s = this.g.save;
      const got = Object.keys(s.ach).length;
      this.railButtons(t('trophy'), [
        { id: 'ach', icon: 'trophy', label: t('achievements'), small: `${got}/${ACH.length}` },
        { id: 'stats', icon: 'chart', label: t('activity') },
        { id: 'share', icon: 'share', label: t('share') },
      ], this.trophyTab, (id) => { this.trophyTab = id; this.renderTrophy(); });
      const grid = $('bookGrid');
      grid.className = 'book-grid';
      grid.innerHTML = '';
      if (this.trophyTab === 'ach') this.renderAch(grid);
      else if (this.trophyTab === 'stats') this.renderStats(grid);
      else this.renderShare(grid);
    },
    achDesc(a) {
      const goal = E.achGoal(a);
      const n = a.k === 'time' ? KL.fmtTime(goal) : a.k === 'coins' ? KL.fmt(goal) : KL.fmt(goal);
      return t('a_' + a.k, { n });
    },
    renderAch(grid) {
      const s = this.g.save;
      $('bookTitle').textContent = t('achievements');
      const tierN = SHELL_PAY.map((_, i) => ACH.filter((a) => a.tier === i && s.ach[a.id]).length + '/' + ACH.filter((a) => a.tier === i).length);
      $('bookSub').innerHTML = tierN.map((n, i) => `<span class="tier-chip" style="--tc:${TIER_COL[i]}">${t('tier' + i)} ${n}</span>`).join('');
      for (const a of ACH) {
        const done = !!s.ach[a.id];
        const p = E.achProgress(s, a);
        const v = E.achValue(s, a.k), goal = E.achGoal(a);
        const shown = a.k === 'time' ? `${KL.fmtTime(Math.min(v, goal))}` : `${KL.fmt(Math.min(v, goal))} / ${KL.fmt(goal)}`;
        const card = document.createElement('div');
        card.className = 'card ach' + (done ? ' done' : '');
        card.style.setProperty('--tc', TIER_COL[a.tier]);
        card.innerHTML = `<div class="ach-ic">${ic(done ? a.icon : 'lock')}</div>
          <span class="nm">${KL.name(a.name)}</span>
          <span class="meta">${this.achDesc(a)}</span>
          <div class="ach-foot"><span class="tier-tag">${t('tier' + a.tier)}</span>
            ${done ? `<span class="ach-ok">${inl('check', 'var(--green)')} ${new Date(s.ach[a.id]).toLocaleDateString(KL.lang === 'id' ? 'id-ID' : 'en-GB')}</span>`
              : `<span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span><small>${shown}</small>`}
            <span class="ach-pay">${inl('shell', 'var(--shell)')}${SHELL_PAY[a.tier]}</span></div>`;
        grid.appendChild(card);
      }
      $('bookHint').textContent = t('achHint');
    },

    // lifetime numbers people like to look at
    statList() {
      const s = this.g.save, r = s.rec;
      const loc = KL.lang === 'id' ? 'id-ID' : 'en-GB';
      const fav = Object.keys(s.caught).filter((id) => !SPECIES[E.SP[id]].junk).sort((a, b) => s.caught[b] - s.caught[a])[0];
      const km = r.metres >= 1000 ? `${(r.metres / 1000).toFixed(1)} km` : `${KL.fmt(r.metres)} m`;
      return {
        fav, list: [
          ['timer', 'st_play', KL.fmtTime(s.playTime)],
          ['hook', 'st_fishing', KL.fmtTime(r.castTime)],
          ['fish', 'st_fish', KL.fmt(r.fish)],
          ['hook', 'st_casts', KL.fmt(s.casts)],
          ['target', 'st_deep', `${KL.fmt(s.bestEver)} m`],
          ['rope', 'st_metres', km],
          ['book', 'st_species', `${Object.keys(s.caught).length} / ${SPECIES.length}`],
          ['gem', 'st_variants', `${Object.keys(s.variants).length} / ${E.achGoal(ACH.find((a) => a.id === 'varAll'))}`],
          ['coin', 'st_coins', KL.fmt(s.lifetime)],
          ['crate', 'st_bestHaul', KL.fmt(r.bestHaul)],
          ['stack', 'st_haulFish', KL.fmt(r.bestHaulFish)],
          ['crate', 'st_full', KL.fmt(r.full)],
          ['scale', 'st_gold', KL.fmt(r.mut[1])],
          ['sparkle', 'st_prism', KL.fmt(r.mut[2])],
          ['crown', 'st_titan', KL.fmt(r.mut[3])],
          ['recycle', 'st_junk', KL.fmt(r.junk)],
          ['bolt', 'st_boom', KL.fmt(r.boom)],
          ['help', 'st_sting', KL.fmt(r.sting)],
          ['fish', 'st_lost', KL.fmt(r.lost)],
          ['moon', 'st_moon', KL.fmt(r.moon)],
          ['sparkle', 'st_days', KL.fmt(r.days)],
          ['pearl', 'st_seasons', KL.fmt(s.seasons)],
          ['pearl', 'st_pearls', KL.fmt(s.pearlsEver)],
          ['shell', 'st_shells', KL.fmt(s.shellsEver)],
          ['trophy', 'st_ach', `${Object.keys(s.ach).length} / ${ACH.length}`],
          ['timer', 'st_since', r.first ? new Date(r.first).toLocaleDateString(loc) : '-'],
        ],
      };
    },
    renderStats(grid) {
      const s = this.g.save, r = s.rec;
      $('bookTitle').textContent = t('activity');
      $('bookSub').textContent = `${t('seasonN')} ${s.seasons + 1} · ${KL.name(ZONES[s.zone].name)}`;
      grid.className = 'book-grid stat-grid';
      const { fav, list } = this.statList();
      const big = [];
      if (r.bestFish && E.SP[r.bestFish.sp] != null) {
        const sp = SPECIES[E.SP[r.bestFish.sp]];
        big.push(`<div class="card stat-big"><img class="spr" src="${KL.Render.url(sp.sprite, fishVar(r.bestFish.mut, sp))}" alt="">
          <span class="meta">${t('st_bestFish')}</span><span class="nm">${KL.name(sp.name)}${r.bestFish.mut >= 0 ? ' · ' + KL.name(MUTATIONS[r.bestFish.mut].name) : ''}</span>
          <span class="meta">${inl('coin', 'var(--gold)')} ${KL.fmt(r.bestFish.value)}</span></div>`);
      }
      if (fav) {
        const sp = SPECIES[E.SP[fav]];
        big.push(`<div class="card stat-big"><img class="spr" src="${KL.Render.url(sp.sprite, sp.shadow ? 'shadow' : '')}" alt="">
          <span class="meta">${t('st_fav')}</span><span class="nm">${KL.name(sp.name)}</span><span class="meta">${KL.fmt(s.caught[fav])} ${t('caught')}</span></div>`);
      }
      grid.innerHTML = big.join('') + list.map(([icon, k, v]) =>
        `<div class="stat">${ic(icon)}<small>${t(k)}</small><b>${v}</b></div>`).join('');
      $('bookHint').textContent = '';
    },

    // the whole sea on the start menu: totals from every player (js/global.js), a show-off for
    // whoever opens the game; hidden when the counter is off or has never answered
    renderMenuGlobal() {
      const box = $('menuGlobal'), G = KL.Global;
      if (!box) return;
      if (!G || !G.enabled) { box.classList.add('hidden'); return; }
      const d = G.data;
      const v = (n) => (d ? KL.fmt(n || 0) : '...');
      box.innerHTML = `<b>${ic('globe')}${t('g_head')}</b>
        <div class="g-big"><small>${t('g_fish')}</small><span>${v(d && d.fish)}</span></div>
        <div><small>${t('g_players')}</small><span>${v(d && d.players)}</span></div>
        <div><small>${t('g_casts')}</small><span>${v(d && d.casts)}</span></div>
        <div><small>${t('g_deep')}</small><span>${d ? KL.fmt(d.deep || 0) + ' m' : '...'}</span></div>`;
      box.classList.remove('hidden');
      if (G.busyStats) return;
      G.busyStats = true;
      G.stats().then((nd) => {
        G.busyStats = false;
        if (!this.menuOpen) return;
        if (!nd) { box.classList.add('hidden'); return; }
        if (nd !== d) this.renderMenuGlobal();
      });
    },

    // ---------- share card ----------
    renderShare(grid) {
      $('bookTitle').textContent = t('share');
      $('bookSub').textContent = t('shareSub');
      grid.className = 'share-wrap';
      const c = this.shareCard();
      grid.innerHTML = `<img class="share-img" alt="" src="${c.toDataURL('image/png')}">
        <div class="share-side">
          <button class="btn btn-primary" id="shareGo">${ic('share')}<span>${t('shareBtn')}</span></button>
          <button class="btn" id="shareSave">${ic('image')}<span>${t('saveImg')}</span></button>
          <button class="btn btn-wa" id="shareWa">${ic('chat')}<span>${t('whatsapp')}</span></button>
          <p class="muted">${t('shareHint')}</p>
        </div>`;
      const canShareFiles = !!(navigator.canShare && root.File);
      $('shareGo').classList.toggle('hidden', !navigator.share);
      $('shareGo').onclick = () => { KL.Audio.click(); this.shareNative(c, canShareFiles); };
      $('shareSave').onclick = () => { KL.Audio.click(); this.saveCard(c); };
      $('shareWa').onclick = () => { KL.Audio.click(); root.open('https://wa.me/?text=' + encodeURIComponent(this.shareText()), '_blank', 'noopener'); };
      $('bookHint').textContent = '';
    },
    shareText() {
      const s = this.g.save;
      return t('shareText', { f: KL.fmt(s.rec.fish), d: KL.fmt(s.bestEver) }) + (SHARE_URL ? ' ' + SHARE_URL : '') + ' #GnomeLineSinker';
    },
    cardFile(c) {
      return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
    },
    async shareNative(c, files) {
      const text = this.shareText();
      try {
        if (files) {
          const blob = await this.cardFile(c);
          const file = new File([blob], 'gnome-line-sinker.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'Gnome, Line & Sinker' }); return; }
        }
        await navigator.share({ text, title: 'Gnome, Line & Sinker' });
      } catch (e) { /* closed the share sheet */ }
    },
    saveCard(c) {
      const a = document.createElement('a');
      const d = new Date();
      const p2 = (n) => String(n).padStart(2, '0');
      a.download = `gnome-line-sinker-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}.png`;
      a.href = c.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      this.toast(null, t('share'), t('shareSaved'));
    },
    // 1080 x 1350 (4:5, fits Instagram feed and WhatsApp). Flat colours, left aligned, pixel art
    // scaled by whole numbers.
    shareCard() {
      const s = this.g.save, r = s.rec;
      const W = 1080, H = 1350;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      const INK = '#14121c', PAPER = '#f3ead7';
      const font = (px, w) => `${w || 600} ${px}px Pixelify, monospace`;
      x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
      // scene panel: sky, then one flat band per zone you have reached
      const P = { x: 56, y: 56, w: W - 112, h: 600 };
      x.fillStyle = INK; x.fillRect(P.x - 6, P.y - 6, P.w + 12, P.h + 12);
      x.fillStyle = '#8fd3e8'; x.fillRect(P.x, P.y, P.w, 250);
      x.fillStyle = '#f3ead7'; x.fillRect(P.x + P.w - 120, P.y + 150, 56, 56);
      const zones = ZONES.slice(0, s.zone + 1);
      const bandH = (P.h - 250) / zones.length;
      zones.forEach((z, i) => { x.fillStyle = z.water; x.fillRect(P.x, P.y + 250 + i * bandH, P.w, Math.ceil(bandH)); });
      // zone names on the bands
      x.font = font(26); x.textBaseline = 'middle';
      zones.forEach((z, i) => { x.fillStyle = 'rgba(243,234,215,0.75)'; x.fillText(KL.name(z.name), P.x + P.w - 24 - x.measureText(KL.name(z.name)).width, P.y + 250 + (i + 0.5) * bandH); });
      // the gnome on its boat, 6x; its waterline sits on the sea
      const K = 6;
      const boat = KL.Render.boatCanvas(s.gear.boat, s.gear.skin);
      const bx = P.x + 24, byy = P.y + 250 - 41 * K;
      x.drawImage(boat, bx, byy, boat.width * K, boat.height * K);
      // the line from the rod tip down to the best fish ever caught
      const hookX = bx + 63 * K, lineTop = byy + 15 * K;
      x.fillStyle = PAPER; x.fillRect(hookX, lineTop, 4, P.y + P.h - 96 - lineTop);
      if (r.bestFish && E.SP[r.bestFish.sp] != null) {
        const sp = SPECIES[E.SP[r.bestFish.sp]];
        const img = KL.Render.variant(sp.sprite, fishVar(r.bestFish.mut, sp));
        const k = Math.max(4, Math.floor(84 / Math.max(img.width, img.height)));
        x.drawImage(img, hookX + 2 - (img.width * k) / 2, P.y + P.h - 100, img.width * k, img.height * k);
      }
      // title in the sky
      x.fillStyle = INK; x.font = font(60); x.textBaseline = 'top';
      x.fillText('Gnome, Line', P.x + 540, P.y + 36);
      x.fillText('& Sinker', P.x + 540, P.y + 104);
      // headline number
      let y = P.y + P.h + 52;
      x.font = font(120); x.fillStyle = INK; x.textBaseline = 'top';
      const big = KL.fmt(r.fish);
      x.fillText(big, 56, y);
      const bw = x.measureText(big).width;
      x.font = font(40); x.fillStyle = '#776d63';
      x.fillText(t('shareHead'), 56 + bw + 28, y + 64);
      y += 160;
      // six tiles
      const tiles = [
        [t('st_deep'), `${KL.fmt(s.bestEver)} m`],
        [t('st_species'), `${Object.keys(s.caught).length}/${SPECIES.length}`],
        [t('st_play'), KL.fmtTime(s.playTime)],
        [t('st_ach'), `${Object.keys(s.ach).length}/${ACH.length}`],
        [t('st_coins'), KL.fmt(s.lifetime)],
        [t('seasonN'), String(s.seasons + 1)],
      ];
      const tw = (W - 112 - 2 * 24) / 3, th = 132;
      tiles.forEach(([lab, val], i) => {
        const tx = 56 + (i % 3) * (tw + 24), ty = y + Math.floor(i / 3) * (th + 24);
        x.fillStyle = INK; x.fillRect(tx, ty + 6, tw, th);
        x.fillStyle = '#e6d8bb'; x.fillRect(tx, ty, tw, th);
        x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(tx + 2, ty + 2, tw - 4, th - 4);
        x.fillStyle = '#776d63'; x.font = font(26, 500); x.fillText(lab, tx + 22, ty + 22);
        x.fillStyle = INK; x.font = font(val.length > 12 ? 36 : 48); x.fillText(val, tx + 22, ty + 62);
      });
      // rarest achievement as a ribbon
      const top = ACH.filter((a) => s.ach[a.id]).sort((a, b) => b.tier - a.tier || s.ach[b.id] - s.ach[a.id])[0];
      y += 2 * (th + 24) + 6;
      if (top) {
        x.fillStyle = TIER_HEX[top.tier]; x.fillRect(56, y, W - 112, 60);
        x.strokeStyle = INK; x.strokeRect(58, y + 2, W - 116, 56);
        x.fillStyle = INK; x.font = font(30); x.textBaseline = 'middle';
        x.fillText(`${t('tier' + top.tier)} · ${KL.name(top.name)}`, 80, y + 31);
        x.textBaseline = 'top';
      }
      // footer band
      x.fillStyle = INK; x.fillRect(0, H - 84, W, 84);
      x.fillStyle = PAPER; x.font = font(30); x.textBaseline = 'middle';
      x.fillText(`${t('shareFoot')}: gnome.assamimuzaki.work`, 56, H - 42);
      x.fillStyle = '#f5b82e';
      const ig = '@lavstudioofficial';
      x.fillText(ig, W - 56 - x.measureText(ig).width, H - 42);
      return c;
    },

    // ---------- shop ----------
    openShop(tab) {
      if (!this.paperOpen('shop')) return;
      this.shopTab = tab || this.shopTab || 'skin';
      this.renderShop();
    },
    gearReason(gr) {
      if (gr.ach && !this.g.save.ach[gr.ach]) return t('needAch', { a: KL.name(ACH.find((a) => a.id === gr.ach).name) });
      return t('needZone', { z: KL.name(ZONES[gr.zone].name) });
    },
    perkLine(s) {
      const items = [E.GEAR_BY[s.gear.skin], E.GEAR_BY[s.gear.boat]].filter((g) => g.cost > 0);
      return items.length ? items.map((g) => KL.name(g.desc)).join(' ') : t('noPerk');
    },
    renderShop() {
      const s = this.g.save;
      const own = (k) => GEAR.filter((g) => g.kind === k && s.gear.owned[g.id]).length + '/' + GEAR.filter((g) => g.kind === k).length;
      this.railButtons(t('shop'), [
        { id: 'skin', icon: 'chef', label: t('skins'), small: own('skin') },
        { id: 'boat', icon: 'boat', label: t('boats'), small: own('boat') },
      ], this.shopTab, (id) => { this.shopTab = id; this.renderShop(); });
      const rail = $('bookRail');
      const wal = document.createElement('div');
      wal.className = 'rail-wallet';
      wal.innerHTML = `<div class="pill pill-shell">${ic('shell')}<b>${KL.fmt(s.shells)}</b></div>`;
      rail.appendChild(wal);
      $('bookTitle').textContent = t(this.shopTab === 'skin' ? 'skins' : 'boats');
      $('bookSub').innerHTML = `<b>${t('perksNow')}:</b> ${this.perkLine(s)}`;
      const grid = $('bookGrid');
      grid.className = 'book-grid gear-grid';
      grid.innerHTML = '';
      for (const gr of GEAR.filter((x) => x.kind === this.shopTab)) {
        const st = E.gearState(s, gr.id);
        const worn = s.gear[gr.kind] === gr.id;
        const pic = gr.kind === 'skin' ? KL.Render.boatPic(s.gear.boat, gr.id, 2) : KL.Render.boatPic(gr.id, s.gear.skin, 2);
        const card = document.createElement('div');
        card.className = `card gear ${st}${worn ? ' worn' : ''}`;
        let btn;
        if (worn) btn = `<button class="btn" disabled>${ic('check')}<span>${t('worn')}</span></button>`;
        else if (st === 'owned') btn = `<button class="btn btn-dark" data-act="wear">${ic('play')}<span>${t('wear')}</span></button>`;
        else if (st === 'locked') btn = `<button class="btn" disabled>${ic('lock')}<span>${this.gearReason(gr)}</span></button>`;
        else btn = `<button class="btn ${st === 'buy' ? 'btn-shell' : ''}" data-act="buy" ${st === 'buy' ? '' : 'disabled'}><span>${t('buy')}</span><span class="cost">${ic('shell')}${gr.cost}</span></button>`;
        card.innerHTML = `<img class="gear-pic" src="${pic}" alt="">
          <span class="nm">${KL.name(gr.name)}</span>
          <span class="meta">${st === 'locked' && gr.ach ? '???' : KL.name(gr.desc)}</span>${btn}`;
        const b = card.querySelector('[data-act]');
        if (b) b.onclick = () => this.gearAct(gr.id, b.dataset.act);
        grid.appendChild(card);
      }
      $('bookHint').textContent = t('shopHint');
    },
    gearAct(id, act) {
      const s = this.g.save;
      if (act === 'buy') {
        if (!E.buyGear(s, id)) { KL.Audio.deny(); return; }
        KL.Audio.buy(true);
      } else { E.equip(s, id); KL.Audio.click(); }
      this.g.onGear && this.g.onGear(id, act);
      this.renderShop();
      this.hud();
    },

    // badges and wallet in the HUD
    metaHud() {
      const s = this.g.save;
      $('shellPill').classList.toggle('hidden', !s.shellsEver);
      $('shells').textContent = KL.fmt(s.shells);
      const fresh = Object.keys(s.ach).length - (s.seenAch || 0);
      $('trophyBadge').textContent = fresh;
      $('trophyBadge').classList.toggle('hidden', fresh <= 0);
      const can = GEAR.some((g) => E.gearState(s, g.id) === 'buy');
      $('shopBadge').classList.toggle('hidden', !can);
      $('shopBadge').classList.toggle('dot', can);
    },
    achToast(a) {
      const el = document.createElement('div');
      el.className = 'toast toast-ach';
      el.style.setProperty('--tc', TIER_COL[a.tier]);
      el.innerHTML = `<div class="ach-ic">${ic(a.icon)}</div><div><small>${t('achUnlocked')} · ${t('tier' + a.tier)}</small>${KL.name(a.name)} <span class="ach-pay">${inl('shell', 'var(--shell)')}+${SHELL_PAY[a.tier]}</span></div>`;
      $('toasts').appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 3400);
    },
  });

  // the fishdex shares the screen, so opening it resets the layout the other screens changed
  const openBook = UI.openBook;
  UI.openBook = function (zone) {
    this.paper = 'book';
    $('book').dataset.kind = 'book';
    $('bookGrid').className = 'book-grid';
    openBook.call(this, zone);
  };
  const hud = UI.hud;
  UI.hud = function () { hud.call(this); this.metaHud(); };
  const init = UI.init;
  UI.init = function (g) {
    init.call(this, g);
    $('trophyBtn').onclick = () => { KL.Audio.click(); this.openTrophy(); };
    $('shopBtn').onclick = () => { KL.Audio.click(); this.openShop(); };
    $('shellPill').onclick = () => { KL.Audio.click(); this.openShop(); };
  };
})(this);
