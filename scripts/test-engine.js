// Engine tests (node, no browser). Run: node scripts/test-engine.js
const assert = require('assert');
const E = require('../js/engine.js');
const Bot = require('../js/bot.js');
const { NODES, SPECIES, MUTATIONS, ZONES } = E.DATA;
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };

test('data is consistent', () => {
  const ids = new Set();
  const spots = new Set();
  for (const nd of NODES) {
    assert(!ids.has(nd.id), 'duplicate node ' + nd.id); ids.add(nd.id);
    const k = nd.x + ',' + nd.y;
    assert(!spots.has(k), 'two nodes at ' + k); spots.add(k);
    for (const r of nd.req) assert(NODES.find((m) => m.id === r), nd.id + ' needs missing ' + r);
    assert(nd.max >= 1 && nd.c >= 0 && nd.g >= 1, 'bad numbers on ' + nd.id);
    assert(/^[\x20-\x7e]+$/.test(nd.id + nd.fx + nd.icon), 'non-ascii id on ' + nd.id);
  }
  for (const sp of SPECIES) assert(E.spriteSize(sp.sprite), 'no sprite for ' + sp.id);
  for (let z = 0; z < ZONES.length; z++) assert(SPECIES.some((sp) => E.zoneAt(sp.d[0]) === z), 'zone without fish ' + z);
});

test('new save starts with the root only and cannot buy without coins', () => {
  const s = E.newSave();
  assert.strictEqual(E.lv(s, 'root'), 1);
  assert(!E.canBuy(s, 'line1'));
  s.coins = 1e3;
  assert(E.canBuy(s, 'line1'));
  assert(!E.canBuy(s, 'line2'), 'line2 needs line1 first');
  assert.strictEqual(E.nodeState(s, 'line2'), 'peek');
  assert.strictEqual(E.nodeState(s, 'line3'), 'hidden');
});

test('buying spends coins, raises the level and stops at max', () => {
  const s = E.newSave();
  s.coins = 1e12;
  const n = E.NODE.line1;
  for (let i = 0; i < n.max; i++) assert(E.buy(s, 'line1'));
  assert(!E.buy(s, 'line1'));
  assert.strictEqual(E.lv(s, 'line1'), n.max);
  assert.strictEqual(E.stats(s).line, 20 + n.max * n.v);
});

test('a cast is deterministic for a seed and always ends', () => {
  const s = E.newSave();
  const a = Bot.playCast(s, 0.7, { seed: 5, width: 100 });
  const b = Bot.playCast(s, 0.7, { seed: 5, width: 100 });
  assert.strictEqual(a.phase, 'done');
  assert.strictEqual(a.caught.length, b.caught.length);
  assert.strictEqual(a.maxY, b.maxY);
});

test('never more fish than the hook holds', () => {
  const s = E.newSave();
  s.nodes.line1 = 5; s.nodes.line2 = 3; s.nodes.cap1 = 2;
  const cap = E.stats(s).cap;
  for (let i = 0; i < 30; i++) assert(Bot.playCast(s, 0.9, { seed: i, width: 100 }).caught.length <= cap);
});

test('a fish hit on the way down bites and turns the line', () => {
  const s = E.newSave();
  const run = E.newRun(s, { seed: 1, width: 100 });
  const f = run.fish.find((x) => x.y > 6);
  run.x = f.x; f.vx = 0;
  let hit = false;
  for (let i = 0; i < 400 && run.phase === 'down'; i++) { E.stepRun(run, 1 / 60, f.x); if (run.events.some((e) => e.t === 'hit')) hit = true; }
  assert(hit, 'expected a hit');
  assert.strictEqual(run.phase, 'up');
  assert(run.caught.length >= 1);
});

test('the first casts never come back empty', () => {
  for (let i = 0; i < 25; i++) {
    const s = E.newSave();
    assert(Bot.playCast(s, 0.4, { seed: i + 1, width: 100 }).caught.length > 0, 'empty first cast seed ' + i);
  }
});

