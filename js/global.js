// Global counter: how many gnomes fish and how many fish everyone has caught, from a tiny
// Cloudflare Worker (server/). The game sends only what it caught since its last report, under a
// random id, and never more than once every few minutes. With GLOBAL_URL empty, or offline,
// nothing is sent and the panel stays hidden.
(function (root) {
  'use strict';
  const KL = root.KL;
  // set after deploying server/ (tests can override with window.KL_GLOBAL_URL)
  const GLOBAL_URL = root.KL_GLOBAL_URL || 'https://gnome-line-sinker-counter.assamim80.workers.dev';
  const EVERY = 180e3;  // ms between reports
  const FIRST = 20e3;   // first report this long after the game starts

  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => (b % 36).toString(36)).join('');
  const now = (s) => ({ fish: s.rec.fish, casts: s.casts, junk: s.rec.junk, titan: s.rec.mut[3] });

  const G = {
    data: null, at: 0, next: Date.now() + FIRST, busy: false,
    get enabled() { return !!GLOBAL_URL && navigator.onLine !== false; },
    ensure(s) {
      if (!s.gid) s.gid = rid();
      if (!s.gsent) s.gsent = { fish: 0, casts: 0, junk: 0, titan: 0 };
    },
    // called every few seconds from the game loop
    async tick(s) {
      if (!this.enabled || this.busy || Date.now() < this.next) return;
      this.ensure(s);
      this.next = Date.now() + EVERY;
      const cur = now(s);
      const body = { id: s.gid, deep: s.bestEver };
      let any = !s.gsent.reg;
      for (const k in cur) { body[k] = Math.max(0, cur[k] - (s.gsent[k] || 0)); if (body[k]) any = true; }
      if (!any) return;
      this.busy = true;
      try {
        const r = await fetch(GLOBAL_URL + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) { Object.assign(s.gsent, cur, { reg: 1 }); this.at = 0; }
      } catch (e) { /* offline: try again next time */ }
      this.busy = false;
    },
    // totals for the trophy room; cached for two minutes
    async stats() {
      if (!this.enabled) return null;
      if (this.data && Date.now() - this.at < 120e3) return this.data;
      try {
        const r = await fetch(GLOBAL_URL + '/stats');
        if (r.ok) { this.data = await r.json(); this.at = Date.now(); }
      } catch (e) { /* keep the last numbers */ }
      return this.data;
    },
  };
  KL.Global = G;
})(this);
