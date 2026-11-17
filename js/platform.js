// YouTube Playables adapter. One codebase, two homes: the web / Play Store build keeps progress in
// localStorage and the installed app's own shell, while the Playables build (detected with
// ytgame.IN_PLAYABLES_ENV) MUST go through the SDK for saves, pause/resume, the YouTube mute
// button, the UI language and the best score, and MUST NOT touch the network, other storage, the
// Page Visibility API, device orientation locks or anything that links out of the game.
// Everything platform specific lives here so the game stays plain DOM + canvas; the rest of the
// code asks KL.Platform instead of asking the browser. Rules:
// developers.google.com/youtube/gaming/playables/certification/requirements
(function (root) {
  'use strict';
  const KL = (root.KL = root.KL || {});
  const doc = root.document;
  // IN_PLAYABLES_ENV is false (the SDK is a no-op) when the game is served outside YouTube
  const sdk = () => (root.ytgame && root.ytgame.IN_PLAYABLES_ENV ? root.ytgame : null);
  const call = (obj, name, ...args) => {
    try { return obj && typeof obj[name] === 'function' ? obj[name](...args) : null; } catch (e) { return null; }
  };
  const quiet = (p) => { if (p && typeof p.catch === 'function') p.catch(() => { /* the SDK is best effort */ }); };
  const INPUT = ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'click',
    'touchstart', 'touchmove', 'touchend', 'wheel', 'contextmenu', 'keydown', 'keyup', 'keypress'];

  const P = {
    inPlayables: false,
    paused: false,
    audioEnabled: true,
    lang: '',
    yt: null,
    _pause: [], _resume: [], _audio: [],
    _mail: null, _writing: false, _score: null,

    // ---------- wiring ----------
    init() {
      const yt = (this.yt = sdk());
      this.inPlayables = !!yt;
      if (!yt) return;
      call(yt.system, 'onPause', () => this.setPaused(true));
      call(yt.system, 'onResume', () => this.setPaused(false));
      this.audioEnabled = call(yt.system, 'isAudioEnabled') !== false;
      call(yt.system, 'onAudioEnabledChange', (on) => this.setAudio(on !== false));
      this.lang = this.readLang();
      this.hideRestricted();
    },
    // getLanguage() returns the YouTube UI locale; the game only speaks id and en. Storing a
    // language choice is not allowed in Playables because the YouTube locale can change at any time.
    readLang() {
      const l = String(call(this.yt.system, 'getLanguage') || '').toLowerCase();
      return l.startsWith('id') ? 'id' : 'en';
    },
    onPause(fn) { this._pause.push(fn); },
    onResume(fn) { this._resume.push(fn); },
    onAudioChange(fn) { this._audio.push(fn); },

    // ---------- loading handshake ----------
    // The start menu is painted before the game boots, so it doubles as the loading screen: tell
    // YouTube the first frame is up, then say gameReady only once the menu answers input.
    firstFrame() { quiet(call(this.yt && this.yt.game, 'firstFrameReady')); },
    gameReady() { quiet(call(this.yt && this.yt.game, 'gameReady')); },

    // ---------- cloud save ----------
    // Progress lives in the player's YouTube account. load() resolves to the encoded save string
    // (or null) and MUST resolve before any save(). Writes are serialized so a slow write never
    // overlaps the next one and the newest state always wins.
    load() {
      if (!this.inPlayables) return Promise.resolve(null);
      return Promise.resolve(call(this.yt.game, 'loadData')).then((d) => {
        const s = typeof d === 'string' ? d : d && typeof d.data === 'string' ? d.data : null;
        return s || null;
      }, () => null);
    },
    save(str) { if (this.inPlayables) { this._mail = str; this.flush(); } },
    flush() {
      if (!this.inPlayables || this._writing || this._mail == null) return Promise.resolve();
      const data = this._mail;
      this._mail = null;
      this._writing = true;
      return Promise.resolve(call(this.yt.game, 'saveData', data)).then(() => {
        this._writing = false;
        if (this._mail != null) return this.flush();
      }, () => {
        // keep it for the next write instead of hammering a failing API
        this._writing = false;
        if (this._mail == null) this._mail = data;
      });
    },

    // ---------- best score (one dimension: deepest line, in metres) ----------
    score(n) {
      if (!this.inPlayables) return;
      n = Math.floor(n || 0);
      if (!(n > this._score)) return;
      this._score = n;
      quiet(call(this.yt.engagement, 'sendScore', { value: n }));
    },

    // ---------- system audio ----------
    setAudio(on) {
      this.audioEnabled = !!on;
      this._audio.forEach((fn) => fn(this.audioEnabled));
    },

    // ---------- pause / resume ----------
    // onPause must stop everything: no frame, no timer that changes state, no input, no sound.
    setPaused(on) {
      if (on === this.paused) return;
      this.paused = on;
      if (on) {
        this.blockInput(true);
        this._pause.forEach((fn) => fn());
      } else {
        this.blockInput(false);
        this._resume.forEach((fn) => fn());
      }
    },
    blockInput(on) {
      for (const type of INPUT) {
        if (on) root.addEventListener(type, this._swallow, { capture: true, passive: false });
        else root.removeEventListener(type, this._swallow, { capture: true });
      }
    },
    // capture phase on window, before the game's own listeners (this file loads first)
    _swallow(e) { e.preventDefault(); e.stopImmediatePropagation(); },

    // ---------- DOM restrictions ----------
    hideRestricted() {
      if (!this.inPlayables) return;
      doc.querySelectorAll('[data-no-playables]').forEach((el) => el.remove());
      this.plainLinks(doc);
    },
    // No clickable links out of a Playable: keep the words (credits, maker) as plain text
    plainLinks(scope) {
      if (!this.inPlayables) return;
      (scope || doc).querySelectorAll('a[href^="http"], a[href^="//"]').forEach((a) => {
        const span = doc.createElement('span');
        span.className = a.className;
        span.textContent = a.textContent;
        a.replaceWith(span);
      });
    },
  };

  P.init();
  KL.Platform = P;
})(this);
