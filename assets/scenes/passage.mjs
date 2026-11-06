// Figures: balance, field, ripple, shadow, mend, knot, death, leaves, drop. Each factory returns draw(g, c, t, s); see ../scenes.mjs.
// Night figures in additive light. The ember (c.mark, c.heat) is always the Source, or a consciousness.
export default (K) => {
  const { TAU, rng, smooth, clamp, ease, glow, spark, light } = K;
  const wrap = (x) => ((x % 1) + 1) % 1;
  const mod = (x, p) => ((x % p) + p) % p;
  const beat = (t, p = 3.4) => { const u = mod(t, p); return 1 + .16 * Math.exp(-((u - .45) ** 2) * 40) + .07 * Math.exp(-((u - 1.3) ** 2) * 40); };
  const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r() * .999)) * Math.cos(TAU * r());
  // batched shapes: [x, y] discs of one radius, [x, y, r] discs, [x1, y1, x2, y2] segments, NaN-separated polylines
  const dots = (g, a, rad) => { if (!a.length) return; g.beginPath(); for (let i = 0; i < a.length; i += 2) { g.moveTo(a[i] + rad, a[i + 1]); g.arc(a[i], a[i + 1], rad, 0, TAU); } g.fill(); };
  const dotsR = (g, a, k = 1) => { if (!a.length) return; g.beginPath(); for (let i = 0; i < a.length; i += 3) { const q = a[i + 2] * k; g.moveTo(a[i] + q, a[i + 1]); g.arc(a[i], a[i + 1], q, 0, TAU); } g.fill(); };
  const segs = (g, a) => { if (!a.length) return; g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); } g.stroke(); };
  const polys = (g, a) => {
    if (!a.length) return;
    g.beginPath();
    for (let i = 0; i < a.length; i += 2) { if (Number.isNaN(a[i])) { i++; g.moveTo(a[i], a[i + 1]); } else g.lineTo(a[i], a[i + 1]); }
    g.stroke();
  };
  const sky = (seed, n, keep = () => true) => {
    const r = rng(seed), out = [];
    while (out.length < n) { const st = [r() * 600, r() * 600, .3 + r() ** 3 * 1.1, r() * TAU, 4 + r() * 6]; if (keep(st[0], st[1])) out.push(st); }
    return out;
  };
  const night = (g, c, t, stars, k = 1) => {
    const b = [[], [], [], []];
    for (const [x, y, sz, ph, per] of stars) b[Math.min(3, Math.floor(4 * (.5 + .5 * Math.sin((t * TAU) / per + ph))))].push(x, y, sz);
    g.fillStyle = c.ink;
    b.forEach((a, i) => { g.globalAlpha = k * (.05 + .11 * i); dotsR(g, a); });
    g.globalAlpha = 1;
  };
  // a consciousness: wide red light, hot heart, white core
  const ember = (g, c, x, y, k = 1, a = 1) => {
    glow(g, x, y, 96 * k, c.mark, .5 * a);
    glow(g, x, y, 26 * k, c.heat(.8), .85 * a);
    spark(g, x, y, 4.6 * k, c.mark, a, c.heat(1));
  };
  const clicked = () => { let last = null; return (s) => { if (s.click && s.click !== last) { last = s.click; return s.click; } return null; }; };

  return {
  // A balance of light that never settles. Its pans hold the warm and the cold; sparks cross from one to the other through
  // the ember at the pivot, and the needle searches the measure along a graduated arc. A hand on a pan weighs it down; a
  // touch drops a weight in the pan on that side, which sinks and swings, then the Source carries the excess across.
  balance() {
    const r = rng(7), P = [300, 196], ARM = 200, DROP = 150, TICKS = 97, A0 = -Math.PI / 2 - .86, A1 = -Math.PI / 2 + .86;
    const heap = () => Array.from({ length: 300 }, () => {
      const u = r() * 2 - 1, rise = r() ** 1.5 * 62 * (1 - u * u);
      return [u * 60, rise, .7 + r() * 1.5, r(), r() * TAU, 3 + r() * 5];
    }).sort((a, b) => a[1] - b[1]);
    const pans = [heap(), heap()], stars = sky(71, 130), click = clicked();
    // what each pan holds; a touch drops a weight in the pan under it, and the Source slowly carries the excess across
    const w = [1.5, 1.5], drops = [], DROPT = .7;
    let tilt = 0, vel = 0, last = null, press = 0, bowls = [[100, 346], [500, 346]];
    return (g, c, t, s) => {
      const dt = last == null ? 0 : clamp(t - last, 0, .05);
      last = t;
      const k = click(s);
      if (k) { drops.push({ x: k[0], y: k[1], side: k[0] < 300 ? 0 : 1, at: t, done: false }); if (drops.length > 8) drops.shift(); }
      for (const d of drops) if (!d.done && t - d.at >= DROPT) { d.done = true; w[d.side] = Math.min(3.4, w[d.side] + .55); vel += d.side ? .7 : -.7; }
      const flow = (w[1] - w[0]) * .09 * dt;
      w[1] -= flow; w[0] += flow;
      // a hand resting on a pan weighs on it
      let want = 0;
      if (s.x != null) bowls.forEach(([bx, by], side) => { if (Math.hypot(s.x - bx, s.y - by + 20) < 100) want = side ? 1 : -1; });
      press = ease(s, press, want, .08);
      const target = clamp((w[1] - w[0]) * .3 + .09 * Math.sin((t * TAU) / 31) + .035 * Math.sin((t * TAU) / 13 + 2) + .14 * press, -.42, .42);
      if (s.snap || !dt) { tilt = target; vel = 0; } else { vel += (26 * (target - tilt) - 2.6 * vel) * dt; tilt += vel * dt; }
      const ca = Math.cos(tilt), sa = Math.sin(tilt);
      const ends = [-1, 1].map((d) => [P[0] + d * ARM * ca, P[1] + d * ARM * sa]);
      bowls = ends.map(([x, y], side) => [x + 2.5 * Math.sin(t * .9 + side * 2) - vel * 10, y + DROP]);
      const tone = (side, u) => (side ? c.cool(u) : c.heat(u));
      night(g, c, t, stars, .8);
      light(g);
      glow(g, 300, 330, 330, c.heat(.15), .35);
      // the column and its base
      g.lineCap = 'round';
      g.strokeStyle = c.ink;
      g.lineWidth = .6;
      g.globalAlpha = .12;
      g.beginPath();
      for (let i = -6; i <= 6; i++) { g.moveTo(P[0] + i * .8, P[1]); g.quadraticCurveTo(P[0] + i * 2, 400, P[0] + i * 9, 548); }
      g.stroke();
      g.globalAlpha = .25;
      g.beginPath(); g.moveTo(200, 550); g.lineTo(400, 550); g.stroke();
      glow(g, 300, 552, 120, c.heat(.45), .3);
      // the graduated arc: the measure, searched
      const needle = -Math.PI / 2 + clamp(tilt * 2.2, -.84, .84);
      const tb = Array.from({ length: 8 }, () => []), hot = [];
      for (let i = 0; i < TICKS; i++) {
        const a = A0 + ((A1 - A0) * i) / (TICKS - 1), len = i % 12 === 0 ? 16 : i % 6 === 0 ? 10 : 5;
        const near = Math.exp(-(((a - needle) / .06) ** 2)), R0 = 158;
        tb[Math.floor((i / TICKS) * 8)].push(P[0] + R0 * Math.cos(a), P[1] + R0 * Math.sin(a), P[0] + (R0 + len + 6 * near) * Math.cos(a), P[1] + (R0 + len + 6 * near) * Math.sin(a));
        if (near > .05) hot.push(P[0] + (R0 + 3) * Math.cos(a), P[1] + (R0 + 3) * Math.sin(a), near);
      }
      g.lineWidth = .9;
      tb.forEach((a, i) => { g.strokeStyle = c.hue(.55 + (i / 8) * .7); g.globalAlpha = .45; segs(g, a); });
      g.strokeStyle = c.ink;
      g.globalAlpha = .1;
      g.beginPath(); g.arc(P[0], P[1], 158, A0, A1); g.stroke();
      g.fillStyle = c.heat(.85);
      for (let i = 0; i < hot.length; i += 3) { g.globalAlpha = .5 * hot[i + 2]; g.beginPath(); g.arc(hot[i], hot[i + 1], 2.5, 0, TAU); g.fill(); }
      const tip = [P[0] + 176 * Math.cos(needle), P[1] + 176 * Math.sin(needle)];
      g.strokeStyle = c.heat(.7);
      for (const [w, a] of [[5, .07], [1.2, .65]]) { g.lineWidth = w; g.globalAlpha = a; g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(tip[0], tip[1]); g.stroke(); }
      spark(g, tip[0], tip[1], 1.8, c.mark, .9, c.heat(1));
      // the beam: a bundle of fibres, warm on one side and cold on the other, tied at the ember
      const nx = -sa, ny = ca, F = 26, lb = [[], [], [], [], [], []];
      for (let f = 0; f < F; f++) {
        const o = (f / (F - 1) - .5) * 24, lvl = Math.floor((f / F) * 3);
        for (const side of [0, 1]) {
          const [ex, ey] = ends[side], mx = (ex + P[0]) / 2 + nx * o * .7, my = (ey + P[1]) / 2 + ny * o * .7;
          lb[side * 3 + lvl].push(ex, ey, mx, my, P[0] + nx * o * .15, P[1] + ny * o * .15);
        }
      }
      lb.forEach((a, i) => {
        const side = i >= 3 ? 1 : 0;
        g.strokeStyle = tone(side, .5 + .13 * (i % 3));
        g.globalAlpha = .32;
        g.lineWidth = .7;
        g.beginPath();
        for (let j = 0; j < a.length; j += 6) { g.moveTo(a[j], a[j + 1]); g.quadraticCurveTo(a[j + 2], a[j + 3], a[j + 4], a[j + 5]); }
        g.stroke();
      });
      ends.forEach(([ex, ey], side) => {
        g.strokeStyle = tone(side, .6);
        g.lineWidth = 6; g.globalAlpha = .06;
        g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(ex, ey); g.stroke();
        spark(g, ex, ey, 1.5, tone(side, .6), .8, c.heat(1));
      });
      // the pans: chains of beads, a bowl of light, a heap of embers or of frost
      ends.forEach(([ex, ey], side) => {
        const [bx, by] = bowls[side], col = tone(side, .62);
        glow(g, bx, by - 10, 150, tone(side, .45), .5);
        g.strokeStyle = col;
        g.lineWidth = .5; g.globalAlpha = .18;
        g.beginPath();
        for (const f of [-1, 1]) { g.moveTo(ex, ey); g.lineTo(bx + f * 70, by); }
        g.stroke();
        g.fillStyle = col; g.globalAlpha = .55;
        const beads = [];
        for (const f of [-1, 1]) for (let i = 1; i < 22; i++) { const u = i / 22; beads.push(ex + (bx + f * 70 - ex) * u, ey + (by - ey) * u); }
        dots(g, beads, .9);
        // the bowl
        g.beginPath();
        g.moveTo(bx - 72, by);
        for (let i = 1; i <= 30; i++) { const u = i / 15 - 1; g.lineTo(bx + u * 72, by + 20 * (1 - u * u)); }
        for (const [w, a] of [[6, .07], [1.4, .8]]) { g.lineWidth = w; g.globalAlpha = a; g.stroke(); }
        // its heap: the amount varies with what is lived
        const n = Math.round(clamp(88 * w[side], 20, 300));
        const hb = Array.from({ length: 8 }, () => []);
        for (let i = 0; i < n; i++) {
          const [dx, rise, sz, v, ph, per] = pans[side][i], u = dx / 60;
          const tw = .5 + .5 * Math.sin((t * TAU) / per + ph);
          hb[Math.floor(v * 4) * 2 + (tw > .5 ? 1 : 0)].push(bx + dx, by + 17 * (1 - u * u) - rise - 1.5, sz);
        }
        hb.forEach((a, i) => {
          g.fillStyle = tone(side, .45 + .14 * (i >> 1));
          g.globalAlpha = .07; dotsR(g, a, 3.4);
          g.globalAlpha = (i & 1) ? .9 : .5; dotsR(g, a);
        });
      });
      // what passes from one pan to the other goes through the Source
      for (let m = 0; m < 5; m++) {
        const per = 9.4, ph = mod(t + m * 1.88, per), cyc = Math.floor((t + m * 1.88) / per), f = ph / 4.2;
        if (f > 1) continue;
        const from = Math.abs(w[1] - w[0]) > .12 ? (w[1] > w[0] ? 1 : 0) : (cyc + m) & 1, to = 1 - from, A = bowls[from], B = bowls[to];
        const e = f * f * (3 - 2 * f), half = e < .5;
        const u = half ? e * 2 : e * 2 - 1, a0 = half ? [A[0], A[1] - 18] : P, a1 = half ? P : [B[0], B[1] - 18];
        const cx = half ? (A[0] + P[0]) / 2 : (B[0] + P[0]) / 2, cy = Math.min(a0[1], a1[1]) - 70;
        const x = (1 - u) ** 2 * a0[0] + 2 * (1 - u) * u * cx + u * u * a1[0], y = (1 - u) ** 2 * a0[1] + 2 * (1 - u) * u * cy + u * u * a1[1];
        spark(g, x, y, 1.5, tone(half ? from : to, .7), .9 * Math.sin(Math.PI * f) ** .4, c.heat(1));
      }
      for (const d of drops) {
        const f = (t - d.at) / DROPT;
        if (f < 0 || f > 1) continue;
        const [bx, by] = bowls[d.side];
        spark(g, d.x + (bx - d.x) * f * f, d.y + (by - d.y) * f * f, 2, tone(d.side, .75), 1, c.heat(1));
      }
      ember(g, c, P[0], P[1], beat(t), 1);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A fabric of lives, almost invisible at rest. A pain at one point (an ember flaring) sends a front through all of it:
  // every point flinches and lights up, and the threads between them appear. A hand resting on it presses a dimple: the threads
  // around it light up, and what it feels goes out in soft rings that the far points still feel. A touch hurts.
  field() {
    const r = rng(23), SP = 11, R = 284, pts = [], at = new Map(), links = [];
    for (let row = -30; row <= 30; row++) for (let col = -30; col <= 30; col++) {
      const x = 300 + (col + (row & 1) * .5) * SP + (r() - .5) * 3, y = 300 + row * SP * .866 + (r() - .5) * 3, d = Math.hypot(x - 300, y - 300);
      if (d > R) continue;
      at.set(row * 100 + col, pts.length);
      pts.push({ x, y, hue: wrap(Math.atan2(y - 300, x - 300) / TAU + d / R * .3), sz: .6 + r() * .8, ph: r() * TAU, edge: smooth(R, R * .6, d) });
    }
    for (let row = -30; row <= 30; row++) for (let col = -30; col <= 30; col++) {
      const i = at.get(row * 100 + col);
      if (i == null) continue;
      const odd = row & 1;
      for (const key of [row * 100 + col + 1, (row + 1) * 100 + col - 1 + odd, (row + 1) * 100 + col + odd]) { const j = at.get(key); if (j != null) links.push(i, j); }
    }
    const N = pts.length, PERIOD = 6.5, stars = sky(29, 90, (x, y) => Math.hypot(x - 300, y - 300) > R);
    const X = new Float32Array(N), Y = new Float32Array(N), E = new Float32Array(N), H = new Float32Array(N);
    const seedAt = (k) => { const q = rng(k * 97 + 5); q(); const rad = 60 + q() * 170, a = q() * TAU; return [300 + rad * Math.cos(a), 300 + rad * Math.sin(a)]; };
    const click = clicked(), hurts = [], felt = [];
    let hx = 300, hy = 300, hov = 0, lastFelt = -99;
    return (g, c, t, s) => {
      const k0 = click(s);
      if (k0) { hurts.push({ x: k0[0], y: k0[1], at: t, k: 1 }); if (hurts.length > 3) hurts.shift(); }
      if (s.x != null) { hx = ease(s, hx, s.x, .25); hy = ease(s, hy, s.y, .25); }
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      // a hand resting on the fabric: what it feels goes out, softly, to the others
      if (s.x != null && hov > .4 && (t - lastFelt > 2 || t < lastFelt)) { lastFelt = t; felt.push({ x: hx, y: hy, at: t, k: .35 }); if (felt.length > 2) felt.shift(); }
      const k = Math.floor(t / PERIOD), pulses = hurts.filter((p) => t >= p.at && t - p.at < 20);
      for (const p of felt) if (t >= p.at && t - p.at < 4) pulses.push(p);
      for (let j = k - 2; j <= k; j++) { const [x, y] = seedAt(j); pulses.push({ x, y, at: j * PERIOD, k: 1 }); }
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        let x = p.x + 1.3 * Math.sin((t * TAU) / 11 + p.ph), y = p.y + 1.3 * Math.cos((t * TAU) / 13 + p.ph), e = 0;
        for (const q of pulses) {
          const age = t - q.at, dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, front = age * 82, z = (d - front) / 36;
          if (z > 4 || z < -6) continue;
          const w = Math.exp(-z * z) * Math.exp(-age / 7.5) * q.k, push = Math.sin((d - front) / 11) * w * 11;
          x += (dx / d) * push; y += (dy / d) * push; e += w;
        }
        let h = 0;
        if (hov > .01) {
          const dx = p.x - hx, dy = p.y - hy, d2 = dx * dx + dy * dy;
          if (d2 < 40000) { const d = Math.sqrt(d2) || 1, dent = hov * Math.exp(-d2 / 2600); h = hov * Math.exp(-d2 / 9000); x += (dx / d) * 9 * dent; y += (dy / d) * 9 * dent; }
        }
        X[i] = x; Y[i] = y; E[i] = Math.min(1, e); H[i] = h;
      }
      night(g, c, t, stars, .7);
      light(g);
      glow(g, 300, 300, 340, c.cool(.25), .3);
      // the threads, only where something passes
      const lb = Array.from({ length: 6 }, () => []), hb = [[], [], []];
      for (let l = 0; l < links.length; l += 2) {
        const a = links[l], b = links[l + 1], e = (E[a] + E[b]) / 2, h = (H[a] + H[b]) / 2;
        if (e > .06) lb[Math.min(5, Math.floor(e * 6))].push(X[a], Y[a], X[b], Y[b]);
        if (h > .08) hb[Math.min(2, Math.floor(h * 3))].push(X[a], Y[a], X[b], Y[b]);
      }
      g.lineCap = 'round';
      lb.forEach((a, i) => { g.strokeStyle = c.heat(.35 + .1 * i); g.lineWidth = .4 + .14 * i; g.globalAlpha = .06 + .055 * i; segs(g, a); });
      hb.forEach((a, i) => { g.strokeStyle = c.cool(.6 + .14 * i); g.lineWidth = .6 + .25 * i; g.globalAlpha = .2 + .2 * i; segs(g, a); });
      if (hov > .01) glow(g, hx, hy, 110, c.cool(.55), .3 * hov);
      // the points: a quiet spectrum at rest, embers where the pain passes
      const rest = Array.from({ length: 36 }, () => []), lit = Array.from({ length: 6 }, () => []);
      for (let i = 0; i < N; i++) {
        const p = pts[i], e = E[i] + H[i] * .3;
        rest[Math.min(2, Math.floor(Math.max(p.edge, H[i]) * 3)) * 12 + Math.floor(p.hue * 12) % 12].push(X[i], Y[i], p.sz * (1 + 1.6 * H[i]));
        if (E[i] > .05) lit[Math.min(5, Math.floor(e * 6))].push(X[i], Y[i], p.sz * (1 + 2.2 * e));
      }
      rest.forEach((a, i) => { g.fillStyle = c.hue((i % 12 + .5) / 12); g.globalAlpha = .12 + .2 * Math.floor(i / 12); dotsR(g, a); });
      lit.forEach((a, i) => {
        g.fillStyle = c.heat(.4 + .1 * i);
        g.globalAlpha = .03 + .015 * i; dotsR(g, a, 3.4);
        g.globalAlpha = .3 + .08 * i; dotsR(g, a);
      });
      // where it hurts
      for (const q of pulses) {
        const age = t - q.at;
        if (age < 0 || age > 6 || q.k < 1) continue;
        const f = Math.exp(-age * .7);
        glow(g, q.x, q.y, 140 * f + 30, c.mark, .5 * f);
        spark(g, q.x, q.y, 1.5 + 4 * f, c.mark, f, c.heat(1));
      }
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Families of lives, each a small constellation, tied by threads to the others. A shock at one life runs along the
  // threads to every cluster, flaring as it goes. A hand near a life lights it, its family and the threads that leave it, two
  // steps out, and they lean toward the hand. A touch strikes the nearest life: the shock leaves from it, stronger, to everyone.
  ripple() {
    const r = rng(19), centres = [];
    for (let tries = 0; centres.length < 11 && tries < 5000; tries++) {
      const q = 222 * Math.sqrt(r()), a = r() * TAU, x = 300 + q * Math.cos(a), y = 300 + q * Math.sin(a) * .92;
      if (centres.every(([cx, cy]) => Math.hypot(cx - x, cy - y) > 118)) centres.push([x, y, r()]);
    }
    const nodes = [];
    centres.forEach(([cx, cy, hue], ci) => {
      const n = 22 + Math.floor(r() * 12);
      for (let tries = 0, m = 0; m < n && tries < 600; tries++) {
        const x = cx + gauss(r) * 32, y = cy + gauss(r) * 32;
        if (nodes.every((p) => Math.hypot(p.x - x, p.y - y) > 10)) { nodes.push({ x, y, ci, hue: wrap(hue + (r() - .5) * .12), z: r(), dx: r() * 2 - 1, dy: r() * 2 - 1 }); m++; }
      }
    });
    const N = nodes.length, links = [], seen = new Set(), adj = nodes.map(() => []);
    const link = (i, j) => {
      const key = Math.min(i, j) * N + Math.max(i, j);
      if (i === j || seen.has(key)) return;
      seen.add(key);
      const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      links.push([i, j, d, (r() - .5) * .35]); adj[i].push(j); adj[j].push(i);
    };
    nodes.forEach((p, i) => nodes.map((q, j) => [Math.hypot(p.x - q.x, p.y - q.y), j]).sort((a, b) => a[0] - b[0]).slice(1, 4).forEach(([, j]) => link(i, j)));
    // each family is tied to its two nearest families
    centres.forEach((ca, a) => {
      centres.map((cb, b) => [Math.hypot(ca[0] - cb[0], ca[1] - cb[1]), b]).sort((u, v) => u[0] - v[0]).slice(1, 3).forEach(([, b]) => {
        let best = null;
        nodes.forEach((p, i) => { if (p.ci !== a) return; nodes.forEach((q, j) => { if (q.ci === b) { const d = Math.hypot(p.x - q.x, p.y - q.y); if (!best || d < best[0]) best = [d, i, j]; } }); });
        if (best) link(best[1], best[2]);
      });
    });
    const spread = (src) => {
      const d = new Array(N).fill(Infinity), done = new Array(N).fill(false);
      d[src] = 0;
      for (let it = 0; it < N; it++) {
        let m = -1;
        for (let i = 0; i < N; i++) if (!done[i] && (m < 0 || d[i] < d[m])) m = i;
        if (d[m] === Infinity) break;
        done[m] = true;
        for (const [a, b, w] of links) { if (a === m && d[m] + w < d[b]) d[b] = d[m] + w; if (b === m && d[m] + w < d[a]) d[a] = d[m] + w; }
      }
      return d.map((v) => (v === Infinity ? 1e4 : v));
    };
    const sources = [0, 1, 2, 3, 4, 5].map(() => Math.floor(r() * N)), dist = sources.map(spread), PERIOD = 7.5;
    const stars = sky(91, 120), click = clicked();
    let shock = null, near = -1, show = 0, px = 300, py = 300;
    const wave = (pos, d, age, gain = 1) => nodes.forEach((p, i) => {
      const front = age * 95, x = (d[i] - front) / 40, w = gain * Math.exp(-x * x) * Math.exp(-age / 6.5);
      const sh = w * Math.sin((d[i] - front) / 10) * 8;
      pos[i][0] += p.dx * sh; pos[i][1] += p.dy * sh; pos[i][2] += w;
    });
    return (g, c, t, s) => {
      const k = Math.floor(t / PERIOD), cl = click(s);
      const nearest = (x, y) => { let b = 0; nodes.forEach((p, i) => { if (Math.hypot(p.x - x, p.y - y) < Math.hypot(nodes[b].x - x, nodes[b].y - y)) b = i; }); return b; };
      if (cl) { const src = nearest(cl[0], cl[1]); shock = { src, d: spread(src), t0: t }; }
      if (s.x != null) { near = nearest(s.x, s.y); px = ease(s, px, s.x, .3); py = ease(s, py, s.y, .3); }
      show = ease(s, show, s.x != null ? 1 : 0, .14);
      const pos = nodes.map((p, i) => [p.x + 1.5 * Math.sin(t * .4 + i), p.y + 1.5 * Math.cos(t * .33 + i * 1.7), 0]);
      for (let j = k - 2; j <= k; j++) wave(pos, dist[mod(j, 6)], t - j * PERIOD);
      if (shock && (t < shock.t0 || t - shock.t0 > 20)) shock = null;
      if (shock) wave(pos, shock.d, t - shock.t0, 1.7);
      // hover: the life under the hand, its family, and the threads around it two steps out, leaning toward the hand
      const ring = new Map(), fam = show > .02 && near >= 0 ? nodes[near].ci : -1;
      if (fam >= 0) {
        ring.set(near, 1); for (const j of adj[near]) { ring.set(j, Math.max(ring.get(j) || 0, .7)); for (const m of adj[j]) if (!ring.has(m)) ring.set(m, .35); }
        for (const [i, v] of ring) { const lean = .14 * v * show; pos[i][0] += (px - pos[i][0]) * lean; pos[i][1] += (py - pos[i][1]) * lean; }
      }
      night(g, c, t, stars, .8);
      light(g);
      centres.forEach(([x, y, hue]) => glow(g, x, y, 110, c.hue(hue), .12));
      const base = Array.from({ length: 12 }, () => []), hotL = Array.from({ length: 6 }, () => []), mine = [];
      for (const [a, b, , bend] of links) {
        const [ax, ay, ea] = pos[a], [bx, by, eb] = pos[b], mx = (ax + bx) / 2 - (by - ay) * bend, my = (ay + by) / 2 + (bx - ax) * bend;
        base[Math.floor(nodes[a].hue * 12) % 12].push(ax, ay, mx, my, bx, by);
        const e = clamp((ea + eb) * .65);
        if (e > .06) hotL[Math.min(5, Math.floor(e * 6))].push(ax, ay, mx, my, bx, by);
        if (ring.has(a) && ring.has(b)) mine.push(ax, ay, mx, my, bx, by);
      }
      const curves = (a) => { g.beginPath(); for (let i = 0; i < a.length; i += 6) { g.moveTo(a[i], a[i + 1]); g.quadraticCurveTo(a[i + 2], a[i + 3], a[i + 4], a[i + 5]); } g.stroke(); };
      g.lineCap = 'round';
      g.lineWidth = .6;
      base.forEach((a, i) => { if (a.length) { g.strokeStyle = c.hue((i + .5) / 12); g.lineWidth = 3; g.globalAlpha = .03; curves(a); g.lineWidth = .6; g.globalAlpha = .26; curves(a); } });
      hotL.forEach((a, i) => { if (a.length) { g.strokeStyle = c.heat(.45 + .1 * i); g.lineWidth = .6 + .3 * i; g.globalAlpha = .15 + .13 * i; curves(a); } });
      if (mine.length) { g.strokeStyle = c.cool(.8); for (const [w, a] of [[5, .08], [1.3, .8]]) { g.lineWidth = w; g.globalAlpha = a * show; curves(mine); } }
      // the lives: small lights in their family's colour, flaring when the shock reaches them
      const nb = Array.from({ length: 24 }, () => []), fl = Array.from({ length: 5 }, () => []);
      nodes.forEach((p, i) => {
        const [x, y, e] = pos[i];
        nb[(Math.floor(p.hue * 12) % 12) * 2 + (p.z > .55 ? 1 : 0)].push(x, y, .8 + 1.4 * p.z);
        if (e > .08) fl[Math.min(4, Math.floor(clamp(e) * 5))].push(x, y, 1.2 + 2.5 * clamp(e));
      });
      nb.forEach((a, i) => {
        if (!a.length) return;
        g.fillStyle = c.hue((Math.floor(i / 2) + .5) / 12);
        g.globalAlpha = .07; dotsR(g, a, 4);
        g.globalAlpha = .55 + .3 * (i & 1); dotsR(g, a);
      });
      fl.forEach((a, i) => { g.fillStyle = c.heat(.55 + .1 * i); g.globalAlpha = .06 + .03 * i; dotsR(g, a, 4); g.globalAlpha = .6 + .1 * i; dotsR(g, a); });
      g.fillStyle = c.heat(1); g.globalAlpha = .9; dotsR(g, fl.flat(), .45);
      if (fam >= 0) {
        const kin = [], close = [];
        nodes.forEach((p, i) => { if (ring.has(i)) close.push(pos[i][0], pos[i][1], 1.4 + 1.8 * ring.get(i)); else if (p.ci === fam) kin.push(pos[i][0], pos[i][1], 2); });
        g.fillStyle = c.hue(centres[fam][2]); g.globalAlpha = .12 * show; dotsR(g, kin, 4); g.globalAlpha = .8 * show; dotsR(g, kin);
        g.fillStyle = c.cool(.85); g.globalAlpha = .14 * show; dotsR(g, close, 4); g.globalAlpha = .95 * show; dotsR(g, close);
        glow(g, centres[fam][0], centres[fam][1], 130, c.hue(centres[fam][2]), .4 * show);
        glow(g, px, py, 70, c.cool(.6), .25 * show);
        spark(g, pos[near][0], pos[near][1], 2.6, c.cool(.7), show, c.heat(1));
      }
      const own = shock && shock.t0 > k * PERIOD, start = own ? shock.t0 : k * PERIOD;
      const src = own ? shock.src : sources[mod(k, 6)], [sx, sy] = pos[src];
      ember(g, c, sx, sy, (.55 + .7 * Math.exp(-(t - start) * .6)) * (own ? 1 + .8 * Math.exp(-(t - start) * 1.5) : 1), 1);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Evil. The Source sends its fibres everywhere; one part has closed on itself. It turns inward, a vortex that drinks the
  // light around it, and it has cut its own fibre (two red ends, a gap that stays) and the fibres of its neighbours.
  // At its heart a dim ember remains: still a part of the Source, and still answerable. A hand draws the Source's fibres toward
  // it, brighter and longer, and near the dark the vortex slows and its ember looks back. A touch sends light down every fibre:
  // it reaches the dark, the vortex flares, sparks leap at the cut without closing it, and the ember at its heart answers.
  shadow() {
    const r = rng(131), S = [270, 262], D = [400, 392], dx0 = D[0] - S[0], dy0 = D[1] - S[1], DR = Math.hypot(dx0, dy0), DA = Math.atan2(dy0, dx0);
    const VR = 70, CUT1 = 72, CUT2 = 102, N = 340, CAP = Math.asin(VR / DR);
    const reach = (a) => { const cx = Math.cos(a), cy = Math.sin(a); let m = 1e9; if (cx > 0) m = Math.min(m, (585 - S[0]) / cx); if (cx < 0) m = Math.min(m, (15 - S[0]) / cx); if (cy > 0) m = Math.min(m, (585 - S[1]) / cy); if (cy < 0) m = Math.min(m, (15 - S[1]) / cy); return m; };
    const fibres = Array.from({ length: N }, (_, i) => {
      const a = (i / N) * TAU + (r() - .5) * .02, da = Math.atan2(Math.sin(a - DA), Math.cos(a - DA)), room = reach(a) - 14;
      let len = (150 + r() ** .6 * 120) * Math.min(1, room / 270);
      // around the dark the light reaches further, so that the hole sits inside it
      if (Math.abs(da) < 1.1) len = Math.max(len, DR + VR * (1 - Math.abs(da)) * .7 + 10 + r() * 40);
      len = Math.min(len, room * (.8 + .2 * r()));
      const cut = Math.abs(da) < .1, cap = !cut && Math.abs(da) < CAP * .92;
      return { a, da, len, cut, cap, capR: .15 + r() * .45, capT: 1.8 + r() * 1.6, curl: (r() - .5) * 2, hue: wrap(a / TAU * .9 + .55 + r() * .05), pulse: r() * 6 };
    });
    const strands = Array.from({ length: 150 }, (_, j) => ({ b: (j / 150) * TAU + r() * .08, k: 1.4 + r() * .6, run: r(), lvl: r(), out: .5 + r() * .45 }));
    const ash = Array.from({ length: 26 }, () => [r(), r() * 2 - 1, r()]);
    const stars = sky(43, 140, (x, y) => Math.hypot(x - D[0], y - D[1]) > 150);
    const click = clicked(), PULSE = 6;
    let look = 0, held = 0, last = null, burst = -99, hov = 0, px = 300, py = 300;
    return (g, c, t, s) => {
      if (click(s)) burst = t;
      if (burst > t) burst = -99;
      look = ease(s, look, s.x == null ? 0 : smooth(250, 50, Math.hypot(s.x - D[0], s.y - D[1])), .1);
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      if (s.x != null) { px = ease(s, px, s.x, .3); py = ease(s, py, s.y, .3); }
      const dt = last == null ? 0 : clamp(t - last, 0, .1);
      last = t;
      held += look * dt;
      // the hand: the direction it is in, seen from the Source, and how far
      const pa = Math.atan2(py - S[1], px - S[0]), pr = Math.hypot(px - S[0], py - S[1]), lit = [[], [], []];
      const answer = Math.exp(-(((t - burst - 1.4) / .55) ** 2)), flash = clamp(1 - (t - burst) / 1.6) ** 2;
      const ux = Math.cos(DA), uy = Math.sin(DA);
      night(g, c, t, stars, .75);
      light(g);
      glow(g, S[0], S[1], 300, c.heat(.25), .45);
      // the Source's fibres; near the closed part they bend toward it and their light drains away
      const HB = 16, buckets = Array.from({ length: HB * 3 }, () => ({ lines: [], runs: [], tips: [] })), cutEnds = [], ghosts = [], lost = [];
      const sent = clamp(1 - (t - burst) / 2.2);
      const rot = -(t * TAU) / 46 + held * .9, rim = .45 * answer;
      for (const f of fibres) {
        const ca = Math.cos(f.a), sa = Math.sin(f.a), sway = 9 * f.curl + 6 * Math.sin((t * TAU) / 26 + f.a * 3);
        let near = 0;
        if (hov > .01) { const da = Math.atan2(Math.sin(f.a - pa), Math.cos(f.a - pa)); near = hov * Math.exp(-((da / .2) ** 2)); }
        let L = f.len * (1 + .02 * Math.sin((t * TAU) / 10 + f.a)), tx = S[0] + ca * L, ty = S[1] + sa * L;
        if (near > .01 && !f.cut && !f.cap) { L += (Math.max(L, Math.min(pr, f.len * 1.35)) - L) * near; tx = S[0] + ca * L; ty = S[1] + sa * L; }
        let qx = S[0] + ca * L * .5 - sa * sway, qy = S[1] + sa * L * .5 + ca * sway, dim = 0;
        const along = DR * Math.cos(f.da), pd = DR * Math.abs(Math.sin(f.da));
        if (f.cut) {
          // severed before the rim of the dark: what lay beyond is grey and lost
          ghosts.push(S[0] + ca * (CUT2 + 6), S[1] + sa * (CUT2 + 6), S[0] + ca * (DR - VR * .8), S[1] + sa * (DR - VR * .8));
          L = CUT1 + (Math.abs(f.da) / .1) * 12; tx = S[0] + ca * L; ty = S[1] + sa * L;
          qx = S[0] + ca * L * .5; qy = S[1] + sa * L * .5;
          cutEnds.push(tx, ty);
        } else if (f.cap) {
          // caught: the fibre enters the dark and curls inward with it
          const enter = along - Math.sqrt(Math.max(0, VR * VR - pd * pd)), ex = S[0] + ca * enter, ey = S[1] + sa * enter;
          const phi = Math.atan2(ey - D[1], ex - D[0]) + f.capT + rot, rho = VR * f.capR;
          qx = ex + ca * 30; qy = ey + sa * 30;
          tx = D[0] + rho * Math.cos(phi); ty = D[1] + rho * Math.sin(phi) * .82;
          dim = 1;
          lost.push(S[0] + ca * L, S[1] + sa * L);
        } else if (along > 0 && L > along - 20) {
          // passing beside it: bent toward it, a little dimmed
          const bend = Math.exp(-(((pd - VR) / 60) ** 2));
          const cx = S[0] + ca * along, cy = S[1] + sa * along;
          qx += (cx + (D[0] - cx) * .55 * bend - qx) * bend; qy += (cy + (D[1] - cy) * .55 * bend - qy) * bend;
          dim = .45 * bend;
        }
        if (near > .08 && !f.cut) lit[Math.min(2, Math.floor(near * 3))].push(qx, qy, tx, ty);
        const lvl = dim > .7 ? 0 : dim > .2 ? 1 : 2;
        const h = wrap(f.hue - t / 40), b = buckets[lvl * HB + Math.floor(h * HB)];
        b.lines.push(qx, qy, tx, ty);
        const ph = mod(t - f.pulse, PULSE) / PULSE, u = Math.max(ph < .6 ? ph / .6 : -1, sent > 0 ? 1 - sent : -1);
        if (u >= 0 && u <= 1 && !(dim > .7 && u > .5)) { const a = 1 - u; b.runs.push(a * a * S[0] + 2 * a * u * qx + u * u * tx, a * a * S[1] + 2 * a * u * qy + u * u * ty); }
        if (!f.cut && !f.cap) b.tips.push(tx, ty, (ph >= .6 ? 1 - (ph - .6) / .4 : 0) * .6 + sent * .8 + near * 1.4);
      }
      buckets.forEach((b, i) => {
        if (!b.lines.length) return;
        const lvl = Math.floor(i / HB), k = [.45, .6, 1][lvl], col = lvl ? c.hue((i % HB + .5) / HB) : c.heat(.32);
        g.strokeStyle = g.fillStyle = col;
        g.lineWidth = .5 + .5 * k;
        g.globalAlpha = .1 + .18 * k;
        g.beginPath();
        for (let j = 0; j < b.lines.length; j += 4) { g.moveTo(S[0], S[1]); g.quadraticCurveTo(b.lines[j], b.lines[j + 1], b.lines[j + 2], b.lines[j + 3]); }
        g.stroke();
        if (flash > .01) { g.strokeStyle = c.heat(.9); g.globalAlpha = .35 * flash * k; g.stroke(); g.strokeStyle = col; }
        g.globalAlpha = .55 * k; dots(g, b.runs, 2);
        for (const [rad, a0] of [[9, .06], [3.2, .26]]) {
          g.globalAlpha = a0 * k;
          g.beginPath();
          for (let j = 0; j < b.tips.length; j += 3) { const q = rad * (1 + .5 * b.tips[j + 2]); g.moveTo(b.tips[j] + q, b.tips[j + 1]); g.arc(b.tips[j], b.tips[j + 1], q, 0, TAU); }
          g.fill();
        }
        g.fillStyle = c.heat(1);
        g.globalAlpha = .7 * k;
        g.beginPath();
        for (let j = 0; j < b.tips.length; j += 3) { const q = 1 + 1.2 * b.tips[j + 2]; g.moveTo(b.tips[j] + q, b.tips[j + 1]); g.arc(b.tips[j], b.tips[j + 1], q, 0, TAU); }
        g.fill();
      });
      // the fibres the hand draws toward it
      lit.forEach((a, i) => {
        if (!a.length) return;
        g.strokeStyle = c.heat(.75 + .1 * i);
        g.beginPath();
        for (let j = 0; j < a.length; j += 4) { g.moveTo(S[0], S[1]); g.quadraticCurveTo(a[j], a[j + 1], a[j + 2], a[j + 3]); }
        for (const [w, al] of [[4, .05], [1, .3]]) { g.lineWidth = w; g.globalAlpha = al * (1 + i); g.stroke(); }
      });
      if (hov > .01) glow(g, px, py, 80, c.heat(.55), .3 * hov);
      // the neighbours' severed remainders: ash-grey, no light runs there any more
      g.strokeStyle = g.fillStyle = c.ink; g.lineWidth = .5; g.globalAlpha = .07; segs(g, ghosts);
      // where their light would have reached: grey, unlit
      g.globalAlpha = .05; dots(g, lost, 5); g.globalAlpha = .22; dots(g, lost, 1.1);
      // the dark: a part closed on itself, absorbing what comes near (drawn over the light, not added to it)
      light(g, false);
      g.fillStyle = c.bg;
      for (const [rad, a] of [[118, .1], [100, .14], [86, .18], [72, .22], [58, .26]]) { g.globalAlpha = a; g.beginPath(); g.arc(D[0], D[1], rad, 0, TAU); g.fill(); }
      light(g);
      // the vortex: light turned against itself, drawn inward, darker as it goes
      const vb = [[], [], []], vruns = [];
      for (const st of strands) {
        for (let seg = 0; seg < 3; seg++) {
          const list = vb[seg];
          list.push(NaN);
          for (let i = 0; i <= 8; i++) {
            const rad = VR * st.out * Math.exp(-(seg * 8 + i) / 24 * Math.log((VR * st.out) / 9)), th = st.b + rot + st.k * Math.log(VR / rad);
            list.push(D[0] + rad * Math.cos(th), D[1] + rad * Math.sin(th) * .82);
          }
        }
        const f = mod(t / 9 + st.run, 1), rad = VR * Math.exp(-f * Math.log(VR / 10)), th = st.b + rot + st.k * Math.log(VR / rad);
        if (st.lvl < .4) vruns.push(D[0] + rad * Math.cos(th), D[1] + rad * Math.sin(th) * .82, 1 - f);
      }
      g.lineCap = g.lineJoin = 'round';
      vb.forEach((a, i) => { g.strokeStyle = c.heat([.32, .22, .12][i]); g.lineWidth = [.8, .6, .45][i]; g.globalAlpha = [.2, .15, .1][i] + rim; polys(g, a); });
      g.fillStyle = c.heat(.55);
      for (let i = 0; i < vruns.length; i += 3) { g.globalAlpha = .7 * vruns[i + 2] ** 2; g.beginPath(); g.arc(vruns[i], vruns[i + 1], 1.4, 0, TAU); g.fill(); }
      // its own fibre, cut: from the Source to the wound, from the wound to the dark
      const G1 = [S[0] + ux * CUT1, S[1] + uy * CUT1], G2 = [S[0] + ux * CUT2, S[1] + uy * CUT2], RIM = [D[0] - ux * VR * .9, D[1] - uy * VR * .74];
      g.strokeStyle = c.heat(.75);
      for (const [w, a] of [[6, .08], [1.3, .7]]) { g.lineWidth = w; g.globalAlpha = a; g.beginPath(); g.moveTo(S[0], S[1]); g.lineTo(G1[0], G1[1]); g.stroke(); }
      g.strokeStyle = c.heat(.4);
      for (const [w, a] of [[5, .08], [1.1, .6]]) {
        g.lineWidth = w; g.globalAlpha = a;
        g.beginPath();
        g.moveTo(G2[0], G2[1]); g.quadraticCurveTo(RIM[0] + 20, RIM[1] - 18, RIM[0], RIM[1]);
        g.stroke();
      }
      // light sent across the cut leaps at the gap and falls short: the wound stays
      if (answer > .02) for (let m = 0; m < 5; m++) {
        const f = mod((t - burst) * 1.6 + m / 5, 1), reach = .3 + .45 * ((m * .37) % 1);
        if (f > reach) continue;
        const fx = G1[0] + (G2[0] - G1[0]) * f, fy = G1[1] + (G2[1] - G1[1]) * f - 14 * Math.sin(Math.PI * f / reach);
        spark(g, fx, fy, 1.2, c.mark, answer * (1 - f / reach), c.heat(1));
      }
      // the cut ends still glow, and shed a little ash
      const ends = [...cutEnds, G2[0], G2[1]];
      for (let i = 0; i < ends.length; i += 2) {
        const hotEnd = i === ends.length - 2 || Math.abs(ends[i] - G1[0]) + Math.abs(ends[i + 1] - G1[1]) < 6;
        spark(g, ends[i], ends[i + 1], hotEnd ? 1.6 : 1, c.mark, hotEnd ? .9 : .5, c.heat(.95));
      }
      g.fillStyle = c.heat(.6);
      for (const [ph, side, sz] of ash) {
        const f = mod(t / 4 + ph, 1), [ex, ey] = side < 0 ? G1 : G2;
        g.globalAlpha = .6 * (1 - f) ** 1.5;
        g.beginPath(); g.arc(ex + side * 10 * f + 4 * Math.sin(f * 9 + ph * 20), ey + 46 * f * f, .5 + .7 * sz, 0, TAU); g.fill();
      }
      // the core: almost all light gone, but not all
      light(g, false);
      g.fillStyle = c.bg;
      for (const [rad, a] of [[44, .35], [30, .5], [18, .6]]) { g.globalAlpha = a; g.beginPath(); g.arc(D[0], D[1], rad, 0, TAU); g.fill(); }
      light(g);
      const slow = .5 + .5 * Math.sin((t * TAU) / 9);
      const seen = clamp(look + answer);
      glow(g, D[0], D[1], 46 + 30 * look + 50 * answer, c.mark, .1 + .06 * slow + .35 * seen);
      spark(g, D[0], D[1], 1.2 + .7 * seen, c.heat(.3 + .4 * answer), .35 + .15 * slow + .6 * seen, c.heat(.55 + .4 * seen));
      ember(g, c, S[0], S[1], beat(t) * (1 + .7 * flash), 1);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A rope of light tied in a knot. The knot loosens and gives way thread by thread; freed threads cool and carry light again,
  // and where the knot was, a faint red trace remains. Then another knot is tied. A hand leans the knot and parts the threads
  // under it, which brighten; a touch tugs the knot open a little and sends light both ways along every thread from that point.
  mend() {
    const PERIOD = 48, FIBRES = 44, DS = 5, r = rng(66);
    const fibres = Array.from({ length: FIBRES }, (_, f) => ({ strand: f % 3, a: r() * TAU, q: 1 + r() * 4.4, at: 0, spread: 0, wave: r() * TAU, dir: r() < .5 }));
    fibres.map((fb, f) => f).sort((a, b) => fibres[a].strand - fibres[b].strand || fibres[a].a - fibres[b].a)
      .forEach((f, k) => { fibres[f].at = .3 + .48 * (k / FIBRES) + (r() - .5) * .02; fibres[f].spread = (k / (FIBRES - 1) - .5) * 2; });
    const hermite = (out, a, ta, b, tb, n) => {
      for (let i = 1; i <= n; i++) {
        const u = i / n, u2 = u * u, u3 = u2 * u, h1 = 2 * u3 - 3 * u2 + 1, h2 = u3 - 2 * u2 + u, h3 = -2 * u3 + 3 * u2, h4 = u3 - u2;
        out.push([h1 * a[0] + h2 * ta[0] + h3 * b[0] + h4 * tb[0], h1 * a[1] + h2 * ta[1] + h3 * b[1] + h4 * tb[1]]);
      }
    };
    // the centre line: tails that cross below, and an open trefoil above them
    const centre = (S, sway) => {
      const T = (s) => [300 + S * (Math.sin(s) + 2 * Math.sin(2 * s)) + sway, 250 - S * (Math.cos(s) - 2 * Math.cos(2 * s))];
      const dT = (s, k) => [k * S * (Math.cos(s) + 4 * Math.cos(2 * s)), -k * S * (-Math.sin(s) + 4 * Math.sin(2 * s))];
      const d = .55, P1 = T(Math.PI + d), P2 = T(3 * Math.PI - d), C = [300 + sway * .5, 250 + 2.75 * S + 20], L = [-14, 410], R = [614, 410];
      const pts = [L];
      hermite(pts, L, [260, -30], C, [170, -170], 30);
      hermite(pts, C, [120, -140], P1, dT(Math.PI + d, .35), 14);
      for (let i = 1; i <= 120; i++) pts.push(T(Math.PI + d + ((2 * Math.PI - 2 * d) * i) / 120));
      hermite(pts, P2, dT(3 * Math.PI - d, .35), C, [120, 140], 14);
      hermite(pts, C, [170, 170], R, [260, 30], 30);
      const out = [pts[0]];
      let carry = 0;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay);
        let s = DS - carry;
        while (s <= len) { out.push([ax + ((bx - ax) * s) / len, ay + ((by - ay) * s) / len]); s += DS; }
        carry = len - (s - DS);
      }
      return out;
    };
    const stars = sky(17, 120), click = clicked();
    let lean = 0, sent = -99, sentAt = [300, 300], hov = 0, px = 300, py = 300;
    return (g, c, t, s) => {
      const cl = click(s);
      if (cl) { sent = t; sentAt = cl; }
      if (sent > t) sent = -99;
      lean = ease(s, lean, s.x == null ? 0 : clamp((s.x - 300) / 300, -1, 1) * 22, .06);
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      if (s.x != null) { px = ease(s, px, s.x, .3); py = ease(s, py, s.y, .3); }
      const k = Math.floor(t / PERIOD), u = t / PERIOD - k, age = t - sent;
      const fade = smooth(0, .04, u) * (1 - smooth(.95, 1, u));
      const tug = age < 2.6 ? Math.sin(Math.PI * Math.min(1, age / 2.6)) ** 2 : 0;
      const loose = smooth(.04, .3, u), S = 60 + 22 * loose + 16 * tug * (1 - loose);
      const P = centre(S, 6 * Math.sin(t * .13) + lean), M = P.length;
      const normal = P.map((_, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(M - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; });
      const events = [], STEP = 3;
      for (let i = 0; i + STEP < M; i += STEP) {
        const [ax, ay] = P[i], [bx, by] = P[i + STEP];
        for (let j = i + 2 * STEP; j + STEP < M; j += STEP) {
          const [cx, cy] = P[j], [dx, dy] = P[j + STEP];
          if (Math.max(cx, dx) < Math.min(ax, bx) || Math.min(cx, dx) > Math.max(ax, bx) || Math.max(cy, dy) < Math.min(ay, by) || Math.min(cy, dy) > Math.max(ay, by)) continue;
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (!den) continue;
          const p = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, q = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          if (p >= 0 && p <= 1 && q >= 0 && q <= 1) events.push([Math.round(i + p * STEP), Math.round(j + q * STEP)]);
        }
      }
      const order = events.flatMap(([i, j], e) => [[i, e], [j, e]]).sort((a, b) => a[0] - b[0]);
      const hold = fibres.filter((fb) => u < fb.at + .08).length / FIBRES, gap = Math.round(3 + 4 * hold);
      const under = new Uint8Array(M), seen = new Map();
      order.forEach(([i, e], n) => {
        const isUnder = seen.has(e) ? !seen.get(e) : n % 2 === 1;
        seen.set(e, isUnder);
        if (isUnder) for (let d = -gap; d <= gap; d++) if (i + d >= 0 && i + d < M) under[i + d] = 1;
      });
      // lists by depth (front, back), state (held, free) and strand
      const lists = Array.from({ length: 12 }, () => []), runs = [];
      const strandC = [0, 1, 2].map((k) => Float64Array.from({ length: M }, (_, i) => Math.cos((k * TAU) / 3 + i * DS * .1)));
      const strandS = [0, 1, 2].map((k) => Float64Array.from({ length: M }, (_, i) => Math.sin((k * TAU) / 3 + i * DS * .1)));
      const twistC = Float64Array.from({ length: M }, (_, i) => Math.cos(i * DS * .23)), twistS = Float64Array.from({ length: M }, (_, i) => Math.sin(i * DS * .23));
      const V = Float64Array.from({ length: M }, (_, i) => i / (M - 1));
      const MID = V.map((v) => Math.exp(-(((v - .5) / .13) ** 2))), ARC = V.map((v) => Math.sin(Math.PI * v));
      const crimpC = V.map((v) => Math.cos(v * 34)), crimpS = V.map((v) => Math.sin(v * 34)), driftC = V.map((v) => Math.cos(v * 7 + t * .05)), driftS = V.map((v) => Math.sin(v * 7 + t * .05));
      // a touch: light leaves the nearest point of the rope both ways along every thread
      let from = 0;
      if (age < 3) { let b = 1e9; for (let i = 0; i < M; i += 2) { const d = (P[i][0] - sentAt[0]) ** 2 + (P[i][1] - sentAt[1]) ** 2; if (d < b) { b = d; from = i; } } }
      const reachI = age < 3 ? (age / 3) ** .8 * M : -1, BAND = 14, pulse = [[], [], []];
      for (let f = 0; f < FIBRES; f++) {
        const fb = fibres[f], pull = clamp((u - fb.at) / .08), sc = strandC[fb.strand], ss = strandS[fb.strand];
        const ca = Math.cos(fb.a), sa = Math.sin(fb.a), cw = Math.cos(fb.wave), sw = Math.sin(fb.wave);
        const runAt = Math.floor(mod(t / 7 + fb.wave / TAU, 1) * M), reachF = reachI - (fb.wave / TAU) * M * .12;
        let open = false, lastList = null;
        for (let i = 0; i < M; i++) {
          const c2 = ca * twistC[i] + sa * twistS[i], s2 = sa * twistC[i] - ca * twistS[i];
          const off = 7.5 * sc[i] + fb.q * c2, depth = 7.5 * ss[i] + fb.q * s2, v = V[i];
          const free = pull <= 0 ? 0 : smooth(0, 1, (pull * 1.35 - (fb.dir ? v : 1 - v)) / .35), lane = free > .5 ? 1 : 0;
          let x = P[i][0] + normal[i][0] * off, y = P[i][1] + normal[i][1] * off;
          if (free > 0) {
            const mid = MID[i], arc = ARC[i], crimpSin = crimpS[i] * cw + crimpC[i] * sw, crimpCos = crimpC[i] * cw - crimpS[i] * sw;
            const lx = -14 + 628 * v + 7 * mid * crimpCos;
            const ly = 340 + 10 * arc + fb.spread * (30 + 22 * arc) + 5 * (driftS[i] * cw + driftC[i] * sw) + 11 * mid * crimpSin;
            x += (lx - x) * free; y += (ly - y) * free;
          }
          if (hov > .01) {
            // the threads part under the hand
            const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
            if (d2 < 8100) { const d = Math.sqrt(d2) || 1, p = hov * (1 - d / 90) ** 2; x += (dx / d) * 16 * p; y += (dy / d) * 16 * p; if (p > .12 && (i & 1)) pulse[Math.min(2, Math.floor(p * 4))].push(x, y); }
          }
          if (i === runAt && free > .9) runs.push(x, y);
          if (reachF >= 0) { const z = Math.abs(Math.abs(i - from) - reachF); if (z < BAND && (i & 1)) pulse[Math.min(2, Math.floor((1 - z / BAND) * (1 - age / 3) * 3.4))].push(x, y); }
          if (free < .5 && under[i]) { open = false; continue; }
          const side = depth > 0 || free > .5 ? 0 : 1, list = lists[side * 6 + lane * 3 + fb.strand];
          if (open && list === lastList) list.push(x, y);
          else { if (open) lastList.push(x, y); list.push(NaN, x, y); }
          open = true; lastList = list;
        }
      }
      night(g, c, t, stars, .8);
      light(g);
      g.lineCap = g.lineJoin = 'round';
      glow(g, 300, 300, 300, c.heat(.2), .35 * fade + .1);
      // where the knot was, its trace remains, faintly
      if (hold < 1) {
        g.strokeStyle = c.mark;
        for (const [w, a] of [[7, .05], [1, .3]]) {
          g.lineWidth = w; g.globalAlpha = a * (1 - hold) * fade;
          g.beginPath();
          for (let i = 0; i + 2 < M; i += 4) if (!under[i]) { g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 2][0], P[i + 2][1]); }
          g.stroke();
        }
      }
      const hues = [[.0, .07, .93], [.5, .58, .66]];
      lists.forEach((a, i) => {
        const side = i >= 6 ? 1 : 0, lane = (i % 6) >= 3 ? 1 : 0, col = c.hue(hues[lane][i % 3]);
        g.strokeStyle = col;
        if (!side) { g.lineWidth = 3.4; g.globalAlpha = .06 * fade; polys(g, a); }
        g.lineWidth = side ? .5 : .75;
        g.globalAlpha = (side ? .22 : .62) * fade;
        polys(g, a);
      });
      g.fillStyle = c.heat(.9);
      g.globalAlpha = .12 * fade; dots(g, runs, 6);
      g.globalAlpha = .85 * fade; dots(g, runs, 1.5);
      pulse.forEach((a, i) => { g.fillStyle = c.heat(.8 + .1 * i); g.globalAlpha = .04 + .04 * i; dots(g, a, 5); g.globalAlpha = .5 + .25 * i; dots(g, a, 1.1 + .4 * i); });
      if (hov > .01) glow(g, px, py, 90, c.heat(.5), .22 * hov);
      g.globalAlpha = .85 * fade; // the ember below is drawn at this alpha
      // the heart of the knot: what was held there, quieter as the threads let go
      const settle = smooth(.15, 0, hold);
      ember(g, c, 300 + (6 * Math.sin(t * .13) + lean) * (1 - settle), 262 + 88 * settle, (.45 + .45 * hold) * (.3 + .7 * fade) * beat(t) * (1 + .5 * tug), fade);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A knot seen up close: a tube of rainbow threads twisting through a trefoil. It loosens slowly until the loop lies open
  // around the ember it held. A hand hooks the nearest part of the rope and draws it toward itself (near the heart it also
  // loosens the knot); a touch loosens it at once and sends two fronts of light from that point, around the loop, to the ember.
  knot() {
    const N = 360, PERIOD = 30, W = 8, F = 10, stars = sky(37, 110), click = clicked();
    let extra = 0, sent = -99, from = 0, hov = 0, px = 300, py = 300, hook = 0, prev = null;
    const idx = (x, y) => { let b = 1e9, m = 0; if (prev) for (let i = 0; i < N; i += 2) { const d = (prev[i][0] - x) ** 2 + (prev[i][1] - y) ** 2; if (d < b) { b = d; m = i; } } return m; };
    return (g, c, t, s) => {
      const cl = click(s);
      if (cl) { sent = t; from = idx(cl[0], cl[1]); }
      if (sent > t) sent = -99;
      const age = t - sent, tug = age < 3.5 ? .3 * Math.sin(Math.PI * Math.min(1, age / 3.5)) ** .6 : 0;
      extra = ease(s, extra, s.x == null ? 0 : .3 * smooth(240, 60, Math.hypot(s.x - 300, s.y - 300)), .06);
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      if (s.x != null) { px = ease(s, px, s.x, .3); py = ease(s, py, s.y, .3); hook = idx(px, py); }
      const u = (t % PERIOD) / PERIOD, loose = clamp(smooth(.15, .72, u) + (extra + tug) * (1 - smooth(.72, .9, u))), fade = smooth(0, .05, u) * (1 - smooth(.9, .99, u));
      const A = 2 - 1.75 * loose, S = 232 / (1 + A), rot = .12 * Math.sin(t * .1) - Math.PI / 2, ca = Math.cos(rot), sa = Math.sin(rot);
      const P = [], Z = [];
      for (let i = 0; i < N; i++) {
        const q = (i / N) * TAU, x = Math.sin(q) + A * Math.sin(2 * q), y = Math.cos(q) - A * Math.cos(2 * q);
        P.push([300 + S * (x * ca - y * sa), 300 + S * (x * sa + y * ca)]);
        Z.push(-Math.sin(3 * q));
      }
      // the hand hooks the rope where it is nearest, and draws it a little toward itself
      if (hov > .01 && prev) {
        const [hx, hy] = P[hook], dx = px - hx, dy = py - hy, d = Math.hypot(dx, dy) || 1, pull = Math.min(d, 60) * hov;
        for (let n = -40; n <= 40; n++) { const i = (hook + n + N) % N, w = Math.exp(-((n / 20) ** 2)) * pull / d; P[i][0] += dx * w; P[i][1] += dy * w; }
      }
      prev = P;
      const hide = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const [ax, ay] = P[i], [bx, by] = P[(i + 1) % N];
        for (let j = i + 3; j < N; j++) {
          if (i + N - j < 3) continue;
          const [cx, cy] = P[j], [dx, dy] = P[(j + 1) % N];
          if (Math.max(cx, dx) < Math.min(ax, bx) || Math.min(cx, dx) > Math.max(ax, bx) || Math.max(cy, dy) < Math.min(ay, by) || Math.min(cy, dy) > Math.max(ay, by)) continue;
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (!den) continue;
          const p = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, q = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          if (p < 0 || p > 1 || q < 0 || q > 1) continue;
          const under = Z[i] < Z[j] ? i : j, len = Math.hypot(P[(under + 1) % N][0] - P[under][0], P[(under + 1) % N][1] - P[under][1]) || 1;
          const m = Math.ceil((W * 1.5) / len);
          for (let d = -m; d <= m; d++) hide[(under + d + N) % N] = 1;
        }
      }
      const NX = new Float32Array(N), NY = new Float32Array(N);
      for (let i = 0; i < N; i++) { const a = P[(i + N - 1) % N], b = P[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; NX[i] = -(b[1] - a[1]) / d; NY[i] = (b[0] - a[0]) / d; }
      let first = hide.indexOf(1);
      if (first < 0) first = 0;
      const lists = Array.from({ length: F * 2 }, () => []), core = [];
      for (let f = 0; f < F; f++) {
        let lastList = null;
        for (let n = 0; n <= N; n++) {
          const i = (first + n) % N;
          if (hide[i]) { lastList = null; continue; }
          const ph = (i / N) * TAU * 9 + (f * TAU) / F + t * .25, off = W * Math.cos(ph), list = lists[f * 2 + (Math.sin(ph) > 0 ? 0 : 1)];
          const x = P[i][0] + NX[i] * off, y = P[i][1] + NY[i] * off;
          if (list === lastList) list.push(x, y); else { if (lastList) lastList.push(x, y); list.push(NaN, x, y); }
          lastList = list;
        }
      }
      for (let n = 0; n <= N; n++) { const i = (first + n) % N; if (hide[i]) { if (core.length && !Number.isNaN(core[core.length - 2])) core.push(NaN, NaN); continue; } if (!core.length || Number.isNaN(core[core.length - 2])) { if (core.length) core.splice(-2, 2); core.push(NaN, P[i][0], P[i][1]); } else core.push(P[i][0], P[i][1]); }
      if (core.length && Number.isNaN(core[core.length - 2])) core.splice(-2, 2);
      night(g, c, t, stars, .8);
      light(g);
      g.lineCap = g.lineJoin = 'round';
      glow(g, 300, 300, 280, c.heat(.2), .3);
      g.strokeStyle = c.heat(.45);
      for (const [w, a] of [[22, .035], [9, .06]]) { g.lineWidth = w; g.globalAlpha = a * fade; polys(g, core); }
      lists.forEach((a, i) => {
        const back = i & 1;
        g.strokeStyle = c.hue(wrap(Math.floor(i / 2) / F + t / 60));
        g.lineWidth = back ? .5 : .9;
        g.globalAlpha = (back ? .2 : .7) * fade;
        polys(g, a);
      });
      // light running around the loop
      const runs = [], pulse = age < 2.6 ? age / 2.6 : -1;
      for (let m = 0; m < 7; m++) { const i = Math.floor(mod(t / 14 + m / 7, 1) * N); if (!hide[i]) runs.push(P[i][0], P[i][1]); }
      g.fillStyle = c.heat(.95);
      g.globalAlpha = .1 * fade; dots(g, runs, 9);
      g.globalAlpha = .9 * fade; dots(g, runs, 1.8);
      // a touch: two fronts of light leave the touched point and run around the loop until they meet
      if (pulse >= 0 && pulse < 1) {
        const head = Math.round(((1 - (1 - pulse) ** 2) * N) / 2), tail = 34, vis = Math.max(.35, fade) * (1 - smooth(.75, 1, pulse));
        g.strokeStyle = c.heat(.9);
        for (const dir of [1, -1]) {
          const pts = [];
          for (let n = Math.max(0, head - tail); n <= head; n++) { const i = (from + dir * n + N * 2) % N; pts.push(hide[i] ? NaN : P[i][0], hide[i] ? NaN : P[i][1]); }
          for (const [w, a] of [[16, .07], [6, .16], [2.4, .9]]) {
            g.lineWidth = w; g.globalAlpha = a * vis;
            g.beginPath();
            let pen = false;
            for (let j = 0; j < pts.length; j += 2) { if (Number.isNaN(pts[j])) { pen = false; continue; } if (pen) g.lineTo(pts[j], pts[j + 1]); else { g.moveTo(pts[j], pts[j + 1]); pen = true; } }
            g.stroke();
          }
          const i = (from + dir * head + N * 2) % N;
          spark(g, P[i][0], P[i][1], 3, c.mark, vis, c.heat(1));
        }
        if (pulse < .3) spark(g, P[from][0], P[from][1], 3, c.mark, 1 - pulse / .3, c.heat(1));
      }
      if (hov > .01 && prev) { glow(g, px, py, 70, c.heat(.5), .2 * hov); spark(g, P[hook][0], P[hook][1], 2.4, c.heat(.8), hov, c.heat(1)); }
      const meet = pulse >= 0 ? Math.exp(-(((pulse - .82) / .12) ** 2)) : 0;
      ember(g, c, 300, 300, (.5 + .45 * loose) * (.4 + .6 * fade) * beat(t) * (1 + .8 * meet), .5 + .5 * fade + .5 * meet);
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A life: a braid of warm light drawn from the left, an ember at its head. Then the ember goes out, and truly: the braid
  // comes apart from its end backward, and its dust drifts into a vast field of other lights, which it brightens for a while.
  // A hand lights the field around it, and the lights there lean toward it; near the life, the ember answers the gaze and
  // the braid brightens. A touch sends a ring through the field: each light it passes flares, as if remembering.
  death() {
    const r = rng(61), PERIOD = 26, X0 = 26, END = 318, Y = 300, golden = Math.PI * (3 - Math.sqrt(5)), FC = [356, 300];
    const field = Array.from({ length: 1500 }, (_, i) => {
      const q = 300 * ((i + .5) / 1500) ** .7, a = i * golden;
      return [FC[0] + q * Math.cos(a) * 1.05, FC[1] + q * Math.sin(a) * .9, .4 + r() * .7, r() * TAU, wrap(a / TAU * .2 + q / 300 * .6 + .45)];
    });
    const dust = Array.from({ length: 900 }, () => { const v = r(); return { v, to: field[Math.floor(r() * field.length)], curl: r() * 2 - 1, strand: Math.floor(r() * 14), late: r() * .05 }; });
    const strands = Array.from({ length: 14 }, (_, j) => ({ o: (j / 13 - .5) * 2, ph: r() * TAU, hue: wrap(.88 + j * .022) }));
    const lifeY = (x, t) => Y + 18 * Math.sin(x * .019 - t * .22) * smooth(20, 140, x) + 6 * Math.sin(x * .06 + t * .35);
    const strandY = (st, x, v, t) => lifeY(x, t) + st.o * (20 * (1 - .85 * v)) * (1 + .3 * Math.sin(x * .05 + st.ph + t * .3)) + 3 * Math.sin(x * .09 + st.ph);
    const click = clicked(), rings = [];
    let hx = 0, hy = 0, hov = 0;
    return (g, c, t, s) => {
      const cl = click(s);
      if (cl) { rings.push({ x: cl[0], y: cl[1], at: t }); if (rings.length > 3) rings.shift(); }
      if (s.x != null) { hx = ease(s, hx, s.x, .3); hy = ease(s, hy, s.y, .3); }
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      const u = mod(t, PERIOD) / PERIOD;
      const grow = smooth(0, .42, u) ** .85, out = smooth(.44, .6, u), cut = u < .5 ? 1 : 1 - (u - .5) / .3;
      const vEnd = Math.min(grow, cut), xEnd = X0 + (END - X0) * vEnd, settled = 1 - smooth(.82, 1, u);
      // the field of other lights
      const fb = Array.from({ length: 12 }, () => []), near = [[], [], []];
      for (const [x, y, sz, ph, hue] of field) {
        const tw = .6 + .4 * Math.sin(t * .5 + ph);
        let X = x + .8 * Math.sin(t * .3 + ph), Yy = y + .8 * Math.cos(t * .27 + ph), h = 0;
        if (hov > .01) { const d2 = (x - hx) ** 2 + (y - hy) ** 2; if (d2 < 60000) { h = hov * Math.exp(-d2 / 6000); X += (hx - x) * .12 * h; Yy += (hy - y) * .12 * h; } }
        fb[Math.floor(hue * 12) % 12].push(X, Yy, sz * tw);
        for (const q of rings) { const age = t - q.at, d = Math.hypot(x - q.x, y - q.y); if (age >= 0 && age < 6) h += 1.2 * Math.exp(-(((d - age * 120) / 22) ** 2)) * (1 - age / 6); }
        if (h > .08) near[Math.min(2, Math.floor(h * 3))].push(X, Yy, sz * (1 + 1.6 * Math.min(1, h)));
      }
      light(g);
      glow(g, FC[0], FC[1], 360, c.cool(.25), .35);
      glow(g, FC[0], FC[1], 140, c.cool(.4), .15);
      fb.forEach((a, i) => { g.fillStyle = i % 4 ? c.cool(.45 + i * .04) : c.hue((i + .5) / 12); g.globalAlpha = .05; dotsR(g, a, 3.5); g.globalAlpha = .4; dotsR(g, a); });
      near.forEach((a, i) => { g.fillStyle = c.cool(.75 + .1 * i); g.globalAlpha = .03 + .025 * i; dotsR(g, a, 4); g.globalAlpha = .5 + .22 * i; dotsR(g, a); });
      if (hov > .01) glow(g, hx, hy, 110, c.cool(.6), .4 * hov);
      for (const q of rings) { const age = t - q.at; if (age >= 0 && age < 1.2) { const f = 1 - age / 1.2; glow(g, q.x, q.y, 40 + 80 * age, c.cool(.8), .5 * f); spark(g, q.x, q.y, 2.4, c.cool(.7), f, c.heat(1)); } }
      // the life, a braid that thins toward its head
      if (vEnd > .003) {
        g.lineCap = g.lineJoin = 'round';
        const STEPS = 60, held = hov * Math.exp(-((hy - lifeY(clamp(hx, X0, xEnd), t)) ** 2) / 3000) * smooth(X0 - 60, X0, hx) * smooth(xEnd + 60, xEnd, hx);
        strands.forEach((st) => {
          g.strokeStyle = c.hue(st.hue);
          g.beginPath();
          for (let i = 0; i <= STEPS; i++) { const v = (i / STEPS) * vEnd, x = X0 + (END - X0) * v, y = strandY(st, x, v, t); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
          for (const [w, a] of [[5, .05], [.9, .45]]) { g.lineWidth = w; g.globalAlpha = a * (u < .5 ? 1 : .5 + .5 * cut) * (1 + 1.2 * held); g.stroke(); }
        });
        // light running toward the head while it lives
        const runs = [];
        for (let m = 0; m < 14; m++) { const v = mod(t / 6 + m / 14, 1) * vEnd; if (v < vEnd - .01) runs.push(X0 + (END - X0) * v, strandY(strands[m], X0 + (END - X0) * v, v, t)); }
        g.fillStyle = c.heat(.9);
        g.globalAlpha = .12 * (1 - out); dots(g, runs, 6);
        g.globalAlpha = .8 * (1 - out); dots(g, runs, 1.5);
      }
      // its dust leaves the end and settles among the others
      const db = Array.from({ length: 5 }, () => []), tr = Array.from({ length: 5 }, () => []), sb = Array.from({ length: 4 }, () => []);
      for (const d of dust) {
        const td = .5 + .3 * (1 - d.v) + d.late, f = clamp((u - td) / .2);
        if (u < td) continue;
        const x0 = X0 + (END - X0) * d.v, y0 = strandY(strands[d.strand], x0, d.v, t), [tx, ty, sz, , hue] = d.to;
        const e = 1 - (1 - f) ** 2.2, dx = tx - x0, dy = ty - y0, n = Math.hypot(dx, dy) || 1, sw = d.curl * 90 * Math.sin(Math.PI * e);
        if (f < 1) {
          const e0 = 1 - (1 - Math.max(0, f - .012)) ** 2.2, s0 = d.curl * 90 * Math.sin(Math.PI * e0), b = Math.min(4, Math.floor(f * 5));
          db[b].push(x0 + dx * e - (dy / n) * sw, y0 + dy * e + (dx / n) * sw, 1.3 - .5 * f);
          tr[b].push(x0 + dx * e0 - (dy / n) * s0, y0 + dy * e0 + (dx / n) * s0, x0 + dx * e - (dy / n) * sw, y0 + dy * e + (dx / n) * sw);
        } else sb[Math.min(3, Math.floor(clamp((u - td - .2) / .1) * 4))].push(tx, ty, sz * 1.3);
      }
      g.lineCap = 'round';
      db.forEach((a, i) => {
        g.strokeStyle = g.fillStyle = c.heat(.85 - .1 * i);
        g.lineWidth = 1; g.globalAlpha = .3 - .04 * i; segs(g, tr[i]);
        g.globalAlpha = .07; dotsR(g, a, 4); g.globalAlpha = .85 - .1 * i; dotsR(g, a);
      });
      sb.forEach((a, i) => { g.fillStyle = [c.heat(.8), c.heat(.95), c.cool(.9), c.cool(.75)][i]; g.globalAlpha = .08 * settled; dotsR(g, a, 3.5); g.globalAlpha = (.75 - .1 * i) * settled; dotsR(g, a); });
      // the head: an ember while it lives, nothing after
      const life = 1 - out;
      if (life > .01) {
        const hxE = X0 + (END - X0) * Math.min(grow, 1), hyE = lifeY(hxE, t);
        // looked at, the life answers while it lasts
        const gaze = hov * Math.exp(-((hx - hxE) ** 2 + (hy - hyE) ** 2) / 22000);
        ember(g, c, hxE, hyE, (.7 + .35 * grow) * beat(t) * (.4 + .6 * life) * (1 + .45 * gaze), life);
      }
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // Leaves of light fall and lie down; slowly they come apart into the ground, a deep bed of embers made of all the leaves
  // before them. Roots draw that light up, and from it a sprout rises with a new ember at its tip. A hand is a wind: it pushes
  // the falling leaves, lifts the lying ones, stirs the embers of the ground and bends the sprout. A touch lets a leaf fall
  // from there; where it lands it melts into the ground in a flare, and its light runs up the roots to the sprout's ember.
  leaves() {
    const PERIOD = 30, GROUND = 468, N = 17, r = rng(83);
    const soil = Array.from({ length: 1300 }, () => { const x = 300 + gauss(r) * 150; return [x, GROUND + 5 + r() ** 1.8 * 115, .4 + r() * 1.1, r(), r() * TAU, 3 + r() * 6]; }).filter(([x]) => x > 20 && x < 580);
    const motes = soil.slice(0, 40).map(([x, , sz, v, ph]) => [x, 0, sz, v, ph / TAU]);
    const roots = Array.from({ length: 13 }, (_, i) => {
      const a = Math.PI / 2 + (i / 12 - .5) * 2.6, len = 60 + r() * 70, pts = [];
      for (let j = 0; j <= 14; j++) { const v = j / 14, w = Math.sin(v * 5 + i) * 8 * v; pts.push(300 + Math.cos(a) * len * v - Math.sin(a) * w, GROUND + 14 + Math.sin(a) * len * v * .8 + Math.cos(a) * w); }
      return { pts, ph: r() };
    });
    const leafAt = (k, i) => {
      const m = rng(k * 211 + i * 7 + 1); m();
      return { x: 60 + m() * 480, start: (i / N) * .55 + m() * .05, dur: .17 + m() * .08, sway: 18 + m() * 34, w: 1.2 + m() * 1.1, rot: m() * TAU, size: 16 + m() * 12, lie: m() < .5 ? 0 : Math.PI, ph: m() * TAU, col: Math.floor(m() * 4) };
    };
    const leaf = (g, x, y, a, size, flat) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      const P = (lx, ly) => [x + lx * ca - ly * sa, y + (lx * sa + ly * ca) * (1 - .6 * flat)];
      for (const side of [1, -1]) for (let i = 0; i <= 12; i++) {
        const v = i / 12, [X, Y] = P((v - .5) * size * 2, side * size * .42 * Math.sin(Math.PI * v) ** .9);
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      }
      const [ax, ay] = P(-size * 1.25, 0), [bx, by] = P(size * .85, 0);
      g.moveTo(ax, ay); g.lineTo(bx, by);
    };
    const stars = sky(53, 120, (x, y) => y < GROUND - 20), click = clicked(), dropped = [];
    let wx = 300, wy = 300, wind = 0;
    return (g, c, t, s) => {
      const cl = click(s);
      if (cl) {
        const y0 = Math.min(cl[1], GROUND - 40), x0 = clamp(cl[0], 40, 560);
        dropped.push({ x: x0, y: y0, at: t, rot: t * 7 % TAU, dur: .7 + 1.5 * (GROUND - y0) / GROUND });
        if (dropped.length > 5) dropped.shift();
      }
      if (s.x != null) { wx = ease(s, wx, s.x, .25); wy = ease(s, wy, s.y, .25); }
      wind = ease(s, wind, s.x == null ? 0 : 1, .1);
      const k = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
      const blow = (x, y) => wind * 80 * Math.sign(x - wx || 1) * Math.exp(-(((x - wx) / 120) ** 2) - (((y - wy) / 190) ** 2));
      // how strongly the wind reaches the ground at x
      const gust = (x) => wind * Math.exp(-(((x - wx) / 90) ** 2)) * smooth(GROUND + 160, GROUND - 60, wy);
      // a dropped leaf, once landed, melts into the ground: a flare there, then light up the roots
      let feed = 0;
      const flares = [];
      for (const d of dropped) {
        const land = t - d.at - d.dur;
        if (land < 0 || land > 4) continue;
        flares.push(d.x, land);
        feed = Math.max(feed, Math.exp(-(((land - 1.6) / .5) ** 2)));
      }
      const grow = smooth(.36, .9, u), open = smooth(.62, .92, u), gone = 1 - smooth(.95, 1, u);
      night(g, c, t, stars, .8);
      light(g);
      glow(g, 300, GROUND + 40, 320, c.heat(.3), .4);
      // the ground: a bed of embers, the leaves of every year before
      const sb = Array.from({ length: 8 }, () => []);
      const stir = [[], [], []];
      for (const [x, y, sz, v, ph, per] of soil) {
        let e = 0;
        if (wind > .01) e = gust(x) * Math.exp(-(y - GROUND) / 50);
        for (let j = 0; j < flares.length; j += 2) { const land = flares[j + 1], d = Math.hypot(x - flares[j], (y - GROUND) * 1.6); e += Math.exp(-(((d - land * 70) / 26) ** 2)) * Math.exp(-land * .8) * 1.5; }
        if (e > .1) { stir[Math.min(2, Math.floor(e * 3))].push(x + 3 * e * Math.sin(t * 9 + ph), y - 10 * e * (.6 + .4 * Math.sin(t * 5 + ph * 3)), sz * (1 + .8 * Math.min(1, e))); continue; }
        sb[Math.floor(v * 4) * 2 + (Math.sin((t * TAU) / per + ph) > .3 ? 1 : 0)].push(x, y, sz);
      }
      sb.forEach((a, i) => { g.fillStyle = c.heat(.25 + .13 * (i >> 1)); g.globalAlpha = .05; dotsR(g, a, 3.5); g.globalAlpha = (i & 1) ? .7 : .35; dotsR(g, a); });
      stir.forEach((a, i) => { g.fillStyle = c.heat(.7 + .12 * i); g.globalAlpha = .07 + .03 * i; dotsR(g, a, 3.5); g.globalAlpha = .65 + .15 * i; dotsR(g, a); });
      for (let j = 0; j < flares.length; j += 2) { const land = flares[j + 1]; glow(g, flares[j], GROUND + 10, 60 + 50 * land, c.heat(.7), .55 * Math.exp(-land * 1.1)); }
      g.strokeStyle = c.heat(.6);
      g.lineCap = g.lineJoin = 'round';
      for (const [w, a] of [[6, .05], [1, .35]]) { g.lineWidth = w; g.globalAlpha = a; g.beginPath(); g.moveTo(30, GROUND); g.lineTo(570, GROUND); g.stroke(); }
      // motes of warmth rising from the ground
      g.fillStyle = c.heat(.75);
      for (const [x0, , sz, v, ph] of motes) { const f = mod(t / (14 + 10 * v) + ph, 1); g.globalAlpha = .55 * Math.sin(Math.PI * f); g.beginPath(); g.arc(x0 + 14 * Math.sin(f * 5 + ph * 9), GROUND - 4 - f * 230, sz * .8, 0, TAU); g.fill(); }
      // roots draw the light of the ground up toward the seed
      const rootGrow = Math.max(smooth(.25, .6, u) * gone, .6 * feed), sap = [];
      if (feed > .02) { g.strokeStyle = c.heat(.85); g.lineWidth = 1.4; g.globalAlpha = .5 * feed; g.beginPath(); for (const rt of roots) { g.moveTo(rt.pts[0], rt.pts[1]); for (let j = 1; j <= 14; j++) g.lineTo(rt.pts[j * 2], rt.pts[j * 2 + 1]); } g.stroke(); }
      if (rootGrow > .01) {
        g.strokeStyle = c.heat(.55); g.lineWidth = .7; g.globalAlpha = .35 * rootGrow;
        g.beginPath();
        for (const rt of roots) {
          const n = Math.max(1, Math.round(14 * rootGrow));
          g.moveTo(rt.pts[0], rt.pts[1]);
          for (let j = 1; j <= n; j++) g.lineTo(rt.pts[j * 2], rt.pts[j * 2 + 1]);
          const v = 1 - mod(t / 4 + rt.ph, 1), j = Math.min(n, Math.floor(v * n));
          sap.push(rt.pts[j * 2], rt.pts[j * 2 + 1]);
        }
        g.stroke();
        g.fillStyle = c.heat(.9); g.globalAlpha = .8 * rootGrow; dots(g, sap, 1.3);
      }
      // the leaves of this autumn
      const lb = [[], [], [], []], crumbs = [];
      const fallen = (L, f, x, y, fall, lieAt) => {
        const settle = smooth(1, 1.35, f), melt = smooth(lieAt, lieAt + .2, u);
        return { a: fall + (L.lie - fall) * settle, settle, melt };
      };
      for (let i = 0; i < N; i++) {
        const L = leafAt(k, i), f = (u - L.start) / L.dur;
        if (f < 0) continue;
        const swing = Math.min(f, 1) * L.w * TAU + L.ph, y = f < 1 ? -30 + (GROUND - 4 + 30) * f : GROUND - 4;
        const x = L.x + L.sway * Math.sin(swing) + (f < 1 ? blow(L.x, y) : 0), fall = L.rot + .8 * Math.sin(swing + 1);
        const st = fallen(L, f, x, y, fall, Math.max(.72, L.start + L.dur + .06));
        if (st.melt >= 1) continue;
        const lift = f >= 1 ? gust(L.x) * (1 - st.melt) : 0, flut = lift * Math.sin(t * 7 + L.ph);
        lb[L.col].push([x + 10 * lift * Math.sign(L.x - wx || 1), y + 6 * st.melt - 16 * lift * (.7 + .3 * flut), st.a + .5 * flut, L.size * (1 - .5 * st.melt), st.settle * (1 - .7 * lift), 1 - st.melt]);
        if (st.melt > 0) for (let j = 0; j < 6; j++) { const q = mod(st.melt * 2 + j / 6, 1); crumbs.push(x + (j - 2.5) * L.size * .3, y + 4 + q * 40, 1 - q); }
      }
      for (const d of dropped) {
        const age = t - d.at, f = age / d.dur;
        if (age < 0 || f > 2.4) continue;
        const y = f < 1 ? d.y + (GROUND - 4 - d.y) * f * f : GROUND - 4, swing = Math.min(f, 1) * 1.6 * TAU, melt = smooth(1.05, 2.4, f), x = d.x + 16 * Math.sin(swing) * Math.min(1, f * 4);
        lb[3].push([x, y + 6 * melt, d.rot + .8 * Math.sin(swing + 1) * (1 - smooth(1, 1.2, f)), 18 * (1 - .5 * melt), smooth(1, 1.2, f), 1 - melt]);
        if (f < .25) spark(g, d.x, d.y, 2.4, c.heat(.8), 1 - f * 4, c.heat(1));
        if (melt > 0) for (let j = 0; j < 6; j++) { const q = mod(melt * 2 + j / 6, 1); crumbs.push(d.x + 16 * Math.sin(1.6 * TAU) + (j - 2.5) * 5, GROUND + q * 40, 1 - q); }
      }
      const cols = [.55, .65, .75, .85];
      lb.forEach((list, ci) => {
        g.strokeStyle = g.fillStyle = c.heat(cols[ci]);
        for (const [x, y, a, size, flat, alpha] of list) {
          g.beginPath(); leaf(g, x, y, a, size, flat);
          g.globalAlpha = .13 * alpha; g.fill();
          g.lineWidth = 5; g.globalAlpha = .07 * alpha; g.stroke();
          g.lineWidth = 1; g.globalAlpha = .8 * alpha; g.stroke();
        }
      });
      g.fillStyle = c.heat(.7);
      for (let i = 0; i < crumbs.length; i += 3) { g.globalAlpha = .6 * crumbs[i + 2]; g.beginPath(); g.arc(crumbs[i], crumbs[i + 1], 1, 0, TAU); g.fill(); }
      // a sprout rises from the ground the leaves became
      const top = GROUND + 12 - 170 * grow;
      const stem = (v) => [300 + 9 * Math.sin(v * 2.6) * grow + blow(300, top) * .3 * v * v, GROUND + 12 - (GROUND + 12 - top) * v];
      if (grow > .005) {
        g.strokeStyle = c.hue(.4);
        g.beginPath();
        for (let i = 0; i <= 24; i++) { const [x, y] = stem(i / 24); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        for (const [w, a] of [[7, .07], [1.4, .9]]) { g.lineWidth = w; g.globalAlpha = a * gone; g.stroke(); }
        if (open > .01) {
          const [x, y] = stem(1);
          g.strokeStyle = g.fillStyle = c.hue(.44);
          g.beginPath();
          leaf(g, x - 15 * open * Math.cos(.5 * open), y - 15 * open * Math.sin(.5 * open) + 2, Math.PI + .5 * open, 13 * open, 0);
          leaf(g, x + 15 * open * Math.cos(.5 * open), y - 15 * open * Math.sin(.5 * open) + 2, -.5 * open, 13 * open, 0);
          g.globalAlpha = .12 * gone; g.fill();
          g.lineWidth = 1; g.globalAlpha = .85 * gone; g.stroke();
        }
      }
      const [sx, sy] = stem(1);
      ember(g, c, sx, sy, (.35 + .25 * grow) * (.4 + .6 * gone) * beat(t) * (1 + .9 * feed), Math.min(1, .5 + .5 * gone + feed));
      light(g, false);
      g.globalAlpha = 1;
    };
  },

  // A night sea of light. A drop falls, carrying glints of what it passed through, and opens rings whose crests take its
  // colours; where earlier drops fell, a faint coloured light stays on the water. A hand resting over the sea troubles it:
  // small rings open under it and take colour, and the next drop will fall on that side. A touch lets a drop fall from there.
  drop() {
    const PERIOD = 8, FALL = .6, ROWS = 54, COLS = 100, HORIZON = 292, Z0 = .42;
    const stars = sky(11, 150, (x, y) => y < HORIZON - 6), click = clicked(), placed = new Map(), extra = [];
    let aim = 0, hov = 0, tz = Z0, tnx = 0;
    const persp = (z) => .2 + .8 * z ** 1.25;
    const sx = (nx, z) => 300 + nx * 300 * (.86 + persp(z) * .4);
    const sy = (z) => HORIZON + 292 * z ** 1.55;
    // the point of the water under a screen point (above the horizon: where it would fall)
    const zOf = (y) => (y <= HORIZON + 8 ? Z0 : clamp(((y - HORIZON) / 292) ** (1 / 1.55), .08, 1));
    return (g, c, t, s) => {
      aim = ease(s, aim, s.x == null ? 0 : clamp(((s.x - 300) / 300) * 1.1, -.75, .75), .05);
      hov = ease(s, hov, s.x == null ? 0 : 1, .12);
      if (s.x != null) { const z = zOf(s.y); tz = ease(s, tz, z, .3); tnx = ease(s, tnx, clamp((s.x - 300) / (300 * (.86 + persp(z) * .4)), -1, 1), .3); }
      const cl = click(s);
      if (cl) { extra.push({ nx: clamp(((cl[0] - 300) / 300) * 1.1, -.75, .75), at: t, top: clamp(cl[1], 20, sy(Z0) - 60) }); if (extra.length > 3) extra.shift(); }
      const k = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
      const nxOf = (j) => { if (!placed.has(j)) placed.set(j, s.snap ? 0 : aim); if (placed.size > 40) placed.delete(placed.keys().next().value); return placed.get(j); };
      const drops = [];
      for (let j = k; j >= k - 2; j--) drops.push({ nx: nxOf(j), age: t - (j + .3) * PERIOD, j });
      for (const e of extra) drops.push({ nx: e.nx, age: t - e.at - FALL, j: -1 });
      const live = drops.filter((d) => d.age > 0 && d.age < 30);
      night(g, c, t, stars, .85);
      light(g);
      glow(g, 300, HORIZON, 320, c.cool(.3), .35);
      g.strokeStyle = c.cool(.7); g.lineWidth = .6; g.globalAlpha = .3;
      g.beginPath(); g.moveTo(0, HORIZON); g.lineTo(600, HORIZON); g.stroke();
      // the water: rows of light; crests of the rings take the colours of the drop
      const base = Array.from({ length: 6 }, () => []), crest = Array.from({ length: 36 }, () => []);
      g.lineCap = 'round';
      let prev = null;
      for (let row = 0; row < ROWS; row++) {
        const z = row / (ROWS - 1), p = persp(z), y0 = sy(z), cur = [];
        for (let col = 0; col <= COLS; col++) {
          const nx = (col / COLS) * 2 - 1;
          let h = .05 * Math.sin(nx * 4 + z * 8 + t * .35) + .03 * Math.sin(nx * 11 - z * 5 - t * .5), ring = 0, ang = 0;
          for (const d of live) {
            const dd = Math.hypot(nx - d.nx, (z - Z0) * 1.55), front = d.age * .16, w = Math.exp(-(((dd - front) / .3) ** 2)) * Math.exp(-d.age / 11);
            const v = w * Math.sin((dd - front) * 30);
            h += v;
            if (v > ring) { ring = v; ang = Math.atan2(z - Z0, nx - d.nx); }
          }
          if (hov > .01) {
            // a hand over the water: small rings, always opening under it
            const dz = (z - tz) * 1.55, dd = Math.hypot(nx - tnx, dz);
            if (dd < .6) { const v = hov * .75 * Math.exp(-((dd / .26) ** 2)) * Math.sin(dd * 36 - t * 6); h += v * .8; if (v > ring) { ring = v; ang = Math.atan2(dz, nx - tnx) + t * .3; } }
          }
          cur.push(sx(nx, z), y0 - h * 58 * p, ring, ang);
        }
        const fadeIn = smooth(0, .3, z);
        for (let col = 0; col < COLS; col++) {
          const a = col * 4, ring = (cur[a + 2] + cur[a + 6]) / 2;
          if (ring > .12) crest[Math.min(2, Math.floor(ring * 3)) * 12 + Math.floor(wrap(cur[a + 3] / TAU) * 12) % 12].push(cur[a], cur[a + 1], cur[a + 4], cur[a + 5], fadeIn * (.35 + .65 * z));
          else base[Math.min(5, Math.floor(z * 6))].push(cur[a], cur[a + 1], cur[a + 4], cur[a + 5]);
        }
        prev = cur;
      }
      base.forEach((a, i) => { g.strokeStyle = c.cool(.35 + .08 * i); g.lineWidth = .35 + .12 * i; g.globalAlpha = (i ? .14 + .06 * i : .1); segs(g, a); });
      crest.forEach((a, i) => {
        if (!a.length) return;
        const lvl = Math.floor(i / 12);
        g.strokeStyle = c.hue(((i % 12) + .5) / 12);
        g.lineWidth = .8 + .4 * lvl;
        g.globalAlpha = .35 + .2 * lvl;
        g.beginPath();
        for (let j = 0; j < a.length; j += 5) { g.moveTo(a[j], a[j + 1]); g.lineTo(a[j + 2], a[j + 3]); }
        g.stroke();
      });
      // what earlier drops left on the water
      const iy = sy(Z0), ip = persp(Z0);
      for (let j = k - 1; j >= k - 6; j--) {
        const age = t - (j + .3) * PERIOD;
        if (age < 0) continue;
        const nx = nxOf(j), a = Math.exp(-age / 30), q = rng(j * 13 + 7);
        for (let m = 0; m < 3; m++) {
          const ang = q() * TAU, rad = .05 + age * .006 * (1 + q());
          glow(g, sx(nx + rad * Math.cos(ang), Z0), iy + rad * Math.sin(ang) * 40 * ip, 26, c.hue(q()), .3 * a);
        }
      }
      // the drop, and its reflection
      for (const d of [{ nx: nxOf(k), f: u / .3, top: 30 }, ...extra.map((e) => ({ nx: e.nx, f: (t - e.at) / FALL, top: e.top }))]) {
        if (d.f < 0 || d.f >= 1) continue;
        const x = sx(d.nx, Z0), top = d.top, y = top + (iy - top) * d.f * d.f;
        g.strokeStyle = c.heat(.7); g.lineWidth = 1; g.globalAlpha = .35;
        g.beginPath(); g.moveTo(x, y - 30 - 60 * d.f); g.lineTo(x, y); g.stroke();
        glow(g, x, y, 70, c.mark, .5);
        spark(g, x, y, 4.2, c.mark, 1, c.heat(1));
        for (let m = 0; m < 3; m++) { const a = t * 2 + (m * TAU) / 3; spark(g, x + 14 * Math.cos(a), y + 14 * Math.sin(a) * .5, 1.2, [c.cool(.7), c.hue(.4), c.hue(.12)][m], .9, c.heat(1)); }
        for (let m = 1; m <= 5; m++) glow(g, x, iy + (iy - y) * .25 * (m / 5) + m * 6, 22 - m * 2, c.heat(.6), .12 * d.f);
      }
      // the impact: the ember where the drop joins the sea
      const ix = sx(nxOf(k), Z0), since = u - .3;
      if (since > 0) ember(g, c, ix, iy, .4 + .6 * Math.exp(-since * 6), Math.exp(-since * 2.5));
      for (const e of extra) { const a = t - e.at - FALL; if (a > 0 && a < 4) ember(g, c, sx(e.nx, Z0), iy, .4 + .6 * Math.exp(-a * 3), Math.exp(-a * 1.2)); }
      if (hov > .01) { glow(g, sx(tnx, tz), sy(tz), 70 + 60 * persp(tz), c.cool(.6), .4 * hov); spark(g, sx(tnx, tz), sy(tz), 1.6, c.cool(.7), .8 * hov, c.heat(1)); }
      light(g, false);
      g.globalAlpha = 1;
    };
  },
  };
};

export const FROZEN = { balance: 3, field: 7.6, ripple: 9.5, shadow: 11, mend: 26, knot: 12, death: 14, leaves: 18.6, drop: 21.2 };
