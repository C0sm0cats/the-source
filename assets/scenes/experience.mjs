// Figures of part III, the experience: knowing, map, choice, game, fear, love, joy, alone, words, beauty.
// Each factory returns draw(g, c, t, s); see ../scenes.mjs for the contract. Night, additive light, the banner's spectrum;
// the ember (c.mark, c.heat) is always a consciousness, "a life".
export default (K) => {
  const { TAU, rng, smooth, clamp, ease, glow, spark, light, label } = K;

  /* ---------- local helpers ---------- */
  const sky = (r, n, x0 = 0, y0 = 0, w = 600, h = 600) => Array.from({ length: n }, () => [x0 + r() * w, y0 + r() * h, .3 + r() ** 3 * 1.1, r() * TAU, 3 + r() * 5]);
  const stars = (g, c, t, list, k = 1) => {
    g.fillStyle = c.ink;
    for (const [x, y, z, ph, per] of list) {
      g.globalAlpha = k * (.05 + .32 * (.5 + .5 * Math.sin(t * TAU / per + ph)));
      g.beginPath(); g.arc(x, y, z, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
  };
  // discs on a flat list [x, y, ...] (or [x, y, k, ...] with stride 3: radius scaled by k)
  const discs = (g, pts, rad, stride = 2) => {
    g.beginPath();
    for (let i = 0; i < pts.length; i += stride) {
      const R = stride > 2 ? rad * pts[i + 2] : rad;
      if (R <= .05) continue;
      g.moveTo(pts[i] + R, pts[i + 1]); g.arc(pts[i], pts[i + 1], R, 0, TAU);
    }
    g.fill();
  };
  // a bokeh: a wide faint disc, a smaller one, a hot white core (like the tips of the banner's fibres)
  const bokeh = (g, col, pts, r, a, stride = 2) => {
    if (!pts.length || a <= 0) return;
    g.fillStyle = col;
    g.globalAlpha = a * .1; discs(g, pts, r * 3.4, stride);
    g.globalAlpha = a * .32; discs(g, pts, r * 1.35, stride);
    g.fillStyle = '#fff6ee';
    g.globalAlpha = Math.min(1, a * .85); discs(g, pts, r * .45, stride);
    g.globalAlpha = 1;
  };
  const segs = (g, list) => { g.beginPath(); for (let i = 0; i < list.length; i += 4) { g.moveTo(list[i], list[i + 1]); g.lineTo(list[i + 2], list[i + 3]); } };
  // a fibre: a wide faint pass under a thin bright one, in additive light
  const fibre = (g, col, width, alpha, path, wide = true) => {
    if (alpha <= .003) return;
    g.strokeStyle = col;
    if (wide) { g.lineWidth = width * 4; g.globalAlpha = alpha * .12; path(); g.stroke(); }
    g.lineWidth = width; g.globalAlpha = Math.min(1, alpha); path(); g.stroke();
    g.globalAlpha = 1;
  };
  const beatOf = (t) => 1 + .15 * Math.exp(-(((t % 3.4) - .45) ** 2) * 40) + .06 * Math.exp(-(((t % 3.4) - 1.3) ** 2) * 40);
  // the ember: a consciousness, a life
  const ember = (g, c, x, y, t, k = 1) => {
    const b = beatOf(t) * k;
    g.globalAlpha = 1;
    glow(g, x, y, 80 * b, c.mark, .5);
    glow(g, x, y, 22 * b, c.heat(.8), .85);
    spark(g, x, y, 4.6 * b, c.mark, 1);
  };
  const hash = (a) => { a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; };
  const clickOf = (s, st) => { if (s.click && s.click !== st.last) { st.last = s.click; return s.click; } return null; };
  const mod = (a, n) => ((a % n) + n) % n;

  return {
  // Two discs: knowledge, a perfect sphere of meridians, cold, turning, complete; life, one trace through time, hot and heavy
  // where it has been. Hover over the left half turns the sphere toward the hand and reads the node under it: its parallel
  // and meridian light up, cold, exact. Over the right half, the hand warms the stretch of life beneath it. A touch on the
  // sphere sends a cold scan across every node from the touch, and leaves nothing; on the right, the present bursts into
  // embers and the whole trace flares, lived.
  knowing(labels) {
    const r = rng(5), R = 132, LX = 152, RX = 448, Y = 285;
    const rings = [];
    for (let i = 1; i < 9; i++) { const la = -Math.PI / 2 + (i * Math.PI) / 9; rings.push(Array.from({ length: 49 }, (_, k) => { const a = (k / 48) * TAU; return [Math.cos(la) * Math.cos(a), Math.sin(la), Math.cos(la) * Math.sin(a)]; })); }
    for (let i = 0; i < 12; i++) { const lo = (i * Math.PI) / 12; rings.push(Array.from({ length: 49 }, (_, k) => { const a = (k / 48) * TAU; return [Math.cos(a) * Math.cos(lo), Math.sin(a), Math.cos(a) * Math.sin(lo)]; })); }
    const nodes = [];
    for (let i = 1; i < 9; i++) for (let j = 0; j < 24; j++) { const la = -Math.PI / 2 + (i * Math.PI) / 9, lo = (j * TAU) / 24; nodes.push([Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)]); }
    const at = (u) => {
      const x = .55 * Math.sin(u * .83 + 1) + .3 * Math.sin(u * 2.17) + .15 * Math.sin(u * 5.3 + 2);
      const y = .55 * Math.sin(u * 1.09) + .3 * Math.sin(u * 1.93 + 2) + .15 * Math.sin(u * 4.7);
      return [RX + 118 * x, Y + 118 * y];
    };
    const night = sky(r, 150);
    const st = {};
    let yaw = 0, pitch = 0, warm = 0, ping = -99, burst = -99, read = 0, ni = 1, nj = 0, hx0 = RX, hy0 = Y, px0 = LX, py0 = Y;
    return (g, c, t, s) => {
      const inL = s.x != null && s.x < 300, inR = s.x != null && s.x >= 300;
      yaw = ease(s, yaw, inL ? clamp((s.x - LX) / R, -1.3, 1.3) * 1.1 : 0, .08);
      pitch = ease(s, pitch, inL ? clamp((s.y - Y) / R, -1.3, 1.3) * .7 : 0, .08);
      warm = ease(s, warm, inR ? 1 : 0, .12);
      read = ease(s, read, inL ? 1 : 0, .15);
      if (inR) { hx0 = s.x; hy0 = s.y; }
      const hit = clickOf(s, st);
      if (hit) { if (hit[0] < 300) { ping = t; [px0, py0] = hit; } else burst = t; }
      stars(g, c, t, night, .8);
      light(g);
      /* knowledge */
      const spin = (t * TAU) / 50 + yaw, tilt = .42 + pitch, cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(tilt), stt = Math.sin(tilt);
      const P = (v) => { let [x, y, z] = v; [x, z] = [x * cs + z * sn, -x * sn + z * cs]; [y, z] = [y * ct - z * stt, y * stt + z * ct]; return [LX + x * R * .92, Y + y * R * .92, (z + 1) / 2]; };
      glow(g, LX, Y, 230, c.cool(.35), .4);
      const B = [[], [], [], []];
      for (const ring of rings) {
        let prev = P(ring[0]);
        for (let k = 1; k < ring.length; k++) { const p = P(ring[k]); B[Math.min(3, Math.floor(((p[2] + prev[2]) / 2) * 4))].push(prev[0], prev[1], p[0], p[1]); prev = p; }
      }
      B.forEach((list, b) => { fibre(g, c.cool(.5 + .12 * b), .45 + .35 * b, .1 + .17 * b, () => segs(g, list)); });
      // the scan: a meridian of brighter light sweeping the sphere, and a touch sends a parallel down it
      const lo = (t * TAU) / 9, scan = [], pg = clamp((t - ping) / 1.8);
      for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU; scan.push(P([Math.cos(a) * Math.cos(lo), Math.sin(a), Math.cos(a) * Math.sin(lo)])); }
      fibre(g, c.cool(.92), 1, .35, () => { g.beginPath(); scan.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); });
      if (pg > 0 && pg < 1) {
        const la = -Math.PI / 2 + pg * Math.PI, rim = [];
        for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU; rim.push(P([Math.cos(la) * Math.cos(a), Math.sin(la), Math.cos(la) * Math.sin(a)])); }
        fibre(g, c.cool(.97), 1.6, .9 * Math.sin(pg * Math.PI), () => { g.beginPath(); rim.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); });
      }
      const near = [], far = [], scanned = [], sf = (t - ping) * 260;
      let best = 1e9;
      nodes.forEach((v, n) => {
        const p = P(v);
        (p[2] > .5 ? near : far).push(p[0], p[1]);
        if (inL && p[2] > .45) { const d = (p[0] - s.x) ** 2 + (p[1] - s.y) ** 2; if (d < best) { best = d; ni = 1 + Math.floor(n / 24); nj = n % 24; } }
        if (sf > 0 && sf < 420) { const e = Math.exp(-(((Math.hypot(p[0] - px0, p[1] - py0) - sf) / 22) ** 2)); if (e > .05) scanned.push(p[0], p[1], e * (.5 + p[2])); }
      });
      bokeh(g, c.cool(.6), far, 1, .35);
      bokeh(g, c.cool(.8), near, 1.5, .8);
      // what the hand reads: the node under it, its parallel and its meridian, exact and cold
      if (read > .02) {
        const la = -Math.PI / 2 + (ni * Math.PI) / 9, lon = (nj * TAU) / 24, par = [], mer = [];
        for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU; par.push(P([Math.cos(la) * Math.cos(a), Math.sin(la), Math.cos(la) * Math.sin(a)])); mer.push(P([Math.cos(a) * Math.cos(lon), Math.sin(a), Math.cos(a) * Math.sin(lon)])); }
        const ring = (list) => () => { g.beginPath(); list.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); };
        fibre(g, c.cool(.95), 1.3, .75 * read, ring(par));
        fibre(g, c.cool(.95), 1.3, .75 * read, ring(mer));
        const [nx, ny] = P([Math.cos(la) * Math.cos(lon), Math.sin(la), Math.cos(la) * Math.sin(lon)]);
        glow(g, nx, ny, 60, c.cool(.8), .5 * read);
        spark(g, nx, ny, 3, c.cool(.9), read);
      }
      // a touch: a scan runs over every node from where it began, and leaves nothing behind
      if (scanned.length) { bokeh(g, c.cool(.97), scanned, 3, 1, 3); glow(g, px0, py0, 110, c.cool(.85), .5 * Math.exp(-sf / 120)); }
      // a graduated rim: everything measured
      g.strokeStyle = c.cool(.55); g.lineWidth = .6; g.globalAlpha = .45;
      g.beginPath(); g.moveTo(LX + R + 4, Y); g.arc(LX, Y, R + 4, 0, TAU);
      for (let i = 0; i < 120; i++) { const a = (i * TAU) / 120, l = i % 10 === 0 ? 10 : i % 5 === 0 ? 6 : 3; g.moveTo(LX + (R + 4) * Math.cos(a), Y + (R + 4) * Math.sin(a)); g.lineTo(LX + (R + 4 + l) * Math.cos(a), Y + (R + 4 + l) * Math.sin(a)); }
      g.stroke();
      spark(g, LX, Y, 1.8, c.cool(.8), .7);
      /* life */
      const now = t * .55, span = 90, bands = 14, pts = 120, bt = t - burst, fl = bt > 0 && bt < 3 ? Math.exp(-bt / 1.1) * clamp(bt / .12) : 0;
      glow(g, RX, Y, 230, c.heat(.3), .32 + .25 * warm + .4 * fl);
      g.strokeStyle = c.heat(.35); g.lineWidth = .8; g.globalAlpha = .25 + .15 * warm;
      g.beginPath();
      for (let k = 0; k <= 96; k++) { const a = (k / 96) * TAU, q = R + 4 + 2.5 * Math.sin(a * 5 + t * .4) + 1.5 * Math.sin(a * 11 - t * .7); k ? g.lineTo(RX + q * Math.cos(a), Y + q * Math.sin(a)) : g.moveTo(RX + q * Math.cos(a), Y + q * Math.sin(a)); }
      g.stroke();
      for (let b = 0; b < bands; b++) {
        const k = b / (bands - 1);
        fibre(g, c.heat(.12 + .78 * k ** 1.4 + .3 * fl), .5 + 1.6 * k * k, (.12 + .7 * k) * (.8 + .3 * warm) + .35 * fl * (.3 + .7 * k), () => {
          g.beginPath();
          for (let i = 0; i <= pts; i++) { const [x, y] = at(now - span + (span / bands) * (b + i / pts)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        });
      }
      // the hand on the life: the stretch of it under the hand grows hot, as if lived again
      if (warm > .02) {
        const felt = [[], []];
        for (let i = 0; i < 360; i++) {
          const [x0, y0] = at(now - span + (span * i) / 360), [x1, y1] = at(now - span + (span * (i + 1)) / 360), d = (x0 - hx0) ** 2 + (y0 - hy0) ** 2;
          if (d < 9000) felt[d < 2500 ? 1 : 0].push(x0, y0, x1, y1);
        }
        felt.forEach((list, b) => fibre(g, c.heat(.75 + .2 * b), 1.2 + .8 * b, (.45 + .4 * b) * warm, () => segs(g, list)));
        glow(g, hx0, hy0, 80, c.heat(.6), .35 * warm);
      }
      // embers shed along the way, drifting off and cooling
      const shed = [[], [], []], STEP = .45;
      for (let j = 0; j < 60; j++) {
        const n = Math.floor(now / STEP) - j, age = (now - n * STEP) / .55, h = hash(n * 7 + 3);
        if (age > 30) continue;
        const [x, y] = at(n * STEP), a = h * TAU, d = 2 + age * 1.6;
        shed[age < 4 ? 2 : age < 12 ? 1 : 0].push(x + d * Math.cos(a), y + d * Math.sin(a) - age * .6, Math.exp(-age / 14));
      }
      shed.forEach((list, i) => bokeh(g, c.heat(.45 + .2 * i), list, 1.4, .55 + .2 * i, 3));
      const [hx, hy] = at(now);
      if (bt > 0 && bt < 2.8) {
        const out = [], q = 1 - bt / 2.8;
        for (let i = 0; i < 90; i++) { const a = hash(i + 91) * TAU, v = 40 + 120 * hash(i + 17), d = v * (1 - Math.exp(-bt * 1.8)); out.push(hx + d * Math.cos(a), hy + d * Math.sin(a) + 10 * bt * bt, q * (.6 + .8 * hash(i + 5))); }
        bokeh(g, c.heat(.7), out, 2.2, 1, 3);
        glow(g, hx, hy, 170, c.heat(.7), .8 * q);
        const ring = 20 + 150 * (1 - Math.exp(-bt * 2));
        fibre(g, c.heat(.8), 1.4, .7 * q * q, () => { g.beginPath(); g.moveTo(hx + ring, hy); g.arc(hx, hy, ring, 0, TAU); });
      }
      ember(g, c, hx, hy, t, 1 + .2 * warm + .8 * fl);
      light(g, false);
      g.globalAlpha = 1;
      label(g, c, labels.knowing, LX, 468, 'center', 19);
      label(g, c, labels.living, RX, 468, 'center', 19);
    };
  },

  // A map of everything, glowing cold: contour lines, graduations, nothing missing. Across it, one walk, an ember that
  // lights the land only where it passes, and stays longest where time was spent: the weight. Hover reads the map: the
  // contours round the hand light up cold, and the whole line of its altitude shines across the map, everywhere at once,
  // known and weightless. A touch is a step taken: a cold ripple runs through the contours, and where it fell the land
  // grows warm and heavy for a few seconds, then lets go.
  map() {
    const r = rng(12), GRID = 80, X0 = 60, SIZE = 480, LEVELS = 22, PERIOD = 60;
    const hills = Array.from({ length: 9 }, () => [r(), r(), .08 + r() * .16, (r() * .8 + .4) * (r() < .3 ? -.7 : 1)]);
    const field = (x, y) => hills.reduce((sum, [hx, hy, s, h]) => sum + h * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (2 * s * s)), 0);
    const v = [];
    for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) v.push(field(i / GRID, j / GRID));
    const lo = Math.min(...v), hi = Math.max(...v);
    const levels = [], all = [];
    for (let l = 1; l < LEVELS; l++) {
      const level = lo + ((hi - lo) * l) / LEVELS, out = [];
      for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
        const c4 = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [a, b, v[b * (GRID + 1) + a]]);
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const [ax, ay, av] = c4[e], [bx, by, bv] = c4[(e + 1) % 4];
          if ((av < level) !== (bv < level)) { const f = (level - av) / (bv - av); cross.push(X0 + ((ax + (bx - ax) * f) / GRID) * SIZE, X0 + ((ay + (by - ay) * f) / GRID) * SIZE); }
        }
        for (let e = 0; e + 3 < cross.length; e += 4) { out.push(cross[e], cross[e + 1], cross[e + 2], cross[e + 3]); all.push(cross[e], cross[e + 1], cross[e + 2], cross[e + 3]); }
      }
      levels.push(out);
    }
    const walk = (u) => [X0 + 30 + 420 * u + 34 * Math.sin(u * 11 + 1) + 18 * Math.sin(u * 27), 300 + 120 * Math.sin(u * 4.2 + .6) + 46 * Math.sin(u * 13 + 2) + 14 * Math.sin(u * 31)];
    const pace = (u) => u + .035 * Math.sin(u * TAU * 7);
    const night = sky(r, 90);
    const st = {};
    let lamp = 0, lx = 300, ly = 300, ripple = -99, rx = 0, ry = 0, prints = [];
    return (g, c, t, s) => {
      const over = s.x != null;
      if (over) { lx = lamp > .01 ? ease(s, lx, s.x, .3) : s.x; ly = lamp > .01 ? ease(s, ly, s.y, .3) : s.y; }
      lamp = ease(s, lamp, over ? 1 : 0, .15);
      const hit = clickOf(s, st);
      if (hit) { ripple = t; [rx, ry] = hit; prints.push({ x: hit[0], y: hit[1], t0: t }); if (prints.length > 6) prints.shift(); }
      prints = prints.filter((p) => t - p.t0 < 4.5 && t >= p.t0);
      stars(g, c, t, night, .6);
      light(g);
      const u = (t % PERIOD) / PERIOD, now = pace(u), fade = 1 - smooth(.93, 1, u), [px, py] = walk(now);
      glow(g, 300, 300, 330, c.cool(.25), .35);
      // the frame and graduations
      g.strokeStyle = c.cool(.5); g.lineWidth = .6; g.globalAlpha = .35;
      g.beginPath(); g.rect(X0, X0, SIZE, SIZE);
      for (let i = 0; i <= 48; i++) {
        const p = X0 + (i * SIZE) / 48, len = i % 8 === 0 ? 9 : 4;
        g.moveTo(p, X0); g.lineTo(p, X0 - len); g.moveTo(p, X0 + SIZE); g.lineTo(p, X0 + SIZE + len);
        g.moveTo(X0, p); g.lineTo(X0 - len, p); g.moveTo(X0 + SIZE, p); g.lineTo(X0 + SIZE + len, p);
      }
      g.stroke();
      g.globalAlpha = .08;
      g.beginPath();
      for (let i = 1; i < 6; i++) { const p = X0 + (i * SIZE) / 6; g.moveTo(p, X0); g.lineTo(p, X0 + SIZE); g.moveTo(X0, p); g.lineTo(X0 + SIZE, p); }
      g.stroke();
      // the contours, cold, brighter with altitude
      levels.forEach((list, l) => {
        const k = l / (levels.length - 1), major = (l + 1) % 5 === 0;
        fibre(g, c.cool(.35 + .5 * k), major ? .8 : .45, (major ? .42 : .2) + .12 * k, () => segs(g, list));
      });
      // what the ember lights, what the lamp reads, what the ripple crosses
      const warmB = [[], [], []], readB = [[], []], wave = [], heavy = [[], [], []];
      const rr = (t - ripple) * 170, rOn = rr > 0 && rr < 560;
      const pr = prints.map((p) => { const a = t - p.t0, R = 30 + 90 * smooth(0, .8, a); return [p.x, p.y, R * R, (1 - smooth(1.6, 4.5, a)) * smooth(0, .15, a)]; });
      for (let i = 0; i < all.length; i += 4) {
        const mx = (all[i] + all[i + 2]) / 2, my = (all[i + 1] + all[i + 3]) / 2;
        const dw = (mx - px) ** 2 + (my - py) ** 2;
        if (dw < 8100 && fade > .02) warmB[dw < 900 ? 2 : dw < 3600 ? 1 : 0].push(all[i], all[i + 1], all[i + 2], all[i + 3]);
        if (lamp > .02) { const dl = (mx - lx) ** 2 + (my - ly) ** 2; if (dl < 14400) readB[dl < 3600 ? 1 : 0].push(all[i], all[i + 1], all[i + 2], all[i + 3]); }
        if (rOn && Math.abs(Math.hypot(mx - rx, my - ry) - rr) < 14) wave.push(all[i], all[i + 1], all[i + 2], all[i + 3]);
        for (const [x, y, R2, k] of pr) { const d = ((mx - x) ** 2 + (my - y) ** 2) / R2; if (d < 1 && k > .02) { heavy[Math.min(2, Math.floor((1 - d) * k * 3))].push(all[i], all[i + 1], all[i + 2], all[i + 3]); break; } }
      }
      readB.forEach((list, b) => fibre(g, c.cool(.88 + .1 * b), .8 + .3 * b, (.4 + .45 * b) * lamp, () => segs(g, list)));
      // the line of the hand's altitude, everywhere on the map at once
      if (lamp > .02) {
        const f = field(clamp((lx - X0) / SIZE), clamp((ly - X0) / SIZE)), l = clamp(Math.round(((f - lo) / (hi - lo)) * LEVELS) - 1, 0, levels.length - 1);
        fibre(g, c.cool(.97), 1, .7 * lamp, () => segs(g, levels[l]));
        glow(g, lx, ly, 90, c.cool(.75), .3 * lamp);
        spark(g, lx, ly, 1.6, c.cool(.9), .8 * lamp);
      }
      if (wave.length) fibre(g, c.cool(.97), 1.5, .9 * (1 - rr / 560), () => segs(g, wave));
      // where a step fell: the land under it warm and heavy for a while
      heavy.forEach((list, b) => fibre(g, c.heat(.55 + .2 * b), .9 + .5 * b, .45 + .25 * b, () => segs(g, list)));
      for (const [x, y, , k] of pr) { glow(g, x, y, 120, c.heat(.55), .45 * k); glow(g, x, y, 30, c.heat(.85), .7 * k); }
      warmB.forEach((list, b) => fibre(g, c.heat(.45 + .2 * b), .7 + .3 * b, (.25 + .3 * b) * fade, () => segs(g, list)));
      // the walk itself: dark where long ago, hot where now, heavy where it lingered
      const BANDS = 16, STEPS = 320, n = Math.ceil(STEPS / BANDS);
      for (let b = 0; b < BANDS; b++) {
        const k = b / (BANDS - 1);
        fibre(g, c.heat(.15 + .75 * k ** 1.3), 1.4 + 1.6 * k, (.25 + .6 * k) * fade, () => {
          g.beginPath();
          for (let i = 0; i <= n; i++) { const [x, y] = walk(now * ((b + i / n) / BANDS)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        });
      }
      // footprints: where the pace was slow, they gather
      const steps = [];
      for (let i = 0; i < 90; i++) { const q = (i + .5) / 90; if (q > u) break; const w = pace(q), [x, y] = walk(w), slow = 1 - (pace(q + .002) - w) / .002 / 1.25; steps.push(x, y, .4 + 1.6 * clamp(slow)); }
      bokeh(g, c.heat(.6), steps, 1.3, .6 * fade, 3);
      g.globalAlpha = 1;
      ember(g, c, px, py, t, fade);
      if (lamp > .02) glow(g, lx, ly, 70, c.cool(.8), .18 * lamp);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Behind, one settled line of embers, with the faint beginnings of the paths not taken; ahead, a fan of possibilities in
  // every colour, thousands of tips. Hover anywhere, above or below the present, and the whole future that choice would
  // open warms up to its tips. A click makes it: a flash at the touch and at the present, and the chosen fan stays lit.
  choice() {
    const DX = 34, DEPTH = 11, PAST = 8, STEP = 2.8, X0 = 214, Y0 = 300, HB = 10;
    const h = (d, j) => 4.6 * 1.25 ** d * (1 + .22 * Math.sin(j * 2.31) + .12 * Math.sin(j * .77 + 1));
    const bit = (k) => { const m = rng(k * 131 + 17); m(); return m() < .5 ? -1 : 1; };
    const turn = (d, j, code, side) => { const H = h(d, j), id = j * 64 + code; return side * H * (.75 + .55 * hash(id)) + .3 * H * (hash(id + 7919) - .5); };
    const next = (code, side) => ((code << 1) | (side > 0)) & 63;
    const edge = (g, x0, y0, x1, y1, n, end = 1) => {
      g.moveTo(x0, y0);
      const m = Math.max(1, Math.round(n * end));
      for (let i = 1; i <= m; i++) { const u = (i / m) * end; g.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u * u * (3 - 2 * u)); }
    };
    const chosen = new Map(), st = {};
    const pick = (k) => chosen.get(k) ?? bit(k);
    const night = sky(rng(8), 120);
    let lean = 0, made = -99, mx = 0, my = 0;
    return (g, c, t, s) => {
      const k = Math.floor(t / STEP), f = smooth(.25, 1, (t % STEP) / STEP);
      const hit = clickOf(s, st);
      if (hit) {
        chosen.set(f > 0 && !s.snap ? k + 2 : k + 1, hit[1] < Y0 ? -1 : 1);
        for (const key of chosen.keys()) if (key < k - PAST - 9) chosen.delete(key);
        made = t; [mx, my] = hit;
      }
      const ahead = s.x != null;
      lean = ease(s, lean, ahead ? 1 : 0, .15);
      const leanSide = ahead ? (s.y < Y0 ? -1 : 1) : 0;
      const first = pick(k + 1), codes = new Map();
      let code = 0;
      for (let j = k - PAST - 6; j <= k + 1; j++) codes.set(j, (code = next(code, pick(j))));
      const lead = turn(1 - f, k + 1, codes.get(k + 1), first), ox = X0 - f * DX, oy = Y0 - lead * smooth(0, 1, f);
      const wish = chosen.has(k + 1) || chosen.has(k + 2);
      const nk = f > 0 ? k + 2 : k + 1;
      stars(g, c, t, night, .7);
      light(g);
      glow(g, 420, 300, 300, c.hue(.62), .14);
      // ahead: buckets per depth: by hue (vertical place), plus lit (wish), leaned (hover), left behind
      const levels = Array.from({ length: DEPTH + 1 }, () => ({ hue: Array.from({ length: HB }, () => []), dim: Array.from({ length: HB }, () => []), off: [], lit: [] }));
      const tips = Array.from({ length: HB }, () => []), hot = [], leanTips = [];
      const walk = (x, y, depth, other, lit, leaned, code) => {
        for (const side of [-1, 1]) {
          const nc = next(code, side), ny = y + turn(depth - f, k + depth, nc, side), off = depth === 1 ? side !== first : other;
          const on = lit && (depth === 1 ? side === first : !chosen.has(k + depth) || chosen.get(k + depth) === side);
          const ln = leaned && (depth === 1 ? side === first : k + depth !== nk || side === leanSide);
          const L = levels[depth];
          if (off) L.off.push(x, y, x + DX, ny);
          else if (on) L.lit.push(x, y, x + DX, ny);
          else (leanSide && !ln && !wish ? L.dim : L.hue)[clamp(Math.floor(((ny - 40) / 520) * HB), 0, HB - 1)].push(x, y, x + DX, ny);
          if (depth < DEPTH) walk(x + DX, ny, depth + 1, off, on, ln, nc);
          else if (!off) {
            const ph = hash(nc * 977 + (k + depth) * 31), fl = Math.max(0, Math.sin(TAU * (t / 4.4 + ph))) ** 12;
            (on ? hot : tips[clamp(Math.floor(((ny - 40) / 520) * HB), 0, HB - 1)]).push(x + DX, ny, (.12 + 1.3 * fl) * f);
            if (ln && !on && !wish) leanTips.push(x + DX, ny, (.5 + 1.2 * fl) * f);
          }
        }
      };
      walk(ox, oy, 1, false, wish, leanSide !== 0, codes.get(k));
      for (let d = 1; d <= DEPTH; d++) {
        const L = levels[d], fadeD = .88 ** (d - f) * (d === DEPTH ? f : 1), n = d < 4 ? 8 : d < 7 ? 4 : 2, wide = d < 8;
        const draw = (list) => () => { g.beginPath(); for (let i = 0; i < list.length; i += 4) edge(g, list[i], list[i + 1], list[i + 2], list[i + 3], n); };
        L.hue.forEach((list, b) => { if (list.length) fibre(g, c.hue(.08 + .75 * (b / (HB - 1))), (d < 4 ? .9 : .6) * (1 + .4 * lean), .55 * fadeD * (1 + .8 * lean), draw(list), wide); });
        L.dim.forEach((list, b) => { if (list.length) fibre(g, c.hue(.08 + .75 * (b / (HB - 1))), .5, .55 * fadeD * (1 - .8 * lean), draw(list), false); });
        if (L.off.length) fibre(g, c.cool(.6), .6, .5 * fadeD * (1 - f), draw(L.off));
        if (L.lit.length) fibre(g, c.heat(.8), 1.1, .9 * fadeD + .1, draw(L.lit));
      }
      tips.forEach((list, b) => bokeh(g, c.hue(.08 + .75 * (b / (HB - 1))), list, 1.6, .55, 3));
      bokeh(g, c.heat(.75), hot, 2, .9, 3);
      if (lean > .02) bokeh(g, c.heat(.8), leanTips, 1.4, .6 * lean, 3);
      // a choice made: a flash where it was touched, and at the present that takes it
      const mk = t - made;
      if (mk > 0 && mk < 1.6) {
        const q = 1 - mk / 1.6;
        glow(g, mx, my, 90 + 60 * mk, c.heat(.75), .6 * q * q);
        glow(g, X0, Y0, 200, c.heat(.7), .55 * q);
      }
      // behind: the path taken, in embers, and the first steps of those that were not, cold and fading
      let x = ox, y = oy;
      const past = [];
      for (let j = k; j > k - PAST; j--) { const py = y - turn(0, j, codes.get(j), pick(j)); past.push([x - DX, py, x, y, j]); x -= DX; y = py; }
      g.strokeStyle = c.cool(.5); g.lineWidth = .5;
      past.forEach(([x0, y0, , , j], i) => {
        const age = (i + f) / PAST, side = -pick(j);
        g.globalAlpha = .4 * (1 - age) * smooth(0, 90, x0 + DX);
        if (g.globalAlpha < .01) return;
        g.beginPath();
        const ghost = (gx, gy, d, a, gc) => {
          const nc = next(gc, a), ny = gy + turn(d - 1, j + d - 1, nc, a);
          edge(g, gx, gy, gx + DX, ny, 4, d === 1 ? 1 : .9);
          if (d < 4) for (const b of [-1, 1]) ghost(gx + DX, ny, d + 1, b, nc);
        };
        ghost(x0, y0, 1, side, codes.get(j - 1));
        g.stroke();
      });
      past.forEach(([x0, y0, x1, y1], i) => {
        const age = (i + f) / PAST;
        fibre(g, c.heat(.75 - .55 * age), 2.2 - age, .9 * (1 - age * .7) * smooth(0, 60, x0 + DX), () => { g.beginPath(); edge(g, x0, y0, x1, y1, 8); });
      });
      fibre(g, c.heat(.85), 2.2, .95, () => { g.beginPath(); edge(g, ox, oy, ox + DX, oy + lead, 8, f); });
      const knots = [];
      past.forEach(([x0, y0], i) => knots.push(x0, y0, 1 - (i + f) / PAST));
      bokeh(g, c.heat(.6), knots, 2, .6, 3);
      ember(g, c, X0, Y0, t);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A board of light, seen at a slant: the rules. Embers and cold lights take turns on it; surrounded groups are lost and
  // rise as sparks: the stakes. Then the board empties and a new game begins, for nothing, in earnest. Hover snaps to the
  // nearest point of the board: its row and column light up, the rules, with its four liberties, and a stone of light
  // hovers there. A touch plays an ember there, with a wave across the board; touch a stone already on it and it is lost,
  // rising as sparks.
  game() {
    const NB = 11, MOVE = .8, M = 48, P = 46, GAMES = 3, TILT = .9, D = 1000, S = 230, Y0 = 330;
    const sims = Array.from({ length: GAMES }, (_, gi) => {
      const r = rng(70 + gi * 13), board = new Array(NB * NB).fill(null), stones = [];
      const nb = (p) => { const i = p % NB, j = (p / NB) | 0, out = []; if (i > 0) out.push(p - 1); if (i < NB - 1) out.push(p + 1); if (j > 0) out.push(p - NB); if (j < NB - 1) out.push(p + NB); return out; };
      const group = (p) => { const col = board[p].p, seen = new Set([p]), stack = [p]; let libs = 0; const libSet = new Set(); while (stack.length) { const q = stack.pop(); for (const n of nb(q)) { if (!board[n]) { if (!libSet.has(n)) { libSet.add(n); libs++; } } else if (board[n].p === col && !seen.has(n)) { seen.add(n); stack.push(n); } } } return { seen, libs }; };
      let m = 0, tries = 0;
      while (m < M && tries < 4000) {
        tries++;
        const p = 1 + (m % 2), mine = stones.filter((s) => s.t1 === Infinity);
        const foes = mine.filter((s) => s.p !== p);
        let pos;
        if (foes.length && r() < .7) { const f = foes[Math.floor(r() * foes.length)], opts = nb(f.q).filter((n) => !board[n]); if (!opts.length) continue; pos = opts[Math.floor(r() * opts.length)]; }
        else { const i = 2 + Math.floor(r() * (NB - 4)), j = 2 + Math.floor(r() * (NB - 4)); pos = j * NB + i; if (board[pos]) continue; }
        const t0 = m * MOVE + .6, stone = { q: pos, i: pos % NB, j: (pos / NB) | 0, p, t0, t1: Infinity };
        board[pos] = stone;
        const dead = [];
        for (const n of nb(pos)) if (board[n] && board[n].p !== p) { const gr = group(n); if (!gr.libs) gr.seen.forEach((q) => dead.push(q)); }
        if (!dead.length && !group(pos).libs) { board[pos] = null; continue; }
        new Set(dead).forEach((q) => { board[q].t1 = t0 + .45; board[q] = null; });
        stones.push(stone);
        m++;
      }
      return stones;
    });
    const night = sky(rng(4), 170);
    const st = {};
    let mine = [], gone = [], caps = new Map(), game = -1, hover = 0, hi = 5, hj = 5;
    return (g, c, t, s) => {
      const gi = mod(Math.floor(t / P), GAMES), tau = mod(t, P), stones = sims[gi];
      if (gi !== game) { game = gi; mine = []; gone = []; caps = new Map(); }
      const end = (o) => Math.min(o.t1, caps.get(o) ?? Infinity);
      const presence = smooth(0, 2, tau) * (1 - smooth(P - 3, P - .2, tau));
      const yaw = .16 * Math.sin((t * TAU) / 40), cy = Math.cos(yaw), sy = Math.sin(yaw);
      const proj = (u, v) => {
        const X = u * S, Z = v * S, x = X * cy - Z * sy, z = X * sy + Z * cy, depth = z * Math.cos(TILT), f = D / (D - depth);
        return [300 + x * f, Y0 + z * Math.sin(TILT) * f, f];
      };
      const grid = (i) => -1 + (2 * i) / (NB - 1);
      const at = (i, j) => proj(grid(i), grid(j));
      // which intersection is nearest to a point (anywhere: it snaps)
      const nearest = (px, py) => { let best = 1e9, n = null; for (let j = 0; j < NB; j++) for (let i = 0; i < NB; i++) { const [x, y] = at(i, j), d = (x - px) ** 2 + (y - py) ** 2; if (d < best) { best = d; n = [i, j]; } } return n; };
      const near = s.x != null ? nearest(s.x, s.y) : null;
      if (near) { hi = near[0]; hj = near[1]; }
      hover = ease(s, hover, near ? 1 : 0, .2);
      const hit = clickOf(s, st);
      const stoneAt = (i, j) => stones.find((o) => o.i === i && o.j === j && o.t0 <= tau && tau < end(o));
      const taken = (i, j) => !!stoneAt(i, j) || mine.some((o) => o.i === i && o.j === j);
      if (hit) {
        const [i, j] = nearest(hit[0], hit[1]), o = stoneAt(i, j), m = mine.findIndex((q) => q.i === i && q.j === j);
        if (o) caps.set(o, tau);
        else if (m >= 0) gone.push({ i, j, t0: t, p: 0 }), mine.splice(m, 1);
        else {
          mine.push({ i, j, t0: t });
          if (mine.length > 20) { const q = mine.shift(); gone.push({ i: q.i, j: q.j, t0: t, p: 0 }); }
        }
        gone = gone.filter((q) => t - q.t0 < 2.4 && t >= q.t0).slice(-12);
      }
      stars(g, c, t, night, .7);
      light(g);
      glow(g, 300, Y0, 340, c.cool(.3), .3);
      // the board: its rules, lines of cold light, brighter at the near edge
      const lines = [[], []];
      for (let i = 0; i < NB; i++) {
        const [ax, ay] = proj(grid(i), -1), [bx, by] = proj(grid(i), 1), [cx2, cy2] = proj(-1, grid(i)), [dx, dy] = proj(1, grid(i));
        const edgeL = i === 0 || i === NB - 1 ? 1 : 0;
        lines[edgeL].push(ax, ay, bx, by, cx2, cy2, dx, dy);
      }
      fibre(g, c.cool(.6), .7, .32, () => segs(g, lines[0]));
      fibre(g, c.cool(.75), 1.2, .55, () => segs(g, lines[1]));
      const marks = [];
      for (const [i, j] of [[2, 2], [2, 8], [8, 2], [8, 8], [5, 5]]) { const [x, y] = at(i, j); marks.push(x, y); }
      bokeh(g, c.cool(.8), marks, 1.2, .5);
      // the stones, and the ripples their placing sends through the board
      const warm = [], cold = [], rings = [], lost = [[], []];
      for (const o of stones) {
        if (o.t0 > tau) continue;
        const [x, y, f] = at(o.i, o.j), age = tau - o.t0, t1 = end(o);
        if (tau < t1) {
          (o.p === 1 ? warm : cold).push(x, y, f * presence * (1 + .6 * Math.exp(-age * 3)));
          if (age < 1.6) rings.push([o.i, o.j, age / 1.6, o.p]);
        } else if (tau - t1 < 2.4) {
          const a = (tau - t1) / 2.4;
          for (let k = 0; k < 7; k++) { const h1 = hash(o.q * 31 + k + gi * 1000), h2 = hash(o.q * 17 + k * 7 + 5); lost[o.p - 1].push(x + (h1 - .5) * 50 * a, y - (30 + 90 * h2) * a + 18 * a * a, (1 - a) * f); }
          if (a < .3) glow(g, x, y, 50 * f, o.p === 1 ? c.heat(.7) : c.cool(.8), .6 * (1 - a / .3));
        }
      }
      for (const o of mine) { const age = t - o.t0; if (age < 1.6) rings.push([o.i, o.j, age / 1.6, 0]); if (age < 2.2) rings.push([o.i, o.j, age / 2.2, 3]); }
      // stones you took back, or that were yours: they rise as sparks too
      for (const o of gone) {
        const a = (t - o.t0) / 2.4;
        if (a < 0 || a >= 1) continue;
        const [x, y, f] = at(o.i, o.j);
        for (let k = 0; k < 9; k++) { const h1 = hash(o.i * 31 + o.j * 7 + k), h2 = hash(o.j * 17 + k * 7 + 5); lost[0].push(x + (h1 - .5) * 60 * a, y - (30 + 100 * h2) * a + 18 * a * a, (1 - a) * f * 1.3); }
        if (a < .3) glow(g, x, y, 60 * f, c.heat(.8), .7 * (1 - a / .3));
      }
      // stones of one colour that touch are one group: a bond of light between them
      const live = new Map(), bonds = [[], []];
      for (const o of stones) if (o.t0 <= tau && tau < end(o)) live.set(o.q, o);
      for (const o of live.values()) for (const [di, dq] of [[1, 1], [0, NB]]) {
        const n = live.get(o.q + dq);
        if (n && n.p === o.p && (di === 0 || o.i < NB - 1)) { const [x0, y0] = at(o.i, o.j), [x1, y1] = at(n.i, n.j), k = clamp((tau - Math.max(o.t0, n.t0)) / .6); bonds[o.p - 1].push(x0, y0, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k); }
      }
      fibre(g, c.heat(.7), 2, .5 * presence, () => segs(g, bonds[0]));
      fibre(g, c.cool(.8), 2, .45 * presence, () => segs(g, bonds[1]));
      for (const [i, j, a, p] of rings) {
        const R = p === 3 ? .04 + 1.3 * smooth(0, 1, a) : .04 + .26 * a, pts = [], n = p === 3 ? 64 : 32;
        for (let k = 0; k <= n; k++) { const q = (k / n) * TAU, [x, y] = proj(grid(i) + R * Math.cos(q), grid(j) + R * Math.sin(q)); pts.push(x, y); }
        // your move's wave: a band of light across the board, and every stone it passes flares
        if (p === 3) {
          for (let k = 0; k < n; k += 4) { const u = grid(i) + R * Math.cos((k / n) * TAU), v = grid(j) + R * Math.sin((k / n) * TAU); if (Math.abs(u) < 1.05 && Math.abs(v) < 1.05) glow(g, pts[2 * k], pts[2 * k + 1], 44, c.heat(.7), .45 * (1 - a)); }
          for (const o of live.values()) { const d = Math.hypot(grid(o.i) - grid(i), grid(o.j) - grid(j)); if (Math.abs(d - R) < .15) { const [x, y, f] = at(o.i, o.j); glow(g, x, y, 50 * f, o.p === 1 ? c.heat(.8) : c.cool(.85), .7 * (1 - a) * (1 - Math.abs(d - R) / .15)); } }
        }
        fibre(g, p === 2 ? c.cool(.85) : c.heat(p === 3 ? .85 : .75), p === 3 ? 1.6 : 1, (p === 3 ? .8 : .7) * (1 - a) * (p === 3 ? 1 : presence), () => { g.beginPath(); for (let k = 0; k < pts.length; k += 2) k ? g.lineTo(pts[k], pts[k + 1]) : g.moveTo(pts[k], pts[k + 1]); });
      }
      g.globalAlpha = 1;
      for (let k = 0; k < warm.length; k += 3) glow(g, warm[k], warm[k + 1], 30 * warm[k + 2], c.mark, .5);
      for (let k = 0; k < cold.length; k += 3) glow(g, cold[k], cold[k + 1], 30 * cold[k + 2], c.cool(.65), .45);
      bokeh(g, c.heat(.7), warm, 4.2, .85, 3);
      bokeh(g, c.cool(.8), cold, 4.2, .8, 3);
      bokeh(g, c.heat(.6), lost[0], 2, .8, 3);
      bokeh(g, c.cool(.7), lost[1], 2, .8, 3);
      // your moves: embers among the others
      for (const o of mine) { const [x, y, f] = at(o.i, o.j); ember(g, c, x, y, t, .9 * f); }
      // the possible move under the pointer
      if (hover > .02) {
        // its row and its column, the rules it would be bound by, and its four liberties
        const [x, y, f] = at(hi, hj), free = !taken(hi, hj);
        // the row and column light up from the point outward, fading with distance, as the light of a stone would run
        for (let d = 1; d < NB; d++) {
          const list = [];
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const i0 = hi + di * (d - 1), j0 = hj + dj * (d - 1), i1 = hi + di * d, j1 = hj + dj * d;
            if (i1 < 0 || j1 < 0 || i1 >= NB || j1 >= NB) continue;
            const [ax, ay] = at(i0, j0), [bx, by] = at(i1, j1);
            list.push(ax, ay, bx, by);
            glow(g, bx, by, 34, c.heat(.65), .4 * hover * .8 ** (d - 1));
          }
          if (list.length) fibre(g, c.heat(.8 - .04 * d), 1.8 - .1 * d, .85 * hover * .78 ** (d - 1), () => segs(g, list));
        }
        const libs = [];
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = hi + di, j = hj + dj; if (i >= 0 && j >= 0 && i < NB && j < NB && !taken(i, j)) { const [lx, ly] = at(i, j); libs.push(lx, ly); } }
        bokeh(g, c.cool(.9), libs, 1.8, .8 * hover);
        if (free) {
          const pts = [], R = .07 + .012 * Math.sin(t * 3);
          for (let k = 0; k <= 28; k++) { const q = (k / 28) * TAU, [px, py] = proj(grid(hi) + R * Math.cos(q), grid(hj) + R * Math.sin(q)); pts.push(px, py); }
          fibre(g, c.heat(.85), 1.2, .9 * hover, () => { g.beginPath(); for (let k = 0; k < pts.length; k += 2) k ? g.lineTo(pts[k], pts[k + 1]) : g.moveTo(pts[k], pts[k + 1]); });
          // the stone held above its place, waiting
          const lift = 26 + 4 * Math.sin(t * 2.2);
          fibre(g, c.heat(.6), .6, .35 * hover, () => { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - lift * f); });
          glow(g, x, y, 110, c.heat(.6), .5 * hover);
          spark(g, x, y - lift * f, 3.4 * f, c.mark, .9 * hover);
        } else glow(g, x, y, 70, c.heat(.8), .5 * hover);
      }
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A small ember, a light behind it, and on the wall of dust the immense shadow it throws, its trembling rings magnified
  // into dark bands. A hand anywhere is a presence, a small warm light: the closer it comes, the more the rings loosen and
  // the shadow returns to its true size. A touch: courage, a light runs from the touch to the ember, it flares, and for a
  // moment the shadow shrinks.
  fear() {
    const PX = 300, PY = 476, FLOOR = 430, LX = 300, LY = 690, RINGS = 4, r = rng(17);
    const wall = [];
    for (let y = 4; y < FLOOR - 2; y += 5.8) for (let x = 2; x < 600; x += 5.8) wall.push(x + (r() - .5) * 4, y + (r() - .5) * 4, r());
    const floor = [];
    for (let k = 0; k < 24; k++) { const y = FLOOR + 4 + 166 * (k / 23) ** 1.4, gap = 4 + 6 * (k / 23); for (let x = 2; x < 600; x += gap) floor.push(x + (r() - .5) * 2, y, r()); }
    const motes = Array.from({ length: 220 }, () => { const a = -Math.PI / 2 + (r() - .5) * 1.25, q = 140 + r() * 560; return [LX + q * Math.cos(a), LY + q * Math.sin(a), .5 + r(), r() * TAU]; });
    const st = {};
    let calm = 0, flare = -99, pres = 0, hx = PX, hy = PY, fx = PX, fy = PY;
    return (g, c, t, s) => {
      const near = s.x == null ? 0 : .3 + .7 * (1 - smooth(70, 420, Math.hypot(s.x - PX, s.y - PY)));
      calm = ease(s, calm, near, .07);
      pres = ease(s, pres, s.x == null ? 0 : 1, .2);
      if (s.x != null) { hx = s.x; hy = s.y; }
      const hit = clickOf(s, st);
      if (hit) { flare = t + .3; [fx, fy] = hit; }
      const fl = t - flare > 0 ? Math.exp(-(t - flare) / 1.4) * clamp((t - flare) / .15) : 0, cl = clamp(calm + .55 * fl);
      const size = (1 - .9 * cl) * (1 + .025 * Math.sin(t * 1.3) + .015 * Math.sin(t * 2.9 + 1));
      const rings = Array.from({ length: RINGS }, (_, i) => (9 + 3.2 * i) * (1 - cl) + (16 + 15 * i) * cl + .7 * Math.sin(t * 2.2 + i * 2.1) * (1 - cl));
      const rx = 112 * size, ry = 146 * size, cx = PX + 10 * Math.sin(t * .21) * size, cy = FLOOR - ry * .9, band = 6 + 9 * size;
      const edge = (a) => 1 + .022 * Math.sin(5 * a + t * .9) + .014 * Math.sin(11 * a - t * 1.7) + .007 * Math.sin(23 * a + t * 3.1);
      const scales = cl < .6 ? rings.map((q) => q / 5.5) : [], half = band / 2 / rx, ringA = 1 - smooth(.3, .6, cl);
      const shade = (x, y) => {
        if (y > FLOOR) return 0;
        const dx = (x - cx) / rx, dy = (y - cy) / ry, e = Math.hypot(dx, dy);
        if (e < .95) return 1;
        let k = 0;
        if (e < 1.05) { k = edge(Math.atan2(dy, dx)); if (e < k) return 1; }
        for (const q of scales) {
          if (Math.abs(e - q) > half + .045 * q) continue;
          if (!k) k = edge(Math.atan2(dy, dx));
          if (Math.abs(e - q * k) < half) return 2;
        }
        return 0;
      };
      const lit = (x, y) => Math.exp(-(((x - LX) / 290) ** 2) - (((FLOOR - y) / 330) ** 2));
      light(g);
      // the wall: dust lit by the light below, warm, brightest low and in the middle; the shadow is where there is none
      const T = 6, tones = Array.from({ length: T }, () => []);
      for (let i = 0; i < wall.length; i += 3) {
        const x = wall[i], y = wall[i + 1];
        if (shade(x, y)) continue;
        const b = lit(x, y) * (.75 + .5 * wall[i + 2]) * (1 + .25 * fl);
        const k = Math.floor(b * T * .95);
        if (k >= 0 && b > .06) tones[Math.min(T - 1, k)].push(x, y);
      }
      const fl2 = Array.from({ length: T }, () => []), foot = rx * Math.sqrt(Math.max(0, 1 - ((FLOOR - cy) / ry) ** 2));
      for (let i = 0; i < floor.length; i += 3) {
        const x = floor[i], y = floor[i + 1], f = (y - FLOOR) / (PY - FLOOR), sw = f < 1 ? foot * (1 - f) + 5 * f : 0;
        if (sw && Math.abs(x - (cx + (PX - cx) * f)) < sw) continue;
        const b = Math.exp(-(((x - LX) / 300) ** 2)) * (.35 + .65 * (y - FLOOR) / 170) * (.7 + .5 * floor[i + 2]);
        if (b > .06) fl2[Math.min(T - 1, Math.floor(b * T * .95))].push(x, y);
      }
      glow(g, LX, 600, 420, c.heat(.45), .35 + .2 * fl);
      tones.forEach((list, k) => { g.fillStyle = c.heat(.3 + .55 * (k / (T - 1))); g.globalAlpha = .25 + .55 * (k / (T - 1)); discs(g, list, .7 + .5 * (k / (T - 1))); });
      fl2.forEach((list, k) => { g.fillStyle = c.heat(.3 + .5 * (k / (T - 1))); g.globalAlpha = .2 + .5 * (k / (T - 1)); discs(g, list, .6 + .4 * (k / (T - 1))); });
      // beams grazing the point and carrying its outline up the wall
      g.strokeStyle = c.heat(.6); g.lineWidth = .6; g.globalAlpha = .07;
      g.beginPath();
      for (let i = -10; i <= 10; i++) { g.moveTo(PX + i * 2, PY + 30); g.lineTo(PX + i * 31, FLOOR - 6 - Math.abs(i) * 6); }
      g.stroke();
      g.globalAlpha = .2;
      g.beginPath();
      for (const side of [-1, 1]) { g.moveTo(PX + side * 5, PY - 5); g.lineTo(cx + side * rx * edge(side > 0 ? 0 : Math.PI), cy); }
      g.stroke();
      // dust in the beam
      const dust = [];
      for (const [x, y, sz, p] of motes) { const X = x + 3 * Math.sin(t * .2 + p), Y = y + 4 * Math.sin(t * .13 + p * 2); if (!shade(X, Y)) dust.push(X, Y, sz * lit(X, Math.min(Y, FLOOR))); }
      bokeh(g, c.heat(.75), dust, 1, .5, 3);
      // the trembling outlines, in a cold violet: the edge of the great shadow and of its ring shadows
      const outline = (scale, grow, wobble) => () => {
        g.beginPath();
        let open = false;
        for (let k = 0; k <= 180; k++) {
          const a = (k / 180) * TAU, q = edge(a) * scale + grow / rx + (wobble * Math.sin(a * 17 + t * 2.4)) / rx;
          const x = cx + rx * q * Math.cos(a), y = cy + ry * q * Math.sin(a);
          if (y > FLOOR) { open = false; continue; }
          open ? g.lineTo(x, y) : g.moveTo(x, y);
          open = true;
        }
      };
      fibre(g, c.hue(.8), 1, .55, outline(1, 0, .8));
      fibre(g, c.hue(.72), .6, .25, outline(1, 4, .8));
      rings.forEach((q, i) => {
        if (ringA < .01) return;
        fibre(g, c.hue(.75), .5, (.3 - i * .05) * ringA, outline(q / 5.5, -band / 2, .5));
        fibre(g, c.hue(.75), .5, (.3 - i * .05) * ringA, outline(q / 5.5, band / 2, .5));
      });
      // the line of the floor
      fibre(g, c.heat(.5), .6, .35, () => { g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(600, FLOOR); });
      // the rings it keeps around itself: tight and trembling, they loosen when someone comes near
      rings.forEach((rad, i) => {
        fibre(g, c.hue(.78 - i * .02), .8, (.75 - i * .12) * (1 - .6 * cl), () => {
          g.beginPath();
          for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU, x = PX + rad * Math.cos(a), y = PY - 5 + rad * .42 * Math.sin(a); k ? g.lineTo(x, y) : g.moveTo(x, y); }
        });
      });
      if (fl > .01) { glow(g, PX, PY - 5, 260 * fl, c.heat(.8), .6 * fl); }
      // the presence that comes near, and the courage it carries to the ember
      if (pres > .02) { glow(g, hx, hy, 150, c.heat(.55), .35 * pres); glow(g, hx, hy, 40, c.heat(.75), .5 * pres); spark(g, hx, hy, 2.4, c.heat(.75), .8 * pres); }
      const go = t - flare + .3;
      if (go > 0 && go < .5) {
        const q = smooth(0, .3, go), x = fx + (PX - fx) * q, y = fy + (PY - 5 - fy) * q;
        glow(g, x, y, 70, c.heat(.8), .7 * (1 - go / .5) + .3);
        spark(g, x, y, 3, c.heat(.85), 1 - smooth(.3, .5, go));
        fibre(g, c.heat(.8), 1.2, .6 * (1 - go / .5), () => { g.beginPath(); g.moveTo(fx + (PX - fx) * Math.max(0, q - .35), fy + (PY - 5 - fy) * Math.max(0, q - .35)); g.lineTo(x, y); });
      }
      ember(g, c, PX, PY - 5, t, .85 + .6 * fl);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Two lives turning together, one ember, one cold star, each with its own shape; between them, the fibres of what they
  // have just lived together, brightest where they came close. Hover draws the second life toward the hand and the ties
  // under it light up. A touch: the cold star crosses over to the ember and runs alongside it for a while, every tie short
  // and bright, while a wave of light runs both ways along the ties from the one touched.
  love() {
    const STRANDS = 4, PTS = 240, TIES = 120;
    const close = (d) => Math.exp(-d / 70);
    const A = (a, t, j) => { const q = 158 + 62 * Math.cos(3 * a + t * .04) + j * 2; return [300 + q * Math.cos(a), 300 + q * Math.sin(a)]; };
    const free = (a, t, j) => { const b = a + .22 * Math.sin(2 * a + t * .07), q = 150 + 30 * Math.cos(5 * b - .8 - t * .03) + j * 2.2; return [300 + q * Math.cos(b), 300 + q * Math.sin(b)]; };
    let pull = 0, px = 300, py = 300, wave = -99, meet = 0, k0 = 1, wx = 300, wy = 300;
    const st = {};
    const B = (a, t, j) => {
      let p = free(a, t, j);
      if (pull) {
        const dx = px - p[0], dy = py - p[1], w = pull * .6 * Math.exp(-(dx * dx + dy * dy) / 16200);
        p = [p[0] + dx * w, p[1] + dy * w];
      }
      if (meet) { const q = A(a, t, j * .6); p = [p[0] + (q[0] - p[0]) * meet, p[1] + (q[1] - p[1]) * meet]; }
      return p;
    };
    const curve = (F, t, j, a0, a1, n) => () => { for (let i = 0; i <= n; i++) { const [x, y] = F(a0 + ((a1 - a0) * i) / n, t, j); i ? g0.lineTo(x, y) : g0.moveTo(x, y); } };
    let g0 = null;
    const night = sky(rng(21), 150);
    return (g, c, t, s) => {
      g0 = g;
      const near = s.x != null;
      if (near) { px = pull ? ease(s, px, s.x, .15) : s.x; py = pull ? ease(s, py, s.y, .15) : s.y; }
      pull = ease(s, pull, near ? 1 : 0, near ? .1 : .05);
      if (pull < .002 && !near) pull = 0;
      const now = t * .16, span = TAU * .85, hit = clickOf(s, st);
      if (hit) {
        wave = t; [wx, wy] = hit;
        let best = 1e9;
        for (let i = 0; i < TIES; i += 3) { const a = now - span + (span * i) / (TIES - 1), p = A(a, t, 0), q = B(a, t, 0), d = ((p[0] + q[0]) / 2 - hit[0]) ** 2 + ((p[1] + q[1]) / 2 - hit[1]) ** 2; if (d < best) { best = d; k0 = i / (TIES - 1); } }
      }
      const wt = t - wave;
      meet = wt > 0 && wt < 3.6 ? .55 * smooth(0, .9, wt) * (1 - smooth(2.4, 3.6, wt)) : 0;
      stars(g, c, t, night, .7);
      light(g);
      glow(g, 300, 300, 300, c.hue(.9), .16);
      // each one's whole shape, faint
      fibre(g, c.heat(.5), .8, .2, () => { g.beginPath(); curve(A, t, 0, 0, TAU, PTS)(); });
      fibre(g, c.cool(.6), .5, .16, () => { g.beginPath(); for (let j = -STRANDS; j <= STRANDS; j += 2) curve(B, t, j, 0, TAU, PTS)(); });
      // the ties: hue running round the spectrum, bright where they are short (together) and recent
      const HB = 12, buckets = Array.from({ length: HB * 3 }, () => []), ends = [[], []], wv = (t - wave) / 2.2;
      for (let i = 0; i < TIES; i++) {
        const k = i / (TIES - 1), a = now - span + span * k, p = A(a, t, 0), q = B(a, t, 0), d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        let lum = k ** 1.5 * (.35 + .65 * close(d)) + (wv > 0 && wv < 1.3 ? Math.exp(-(((Math.abs(k - k0) - wv * .8) / .07) ** 2)) * (1.2 - wv * .6) : 0);
        if (pull > .02) lum += .9 * pull * Math.exp(-(((p[0] + q[0]) / 2 - px) ** 2 + ((p[1] + q[1]) / 2 - py) ** 2) / 6400);
        buckets[Math.floor(mod(a / TAU + t / 40, 1) * HB) * 3 + Math.min(2, Math.floor(lum * 3))].push(p[0], p[1], q[0], q[1]);
        if (lum > .5) { ends[0].push(p[0], p[1], lum); ends[1].push(q[0], q[1], lum); }
      }
      buckets.forEach((list, b) => {
        if (!list.length) return;
        const col = c.hue((Math.floor(b / 3) + .5) / HB), lv = b % 3;
        fibre(g, col, .5 + .4 * lv, .12 + .3 * lv, () => { g.beginPath(); for (let i = 0; i < list.length; i += 4) { const mx = (list[i] + list[i + 2]) / 2, my = (list[i + 1] + list[i + 3]) / 2; g.moveTo(list[i], list[i + 1]); g.quadraticCurveTo(300 + (mx - 300) * .9, 300 + (my - 300) * .9, list[i + 2], list[i + 3]); } });
      });
      bokeh(g, c.heat(.7), ends[0], 1.4, .6, 3);
      bokeh(g, c.cool(.8), ends[1], 1.2, .6, 3);
      // their recent paths, each with its own character
      for (let band = 0; band < 8; band++) {
        const k = band / 7, a0 = now - span + (span * band) / 8, a1 = now - span + (span * (band + 1)) / 8;
        fibre(g, c.heat(.25 + .6 * k), 1 + 1.4 * k, .1 + .75 * k, () => { g.beginPath(); curve(A, t, 0, a0, a1, 30)(); });
        fibre(g, c.cool(.35 + .55 * k), .5 + .4 * k, .08 + .55 * k, () => { g.beginPath(); for (let j = -STRANDS; j <= STRANDS; j += 2) curve(B, t, j, a0, a1, 30)(); });
      }
      const [bx, by] = B(now, t, 0), [ax, ay] = A(now, t, 0);
      glow(g, bx, by, 60, c.cool(.6), .5);
      spark(g, bx, by, 4, c.cool(.75), 1);
      ember(g, c, ax, ay, t);
      if (wv > 0 && wv < 1.3) glow(g, 300, 300, 260, c.heat(.7), .25 * Math.sin(Math.PI * clamp(wv)));
      if (wt > 0 && wt < 1.2) { const q = 1 - wt / 1.2; glow(g, wx, wy, 70 + 80 * wt, c.hue(.92), .5 * q * q); spark(g, wx, wy, 2.5, c.heat(.8), q); }
      if (meet > .02) glow(g, (ax + bx) / 2, (ay + by) / 2, 120, c.heat(.75), .5 * meet);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A sunflower of lights, each its own colour, scattered and quiet. Then joy: from the heart outward, the hidden spirals
  // that bind every light to its neighbours flare up, the whole flower recognises itself and blazes, and rays leave it.
  // Hover finds the light under the hand and wakes the three spirals that pass through it, from the heart to the rim:
  // one light, and already the whole is drawn through it. A touch starts the joy from there.
  joy() {
    const N = 560, R = 236, golden = Math.PI * (3 - Math.sqrt(5)), P = 15, SPEED = 150, r = rng(44);
    const seeds = Array.from({ length: N }, (_, i) => { const q = R * Math.sqrt((i + .5) / N); return { q, a: i * golden, hue: mod((i * golden) / TAU, 1) * .9 + .1 * (q / R), tw: r() * TAU, per: 3 + r() * 5 }; });
    const links = [];
    for (let i = 0; i < N; i++) for (const d of [13, 21, 34]) if (i + d < N && (d !== 13 || i < 140)) links.push(i, i + d);
    const rays = Array.from({ length: 130 }, (_, i) => ({ a: (i / 200) * TAU + r() * .02, len: 30 + 110 * r() ** 2, hue: r() }));
    const night = sky(r, 170);
    const st = {};
    const arm = { 13: new Float32Array(N), 21: new Float32Array(N), 34: new Float32Array(N) };
    let ox = 300, oy = 300, start = -99, look = 0, lx = 300, ly = 300;
    return (g, c, t, s) => {
      const over = s.x != null;
      if (over) { lx = look > .01 ? ease(s, lx, s.x, .3) : s.x; ly = look > .01 ? ease(s, ly, s.y, .3) : s.y; }
      look = ease(s, look, over ? 1 : 0, .15);
      const hit = clickOf(s, st);
      if (hit) { start = t; [ox, oy] = hit; }
      // the joy comes by itself every P seconds from the heart, or from a touch
      const own = Math.floor(t / P) * P + 2, useClick = t - start < P * .8 && start > own - P * .2;
      const t0 = useClick ? start : own, X = useClick ? ox : 300, Y = useClick ? oy : 300, tau = t - t0;
      const front = tau * SPEED, bloom = tau > 0 ? smooth(0, .8, tau) * Math.exp(-Math.max(0, tau - 2.2) / 2.6) : 0;
      const rot = (t * TAU) / 160, breath = 1 + .02 * Math.sin((t * TAU) / 9) + .03 * bloom;
      const pos = seeds.map((o) => { const a = o.a + rot; return [300 + o.q * breath * Math.cos(a), 300 + o.q * breath * Math.sin(a)]; });
      // the spirals through the light under the hand: every 13th, 21st, 34th neighbour, inward and outward
      let i0 = -1;
      if (look > .01) {
        let best = 1e9;
        pos.forEach(([x, y], i) => { const d = (x - lx) ** 2 + (y - ly) ** 2; if (d < best) { best = d; i0 = i; } });
        for (const d of [13, 21, 34]) { const A = arm[d]; A.fill(0); for (let i = i0 % d; i < N; i += d) A[i] = .45 + .55 * Math.exp(-Math.abs(i - i0) / (d * 6)); }
      }
      const lum = (x, y) => {
        const d = Math.hypot(x - X, y - Y);
        let e = 0;
        if (tau > 0) e = Math.exp(-(((d - front) / 55) ** 2)) + (front > d ? .75 * Math.exp(-(tau - d / SPEED) / 3) : 0);
        if (look > .01) e += .7 * look * Math.exp(-(((x - lx) ** 2 + (y - ly) ** 2) / 7000));
        return e;
      };
      stars(g, c, t, night, .8);
      light(g);
      glow(g, 300, 300, 340, c.heat(.55), .12 + .45 * bloom);
      glow(g, 300, 300, 200, c.heat(.75), .05 + .4 * bloom);
      // the rays that leave it at the height of joy
      if (bloom > .02) {
        const RB = 8, rb = Array.from({ length: RB }, () => []);
        for (const ry of rays) { const a = ry.a + rot * .5, q0 = R * breath + 8, q1 = q0 + ry.len * bloom * (.7 + .3 * Math.sin(t * .9 + ry.hue * 9)); rb[Math.floor(ry.hue * RB)].push(300 + q0 * Math.cos(a), 300 + q0 * Math.sin(a), 300 + q1 * Math.cos(a), 300 + q1 * Math.sin(a)); }
        rb.forEach((list, b) => {
          fibre(g, c.hue((b + .5) / RB), .5, .3 * bloom, () => segs(g, list));
          const ends = [];
          for (let k = 0; k < list.length; k += 4) ends.push(list[k + 2], list[k + 3]);
          bokeh(g, c.hue((b + .5) / RB), ends, 1.3, .7 * bloom);
        });
      }
      // the spirals: every light bound to its neighbours; quiet, then lit by the wave
      const HB = 12, LB = 4, buckets = Array.from({ length: HB * LB }, () => []);
      for (let k = 0; k < links.length; k += 2) {
        const [x0, y0] = pos[links[k]], [x1, y1] = pos[links[k + 1]], e = lum((x0 + x1) / 2, (y0 + y1) / 2) + (look > .01 ? 1.2 * look * arm[links[k + 1] - links[k]][links[k]] : 0);
        const lv = e < .08 ? 0 : e < .35 ? 1 : e < .8 ? 2 : 3;
        buckets[Math.floor(seeds[links[k]].hue * HB) % HB * LB + lv].push(x0, y0, x1, y1);
      }
      buckets.forEach((list, b) => {
        if (!list.length) return;
        const lv = b % LB, hu = (Math.floor(b / LB) + .5) / HB;
        fibre(g, c.hue(hu), .45 + .35 * lv, [.1, .25, .45, .7][lv], () => segs(g, list), lv > 0);
        if (lv === 3) fibre(g, c.heat(.9), .5, .35, () => segs(g, list));
      });
      // the lights themselves
      const lights = Array.from({ length: HB * 2 }, () => []);
      seeds.forEach((o, i) => {
        const [x, y] = pos[i], e = lum(x, y) + (look > .01 ? look * Math.max(arm[13][i], arm[21][i], arm[34][i]) : 0), tw = .55 + .45 * Math.sin((t * TAU) / o.per + o.tw);
        lights[(Math.floor(o.hue * HB) % HB) * 2 + (e > .5 ? 1 : 0)].push(x, y, (.6 + .5 * tw) * (1 + .9 * Math.min(1.4, e)) * (1 - .35 * o.q / R));
      });
      lights.forEach((list, b) => bokeh(g, c.hue((Math.floor(b / 2) + .5) / HB), list, 1.5, b % 2 ? .95 : .55, 3));
      // the heart
      ember(g, c, 300, 300, t, 1.1 + .7 * bloom);
      if (i0 >= 0) { glow(g, pos[i0][0], pos[i0][1], 70, c.hue(seeds[i0].hue), .5 * look); spark(g, pos[i0][0], pos[i0][1], 3, c.hue(seeds[i0].hue), look); }
      if (tau > 0 && tau < 2) glow(g, X, Y, 140, c.heat(.9), .6 * (1 - tau / 2));
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // The sea at night. Above the water, islands of light, far apart, some lit, some gone dark; "you", an ember among them.
  // Below, the roots of every island go down and become one land, glowing faintly. Sometimes all are lit at once and the
  // land with them. Hover finds the island nearest the hand: it lights up and its roots shine all the way down to the land
  // it shares with yours; under the water the hand is also a lamp on the roots. A touch holds out a bridge of light from you
  // to the island touched, and beneath it, both your roots light up down to the same land.
  alone() {
    const r = rng(37), N = 15, ONE = 36, WY = 250, BED = 520, STR = 7;
    const isl = Array.from({ length: N }, (_, i) => {
      const x = 40 + ((i + .5) / N) * 520 + (r() - .5) * 18, y = WY - 6 - r() * 18;
      return { x, y, hue: r(), P: 15 + r() * 14, p: r(), size: .7 + r() * .6 };
    });
    const me = Math.floor(N / 2);
    isl[me].x = 300; isl[me].y = WY - 10;
    const strands = [];
    isl.forEach((o, i) => {
      for (let k = 0; k < STR; k++) {
        const spread = (k / (STR - 1) - .5) * 2, bx = o.x + (300 - o.x) * .35 + spread * 60 + (r() - .5) * 30;
        strands.push({ i, x0: o.x + spread * 4, bx, by: BED - 40 * Math.cos(((bx - 300) / 320) * Math.PI * .5) + (r() - .5) * 14, c1: (r() - .5) * 80, c2: (r() - .5) * 80, ph: r() * TAU });
      }
    });
    const night = sky(r, 140, 0, 0, 600, WY - 30), silt = Array.from({ length: 160 }, () => [r() * 600, WY + 10 + r() * 330, r() * TAU, .4 + r() * .7]);
    const st = {};
    const seen = new Float32Array(N);
    let lamp = 0, lx = 300, ly = 400, bridge = -99, to = 0;
    return (g, c, t, s) => {
      const over = s.x != null;
      if (over) { lx = lamp > .01 ? ease(s, lx, s.x, .25) : s.x; ly = lamp > .01 ? ease(s, ly, s.y, .25) : s.y; }
      lamp = ease(s, lamp, over ? 1 : 0, .15);
      const hit = clickOf(s, st);
      if (hit) {
        let best = 1e9;
        isl.forEach((o, i) => { if (i === me) return; const d = Math.abs(o.x - hit[0]); if (d < best) { best = d; to = i; } });
        bridge = t;
      }
      let si = -1;
      if (over) { let best = 1e9; isl.forEach((o, i) => { const d = Math.abs(o.x - s.x); if (d < best) { best = d; si = i; } }); }
      for (let i = 0; i < N; i++) seen[i] = ease(s, seen[i], i === si ? 1 : 0, .18);
      const bt = t - bridge, held = bt > 0 && bt < 8 ? smooth(0, .8, bt) * (1 - smooth(6, 8, bt)) : 0;
      const u = (t % ONE) / ONE, together = smooth(.72, .8, u) * (1 - smooth(.92, 1, u));
      const on = isl.map((o, i) => (i === me ? 1 : Math.max(Math.sin(Math.PI * ((t / o.P + o.p) % 1)) ** 6, together, bridge > 0 && i === to && t - bridge < 8 ? smooth(0, 1, t - bridge) : 0, seen[i])));
      // how strongly each island's roots are shown: seen by the hand, or joined by the bridge (yours too)
      const seenMax = Math.max(...seen), shownBy = (i) => Math.max(seen[i], i === to || i === me ? held : 0, i === me ? .6 * seenMax : 0);
      stars(g, c, t, night, .8);
      light(g);
      // the land beneath: one ridge of embers
      glow(g, 300, BED + 40, 380, c.heat(.35), .25 + .35 * together + .3 * held);
      // the roots, swaying in the current; lit near the lamp, and all lit when everyone is there
      const sway = (st0, k) => 6 * Math.sin((t * TAU) / 14 + st0.ph + k);
      const quiet = Array.from({ length: N }, () => []), shown = [];
      for (const sd of strands) {
        const o = isl[sd.i], mx = (o.x + sd.bx) / 2 + sway(sd, 0), my = (WY + sd.by) / 2;
        const d = lamp > .01 ? Math.exp(-((mx - lx) ** 2 + (my - ly) ** 2) / 12000) * lamp : 0;
        (d > .3 ? shown : quiet[sd.i]).push(sd);
      }
      const root = (list) => () => {
        g.beginPath();
        for (const sd of list) { const o = isl[sd.i]; g.moveTo(sd.x0, WY + 4); g.bezierCurveTo(sd.x0 + sd.c1 + sway(sd, 0), WY + 110, sd.bx + sd.c2 + sway(sd, 1), sd.by - 120, sd.bx, sd.by); }
      };
      quiet.forEach((list, i) => { if (list.length) fibre(g, i === me ? c.heat(.6) : c.hue(isl[i].hue), .55, (i === me ? .28 : .13) + .45 * together, root(list)); });
      if (shown.length) fibre(g, c.heat(.8), 1, .75, root(shown));
      // the roots of what is seen, or joined, shine down to the one land
      const ends = [];
      for (let i = 0; i < N; i++) {
        const k = shownBy(i);
        if (k < .02) continue;
        const list = strands.filter((sd) => sd.i === i);
        fibre(g, i === me ? c.heat(.75) : c.hue(isl[i].hue), 1.1, .8 * k, root(list));
        for (const sd of list) ends.push(sd.bx, sd.by, 1.4 * k);
      }
      if (ends.length) bokeh(g, c.heat(.8), ends, 1.6, .9, 3);
      // the bed where they meet
      const bed = [];
      for (let k = 0; k <= 60; k++) { const x = (k / 60) * 600; bed.push(x, BED - 40 * Math.cos(((x - 300) / 320) * Math.PI * .5) + 4 * Math.sin(x * .05 + t * .3)); }
      fibre(g, c.heat(.55), 1.2, .3 + .5 * together, () => { g.beginPath(); for (let k = 0; k < bed.length; k += 2) k ? g.lineTo(bed[k], bed[k + 1]) : g.moveTo(bed[k], bed[k + 1]); });
      const tipsB = [];
      for (const sd of strands) tipsB.push(sd.bx, sd.by, .6 + .8 * together);
      bokeh(g, c.heat(.6), tipsB, 1.3, .35 + .5 * together, 3);
      // silt drifting in the water
      const sil = [];
      for (const [x, y, p, z] of silt) sil.push(x + 6 * Math.sin(t * .1 + p), y + 5 * Math.sin(t * .17 + p * 3), z);
      g.fillStyle = c.cool(.6); g.globalAlpha = .3; discs(g, sil, .8, 3);
      // the surface
      fibre(g, c.cool(.6), .7, .35, () => { g.beginPath(); for (let k = 0; k <= 120; k++) { const x = k * 5, y = WY + 1.5 * Math.sin(x * .04 + t * .6) + Math.sin(x * .11 - t * .9); k ? g.lineTo(x, y) : g.moveTo(x, y); } });
      // the islands and their reflections
      const lightsB = Array.from({ length: 8 }, () => []);
      isl.forEach((o, i) => {
        if (i === me) return;
        const v = on[i];
        lightsB[Math.floor(o.hue * 8)].push(o.x, o.y, o.size * (.35 + .9 * v));
        if (v > .05) glow(g, o.x, o.y, 40 * o.size, c.hue(o.hue), .35 * v);
        g.strokeStyle = c.hue(o.hue); g.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) {
          const y = WY + 5 + k * (4 + k * 2.5), w = (8 - k * 1.6) * (.6 + .4 * Math.sin(t * 1.3 + k * 2 + i)), dx = 2 * Math.sin(t * .9 + k + i);
          g.globalAlpha = .3 * (.25 + v) * (1 - k / 4);
          g.beginPath(); g.moveTo(o.x - w + dx, y); g.lineTo(o.x + w + dx, y); g.stroke();
        }
        g.globalAlpha = 1;
      });
      lightsB.forEach((list, b) => bokeh(g, c.hue((b + .5) / 8), list, 2.6, .9, 3));
      // the visible bridge: held out above the water, from you to another
      if (bt > 0 && bt < 8) {
        const o = isl[to], a = isl[me], gr = smooth(0, .9, bt), out = 1 - smooth(6, 8, bt), mx = (a.x + o.x) / 2, my = Math.min(a.y, o.y) - 60 - Math.abs(o.x - a.x) * .25;
        const pt = (q) => { const w = 1 - q; return [w * w * a.x + 2 * w * q * mx + q * q * o.x, w * w * a.y + 2 * w * q * my + q * q * o.y]; };
        const arc = () => { g.beginPath(); for (let k = 0; k <= 40; k++) { const [x, y] = pt((k / 40) * gr); k ? g.lineTo(x, y) : g.moveTo(x, y); } };
        fibre(g, c.heat(.7), 2.4, .7 * out, arc);
        fibre(g, c.heat(.9), 1.2, .9 * out, arc);
        const [rx, ry] = pt(gr < 1 ? gr : mod(bt * .5, 1));
        glow(g, rx, ry, 50, c.heat(.75), .6 * out);
        spark(g, rx, ry, 3, c.heat(.7), out);
        if (gr >= 1 && bt < 2) glow(g, o.x, o.y, 90, c.hue(o.hue), .7 * (1 - smooth(.9, 2, bt)));
      }
      const m = isl[me];
      g.strokeStyle = c.heat(.7); g.lineWidth = 1.6;
      for (let k = 0; k < 5; k++) {
        const y = WY + 5 + k * (4 + k * 2.5), w = (14 - k * 2.4) * (.6 + .4 * Math.sin(t * 1.1 + k * 2)), dx = 2 * Math.sin(t * .8 + k);
        g.globalAlpha = .5 * (1 - k / 5);
        g.beginPath(); g.moveTo(m.x - w + dx, y); g.lineTo(m.x + w + dx, y); g.stroke();
      }
      ember(g, c, m.x, m.y, t);
      if (lamp > .02) glow(g, lx, ly, 90, ly > WY ? c.cool(.6) : c.heat(.5), .3 * lamp);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Two minds, two embers, each in a halo of its own colours, with a dark gap between them. Words cross it along arches of
  // light: each word a small braid that leaves in the colours of one and arrives in the colours of the other, losing a
  // little of itself on the way. The arches carry them across, and are what stands between. Hover on one side: that mind
  // reaches toward the hand, the arch nearest it lights up and the mind speaks along it. A touch sends a great word from
  // that side along that arch: it sheds more into the gap, and the other mind blazes as it receives it.
  words() {
    const r = rng(52), L = [150, 300], Rm = [450, 300], FIB = 170, T = 4.6, EVERY = 1.5;
    const halo = (cx, h0, h1) => Array.from({ length: FIB }, () => ({ a: r() * TAU, len: 34 + 72 * r() ** 2, curl: (r() - .5) * 1.4, hue: h0 + (h1 - h0) * r(), ph: r() * TAU }));
    const halos = [halo(L[0], .0, .17), halo(Rm[0], .5, .78)];
    const HUES = [.06, .63];
    const bridges = [-150, -80, -24, 40, 110].map((h) => ({ h, y0: 300 + h * .18 }));
    const fall = Array.from({ length: 170 }, () => [282 + r() * 36, r() * 600, 10 + r() * 22, .4 + r() * .7]);
    const night = sky(r, 150);
    const st = {};
    let events = [], lastSpeak = -99, reach = [0, 0], archA = bridges.map(() => 0), ptx = 300, pty = 300;
    const bpt = (b, from, u) => {
      const a = from ? Rm : L, z = from ? L : Rm, sx = a[0] + (from ? -46 : 46), ex = z[0] + (from ? 46 : -46), my = b.y0 + b.h * 1.0;
      const w = 1 - u; return [w * w * sx + 2 * w * u * 300 + u * u * ex, w * w * b.y0 + 2 * w * u * my + u * u * b.y0];
    };
    // the arch nearest a point: the one whose curve passes closest to it
    const archAt = (x, y) => {
      let bi = 0, best = 1e9;
      bridges.forEach((b, i) => { for (let k = 0; k <= 10; k++) { const [bx, by] = bpt(b, 0, k / 10), d = (bx - x) ** 2 + (by - y) ** 2; if (d < best) { best = d; bi = i; } } });
      return bi;
    };
    return (g, c, t, s) => {
      const hit = clickOf(s, st);
      if (hit) {
        events.push({ t0: t, from: hit[0] < 300 ? 0 : 1, b: archAt(hit[0], hit[1]), n: Math.floor(t * 100), big: 1, x: hit[0], y: hit[1] });
      }
      const side = s.x == null ? -1 : s.x < 300 ? 0 : 1, arch = side < 0 ? -1 : archAt(s.x, s.y);
      if (side >= 0) { ptx = s.x; pty = s.y; }
      reach = reach.map((v, m) => ease(s, v, m === side ? 1 : 0, .15));
      archA = archA.map((v, i) => ease(s, v, i === arch ? 1 : 0, .15));
      if (side >= 0 && t - lastSpeak > .75) { lastSpeak = t; events.push({ t0: t, from: side, b: arch, n: Math.floor(t * 100) }); }
      events = events.filter((e) => t - e.t0 < T + 2.4 && t >= e.t0).slice(-24);
      // the words that come by themselves
      const all = events.slice();
      for (let n = Math.floor((t - T - 2) / EVERY); n <= Math.floor(t / EVERY); n++) { if (n * EVERY > t) continue; all.push({ t0: n * EVERY, from: hash(n * 3 + 1) < .5 ? 0 : 1, b: Math.floor(hash(n * 5 + 2) * bridges.length), n }); }
      stars(g, c, t, night, .7);
      light(g);
      // the gap: dust falling down a dark chasm
      const dust = [];
      for (const [x, y0, v, z] of fall) dust.push(x + 2 * Math.sin(t * .3 + y0), mod(y0 + t * v, 600), z);
      g.fillStyle = c.cool(.5); g.globalAlpha = .3; discs(g, dust, .7, 3);
      // the arches
      bridges.forEach((b, bi) => {
        fibre(g, c.cool(.7 + .2 * archA[bi]), .5 + .4 * archA[bi], .22 + .4 * archA[bi], () => { g.beginPath(); for (const o of [-3, -1, 1, 3]) for (let k = 0; k <= 40; k++) { const [x, y] = bpt(b, 0, k / 40), w = o * (.4 + Math.sin((k / 40) * Math.PI) * .8); k ? g.lineTo(x, y + w) : g.moveTo(x, y + w); } });
        const beads = [];
        for (let k = 1; k < 24; k++) { const [x, y] = bpt(b, 0, k / 24); beads.push(x, y, .5 + .5 * Math.sin(t * 1.4 - k * .7 + b.h) ** 2); }
        bokeh(g, c.cool(.75), beads, .9 + .5 * archA[bi], .35 + .45 * archA[bi], 3);
      });
      // what each mind has just received makes its halo flare
      const recv = [0, 0];
      for (const e of all) { const a = (t - e.t0 - T) / (e.big ? 2.2 : 1.6); if (a > 0 && a < 1) recv[1 - e.from] = Math.max(recv[1 - e.from], (1 - a) * (e.big ? 2 : 1)); }
      // the halos: an inside no one else inhabits
      [L, Rm].forEach(([cx, cy], m) => {
        const HB = 6, buckets = Array.from({ length: HB }, () => []), tips = Array.from({ length: HB }, () => []);
        const hs = halos[m], h0 = m ? .5 : 0, h1 = m ? .78 : .17, rc = reach[m], toward = Math.atan2(pty - cy, ptx - cx);
        for (const f of hs) {
          const a = f.a + (m ? -1 : 1) * (t * TAU) / 90, l = f.len * (1 + .06 * Math.sin((t * TAU) / 8 + f.ph)) * (1 + .15 * recv[m]) * (rc > .01 ? 1 + .8 * rc * Math.max(0, Math.cos(a - toward)) ** 3 : 1);
          const tx = cx + l * Math.cos(a + f.curl * .4), ty = cy + l * Math.sin(a + f.curl * .4), qx = cx + l * .55 * Math.cos(a - f.curl * .3), qy = cy + l * .55 * Math.sin(a - f.curl * .3);
          const b = Math.min(HB - 1, Math.floor(((f.hue - h0) / (h1 - h0)) * HB));
          buckets[b].push(qx, qy, tx, ty); tips[b].push(tx, ty);
        }
        buckets.forEach((list, b) => {
          const col = c.hue(h0 + ((b + .5) / HB) * (h1 - h0));
          fibre(g, col, .55, .22 + .25 * recv[m] + .15 * rc, () => { g.beginPath(); for (let i = 0; i < list.length; i += 4) { g.moveTo(cx, cy); g.quadraticCurveTo(list[i], list[i + 1], list[i + 2], list[i + 3]); } });
          bokeh(g, col, tips[b], 1.3, .55 + .3 * recv[m]);
        });
        glow(g, cx, cy, 150 + 40 * Math.max(0, recv[m] - 1), c.hue(HUES[m]), .2 + .3 * recv[m] + .15 * rc);
      });
      // the words in flight
      for (const e of all) {
        const age = t - e.t0, u = smooth(0, 1, age / T);
        if (age < 0 || age > T) continue;
        const b = bridges[e.b], h0 = HUES[e.from], h1 = HUES[1 - e.from], dh = mod(h1 - h0 + .5, 1) - .5, hue = h0 + dh * smooth(.35, .75, u);
        const lose = 1 - .35 * smooth(.42, .58, u), col = c.hue(hue), z = e.big ? 1.9 : 1;
        if (e.big && age < 1.2) { const q = 1 - age / 1.2; glow(g, e.x, e.y, 60 + 70 * age, c.hue(h0), .55 * q * q); glow(g, e.from ? Rm[0] : L[0], 300, 120, c.hue(h0), .5 * q); }
        for (let k = 0; k < 3; k++) {
          fibre(g, col, 1.2 * z, .9 * lose, () => {
            g.beginPath();
            for (let i = 0; i <= 24; i++) {
              const q = Math.max(0, u - .17 + (.17 * i) / 24), [x, y] = bpt(b, e.from, q), [x2, y2] = bpt(b, e.from, Math.min(1, q + .01));
              const nx = -(y2 - y), ny = x2 - x, nl = Math.hypot(nx, ny) || 1, o = 7 * z * Math.sin(q * 70 + (k * TAU) / 3 + e.n) * Math.sin((i / 24) * Math.PI);
              i ? g.lineTo(x + (nx / nl) * o, y + (ny / nl) * o) : g.moveTo(x + (nx / nl) * o, y + (ny / nl) * o);
            }
          });
        }
        const [hx, hy] = bpt(b, e.from, u);
        glow(g, hx, hy, 34 * z * z, col, .5 * lose);
        spark(g, hx, hy, 2.8 * z, col, lose);
        // what falls into the gap as it crosses
        const cross = (age - T * .45) / 2.4;
        if (cross > 0 && cross < 1) {
          const lost = [];
          for (let k = 0; k < (e.big ? 16 : 6); k++) lost.push(300 + (hash(e.n * 7 + k) - .5) * 30, bpt(b, e.from, .5)[1] + 10 + 160 * cross * cross * (.6 + .6 * hash(e.n + k * 13)), 1 - cross);
          bokeh(g, c.hue(h0), lost, 1.2 * Math.sqrt(z), .7, 3);
        }
      }
      ember(g, c, L[0], L[1], t);
      ember(g, c, Rm[0], Rm[1], t + 1.7);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A harmonic figure traced in every colour, turn over turn, never quite closing; for a moment it does, perfectly, and all
  // its turns fall onto one blazing line. Hover is looking: the figure slows into closing while you look, and where the
  // gaze rests on it, the line gathers light and glows in every colour. A touch sends a shiver of light both ways round it
  // from the point touched, and every turn flashes.
  beauty() {
    const TURNS = 8, PTS = 300, PERIOD = 26, R = 232;
    const night = sky(rng(61), 160);
    const st = {};
    let look = 0, shiver = -99, gaze = 0, gv = 0, sOff = 0, sx0 = 300, sy0 = 300;
    return (g, c, t, s) => {
      look = ease(s, look, s.x != null ? 1 : 0, .06);
      gaze = ease(s, gaze, s.x != null ? 1 : 0, .2);
      const hit = clickOf(s, st);
      const u = (t % PERIOD) / PERIOD;
      const hold = Math.max(smooth(.6, .66, u) * (1 - smooth(.9, .98, u)), .92 * look);
      const delta = (.011 + .004 * Math.sin(t * .23)) * (1 - hold), phase = .45 * Math.sin(t * .07) * (1 - hold);
      const v0 = t * .012, a0 = v0 * TAU;
      const at = (v) => {
        const a = v * TAU, b = -4 * a + phase + delta * (a - a0) * 4;
        return [300 + R * (.6 * Math.sin(a) + .4 * Math.sin(b)), 300 - R * (.6 * Math.cos(a) + .4 * Math.cos(b))];
      };
      // the point of the figure nearest a point (on its newest turn)
      const onFig = (x, y) => { let best = 1e9, v = 0; for (let i = 0; i < 160; i++) { const q = v0 + TURNS / 2 - 1 + i / 160, [px, py] = at(q), d = (px - x) ** 2 + (py - y) ** 2; if (d < best) { best = d; v = q; } } return v; };
      if (hit) { shiver = t; sOff = onFig(hit[0], hit[1]) - v0; [sx0, sy0] = hit; }
      if (s.x != null) { const v = onFig(s.x, s.y) - v0; gv = gaze > .02 ? gv + (mod(v - gv + .5, 1) - .5) * (s.snap ? 1 : .35) : v; }
      const sv = (t - shiver) / 2.6, sOn = sv > 0 && sv < 1;
      stars(g, c, t, night, .8);
      light(g);
      glow(g, 300, 300, 320, c.hue(.08 + t / 80), .15 + .3 * hold + (sOn ? .3 * (1 - sv) : 0));
      // the turns, each in its own colour
      for (let n = 0; n < TURNS; n++) {
        const k = n / (TURNS - 1);
        fibre(g, c.hue(k * .85 + t / 120), .7 + .4 * k, (.16 + .3 * k) * (1 - .5 * hold) + (sOn ? .5 * (1 - sv) ** 2 : 0), () => {
          g.beginPath();
          for (let i = 0; i <= PTS; i++) { const [x, y] = at(v0 - TURNS / 2 + n + i / PTS); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        });
      }
      // closed: one line, blazing
      if (hold > .01) {
        const line = () => { g.beginPath(); for (let i = 0; i <= PTS * 2; i++) { const [x, y] = at(v0 + i / (PTS * 2)); i ? g.lineTo(x, y) : g.moveTo(x, y); } };
        fibre(g, c.heat(.75), 2.2, .7 * hold, line);
        fibre(g, c.heat(.95), .9, .9 * hold, line);
        const petals = [];
        for (let k = 0; k < 5; k++) { const [x, y] = at(v0 + k / 5 + (Math.PI - phase) / (5 * TAU) * 0); petals.push(x, y); }
        bokeh(g, c.heat(.8), petals, 2.6, hold);
      }
      // sparks shed along the figure
      const dust = [];
      for (let i = 0; i < 160; i++) { const q = hash(i * 13 + 1), [x, y] = at(v0 - TURNS / 2 + q * TURNS), tw = Math.sin((t * TAU) / (4 + 4 * hash(i)) + i) ** 8; dust.push(x, y, .4 + 1.4 * tw); }
      bokeh(g, c.hue(.12 + t / 120), dust, 1.2, .55 + .3 * hold, 3);
      // where the gaze rests: the line gathers light there, in every colour
      if (gaze > .02) {
        const w = v0 + gv;
        for (let h = 0; h < 4; h++) fibre(g, c.hue(h / 4 + t / 30), 2.2 - .4 * h, .85 * gaze * (1 - h / 5), () => { g.beginPath(); for (let i = 0; i <= 50; i++) { const [x, y] = at(w - (.09 + .04 * h) + ((.18 + .08 * h) * i) / 50); i ? g.lineTo(x, y) : g.moveTo(x, y); } });
        const [x, y] = at(w), sp = [];
        for (let k = -6; k <= 6; k++) if (k) { const [qx, qy] = at(w + k * .012); sp.push(qx, qy, 1 - Math.abs(k) / 7); }
        bokeh(g, c.heat(.85), sp, 2, gaze, 3);
        glow(g, x, y, 170, c.hue(t / 30), .6 * gaze);
        spark(g, x, y, 3, c.heat(.9), gaze);
      }
      // the shiver: from the point touched, both ways round
      if (sOn) {
        const w0 = v0 + sOff, q = 1 - sv, pts = [];
        for (const dir of [-1, 1]) {
          const head = w0 + dir * .5 * smooth(0, 1, sv);
          const col = c.hue(dir > 0 ? .58 : .78);
          fibre(g, col, 2.4, .95 * q, () => { g.beginPath(); for (let i = 0; i <= 60; i++) { const [x, y] = at(head - dir * (.2 * i) / 60); i ? g.lineTo(x, y) : g.moveTo(x, y); } });
          const [hx, hy] = at(head);
          glow(g, hx, hy, 100, col, .7 * q);
          for (let k = 1; k < 5; k++) { const [x, y] = at(head - dir * k * .03); pts.push(x, y); }
        }
        bokeh(g, c.heat(.9), pts, 2.4, q);
        if (sv < .4) glow(g, sx0, sy0, 100, c.heat(.85), .6 * (1 - sv / .4));
      }
      const [px, py] = at(v0 + TURNS / 2);
      ember(g, c, px, py, t, .9 + .3 * hold);
      light(g, false);
      g.globalAlpha = 1;
    };
  },
  };
};

export const FROZEN = { knowing: 60, map: 44, choice: 13, game: 30, fear: 6, love: 30, joy: 2.9, alone: 30, words: 9, beauty: 16.3 };
