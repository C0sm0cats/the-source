// Figures: nested, zoom, kin, lives, forgetting, time, pages, worlds, dream. Each factory returns draw(g, c, t, s); see ../scenes.mjs for the contract.
export default (K) => {
  const { TAU, rng, smooth, clamp, ease, label, glow, spark, light } = K;

  /* ---------- local helpers ---------- */
  const fr = (u) => ((u % 1) + 1) % 1;
  const hash = (i) => fr(Math.sin(i * 12.9898 + 78.233) * 43758.5453);
  // the Source's heartbeat, shared by every ember
  const beat = (t) => 1 + .16 * Math.exp(-(((t % 3.4) - .45) ** 2) * 40) + .07 * Math.exp(-(((t % 3.4) - 1.3) ** 2) * 40);
  const ember = (g, c, x, y, k, t, flare = 0) => {
    const b = beat(t) * (1 + .5 * flare);
    g.globalAlpha = 1;
    glow(g, x, y, 100 * k * b, c.mark, .5);
    glow(g, x, y, 28 * k * b, c.heat(.8), .9);
    spark(g, x, y, 5.5 * k * b, c.mark, 1);
  };
  const sky = (r, n) => Array.from({ length: n }, () => [r() * 600, r() * 600, .3 + r() ** 3 * 1.1, r() * TAU, 3 + r() * 5]);
  // twinkling stars, four alpha levels, one path each
  const drawSky = (g, c, t, stars, k = 1) => {
    const lv = [[], [], [], []];
    for (const st of stars) lv[Math.min(3, Math.floor((.5 + .5 * Math.sin(t * TAU / st[4] + st[3])) * 4))].push(st);
    g.fillStyle = c.ink;
    lv.forEach((list, i) => {
      g.globalAlpha = k * (.08 + .13 * i);
      g.beginPath();
      for (const [x, y, sz] of list) { g.moveTo(x + sz, y); g.arc(x, y, sz, 0, TAU); }
      g.fill();
    });
    g.globalAlpha = 1;
  };
  // the current path, stroked as light: a wide faint halo, then a fine bright core
  const lit = (g, color, w, a, halo = 4, ha = .14) => {
    g.strokeStyle = color;
    g.lineWidth = w * halo; g.globalAlpha = a * ha; g.stroke();
    g.lineWidth = w; g.globalAlpha = a; g.stroke();
    g.globalAlpha = 1;
  };
  const ring = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
  const discs = (g, color, a, list, rad) => {
    if (!list.length) return;
    g.fillStyle = color; g.globalAlpha = a; g.beginPath();
    for (let i = 0; i < list.length; i += 2) ring(g, list[i], list[i + 1], rad);
    g.fill();
    g.globalAlpha = 1;
  };
  // clicks as a short list of events with ages: several stack, the oldest is dropped past `cap`, each dies after `life` s
  const taps = (cap = 3, life = 4) => {
    let last = null;
    const list = [];
    return (s, t) => {
      if (s.click && s.click !== last) { last = s.click; list.push({ x: s.click[0], y: s.click[1], t0: t, age: 0 }); if (list.length > cap) list.shift(); }
      for (let i = list.length - 1; i >= 0; i--) { const a = t - list[i].t0; if (a > life || a < 0) list.splice(i, 1); else list[i].age = a; }
      return list;
    };
  };
  // the pointer, eased by time not by frame: x, y follow it, on rises to 1 while it is there (and falls when it leaves)
  const follow = (kPos = .3, kOn = .14) => {
    const p = { x: null, y: null, on: 0, dt: 1 / 60 };
    let last = null;
    return (s, t) => {
      const dt = last == null ? 1 / 60 : clamp(t - last, 0, .1); last = t; p.dt = dt;
      const a = 1 - (1 - kPos) ** (dt * 60), b = 1 - (1 - kOn) ** (dt * 60);
      p.on = ease(s, p.on, s.x == null ? 0 : 1, b);
      if (s.x != null) { p.x = p.x == null || s.snap ? s.x : p.x + (s.x - p.x) * a; p.y = p.y == null || s.snap ? s.y : p.y + (s.y - p.y) * a; }
      return p;
    };
  };
  const rate = (k, dt) => 1 - (1 - k) ** (dt * 60);
  const offscreen = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

  return {
  // Scales: circles that hold seven circles, without end. A wave of light climbs the levels like a choir. The pointer lights
  // every whole that contains the point it rests on, and a pulse keeps climbing that lineage from the smallest to the largest.
  // A touch lights the touched point's lineage level by level up to the whole (the ember answers), while a ripple crosses all levels.
  nested() {
    const OFF = Array.from({ length: 6 }, (_, i) => [Math.cos((i * TAU) / 6), Math.sin((i * TAU) / 6)]);
    const L3 = Math.log(3), stars = sky(rng(31), 150), hit = taps(4, 3.4), ptr = follow(.3, .16);
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t), px = p.x, py = p.y, seen = p.on;
      const u = ((t + 3.2) / 13) % 1, zoom = 3 ** u;
      const levels = new Map(), chain = [], rip = [], line = [];
      const visit = (x, y, R, depth) => {
        if (x + R < -4 || x - R > 604 || y + R < -4 || y - R > 604) return;
        const alpha = smooth(4.5, 18, R) * (1 - smooth(290, 820, R));
        if (alpha > .02) {
          // nearer the ember, brighter: three rings of distance per level
          const band = Math.min(2, Math.floor(Math.hypot(x - 300, y - 300) / 150)), key = Math.round(Math.log(R) * 4) * 4 + band;
          if (!levels.has(key)) levels.set(key, { R, alpha: alpha * [1, .7, .45][band], list: [] });
          levels.get(key).list.push(x, y, R);
          if (px != null && seen > .02 && (x - px) ** 2 + (y - py) ** 2 < R * R) chain.push(x, y, R, alpha);
          for (const e of ev) {
            const ra = clamp(1 - e.age / 2.6);
            if (ra > 0 && Math.abs(Math.hypot(x - e.x, y - e.y) - e.age * 230) < 26 + R * .3) rip.push(x, y, R, ra);
            if ((x - e.x) ** 2 + (y - e.y) ** 2 < R * R) {
              // the touched point's lineage, lit from the smallest whole to the largest
              const w = Math.exp(-(((Math.log(R) / L3 - 1.3 - e.age * 2.4) * 1.3) ** 2)) + .35 * smooth(0, .4, e.age) * clamp(1 - e.age / 3.4) * smooth(.15 + e.age * 2.4, e.age * 2.4 - .4, Math.log(R) / L3 - 1.3);
              if (w > .03) line.push(x, y, R, w * alpha);
            }
          }
        }
        if (depth === 0) return;
        const child = R / 3;
        visit(x, y, child, depth - 1);
        for (const [ox, oy] of OFF) visit(x + ox * child * 2, y + oy * child * 2, child, depth - 1);
      };
      visit(300, 300, 288 * zoom, 5);
      drawSky(g, c, t, stars, .8);
      light(g);
      glow(g, 300, 300, 420, c.cool(.3), .35);
      glow(g, 300, 300, 230, c.heat(.3), .3);
      g.lineCap = 'round';
      for (const { R, alpha, list } of levels.values()) {
        const lv = Math.log(R) / L3;
        // the choir: a slow wave of light climbing from the smallest to the largest
        const sing = .55 + .45 * Math.sin(lv * TAU / 2.6 - t * TAU / 9);
        const col = c.hue(fr(lv * .27 - t / 60 + .55));
        g.beginPath();
        for (let i = 0; i < list.length; i += 3) ring(g, list[i], list[i + 1], list[i + 2]);
        if (R > 14) lit(g, col, clamp(.35 + R / 110, .35, 1.6), alpha * (.35 + .55 * sing), 5, .12);
        else { g.strokeStyle = col; g.lineWidth = .7; g.globalAlpha = alpha * (.3 + .5 * sing); g.stroke(); }
        // every circle is also a point of view: a small light at its centre
        if (R < 70) {
          g.fillStyle = col;
          g.globalAlpha = alpha * (.25 + .5 * sing) * smooth(70, 30, R);
          g.beginPath();
          const d = .5 + R * .06;
          for (let i = 0; i < list.length; i += 3) ring(g, list[i], list[i + 1], d);
          g.fill();
        }
      }
      for (let i = 0; i < rip.length; i += 4) {
        g.beginPath(); ring(g, rip[i], rip[i + 1], rip[i + 2]);
        lit(g, c.heat(.75), 1.1, .8 * rip[i + 3], 5, .2);
      }
      // the lineage of the touched point: each whole that holds it, up to the largest, with a pulse that climbs it
      if (chain.length) {
        glow(g, px, py, 110, c.heat(.55), .3 * seen);
        const climb = 1.2 + fr(t / 2.2) * 5.2;
        for (let i = 0; i < chain.length; i += 4) {
          const R = chain[i + 2], a = seen * chain[i + 3], up = Math.exp(-(((Math.log(R) / L3 - climb) * 1.4) ** 2));
          g.beginPath(); ring(g, chain[i], chain[i + 1], R);
          lit(g, c.heat(.55 + .4 * clamp(1 - R / 300) + .1 * up), clamp(.8 + R / 90, .8, 2.2) * (1 + .3 * up), Math.min(1, a * (.85 + .3 * up)), 5, .16 + .06 * up);
          if (R < 120) glow(g, chain[i], chain[i + 1], R * 1.2, c.heat(.6), (.25 + .25 * up) * a);
          spark(g, chain[i], chain[i + 1], .9 + R * .012, c.heat(.7), a * (.25 + .6 * up));
        }
        spark(g, px, py, 2.4, c.heat(.8), seen);
      }
      let flare = 0;
      for (let i = 0; i < line.length; i += 4) {
        const R = line[i + 2], w = line[i + 3];
        g.beginPath(); ring(g, line[i], line[i + 1], R);
        lit(g, c.heat(.9), clamp(.9 + R / 80, .9, 2.4), Math.min(1, w), 5, .2);
        if (R < 150) glow(g, line[i], line[i + 1], R * 1.1, c.heat(.7), .3 * Math.min(1, w));
      }
      for (const e of ev) {
        spark(g, e.x, e.y, 3.2, c.heat(.85), clamp(1 - e.age / 1.2));
        flare = Math.max(flare, Math.exp(-((e.age - 2.3) ** 2) * 5) * 1.2, clamp(1 - e.age / 2.6) * smooth(0, .25, e.age) * .6);
      }
      glow(g, 300, 300, 150, c.heat(.5), .3);
      ember(g, c, 300, 300, 1.3, t, flare);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // The scale chapter's inline figure: a spiral of cells sinking toward the point, each cell holding smaller ones.
  // The light drains inward along the arms. The pointer opens the cells around it and lights the arm of the nearest one,
  // sparks sinking along it, cell after smaller cell, to the centre. A touch sends a wave down from there, riding its spiral to the point.
  zoom() {
    const n = 16, PERIOD = 9, sn = Math.sin(Math.PI / n);
    let lo = .3, hi = .99;
    for (let i = 0; i < 50; i++) { const q = (lo + hi) / 2, gap = Math.sqrt(1 + q * q - 2 * q * Math.cos(Math.PI / n)) - sn * (1 + q); if (gap > 0) lo = q; else hi = q; }
    const Q = (lo + hi) / 2, R0 = 300, TW = Math.PI / n + .4, stars = sky(rng(12), 120), hit = taps(3, 3.2), ptr = follow(.3, .16);
    const LQ = Math.log(Q), M_END = Math.log(.36 / (sn * .97) / R0) / LQ;
    // a point of the spiral: column i (any real), depth m
    const spot = (i, m) => { const rho = R0 * Q ** m, a = m * TW + (i * TAU) / n; return [300 + rho * Math.cos(a), 300 + rho * Math.sin(a), rho * sn * .97]; };
    const toSpiral = (x, y) => { const m = Math.log(Math.max(2, Math.hypot(x - 300, y - 300)) / R0) / LQ; return [((Math.atan2(y - 300, x - 300) - m * TW) * n) / TAU, m]; };
    const armPath = (g, i, m0, m1 = M_END) => { for (let m = m0, j = 0; m < m1; m += .3, j++) { const [x, y] = spot(i, m); if (j) g.lineTo(x, y); else g.moveTo(x, y); } };
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t), seen = p.on, px = p.x, py = p.y;
      const u = (t / PERIOD) % 1;
      drawSky(g, c, t, stars, .7);
      light(g);
      glow(g, 300, 300, 360, c.cool(.35), .3);
      g.lineCap = g.lineJoin = 'round';
      // the arms: one fibre per column, through the centres of its cells
      const arms = Array.from({ length: n }, () => []), rings = [];
      for (let kk = -2; kk < 46; kk++) {
        const m = kk - u, rho = R0 * Q ** m, cell = rho * sn * .97;
        if (cell < .35) break;
        const alpha = smooth(.35, 4, cell) * (1 - smooth(230, 300, rho + cell * .6));
        const off = m * TW;
        for (let i = 0; i < n; i++) { const a = off + (i * TAU) / n; arms[i].push(300 + rho * Math.cos(a), 300 + rho * Math.sin(a)); }
        if (alpha > .01) rings.push([m, rho, cell, alpha, off]);
      }
      g.globalAlpha = .1;
      arms.forEach((pts, i) => {
        g.strokeStyle = c.hue(fr(i / n * .5 + .3 - t / 70));
        g.lineWidth = 1;
        g.beginPath();
        let j = 0;
        while (j + 2 < pts.length && Math.hypot(pts[j] - 300, pts[j + 1] - 300) > 250) j += 2;
        g.moveTo(pts[j], pts[j + 1]);
        for (j += 2; j + 2 < pts.length; j += 2) g.quadraticCurveTo(pts[j], pts[j + 1], (pts[j] + pts[j + 2]) / 2, (pts[j + 1] + pts[j + 3]) / 2);
        g.globalAlpha = .07; g.lineWidth = 4; g.stroke();
        g.globalAlpha = .16; g.lineWidth = .8; g.stroke();
      });
      // each touch: a wave that starts at the touched depth and sinks, faster and faster, to the point
      const waves = ev.map((e) => { const [i, m] = toSpiral(e.x, e.y); return { i, m: Math.min(m, M_END - 6) + e.age * 3.2 + e.age * e.age * 2.6, age: e.age }; });
      const near = [];
      let best = null, bestS = 1e9;
      for (const [m, rho, cell, alpha, off] of rings) {
        const flow = .55 + .45 * Math.sin(m * .9 - t * TAU / 7);
        let boost = 1;
        for (const w of waves) boost += 1.8 * Math.exp(-((m - w.m) ** 2) / 2) * clamp(1 - w.age / 3.2);
        const col = c.hue(fr(m * .085 - t / 60 + .35)), a0 = Math.min(1, alpha * (.4 + .5 * flow) * boost);
        g.beginPath();
        const nuc = [];
        for (let i = 0; i < n; i++) {
          const a = off + (i * TAU) / n, x = 300 + rho * Math.cos(a), y = 300 + rho * Math.sin(a);
          ring(g, x, y, cell);
          if (cell > 5) ring(g, x, y, cell * .46);
          if (cell > 16) for (let j = 0; j < 6; j++) { const b = a + (j * TAU) / 6 + t * .1; ring(g, x + cell * .73 * Math.cos(b), y + cell * .73 * Math.sin(b), cell * .17); }
          nuc.push(x, y);
          if (seen > .02 && cell > 1.2) {
            const d2 = (x - px) ** 2 + (y - py) ** 2;
            if (cell > 3 && d2 < (cell + 46) ** 2) near.push(x, y, cell, a, Math.sqrt(d2));
            const sc = Math.sqrt(d2) / (cell + 8);
            if (sc < bestS) { bestS = sc; best = [i, m]; }
          }
        }
        lit(g, col, clamp(cell / 26, .35, 1.1), a0, 5, .13);
        discs(g, col, a0 * .6, nuc, Math.max(.5, cell * .16));
        if (cell > 2) discs(g, '#fff6ee', a0 * .45, nuc, Math.max(.35, cell * .06));
      }
      // the nearest cell's arm: the way down, and sparks sinking along it
      if (best) {
        const [bi, bm] = best;
        g.beginPath(); armPath(g, bi, bm);
        lit(g, c.heat(.75), 1, .55 * seen, 5, .22);
        for (let q = 0; q < 4; q++) {
          const f = fr(t * .4 + q / 4), [x, y, cl] = spot(bi, bm + f * (M_END - bm));
          spark(g, x, y, clamp(cl * .12, .5, 2.2), c.heat(.8), seen * smooth(0, .08, f) * smooth(1, .85, f));
        }
        glow(g, px, py, 90, c.heat(.6), .22 * seen);
      }
      // cells under the pointer open: their inner seven come forward
      if (near.length) {
        g.beginPath();
        const cores = [];
        for (let i = 0; i < near.length; i += 5) {
          const [x, y, cell, a, d] = near.slice(i, i + 5), o = smooth(cell + 46, cell * .5, d), k = cell * (1 + .12 * o);
          ring(g, x, y, k);
          for (let j = 0; j < 6; j++) { const b = a + (j * TAU) / 6 - t * .2, r2 = k * (.6 + .08 * o); ring(g, x + r2 * Math.cos(b), y + r2 * Math.sin(b), k * .3); cores.push(x + r2 * Math.cos(b), y + r2 * Math.sin(b)); }
          ring(g, x, y, k * .3);
          cores.push(x, y);
        }
        lit(g, c.heat(.7), 1.1, .85 * seen, 5, .22);
        discs(g, c.heat(.9), .8 * seen, cores, 1.4);
      }
      let flare = 0;
      for (const w of waves) {
        const fade = clamp(1 - w.age / 3.2);
        if (w.m < M_END) {
          const [x, y, cl] = spot(w.i, w.m);
          g.beginPath(); armPath(g, w.i, w.m - Math.min(3, w.age * 6), w.m);
          lit(g, c.heat(.8), 1.2, .7 * fade, 5, .22);
          spark(g, x, y, clamp(cl * .16, .8, 3.2), c.heat(.85), fade);
          // the whole ring of cells at that depth, sinking with it
          g.beginPath();
          for (let i = 0; i < n; i++) { const [cx, cy] = spot(w.i + i, w.m); ring(g, cx, cy, cl); if (cl > 4) ring(g, cx, cy, cl * .46); }
          lit(g, c.heat(.8), clamp(cl / 14, .6, 1.6), .9 * fade * smooth(0, .15, w.age), 5, .25);
        }
        flare = Math.max(flare, smooth(M_END - 3, M_END, w.m) * clamp(1 - (w.m - M_END) / 12) * 1.6);
      }
      for (const e of ev) { g.beginPath(); ring(g, e.x, e.y, 6 + e.age * 70); lit(g, c.heat(.7), 1, .5 * clamp(1 - e.age / 1.1), 5, .2); }
      ember(g, c, 300, 300, .8, t, flare);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Other living beings: seven forms of life around one ember, each in its own colour, each tied to the centre by fibres
  // along which light comes and goes. The pointer wakes the form it faces (it grows, brightens, its fibres run fast, the ember
  // takes its colour; on the ember itself, all wake a little). A touch on a form sends its light down to the ember, which passes
  // it on to every other form; a touch on the ember sends light to all.
  kin() {
    const r = rng(9), RING = 182;
    const poly = (g, M, pts) => { pts.forEach(([x, y], i) => { const [X, Y] = M(x, y); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); };
    const spiral = Array.from({ length: 160 }, (_, i) => { const a = (i / 159) * TAU * 3.1, q = 2.6 * Math.exp(.17 * a); return [q * Math.cos(a), q * Math.sin(a)]; });
    const septa = [];
    for (let a = TAU * 1.1; a <= TAU * 3.1; a += .42) {
      const q0 = 2.6 * Math.exp(.17 * (a - TAU)), q1 = 2.6 * Math.exp(.17 * a), bend = .25;
      septa.push(Array.from({ length: 6 }, (_, j) => { const v = j / 5, q = q0 + (q1 - q0) * v, b = a - bend * Math.sin(v * Math.PI); return [q * Math.cos(b), q * Math.sin(b)]; }));
    }
    const branches = [];
    const grow = (x, y, a, len, depth) => {
      if (depth === 0) return;
      const nx = x + len * Math.cos(a), ny = y + len * Math.sin(a);
      branches.push([x, y, nx, ny, depth]);
      grow(nx, ny, a - .42 - r() * .2, len * (.68 + r() * .1), depth - 1);
      grow(nx, ny, a + .38 + r() * .2, len * (.68 + r() * .1), depth - 1);
    };
    grow(-62, 0, 0, 30, 7);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const cells = Array.from({ length: 38 }, (_, i) => { const q = 9.5 * Math.sqrt(i + .3), a = i * golden; return [q * Math.cos(a), q * Math.sin(a), 4.6 + r() * 2.2, r() * TAU]; });
    const feathers = Array.from({ length: 30 }, (_, i) => {
      const k = i / 29, a = -1.15 + k * 1.5, len = 54 + 58 * Math.sin(k * Math.PI * .92) ** .8;
      return Array.from({ length: 9 }, (_, j) => { const v = j / 8, b = a + .35 * v * v; return [-58 + len * v * Math.cos(b), 30 + len * v * Math.sin(b) * 1.05]; });
    });
    const spines = Array.from({ length: 64 }, (_, i) => [(i / 64) * TAU, 40 + (i % 2 ? 6 : 16) + r() * 10]);
    // each form only builds its path; the light is laid on afterwards
    const forms = [
      (g, M) => { poly(g, M, spiral); for (const s of septa) poly(g, M, s); },
      (g, M, t) => {
        const sway = .05 * Math.sin(t * .55);
        for (const [x0, y0, x1, y1] of branches) {
          const A = M(x0, y0 + (sway * (x0 + 62) ** 2) / 60), B = M(x1, y1 + (sway * (x1 + 62) ** 2) / 60);
          g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
        }
      },
      (g, M, t, s) => { for (const [x, y, rad, p] of cells) { const [X, Y] = M(x, y), q = rad * s * (1 + .12 * Math.sin(t * .9 + p)); ring(g, X, Y, q); ring(g, X, Y, q * .3); } },
      (g, M, t) => {
        const flap = .9 + .1 * Math.sin(t * .8);
        for (const f of feathers) poly(g, M, f.map(([x, y]) => [-58 + (x + 58) * flap, 30 + (y - 30) * (2 - flap)]));
      },
      (g, M, t) => {
        for (let j = 0; j < 4; j++) {
          const rot = t * .05 * (j % 2 ? -1 : 1) + j * .3, q = 64 - j * 11, pts = [];
          for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU, rr = q * Math.abs(Math.cos(2.5 * a)) ** .8; pts.push([rr * Math.cos(a + rot), rr * Math.sin(a + rot)]); }
          poly(g, M, pts);
        }
      },
      (g, M, t) => {
        const bell = [];
        for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * Math.PI; bell.push([30 * Math.cos(a) * (1 + .08 * Math.sin(t * 1.2)), 36 * Math.sin(a)]); }
        poly(g, M, bell);
        for (let k = 0; k < 11; k++) {
          const y0 = -32 + k * 6.4, pts = [];
          for (let i = 0; i <= 24; i++) { const v = i / 24; pts.push([-v * (72 + 10 * Math.sin(k * 1.7)), y0 * (1 - .4 * v) + 7 * v * Math.sin(v * 7 - t * 1.3 + k * .6)]); }
          poly(g, M, pts);
        }
      },
      (g, M, t, s) => {
        const rot = t * .04, [X, Y] = M(0, 0);
        ring(g, X, Y, 40 * s); ring(g, X, Y, 30 * s);
        for (const [a, len] of spines) { const b = a + rot; const A = M(40 * Math.cos(b), 40 * Math.sin(b)), B = M(len * Math.cos(b), len * Math.sin(b)); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); }
        for (let i = 0; i < 24; i++) { const b = (i / 24) * TAU - rot * 2, P = M(18 * Math.cos(b), 18 * Math.sin(b)); ring(g, P[0], P[1], 2.6 * s); }
      },
    ];
    const F = forms.length, HUES = forms.map((_, i) => fr(.02 + i / F));
    const pace = forms.map(() => [.25 + r() * .9, r() * TAU]);
    // the fibres: a loose bundle from the ember to each form, landing all over its body
    const fibres = forms.map(() => Array.from({ length: 22 }, () => ({ ex: -46 + r() * 92, ey: (r() - .5) * 80, bend: (r() - .5) * 70, ph: r() * 9, per: 7 + r() * 6 })));
    const stars = sky(rng(4), 150), hit = taps(3, 3.6), ptr = follow(.3, .16), wake = forms.map(() => 0);
    // which form a point faces (-1 near the ember), and how squarely
    const facing = (x, y) => { const a = Math.atan2(y - 300, x - 300) + Math.PI / 2; return fr(a / TAU) * F; };
    const along = (x0, y0, qx, qy, ex, ey, v) => { const q = 1 - v; return [q * q * x0 + 2 * q * v * qx + v * v * ex, q * q * y0 + 2 * q * v * qy + v * v * ey]; };
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t);
      // the pointer wakes the form it faces, a little its neighbours; resting on the ember, it wakes them all a little
      const pd = p.x == null ? 0 : Math.hypot(p.x - 300, p.y - 300), side = smooth(25, 85, pd), fa = p.x == null ? 0 : facing(p.x, p.y);
      forms.forEach((_, i) => {
        let d = Math.abs(fa - i); d = Math.min(d, F - d);
        const goal = s.x == null ? 0 : side * clamp(1.15 - d * .9) ** 1.5 + (1 - side) * .5;
        wake[i] = ease(s, wake[i], goal, rate(.12, p.dt));
      });
      // touches: the touched form sends its light down its fibres to the ember, which passes it on to every other form
      const evs = ev.map((e) => {
        const src = Math.hypot(e.x - 300, e.y - 300) > 60 ? Math.round(facing(e.x, e.y)) % F : -1, lag = src < 0 ? 0 : .65;
        return { src, up: src < 0 ? -1 : e.age / lag, out: (e.age - lag) / 1.1, age: e.age };
      });
      drawSky(g, c, t, stars, .8);
      light(g);
      glow(g, 300, 300, 300, c.heat(.25), .35);
      g.lineCap = g.lineJoin = 'round';
      let flare = 0;
      for (const e of evs) flare = Math.max(flare, e.src < 0 ? clamp(1 - e.age / 1.2) : Math.exp(-((e.up - 1) ** 2) * 10) * 1.2);
      forms.forEach((draw, i) => {
        const a = -Math.PI / 2 + (i * TAU) / F, [w, p] = pace[i], wk = wake[i];
        const sc = .8 * (1 + .06 * Math.sin(t * w + p)) * (1 + .14 * wk), ca = Math.cos(a), sa = Math.sin(a);
        const cx = 300 + RING * ca, cy = 300 + RING * sa, col = c.hue(HUES[i]);
        const M = (x, y) => [cx + sc * (x * ca - y * sa), cy + sc * (x * sa + y * ca)];
        let arrive = 0, fire = 0;
        const sends = [];
        for (const e of evs) {
          if (e.out > 0 && e.out < 1.6 && e.src !== i) { arrive = Math.max(arrive, Math.exp(-((e.out - 1) ** 2) * 14)); if (e.out < 1) sends.push(e.out); }
          if (e.src === i) { fire = Math.max(fire, Math.exp(-e.age * 1.6) * smooth(0, .08, e.age)); if (e.up < 1) sends.push(1 - e.up); }
        }
        // fibres and the light running along them
        g.beginPath();
        const runs = [], tips = [], hot = [];
        for (const f of fibres[i]) {
          const [ex, ey] = M(f.ex, f.ey), qx = 300 + (cx - 300) * .45 - sa * f.bend, qy = 300 + (cy - 300) * .45 + ca * f.bend;
          g.moveTo(300, 300); g.quadraticCurveTo(qx, qy, ex, ey);
          const per = f.per / (1 + 2.4 * wk), ph = fr((t + f.ph) / per), back = Math.floor((t + f.ph) / per) % 2;
          const v = back ? 1 - ph : ph;
          runs.push(...along(300, 300, qx, qy, ex, ey, v));
          for (const v2 of sends) if (v2 > .12) hot.push(...along(300, 300, qx, qy, ex, ey, v2));
          tips.push(ex, ey);
        }
        const lift = Math.max(arrive, fire);
        lit(g, col, .55 + .3 * wk, .14 + .4 * wk + .35 * lift, 5, .25);
        discs(g, col, .5 + .4 * wk, runs, 1.8 + .8 * wk);
        discs(g, '#fff6ee', .35 + .5 * wk, runs, .7 + .3 * wk);
        discs(g, col, .12 + .3 * wk + .4 * lift, tips, 4);
        if (hot.length) { discs(g, col, .7, hot, 3); discs(g, '#fff6ee', .9, hot, 1.2); }
        // the form itself, drawn in light
        glow(g, cx, cy, 120 * sc, col, .16 + .3 * wk + .35 * lift);
        g.beginPath();
        draw(g, M, t, sc);
        lit(g, col, .7 + .4 * wk + .4 * fire, Math.min(1, .55 + .4 * wk + .4 * lift), 5, .16 + .06 * wk);
        g.lineWidth = .35 + .25 * wk; g.strokeStyle = '#fff6ee'; g.globalAlpha = .18 + .45 * wk + .3 * lift; g.stroke();
        // the ember takes the colour of the forms that are awake
        if (wk > .02) glow(g, 300, 300, 70, col, .4 * wk);
      });
      if (p.on > .02) glow(g, p.x, p.y, 80, c.heat(.6), .18 * p.on);
      ember(g, c, 300, 300, 1, t, flare);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Several lives at once: a grid of lives, each tracing its own figure in its own colour, from 25 to more than can be counted.
  // Light flows inward from all of them to the one ember. The pointer picks out the life it rests on: it brightens (and its
  // neighbours), its thread to the ember lights with light running home, and from a thousand on a lens shows it up close (no two
  // alike, even at a hundred thousand). A touch sends that life's light to the centre, and the ember answers with a wave that
  // lights every life on its way out.
  lives(labels, options) {
    const steps = [25, 100, 1000, 10000, 100000, Infinity];
    const seed = (i) => ({ a: 1 + Math.floor(hash(i) * 4), b: 2 + Math.floor(hash(i + .37) * 5), p: hash(i + .71) * TAU, s: hash(i + .13) * .45 + .3, h: hash(i + .53) });
    const liss = (sd, x, y, rad, t, a) => [x + rad * Math.sin(sd.a * a + sd.p + t * sd.s * .35), y + rad * Math.sin(sd.b * a + t * sd.s * .2)];
    const HB = 16, hit = taps(3, 3.6), ptr = follow(.35, .16);
    let side = 5, cache = null, field = null, cacheN = 0;
    // the dense grids are painted once into an image, then lit by the moving waves
    const paintGrid = (n) => {
      const S = 2, cv = cache || offscreen(600 * S, 600 * S), x = cv.getContext('2d'), cell = 600 / n, size = Math.max(.5, cell * .5), mid = (n - 1) / 2;
      x.clearRect(0, 0, 600 * S, 600 * S);
      // by colour and by distance: the far lives fade into the night
      const DB = 5, groups = Array.from({ length: HB * DB }, () => []);
      for (let i = 0; i < n * n; i++) {
        const gx = i % n, gy = Math.floor(i / n);
        if (gx === mid && gy === mid) continue;
        const d = Math.hypot(gx - mid, gy - mid) * cell;
        groups[Math.min(DB - 1, Math.floor(d / 90)) * HB + Math.floor(hash(i + .53) * HB)].push(i);
      }
      groups.forEach((list, b) => {
        if (!list.length) return;
        x.fillStyle = TABLE[b % HB];
        x.globalAlpha = 1 - .17 * Math.floor(b / HB);
        x.beginPath();
        for (const i of list) x.rect(((i % n) + .5) * cell * S - size * S / 2, (Math.floor(i / n) + .5) * cell * S - size * S / 2, size * S, size * S);
        x.fill();
      });
      cache = cv; cacheN = n;
    };
    const paintField = () => {
      const W = 360, cv = offscreen(W, W), x = cv.getContext('2d'), img = x.createImageData(W, W), rgbs = TABLE.map((s) => s.match(/\d+/g).map(Number));
      for (let i = 0; i < W * W; i++) {
        const col = rgbs[Math.floor(hash(i * 1.7 + .3) * HB)], v = hash(i + .9) ** 3, d = Math.hypot(i % W - W / 2, Math.floor(i / W) - W / 2) / (W / 2);
        img.data[i * 4] = col[0]; img.data[i * 4 + 1] = col[1]; img.data[i * 4 + 2] = col[2]; img.data[i * 4 + 3] = (30 + 225 * v) * (1 - .55 * Math.min(1, d));
      }
      x.putImageData(img, 0, 0);
      field = cv;
    };
    let TABLE = null;
    // the light that runs to the centre: rings at these radii, shrinking
    const waves = (t) => { const out = [], ph = fr(t / 6); for (let j = 0; j < 4; j++) out.push((j + 1 - ph) * 118); return out; };
    const annulus = (g, img, a, r0, r1, x = 300, y = 300) => {
      if (r1 <= 0) return;
      g.save(); g.beginPath(); g.arc(x, y, r1, 0, TAU); if (r0 > 0) g.arc(x, y, r0, 0, TAU, true); g.clip();
      g.globalAlpha = a; g.drawImage(img, 0, 0, 600, 600); g.restore();
    };
    return (g, c, t, s) => {
      if (!TABLE) TABLE = Array.from({ length: HB }, (_, b) => c.hue((b + .5) / HB));
      const ev = hit(s, t), p = ptr(s, t);
      const count = steps[options.step()];
      side = ease(s, side, count === Infinity ? 600 : Math.sqrt(count), .09);
      const n = Math.round(side) | 1, cell = 600 / n, mid = (n - 1) / 2;
      const swell = (D) => .5 + .5 * Math.cos(D / 62 + t * TAU / 6 * 1.0);
      // a touch: first the light goes in (1.1 s), then the ember's answer runs out across every life
      const outs = [];
      for (const e of ev) if (e.age > 1.1) outs.push((e.age - 1.1) * 340, clamp(1 - (e.age - 1.1) / 2.5));
      const answer = (D) => { let w = 0; for (let j = 0; j < outs.length; j += 2) w = Math.max(w, Math.exp(-(((D - outs[j]) / 46) ** 2)) * outs[j + 1]); return w; };
      // the life the pointer rests on
      const hx = p.x == null ? -1 : clamp(Math.floor(p.x / cell), 0, n - 1), hy = p.x == null ? -1 : clamp(Math.floor(p.y / cell), 0, n - 1);
      const nearP = (X, Y) => (p.on > .02 ? p.on * Math.exp(-((X - p.x) ** 2 + (Y - p.y) ** 2) / 8000) : 0);
      light(g);
      glow(g, 300, 300, 420, c.heat(.25), .3);
      g.lineCap = g.lineJoin = 'round';
      const dense = n > 59 && !g.isRecorder;
      if (n <= 13) {
        // few lives: each draws its own figure; threads carry light from each to the centre
        const thr = [], runs = [];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          if (x === mid && y === mid) continue;
          const X = (x + .5) * cell, Y = (y + .5) * cell, v = fr(t / 7 + hash(y * n + x + .2));
          thr.push(X, Y);
          runs.push(X + (300 - X) * v, Y + (300 - Y) * v);
        }
        g.strokeStyle = c.ink;
        g.beginPath();
        for (let i = 0; i < thr.length; i += 2) { g.moveTo(300, 300); g.lineTo(thr[i], thr[i + 1]); }
        lit(g, c.heat(.6), .5, n <= 5 ? .14 : .08, 5, .2);
        discs(g, c.heat(.75), .45, runs, n <= 5 ? 1.8 : 1.2);
        const groups = Array.from({ length: HB }, () => []);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (x !== mid || y !== mid) groups[Math.floor(seed(y * n + x).h * HB)].push(y * n + x);
        const P = n <= 5 ? 150 : 100, heads = Array.from({ length: HB }, () => []);
        groups.forEach((list, b) => {
          if (!list.length) return;
          g.beginPath();
          for (const i of list) {
            const sd = seed(i), X = (i % n + .5) * cell, Y = (Math.floor(i / n) + .5) * cell, rad = cell * .38;
            for (let j = 0; j <= P; j++) { const [lx, ly] = liss(sd, X, Y, rad, t, (j / P) * TAU); if (j) g.lineTo(lx, ly); else g.moveTo(lx, ly); }
            heads[b].push(...liss(sd, X, Y, rad, t, fr(t / 9 + sd.p) * TAU));
          }
          const D = Math.hypot((list[0] % n + .5) * cell - 300, (Math.floor(list[0] / n) + .5) * cell - 300);
          lit(g, TABLE[b], n <= 5 ? 1.1 : .8, .55 + .25 * swell(D), n <= 5 ? 5 : 3.5, .16);
          discs(g, TABLE[b], .25, heads[b], 6);
          discs(g, '#fff6ee', .8, heads[b], 1.4);
        });
        // lives woken by the pointer or by the ember's answer
        if (p.on > .02 || outs.length) {
          for (let i = 0; i < n * n; i++) {
            const X = (i % n + .5) * cell, Y = (Math.floor(i / n) + .5) * cell;
            if (i === (n * n - 1) / 2) continue;
            const self = i === hy * n + hx ? p.on : 0, w = Math.max(self, .45 * nearP(X, Y), answer(Math.hypot(X - 300, Y - 300)));
            if (w < .08) continue;
            const sd = seed(i), col = TABLE[Math.floor(sd.h * HB)], rad = cell * .38 * (1 + .1 * self);
            g.beginPath();
            for (let j = 0; j <= P; j++) { const [lx, ly] = liss(sd, X, Y, rad, t, (j / P) * TAU); if (j) g.lineTo(lx, ly); else g.moveTo(lx, ly); }
            lit(g, col, 1.2 + .8 * self, w, 5, .22);
            glow(g, X, Y, cell * .7, col, .3 * w);
          }
        }
      } else if (!dense) {
        // a thousand: small figures still, each its own
        const P = 15;
        g.lineJoin = 'bevel'; g.lineCap = 'butt';
        const groups = Array.from({ length: HB * 4 }, () => []), woke = p.on > .02 || outs.length;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          if (x === mid && y === mid) continue;
          const i = y * n + x, D = Math.hypot((x - mid) * cell, (y - mid) * cell);
          // the fourth band: lives near the pointer, or caught by the ember's answer
          const hot = woke && Math.max(nearP((x + .5) * cell, (y + .5) * cell), answer(D)) > .4;
          groups[(hot ? 3 : Math.min(2, Math.floor(swell(D) * 3))) * HB + Math.floor(seed(i).h * HB)].push(i);
        }
        groups.forEach((list, gi) => {
          if (!list.length) return;
          const band = Math.floor(gi / HB);
          g.beginPath();
          for (const i of list) {
            const sd = seed(i), X = (i % n + .5) * cell, Y = (Math.floor(i / n) + .5) * cell, rad = cell * .36;
            for (let j = 0; j <= P; j++) { const [lx, ly] = liss(sd, X, Y, rad, t, (j / P) * TAU); if (j) g.lineTo(lx, ly); else g.moveTo(lx, ly); }
          }
          if (band === 3) lit(g, TABLE[gi % HB], 1.4, 1, 3.5, .25);
          else { g.strokeStyle = TABLE[gi % HB]; g.lineWidth = .9; g.globalAlpha = .45 + .3 * band; g.stroke(); }
        });
      } else {
        // thousands to the uncountable: the grid as one painted image, lit by rings of light running to the centre
        const gn = Math.min(n, 317), settled = Math.abs(side - (count === Infinity ? 600 : Math.sqrt(count))) < 2;
        if (!cache || (gn !== cacheN && (settled || Math.abs(gn - cacheN) / gn > .08))) paintGrid(gn);
        const inf = smooth(330, 560, side);
        if (inf > 0 && !field) paintField();
        const img = inf > .5 ? field : cache;
        if (inf < 1) { g.globalAlpha = .3 * (1 - inf); g.drawImage(cache, 0, 0, 600, 600); }
        if (inf > 0) {
          // the uncountable: a field too fine to count, shimmering as it drifts
          g.globalAlpha = .6 * inf; g.drawImage(field, 0, 0, 600, 600);
          const dx = 3 * Math.sin(t * TAU / 23), dy = 3 * Math.cos(t * TAU / 29);
          g.globalAlpha = .3 * inf; g.drawImage(field, -6 + dx, -6 + dy, 612, 612);
        }
        for (const R of waves(t)) {
          const fade = smooth(0, 90, R) * (1 - smooth(330, 470, R));
          annulus(g, img, .28 * fade, R - 38, R + 38); annulus(g, img, .38 * fade, R - 15, R + 15);
          g.beginPath(); ring(g, 300, 300, R); g.strokeStyle = c.heat(.6);
          g.lineWidth = 70; g.globalAlpha = .035 * fade; g.stroke(); g.lineWidth = 22; g.globalAlpha = .05 * fade; g.stroke();
        }
        if (p.on > .02) { annulus(g, img, .22 * p.on, 0, 76, p.x, p.y); annulus(g, img, .25 * p.on, 0, 50, p.x, p.y); annulus(g, img, .3 * p.on, 0, 26, p.x, p.y); }
        for (let j = 0; j < outs.length; j += 2) { annulus(g, img, .7 * outs[j + 1], outs[j] - 40, outs[j] + 40); annulus(g, img, .5 * outs[j + 1], outs[j] - 16, outs[j] + 16); }
        g.globalAlpha = 1;
      }
      // the ember's answer, as a ring of light going out
      for (let j = 0; j < outs.length; j += 2) { g.beginPath(); ring(g, 300, 300, outs[j]); lit(g, c.heat(.75), 1.2, .45 * outs[j + 1] * smooth(0, 40, outs[j]), 6, .25); }
      // the thread home from the life the pointer rests on
      if (p.on > .02 && !(hx === mid && hy === mid)) {
        const X = (hx + .5) * cell, Y = (hy + .5) * cell;
        g.beginPath(); g.moveTo(X, Y); g.lineTo(300, 300);
        lit(g, c.heat(.7), .9, .55 * p.on, 5, .22);
        for (let q = 0; q < 3; q++) { const v = fr(t * .45 + q / 3); spark(g, X + (300 - X) * v, Y + (300 - Y) * v, 1.6, c.heat(.8), p.on * smooth(0, .1, v) * smooth(1, .85, v)); }
        glow(g, X, Y, Math.max(40, cell * .9), c.heat(.6), .35 * p.on);
      }
      // the lens: the touched life, seen up close
      const touched = s.x != null && n > 13;
      if (touched) {
        const gx = Math.min(n, 317), gc = 600 / gx, cx = clamp(Math.floor(s.x / gc), 0, gx - 1), cy = clamp(Math.floor(s.y / gc), 0, gx - 1);
        const i = cy * gx + cx, sd = seed(i), col = side > 400 ? c.hue(hash(i * 3.1)) : TABLE[Math.floor(sd.h * HB)];
        const lx = clamp(s.x, 70, 530), ly = clamp(s.y - 80, 70, 530);
        light(g, false);
        g.fillStyle = c.bg; g.globalAlpha = .88; g.beginPath(); ring(g, lx, ly, 62); g.fill();
        light(g);
        g.beginPath(); g.moveTo((cx + .5) * gc, (cy + .5) * gc); g.lineTo(lx, ly + 62);
        lit(g, col, .6, .5, 4, .2);
        g.beginPath(); ring(g, lx, ly, 62); lit(g, col, .8, .6, 5, .2);
        g.beginPath();
        for (let j = 0; j <= 150; j++) { const [qx, qy] = liss(sd, lx, ly, 44, t, (j / 150) * TAU); if (j) g.lineTo(qx, qy); else g.moveTo(qx, qy); }
        lit(g, col, 1.2, .9, 5, .2);
        const [hx, hy] = liss(sd, lx, ly, 44, t, fr(t / 9 + sd.p) * TAU);
        spark(g, hx, hy, 1.8, col, 1);
        spark(g, (cx + .5) * gc, (cy + .5) * gc, Math.max(.8, gc * .2), col, .9);
      }
      // a touch: that life's light travels to the centre
      let flare = 0;
      for (const k of ev) {
        if (k.age < 1.6) {
          const v = smooth(0, 1.1, k.age), x = k.x + (300 - k.x) * v, y = k.y + (300 - k.y) * v, a = clamp(1 - (k.age - 1.1) / .5);
          g.beginPath(); ring(g, k.x, k.y, 8 + k.age * 50); lit(g, c.heat(.7), 1, .7 * clamp(1 - k.age / 1.2), 5, .2);
          g.beginPath(); g.moveTo(k.x, k.y); g.lineTo(x, y); lit(g, c.heat(.7), .9, .5 * a, 5, .2);
          spark(g, x, y, 2.6, c.heat(.8), a);
        }
        flare = Math.max(flare, clamp((k.age - 1) / .15) * clamp(1 - (k.age - 1.15) / 1.2) * 1.3);
      }
      ember(g, c, 300, 300, clamp(Math.min(cell * .03, 1.2), .6, 1.2), t, flare);
      light(g, false);
      g.globalAlpha = 1;
      if (n <= 7) label(g, c, labels.you, 300, 300 + Math.max(26, cell * .17 + 27), 'center', 17);
    };
  },

  // Forgetting: lives drawn one after another. The one being lived is a bright trace led by an ember; the others are veiled,
  // kept in cool light, none erased. Where the pointer rests the veil lifts: the old lives come back in their colours, each
  // with a glint where it passes nearest (a déjà vu). A touch sends a wave of remembering from that point across every life.
  forgetting() {
    const PERIOD = 14, KEEP = 12, PTS = 260, stars = sky(rng(14), 130), hit = taps(3, 3.4), ptr = follow(.3, .14);
    const shape = (j) => {
      const m = (v, n) => ((v % n) + n) % n;
      return { a: 1 + m(j * 7, 4), b: 2 + m(j * 5, 5), p: m(j * 1.7, TAU), q: .72 + .2 * Math.sin(j * 2.3), h: fr(j * .382 + .05) };
    };
    const at = (s, u, k = 1) => [300 + 205 * k * s.q * Math.sin(s.a * u * TAU + s.p), 300 + 205 * k * Math.sin(s.b * u * TAU)];
    const RV = 120, xs = new Float64Array(PTS + 1), ys = new Float64Array(PTS + 1), ws = new Float64Array(PTS + 1);
    // the parts of a trace whose weight passes a threshold, as one path
    const runs = (g, lo) => {
      g.beginPath();
      let open = false;
      for (let i = 0; i <= PTS; i++) {
        if (ws[i] >= lo) { if (open) g.lineTo(xs[i], ys[i]); else g.moveTo(xs[i], ys[i]); open = true; } else open = false;
      }
    };
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t), seen = p.on, px = p.x, py = p.y;
      const now = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
      let flash = 0;
      for (const e of ev) flash = Math.max(flash, .45 * Math.exp(-e.age * 1.4) * smooth(0, .15, e.age));
      const fronts = ev.map((e) => [e.x, e.y, e.age * 280, clamp(1 - e.age / 3.4) * smooth(0, .1, e.age)]);
      drawSky(g, c, t, stars, .8);
      light(g);
      glow(g, 300, 300, 380, c.cool(.3), .3);
      if (seen > .02) glow(g, px, py, RV, c.cool(.6), .2 * seen);
      g.lineCap = g.lineJoin = 'round';
      // the veiled lives: older ones a little smaller and further, all kept
      for (let j = now - KEEP; j < now; j++) {
        const age = now - j, sh = shape(j), sc = 1 - age * .018, fresh = j === now - 1 ? smooth(1.6, 0, u * PERIOD) : 0;
        let any = false, strong = false, best = 1e9, bi = 0;
        g.beginPath();
        for (let i = 0; i <= PTS; i++) {
          const [x, y] = at(sh, i / PTS, sc);
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
          xs[i] = x; ys[i] = y;
          let w = 0;
          if (seen > .02) { const d2 = (x - px) ** 2 + (y - py) ** 2; if (d2 < RV * RV) { w = seen * smooth(RV, RV * .35, Math.sqrt(d2)); if (d2 < best) { best = d2; bi = i; } } }
          for (const [fx, fy, R, a] of fronts) { if (a <= 0) continue; const e = Math.hypot(x - fx, y - fy) - R; if (e > -80 && e < 80) w = Math.max(w, a * Math.exp(-((e / 38) ** 2))); }
          ws[i] = w; if (w > .12) any = true; if (w > .55) strong = true;
        }
        const veil = .1 + .16 * (1 - age / KEEP);
        lit(g, c.cool(.5 + .2 * (1 - age / KEEP)), .55, veil + flash * .5, 5, .2);
        if (fresh > 0) lit(g, c.hue(sh.h), 1.2, .6 * fresh, 5, .2);
        if (flash > .02) lit(g, c.hue(sh.h), 1, .7 * flash, 5, .2);
        if (any) {
          const keep = 1 - age / (KEEP + 6), col = c.hue(sh.h);
          runs(g, .12); lit(g, col, 1, .55 * keep, 5, .2);
          if (strong) { runs(g, .55); lit(g, col, 1.5, .8 * keep, 5, .25); }
          if (best < RV * RV * .36) glow(g, xs[bi], ys[bi], 16, col, seen * keep * smooth(RV * .6, RV * .2, Math.sqrt(best)));
        }
      }
      // the life being lived: a bright trace, its colour drifting as it goes
      const sh = shape(now), end = Math.round(PTS * u), SEG = 10;
      for (let b = 0; b < SEG; b++) {
        const i0 = Math.floor((end * b) / SEG), i1 = Math.floor((end * (b + 1)) / SEG);
        if (i1 <= i0) continue;
        g.beginPath();
        for (let i = i0; i <= i1; i++) { const [x, y] = at(sh, i / PTS); if (i > i0) g.lineTo(x, y); else g.moveTo(x, y); }
        lit(g, c.hue(fr(sh.h + .12 * (b / SEG))), 1.4, .45 + .5 * ((b + 1) / SEG), 5, .16);
      }
      const [hx, hy] = at(sh, end / PTS);
      glow(g, hx, hy, 60, c.hue(sh.h), .35);
      ember(g, c, hx, hy, .9, t, flash * 2);
      for (const [fx, fy, R, a] of fronts) { g.beginPath(); ring(g, fx, fy, R); lit(g, c.cool(.75), .8, .3 * a * smooth(0, 30, R), 6, .25); }
      for (const e of ev) spark(g, e.x, e.y, 2.4, c.cool(.8), clamp(1 - e.age / 1));
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Outside time: an open book seen from above, every page a fibre of light from the spine, past in cool colours, future in
  // warm ones, all there at once. The reader is an ember on one page. The pointer turns the reader to the page it points at
  // (it brightens, with its neighbours, and a light reads along it). A touch lights the touched page, and the light spreads from
  // it to every page at once, past and future together.
  time(labels) {
    const N = 73, SX = 300, SY = 528, stars = sky(rng(21), 120), hit = taps(3, 3), ptr = follow(.3, .14);
    const curve = (i) => {
      const a = (-171 + (i * 162) / (N - 1)) * Math.PI / 180;
      const reach = 318 - 36 * Math.abs(Math.cos(a)) ** 3;
      const tip = [SX + reach * Math.cos(a), SY + reach * Math.sin(a) * 1.42];
      const control = [SX + reach * .86 * Math.cos(a) + Math.cos(a) * 16, SY + reach * .25 * Math.sin(a)];
      return { q: control, tip };
    };
    const pages = Array.from({ length: N }, (_, i) => curve(i));
    const hueOf = (i) => fr(.78 - .66 * i / (N - 1));
    const along = (p, v) => { const w = 1 - v; return [w * w * SX + 2 * w * v * p.q[0] + v * v * p.tip[0], w * w * SY + 2 * w * v * p.q[1] + v * v * p.tip[1]]; };
    // the page a point is on: by its angle from the spine (below the spine, by its side)
    const pageAt = (x, y) => {
      const a = Math.atan2(Math.min(y - SY, -4) / 1.42, x - SX) * 180 / Math.PI;
      return clamp((a + 171) / 162) * (N - 1);
    };
    let head = (N - 1) * .72;
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t), mid = (N - 1) / 2;
      const goal = s.x == null ? mid + mid * Math.sin(t / 7.5) : pageAt(s.x, s.y);
      head = ease(s, head, goal, s.x == null ? .05 : rate(.12, p.dt));
      const pts = ev.map((e) => [pageAt(e.x, e.y), e.age]);
      drawSky(g, c, t, stars, .8);
      light(g);
      glow(g, SX, SY - 120, 380, c.cool(.3), .25);
      glow(g, SX, SY, 160, c.heat(.4), .4);
      g.lineCap = g.lineJoin = 'round';
      const tips = [], SPREAD = 38;
      pages.forEach((p2, i) => {
        const near0 = Math.max(0, 1 - Math.abs(i - head) / 8), near = near0 * (1 + .5 * p.on), board = i === 0 || i === N - 1, col = c.hue(hueOf(i));
        // each touch: the light reaches a page when the spreading front passes it
        let flare = 0, front = 0;
        const runs = [];
        for (const [ic, age] of pts) {
          const reach = age - Math.abs(i - ic) / SPREAD;
          if (reach > 0) { const k = smooth(0, .06, reach) * clamp(1 - age / 3); flare = Math.max(flare, Math.exp(-reach * 1.6) * k); front = Math.max(front, Math.exp(-reach * 7) * k); }
          if (reach > 0 && reach < .9) runs.push(...along(p2, reach / .9));
        }
        g.beginPath(); g.moveTo(SX, SY); g.quadraticCurveTo(p2.q[0], p2.q[1], p2.tip[0], p2.tip[1]);
        lit(g, col, (board ? 1.4 : .7 + .5 * near) + .9 * flare, Math.min(1, (board ? .7 : .26) + .5 * near * near + .75 * flare), 5, .14 + .08 * flare);
        if (front > .05) { g.lineWidth = .9; g.strokeStyle = '#fff6ee'; g.globalAlpha = .7 * front; g.stroke(); }
        // light read along every page, slowly, each at its own moment
        const v = fr(t / 8 + i * .137);
        runs.push(...along(p2, v));
        discs(g, col, .55, runs, 1.6);
        tips.push(p2.tip[0], p2.tip[1], col, near, flare);
      });
      for (let i = 0; i < tips.length; i += 5) {
        const [x, y, col, near, flare] = tips.slice(i, i + 5);
        g.fillStyle = col;
        g.globalAlpha = .1 + .2 * near + .3 * flare; g.beginPath(); ring(g, x, y, 9 + 6 * near); g.fill();
        g.globalAlpha = Math.min(1, .35 + .4 * near + .5 * flare); g.beginPath(); ring(g, x, y, 2.6 + 1.5 * near); g.fill();
      }
      g.fillStyle = '#fff6ee'; g.globalAlpha = .55; g.beginPath();
      for (let i = 0; i < tips.length; i += 5) ring(g, tips[i], tips[i + 1], .9 + .9 * tips[i + 3] + 1.2 * tips[i + 4]);
      g.fill();
      // the page being read
      const a = (-171 + (head * 162) / (N - 1)) * Math.PI / 180, reach = 318 - 36 * Math.abs(Math.cos(a)) ** 3;
      const cur = { q: [SX + reach * .86 * Math.cos(a) + Math.cos(a) * 16, SY + reach * .25 * Math.sin(a)], tip: [SX + reach * Math.cos(a), SY + reach * Math.sin(a) * 1.42] };
      g.beginPath(); g.moveTo(SX, SY); g.quadraticCurveTo(cur.q[0], cur.q[1], cur.tip[0], cur.tip[1]);
      lit(g, c.mark, 2, .9, 5, .25);
      g.lineWidth = .8; g.strokeStyle = c.heat(.9); g.globalAlpha = .9; g.stroke();
      // while the pointer is there, a light reads the page from the spine to its edge
      if (p.on > .02) {
        for (let q = 0; q < 2; q++) { const v = fr(t * .5 + q / 2), [x, y] = along(cur, v); spark(g, x, y, 2, c.heat(.85), p.on * smooth(0, .1, v) * smooth(1, .9, v)); }
        glow(g, p.x, p.y, 80, c.heat(.55), .2 * p.on);
      }
      let flare = 0;
      for (const [ic, age] of pts) {
        flare = Math.max(flare, Math.exp(-((age - .15) ** 2) * 18) * .8, Math.exp(-((age - Math.abs(head - ic) / SPREAD - .1) ** 2) * 20));
        const [x, y] = pages[Math.round(ic)].tip;
        spark(g, x, y, 2.6, c.heat(.85), clamp(1 - age / 1.2));
      }
      ember(g, c, cur.tip[0], cur.tip[1], .8, t, flare);
      // the covers' edge
      g.strokeStyle = c.ink; g.lineWidth = 1; g.globalAlpha = .35;
      g.beginPath(); g.moveTo(26, SY); g.lineTo(574, SY); g.stroke();
      g.globalAlpha = 1;
      spark(g, SX, SY, 2.4, c.heat(.7), .9);
      light(g, false);
      g.globalAlpha = 1;
      label(g, c, labels.past, 34, 566, 'left', 18);
      label(g, c, labels.future, 566, 566, 'right', 18);
    };
  },

  // Every page of the book at once: a stack of glass pages in depth, each tinted by its place in the book, and the reader an
  // ember somewhere among them. The pointer parts the pages where it passes and lights the one under it like the page being read.
  // A touch lights the touched page and sends a wave from it to both ends of the book; the reader flares as it passes.
  pages() {
    const r = rng(8), N = 60, X0 = 64, X1 = 340, D = 240, H = 290, CX = .74, CY = .42, BASE = 478, LINES = 15;
    const text = Array.from({ length: N }, () => Array.from({ length: LINES }, () => [.12 + r() * .04, .88 - (r() < .2 ? r() * .45 : r() * .06)]));
    const stars = sky(rng(6), 130), hit = taps(3, 3.4), ptr = follow(.3, .14);
    const pageOf = (x) => clamp((x - X0 - .5 * CX * D) / (X1 - X0)) * (N - 1);
    let kp = 0;
    return (g, c, t, s) => {
      const ev = hit(s, t), pt = ptr(s, t), open = pt.on;
      const P = (N - 1) * (.5 - .5 * Math.cos((t * TAU) / 80)), here = Math.round(P);
      if (s.x != null) kp = ease(s, kp, pageOf(s.x), rate(.2, pt.dt));
      const lift = (kk) => 34 * open * Math.exp(-((kk - kp) ** 2) / 14) * Math.sign(kk - kp + .001);
      const at = (kk, z, y) => {
        const lean = 7 * Math.sin(t * .35 + kk * .16) * (y / H) + lift(kk) * (y / H);
        return [X0 + ((X1 - X0) * kk) / (N - 1) + z * CX * D + lean, BASE - y - z * CY * D];
      };
      const page = (kk) => { for (const [z, y] of [[0, 0], [0, H], [1, H], [1, 0], [0, 0]]) { const [x, yy] = at(kk, z, y); if (z || y) g.lineTo(x, yy); else g.moveTo(x, yy); } };
      const lines = (kk) => text[kk].forEach(([z0, z1], l) => { const y = H * (.86 - l * .048), A = at(kk, z0, y), B = at(kk, z1, y); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); });
      drawSky(g, c, t, stars, .8);
      light(g);
      const [gx, gy] = at(P, .5, H * .5);
      glow(g, gx, gy, 330, c.cool(.3), .3);
      g.lineCap = g.lineJoin = 'round';
      const waves = ev.map((e) => [pageOf(e.x), e.age * 26, clamp(1 - e.age / 3.4)]);
      const kh = Math.round(kp);
      let flare = 0;
      for (const [kc, front, fade] of waves) flare = Math.max(flare, Math.exp(-((Math.abs(here - kc) - front) ** 2) / 6) * fade * 1.3);
      for (let kk = 0; kk < N; kk++) {
        const col = c.hue(fr(.62 - .55 * kk / (N - 1))), near = Math.exp(-((kk - kp) ** 2) / 14) * open;
        let w = 0;
        for (const [kc, front, fade] of waves) w = Math.max(w, Math.exp(-((Math.abs(kk - kc) - front) ** 2) / 5) * fade);
        if (kk === here) continue;
        const touch = kk === kh ? open : 0;
        g.beginPath(); page(kk);
        g.fillStyle = col; g.globalAlpha = .014 + .03 * near + .05 * w + .04 * touch; g.fill();
        if (near + w > .05) lit(g, touch > .02 ? c.mix(.5 - .5 * touch) : col, .55 + .5 * touch + .3 * w, Math.min(1, .2 + .35 * near + .7 * w + .3 * touch), 4, .15 + .05 * touch);
        else { g.strokeStyle = col; g.lineWidth = .7; g.globalAlpha = .24; g.stroke(); }
        g.beginPath(); lines(kk);
        g.strokeStyle = touch > .02 ? c.heat(.85) : col; g.lineWidth = .6 + .2 * touch; g.globalAlpha = Math.min(1, .07 + .4 * near + .5 * w + .3 * touch); g.stroke();
      }
      // the page being read
      g.beginPath(); page(here);
      g.fillStyle = c.heat(.5); g.globalAlpha = .06; g.fill();
      lit(g, c.heat(.7), 1.1, .85, 5, .2);
      g.beginPath(); lines(here);
      g.strokeStyle = c.heat(.85); g.lineWidth = .8; g.globalAlpha = .6; g.stroke();
      const [px, py] = at(P, .5 + .22 * Math.sin(t * .23), H * (.5 + .26 * Math.sin(t * .17)));
      if (open > .02) glow(g, pt.x, pt.y, 90, c.heat(.55), .2 * open);
      for (const e of ev) spark(g, e.x, e.y, 2.6, c.heat(.85), clamp(1 - e.age / 1));
      for (const e of ev) flare = Math.max(flare, e.age < 1 ? (1 - e.age) * .6 : 0);
      ember(g, c, px, py, .85, t, flare);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // An infinity of worlds: a slowly turning galaxy of systems, each with its own colour, orbits and planets, all tied by faint
  // fibres to the one ember they come from. The pointer is a lens that opens the worlds beneath it: they swell and brighten, and
  // their fibres light, sparks running out to them from the ember. A touch gives birth to a new world: the ember reaches out,
  // a shock pushes the nearby worlds aside, and the newborn condenses, orbits and all (the last four are kept).
  worlds() {
    const r = rng(11), golden = Math.PI * (3 - Math.sqrt(5)), HB = 16;
    const items = [];
    for (let i = 1; i < 240; i++) {
      const d = 18.6 * Math.sqrt(i), size = 2.2 + 13 * (i / 240) ** .85 * (r() * .7 + .35);
      if (d + size > 294) continue;
      const no = Math.ceil(size / 4.2);
      const orbits = Array.from({ length: no }, (_, kk) => ({ radius: size * (kk + 1) / (no + .35), a: r() * TAU, v: (r() * 1.2 + .3) * (r() < .5 ? -1 : 1), planets: 1 + Math.floor(r() * 3) }));
      items.push({ d, a: i * golden, size, orbits, speed: 2.7 / d, hue: Math.floor(r() * HB) });
    }
    const stars = sky(rng(2), 170), births = [], ptr = follow(.3, .14);
    let lastClick = null;
    return (g, c, t, s) => {
      if (s.click && s.click !== lastClick) {
        lastClick = s.click;
        births.push({ x: s.click[0], y: s.click[1], t0: t, h: Math.floor(hash(s.click[0] * 7 + s.click[1]) * HB) });
        if (births.length > 4) births.shift();
      }
      for (let i = births.length - 1; i >= 0; i--) if (t - births[i].t0 > 40 || t < births[i].t0) births.splice(i, 1);
      const p = ptr(s, t), lens = p.on, lx = p.x ?? 300, ly = p.y ?? 300;
      const LR = 130, KF = 3, shocks = births.filter((b) => t - b.t0 < 2.4);
      const place = (w) => {
        const a = w.a + t * w.speed;
        let x = 300 + w.d * Math.cos(a), y = 300 + w.d * Math.sin(a), m = 1, q = 1;
        // a birth's shock pushes the worlds aside, then lets them back
        for (const b of shocks) {
          const age = t - b.t0, dx = x - b.x, dy = y - b.y, dd = Math.hypot(dx, dy) || 1;
          const push = 30 * Math.exp(-(((dd - age * 200) / 55) ** 2)) * clamp(1 - age / 2.4) * smooth(0, .1, age);
          x += (dx / dd) * push; y += (dy / dd) * push;
        }
        if (lens > .01) {
          const dx = x - lx, dy = y - ly, dd = Math.hypot(dx, dy);
          if (dd < LR) { q = dd / LR; const f = ((KF + 1) * q) / (KF * q + 1); const nd = LR * f; const k2 = dd > 1e-6 ? nd / dd : 1; x += dx * (k2 - 1) * lens; y += dy * (k2 - 1) * lens; m = 1 + lens * ((KF + 1) / (KF * q + 1) ** 2 - 1) * 1.6; }
        }
        return [x, y, Math.max(1, m), q];
      };
      drawSky(g, c, t, stars, .8);
      light(g);
      glow(g, 300, 300, 330, c.cool(.35), .3);
      glow(g, 300, 300, 160, c.heat(.35), .35);
      const B = Array.from({ length: HB }, () => ({ fib: [], orb: [], pl: [], core: [] }));
      const big = [], seenW = [];
      for (const w of items) {
        const [x, y, m, q] = place(w), b = B[w.hue], a = w.a + t * w.speed;
        const fx = 300 + w.d * .55 * Math.cos(a - .55), fy = 300 + w.d * .55 * Math.sin(a - .55);
        b.fib.push(fx, fy, x, y);
        for (const o of w.orbits) b.orb.push(x, y, o.radius * m);
        for (const o of w.orbits) for (let p2 = 0; p2 < o.planets; p2++) {
          const pa = o.a + (p2 * TAU) / o.planets + t * o.v * .45;
          b.pl.push(x + o.radius * m * Math.cos(pa), y + o.radius * m * Math.sin(pa));
        }
        b.core.push(x, y, Math.max(.7, w.size * .1 * m));
        if (w.size > 8 || m > 1.4) big.push(x, y, w.size * m, w.hue);
        if (lens > .02 && q < 1) seenW.push(fx, fy, x, y, w.hue, 1 - q, w.size * m);
      }
      g.lineCap = 'round';
      B.forEach((b, i) => {
        if (!b.core.length) return;
        const col = c.hue((i + .5) / HB);
        g.beginPath();
        for (let j = 0; j < b.fib.length; j += 4) { g.moveTo(300, 300); g.quadraticCurveTo(b.fib[j], b.fib[j + 1], b.fib[j + 2], b.fib[j + 3]); }
        g.strokeStyle = col; g.lineWidth = .6; g.globalAlpha = .1; g.stroke();
        g.beginPath();
        for (let j = 0; j < b.orb.length; j += 3) ring(g, b.orb[j], b.orb[j + 1], b.orb[j + 2]);
        g.lineWidth = .6; g.globalAlpha = .5; g.stroke();
        discs(g, col, .9, b.pl, 1);
        g.fillStyle = col; g.globalAlpha = .18; g.beginPath();
        for (let j = 0; j < b.core.length; j += 3) ring(g, b.core[j], b.core[j + 1], b.core[j + 2] * 4.5);
        g.fill();
        g.fillStyle = '#fff6ee'; g.globalAlpha = .85; g.beginPath();
        for (let j = 0; j < b.core.length; j += 3) ring(g, b.core[j], b.core[j + 1], b.core[j + 2]);
        g.fill();
      });
      g.globalAlpha = 1;
      for (let j = 0; j < big.length; j += 4) glow(g, big[j], big[j + 1], big[j + 2] * 2.4, c.hue((big[j + 3] + .5) / HB), .3);
      // the worlds under the lens: their fibres lit, light running out to them from the ember
      if (seenW.length) {
        g.beginPath();
        for (let j = 0; j < seenW.length; j += 7) { g.moveTo(300, 300); g.quadraticCurveTo(seenW[j], seenW[j + 1], seenW[j + 2], seenW[j + 3]); }
        lit(g, c.heat(.7), .5, .22 * lens, 5, .2);
        for (let j = 0; j < seenW.length; j += 7) {
          const [fx, fy, x, y, h, v, sz] = seenW.slice(j, j + 7), col = c.hue((h + .5) / HB), a = lens * smooth(0, .5, v);
          if (v < .5) continue;
          glow(g, x, y, sz * 3 + 8, col, .4 * a);
          const u = fr(t * .5 + h * .37), w1 = 1 - u, rx = w1 * w1 * 300 + 2 * w1 * u * fx + u * u * x, ry = w1 * w1 * 300 + 2 * w1 * u * fy + u * u * y;
          glow(g, rx, ry, 9, col, a * smooth(0, .1, u) * smooth(1, .85, u));
        }
      }
      if (lens > .02) { g.beginPath(); ring(g, lx, ly, LR); lit(g, c.ink, .6, .22 * lens, 6, .2); }
      // births: a world condenses where you touched, and a fibre reaches it from the centre
      for (const b of births) {
        const age = t - b.t0, fade = smooth(40, 30, age);
        const col = c.hue((b.h + .5) / HB), grow = smooth(.3, 2.6, age), v = smooth(0, .9, age);
        const tx = 300 + (b.x - 300) * v, ty = 300 + (b.y - 300) * v;
        g.beginPath(); g.moveTo(300, 300); g.lineTo(tx, ty);
        lit(g, col, .8, .45 * fade, 5, .2);
        if (age < 1.1) spark(g, tx, ty, 2.2, col, 1);
        const flash = Math.exp(-(((age - .9) / .25) ** 2));
        if (flash > .02) { glow(g, b.x, b.y, 120, col, .55 * flash); glow(g, b.x, b.y, 40, '#fff6ee', .5 * flash); }
        if (age > .9 && age < 3.3) { g.beginPath(); ring(g, b.x, b.y, 10 + (age - .9) * 200); lit(g, col, 1.2, .55 * clamp(1 - (age - .9) / 1.6), 5, .22); }
        if (age < .9) continue;
        g.beginPath();
        for (let o = 1; o <= 4; o++) ring(g, b.x, b.y, o * 7.5 * grow);
        lit(g, col, .7, .65 * fade, 4, .2);
        const pl = [];
        for (let o = 1; o <= 4; o++) for (let k = 0; k < 1 + (o % 2); k++) { const pa = o * 2.1 + k * Math.PI + age * (1.5 - o * .28); pl.push(b.x + o * 7.5 * grow * Math.cos(pa), b.y + o * 7.5 * grow * Math.sin(pa)); }
        discs(g, col, .95 * fade, pl, 1.5);
        glow(g, b.x, b.y, 45 * grow, col, .3 * fade);
        spark(g, b.x, b.y, 1.8 + 2.4 * Math.exp(-(age - .9) * 1.5), col, fade);
      }
      ember(g, c, 300, 300, 1, t, births.reduce((f, b) => Math.max(f, Math.exp(-(((t - b.t0) - .1) ** 2) * 12)), 0));
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // The dream: a landscape dreamed line by line, a city that becomes the sea, the sea a sleeping face, the face mountains, each
  // in its own light; what it was a moment ago rises into the sky and fades. The ember lives in every world without knowing it.
  // Where the pointer looks (anywhere: above the horizon, the far edge), the dream raises a hill and its lines catch a warm light.
  // A touch drops a stone in the dream: rings of waves run out from it, their crests lit (three can overlap).
  dream() {
    const ROWS = 66, COLS = 150, STAGE = 9, r = rng(19);
    const hsh = (a, b) => { const m = rng(a * 374761 + b * 668265 + 7); m(); return m(); };
    const blocks = new Float64Array(22 * 12).map((_, i) => hsh(i % 22, Math.floor(i / 22)));
    const worlds = [
      (u, z) => {
        const gu = (u + 1.1) * 7, gz = z * 8, fu = gu % 1, fz = gz % 1;
        if (fu < .16 || fu > .84 || fz < .2 || fz > .8) return 0;
        const h = blocks[(Math.floor(gz) % 12) * 22 + (Math.floor(gu) % 22)];
        return (.05 + .38 * h * h + (h > .88 ? .3 : 0)) * (1.1 - z * .45);
      },
      (u, z, t) => .16 + .1 * Math.sin(u * 7 + z * 16 - t * .9) + .05 * Math.sin(u * 15 - z * 11 + t * 1.3) + .04 * Math.sin(z * 31 + u * 3 - t * 1.7),
      (u, z) => {
        const a = u / .6, b = (z - .46) / .47, mask = 1 - a * a - b * b;
        if (mask <= 0) return .015 * Math.sin(u * 20 + z * 9);
        let h = .26 * Math.sqrt(mask);
        h += .3 * Math.exp(-((a / .1) ** 2)) * smooth(-.3, .2, b) * (b < .24 ? 1 : Math.exp(-(((b - .24) / .06) ** 2)));
        for (const s of [-1, 1]) {
          const e = a - s * .37;
          h += .045 * Math.exp(-(((b + .06 - 1.2 * e * e) / .035) ** 2)) * smooth(.22, .12, Math.abs(e));
          h += .05 * Math.exp(-(((b + .3 - .9 * e * e) / .05) ** 2)) * smooth(.3, .18, Math.abs(e));
          h -= .05 * Math.exp(-((e / .14) ** 2) - (((b + .14) / .1) ** 2));
        }
        h += .07 * Math.exp(-((a / .24) ** 2) - (((b - .47) / .05) ** 2)) + .06 * Math.exp(-((a / .2) ** 2) - (((b - .58) / .05) ** 2));
        h += .06 * Math.exp(-((a / .22) ** 2) - (((b - .82) / .08) ** 2));
        return h;
      },
      (u, z) => {
        const m = 1 - Math.abs(Math.sin(u * 2.4 + .7 + z * .8)), n = 1 - Math.abs(Math.sin(u * 6.1 - z * 3.3 + 2));
        return (.62 * m * m + .2 * n * n) * (1.15 - z * .7) + .03 * Math.sin(u * 30 + z * 23);
      },
    ];
    // each world's light: the city gold, the sea cyan, the face rose, the mountains violet
    const WH = [.14, .52, .9, .7];
    const mix = (j, f) => { const a = WH[((j % 4) + 4) % 4], b = WH[(((j + 1) % 4) + 4) % 4]; let d = b - a; if (d > .5) d -= 1; if (d < -.5) d += 1; return fr(a + d * f); };
    const stageF = (z, u, t) => { const j = Math.floor(t / STAGE), p = t / STAGE - j; return [j, smooth(0, 1, (p - .4) * 3.6 - z * .9 - .2 * u * u)]; };
    let gaze = 0, gu = 0, gz = .5;
    let ripples = [];
    const height = (u, z, t) => {
      const [j, f] = stageF(z, u, t);
      const A = worlds[((j % 4) + 4) % 4], B = worlds[(((j + 1) % 4) + 4) % 4];
      let h = f <= 0 ? A(u, z, t) : f >= 1 ? B(u, z, t) : A(u, z, t) * (1 - f) + B(u, z, t) * f;
      if (gaze > .01) h += .2 * gaze * Math.exp(-(((u - gu) / .16) ** 2) - (((z - gz) / .13) ** 2));
      for (const rp of ripples) { const dd = Math.hypot((u - rp[0]) * 1.4, z - rp[1]), ph = dd - rp[2]; if (ph < 0) h += rp[3] * .085 * Math.sin(ph * 40) * Math.exp(ph * 5) * Math.exp(-dd * 1.2); }
      return h;
    };
    // how lit a point of the dream is by the gaze and by the ripples' leading crests
    const glint = (u, z) => {
      let w = gaze > .01 && Math.abs(u - gu) < .3 && Math.abs(z - gz) < .25 ? gaze * Math.exp(-(((u - gu) / .2) ** 2) - (((z - gz) / .16) ** 2)) : 0;
      for (const rp of ripples) { const e = Math.hypot((u - rp[0]) * 1.4, z - rp[1]) - rp[2] + .02; if (e > -.06 && e < .06) w = Math.max(w, rp[3] * Math.exp(-((e / .035) ** 2))); }
      return w;
    };
    const project = (u, z, h) => [300 + u * (150 + 300 * z ** 1.2), 236 + 318 * z ** 1.35 - h * (70 + 150 * z)];
    const unproject = (x, y) => { const z = clamp(((y - 236) / 318) ** (1 / 1.35) || 0, 0, 1); return [clamp((x - 300) / (150 + 300 * z ** 1.2), -1, 1), z]; };
    const stars = Array.from({ length: 260 }, () => [r() * 600, r() ** 1.6 * 220, .3 + r() * .6, r() * TAU, 3 + r() * 5]);
    const horizon = new Float64Array(COLS + 1), skyline = new Float64Array(COLS + 1);
    const HOME = [.16, .64], hit = taps(2, 5), ptr = follow(.3, .12);
    return (g, c, t, s) => {
      const ev = hit(s, t), p = ptr(s, t);
      gaze = p.on;
      if (s.x != null) { const [uu, zz] = unproject(s.x, Math.max(236, s.y)), q = rate(.14, p.dt); gu = ease(s, gu, uu, q); gz = ease(s, gz, zz, q); }
      ripples = ev.map((e) => { const [uu, zz] = unproject(e.x, Math.max(240, e.y)); return [uu, zz, e.age * .35, 1 - e.age / 5]; });
      drawSky(g, c, t, stars, .9);
      light(g);
      const [j0, f0] = stageF(.5, 0, t), skyHue = mix(j0, f0);
      glow(g, 300, 236, 360, c.hue(skyHue), .14);
      glow(g, 300, 210, 260, c.cool(.35), .22);
      g.lineCap = g.lineJoin = 'round';
      // what it dreamed a moment ago: only its outline is left, rising and fading
      for (let d = 5; d >= 1; d--) {
        const then = t - d * 1.7;
        skyline.fill(1e9);
        for (let row = ROWS - 1; row >= 0; row -= 5) {
          const z = row / (ROWS - 1);
          for (let col = 0; col <= COLS; col += 2) { const u = (col / COLS) * 2 - 1, y = project(u, z, height(u, z, then))[1]; if (y < skyline[col]) skyline[col] = y; }
        }
        const [jj, ff] = stageF(.3, 0, then);
        g.beginPath();
        for (let col = 0; col + 2 <= COLS; col += 2) {
          const u0 = (col / COLS) * 2 - 1, u1 = ((col + 2) / COLS) * 2 - 1;
          const x0 = project(u0, 0, 0)[0] * (1 + d * .02) - d * 6, x1 = project(u1, 0, 0)[0] * (1 + d * .02) - d * 6;
          if (col) g.lineTo(x1, skyline[col + 2] - d * 17); else { g.moveTo(x0, skyline[col] - d * 17); g.lineTo(x1, skyline[col + 2] - d * 17); }
        }
        lit(g, c.hue(mix(jj, ff)), .7, .42 * (1 - d / 6), 6, .22);
      }
      // the world itself, drawn from the nearest line to the farthest; what is in front hides what is behind
      horizon.fill(1e9);
      const BANDS = 8, bands = Array.from({ length: BANDS }, () => []), hot = [], lighting = gaze > .02 || ripples.length;
      let home = null;
      const ys = new Float64Array(COLS + 1), xs = new Float64Array(COLS + 1);
      for (let row = ROWS - 1; row >= 0; row--) {
        const z = row / (ROWS - 1), list = bands[Math.min(BANDS - 1, Math.floor((1 - z) * BANDS))];
        for (let col = 0; col <= COLS; col++) {
          const u = (col / COLS) * 2 - 1, [x, y] = project(u, z, height(u, z, t));
          xs[col] = x; ys[col] = y;
        }
        if (!home && z <= HOME[1]) {
          const col = Math.round(((HOME[0] + 1) / 2) * COLS);
          if (ys[col] < horizon[col]) home = [xs[col], ys[col]];
        }
        let open = false;
        for (let col = 0; col < COLS; col++) {
          const a = horizon[col] - ys[col], b = horizon[col + 1] - ys[col + 1];
          if (a <= 0 && b <= 0) { open = false; continue; }
          const q = a / (a - b), mx = xs[col] + (xs[col + 1] - xs[col]) * q, my = ys[col] + (ys[col + 1] - ys[col]) * q;
          if (!open) { if (a > 0) list.push(NaN, xs[col], ys[col]); else list.push(NaN, mx, my); }
          if (lighting && !(row % 2)) {
            const w = glint((col / COLS) * 2 - 1, z);
            if (w > .2) hot.push(w > .55 ? 1 : 0, a > 0 ? xs[col] : mx, a > 0 ? ys[col] : my, b > 0 ? xs[col + 1] : mx, b > 0 ? ys[col + 1] : my);
          }
          if (b > 0) { list.push(xs[col + 1], ys[col + 1]); open = true; } else { list.push(mx, my); open = false; }
        }
        for (let col = 0; col <= COLS; col++) if (ys[col] < horizon[col]) horizon[col] = ys[col];
      }
      bands.forEach((list, b) => {
        if (!list.length) return;
        const z = 1 - (b + .5) / BANDS, [jj, ff] = stageF(z, 0, t), near = 1 - b / (BANDS - 1);
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) { if (Number.isNaN(list[i])) { i++; g.moveTo(list[i], list[i + 1]); } else g.lineTo(list[i], list[i + 1]); }
        lit(g, c.hue(fr(mix(jj, ff) + .1 * (1 - near) - .03)), .45 + .55 * near, .3 + .6 * near, 4, .2);
      });
      // what the gaze and the ripples light
      if (hot.length) {
        for (const lvl of [0, 1]) {
          g.beginPath();
          for (let i = 0; i < hot.length; i += 5) if (hot[i] >= lvl) { g.moveTo(hot[i + 1], hot[i + 2]); g.lineTo(hot[i + 3], hot[i + 4]); }
          lit(g, c.heat(.7 + .15 * lvl), .8 + .4 * lvl, .45 + .25 * lvl, 4, .22);
        }
      }
      if (gaze > .02) { const [x, y] = project(gu, gz, height(gu, gz, t)); glow(g, x, y, 110, c.heat(.55), .22 * gaze); }
      for (const e of ev) spark(g, e.x, e.y, 2.4, c.heat(.8), clamp(1 - e.age / .9));
      if (home) {
        glow(g, home[0], home[1] - 4, 70, c.mark, .25);
        ember(g, c, home[0], home[1] - 4, 1, t, ev.reduce((f, e) => Math.max(f, e.age < 1.2 ? 1 - e.age / 1.2 : 0), 0));
      }
      light(g, false);
      g.globalAlpha = 1;
    };
  },
  };
};

export const FROZEN = { nested: 0, zoom: 7, kin: 6, lives: 21, forgetting: 121, time: 6.2, pages: 22, worlds: 21, dream: 15.5 };
