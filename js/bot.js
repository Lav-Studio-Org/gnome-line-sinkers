// Steering bot. The in-game Auto Angler uses it, and so do the tests and the balance
// simulation, so "a player of skill X" means the same thing everywhere.
// skill 0..1: how far ahead it looks, how often it reacts, how precise it aims.
(function (root) {
  'use strict';
  const E = typeof module !== 'undefined' ? require('./engine.js') : root.KL.Engine;
  const { SPECIES, MUTATIONS } = E.DATA;

  function fishWorth(f) {
    return SPECIES[f.sp].value * (f.mut >= 0 ? MUTATIONS[f.mut].mult : 1);
  }

  // fish are generated in depth order; find the first one at or below depth y
  function firstBelow(fish, y) {
    let lo = 0, hi = fish.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (fish[m].y < y) lo = m + 1; else hi = m; }
    return lo;
  }

  function decideDown(run, skill) {
    const st = run.st;
    const look = 0.15 + 1.0 * skill;          // seconds ahead
    const near = [];
    for (let i = firstBelow(run.fish, run.y - 4); i < run.fish.length; i++) {
      const f = run.fish[i];
      if (f.y - run.y > st.sink * look + 2) break;
      if (f.st === 0) near.push(f);
    }
    // static obstacles count too: spikes and mines like fish, rocks and nets a little
    const obs = [];
    for (const o of E.obsIn(run, run.y - 8, run.y + st.sink * look + 8, [])) {
      if (o.gone) continue;
      if (o.k === 'mine' || o.k === 'urchin') obs.push([o, o.r + 0.8, 1.6]);
      else if (o.k === 'rock') obs.push([o, o.r + 0.6, 0.8]);
      else if (o.k === 'net') obs.push([o, o.w / 2, 0.3]);
    }
    if (!near.length && !obs.length) return run.x;
    const lanes = [];
    for (let x = 1; x < run.width - 1; x += 1.25) lanes.push(x);
    let best = run.x, bestScore = Infinity;
    for (const lx of lanes) {
      const travel = Math.abs(lx - run.x) / st.steer;
      let danger = 0;
      for (const f of near) {
        const dy = f.y - run.y;
        if (dy < -f.hh || dy > st.sink * look) continue;
        const t = Math.max(0, dy / st.sink);
        // while travelling to the lane the hook sweeps across; only lanes we can reach in time count as safe
        const fx = f.x + f.vx * t;
        const near = Math.abs(fx - lx) < f.hw + 0.9;
        const path = t < travel && Math.abs(fx - (run.x + (lx - run.x) * (t / Math.max(travel, 1e-6)))) < f.hw + 0.9;
        if (near || path) danger += 1 / (t + 0.25);
      }
      for (const [o, hw, w] of obs) {
        const dy = o.y - run.y;
        if (dy < -hw || dy > st.sink * look + hw) continue;
        const t = Math.max(0, dy / st.sink);
        if (Math.abs(o.x - lx) < hw) danger += w / (t + 0.25);
      }
      const score = danger * 10 + Math.abs(lx - run.x) * 0.04;
      if (score < bestScore) { bestScore = score; best = lx; }
    }
    return best;
  }

  function decideUp(run, skill, r) {
    const st = run.st;
    if (run.caught.length >= st.cap) return run.x;
    const look = 0.5 + 1.4 * skill;
    let best = null, bestScore = 0;
    for (let i = Math.min(run.fish.length - 1, firstBelow(run.fish, run.y + 3)); i >= 0; i--) {
      const f = run.fish[i];
      if (run.y - f.y > st.reel * look + 3) break;
      if (f.st !== 0) continue;
      const dy = run.y - f.y;
      if (dy < -f.hh || dy > st.reel * look) continue;
      const t = Math.max(0.05, dy / st.reel);
      const fx = f.x + f.vx * t;
      if (Math.abs(fx - run.x) > st.steer * t + st.reach + f.hw) continue;
      const score = fishWorth(f) / (t + 0.4);
      if (score > bestScore) { bestScore = score; best = fx; }
    }
    if (best == null) best = run.x;
    else best += (r() - 0.5) * (1 - skill) * 6;
    // with fish on the line, steer around mines above
    if (run.caught.length) {
      for (const o of E.obsIn(run, run.y - st.reel * look - 2, run.y + 1, [])) {
        if (o.k === 'mine' && !o.gone && Math.abs(best - o.x) < o.r + 1.5) best = o.x + (best < o.x ? -1 : 1) * (o.r + 2);
      }
    }
    return best;
  }

  // Returns the target x for this frame. Keeps a little state on the run.
  function steer(run, skill, dt) {
    const b = run.bot || (run.bot = { t: 0, x: run.x, r: E.rng(((run.fish.length * 7919) ^ 0x9e37) >>> 0) });
    b.t -= dt;
    if (b.t <= 0) {
      // slower players re-think less often
      b.t = 0.05 + (1 - skill) * 0.45 * (0.5 + b.r());
      if (b.r() > 0.15 * (1 - skill)) {
        b.x = run.phase === 'down' ? decideDown(run, skill) : decideUp(run, skill, b.r);
      }
    }
    return b.x;
  }

  // Plays one whole cast with fixed steps; returns the finished run.
  function playCast(save, skill, opts) {
    const run = E.newRun(save, opts);
    const dt = 1 / 30;
    let guard = 0;
    while (run.phase !== 'done' && guard++ < 30 * 600) E.stepRun(run, dt, steer(run, skill, dt));
    return run;
  }

  const B = { steer, playCast, fishWorth };
  if (typeof module !== 'undefined') module.exports = B; else root.KL.Bot = B;
})(this);
