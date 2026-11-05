// Figures: water, forms, gesture, useful, days, silence, passers, relay, doubt, why. Each factory returns draw(g, c, t, s);
// see ../scenes.mjs for the contract. Night, additive light, the banner's spectrum; the ember is always the Source, or "you".
export default (K) => {
  const { TAU, rng, smooth, clamp, dot, ease, glow, spark, light } = K;

  /* ---------- local helpers ---------- */
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };
  const wrap = (u) => ((u % 1) + 1) % 1;
  const beatOf = (t) => 1 + .15 * Math.exp(-(((t % 3.4) - .45) ** 2) * 40) + .06 * Math.exp(-(((t % 3.4) - 1.3) ** 2) * 40);
  // the ember: a heartbeat, the same in every figure
  const ember = (g, c, x, y, k, t, a = 1) => {
    const b = beatOf(t);
    glow(g, x, y, 100 * k * b, c.mark, .5 * a);
    glow(g, x, y, 30 * k * b, c.heat(.8), .85 * a);
    spark(g, x, y, 5 * k * b, c.mark, a);
  };
  const sky = (seed, n, y0 = 0, y1 = 600) => {
    const r = rng(seed);
    return Array.from({ length: n }, () => [r() * 600, y0 + r() * (y1 - y0), .3 + r() ** 3 * 1.1, r() * TAU, 3 + r() * 5]);
  };
  const stars = (g, c, t, list, a = 1) => {
    const lv = [[], [], [], []];
    for (const st of list) lv[Math.min(3, Math.floor((.5 + .5 * Math.sin((t * TAU) / st[4] + st[3])) * 4))].push(st);
    g.fillStyle = c.ink;
    lv.forEach((L, k) => {
      if (!L.length) return;
      g.globalAlpha = a * (.05 + (.36 * (k + .5)) / 4);
      g.beginPath();
      for (const [x, y, z] of L) dot(g, x, y, z);
      g.fill();
    });
    g.globalAlpha = 1;
  };
  // flat lists: dots [x, y, r, ...], lines [x0, y0, x1, y1, ...]
  const fillDots = (g, color, alpha, L) => {
    if (!L.length || alpha <= 0) return;
    g.fillStyle = color; g.globalAlpha = alpha; g.beginPath();
    for (let i = 0; i < L.length; i += 3) dot(g, L[i], L[i + 1], L[i + 2]);
    g.fill();
  };
  const strokeLines = (g, color, alpha, width, L) => {
    if (!L.length || alpha <= 0) return;
    g.strokeStyle = color; g.globalAlpha = alpha; g.lineWidth = width; g.beginPath();
    for (let i = 0; i < L.length; i += 4) { g.moveTo(L[i], L[i + 1]); g.lineTo(L[i + 2], L[i + 3]); }
    g.stroke();
  };
  // a bokeh tip: wide faint disc, inner disc, white core
  const bokeh = (g, color, L, k = 1, a = 1) => {
    if (!L.length) return;
    for (const [m, al] of [[3.4, .07], [1.5, .22]]) {
      g.fillStyle = color; g.globalAlpha = al * a; g.beginPath();
      for (let i = 0; i < L.length; i += 3) dot(g, L[i], L[i + 1], L[i + 2] * m * k);
      g.fill();
    }
    g.fillStyle = '#fff6ee'; g.globalAlpha = .55 * a; g.beginPath();
    for (let i = 0; i < L.length; i += 3) dot(g, L[i], L[i + 1], L[i + 2] * .45 * k);
    g.fill();
  };
  const bag = (n) => Array.from({ length: n }, () => []);
  const qpt = (ax, ay, cx, cy, bx, by, u) => { const a = 1 - u; return [a * a * ax + 2 * a * u * cx + u * u * bx, a * a * ay + 2 * a * u * cy + u * u * by]; };
  const done = (g) => { light(g, false); g.globalAlpha = 1; };

  return {
  // A drop falls from a cloud of light into a sea of light, rings out, and rises again as vapour. Each drop has its own colour,
  // and the sea keeps it: the places where drops fell stay tinted long after the rings have gone. Hover: a hand in the water.
  // Touch: let a drop fall there.
  water() {
    const r = rng(29), P = 24, HOR = 246, H0 = 364, NX = 120, NZ = 46, FALL = 5.2, HIT = 7.2;
    // the sea: rows of light receding to the horizon, each a polyline of NX points
    const sea = [];
    for (let j = 0; j < NZ; j++) {
      const Z = ((j + .5) / NZ) ** 1.25, row = [];
      for (let i = 0; i <= NX; i++) row.push([(2 * (i / NX) - 1) * 1.02 * (1 + 2.2 * Z), r() * TAU]);
      sea.push([Z, row]);
    }
    const cloud = Array.from({ length: 620 }, () => {
      const u = (r() + r() + r()) / 1.5 - 1, v = (r() + r() - 1);
      return [300 + u * 250, 112 + v * 34 * (1 - u * u) ** .5 + 8 * u * u, r() * TAU, .4 + r() * .9, r()];
    });
    const vapour = Array.from({ length: 150 }, () => [r(), r() * TAU, .5 + r(), r()]);
    const night = sky(31, 110, 0, HOR + 100);
    const pz = (Z) => 1 / (1 + 2.2 * Z);
    const toSea = (x, y) => {
      const p = (y - HOR) / H0;
      if (p < pz(1)) return null;
      const Z = Math.max(0, (1 / p - 1) / 2.2);
      return [(x - 300) / (315 * p), Z];
    };
    const impactOf = (kk) => [(hash(kk * 3.1) - .5) * 1.3, .18 + .5 * hash(kk * 7.7 + 1), wrap(kk * .382 + .05)];
    let hov = 0, hx = 0, hz = .3, lastClick = null, clickAt = -99, clickPos = [0, .3, 0];
    return (g, c, t, s) => {
      const hs = s.x == null ? null : toSea(s.x, s.y);
      hov = ease(s, hov, hs ? 1 : 0, .05);
      if (hs) { hx = ease(s, hx, hs[0], .12); hz = ease(s, hz, hs[1], .12); }
      if (s.click && s.click !== lastClick) {
        lastClick = s.click; clickAt = t;
        const q = toSea(s.click[0], s.click[1]) || [(s.click[0] - 300) / (315 * pz(.35)), .35];
        clickPos = [q[0], q[1], wrap(hash(Math.round(t * 10)) * 7)];
      }
      const k = Math.floor(t / P), tf = t - k * P;
      const imps = [];
      for (let kk = k - 5; kk <= k; kk++) { const m = impactOf(kk), t0 = kk * P + HIT; if (t >= t0) imps.push([m[0], m[1], t0, m[2]]); }
      if (t >= clickAt + 1.2) imps.push([clickPos[0], clickPos[1], clickAt + 1.2, clickPos[2]]);
      const screen = (X, Z) => { const p = pz(Z); return [300 + X * 315 * p, HOR + H0 * p]; };
      light(g);
      stars(g, c, t, night, .8);
      // the horizon and the cloud
      glow(g, 300, HOR + 112, 360, c.cool(.4), .22);
      glow(g, 300, 118, 260, c.cool(.45), .12);
      const cb = bag(2);
      for (const [x, y, ph, z, w] of cloud) cb[w < .7 ? 0 : 1].push(x + 6 * Math.sin(t * .11 + ph), y + 3 * Math.cos(t * .13 + ph * 1.3), z);
      fillDots(g, c.cool(.75), .32, cb[0]);
      fillDots(g, c.ink, .45, cb[1]);
      for (let i = 0; i < 9; i++) glow(g, 120 + i * 45 + 14 * Math.sin(t * .07 + i), 112 + 10 * Math.sin(i * 2.3), 70 + 30 * hash(i), i % 3 ? c.cool(.55 + .05 * i) : c.hue(.7 + .03 * i), .16);
      // vapour: what fell rises again, still carrying its colour
      const vb = bag(8);
      for (const m of imps) {
        const age = t - m[2];
        if (age < 3 || age > 22) continue;
        const win = smooth(3, 6, age) * (1 - smooth(16, 22, age)), [sx, sy] = screen(m[0], m[1]);
        for (const [o, ph, v, q] of vapour) {
          const f = wrap(age * .06 * v + o), y = sy - 10 - f * (sy - 130), x = sx + (300 - sx) * f * .35 + 30 * Math.sin(f * 7 + ph) * f;
          if (q > win) continue;
          vb[Math.floor(m[3] * 8) % 8].push(x, y, (.5 + 1.1 * Math.sin(Math.PI * f)) * (.6 + .5 * v));
        }
      }
      vb.forEach((L, i) => fillDots(g, c.hue((i + .5) / 8), .45, L));
      // the sea: rows of light, bucketed by colour and brightness; glints where crests catch the cloud's light
      const B = bag(12 * 3), G = bag(2);
      for (const [Z, row] of sea) {
        const p = pz(Z);
        let px = 0, py = 0;
        row.forEach(([X, ph], i) => {
          let h = .05 * Math.sin(X * 3.1 + Z * 9 - t * .55) + .03 * Math.sin(X * 7 - Z * 4 + t * .42) + .012 * Math.sin(X * 19 + Z * 23 - t * 1.1), b = 0, tw = 0, th = 0;
          for (const m of imps) {
            const age = t - m[2], d = Math.hypot(X - m[0], 2.2 * (Z - m[1])), rho = .16 * age;
            const e = Math.exp(-(((d - rho) / .05) ** 2)) * Math.exp(-age / 6) + .6 * Math.exp(-(((d - rho * .72) / .04) ** 2)) * Math.exp(-age / 4);
            h += .05 * e; b += 1.6 * e;
            const mem = .9 * Math.exp(-age / 55) * Math.exp(-((d / .3) ** 2));
            if (e + mem > tw) { tw = e + mem; th = m[3]; }
            b += .35 * mem;
          }
          if (hov > .01) {
            const d = Math.hypot(X - hx, 2.2 * (Z - hz)), e = hov * Math.exp(-d * d / .05), w = Math.sin(d * 40 - t * 2.4);
            h += .03 * e * w; b += .8 * e * (.5 + .5 * w);
          }
          const crest = clamp(h / .15 + .5), x = 300 + X * 315 * p, y = HOR + H0 * p - h * 70 * p;
          if (i) {
            const bright = clamp((.18 + .7 * crest * crest + b) * (.4 + .6 * p) + .25 * Math.exp(-(((x - 300) / (60 + 200 * (1 - p))) ** 2)) * crest);
            const col = tw > .18 ? 4 + (Math.floor(th * 8) % 8) : Math.min(3, Math.floor(crest * 4));
            B[col * 3 + Math.min(2, Math.floor(bright * 3))].push(px, py, x, y);
            // glints: a path of light under the cloud, and on the rings
            const path = Math.exp(-(((x - 300) / (40 + 160 * (1 - p))) ** 2)) * .8;
            if (crest > .7 && hash(i * 7.1 + Z * 131 + Math.floor(t * 1.5 + ph)) < (path + b) * .55) G[b > .4 ? 1 : 0].push(x, y, (.6 + 1.2 * p) * (crest - .4));
          }
          px = x; py = y;
        });
      }
      B.forEach((L, i) => {
        const col = Math.floor(i / 3), lv = i % 3;
        strokeLines(g, col < 4 ? c.cool(.4 + .14 * col) : c.hue((col - 4 + .5) / 8), [.22, .5, .9][lv], .55 + .4 * lv, L);
      });
      fillDots(g, c.cool(.92), .7, G[0]);
      fillDots(g, '#fff6ee', .8, G[1]);
      // where drops fell, the sea keeps a glow of their colour
      for (const m of imps) { const age = t - m[2], [x, y] = screen(m[0], m[1]); glow(g, x, y, 70 * pz(m[1]) + 30, c.hue(m[3]), .3 * Math.exp(-age / 55)); }
      // the drop of this cycle: it gathers in the cloud, falls, and the sea takes it
      const drops = [];
      const m0 = impactOf(k), [ix, iy] = screen(m0[0], m0[1]);
      drops.push([ix, iy, tf, m0[2]]);
      const [cx2, cy2] = screen(clickPos[0], clickPos[1]);
      if (t - clickAt < 6) drops.push([cx2, cy2, FALL + (t - clickAt) * (HIT - FALL) / 1.2, clickPos[2]]);
      for (const [x, yi, u, hue] of drops) {
        if (u < FALL) {
          const a = smooth(1, FALL, u);
          glow(g, x, 126, 60, c.heat(.7), .35 * a);
          spark(g, x, 126, 2.2 * a, c.mark, a * .9);
        } else if (u < HIT) {
          const f = (u - FALL) / (HIT - FALL), y = 126 + (yi - 126) * f * f;
          for (let j = 1; j < 7; j++) { const yy = 126 + (yi - 126) * Math.max(0, f - j * .03) ** 2; glow(g, x, yy, 10, c.mark, .25 * (1 - j / 7)); }
          glow(g, x, yi, 70 * f, c.mark, .3 * f * f);
          ember(g, c, x, y, .42, t);
          glow(g, x, yi + (yi - y) * .25, 40, c.mark, .25 * f);
        } else {
          const age = (u - HIT);
          glow(g, x, yi, 90, c.hue(hue), .45 * Math.exp(-age / 2.5));
          glow(g, x, yi + 6, 26, c.mark, .7 * Math.exp(-age / 1.2));
          if (age < 1.8) {
            const L = [];
            for (let j = 0; j < 18; j++) {
              const vx = (hash(j * 13.7 + hue) - .5) * 110, vy = 70 + hash(j * 5.3 + hue) * 90;
              L.push(x + vx * age, yi - vy * age + 110 * age * age, 1.3);
            }
            bokeh(g, c.heat(.75), L, 1, 1 - age / 1.8);
          }
        }
      }
      done(g);
    };
  },

  // Two lives tied by a bond of fibres. One of them changes form, again and again: a point, a halo, a flight of birds, a tree.
  // The fibres never let go; they follow it into every form. Hover: you lean toward it. Touch: a word said under your breath.
  forms() {
    const r = rng(41), N = 280, SLOT = 10, FORMS = 4, A0 = [132, 318];
    const pts = Array.from({ length: N }, (_, i) => {
      const z = 1 - (2 * (i + .5)) / N, q = Math.sqrt(1 - z * z), phi = i * Math.PI * (3 - Math.sqrt(5));
      return { sx: Math.cos(phi) * q, sy: z, sz: Math.sin(phi) * q, a: r(), b: r(), off: r() - .5, pul: r() * 7, hue: r(), del: r() * .35 };
    });
    const night = sky(43, 130);
    const shape = (k, p, i, t) => {
      if (k === 0) { // a life: a small sphere of light
        const sp = t * .4, x = p.sx * Math.cos(sp) + p.sz * Math.sin(sp);
        return [420 + x * 30, 300 + p.sy * 30];
      }
      if (k === 1) { // a halo turning in depth
        const a = (i / N) * TAU + t * .12, rr = 138 + 10 * (p.a - .5);
        return [420 + Math.cos(a) * rr * .8, 300 + Math.sin(a) * rr * .42 + Math.cos(a) * 34 + (p.b - .5) * 8];
      }
      if (k === 2) { // a flight of birds
        const u = i / N, w = Math.sin(u * Math.PI);
        return [280 + u * 300 + (p.a - .5) * 26, 300 + 110 * Math.sin(u * 6.5 + t * .35) * w + (p.b - .5) * 44 * w - 90 * u];
      }
      // a tree: trunk, branches, a crown of leaves
      if (i % 6 === 0) { const u = p.a; return [430 + 8 * Math.sin(u * 5) + (p.b - .5) * 5, 520 - u * 220]; }
      const a = p.a * TAU, rad = 140 * Math.sqrt(p.b);
      return [430 + Math.cos(a) * rad * 1.05 + 4 * Math.sin(t * .5 + p.a * 9), 236 + Math.sin(a) * rad * .72 + 3 * Math.cos(t * .4 + p.b * 9)];
    };
    let ax = A0[0], ay = A0[1], burst = -99, lastClick = null;
    return (g, c, t, s) => {
      const tx = s.x == null ? A0[0] : A0[0] + clamp((s.x - A0[0]) * .3, -40, 70), ty = s.y == null ? A0[1] : A0[1] + clamp((s.y - A0[1]) * .3, -60, 60);
      ax = ease(s, ax, tx, .05); ay = ease(s, ay, ty, .05);
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const sent = clamp(1 - (t - burst) / 2.2);
      const cyc = t / SLOT, k0 = Math.floor(cyc) % FORMS, k1 = (k0 + 1) % FORMS, f = cyc - Math.floor(cyc);
      light(g);
      stars(g, c, t, night, .8);
      const HB = 18, lines = bag(HB), runs = bag(HB), tips = bag(HB);
      let mx = 0, my = 0;
      const B = pts.map((p, i) => {
        const m = smooth(.6 + p.del, .95 + p.del * .1, f + p.del * .0), a = shape(k0, p, i, t), b = shape(k1, p, i, t);
        const x = a[0] + (b[0] - a[0]) * m, y = a[1] + (b[1] - a[1]) * m;
        mx += x / N; my += y / N;
        return [x, y];
      });
      pts.forEach((p, i) => {
        const [bx, by] = B[i], h = wrap(.55 * i / N + .04 * p.hue + t / 60), hb = Math.floor(h * HB) % HB;
        const cx = ax + (bx - ax) * .5 + 20 * Math.sin(t * .2 + p.off * 6), cy = ay + (by - ay) * .5 + p.off * 300 * (.75 + .25 * Math.sin(t * .17 + p.a * 3));
        lines[hb].push(ax, ay, cx, cy, bx, by);
        const ph = wrap((t - p.pul) / 7), u = Math.max(ph < .7 && i % 3 === 0 ? ph / .7 : -1, sent > 0 ? 1 - sent : -1);
        if (u >= 0) { const [x, y] = qpt(ax, ay, cx, cy, bx, by, u); runs[hb].push(x, y, .9 + .7 * Math.sin(u * Math.PI)); }
        tips[hb].push(bx, by, 1.5 + .8 * p.b + (ph > .7 ? 1.2 * (1 - (ph - .7) / .3) : 0) + 1.5 * sent);
      });
      // the life it was: a warm presence wherever it is gathered
      let spread = 0;
      for (const [x, y] of B) spread += Math.hypot(x - mx, y - my) / N;
      glow(g, mx, my, 150, c.heat(.55), .22 * clamp(1.4 - spread / 70));
      glow(g, ax, ay, 260, c.heat(.25), .3);
      for (let i = 0; i < HB; i++) {
        const col = c.hue((i + .5) / HB), L = lines[i];
        if (!L.length) continue;
        g.strokeStyle = col; g.lineWidth = .8; g.globalAlpha = .17 + .12 * sent;
        g.beginPath();
        for (let j = 0; j < L.length; j += 6) { g.moveTo(L[j], L[j + 1]); g.quadraticCurveTo(L[j + 2], L[j + 3], L[j + 4], L[j + 5]); }
        g.stroke();
        fillDots(g, col, .6, runs[i]);
        bokeh(g, col, tips[i], 1, .9);
      }
      glow(g, mx, my, 40, c.heat(.9), .25 * clamp(1.4 - spread / 70) + .4 * sent);
      ember(g, c, ax, ay, .9, t);
      done(g);
    };
  },

  // A gesture handed down: each generation draws it again, after the one before, and changes it a little. The oldest recede
  // into the night; the ember draws the newest. Hover: turn the line of generations. Touch: the gesture comes back to the hand.
  gesture() {
    const G = 14, P = 8, M = 150;
    const cache = new Map();
    const curve = (m) => {
      let pts = cache.get(m);
      if (pts) return pts;
      const a = [0, 1, 2, 3, 4].map((k) => (noise(m * .33 + k * 17.3) - .5) * 1.1);
      pts = [];
      for (let i = 0; i <= M; i++) {
        const s = i / M;
        const u = (2 * s - 1) * (.92 + .1 * a[4]) + (.24 + .05 * a[0]) * Math.sin(TAU * s * 3 + a[1]);
        const v = (.42 + .1 * a[2]) * Math.sin(TAU * s * 1.5 + a[3]) + .28 * Math.cos(TAU * s * 3 + a[1] * .8) * (1 - .6 * s);
        pts.push(u, v);
      }
      if (cache.size > 40) cache.delete(cache.keys().next().value);
      cache.set(m, pts);
      return pts;
    };
    const night = sky(47, 140);
    let vx = 380, vy = 190, burst = -99, lastClick = null;
    return (g, c, t, s) => {
      vx = ease(s, vx, s.x == null ? 380 : 380 + (s.x - 300) * .7, .05);
      vy = ease(s, vy, s.y == null ? 190 : 190 + (s.y - 300) * .25, .05);
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const n0 = Math.floor(t / P), frac = t / P - n0, slide = smooth(.8, 1, frac);
      light(g);
      stars(g, c, t, night, .7);
      glow(g, vx, vy, 240, c.cool(.35), .14);
      glow(g, 280, 400, 300, c.heat(.25), .22);
      g.lineCap = g.lineJoin = 'round';
      let head = null;
      for (let j = G - 1; j >= 0; j--) {
        const m = n0 - j, z = j + slide, p = 1 / (1 + .2 * z), fade = Math.max(0, 1 - z / G) ** 1.2;
        const cx = vx + (280 - vx) * p, cy = vy + (400 - vy) * p, su = 230 * p, sv = 120 * p;
        const pts = curve(m), front = j === 0, upto = front ? Math.floor(clamp(frac / .76) * M) : M;
        const fl = t - burst < 3 ? Math.exp(-(((z - (G - (t - burst) * 9)) / 1.3) ** 2)) : 0;
        const xs = [], ys = [];
        for (let i = 0; i <= upto; i++) { xs.push(cx + pts[2 * i] * su); ys.push(cy + pts[2 * i + 1] * sv); }
        if (xs.length < 2) continue;
        const hue = c.hue(wrap(m * .045)), cool = front ? 1 - smooth(.76, 1, frac) : 0;
        // one luminous stroke: a wide soft halo, a body, a hot core
        g.beginPath();
        for (let i = 0; i < xs.length; i++) if (i) g.lineTo(xs[i], ys[i]); else g.moveTo(xs[i], ys[i]);
        for (const [w, al, core] of [[9, .05, 0], [3.2, .16, 0], [1.1, .55, 0], [.5, .5, 1]]) {
          g.lineWidth = w * (.35 + .65 * p);
          if (cool > 0) { g.strokeStyle = core ? '#fff6ee' : c.heat(.7); g.globalAlpha = al * 1.4 * cool; g.stroke(); }
          if (cool < 1) { g.strokeStyle = core ? '#fff6ee' : hue; g.globalAlpha = Math.min(1, al * (core ? .5 : 1) * fade * (1 + 2.5 * fl)) * (1 - cool); g.stroke(); }
        }
        // light running along the old gestures
        const L = [];
        for (const o of [0, .37, .71]) { const i = Math.floor(wrap(t * .05 + o + m * .13) * (xs.length - 1)); L.push(xs[i], ys[i], (1 + 1.2 * p)); }
        if (!front) bokeh(g, hue, L, 1, fade * (.7 + fl));
        if (front) head = [xs[xs.length - 1], ys[ys.length - 1]];
      }
      if (head) ember(g, c, head[0], head[1], .5, t);
      done(g);
    };
  },

  // A small life, and what it brings: its light passes to a few, who pass it on, far beyond the little circle it can see.
  // Hover a distant light: the path back to the one who started it lights up. Touch: begin again.
  useful() {
    const r = rng(53), N = 640, E = [196, 372], P = 22, REACH = 13;
    const nodes = [{ x: E[0], y: E[1] }];
    while (nodes.length < N) {
      const a = r() * TAU, rad = 292 * Math.sqrt(r()), x = 300 + Math.cos(a) * rad, y = 300 + Math.sin(a) * rad;
      if (Math.hypot(x - E[0], y - E[1]) > 16) nodes.push({ x, y });
    }
    nodes.forEach((n) => { n.d = Math.hypot(n.x - E[0], n.y - E[1]); });
    nodes.sort((a, b) => a.d - b.d);
    nodes[0].T = 0; nodes[0].parent = -1;
    for (let i = 1; i < N; i++) {
      const n = nodes[i], best = [];
      for (let j = 0; j < i; j++) {
        const d = Math.hypot(n.x - nodes[j].x, n.y - nodes[j].y);
        best.push([d, j]);
      }
      best.sort((a, b) => a[0] - b[0]);
      const [d, j] = best[Math.min(best.length - 1, Math.floor(r() * r() * 3))];
      n.parent = j; n.T = nodes[j].T + d * (.8 + .5 * r()) + 6;
      const bend = (r() - .5) * .35;
      n.cx = (n.x + nodes[j].x) / 2 - (n.y - nodes[j].y) * bend; n.cy = (n.y + nodes[j].y) / 2 + (n.x - nodes[j].x) * bend;
      n.z = .4 + .6 * r();
    }
    const Tmax = Math.max(...nodes.map((n) => n.T));
    const night = sky(59, 90);
    let hl = 0, hi = -1, burst = -99, lastClick = null;
    return (g, c, t, s) => {
      if (s.x != null) {
        let bd = 46, bi = -1;
        for (let i = 1; i < N; i++) { const d = Math.hypot(nodes[i].x - s.x, nodes[i].y - s.y); if (d < bd) { bd = d; bi = i; } }
        if (bi >= 0) { if (bi !== hi) hl = s.snap ? 1 : Math.min(hl, .2); hi = bi; }
        hl = ease(s, hl, bi >= 0 ? 1 : 0, .08);
      } else hl = ease(s, hl, 0, .06);
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const u = t % P, sp = Tmax / REACH;
      let tau = u * sp, fade = 1 - smooth(P - 4, P, u) * .85;
      const tb = t - burst;
      if (tb >= 0 && tb < P - 2) { tau = Math.max(tau, tb * sp); fade = Math.max(fade, 1 - smooth(P - 6, P - 2, tb) * .85); }
      light(g);
      stars(g, c, t, night, .6);
      const HB = 20, edges = bag(HB * 2), tips = bag(HB), fresh = bag(HB), sleep = [];
      for (let i = 1; i < N; i++) {
        const n = nodes[i], p = nodes[n.parent], h = Math.min(HB - 1, Math.floor((n.T / Tmax) * HB));
        if (tau <= p.T) { sleep.push(n.x, n.y, .7 + .5 * n.z); continue; }
        const f = clamp((tau - p.T) / (n.T - p.T)), age = (tau - n.T) / sp;
        const recent = f < 1 || age < 1.4 ? 1 : 0;
        if (f >= 1) edges[h * 2 + recent].push(p.x, p.y, n.cx, n.cy, n.x, n.y);
        else {
          // the part of the curve already travelled
          const qx = p.x + (n.cx - p.x) * f, qy = p.y + (n.cy - p.y) * f, [ex, ey] = qpt(p.x, p.y, n.cx, n.cy, n.x, n.y, f);
          edges[h * 2 + 1].push(p.x, p.y, qx, qy, ex, ey);
          fresh[h].push(ex, ey, 1.6);
        }
        if (f >= 1) (age < 1.4 ? fresh : tips)[h].push(n.x, n.y, (.9 + .9 * n.z) * (1 + 1.4 * Math.exp(-age * 2)));
        else sleep.push(n.x, n.y, .7 + .5 * n.z);
      }
      fillDots(g, c.cool(.6), .25 * fade + .1, sleep);
      for (let i = 0; i < HB; i++) {
        const col = c.hue(.02 + (.74 * (i + .5)) / HB);
        for (const rc of [0, 1]) {
          const L = edges[i * 2 + rc];
          if (!L.length) continue;
          g.strokeStyle = col; g.lineWidth = rc ? 1.3 : .9; g.globalAlpha = (rc ? .7 : .36) * fade;
          g.beginPath();
          for (let j = 0; j < L.length; j += 6) { g.moveTo(L[j], L[j + 1]); g.quadraticCurveTo(L[j + 2], L[j + 3], L[j + 4], L[j + 5]); }
          g.stroke();
        }
        bokeh(g, col, tips[i], 1.15, .75 * fade);
        bokeh(g, col, fresh[i], 1.4, fade);
      }
      glow(g, E[0], E[1], 200, c.heat(.4), .35);
      // the little circle of what it can see
      const ring = [];
      for (let k = 0; k < 64; k++) { const a = (k / 64) * TAU + t * .02; ring.push(E[0] + Math.cos(a) * 62, E[1] + Math.sin(a) * 62, .9); }
      fillDots(g, c.heat(.7), .5, ring);
      // the thread back from a distant light to the one who started it
      if (hi > 0 && hl > .01) {
        g.strokeStyle = c.heat(.92); g.lineWidth = 1.6; g.globalAlpha = .85 * hl;
        g.beginPath();
        const L = [];
        for (let i = hi; i > 0; i = nodes[i].parent) {
          const n = nodes[i], p = nodes[n.parent];
          g.moveTo(n.x, n.y); g.quadraticCurveTo(n.cx, n.cy, p.x, p.y);
          L.push(n.x, n.y, 1.4);
        }
        g.stroke();
        bokeh(g, c.heat(.85), L, 1.2, hl);
        spark(g, nodes[hi].x, nodes[hi].y, 2.4, c.hue(.02 + .74 * nodes[hi].T / Tmax), hl);
      }
      ember(g, c, E[0], E[1], .55, t);
      done(g);
    };
  },

  // A year as a sunflower of days: each day a small star of twenty-four hours, sleep dark, morning and evening bright. Recent days
  // are warm, old ones turn violet; none goes out. They look alike; the lens under the pointer shows that none is the same.
  // Touch: an ordinary day comes back, whole.
  days() {
    const r = rng(23), N = 365, PER = 2.4, golden = Math.PI * (3 - Math.sqrt(5));
    const base = [.05, .04, .04, .04, .05, .07, .16, .7, .85, .6, .55, .6, .95, .62, .5, .38, .2, .36, .78, .62, .5, .4, .16, .07];
    const cells = Array.from({ length: N }, (_, d) => {
      const weekend = d % 7 >= 5, late = weekend ? 1 + Math.floor(r() * 3) : 0, mood = .8 + r() * .35;
      const hours = base.map((v, h) => {
        let a = base[Math.max(0, Math.min(23, h - (h < 12 ? late : 0)))];
        if (weekend && h > 9 && h < 18) a = a * .6 + .3;
        return clamp(a * mood + (r() - .5) * .34 * (a > .1 ? 1 : .2), .03, 1);
      });
      return { rad: 13.4 * Math.sqrt(d + .6) + 6, ang: d * golden, hours };
    });
    const ANG = Array.from({ length: 24 }, (_, h) => [Math.cos(-Math.PI / 2 + (h / 24) * TAU), Math.sin(-Math.PI / 2 + (h / 24) * TAU)]);
    const night = sky(29, 120);
    const R = 110, MAG = 1.7;
    let lens = 0, lx = 300, ly = 300, lastClick = null, recall = -1, recallAt = -99;
    const magnify = (x, y) => {
      const dx = x - lx, dy = y - ly, e = Math.hypot(dx, dy);
      if (!lens || e >= R) return [x, y, 1];
      const spread = 1 + ((lens * MAG) / (1 + (MAG * e) / R)) * (1 - e / R);
      return [lx + dx * spread, ly + dy * spread, 1 + lens * MAG * (1 - e / R) ** 2];
    };
    return (g, c, t, s) => {
      const near = s.x != null;
      if (near) { lx = lens ? ease(s, lx, s.x, .12) : s.x; ly = lens ? ease(s, ly, s.y, .12) : s.y; }
      lens = ease(s, lens, near ? 1 : 0, .07);
      if (lens < .002 && !near) lens = 0;
      const now = (t / PER) % N, today = Math.floor(now), hour = (now - today) * 24, spin = t * TAU / 400;
      if (s.click && s.click !== lastClick) {
        lastClick = s.click; recallAt = t;
        recall = (today + 30 + Math.floor(hash(Math.round(t * 7)) * (N - 60))) % N;
      }
      const rec = recall >= 0 ? Math.exp(-(((t - recallAt) - 1.6) ** 2) / 2.2) : 0;
      light(g);
      stars(g, c, t, night, .6);
      glow(g, 300, 300, 330, c.cool(.3), .18);
      glow(g, 300, 300, 200, c.hue(.6), .1);
      const HB = 16, rays = bag(HB * 2), cores = bag(HB), tipsL = bag(HB);
      let todayAt = null, recallPos = null;
      for (let d = 0; d < N; d++) {
        const cell = cells[d], a = cell.ang + spin, [x, y, k0] = magnify(300 + Math.cos(a) * cell.rad, 300 + Math.sin(a) * cell.rad);
        const age = (today - d + N) % N, isRec = d === recall && rec > .01, k = k0 * (isRec ? 1 + 1.4 * rec : 1);
        const hb = Math.min(HB - 1, Math.floor((age / N) * HB)), upto = age === 0 ? Math.floor(hour) + 1 : 24;
        if (age === 0) todayAt = [x, y, k];
        if (isRec) recallPos = [x, y, k];
        cores[hb].push(x, y, .8 * k);
        const cr = Math.cos(a + Math.PI / 2), sr = Math.sin(a + Math.PI / 2);
        for (let h = 0; h < upto; h++) {
          const ca = ANG[h][0] * cr - ANG[h][1] * sr, sa = ANG[h][0] * sr + ANG[h][1] * cr, v = cell.hours[h], L = (3 + 10 * v) * k;
          rays[hb * 2 + (v > .45 ? 1 : 0)].push(x + 2.6 * k * ca, y + 2.6 * k * sa, x + L * ca, y + L * sa);
          if (v > .6) tipsL[hb].push(x + L * ca, y + L * sa, .45 * k);
        }
      }
      for (let i = 0; i < HB; i++) {
        const col = c.hue(.03 + (.74 * i) / (HB - 1)), keep = .55 + .45 * (1 - i / HB);
        strokeLines(g, col, .22 * keep, .6, rays[i * 2]);
        strokeLines(g, col, .55 * keep, .8, rays[i * 2 + 1]);
        fillDots(g, col, .8 * keep, cores[i]);
        bokeh(g, col, tipsL[i], 1, .6 * keep);
      }
      if (recallPos) {
        const [x, y, k] = recallPos;
        glow(g, x, y, 60 * k, c.heat(.8), .5 * rec);
        g.globalAlpha = rec; g.strokeStyle = c.heat(.95); g.lineWidth = 1.2; g.beginPath();
        const a = cells[recall].ang + spin + Math.PI / 2, cr = Math.cos(a), sr = Math.sin(a);
        for (let h = 0; h < 24; h++) { const ca = ANG[h][0] * cr - ANG[h][1] * sr, sa = ANG[h][0] * sr + ANG[h][1] * cr, L = (3 + 10 * cells[recall].hours[h]) * k; g.moveTo(x + 2.6 * k * ca, y + 2.6 * k * sa); g.lineTo(x + L * ca, y + L * sa); }
        g.stroke();
      }
      if (todayAt) {
        const [x, y, k] = todayAt, h = Math.floor(hour), a = cells[today].ang + spin + Math.PI / 2, cr = Math.cos(a), sr = Math.sin(a);
        const ca = ANG[h][0] * cr - ANG[h][1] * sr, sa = ANG[h][0] * sr + ANG[h][1] * cr, L = (3 + 10 * cells[today].hours[h]) * k;
        spark(g, x + L * ca, y + L * sa, 1.2 * k, c.heat(.85), .9);
        ember(g, c, x, y, .45 * Math.sqrt(k), t);
      }
      done(g);
    };
  },

  // Almost nothing. One point, breathing very slowly, and around it the border between oneself and the rest, a ring of dust so
  // thin it keeps opening and vanishing. Hover: the border thins further. Touch: one slow ring goes out, without a sound.
  silence() {
    const r = rng(7), N = 720;
    const dust = Array.from({ length: N }, () => [r() * TAU, (r() - .5) * 2.2, r() * TAU, .25 + r() * .45]);
    const night = sky(71, 26);
    let still = 0, burst = -99, lastClick = null;
    return (g, c, t, s) => {
      still = ease(s, still, s.x == null ? 0 : 1, .02);
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const breath = .5 + .5 * Math.sin((t * TAU) / 14), thin = (.55 + .45 * Math.sin((t * TAU) / 31 + 1)) * (1 - .7 * still);
      const R = 112 + 3 * breath;
      light(g);
      stars(g, c, t, night, .35);
      glow(g, 300, 300, 150 + 30 * breath + 60 * still, c.heat(.3), .12 + .04 * breath);
      // the border: dust that opens where it thins
      const lv = bag(3);
      for (const [a, o, ph, z] of dust) {
        const open = noise(a * 2.2 + t * .03 + 9) * .6 + noise(a * 6 + ph * .1 - t * .05) * .4, v = clamp((open - (1 - thin) * .8) * 2);
        if (v <= .02) continue;
        const rr = R + o * (1.2 + 5 * (1 - thin)), aa = a + t * .004;
        lv[Math.min(2, Math.floor(v * 3))].push(300 + Math.cos(aa) * rr, 300 + Math.sin(aa) * rr, z);
      }
      lv.forEach((L, i) => fillDots(g, i ? c.ink : c.cool(.8), [.14, .28, .5][i], L));
      // and a hairline under the dust, where the border still holds
      g.strokeStyle = c.ink; g.lineWidth = .45;
      for (const [lo, al] of [[.15, .05], [.5, .1]]) {
        g.globalAlpha = al; g.beginPath();
        for (let k = 0; k < 240; k++) {
          const a = (k / 240) * TAU, v = clamp(((noise(a * 2.2 + t * .03 + 9) * .6 + noise(a * 6 - t * .05) * .4) - (1 - thin) * .8) * 2);
          if (v > lo) { const aa = a + t * .004; g.moveTo(300 + Math.cos(aa) * R, 300 + Math.sin(aa) * R); g.arc(300, 300, R, aa, aa + TAU / 240); }
        }
        g.stroke();
      }
      const tb = t - burst;
      if (tb >= 0 && tb < 9) {
        const rr = 6 + tb * 34, a = Math.sin(Math.PI * tb / 9) * .22;
        g.strokeStyle = c.ink; g.lineWidth = .6; g.globalAlpha = a;
        g.beginPath(); g.arc(300, 300, rr, 0, TAU); g.stroke();
      }
      glow(g, 300, 300, 34 + 6 * breath, c.mark, .45 + .1 * breath);
      glow(g, 300, 300, 9, c.heat(.85), .7);
      spark(g, 300, 300, 1.5 + .25 * breath, c.mark, .85);
      done(g);
    };
  },

  // Many paths, from far apart, toward one point on the horizon. The four great ones keep their own nature: a still line, a river,
  // a broken line of questions, a path that turns aside to others; between them, countless faint paths of people with no book.
  // They converge without merging. Hover: the point they look toward moves. Touch: light runs along every path at once.
  passers() {
    const r = rng(37), HOR = 212, Y0 = 600;
    const main = [
      { sx: 92, sy: Y0, kind: 0, hue: .2 },
      { sx: 610, sy: 452, kind: 1, hue: .52 },
      { sx: -10, sy: 418, kind: 2, hue: .74 },
      { sx: 476, sy: Y0, kind: 3, hue: .93 },
    ];
    const minor = Array.from({ length: 80 }, () => {
      const e = r(), sx = e < .6 ? -20 + r() * 640 : (r() < .5 ? -10 : 610), sy = e < .6 ? Y0 : 300 + r() * 300;
      return { sx, sy, amp: 4 + 14 * r(), fr: 2 + 6 * r(), ph: r() * TAU, hue: r(), a: .3 + .7 * r(), v: .03 + .04 * r() };
    });
    const others = Array.from({ length: 9 }, (_, i) => [.12 + i * .085, (i % 2 ? 1 : -1) * (26 + 14 * r())]);
    const night = sky(39, 150, 0, HOR);
    const ground = Array.from({ length: 380 }, () => [r(), r(), r()]);
    let vx = 300, vy = HOR, burst = -99, lastClick = null;
    const path = (p, l, vxx, vyy) => {
      const x = p.sx + (vxx - p.sx) * l, y = p.sy + (vyy - p.sy) * l, dx = vxx - p.sx, dy = vyy - p.sy, n = Math.hypot(dx, dy);
      let o = 0;
      if (p.kind === 1) o = 34 * Math.sin(l * 13) * (1 - l) ** 1.2;
      else if (p.kind === 2) o = 9 * ((Math.floor(l * 22) % 2) * 2 - 1) * (1 - l);
      else if (p.kind === 3) o = 6 * Math.sin(l * 5) * (1 - l);
      else if (p.kind == null) o = p.amp * Math.sin(l * p.fr + p.ph) * (1 - l);
      return [x - (dy / n) * o, y + (dx / n) * o];
    };
    return (g, c, t, s) => {
      vx = ease(s, vx, s.x == null ? 300 : 300 + clamp((s.x - 300) * .3, -90, 90), .04);
      vy = ease(s, vy, s.y == null ? HOR : HOR + clamp((s.y - HOR) * .1, -20, 30), .04);
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const tb = t - burst, END = .955;
      light(g);
      stars(g, c, t, night, .85);
      // the horizon and the ground, faint
      glow(g, vx, vy, 340, c.cool(.35), .2);
      const gd = [];
      for (const [a, b, z] of ground) { const l = b ** .6, x = vx + (a * 900 - 450) * (1 - l) * 1.1, y = vy + (Y0 - vy) * (1 - l); gd.push(x, y, .3 + .9 * z * (1 - l)); }
      fillDots(g, c.cool(.55), .3, gd);
      const hz = [];
      for (let i = 0; i < 120; i++) hz.push((i / 119) * 600, vy + .5 * Math.sin(i), .6);
      fillDots(g, c.cool(.7), .25, hz);
      // the many
      const HB = 12, lines = bag(HB), beads = bag(HB);
      for (const p of minor) {
        const hb = Math.floor(p.hue * HB), L = lines[hb];
        let [px, py] = path(p, 0, vx, vy);
        for (let i = 1; i <= 24; i++) { const [x, y] = path(p, (i / 24) * END * .97, vx, vy); L.push(px, py, x, y); px = x; py = y; }
        const l = wrap(t * p.v + p.ph) * END, [x, y] = path(p, l, vx, vy);
        beads[hb].push(x, y, .5 + 1.1 * (1 - l));
      }
      for (let i = 0; i < HB; i++) { strokeLines(g, c.hue((i + .5) / HB), .1, .6, lines[i]); fillDots(g, c.hue((i + .5) / HB), .55, beads[i]); }
      // the four
      g.lineCap = g.lineJoin = 'round';
      for (const p of main) {
        const col = c.hue(p.hue), n = 90;
        g.strokeStyle = col;
        for (const [w, a] of [[14, .035], [5, .08], [1.6, .4], [.7, .8]]) {
          g.lineWidth = w; g.globalAlpha = a;
          g.beginPath();
          for (let i = 0; i <= n; i++) {
            const l = (i / n) * END, [x, y] = path(p, l, vx, vy);
            if (p.kind === 2 && Math.floor(l * 22) % 3 === 2) { g.moveTo(x, y); continue; }
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
        }
        if (p.kind === 3) {
          // it turns aside to others along the way
          const L = [];
          g.lineWidth = .7; g.globalAlpha = .45; g.beginPath();
          for (const [l, o] of others) {
            const [x, y] = path(p, l, vx, vy), k = 1 - l, ox = x + o * k * 1.6, oy = y - 6 * k;
            g.moveTo(x, y); g.quadraticCurveTo((x + ox) / 2, y - 14 * k, ox, oy);
            L.push(ox, oy, 1.6 * k + .4);
          }
          g.stroke();
          bokeh(g, col, L, 1, .9);
        }
        const B = [];
        const v = [.022, .03, .026, .028][p.kind], cnt = p.kind === 0 ? 7 : 5;
        for (let j = 0; j < cnt; j++) { const l = wrap(t * v + j / cnt) * END, [x, y] = path(p, l, vx, vy); B.push(x, y, 1.2 + 2.6 * (1 - l)); }
        if (tb >= 0 && tb < 5) { const l = clamp(tb / 4) ** .8 * END, [x, y] = path(p, l, vx, vy); B.push(x, y, 4 * (1 - l) + 1.5); }
        bokeh(g, col, B, 1, 1);
        const [ex, ey] = path(p, END, vx, vy);
        spark(g, ex, ey, 1.2, col, .7);
      }
      const arrive = tb >= 0 && tb < 6 ? Math.exp(-((tb - 4.2) ** 2) * 1.5) : 0;
      glow(g, vx, vy, 120 + 60 * arrive, c.heat(.6), .3 + .4 * arrive);
      ember(g, c, vx, vy, .34 + .2 * arrive, t);
      done(g);
    };
  },

  // A flame handed on along a line of bearers. Each one holds it a moment, passes it to the next, and keeps only a glow;
  // the flame takes a little of each one's colour. Behind, other lines do the same in the distance.
  // Hover: the bearer you point at leans toward the light. Touch: sparks are thrown to the ones who come next.
  relay() {
    const H = 3.4, GAP = 92, r = rng(67);
    const night = sky(61, 150);
    // a bearer: a small figure of light, a head and a body of points
    const figure = [];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, q = i % 2 ? 3.2 : 1.6; figure.push(Math.cos(a) * q, -27 + Math.sin(a) * q, .55); }
    for (let i = 0; i < 80; i++) { const v = r(), w = (r() - .5) * 2; figure.push(w * (3 + 5 * Math.sin(Math.PI * Math.min(1, v * 1.15))) , -20 + v * 24, .45 + .5 * r()); }
    const flameP = Array.from({ length: 34 }, () => [r(), r() * TAU, .6 + .8 * r()]);
    const rows = [{ y: 425, k: 1.15, sp: 1, seed: 0 }, { y: 282, k: .6, sp: .83, seed: 40 }, { y: 216, k: .4, sp: .7, seed: 90 }, { y: 178, k: .27, sp: .58, seed: 140 }];
    const bearerY = (i, seed) => 30 * Math.sin(i * .83 + seed) + 14 * Math.sin(i * 2.1 + seed * 1.7);
    let lean = 0, lx = -99, ly = -99, burst = -99, lastClick = null;
    return (g, c, t, s) => {
      lean = ease(s, lean, s.x == null ? 0 : 1, .06);
      if (s.x != null) { lx = s.x; ly = s.y; }
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      light(g);
      stars(g, c, t, night, .75);
      glow(g, 300, 330, 380, c.heat(.2), .25);
      for (let ri = rows.length - 1; ri >= 0; ri--) {
        const row = rows[ri], K = row.k, tt = t * row.sp + row.seed * 1.37, n = Math.floor(tt / H), f = tt / H - n;
        const hop = smooth(.62, 1, f), flame = n + hop, cam = tt / H - .3;
        const gap = GAP * K * (ri ? 1.3 : 1), X = (i) => 300 + (i - cam) * gap, Y = (i) => row.y + bearerY(i, row.seed) * K;
        const hueOf = (i) => wrap(hash(i * 1.7 + row.seed) * .85 + i * .03), hand = (i) => [X(i), Y(i) - 30 * K];
        const i0 = Math.floor(cam - 300 / gap) - 2, i1 = Math.ceil(cam + 300 / gap) + 3, arcH = 46 * K;
        // embers left along the arcs the flame already crossed, drifting down and cooling
        const dust = bag(4);
        for (let i = Math.max(i0, n - 9); i < Math.min(n, i1); i++) {
          const [x0, y0] = hand(i), [x1, y1] = hand(i + 1), since = (n - i - 1) * H + f * H;
          for (let q = 0; q < 22; q++) {
            const v = (q + .5) / 22, j = hash(q * 3.3 + i * 7.1), fall = since * (2 + 4 * j) * K;
            const x = x0 + (x1 - x0) * v + (j - .5) * 6 * K, y = y0 + (y1 - y0) * v - Math.sin(v * Math.PI) * arcH + fall;
            const life = Math.exp(-since / (5 + 6 * j));
            if (life < .04) continue;
            dust[Math.min(3, Math.floor(life * 4))].push(x, y, (.5 + .9 * j) * K + .25);
          }
        }
        dust.forEach((L, i) => fillDots(g, c.heat(.35 + .18 * i), .25 + .2 * i, L));
        // the bearers: those who carried it keep a glow; those who wait are cool
        const B = bag(8 * 2), wait = [];
        for (let i = i0; i < i1; i++) {
          const x = X(i), near = ri === 0 && lean > .01 ? lean * Math.exp(-((x - lx) ** 2 + (Y(i) - ly) ** 2) / 2400) : 0, y = Y(i) - 6 * near;
          const since = i < n ? (n - i) * H + f * H - H * .62 : 0, held = i <= n;
          const keep = !held ? 0 : i === n ? 1 : .2 + .8 * Math.exp(-since / 7);
          const L = held ? B[Math.floor(hueOf(i) * 8) * 2 + (keep > .5 ? 1 : 0)] : wait;
          for (let j = 0; j < figure.length; j += 3) L.push(x + figure[j] * K, y + figure[j + 1] * K, figure[j + 2] * (K * .7 + .25) * (1 + .4 * near));
          if (held && keep > .3) glow(g, x, y - 14 * K, 46 * K, c.hue(hueOf(i)), .28 * keep);
          if (near > .05) glow(g, x, y - 14 * K, 34, c.heat(.7), .35 * near);
        }
        fillDots(g, c.cool(.65), .32 + .2 * lean * (ri === 0), wait);
        for (let h = 0; h < 8; h++) { fillDots(g, c.hue((h + .5) / 8), .45, B[h * 2]); fillDots(g, c.hue((h + .5) / 8), .9, B[h * 2 + 1]); }
        // the flame: held in a hand, or crossing to the next
        const a = Math.floor(flame), u = flame - a, [xa, ya] = hand(a), [xb, yb] = hand(a + 1);
        const fx = xa + (xb - xa) * u, fy = ya + (yb - ya) * u - Math.sin(u * Math.PI) * arcH;
        if (u > .01) for (let j = 1; j < 12; j++) {
          const v = Math.max(0, u - j * .028), x = xa + (xb - xa) * v, y = ya + (yb - ya) * v - Math.sin(v * Math.PI) * arcH;
          glow(g, x, y, 14 * K + 3, c.heat(.75), .32 * (1 - j / 12));
        }
        const tongue = bag(4);
        for (const [o, ph, v] of flameP) {
          const p = wrap(t * .9 * v + o), w = (1 - p) * (1 - p);
          tongue[Math.min(3, Math.floor((1 - p) * 4))].push(fx + Math.sin(t * 3 * v + ph) * 5 * K * w * (1 + 2 * Math.sin(u * Math.PI)), fy - p * 30 * K, (.6 + 1.6 * w) * K + .3);
        }
        tongue.forEach((L, i) => fillDots(g, c.heat(.45 + .17 * i), .3 + .15 * i, L));
        glow(g, fx, fy, 80 * K, c.hue(hueOf(a)), .3);
        ember(g, c, fx, fy, .5 * K, t + ri);
        // touched: sparks thrown to the ones who come next
        if (ri === 0 && t - burst >= 0 && t - burst < 2.6) {
          const tb = t - burst, L = [];
          for (let j = 1; j <= 3; j++) for (let q = 0; q < 7; q++) {
            const v = clamp(tb / (.9 + .45 * j) - q * .035), [xt, yt] = hand(a + j);
            if (v <= 0 || v >= 1) continue;
            L.push(fx + (xt - fx) * v, fy + (yt - fy) * v - Math.sin(v * Math.PI) * (50 + 28 * j), 1.4 - q * .15);
          }
          bokeh(g, c.heat(.8), L, 1, 1 - tb / 2.6);
        }
      }
      done(g);
    };
  },

  // The book turns on itself: what if all this were wrong? The vision as a globe of fibres and the web joining their tips; a slow
  // wave of doubt passes through it, and what it touches turns into dotted questions, with ghost lines drawn where things could
  // be otherwise. Then it holds again. The ember never goes out: doubt as a form of fidelity.
  // Hover: the lines under your eye are questioned. Touch: everything is doubted at once, and re-forms.
  doubt() {
    const r = rng(83), N = 300, golden = Math.PI * (3 - Math.sqrt(5)), R = 205;
    const fib = Array.from({ length: N }, (_, i) => {
      const z = 1 - (2 * (i + .5)) / N, q = Math.sqrt(1 - z * z), phi = i * golden;
      const v = [Math.cos(phi) * q, z, Math.sin(phi) * q], w = v.map((x) => x + (r() - .5) * .7), n = Math.hypot(...w);
      return { v, w: w.map((x) => x / n), ph: r() * TAU, len: .86 + .14 * r(), hue: .08 + .26 * ((z + 1) / 2) + .05 * r() };
    });
    // the web: each tip to its three nearest
    const edges = [], seen = new Set();
    fib.forEach((a, i) => {
      const d = fib.map((b, j) => [j === i ? 9 : (a.v[0] - b.v[0]) ** 2 + (a.v[1] - b.v[1]) ** 2 + (a.v[2] - b.v[2]) ** 2, j]).sort((x, y) => x[0] - y[0]);
      for (let k = 0; k < 3; k++) { const j = d[k][1], key = Math.min(i, j) * N + Math.max(i, j); if (!seen.has(key)) { seen.add(key); edges.push([i, j]); } }
    });
    const night = sky(89, 120);
    const W = 26;
    let yaw = 0, burst = -99, lastClick = null, hov = 0, hx = 300, hy = 300;
    return (g, c, t, s) => {
      yaw = ease(s, yaw, s.x == null ? 0 : ((s.x - 300) / 300) * .5, .04);
      hov = ease(s, hov, s.x == null ? 0 : 1, .06);
      if (s.x != null) { hx = ease(s, hx, s.x, .15); hy = ease(s, hy, s.y, .15); }
      if (s.click && s.click !== lastClick) { lastClick = s.click; burst = t; }
      const tb = t - burst, all = tb >= 0 ? Math.exp(-(((tb - 1.1) / .9) ** 2)) + (tb > 1.1 && tb < 5 ? (1 - smooth(1.1, 5, tb)) * .9 : 0) : 0;
      const spin = (t * TAU) / 120 + yaw, tilt = .32, cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), st = Math.sin(tilt);
      // the wave of doubt, along an axis that turns slowly
      const wa = t * .07, ax = [Math.cos(wa), Math.sin(wa * .7) * .5, Math.sin(wa)], an = Math.hypot(...ax), front = -1.6 + 3.2 * wrap(t / W);
      const rot = (p) => {
        let [x, y, z] = p;
        [x, z] = [x * cs + z * sn, -x * sn + z * cs];
        [y, z] = [y * ct - z * st, y * st + z * ct];
        return [x, y, z];
      };
      const P = fib.map((f) => {
        const [x, y, z] = rot(f.v), L = R * f.len, px = 300 + x * L, py = 300 + y * L;
        const along = (f.v[0] * ax[0] + f.v[1] * ax[1] + f.v[2] * ax[2]) / an;
        let sg = Math.exp(-(((along - front) / .32) ** 2)) * 1.1 + .25 * smooth(.6, 1, noise(t * .09 + f.ph * 3));
        if (hov > .01) sg += hov * Math.exp(-(((px - hx) ** 2) + ((py - hy) ** 2)) / 4500) * 1.3;
        sg = clamp(sg + all);
        return { x: px, y: py, z, depth: (z + 1) / 2, sg };
      });
      light(g);
      stars(g, c, t, night, .7);
      glow(g, 300, 300, 320, c.heat(.25), .35 * (1 - .4 * all));
      const HB = 16, lines = bag(HB * 3), tips = bag(HB * 3), ghosts = [], qs = [], web = bag(3), webq = [];
      fib.forEach((f, i) => {
        const p = P[i], db = Math.min(2, Math.floor(p.depth * 3)), hb = Math.floor(wrap(f.hue - .04 + .06 * Math.sin(t / 14 + f.v[0] * 2)) * HB) % HB, k = hb * 3 + db;
        const qx = 300 + (p.x - 300) * .5, qy = 300 + (p.y - 300) * .46 + 16 * (1 - Math.abs((p.y - 300) / R));
        const sure = 1 - p.sg;
        if (sure > .05) { lines[k].push(qx, qy, p.x, p.y, sure); tips[k].push(p.x, p.y, (.8 + 1.1 * p.depth) * (.4 + .6 * sure)); }
        if (p.sg > .05) {
          // the questioned line: a dotted trace, and the ghost of another possible line
          for (let j = 1; j <= 9; j++) { const [x, y] = qpt(300, 300, qx, qy, p.x, p.y, j / 9.5); qs.push(x, y, (.5 + .6 * p.depth) * p.sg); }
          const [gx, gy] = rot(f.w), L = R * f.len * (.9 + .1 * Math.sin(t * .7 + f.ph));
          ghosts.push(300 + gx * L * (.3 + .7 * p.sg), 300 + gy * L * (.3 + .7 * p.sg), p.sg, p.depth);
        }
      });
      for (const [i, j] of edges) {
        const a = P[i], b = P[j], sg = Math.max(a.sg, b.sg), d = (a.depth + b.depth) / 2;
        if (sg < .5) web[Math.min(2, Math.floor(d * 3))].push(a.x, a.y, b.x, b.y);
        else for (let q = 1; q < 4; q++) webq.push(a.x + (b.x - a.x) * q / 4, a.y + (b.y - a.y) * q / 4, .55 * d + .25);
      }
      web.forEach((L, i) => strokeLines(g, c.heat(.55 + .15 * i), .06 + .09 * i, .5 + .3 * i, L));
      fillDots(g, c.cool(.7), .35, webq);
      for (let i = 0; i < HB * 3; i++) {
        const L = lines[i], col = c.hue(((Math.floor(i / 3) + .5) / HB)), depth = (i % 3 + .5) / 3;
        if (!L.length) continue;
        g.strokeStyle = col; g.lineWidth = .4 + 1.1 * depth; g.globalAlpha = .1 + .24 * depth;
        g.beginPath();
        for (let j = 0; j < L.length; j += 5) { g.moveTo(300, 300); g.quadraticCurveTo(L[j], L[j + 1], L[j + 2], L[j + 3]); }
        g.stroke();
        bokeh(g, col, tips[i], 1.3, .45 + .5 * depth);
      }
      // what is questioned
      fillDots(g, c.cool(.8), .6, qs);
      g.strokeStyle = c.cool(.65); g.lineWidth = .6;
      for (const lv of [0, 1]) {
        g.globalAlpha = lv ? .07 : .03; g.beginPath();
        for (let j = 0; j < ghosts.length; j += 4) if ((ghosts[j + 2] > .55) === !!lv) { g.moveTo(300 + (ghosts[j] - 300) * .35, 300 + (ghosts[j + 1] - 300) * .35); g.lineTo(ghosts[j], ghosts[j + 1]); }
        g.stroke();
        g.globalAlpha = lv ? .45 : .18; g.beginPath();
        for (let j = 0; j < ghosts.length; j += 4) if ((ghosts[j + 2] > .55) === !!lv) { const rr = 2 + 2.5 * ghosts[j + 3]; g.moveTo(ghosts[j] + rr, ghosts[j + 1]); g.arc(ghosts[j], ghosts[j + 1], rr, 0, TAU); }
        g.stroke();
      }
      // fidelity: the ember holds through all of it
      ember(g, c, 300, 300, .85, t);
      done(g);
    };
  },

  // The last question. Rings of light around the ember, each with an opening; the openings drift toward alignment and almost
  // make a way through, never quite. Now and then a ray leaves the centre and goes as far as the openings let it, and where it
  // stops, it blooms. Hover: the openings turn toward you. Touch: ask again (a ray).
  why() {
    const r = rng(19), NR = 18, STR = 3, SEG = 40;
    const rings = Array.from({ length: NR }, (_, i) => {
      const k = i / (NR - 1);
      return { rad: 34 + k * 248, off: (r() - .5) * TAU * .55, wob: r() * TAU, hue: r(), sp: (r() - .5) * .3 };
    });
    const night = sky(97, 170);
    const motes = Array.from({ length: 1100 }, () => [r() * TAU, 30 + 255 * Math.sqrt(r()), (r() - .5) * .04, r() * .5 + .25, r()]);
    const W = 30, FIRE = 11;
    let aim = -Math.PI / 2, pull = 0, lastClick = null, shot = -99;
    const dA = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
    return (g, c, t, s) => {
      const target = s.x == null ? -Math.PI / 2 + .5 * Math.sin(t * TAU / 90) : Math.atan2(s.y - 300, s.x - 300);
      aim += ease(s, 0, dA(target, aim), .03);
      pull = ease(s, pull, s.x == null ? 0 : 1, .03);
      if (s.click && s.click !== lastClick) { lastClick = s.click; shot = t; }
      // how close the openings come to lining up: near, never quite
      const near = Math.min(.975, .55 + .42 * smooth(.15, .85, .5 + .5 * Math.sin((t * TAU) / W)) + .15 * pull);
      const gaps = rings.map((q, i) => {
        const g0 = aim + (1 - near) * (q.off + .4 * Math.sin(t * .05 + q.wob) + q.sp * 4 * Math.sin(t * .03 + i));
        return { a: g0 + (i === NR - 1 ? .32 : 0), w: .1 + 11 / q.rad };
      });
      light(g);
      stars(g, c, t, night, .8);
      glow(g, 300, 300, 340, c.cool(.3), .2);
      const HB = 24, arcs = bag(HB), ends = bag(HB);
      rings.forEach((q, i) => {
        const { a, w } = gaps[i], span = TAU - w, k = i / (NR - 1);
        for (let sI = 0; sI < STR; sI++) {
          const rr = q.rad + (sI - 1) * (1.4 + 1.2 * k), sub = 1 + (sI === 1 ? 0 : .015);
          for (let j = 0; j < SEG; j++) {
            const a0 = a + w / 2 * sub + (span * j) / SEG, a1 = a0 + span / SEG - (j === SEG - 1 ? w * (sub - 1) : 0);
            const h = wrap(q.hue * .3 + k * .55 + (j / SEG) * .25 + t / 70), hb = Math.floor(h * HB) % HB;
            arcs[hb].push(rr, a0, a1, sI === 1 ? 1 : 0);
          }
        }
        const h0 = Math.floor(wrap(q.hue * .3 + k * .55 + t / 70) * HB) % HB, h1 = Math.floor(wrap(q.hue * .3 + k * .55 + .25 + t / 70) * HB) % HB;
        ends[h0].push(300 + Math.cos(a + w / 2) * q.rad, 300 + Math.sin(a + w / 2) * q.rad, 1.1 + 1.2 * k);
        ends[h1].push(300 + Math.cos(a - w / 2) * q.rad, 300 + Math.sin(a - w / 2) * q.rad, 1.1 + 1.2 * k);
      });
      // countless small lights between the rings, each asking in its own way
      const MB = bag(8);
      for (const [a0, rr, w, z, h] of motes) { const a = a0 + t * w; MB[Math.floor(wrap(h * .3 + rr / 282 * .55 + t / 70) * 8)].push(300 + Math.cos(a) * rr, 300 + Math.sin(a) * rr, z); }
      MB.forEach((L, i) => fillDots(g, c.hue((i + .5) / 8), .4, L));
      for (let i = 0; i < HB; i++) {
        const col = c.hue((i + .5) / HB), L = arcs[i];
        if (!L.length) continue;
        g.strokeStyle = col;
        g.lineWidth = 6; g.globalAlpha = .05; g.beginPath();
        for (let j = 0; j < L.length; j += 4) if (L[j + 3] === 1) { g.moveTo(300 + Math.cos(L[j + 1]) * L[j], 300 + Math.sin(L[j + 1]) * L[j]); g.arc(300, 300, L[j], L[j + 1], L[j + 2]); }
        g.stroke();
        for (const mid of [0, 1]) {
          g.lineWidth = mid ? 1.3 : .5; g.globalAlpha = mid ? .5 : .22;
          g.beginPath();
          for (let j = 0; j < L.length; j += 4) if (L[j + 3] === mid) { g.moveTo(300 + Math.cos(L[j + 1]) * L[j], 300 + Math.sin(L[j + 1]) * L[j]); g.arc(300, 300, L[j], L[j + 1], L[j + 2]); }
          g.stroke();
        }
        bokeh(g, col, ends[i], 1.2, 1);
      }
      // the ray: as far as the openings let it go
      for (const t0 of [Math.floor(t / FIRE) * FIRE + 2, shot]) {
        const age = t - t0;
        if (age < 0 || age > 6) continue;
        const ra = gaps[0].a + .3 * gaps[0].w * Math.sin(t0 * 1.7);
        let stop = 300, hitR = -1;
        for (let i = 0; i < NR; i++) if (Math.abs(dA(ra, gaps[i].a)) > gaps[i].w / 2 - .01) { stop = rings[i].rad; hitR = i; break; }
        const head = Math.min(stop, 8 + age * 190), fade = 1 - smooth(3, 6, age);
        const ca = Math.cos(ra), sa = Math.sin(ra), L = [];
        for (let d = 10; d < head; d += 7) L.push(300 + ca * d, 300 + sa * d, 1.1);
        fillDots(g, c.heat(.85), .5 * fade, L);
        g.strokeStyle = c.heat(.9); g.lineWidth = 1; g.globalAlpha = .5 * fade;
        g.beginPath(); g.moveTo(300 + ca * 10, 300 + sa * 10); g.lineTo(300 + ca * head, 300 + sa * head); g.stroke();
        spark(g, 300 + ca * head, 300 + sa * head, 2.2, c.heat(.8), fade);
        if (hitR >= 0 && head >= stop) {
          const bl = clamp((age - stop / 190) * 2) * fade;
          glow(g, 300 + ca * stop, 300 + sa * stop, 130, c.hue(wrap(rings[hitR].hue * .3 + hitR / (NR - 1) * .55)), .6 * bl);
          glow(g, 300 + ca * stop, 300 + sa * stop, 34, c.heat(.9), .9 * bl);
          spark(g, 300 + ca * stop, 300 + sa * stop, 3, c.heat(.9), bl);
        }
      }
      ember(g, c, 300, 300, .7, t);
      done(g);
    };
  },
  };
};

export const FROZEN = { water: 10.5, forms: 14, gesture: 52, useful: 12.5, days: 752, silence: 12, passers: 6, relay: 8, doubt: 9, why: 37.5 };
