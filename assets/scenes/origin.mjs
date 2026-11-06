// Figures: river, fractal, void, emerge, birth, body, play, self. Each factory returns draw(g, c, t, s); see ../scenes.mjs for the contract.
// All of them are light on the night: additive fibres and sparks, the banner's spectrum, and the ember (the Source, a life) as a hot point.
export default (K) => {
  const { TAU, rng, smooth, clamp, ease, label, light } = K;
  // glow and spark at an absolute strength, whatever alpha the last batch left behind
  const glow = (g, ...a) => { g.globalAlpha = 1; K.glow(g, ...a); };
  const spark = (g, ...a) => { g.globalAlpha = 1; K.spark(g, ...a); };

  /* ---------- local helpers ---------- */
  const frac = (x) => x - Math.floor(x);
  // a night sky: [x, y, size, phase, period]
  const sky = (r, n, inside = () => true) => {
    const out = [];
    while (out.length < n) { const x = r() * 600, y = r() * 600; if (inside(x, y)) out.push([x, y, .25 + r() ** 3 * 1.05, r() * TAU, 3 + r() * 6]); }
    return out;
  };
  const twinkle = (g, c, stars, t, a = .42, color = c.ink) => {
    g.fillStyle = color;
    for (let b = 0; b < 3; b++) {
      g.globalAlpha = a * (.25 + .75 * b / 2);
      g.beginPath();
      for (const [x, y, size, ph, per] of stars) {
        if (Math.min(2, Math.floor((.5 + .5 * Math.sin((t * TAU) / per + ph)) * 3)) !== b) continue;
        g.moveTo(x + size, y); g.arc(x, y, size, 0, TAU);
      }
      g.fill();
    }
  };
  // filled discs from a flat list [x, y, r, ...]
  const discs = (g, list, stride = 3, scale = 1) => {
    g.beginPath();
    for (let i = 0; i < list.length; i += stride) { const R = list[i + 2] * scale; if (R > .05) { g.moveTo(list[i] + R, list[i + 1]); g.arc(list[i], list[i + 1], R, 0, TAU); } }
    g.fill();
  };
  // a polyline from a flat list, with NaN as a pen lift
  const poly = (g, list) => {
    let up = true;
    for (let i = 0; i < list.length; i += 2) {
      if (Number.isNaN(list[i])) { up = true; continue; }
      if (up) g.moveTo(list[i], list[i + 1]); else g.lineTo(list[i], list[i + 1]);
      up = false;
    }
  };
  // a fibre of light: a wide faint stroke under a thin bright one
  const fibre = (g, list, color, width, alpha, halo = 4.5) => {
    if (!list.length) return;
    g.strokeStyle = color;
    g.globalAlpha = alpha * .14; g.lineWidth = width * halo; g.beginPath(); poly(g, list); g.stroke();
    g.globalAlpha = alpha; g.lineWidth = width; g.beginPath(); poly(g, list); g.stroke();
  };
  const heartbeat = (t, per = 3.4) => { const u = frac(t / per) * per; return 1 + .16 * Math.exp(-((u - .45) ** 2) * 40) + .07 * Math.exp(-((u - 1.3) ** 2) * 40); };
  // the ember: a consciousness, a life, the Source
  const ember = (g, c, x, y, k = 1, beat = 1) => {
    glow(g, x, y, 100 * k * beat, c.mark, .5);
    glow(g, x, y, 30 * k * beat, c.heat(.8), .9);
    spark(g, x, y, 5.5 * k * beat, c.mark, 1);
  };
  const clicked = (state, s, t) => { if (s.click && s.click !== state.last) { state.last = s.click; state.at = t; state.x = s.click[0]; state.y = s.click[1]; return true; } return false; };
  const end = (g) => { light(g, false); g.globalAlpha = 1; };

  return {
  // A river followed back to its source. A delta of light opens downstream; a wave of light runs down it (what unfolds),
  // and every channel carries sparks back up to the one hot point (what returns). Hover: the way back from that place
  // lights up. Click: every mouth sends its light home at once.
  river() {
    const r = rng(41), D = 7, NL = 1 << D, SX = 300, SY = 62, BOT = 540, P = 120;
    const leafX = Array.from({ length: NL }, (_, i) => 30 + (540 * (i + .5 + (r() - .5) * .8)) / NL);
    const nodes = [];
    for (let id = 1; id < 2 * NL; id++) {
      const level = Math.floor(Math.log2(id)), span = 1 << (D - level), first = (id - (1 << level)) * span;
      let x = 0; for (let k = 0; k < span; k++) x += leafX[first + k]; x /= span;
      const y = SY + (BOT - SY) * ((level + 1) / (D + 1)) ** .8 + (level ? (r() - .5) * 24 : 0) - (level === D ? r() ** 2 * 60 : 0);
      nodes[id] = { x: x + (level && level < D ? (r() - .5) * 20 : 0), y, level, hue: x / 600 };
    }
    // each reach of river: a soft S from its fork to the next, meandering more downstream
    const seg = [];
    for (let id = 1; id < 2 * NL; id++) {
      const n = nodes[id], p = id === 1 ? { x: SX, y: SY } : nodes[id >> 1], dy = n.y - p.y, pts = [], M = 14;
      const amp = 2 + n.level * 1.3, freq = 1 + r() * 2, ph = r() * TAU;
      for (let k = 0; k <= M; k++) {
        const u = k / M, a = 1 - u;
        const x = a * a * a * p.x + 3 * a * a * u * p.x + 3 * a * u * u * n.x + u * u * u * n.x;
        const y = a * a * a * p.y + 3 * a * a * u * (p.y + dy * .55) + 3 * a * u * u * (n.y - dy * .55) + u * u * u * n.y;
        pts.push(x + amp * Math.sin(Math.PI * u) * Math.sin(u * Math.PI * freq + ph), y);
      }
      seg[id] = pts;
    }
    // each mouth's whole way home, resampled evenly from the source (0) to the mouth (P-1)
    const paths = Array.from({ length: NL }, (_, i) => {
      const ids = []; for (let id = NL + i; id >= 1; id >>= 1) ids.unshift(id);
      const raw = []; ids.forEach((id, j) => { const s0 = seg[id]; for (let k = j ? 2 : 0; k < s0.length; k += 2) raw.push(s0[k], s0[k + 1]); });
      const cum = [0]; for (let k = 2; k < raw.length; k += 2) cum.push(cum[cum.length - 1] + Math.hypot(raw[k] - raw[k - 2], raw[k + 1] - raw[k - 1]));
      const L = cum[cum.length - 1], out = new Float32Array(2 * P); let j = 0;
      for (let q = 0; q < P; q++) {
        const want = (q / (P - 1)) * L;
        while (j < cum.length - 2 && cum[j + 1] < want) j++;
        const f = (want - cum[j]) / (cum[j + 1] - cum[j] || 1);
        out[2 * q] = raw[2 * j] + (raw[2 * j + 2] - raw[2 * j]) * f; out[2 * q + 1] = raw[2 * j + 1] + (raw[2 * j + 3] - raw[2 * j + 1]) * f;
      }
      return out;
    });
    const at = (path, u) => { const q = clamp(u) * (P - 1), k = Math.min(P - 2, Math.floor(q)), f = q - k; return [path[2 * k] + (path[2 * k + 2] - path[2 * k]) * f, path[2 * k + 1] + (path[2 * k + 3] - path[2 * k + 1]) * f]; };
    // reaches grouped by level and colour, built once
    const HB = 10, groups = new Map();
    for (let id = 1; id < 2 * NL; id++) {
      const n = nodes[id], hb = Math.min(HB - 1, Math.floor(n.hue * HB)), key = n.level * HB + hb;
      if (!groups.has(key)) groups.set(key, { level: n.level, hb, list: [] });
      const l = groups.get(key).list; l.push(...seg[id], NaN, NaN);
    }
    const hueOf = (u) => .3 + .62 * u;
    const colourOf = (level, hb, c) => (level < 2 ? c.heat(.92 - level * .12) : level < 3 ? c.heat(.62) : c.hue(hueOf((hb + .5) / HB)));
    const riders = Array.from({ length: NL * 4 }, (_, i) => [i % NL, .028 + r() * .03, r()]);
    const tipPh = Array.from({ length: NL }, () => r() * TAU);
    const stars = sky(r, 150, (x, y) => y < 200 || x < 40 || x > 560);
    const hl = new Float32Array(NL), clk = {};
    let px = 300, py = 300, seen = 0;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      if (s.x != null) { px = ease(s, px, s.x, .2); py = ease(s, py, s.y, .2); }
      seen = ease(s, seen, s.x == null ? 0 : 1, .06);
      let best = -1;
      if (s.x != null) {
        let bd = 1e9;
        for (let i = 0; i < NL; i++) { const p = paths[i]; for (let q = 30; q < P; q += 3) { const d = (p[2 * q] - px) ** 2 + (p[2 * q + 1] - py) ** 2; if (d < bd) { bd = d; best = i; } } }
        if (bd > 70 * 70) best = -1;
      }
      for (let i = 0; i < NL; i++) hl[i] = ease(s, hl[i], i === best ? 1 : 0, .07);
      g.lineCap = g.lineJoin = 'round';
      twinkle(g, c, stars, t, .38);
      light(g);
      glow(g, SX, SY + 40, 260, c.heat(.3), .35);
      // the channels; a slow wave of light runs down the levels
      for (const { level, hb, list } of groups.values()) {
        const wave = .7 + .3 * Math.sin((t * TAU) / 9 - level * .75);
        fibre(g, list, colourOf(level, hb, c), .45 + 3 * .7 ** level, (.3 + .5 * (1 - level / D)) * wave, 5);
      }
      // the way back from where the pointer rests
      for (let i = 0; i < NL; i++) if (hl[i] > .02) {
        const p = paths[i], list = Array.from(p);
        fibre(g, list, c.heat(.85), 1.3, .75 * hl[i], 6);
      }
      // the mouths: out-of-focus lights that breathe
      const tips = Array.from({ length: HB }, () => []);
      for (let i = 0; i < NL; i++) {
        const p = paths[i], x = p[2 * P - 2], y = p[2 * P - 1], b = .5 + .5 * Math.sin((t * TAU) / 11 + tipPh[i]);
        tips[Math.min(HB - 1, Math.floor(nodes[NL + i].hue * HB))].push(x, y, b + hl[i] * 1.5);
      }
      tips.forEach((list, hb) => {
        g.fillStyle = c.hue(hueOf((hb + .5) / HB));
        g.globalAlpha = .07; discs(g, list.map((v, k) => (k % 3 === 2 ? 9 + 6 * v : v)));
        g.globalAlpha = .3; discs(g, list.map((v, k) => (k % 3 === 2 ? 2.4 + 1.4 * v : v)));
        g.fillStyle = '#fff6ee'; g.globalAlpha = .55; discs(g, list.map((v, k) => (k % 3 === 2 ? .6 + .7 * v : v)));
      });
      // what flows goes back up: sparks climb every channel and warm as they near the source
      const up = Array.from({ length: HB + 3 }, () => []);
      for (const [i, speed, off] of riders) {
        const u = 1 - frac(t * speed + off), [x, y] = at(paths[i], u), hb = Math.min(HB - 1, Math.floor(nodes[NL + i].hue * HB));
        const b = u < .12 ? HB + 2 : u < .25 ? HB + 1 : u < .4 ? HB : hb;
        up[b].push(x, y, (.7 + 1.1 * (1 - u)) * (1 + hl[i]));
        const [x2, y2] = at(paths[i], u + .012); up[b].push(x2, y2, .5 + .6 * (1 - u));
      }
      // a touch: every mouth sends its light home at once
      const age = t - (clk.at ?? -99);
      if (age >= 0 && age < 3.2) {
        const u = 1 - smooth(0, 2.6, age) ** 1.4;
        for (let i = 0; i < NL; i++) { const [x, y] = at(paths[i], u); up[HB + 2].push(x, y, 1 + 1.1 * (1 - u)); }
      }
      up.forEach((list, b) => {
        if (!list.length) return;
        g.fillStyle = b < HB ? c.hue(hueOf((b + .5) / HB)) : c.heat(.55 + (b - HB) * .2);
        g.globalAlpha = .18; discs(g, list, 3, 3.2);
        g.globalAlpha = .85; discs(g, list);
      });
      const flare = Math.exp(-(((age - 2.6) / .45) ** 2));
      glow(g, SX, SY, 180 * (1 + flare), c.mark, .25 + .5 * flare);
      ember(g, c, SX, SY, 1 + .5 * flare, heartbeat(t));
      end(g);
    };
  },

  // Two infinities born from one point: a double spiral of light leaving the ember. One arm climbs toward the infinitely
  // large (stars, then galaxies, then clusters of galaxies), the other dives toward the infinitely small (cells, atoms,
  // then a foam of particles). Everything flows outward and grows as it goes, so the figure zooms forever both ways.
  // And it is a fractal: every galaxy, every cell is drawn as a copy of the whole figure. Both arms leave the ember in
  // the same red and part in the spectrum: cold for the large, warm and green for the small.
  // Hover: the level under the pointer opens. Click: a wave of light runs out along both arms at once.
  fractal(labels) {
    const r = rng(36), B = Math.log(4.2) / TAU, R0 = 7, REND = 256, TH = Math.log(REND / R0) / B;
    const ROT = [-Math.PI / 2 - TH, Math.PI / 2 - TH];
    const HUE = [(u) => frac(1 - .42 * u), (u) => .4 * u];
    const NF = 16, STEP = .075, NS = Math.ceil(TH / STEP), HB = 16, N = 17, FLOW = 4.6;
    const strands = Array.from({ length: NF }, (_, j) => ({ o: (j / (NF - 1) - .5) * 2, ph: r() * TAU, f: .6 + r() * .9, run: r(), a: .5 + r() * .5, core: j === NF >> 1, end: NS - Math.floor(r() ** .7 * 2.6 / STEP) }));
    // the motif is the whole figure in small: two arms and a core, as [x, y, size] in a unit disc
    const tpl = [];
    for (let a = 0; a < 2; a++) for (let i = 0; i < 44; i++) {
      const u = (i + r()) / 44, q = (Math.exp(B * u * TH) * R0) / REND, an = ROT[a] + u * TH + (r() - .5) * .3, sc = .1 * q + .015;
      tpl.push(q * Math.cos(an) + (r() - .5) * sc, q * Math.sin(an) + (r() - .5) * sc, .45 + (1 - u) * .6 + r() * .35);
    }
    for (let i = 0; i < 24; i++) { const q = r() ** 2 * .2, an = r() * TAU; tpl.push(q * Math.cos(an), q * Math.sin(an), .7 + r() * .6); }
    const curves = [0, 1].map((a) => Array.from({ length: 40 }, (_, i) => { const u = .08 + .92 * i / 39, q = (Math.exp(B * u * TH) * R0) / REND, an = ROT[a] + u * TH; return [q * Math.cos(an), q * Math.sin(an)]; }));
    // dust along the arms, flowing out with them: [arm, theta0, radial offset, size, phase]
    const dust = Array.from({ length: 900 }, () => [r() < .5 ? 0 : 1, r(), (r() + r() + r() - 1.5) * .5, .3 + r() ** 3 * 1.1, r() * TAU]);
    const members = [];
    for (let i = 6; i < 88; i += 7) members.push(i * 3);
    const tiny = []; for (let i = 0; i < tpl.length; i += 12) tiny.push(i);
    const stars = sky(r, 260);
    const clk = {};
    const point = (arm, th) => { const q = R0 * Math.exp(B * th), a = ROT[arm] + th; return [300 + q * Math.cos(a), 300 + q * Math.sin(a), q]; };
    return (g, c, t, s) => {
      clicked(clk, s, t);
      const wave = (t - (clk.at ?? -99)) / 2.4;
      const lit = (u) => 1 + .35 * Math.exp(-(((u - frac(t / 16) * 1.3 + .15) * 5) ** 2)) + (wave < 1.4 ? 1.6 * Math.exp(-(((u - wave) * 7) ** 2)) : 0);
      g.lineCap = g.lineJoin = 'round';
      twinkle(g, c, stars, t, .5, c.cool(.85));
      light(g);
      glow(g, 230, 170, 300, c.hue(.7), .16);
      glow(g, 370, 430, 300, c.hue(.18), .14);
      glow(g, 300, 300, 200, c.mark, .22);
      // the two arms: braided bundles of fibres, coloured along their length
      for (let arm = 0; arm < 2; arm++) {
        const lists = Array.from({ length: HB }, () => []), cores = Array.from({ length: HB }, () => []), runs = Array.from({ length: HB }, () => []);
        for (const st of strands) {
          let prev = -1;
          for (let k = 0; k <= st.end; k++) {
            const th = Math.min(TH, k * STEP), u = th / TH, b = Math.min(HB - 1, Math.floor(u * HB));
            const q = R0 * Math.exp(B * th), w = q * .1 * (.25 + .75 * smooth(0, .2, u)) * (1 + 2.2 * smooth(.72, 1, u) ** 2);
            const off = st.o * w * (.75 + .25 * Math.sin(th * st.f + st.ph + t * .35)) + q * (.035 + .08 * smooth(.75, 1, u) * st.a) * Math.sin(th * 1.7 + st.ph - t * .5);
            const a = ROT[arm] + th, x = 300 + (q + off) * Math.cos(a), y = 300 + (q + off) * Math.sin(a);
            if (b !== prev) { if (prev >= 0) lists[prev].push(x, y, NaN, NaN); prev = b; }
            lists[b].push(x, y);
            if (st.core) { if (cores[b].length && k && Math.min(HB - 1, Math.floor(((k - 1) * STEP / TH) * HB)) !== b) cores[b].push(NaN, NaN); cores[b].push(x, y); }
          }
          lists[prev].push(NaN, NaN);
          // light running out along each strand, faster as it goes: the zoom
          for (let m = 0; m < 2; m++) {
            const th = TH * frac(t / 7 + st.run + m / 2) ** 1.4, u = th / TH, q = R0 * Math.exp(B * th);
            const off = st.o * q * .1 * (.25 + .75 * smooth(0, .2, u)) * (.75 + .25 * Math.sin(th * st.f + st.ph + t * .35)) + q * .035 * Math.sin(th * 1.7 + st.ph - t * .5);
            const a = ROT[arm] + th;
            runs[Math.min(HB - 1, Math.floor(u * HB))].push(300 + (q + off) * Math.cos(a), 300 + (q + off) * Math.sin(a), (.7 + 1.3 * u) * st.a);
          }
        }
        lists.forEach((list, b) => {
          const u = (b + .5) / HB, col = c.hue(HUE[arm](u)), fade = (1 + .9 * u) * (1 - smooth(.84, 1, u) * .85);
          fibre(g, list, col, .5, Math.min(1, .16 * lit(u) * fade), 5);
          if (cores[b].length) fibre(g, cores[b], col, 1.3, Math.min(1, .4 * lit(u) * fade), 5);
          g.fillStyle = col;
          g.globalAlpha = .18; discs(g, runs[b], 3, 3);
          g.globalAlpha = .85 * fade; discs(g, runs[b]);
        });
      }
      // the levels, flowing outward: each one a copy of the whole
      const dots = new Map(), add = (key, x, y, size) => { let l = dots.get(key); if (!l) dots.set(key, (l = [])); l.push(x, y, size); };
      const rings = [], glows = [], arms = new Map(), curve = (key, x, y, R, cs, sn, sy, rot, a) => {
        let l = arms.get(key); if (!l) arms.set(key, (l = { a: 0, n: 0, pts: [] }));
        const ct = Math.cos(rot), st = Math.sin(rot);
        for (const cv of curves) { for (const [px, py] of cv) { const ax = (px * cs - py * sn) * R, ay = (px * sn + py * cs) * R * sy; l.pts.push(x + ax * ct - ay * st, y + ax * st + ay * ct); } l.pts.push(NaN, NaN); }
        l.a += a; l.n++;
      };
      let near = null, nd = 1e9;
      const items = [];
      for (let arm = 0; arm < 2; arm++) for (let j = 0; j < N; j++) {
        const th = TH * frac((j + t / FLOW) / N), u = th / TH, [x, y, q] = point(arm, th), R = q * .3;
        const vis = smooth(.1, .24, u) * (1 - smooth(.86, 1, u));
        if (vis <= .01) continue;
        const it = { arm, j, u, x, y, R, vis, hue: Math.round(HUE[arm](u) * 24) / 24, open: 0 };
        items.push(it);
        if (s.x != null) { const d = Math.hypot(s.x - x, s.y - y) / Math.max(R * 1.3, 24); if (d < 1 && d < nd) { nd = d; near = it; } }
      }
      if (near) near.open = 1 - nd * nd;
      for (const it of items) {
        const { arm, j, u, x, y, R, hue } = it, L = lit(u), k = it.vis * Math.min(1.8, L) * (1 + .8 * it.open);
        const spin = j * 1.7 + t * (arm ? -.11 : .06);
        const cs = Math.cos(spin), sn = Math.sin(spin);
        if (arm === 0) {
          // the large: a star, then a galaxy, then a cluster of galaxies
          const wS = 1 - smooth(.22, .36, u), wC = smooth(.6, .85, u), wG = 1 - wS;
          const incl = .35 + .55 * Math.abs(Math.sin(j * 2.3)), tilt = j * .9, ct = Math.cos(tilt), st = Math.sin(tilt);
          const place = (px, py, sc) => { const ax = (px * cs - py * sn) * sc, ay = (px * sn + py * cs) * sc * incl; return [x + ax * ct - ay * st, y + ax * st + ay * ct]; };
          if (wS > .02) { glows.push(x, y, 10 + R * 2.2, hue, .45 * wS * k); add(1, x, y, (1.1 + R * .05) * wS * k); }
          if (wG > .02) {
            for (let i = 0; i < tpl.length; i += 3) { const [px, py] = place(tpl[i], tpl[i + 1], R); add(i >= 264 ? 1 : hue, px, py, tpl[i + 2] * (.45 + R / 40) * wG * Math.min(1.4, k)); }
            curve(hue, x, y, R, cs, sn, incl, tilt, .5 * wG * k);
            glows.push(x, y, R * 1.5, hue, .35 * wG * k, x, y, R * .35, -1, .55 * wG * k);
          }
          if (wC > .02) {
            for (const m of members) {
              const [mx, my] = place(tpl[m] * 1.9, tpl[m + 1] * 1.9, R), sr = R * .11 * tpl[m + 2], a = spin * 2 + m;
              const ca = Math.cos(a), sa = Math.sin(a);
              for (const i of tiny) add(hue, mx + (tpl[i] * ca - tpl[i + 1] * sa) * sr, my + (tpl[i] * sa + tpl[i + 1] * ca) * sr * .6, .55 * wC * Math.min(1.3, k));
              add(1, mx, my, .9 * wC * k);
              glows.push(mx, my, sr * 2, hue, .22 * wC * k);
            }
          }
        } else {
          // the small: a cell, then an atom, then a foam of particles
          const wCell = 1 - smooth(.4, .52, u), wF = smooth(.7, .82, u), wA = 1 - wCell - wF;
          if (wCell > .02) {
            rings.push(x, y, R, hue, .65 * wCell * k, x, y, R * .9, hue, .25 * wCell * k);
            curve(hue, x, y, R * .62, cs, sn, 1, 0, .45 * wCell * k);
            for (let i = 0; i < tpl.length; i += 3) add(hue, x + (tpl[i] * cs - tpl[i + 1] * sn) * R * .62, y + (tpl[i] * sn + tpl[i + 1] * cs) * R * .62, tpl[i + 2] * (.35 + R / 60) * wCell * Math.min(1.4, k));
            glows.push(x, y, R * .55, -2, .5 * wCell * k);
          }
          if (wA > .02) {
            for (let o = 0; o < 3; o++) {
              const a = spin + (o * TAU) / 6, ca = Math.cos(a), sa = Math.sin(a), pts = [];
              for (let i = 0; i <= 28; i++) { const v = (i / 28) * TAU, px = R * Math.cos(v), py = R * .32 * Math.sin(v); pts.push(x + px * ca - py * sa, y + px * sa + py * ca); }
              rings.push(pts, hue, .4 * wA * k);
              const v = t * (2.2 + o * .7) + j, px = R * Math.cos(v), py = R * .32 * Math.sin(v);
              add(1, x + px * ca - py * sa, y + px * sa + py * ca, 1.4 * wA * k);
            }
            for (let i = 264; i < tpl.length; i += 6) add(hue, x + tpl[i] * R * .9, y + tpl[i + 1] * R * .9, 1.1 * wA * k);
            glows.push(x, y, R * .45, -2, .6 * wA * k);
          }
          if (wF > .02) {
            for (let i = 0; i < tpl.length; i += 3) {
              const fl = .5 + .5 * Math.sin(t * 7 + i * 1.3), jx = Math.sin(t * 3.1 + i) * R * .05, jy = Math.cos(t * 2.7 + i * 2) * R * .05;
              add(fl > .9 ? 1 : Math.round(frac(hue + (i % 7) * .07 - .2) * 24) / 24, x + (tpl[i] * cs - tpl[i + 1] * sn) * R + jx, y + (tpl[i] * sn + tpl[i + 1] * cs) * R + jy, tpl[i + 2] * (.6 + R / 35) * (.3 + .7 * fl) * wF * Math.min(1.4, k));
            }
            glows.push(x, y, R * 1.3, hue, .3 * wF * k, x, y, R * .5, -2, .25 * wF * k);
          }
        }
      }
      for (const [key, l] of arms) fibre(g, l.pts, c.hue(key), .7, Math.min(1, l.a / l.n), 5);
      const db = new Map();
      for (const [arm, th0, o, size, ph] of dust) {
        const th = TH * frac(th0 + t / (FLOW * N)), u = th / TH, q = R0 * Math.exp(B * th), a = ROT[arm] + th, rr = q * (1 + o * .55);
        const vis = smooth(.05, .25, u) * (1 - smooth(.88, 1, u)) * (.55 + .45 * Math.sin(t * 1.3 + ph));
        if (vis < .05) continue;
        const key = Math.round(HUE[arm](u) * 16) / 16; let l = db.get(key); if (!l) db.set(key, (l = []));
        l.push(300 + rr * Math.cos(a), 300 + rr * Math.sin(a), size * vis * (.6 + u));
      }
      for (const [key, l] of db) { g.fillStyle = c.hue(key); g.globalAlpha = .14; discs(g, l, 3, 3.2); g.globalAlpha = .8; discs(g, l); }
      for (let i = 0; i < glows.length; i += 5) glow(g, glows[i], glows[i + 1], glows[i + 2], glows[i + 3] === -1 ? c.cool(.95) : glows[i + 3] === -2 ? c.heat(.75) : c.hue(glows[i + 3]), Math.min(1, glows[i + 4]));
      for (let i = 0; i < rings.length; ) {
        if (Array.isArray(rings[i])) { fibre(g, rings[i], c.hue(rings[i + 1]), .6, Math.min(1, rings[i + 2]), 5); i += 3; continue; }
        const [x, y, R, h, a] = rings.slice(i, i + 5), pts = [];
        for (let k = 0; k <= 40; k++) pts.push(x + R * Math.cos((k / 40) * TAU), y + R * Math.sin((k / 40) * TAU));
        fibre(g, pts, c.hue(h), .8, Math.min(1, a), 5);
        i += 5;
      }
      for (const [key, list] of dots) {
        g.fillStyle = key === 1 ? '#f6f4ff' : c.hue(key);
        if (key !== 1) { g.globalAlpha = .13; discs(g, list, 3, 2.8); }
        g.globalAlpha = key === 1 ? .85 : .75; discs(g, list);
      }
      // the junction: where both begin
      glow(g, 300, 300, 150 * (1 + .7 * Math.exp(-((wave * 4) ** 2))), c.mark, .35);
      ember(g, c, 300, 300, 1.05, heartbeat(t));
      end(g);
      label(g, c, labels.large, 300, 22, 'center', 17);
      label(g, c, labels.small, 300, 590, 'center', 17);
      g.globalAlpha = 1;
    };
  },

  // Everything and nothing. One disc of seeds: on one side every seed is lit in the full spectrum, on the other each one
  // only flickers, a reserve of possible lights. Between them a bright seam winds through the ember and keeps turning.
  // Hover: the seam turns toward the pointer. Click: a wave crosses the nothing and, for a moment, shows all it could be.
  void(labels) {
    const golden = Math.PI * (3 - Math.sqrt(5)), N = 5200, RD = 236, r = rng(3);
    const items = Array.from({ length: N }, (_, i) => { const q = RD * Math.sqrt((i + .5) / N), a = i * golden; return [q * Math.cos(a), q * Math.sin(a), r() * .7 + .5, r(), 2 + r() * 7, q]; });
    const HB = 14, AB = 4;
    let angle = 0.5;
    const clk = {};
    return (g, c, t, s) => {
      clicked(clk, s, t);
      const target = s.x == null ? .5 + t * .11 : Math.atan2(s.y - 300, s.x - 300);
      angle = s.snap ? target : angle + Math.atan2(Math.sin(target - angle), Math.cos(target - angle)) * .05;
      const nx = Math.cos(angle), ny = Math.sin(angle), wave = (t - (clk.at ?? -99)) * 190;
      const cx = (clk.x ?? 300) - 300, cy = (clk.y ?? 300) - 300;
      const buckets = Array.from({ length: HB * AB }, () => []), seam = [], spark0 = [];
      for (const [x, y, size, jit, per, q] of items) {
        const u = x * ny - y * nx, v = x * nx + y * ny;
        const edge = v - 62 * Math.sin((u / RD) * Math.PI);
        let a = smooth(-4 - jit * 22, 30, edge), sz = size;
        // the nothing: each seed only flickers, now and then
        if (a < .3) {
          const f = frac(t / per + jit * 7);
          a = Math.max(a, .55 * Math.exp(-(((f - .5) * 9) ** 2)) * (.4 + .6 * jit));
          if (wave < 600) { const d = Math.hypot(x - cx, y - cy) - wave; a = Math.max(a, Math.exp(-((d / 28) ** 2)) * (1 - wave / 600)); }
        }
        if (Math.abs(edge) < 10) seam.push(300 + x, 300 + y, (1 - Math.abs(edge) / 10) * 1.6);
        if (a < .04) continue;
        const h = frac(Math.atan2(y, x) / TAU + q / 900 - t / 50);
        buckets[Math.min(AB - 1, Math.floor(a * AB)) * HB + Math.floor(h * HB)].push(300 + x, 300 + y, sz * (.6 + .5 * a));
      }
      light(g);
      // a faint warmth on the everything side
      glow(g, 300 + nx * 110, 300 + ny * 110, 300, c.heat(.3), .3);
      buckets.forEach((list, i) => {
        if (!list.length) return;
        const ab = Math.floor(i / HB), A = (ab + .5) / AB;
        g.fillStyle = c.hue((i % HB + .5) / HB);
        if (ab >= 2) { g.globalAlpha = .07 * A; discs(g, list, 3, 4); }
        g.globalAlpha = .25 + .7 * A; discs(g, list);
      });
      // the seam: where form and no-form touch, the brightest place
      g.fillStyle = c.heat(.9); g.globalAlpha = .55; discs(g, seam);
      const curve = [];
      for (let k = 0; k <= 80; k++) { const u = -RD + (2 * RD * k) / 80, v = 62 * Math.sin((u / RD) * Math.PI); curve.push(300 + u * ny + v * nx, 300 - u * nx + v * ny); }
      fibre(g, curve, c.heat(.8), 1.1, .5, 7);
      for (let k = 0; k < 6; k++) { const u = (frac(t / 14 + k / 6) * 2 - 1) * RD, v = 62 * Math.sin((u / RD) * Math.PI); spark(g, 300 + u * ny + v * nx, 300 - u * nx + v * ny, 1.4, c.heat(.7), .8 * Math.sin(Math.PI * frac(t / 14 + k / 6))); }
      g.strokeStyle = c.ink; g.lineWidth = .7; g.globalAlpha = .22;
      g.beginPath(); g.arc(300, 300, RD + 8, 0, TAU); g.stroke();
      ember(g, c, 300, 300, 1, heartbeat(t));
      end(g);
      label(g, c, labels.everything, 300 + nx * 272, 306 + ny * 272, 'center', 18);
      label(g, c, labels.nothing, 300 - nx * 272, 306 - ny * 272, 'center', 18);
      g.globalAlpha = 1;
    };
  },

  // Out of a formless haze, motes of light gather into a flower of six rings around a kindling ember, then let go.
  // Hover: where the pointer rests, the haze takes form ahead of time. Click: a breath of form crosses everything.
  emerge() {
    const r = rng(17), N = 2600, FORMED = 1800, CURVES = 6, PERIOD = 36;
    const per = Math.ceil(FORMED / CURVES);
    const ringAt = (j, th) => { const rad = (38 + 40 * j) * (1 + .11 * Math.cos(6 * th + j * .7)); return [300 + rad * Math.cos(th), 300 + rad * Math.sin(th)]; };
    const items = Array.from({ length: N }, (_, i) => {
      const q = 290 * Math.sqrt(r()), a = r() * TAU, item = { x: 300 + q * Math.cos(a), y: 300 + q * Math.sin(a), w: r() * TAU, v: .15 + r() * .3, lag: r(), hue: .5 + .35 * r() };
      if (i < FORMED) {
        const j = i % CURVES, th = (Math.floor(i / CURVES) / per) * TAU, [tx, ty] = ringAt(j, th);
        Object.assign(item, { tx: tx + (r() - .5) * 9, ty: ty + (r() - .5) * 9, start: .04 + .07 * j + .1 * item.lag, j });
      }
      return item;
    });
    const HB = 8, clk = {};
    let px = 300, py = 300, here = 0;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      if (s.x != null) { px = ease(s, px, s.x, .08); py = ease(s, py, s.y, .08); }
      here = ease(s, here, s.x == null ? 0 : 1, .04);
      const u = (t % PERIOD) / PERIOD, surge = Math.exp(-(t - (clk.at ?? -99)) / 3) * ((t - (clk.at ?? -99)) > 0);
      const haze = Array.from({ length: HB }, () => []), formed = Array.from({ length: CURVES * 3 }, () => []);
      const ringF = new Float32Array(CURVES);
      for (const it of items) {
        let x = it.x + 7 * Math.sin(t * it.v + it.w) + 4 * Math.sin(t * .05 + it.y * .01), y = it.y + 7 * Math.cos(t * it.v * .8 + it.w) + 4 * Math.cos(t * .04 + it.x * .01);
        if (it.tx === undefined) { haze[Math.floor(it.hue * HB) % HB].push(x, y, .7); continue; }
        let f = smooth(it.start, it.start + .3, u) * (1 - smooth(.8 + .06 * it.lag, .97, u));
        if (here > .01) f = Math.max(f, here * Math.exp(-((it.tx - px) ** 2 + (it.ty - py) ** 2) / 7000));
        f = Math.max(f, surge * (.5 + .5 * it.lag));
        x += (it.tx - x) * f; y += (it.ty - y) * f;
        ringF[it.j] += f / per;
        if (f < .25) haze[Math.floor(it.hue * HB) % HB].push(x, y, .7 + f);
        else formed[it.j * 3 + Math.min(2, Math.floor((f - .25) / .25))].push(x, y, .7 + .9 * f);
      }
      light(g);
      haze.forEach((list, b) => { g.fillStyle = c.cool(.45 + .4 * b / HB); g.globalAlpha = .22; discs(g, list, 3, 3); g.globalAlpha = .6; discs(g, list, 3, 1.15); });
      // the rings themselves, as the motes reach them
      g.lineCap = g.lineJoin = 'round';
      for (let j = 0; j < CURVES; j++) {
        const f = ringF[j];
        if (f < .03) continue;
        const pts = []; for (let k = 0; k <= 180; k++) pts.push(...ringAt(j, (k / 180) * TAU + .002 * Math.sin(t)));
        fibre(g, pts, c.hue(.02 + j * .16), .9, .28 * f * f, 8);
      }
      formed.forEach((list, b) => {
        if (!list.length) return;
        const j = Math.floor(b / 3), k = b % 3;
        g.fillStyle = c.hue(.02 + j * .16);
        g.globalAlpha = .1 + .05 * k; discs(g, list, 3, 3.2);
        g.globalAlpha = .55 + .2 * k; discs(g, list);
      });
      const form = smooth(0, .25, u) * (1 - smooth(.8, 1, u));
      const k = Math.max(form, surge, here * .3);
      if (k > .01) ember(g, c, 300, 300, .25 + .85 * k, heartbeat(t));
      else spark(g, 300, 300, 1.2, c.mark, .5);
      end(g);
    };
  },

  // A part of the whole comes loose. The whole is a slow galaxy of light; one ember tightens out of it and, little by
  // little, draws a shape of its own, still tied to the sea it rose from by a thread. Hover: the whole lights up where you
  // look, the same light as the part. Click: a first cry, a ring that crosses the whole.
  birth() {
    const r = rng(5), golden = Math.PI * (3 - Math.sqrt(5)), N = 1700, MX = 200, MY = 300, R = 118, PERIOD = 30, PTS = 460;
    const mass = Array.from({ length: N }, (_, i) => { const q = R * ((i + .5) / N) ** .5 * (1 + (r() - .5) * .1), a = i * golden + (r() - .5) * .25; return [q, a, r() * .7 + .6, r() * TAU, r()]; });
    const life = (k) => {
      const m = rng(k * 7 + 3); m();
      const b = (m() - .5) * 1.1;
      return { ox: MX + 232 * Math.cos(b), oy: MY + 232 * Math.sin(b), lobes: 3 + Math.floor(m() * 3), p: m() * TAU, dir: m() < .5 ? -1 : 1, hue: m() };
    };
    const at = (L, s) => {
      const go = smooth(0, .42, s), a = L.dir * s * TAU * 4.5 + L.p;
      const k = (6 + 64 * smooth(.02, .5, s)) * (1 + .36 * smooth(.3, .95, s) * Math.cos(L.lobes * a));
      return [MX + (L.ox - MX) * go + k * Math.cos(a), MY + (L.oy - MY) * go + k * Math.sin(a)];
    };
    const trace = (L, s0, s1, n) => { const out = []; for (let i = 0; i <= n; i++) out.push(...at(L, s0 + ((s1 - s0) * i) / n)); return out; };
    const HB = 10, clk = {};
    let px = 0, py = 0, here = 0;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      if (s.x != null) { px = ease(s, px, s.x, .1); py = ease(s, py, s.y, .1); }
      here = ease(s, here, s.x == null ? 0 : 1, .05);
      const k = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD, L = life(k);
      const [ex, ey] = at(L, u);
      const breath = 1 + .03 * Math.sin((t * TAU) / 12), pull = 1 - smooth(.1, .5, u);
      const cry = t - (clk.at ?? -99), cx = clk.cx ?? ex, cy = clk.cy ?? ey;
      if (cry < .02 && cry >= 0) { clk.cx = ex; clk.cy = ey; }
      const ringR = cry * 160;
      // the whole: a galaxy turning slowly, faster near its heart, leaning toward the part that leaves
      const buckets = Array.from({ length: HB * 2 }, () => []);
      for (const [q, a0, size, w, h] of mass) {
        const a = a0 + t * .05 * (1.4 - q / R);
        let x = MX + q * breath * Math.cos(a), y = MY + q * breath * Math.sin(a) * .92;
        const ex2 = ex - x, ey2 = ey - y, d2 = ex2 * ex2 + ey2 * ey2, f = 24 * pull * Math.exp(-d2 / 2600);
        if (f > .05) { const d = Math.sqrt(d2) || 1; x += (ex2 / d) * f; y += (ey2 / d) * f; }
        let b = .3 + .25 * Math.sin(t * .4 + w);
        if (here > .01) b += here * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / 2500);
        if (ringR < 520) b += Math.exp(-(((Math.hypot(x - cx, y - cy) - ringR) / 14) ** 2)) * (1 - ringR / 520) * 1.2;
        const hue = frac(.5 + .4 * h + a / TAU * .25);
        buckets[(b > .6 ? HB : 0) + Math.floor(hue * HB) % HB].push(x, y, size * (.7 + .4 * Math.min(1.5, b)));
      }
      light(g);
      glow(g, MX, MY, 230, c.cool(.35), .4);
      glow(g, MX, MY, 90, c.cool(.75), .45);
      glow(g, MX, MY, 150, c.hue(.7), .2);
      buckets.forEach((list, i) => {
        if (!list.length) return;
        g.fillStyle = c.hue((i % HB + .5) / HB);
        const hot = i >= HB;
        if (hot) { g.globalAlpha = .12; discs(g, list, 3, 3.5); }
        if (!hot) { g.globalAlpha = .07; discs(g, list, 3, 3); }
        g.globalAlpha = hot ? .95 : .75; discs(g, list);
      });
      g.lineCap = g.lineJoin = 'round';
      // the thread: a wave rises without leaving the sea
      const tie = 1 - smooth(.55, .95, u);
      if (tie > .01) {
        const dx = ex - MX, dy = ey - MY, d = Math.hypot(dx, dy) || 1, sx = MX + (dx / d) * Math.min(d, R * .7), sy = MY + (dy / d) * Math.min(d, R * .7);
        const pts = []; for (let i = 0; i <= 30; i++) { const v = i / 30, bow = 18 * Math.sin(Math.PI * v) * Math.sin(t * .3); pts.push(sx + (ex - sx) * v - (dy / d) * bow, sy + (ey - sy) * v + (dx / d) * bow); }
        fibre(g, pts, c.cool(.8), .6, .45 * tie, 6);
      }
      // the shape left by the previous life fades as the next one begins
      const ghost = .35 * (1 - smooth(0, .45, u));
      if (ghost > .005) fibre(g, trace(life(k - 1), .4, 1, 240), c.hue(life(k - 1).hue), .7, ghost, 5);
      // its own trajectory: cold where it began, the ember's heat at its head
      const fade = 1 - .7 * smooth(.9, 1, u), n = Math.max(12, Math.round(PTS * u)), B = 12;
      for (let b = 0; b < B; b++) {
        const kk = b / (B - 1), s0 = (u * b) / B, s1 = (u * (b + 1)) / B;
        fibre(g, trace(L, s0, s1, Math.ceil(n / B)), kk > .8 ? c.heat(.45 + (kk - .8) * 1.75) : c.hue(frac(L.hue + .5 * kk)), .6 + 1.2 * kk * kk, (.3 + .65 * kk) * fade, 5);
      }
      if (ringR < 520) {
        g.strokeStyle = c.heat(.8); g.lineWidth = 1.2; g.globalAlpha = .5 * (1 - ringR / 520);
        g.beginPath(); g.arc(cx, cy, Math.max(1, ringR), 0, TAU); g.stroke();
      }
      ember(g, c, ex, ey, (.35 + .75 * smooth(0, .06, u)) * (1 - .5 * smooth(.92, 1, u)) * (1 + .5 * Math.exp(-cry * 3) * (cry > 0)), heartbeat(t));
      end(g);
    };
  },

  // A body after Leonardo: a man of light in the circle and the square, both of his poses kept as faint traces like in the
  // drawing, the living one moving slowly between them as it breathes. Inside, nerves and vessels of light leave the heart
  // for the head, the fingers and the toes; each beat runs out along them and makes the skin flare. Contours inside the
  // skin swell with every beat. Hover on the body: it feels, and the signal runs back to the heart. Click: a touch; the
  // sensation travels in and the heart answers with a stronger beat.
  body() {
    const NAV = [300, 287], RC = 243, SQ = [100, 130, 400], BREATH = 14, BEAT = 1.1;
    const X0 = 70, Y0 = 108, ST = 3, NX = Math.ceil(460 / ST) + 1, NY = Math.ceil(450 / ST) + 1;
    // the skeleton for a pose p (0: arms level and legs together, in the square; 1: arms raised and legs apart, in the circle)
    const pose = (p, al, be) => {
      const parts = [], paths = [], lines = [];
      const cap = (a, b, ra, rb) => parts.push([a[0], a[1], b[0], b[1], ra, rb]);
      const go = (o, d, l) => [o[0] + d[0] * l, o[1] + d[1] * l];
      // a pen stroke: a quadratic from a through b to c, as a polyline
      const pen = (a, b, c2) => { const l = []; for (let k = 0; k <= 10; k++) { const u = k / 10, v = 1 - u; l.push(v * v * a[0] + 2 * v * u * b[0] + u * u * c2[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c2[1]); } l.push(NaN, NaN); lines.push(...l); };
      // offsets along and across a limb from o in direction d
      const on = (o, d, along, across) => [o[0] + d[0] * along - d[1] * across, o[1] + d[1] * along + d[0] * across];
      cap([300, 145], [300, 163], 20.5, 17.5);
      cap([300, 163], [300, 177], 16.5, 11);
      cap([300, 178], [300, 203], 10.5, 13.5);
      cap([300, 213], [300, 258], 40, 30);
      cap([300 - 22, 221], [300 + 22, 221], 27, 27);
      cap([300, 256], [300, 294], 29, 32);
      cap([300, 292], [300, 318], 33, 26);
      const chest = [300, 222], heart = [309, 236], pelvis = [300, 312];
      paths.push([heart, [302, 205], [300, 180], [300, 152]]);
      for (const h of [-1, 1]) paths.push([heart, [302, 205], [300, 182], [300 + 12 * h, 160], [300 + 15 * h, 146]]);
      // the face, barely: brows, nose, mouth; and the curls of the hair
      pen([288, 151], [292, 147], [297, 150]); pen([303, 150], [308, 147], [312, 151]);
      pen([300, 152], [298, 162], [301, 165]); pen([294, 172], [300, 174], [306, 172]);
      for (let k = 0; k < 13; k++) {
        const a = Math.PI * (1.06 + (k / 12) * .88), cx = 300 + 21 * Math.cos(a), cy = 150 + 22 * Math.sin(a), rr = 4.5 + 1.5 * Math.sin(k * 2.1);
        const l = []; for (let m = 0; m <= 12; m++) { const v = a + Math.PI * .4 + (m / 12) * TAU * .85, q = rr * (1 - m / 30); l.push(cx + q * Math.cos(v), cy + q * Math.sin(v)); } l.push(NaN, NaN); lines.push(...l);
      }
      // the torso as drawn: clavicles, chest, ribs, the midline, the abdomen, the hips
      for (const sd of [-1, 1]) {
        const X = (v) => 300 + sd * v;
        pen([X(5), 204], [X(24), 200], [X(44), 207 - 4 * p]);
        pen([X(3), 222], [X(22), 252], [X(42), 228]);
        pen([X(9), 253], [X(24), 262], [X(35), 250]);
        pen([X(13), 262], [X(15), 271], [X(13), 279]);
        pen([X(31), 288], [X(22), 314], [X(6), 328]);
        pen([X(2), 258], [X(8), 259], [X(13), 258]); pen([X(2), 271], [X(8), 272], [X(13), 271]);
      }
      pen([300, 236], [300.5, 262], [300, 281]);
      lines.push(...Array.from({ length: 13 }, (_, k) => [300 + 2.6 * Math.cos((k / 12) * TAU), 288 + 2.6 * Math.sin((k / 12) * TAU)]).flat(), NaN, NaN);
      for (const sd of [-1, 1]) {
        const a = al * p, d = [sd * Math.cos(a), -Math.sin(a)], n = sd, S = [300 + sd * 46, 209 - 5 * p];
        cap([300 + sd * 12, 199], S, 11, 14);
        const E = go(S, d, 63), Wr = go(E, d, 56), M = go(Wr, d, 16), T = go(Wr, d, 35);
        cap(on(S, d, -4, 0), on(S, d, 24, 0), 16, 11.5);
        cap(go(S, d, 20), on(S, d, 44, 1.5 * n), 12, 11);
        cap(on(S, d, 44, 1.5 * n), E, 11, 8.5);
        cap(E, go(E, d, 20), 10.5, 9); cap(go(E, d, 20), Wr, 9, 5.8);
        cap(Wr, M, 6.2, 8); cap(M, T, 8, 5.2);
        cap(on(M, d, 0, -9 * n), on(M, d, 10, -12 * n), 3.4, 2.6);
        cap([300 + sd * 40, 226], [300 + sd * 29, 270], 12, 8);
        pen(on(S, d, -2, -14 * n), on(S, d, 14, -16 * n), on(S, d, 30, -9 * n));
        pen(on(S, d, 26, -6 * n), on(S, d, 40, -9 * n), on(S, d, 56, -6 * n));
        pen(on(E, d, 4, -6 * n), on(E, d, 20, -8 * n), on(E, d, 40, -4 * n));
        pen(on(T, d, -14, -3 * n), on(T, d, -8, -2 * n), on(T, d, -2, -1 * n)); pen(on(T, d, -14, 2), on(T, d, -7, 1.5), on(T, d, -1, 1));
        for (let f = -2; f <= 2; f++) { const fa = Math.atan2(d[1], d[0]) + f * .18 * sd, fd = [Math.cos(fa), Math.sin(fa)]; paths.push([heart, [chest[0] + sd * 20, chest[1] - 8], S, go(S, d, 32), E, go(E, d, 28), Wr, M, go(M, fd, 17)]); }
        const b = be * p, l = [sd * Math.sin(b), Math.cos(b)], Hp = [300 + sd * 17, 316], K = go(Hp, l, 104), C = go(K, l, 32), A = go(K, l, 98);
        const toe = [A[0] + sd * (10 + 6 * p), A[1] + 9];
        cap(on(Hp, l, -4, 4 * n), on(Hp, l, 30, 3 * n), 23, 21); cap(on(Hp, l, 30, 3 * n), on(Hp, l, 74, 0), 20, 14.5); cap(on(Hp, l, 74, 0), K, 14.5, 11);
        cap(on(K, l, -6, 0), on(K, l, 34, 1.5 * n), 11.5, 12.5); cap(on(K, l, 34, 1.5 * n), on(K, l, 74, 0), 12.5, 7.2); cap(on(K, l, 70, 0), A, 7.4, 5.8); cap(A, toe, 7, 4.5);
        pen(on(Hp, l, 6, -18 * n), on(Hp, l, 50, -6 * n), on(K, l, -8, -6 * n));
        pen(on(Hp, l, 14, 16 * n), on(Hp, l, 56, 10 * n), on(K, l, -14, 6 * n));
        pen(on(K, l, -6, -6), on(K, l, 2, 0), on(K, l, -6, 6)); pen(on(K, l, 4, -5), on(K, l, 10, 0), on(K, l, 4, 5));
        pen(on(K, l, 14, 7 * n), on(K, l, 34, 12 * n), on(K, l, 60, 6 * n));
        pen(on(K, l, 12, -2 * n), on(K, l, 50, -3 * n), on(A, l, -10, -1 * n));
        paths.push([heart, [302, 268], pelvis, Hp, go(Hp, l, 52), K, C, A, toe]);
        paths.push([heart, [298, 268], [300 + sd * 6, 316], on(Hp, l, 40, -8 * n), K, on(K, l, 50, -3 * n), A, [toe[0] - sd * 7, toe[1] + 1]]);
      }
      // smooth the nerves
      const chaikin = (pts) => { let q = pts; for (let it = 0; it < 2; it++) { const o = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const [a, b] = [q[i], q[i + 1]]; o.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } o.push(q[q.length - 1]); q = o; } return q; };
      return { parts, paths: paths.map(chaikin), heart, lines };
    };
    // the leg and arm angles that touch the circle, as in the drawing
    const solve = (f) => { let lo = 0, hi = 1.2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) < RC) lo = m; else hi = m; } return lo; };
    const AL = solve((a) => Math.hypot(300 - 46 - 154 * Math.cos(a) - NAV[0], 204 - 154 * Math.sin(a) - NAV[1]));
    const BE = .44;
    // a signed distance to the body, sampled on a grid, then contoured
    const grid = new Float32Array(NX * NY);
    const sample = (parts) => {
      const n = parts.length, P = new Float64Array(n * 13);
      parts.forEach(([ax, ay, bx, by, ra, rb], m) => {
        const h = Math.hypot(bx - ax, by - ay), sb = (ra - rb) / h, o = m * 13;
        P.set([Math.min(ax, bx) - ra - 12, Math.max(ax, bx) + ra + 12, Math.min(ay, by) - ra - 12, Math.max(ay, by) + ra + 12, ax, ay, (bx - ax) / h, (by - ay) / h, h, ra, rb, sb, Math.sqrt(1 - sb * sb)], o);
      });
      for (let j = 0; j < NY; j++) {
        const py = Y0 + j * ST;
        for (let i = 0; i < NX; i++) {
          const px = X0 + i * ST;
          let d = 60;
          for (let o = 0; o < n * 13; o += 13) {
            if (px < P[o] || px > P[o + 1] || py < P[o + 2] || py > P[o + 3]) continue;
            const qx = px - P[o + 4], qy = py - P[o + 5], ux = P[o + 6], uy = P[o + 7], h = P[o + 8], ra = P[o + 9], b = P[o + 11], a = P[o + 12];
            let lx = qx * uy - qy * ux; if (lx < 0) lx = -lx;
            const ly = qx * ux + qy * uy, k = -b * lx + a * ly;
            const e = k < 0 ? Math.sqrt(lx * lx + ly * ly) - ra : k > a * h ? Math.sqrt(lx * lx + (ly - h) * (ly - h)) - P[o + 10] : lx * a + ly * b - ra;
            const w = .5 + (.5 * (e - d)) / 7, q = w < 0 ? 0 : w > 1 ? 1 : w;
            d = e + (d - e) * q - 7 * q * (1 - q);
          }
          grid[j * NX + i] = d;
        }
      }
    };
    const EDGES = [[], [3, 2], [2, 1], [3, 1], [0, 1], [3, 0, 2, 1], [0, 2], [3, 0], [3, 0], [0, 2], [0, 1, 3, 2], [0, 1], [3, 1], [2, 1], [3, 2], []];
    const contour = (L, put) => {
      for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = grid[j * NX + i] - L, b = grid[j * NX + i + 1] - L, c2 = grid[(j + 1) * NX + i + 1] - L, d = grid[(j + 1) * NX + i] - L;
        const e = EDGES[(a < 0 ? 8 : 0) | (b < 0 ? 4 : 0) | (c2 < 0 ? 2 : 0) | (d < 0 ? 1 : 0)];
        if (!e.length) continue;
        const x = X0 + i * ST, y = Y0 + j * ST;
        const at = (n) => n === 0 ? [x + (ST * a) / (a - b), y] : n === 1 ? [x + ST, y + (ST * b) / (b - c2)] : n === 2 ? [x + (ST * d) / (d - c2), y + ST] : [x, y + (ST * a) / (a - d)];
        for (let k = 0; k < e.length; k += 2) { const p = at(e[k]), q = at(e[k + 1]); put(p[0], p[1], q[0], q[1]); }
      }
    };
    const traces = [0, 1].map((p) => { sample(pose(p, AL, BE).parts); const out = []; contour(0, (a, b, c2, d) => out.push(a, b, c2, d)); return out; });
    const segs = (g, a) => { g.beginPath(); for (let i = 0; i < a.length; i += 4) { g.moveTo(a[i], a[i + 1]); g.lineTo(a[i + 2], a[i + 3]); } g.stroke(); };
    // a point at a fraction of a polyline
    const along = (pts, f) => {
      let total = 0; const ls = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); total += l; }
      let want = clamp(f) * total; for (let i = 0; i < ls.length; i++) { if (want <= ls[i]) { const u = want / (ls[i] || 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; } want -= ls[i]; }
      return pts[pts.length - 1];
    };
    const r = rng(9), stars = sky(r, 150, (x, y) => Math.hypot(x - NAV[0], y - NAV[1]) > RC + 8);
    const beat = (x) => Math.exp(-((x / .07) ** 2)) + .55 * Math.exp(-(((x - .27) / .07) ** 2));
    const HB = 14, clk = {};
    let px = null, py = null, feel = 0;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      if (s.x != null) { px = px == null ? s.x : ease(s, px, s.x, .25); py = py == null ? s.y : ease(s, py, s.y, .25); }
      const p = .5 - .5 * Math.cos((t * TAU) / BREATH), breath = 1 + .03 * Math.sin((t * TAU) / BREATH);
      const body = pose(p, AL, BE);
      body.parts[3][4] *= breath; body.parts[4][4] *= breath;
      sample(body.parts);
      const at = (x, y) => { const i = Math.round((x - X0) / ST), j = Math.round((y - Y0) / ST); return i < 0 || j < 0 || i >= NX || j >= NY ? 60 : grid[j * NX + i]; };
      const inside = px != null && at(px, py) < 14;
      feel = ease(s, feel, inside ? 1 : 0, .08);
      const touch = t - (clk.at ?? -99), arrive = Math.exp(-(((touch - 1) / .15) ** 2));
      const age = t % BEAT, [hx, hy] = body.heart;
      g.lineCap = g.lineJoin = 'round';
      twinkle(g, c, stars, t, .32);
      light(g);
      glow(g, NAV[0], NAV[1], 320, c.heat(.22), .35);
      // the circle and the square, ruled like the drawing
      const ring = []; for (let k = 0; k <= 160; k++) ring.push(NAV[0] + RC * Math.cos((k / 160) * TAU), NAV[1] + RC * Math.sin((k / 160) * TAU));
      fibre(g, ring, c.heat(.55), .9, .4, 6);
      const [sx, sy, S] = SQ;
      fibre(g, [sx, sy, sx + S, sy, sx + S, sy + S, sx, sy + S, sx, sy], c.cool(.6), .8, .32, 6);
      g.strokeStyle = c.ink; g.lineWidth = .7; g.globalAlpha = .22;
      const ticks = [];
      for (let k = 1; k < 24; k++) { const v = (k / 24) * S, l = k % 3 ? 4 : 9; ticks.push(sx + v, sy + S, sx + v, sy + S - l, sx, sy + v, sx + l, sy + v, sx + S, sy + v, sx + S - l, sy + v); }
      segs(g, ticks);
      // Leonardo's proportions: head, chest, navel, groin, knee
      g.globalAlpha = .07; g.setLineDash([2, 5]);
      segs(g, [sx, 180, sx + S, 180, sx, 230, sx + S, 230, sx, 330, sx + S, 330, sx, 430, sx + S, 430]);
      g.setLineDash([]);
      // the two poses of the drawing, as faint traces
      traces.forEach((tr, i) => { g.strokeStyle = i ? c.heat(.6) : c.cool(.7); g.lineWidth = .8; g.globalAlpha = .1 + .12 * (i ? p : 1 - p); segs(g, tr); });
      // nerves and vessels: from the heart to every end
      const nerves = Array.from({ length: HB }, () => []), runs = Array.from({ length: HB + 2 }, () => []);
      body.paths.forEach((path, n) => {
        const b = Math.floor((n / body.paths.length) * HB), list = nerves[b];
        for (let k = 0; k <= 24; k++) { const [x, y] = along(path, k / 24); list.push(x, y); }
        list.push(NaN, NaN);
        const f = (age - .05) / .65;
        if (f > 0 && f < 1) { const [x, y] = along(path, f); runs[b].push(x, y, 1 + .9 * (1 - f)); }
        if (feel > .05) { const end = path[path.length - 1], dd = Math.hypot(end[0] - px, end[1] - py); if (dd < 90) for (let m = 0; m < 2; m++) { const [x, y] = along(path, 1 - frac(t / 1.5 + m / 2 + n * .07)); runs[HB].push(x, y, 1.7 * feel * Math.exp(-((dd / 60) ** 2))); } }
        if (touch > 0 && touch < 1.05) { const end = path[path.length - 1], dd = Math.hypot(end[0] - clk.x, end[1] - clk.y); if (dd < 110) { const [x, y] = along(path, 1 - touch); runs[HB + 1].push(x, y, 2.2 * Math.exp(-((dd / 70) ** 2))); } }
      });
      nerves.forEach((list, b) => fibre(g, list, c.hue((b + .5) / HB), .6, .3 + .25 * beat(age - .3), 5));
      // the drawing inside: two faint contours for volume, and the pen lines of the anatomy, warmed by each beat
      [-7, -16].forEach((L, i) => {
        const d = beat(age - .25 * i) + beat(age + BEAT - .25 * i), list = []; contour(L + 2 * d, (a, b, c2, e) => list.push(a, b, c2, e));
        g.strokeStyle = c.heat(.45 + .3 * i); g.lineWidth = .6; g.globalAlpha = .07 + .1 * d; segs(g, list);
      });
      fibre(g, body.lines, c.heat(.72), .75, .42 + .2 * beat(age - .4), 4);
      // the skin, coloured around the navel, flaring with the beat and where it is felt
      const skin = Array.from({ length: HB }, () => []), hot = [];
      const arrival = beat(age - .7) + beat(age + BEAT - .7);
      contour(0, (a, b, c2, e) => {
        const mx = (a + c2) / 2, my = (b + e) / 2, h = frac(Math.atan2(my - NAV[1], mx - NAV[0]) / TAU + .25);
        skin[Math.floor(h * HB) % HB].push(a, b, c2, e);
        if (feel > .05 && Math.hypot(mx - px, my - py) < 46) hot.push(a, b, c2, e);
      });
      skin.forEach((list, b) => {
        g.strokeStyle = c.hue((b + .5) / HB);
        g.lineWidth = 6; g.globalAlpha = .08 + .08 * arrival; segs(g, list);
        g.lineWidth = 1.2; g.globalAlpha = .7 + .3 * arrival; segs(g, list);
      });
      if (hot.length) { g.strokeStyle = c.cool(.85); g.lineWidth = 7; g.globalAlpha = .2 * feel; segs(g, hot); g.lineWidth = 1.6; g.globalAlpha = .9 * feel; segs(g, hot); }
      runs.forEach((list, b) => {
        if (!list.length) return;
        g.fillStyle = b < HB ? c.hue((b + .5) / HB) : c.cool(b === HB ? .75 : .9);
        g.globalAlpha = .2; discs(g, list, 3, 3);
        g.globalAlpha = .95; discs(g, list);
      });
      ember(g, c, hx, hy, .9, 1 + .35 * beat(age) + .8 * arrive);
      end(g);
    };
  },

  // A puddle at night: the sky trembles in it, stars and a moon in the water. Pebbles fall like embers, and their circles
  // widen in the colours of light, cross, touch the edge. A leaf rides them. Hover over the water: a finger stirs it.
  // Click: the child throws a pebble.
  play() {
    const CX = 300, CY = 318, W = 240, H = 160, SQ = .5, PERIOD = 4.4, LIFE = 13;
    const shore = (a) => 1 + .05 * Math.sin(3 * a + 1) + .035 * Math.sin(5 * a + 2.2) + .02 * Math.sin(9 * a + .4) + .015 * Math.sin(14 * a) + .02 * Math.cos(2 * a);
    const SHORE = Float64Array.from({ length: 721 }, (_, i) => shore((i / 720) * TAU - Math.PI));
    const inside = (x, y, margin = 1) => { const u = (x - CX) / W, v = (y - CY) / H; return Math.hypot(u, v) < SHORE[Math.round(((Math.atan2(v, u) + Math.PI) / TAU) * 720)] * margin; };
    const border = Array.from({ length: 241 }, (_, i) => { const a = (i / 240) * TAU, q = shore(a); return [CX + W * q * Math.cos(a), CY + H * q * Math.sin(a)]; });
    const spans = [];
    for (let y = CY - H * 1.2; y < CY + H * 1.2; y += 4.2) {
      const xs = [];
      for (let i = 0; i < 240; i++) { const [x0, y0] = border[i], [x1, y1] = border[i + 1]; if ((y0 - y) * (y1 - y) < 0) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)); }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) spans.push(y, xs[i] + 3, xs[i + 1] - 3);
    }
    const r = rng(52);
    const grit = Array.from({ length: 1100 }, () => {
      const x = r() * 600, y = 50 + r() * 530, u = (x - CX) / W, v = (y - CY) / H, rim = Math.hypot(u, v) / shore(Math.atan2(v, u));
      return rim < 1.03 ? null : [x, y, .3 + r() * .6, rim];
    }).filter(Boolean);
    const reflected = []; while (reflected.length < 320 * 3) { const x = CX + (r() - .5) * 2 * W, y = CY + (r() - .5) * 2 * H; if (inside(x, y, .95)) reflected.push(x, y, .4 + r() ** 4 * 1.9); }
    const twk = Array.from({ length: 320 }, () => [r() * TAU, 3 + r() * 5]);
    const clouds = Array.from({ length: 8 }, () => [r() * 900, CY - H * .9 + r() * H * 1.8, 60 + r() * 80, 14 + r() * 14, r()]);
    const auto = (j) => { const m = rng(j * 71 + 9); m(); let x, y; do { x = CX + (m() - .5) * W * 1.3; y = CY + (m() - .5) * H * 1.2; } while (!inside(x, y, .8)); return { x, y, at: j * PERIOD + 1.2, amp: 1, hue: m() }; };
    const clicks = [], stirs = [];
    let lastClick = null, lastStir = -1;
    const RINGHUES = [0, .14, .28, .5, .66, .84];
    return (g, c, t, s) => {
      if (s.click && s.click !== lastClick) {
        lastClick = s.click;
        if (!s.snap) {
          let [x, y] = s.click;
          for (let k = 0; k < 40 && !inside(x, y, .9); k++) { x += (CX - x) * .08; y += (CY - y) * .08; }
          clicks.push({ x, y, at: t + .45, amp: 1.2, hue: frac(t * .37) });
          if (clicks.length > 3) clicks.shift();
        }
      }
      // a finger in the water
      if (s.x != null && !s.snap && inside(s.x, s.y, .95) && Math.floor(t / 1.3) !== lastStir) {
        lastStir = Math.floor(t / 1.3);
        stirs.push({ x: s.x, y: s.y, at: t, amp: .35, hue: .55, soft: true });
        if (stirs.length > 6) stirs.shift();
      }
      for (const list of [clicks, stirs]) for (let i = list.length - 1; i >= 0; i--) if (t < list[i].at - 1 || t - list[i].at > LIFE) list.splice(i, 1);
      const k = Math.floor(t / PERIOD), drops = [];
      for (let j = k - 2; j <= k; j++) drops.push(auto(j));
      drops.push(...clicks);
      const live = drops.filter((d) => t > d.at && t - d.at < LIFE).concat(stirs.filter((d) => t > d.at && t - d.at < 7));
      let slope = 0;
      const n = live.length, DX = live.map((d) => d.x), DY = live.map((d) => d.y), FRONT = live.map((d) => (t - d.at) * 46), DAMP = live.map((d) => d.amp * Math.exp(-(t - d.at) / 6));
      const wave = (x, y) => {
        let h = 0;
        slope = 0;
        for (let i = 0; i < n; i++) {
          const dy = (y - DY[i]) / SQ, dx = x - DX[i], front = FRONT[i];
          if (dx > front + 6 || dx < -front - 6 || dy > front + 6 || dy < -front - 6) continue;
          const dist = Math.sqrt(dx * dx + dy * dy), u = front - dist;
          if (u < -6) continue;
          const env = (u < 2 ? smooth(-6, 2, u) : 1) * Math.exp(-u / 90) * DAMP[i], a = u / 8.5;
          h += Math.sin(a) * env;
          slope += Math.cos(a) * env * (dy / (dist + 1));
        }
        return h;
      };
      const skyNow = clouds.map(([x0, y0, w, h, p]) => [((x0 + t * (4 + p * 3)) % 900) - 150, y0, w, h, p * 9]);
      let row = [];
      const cloudRow = (y) => { row = []; for (const [cx, y0, w, h, p] of skyNow) { const k2 = Math.exp(-(((y - y0) / h) ** 2)); if (k2 > .01) row.push(cx, w, k2, p); } };
      const cloud = (x) => { let v = 0; for (let i = 0; i < row.length; i += 4) { const dx = (x - row[i]) / row[i + 1]; if (dx < 3 && dx > -3) v += Math.exp(-dx * dx) * row[i + 2] * (1 + .3 * Math.sin(x * .09 + row[i + 3])); } return v; };
      g.lineCap = g.lineJoin = 'round';
      // the pavement: faint grit, wetter near the water
      g.fillStyle = c.ink;
      for (let b = 0; b < 3; b++) {
        g.globalAlpha = [.3, .18, .09][b];
        g.beginPath();
        for (const [x, y, size, rim] of grit) if ((rim < 1.12 ? 0 : rim < 1.35 ? 1 : 2) === b) { g.moveTo(x + size, y); g.arc(x, y, size, 0, TAU); }
        g.fill();
      }
      light(g);
      // the moon in the water, drifting slowly, broken by the circles
      const mx = CX + 90 * Math.sin(t / 40) - 40, my = CY - 50, mh = wave(mx, my);
      glow(g, mx + mh * 10, my + slope * 6, 170, c.cool(.55), .5);
      glow(g, mx + mh * 10, my + slope * 6, 46, c.cool(.9), .9);
      spark(g, mx + mh * 10, my + slope * 6, 5, '#dfe8ff', .9);
      // the sky's light on the water, line by line: dark under clouds, bright where a slope catches the moon
      const tones = [[], [], [], []];
      for (let i = 0; i < spans.length; i += 3) {
        const y = spans[i], x0 = spans[i + 1], x1 = spans[i + 2], depth = 1 - Math.abs(y - my) / (2 * H);
        cloudRow(y);
        let px = x0, py = y + wave(x0, y) * 5;
        for (let x = x0 + 5; x <= x1 + 4.9; x += 5) {
          const X = Math.min(x, x1), h = wave(X, y), Y = y + h * 5 + .5 * Math.sin(X * .05 + t * 1.1 + y * .3);
          const moonlit = Math.exp(-(((X - mx) / 120) ** 2));
          const tone = .1 + .35 * depth * moonlit + .25 * depth - .5 * clamp(cloud(X + h * 8) - .2) + 1.3 * Math.abs(slope);
          const b = Math.floor(tone * 4.5);
          if (b >= 0) { const list = tones[Math.min(3, b)], m = list.length; if (m && list[m - 2] === px && list[m - 1] === py) list.push(X, Y); else list.push(NaN, NaN, px, py, X, Y); }
          px = X; py = Y;
        }
      }
      tones.forEach((list, b) => { g.strokeStyle = c.cool(.5 + b * .12); g.lineWidth = [.5, .7, .9, 1.2][b]; g.globalAlpha = [.05, .1, .22, .4][b]; g.beginPath(); poly(g, list); g.stroke(); });
      // the stars in the water, shaken by the circles
      g.fillStyle = '#eef4ff';
      for (let b = 0; b < 2; b++) {
        g.globalAlpha = b ? .85 : .4;
        g.beginPath();
        for (let i = 0; i < reflected.length; i += 3) {
          const [ph, per] = twk[i / 3], on = .5 + .5 * Math.sin((t * TAU) / per + ph);
          if ((on > .5) !== !!b) continue;
          const x = reflected[i], y = reflected[i + 1], h = wave(x, y), X = x + h * 3, Y = y + slope * 9 + h * 2, R = reflected[i + 2];
          g.moveTo(X + R, Y); g.arc(X, Y, R, 0, TAU);
        }
        g.fill();
      }
      // the shore
      const rim = []; border.forEach(([x, y], i) => { const q = 1 + .006 * Math.sin(i * .9 + t * .8); rim.push(CX + (x - CX) * q, CY + (y - CY) * q); });
      fibre(g, rim, c.cool(.7), .8, .35, 7);
      // the circles, in the colours of light, slightly split like a prism
      for (const d of live) {
        const age = t - d.at, soft = !!d.soft;
        for (let j = 0; j < (soft ? 3 : 5); j++) {
          const R = age * 46 - j * 17 - 4;
          if (R < 2) continue;
          const amp = Math.exp(-age / 5 - j * .3) * d.amp;
          if (amp < .03) continue;
          for (let p = 0; p < 3; p++) {
            const off = (p - 1) * 1.6, list = [];
            let open = false;
            const m = Math.max(40, Math.round(R * .6));
            for (let i = 0; i <= m; i++) {
              const a = (i / m) * TAU, q = R + off + 1.3 * Math.sin(a * 7 + t * 1.7 + j * 2), x = d.x + q * Math.cos(a), y = d.y + q * SQ * Math.sin(a);
              if (!inside(x, y, .985)) { if (open) list.push(NaN, NaN); open = false; continue; }
              list.push(x, y); open = true;
            }
            g.strokeStyle = c.hue(frac(d.hue + RINGHUES[(j + p * 2) % 6] * .5 + p * .3));
            g.lineWidth = 1.3; g.globalAlpha = Math.min(.9, amp * 1.4);
            g.beginPath(); poly(g, list); g.stroke();
          }
        }
      }
      // a leaf rides the circles
      const lx = CX - 120 + 60 * Math.sin(t * .045), ly = CY + 52 + 18 * Math.sin(t * .06 + 1), lh = wave(lx, ly);
      const la = .5 + .25 * Math.sin(t * .07) + lh * .15, ca = Math.cos(la), sa = Math.sin(la), L = 26;
      const leaf = (u, side) => { const w = side * 8 * Math.sin(Math.PI * u) ** .9; return [lx + (u - .5) * L * ca - w * sa, ly + lh * 3 + ((u - .5) * L * sa + w * ca) * .7]; };
      const leafPts = [];
      for (const side of [-1, 1]) { for (let i = 0; i <= 14; i++) leafPts.push(...leaf(i / 14, side)); leafPts.push(NaN, NaN); }
      const [ax, ay] = leaf(0, 0), [bx, by] = leaf(1, 0);
      leafPts.push(ax - 5 * ca, ay - 5 * sa * .7, bx, by, NaN, NaN);
      for (let i = 1; i < 6; i++) for (const side of [-1, 1]) { const [x0, y0] = leaf(i / 6, 0), [x1, y1] = leaf(i / 6 + .1, side * .75); leafPts.push(x0, y0, x1, y1, NaN, NaN); }
      fibre(g, leafPts, c.heat(.7), .8, .75, 5);
      // the last pebble: a falling ember, then a glow resting under the water
      let last = null;
      for (const d of drops) if (t > d.at - .6 && (!last || d.at > last.at)) last = d;
      if (last) {
        const age = t - last.at;
        if (age < 0) {
          const f = 1 + age / .6, y = last.y - 220 * (1 - f * f), trail = [];
          for (let q = 0; q <= 8; q++) { const f2 = Math.max(0, f - q * .03); trail.push(last.x, last.y - 220 * (1 - f2 * f2)); }
          fibre(g, trail, c.heat(.7), 1.2, .5, 4);
          ember(g, c, last.x, y, .55);
        } else {
          if (age < .8) {
            const sp = [];
            for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + last.x, v = 30 + (i % 3) * 14; sp.push(last.x + Math.cos(a) * v * age, last.y + Math.sin(a) * v * SQ * age - (60 + (i % 4) * 20) * age + 160 * age * age, 1.3); }
            g.fillStyle = c.heat(.85); g.globalAlpha = 1 - age / .8; discs(g, sp); g.globalAlpha *= .2; discs(g, sp, 3, 4);
          }
          const h = wave(last.x + 6, last.y);
          const k2 = Math.exp(-age / 4);
          glow(g, last.x + h * 1.5, last.y + 4 + h * 2, 80 * k2 + 30, c.mark, .5 * k2 + .2);
          spark(g, last.x + h * 1.5, last.y + 4 + h * 2, 4 * k2 + 1.8, c.mark, .6 + .4 * k2);
        }
      }
      end(g);
    };
  },

  // The self. Streams of light run across the whole page. One part of them closes into a lens with a bright rim: the whole
  // bends around it, and inside it the whole appears again, small, upside down, turning on its own, as if it were a world
  // apart. It is only the same light gathered. The rim is porous; the ember at its focus is what looks. Hover: the lens
  // drifts, and the world inside changes with its point of view. Click: the self lets go; the rim opens, the private image
  // fades, the streams run straight through the ember; then, because one needs a place to see from, it gathers again.
  self() {
    const r = rng(77), NL = 56, R = 112, S = 2.75, X0 = -160, X1 = 760, STEP = 6;
    const lines = Array.from({ length: NL }, (_, i) => ({
      y0: -70 + (740 * (i + .5)) / NL + (r() - .5) * 6, a1: 14 + r() * 26, f1: .004 + r() * .005, p1: r() * TAU, a2: 3 + r() * 8, f2: .016 + r() * .016, p2: r() * TAU,
      hue: frac(i / NL * .92 + .55 + r() * .04), sp: (r() - .5) * .5, beads: [r(), r(), r()], v: .018 + r() * .02,
    }));
    const stars = sky(r, 110);
    const pores = Array.from({ length: 56 }, () => [r(), .4 + r() * .6]);
    const HB = 16, clk = {};
    let lx = 300, ly = 300;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      lx = ease(s, lx, s.x == null ? 300 + 26 * Math.sin((t * TAU) / 38) : 300 + clamp((s.x - 300) * .45, -110, 110), .03);
      ly = ease(s, ly, s.y == null ? 300 + 14 * Math.sin((t * TAU) / 29) : 300 + clamp((s.y - 300) * .45, -110, 110), .03);
      const tau = t - (clk.at ?? -99), d = tau < 0 ? 0 : smooth(0, 1.6, tau) * (1 - smooth(4.2, 7.5, tau));
      const E = R * (1 - d), cr = -1 / S, sr = 0, inner = R * (1 - .5 * d), seen = 1 - smooth(0, .55, d);
      const ph1 = (t * TAU) / 34, ph2 = (t * TAU) / 19;
      const world = (L, x) => L.y0 + L.a1 * Math.sin(x * L.f1 + L.p1 + ph1) + L.a2 * Math.sin(x * L.f2 + L.p2 - ph2 * (1 + L.sp));
      // a world point seen from outside (bent around the lens) and from inside (small and turned over)
      const outside = (x, y) => { const dx = x - lx, dy = y - ly, b = Math.hypot(dx, dy) || 1e-6, th = (b + Math.sqrt(b * b + 4 * E * E)) / 2; return [lx + (dx / b) * th, ly + (dy / b) * th]; };
      const within = (x, y) => { const dx = x - lx, dy = y - ly, qx = dx * cr - dy * sr, qy = dx * sr + dy * cr; return qx * qx + qy * qy < inner * inner ? [lx + qx, ly + qy] : null; };
      const outB = Array.from({ length: HB }, () => []), inB = Array.from({ length: HB }, () => []), beadO = Array.from({ length: HB }, () => []), beadI = Array.from({ length: HB }, () => []);
      for (const L of lines) {
        const hb = Math.floor(L.hue * HB), O = outB[hb], I = inB[hb];
        let wasIn = false;
        for (let x = X0; x <= X1; x += STEP) {
          const y = world(L, x), [ox, oy] = outside(x, y);
          if (ox > -20 && ox < 620 && oy > -20 && oy < 620) O.push(ox, oy); else if (O.length && !Number.isNaN(O[O.length - 1])) O.push(NaN, NaN);
          const q = within(x, y);
          if (q) { I.push(q[0], q[1]); wasIn = true; } else if (wasIn) { I.push(NaN, NaN); wasIn = false; }
        }
        O.push(NaN, NaN); if (wasIn) I.push(NaN, NaN);
        for (const b0 of L.beads) {
          const x = X0 + frac(b0 + t * L.v) * (X1 - X0), y = world(L, x), [ox, oy] = outside(x, y), q = within(x, y);
          beadO[hb].push(ox, oy, 1.3);
          if (q) beadI[hb].push(q[0], q[1], .9);
        }
      }
      g.lineCap = g.lineJoin = 'round';
      twinkle(g, c, stars, t, .3);
      light(g);
      const ins = 1 - d * .7;
      glow(g, lx, ly, R * 2.6, c.heat(.3), .35 * ins);
      outB.forEach((list, b) => fibre(g, list, c.hue((b + .5) / HB), .7, .32, 5));
      if (seen > .01) inB.forEach((list, b) => fibre(g, list, c.hue((b + .5) / HB), .55, .7 * seen, 4));
      [beadO, beadI].forEach((set, k) => set.forEach((list, b) => {
        if (!list.length) return;
        g.fillStyle = c.hue((b + .5) / HB);
        g.globalAlpha = .15; discs(g, list, 3, 3.5);
        g.globalAlpha = k ? .9 * seen : .8; discs(g, list);
      }));
      // the rim: a bright edge that looks closed, made of arcs with gaps through which the light passes
      const open = 1 - d;
      if (open > .02) {
        glow(g, lx, ly, R * 1.25, c.cool(.6), .12 * open);
        const rim = [];
        for (const [p, len] of pores) {
          const a0 = (p + t / 60) * TAU, a1 = a0 + (len * TAU) / pores.length * 1.6 * open;
          for (let k = 0; k <= 6; k++) { const a = a0 + ((a1 - a0) * k) / 6; rim.push(lx + R * Math.cos(a), ly + R * Math.sin(a)); }
          rim.push(NaN, NaN);
        }
        fibre(g, rim, c.heat(.72), 1.5, .8 * open, 5);
        g.strokeStyle = c.cool(.8); g.lineWidth = .5; g.globalAlpha = .3 * open;
        g.beginPath(); g.arc(lx, ly, R + 5, 0, TAU); g.stroke();
      }
      ember(g, c, lx, ly, 1.15 + .25 * open, heartbeat(t));
      end(g);
    };
  },
  };
};

export const FROZEN = { river: 9, fractal: 18, void: 21, emerge: 25, birth: 25.5, body: 4.2, play: 24, self: 12 };
