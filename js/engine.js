// Pure game logic: save, derived stats, skill tree, one cast (run) simulation, economy.
// No DOM here, so tests and the balance bot run it in node. See docs/DESIGN.md.
(function (root) {
  'use strict';
  const D = typeof module !== 'undefined' ? require('./data.js') : root.KL.DATA;
  const ATLAS = typeof module !== 'undefined' ? require('./atlas.js') : root.KL.ATLAS;
  const { ZONES, SPECIES, MUTATIONS, NODES, MASTERY, ACH, SHELL_PAY, GEAR, BOSSES, TIMES, WEATHERS, BAITS } = D;
  const BOSS_BY = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
  const BAIT_BY = Object.fromEntries(BAITS.map((b) => [b.id, b]));
  const GEAR_BY = Object.fromEntries(GEAR.map((g) => [g.id, g]));
  const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const SP = Object.fromEntries(SPECIES.map((s, i) => [s.id, i]));

  const PXM = 4;              // art pixels per metre
  const KEEP_TO = 80;         // metres of sea that stay put between casts (see carryOver)
  const BASE_LINE = 20;
  const BASE_CAP = 2;
  const HIT_R = 0.45;         // hook radius on the way down (m)
  const CATCH_R = 1.5;        // hook reach on the way up (m), scaled by `reach`
  const PRESTIGE_DEPTH = 480; // reaching the trench unlocks a new season
  const DEEP_TOP = 1050;      // where the endless zone starts

  // ---------- rng ----------
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- save ----------
  function newSave() {
    return {
      v: 1, coins: 0, pearls: 0, pearlsEver: 0, seasons: 0, seasonEarned: 0, lifetime: 0,
      nodes: { root: 1 }, caught: {}, variants: {}, best: 0, bestEver: 0, casts: 0, pearlDepth: 0,
      zone: 0, lastSeen: 0, playTime: 0, auto: false, seed: (Math.random() * 1e9) | 0,
      settings: { sound: true, music: true, lang: null, haptics: true, orient: 'auto', ctrl: 'stick' },
      shells: 0, shellsEver: 0, ach: {}, rec: newRec(),
      gear: { owned: { classic: 1, sampan: 1 }, skin: 'classic', boat: 'sampan' },
      // zone guardians: { won, left (stamina fraction carried between attempts), free (grandfathered) }
      bosses: {}, bait: 'cacing',
    };
  }
  // lifetime activity record (never reset by a new season); feeds achievements and the share card
  function newRec() {
    return {
      fish: 0, junk: 0, mut: [0, 0, 0, 0], bestHaul: 0, bestHaulFish: 0, bestFish: null, full: 0,
      boom: 0, sting: 0, lost: 0, guard: 0, moon: 0, metres: 0, castTime: 0, days: 0, lastDay: '', first: 0,
      storm: 0, fights: 0, escapes: 0,
    };
  }
  function migrate(s) {
    const base = newSave();
    const defaults = base.settings;
    const out = Object.assign(base, s || {});
    out.settings = Object.assign(defaults, (s && s.settings) || {});
    out.nodes = Object.assign({ root: 1 }, out.nodes);
    out.rec = Object.assign(newRec(), (s && s.rec) || {});
    const g = (s && s.gear) || {};
    out.gear = { owned: Object.assign({ classic: 1, sampan: 1 }, g.owned), skin: g.skin || 'classic', boat: g.boat || 'sampan' };
    if (!out.gear.owned[out.gear.skin]) out.gear.skin = 'classic';
    if (!out.gear.owned[out.gear.boat]) out.gear.boat = 'sampan';
    out.ach = out.ach || {};
    // saves from before the guardians: zones already reached stay open, their boss is a rematch
    if (!s || !s.bosses) {
      out.bosses = {};
      for (const b of BOSSES) if (out.zone >= b.zone) out.bosses[b.id] = { free: 1 };
    }
    if (!BAIT_BY[out.bait]) out.bait = 'cacing';
    return out;
  }

  const lv = (s, id) => s.nodes[id] || 0;
  // perk `fx` of the equipped outfit and boat
  function gearFx(s, fx) {
    const g = s.gear;
    if (!g) return 0;
    let t = 0;
    const a = GEAR_BY[g.skin], b = GEAR_BY[g.boat];
    if (a && a.fx[fx]) t += a.fx[fx];
    if (b && b.fx[fx]) t += b.fx[fx];
    return t;
  }
  // sum of node effect `fx` over owned levels, plus the equipped gear
  function sumFx(s, fx) {
    let t = gearFx(s, fx);
    for (const n of NODES) if (n.fx === fx) t += lv(s, n.id) * n.v;
    return t;
  }
  // product of (1 + v)^level over owned nodes with effect `fx`
  function prodFx(s, fx) {
    let t = 1 + gearFx(s, fx);
    for (const n of NODES) if (n.fx === fx) t *= Math.pow(1 + n.v, lv(s, n.id));
    return t;
  }

  function stats(s) {
    const line = BASE_LINE + sumFx(s, 'line');
    const autoLv = lv(s, 'auto') + (lv(s, 'p_auto') ? 1 : 0);
    const st = {
      line,
      cap: BASE_CAP + sumFx(s, 'cap'),
      reach: CATCH_R * (1 + sumFx(s, 'reach')),
      sink: Math.min(48, (9 + line * 0.045) * (1 + sumFx(s, 'sink'))),
      reel: Math.min(95, (7 + line * 0.07) * (1 + sumFx(s, 'reel'))),
      steer: 32 * (1 + sumFx(s, 'steer')),
      fall: Math.min(0.7, sumFx(s, 'fall')),
      // line used per metre of sideways travel: dragging the line through the water costs 1.8x a
      // straight drop; Smooth Steering makes side moves cheaper, down to 0.9x
      side: 1.8 * Math.max(0.5, 1 - 0.5 * sumFx(s, 'steer')),
      guard: sumFx(s, 'guard'),
      song: sumFx(s, 'song'),
      slow: sumFx(s, 'slow'),
      twin: sumFx(s, 'twin'),
      cat: sumFx(s, 'cat'),
      full: sumFx(s, 'full'),
      bulk: sumFx(s, 'bulk'),
      junk: 1 + sumFx(s, 'junk'),
      sonar: lv(s, 'sonar') > 0 || gearFx(s, 'sonar') > 0,
      mut: (1 + sumFx(s, 'mut')) * prodFx(s, 'mutx'),
      mutVal: 1 + sumFx(s, 'mutval'),
      rare: 1 + sumFx(s, 'rare'),
      moonEvery: moonEvery(s),
      auto: autoLv > 0,
      autoSkill: autoLv ? Math.min(0.97, [0, 0.55, 0.72, 0.86, 0.95][autoLv] + (lv(s, 'p_auto') ? 0.05 : 0)) : 0,
      pond: lv(s, 'pond1') > 0,
      pondMult: (1 + sumFx(s, 'pondmul')) * prodFx(s, 'pondx'),
      offlineH: 3 + sumFx(s, 'offline'),
      deep: gearFx(s, 'deep'),
    };
    st.valueMult = valueMult(s);
    return st;
  }

  // the ghost ship brings full moons: every 6 casts, or 2 casts sooner with the Full Moon skill
  function moonEvery(s) {
    const m = lv(s, 'moon') ? 9 - lv(s, 'moon') : 0;
    if (!gearFx(s, 'moon')) return m;
    return m ? Math.max(3, m - 2) : 6;
  }
  function collectionBonus(s) { return 1 + 0.01 * Object.keys(s.variants).length; }
  // every pearl ever earned counts, so spending pearls on pearl skills never lowers the bonus
  function pearlBonus(s) { return 1 + s.pearlsEver * (0.1 + sumFx(s, 'pearlval')); }
  function valueMult(s) {
    return (1 + sumFx(s, 'value')) * prodFx(s, 'valx') *
      collectionBonus(s) * pearlBonus(s) * (1 + gearFx(s, 'gvalue'));
  }
  function mastery(s, spId) {
    const c = s.caught[spId] || 0;
    let m = 1;
    for (const t of MASTERY) if (c >= t) m += 0.25;
    return m;
  }

  function zoneAt(depth) {
    let z = 0;
    for (let i = 0; i < ZONES.length; i++) if (depth >= ZONES[i].top) z = i;
    return z;
  }

  // ---------- skill tree ----------
  function nodeCost(n, level) { return Math.ceil(n.c * Math.pow(n.g, level)); }
  function nodeOpen(s, n) {
    if (n.cur === 'pearl') return s.pearlsEver > 0;
    return n.req.length === 0 || n.req.some((r) => lv(s, r) > 0);
  }
  // 'owned' | 'open' | 'peek' (shown as a mystery) | 'hidden'
  function nodeState(s, id) {
    const n = NODE[id];
    if (lv(s, id) > 0) return 'owned';
    if (nodeOpen(s, n)) return 'open';
    if (n.cur !== 'pearl' && n.req.some((r) => nodeOpen(s, NODE[r]))) return 'peek';
    return 'hidden';
  }
  function canBuy(s, id) {
    const n = NODE[id];
    if (!n || !nodeOpen(s, n) || lv(s, id) >= n.max) return false;
    const c = nodeCost(n, lv(s, id));
    return n.cur === 'pearl' ? s.pearls >= c : s.coins >= c;
  }
  function buy(s, id) {
    if (!canBuy(s, id)) return false;
    const n = NODE[id];
    const c = nodeCost(n, lv(s, id));
    if (n.cur === 'pearl') s.pearls -= c; else s.coins -= c;
    s.nodes[id] = lv(s, id) + 1;
    return true;
  }
  function affordableCount(s) {
    let k = 0;
    for (const n of NODES) if (canBuy(s, n.id)) k++;
    return k;
  }

  // ---------- one cast ----------
  const sizeCache = {};
  function spriteSize(name) {
    if (!sizeCache[name]) { const r = ATLAS[name]; sizeCache[name] = [r[2], r[3]]; }
    return sizeCache[name];
  }

  function pickSpecies(r, y, rare, glow) {
    let tot = 0;
    const cand = [];
    for (let i = 0; i < SPECIES.length; i++) {
      const sp = SPECIES[i];
      if (sp.boss || y < sp.d[0] || y > sp.d[1]) continue;
      // fade in over the first 12 m so zones blend
      const fade = Math.min(1, (y - sp.d[0]) / 12 + 0.15);
      const w = sp.w * fade * (sp.rare ? rare : 1) * (sp.glow ? glow || 1 : 1);
      cand.push([i, w]);
      tot += w;
    }
    let x = r() * tot;
    for (const [i, w] of cand) { x -= w; if (x <= 0) return i; }
    return cand.length ? cand[cand.length - 1][0] : 0;
  }

  function rollMutation(r, mutMult) {
    for (let m = MUTATIONS.length - 1; m >= 0; m--) {
      if (r() < MUTATIONS[m].chance * mutMult) return m;
    }
    return -1;
  }

  function makeFish(r, st, y, width, mutMult) {
    const spi = pickSpecies(r, y, st.rare, st.glow);
    const sp = SPECIES[spi];
    const mut = sp.junk ? -1 : rollMutation(r, mutMult);
    const scale = mut >= 0 ? MUTATIONS[mut].scale : 1;
    const [w, h] = spriteSize(sp.sprite);
    const dir = r() < 0.5 ? -1 : 1;
    return {
      sp: spi, mut, scale, y, x: 2 + r() * (width - 4), dir,
      vx: dir * sp.spd * (0.6 + r() * 0.6) * (st.fishSpd || 1),
      hw: (w * scale) / PXM / 2 * 0.8, hh: (h * scale) / PXM / 2 * 0.75,
      st: 0, ph: r() * 6.28, scare: 0, twin: false,
    };
  }

  // ---------- obstacles ----------
  // Placed from their own random stream, so the fish of a cast do not change when the
  // obstacle mix is tuned. Kinds:
  //   rock   solid, the hook slides around it (no penalty, just a detour)
  //   urchin spikes on a rock: brushing it on the way down turns the line back up
  //   mine   on the way down: turns the line up and scares fish away; on the way up: you lose a fish
  //   net    ghost net: everything is slow inside it
  //   cur    a current band that pushes the hook sideways
  //   vent   a bubble column that pushes the hook up
  const OBS_MIX = [
    { rock: 6, cur: 3, net: 1 },
    { rock: 3.5, urchin: 2.5, cur: 2, net: 2 },
    { rock: 2, urchin: 1.5, cur: 2, net: 1.5, mine: 3 },
    { rock: 1.5, urchin: 1, cur: 1.5, net: 1.5, mine: 3, vent: 1.5 },
    { rock: 2.5, cur: 1, net: 1, mine: 3, vent: 2.5 },
    { rock: 2, urchin: 1, cur: 1.5, net: 1, mine: 3, vent: 1.5 },
  ];
  function pick(r, mix) {
    let tot = 0;
    for (const k in mix) tot += mix[k];
    let x = r() * tot;
    for (const k in mix) { x -= mix[k]; if (x <= 0) return k; }
    return 'rock';
  }
  // wx: weather (cur scales current strength, curMore adds that much weight to currents)
  function makeObstacles(seed, width, end, tutorial, wx) {
    const r = rng((seed ^ 0x5bd1e995) >>> 0);
    const obs = [];
    const curK = wx ? wx.cur : 1, curMore = wx ? wx.curMore * 2 : 0;
    let y = tutorial ? 26 : 12;
    while (y < end) {
      const z = zoneAt(y);
      const k = pick(r, curMore ? Object.assign({}, OBS_MIX[z], { cur: (OBS_MIX[z].cur || 0) + curMore }) : OBS_MIX[z]);
      if (k === 'rock' || k === 'urchin') {
        // half the rocks grow out of the cliff walls, the rest float free
        const wall = r() < 0.5;
        const rad = wall ? 3 + r() * 4 + z * 0.4 : 1.5 + r() * 2;
        const x = wall ? (r() < 0.5 ? rad * 0.35 : width - rad * 0.35) : 8 + r() * (width - 16);
        const rock = { k: 'rock', x, y, r: rad, seed: (r() * 1e6) | 0 };
        obs.push(rock);
        if (k === 'urchin') {
          const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
          obs.push({ k: 'urchin', x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad, r: 0.8 });
        }
      } else if (k === 'mine') {
        if (y > 110) obs.push({ k: 'mine', x: 6 + r() * (width - 12), y, r: 1.1, ph: r() * 6 });
      } else if (k === 'net') {
        if (y > 18) obs.push({ k: 'net', x: 8 + r() * (width - 16), y, w: 7 + r() * 9, h: 3 + r() * 4 });
      } else if (k === 'cur') {
        obs.push({ k: 'cur', x: width / 2, y, h: 3 + r() * 3, v: (r() < 0.5 ? -1 : 1) * (5 + r() * 4 + z * 1.5) * curK });
      } else if (k === 'vent') {
        obs.push({ k: 'vent', x: 8 + r() * (width - 16), y, w: 3 + r() * 3, h: 14 + r() * 16 });
      }
      y += (7 + r() * 8) / (1 + 0.15 * z) * (100 / width);
    }
    obs.sort((a, b) => a.y - b.y);
    return obs;
  }
  // obstacles whose centre is in [y0, y1]; they are sorted by depth
  function obsIn(run, y0, y1, out) {
    const o = run.obs;
    let lo = 0, hi = o.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (o[m].y < y0) lo = m + 1; else hi = m; }
    out.length = 0;
    for (let i = lo; i < o.length && o[i].y <= y1; i++) out.push(o[i]);
    return out;
  }
  const near = [];

  // ---------- cast conditions ----------
  // Time of day turns every 3 casts and the weather holds for 4. Both come from the cast number
  // only, so the dock can show the next cast's conditions (and the ones after it) as a forecast
  // that is never wrong. Bait is the player's pick. See docs/DESIGN.md section 15.
  function hash32(n) {
    n = Math.imul((n >>> 0) ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return (n ^ (n >>> 16)) >>> 0;
  }
  const W_TOT = WEATHERS.reduce((t, w) => t + w.w, 0);
  function weatherAt(i) {
    if (i < 8) return WEATHERS[0]; // the first casts are always calm
    let x = (hash32(Math.floor(i / 4) * 7919 + 13) / 4294967296) * W_TOT;
    for (const w of WEATHERS) { x -= w.w; if (x < 0) return w; }
    return WEATHERS[0];
  }
  const timeAt = (i, moon) => (moon ? TIMES[3] : TIMES[Math.floor(i / 3) % TIMES.length]);
  const baitOpen = (s, id) => !!BAIT_BY[id] && s.zone >= BAIT_BY[id].zone;
  function setBait(s, id) {
    if (!baitOpen(s, id)) return false;
    s.bait = id;
    return true;
  }
  const isMoon = (s, i) => { const m = moonEvery(s); return m > 0 && (i + 1) % m === 0; };
  // conditions of cast number i (s.casts is the next one)
  function castCond(s, i) {
    const moon = isMoon(s, i);
    const time = timeAt(i, moon), weather = weatherAt(i);
    const bait = baitOpen(s, s.bait) ? BAIT_BY[s.bait] : BAITS[0];
    const fx = { dens: 1, rare: 1, glow: 1, mut: 1, spd: 1, val: 1, cur: 1, reel: 1, shallow: 1, curMore: 0 };
    for (const c of [time, weather, bait]) {
      for (const k in c.fx) { if (k === 'curMore') fx[k] += c.fx[k]; else fx[k] *= c.fx[k]; }
    }
    return { i, moon, time: time.id, weather: weather.id, bait: bait.id, fx };
  }

  // ---------- zone guardians ----------
  const BOSS_SCALE = 3.4;
  // A guardian you have met in a rematch leaves its arena for a while (counted in casts, like the
  // day and the weather, so changing the clock does nothing and the forecast stays exact):
  // 3 days (36 casts) after it is caught, 1 day (12 casts) after it gets away. A gate guardian
  // never rests; it is the wall. Caught again, it pays half (the first catch pays in full).
  // See docs/DESIGN.md section 14, "Rest".
  const REST_WIN = 36, REST_ESCAPE = 12, REMATCH_PAY = 0.5;
  // casts until a beaten guardian is back in its arena (0 = it is there)
  const bossRest = (s, id) => Math.max(0, (bossState(s, id).next || 0) - s.casts);
  const TELE = 0.45;          // the warning flash before a guardian's move (s)
  const bossState = (s, id) => (s.bosses && s.bosses[id]) || {};
  const bossOpen = (s, id) => { const b = bossState(s, id); return !!(b.won || b.free); };
  // the guardian that blocks the way down, or null when every gate is open
  function gateBoss(s) {
    for (const b of BOSSES) if (!bossOpen(s, b.id)) return b;
    return null;
  }
  // guardians in a cast: every open one whose arena the line can reach (a rematch, only when the
  // hook touches it) and the first closed one, which is a floor: reaching it starts the fight
  function makeBosses(s, seed, width, end) {
    const r = rng((seed ^ 0xb055f15) >>> 0);
    const out = [];
    for (const d of BOSSES) {
      const gate = !bossOpen(s, d.id);
      if (!gate && (d.y > end || bossRest(s, d.id) > 0)) continue;
      const spi = SP[d.id], sp = SPECIES[spi];
      const [w, h] = spriteSize(sp.sprite);
      const left = gate ? (bossState(s, d.id).left || 1) : 1;
      out.push({
        id: d.id, def: d, sp: spi, gate, y: d.y, x: 15 + r() * (width - 30), dir: r() < 0.5 ? -1 : 1,
        hw: (w * BOSS_SCALE) / PXM / 2 * 0.8, hh: (h * BOSS_SCALE) / PXM / 2 * 0.75, scale: BOSS_SCALE,
        hpMax: d.hp, hp: d.hp * left, hp0: 0, left, t: 0, tele: 0, move: null, dashT: 0, dive: 0, c: 0, ft: 0, ph: r() * 6,
      });
      if (gate) break;
    }
    return out;
  }

  function newRun(s, opts) {
    const o = opts || {};
    const st = stats(s);
    const width = o.width || 100;
    const seed = o.seed != null ? o.seed : (s.seed = (s.seed * 1103515245 + 12345) >>> 0);
    const r = rng(seed);
    const cond = castCond(s, s.casts);
    const wx = cond.fx;
    const moon = cond.moon;
    st.rare *= wx.rare; st.glow = wx.glow; st.fishSpd = wx.spd;
    st.reel *= wx.reel; st.valueMult *= wx.val;
    const mutMult = st.mut * wx.mut * (moon ? 3 : 1);
    const fish = [];
    let y = 5;
    const end = st.line + 8;
    // keep: the sea left by the last cast (see carryOver). Uncaught fish stay where they swam,
    // each caught one is replaced by a new fish at its depth, and only new depth gets new fish.
    const keep = o.keep;
    if (keep) {
      for (const k of keep.fish) {
        if (k.y >= end) continue;
        const f = Object.assign({}, k, { st: 0, scare: 0 });
        // a moon cast still lifts the odds for fish that are already there
        if (moon && f.mut < 0 && !SPECIES[f.sp].junk) {
          f.mut = rollMutation(r, mutMult);
          if (f.mut >= 0) {
            const [w, h] = spriteSize(SPECIES[f.sp].sprite);
            f.scale = MUTATIONS[f.mut].scale; f.hw = (w * f.scale) / PXM / 2 * 0.8; f.hh = (h * f.scale) / PXM / 2 * 0.75;
          }
        }
        fish.push(f);
      }
      for (const gy of keep.gaps) if (gy < end) fish.push(makeFish(r, st, gy, width, mutMult));
      y = Math.max(y, keep.end);
    }
    while (y < end) {
      const z = zoneAt(y);
      const dens = (y < 45 ? 0.42 : 0.24 + 0.05 * z) * (width / 100) * wx.dens * (y < 90 ? wx.shallow : 1);
      y += (0.4 + r() * 1.2) / dens;
      if (y < end) fish.push(makeFish(r, st, y, width, mutMult));
    }
    // the first casts always have a few easy fish right under the boat, so nobody starts empty-handed
    if (s.casts < 3 && !keep) {
      for (const d of [9, 13, 17]) {
        const f = makeFish(r, st, d, width, 0);
        f.sp = SP.goldfish; f.mut = -1; f.scale = 1; f.x = width * 0.5 + (r() < 0.5 ? -1 : 1) * (5 + r() * 8); f.vx *= 0.3;
        fish.push(f);
      }
    }
    fish.sort((a, b) => a.y - b.y);
    const x0 = o.x != null ? Math.max(1, Math.min(width - 1, o.x)) : width * 0.5;
    const bosses = makeBosses(s, seed, width, end);
    const gate = bosses.find((b) => b.gate);
    // arenas are open water: no rocks, spikes or mines within 9 m of a guardian
    const obs = makeObstacles(seed, width, end, s.casts < 3, wx).filter((ob) => !bosses.some((b) => Math.abs(ob.y - b.y) < 9));
    return {
      st, r, seed, width, moon, cond, fish, end, keep, obs, bosses, floor: gate ? gate.y : Infinity, fight: null, trophy: null, bossRes: null,
      events: [], t: 0,
      phase: 'down', x: x0, y: 0, vx: 0, vy: 0, maxY: 0, paid: 0, guard: st.guard,
      caught: [], lost: 0, cnt: { boom: 0, sting: 0, guard: 0 }, slowLeft: st.slow * 0.7, slowT: 0, timeScale: 1, zone: 0, inNet: null, inCur: null,
    };
  }

  // What a finished cast leaves in the sea, to pass as newRun(s, { keep }). Only the water you
  // can see from the dock (down to `to` metres) is kept; deeper down the fish move on, so the
  // sea keeps mixing and upgrades that change the catch still show up there.
  function carryOver(run, to) {
    if (!run) return null;
    const end = Math.min(run.end, to || KEEP_TO);
    const fish = [], gaps = [];
    for (const f of run.fish) {
      if (f.y >= end) continue;
      if (f.st === 1) gaps.push(f.y); else fish.push(f);
    }
    return { fish, gaps, end };
  }

  // Advance a cast by dt seconds. target: {x, y} in metres for the hook to chase (it follows
  // with a little lag, like a weight on a line), or a number for x only (keeps going forward),
  // or null to keep going straight.
  function stepRun(run, dt, target) {
    if (run.phase === 'done') return run;
    run.events.length = 0;
    // focus: slow motion just before a collision
    if (run.slowT > 0) { run.slowT -= dt; dt *= 0.35; }
    run.timeScale = run.slowT > 0 ? 0.35 : 1;
    run.t += dt;
    let tx = run.x, ty = null;
    if (typeof target === 'number') tx = target;
    else if (target) { tx = target.x; ty = target.y; }
    run.tx = Math.max(1, Math.min(run.width - 1, tx));
    run.ty = ty;
    // fish swim; wrap around the edges
    for (const f of run.fish) {
      if (f.st === 1) continue;
      const sp = f.scare > 0 ? 3 : 1;
      if (f.scare > 0) f.scare -= dt;
      f.x += f.vx * sp * dt;
      f.ph += dt * (2 + Math.abs(f.vx) * 0.3);
      if (f.x < -3) f.x = run.width + 3; else if (f.x > run.width + 3) f.x = -3;
      if (f.st === 2 && f.scare <= 0) f.st = 0;
    }
    for (const b of run.bosses) if (b !== run.fight && !b.won) swimBoss(run, b, dt);
    if (run.phase === 'down') stepDown(run, dt);
    else if (run.phase === 'fight') stepFight(run, dt);
    else stepUp(run, dt);
    const z = zoneAt(run.y);
    if (z !== run.zone) { run.zone = z; run.events.push({ t: 'zone', z }); }
    return run;
  }

  // horizontal chase with lag, shared by both directions
  function chaseX(run, dt) {
    const st = run.st;
    const want = Math.max(-st.steer, Math.min(st.steer, (run.tx - run.x) * 4));
    run.vx += (want - run.vx) * (1 - Math.exp(-dt * 7));
  }

  // currents, nets, vents and rocks; returns the speed factor for this step
  function environment(run, dt) {
    const st = run.st;
    let slow = 1, push = 0, lift = 0, net = null, cur = null;
    for (const o of obsIn(run, run.y - 10, run.y + 32, near)) {
      if (o.k === 'cur') {
        if (Math.abs(run.y - o.y) < o.h / 2) { push += o.v; cur = o; }
      } else if (o.k === 'net') {
        if (Math.abs(run.y - o.y) < o.h / 2 && Math.abs(run.x - o.x) < o.w / 2) { slow = 0.35; net = o; }
      } else if (o.k === 'vent') {
        if (run.y <= o.y + 1 && run.y > o.y - o.h && Math.abs(run.x - o.x) < o.w / 2) lift = st.sink * 0.7;
      }
    }
    if (net && run.inNet !== net) run.events.push({ t: 'net', o: net });
    if (cur && run.inCur !== cur) run.events.push({ t: 'current', o: cur });
    run.inNet = net; run.inCur = cur;
    run.x += (run.vx * slow + push) * dt;
    return { slow, lift };
  }

  function solid(run) {
    for (const o of near) {
      if (o.k !== 'rock') continue;
      const dx = run.x - o.x, dy = run.y - o.y;
      const d = Math.hypot(dx, dy), m = o.r + 0.4;
      if (d < m && d > 1e-6) {
        run.x = o.x + (dx / d) * m; run.y = o.y + (dy / d) * m;
        // cancel the part of the velocity that points into the rock
        const nx = dx / d, ny = dy / d, vn = run.vx * nx + run.vy * ny;
        if (vn < 0) { run.vx -= vn * nx; run.vy -= vn * ny; }
        // reeling up into the underside of a rock: slide off towards open water, so a hook
        // pressed against a wall rock cannot get pinned there
        if (run.phase === 'up' && ny > 0.2) {
          const wall = o.x < o.r ? 1 : o.x > run.width - o.r ? -1 : 0;
          run.x += (wall || (dx >= 0 ? 1 : -1)) * 0.2;
        }
      }
    }
    run.x = Math.max(1, Math.min(run.width - 1, run.x));
  }

  // urchins and mines; returns true when the line was turned
  function hazards(run) {
    for (const o of near) {
      if ((o.k !== 'mine' && o.k !== 'urchin') || o.gone) continue;
      if (Math.hypot(run.x - o.x, run.y - o.y) > o.r + HIT_R) continue;
      if (run.guard > 0 && run.phase === 'down') {
        run.guard--;
        if (o.k === 'mine') o.gone = true;
        run.cnt.guard++;
        run.events.push({ t: 'guard', o });
        continue;
      }
      if (o.k === 'urchin') {
        if (run.phase !== 'down') continue;
        run.cnt.sting++;
        run.events.push({ t: 'sting', o });
        turn(run, 'sting');
        return true;
      }
      o.gone = true;
      run.cnt.boom++;
      run.events.push({ t: 'boom', o });
      for (const f of run.fish) {
        if (f.st === 0 && Math.abs(f.y - o.y) < 9 && Math.abs(f.x - o.x) < 12) { f.st = 2; f.scare = 2; f.vx = (f.x < o.x ? -1 : 1) * Math.abs(f.vx); }
      }
      if (run.phase === 'down') { turn(run, 'boom'); return true; }
      if (run.caught.length) {
        const f = run.caught.pop();
        f.st = 2; f.scare = 2;
        run.lost++;
        run.events.push({ t: 'lost', f });
      }
    }
    return false;
  }

  // The line is a length, not a depth: every metre the hook travels on the way down pays out
  // line, sideways too (currents and detours around rocks included). When it is all out the
  // hook turns, wherever it is. Sideways metres cost st.side each.
  function payOut(run, x0, y0) {
    const dx = (run.x - x0) * run.st.side, dy = Math.max(0, run.y - y0);
    run.paid += Math.hypot(dx, dy);
  }
  const lineLeft = (run) => Math.max(0, run.st.line - run.paid);

  function stepDown(run, dt) {
    const st = run.st;
    const fast = run.paid < st.line * st.fall;
    const x0 = run.x, y0 = run.y;
    chaseX(run, dt);
    let want = st.sink;
    if (fast) want = st.sink * 4;
    else if (run.ty != null) want = Math.max(-st.sink * 0.5, Math.min(st.sink, (run.ty - run.y) * 2.5));
    run.vy += (want - run.vy) * (1 - Math.exp(-dt * (fast ? 20 : 6)));
    const env = environment(run, dt);
    run.y += (run.vy * env.slow - env.lift) * dt;
    if (run.y < 2) { run.y = 2; if (run.vy < 0) run.vy = 0; }
    solid(run);
    // a closed guardian is a floor: the line cannot pass its arena
    if (run.y > run.floor) run.y = run.floor;
    payOut(run, x0, y0);
    if (run.paid >= st.line) { run.paid = st.line; turn(run, 'bottom'); return; }
    if (run.y >= run.floor) { startFight(run, run.bosses.find((b) => b.gate)); return; }
    if (fast) return;
    for (const b of run.bosses) {
      if (!b.gate && !b.won && !b.gone && Math.abs(run.y - b.y) < b.hh + HIT_R && Math.abs(run.x - b.x) < b.hw + HIT_R) { startFight(run, b); return; }
    }
    if (hazards(run)) return;
    const look = Math.max(0, run.vy);
    for (const f of run.fish) {
      if (f.st !== 0) continue;
      const dy = f.y - run.y;
      if (dy < -f.hh - 1 || dy > f.hh + HIT_R + look * 0.3) continue;
      // look ahead a little for the focus slow-motion
      if (run.slowLeft > 0 && run.guard <= 0 && run.slowT <= 0 && dy > f.hh && dy < f.hh + look * 0.22 &&
          Math.abs(f.x + f.vx * 0.2 - run.x) < f.hw + HIT_R) {
        run.slowT = 0.5;
        run.slowLeft -= 0.5;
        run.events.push({ t: 'slow' });
      }
      if (Math.abs(dy) < f.hh + HIT_R && Math.abs(f.x - run.x) < f.hw + HIT_R) {
        if (run.guard > 0) {
          run.guard--;
          run.cnt.guard++;
          f.st = 2; f.scare = 1.2; f.vx = (f.x < run.x ? -1 : 1) * Math.abs(f.vx);
          run.events.push({ t: 'guard', f });
        } else {
          // the fish you bump into bites: it is your first catch, and the line turns back up
          run.events.push({ t: 'hit', f });
          turn(run, 'hit');
          hook(run, f);
          return;
        }
      }
    }
  }

  // a guardian that is not fighting cruises its arena slowly
  function swimBoss(run, b, dt) {
    b.ph += dt * 2;
    b.x += b.dir * b.def.spd * 0.25 * dt;
    if (b.x < 8) { b.x = 8; b.dir = 1; } else if (b.x > run.width - 8) { b.x = run.width - 8; b.dir = -1; }
  }

  function startFight(run, b) {
    run.phase = 'fight';
    run.fight = b;
    // a gate guardian lunges for the hook; a rematch is where you touched it
    if (b.gate) b.x = Math.max(6, Math.min(run.width - 6, run.x));
    b.y = run.y = b.def.y;
    // the strike pulls the line tight: what is out is the straight drop, the rest is slack to fight
    // with. The reel's drag always gives at least 15% of the depth, so arriving on your last metres
    // of line is hard but never hopeless; every metre of line past that is extra room.
    run.paid = Math.min(b.y, run.st.line - b.y * 0.15);
    b.hp0 = b.hp;
    b.t = 1.2; b.tele = 0; b.dashT = 0; b.dive = 0; b.ft = 0;
    b.dir = b.x < run.width / 2 ? 1 : -1; // runs for open water first
    run.vx = 0; run.vy = 0;
    run.events.push({ t: 'bossStart', b });
  }

  // The fight: the guardian runs left or right and every metre it runs takes line. Pull the other
  // way (aim the hook on the far side of where it is heading) to slow it down, reel line back in
  // and tire it faster. Every few seconds it flashes, then turns (run), bursts (dash), pulls down
  // (dive) or only pretends (feint). It is caught when its stamina is gone; it escapes when the
  // line runs out. See docs/DESIGN.md section 14.
  function stepFight(run, dt) {
    const st = run.st, b = run.fight, d = b.def;
    b.ft += dt;
    b.t -= dt;
    if (!b.tele && b.t <= TELE) {
      b.tele = 1;
      b.move = d.moves[Math.floor(run.r() * d.moves.length)];
      run.events.push({ t: 'bossTele', b });
    }
    if (b.t <= 0) {
      b.tele = 0;
      b.t = d.turn[0] + run.r() * (d.turn[1] - d.turn[0]);
      if (b.move !== 'feint') b.dir = -b.dir;
      if (b.move === 'dash') b.dashT = 0.8;
      if (b.move === 'dive') b.dive = 6;
      run.events.push({ t: 'bossMove', b, move: b.move });
    }
    // counter: 0 when the aim follows the guardian, 1 when it is 4 m or more on the other side
    const c = Math.max(0, Math.min(1, -(run.tx - b.x) * b.dir / 4));
    b.c += (c - b.c) * (1 - Math.exp(-dt * 10));
    const ramp = Math.min(1, b.ft / 0.8);
    const spd = d.spd * (b.dashT > 0 ? 1.8 : 1) * (1 - 0.75 * b.c) * ramp;
    b.dashT -= dt;
    const dx = b.dir * spd * dt;
    b.x += dx;
    if (b.x < 4) { b.x = 4; b.dir = 1; } else if (b.x > run.width - 4) { b.x = run.width - 4; b.dir = -1; }
    let dy = 0;
    if (b.dive > 0) { dy = Math.min(b.dive, 6 * dt); b.dive -= dy; }
    else if (b.y > d.y) dy = -Math.min(b.y - d.y, 3 * b.c * dt);
    b.y += dy;
    // line: the guardian takes `pull` of its depth per second while it runs free, less the harder
    // you pull against it, and you reel some back while you hold it. Bursts and dives pull double.
    const pull = d.pull * d.y * (b.dashT > 0 ? 1.8 : 1) * (dy > 0 ? 2 : 1) * ramp;
    run.paid += pull * ((1 - 0.75 * b.c) - 0.6 * b.c) * dt;
    run.paid = Math.max(run.paid, Math.min(b.y, run.st.line - b.y * 0.15));
    b.hp -= st.reel * (0.2 + 0.8 * b.c) * dt;
    run.x = b.x; run.y = b.y; run.vx = dx / Math.max(dt, 1e-6);
    if (b.hp <= 0) {
      b.hp = 0; b.won = true;
      run.trophy = { sp: b.sp, mut: -1, twin: false, x: b.x, y: b.y, boss: b.id };
      run.bossRes = { id: b.id, win: true, gate: b.gate, left: 0 };
      run.floor = Infinity;
      run.events.push({ t: 'bossWin', b });
      run.fight = null;
      turn(run, 'boss');
    } else if (run.paid >= st.line) {
      // it tires a little for good: half of the stamina taken this fight stays taken
      const left = Math.max(0.05, (b.hp + 0.5 * (b.hp0 - b.hp)) / b.hpMax);
      b.left = left; b.hp = b.hpMax * left; b.gone = true;
      run.paid = st.line;
      run.bossRes = { id: b.id, win: false, gate: b.gate, left };
      run.events.push({ t: 'bossEscape', b });
      run.fight = null;
      turn(run, 'escape');
    }
  }

  function turn(run, why) {
    run.phase = 'up';
    run.maxY = Math.max(run.maxY, run.y);
    run.vy = 0;
    run.events.push({ t: 'turn', why });
  }

  function hook(run, f) {
    f.st = 1;
    f.twin = run.r() < run.st.twin;
    run.caught.push(f);
    run.events.push({ t: 'catch', f, n: run.caught.length });
    if (run.caught.length >= run.st.cap) run.events.push({ t: 'full' });
  }

  function stepUp(run, dt) {
    const st = run.st;
    chaseX(run, dt);
    const env = environment(run, dt);
    run.y -= (st.reel * env.slow + env.lift * 0.6) * dt;
    solid(run);
    hazards(run);
    const full = run.caught.length >= st.cap;
    if (!full) {
      if (st.song > 0) {
        const R = 4 + st.song * 3;
        for (const f of run.fish) {
          if (f.st !== 0) continue;
          const dy = run.y - f.y;
          if (dy > 0 && dy < 14 && Math.abs(f.x - run.x) < R) f.x += Math.sign(run.x - f.x) * Math.min(Math.abs(run.x - f.x), (2 + st.song * 2) * dt);
        }
      }
      for (const f of run.fish) {
        if (f.st !== 0) continue;
        if (Math.abs(f.y - run.y) < f.hh + st.reach && Math.abs(f.x - run.x) < f.hw + st.reach) {
          hook(run, f);
          if (run.caught.length >= st.cap) break;
        }
      }
    }
    if (run.y <= 0) { run.y = 0; run.phase = 'done'; run.events.push({ t: 'surface' }); }
  }

  // ---------- rewards ----------
  function fishValue(s, st, f) {
    const sp = SPECIES[f.sp];
    let v = sp.value * (sp.junk ? st.junk : 1) * mastery(s, sp.id);
    // the weird deep has no floor: its fish keep getting richer the deeper they live
    if (sp.shadow) v *= Math.pow(1.25, Math.max(0, f.y - DEEP_TOP) / 500);
    if (st.deep && f.y >= PRESTIGE_DEPTH) v *= 1 + st.deep;
    if (f.mut >= 0) v *= MUTATIONS[f.mut].mult * st.mutVal;
    return v * st.valueMult;
  }

  // Preview of a finished cast; does not change the save.
  function haul(s, run) {
    const st = run.st;
    const items = run.caught.map((f) => ({ sp: f.sp, mut: f.mut, twin: f.twin, value: fishValue(s, st, f) * (f.twin ? 2 : 1) }));
    let cat = null;
    if (items.length && st.cat > 0 && run.r() < st.cat) {
      const best = items.reduce((a, b) => (b.value > a.value ? b : a));
      cat = { sp: best.sp, mut: best.mut, twin: false, value: best.value / (best.twin ? 2 : 1), cat: true };
      items.push(cat);
    }
    // a guardian rides up on the hook; it does not take a crate slot and the cat leaves it alone
    if (run.trophy) {
      const first = !s.caught[SPECIES[run.trophy.sp].id];
      items.push({ sp: run.trophy.sp, mut: -1, twin: false, value: fishValue(s, st, run.trophy) * (first ? 1 : REMATCH_PAY), boss: true });
    }
    const base = items.reduce((t, i) => t + i.value, 0);
    const fullB = run.caught.length >= st.cap ? st.full : 0;
    const bulkB = st.bulk * items.length;
    const total = Math.floor(base * (1 + fullB + bulkB));
    return {
      items, base, fullB, bulkB, total, depth: Math.floor(run.maxY), moon: run.moon, cat: !!cat,
      full: run.caught.length >= st.cap, cnt: Object.assign({ lost: run.lost }, run.cnt), time: run.t,
      boss: run.bossRes, cond: run.cond && { time: run.cond.time, weather: run.cond.weather, bait: run.cond.bait, val: run.cond.fx.val },
    };
  }

  // Apply a haul to the save. Also keeps the activity record and pays shells: 1 for every new
  // species, 2 and 5 for the 250 and 1000 mastery steps of a kind.
  const MASTERY_SHELLS = [0, 0, 2, 5];
  function settle(s, h, mult) {
    const m = mult || 1;
    const gained = h.total * m;
    s.coins += gained; s.seasonEarned += gained; s.lifetime += gained;
    s.casts++;
    const rec = s.rec;
    const fresh = [];
    let fishN = 0, shells = 0, top = null;
    for (const it of h.items) {
      const sp = SPECIES[it.sp];
      const n = it.twin ? 2 : 1;
      if (!s.caught[sp.id]) { fresh.push(sp.id); shells++; }
      const before = s.caught[sp.id] || 0;
      s.caught[sp.id] = before + n;
      MASTERY.forEach((t, i) => { if (before < t && before + n >= t) shells += MASTERY_SHELLS[i]; });
      if (sp.junk) rec.junk += n; else { rec.fish += n; fishN += n; }
      if (it.mut >= 0) rec.mut[it.mut] += n;
      if (!sp.junk && (!top || it.value > top.value)) top = it;
      const key = sp.id + ':' + (it.mut >= 0 ? MUTATIONS[it.mut].id : 'n');
      s.variants[key] = 1;
    }
    if (h.depth > s.best) s.best = h.depth;
    if (h.depth > s.bestEver) s.bestEver = h.depth;
    s.zone = Math.max(s.zone, zoneAt(s.bestEver));
    if (gained > rec.bestHaul) rec.bestHaul = gained;
    if (fishN > rec.bestHaulFish) rec.bestHaulFish = fishN;
    // the proudest single fish ever: most valuable at the time it was caught
    if (top && (!rec.bestFish || top.value > rec.bestFish.value)) rec.bestFish = { sp: SPECIES[top.sp].id, mut: top.mut, value: top.value };
    if (h.full && h.items.length) rec.full++;
    if (h.moon) rec.moon++;
    if (h.cnt) { rec.boom += h.cnt.boom; rec.sting += h.cnt.sting; rec.lost += h.cnt.lost; rec.guard += h.cnt.guard; }
    rec.metres += h.depth || 0;
    rec.castTime += h.time || 0;
    if (h.cond && h.cond.weather === 'badai') rec.storm++;
    // guardians: the first win opens the gate for good and pays shells; a gate guardian that got
    // away keeps the stamina it lost, so every attempt gets you closer
    let bossFirst = null;
    if (h.boss) {
      if (!s.bosses) s.bosses = {};
      const b = s.bosses[h.boss.id] || (s.bosses[h.boss.id] = {});
      rec.fights++;
      if (h.boss.win) {
        if (!b.won) { b.won = 1; bossFirst = h.boss.id; shells += BOSS_BY[h.boss.id].shells; }
        delete b.left;
        b.next = s.casts + REST_WIN;
      } else {
        rec.escapes++;
        if (!b.won && !b.free) b.left = h.boss.left;
        else b.next = s.casts + REST_ESCAPE;
      }
    }
    addShells(s, shells);
    return { gained, fresh, shells, bossFirst };
  }

  // ---------- idle pen ----------
  function pondRate(s) {
    const st = stats(s);
    if (!st.pond) return 0;
    let t = 0;
    for (const sp of SPECIES) {
      if (sp.boss) continue;
      const c = s.caught[sp.id] || 0;
      if (c) t += sp.value * Math.sqrt(Math.min(c, 2000));
    }
    return t * 0.003 * st.pondMult * st.valueMult;
  }
  function offline(s, seconds) {
    const st = stats(s);
    const sec = Math.max(0, Math.min(seconds, st.offlineH * 3600));
    return { seconds: sec, coins: Math.floor(pondRate(s) * sec), capped: seconds > st.offlineH * 3600 };
  }

  // ---------- seasons (prestige) ----------
  // Pearls are paid for new depth records, not for coins: the record is worth
  // 5 * sqrt((depth - 380) / 100) pearls in total (480 m = 5, 1000 m = 12, 2000 m = 20,
  // 5000 m = 34) and a season pays the part you have not been paid yet, at least 1.
  // Quick resets can not farm pearls, and pushing deeper always pays.
  const depthPearls = (d) => (d < PRESTIGE_DEPTH ? 0 : Math.floor(5 * Math.sqrt((d - 380) / 100)));
  function prestigeGain(s) {
    if (s.best < PRESTIGE_DEPTH) return 0;
    return Math.max(1, depthPearls(s.best) - (s.pearlDepth || 0));
  }
  function prestige(s) {
    const g = prestigeGain(s);
    if (g <= 0) return 0;
    s.pearls += g; s.pearlsEver += g; s.seasons++;
    addShells(s, SEASON_SHELLS);
    s.pearlDepth = Math.max(s.pearlDepth || 0, depthPearls(s.best));
    s.coins = 0; s.seasonEarned = 0; s.best = 0;
    const keep = { root: 1 };
    for (const n of NODES) if (n.cur === 'pearl' && s.nodes[n.id]) keep[n.id] = s.nodes[n.id];
    s.nodes = keep;
    return g;
  }

  // ---------- shells, achievements, gear ----------
  const SEASON_SHELLS = 5;
  function addShells(s, n) { if (n > 0) { s.shells += n; s.shellsEver += n; } }
  const BUYABLE_GEAR = GEAR.filter((g) => g.cost > 0).length;
  const ALL_VARIANTS = SPECIES.reduce((t, sp) => t + (sp.junk || sp.boss ? 1 : 1 + MUTATIONS.length), 0);
  function achValue(s, k) {
    const r = s.rec;
    switch (k) {
      case 'fish': return r.fish;
      case 'junk': return r.junk;
      case 'casts': return s.casts;
      case 'depth': return s.bestEver;
      case 'coins': return s.lifetime;
      case 'species': return Object.keys(s.caught).length;
      case 'variants': return Object.keys(s.variants).length;
      case 'gold': return r.mut[1];
      case 'prism': return r.mut[2];
      case 'titan': return r.mut[3];
      case 'haulFish': return r.bestHaulFish;
      case 'full': return r.full;
      case 'moon': return r.moon;
      case 'boom': return r.boom;
      case 'sting': return r.sting;
      case 'seasons': return s.seasons;
      case 'pearls': return s.pearlsEver;
      case 'master': { let n = 0; for (const id in s.caught) if (s.caught[id] >= MASTERY[MASTERY.length - 1]) n++; return n; }
      case 'time': return s.playTime;
      case 'days': return r.days;
      case 'boss': return BOSSES.filter((b) => bossState(s, b.id).won).length;
      case 'storm': return r.storm || 0;
      case 'gear': return Object.keys(s.gear.owned).filter((id) => GEAR_BY[id] && GEAR_BY[id].cost > 0).length;
      default: return 0;
    }
  }
  // goal 0 means "all of them"
  function achGoal(a) {
    if (a.goal) return a.goal;
    if (a.k === 'species') return SPECIES.length;
    if (a.k === 'gear') return BUYABLE_GEAR;
    if (a.k === 'variants') return ALL_VARIANTS;
    return 1;
  }
  function achProgress(s, a) { return Math.min(1, achValue(s, a.k) / achGoal(a)); }
  // Unlocks every achievement whose goal is met; returns the new ones (shells already paid).
  function checkAch(s) {
    const out = [];
    for (const a of ACH) {
      if (s.ach[a.id] || achValue(s, a.k) < achGoal(a)) continue;
      s.ach[a.id] = Date.now();
      addShells(s, SHELL_PAY[a.tier]);
      out.push(a);
    }
    return out;
  }
  // counts distinct days played; day is a local 'YYYY-MM-DD' string from the caller
  function markDay(s, day, now) {
    const r = s.rec;
    if (!r.first) r.first = now || 0;
    if (r.lastDay === day) return false;
    r.lastDay = day; r.days++;
    return true;
  }
  // 'owned' | 'buy' (affordable) | 'open' (not enough shells) | 'locked' (zone or achievement missing)
  function gearState(s, id) {
    const g = GEAR_BY[id];
    if (s.gear.owned[id]) return 'owned';
    if (s.zone < g.zone || (g.ach && !s.ach[g.ach])) return 'locked';
    return s.shells >= g.cost ? 'buy' : 'open';
  }
  function buyGear(s, id) {
    if (gearState(s, id) !== 'buy') return false;
    const g = GEAR_BY[id];
    s.shells -= g.cost;
    s.gear.owned[id] = 1;
    s.gear[g.kind] = id;
    return true;
  }
  function equip(s, id) {
    const g = GEAR_BY[id];
    if (!g || !s.gear.owned[id]) return false;
    s.gear[g.kind] = id;
    return true;
  }

  const E = {
    DATA: D, NODE, SP, PXM, PRESTIGE_DEPTH, rng, newSave, migrate, lv, stats, valueMult, collectionBonus, mastery,
    zoneAt, nodeCost, nodeState, canBuy, buy, affordableCount, newRun, carryOver, lineLeft, stepRun, haul, settle, fishValue,
    pondRate, offline, prestigeGain, prestige, spriteSize, obsIn,
    BOSS_BY, BAIT_BY, castCond, weatherAt, timeAt, baitOpen, setBait, gateBoss, bossState, bossOpen, bossRest, REST_WIN, REST_ESCAPE, REMATCH_PAY,
    GEAR_BY, gearFx, achValue, achGoal, achProgress, checkAch, markDay, gearState, buyGear, equip, addShells, newRec,
  };
  if (typeof module !== 'undefined') module.exports = E; else root.KL.Engine = E;
})(this);
