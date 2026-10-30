// Economy simulation: a bot plays real casts with the real engine and buys skills the way
// players do (cheapest affordable first). Prints when each milestone is reached.
//
//   node scripts/balance.js [skill=0.6] [hours=6] [seasons=3]   play and print a timeline
//   node scripts/balance.js --tune [--write]                     fit TIER costs to TARGET pacing
//
// Pacing targets (minutes of play in the first season) live in TARGET below; docs/BALANCE.md
// explains why they are what they are.
const fs = require('fs');
const path = require('path');
const E = require('../js/engine.js');
const Bot = require('../js/bot.js');
const { ZONES, NODES, TIER, applyTier, GEAR } = E.DATA;

const TARGET = [0, 1.2, 7, 18, 40, 85]; // minute each zone is first reached, season 1
const OVERHEAD = 4;                      // seconds per cast on the haul screen and casting
const fmt = (n) => (n >= 1e12 ? (n / 1e12).toFixed(1) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n) + '');
const mm = (t) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, '0')}`;

function shop(s) {
  for (;;) {
    const opts = NODES.filter((n) => E.canBuy(s, n.id)).map((n) => ({ n, c: E.nodeCost(n, E.lv(s, n.id)) }));
    if (!opts.length) return;
    // pearl nodes first, then the cheapest coin node
    opts.sort((a, b) => (a.n.cur === b.n.cur ? a.c - b.c : a.n.cur === 'pearl' ? -1 : 1));
    E.buy(s, opts[0].n.id);
  }
}

// Achievements pay shells; the bot buys the cheapest outfit or boat it can and wears the newest
// (later items are stronger). Returns the names it bought this time.
function gearShop(s) {
  const got = E.checkAch(s).map((a) => 'ach ' + a.name.en);
  for (;;) {
    const opts = GEAR.filter((g) => E.gearState(s, g.id) === 'buy').sort((a, b) => a.cost - b.cost);
    if (!opts.length) return got;
    E.buyGear(s, opts[0].id);
    got.push('gear ' + opts[0].name.en);
  }
}

// Plays until `hours` or `seasons` run out. Returns zone entry times per season.
function simulate({ skill = 0.6, hours = 6, seasons = 3, seed = 12345, log = null, prestigeAt = null, stopAtZone = 99 }) {
  const s = E.newSave();
  s.seed = seed;
  let t = 0, season = 0, seasonStart = 0, casts = 0, lastReport = 0, win = { t: 0, n: 0, inc: 0 };
  const recent = [];
  const entry = [[]];
  let sea = null; // the sea carries over between casts, like in the game
  const fights = {}; // guardian attempts per boss
  const say = (m) => log && log(`${mm(t).padStart(7)}  ${m}`);
  while (t < hours * 3600 && season < seasons) {
    const st = E.stats(s);
    const run = Bot.playCast(s, st.auto ? Math.max(skill, st.autoSkill) : skill, { width: 100, keep: sea });
    sea = E.carryOver(run);
    const h = E.haul(s, run);
    const dt = run.t + OVERHEAD;
    const pond = E.pondRate(s) * dt;
    s.coins += pond; s.seasonEarned += pond; s.lifetime += pond;
    const res = E.settle(s, h);
    t += dt; casts++;
    if (h.boss) {
      const f = fights[h.boss.id] || (fights[h.boss.id] = { tries: 0, wins: 0, time: 0 });
      f.tries++; f.time += run.t;
      if (h.boss.win) f.wins++;
      if (res.bossFirst) say(`beat ${h.boss.id} after ${f.tries} tries (line ${st.line}, reel ${st.reel.toFixed(1)}, cast ${run.t.toFixed(1)}s)`);
      else if (!h.boss.win && f.tries <= 3) say(`  ${h.boss.id} got away, ${(h.boss.left * 100).toFixed(0)}% stamina left (line ${st.line})`);
    }
    s.playTime += dt;
    for (const m of gearShop(s)) if (m.startsWith('gear') || log === console.log && process.argv.includes('--ach')) say(`${m} (shells ${s.shells})`);
    recent.push(h.total); if (recent.length > 5) recent.shift();
    win.t += dt; win.n++; win.inc += h.total + pond;
    if (casts === 1) say(`first cast: ${h.items.length} fish, ${h.total} coins, ${run.t.toFixed(1)}s`);
    const had = Object.keys(s.nodes).length;
    shop(s);
    if (casts > 0 && had === 1 && Object.keys(s.nodes).length > 1) say('first skill bought');
    const z = E.zoneAt(s.best);
    if (entry[season][z] == null) {
      for (let i = 0; i <= z; i++) if (entry[season][i] == null) entry[season][i] = (t - seasonStart) / 60;
      if (z >= stopAtZone) break;
      say(`S${season + 1} reached ${ZONES[z].name.en} (${s.best}m)  line ${st.line} cap ${st.cap} value x${st.valueMult.toFixed(1)} cast ~${fmt(recent.reduce((a, b) => a + b, 0) / recent.length)}`);
    }
    if (t - lastReport > 900) {
      lastReport = t;
      const owned = NODES.filter((n) => n.cur === 'coin' && E.lv(s, n.id) > 0).length;
      say(`  ~ ${(win.t / win.n - OVERHEAD).toFixed(1)}s/cast, ${fmt(win.inc / win.t)}/s (pen ${fmt(E.pondRate(s))}/s), nodes ${owned}/${NODES.filter((n) => n.cur === 'coin').length}, line ${st.line}, cap ${st.cap}, species ${Object.keys(s.caught).length}`);
      win = { t: 0, n: 0, inc: 0 };
    }
    const g = E.prestigeGain(s);
    const left = NODES.filter((n) => n.cur === 'coin' && E.lv(s, n.id) < n.max).length;
    // a sensible player resets once a new record pays a few pearls, or after a long season
    const want = prestigeAt ? prestigeAt(s, g, left, t - seasonStart) : g >= 4 || (g >= 1 && t - seasonStart > 3600);
    if (want && g > 0) {
      say(`*** new season: +${g} pearls (season earned ${fmt(s.seasonEarned)}) after ${mm(t - seasonStart)}`);
      E.prestige(s); season++; seasonStart = t; entry.push([]);
      shop(s);
    }
  }
  say(`end: ${casts} casts, shells ${s.shells} (ever ${s.shellsEver}), achievements ${Object.keys(s.ach).length}/${E.DATA.ACH.length}, pearls ${s.pearls}, species ${Object.keys(s.caught).length}/${E.DATA.SPECIES.length}, variants ${Object.keys(s.variants).length}`);
  return { entry, save: s, t, fights };
}

function firstSeason(T, upTo) {
  applyTier(T);
  const res = [11, 22, 33].map((seed) => simulate({ seed, hours: 4, seasons: 1, prestigeAt: () => false, stopAtZone: upTo }).entry[0]);
  return TARGET.map((_, z) => {
    const v = res.map((r) => (r[z] == null ? 999 : r[z]));
    return v.reduce((a, b) => a + b, 0) / v.length;
  });
}

if (require.main !== module) {
  // used as a library (tests, diagnostics)
} else if (process.argv.includes('--tune')) {
  const T = TIER.slice();
  // which zone each TIER mostly decides: the line node of that tier is what reaches it
  // (line1 -> Reef, line2 -> Open Blue + Twilight, line3 -> Trench, line4 -> Weird Deep)
  const GATE = [[0, 1], [1, 3], [2, 4], [3, 5]];
  for (const [i, z] of GATE) {
    let lo = T[i] / 300, hi = T[i] * 300;
    for (let k = 0; k < 14; k++) {
      const mid = Math.sqrt(lo * hi);
      T[i] = mid;
      const got = firstSeason(T, z)[z];
      if (got > TARGET[z]) hi = mid; else lo = mid;
    }
    T[i] = +Number(Math.sqrt(lo * hi)).toPrecision(2);
    console.log(`TIER[${i}] = ${T[i]}  -> ${ZONES[z].name.en} at ${firstSeason(T, z)[z].toFixed(1)} min (target ${TARGET[z]})`);
  }
  T[4] = +Number(T[3] * 50).toPrecision(2);
  T[5] = +Number(T[4] * 50).toPrecision(2);
  const got = firstSeason(T);
  console.log('TIER', JSON.stringify(T));
  console.log('zones', got.map((m, z) => `${ZONES[z].name.en} ${m.toFixed(1)}m`).join(', '));
  if (process.argv.includes('--write')) {
    const p = path.join(__dirname, '..', 'js', 'data.js');
    const src = fs.readFileSync(p, 'utf8').replace(/const TIER = \[[^\]]*\];/, `const TIER = [${T.join(', ')}];`);
    fs.writeFileSync(p, src);
    console.log('wrote js/data.js');
  }
} else {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  simulate({ skill: +(args[0] || 0.6), hours: +(args[1] || 6), seasons: +(args[2] || 3), log: console.log });
}

module.exports = { simulate };
