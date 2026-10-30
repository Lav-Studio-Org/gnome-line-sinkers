// DOM interface: HUD, dock, haul sheet, skill tree screen, fishdex, settings, toasts.
(function (root) {
  'use strict';
  const KL = root.KL;
  const E = KL.Engine;
  const { NODES, SPECIES, MUTATIONS, ZONES } = E.DATA;
  const $ = (id) => document.getElementById(id);
  const t = (k, v) => KL.t(k, v);
  const ic = (n) => `<svg class="ic"><use href="#i-${n}"/></svg>`;
  const MUT_KEY = ['mutBig', 'mutGold', 'mutPrism', 'mutTitan'];
  const PEARL_LINK = { p_value: 'val4', p_line: 'line5', p_cap: 'cap4', p_auto: 'reel2', p_luck: 'luck2', p_pond: 'pond4' };
  const SP = 104; // px between tree nodes

  const UI = {
    g: null, sel: 'root', view: { x: 0, y: 0, z: 1 }, open: null,

    init(g) {
      this.g = g;
      this.translate();
      $('treeBtn').onclick = () => { KL.Audio.click(); this.openTree(); };
      $('treeClose').onclick = () => { KL.Audio.click(); this.closeScreens(); };
      $('bookBtn').onclick = () => { KL.Audio.click(); this.openBook(); };
      $('bookClose').onclick = () => { KL.Audio.click(); this.closeScreens(); };
      $('setBtn').onclick = () => { KL.Audio.click(); this.openSettings(); };
      $('setClose').onclick = () => { KL.Audio.click(); this.closeSheet('settings'); };
      $('zoomIn').onclick = () => this.zoom(1.2);
      $('zoomOut').onclick = () => this.zoom(1 / 1.2);
      $('menuBtn').onclick = () => { KL.Audio.click(); this.openMenu(); };
      $('menuPlay').onclick = () => { KL.Audio.click(); this.closeMenu(); };
      $('menuNew').onclick = () => {
        KL.Audio.click();
        if (!this.hasProgress()) { this.closeMenu(); return; }
        this.modal(t('menuNew'), `<p>${t('menuNewConfirm')}</p>`, [
          { label: t('back'), fn: () => {} },
          { label: t('menuNew'), cls: 'grow', icon: 'plus', fn: () => { this.g.reset(); this.closeMenu(); } },
        ]);
      };
      $('menuExport').onclick = () => { KL.Audio.click(); this.g.exportSave(); };
      $('menuImport').onclick = () => { KL.Audio.click(); $('importFile').click(); };
      $('importFile').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) this.g.importFile(f); };
      $('menuCredits').onclick = () => { KL.Audio.click(); this.credits(); };
      $('scrim').onclick = () => { if (this.open === 'settings') this.closeSheet('settings'); };
      this.initTreeInput();
      const rot = document.createElement('div');
      rot.className = 'rotate';
      rot.id = 'rotate';
      document.body.appendChild(rot);
      addEventListener('resize', () => this.layout());
      this.layout();
    },
    // Portrait or landscape follows the real window shape. Settings can pin one: we ask the
    // browser to lock it (works in the installed app / fullscreen) and otherwise ask the player
    // to turn the phone, with a way out.
    layout() {
      const want = (this.g && this.g.save.settings.orient) || 'auto';
      const port = innerHeight > innerWidth;
      document.body.classList.toggle('port', port);
      const touch = matchMedia('(pointer: coarse)').matches;
      const wrong = touch && want !== 'auto' && (want === 'port') !== port;
      document.body.classList.toggle('need-rotate', wrong);
      if (wrong) {
        $('rotate').innerHTML = `${ic('steer')}<h2>Gnome, Line &amp; Sinker</h2><p>${t(want === 'port' ? 'rotPort' : 'rotLand')}</p>
          <button class="btn" id="rotAuto">${ic('check')}<span>${t('rotAuto')}</span></button>`;
        $('rotAuto').onclick = () => { this.g.save.settings.orient = 'auto'; this.g.applySettings(); };
      }
      if (this._port !== port) {
        this._port = port;
        if (this.open === 'tree') this.center(this.sel || 'root');
      }
    },
    lockOrientation() {
      const want = this.g.save.settings.orient || 'auto';
      const o = screen.orientation;
      if (!o) return;
      try {
        if (want === 'auto') { if (o.unlock) o.unlock(); } else if (o.lock) o.lock(want === 'port' ? 'portrait' : 'landscape').catch(() => {});
      } catch (e) { /* not supported outside fullscreen / installed app */ }
    },
    translate() {
      document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
    },

    // ---------- HUD ----------
    hud() {
      const g = this.g, s = g.save;
      $('coins').textContent = KL.fmt(s.coins);
      $('pearlPill').classList.toggle('hidden', !s.pearlsEver);
      $('pearls').textContent = KL.fmt(s.pearls);
      const rate = g.pondRate;
      $('penRate').textContent = rate > 0 ? `${t('pen')} +${KL.fmt(rate)}${t('perSec')}` : '';
      const n = E.affordableCount(s);
      $('treeBadge').textContent = n;
      $('treeBadge').classList.toggle('hidden', n === 0);
      const st = g.stats;
      $('autoBtn').classList.toggle('hidden', !st.auto);
      $('autoBtn').setAttribute('aria-pressed', s.auto ? 'true' : 'false');
      const z = ZONES[E.zoneAt(s.bestEver)];
      $('dockStats').innerHTML = `<span>${t('line')} ${KL.fmt(st.line)} m</span><span>${ic('fish').replace('class="ic"', 'class="ic" style="display:inline;vertical-align:-4px;width:1.1em;height:1.1em;--acc:var(--accent)"')} ${st.cap}</span><span>${t('best')} ${KL.fmt(s.bestEver)} m · ${KL.name(z.name)}</span>`;
      if (this.open === 'tree') { $('treeCoins').textContent = KL.fmt(s.coins); $('treePearls').textContent = KL.fmt(s.pearls); }
    },
    bump(id) { const el = $(id); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); },
    // phones get a joystick at the bottom while casting, so the thumb does not hide the hook
    touch: !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0,
    useStick() { return this.touch && this.g && this.g.save.settings.ctrl !== 'touch'; },
    setMode(mode) {
      const stick = mode === 'cast' && this.useStick();
      $('stick').classList.toggle('hidden', !stick);
      document.body.classList.toggle('stick-on', stick);
      $('dock').classList.toggle('hidden', mode !== 'dock');
      $('hudRight').classList.toggle('hidden', mode === 'cast');
      $('castInfo').classList.toggle('hidden', mode !== 'cast');
      $('penRate').classList.toggle('hidden', mode === 'cast');
    },
    catchCount(n, cap) { $('catchCount').textContent = `${n}/${cap}`; },
    // line still on the spool while going down; red when a fifth or less is left
    // (hidden once the hook turns: then it is reeling in)
    lineLeft(m, frac) {
      const v = m < 0 ? -1 : Math.ceil(m);
      if (v === this.shownLine) return;
      this.shownLine = v;
      $('linePill').classList.toggle('hidden', v < 0);
      if (v < 0) return;
      $('lineLeft').textContent = `${KL.fmt(v)} m`;
      $('linePill').classList.toggle('low', frac <= 0.2);
    },
    hint(text) {
      const el = $('hint');
      if (!text) { el.classList.add('hidden'); return; }
      el.textContent = text;
      el.classList.remove('hidden');
    },
    banner(small, big) {
      const el = $('banner');
      el.innerHTML = `<small>${small}</small><b>${big}</b>`;
      el.classList.remove('hidden');
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this._bt);
      this._bt = setTimeout(() => el.classList.add('hidden'), 2600);
    },
    toast(sprite, small, text) {
      const el = document.createElement('div');
      el.className = 'toast';
      el.innerHTML = `${sprite ? `<img class="spr" src="${sprite}" alt="">` : ''}<div><small>${small}</small>${text}</div>`;
      $('toasts').appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 350); }, 2800);
    },

    // ---------- sheets ----------
    openSheet(id) { $(id).classList.add('open'); $(id).setAttribute('aria-hidden', 'false'); $('scrim').classList.add('on'); this.open = id; },
    closeSheet(id) { $(id).classList.remove('open'); $(id).setAttribute('aria-hidden', 'true'); $('scrim').classList.remove('on'); if (this.open === id) this.open = null; },

    // ---------- haul ----------
    showHaul(h, onTake) {
      const g = this.g, s = g.save;
      $('haulDepth').textContent = `${t('depth')} ${h.depth} m${h.moon ? ' · ' + t('moonNight') : ''}`;
      const list = $('haulList');
      list.innerHTML = '';
      if (!h.items.length) list.innerHTML = `<li class="haul-empty">${t('haulEmpty')}</li>`;
      // group identical catches (same species + mutation) to keep the list short
      const groups = [];
      for (const it of h.items) {
        const key = it.sp + ':' + it.mut + (it.cat ? 'c' : '');
        let gr = groups.find((x) => x.key === key);
        if (!gr) groups.push((gr = { key, it, n: 0, value: 0 }));
        gr.n += it.twin ? 2 : 1; gr.value += it.value;
      }
      groups.sort((a, b) => b.value - a.value);
      groups.forEach((gr, i) => {
        const sp = SPECIES[gr.it.sp];
        const mut = gr.it.mut;
        const isNew = !s.caught[sp.id];
        const li = document.createElement('li');
        li.style.animationDelay = Math.min(i, 12) * 0.05 + 's';
        const v = mut === 1 ? 'gold' : mut === 2 ? 'prism2' : sp.shadow ? 'shadow' : '';
        li.innerHTML = `<img class="spr" src="${KL.Render.url(sp.sprite, v)}" alt="">
          <div><span class="nm">${KL.name(sp.name)}${gr.n > 1 ? ' x' + gr.n : ''}</span>${mut >= 0 ? `<span class="tag tag-${MUTATIONS[mut].id}">${t(MUT_KEY[mut])}</span>` : ''}${isNew ? `<span class="tag tag-new">${t('newSpecies')}</span>` : ''}${gr.it.cat ? `<span class="tag">${t('catBonus')}</span>` : ''}</div>
          <span class="v">${KL.fmt(gr.value * g.statsHaulMult(h))}</span>`;
        list.appendChild(li);
      });
      const bonus = [];
      if (h.fullB) bonus.push(`${t('fullBonus')} +${Math.round(h.fullB * 100)}%`);
      if (h.bulkB) bonus.push(`${t('bulkBonus')} +${Math.round(h.bulkB * 100)}%`);
      $('haulBonus').innerHTML = bonus.map((b) => `<span>${b}</span>`).join('');
      $('haulTotal').innerHTML = `${ic('coin')}${KL.fmt(h.total)}`;
      $('haulTake').onclick = () => { this.closeSheet('haul'); onTake(1); };
      $('haul').classList.add('open');
      $('haul').setAttribute('aria-hidden', 'false');
      this.open = 'haul';
    },
    hideHaul() { $('haul').classList.remove('open'); if (this.open === 'haul') this.open = null; },

    // ---------- skill tree ----------
    openTree() {
      if (this.g.mode === 'cast') return;
      this.open = 'tree';
      $('tree').classList.add('open');
      $('tree').setAttribute('aria-hidden', 'false');
      $('treePearlPill').classList.toggle('hidden', !this.g.save.pearlsEver);
      this.renderTree(true);
      // start on something useful: the cheapest skill you can buy right now
      const s = this.g.save;
      const buyable = NODES.filter((n) => E.canBuy(s, n.id)).sort((a, b) => E.nodeCost(a, E.lv(s, a.id)) - E.nodeCost(b, E.lv(s, b.id)));
      this.select(buyable.length ? buyable[0].id : this.sel || 'root');
      if (!this._centered) { this.center('root'); this._centered = true; }
      this.hud();
    },
    closeScreens() {
      ['tree', 'book'].forEach((id) => { $(id).classList.remove('open'); $(id).setAttribute('aria-hidden', 'true'); });
      this.open = null;
      this.g.onScreenClosed && this.g.onScreenClosed();
    },
    bounds() {
      let minX = 0, maxX = 0, minY = 0, maxY = 0;
      for (const n of NODES) { minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x); minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y); }
      return { minX, minY, w: (maxX - minX) * SP + 200, h: (maxY - minY) * SP + 200 };
    },
    pos(n) { const b = this.bounds(); return [(n.x - b.minX) * SP + 100, (n.y - b.minY) * SP + 100]; },
    renderTree(first) {
      const s = this.g.save;
      const world = $('treeWorld');
      const b = this.bounds();
      world.style.width = b.w + 'px'; world.style.height = b.h + 'px';
      const svg = $('treeLinks');
      svg.setAttribute('width', b.w); svg.setAttribute('height', b.h);
      let links = '';
      const vis = (id) => E.nodeState(s, id) !== 'hidden';
      for (const n of NODES) {
        if (!vis(n.id)) continue;
        const reqs = n.cur === 'pearl' ? [PEARL_LINK[n.id]] : n.req;
        for (const r of reqs) {
          if (!r || !vis(r)) continue;
          const [x1, y1] = this.pos(n), [x2, y2] = this.pos(E.NODE[r]);
          const on = E.lv(s, n.id) > 0 && E.lv(s, r) > 0;
          // elbow links read as circuitry and stay tidy on a grid
          const mx = x1 === x2 || y1 === y2 ? null : [x2, y1];
          const d = mx ? `M${x1} ${y1}L${mx[0]} ${mx[1]}L${x2} ${y2}` : `M${x1} ${y1}L${x2} ${y2}`;
          links += `<path d="${d}" class="${on ? 'on' : ''} ${n.cur === 'pearl' ? 'pearl' : ''}"/>`;
        }
      }
      svg.innerHTML = links;
      const prev = {};
      world.querySelectorAll('.node').forEach((el) => { prev[el.dataset.id] = el.className; el.remove(); });
      for (const n of NODES) {
        const state = E.nodeState(s, n.id);
        if (state === 'hidden') continue;
        const lvl = E.lv(s, n.id);
        const el = document.createElement('button');
        el.dataset.id = n.id;
        let cls = 'node ' + state;
        if (n.id === 'root') cls += ' root';
        if (n.cur === 'pearl') cls += ' pearl';
        if (state !== 'peek' && E.canBuy(s, n.id)) cls += ' buy';
        if (lvl >= n.max && n.id !== 'root') cls += ' maxed';
        if (n.id === this.sel) cls += ' sel';
        if (!first && prev[n.id] && prev[n.id].includes('peek') && state !== 'peek') cls += ' pop';
        if (!first && !prev[n.id]) cls += ' pop';
        el.className = cls;
        const [x, y] = this.pos(n);
        el.style.left = x + 'px'; el.style.top = y + 'px';
        el.innerHTML = state === 'peek' ? ic('help') : ic(n.icon) + (n.id !== 'root' && lvl > 0 ? `<span class="lv">${lvl >= n.max ? t('max') : lvl + '/' + n.max}</span>` : '');
        el.setAttribute('aria-label', state === 'peek' ? t('mystery') : KL.name(n.name));
        world.appendChild(el);
      }
      this.applyView();
    },
    select(id) {
      this.sel = id;
      document.querySelectorAll('.node.sel').forEach((el) => el.classList.remove('sel'));
      const el = document.querySelector(`.node[data-id="${id}"]`);
      if (el) el.classList.add('sel');
      this.renderPanel();
    },
    fxText(n, level) {
      const v = n.v * level;
      const pct = (x) => `+${Math.round(x * 100)}%`;
      switch (n.fx) {
        case 'line': return `+${KL.fmt(v)} m`;
        case 'cap': return `+${v}`;
        case 'guard': return `${v}`;
        case 'offline': return `+${v} ${t('hours')}`;
        case 'junk': return `x${1 + v}`;
        case 'fall': return `${Math.round(v * 100)}%`;
        case 'twin': case 'cat': return `${Math.round(v * 100)}%`;
        case 'bulk': return `${pct(v)} / ${KL.lang === 'id' ? 'ikan' : 'fish'}`;
        case 'pearlval': return `${pct(v)} / ${KL.lang === 'id' ? 'mutiara' : 'pearl'}`;
        case 'valx': case 'pondx': case 'mutx': return `x${+Math.pow(1 + n.v, level).toFixed(2)}`;
        case 'moon': return level ? `${KL.lang === 'id' ? 'tiap' : 'every'} ${9 - level}` : '-';
        case 'auto': case 'pauto': case 'song': case 'slow': case 'sonar': case 'pond': return level ? `${t('lv')} ${level}` : '-';
        default: return pct(v);
      }
    },
    renderPanel() {
      const s = this.g.save;
      const n = E.NODE[this.sel];
      const panel = $('nodePanel');
      const state = E.nodeState(s, n.id);
      const lvl = E.lv(s, n.id);
      let html;
      if (state === 'peek') {
        html = `<div class="np-head"><div class="np-icon" style="background:var(--night-2);color:var(--paper)">${ic('help')}</div><div><h3>${t('mystery')}</h3></div></div>
          <div class="np-body"><p>${t('mysteryDesc')}</p></div>`;
      } else {
        const pips = n.max > 1 && n.max <= 10 ? `<div class="np-pips">${Array.from({ length: n.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>` : '';
        const maxed = lvl >= n.max;
        const fx = n.fx ? `<dl class="np-fx"><dt>${t('now')}</dt><dd>${this.fxText(n, lvl)}</dd>${maxed ? '' : `<dt>${t('next')}</dt><dd>${this.fxText(n, lvl + 1)}</dd>`}</dl>` : '';
        const cost = maxed ? 0 : E.nodeCost(n, lvl);
        const pearl = n.cur === 'pearl';
        const can = E.canBuy(s, n.id);
        const foot = maxed || n.id === 'root' ? '' : `<div class="np-foot">
            <button class="btn ${can ? 'btn-primary' : ''} ${pearl ? 'pearlbuy' : ''}" id="buyBtn" ${can ? '' : 'disabled'}>
              <span>${t('buy')}</span><span style="display:inline-flex;gap:6px;align-items:center">${ic(pearl ? 'pearl' : 'coin')}${KL.fmt(cost)}</span></button></div>`;
        html = `<div class="np-head"><div class="np-icon" ${pearl ? 'style="background:var(--pearl)"' : ''}>${ic(n.icon)}</div>
            <div><h3>${KL.name(n.name)}</h3><div class="np-lv">${n.id === 'root' ? '' : `${t('lv')} ${lvl} / ${n.max}`}</div></div></div>
          <div class="np-body"><p>${KL.name(n.desc)}</p>${pips}${fx}</div>${foot}`;
      }
      html += this.seasonHtml();
      panel.innerHTML = html;
      const b = $('buyBtn');
      if (b) b.onclick = () => this.buy(n.id);
      const sb = $('seasonBtn');
      if (sb) sb.onclick = () => this.confirmSeason();
    },
    seasonHtml() {
      const s = this.g.save;
      if (s.bestEver < E.PRESTIGE_DEPTH * 0.6 && !s.seasons) return '';
      const gain = E.prestigeGain(s);
      if (!gain) return `<div class="np-season"><b>${t('season')}</b><span>${s.best < E.PRESTIGE_DEPTH ? t('seasonLocked', { d: E.PRESTIGE_DEPTH }) : t('seasonDesc', { n: 0 })}</span></div>`;
      return `<div class="np-season"><b>${t('season')}</b><span>${t('seasonDesc', { n: gain })}</span>
        <button class="btn btn-pearl" id="seasonBtn"><span>${t('seasonGo')}</span><span style="display:inline-flex;gap:6px;align-items:center">${ic('pearl')}+${gain}</span></button></div>`;
    },
    buy(id) {
      const s = this.g.save;
      const n = E.NODE[id];
      if (!E.buy(s, id)) { KL.Audio.deny(); return; }
      KL.Audio.buy(E.lv(s, id) >= n.max);
      this.g.onBought && this.g.onBought(id);
      this.renderTree(false);
      this.select(id);
      const el = document.querySelector(`.node[data-id="${id}"]`);
      if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
      this.hud();
    },
    confirmSeason() {
      const s = this.g.save;
      const gain = E.prestigeGain(s);
      this.modal(t('season'), `<p>${t('seasonConfirm')}</p><div class="modal-big" style="--acc:var(--pearl)">${ic('pearl')}+${gain}</div>`, [
        { label: t('back'), cls: '', fn: () => {} },
        { label: t('seasonGo'), cls: 'btn-pearl grow', icon: 'pearl', fn: () => { E.prestige(s); KL.Audio.season(); this.g.onSeason && this.g.onSeason(gain); this.renderTree(true); this.select('root'); this.hud(); } },
      ]);
    },
    applyView() {
      const v = this.view;
      $('treeWorld').style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
    },
    center(id) {
      const [x, y] = this.pos(E.NODE[id]);
      const panel = $('nodePanel');
      const port = document.body.classList.contains('port');
      const vw = port ? innerWidth : innerWidth - (panel.offsetWidth || 300) - 20;
      const vh = port ? innerHeight - (panel.offsetHeight || 260) - 20 : innerHeight;
      this.view.z = Math.max(0.6, Math.min(1, vh / 560));
      this.view.x = vw / 2 - x * this.view.z;
      this.view.y = vh / 2 - y * this.view.z;
      this.applyView();
    },
    zoom(f, cx, cy) {
      const v = this.view;
      const nz = Math.max(0.35, Math.min(1.8, v.z * f));
      cx = cx == null ? innerWidth / 2 : cx; cy = cy == null ? innerHeight / 2 : cy;
      v.x = cx - (cx - v.x) * (nz / v.z);
      v.y = cy - (cy - v.y) * (nz / v.z);
      v.z = nz;
      this.applyView();
    },
    initTreeInput() {
      const view = $('treeView');
      const pts = new Map();
      let moved = 0, pinch = 0;
      view.addEventListener('pointerdown', (e) => {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        moved = 0;
        view.setPointerCapture(e.pointerId);
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
      });
      view.addEventListener('pointermove', (e) => {
        const p = pts.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        p.x = e.clientX; p.y = e.clientY;
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) this.zoom(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
          pinch = d; moved = 99;
          return;
        }
        moved += Math.abs(dx) + Math.abs(dy);
        this.view.x += dx; this.view.y += dy;
        this.applyView();
      });
      const up = (e) => {
        const wasTap = pts.size === 1 && moved < 8;
        pts.delete(e.pointerId);
        if (pts.size < 2) pinch = 0;
        if (wasTap) {
          // pointer capture retargets events, so find the node under the finger ourselves
          view.releasePointerCapture && view.releasePointerCapture(e.pointerId);
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const node = el && el.closest && el.closest('.node');
          if (node) {
            KL.Audio.click();
            if (node.dataset.id === this.sel && E.canBuy(this.g.save, this.sel)) this.buy(this.sel);
            else this.select(node.dataset.id);
          }
        }
      };
      view.addEventListener('pointerup', up);
      view.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); });
      view.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });
    },

    // ---------- fishdex ----------
    openBook(zone) {
      if (this.g.mode === 'cast') return;
      this.open = 'book';
      $('book').classList.add('open');
      $('book').setAttribute('aria-hidden', 'false');
      this.bookZone = zone != null ? zone : this.bookZone || 0;
      this.renderBook();
    },
    renderBook() {
      const s = this.g.save;
      const rail = $('bookRail');
      rail.innerHTML = `<h2 style="color:var(--paper);padding:4px 10px 8px">${t('book')}</h2>`;
      ZONES.forEach((z, i) => {
        const sps = SPECIES.filter((sp) => E.zoneAt(sp.d[0]) === i);
        const got = sps.filter((sp) => s.caught[sp.id]).length;
        const known = i <= s.zone;
        const b = document.createElement('button');
        b.className = 'rail-btn' + (i === this.bookZone ? ' on' : '') + (known ? '' : ' lock');
        b.innerHTML = `<i style="background:${z.water}"></i><span>${known ? KL.name(z.name) : t('unknown')}</span><small>${got}/${sps.length}</small>`;
        b.onclick = () => { KL.Audio.click(); this.bookZone = i; this.renderBook(); };
        rail.appendChild(b);
      });
      const z = ZONES[this.bookZone];
      const known = this.bookZone <= s.zone;
      $('bookTitle').textContent = known ? KL.name(z.name) : t('unknown');
      const next = ZONES[this.bookZone + 1];
      $('bookSub').textContent = `${z.top}${next ? '-' + next.top : '+'} m · ${t('bookBonus')} +${Math.round((E.collectionBonus(s) - 1) * 100)}%`;
      const grid = $('bookGrid');
      grid.innerHTML = '';
      for (const sp of SPECIES.filter((x) => E.zoneAt(x.d[0]) === this.bookZone)) {
        const n = s.caught[sp.id] || 0;
        const card = document.createElement('div');
        if (!n) {
          card.className = 'card unknown';
          card.innerHTML = `<img class="spr" src="${KL.Render.url(sp.sprite, '', true)}" alt=""><span class="nm">${t('unknown')}</span><span class="meta">${sp.d[0]} m+</span>`;
        } else {
          const stars = E.DATA.MASTERY.map((m) => `<svg class="ic ${n >= m ? '' : 'off'}"><use href="#i-star"/></svg>`).join('');
          const muts = MUTATIONS.map((m) => `<i class="${m.id} ${s.variants[sp.id + ':' + m.id] ? 'on' : ''}" title="${t(MUT_KEY[MUTATIONS.indexOf(m)])}"></i>`).join('');
          card.className = 'card';
          card.innerHTML = `<img class="spr" src="${KL.Render.url(sp.sprite, sp.shadow ? 'shadow' : '')}" alt="">
            <span class="nm">${KL.name(sp.name)}</span><span class="meta">${KL.fmt(n)} ${t('caught')} · ${ic('coin').replace('class="ic"', 'class="ic" style="display:inline;width:1em;height:1em;vertical-align:-2px;--acc:var(--gold)"')} ${KL.fmt(sp.value)}</span>
            <div class="muts">${sp.junk ? '' : muts}<span class="stars">${stars}</span></div>`;
        }
        grid.appendChild(card);
      }
      $('bookHint').textContent = t('bookHint');
    },

    // ---------- settings ----------
    openSettings() {
      const s = this.g.save;
      const seg = (key, opts) => `<span class="seg">${opts.map(([v, l]) => `<button data-k="${key}" data-v="${v}" class="${String(s.settings[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</span>`;
      const onoff = [[true, t('on')], [false, t('off')]];
      $('setList').innerHTML = `
        <div class="set-row" style="--acc:var(--accent)">${ic('sound')}<span>${t('sound')}</span>${seg('sound', onoff)}</div>
        <div class="set-row" style="--acc:var(--accent)">${ic('music')}<span>${t('music')}</span>${seg('music', onoff)}</div>
        <div class="set-row" style="--acc:var(--accent)">${ic('vibe')}<span>${t('haptics')}</span>${seg('haptics', onoff)}</div>
        <div class="set-row" style="--acc:var(--accent)">${ic('globe')}<span>${t('language')}</span>${seg('lang', [['id', 'ID'], ['en', 'EN']])}</div>
        ${this.touch ? `<div class="set-row set-wrap" style="--acc:var(--accent)">${ic('hook')}<span>${t('ctrl')}</span>${seg('ctrl', [['stick', t('ctrlStick')], ['touch', t('ctrlTouch')]])}</div>` : ''}
        <div class="set-row set-wrap" style="--acc:var(--accent)">${ic('steer')}<span>${t('orient')}</span>${seg('orient', [['auto', t('orAuto')], ['land', t('orLand')], ['port', t('orPort')]])}</div>
        <p class="set-note">${KL.lang === 'id' ? 'Lemparan' : 'Casts'}: ${KL.fmt(s.casts)} · ${KL.lang === 'id' ? 'Total koin' : 'Lifetime coins'}: ${KL.fmt(s.lifetime)} · ${t('seasonN')} ${s.seasons + 1}</p>
        <div class="set-row"><button class="btn" id="setExport">${ic('download')}<span>${t('menuExport')}</span></button><button class="btn" id="setImport">${ic('upload')}<span>${t('menuImport')}</span></button></div>
        <div class="set-row"><button class="btn" id="resetBtn" style="--acc:var(--red)">${ic('trash')}<span>${t('reset')}</span></button></div>
        <div class="set-row"><button class="btn" id="setCredits">${ic('star')}<span>${t('menuCredits')}</span></button></div>`;
      $('setList').querySelectorAll('.seg button').forEach((b) => {
        b.onclick = () => {
          const k = b.dataset.k;
          s.settings[k] = k === 'lang' || k === 'orient' || k === 'ctrl' ? b.dataset.v : b.dataset.v === 'true';
          KL.Audio.click();
          this.g.applySettings();
          this.openSettings();
        };
      });
      $('setCredits').onclick = () => { KL.Audio.click(); this.credits(); };
      $('setExport').onclick = () => { KL.Audio.click(); this.g.exportSave(); };
      $('setImport').onclick = () => { KL.Audio.click(); $('importFile').click(); };
      $('resetBtn').onclick = () => this.modal(t('reset'), `<p>${t('resetConfirm')}</p>`, [
        { label: t('back'), fn: () => {} },
        { label: t('reset'), cls: 'grow', icon: 'trash', fn: () => this.g.reset() },
      ]);
      this.openSheet('settings');
    },

    // ---------- start menu ----------
    hasProgress() { const s = this.g.save; return s.casts > 0 || s.seasons > 0; },
    openMenu() {
      if (this.g.mode === 'cast' || this.g.mode === 'throw') return;
      this.closeSheet('settings');
      if (this.open === 'tree' || this.open === 'book') this.closeScreens();
      const s = this.g.save;
      $('menuGnome').src = KL.Render.url('gnome', '');
      $('menuPlayLabel').textContent = t(this.hasProgress() ? 'menuContinue' : 'menuStart');
      $('menuNew').classList.toggle('hidden', !this.hasProgress());
      $('menuSlot').innerHTML = this.hasProgress()
        ? `${ic('fish')}<span>${t('slotInfo', { s: s.seasons + 1, d: KL.fmt(s.bestEver), n: Object.keys(s.caught).length })}</span>`
        : `${ic('wave')}<span>${t('noSave')}</span>`;
      $('menu').classList.remove('hidden');
      this.menuOpen = true;
      if (this.renderMenuGlobal) this.renderMenuGlobal();
      ['hud', 'hudRight', 'dock'].forEach((id) => $(id).classList.add('hidden'));
    },
    closeMenu() {
      $('menu').classList.add('hidden');
      this.menuOpen = false;
      $('hud').classList.remove('hidden');
      this.setMode(this.g.mode === 'haul' ? 'haul' : 'dock');
      KL.Audio.unlock && KL.Audio.unlock();
      this.g.onMenuClosed();
    },
    credits() {
      const link = (u, l) => `<a href="${u}" target="_blank" rel="noopener">${l}</a>`;
      this.modal(t('creditsHead'), `<ul class="credits">
        <li><b>80+ Fishing Icons Asset Pack</b>Moranovo · ${link('https://moranovo.itch.io/80fishing-icons-asset-pack', 'moranovo.itch.io')}</li>
        <li><b>Pixel Gnome Fishing Pack (free sample)</b>PixelGnome · ${link('https://pixelgnome.itch.io/fish', 'pixelgnome.itch.io/fish')}</li>
        <li><b>Pixelify Sans</b>Stefie Justprince · SIL Open Font License</li>
        <li><b>Lav Studio</b>${t('creditGame')}. ${t('credits')}</li>
      </ul>`, [{ label: t('close'), cls: 'grow', fn: () => {} }]);
    },

    // ---------- generic side modal ----------
    modal(title, body, buttons) {
      const m = $('modal');
      m.innerHTML = `<header class="sheet-head"><h2>${title}</h2></header><div class="sheet-body">${body}</div>
        <div class="haul-foot" style="margin-top:auto"><div class="row" id="modalBtns"></div></div>`;
      const row = m.querySelector('#modalBtns');
      buttons.forEach((b) => {
        const el = document.createElement('button');
        el.className = 'btn ' + (b.cls || '');
        el.innerHTML = (b.icon ? ic(b.icon) : '') + `<span>${b.label}</span>`;
        el.onclick = async () => {
          KL.Audio.click();
          if (b.async) { el.disabled = true; const ok = await b.fn(); if (!ok) { el.disabled = false; return; } } else b.fn();
          this.closeModal();
        };
        row.appendChild(el);
      });
      m.classList.add('open');
      m.setAttribute('aria-hidden', 'false');
      m.style.zIndex = 50;
      $('scrim').classList.add('on');
      $('scrim').style.zIndex = 45;
    },
    closeModal() {
      $('modal').classList.remove('open');
      $('modal').setAttribute('aria-hidden', 'true');
      $('scrim').style.zIndex = '';
      if (this.open !== 'settings') $('scrim').classList.remove('on');
    },
  };

  KL.UI = UI;
  KL.ic = ic;
})(this);
