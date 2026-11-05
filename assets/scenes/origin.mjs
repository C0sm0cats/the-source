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

  // Two infinities born from one point. Upward, cold fibres open into stars, clusters and spiral galaxies; downward, warm
  // cells divide into smaller ones, then molecules, atoms, grains. The spectrum is split at the ember: blue to violet above,
  // red to green below. A slow wave of light leaves the centre both ways. Hover x opens or closes them; click sends a pulse.
  fractal(labels) {
    const UP = 7, DOWN = 9, r = rng(36);
    const jitter = (n) => Float64Array.from({ length: n }, () => r() * 2 - 1);
    const ju = jitter(2 << UP), lu = jitter(2 << UP), jd = jitter(2 << DOWN), ld = jitter(2 << DOWN), kind = jitter(2 << UP);
    const galaxies = Array.from({ length: 7 }, (_, k) => {
      const arms = k % 3 ? 2 : 3, pts = [], wind = 2.4 + r() * 1.8;
      for (let i = 0; i < 26; i++) { const q = r() ** 2 * .3, a = r() * TAU; pts.push(q * Math.cos(a), q * Math.sin(a), .35 + (1 - q) * .55); }
      for (let a = 0; a < arms; a++) for (let i = 0; i < 30; i++) {
        const u = (i + r()) / 30, q = .12 + u * .9, th = (a * TAU) / arms + u * wind, sc = .05 + u * .1;
        pts.push(q * Math.cos(th) + (r() - .5) * sc, q * Math.sin(th) + (r() - .5) * sc, .25 + (1 - u) * .5);
      }
      return pts;
    });
    const clusters = Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => { const q = Math.abs(r() + r() - 1) * 1.2, a = r() * TAU; return [q * Math.cos(a), q * Math.sin(a), .3 + r() * .5]; }));
    const granules = Array.from({ length: 16 }, () => { const q = Math.sqrt(r()) * .78, a = r() * TAU; return [q * Math.cos(a), q * Math.sin(a), r()]; });
    const stars = sky(r, 300, (x, y) => y < 300 - 300 * r() ** 2);
    const grains = Array.from({ length: 420 }, () => [300 + (r() - .5) * 600 * (.55 + r() * .45), 330 + 250 * r() ** .7, .25 + r() * .4]);
    const UPH = (l) => .56 + .36 * (l / UP), DNH = (l) => .02 + .36 * (l / DOWN);
    let spread = .5;
    const clk = {};
    return (g, c, t, s) => {
      clicked(clk, s, t);
      const target = s.x == null ? .5 + .05 * Math.sin(t / 7) : .3 + .42 * (s.x / 600);
      spread = ease(s, spread, target, .06);
      const breath = .5 + .5 * Math.cos((t / 18) * TAU);
      // light leaving the centre both ways: a slow wave, and the pulse of a touch
      const front = frac(t / 11) * 1.4 - .2, pulse = (t - (clk.at ?? -99)) / 2.4;
      const lit = (u) => .65 + .55 * Math.exp(-(((u - front) * 5) ** 2)) + (pulse < 1.3 ? 1.4 * Math.exp(-(((u - pulse) * 6) ** 2)) : 0);
      const lines = Array.from({ length: UP + 1 }, () => []), up = [], down = [];
      const growUp = (x, y, angle, length, level, id, reach) => {
        const f = Math.min(1, reach - level);
        if (f <= 0) return;
        const nx = x + length * f * Math.cos(angle), ny = y + length * f * Math.sin(angle);
        lines[level].push(x, y, nx, ny, NaN, NaN);
        up.push(nx, ny, level, id, f);
        if (level === UP || f < 1) return;
        const open = spread * .78 * (1 - level * .1) * (1 + .22 * ju[id]);
        for (const side of [-1, 1]) {
          const a = clamp(angle + side * open, -Math.PI + .12, -.12);
          growUp(nx, ny, a, length * (.84 + .07 * lu[id * 2 + (side > 0)]), level + 1, id * 2 + (side > 0), reach);
        }
      };
      const growDown = (x, y, px, py, R, level, id, reach, pr) => {
        const f = Math.min(1, reach - level);
        if (f <= 0) return;
        const bend = (u, v) => v - 46 * ((u - 300) / 210) ** 2 * smooth(330, 520, v);
        const bx = bend(x, y), bpx = bend(px, py);
        const nx = px + (x - px) * f, ny = bpx + (bx - bpx) * f;
        down.push(px, bpx, nx, ny, level, id, f, R * f, pr);
        if (level === DOWN || f < 1) return;
        const d = 96 * .5 ** level * (.6 + .8 * spread) * (1 + .1 * jd[id]), cr = R * .6;
        for (const side of [-1, 1]) growDown(x + side * d, y + (R + cr) * (1.3 + .08 * ld[id * 2 + (side > 0)]), x, y, cr, level + 1, id * 2 + (side > 0), reach, R);
      };
      growUp(300, 300, -Math.PI / 2, 47, 0, 1, (.36 + .8 * breath) * (UP + 1));
      growDown(300, 352, 300, 300, 36, 0, 1, (.36 + .8 * breath) * (DOWN + 1), 7);
      g.lineCap = g.lineJoin = 'round';
      // the night above, a fine warm dust below
      twinkle(g, c, stars, t, .5, c.cool(.85));
      g.fillStyle = c.heat(.5); g.globalAlpha = .22; discs(g, grains.flat());
      light(g);
      glow(g, 300, 150, 300, c.cool(.35), .45);
      glow(g, 300, 120, 160, c.hue(.8), .15);
      glow(g, 300, 430, 240, c.heat(.25), .3);
      // the filaments of the large
      lines.forEach((list, level) => fibre(g, list, level < 1 ? c.heat(.9) : c.hue(UPH(level)), Math.max(.4, 2.2 * .78 ** level), Math.min(1, (.62 - level * .04) * lit(level / UP)), 4));
      // what blooms on them: stars near the root, clusters further, galaxies at the edge
      const dots = new Map(), add = (key, x, y, size) => { let l = dots.get(key); if (!l) dots.set(key, (l = [])); l.push(x, y, size); };
      const cores = [];
      for (let i = 0; i < up.length; i += 5) {
        const x = up[i], y = up[i + 1], level = up[i + 2], id = up[i + 3], f = up[i + 4], k = kind[id];
        if (level < 3) continue;
        const hue = Math.round(UPH(level) * 12) / 12;
        if (level < 6) {
          if (k < .1) continue;
          const cl = clusters[id % clusters.length], R = (1.6 + level * .9) * f;
          for (const [px, py, size] of cl) add(hue, x + px * R, y + py * R, size * .8);
        } else if (level < UP) {
          add(1, x, y, 1.1 * f);
          if (k > .55) { const cl = clusters[(id >> 1) % clusters.length]; for (const [px, py, size] of cl) add(hue, x + px * 4, y + py * 4, size * .7); }
        } else if (k > .45) {
          const tpl = galaxies[id % galaxies.length], R = (10 + 14 * (k - .45) / .55) * f, gh = Math.round((.55 + .4 * frac(id * .618)) * 12) / 12;
          const rot = id * 1.7 + t * .025 * (id % 2 ? 1 : -1), tilt = id * .9, incl = .35 + .6 * Math.abs(Math.sin(id * 2.3));
          const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
          for (let j = 0; j < tpl.length; j += 3) {
            const px = tpl[j] * cr - tpl[j + 1] * sr, py = (tpl[j] * sr + tpl[j + 1] * cr) * incl;
            add(j < 78 ? 1 : gh, x + R * (px * ct - py * st), y + R * (px * st + py * ct), tpl[j + 2] * (.5 + R / 24));
          }
          cores.push(x, y, R, gh);
        } else add(1, x, y, 1.2 * f);
      }
      const upLit = lit(1);
      for (let i = 0; i < cores.length; i += 4) glow(g, cores[i], cores[i + 1], cores[i + 2] * 3, c.hue(cores[i + 3]), .45 * upLit), glow(g, cores[i], cores[i + 1], cores[i + 2] * .7, c.cool(.95), .5 * upLit);
      for (const [key, list] of dots) {
        g.fillStyle = key === 1 ? '#f4f6ff' : c.hue(key);
        if (key !== 1) { g.globalAlpha = .14; discs(g, list, 3, 2.6); }
        g.globalAlpha = key === 1 ? .85 : .7; discs(g, list);
      }
      // the descent: each cell divides into smaller ones, down to molecules, atoms, grains
      const vessels = Array.from({ length: 5 }, () => []), cells = Array.from({ length: DOWN + 1 }, () => []), orbits = [], specks = [], nuclei = [];
      for (let i = 0; i < down.length; i += 9) {
        const x0 = down[i], y0 = down[i + 1], x1 = down[i + 2], y1 = down[i + 3], level = down[i + 4], id = down[i + 5], f = down[i + 6], R = down[i + 7], pr = down[i + 8];
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
        if (d > R + pr) vessels[Math.min(4, level >> 1)].push(x0 + dx / d * pr, y0 + dy / d * pr, x1 - dx / d * R, y1 - dy / d * R, NaN, NaN);
        if (level < 4) {
          cells[level].push(x1, y1, R);
          nuclei.push(x1 + R * .18 * Math.cos(id), y1 + R * .18 * Math.sin(id), R, id);
        } else if (level < 5) {
          const n = 2 + (id % 3), a0 = id * 2.1 + t * .05;
          for (let j = 0; j < n; j++) { const a = a0 + (j * TAU) / n, q = j ? R * .55 : 0; cells[level].push(x1 + q * Math.cos(a), y1 + q * Math.sin(a), R * (j ? .32 : .42)); }
        } else if (level < 7) {
          specks.push(x1, y1, .9 * f);
          const a0 = id * .7 + t * .04, Ro = Math.max(1.5, R * 1.1);
          for (let o = 0; o < 7 - level; o++) {
            const a = a0 + o * 1.3, ca = Math.cos(a), sa = Math.sin(a);
            for (let j = 0; j <= 14; j++) { const u = (j / 14) * TAU, px = Ro * Math.cos(u), py = Ro * .35 * Math.sin(u); orbits.push(x1 + px * ca - py * sa, y1 + px * sa + py * ca); }
            orbits.push(NaN, NaN);
          }
        } else specks.push(x1, y1, (level < DOWN ? .55 : .42) * f);
      }
      vessels.forEach((list, b) => fibre(g, list, c.hue(DNH(b * 2)), Math.max(.35, 1.8 * .62 ** b), Math.min(1, .7 * lit((b * 2) / DOWN)), 4));
      cells.forEach((list, level) => {
        if (!list.length) return;
        const col = c.hue(DNH(level)), L = lit(level / DOWN);
        g.fillStyle = g.strokeStyle = col;
        g.globalAlpha = .13 * L; discs(g, list);
        g.lineWidth = Math.max(.4, 1.3 * .8 ** level);
        g.globalAlpha = Math.min(1, (.75 - level * .05) * L);
        g.beginPath(); for (let i = 0; i < list.length; i += 3) { g.moveTo(list[i] + list[i + 2], list[i + 1]); g.arc(list[i], list[i + 1], list[i + 2], 0, TAU); } g.stroke();
        if (level < 2) { g.globalAlpha *= .4; g.beginPath(); for (let i = 0; i < list.length; i += 3) { const R = list[i + 2] * .86; g.moveTo(list[i] + R, list[i + 1]); g.arc(list[i], list[i + 1], R, 0, TAU); } g.stroke(); }
      });
      // inside the large cells: a nucleus and its granules
      const nuc = [], gran = [];
      for (let i = 0; i < nuclei.length; i += 4) {
        const x = nuclei[i], y = nuclei[i + 1], R = nuclei[i + 2], id = nuclei[i + 3], cx = x - R * .18 * Math.cos(id), cy = y - R * .18 * Math.sin(id);
        nuc.push(x, y, R * .36);
        for (const [px, py, k] of granules) { const gx = cx + px * R, gy = cy + py * R; if (Math.hypot(gx - x, gy - y) > R * .42) gran.push(gx, gy, .35 + k * .4 * R / 18); }
      }
      for (let i = 0; i < nuc.length; i += 3) glow(g, nuc[i], nuc[i + 1], nuc[i + 2] * 2.4, c.heat(.7), .75 * lit(0));
      g.fillStyle = c.heat(.75); g.globalAlpha = .6; discs(g, gran);
      fibre(g, orbits, c.hue(DNH(6)), .45, .55 * lit(6 / DOWN), 4);
      g.fillStyle = '#fff6ee'; g.globalAlpha = .8; discs(g, specks);
      g.fillStyle = c.hue(DNH(8)); g.globalAlpha = .2; discs(g, specks, 3, 3.5);
      glow(g, 300, 300, 150 * (1 + .6 * Math.exp(-((pulse * 4) ** 2))), c.mark, .4);
      ember(g, c, 300, 300, 1.1, heartbeat(t));
      end(g);
      label(g, c, labels.large, 300, 20, 'center', 17);
      label(g, c, labels.small, 300, 592, 'center', 17);
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

  // A body breathing. Warm contours swell from the heart to the skin with each breath; every beat runs out along a
  // hundred and eighty fibres and makes the skin flare in colour. Hover near the skin: it feels, and cold signals run
  // back to the heart. Click: a touch; the sensation travels in and the heart answers with a stronger beat.
  body() {
    const N = 7, PTS = 180, HX = 304, HY = 292, BREATH = 7.5, BEAT = 1.1;
    const smin = (a, b, k) => { const h = clamp(.5 + (.5 * (b - a)) / k); return b + (a - b) * h - k * h * (1 - h); };
    const field = (x, y) => {
      const head = Math.hypot(x - 300, (y - 172) * .92) - 54;
      const w = 140 - .12 * (y - 250), qx = Math.abs(x - 300) - (w - 80), qy = Math.abs(y - 408) - 92;
      return smin(head, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 80, 70);
    };
    const skin = Array.from({ length: PTS + 1 }, (_, i) => {
      const a = (i / PTS) * TAU, dx = Math.cos(a), dy = Math.sin(a);
      let reach = 0, before = field(HX, HY);
      for (let d = 2; d < 420; d += 2) {
        const now = field(HX + dx * d, HY + dy * d);
        if (before <= 0 && now > 0) reach = d - 2 + (2 * -before) / (now - before);
        before = now;
      }
      return [dx * reach, dy * reach];
    });
    const r = rng(9), bend = Array.from({ length: PTS }, () => (r() - .5) * .5), stars = sky(r, 120, (x, y) => field(x, y) > 30);
    const beat = (x) => Math.exp(-((x / .07) ** 2)) + .55 * Math.exp(-(((x - .27) / .07) ** 2));
    const fib = (i, f, q) => { const [sx, sy] = skin[i], d = bend[i] * Math.sin(Math.PI * f), cs = Math.cos(d), sn = Math.sin(d); return [HX + (sx * cs - sy * sn) * f * q, HY + (sx * sn + sy * cs) * f * q]; };
    const HB = 12, sense = new Float32Array(PTS), clk = {};
    let px = 300, py = 300;
    return (g, c, t, s) => {
      clicked(clk, s, t);
      if (s.x != null) { px = ease(s, px, s.x, .2); py = ease(s, py, s.y, .2); }
      const breathe = 1 + .04 * Math.sin((t * TAU) / BREATH);
      // which part of the skin is touched
      let near = -1, nd = 1e9;
      const probe = (x, y) => { let best = -1, bd = 1e9; for (let i = 0; i < PTS; i++) { const d = (HX + skin[i][0] * breathe - x) ** 2 + (HY + skin[i][1] * breathe - y) ** 2; if (d < bd) { bd = d; best = i; } } return [best, bd]; };
      if (s.x != null) [near, nd] = probe(px, py);
      if (nd > 55 * 55) near = -1;
      if (clk.at === t) clk.j = probe(clk.x, clk.y)[0];
      for (let i = 0; i < PTS; i++) { const d = near < 0 ? 99 : Math.min(Math.abs(i - near), PTS - Math.abs(i - near)); sense[i] = ease(s, sense[i], Math.exp(-((d / 5) ** 2)), .06); }
      const touch = t - (clk.at ?? -99), arrive = Math.exp(-(((touch - 1) / .15) ** 2));
      const age = t % BEAT, pulse = beat(age) + .9 * arrive;
      g.lineCap = g.lineJoin = 'round';
      twinkle(g, c, stars, t, .3);
      light(g);
      glow(g, HX, HY + 40, 300, c.heat(.25), .45);
      glow(g, HX, HY, 120 * (1 + .2 * pulse), c.mark, .3);
      // the fibres, faint, from the heart to the skin
      const fibres = Array.from({ length: HB }, () => []);
      for (let i = 0; i < PTS; i++) { const list = fibres[Math.floor((i / PTS) * HB)]; for (let k = 0; k <= 10; k++) list.push(...fib(i, k / 10, breathe)); list.push(NaN, NaN); }
      fibres.forEach((list, b) => fibre(g, list, c.hue((b + .5) / HB), .55, .3, 5));
      // the contours: warm inside, breathing, each beat swelling them from the centre out
      for (let i = 0; i < N; i++) {
        const k = (i + 1) / N, lag = k * .55, d = beat(age - lag) + beat(age + BEAT - lag);
        const q = k * (1 + .05 * Math.sin((t / BREATH - k * .2) * TAU)) + .03 * d * (1 - .75 * k);
        const pts = []; for (const [x, y] of skin) pts.push(HX + x * q, HY + y * q);
        fibre(g, pts, c.heat(.95 - .65 * k), i === N - 1 ? 1 : .5 + .4 * k, .06 + .25 * k ** 2 + .3 * d, 5);
      }
      // the skin, in colour, flaring where the beat arrives and where it is touched
      const sk = Array.from({ length: HB }, () => []), runs = Array.from({ length: HB + 2 }, () => []);
      const arrival = beat(age - .62) + beat(age + BEAT - .62);
      for (let i = 0; i < PTS; i++) {
        const b = Math.floor((i / PTS) * HB), x0 = HX + skin[i][0] * breathe, y0 = HY + skin[i][1] * breathe;
        sk[b].push(x0, y0, .9 + .9 * arrival + 2 * sense[i]);
        // the beat runs out
        const f = (age - .05) / .6;
        if (f > 0 && f < 1 && i % 2 === 0) { const [x, y] = fib(i, f, breathe); runs[b].push(x, y, 1 + .8 * (1 - f)); }
        // what is felt runs in
        if (sense[i] > .05) for (let m = 0; m < 2; m++) { const fi = 1 - frac(t / 1.7 + m / 2 + i * .013); const [x, y] = fib(i, fi, breathe); runs[HB].push(x, y, 1.6 * sense[i]); }
        if (clk.j != null && touch > 0 && touch < 1.1) { const d = Math.min(Math.abs(i - clk.j), PTS - Math.abs(i - clk.j)); if (d < 14) { const [x, y] = fib(i, 1 - touch / 1, breathe); runs[HB + 1].push(x, y, 2 * Math.exp(-((d / 7) ** 2))); } }
      }
      sk.forEach((list, b) => {
        g.fillStyle = c.hue((b + .5) / HB);
        g.globalAlpha = .12; discs(g, list, 3, 4);
        g.globalAlpha = .6; discs(g, list);
      });
      const skinLine = []; for (const [x, y] of skin) skinLine.push(HX + x * breathe, HY + y * breathe);
      fibre(g, skinLine, c.ink, .7, .25 + .3 * arrival, 6);
      runs.forEach((list, b) => {
        if (!list.length) return;
        g.fillStyle = b < HB ? c.hue((b + .5) / HB) : c.cool(b === HB ? .75 : .9);
        g.globalAlpha = .2; discs(g, list, 3, 3);
        g.globalAlpha = .9; discs(g, list);
      });
      ember(g, c, HX, HY, 1.3, 1 + .35 * beat(age) + .8 * arrive);
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

export const FROZEN = { river: 9, fractal: 18, void: 21, emerge: 25, birth: 25.5, body: 3.3, play: 24, self: 12 };
