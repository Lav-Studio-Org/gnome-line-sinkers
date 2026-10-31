// Scenery. Every zone has its own props on the cliff walls, its own shapes in the far
// background and one landmark, so the depth reads from the art alone:
//   Estuary   seagrass, mangrove roots, old pier posts, snail shells
//   Reef      staghorn, brain and fan corals, tube sponges, anemones, starfish, clams
//   Open Blue kelp with floats, blue sponges, barnacles, a lost anchor; a shipwreck far off
//   Twilight  sea whips, sea lilies, glass sponges, glowing stalks; a whale passing far off
//   Trench    tube worms, smoking chimneys, bones, mussels; the whale's skeleton far off
//   Weird Deep glowing crystals, eye stalks, glow mushrooms, fossils; a ruined arch far off
// Decoration only: nothing here reads or changes the run, the hit tests or the engine.
// Props are painted once per sway frame into small canvases (with a soft outline one shade
// darker than the water, so they sit behind the black-outlined fish) and reused, so a frame
// costs about one drawImage per visible prop. Glowing bits are drawn after the darkness.
(function (root) {
  'use strict';
  const KL = root.KL;
  const R = KL.Render;
  const E = KL.Engine;
  const { ZONES } = E.DATA;
  const PXM = E.PXM;
  const FR = 6;                 // sway frames per prop (a slow pixel flipbook, no smooth tweening)
  const SEG = 4;                // metres per wall segment (same as drawWalls)
  const TINT = [0.1, 0.12, 0.2, 0.3, 0.32, 0.22]; // how much each zone's water washes over prop colours

  // ---------- helpers ----------
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, k) {
    const A = rgb(a), B = rgb(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
  }
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const BAKE = new Map();
  function bake(key, w, h, draw) {
    let c = BAKE.get(key);
    if (c) return c;
    if (BAKE.size > 600) BAKE.clear();
    c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c, c.getContext('2d'));
    BAKE.set(key, c);
    return c;
  }
  // one-pixel outline around everything painted, in a colour one step darker than the water
  function outline(c, col) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const im = x.getImageData(0, 0, w, h), d = im.data, A = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) A[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    const [r, g, b] = rgb(col);
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      const i = y * w + X;
      if (A[i]) continue;
      if ((X > 0 && A[i - 1]) || (X < w - 1 && A[i + 1]) || (y > 0 && A[i - w]) || (y < h - 1 && A[i + w])) {
        d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
      }
    }
    x.putImageData(im, 0, 0);
  }

  // The painter a prop draws with: px() in canvas pixels (origin top left, base on the last row),
  // colours washed toward the zone water, glow() marks a spot that shines through the dark.
  function painter(x, W, H, zone) {
    const wash = TINT[zone], deep = ZONES[zone].deep, cache = {};
    const P = {
      W, H, glows: [],
      T(col) { return cache[col] || (cache[col] = mix(col, deep, wash)); },
      px(X, Y, w, h, col) {
        X = Math.round(X); Y = Math.round(Y);
        if (X >= W || Y >= H || X + (w || 1) <= 0 || Y + (h || 1) <= 0) return;
        x.fillStyle = P.T(col); x.fillRect(X, Y, w || 1, h || 1);
      },
      raw(X, Y, w, h, col) { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), w || 1, h || 1); },
      glow(X, Y, col, size) { P.glows.push([Math.round(X), Math.round(Y), col, size || 1]); },
      // sideways sway of a stem at step k of len: the base stays put, the tip moves most
      sway(f, amp, k, len, ph) { return Math.round(Math.sin((f / FR) * Math.PI * 2 + (ph || 0)) * amp * Math.pow(k / len, 1.5)); },
      disc(cx, cy, r, col, top) {
        for (let y = -r; y <= (top ? 0 : r); y++) { const w = Math.round(Math.sqrt(r * r - y * y)); P.px(cx - w, cy + y, w * 2 + 1, 1, col); }
      },
    };
    return P;
  }

  // ---------- wall props ----------
  // m: ledge = sits on a small shelf, face = stuck on the cliff edge, hang = hangs from it.
  // Painted facing right (left wall); the right wall uses a mirrored bake.
  const PROPS = {
    // --- Estuary ---
    seagrass: { w: 22, h: 24, anim: 1, m: 'ledge', paint(p, f, r) {
      const n = 4 + ((r() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const bx = 2 + j * 2 + ((r() * 2) | 0), len = 9 + ((r() * 12) | 0), ph = r() * 6;
        const col = j % 2 ? '#3c7a3a' : '#4f9a45';
        for (let k = 0; k < len; k++) {
          const x = bx + p.sway(f, 2.5, k, len, ph) + Math.round(k * 0.18);
          p.px(x, p.H - 1 - k, k < len - 3 ? 2 : 1, 1, k > len * 0.6 && j % 2 === 0 ? '#79c060' : col);
        }
      }
    } },
    roots: { w: 28, h: 26, m: 'hang', paint(p, f, r) {
      for (let j = 0; j < 4; j++) {
        const y0 = 1 + j * 3, dx = 8 + j * 5 + ((r() * 3) | 0), y1 = p.H - 2 - ((r() * 8) | 0);
        for (let t = 0; t <= 1.0001; t += 0.02) {
          const x = 2 * (1 - t) * t * dx + t * t * dx, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y0 + t * t * y1;
          p.px(x, y, 2, 2, '#5a3f2c');
          p.px(x, y, 1, 1, '#7a5638');
        }
        p.px(dx - 1, y1 + 1, 3, 1, '#4f9a45');
        if (r() < 0.8) p.px(dx * 0.7 + 1, y0 + (y1 - y0) * 0.45, 2, 1, '#d8d0b8');
      }
    } },
    post: { w: 16, h: 30, anim: 1, m: 'ledge', paint(p, f, r) {
      const tall = 20 + ((r() * 6) | 0), x = 3;
      for (let k = 0; k < tall; k++) {
        const y = p.H - 1 - k;
        p.px(x, y, 4, 1, '#6b4a2e'); p.px(x, y, 1, 1, '#8a6440');
        if (k % 7 === 3) p.px(x + 2, y, 1, 1, '#4e3520');
      }
      p.px(x, p.H - tall - 1, 2, 1, '#6b4a2e'); p.px(x + 3, p.H - tall, 1, 1, '#6b4a2e'); // broken top
      const ry = p.H - Math.round(tall * 0.62);
      p.px(x - 1, ry, 6, 1, '#c9a86a'); p.px(x - 1, ry + 2, 6, 1, '#c9a86a'); p.px(x + 4, ry + 1, 2, 3, '#a8884e');
      for (let k = 0; k < 4; k++) p.px(x + (k % 2), p.H - 1 - k, 3 - (k >> 1), 1, '#4f9a45');
      for (let k = 0; k < 9; k++) p.px(x + 4 + Math.round(k * 0.4) + p.sway(f, 2, k, 9, 1), p.H - tall + 4 - k, 1, 1, '#3c7a3a');
    } },
    shell: { w: 8, h: 7, m: 'face', paint(p, f, r) {
      const rows = [[2, 2], [1, 4], [1, 5], [0, 6], [1, 6]];
      rows.forEach(([x, w], y) => p.px(x + 1, y + 1, w, 1, y % 2 ? '#e6d8bb' : '#b88a5a'));
      p.px(6, 5, 1, 1, '#f3ead7');
    } },

    // --- Reef ---
    staghorn: { w: 26, h: 24, m: 'ledge', paint(p, f, r) {
      const col = r() < 0.5 ? ['#ff8a6b', '#d9604a', '#ffc0a0'] : ['#f2a0c0', '#c86a90', '#ffd6e6'];
      const branch = (x, y, a, len, d) => {
        for (let k = 0; k < len; k++) {
          x += Math.cos(a); y += Math.sin(a);
          p.px(x, y, d ? 1 : 2, 1, col[0]); p.px(x + (d ? 0 : 1), y, 1, 1, col[1]);
        }
        p.px(x, y - 1, 1, 1, col[2]);
        if (d < 2) { branch(x, y, a - 0.55 - r() * 0.2, len * 0.7, d + 1); branch(x, y, a + 0.5 + r() * 0.2, len * 0.65, d + 1); }
      };
      branch(6, p.H - 1, -Math.PI / 2 + 0.25, 7 + r() * 2, 0);
      branch(10, p.H - 1, -Math.PI / 2 + 0.7, 5, 1);
    } },
    brain: { w: 20, h: 12, m: 'ledge', paint(p, f, r) {
      const rx = 8, ry = 9, cx = 9, by = p.H - 1, ph = r() * 6;
      for (let y = 0; y < ry; y++) {
        const w = Math.round(rx * Math.sqrt(1 - (y / ry) * (y / ry)));
        for (let x = -w; x <= w; x++) {
          const groove = Math.sin(x * 0.9 + Math.sin((by - y) * 1.1 + ph) * 2.2) > 0.55;
          p.px(cx + x, by - y, 1, 1, groove ? '#b98a45' : y > ry - 3 ? '#f2d08a' : '#e3b46a');
        }
      }
    } },
    fan: { w: 24, h: 26, anim: 1, m: 'ledge', paint(p, f, r) {
      const ox = 5, oy = p.H - 6, col = r() < 0.6 ? ['#a865d0', '#7a4aa0'] : ['#e06a6a', '#a84848'];
      for (let k = 0; k < 6; k++) p.px(ox - 1, p.H - 1 - k, 2, 1, col[1]);
      for (let a = -2.7; a <= -0.35; a += 0.24) {
        const len = 13 + Math.round(Math.sin(a * 3) * 2);
        for (let k = 0; k < len; k++) {
          const s = p.sway(f, 1.2, k, len, 0.5);
          p.px(ox + Math.cos(a) * k + s, oy + Math.sin(a) * k, 1, 1, k % 4 === 3 ? col[1] : col[0]);
        }
      }
    } },
    tube: { w: 16, h: 20, m: 'ledge', paint(p, f, r) {
      const yel = r() < 0.6;
      const c = yel ? ['#f2c14e', '#ffdc7a', '#c99a2e', '#6b4300'] : ['#5fb8a8', '#8ad8c8', '#3a8a7c', '#183a36'];
      for (let j = 0; j < 4; j++) {
        const x = 1 + j * 3 + (j > 1 ? 1 : 0), tall = 6 + ((r() * 11) | 0);
        for (let k = 0; k < tall; k++) { p.px(x, p.H - 1 - k, 3, 1, c[0]); p.px(x, p.H - 1 - k, 1, 1, c[1]); p.px(x + 2, p.H - 1 - k, 1, 1, c[2]); }
        p.px(x, p.H - tall, 3, 1, c[1]); p.px(x + 1, p.H - tall, 1, 1, c[3]);
      }
    } },
    anemone: { w: 18, h: 16, anim: 1, m: 'ledge', paint(p, f, r) {
      const c = r() < 0.5 ? ['#c8506e', '#e86a8a', '#ffa0b8', '#ffd6e0'] : ['#7a5ab0', '#9a7ad0', '#c8b0ff', '#ece0ff'];
      for (let k = 0; k < 4; k++) p.px(5, p.H - 1 - k, 6, 1, c[0]);
      p.px(4, p.H - 5, 8, 1, c[1]);
      for (let j = 0; j < 7; j++) {
        const a = -Math.PI + 0.35 + j * 0.4, len = 5 + (j % 3);
        for (let k = 1; k <= len; k++) {
          const s = p.sway(f, 1.6, k, len, j * 0.7);
          p.px(8 + Math.cos(a) * k * 0.9 + s, p.H - 5 + Math.sin(a) * k, 1, 1, k === len ? c[3] : c[2]);
        }
      }
    } },
    star: { w: 10, h: 10, m: 'face', paint(p, f, r) {
      const rot = r() * 1.2;
      for (let j = 0; j < 5; j++) {
        const a = rot + (j * Math.PI * 2) / 5;
        for (let k = 1; k <= 4; k++) p.px(5 + Math.cos(a) * k, 5 + Math.sin(a) * k, 1, 1, k === 2 ? '#ffa46b' : '#ff6b3d');
      }
      p.px(4, 4, 2, 2, '#ff6b3d'); p.px(4, 4, 1, 1, '#ffa46b');
    } },
    clam: { w: 15, h: 11, m: 'ledge', paint(p, f, r) {
      // bottom shell (a ridged bowl), blue mantle, the lid tipped open, and a pearl inside
      for (let y = 0; y < 4; y++) for (let x = y; x < 13 - y; x++) p.px(1 + x, p.H - 1 - (3 - y), 1, 1, x % 3 === 0 ? '#a8946e' : '#cdb995');
      for (let x = 0; x < 13; x++) p.px(1 + x, p.H - 5 - (x % 2), 1, 1, x % 2 ? '#7ad8e8' : '#3fb8d0');
      for (let k = 0; k < 9; k++) { p.px(1 + k, p.H - 6 - Math.round(k * 0.45), 3, 1, k % 3 === 1 ? '#a8946e' : '#cdb995'); }
      p.raw(8, p.H - 7, 2, 2, '#e6dcff'); p.raw(8, p.H - 7, 1, 1, '#ffffff'); p.glow(8, p.H - 7, '#d8ccff', 1);
    } },

    // --- Open Blue ---
    kelp: { w: 26, h: 50, anim: 1, m: 'ledge', paint(p, f, r) {
      const n = r() < 0.5 ? 1 : 2;
      for (let j = 0; j < n; j++) {
        const bx = 3 + j * 6, len = 30 + ((r() * 16) | 0), ph = r() * 6;
        for (let k = 0; k < len; k++) {
          const x = bx + p.sway(f, 4, k, len, ph) + Math.round(k * 0.12), y = p.H - 1 - k;
          p.px(x, y, 2, 1, '#6b7a2e'); p.px(x, y, 1, 1, '#8a9a3a');
          if (k > 4 && k % 6 === (j * 3) % 6) {
            const dir = (k / 6) % 2 ? 1 : -1;
            for (let q = 1; q <= 4; q++) p.px(x + (dir > 0 ? 1 + q : -q), y - Math.round(q * 0.6), 1, 1, q > 2 ? '#a8b048' : '#8a9a3a');
            p.px(x + (dir > 0 ? 2 : -1), y + 1, 2, 2, '#c8b850');
          }
        }
        p.px(bx + p.sway(f, 4, len, len, ph) + Math.round(len * 0.12) - 1, p.H - len - 1, 3, 2, '#a8b048');
      }
    } },
    sponge: { w: 18, h: 13, m: 'ledge', paint(p, f, r) {
      const blobs = [[5, 8, 4], [11, 9, 3], [8, 5, 3]];
      for (const [x, y, rr] of blobs) p.disc(x, y, rr, '#4a7ab0');
      for (const [x, y, rr] of blobs) { p.px(x - rr + 1, y - rr + 1, 2, 1, '#6a9ad0'); p.px(x, y - 1, 1, 2, '#24446e'); }
      p.px(0, p.H - 1, 16, 1, '#3a6498');
    } },
    barnacle: { w: 11, h: 8, m: 'face', paint(p, f, r) {
      const n = 3 + ((r() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const x = 1 + ((r() * 7) | 0), y = 2 + ((r() * 4) | 0);
        p.px(x, y, 3, 2, '#cfc6b0'); p.px(x + 1, y - 1, 1, 1, '#cfc6b0'); p.px(x + 1, y, 1, 1, '#6a6050');
      }
    } },
    anchor: { w: 22, h: 44, m: 'ledge', paint(p, f, r) {
      const cx = 10, by = p.H - 2;
      for (let k = 0; k < 22; k++) p.px(cx, by - k, 2, 1, k % 5 === 2 ? '#a0704e' : '#7a5a48');
      p.px(cx - 4, by - 20, 10, 2, '#7a5a48'); p.px(cx - 4, by - 20, 10, 1, '#a0704e');
      p.px(cx - 1, by - 25, 4, 4, '#7a5a48'); p.px(cx, by - 24, 2, 2, '#14121c');
      for (let x = -7; x <= 7; x++) { const y = Math.round((x * x) / 9); p.px(cx + 1 + x, by - y, 1, 2, '#7a5a48'); }
      p.px(cx - 8, by - 6, 2, 2, '#a0704e'); p.px(cx + 8, by - 6, 2, 2, '#a0704e');
      for (let k = 0; k < 6; k++) { const y = by - 27 - k * 3; p.px(cx + (k % 2), y, 2, 2, '#8a7a70'); p.px(cx + (k % 2), y, 1, 1, '#a89a90'); }
      p.px(cx - 3, by + 1, 8, 1, '#4f6a3a');
    } },

    // --- Twilight ---
    whip: { w: 22, h: 40, anim: 1, m: 'ledge', paint(p, f, r) {
      for (let j = 0; j < 3; j++) {
        const len = 18 + ((r() * 18) | 0), bend = 0.15 + r() * 0.35, ph = r() * 6;
        for (let k = 0; k < len; k++) {
          const x = 3 + j * 2 + Math.round(bend * k * k / len) + p.sway(f, 2.5, k, len, ph);
          p.px(x, p.H - 1 - k, 1, 1, k % 2 ? '#c8503a' : '#e07050');
        }
      }
    } },
    lily: { w: 22, h: 34, anim: 1, m: 'ledge', paint(p, f, r) {
      const len = 15 + ((r() * 8) | 0), ph = r() * 6;
      let tx = 4, ty = p.H - 1;
      for (let k = 0; k < len; k++) {
        tx = 4 + Math.round(k * 0.2) + p.sway(f, 1.5, k, len, ph); ty = p.H - 1 - k;
        p.px(tx, ty, 1, 1, k % 3 ? '#b8a890' : '#d8c8b0');
      }
      // feathery arms fanning up and out, curling back in at the tips
      for (let j = 0; j < 7; j++) {
        let a = -2.75 + j * 0.37, x = tx, y = ty;
        const curl = (j < 3 ? 1 : j > 3 ? -1 : 0) * 0.16;
        for (let k = 1; k <= 8; k++) {
          a += curl * (k > 4 ? 1.6 : 0.3);
          x += Math.cos(a); y += Math.sin(a);
          const sx = x + p.sway(f, 1.2, k, 8, ph + 1);
          p.px(sx, y, 1, 1, '#e0c8a0');
          if (k > 2 && k % 2 === 0) p.px(sx - Math.sin(a), y + Math.cos(a), 1, 1, '#f0dcb8');
        }
      }
    } },
    glass: { w: 14, h: 26, m: 'ledge', paint(p, f, r) {
      const tall = 18 + ((r() * 6) | 0);
      for (let k = 0; k < tall; k++) {
        const hw = Math.round(1.5 + (k / tall) * 3.5), y = p.H - 1 - k;
        for (let x = -hw; x <= hw; x++) {
          const edge = Math.abs(x) === hw;
          if (!edge && (x + k) % 3 === 0) continue;
          p.px(6 + x + Math.round(k * 0.08), y, 1, 1, edge ? '#e8f0f4' : '#a8c0cc');
        }
      }
      p.px(6 - 5 + Math.round(tall * 0.08), p.H - tall - 1, 11, 1, '#e8f0f4');
    } },
    stalks: { w: 16, h: 22, anim: 1, m: 'ledge', paint(p, f, r) {
      for (let j = 0; j < 3; j++) {
        const len = 9 + ((r() * 10) | 0), ph = r() * 6;
        let x = 0, y = 0;
        for (let k = 0; k < len; k++) {
          x = 3 + j * 3 + Math.round(k * 0.15 * (j - 0.5)) + p.sway(f, 1.5, k, len, ph); y = p.H - 1 - k;
          p.px(x, y, 1, 1, '#3a5a78');
        }
        p.px(x - 1, y - 1, 3, 2, '#5ad0e8'); p.glow(x, y - 1, '#7af0ff', 2);
      }
    } },

    // --- Trench ---
    worms: { w: 18, h: 26, anim: 1, m: 'ledge', paint(p, f, r) {
      const n = 4 + ((r() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const x = 1 + j * 2 + ((r() * 2) | 0), tall = 8 + ((r() * 12) | 0), ph = r() * 6;
        for (let k = 0; k < tall; k++) { p.px(x, p.H - 1 - k, 2, 1, k % 4 === 1 ? '#c8c0b0' : '#e8e2d4'); p.px(x + 1, p.H - 1 - k, 1, 1, '#b8b0a0'); }
        const top = p.H - tall, s = p.sway(f, 1.5, 1, 1, ph);
        p.px(x - 1 + s, top - 2, 4, 2, '#e0473a'); p.px(x + s, top - 3, 2, 1, '#ff7a5a'); p.px(x - 1 + s, top - 2, 1, 1, '#ff7a5a');
        if (j % 3 === 1) p.glow(x + s, top - 3, '#ff8a6b', 1);
      }
    } },
    chimney: { w: 16, h: 34, m: 'ledge', smoke: 1, paint(p, f, r) {
      const tall = 22 + ((r() * 8) | 0);
      for (let k = 0; k < tall; k++) {
        const hw = Math.round(5 - (k / tall) * 2.5 + (hash(k * 3.1) - 0.5) * 1.6), y = p.H - 1 - k;
        p.px(7 - hw, y, hw * 2, 1, '#2a2228'); p.px(7 - hw, y, 1, 1, '#463a40');
        if (k % 5 === 2) p.px(7 - hw + 2, y, 2, 1, '#3e3238');
      }
      p.px(5, p.H - tall, 4, 1, '#14121c');
      for (const k of [6, 13, 17]) if (k < tall - 2) { p.raw(6 + (k % 3), p.H - 1 - k, 1, 2, '#ff6b3d'); p.glow(6 + (k % 3), p.H - k, '#ff8a4d', 1); }
      p.top = [7, p.H - tall - 1];
    } },
    bones: { w: 28, h: 18, m: 'ledge', paint(p, f, r) {
      const by = p.H - 2;
      for (let x = 1; x < 26; x++) { p.px(x, by, 1, 2, '#d8cfb8'); if (x % 3 === 0) p.px(x, by - 1, 1, 1, '#a89e88'); }
      for (let j = 0; j < 5; j++) {
        const x0 = 4 + j * 4, h = 12 - Math.abs(j - 2) * 2;
        for (let k = 0; k < h; k++) p.px(x0 + Math.round((k * k) / (h * 1.6)), by - 1 - k, 1, 1, k % 4 === 3 ? '#a89e88' : '#d8cfb8');
      }
      p.px(23, by - 3, 4, 3, '#d8cfb8'); p.px(24, by - 2, 1, 1, '#2a2228');
    } },
    mussel: { w: 13, h: 8, m: 'face', paint(p, f, r) {
      for (let j = 0; j < 4; j++) {
        const x = 1 + ((r() * 7) | 0), y = 1 + ((r() * 4) | 0);
        p.px(x, y, 4, 2, '#2b2f4a'); p.px(x + 1, y, 2, 1, '#5a6488'); p.px(x + 3, y + 1, 1, 1, '#1a1c2e');
      }
    } },

    // --- Weird Deep ---
    crystal: { w: 20, h: 26, m: 'ledge', paint(p, f, r) {
      const purple = r() < 0.6;
      const c = purple ? ['#7a5ae0', '#b78bff', '#e6dcff', '#cbb4ff'] : ['#2fa8a0', '#5ae0d0', '#d8fff8', '#9af0e4'];
      const n = 3 + ((r() * 2) | 0);
      for (let j = 0; j < n; j++) {
        const x0 = 3 + j * 4, tall = 7 + ((r() * 15) | 0), lean = (r() - 0.3) * 0.5, w = 3 + ((r() * 2) | 0);
        for (let k = 0; k < tall; k++) {
          const ww = k > tall - 4 ? Math.max(1, w - (k - (tall - 4))) : w, x = x0 + Math.round(k * lean);
          p.px(x, p.H - 1 - k, ww, 1, c[0]); p.px(x, p.H - 1 - k, 1, 1, c[1]);
        }
        const tx = x0 + Math.round(tall * lean);
        p.raw(tx, p.H - tall, 1, 2, c[2]); p.glow(tx, p.H - tall, c[3], 2);
      }
    } },
    eye: { w: 16, h: 28, anim: 1, m: 'ledge', paint(p, f, r) {
      const len = 14 + ((r() * 8) | 0), ph = r() * 6;
      let x = 0, y = 0;
      for (let k = 0; k < len; k++) {
        x = 4 + Math.round(Math.sin(k * 0.3) * 1.5) + p.sway(f, 2, k, len, ph); y = p.H - 1 - k;
        p.px(x, y, 2, 1, '#4a3a6a'); p.px(x, y, 1, 1, '#6a5a8a');
      }
      p.disc(x + 1, y - 3, 3, '#e8e0d0');
      if (f === 3) p.px(x - 2, y - 3, 7, 1, '#4a3a6a');
      else { p.raw(x + 1, y - 4, 2, 2, '#ff6b3d'); p.raw(x + 2, y - 4, 1, 1, '#14121c'); p.glow(x + 1, y - 3, '#ffe9c8', 2); }
    } },
    shroom: { w: 18, h: 16, m: 'ledge', paint(p, f, r) {
      const n = 2 + ((r() * 2) | 0);
      for (let j = 0; j < n; j++) {
        const x = 3 + j * 5 + ((r() * 2) | 0), tall = 4 + ((r() * 7) | 0), rr = 2 + ((r() * 2) | 0);
        for (let k = 0; k < tall; k++) p.px(x, p.H - 1 - k, 2, 1, '#c8c0e0');
        const cy = p.H - tall;
        for (let y = 0; y <= rr; y++) { const w = Math.round(Math.sqrt(rr * rr - y * y)); p.raw(x + 1 - w, cy - y, w * 2, 1, '#3fd0b8'); }
        p.raw(x - rr + 2, cy - rr + 1, 1, 1, '#c8fff4'); p.raw(x + 1, cy - 1, 1, 1, '#c8fff4');
        p.glow(x + 1, cy - 1, '#4fe0c8', 2);
      }
    } },
    fossil: { w: 11, h: 11, m: 'face', paint(p, f, r) {
      p.disc(5, 5, 4, '#5a4a78');
      for (let a = 0; a < 14; a += 0.25) { const rr = 0.3 * a; p.px(5 + Math.cos(a) * rr, 5 + Math.sin(a) * rr, 1, 1, '#a898c8'); }
    } },
  };

  // what grows where: big props on every other segment, small ones in between, per side
  const ZONE_PROPS = [
    { big: ['seagrass', 'seagrass', 'roots', 'post', 'seagrass'], small: ['shell', 'shell', 'barnacle'] },
    { big: ['staghorn', 'brain', 'fan', 'tube', 'anemone', 'staghorn', 'fan'], small: ['star', 'clam', 'star'] },
    { big: ['kelp', 'kelp', 'kelp', 'sponge', 'kelp'], small: ['barnacle', 'barnacle', 'star'] },
    { big: ['whip', 'lily', 'glass', 'stalks', 'whip', 'lily'], small: ['barnacle'] },
    { big: ['worms', 'worms', 'chimney', 'bones', 'worms'], small: ['mussel', 'mussel'] },
    { big: ['crystal', 'crystal', 'eye', 'shroom', 'crystal'], small: ['fossil'] },
  ];
  // one-off props at fixed depths (metres -> segment), left (0) or right (1) wall
  const SPECIAL = { [Math.floor(148 / SEG)]: [0, 'anchor'] };

  function propCanvas(name, zone, v, side, f) {
    const def = PROPS[name];
    const fr = def.anim ? f : 0;
    return bake(name + '|' + zone + '|' + v + '|' + side + '|' + fr, def.w, def.h, (c, x) => {
      const p = painter(x, def.w, def.h, zone);
      def.paint(p, fr, rng(v * 7919 + name.length * 131 + zone * 17 + 1));
      outline(c, mix(ZONES[zone].deep, '#05070d', 0.55));
      if (side) {
        const m = document.createElement('canvas');
        m.width = def.w; m.height = def.h;
        const mx = m.getContext('2d');
        mx.translate(def.w, 0); mx.scale(-1, 1); mx.drawImage(c, 0, 0);
        x.clearRect(0, 0, def.w, def.h); x.drawImage(m, 0, 0);
        p.glows = p.glows.map(([gx, gy, col, s]) => [def.w - 1 - gx, gy, col, s]);
        if (p.top) p.top = [def.w - 1 - p.top[0], p.top[1]];
      }
      c.glows = p.glows; c.top = p.top;
    });
  }

  // a rock pillar (56 wide) with two or three of the zone's props on its flat top
  function midCanvas(z, v, f) {
    const L = ZONE_PROPS[z].big.filter((n) => PROPS[n].m === 'ledge');
    const picks = [L[(v * 2) % L.length], L[(v * 2 + 3) % L.length], L[(v + 1) % L.length]];
    const anim = picks.some((n) => PROPS[n].anim);
    const W = 56, H = 70, top = 50;
    return bake('mid|' + z + '|' + v + '|' + (anim ? f : 0), W, H, (c, x) => {
      const rock = mix(ZONES[z].deep, '#05070d', 0.22), lip = mix(ZONES[z].deep, '#05070d', 0.08);
      x.fillStyle = rock;
      // a boulder: flat top, rounded underside, a few chipped steps on the sides
      for (let y = top; y < H; y++) {
        const k = (y - top) / (H - top), hw = Math.round(24 * Math.sqrt(1 - k * k) + (hash(Math.floor(y / 3) * 1.7 + v) - 0.5) * 3);
        x.fillRect(28 - hw, y, hw * 2, 1);
      }
      x.fillStyle = lip; x.fillRect(5, top, 46, 2);
      let px = 6;
      for (let n = 0; n < 3 && px < W - 12; n++) {
        const def = PROPS[picks[n]];
        const img = propCanvas(picks[n], z, (v + n) % 3, n % 2, f);
        if (px + def.w > W) break;
        x.drawImage(img, px, top + 1 - def.h);
        px += Math.max(10, Math.round(def.w * 0.65));
      }
      // wash it toward the water so it stays behind the fish
      x.globalCompositeOperation = 'source-atop';
      x.globalAlpha = 0.45; x.fillStyle = ZONES[z].water; x.fillRect(0, 0, W, H);
    });
  }

  Object.assign(R, {
    glows: [],

    drawDecor(ctx, Y, camY) {
      this.glows.length = 0;
      const a = Math.max(0, Math.floor(camY / SEG) - 1), b = Math.ceil((camY + this.viewH) / SEG) + 4;
      const frame = Math.floor(this.t * 4);
      for (let i = a; i < b; i++) {
        const y = i * SEG, z = E.zoneAt(y);
        const [wl, wr] = this.wallAt(i);
        const yb = Y(y + SEG);
        for (let side = 0; side < 2; side++) {
          const edge = Math.round(side ? this.artW - wr : wl);
          if (side ? edge > this.artW + 30 : edge < -30) continue; // wall off screen (portrait)
          const h1 = hash(i * 31 + side * 7 + 11), h2 = hash(i * 13 + side * 5 + 3);
          let name = null;
          const sp = SPECIAL[i];
          if (sp && sp[0] === side) name = sp[1];
          else if (i % 2 === side) { if (h1 < 0.74) { const L = ZONE_PROPS[z].big; name = L[Math.floor(h2 * L.length)]; } }
          else if (h1 < 0.4) { const L = ZONE_PROPS[z].small; name = L[Math.floor(h2 * L.length)]; }
          if (!name) continue;
          const def = PROPS[name];
          const v = Math.floor(hash(i * 3 + side) * 3);
          const img = propCanvas(name, z, v, side, (frame + i) % FR);
          let x, top;
          if (def.m === 'face') { x = side ? edge - def.w + 4 : edge - 4; top = Y(y) + 4; }
          else if (def.m === 'hang') { x = side ? edge - def.w + 1 : edge - 1; top = Y(y) + 2; }
          else {
            // a small shelf of the cliff for the prop to sit on
            const sw = Math.min(14, Math.round(def.w * 0.6));
            const sx = side ? edge - sw : edge - 1;
            ctx.fillStyle = mix(ZONES[z].deep, '#05070d', 0.45); ctx.fillRect(sx, yb - 3, sw + 1, 3);
            ctx.fillStyle = mix(ZONES[z].deep, '#05070d', 0.25); ctx.fillRect(sx, yb - 3, sw + 1, 1);
            x = side ? edge - def.w + 2 : edge - 2; top = yb - 2 - def.h;
          }
          if (top > this.artH || top + def.h < 0) continue;
          ctx.drawImage(img, x, top);
          for (const [gx, gy, col, s] of img.glows) this.glows.push(x + gx, top + gy, col, s, i);
          if (def.smoke && img.top) this.smoke(ctx, x + img.top[0], top + img.top[1], i);
        }
      }
    },

    // shimmering water rising off a chimney: a few soft squares that drift up and fade
    smoke(ctx, x, y, seed) {
      for (let k = 0; k < 5; k++) {
        const age = (this.t * 0.35 + k / 5 + hash(seed) ) % 1;
        const px = Math.round(x + Math.sin(age * 5 + k + seed) * 3 * age), py = Math.round(y - age * 30);
        const s = 2 + Math.round(age * 3);
        ctx.fillStyle = `rgba(120,110,124,${(0.45 * (1 - age)).toFixed(2)})`;
        ctx.fillRect(px - (s >> 1), py, s, s);
      }
    },

    // after the darkness: everything marked glow() shines through it, with a slow pulse
    drawGlow(ctx) {
      const G = this.glows;
      for (let n = 0; n < G.length; n += 5) {
        const x = G[n], y = G[n + 1], col = G[n + 2], s = G[n + 3], i = G[n + 4];
        const pulse = 0.55 + 0.45 * Math.sin(this.t * 1.6 + i * 1.7 + x * 0.3);
        const c = s > 1 ? 2 : 1;
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.18 * pulse;          // outer ring: four single pixels
        ctx.fillRect(x - 2, y, 1, c); ctx.fillRect(x + c + 1, y, 1, c); ctx.fillRect(x, y - 2, c, 1); ctx.fillRect(x, y + c + 1, c, 1);
        ctx.globalAlpha = 0.45 * pulse;          // inner plus
        ctx.fillRect(x - 1, y, c + 2, c); ctx.fillRect(x, y - 1, c, c + 2);
        ctx.globalAlpha = 0.6 + 0.4 * pulse;     // core
        ctx.fillRect(x, y, c, c);
      }
      ctx.globalAlpha = 1;
      this.drawLandmarkGlow(ctx);
    },

    // ---------- far background ----------
    // Two parallax layers of flat silhouettes behind the play area; their shapes follow the zone.
    drawFar(ctx, Y, camY) {
      const surf = Math.max(0, Y(0));
      if (surf >= this.artH) return;
      const layers = [[0.35, 0.16, 12], [0.62, 0.3, 8]];
      ctx.save();
      ctx.beginPath(); ctx.rect(0, surf, this.artW, this.artH - surf); ctx.clip();
      this.farLayer(ctx, camY, layers[0], 0);
      this.drawLandmarks(ctx, camY);
      this.farLayer(ctx, camY, layers[1], 1);
      this.drawMid(ctx, camY);
      ctx.restore();
    },

    // Middle distance: flat-topped rock pillars carrying the zone's props, washed toward the
    // water colour. They bring the zone's colours to the middle of the screen, which matters in
    // portrait, where the cliff walls are mostly off screen.
    drawMid(ctx, camY) {
      const p = 0.8, seg = 22, vy = camY * p;
      const a = Math.floor(vy / seg) - 1, b = Math.ceil((vy + this.viewH) / seg) + 3;
      const frame = Math.floor(this.t * 4);
      for (let i = a; i < b; i++) {
        if (i < 1 || hash(i * 41 + 9) > 0.62) continue;
        const z = E.zoneAt(Math.max(0, (i * seg - this.viewH / 2) / p + this.viewH / 2));
        const v = Math.floor(hash(i * 43 + 1) * 3);
        const img = midCanvas(z, v, (frame + i) % FR);
        const base = Math.round((i * seg - vy) * PXM);
        if (base - img.height > this.artH || base < 0) continue;
        const x = Math.round(hash(i * 47 + 5) * (this.artW - img.width * 0.6) - img.width * 0.2);
        ctx.drawImage(img, x, base - img.height);
      }
    },

    farLayer(ctx, camY, [p, dark, seg], L) {
      const vy = camY * p;
      const a = Math.floor(vy / seg) - 2, b = Math.ceil((vy + this.viewH) / seg) + 8;
      const fill = (x, y, w, h) => ctx.fillRect(x, y, w, h);
      for (let i = a; i < b; i++) {
        const h1 = hash(i * 13 + L * 101);
        if (h1 > 0.55) continue;
        // the depth this shape is seen at, so it wears that zone's look
        const z = E.zoneAt(Math.max(0, (i * seg - this.viewH / 2) / p + this.viewH / 2));
        const base = Math.round((i * seg - vy) * PXM);
        const col = mix(ZONES[z].deep, '#05070d', dark);
        ctx.fillStyle = col;
        const x = Math.round(hash(i * 7 + L * 31) * this.artW);
        const tall = Math.round(20 + hash(i * 3 + L) * 70);
        const w = Math.round(6 + hash(i * 5 + L) * 16);
        const k2 = hash(i * 29 + L * 7);
        // nearer layer gets a touch of the zone's colour on its tips (portrait sees little wall)
        const accent = (c) => mix(c, col, L ? 0.72 : 0.86);
        const kind = FAR_KIND[z](k2);
        if (base - 100 > this.artH || base < -20) continue;
        if (kind === 'kelp' || kind === 'reeds') {
          const n = kind === 'reeds' ? 3 + (i % 3) : 1, h = kind === 'reeds' ? Math.round(tall * 0.5) : tall;
          for (let s = 0; s < n; s++) {
            const bx = x + s * 3, ph = i + s;
            for (let k = 0; k < h; k += 2) {
              const xx = bx + Math.round(Math.sin(this.t * 0.9 + k * 0.08 + ph) * (k / 18));
              fill(xx, base - k, 2, 2);
              if (kind === 'kelp' && k % 10 === 6) {
                fill(xx + 2, base - k - 1, 3, 1);
                if (L) { ctx.fillStyle = accent('#c8b850'); fill(xx + 2, base - k, 2, 2); ctx.fillStyle = col; }
              }
            }
          }
          continue;
        }
        if (kind === 'bommie') {
          // round coral head with stubby branches
          const r = Math.round(6 + w * 0.5);
          for (let y = 0; y <= r; y++) { const ww = Math.round(Math.sqrt(r * r - y * y)); fill(x - ww, base - y, ww * 2, 1); }
          for (let s = 0; s < 4; s++) {
            const bx = x - r + 3 + Math.round(((s + 0.5) / 4) * (r * 2 - 6)), bh = 4 + Math.round(hash(i + s) * 7);
            fill(bx, base - r - bh, 2, bh); fill(bx - 2, base - r - bh, 2, 2); fill(bx + 2, base - r - bh + 2, 2, 2);
            if (L) { ctx.fillStyle = accent(s % 2 ? '#ff8a6b' : '#f2a0c0'); fill(bx - 2, base - r - bh, 6, 1); ctx.fillStyle = col; }
          }
          continue;
        }
        if (kind === 'table') {
          const st = Math.round(tall * 0.35);
          fill(x - 1, base - st, 3, st);
          const tw = w + 8;
          fill(x - tw, base - st - 2, tw * 2, 2); fill(x - tw + 3, base - st - 4, tw * 2 - 6, 2);
          if (L) { ctx.fillStyle = accent('#a865d0'); fill(x - tw + 3, base - st - 4, tw * 2 - 6, 1); ctx.fillStyle = col; }
          continue;
        }
        if (kind === 'lily') {
          const h = Math.round(tall * 0.8);
          for (let k = 0; k < h; k++) fill(x + Math.round(Math.sin(k * 0.05 + i) * 2), base - k, 1, 1);
          const tx = x + Math.round(Math.sin(h * 0.05 + i) * 2), ty = base - h;
          const sw = Math.sin(this.t * 0.8 + i) * 0.15;
          if (L) ctx.fillStyle = accent('#e0c8a0');
          for (let j = 0; j < 7; j++) {
            const an = -2.7 + j * 0.37 + sw, cu = (j - 3) * -0.05;
            for (let k = 1; k < 10; k++) fill(tx + Math.round(Math.cos(an + cu * k) * k), ty + Math.round(Math.sin(an + cu * k) * k), 1, 1);
          }
          ctx.fillStyle = col;
          continue;
        }
        if (kind === 'chimney') {
          const h = Math.round(tall * 0.75);
          for (let k = 0; k < h; k += 2) { const ww = Math.max(3, Math.round(w * 0.6 * (1 - k / h * 0.5) + (hash(i + k) - 0.5) * 2)); fill(x - (ww >> 1), base - k - 2, ww, 2); }
          ctx.fillStyle = mix(ZONES[z].deep, '#7a6e80', L ? 0.3 : 0.18);
          for (let s = 0; s < 4; s++) {
            const age = (this.t * 0.18 + s / 4 + hash(i)) % 1, sz = 2 + Math.round(age * 5);
            ctx.globalAlpha = 0.5 * (1 - age);
            fill(x - (sz >> 1) + Math.round(Math.sin(age * 4 + i) * 3 * age), base - h - Math.round(age * 40), sz, sz);
          }
          ctx.globalAlpha = 1;
          if (L) { ctx.fillStyle = accent('#ff6b3d'); fill(x, base - Math.round(h * 0.4), 1, 3); }
          ctx.fillStyle = col;
          continue;
        }
        if (kind === 'shard') {
          for (let s = 0; s < 3; s++) {
            const h = Math.round(tall * (0.4 + 0.3 * hash(i * 2 + s))), lean = (s - 1) * 0.25, sx = x + (s - 1) * 5;
            for (let k = 0; k < h; k++) { const ww = Math.max(1, Math.round(4 * (1 - Math.max(0, k - h + 6) / 6))); fill(sx + Math.round(k * lean), base - k, ww, 1); }
            if (L) { ctx.fillStyle = accent('#b78bff'); fill(sx + Math.round(h * lean), base - h, 1, 3); ctx.fillStyle = col; }
          }
          continue;
        }
        if (kind === 'tentacle') {
          // a huge curled arm rising out of the dark: thick at the root, curling at the tip
          const h = tall + 20;
          let tx = x, ty = base;
          for (let k = 0; k < h; k++) {
            const th = Math.max(1, Math.round(6 * (1 - k / h)));
            tx = x + Math.round(Math.sin(k * 0.06 + this.t * 0.4 + i) * 6);
            ty = base - k;
            fill(tx - (th >> 1), ty, th, 1);
            if (L && k % 6 === 3 && th > 2) { ctx.fillStyle = accent('#b78bff'); fill(tx + (th >> 1), ty, 1, 1); ctx.fillStyle = col; }
          }
          for (let k = 0; k < 14; k++) { const an = k * 0.45; fill(tx + Math.round(Math.cos(an) * (5 - k * 0.3)), ty - 4 + Math.round(Math.sin(an) * (5 - k * 0.3)), 1, 1); }
          continue;
        }
        // rock spire (any zone)
        for (let k = 0; k < tall; k += 3) {
          const ww = Math.max(2, Math.round(w * (1 - k / tall) + Math.sin(k * 0.3 + i) * 1.5));
          fill(x - (ww >> 1), base - k - 3, ww, 3);
        }
        if (L && z === 1) { ctx.fillStyle = accent('#ff8a6b'); fill(x - 2, base - tall, 2, 2); fill(x + 1, base - tall + 2, 2, 1); }
      }
    },

    // ---------- landmarks ----------
    // One big silhouette per zone from Open Blue down, at a fixed depth and half parallax:
    // the ship sinks, the whale swims above it, its bones rest in the trench, and below that
    // something older built an arch.
    landmarkY(D, camY) { return Math.round(((D - camY - this.viewH / 2) * 0.5 + this.viewH / 2) * PXM); },
    drawLandmarks(ctx, camY) {
      this.lmGlow = null;
      for (const m of LANDMARKS) {
        const base = this.landmarkY(m.d, camY);
        if (base < -10 || base - m.h > this.artH + 10) continue;
        const z = E.zoneAt(m.d);
        const col = mix(ZONES[z].deep, '#05070d', 0.22);
        const f = m.anim ? Math.floor(this.t * 1.5) % 2 : 0;
        const img = bake('lm|' + m.id + '|' + f, m.w, m.h, (c, x) => m.paint(x, col, f, ZONES[z].deep));
        let x = Math.round(this.artW * m.xf - m.w / 2);
        if (m.swim) x = Math.round(((this.t * m.swim + 40) % (this.artW + m.w + 60)) - m.w - 30);
        ctx.drawImage(img, x, base - m.h);
        if (m.runes) this.lmGlow = { x, y: base - m.h, pts: m.runes };
      }
    },
    drawLandmarkGlow(ctx) {
      const g = this.lmGlow;
      if (!g) return;
      for (let n = 0; n < g.pts.length; n++) {
        const [x, y] = g.pts[n];
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(this.t * 1.2 + n);
        ctx.fillStyle = '#b78bff';
        ctx.fillRect(g.x + x, g.y + y, 2, 2);
      }
      ctx.globalAlpha = 1;
    },
  });

  // far shapes per zone, picked by a hash in [0, 1)
  const FAR_KIND = [
    (k) => (k < 0.35 ? 'reeds' : k < 0.65 ? 'kelp' : 'spire'),
    (k) => (k < 0.4 ? 'bommie' : k < 0.65 ? 'table' : 'spire'),
    (k) => (k < 0.65 ? 'kelp' : 'spire'),
    (k) => (k < 0.5 ? 'lily' : 'spire'),
    (k) => (k < 0.55 ? 'chimney' : 'spire'),
    (k) => (k < 0.5 ? 'shard' : k < 0.72 ? 'tentacle' : 'spire'),
  ];

  // silhouette helpers for landmarks
  const rows = (x, col, pts) => { x.fillStyle = col; for (const [a, b, y, h] of pts) x.fillRect(a, y, b - a, h || 1); };
  const LANDMARKS = [
    { id: 'ship', d: 165, xf: 0.68, w: 120, h: 62, paint(x, col) {
      x.fillStyle = col;
      // rock it rests on
      for (let y = 0; y < 12; y++) { const w = Math.round(60 * Math.sqrt(1 - (y / 12) ** 2)); x.fillRect(60 - w, 61 - y, w * 2, 1); }
      // tilted hull: rows narrow toward the keel, bow lifted to the right
      for (let y = 0; y < 18; y++) {
        const l = 18 + Math.round(y * 1.3), r = 100 - Math.round(y * 0.6) - (y < 6 ? 0 : 0);
        x.fillRect(l, 32 + y - Math.round((l - 18) * 0.08), r - l, 1);
        x.fillRect(l, 32 + y, r - l, 1);
      }
      x.fillRect(96, 22, 6, 12); x.fillRect(100, 18, 4, 6); // bow
      // broken masts and a spar
      for (let k = 0; k < 30; k++) x.fillRect(46 + Math.round(k * 0.35), 32 - k, 3, 1);
      for (let k = 0; k < 16; k++) x.fillRect(72 - Math.round(k * 0.2), 32 - k, 2, 1);
      x.fillRect(42, 12, 22, 2);
      // a torn sail hanging off the spar
      for (let y = 0; y < 9; y++) x.fillRect(44 + (y % 3), 14 + y, 8 - Math.round(y * 0.6), 1);
      // portholes and a hole in the hull let the water through
      x.clearRect(30, 38, 3, 2); x.clearRect(40, 38, 3, 2); x.clearRect(50, 38, 3, 2); x.clearRect(62, 40, 7, 4);
    } },
    { id: 'whale', d: 320, swim: 2.2, anim: 1, w: 92, h: 30, paint(x, col, f) {
      x.fillStyle = col;
      for (let X = 0; X < 70; X++) {
        const t = X / 70, half = Math.round(11 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.7 + (t > 0.75 ? 0 : 1));
        const cy = 15 + Math.round(t * 2);
        x.fillRect(20 + X, cy - half, 1, half * 2 + (t > 0.6 ? 2 : 0));
      }
      // tail on the left: the flukes go up and down between the two frames
      const up = f ? -6 : 5;
      for (let k = 0; k < 14; k++) x.fillRect(20 - k, 15 + Math.round((k * up) / 14), 2, 3);
      x.fillRect(4, 15 + up - 4, 4, 9); x.fillRect(2, 15 + up - 3, 2, 7);
      // pectoral fin and the long jaw line
      for (let k = 0; k < 9; k++) x.fillRect(64 - k, 24 + Math.round(k * 0.5), 3, 1);
      x.clearRect(70, 19, 18, 1);
      x.clearRect(82, 12, 2, 2); // eye
    } },
    { id: 'bones', d: 760, xf: 0.32, w: 116, h: 54, paint(x, col, f, deep) {
      x.fillStyle = col;
      for (let y = 0; y < 10; y++) { const w = Math.round(58 * Math.sqrt(1 - (y / 10) ** 2)); x.fillRect(58 - w, 53 - y, w * 2, 1); }
      const bone = mix(deep, '#d8cfb8', 0.22);
      x.fillStyle = bone;
      for (let X = 12; X < 100; X++) x.fillRect(X, 40 + Math.round(Math.sin(X * 0.05) * 2), 1, 3);
      for (let j = 0; j < 9; j++) {
        const x0 = 22 + j * 8, h = 30 - Math.abs(j - 4) * 3;
        for (let k = 0; k < h; k++) x.fillRect(x0 + Math.round((k * k) / (h * 2.2)), 40 - k, 2, 1);
      }
      for (let y = 0; y < 10; y++) x.fillRect(98, 33 + y, 14 - Math.abs(y - 5), 1); // skull
      x.fillStyle = col; x.fillRect(104, 36, 2, 2);
      x.fillStyle = bone;
      for (let k = 0; k < 10; k++) x.fillRect(12 - k, 41 + Math.round(k * 0.4), 2, 2); // tail bones
    } },
    { id: 'arch', d: 1300, xf: 0.6, w: 96, h: 76, paint(x, col) {
      x.fillStyle = col;
      for (let y = 0; y < 12; y++) { const w = Math.round(48 * Math.sqrt(1 - (y / 12) ** 2)); x.fillRect(48 - w, 75 - y, w * 2, 1); }
      // two pillars of stacked blocks (one snapped short) and the arch between them
      for (let b = 0; b < 8; b++) { x.fillRect(14 + (b % 2), 66 - b * 7, 14, 6); }
      for (let b = 0; b < 4; b++) { x.fillRect(68 + (b % 2), 66 - b * 7, 14, 6); }
      x.fillRect(66, 38, 6, 3); x.fillRect(74, 36, 5, 4);
      for (let a = 0; a <= 26; a++) {
        const an = Math.PI + (a / 26) * Math.PI * 0.62;
        x.fillRect(48 + Math.round(Math.cos(an) * 30) - 3, 22 + Math.round(Math.sin(an) * 18) + 6, 7, 5);
      }
      x.fillRect(10, 8, 22, 4);
    } , runes: [[19, 30], [20, 44], [73, 56], [19, 58]] },
  ];
})(this);