test('guard passes through a fish', () => {
  const s = E.newSave();
  s.nodes.reel1 = 1; s.nodes.guard = 1; s.nodes.line1 = 5; // enough line to swerve over to the fish
  const run = E.newRun(s, { seed: 2, width: 100 });
  assert.strictEqual(run.guard, 1);
  const f = run.fish.find((x) => x.y > 6);
  f.vx = 0;
  for (let i = 0; i < 400 && run.guard > 0 && run.phase === 'down'; i++) E.stepRun(run, 1 / 60, f.x);
  assert.strictEqual(run.guard, 0);
});

test('haul and settle add coins, counts and variants', () => {
  const s = E.newSave();
  const run = Bot.playCast(s, 0.8, { seed: 3, width: 100 });
  const h = E.haul(s, run);
  assert(h.total > 0);
  const before = s.coins;
  const { fresh } = E.settle(s, h, 2);
  assert.strictEqual(s.coins, before + h.total * 2);
  assert.strictEqual(s.casts, 1);
  assert(fresh.length > 0 && Object.keys(s.variants).length > 0);
});

test('mutations multiply value', () => {
  const s = E.newSave();
  const st = E.stats(s);
  const base = { sp: E.SP.clown, mut: -1, y: 40 };
  const v0 = E.fishValue(s, st, base);
  MUTATIONS.forEach((m, i) => assert(Math.abs(E.fishValue(s, st, { ...base, mut: i }) - v0 * m.mult) < 1e-6));
});

test('fish pen pays only once bought, offline is capped', () => {
  const s = E.newSave();
  s.caught.goldfish = 100; s.caught.clown = 20;
  assert.strictEqual(E.pondRate(s), 0);
  s.nodes.pond1 = 1;
  const r = E.pondRate(s);
  assert(r > 0);
  const off = E.offline(s, 99 * 3600);
  assert(off.capped);
  assert.strictEqual(off.seconds, E.stats(s).offlineH * 3600);
});

test('new season: needs the trench, resets coin skills, keeps pearl skills and collection', () => {
  const s = E.newSave();
  s.best = 100;
  assert.strictEqual(E.prestigeGain(s), 0);
  s.best = 500; s.bestEver = 500;
  const g = E.prestigeGain(s);
  assert(g >= 4);
  s.nodes.line1 = 3; s.caught.goldfish = 5;
  s.pearls = 10; s.pearlsEver = 10; s.nodes.p_line = 1;
  E.prestige(s);
  assert.strictEqual(s.pearls, 10 + g);
  assert.strictEqual(E.lv(s, 'line1'), 0);
  assert.strictEqual(E.lv(s, 'p_line'), 1);
  assert.strictEqual(s.caught.goldfish, 5);
  assert.strictEqual(s.coins, 0);
  // spending pearls never lowers the value bonus
  const v = E.valueMult(s);
  s.pearls = 0;
  assert.strictEqual(E.valueMult(s), v);
});

test('pearls pay for new depth records, so quick resets cannot farm them', () => {
  const s = E.newSave();
  const at = (d) => { s.best = d; return E.prestigeGain(s); };
  assert.strictEqual(at(479), 0);
  assert.strictEqual(at(480), 5);
  assert(at(1000) > at(600));
  s.best = 1000;
  const g = E.prestige(s);
  assert.strictEqual(g, 12);
  s.best = 1000;
  assert.strictEqual(E.prestigeGain(s), 1, 'same depth again pays the minimum');
  s.best = 2000;
  assert.strictEqual(E.prestigeGain(s), 20 - 12);
});

test('migrate keeps old saves and fills new fields', () => {
  const s = E.migrate({ coins: 50, nodes: { line1: 2 }, settings: { sound: false } });
  assert.strictEqual(s.coins, 50);
  assert.strictEqual(E.lv(s, 'root'), 1);
  assert.strictEqual(s.settings.sound, false);
  assert.strictEqual(s.settings.music, true);
});

