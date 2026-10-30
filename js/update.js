// Version check and "get the latest version". The page and its files are cached by the browser
// (GitHub Pages sends max-age=600), so a fresh deploy can take a while to show up. refresh()
// re-downloads every file the page uses, past the cache, then reloads; the save lives in
// localStorage and is never touched. check() compares KL.VERSION with version.json on the server.
(function (root) {
  'use strict';
  const KL = root.KL;
  const VERSION = '1.7'; // release: bump this and version.json together
  KL.VERSION = VERSION;

  const files = () => {
    const out = new Set([location.pathname, 'version.json', 'img/atlas.png']);
    document.querySelectorAll('script[src], link[rel=stylesheet][href], link[rel=manifest][href]').forEach((el) => out.add(el.getAttribute('src') || el.getAttribute('href')));
    return [...out];
  };

  const U = {
    latest: null,
    outdated: false,
    async check() {
      try {
        const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return false;
        const v = String((await r.json()).v || '');
        if (!v || v === VERSION) return false;
        const first = !this.outdated;
        this.latest = v; this.outdated = true;
        if (first && this.onOutdated) this.onOutdated(v);
        return true;
      } catch (e) { return false; } // offline, or file:// in the app shell
    },
    async refresh() {
      try { if (root.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* no Cache Storage */ }
      try {
        if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      } catch (e) { /* no service worker */ }
      await Promise.all(files().map((f) => fetch(f, { cache: 'reload' }).catch(() => null)));
      location.replace(location.pathname + '?u=' + Date.now() + location.hash);
    },
    start() {
      setTimeout(() => this.check(), 4000);
      setInterval(() => { if (!this.outdated) this.check(); }, 10 * 60 * 1000);
      // drop the cache-busting query from the address bar after an update
      if (/[?&]u=\d+/.test(location.search) && history.replaceState) history.replaceState(null, '', location.pathname + location.hash);
    },
  };
  KL.Update = U;
})(this);
