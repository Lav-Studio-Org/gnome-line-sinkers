// Canvas renderer. Everything in the world is drawn in "art pixels" (4 per metre) at an
// integer device-pixel scale, so the pixel art stays crisp. Text is drawn at device resolution.
(function (root) {
  'use strict';
  const KL = root.KL;
  const E = KL.Engine;
  const { ZONES, SPECIES, MUTATIONS } = E.DATA;
  const PXM = E.PXM;
  const AT = KL.ATLAS;

  const R = {
    cv: null, ctx: null, img: null, dpr: 1, S: 3, artW: 400, artH: 240, cache: {},
    camY: -30, shake: 0, t: 0, texts: [], bubbles: [], flyers: [], motes: [], ripples: [], booms: [], line: null,
    // The play area is always 100 m wide (the balance sim uses 100). Wider screens get more
    // cliff; narrower ones (portrait) see part of it and the camera pans after the hook.
    camX: 50,
    get worldW() { return 100; },
    get ox() {
      const span = this.worldW * PXM;
      if (this.artW >= span) return Math.round((this.artW - span) / 2);
      return Math.max(this.artW - span, Math.min(0, Math.round(this.artW / 2 - this.camX * PXM)));
    },
    get portrait() { return this.cv && this.cv.height > this.cv.width; },
    // share of the screen above the water while docked (portrait shows more sea)
    get sky() { return this.portrait ? 0.3 : 0.42; },
    get viewH() { return this.artH / PXM; },

    init(canvas, img) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.img = img;
      this.dark = document.createElement('canvas');
      this.dctx = this.dark.getContext('2d');
      for (let i = 0; i < 90; i++) this.motes.push({ x: Math.random(), y: Math.random() * 60, p: 0.4 + Math.random() * 0.5, s: Math.random() < 0.2 ? 2 : 1 });
      this.resize();
      root.addEventListener('resize', () => this.resize());
    },
    resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
      this.cv.width = w; this.cv.height = h; this.dpr = dpr;
      // landscape: aim for ~62 m of water on screen; portrait: ~65 m of width, the rest is depth.
      // Always a whole-number scale so the pixel art stays crisp.
      this.S = h > w ? Math.max(2, Math.round(w / 260)) : Math.max(2, Math.round(h / 250));
      this.artW = Math.ceil(w / this.S); this.artH = Math.ceil(h / this.S);
      this.dark.width = this.artW; this.dark.height = this.artH;
    },

    // ---------- sprites and recolours ----------
    variant(name, v) {
      const key = name + '|' + v;
      if (this.cache[key]) return this.cache[key];
      const r = AT[name];
      const c = document.createElement('canvas');
      c.width = r[2]; c.height = r[3];
      const x = c.getContext('2d');
      x.drawImage(this.img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      if (v && v.startsWith('skin:')) dressGnome(x, r[2], r[3], E.GEAR_BY[v.slice(5)] || E.GEAR_BY.classic);
      else if (v) recolor(x, r[2], r[3], v);
      return (this.cache[key] = c);
    },
    // Sprite for the DOM (haul list, fishdex) as a data URL at 3x; shown at its natural size so
    // every art pixel stays square.
    url(name, v, silhouette) {
      const key = 'url|' + name + '|' + v + '|' + (silhouette ? 1 : 0);
      if (this.cache[key]) return this.cache[key];
      const src = this.variant(name, silhouette ? 'sil' : v);
      const c = document.createElement('canvas');
      c.width = src.width * 3; c.height = src.height * 3;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0, c.width, c.height);
      return (this.cache[key] = c.toDataURL());
    },
    // A boat with a gnome on it (80 x 48 art pixels), for the shop and the share card.
    boatCanvas(boat, skin) {
      const key = 'boatc|' + boat + '|' + skin;
      if (this.cache[key]) return this.cache[key];
      const W = 80, H = 48, cx = 40, by = 34;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      paintBoat(x, cx, by, boat, 0.6, 'back');
      paintBoat(x, cx, by, boat, 0.6, 'hull');
      x.drawImage(this.variant('gnome', 'skin:' + skin), cx + 2, by - 13);
      paintBoat(x, cx, by, boat, 0.6, 'front');
      x.fillStyle = '#5a3a22';
      for (let i = 0; i < 18; i++) x.fillRect(Math.round(cx + 10 + Math.cos(-0.73) * i), Math.round(by - 7 + Math.sin(-0.73) * i), 1, 1);
      x.fillStyle = '#3f8f8a';
      for (let i = cx - 34; i < cx + 34; i += 2) x.fillRect(i, by + 7 + Math.round(Math.sin(i * 0.3)), 2, 3);
      return (this.cache[key] = c);
    },
    boatPic(boat, skin, scale) {
      const key = 'boat|' + boat + '|' + skin + '|' + scale;
      if (this.cache[key]) return this.cache[key];
      const c = this.boatCanvas(boat, skin);
      const out = document.createElement('canvas');
      out.width = c.width * scale; out.height = c.height * scale;
      const o = out.getContext('2d');
      o.imageSmoothingEnabled = false;
      o.drawImage(c, 0, 0, out.width, out.height);
      return (this.cache[key] = out.toDataURL());
    },
    fishVariant(f) {
      const sp = SPECIES[f.sp];
      if (f.mut === 1) return 'gold';
      if (f.mut === 2) return 'prism' + (Math.floor(this.t * 6 + f.ph) % 6);
      if (sp.shadow) return 'shadow';
      return '';
    },

    // Draws something once into an offscreen canvas and reuses it (rocks, nets, light holes).
    baked(key, w, h, draw) {
      const B = this.bakes || (this.bakes = new Map());
      let c = B.get(key);
      if (c) return c;
      if (B.size > 400) B.clear();
      c = document.createElement('canvas');
      c.width = Math.max(1, w); c.height = Math.max(1, h);
      draw(c.getContext('2d'));
      B.set(key, c);
      return c;
    },

    // ---------- effects API (called from main.js on run events) ----------
    text(x, y, s, color, big) { this.texts.push({ x, y, s, color, big, t: 0 }); },
    burst(x, y, n) { for (let i = 0; i < n; i++) this.bubbles.push({ x: x + (Math.random() - 0.5) * 2, y: y + (Math.random() - 0.5) * 2, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 4, t: 0, life: 0.8 + Math.random() * 0.8 }); },
    fly(f, x, y, delay) { this.flyers.push({ f, x0: x, y0: y, t: -delay }); },
    ripple(x) { this.ripples.push({ x, t: 0 }); },
    boom(x, y, small) { this.booms.push({ x, y, t: 0, small }); this.burst(x, y, small ? 6 : 18); },
    // the line is a chain of points dropped along the path the hook took; it slowly relaxes
    // straight, so it trails behind the hook like a snake
    startLine(run) { this.line = { pts: [{ x: run.x, y: 0 }], gap: Math.max(0.7, run.st.line / 500) }; },
    updateLine(run, dt) {
      const L = this.line;
      if (!L) return;
      const pts = L.pts;
      if (run.phase !== 'down') {
        // reeling in: pull the line back along its own path
        while (pts.length > 1 && pts[pts.length - 1].y > run.y - 0.2) pts.pop();
      }
      const last = pts[pts.length - 1];
      if (Math.hypot(run.x - last.x, run.y - last.y) > L.gap && run.phase === 'down') pts.push({ x: run.x, y: run.y });
      const k = Math.min(1, dt * 2.4);
      const n = pts.length;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = i + 1 < n ? pts[i + 1] : run;
        const p = pts[i];
        p.x += ((a.x + b.x) / 2 - p.x) * k;
        p.y += ((a.y + b.y) / 2 - p.y) * k;
      }
      if (n > 1) pts[0].x += (pts[1].x - pts[0].x) * k * 0.3;
    },

    // ---------- frame ----------
    frame(g, dt) {
      this.t += dt;
      const ctx = this.ctx, S = this.S;
      // camera
      let target;
      if (g.mode === 'cast' && g.run) {
        const r = g.run;
        target = r.phase === 'down' ? r.y - this.viewH * 0.28 : r.y - this.viewH * 0.62;
        if (r.phase === 'down' && r.y < r.st.line * r.st.fall) target = r.y - this.viewH * 0.4;
        target = Math.max(-this.viewH * this.sky, target);
      } else if (g.mode === 'haul' && g.run) target = -this.viewH * this.sky;
      else target = -this.viewH * this.sky;
      const k = g.mode === 'cast' ? 1 - Math.exp(-dt * 9) : 1 - Math.exp(-dt * 3);
      this.camY += (target - this.camY) * k;
      // sideways camera (only moves when the screen is narrower than the sea)
      const tx = g.mode === 'cast' && g.run ? g.run.x : g.mode === 'throw' && g.throw ? (this.worldW / 2 + g.throw.x) / 2 : this.worldW / 2;
      this.camX += (tx - this.camX) * (g.mode === 'cast' ? 1 - Math.exp(-dt * 4) : 1 - Math.exp(-dt * 2.5));
      const camY = this.camY;
      const midDepth = Math.max(0, camY + this.viewH * 0.5);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      let sx = 0, sy = 0;
      if (this.shake > 0) { this.shake -= dt; sx = Math.round((Math.random() - 0.5) * 3) * S; sy = Math.round((Math.random() - 0.5) * 3) * S; }
      ctx.setTransform(S, 0, 0, S, sx, sy);
      const Y = (m) => Math.round((m - camY) * PXM);

      this.drawSky(ctx, Y, g);
      this.drawWater(ctx, Y, camY);
      this.drawFar(ctx, Y, camY, midDepth);
      this.drawWalls(ctx, Y, camY);
      this.drawMotes(ctx, camY, dt);

      const run = (g.mode === 'cast' || g.mode === 'haul') && g.run ? g.run : g.preview;
      if (run) this.drawObstacles(ctx, run, Y);
      if (run) this.drawFish(ctx, run, Y, g.sonar);
      this.drawBoat(ctx, Y, g);
      if (g.mode === 'throw' && g.throw) this.drawThrow(ctx, Y, g.throw);
      if (g.mode === 'cast' && g.run) { this.updateLine(g.run, dt); this.drawLineAndHook(ctx, g.run, Y); }
      this.drawBubbles(ctx, Y, dt);
      this.drawBooms(ctx, Y, dt);
      this.drawFlyers(ctx, Y, dt, g);
      this.drawDark(ctx, Y, camY, midDepth, run, g);
      this.drawFront(ctx, Y, camY, midDepth);

      // device-pixel layer: floating text and the depth ruler
      ctx.setTransform(1, 0, 0, 1, sx, sy);
      this.drawTexts(ctx, Y, dt);
      if (g.mode === 'cast' && g.run) this.drawRuler(ctx, g.run, camY, g);
      return midDepth;
    },

    drawSky(ctx, Y, g) {
      const top = Y(-60), hz = Y(0);
      if (hz <= 0) return;
      const night = g.moon;
      const bands = night ? ['#1b1f3d', '#232955', '#2d3566', '#3a4378'] : ['#f0c48a', '#f4d19c', '#f7ddb0', '#f9e8c6'];
      const h = hz - top;
      for (let i = 0; i < 4; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, top + Math.floor(h * i / 4), this.artW, Math.ceil(h / 4) + 1); }
      // sun or moon
      const cx = Math.round(this.artW * 0.8), cy = hz - 46;
      ctx.fillStyle = night ? '#f4f0d8' : '#fff1c9';
      disc(ctx, cx, cy, 13);
      if (night) { ctx.fillStyle = '#dcd6b8'; ctx.fillRect(cx - 5, cy - 3, 3, 3); ctx.fillRect(cx + 3, cy + 4, 4, 2); }
      else { ctx.fillStyle = '#ffe2a1'; disc(ctx, cx, cy, 17, 0.35); }
      // clouds
      ctx.fillStyle = night ? '#3e4780' : '#fff6e4';
      for (let i = 0; i < 4; i++) {
        const w = 26 + (i * 13) % 20;
        const x = Math.round(((i * 137 + this.t * (3 + i)) % (this.artW + 80)) - 40);
        const y = hz - 70 + i * 13 - (i % 2) * 6;
        ctx.fillRect(x, y, w, 4); ctx.fillRect(x + 5, y - 3, w - 12, 3); ctx.fillRect(x + 9, y - 5, 9, 2);
      }
      // far mountains, then islands with a lighthouse, then birds
      ctx.fillStyle = night ? '#232a52' : '#d7b48e';
      for (let x = 0; x < this.artW; x += 3) {
        const h3 = Math.round(10 + 8 * Math.sin(x * 0.021) + 5 * Math.sin(x * 0.057 + 1.3) + 3 * hash(Math.floor(x / 9)));
        ctx.fillRect(x, hz - h3, 3, h3);
      }
      ctx.fillStyle = night ? '#2a3260' : '#9bb8a0';
      const isl = [[0.08, 34, 7], [0.18, 20, 4], [0.58, 46, 9], [0.66, 22, 5]];
      for (const [fx, w, h2] of isl) {
        const x = Math.round(this.artW * fx);
        for (let s = 0; s < h2; s++) ctx.fillRect(x + s * 2, hz - s - 1, w - s * 4, 1);
      }
      const lx = Math.round(this.artW * 0.6) + 18, ly = hz - 9;
      ctx.fillStyle = night ? '#c9c3e6' : '#f3ead7'; ctx.fillRect(lx, ly - 14, 4, 14);
      ctx.fillStyle = '#ff6b3d'; ctx.fillRect(lx, ly - 10, 4, 2); ctx.fillRect(lx, ly - 5, 4, 2);
      ctx.fillStyle = '#14121c'; ctx.fillRect(lx - 1, ly - 15, 6, 1); ctx.fillRect(lx, ly - 18, 4, 3);
      if (night || Math.sin(this.t * 1.5) > 0) {
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(lx + 1, ly - 17, 2, 1);
        if (night) { ctx.fillStyle = 'rgba(255,233,168,0.18)'; ctx.fillRect(lx + 4, ly - 18, 30, 3); }
      }
      if (!night) {
        ctx.fillStyle = '#5b4a5e';
        for (let i = 0; i < 3; i++) {
          const bx = Math.round(((this.t * (6 + i) + i * 90) % (this.artW + 40)) - 20), byy = hz - 58 + i * 7 + Math.round(Math.sin(this.t * 2 + i) * 2);
          const flap = Math.sin(this.t * 7 + i * 2) > 0 ? 1 : 0;
          ctx.fillRect(bx - 3, byy - flap, 3, 1); ctx.fillRect(bx + 1, byy - flap, 3, 1); ctx.fillRect(bx, byy, 1, 1);
        }
      }
    },

    drawWater(ctx, Y, camY) {
      const bottom = camY + this.viewH + 2;
      for (let z = 0; z < ZONES.length; z++) {
        const top = ZONES[z].top, end = z + 1 < ZONES.length ? ZONES[z + 1].top : 1e9;
        if (end < camY || top > bottom) continue;
        // four flat steps inside each zone, from its water colour to its deep colour
        const span = Math.min(end, 99999) - top;
        for (let i = 0; i < 4; i++) {
          const a = top + (span * i) / 4, b = top + (span * (i + 1)) / 4;
          if (b < camY || a > bottom) continue;
          ctx.fillStyle = mix(ZONES[z].water, ZONES[z].deep, i / 3);
          const y0 = Math.max(Y(a), Y(0)), y1 = Math.min(Y(b), this.artH + 8);
          ctx.fillRect(0, y0, this.artW, y1 - y0);
        }
      }
      const s = Y(0);
      if (s > -10 && s < this.artH) {
        // surface: a bright line with a little wave, and a light band under it
        ctx.fillStyle = '#bfe9e2';
        for (let x = 0; x < this.artW; x += 4) {
          const o = Math.round(Math.sin(x * 0.07 + this.t * 1.6) * 1.2);
          ctx.fillRect(x, s + o - 1, 4, 2);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, s + 1, this.artW, 6);
        for (const r of this.ripples) {
          r.t += 1 / 60;
          const w = Math.round(r.t * 40);
          ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - r.t)})`;
          ctx.fillRect(Math.round(r.x * PXM) + this.ox - w, s - 1, w * 2, 1);
        }
        this.ripples = this.ripples.filter((r) => r.t < 0.6);
      }
      // sun rays in the shallows: flat translucent slants
      const raysEnd = 95;
      if (camY < raysEnd) {
        ctx.fillStyle = 'rgba(255,255,240,0.055)';
        for (let i = 0; i < 6; i++) {
          const bx = ((i * 0.19 + Math.sin(this.t * 0.15 + i) * 0.03) % 1) * this.artW;
          const y0 = Y(0), y1 = Y(raysEnd);
          ctx.beginPath();
          ctx.moveTo(bx, y0); ctx.lineTo(bx + 14 + i * 3, y0);
          ctx.lineTo(bx + 14 + i * 3 - 70, y1); ctx.lineTo(bx - 90, y1);
          ctx.fill();
        }
      }
    },

    drawWalls(ctx, Y, camY) {
      const seg = 4; // metres per wall segment
      const a = Math.max(0, Math.floor(camY / seg) - 1), b = Math.ceil((camY + this.viewH) / seg) + 1;
      for (let i = a; i < b; i++) {
        const y = i * seg;
        const z = E.zoneAt(y);
        const wl = this.ox + Math.max(0, Math.floor(hash(i * 2) * 9 + 6 * Math.sin(i * 0.21)) + Math.min(10, y / 60) - 4);
        const wr = this.artW - this.ox - this.worldW * PXM + Math.max(0, Math.floor(hash(i * 2 + 1) * 9 + 6 * Math.cos(i * 0.17)) + Math.min(10, y / 60) - 4);
        ctx.fillStyle = mix(ZONES[z].deep, '#05070d', 0.45);
        const y0 = Y(y), h = seg * PXM + 1;
        ctx.fillRect(0, y0, Math.max(0, wl), h);
        ctx.fillRect(this.artW - Math.max(0, wr), y0, Math.max(0, wr), h);
        ctx.fillStyle = mix(ZONES[z].deep, '#05070d', 0.25);
        ctx.fillRect(Math.max(0, wl), y0 + 2, 2, h - 4);
        ctx.fillRect(this.artW - Math.max(0, wr) - 2, y0 + 2, 2, h - 4);
        // plants in the shallows, coral on the reef, glowing specks deeper down
        const hsh = hash(i * 7 + 3);
        if (z <= 1 && hsh < 0.5) {
          const left = hsh < 0.25;
          const bx = left ? wl + 1 : this.artW - wr - 3;
          ctx.fillStyle = z === 0 ? '#3c7a3a' : '#2f6f5a';
          for (let k = 0; k < 10; k++) ctx.fillRect(bx + Math.round(Math.sin(this.t * 1.3 + k * 0.5 + i) * (k / 5)), y0 + 14 - k * 2, 2, 2);
        } else if (z === 1 && hsh < 0.75) {
          const bx = hsh < 0.62 ? wl : this.artW - wr - 6;
          ctx.fillStyle = hsh < 0.68 ? '#ff8a6b' : '#f2c14e';
          ctx.fillRect(bx, y0 + 6, 6, 3); ctx.fillRect(bx + 1, y0 + 3, 2, 3); ctx.fillRect(bx + 4, y0 + 2, 2, 4);
        } else if (z >= 3 && hsh < 0.3) {
          ctx.fillStyle = z >= 5 ? '#b78bff' : '#7af0ff';
          const bx = hsh < 0.15 ? wl + 1 : this.artW - wr - 2;
          if (Math.sin(this.t * 2 + i) > -0.3) ctx.fillRect(bx, y0 + 7, 1, 1);
        }
      }
    },

    drawMotes(ctx, camY, dt) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      const wrap = this.viewH + 10;
      for (const m of this.motes) {
        const y = ((m.y - camY * m.p) % wrap + wrap) % wrap - 5;
        if (camY + y < 0.5) continue;
        const x = Math.round(((m.x * this.artW + this.t * 2 * m.p) % this.artW));
        ctx.fillRect(x, Math.round(y * PXM), m.s, m.s);
      }
    },

    drawFish(ctx, run, Y, sonar) {
      const top = this.camY - 6, bot = this.camY + this.viewH + 6;
      for (const f of run.fish) {
        if (f.st === 1 || f.y < top || f.y > bot) continue;
        const sp = SPECIES[f.sp];
        const img = this.variant(sp.sprite, this.fishVariant(f));
        const sc = f.scale;
        const w = img.width * sc, h = img.height * sc;
        const x = Math.round(f.x * PXM - w / 2) + this.ox;
        const bob = sp.junk ? 0 : Math.round(Math.sin(f.ph) * 1.2);
        const y = Y(f.y) - Math.round(h / 2) + bob;
        if (f.vx < 0) {
          ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
        } else ctx.drawImage(img, x, y, w, h);
        if (f.mut >= 1 && Math.sin(this.t * 5 + f.ph * 3) > 0.7) {
          ctx.fillStyle = '#fff6cc';
          const px = x + Math.round(hash(Math.floor(this.t * 5) + f.ph) * w), py = y + Math.round(hash(Math.floor(this.t * 5) + f.ph + 1) * h);
          ctx.fillRect(px, py - 1, 1, 3); ctx.fillRect(px - 1, py, 3, 1);
        }
      }
    },

    drawBoat(ctx, Y, g) {
      const s = Y(0);
      if (s < -30 || s > this.artH + 30) return;
      const bob = Math.round(Math.sin(this.t * 1.4) * 1);
      const cx = Math.round(this.worldW * 0.5 * PXM) + this.ox;
      const by = s - 6 + bob;
      const boat = (g.save && g.save.gear.boat) || 'sampan';
      paintBoat(ctx, cx, by, boat, this.t, 'back');
      paintBoat(ctx, cx, by, boat, this.t, 'hull');
      // crate of fish on deck
      ctx.fillStyle = '#14121c'; ctx.fillRect(cx - 19, by - 9, 13, 8);
      ctx.fillStyle = '#c99a5b'; ctx.fillRect(cx - 18, by - 8, 11, 6);
      ctx.fillStyle = '#9b6d3a'; ctx.fillRect(cx - 18, by - 5, 11, 1);
      // gnome, in the outfit you wear
      const gn = this.variant('gnome', 'skin:' + ((g.save && g.save.gear.skin) || 'classic'));
      ctx.drawImage(gn, cx + 2, by - 13);
      paintBoat(ctx, cx, by, boat, this.t, 'front');
      // cat (once bought)
      if (g.cat) {
        ctx.fillStyle = '#14121c'; ctx.fillRect(cx - 4, by - 6, 6, 5); ctx.fillRect(cx - 4, by - 8, 1, 2); ctx.fillRect(cx + 1, by - 8, 1, 2);
        ctx.fillStyle = '#e8a25a'; ctx.fillRect(cx - 3, by - 5, 4, 3);
        ctx.fillRect(cx - 6 + Math.round(Math.sin(this.t * 3)), by - 4, 2, 1);
      }
      // rod: swings back and snaps forward on a throw
      const IDLE = -0.73;
      let ang = IDLE;
      if (g.mode === 'throw' && g.throw) {
        const k = g.throw.t / g.throw.dur;
        ang = k < 0.3 ? IDLE + (-2.15 - IDLE) * (k / 0.3) : -2.15 + (-0.3 + 2.15) * Math.min(1, (k - 0.3) / 0.25);
      } else if (g.mode === 'cast' && g.run) ang = g.run.phase === 'up' ? -0.95 + Math.sin(this.t * 18) * 0.04 : -0.45;
      const px0 = cx + 10, py0 = by - 7, len = 18;
      ctx.fillStyle = '#5a3a22';
      for (let i = 0; i < len; i++) ctx.fillRect(Math.round(px0 + Math.cos(ang) * i), Math.round(py0 + Math.sin(ang) * i), 1, 1);
      const tx = Math.round(px0 + Math.cos(ang) * len), ty = Math.round(py0 + Math.sin(ang) * len);
      this.rodTip = { x: (tx - this.ox) / PXM, y: ty / PXM + this.camY };
      if (g.mode === 'dock' || g.mode === 'haul') {
        // idle line with the hook dangling just under the surface
        ctx.fillStyle = 'rgba(240,250,245,0.8)';
        for (let y = ty; y < s + 10; y++) ctx.fillRect(tx, y, 1, 1);
        ctx.drawImage(this.variant('hook', ''), tx - 2, s + 9 + bob);
      }
      // the water laps over the bottom of the hull
      ctx.fillStyle = '#3f8f8a';
      for (let x = cx - 28; x < cx + 28; x += 2) ctx.fillRect(x, s + 1 + Math.round(Math.sin(x * 0.3 + this.t * 2.2)), 2, 3);
      ctx.fillStyle = 'rgba(20,18,28,0.18)';
      ctx.fillRect(cx - 22, s + 4, 44, 2); ctx.fillRect(cx - 16, s + 6, 32, 1);
      this.drawPier(ctx, s);
    },

    drawLineAndHook(ctx, run, Y) {
      const hx = Math.round(run.x * PXM) + this.ox, hy = Y(run.y);
      const tip = this.rodTip || { x: this.worldW / 2 + 6, y: -5 };
      const P = (p) => [Math.round(p.x * PXM) + this.ox, Y(p.y)];
      ctx.fillStyle = 'rgba(240,250,245,0.8)';
      const pts = this.line ? this.line.pts : [{ x: run.x, y: 0 }];
      let [px, py] = [Math.round(tip.x * PXM) + this.ox, Y(tip.y)];
      const H = this.artH;
      for (let i = 0; i <= pts.length; i++) {
        const [qx, qy] = i < pts.length ? P(pts[i]) : [hx, hy - 9];
        if (!((py < -4 && qy < -4) || (py > H + 4 && qy > H + 4))) pxLine(ctx, px, py, qx, qy);
        px = qx; py = qy;
      }
      // the lead weight: the blob that chases your finger
      ctx.fillStyle = '#14121c'; disc(ctx, hx, hy - 9, 3);
      ctx.fillStyle = '#5d6475'; disc(ctx, hx, hy - 9, 2);
      ctx.fillStyle = '#aab3c4'; ctx.fillRect(hx - 1, hy - 11, 1, 1);
      ctx.fillStyle = 'rgba(240,250,245,0.8)'; ctx.fillRect(hx, hy - 7, 1, 2);
      // hooked fish hang under the hook, head up
      const n = run.caught.length;
      const show = Math.min(n, 10);
      for (let i = show - 1; i >= 0; i--) {
        const f = run.caught[n - 1 - i];
        const img = this.variant(SPECIES[f.sp].sprite, this.fishVariant(f));
        const sc = Math.min(f.scale, 2);
        const w = img.width * sc, h = img.height * sc;
        const sway = Math.round(Math.sin(this.t * 4 + i) * (1 + i * 0.4));
        ctx.save();
        ctx.translate(hx + sway + (i % 2 ? 3 : -3), hy + 1 + i * 4);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, -w, -h / 2, w, h);
        ctx.restore();
      }
      if (n > 10) this.hookExtra = n - 10; else this.hookExtra = 0;
      ctx.drawImage(this.variant('hook', ''), hx - 2, hy - 6);
      if (run.guard > 0 && run.phase === 'down') {
        ctx.strokeStyle = 'rgba(184,168,255,0.8)';
        ctx.strokeRect(hx - 5.5, hy - 8.5, 11, 12);
      }
      if (Math.random() < 0.25) this.bubbles.push({ x: run.x + (Math.random() - 0.5), y: run.y, vx: 0, vy: -3, t: 0, life: 0.7 });
    },

    // wooden pier on the left: a bit of foreground for the dock scene
    drawPier(ctx, s) {
      const x1 = this.ox + 34;
      if (x1 < 8) return;
      ctx.fillStyle = '#14121c'; ctx.fillRect(0, s - 7, x1 + 1, 4);
      ctx.fillStyle = '#a0683a'; ctx.fillRect(0, s - 6, x1, 2);
      ctx.fillStyle = '#6a3a1f';
      for (let x = 2; x < x1; x += 7) ctx.fillRect(x, s - 6, 1, 2);
      for (const px of [6, x1 - 6]) {
        ctx.fillStyle = '#14121c'; ctx.fillRect(px - 1, s - 4, 5, 22);
        ctx.fillStyle = '#7a4a28'; ctx.fillRect(px, s - 4, 3, 21);
        ctx.fillStyle = 'rgba(20,18,28,0.35)'; ctx.fillRect(px, s + 1, 3, 17);
      }
      // lantern
      ctx.fillStyle = '#14121c'; ctx.fillRect(x1 - 7, s - 16, 1, 9); ctx.fillRect(x1 - 9, s - 17, 5, 1);
      ctx.fillRect(x1 - 10, s - 15, 5, 5);
      ctx.fillStyle = Math.sin(this.t * 3) > -0.6 ? '#ffd257' : '#e9ae22'; ctx.fillRect(x1 - 9, s - 14, 3, 3);
    },

    // distant rock spires and kelp behind the play area, scrolling slower than the camera
    drawFar(ctx, Y, camY, mid) {
      const surf = Math.max(0, Y(0));
      if (surf >= this.artH) return;
      const z = E.zoneAt(mid);
      const layers = [[0.35, 0.16, 12], [0.62, 0.3, 8]];
      ctx.save();
      ctx.beginPath(); ctx.rect(0, surf, this.artW, this.artH - surf); ctx.clip();
      for (let L = 0; L < layers.length; L++) {
        const [p, dark, seg] = layers[L];
        ctx.fillStyle = mix(ZONES[z].deep, '#05070d', dark);
        const vy = camY * p;
        const a = Math.floor(vy / seg) - 2, b = Math.ceil((vy + this.viewH) / seg) + 8;
        for (let i = a; i < b; i++) {
          const h1 = hash(i * 13 + L * 101);
          if (h1 > 0.55) continue;
          const x = Math.round(hash(i * 7 + L * 31) * this.artW);
          const base = Math.round((i * seg - vy) * PXM);
          const tall = Math.round(20 + hash(i * 3 + L) * 70);
          if (z <= 1 && L === 1 && h1 < 0.3) {
            // kelp strand
            for (let k = 0; k < tall; k += 2) ctx.fillRect(x + Math.round(Math.sin(this.t * 0.9 + k * 0.08 + i) * (k / 18)), base - k, 2, 2);
            continue;
          }
          const w = Math.round(6 + hash(i * 5 + L) * 16);
          for (let k = 0; k < tall; k += 3) {
            const ww = Math.max(2, Math.round(w * (1 - k / tall) + Math.sin(k * 0.3 + i) * 1.5));
            ctx.fillRect(x - (ww >> 1), base - k - 3, ww, 3);
          }
        }
      }
      ctx.restore();
    },

    // foreground: dark fronds hugging the screen edges, moving faster than the camera
    drawFront(ctx, Y, camY, mid) {
      const surf = Math.max(0, Y(0));
      if (surf >= this.artH) return;
      const z = E.zoneAt(mid);
      ctx.fillStyle = mix(ZONES[z].deep, '#020308', 0.75);
      const p = 1.4, seg = 9, vy = camY * p;
      const a = Math.floor(vy / seg) - 2, b = Math.ceil((vy + this.viewH * p) / seg) + 6;
      for (let i = a; i < b; i++) {
        const h1 = hash(i * 17 + 5);
        if (h1 > 0.42) continue;
        const right = h1 < 0.21;
        const base = Math.round((i * seg - vy) * PXM);
        if (base < surf) continue;
        const tall = Math.round(16 + hash(i * 11) * 34);
        const w = Math.round(4 + hash(i * 19) * 7);
        for (let k = 0; k < tall; k += 2) {
          const sway = Math.round(Math.sin(this.t * 1.1 + i + k * 0.1) * (k / 10));
          const ww = Math.max(1, Math.round(w * (1 - k / tall)));
          const y = base - k;
          if (y < surf) break;
          if (right) ctx.fillRect(this.artW - ww - 2 + sway, y, ww + 2, 2); else ctx.fillRect(sway, y, ww + 2, 2);
        }
      }
    },

    drawObstacles(ctx, run, Y) {
      const top = this.camY - 12, bot = this.camY + this.viewH + 32;
      const o0 = E.obsIn(run, top, bot, this._obs || (this._obs = []));
      const X = (x) => Math.round(x * PXM) + this.ox;
      for (const o of o0) {
        const z = E.zoneAt(o.y);
        const x = X(o.x), y = Y(o.y);
        if (o.k === 'rock') {
          const r = Math.round(o.r * PXM), m = r + 5;
          const img = this.baked('rock|' + o.seed + '|' + r + '|' + z, m * 2, m * 2, (c) => {
            const x = m, y = m;
            c.fillStyle = '#0b0d14'; disc(c, x, y, r + 1);
            // stone tones, pulled toward the water colour so deep rocks sit in the dark
            c.fillStyle = mix('#2e2a2c', ZONES[z].deep, 0.35); disc(c, x, y, r);
            c.fillStyle = mix('#5a5148', ZONES[z].deep, 0.35); disc(c, x - Math.round(r * 0.12), y - Math.round(r * 0.16), Math.round(r * 0.8));
            c.fillStyle = mix('#857762', ZONES[z].deep, 0.35); disc(c, x - Math.round(r * 0.3), y - Math.round(r * 0.38), Math.max(1, Math.round(r * 0.36)));
            c.fillStyle = '#0b0d14';
            for (let k = 0; k < 4; k++) c.fillRect(x + Math.round((hash(o.seed + k) - 0.5) * r), y + Math.round((hash(o.seed + k + 9) - 0.3) * r * 0.8), 1, 1);
            if (z <= 1) {
              c.fillStyle = z === 0 ? '#3c7a3a' : '#ff8a6b';
              for (let k = -r + 2; k < r - 2; k += 3) {
                const yy = y - Math.round(Math.sqrt(Math.max(0, r * r - k * k)));
                if (hash(o.seed + k * 3) < 0.6) c.fillRect(x + k, yy - 2, 2, 2 + Math.round(hash(o.seed + k) * 2));
              }
            }
          });
          ctx.drawImage(img, x - m, y - m);
        } else if (o.k === 'urchin') {
          const n = 10;
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + 0.2;
            const l = 5 + Math.round(Math.sin(this.t * 3 + k) * 1);
            ctx.fillStyle = '#14121c';
            for (let j = 2; j < l; j++) ctx.fillRect(Math.round(x + Math.cos(a) * j), Math.round(y + Math.sin(a) * j), 1, 1);
            ctx.fillStyle = '#d78cff'; ctx.fillRect(Math.round(x + Math.cos(a) * l), Math.round(y + Math.sin(a) * l), 1, 1);
          }
          ctx.fillStyle = '#14121c'; disc(ctx, x, y, 3);
          ctx.fillStyle = '#5b2f7a'; disc(ctx, x, y, 2);
          ctx.fillStyle = '#9b5fc4'; ctx.fillRect(x - 1, y - 1, 1, 1);
        } else if (o.k === 'mine') {
          if (o.gone) continue;
          const yy = y + Math.round(Math.sin(this.t * 1.2 + o.ph) * 1.5);
          ctx.fillStyle = '#3a3f4b';
          for (let k = 6; k < 40; k += 3) ctx.fillRect(x, yy + k, 1, 2);
          ctx.fillStyle = '#14121c';
          for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) ctx.fillRect(x + dx - 1, yy + dy - 1, 2, 2);
          disc(ctx, x, yy, 5);
          ctx.fillStyle = '#4a505e'; disc(ctx, x, yy, 4);
          ctx.fillStyle = '#7a8296'; ctx.fillRect(x - 2, yy - 3, 2, 1); ctx.fillRect(x - 3, yy - 2, 1, 2);
          ctx.fillStyle = Math.sin(this.t * 5 + o.ph) > 0.2 ? '#ff3b2f' : '#6b1a14'; ctx.fillRect(x, yy - 1, 2, 2);
        } else if (o.k === 'net') {
          const w = Math.round(o.w * PXM), h = Math.round(o.h * PXM);
          const img = this.baked('net|' + w + '|' + h + '|' + Math.round(o.x * 10), w + 2, h + 3, (c) => {
            c.fillStyle = 'rgba(230,216,187,0.38)';
            for (let d = -h; d < w; d += 4) {
              for (let k = 0; k < h; k++) {
                const ax = d + k, bx = d + h - k;
                if (ax >= 0 && ax < w && hash(ax * 3 + k + o.x) > 0.12) c.fillRect(ax + 1, k + 3, 1, 1);
                if (bx >= 0 && bx < w && hash(bx * 5 + k + o.x) > 0.12) c.fillRect(bx + 1, k + 3, 1, 1);
              }
            }
            c.fillStyle = '#cdb995'; c.fillRect(1, 2, w, 1);
            c.fillStyle = '#ff6b3d';
            for (let k = 0; k <= w; k += 9) c.fillRect(k, 1, 3, 2);
          });
          // the whole net sways a little instead of redrawing every knot
          ctx.drawImage(img, x - (w >> 1) - 1, y - (h >> 1) - 3 + Math.round(Math.sin(this.t + o.x)));
        } else if (o.k === 'cur') {
          const h = o.h * PXM;
          ctx.fillStyle = 'rgba(220,245,255,0.16)';
          for (let k = 0; k < 26; k++) {
            const sp = Math.abs(o.v) * PXM * (0.7 + hash(k + o.y) * 0.6);
            const w = this.artW + 40;
            const xx = ((hash(k * 7 + o.y) * w + Math.sign(o.v) * this.t * sp) % w + w) % w - 20;
            const yy = Math.round(y - h / 2 + hash(k * 3 + o.y) * h);
            ctx.fillRect(Math.round(xx), yy, 6 + Math.round(hash(k) * 8), 1);
          }
        } else if (o.k === 'vent') {
          const w = Math.round(o.w * PXM);
          // a small mound with a hot crack on top
          ctx.fillStyle = '#14121c'; disc(ctx, x, y + 9, w);
          ctx.fillStyle = mix('#3b342c', ZONES[z].deep, 0.4); disc(ctx, x, y + 9, w - 1);
          ctx.fillStyle = '#14121c'; ctx.fillRect(x - (w >> 1) - 1, y - 2, w + 2, 9);
          ctx.fillStyle = mix(ZONES[z].deep, '#05070d', 0.2); ctx.fillRect(x - (w >> 1), y - 1, w, 7);
          ctx.fillStyle = '#ff9a5b'; ctx.fillRect(x - 1, y - 2, 3, 1);
          ctx.fillStyle = 'rgba(220,245,255,0.55)';
          for (let k = 0; k < 14; k++) {
            const ph = (this.t * 0.7 + hash(k + o.x)) % 1;
            const by = Math.round(y - ph * o.h * PXM);
            const bx = Math.round(x + Math.sin(this.t * 3 + k) * w * 0.3);
            const sz = ph > 0.6 ? 2 : 1;
            ctx.fillRect(bx, by, sz, sz);
          }
        }
      }
    },

    drawThrow(ctx, Y, th) {
      const tip = this.rodTip;
      if (!tip) return;
      const k = Math.min(1, th.t / th.dur);
      const f = k < 0.3 ? 0 : (k - 0.3) / 0.7;
      const x = tip.x + (th.x - tip.x) * f;
      const arc = 8 + Math.abs(th.x - tip.x) * 0.25;
      const y = tip.y + (0 - tip.y) * f - Math.sin(f * Math.PI) * arc;
      const tx = Math.round(tip.x * PXM) + this.ox, ty = Y(tip.y);
      const hx = Math.round(x * PXM) + this.ox, hy = Y(y);
      // the line trails in a soft curve behind the flying hook
      ctx.fillStyle = 'rgba(240,250,245,0.8)';
      const mx = (tx + hx) / 2, my = Math.min(ty, hy) - 6 + f * 10;
      let px = tx, py = ty;
      for (let i = 1; i <= 12; i++) {
        const u = i / 12;
        const qx = Math.round((1 - u) * (1 - u) * tx + 2 * (1 - u) * u * mx + u * u * hx);
        const qy = Math.round((1 - u) * (1 - u) * ty + 2 * (1 - u) * u * my + u * u * hy);
        pxLine(ctx, px, py, qx, qy); px = qx; py = qy;
      }
      ctx.drawImage(this.variant('hook', ''), hx - 2, hy - 6);
    },

    drawBooms(ctx, Y, dt) {
      for (const b of this.booms) {
        b.t += dt;
        const r = Math.round(4 + b.t * (b.small ? 40 : 90));
        const x = Math.round(b.x * PXM) + this.ox, y = Y(b.y);
        ctx.fillStyle = b.t < 0.12 ? '#fff1c9' : b.t < 0.25 ? '#ffd257' : 'rgba(255,107,61,0.6)';
        const n = 20;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          ctx.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 3, 3);
        }
        if (b.t < 0.15) { ctx.fillStyle = '#fff1c9'; disc(ctx, x, y, Math.round(8 - b.t * 30)); }
      }
      this.booms = this.booms.filter((b) => b.t < 0.45);
    },

    drawBubbles(ctx, Y, dt) {
      ctx.fillStyle = 'rgba(220,245,255,0.7)';
      for (const b of this.bubbles) {
        b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.96;
        if (b.y < 0.2) b.t = b.life;
        const s = b.t < b.life * 0.6 ? 1 : 2;
        ctx.fillRect(Math.round(b.x * PXM) + this.ox, Y(b.y), s, s);
      }
      this.bubbles = this.bubbles.filter((b) => b.t < b.life);
      if (this.bubbles.length > 300) this.bubbles.splice(0, this.bubbles.length - 300);
    },

    drawFlyers(ctx, Y, dt, g) {
      const cx = this.worldW * 0.5 - 3.2, cy = -2;
      for (const fl of this.flyers) {
        fl.t += dt;
        if (fl.t < 0) continue;
        const k = Math.min(1, fl.t / 0.55);
        const x = fl.x0 + (cx - fl.x0) * k;
        const y = fl.y0 + (cy - fl.y0) * k - Math.sin(k * Math.PI) * 9;
        const img = this.variant(SPECIES[fl.f.sp].sprite, this.fishVariant(fl.f));
        ctx.save();
        ctx.translate(Math.round(x * PXM) + this.ox, Y(y));
        ctx.rotate(k * 6.2 * (fl.f.vx < 0 ? -1 : 1));
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
        if (k >= 1 && !fl.done) { fl.done = true; g.onLand && g.onLand(fl); }
      }
      this.flyers = this.flyers.filter((f) => !f.done);
    },

    drawDark(ctx, Y, camY, mid, run, g) {
      const z = E.zoneAt(mid);
      const z2 = Math.min(ZONES.length - 1, z + 1);
      const span = (z2 > z ? ZONES[z2].top : ZONES[z].top + 1000) - ZONES[z].top;
      const k = Math.min(1, (mid - ZONES[z].top) / span);
      let dark = ZONES[z].dark + (ZONES[z2].dark - ZONES[z].dark) * k;
      if (g.moon && mid < 2) dark = 0;
      if (dark < 0.02) return;
      const d = this.dctx;
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, this.artW, this.artH);
      d.fillStyle = `rgba(3,5,12,${dark.toFixed(3)})`;
      const sy = Math.max(0, Y(0));
      d.fillRect(0, sy, this.artW, this.artH - sy);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r) => {
        // three flat rings instead of a smooth gradient, pre-drawn once per radius
        const st = this.baked('hole|' + r, r * 2 + 1, r * 2 + 1, (c) => {
          c.fillStyle = 'rgba(0,0,0,0.38)'; disc(c, r, r, r);
          c.fillStyle = 'rgba(0,0,0,0.38)'; disc(c, r, r, Math.round(r * 0.72));
          c.fillStyle = 'rgba(0,0,0,0.5)'; disc(c, r, r, Math.round(r * 0.46));
        });
        d.drawImage(st, x - r, y - r);
      };
      if (g.mode === 'cast' && g.run) hole(Math.round(g.run.x * PXM) + this.ox, Y(g.run.y), 64);
      if (run) {
        for (const o of E.obsIn(run, camY - 10, camY + this.viewH + 10, this._obs || (this._obs = []))) {
          if (o.gone) continue;
          const r = o.k === 'mine' ? 14 : o.k === 'urchin' ? 10 : o.k === 'vent' ? 16 : 0;
          if (r) hole(Math.round(o.x * PXM) + this.ox, Y(o.y), r);
        }
      }
      if (run) {
        for (const f of run.fish) {
          if (f.st === 1) continue;
          const sp = SPECIES[f.sp];
          if (!sp.glow && f.mut < 1) continue;
          const yy = Y(f.y);
          if (yy < -30 || yy > this.artH + 30) continue;
          hole(Math.round(f.x * PXM) + this.ox, yy, f.mut >= 1 ? 22 : 16);
        }
      }
      ctx.drawImage(this.dark, 0, 0);
    },

    drawTexts(ctx, Y, dt) {
      const S = this.S;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.lineJoin = 'round';
      for (const tx of this.texts) {
        tx.t += dt;
        const k = tx.t / 1.2;
        const px = Math.round((tx.x * PXM + this.ox) * S + 10 * S);
        const py = Math.round(Y(tx.y) * S - k * 26 * S * 0.5);
        const size = Math.round((tx.big ? 9 : 6.5) * S);
        ctx.font = `600 ${size}px Pixelify, monospace`;
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4);
        ctx.lineWidth = Math.max(3, S * 1.6);
        ctx.strokeStyle = '#14121c';
        ctx.strokeText(tx.s, px, py);
        ctx.fillStyle = tx.color || '#ffffff';
        ctx.fillText(tx.s, px, py);
      }
      ctx.globalAlpha = 1;
      this.texts = this.texts.filter((t) => t.t < 1.2);
    },

    // left edge: depth ruler with the line end, the deepest point and sonar marks
    drawRuler(ctx, run, camY, g) {
      const S = this.S, dpr = this.dpr;
      const x0 = Math.round((10 + (g.safeL || 0)) * dpr);
      const w = Math.round(44 * dpr);
      const H = this.cv.height;
      const mpp = 1 / (PXM * S); // metres per device pixel
      const top = Math.round(64 * dpr);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, top, this.cv.width, H - top); ctx.clip();
      ctx.fillStyle = 'rgba(20,18,28,0.55)';
      ctx.fillRect(x0, top, w, H - top);
      ctx.fillStyle = '#f3ead7';
      ctx.font = `600 ${Math.round(11 * dpr)}px Pixelify, monospace`;
      ctx.textBaseline = 'middle';
      const step = 10;
      for (let m = Math.ceil(Math.max(0, camY) / step) * step; m < camY + H * mpp; m += step) {
        const y = Math.round((m - camY) / mpp);
        const major = m % 50 === 0;
        ctx.fillRect(x0 + w - (major ? 14 : 7) * dpr, y, (major ? 14 : 7) * dpr, Math.max(1, dpr));
        if (major) ctx.fillText(m, x0 + 4 * dpr, y);
      }
      // end of line marker
      const ly = Math.round((run.st.line - camY) / mpp);
      if (ly > 0 && ly < H) { ctx.fillStyle = '#ff6b3d'; ctx.fillRect(x0, ly - dpr, w, 3 * dpr); }
      if (g.sonar) {
        for (const f of run.fish) {
          if (f.st !== 0 || (f.mut < 1 && !SPECIES[f.sp].rare)) continue;
          const y = Math.round((f.y - camY) / mpp);
          if (y < 0 || y > H) continue;
          ctx.fillStyle = f.mut >= 1 ? '#f5b82e' : '#b8a8ff';
          ctx.fillRect(x0 + w - 5 * dpr, y - 2 * dpr, 5 * dpr, 4 * dpr);
        }
      }
      // current depth tag
      const hy = Math.round((run.y - camY) / mpp);
      ctx.fillStyle = '#f3ead7';
      ctx.fillRect(x0, hy - 10 * dpr, w + 22 * dpr, 20 * dpr);
      ctx.fillStyle = '#14121c';
      ctx.fillRect(x0 + w + 22 * dpr, hy - 10 * dpr, 2 * dpr, 20 * dpr);
      ctx.fillText(Math.floor(run.y) + ' m', x0 + 5 * dpr, hy + dpr);
      ctx.restore();
    },
  };

  // ---------- helpers ----------
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function disc(c, cx, cy, r, alpha) {
    if (alpha != null) { const a = c.globalAlpha; c.globalAlpha = alpha; disc(c, cx, cy, r); c.globalAlpha = a; return; }
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      c.fillRect(cx - w, cy + y, w * 2, 1);
    }
  }
  // one-pixel line, so the fishing line stays as crisp as the sprites
  function pxLine(c, x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      c.fillRect(x0, y0, 1, 1);
      if ((x0 === x1 && y0 === y1) || ++n > 4000) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`;
  }
  function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
  function ramp(stops, l) {
    const i = Math.min(stops.length - 1, Math.floor((l / 256) * stops.length));
    return hex(stops[i]);
  }
  function hsl2rgb(h, s, l) {
    const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  const GOLD = ['#3a2400', '#7a4e00', '#b8800c', '#e9ae22', '#ffd257', '#ffef9e', '#fffbe0'];
  const SHADOW = ['#120a22', '#2e1a4f', '#4b2d78', '#6d47a3', '#9470cf', '#b99af0'];
  // Outfits: swap the hat, beard and shirt colours of the gnome sprite, then add the extras.
  const GNOME_PAL = ['#ff6a4d', '#d8452f', '#f4efe6', '#3f6fb5'];
  function dressGnome(x, w, h, g) {
    const im = x.getImageData(0, 0, w, h);
    const d = im.data;
    const from = GNOME_PAL.map((c) => hex(c).join(','));
    const to = g.pal.map(hex);
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const k = from.indexOf(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      if (k >= 0) { d[i] = to[k][0]; d[i + 1] = to[k][1]; d[i + 2] = to[k][2]; }
    }
    x.putImageData(im, 0, 0);
    if (g.acc === 'mask') { x.fillStyle = '#14121c'; x.fillRect(1, 6, 7, 1); x.fillStyle = '#8fd3e8'; x.fillRect(2, 6, 2, 1); x.fillRect(5, 6, 2, 1); }
    if (g.acc === 'badge') { x.fillStyle = '#f5b82e'; x.fillRect(4, 3, 1, 1); x.fillRect(1, 5, 8, 1); }
  }

  // Boats. layer 'back' is drawn behind the crate and gnome (masts, cabins), 'hull' the boat,
  // 'front' anything in front of the gnome. by = deck line, cx = centre (art pixels).
  function paintBoat(c, cx, by, id, t, layer) {
    const R = (col, x, y, w, h) => { c.fillStyle = col; c.fillRect(cx + x, by + y, w, h); };
    const INK = '#14121c';
    const hull = (main, top, stripe, low, w) => {
      R(INK, -w / 2, 0, w, 9); R(INK, -w / 2 - 2, -2, w + 4, 3);
      R(main, -w / 2 + 1, 0, w - 2, 7); R(top, -w / 2 - 1, -1, w + 2, 2);
      R(stripe, -w / 2 + 1, 3, w - 2, 2); R(low, -w / 2 + 3, 7, w - 6, 2);
    };
    switch (id) {
      case 'jukung':
        if (layer === 'hull') {
          // outrigger arms and floats
          R(INK, -36, -1, 72, 1); R('#c99a5b', -34, -2, 68, 1);
          for (const fx of [-38, 30]) { R(INK, fx, 3, 9, 4); R('#f3ead7', fx + 1, 4, 7, 2); }
          hull('#f3ead7', '#2f7a9a', '#ff6b3d', '#cdb995', 44);
          R(INK, 22, -6, 2, 5); R('#2f7a9a', 22, -7, 2, 1);
        }
        break;
      case 'ketek':
        if (layer === 'hull') {
          hull('#3f9f58', '#f5b82e', '#2b7a40', '#2b6a3a', 52);
          // the long-tail engine at the stern
          R(INK, -30, -6, 8, 6); R('#5d6475', -29, -5, 6, 4); R('#aab3c4', -28, -5, 2, 1);
          for (let i = 0; i < 12; i++) R(INK, -30 - i, i * 0.9 | 0, 1, 1);
          if (Math.sin(t * 9) > 0) R('#cdd7e6', -44, 10, 2, 1);
        }
        break;
      case 'pinisi':
        if (layer === 'back') {
          for (const [mx, mh] of [[-14, 30], [-2, 24]]) {
            R(INK, mx, -mh, 2, mh);
            R(INK, mx - 9, -mh + 3, 9, mh - 9); R('#f3ead7', mx - 8, -mh + 4, 7, mh - 11);
            R('#e6d8bb', mx - 8, -mh + 10, 7, 1);
          }
          R('#ff6b3d', -14, -34, 6, 3); R(INK, -14, -34, 1, 4);
        }
        if (layer === 'hull') {
          hull('#8a4f2b', '#c99a5b', '#f5b82e', '#6a3a1f', 54);
          // curved bow and stern
          R(INK, 26, -6, 3, 6); R('#8a4f2b', 27, -5, 1, 4); R(INK, -29, -5, 3, 5); R('#8a4f2b', -28, -4, 1, 3);
        }
        break;
      case 'riset':
        if (layer === 'back') {
          R(INK, -27, -14, 16, 13); R('#f3ead7', -26, -13, 14, 11); R('#8fd3e8', -24, -11, 4, 3); R('#8fd3e8', -18, -11, 4, 3);
          R(INK, -21, -22, 1, 8);
          const sw = Math.round(Math.sin(t * 2) * 2);
          R(INK, -24 + sw, -22, 7, 1); R('#aab3c4', -23 + sw, -23, 5, 1);
          if (Math.sin(t * 4) > 0.3) R('#ff6b3d', -21, -24, 1, 1);
        }
        if (layer === 'hull') hull('#f3ead7', '#cdb995', '#2f7a9a', '#5d6475', 54);
        break;
      case 'pukat':
        if (layer === 'back') {
          R(INK, -26, -12, 13, 11); R('#e0473a', -25, -11, 11, 9); R('#8fd3e8', -23, -9, 7, 3);
          // A-frame and a hanging net at the bow
          for (let i = 0; i < 16; i++) { R(INK, 20 + (i / 3 | 0), -i, 1, 1); R(INK, 28 - (i / 3 | 0), -i, 1, 1); }
          R(INK, 23, -16, 3, 1);
          R(INK, 26, -15, 1, 7);
          for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) if ((x + y) % 2 === 0) R('#cdb995', 24 + x, -8 + y, 1, 1);
        }
        if (layer === 'hull') hull('#c0462f', '#e6d8bb', '#14121c', '#7a2a1c', 56);
        break;
      case 'selam':
        if (layer === 'back') {
          // periscope
          R(INK, -16, -18, 2, 14); R(INK, -16, -19, 6, 3); R('#aab3c4', -12, -18, 2, 1);
        }
        if (layer === 'hull') {
          R(INK, -27, -3, 54, 13); R(INK, -29, 0, 58, 7);
          R('#f5b82e', -26, -2, 52, 11); R('#f5b82e', -28, 1, 56, 5); R('#ffe08a', -24, -2, 46, 2);
          R('#c98a12', -26, 7, 52, 2);
          for (const px of [-20, -8, 14]) { R(INK, px, 1, 5, 5); R('#8fd3e8', px + 1, 2, 3, 3); R('#f3ead7', px + 1, 2, 1, 1); }
          R(INK, -31, 1, 3, 5); R('#5d6475', -33, 0, 2, 7);
        }
        break;
      case 'hantu':
        if (layer === 'back') {
          R(INK, -10, -30, 2, 30);
          // a torn sail that flickers
          const a = 0.55 + Math.sin(t * 1.7) * 0.15;
          c.globalAlpha = a;
          R('#cfe9e6', -22, -27, 12, 20); c.globalAlpha = 1;
          R('#2b2836', -16, -14, 3, 3); R('#2b2836', -20, -22, 2, 2);
          R(INK, -27, -9, 2, 9); R('#7af0ff', -28, -12, 4, 3);
        }
        if (layer === 'hull') {
          hull('#2b2836', '#4a4558', '#7af0ff', '#14121c', 54);
          if (Math.sin(t * 3) > 0) R('#7af0ff', -20, 8, 1, 1);
        }
        break;
      default:
        if (layer === 'hull') hull('#8a4f2b', '#b8743f', '#ff6b3d', '#6a3a1f', 48);
    }
  }

  function recolor(x, w, h, v) {
    const im = x.getImageData(0, 0, w, h);
    const d = im.data;
    const opaque = (px, py) => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 0;
    const src = new Uint8ClampedArray(d);
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (src[i + 3] === 0) continue;
      const L = lum(src[i], src[i + 1], src[i + 2]);
      let c;
      if (v === 'sil') c = [205, 185, 149];
      else if (v === 'gold') c = L < 28 ? hex('#3a2400') : ramp(GOLD, Math.min(255, L * 1.15 + 20));
      else if (v === 'shadow') {
        const inner = opaque(px - 1, py) && opaque(px + 1, py) && opaque(px, py - 1) && opaque(px, py + 1);
        if ((L < 40 && inner) || L > 235) c = hex('#7af0ff');
        else c = L < 28 ? hex('#05030a') : ramp(SHADOW, L);
      } else if (v.startsWith('prism')) {
        const [hh, s, l] = rgb2hsl(src[i], src[i + 1], src[i + 2]);
        const k = +v.slice(5);
        c = L < 28 ? [src[i], src[i + 1], src[i + 2]] : hsl2rgb((hh + k / 6 + (py / h) * 0.25) % 1, Math.max(0.65, s), Math.min(0.75, Math.max(0.45, l)));
      }
      if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
    }
    x.putImageData(im, 0, 0);
  }

  KL.Render = R;
})(this);