test('migrate fills activity, shells and gear for saves from before achievements', () => {
  const s = E.migrate({ coins: 5, rec: { fish: 7 }, gear: { owned: { jukung: 1 }, boat: 'jukung', skin: 'nope' } });
  assert.strictEqual(s.rec.fish, 7);
  assert.deepStrictEqual(s.rec.mut, [0, 0, 0, 0]);
  assert.strictEqual(s.shells, 0);
  assert.strictEqual(s.gear.boat, 'jukung');
  assert.strictEqual(s.gear.skin, 'classic', 'an outfit you do not own falls back to the classic');
  assert(s.gear.owned.classic && s.gear.owned.sampan);
});

test('achievements and gear data are consistent', () => {
  const { ACH, GEAR, SHELL_PAY } = E.DATA;
  const ids = new Set();
  for (const a of ACH) {
    assert(!ids.has(a.id), 'duplicate achievement ' + a.id); ids.add(a.id);
    assert(a.tier >= 0 && a.tier < SHELL_PAY.length, 'bad tier ' + a.id);
    assert(E.achGoal(a) > 0, 'no goal ' + a.id);
    assert(a.name.id && a.name.en, 'missing name ' + a.id);
  }
  for (let t = 0; t < 5; t++) assert(ACH.some((a) => a.tier === t), 'empty tier ' + t);
  const keys = new Set(NODES.map((nd) => nd.fx).concat(['gvalue', 'deep', 'moon', 'sonar']));
  for (const g of GEAR) {
    for (const k in g.fx) assert(keys.has(k), g.id + ' has unknown perk ' + k);
    if (g.ach) assert(ACH.find((a) => a.id === g.ach), g.id + ' needs missing achievement');
    if (g.kind === 'skin') assert(g.pal && g.pal.length === 4, g.id + ' needs a palette');
  }
  // every outfit and boat can be bought by someone who earns everything else
  const s = E.newSave();
  const most = ACH.filter((a) => a.k !== 'gear').reduce((t, a) => t + SHELL_PAY[a.tier], 0);
  const maxShells = most + SPECIES.length * 8 + 25 * 5;
  assert(GEAR.reduce((t, g) => t + g.cost, 0) <= maxShells, 'gear costs more than the game pays');
  assert(s.gear.owned.classic);
});

test('settle keeps the activity record and pays shells for new species', () => {
  const s = E.newSave();
  const run = Bot.playCast(s, 0.7, { width: 100 });
  const h = E.haul(s, run);
  const r = E.settle(s, h);
  const fish = h.items.filter((i) => !SPECIES[i.sp].junk).reduce((t, i) => t + (i.twin ? 2 : 1), 0);
  assert.strictEqual(s.rec.fish, fish);
  assert.strictEqual(r.shells, r.fresh.length);
  assert.strictEqual(s.shells, r.fresh.length);
  assert(s.rec.bestFish, 'remembers the best fish');
  assert.strictEqual(s.rec.metres, h.depth);
});

test('achievements unlock once and pay by rarity', () => {
  const s = E.newSave();
  s.rec.fish = 1;
  const got = E.checkAch(s);
  assert(got.find((a) => a.id === 'fish1'));
  assert.strictEqual(s.shells, E.DATA.SHELL_PAY[0] * got.length);
  assert.strictEqual(E.checkAch(s).length, 0, 'no second payout');
  assert(E.markDay(s, '2026-10-30'));
  assert(!E.markDay(s, '2026-10-30'), 'same day counts once');
  assert(E.markDay(s, '2026-10-31'));
  assert.strictEqual(s.rec.days, 2);
});

