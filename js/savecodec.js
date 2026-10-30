// Save encoding: scrambled bytes + keyed checksum, so save files and the browser copy are not
// plain editable JSON and a changed byte is rejected. Client-only, so this deters casual edits;
// it is not real security. Format: 'GLS1' + nonce (8 hex) + checksum (8 hex) + base64 body.
(function (root) {
  'use strict';
  const TAG = 'GLS1';
  const SALT = 'kail:gnome-line-sinker:7f3a91c2';

  // FNV-1a over the salted text, two passes with different seeds for 32 usable bits
  function sum(text, nonce) {
    const s = SALT + nonce + text;
    let h = 0x811c9dc5 ^ parseInt(nonce, 16);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    for (let i = s.length - 1; i >= 0; i -= 7) { h ^= s.charCodeAt(i) << 8; h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // mulberry32 keystream seeded by the nonce and the salt
  function stream(nonce) {
    let a = parseInt(nonce, 16) ^ 0x5bd1e995;
    for (let i = 0; i < SALT.length; i++) a = Math.imul(a ^ SALT.charCodeAt(i), 0x9e3779b1);
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) & 255;
    };
  }

  function xor(bytes, nonce) {
    const k = stream(nonce), out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) out[i] = bytes[i] ^ k();
    return out;
  }

  function toB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(b64) {
    const s = atob(b64), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function encode(obj) {
    const text = JSON.stringify(obj);
    const nonce = (Math.random() * 0x100000000 >>> 0).toString(16).padStart(8, '0');
    return TAG + nonce + sum(text, nonce) + toB64(xor(new TextEncoder().encode(text), nonce));
  }

  // Returns the object, or null when the text is not an encoded save or was changed.
  function decode(str) {
    if (typeof str !== 'string') return null;
    str = str.trim();
    if (str.slice(0, 4) !== TAG || str.length < 21) return null;
    const nonce = str.slice(4, 12), check = str.slice(12, 20);
    if (!/^[0-9a-f]{8}$/.test(nonce)) return null;
    try {
      const body = str.slice(20), raw = fromB64(body);
      // base64 ignores some bits of the last character; only the canonical spelling is valid
      if (toB64(raw) !== body) return null;
      const text = new TextDecoder('utf-8', { fatal: true }).decode(xor(raw, nonce));
      if (sum(text, nonce) !== check) return null;
      return JSON.parse(text);
    } catch (e) { return null; }
  }

  const isEncoded = (str) => typeof str === 'string' && str.trim().slice(0, 4) === TAG;

  const api = { encode, decode, isEncoded };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.KL = root.KL || {}; root.KL.SaveCodec = api; }
})(this);