test('gear: zone and achievement gates, buying equips, perks change stats', () => {
  const s = E.newSave();
  assert.strictEqual(E.gearState(s, 'diver'), 'locked', 'diver needs the reef');
  s.shells = 1000;
  assert.strictEqual(E.gearState(s, 'jukung'), 'buy');
  const cap = E.stats(s).cap;
  assert(E.buyGear(s, 'jukung'));
  assert.strictEqual(s.gear.boat, 'jukung');
  assert.strictEqual(E.stats(s).cap, cap + 1);
  assert(!E.buyGear(s, 'jukung'), 'owned already');
  s.zone = 5;
  assert.strictEqual(E.gearState(s, 'golden'), 'locked', 'golden gnome needs its achievement');
  const v = E.stats(s).valueMult;
  assert(E.buyGear(s, 'chef'));
  assert(Math.abs(E.stats(s).valueMult / v - 1.1) < 1e-9);
  assert(E.equip(s, 'classic'));
  assert(Math.abs(E.stats(s).valueMult - v) < 1e-9);
  assert(!E.equip(s, 'abyss'), 'cannot wear what you do not own');
  E.buyGear(s, 'hantu');
  s.ach.d2000 = 1;
  assert(E.buyGear(s, 'hantu'));
  assert.strictEqual(E.stats(s).moonEvery, 6);
});

test('the sea near the boat carries over: only caught fish are replaced', () => {
  const s = E.newSave(); s.casts = 5;
  const run = Bot.playCast(s, 0.8, { seed: 9, width: 100 });
  const left = E.carryOver(run);
  const next = E.newRun(s, { width: 100, keep: left });
  const near = run.fish.filter((f) => f.y < left.end);
  const stay = near.filter((f) => f.st !== 1), gone = near.length - stay.length;
  assert(stay.length > 0 && gone > 0, 'test cast should catch some and leave some');
  for (const f of stay) assert(next.fish.some((g) => g.sp === f.sp && g.y === f.y && g.x === f.x && g.st === 0), 'fish moved or vanished');
  assert.strictEqual(next.fish.filter((f) => f.y < left.end).length, near.length, 'same number of fish near the boat');
});

test('line is a length: side moves pay it out and the hook turns when it is gone', () => {
  const s = E.newSave(); s.casts = 10; s.nodes.line1 = 5; // 80 m of line
  const straight = E.newRun(s, { seed: 4, width: 100 }), zig = E.newRun(s, { seed: 4, width: 100 });
  straight.fish = []; zig.fish = []; straight.obs = []; zig.obs = [];
  for (const r of [straight, zig]) { r.bosses = []; r.floor = Infinity; } // no guardian in the way
  let t = 0;
  while (straight.phase === 'down') E.stepRun(straight, 1 / 30, 50);
  while (zig.phase === 'down') { t += 1 / 30; E.stepRun(zig, 1 / 30, Math.sin(t * 3) > 0 ? 90 : 10); }
  assert(Math.abs(straight.paid - straight.st.line) < 0.01 && Math.abs(zig.paid - zig.st.line) < 0.01, 'all line paid out');
  assert(straight.maxY > straight.st.line - 1, 'straight drop reaches the full length');
  assert(zig.maxY < straight.maxY * 0.8, 'zigzag should end shallower, got ' + zig.maxY.toFixed(1));
});

test('version.json matches the version in js/update.js', () => {
  const fs = require('fs'), path = require('path');
  const v = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8')).v;
  const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'update.js'), 'utf8').match(/const VERSION = '([^']+)'/)[1];
  assert.strictEqual(v, js, 'bump both together');
});

test('save codec round-trips and rejects edited or plain saves', () => {
  const C = require('../js/savecodec.js');
  const s = E.newSave(); s.coins = 12345.5; s.settings.lang = 'id'; s.name = 'Kail \u00e9\u4e2d';
  const enc = C.encode({ game: 'gnome-line-sinker', v: 2, save: s });
  assert(C.isEncoded(enc) && !enc.includes('coins'), 'encoded text should not show the fields');
  assert.deepStrictEqual(C.decode(enc).save, JSON.parse(JSON.stringify(s)));
  assert.notStrictEqual(C.encode(s), C.encode(s), 'nonce should change the bytes');
  for (const i of [5, 14, 25, enc.length - 3]) {
    const ch = enc[i] === 'A' ? 'B' : 'A';
    assert.strictEqual(C.decode(enc.slice(0, i) + ch + enc.slice(i + 1)), null, 'edit at ' + i + ' slipped through');
  }
  assert.strictEqual(C.decode(JSON.stringify(s)), null);
  assert.strictEqual(C.decode('GLS1zzzz'), null);
});

test('a closed guardian is a floor: reaching its arena starts the fight', () => {
  const s = E.newSave(); s.casts = 10; s.nodes.line1 = 5;
  const run = E.newRun(s, { seed: 3, width: 100 });
  run.fish = []; run.obs = [];
  assert.strictEqual(run.floor, 26);
  let deepest = 0, fought = false;
  while (run.phase !== 'done') {
    E.stepRun(run, 1 / 30, 50);
    deepest = Math.max(deepest, run.y);
    if (run.phase === 'fight') fought = true;
  }
  assert(fought, 'should have fought the catfish');
  assert(deepest <= 26.01, 'went past the gate: ' + deepest);
  assert(run.bossRes, 'fight result recorded');
});

test('winning opens the gate for good, pays shells once and the guardian is in the haul', () => {
  const s = E.newSave(); s.casts = 10; s.nodes.line1 = 2;
  let run, guard = 0;
  do { run = Bot.playCast(s, 0.95, { width: 100 }); E.settle(s, E.haul(s, run)); } while (!(run.bossRes && run.bossRes.win) && guard++ < 40);
  assert(s.bosses.b_catfish.won, 'catfish beaten');
  assert(s.caught.b_catfish >= 1 && s.shellsEver >= 10, 'caught and paid');
  const next = E.newRun(s, { width: 100 });
  assert.strictEqual(next.floor, 86, 'next gate is the grouper');
  const shells = s.shellsEver;
  E.settle(s, { items: [], total: 0, depth: 0, boss: { id: 'b_catfish', win: true, gate: false, left: 0 } });
  assert.strictEqual(s.shellsEver, shells, 'a rematch pays no shells');
});

test('a guardian that gets away keeps half the stamina it lost', () => {
  const s = E.newSave(); s.casts = 10; s.nodes.line1 = 1;
  const run = E.newRun(s, { seed: 5, width: 100 });
  run.fish = []; run.obs = [];
  // follow the guardian instead of pulling against it: it runs free and takes the line
  while (run.phase !== 'done') E.stepRun(run, 1 / 30, run.fight ? run.fight.x + run.fight.dir * 6 : 50);
  assert(run.bossRes && !run.bossRes.win, 'it should get away');
  const left = run.bossRes.left;
  assert(left < 1 && left > 0.05);
  E.settle(s, E.haul(s, run));
  assert.strictEqual(s.bosses.b_catfish.left, left);
  const next = E.newRun(s, { width: 100 });
  assert(Math.abs(next.bosses[0].hp - next.bosses[0].hpMax * left) < 1e-9, 'stamina carried to the next try');
});

test('old saves keep the zones they reached; guardians never spawn as normal fish', () => {
  const old = E.newSave(); delete old.bosses; old.zone = 3;
  const s = E.migrate(JSON.parse(JSON.stringify(old)));
  assert(s.bosses.b_catfish.free && s.bosses.b_grouper.free && s.bosses.b_tuna.free && !s.bosses.b_manta);
  assert.strictEqual(E.gateBoss(s).id, 'b_manta');
  const fresh = E.migrate(JSON.parse(JSON.stringify(E.newSave())));
  assert.deepStrictEqual(fresh.bosses, {});
  s.nodes.line1 = 5; s.nodes.line2 = 3;
  for (let i = 0; i < 20; i++) for (const f of E.newRun(s, { seed: i, width: 100 }).fish) assert(!SPECIES[f.sp].boss, 'guardian spawned as a fish');
  s.caught.b_angler = 50;
  const without = Object.assign({}, s.caught); delete without.b_angler;
  s.nodes.pond1 = 1;
  const a = E.pondRate(s); s.caught = without; assert.strictEqual(E.pondRate(s), a, 'pen ignores guardians');
});

test('cast conditions: the forecast is the cast, the first casts are calm, bait needs its zone', () => {
  const s = E.newSave();
  for (let i = 0; i < 8; i++) assert.strictEqual(E.castCond(s, i).weather, 'cerah');
  const seen = {};
  for (let i = 0; i < 400; i++) { const c = E.castCond(s, i); seen[c.weather] = 1; assert.deepStrictEqual(c, E.castCond(s, i)); }
  assert(seen.hujan && seen.badai, 'rain and storms happen');
  assert.strictEqual(E.castCond(s, 0).time, 'pagi');
  assert.strictEqual(E.castCond(s, 9).time, 'malam');
  s.casts = 37;
  const run = E.newRun(s, { width: 100 });
  assert.deepStrictEqual(run.cond, E.castCond(s, 37));
  assert(!E.setBait(s, 'udang') && s.bait === 'cacing', 'shrimp needs Open Blue');
  s.zone = 2;
  assert(E.setBait(s, 'udang') && E.castCond(s, 37).fx.rare > 1.7);
  // a storm makes currents stronger and pays more
  let i = 8; while (E.castCond(s, i).weather !== 'badai') i++;
  s.casts = i; s.bait = 'cacing';
  const st = E.newRun(s, { seed: 7, width: 100 });
  s.casts = 8;
  const calm = E.newRun(s, { seed: 7, width: 100 });
  assert(st.st.valueMult > calm.st.valueMult * 1.4);
});

test('a beaten guardian rests 36 casts, 12 after a rematch it lost; a rematch pays half', () => {
  const s = E.newSave(); s.casts = 20; s.nodes.line1 = 5;
  s.bosses.b_catfish = { won: 1 }; s.caught.b_catfish = 1;
  const run = E.newRun(s, { seed: 2, width: 100 });
  const b = run.bosses.find((x) => x.id === 'b_catfish');
  assert(b && !b.gate, 'rematch is there before it rests');
  run.trophy = { sp: b.sp, mut: -1, twin: false, x: 50, y: 26, boss: b.id };
  const h = E.haul(s, run);
  const full = E.fishValue(s, run.st, run.trophy);
  assert(Math.abs(h.items.find((i) => i.boss).value - full * E.REMATCH_PAY) < 1e-6, 'rematch pays half');
  h.boss = { id: 'b_catfish', win: true, gate: false, left: 0 };
  E.settle(s, h);
  assert.strictEqual(E.bossRest(s, 'b_catfish'), E.REST_WIN);
  for (let i = 0; i < E.REST_WIN; i++) {
    assert(!E.newRun(s, { width: 100 }).bosses.some((x) => x.id === 'b_catfish'), 'resting guardian showed up');
    s.casts++;
  }
  assert(E.newRun(s, { width: 100 }).bosses.some((x) => x.id === 'b_catfish'), 'back after its rest');
  E.settle(s, { items: [], total: 0, depth: 0, boss: { id: 'b_catfish', win: false, gate: false, left: 0.5 } });
  assert.strictEqual(E.bossRest(s, 'b_catfish'), E.REST_ESCAPE);
  // a gate guardian that got away is still the wall on the next cast
  const g = E.newSave(); g.casts = 10; g.nodes.line1 = 2;
  E.settle(g, { items: [], total: 0, depth: 26, boss: { id: 'b_catfish', win: false, gate: true, left: 0.6 } });
  assert.strictEqual(E.newRun(g, { width: 100 }).floor, 26);
});

console.log(`\n${n} tests passed`);
