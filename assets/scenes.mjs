// The book's figures. One drawing code for the site (animated canvas) and the PDFs (a recorded frame).
// Each scene draws in a 600 x 600 box and depends only on the time t, so any frame can be reproduced.
const TAU = Math.PI * 2;

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const dot = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
const ease = (s, current, goal, k) => (s.snap ? goal : current + (goal - current) * k);

// A soft glow that also exists in print: stacked translucent discs.
function point(g, c, x, y, r, glow = r * 5) {
  g.fillStyle = c.mark;
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = .035;
    g.beginPath();
    g.arc(x, y, r + (glow - r) * (1 - i / 9), 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.fillStyle = g.strokeStyle = c.ink;
}
function label(g, c, text, x, y, align = 'center', size = 18) {
  if (!text) return;
  g.fillStyle = c.ink;
  g.font = `italic 300 ${size}px Spectral, Georgia, serif`;
  g.textAlign = align;
  g.fillText(text, x, y);
}
function strokeBuckets(g, c, buckets, width) {
  buckets.forEach((items, index) => {
    if (!items.length) return;
    g.strokeStyle = c.mix(index / (buckets.length - 1));
    g.lineWidth = width;
    g.beginPath();
    for (let i = 0; i < items.length; i += 4) { g.moveTo(items[i], items[i + 1]); g.lineTo(items[i + 2], items[i + 3]); }
    g.stroke();
  });
  g.strokeStyle = c.ink;
}

const factories = {
  // A flower of particles that leaves the point and comes back: one breath.
  source() {
    const r = rng(14), golden = Math.PI * (3 - Math.sqrt(5)), N = 2600;
    const items = Array.from({ length: N }, (_, i) => ({ a: i * golden, q: 288 * ((i + 1) / N) ** .56, s: r() * .5 + .6, lag: (i / N) * .2 }));
    const STEPS = 9;
    const groups = Array.from({ length: STEPS }, () => []);
    for (const p of items) groups[Math.floor(clamp(p.q / 190) * (STEPS - 1))].push(p);
    return (g, c, t) => {
      const wave = (lag) => .68 + .32 * Math.cos((t / 16 - lag) * TAU);
      groups.forEach((group, b) => {
        g.fillStyle = c.mix(clamp(b / (STEPS - 3)));
        g.globalAlpha = 1 - b * .04;
        g.beginPath();
        for (const p of group) {
          const k = wave(p.lag), q = p.q * k, a = p.a + (1 - k) * 1.8;
          dot(g, 300 + q * Math.cos(a), 300 + q * Math.sin(a), Math.max(.5, 2.5 * (1 - p.q / 305) ** .85 * p.s));
        }
        g.fill();
      });
      g.globalAlpha = 1;
      point(g, c, 300, 300, 8 + 4 * (1 - wave(0)), 70);
    };
  },

  // Two infinities born from one point. Upward, filaments open into stars, clusters and galaxies;
  // downward, a cell divides into ever smaller ones, then molecules, atoms, grains. The pointer opens or closes them.
  fractal(labels) {
    const UP = 7, DOWN = 9, r = rng(36);
    const jitter = (n) => Float64Array.from({ length: n }, () => r() * 2 - 1);
    const ju = jitter(2 << UP), lu = jitter(2 << UP), jd = jitter(2 << DOWN), ld = jitter(2 << DOWN), kind = jitter(2 << UP);
    // a few spiral galaxies, as dot templates in a unit disc
    const galaxies = Array.from({ length: 7 }, (_, k) => {
      const arms = k % 3 ? 2 : 3, pts = [], wind = 2.4 + r() * 1.8;
      for (let i = 0; i < 26; i++) { const q = r() ** 2 * .3; pts.push(q * Math.cos(r() * TAU), q * Math.sin(r() * TAU), .35 + (1 - q) * .55); }
      for (let a = 0; a < arms; a++) for (let i = 0; i < 30; i++) {
        const u = (i + r()) / 30, q = .12 + u * .9, th = (a * TAU) / arms + u * wind, sc = .05 + u * .1;
        pts.push(q * Math.cos(th) + (r() - .5) * sc, q * Math.sin(th) + (r() - .5) * sc, .25 + (1 - u) * .5);
      }
      return pts;
    });
    const clusters = Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => { const q = Math.abs(r() + r() - 1) * 1.2, a = r() * TAU; return [q * Math.cos(a), q * Math.sin(a), .3 + r() * .5]; }));
    const granules = Array.from({ length: 22 }, () => { const q = Math.sqrt(r()) * .78, a = r() * TAU; return [q * Math.cos(a), q * Math.sin(a), r()]; });
    // the night above, finer below
    const stars = Array.from({ length: 760 }, () => { const x = r() * 600, y = 300 - 290 * Math.sqrt(r()); return [x, y, .25 + r() ** 3 * 1.1, r()]; });
    const grains = Array.from({ length: 520 }, () => { const x = 300 + (r() - .5) * 600 * (.55 + r() * .45), y = 312 + 270 * r() ** .7; return [x, y, .22 + r() * .35]; });
    let spread = .5;
    return (g, c, t, s) => {
      const target = s.x == null ? .5 + .05 * Math.sin(t / 7) : .3 + .42 * (s.x / 600);
      spread = ease(s, spread, target, .06);
      const breath = .5 + .5 * Math.cos((t / 18) * TAU);
      const lines = Array.from({ length: 11 }, () => []), up = [], down = [];
      const growUp = (x, y, angle, length, level, id, reach) => {
        const f = Math.min(1, reach - level);
        if (f <= 0) return;
        const nx = x + length * f * Math.cos(angle), ny = y + length * f * Math.sin(angle);
        lines[level].push(x, y, nx, ny);
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
        // the rows bend into a bowl that answers the crown above
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
      // the background: stars above, fine grains below
      g.fillStyle = c.ink;
      for (let b = 0; b < 3; b++) {
        g.globalAlpha = [.22, .4, .7][b];
        g.beginPath();
        for (const [x, y, size, tw] of stars) if (Math.floor(tw * 2.999) === b) dot(g, x, y, size * (.8 + .2 * Math.sin(t * .7 + tw * 40)));
        g.fill();
      }
      g.globalAlpha = .3;
      g.beginPath();
      for (const [x, y, size] of grains) dot(g, x, y, size);
      g.fill();
      // the filaments of the large
      lines.forEach((list, level) => {
        if (!list.length) return;
        g.strokeStyle = c.mix(Math.min(1, level * .34));
        g.globalAlpha = .9 - level * .07;
        g.lineWidth = Math.max(.3, 2.1 * .76 ** level);
        g.beginPath();
        for (let i = 0; i < list.length; i += 4) { g.moveTo(list[i], list[i + 1]); g.lineTo(list[i + 2], list[i + 3]); }
        g.stroke();
      });
      // what blooms on them: stars near the root, clusters further, galaxies at the edge
      g.fillStyle = c.ink;
      const dots = [[], [], []];
      const add = (b, x, y, size) => dots[b].push(x, y, size);
      for (let i = 0; i < up.length; i += 5) {
        const x = up[i], y = up[i + 1], level = up[i + 2], id = up[i + 3], f = up[i + 4], k = kind[id];
        if (level < 3) continue;
        if (level < 6) {
          if (k < .1) continue;
          const cl = clusters[id % clusters.length], R = (1.6 + level * .9) * f;
          for (const [px, py, size] of cl) add(0, x + px * R, y + py * R, size * .8);
        } else if (level < UP) {
          add(2, x, y, .9 * f);
          if (k > .55) { const cl = clusters[(id >> 1) % clusters.length]; for (const [px, py, size] of cl) add(0, x + px * 4, y + py * 4, size * .7); }
        } else if (k > .45) {
          const tpl = galaxies[id % galaxies.length], R = (10 + 14 * (k - .45) / .55) * f;
          const rot = id * 1.7 + t * .025 * (id % 2 ? 1 : -1), tilt = id * .9, incl = .35 + .6 * Math.abs(Math.sin(id * 2.3));
          const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
          for (let j = 0; j < tpl.length; j += 3) {
            const px = tpl[j] * cr - tpl[j + 1] * sr, py = (tpl[j] * sr + tpl[j + 1] * cr) * incl;
            add(j < 78 ? 2 : 1, x + R * (px * ct - py * st), y + R * (px * st + py * ct), tpl[j + 2] * (.55 + R / 22));
          }
        } else add(2, x, y, 1.1 * f);
      }
      dots.forEach((list, b) => {
        g.globalAlpha = [.45, .7, .95][b];
        g.beginPath();
        for (let i = 0; i < list.length; i += 3) dot(g, list[i], list[i + 1], list[i + 2]);
        g.fill();
      });
      // the descent: each cell divides into smaller ones, down to molecules, atoms, grains
      const membranes = Array.from({ length: 4 }, () => []), cores = [], vessels = Array.from({ length: 4 }, () => []), specks = [];
      for (let i = 0; i < down.length; i += 9) {
        const x0 = down[i], y0 = down[i + 1], x1 = down[i + 2], y1 = down[i + 3], level = down[i + 4], id = down[i + 5], f = down[i + 6], R = down[i + 7], pr = down[i + 8];
        const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
        if (d > R + pr) vessels[Math.min(3, level >> 1)].push(x0 + dx / d * pr, y0 + dy / d * pr, x1 - dx / d * R, y1 - dy / d * R);
        if (level < 4) {
          membranes[Math.min(3, level)].push(x1, y1, R, level);
          if (level < 4) { cores.push(x1 + R * .18 * Math.cos(id), y1 + R * .18 * Math.sin(id), R * .36, R, id); }
        } else if (level < 5) {
          // a molecule: a few bonded atoms
          const n = 2 + (id % 3), a0 = id * 2.1 + t * .05;
          for (let j = 0; j < n; j++) {
            const a = a0 + (j * TAU) / n, q = j ? R * .55 : 0;
            membranes[3].push(x1 + q * Math.cos(a), y1 + q * Math.sin(a), R * (j ? .32 : .42), level);
          }
        } else if (level < 7) {
          // an atom: a nucleus and its orbits
          specks.push(x1, y1, .7 * f);
          const a0 = id * .7 + t * .04, Ro = Math.max(1.5, R * 1.1);
          for (let o = 0; o < 7 - level; o++) {
            const a = a0 + o * 1.3, ca = Math.cos(a), sa = Math.sin(a);
            for (let j = 0; j <= 14; j++) {
              const u = (j / 14) * TAU, px = Ro * Math.cos(u), py = Ro * .35 * Math.sin(u);
              const X = x1 + px * ca - py * sa, Y = y1 + px * sa + py * ca;
              membranes[3].push(X, Y, j ? -1 : -2, level);
            }
          }
        } else specks.push(x1, y1, (level < DOWN ? .45 : .35) * f);
      }
      vessels.forEach((list, b) => {
        g.strokeStyle = c.mix(Math.min(1, b * .5));
        g.globalAlpha = .85 - b * .12;
        g.lineWidth = Math.max(.3, 1.6 * .62 ** b);
        g.beginPath();
        for (let i = 0; i < list.length; i += 4) { g.moveTo(list[i], list[i + 1]); g.lineTo(list[i + 2], list[i + 3]); }
        g.stroke();
      });
      g.strokeStyle = c.ink;
      membranes.forEach((list, b) => {
        g.globalAlpha = [.95, .85, .75, .62][b];
        g.lineWidth = [1, .8, .6, .42][b];
        g.beginPath();
        for (let i = 0; i < list.length; i += 4) {
          const x = list[i], y = list[i + 1], R = list[i + 2];
          if (R === -2) g.moveTo(x, y); else if (R === -1) g.lineTo(x, y);
          else { g.moveTo(x + R, y); g.arc(x, y, R, 0, TAU); if (b < 2) { g.moveTo(x + R * .88, y); g.arc(x, y, R * .88, 0, TAU); } }
        }
        g.stroke();
      });
      // inside the large cells: a nucleus and its granules
      g.lineWidth = .5;
      g.globalAlpha = .8;
      g.beginPath();
      for (let i = 0; i < cores.length; i += 5) { const [x, y, R] = [cores[i], cores[i + 1], cores[i + 2]]; g.moveTo(x + R, y); g.arc(x, y, R, 0, TAU); }
      g.stroke();
      g.globalAlpha = .7;
      g.beginPath();
      for (let i = 0; i < cores.length; i += 5) {
        const x = cores[i], y = cores[i + 1], R = cores[i + 3], id = cores[i + 4];
        dot(g, x, y, Math.max(.6, cores[i + 2] * .3));
        const cx = x - R * .18 * Math.cos(id), cy = y - R * .18 * Math.sin(id);
        for (const [px, py, k] of granules) {
          const gx = cx + px * R, gy = cy + py * R;
          if (Math.hypot(gx - x, gy - y) > cores[i + 2] * 1.15) dot(g, gx, gy, .35 + k * .45 * R / 18);
        }
      }
      for (let i = 0; i < specks.length; i += 3) dot(g, specks[i], specks[i + 1], specks[i + 2]);
      g.fill();
      g.globalAlpha = 1;
      g.fillStyle = g.strokeStyle = c.ink;
      point(g, c, 300, 300, 6.5, 44);
      label(g, c, labels.large, 300, 18, 'center', 17);
      label(g, c, labels.small, 300, 594, 'center', 17);
    };
  },

  // Everything and nothing: a winding frontier keeps turning, and follows the pointer.
  void(labels) {
    const golden = Math.PI * (3 - Math.sqrt(5)), N = 7000, r = rng(3);
    const items = Array.from({ length: N }, (_, i) => { const q = 236 * Math.sqrt((i + .5) / N), a = i * golden; return [q * Math.cos(a), q * Math.sin(a), r() * .75 + .42, r()]; });
    let angle = 0.5;
    return (g, c, t, s) => {
      const target = s.x == null ? .5 + t * .11 : Math.atan2(s.y - 300, s.x - 300);
      angle = s.snap ? target : angle + Math.atan2(Math.sin(target - angle), Math.cos(target - angle)) * .05;
      const nx = Math.cos(angle), ny = Math.sin(angle);
      const buckets = [[], [], [], [], [], []];
      for (const [x, y, size, jitter] of items) {
        const u = x * ny - y * nx, v = x * nx + y * ny;
        const edge = v - 62 * Math.sin((u / 236) * Math.PI);
        const alpha = smooth(-5 - jitter * 26, 26, edge);
        if (alpha < .04) continue;
        buckets[Math.min(5, Math.floor(alpha * 6))].push(300 + x, 300 + y, size);
      }
      buckets.forEach((list, i) => {
        g.globalAlpha = (i + 1) / 6;
        g.beginPath();
        for (let k = 0; k < list.length; k += 3) dot(g, list[k], list[k + 1], list[k + 2]);
        g.fill();
      });
      g.globalAlpha = 1;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(300, 300, 244, 0, TAU);
      g.stroke();
      point(g, c, 300, 300, 7, 42);
      label(g, c, labels.everything, 300 + nx * 272, 306 + ny * 272, 'center', 18);
      label(g, c, labels.nothing, 300 - nx * 272, 306 - ny * 272, 'center', 18);
    };
  },

  // An endless zoom: every circle turns out to hold seven smaller ones.
  nested() {
    const OFF = Array.from({ length: 6 }, (_, i) => [Math.cos((i * TAU) / 6), Math.sin((i * TAU) / 6)]);
    return (g, c, t) => {
      const u = ((t + 3.2) / 13) % 1, zoom = 3 ** u;
      const levels = new Map();
      const visit = (x, y, R, depth) => {
        if (x + R < -4 || x - R > 604 || y + R < -4 || y - R > 604) return;
        const alpha = smooth(3.7, 16, R) * (1 - smooth(290, 820, R));
        if (alpha > .02) {
          const key = Math.round(Math.log(R) * 4);
          if (!levels.has(key)) levels.set(key, { R, alpha, list: [] });
          levels.get(key).list.push(x, y, R);
        }
        if (depth === 0) return;
        const child = R / 3;
        visit(x, y, child, depth - 1);
        for (const [ox, oy] of OFF) visit(x + ox * child * 2, y + oy * child * 2, child, depth - 1);
      };
      visit(300, 300, 288 * zoom, 5);
      for (const { R, alpha, list } of levels.values()) {
        g.strokeStyle = c.mix(clamp(R / 40));
        g.globalAlpha = alpha;
        g.lineWidth = clamp(.32 + R / 130, .32, 1.35);
        g.beginPath();
        for (let i = 0; i < list.length; i += 3) dot(g, list[i], list[i + 1], list[i + 2]);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, 300, 300, 5.5, 34);
    };
  },

  // Each life traces its own figure: no two alike, and more than can be counted.
  lives(labels, options) {
    const steps = [25, 100, 1000, 10000, 100000, Infinity];
    const R = rng(25);
    const seeds = Array.from({ length: 169 }, () => ({ a: 1 + Math.floor(R() * 4), b: 2 + Math.floor(R() * 5), p: R() * TAU, s: R() * .45 + .3 }));
    let side = 5, gridSide = 0, dist = null;
    return (g, c, t, s) => {
      const count = steps[options.step()];
      side = ease(s, side, count === Infinity ? 600 : Math.sqrt(count), .09);
      const n = Math.round(side) | 1, cell = 600 / n, mid = (n - 1) / 2;
      if (n >= 400) { g.globalAlpha = smooth(400, 560, side); g.fillRect(0, 0, 600, 600); g.globalAlpha = 1; }
      else if (n > 13) {
        const size = Math.max(.6, cell * (n > 60 ? .55 : .36));
        if (n !== gridSide) {
          gridSide = n;
          dist = new Float64Array(n * n);
          for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dist[y * n + x] = Math.hypot(x - mid, y - mid) * cell / 62;
        }
        // One pass sorts every cell into its brightness band, then each band is filled once.
        const bands = [[], [], [], []], phase = t * 1.25, half = size / 2;
        for (let i = 0; i < n * n; i++) bands[Math.floor((.5 + .5 * Math.cos(dist[i] - phase)) * 3.99)].push(i);
        for (let b = 0; b < 4; b++) {
          g.globalAlpha = .4 + b * .2;
          g.beginPath();
          for (const i of bands[b]) g.rect((i % n + .5) * cell - half, (Math.floor(i / n) + .5) * cell - half, size, size);
          g.fill();
        }
        g.globalAlpha = 1;
      } else {
        g.lineJoin = g.lineCap = 'round';
        g.lineWidth = n <= 5 ? .85 : .55;
        g.globalAlpha = n <= 5 ? .16 : .08;
        g.beginPath();
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.moveTo(300, 300); g.lineTo((x + .5) * cell, (y + .5) * cell); }
        g.stroke();
        g.globalAlpha = 1;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          if (x === mid && y === mid) continue;
          const seed = seeds[(y * n + x) % seeds.length], radius = cell * .4;
          const px = (x + .5) * cell, py = (y + .5) * cell;
          g.beginPath();
          for (let i = 0; i <= 150; i++) {
            const a = (i / 150) * TAU;
            const lx = px + radius * Math.sin(seed.a * a + seed.p + t * seed.s * .35);
            const ly = py + radius * Math.sin(seed.b * a + t * seed.s * .2);
            if (i) g.lineTo(lx, ly); else g.moveTo(lx, ly);
          }
          g.stroke();
        }
      }
      point(g, c, 300, 300, Math.max(4.5, Math.min(cell * .17, 15)), Math.max(14, cell * .42));
      if (n <= 7) label(g, c, labels.you, 300, 300 + cell * .17 + 27, 'center', 17);
    };
  },

  // An open book seen from above: the reader moves page after page, all the pages stay there.
  time(labels) {
    const N = 73;
    const curve = (i, spine = [300, 528]) => {
      const a = (-171 + (i * 162) / (N - 1)) * Math.PI / 180;
      const pts = [];
      const reach = 318 - 36 * Math.abs(Math.cos(a)) ** 3;
      const tip = [spine[0] + reach * Math.cos(a) * 1.0, spine[1] + reach * Math.sin(a) * 1.42];
      const side = Math.cos(a);
      const control = [spine[0] + reach * .86 * Math.cos(a) + side * 16, spine[1] + reach * .25 * Math.sin(a)];
      for (let k = 0; k <= 22; k++) {
        const u = k / 22, v = 1 - u;
        pts.push([v * v * spine[0] + 2 * u * v * control[0] + u * u * tip[0], v * v * spine[1] + 2 * u * v * control[1] + u * u * tip[1]]);
      }
      return pts;
    };
    const pages = Array.from({ length: N }, (_, i) => curve(i));
    let head = (N - 1) * .72;
    return (g, c, t, s) => {
      const mid = (N - 1) / 2;
      const goal = s.x == null ? mid + mid * Math.sin(t / 7.5) : clamp(s.x / 600) * (N - 1);
      head = ease(s, head, goal, .05);
      g.lineCap = g.lineJoin = 'round';
      pages.forEach((page, i) => {
        const near = Math.max(0, 1 - Math.abs(i - head) / 7), board = i === 0 || i === N - 1;
        g.globalAlpha = board ? 1 : .34 + .66 * near * near;
        g.lineWidth = board ? 1.7 : .6 + near * .5;
        g.beginPath();
        page.forEach(([x, y], k) => { if (k) g.lineTo(x, y); else g.moveTo(x, y); });
        g.stroke();
      });
      g.globalAlpha = 1;
      const page = curve(head);
      g.strokeStyle = c.mark;
      g.lineWidth = 2.3;
      g.beginPath();
      page.forEach(([x, y], k) => { if (k) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
      g.strokeStyle = c.ink;
      const [hx, hy] = page[page.length - 1];
      point(g, c, hx, hy, 5.5, 30);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(26, 528); g.lineTo(574, 528); g.stroke();
      g.beginPath(); g.arc(300, 528, 5, 0, TAU); g.fill();
      label(g, c, labels.past, 34, 566, 'left', 18);
      label(g, c, labels.future, 566, 566, 'right', 18);
    };
  },

  // A galaxy of worlds, each with its own orbits and inhabitants.
  worlds() {
    const r = rng(11), golden = Math.PI * (3 - Math.sqrt(5));
    const items = [];
    for (let i = 1; i < 240; i++) {
      const d = 18.6 * Math.sqrt(i), size = 2.2 + 13 * (i / 240) ** .85 * (r() * .7 + .35);
      if (d + size > 294) continue;
      const orbits = Array.from({ length: Math.ceil(size / 4.2) }, (_, k) => ({ radius: size * (k + 1) / (Math.ceil(size / 4.2) + .35), a: r() * TAU, v: (r() * 1.2 + .3) * (r() < .5 ? -1 : 1), planets: 1 + Math.floor(r() * 3) }));
      items.push({ d, a: i * golden, size, orbits, speed: 2.7 / d, tone: r() });
    }
    return (g, c, t) => {
      const place = (w) => { const a = w.a + t * w.speed; return [300 + w.d * Math.cos(a), 300 + w.d * Math.sin(a)]; };
      g.lineWidth = .4;
      g.globalAlpha = .17;
      g.beginPath();
      for (const w of items) { const [x, y] = place(w); g.moveTo(300, 300); g.lineTo(x, y); }
      g.stroke();
      g.globalAlpha = 1;
      for (const w of items) {
        const [x, y] = place(w);
        g.strokeStyle = g.fillStyle = c.mix(clamp(w.d / 120 + w.tone * .25));
        g.lineWidth = .36;
        g.beginPath();
        for (const orbit of w.orbits) { g.moveTo(x + orbit.radius, y); g.arc(x, y, orbit.radius, 0, TAU); }
        g.stroke();
        g.beginPath();
        dot(g, x, y, Math.max(.6, w.size * .09));
        for (const orbit of w.orbits) for (let p = 0; p < orbit.planets; p++) {
          const a = orbit.a + (p * TAU) / orbit.planets + t * orbit.v * .45;
          dot(g, x + orbit.radius * Math.cos(a), y + orbit.radius * Math.sin(a), .72);
        }
        g.fill();
      }
      g.strokeStyle = g.fillStyle = c.ink;
      point(g, c, 300, 300, 6.5, 40);
    };
  },

  // The same space: mapped perfectly from outside, walked through from inside.
  knowing(labels) {
    const at = (t) => {
      const x = .55 * Math.sin(t * .83 + 1) + .3 * Math.sin(t * 2.17) + .15 * Math.sin(t * 5.3 + 2);
      const y = .55 * Math.sin(t * 1.09) + .3 * Math.sin(t * 1.93 + 2) + .15 * Math.sin(t * 4.7);
      return [448 + 126 * x, 285 + 126 * y];
    };
    return (g, c, t) => {
      const R = 132, x0 = 152, y0 = 285;
      g.lineCap = g.lineJoin = 'round';
      g.lineWidth = 1.1;
      g.beginPath(); g.arc(x0, y0, R, 0, TAU); g.moveTo(448 + R, y0); g.arc(448, y0, R, 0, TAU); g.stroke();
      // knowledge: a precise diagram
      g.lineWidth = .4;
      g.beginPath();
      for (let i = 1; i <= 6; i++) { const r = (R * i) / 7; g.moveTo(x0 + r, y0); g.arc(x0, y0, r, 0, TAU); }
      for (let i = 0; i < 36; i++) {
        const a = (i * TAU) / 36, inner = i % 6 === 0 ? 0 : i % 3 === 0 ? R * 2 / 7 : R * 4 / 7;
        g.moveTo(x0 + inner * Math.cos(a), y0 + inner * Math.sin(a));
        g.lineTo(x0 + R * Math.cos(a), y0 + R * Math.sin(a));
      }
      g.stroke();
      g.beginPath();
      const scan = t * .32;
      g.moveTo(x0, y0); g.lineTo(x0 + R * Math.cos(scan), y0 + R * Math.sin(scan));
      g.lineWidth = .9;
      g.stroke();
      // life: a trace, thick with time
      const now = t * .55, span = 90, bands = 10, pts = 170;
      for (let b = 0; b < bands; b++) {
        const k = b / (bands - 1);
        g.strokeStyle = c.mix(1 - k ** 3);
        g.globalAlpha = .25 + k * .75;
        g.lineWidth = .35 + k * k * .85;
        g.beginPath();
        for (let i = 0; i <= pts; i++) {
          const [x, y] = at(now - span + (span / bands) * (b + i / pts));
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      const [hx, hy] = at(now);
      point(g, c, hx, hy, 5.5, 28);
      label(g, c, labels.knowing, x0, 458, 'center', 19);
      label(g, c, labels.living, 448, 458, 'center', 19);
    };
  },

  // A balance that never settles, with a scale that records the slightest shift. A click weighs on it.
  balance() {
    const r = rng(7);
    const heap = () => Array.from({ length: 150 }, () => { const u = r() * 2 - 1, top = 44 * (1 - u * u); return [u * 62, r() ** 1.4 * top, r() * 1.1 + .75]; });
    const pans = [heap(), heap()];
    let impulse = 0, lastClock = 0;
    return (g, c, t, s) => {
      if (s.click) { impulse += s.click[0] < 300 ? -.1 : .1; s.click = null; }
      impulse *= Math.exp(-Math.max(0, t - lastClock) * .9);
      lastClock = t;
      const tilt = .08 * Math.sin(t * .37) + .05 * Math.sin(t * .83 + 1) + impulse * Math.cos(t * 1.4);
      const px = 300, py = 196;
      g.lineCap = 'round';
      // graduated arc
      g.lineWidth = .4;
      g.beginPath();
      for (let i = -60; i <= 60; i++) {
        const a = -Math.PI / 2 + i * .0132, long = i % 10 === 0 ? 17 : i % 5 === 0 ? 11 : 6;
        g.moveTo(px + 150 * Math.cos(a), py + 150 * Math.sin(a));
        g.lineTo(px + (150 + long) * Math.cos(a), py + (150 + long) * Math.sin(a));
      }
      g.moveTo(px + 150 * Math.cos(-Math.PI / 2 - .8), py + 150 * Math.sin(-Math.PI / 2 - .8));
      g.arc(px, py, 150, -Math.PI / 2 - .8, -Math.PI / 2 + .8);
      g.stroke();
      const needle = -Math.PI / 2 + tilt * 4;
      g.strokeStyle = c.mark;
      g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px + 166 * Math.cos(needle), py + 166 * Math.sin(needle)); g.stroke();
      g.strokeStyle = c.ink;
      // column and base
      g.lineWidth = .9;
      g.beginPath();
      g.moveTo(px - 3, py); g.lineTo(px - 5, 540); g.moveTo(px + 3, py); g.lineTo(px + 5, 540);
      for (const [w, y] of [[28, 540], [52, 548], [78, 556]]) { g.moveTo(px - w, y); g.lineTo(px + w, y); }
      g.stroke();
      const ends = [-1, 1].map((side) => [px + side * 215 * Math.cos(tilt), py + side * 215 * Math.sin(tilt)]);
      // beam, tapered
      g.lineWidth = 1;
      g.beginPath();
      for (const [ex, ey] of ends) {
        g.moveTo(px, py - 6); g.lineTo(ex, ey);
        g.moveTo(px, py + 6); g.lineTo(ex, ey);
      }
      g.stroke();
      ends.forEach(([x, y], side) => {
        const bowl = y + 158, sway = Math.sin(t * 1.1 + side) * 2 - tilt * 22;
        g.lineWidth = .5;
        g.beginPath();
        for (const f of [-1, -.35, .35, 1]) { g.moveTo(x, y); g.lineTo(x + sway + f * 72, bowl); }
        g.stroke();
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x + sway - 72, bowl);
        for (let i = 1; i <= 24; i++) { const u = i / 12 - 1; g.lineTo(x + sway + u * 72, bowl + 15 * (1 - u * u)); }
        g.lineTo(x + sway - 72, bowl);
        g.stroke();
        const heapCount = Math.round(95 + 55 * Math.sin(t * .37 * (side ? -1 : 1) + side));
        g.fillStyle = side ? c.ink : c.mix(.25);
        g.beginPath();
        for (const [dx, rise, size] of pans[side].slice(0, heapCount)) dot(g, x + sway + dx, bowl + 2 - rise, size);
        g.fill();
        g.fillStyle = c.ink;
      });
      point(g, c, px, py, 7, 36);
    };
  },

  // Whatever happens at one point crosses the whole fabric. A click adds a pulse.
  field() {
    const N = 41, step = 600 / (N - 1), PERIOD = 4.4;
    const clicks = [];
    const seedAt = (k) => { const r = rng(k * 91 + 5); r(); return [90 + r() * 420, 90 + r() * 420]; };
    return (g, c, t, s) => {
      if (s.click) { clicks.push({ x: s.click[0], y: s.click[1], at: t }); s.click = null; if (clicks.length > 3) clicks.shift(); }
      const k = Math.floor(t / PERIOD);
      const pulses = [...clicks];
      for (let j = k - 2; j <= k; j++) { const [x, y] = seedAt(j); pulses.push({ x, y, at: j * PERIOD }); }
      const move = (x0, y0) => {
        let x = x0, y = y0, energy = 0;
        for (const p of pulses) {
          const age = t - p.at, d = Math.hypot(x0 - p.x, y0 - p.y) || 1, front = age * 92;
          const wave = Math.exp(-(((d - front) / 70) ** 2)) * Math.sin((d - front) / 15) * Math.exp(-age / 6.5);
          x += ((x0 - p.x) / d) * wave * 22;
          y += ((y0 - p.y) / d) * wave * 22;
          energy += Math.abs(wave);
        }
        return [x, y, energy];
      };
      const grid = [];
      for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) grid.push(move(col * step, row * step));
      const buckets = Array.from({ length: 6 }, () => []);
      const add = (a, b) => {
        const energy = clamp((a[2] + b[2]) * .85);
        buckets[Math.round((1 - energy) * 5)].push(a[0], a[1], b[0], b[1]);
      };
      for (let row = 0; row < N; row++) for (let col = 0; col < N; col++) {
        const a = grid[row * N + col];
        if (col < N - 1) add(a, grid[row * N + col + 1]);
        if (row < N - 1) add(a, grid[(row + 1) * N + col]);
      }
      g.lineCap = 'round';
      g.globalAlpha = .9;
      strokeBuckets(g, c, buckets, .62);
      g.globalAlpha = 1;
      const [lx, ly] = seedAt(k);
      point(g, c, lx, ly, 3.5 + 5 * Math.exp(-(t - k * PERIOD) * .75), 34);
    };
  },

  // A drop falls into a surface that keeps the memory of it.
  drop() {
    const PERIOD = 8, ROWS = 58, COLS = 110, HORIZON = 288;
    const surface = (nx, z, t) => {
      let height = 0;
      const k = Math.floor(t / PERIOD);
      for (let j = k; j >= k - 2; j--) {
        const age = t - (j + .3) * PERIOD;
        if (age < 0) continue;
        const d = Math.hypot(nx, (z - .42) * 1.55);
        const front = age * .16;
        height += Math.exp(-(((d - front) / .3) ** 2)) * Math.sin((d - front) * 30) * Math.exp(-age / 11);
      }
      return height + .05 * Math.sin(nx * 4 + z * 8 + t * .35);
    };
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      for (let row = 0; row < ROWS; row++) {
        const z = row / (ROWS - 1), persp = .2 + .8 * z ** 1.25;
        const yBase = HORIZON + 292 * z ** 1.55;
        const near = 1 - Math.abs(z - .42) * 1.4;
        g.strokeStyle = c.mix(clamp(1 - Math.max(0, near) ** 5 * .6));
        g.globalAlpha = smooth(0, .3, z) * (.3 + .7 * z ** .6);
        g.lineWidth = .35 + z * .5;
        g.beginPath();
        for (let col = 0; col <= COLS; col++) {
          const nx = (col / COLS) * 2 - 1;
          const x = 300 + nx * 300 * (.86 + persp * .4);
          const y = yBase - surface(nx, z, t) * 58 * persp;
          if (col) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      const impactY = HORIZON + 292 * .42 ** 1.55;
      const u = (t % PERIOD) / PERIOD;
      if (u < .3) {
        const f = u / .3, y = 40 + (impactY - 40) * f * f, size = .4 + .15 * f;
        g.strokeStyle = c.mark;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(300, y - 150 * size);
        g.arc(300, y, 42 * size, -Math.PI / 2 + .72, Math.PI * 1.5 - .72);
        g.closePath();
        g.stroke();
        g.lineWidth = .5;
        g.globalAlpha = .5;
        g.beginPath(); g.moveTo(300, 20); g.lineTo(300, y - 150 * size); g.stroke();
        g.globalAlpha = 1;
      }
      g.strokeStyle = c.ink;
      point(g, c, 300, impactY, 3 + 3.5 * Math.exp(-Math.max(0, u - .3) * 7), 30);
    };
  },

  // Two lives in a ribbon that never ends: they separate, change form, and stay tied.
  forms() {
    const LINES = 42, PTS = 280;
    return (g, c, t) => {
      const at = (u, k) => {
        const freq = 1.2 + 15 * u ** 2.15;
        const amp = 118 * (1 - u) ** 1.05 + 19 + 30 * Math.sin(u * 6.3 + t * .22);
        const twist = Math.sin(TAU * u * 1.5 + t * .3 + k * 1.7);
        return [10 + u * 580, 300 + amp * Math.sin(TAU * freq * u + k * 2.4 * (1 - u * .35) - t * .75) * (.55 + .45 * twist)];
      };
      const line = (k) => {
        g.beginPath();
        for (let i = 0; i <= PTS; i++) { const [x, y] = at(i / PTS, k); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      };
      g.lineCap = g.lineJoin = 'round';
      for (let j = LINES - 1; j > 0; j--) {
        const k = j / (LINES - 1);
        g.strokeStyle = c.mix(clamp(.15 + k * 1.2));
        g.globalAlpha = .18 + .42 * (1 - k);
        g.lineWidth = .42;
        line(k);
      }
      // the tie between the two lives
      const other = .62 + .2 * Math.sin(t * .17);
      g.strokeStyle = c.mark;
      g.globalAlpha = .75;
      g.lineWidth = .55;
      g.beginPath();
      for (let i = 0; i <= 58; i++) {
        const u = i / 58, a = at(u, 0), b = at(u, other);
        g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
      }
      g.stroke();
      g.globalAlpha = 1;
      g.lineWidth = 1.8;
      line(0);
      g.strokeStyle = c.mix(.3);
      g.lineWidth = 1.5;
      line(other);
      g.strokeStyle = c.ink;
      // the life itself, travelling from one form to the next
      const [px, py] = at(.5 + .38 * Math.sin(t * .11), 0);
      point(g, c, px, py, 5, 26);
    };
  },

  // What one life gives branches out beyond what it can follow.
  useful() {
    const r = rng(42), segments = [];
    const grow = (x, y, angle, length, depth, start) => {
      if (depth === 0) return;
      for (let n = depth > 4 ? 3 : 2; n > 0; n--) {
        const a = angle + (r() * 1.3 - .65);
        const steps = 4, pts = [[x, y]];
        let cx = x, cy = y, ca = a;
        for (let i = 0; i < steps; i++) {
          ca += (r() - .5) * .34;
          cx += (length / steps) * Math.cos(ca);
          cy += (length / steps) * Math.sin(ca);
          pts.push([cx, cy]);
        }
        const inside = Math.hypot(cx - 300, cy - 300) < 293;
        if (!inside) continue;
        const end = start + .125 + r() * .03;
        segments.push({ pts, depth, start, end });
        grow(cx, cy, ca, length * (r() * .12 + .71), depth - 1, end);
      }
    };
    for (let k = 0; k < 6; k++) grow(300, 300, (k * TAU) / 6 + .3, 74, 7, 0);
    const longest = Math.max(...segments.map((s) => s.end));
    const byDepth = Array.from({ length: 8 }, () => []);
    for (const s of segments) byDepth[s.depth].push(s);
    return (g, c, t) => {
      const u = (t / 18) % 1;
      const p = Math.min(1, u / .66) * longest;
      const fade = 1 - smooth(.88, 1, u);
      g.lineCap = 'butt';
      g.lineJoin = 'bevel';
      g.globalAlpha = fade;
      for (let depth = 7; depth >= 1; depth--) {
        g.strokeStyle = g.fillStyle = c.mix(clamp(1.05 - depth / 6));
        g.lineWidth = .28 + depth * .19;
        g.beginPath();
        const tips = [];
        let pending = 0;
        for (const s of byDepth[depth]) {
          const f = clamp((p - s.start) / (s.end - s.start));
          if (!f) continue;
          const reach = f * (s.pts.length - 1), whole = Math.floor(reach);
          g.moveTo(s.pts[0][0], s.pts[0][1]);
          for (let i = 1; i <= whole; i++) g.lineTo(s.pts[i][0], s.pts[i][1]);
          if (whole < s.pts.length - 1) {
            const a = s.pts[whole], n = s.pts[whole + 1], rest = reach - whole;
            g.lineTo(a[0] + (n[0] - a[0]) * rest, a[1] + (n[1] - a[1]) * rest);
          } else if (depth === 1) tips.push(s.pts[whole]);
          // Short paths stroke much faster than one very long one.
          if (++pending === 40) { g.stroke(); g.beginPath(); pending = 0; }
        }
        g.stroke();
        if (tips.length) {
          g.beginPath();
          for (const [x, y] of tips) dot(g, x, y, 1.25);
          g.fill();
        }
      }
      g.globalAlpha = 1;
      g.strokeStyle = g.fillStyle = c.ink;
      point(g, c, 300, 300, 7 + 1.5 * Math.sin(t), 40);
    };
  },

  // A labyrinth of circles whose openings almost align, without ever quite doing so.
  why() {
    const RINGS = 19;
    return (g, c, t) => {
      g.lineCap = 'round';
      for (let i = 0; i < RINGS; i++) {
        const k = i / (RINGS - 1), radius = 25 + k * 262;
        const direction = i % 2 ? 1 : -1;
        const angle = -Math.PI / 2 + .1 * Math.sin(t * .13 + i * .7) + direction * (.11 + (1 - k) * .3) * Math.sin(t * .19 + i * 1.1) + i * .1;
        const gap = .08 + 9 / radius;
        g.strokeStyle = c.mix(clamp(k * 3));
        g.lineWidth = 1.45 - k * .8;
        g.beginPath();
        g.arc(300, 300, radius, angle + gap, angle - gap + TAU);
        g.stroke();
      }
      g.strokeStyle = c.ink;
      point(g, c, 300, 300, 7, 26);
    };
  },

  // A river followed back to its source: every channel meets at one point, and what flows goes back up.
  river() {
    const r = rng(41), N = 46, TOP = 70, LEN = 470;
    const channels = Array.from({ length: N }, (_, i) => {
      const side = ((i + .5) / N) * 2 - 1;
      return { side: side + (r() - .5) * .04, phase: r() * TAU, wave: 30 + r() * 26, speed: .05 + r() * .05, offset: r() };
    });
    const at = (ch, u) => {
      const spread = 262 * u ** 1.55, meander = 15 * Math.sin(u * LEN / ch.wave + ch.phase) * u;
      return [300 + ch.side * spread + meander, TOP + u * LEN];
    };
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      for (const ch of channels) {
        const near = 1 - Math.abs(ch.side);
        g.strokeStyle = c.mix(1 - near ** 2.2);
        g.globalAlpha = .3 + .5 * near;
        g.lineWidth = .45 + .9 * near;
        g.beginPath();
        for (let k = 0; k <= 80; k++) { const [x, y] = at(ch, k / 80); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      // what flows goes back up toward the point
      g.globalAlpha = .85;
      g.fillStyle = c.ink;
      g.beginPath();
      for (const ch of channels) for (let k = 0; k < 3; k++) {
        const u = 1 - ((t * ch.speed + ch.offset + k / 3) % 1);
        const [x, y] = at(ch, u);
        dot(g, x, y, .6 + 1.4 * u);
      }
      g.fill();
      g.globalAlpha = 1;
      point(g, c, 300, TOP, 7, 40);
    };
  },

  // Lives drawn one after another: each starts without the memory of the others, yet none is erased.
  forgetting() {
    const PERIOD = 14, KEEP = 9, PTS = 260;
    const shape = (j) => {
      const m = (v, n) => ((v % n) + n) % n;
      return { a: 1 + m(j * 7, 4), b: 2 + m(j * 5, 5), p: m(j * 1.7, TAU), q: .72 + .2 * Math.sin(j * 2.3) };
    };
    const at = (s, u) => [300 + 205 * s.q * Math.sin(s.a * u * TAU + s.p), 300 + 205 * Math.sin(s.b * u * TAU)];
    const trace = (g, s, end) => {
      g.beginPath();
      const n = Math.max(1, Math.round(PTS * end));
      for (let i = 0; i <= n; i++) { const [x, y] = at(s, (i / PTS)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    };
    return (g, c, t) => {
      const now = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      g.lineWidth = .5;
      for (let j = now - KEEP; j < now; j++) {
        g.globalAlpha = .1 + .24 * (1 - (now - j) / KEEP);
        trace(g, shape(j), 1);
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.mark;
      g.lineWidth = 1.5;
      const s = shape(now);
      trace(g, s, u);
      g.strokeStyle = c.ink;
      const [hx, hy] = at(s, Math.round(PTS * u) / PTS);
      point(g, c, hx, hy, 5.5, 28);
    };
  },

  // A part of the whole comes loose and, little by little, draws a shape of its own.
  birth() {
    const r = rng(5), golden = Math.PI * (3 - Math.sqrt(5)), N = 1500, MX = 205, MY = 300, R = 112, PERIOD = 30, PTS = 460, BANDS = 10;
    const mass = Array.from({ length: N }, (_, i) => { const q = R * ((i + .5) / N) ** .5, a = i * golden; return [q * Math.cos(a), q * Math.sin(a), r() * .5 + .45, r() * TAU]; });
    const life = (k) => {
      const m = rng(k * 7 + 3); m();
      const b = (m() - .5) * 1.1;
      return { ox: MX + 232 * Math.cos(b), oy: MY + 232 * Math.sin(b), lobes: 3 + Math.floor(m() * 3), p: m() * TAU, dir: m() < .5 ? -1 : 1 };
    };
    const at = (L, s) => {
      const go = smooth(0, .42, s), a = L.dir * s * TAU * 4.5 + L.p;
      const k = (6 + 64 * smooth(.02, .5, s)) * (1 + .36 * smooth(.3, .95, s) * Math.cos(L.lobes * a));
      return [MX + (L.ox - MX) * go + k * Math.cos(a), MY + (L.oy - MY) * go + k * Math.sin(a)];
    };
    const trace = (g, L, s0, s1, n) => {
      for (let i = 0; i <= n; i++) { const [x, y] = at(L, s0 + ((s1 - s0) * i) / n); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    };
    return (g, c, t) => {
      const k = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD, L = life(k);
      const [px, py] = at(L, u);
      // the whole it comes from, slightly drawn toward the part that leaves
      const breath = 1 + .03 * Math.sin(t * .45);
      const pull = 1 - smooth(.1, .5, u);
      g.fillStyle = c.ink;
      g.globalAlpha = .62;
      g.beginPath();
      for (const [dx, dy, size, w] of mass) {
        let x = MX + dx * breath + .8 * Math.sin(t * .7 + w), y = MY + dy * breath + .8 * Math.cos(t * .6 + w);
        const ex = px - x, ey = py - y, d2 = ex * ex + ey * ey;
        const f = 22 * pull * Math.exp(-d2 / 2600);
        if (f > .05) { const d = Math.sqrt(d2) || 1; x += (ex / d) * f; y += (ey / d) * f; }
        dot(g, x, y, size);
      }
      g.fill();
      // the shape left by the previous life fades as the next one begins
      g.lineCap = g.lineJoin = 'round';
      const ghost = .16 * (1 - smooth(0, .45, u));
      if (ghost > .005) {
        g.strokeStyle = c.ink; g.globalAlpha = ghost; g.lineWidth = .5;
        g.beginPath(); trace(g, life(k - 1), .4, 1, 260); g.stroke();
      }
      // its own trajectory, older parts in ink, the newest in the mark
      const fade = 1 - .8 * smooth(.9, 1, u), n = Math.max(BANDS, Math.round(PTS * u));
      for (let b = 0; b < BANDS; b++) {
        const kk = b / (BANDS - 1), s0 = (u * b) / BANDS, s1 = (u * (b + 1)) / BANDS;
        g.strokeStyle = c.mix(1 - kk ** 4);
        g.globalAlpha = (.3 + .65 * kk) * fade;
        g.lineWidth = .45 + kk * kk * 1.1;
        g.beginPath(); trace(g, L, s0, s1, Math.ceil(n / BANDS)); g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, px, py, 1.5 + 4 * smooth(0, .06, u) * (1 - .6 * smooth(.92, 1, u)), 30);
    };
  },

  // Other living forms around the same centre, each growing and breathing at its own pace.
  kin() {
    const r = rng(9), RING = 178;
    const poly = (g, M, pts) => { pts.forEach(([x, y], i) => { const [X, Y] = M(x, y); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); };
    // a shell: a logarithmic spiral and its chambers
    const spiral = Array.from({ length: 160 }, (_, i) => { const a = (i / 159) * TAU * 3.1, q = 2.6 * Math.exp(.17 * a); return [q * Math.cos(a), q * Math.sin(a)]; });
    const septa = [];
    for (let a = TAU * 1.1; a <= TAU * 3.1; a += .42) {
      const q0 = 2.6 * Math.exp(.17 * (a - TAU)), q1 = 2.6 * Math.exp(.17 * a), bend = .25;
      septa.push(Array.from({ length: 6 }, (_, j) => { const v = j / 5, q = q0 + (q1 - q0) * v, b = a - bend * Math.sin(v * Math.PI); return [q * Math.cos(b), q * Math.sin(b)]; }));
    }
    // a plant: branches from one stem
    const branches = [];
    const grow = (x, y, a, len, depth) => {
      if (depth === 0) return;
      const nx = x + len * Math.cos(a), ny = y + len * Math.sin(a);
      branches.push([x, y, nx, ny, depth]);
      grow(nx, ny, a - .42 - r() * .2, len * (.68 + r() * .1), depth - 1);
      grow(nx, ny, a + .38 + r() * .2, len * (.68 + r() * .1), depth - 1);
    };
    grow(-62, 0, 0, 30, 7);
    // a cluster of cells
    const golden = Math.PI * (3 - Math.sqrt(5));
    const cells = Array.from({ length: 38 }, (_, i) => { const q = 9.5 * Math.sqrt(i + .3), a = i * golden; return [q * Math.cos(a), q * Math.sin(a), 4.6 + r() * 2.2, r() * TAU]; });
    // a wing: feathers fanning from one joint
    const feathers = Array.from({ length: 30 }, (_, i) => {
      const k = i / 29, a = -1.15 + k * 1.5, len = 54 + 58 * Math.sin(k * Math.PI * .92) ** .8;
      return Array.from({ length: 9 }, (_, j) => { const v = j / 8, b = a + .35 * v * v; return [-58 + len * v * Math.cos(b), 30 + len * v * Math.sin(b) * 1.05]; });
    });
    // a radiolarian: a ring with spines
    const spines = Array.from({ length: 64 }, (_, i) => [(i / 64) * TAU, 40 + (i % 2 ? 6 : 16) + r() * 10]);
    const forms = [
      (g, M, t) => { g.beginPath(); poly(g, M, spiral); for (const s of septa) poly(g, M, s); g.stroke(); },
      (g, M, t) => {
        g.beginPath();
        const sway = .05 * Math.sin(t * .55);
        for (const [x0, y0, x1, y1, d] of branches) {
          const A = M(x0, y0 + (sway * (x0 + 62) ** 2) / 60), B = M(x1, y1 + (sway * (x1 + 62) ** 2) / 60);
          g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
        }
        g.stroke();
      },
      (g, M, t, s) => {
        g.beginPath();
        for (const [x, y, rad, p] of cells) { const [X, Y] = M(x, y), q = rad * s * (1 + .12 * Math.sin(t * .9 + p)); dot(g, X, Y, q); dot(g, X, Y, q * .3); }
        g.stroke();
      },
      (g, M, t) => {
        const flap = .9 + .1 * Math.sin(t * .8);
        g.beginPath();
        for (const f of feathers) poly(g, M, f.map(([x, y]) => [-58 + (x + 58) * flap, 30 + (y - 30) * (2 - flap)]));
        g.stroke();
      },
      (g, M, t) => {
        g.beginPath();
        for (let j = 0; j < 4; j++) {
          const rot = t * .05 * (j % 2 ? -1 : 1) + j * .3, q = 64 - j * 11, pts = [];
          for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU, rr = q * Math.abs(Math.cos(2.5 * a)) ** .8; pts.push([rr * Math.cos(a + rot), rr * Math.sin(a + rot)]); }
          poly(g, M, pts);
        }
        g.stroke();
      },
      (g, M, t) => {
        g.beginPath();
        const bell = [];
        for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * Math.PI; bell.push([30 * Math.cos(a) * (1 + .08 * Math.sin(t * 1.2)), 36 * Math.sin(a)]); }
        poly(g, M, bell);
        for (let k = 0; k < 11; k++) {
          const y0 = -32 + k * 6.4, pts = [];
          for (let i = 0; i <= 24; i++) { const v = i / 24; pts.push([-v * (72 + 10 * Math.sin(k * 1.7)), y0 * (1 - .4 * v) + 7 * v * Math.sin(v * 7 - t * 1.3 + k * .6)]); }
          poly(g, M, pts);
        }
        g.stroke();
      },
      (g, M, t, s) => {
        g.beginPath();
        const rot = t * .04, [X, Y] = M(0, 0);
        dot(g, X, Y, 40 * s); dot(g, X, Y, 30 * s);
        for (const [a, len] of spines) { const b = a + rot; const A = M(40 * Math.cos(b), 40 * Math.sin(b)), B = M(len * Math.cos(b), len * Math.sin(b)); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); }
        for (let i = 0; i < 24; i++) { const b = (i / 24) * TAU - rot * 2, P = M(18 * Math.cos(b), 18 * Math.sin(b)); dot(g, P[0], P[1], 2.6 * s); }
        g.stroke();
      },
    ];
    const pace = forms.map(() => [.25 + r() * .9, r() * TAU]);
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      // what they share: a faint thread to the same centre
      g.fillStyle = c.ink;
      g.globalAlpha = .45;
      g.beginPath();
      forms.forEach((_, i) => {
        const a = -Math.PI / 2 + (i * TAU) / forms.length;
        for (let d = 22; d < RING - 74; d += 6) dot(g, 300 + d * Math.cos(a), 300 + d * Math.sin(a), .7);
      });
      g.fill();
      forms.forEach((draw, i) => {
        const a = -Math.PI / 2 + (i * TAU) / forms.length, [w, p] = pace[i];
        const s = .8 * (1 + .06 * Math.sin(t * w + p)), ca = Math.cos(a), sa = Math.sin(a);
        const cx = 300 + RING * ca, cy = 300 + RING * sa;
        const M = (x, y) => [cx + s * (x * ca - y * sa), cy + s * (x * sa + y * ca)];
        g.strokeStyle = c.ink;
        g.globalAlpha = .85;
        g.lineWidth = .55;
        draw(g, M, t, s);
      });
      g.globalAlpha = 1;
      point(g, c, 300, 300, 6.5, 34);
    };
  },

  // Behind, one settled line, with the faint beginnings of the paths not taken; ahead, possibilities forking into thousands.
  // Each moment, one of them is lived. A click above or below the point chooses the next branch and lights what it opens.
  choice() {
    const DX = 34, DEPTH = 11, PAST = 8, STEP = 2.8, X0 = 236, Y0 = 300;
    // the spread of a fork depends on its column only, so the tree keeps its shape as it scrolls
    const h = (d, j) => 4.6 * 1.25 ** d * (1 + .22 * Math.sin(j * 2.31) + .12 * Math.sin(j * .77 + 1));
    const bit = (k) => { const m = rng(k * 131 + 17); m(); return m() < .5 ? -1 : 1; };
    // each fork also has its own lean and reach, known from its column and the last few turns that lead to it
    const hash = (a) => { a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); a = Math.imul(a ^ (a >>> 16), 0x45d9f3b); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; };
    const turn = (d, j, code, side) => { const H = h(d, j), id = j * 64 + code; return side * H * (.75 + .55 * hash(id)) + .3 * H * (hash(id + 7919) - .5); };
    const next = (code, side) => ((code << 1) | (side > 0)) & 63;
    const edge = (g, x0, y0, x1, y1, n, end = 1) => {
      g.moveTo(x0, y0);
      const m = Math.max(1, Math.round(n * end));
      for (let i = 1; i <= m; i++) { const u = (i / m) * end; g.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u * u * (3 - 2 * u)); }
    };
    // a click above or below the point chooses the next branch; otherwise chance does
    const chosen = new Map();
    let lastClick = null;
    const pick = (k) => chosen.get(k) ?? bit(k);
    return (g, c, t, s) => {
      const k = Math.floor(t / STEP), f = smooth(.25, 1, (t % STEP) / STEP);
      if (s.click && s.click !== lastClick) {
        lastClick = s.click;
        chosen.set(f > 0 && !s.snap ? k + 2 : k + 1, s.click[1] < Y0 ? -1 : 1);
        for (const key of chosen.keys()) if (key < k - PAST - 9) chosen.delete(key);
      }
      const first = pick(k + 1), codes = new Map();
      let code = 0;
      for (let j = k - PAST - 6; j <= k + 1; j++) codes.set(j, (code = next(code, pick(j))));
      // the present point travels along the first edge; the view follows it
      const lead = turn(1 - f, k + 1, codes.get(k + 1), first), ox = X0 - f * DX, oy = Y0 - lead * smooth(0, 1, f);
      // the user's choices still ahead, if any: what they open is lit
      const wish = chosen.has(k + 1) || chosen.has(k + 2);
      g.lineCap = g.lineJoin = 'round';
      // ahead: every possible path, fainter with distance; the branch left behind fades as the point leaves the fork
      const levels = Array.from({ length: DEPTH + 1 }, () => [[], [], []]);
      const walk = (x, y, depth, other, lit, code) => {
        for (const side of [-1, 1]) {
          const nc = next(code, side), ny = y + turn(depth - f, k + depth, nc, side), off = depth === 1 ? side !== first : other;
          const on = lit && (depth === 1 ? side === first : !chosen.has(k + depth) || chosen.get(k + depth) === side);
          levels[depth][off ? 1 : on ? 2 : 0].push(x, y, x + DX, ny);
          if (depth < DEPTH) walk(x + DX, ny, depth + 1, off, on, nc);
        }
      };
      walk(ox, oy, 1, false, wish, codes.get(k));
      g.lineCap = 'butt';
      for (let d = 1; d <= DEPTH; d++) for (let b = 0; b < 3; b++) {
        const list = levels[d][b];
        if (!list.length) continue;
        let alpha = (b === 2 ? .85 : .72) * .86 ** (d - f) * (b === 1 ? 1 - f : 1) * (d === DEPTH ? f : 1);
        if (alpha < .004) continue;
        g.globalAlpha = alpha;
        g.strokeStyle = b === 2 ? c.mix(.15 + d * .06) : c.ink;
        g.lineWidth = b === 2 ? .7 : d < 4 ? .55 : .42;
        g.beginPath();
        const n = d < 4 ? 8 : d < 7 ? 5 : 3;
        for (let i = 0; i < list.length; i += 4) edge(g, list[i], list[i + 1], list[i + 2], list[i + 3], n);
        g.stroke();
      }
      g.lineCap = 'round';
      // behind: the path that was taken, and the first steps of those that were not, already fading
      let x = ox, y = oy;
      const past = [];
      for (let j = k; j > k - PAST; j--) { const py = y - turn(0, j, codes.get(j), pick(j)); past.push([x - DX, py, x, y, j]); x -= DX; y = py; }
      g.strokeStyle = c.ink;
      g.lineWidth = .45;
      past.forEach(([x0, y0, , , j], i) => {
        // the fork not taken at that step, and a few of its own forks
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
      g.globalAlpha = 1;
      g.lineWidth = 1.5;
      g.beginPath();
      for (const [x0, y0, x1, y1] of past) edge(g, x0, y0, x1, y1, 8);
      edge(g, ox, oy, ox + DX, oy + lead, 8, f);
      g.stroke();
      point(g, c, X0, Y0, 6, 32);
    };
  },

  // Two lives turning together: they cross and interlace, and each keeps its own shape.
  love() {
    const STRANDS = 4, PTS = 300;
    const A = (a, t, j) => { const q = 158 + 62 * Math.cos(3 * a + t * .04) + j * 1.6; return [300 + q * Math.cos(a), 300 + q * Math.sin(a)]; };
    const free = (a, t, j) => { const b = a + .22 * Math.sin(2 * a + t * .07), q = 150 + 30 * Math.cos(5 * b - .8 - t * .03) + j * 1.6; return [300 + q * Math.cos(b), 300 + q * Math.sin(b)]; };
    // the pointer draws the second life toward it, softly
    let pull = 0, px = 300, py = 300;
    const B = (a, t, j) => {
      const p = free(a, t, j);
      if (!pull) return p;
      const dx = px - p[0], dy = py - p[1], w = pull * .45 * Math.exp(-(dx * dx + dy * dy) / 16200);
      return [p[0] + dx * w, p[1] + dy * w];
    };
    const curve = (g, F, t, j, a0, a1, n) => { for (let i = 0; i <= n; i++) { const [x, y] = F(a0 + ((a1 - a0) * i) / n, t, j); if (i) g.lineTo(x, y); else g.moveTo(x, y); } };
    return (g, c, t, s) => {
      const near = s.x != null;
      if (near) { px = pull ? ease(s, px, s.x, .06) : s.x; py = pull ? ease(s, py, s.y, .06) : s.y; }
      pull = ease(s, pull, near ? 1 : 0, near ? .04 : .03);
      if (pull < .002 && !near) pull = 0;
      const now = t * .16, span = TAU * .85;
      g.lineCap = g.lineJoin = 'round';
      // each one's whole shape, faint
      g.lineWidth = .4;
      g.strokeStyle = c.ink;
      g.globalAlpha = .55;
      g.lineWidth = .9;
      g.beginPath(); curve(g, A, t, 0, 0, TAU, PTS); g.stroke();
      g.lineWidth = .4;
      g.beginPath(); for (let j = -STRANDS; j <= STRANDS; j += 2) curve(g, B, t, j, 0, TAU, PTS); g.stroke();
      // the ties between them, stronger where they have just been together
      g.strokeStyle = c.mark;
      g.lineWidth = .5;
      const TIES = 90;
      for (let b = 0; b < 3; b++) {
        g.globalAlpha = [.15, .35, .75][b];
        g.beginPath();
        for (let i = 0; i < TIES / 3; i++) {
          const a = now - span + (span * (b * TIES / 3 + i)) / TIES;
          const p = A(a, t, 0), q = B(a, t, 0);
          g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]);
        }
        g.stroke();
      }
      // their recent paths, each with its own character
      g.strokeStyle = c.ink;
      for (let band = 0; band < 6; band++) {
        const k = band / 5, a0 = now - span + (span * band) / 6, a1 = now - span + (span * (band + 1)) / 6;
        g.globalAlpha = .45 * k;
        g.lineWidth = 1.6;
        g.beginPath(); curve(g, A, t, 0, a0, a1, 40); g.stroke();
        g.lineWidth = .6;
        g.beginPath(); for (let j = -STRANDS; j <= STRANDS; j += 2) curve(g, B, t, j, a0, a1, 40); g.stroke();
      }
      g.globalAlpha = 1;
      const [bx, by] = B(now, t, 0);
      g.lineWidth = 1.2;
      g.beginPath(); dot(g, bx, by, 5); g.stroke();
      const [ax, ay] = A(now, t, 0);
      point(g, c, ax, ay, 5.5, 28);
    };
  },

  // A year as a weave: one thread runs back and forth through the days, each day a small dial of twenty-four hours knotted on it.
  // They look alike; up close, none is the same as another. A lens under the pointer shows their differences.
  days() {
    const r = rng(23), N = 365, COLS = 19, ROWS = 20, PER = 3, STEP = 28.6, X0 = 300 - ((COLS - 1) * STEP) / 2, Y0 = 300 - ((ROWS - 1) * STEP) / 2;
    // an ordinary day: sleep, the kettle, the bus, a queue at noon, the hollow of the afternoon, the stairwell, the light going out
    const base = [.05, .04, .04, .04, .05, .07, .16, .7, .85, .6, .55, .6, .95, .62, .5, .38, .2, .36, .78, .62, .5, .4, .16, .07];
    const cells = Array.from({ length: N }, (_, d) => {
      const weekend = d % 7 >= 5, late = weekend ? 1 + Math.floor(r() * 3) : 0, mood = .8 + r() * .35;
      const hours = base.map((v, h) => {
        let a = base[Math.max(0, Math.min(23, h - (h < 12 ? late : 0)))];
        if (weekend && h > 9 && h < 18) a = a * .6 + .3;
        return clamp(a * mood + (r() - .5) * .34 * (a > .1 ? 1 : .2), .03, 1);
      });
      const row = Math.floor(d / COLS), col = row % 2 ? COLS - 1 - (d % COLS) : d % COLS;
      return { x: X0 + col * STEP, y: Y0 + row * STEP, row, col, hours };
    });
    const ANG = Array.from({ length: 24 }, (_, h) => [Math.cos(-Math.PI / 2 + (h / 24) * TAU), Math.sin(-Math.PI / 2 + (h / 24) * TAU)]);
    const glyph = (g, d, x, y, k, upto = 24) => {
      g.moveTo(x + 2.2 * k, y);
      g.arc(x, y, 2.2 * k, 0, TAU);
      for (let h = 0; h < upto; h++) {
        const [ca, sa] = ANG[h], L = (3.2 + 10.5 * d.hours[h]) * k;
        g.moveTo(x + 3.4 * k * ca, y + 3.4 * k * sa);
        g.lineTo(x + L * ca, y + L * sa);
      }
    };
    // a lens under the pointer: the days near it grow apart and show their differences
    const R = 100, M = 1.6;
    let lens = 0, lx = 300, ly = 300;
    const magnify = (x, y) => {
      const dx = x - lx, dy = y - ly, e = Math.hypot(dx, dy);
      if (!lens || e >= R) return [x, y, 1];
      const spread = 1 + (lens * M) / (1 + (M * e) / R) * (1 - e / R);
      return [lx + dx * spread, ly + dy * spread, 1 + lens * M * (1 - e / R) ** 2];
    };
    return (g, c, t, s) => {
      const near = s.x != null;
      if (near) { lx = lens ? ease(s, lx, s.x, .12) : s.x; ly = lens ? ease(s, ly, s.y, .12) : s.y; }
      lens = ease(s, lens, near ? 1 : 0, .07);
      if (lens < .002 && !near) lens = 0;
      const now = (t / PER) % N, today = Math.floor(now), hour = (now - today) * 24;
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      // the warp: threads between the columns, hidden where the weft passes over them
      const seg = (x0, y0, x1, y1) => { const a = magnify(x0, y0), b = magnify(x1, y1); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); };
      g.globalAlpha = .26;
      g.lineWidth = .45;
      g.beginPath();
      for (let j = 0; j < COLS - 1; j++) for (const o of [-.8, .8]) {
        const x = X0 + (j + .5) * STEP + o;
        for (let i = 0; i < ROWS; i++) {
          const y = Y0 + i * STEP, under = (i + j) % 2 === 0;
          if (under) { seg(x, y - STEP / 2, x, y - 3); seg(x, y + 3, x, y + STEP / 2); } else seg(x, y - STEP / 2, x, y + STEP / 2);
        }
      }
      g.stroke();
      // the weft: one thread through every day in turn, rising over the warp and dipping under it, turning at the edges
      const age = (d) => (today - d + N) % N, weft = Array.from({ length: 4 }, () => []);
      for (let d = 0; d < N - 1; d++) {
        const a = cells[d], b = cells[d + 1], list = weft[Math.min(3, Math.floor((age(d) / N) * 4))];
        if (a.row === b.row) {
          const dir = Math.sign(b.x - a.x), mx = (a.x + b.x) / 2, bump = (a.row + Math.min(a.col, b.col)) % 2 ? -1.3 : 1.3;
          list.push([a.x + dir * 3, a.y, mx - dir * 5, a.y + bump * .6, mx, a.y + bump, mx + dir * 5, a.y + bump * .6, b.x - dir * 3, b.y]);
        } else {
          const side = a.col === 0 ? -1 : 1, cy = (a.y + b.y) / 2, pts = [];
          for (let k = 0; k <= 12; k++) { const q = -Math.PI / 2 + (k / 12) * Math.PI; pts.push(a.x + side * (3 + (STEP / 2) * Math.cos(q) * 1.1), cy + (STEP / 2) * Math.sin(q)); }
          list.push(pts);
        }
      }
      weft.forEach((list, b) => {
        g.globalAlpha = .6 - b * .1;
        g.lineWidth = .55;
        g.beginPath();
        for (const pts of list) for (let i = 0; i < pts.length; i += 2) { const [x, y] = magnify(pts[i], pts[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      });
      // the days, fainter the longer ago they were; the last week still warm
      const B = 7, buckets = Array.from({ length: B }, () => []), recent = [];
      for (let d = 0; d < N; d++) {
        if (d === today) continue;
        const old = age(d);
        if (old < 7) recent.push(d, old);
        else buckets[Math.min(B - 1, Math.floor(((old - 7) / (N - 7)) * B))].push(d);
      }
      buckets.forEach((list, b) => {
        g.globalAlpha = .9 - b * .095;
        g.lineWidth = .5;
        g.beginPath();
        for (const d of list) { const [x, y, k] = magnify(cells[d].x, cells[d].y); glyph(g, cells[d], x, y, k); }
        g.stroke();
      });
      for (let i = 0; i < recent.length; i += 2) {
        const d = cells[recent[i]], [x, y, k] = magnify(d.x, d.y);
        g.strokeStyle = c.mix(recent[i + 1] / 7);
        g.globalAlpha = .95;
        g.lineWidth = .65;
        g.beginPath(); glyph(g, d, x, y, k); g.stroke();
      }
      // today, hour after hour
      const d = cells[today], [x, y, k] = magnify(d.x, d.y), h = Math.floor(hour);
      g.strokeStyle = c.mark;
      g.globalAlpha = 1;
      g.lineWidth = .8;
      g.beginPath(); glyph(g, d, x, y, k, h); g.stroke();
      const [ca, sa] = ANG[Math.min(23, h)], L = (3.2 + 10.5 * d.hours[Math.min(23, h)] * smooth(0, 1, hour - h)) * k;
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x + 3.4 * k * ca, y + 3.4 * k * sa); g.lineTo(x + L * ca, y + L * sa); g.stroke();
      g.strokeStyle = c.ink;
      point(g, c, x, y, 2.6 * k, 16 * k);
    };
  },

  // Rings that settle: motion slowly comes to rest around one point.
  silence() {
    const r = rng(31), RINGS = 30, PERIOD = 40, OUT = 278, PTS = 180;
    const rings = Array.from({ length: RINGS }, (_, i) => {
      const k = (i + 1) / RINGS;
      return { k, rad: 9 + (OUT - 9) * k ** 1.25, modes: [2, 3, 5, 7].map((m) => [m, r() * TAU, (r() * .6 + .2) * (r() < .5 ? -1 : 1), r() * .8 + .2]) };
    });
    const E = Math.exp(-3.4);
    // a click disturbs the rings from where it falls; the disturbance spreads, then settles
    let lastClick = null, touch = null;
    return (g, c, t, s) => {
      const u = (t % PERIOD) / PERIOD;
      const stir = smooth(0, .07, u) * (Math.exp(-3.4 * u) - E) / (1 - E);
      if (s.click && s.click !== lastClick) { lastClick = s.click; touch = { x: s.click[0], y: s.click[1], t0: t }; }
      if (touch && (t < touch.t0 || t - touch.t0 > 14)) touch = null;
      let tx = 0, ty = 0, front = 0, force = 0;
      if (touch) {
        const age = t - touch.t0;
        tx = touch.x; ty = touch.y; front = 40 * age; force = 14 * smooth(0, .4, age) * Math.exp(-age / 3);
      }
      g.lineCap = g.lineJoin = 'round';
      for (const { k, rad, modes } of rings) {
        const amp = (.5 + 11 * stir) * k ** 1.4, wave = Math.sin(k * 9 - t * .45);
        g.strokeStyle = c.mix(clamp(k * 5 - .15));
        g.globalAlpha = .25 + .6 * (1 - k) ** .8;
        g.lineWidth = .45 + .5 * (1 - k);
        g.beginPath();
        for (let i = 0; i <= PTS; i++) {
          const a = (i / PTS) * TAU;
          let dr = 0;
          for (const [m, p, w, h] of modes) dr += h * Math.sin(m * a + p + t * w * .3);
          let q = rad + amp * dr * (.6 + .4 * wave);
          if (force) {
            const e = Math.hypot(300 + rad * Math.cos(a) - tx, 300 + rad * Math.sin(a) - ty), x = (e - front) / 46;
            q += force * Math.exp(-x * x) * Math.sin(e / 13 - t * 2.2) * (.3 + .7 * k);
          }
          if (i) g.lineTo(300 + q * Math.cos(a), 300 + q * Math.sin(a)); else g.moveTo(300 + q * Math.cos(a), 300 + q * Math.sin(a));
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, 300, 300, 5, 30);
    };
  },

  // Out of a formless field, points gather into forms, then return to it.
  emerge() {
    const r = rng(17), N = 2900, FORMED = 2000, CURVES = 6, PERIOD = 36;
    const items = Array.from({ length: N }, (_, i) => {
      const q = 285 * Math.sqrt(r()), a = r() * TAU, item = { x: 300 + q * Math.cos(a), y: 300 + q * Math.sin(a), w: r() * TAU, v: .2 + r() * .4, lag: r() };
      if (i < FORMED) {
        const j = i % CURVES, m = Math.floor(i / CURVES), per = Math.ceil(FORMED / CURVES), th = (m / per) * TAU;
        const rad = (38 + 42 * j) * (1 + .11 * Math.cos(6 * th + j * .7));
        Object.assign(item, { tx: 300 + rad * Math.cos(th), ty: 300 + rad * Math.sin(th), start: .04 + .07 * j + .1 * item.lag, j });
      }
      return item;
    });
    return (g, c, t) => {
      const u = (t % PERIOD) / PERIOD;
      const groups = [[], [], [], []];
      for (const it of items) {
        let x = it.x + 5 * Math.sin(t * it.v + it.w), y = it.y + 5 * Math.cos(t * it.v * .8 + it.w);
        let f = 0;
        if (it.tx !== undefined) {
          f = smooth(it.start, it.start + .3, u) * (1 - smooth(.8 + .06 * it.lag, .97, u));
          x += (it.tx - x) * f; y += (it.ty - y) * f;
        }
        groups[Math.min(3, Math.floor(f * 4))].push(x, y);
      }
      g.fillStyle = c.ink;
      groups.forEach((list, b) => {
        g.globalAlpha = .28 + b * .2;
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) dot(g, list[i], list[i + 1], .6 + b * .1);
        g.fill();
      });
      g.globalAlpha = 1;
      point(g, c, 300, 300, 2 + 4.5 * smooth(0, .25, u) * (1 - smooth(.8, 1, u)), 30);
    };
  },

  // A spiral of cells, each holding a smaller one, drawn ever closer to the point.
  zoom() {
    const n = 16, PERIOD = 9, s = Math.sin(Math.PI / n);
    // ratio between rings so that neighbouring cells just touch
    let lo = .3, hi = .99;
    for (let i = 0; i < 50; i++) { const q = (lo + hi) / 2, gap = Math.sqrt(1 + q * q - 2 * q * Math.cos(Math.PI / n)) - s * (1 + q); if (gap > 0) lo = q; else hi = q; }
    const Q = (lo + hi) / 2, R0 = 300;
    return (g, c, t) => {
      const u = (t / PERIOD) % 1;
      g.lineCap = 'round';
      for (let k = -2; k < 40; k++) {
        const rho = R0 * Q ** (k - u), cell = rho * s * .97;
        if (cell < .7) break;
        const alpha = smooth(.7, 4, cell) * (1 - smooth(230, 300, rho + cell * .6));
        if (alpha < .01) continue;
        const off = ((k + u) * Math.PI) / n + u * .4 + k * .4;
        g.strokeStyle = c.mix(clamp((rho - 14) / 120));
        g.globalAlpha = alpha * .85;
        g.lineWidth = clamp(cell / 28, .3, .8);
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const a = off + (i * TAU) / n, x = 300 + rho * Math.cos(a), y = 300 + rho * Math.sin(a);
          dot(g, x, y, cell);
          if (cell > 5) dot(g, x, y, cell * .46);
          if (cell > 16) for (let j = 0; j < 6; j++) { const b = a + (j * TAU) / 6; dot(g, x + cell * .73 * Math.cos(b), y + cell * .73 * Math.sin(b), cell * .17); }
        }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, 300, 300, 4, 22);
    };
  },

  // Every page of the book, there at once; the reader is only somewhere among them.
  pages() {
    const r = rng(8), N = 60, X0 = 64, X1 = 340, D = 240, H = 290, CX = .74, CY = .42, BASE = 478, LINES = 15;
    const text = Array.from({ length: N }, () => Array.from({ length: LINES }, () => [.12 + r() * .04, .88 - (r() < .2 ? r() * .45 : r() * .06)]));
    return (g, c, t) => {
      const P = (N - 1) * (.5 - .5 * Math.cos((t * TAU) / 80)), here = Math.round(P);
      const at = (k, z, y) => {
        const lean = 7 * Math.sin(t * .35 + k * .16) * (y / H);
        return [X0 + ((X1 - X0) * k) / (N - 1) + z * CX * D + lean, BASE - y - z * CY * D];
      };
      const page = (k) => { for (const [z, y] of [[0, 0], [0, H], [1, H], [1, 0], [0, 0]]) { const [x, yy] = at(k, z, y); if (z || y) g.lineTo(x, yy); else g.moveTo(x, yy); } };
      const lines = (k) => text[k].forEach(([z0, z1], l) => { const y = H * (.86 - l * .048), A = at(k, z0, y), B = at(k, z1, y); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); });
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      g.lineWidth = .45;
      g.globalAlpha = .3;
      g.beginPath();
      for (let k = 0; k < N; k++) if (k !== here) page(k);
      g.stroke();
      g.globalAlpha = .06;
      g.beginPath();
      for (let k = 0; k < N; k++) if (k !== here) lines(k);
      g.stroke();
      g.globalAlpha = 1;
      g.lineWidth = .9;
      g.beginPath(); page(here); g.stroke();
      g.strokeStyle = c.mix(.45);
      g.lineWidth = .6;
      g.beginPath(); lines(here); g.stroke();
      g.strokeStyle = c.ink;
      const [px, py] = at(P, .5 + .22 * Math.sin(t * .23), H * (.5 + .26 * Math.sin(t * .17)));
      point(g, c, px, py, 5.5, 30);
    };
  },

  // A map drawn with precision, and the one path actually walked across it.
  map() {
    const r = rng(12), GRID = 80, X0 = 60, SIZE = 480, LEVELS = 22, PERIOD = 60;
    const hills = Array.from({ length: 9 }, () => [r(), r(), .08 + r() * .16, (r() * .8 + .4) * (r() < .3 ? -.7 : 1)]);
    const field = (x, y) => hills.reduce((sum, [hx, hy, s, h]) => sum + h * Math.exp(-((x - hx) ** 2 + (y - hy) ** 2) / (2 * s * s)), 0);
    const v = [];
    for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) v.push(field(i / GRID, j / GRID));
    const lo = Math.min(...v), hi = Math.max(...v);
    const thin = [], thick = [];
    for (let l = 1; l < LEVELS; l++) {
      const level = lo + ((hi - lo) * l) / LEVELS, out = l % 5 === 0 ? thick : thin;
      for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
        const c4 = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [a, b, v[b * (GRID + 1) + a]]);
        const cross = [];
        for (let e = 0; e < 4; e++) {
          const [ax, ay, av] = c4[e], [bx, by, bv] = c4[(e + 1) % 4];
          if ((av < level) !== (bv < level)) { const f = (level - av) / (bv - av); cross.push(X0 + ((ax + (bx - ax) * f) / GRID) * SIZE, X0 + ((ay + (by - ay) * f) / GRID) * SIZE); }
        }
        for (let e = 0; e + 3 < cross.length; e += 4) out.push(cross[e], cross[e + 1], cross[e + 2], cross[e + 3]);
      }
    }
    const walk = (s) => [X0 + 30 + 420 * s + 34 * Math.sin(s * 11 + 1) + 18 * Math.sin(s * 27), 300 + 120 * Math.sin(s * 4.2 + .6) + 46 * Math.sin(s * 13 + 2) + 14 * Math.sin(s * 31)];
    const pace = (u) => u + .035 * Math.sin(u * TAU * 7);
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      // frame and graduations
      g.globalAlpha = .8;
      g.lineWidth = .7;
      g.beginPath(); g.rect(X0, X0, SIZE, SIZE); g.stroke();
      g.lineWidth = .4;
      g.beginPath();
      for (let i = 0; i <= 48; i++) {
        const p = X0 + (i * SIZE) / 48, len = i % 8 === 0 ? 9 : 4;
        g.moveTo(p, X0); g.lineTo(p, X0 - len); g.moveTo(p, X0 + SIZE); g.lineTo(p, X0 + SIZE + len);
        g.moveTo(X0, p); g.lineTo(X0 - len, p); g.moveTo(X0 + SIZE, p); g.lineTo(X0 + SIZE + len, p);
      }
      g.stroke();
      g.globalAlpha = .12;
      g.beginPath();
      for (let i = 1; i < 6; i++) { const p = X0 + (i * SIZE) / 6; g.moveTo(p, X0); g.lineTo(p, X0 + SIZE); g.moveTo(X0, p); g.lineTo(X0 + SIZE, p); }
      g.stroke();
      // contour lines
      for (const [list, width, alpha] of [[thin, .4, .45], [thick, .75, .7]]) {
        g.globalAlpha = alpha; g.lineWidth = width;
        g.beginPath();
        for (let i = 0; i < list.length; i += 4) { g.moveTo(list[i], list[i + 1]); g.lineTo(list[i + 2], list[i + 3]); }
        g.stroke();
      }
      // the lived path: heavy where time was spent
      const u = (t % PERIOD) / PERIOD, now = pace(u), fade = 1 - smooth(.92, 1, u), BANDS = 8, STEPS = 260;
      for (let b = 0; b < BANDS; b++) {
        const k = b / (BANDS - 1);
        g.strokeStyle = c.mix(1 - k ** 3);
        g.globalAlpha = (.55 + .45 * k) * fade;
        g.lineWidth = 2.6 + k * .8;
        g.beginPath();
        const n = Math.ceil(STEPS / BANDS);
        for (let i = 0; i <= n; i++) { const [x, y] = walk(now * ((b + i / n) / BANDS)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      const [px, py] = walk(now);
      point(g, c, px, py, 5.5, 30);
    };
  },

  // A web of lives: a shock at one point reaches every other, through the links between them.
  ripple() {
    const r = rng(19), nodes = [];
    for (let tries = 0; nodes.length < 210 && tries < 20000; tries++) {
      const q = 272 * Math.sqrt(r()), a = r() * TAU, x = 300 + q * Math.cos(a), y = 300 + q * Math.sin(a);
      if (nodes.every((p) => Math.hypot(p.x - x, p.y - y) > 25)) nodes.push({ x, y, dx: r() * 2 - 1, dy: r() * 2 - 1 });
    }
    const N = nodes.length, links = [], seen = new Set();
    nodes.forEach((p, i) => {
      nodes.map((q, j) => [Math.hypot(p.x - q.x, p.y - q.y), j]).sort((a, b) => a[0] - b[0]).slice(1, 4).forEach(([d, j]) => {
        const key = Math.min(i, j) * N + Math.max(i, j);
        if (!seen.has(key)) { seen.add(key); links.push([i, j, d]); }
      });
    });
    const sources = [0, 1, 2, 3, 4, 5].map(() => Math.floor(r() * N));
    const spread = (s) => {
      const d = new Array(N).fill(Infinity), done = new Array(N).fill(false);
      d[s] = 0;
      for (let it = 0; it < N; it++) {
        let m = -1;
        for (let i = 0; i < N; i++) if (!done[i] && (m < 0 || d[i] < d[m])) m = i;
        if (d[m] === Infinity) break;
        done[m] = true;
        for (const [a, b, w] of links) { if (a === m && d[m] + w < d[b]) d[b] = d[m] + w; if (b === m && d[m] + w < d[a]) d[a] = d[m] + w; }
      }
      return d.map((v) => (v === Infinity ? 1e4 : v));
    };
    const dist = sources.map(spread);
    const PERIOD = 7;
    // a click sends its own shock from the nearest node
    let lastClick = null, shock = null;
    const wave = (pos, d, age) => nodes.forEach((p, i) => {
      const front = age * 85, x = (d[i] - front) / 38, w = Math.exp(-x * x) * Math.exp(-age / 6);
      const s = w * Math.sin((d[i] - front) / 10) * 9;
      pos[i][0] += p.dx * s; pos[i][1] += p.dy * s; pos[i][2] += w;
    });
    return (g, c, t, s) => {
      const k = Math.floor(t / PERIOD);
      if (s.click && s.click !== lastClick) {
        lastClick = s.click;
        const [cx, cy] = s.click;
        let src = 0;
        nodes.forEach((p, i) => { if (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(nodes[src].x - cx, nodes[src].y - cy)) src = i; });
        shock = { src, d: spread(src), t0: t };
      }
      const pos = nodes.map((p) => [p.x, p.y, 0]);
      for (let j = k - 2; j <= k; j++) wave(pos, dist[((j % 6) + 6) % 6], t - j * PERIOD);
      if (shock && (t < shock.t0 || t - shock.t0 > 3 * PERIOD)) shock = null;
      if (shock) wave(pos, shock.d, t - shock.t0);
      const buckets = Array.from({ length: 6 }, () => []);
      for (const [a, b] of links) {
        const e = clamp((pos[a][2] + pos[b][2]) * .7);
        buckets[Math.round((1 - e) * 5)].push(pos[a][0], pos[a][1], pos[b][0], pos[b][1]);
      }
      g.lineCap = 'round';
      g.globalAlpha = .75;
      strokeBuckets(g, c, buckets, .55);
      g.globalAlpha = 1;
      g.fillStyle = c.ink;
      g.beginPath();
      for (const [x, y, e] of pos) dot(g, x, y, 1.1 + 1.6 * clamp(e));
      g.fill();
      const own = shock && shock.t0 > k * PERIOD, start = own ? shock.t0 : k * PERIOD;
      const src = own ? shock.src : sources[((k % 6) + 6) % 6], [sx, sy] = pos[src];
      point(g, c, sx, sy, 3.5 + 4 * Math.exp(-(t - start) * .8), 32);
    };
  },

  // The drop falls, joins the sea, rises again and returns; the sea keeps the trace of where it went.
  water() {
    const r = rng(29), PERIOD = 26, SEA = 408, CLOUD = 128, LINES = 18;
    const puffs = Array.from({ length: 900 }, () => {
      const a = r() * TAU, q = Math.sqrt(r()), x = (r() * 2 - 1);
      const top = 58 * (1 - x * x) ** .6 * (.75 + .25 * Math.cos(x * 9));
      return [300 + x * 210, CLOUD + 26 - r() ** .7 * (top + 20), r() * .5 + .45, a, q];
    });
    const rain = Array.from({ length: 60 }, () => [118 + r() * 140, .35 + r() * .25, r()]);
    const vapour = Array.from({ length: 80 }, () => [370 + r() * 140, .05 + r() * .05, r(), r() * TAU]);
    const route = (u) => {
      if (u < .18) { const f = u / .18; return [188, CLOUD + 40 + (SEA - CLOUD - 40) * f * f, 4.5]; }
      if (u < .5) { const f = smooth(.18, .5, u); return [188 + 254 * f, SEA + 16 + 30 * Math.sin(f * Math.PI), 4.5]; }
      if (u < .76) { const f = smooth(.5, .76, u); return [442 + 6 * Math.sin(f * 4 * Math.PI), SEA + 16 - (SEA + 16 - CLOUD) * f, 4.5 - 2 * f]; }
      const f = smooth(.76, 1, u);
      return [442 - 254 * f, CLOUD + 40 * f + 10 * Math.sin(f * Math.PI) * -1, 2.5 + 2 * f];
    };
    return (g, c, t) => {
      const u = (t % PERIOD) / PERIOD, k = Math.floor(t / PERIOD), hit = t - (k + .18) * PERIOD;
      g.lineCap = g.lineJoin = 'round';
      // the cloud
      g.fillStyle = c.ink;
      g.globalAlpha = .55;
      g.beginPath();
      for (const [x, y, s, a] of puffs) dot(g, x + 2 * Math.sin(t * .2 + a), y + 1.5 * Math.cos(t * .25 + a), s);
      g.fill();
      // rain on one side, vapour on the other
      g.strokeStyle = c.ink;
      g.globalAlpha = .45;
      g.lineWidth = .5;
      g.beginPath();
      for (const [x, v, p] of rain) { const y = CLOUD + 40 + (((t * v + p) % 1) * (SEA - CLOUD - 46)); g.moveTo(x, y); g.lineTo(x - 1, y + 10); }
      g.stroke();
      g.beginPath();
      for (const [x, v, p, w] of vapour) { const f = (t * v + p) % 1, y = SEA - 6 - f * (SEA - CLOUD - 50); dot(g, x + 8 * Math.sin(f * 7 + w), y, .5 + .5 * Math.sin(f * Math.PI)); }
      g.globalAlpha = .5;
      g.fillStyle = c.ink;
      g.fill();
      // the sea, with the rings of the last fall
      g.lineWidth = .5;
      for (let i = 0; i < LINES; i++) {
        const z = i / (LINES - 1), y0 = SEA + 152 * z ** 1.35;
        g.globalAlpha = .25 + .55 * (1 - z);
        g.beginPath();
        for (let j = 0; j <= 90; j++) {
          const x = 30 + (j / 90) * 540;
          let y = y0 + 1.6 * Math.sin(x * .03 + t * .5 + i * 1.3) * (1 + z);
          if (hit > 0) { const d = Math.hypot(x - 188, (y0 - SEA) * 3.2), front = hit * 40; y -= 6 * Math.exp(-(((d - front) / 22) ** 2)) * Math.sin((d - front) / 6) * Math.exp(-hit / 4); }
          if (j) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
      // what the sea keeps: the path the drop took through it
      for (const [j, base] of [[k - 1, .3], [k, 1]]) {
        const lived = j === k ? clamp((u - .18) / .32) : 1;
        if (lived <= 0) continue;
        const keep = j === k ? 1 : 1 - smooth(0, .6, u);
        g.strokeStyle = c.mix(.35);
        g.globalAlpha = .55 * keep * base;
        g.lineWidth = 1;
        g.beginPath();
        for (let i = 0; i <= 50; i++) { const f = i / 50 * lived; const x = 188 + 254 * f, y = SEA + 16 + 30 * Math.sin(f * Math.PI) + (j - k) * 7; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      const [px, py, size] = route(u);
      point(g, c, px, py, size, 26);
    };
  },

  // A gesture handed down: each line takes it from the one before and changes it a little.
  gesture() {
    const ROWS = 10, X0 = 40, X1 = 560, Y1 = 500, SP = 44, PER = 9, PTS = 260;
    const gen = (k) => ({
      a: 30 + 8 * Math.sin(k * .71) + 3 * Math.sin(k * 1.93), b: 30 + 9 * Math.sin(k * .53 + 1) + 4 * Math.sin(k * 2.3),
      f: 2.2 + .7 * Math.sin(k * .37) + .25 * Math.sin(k * 1.4), w: 92 + 14 * Math.sin(k * .9), cx: 300 + 130 * Math.sin(k * .43),
    });
    const at = (G, s, y) => {
      const x = X0 + s * (X1 - X0), v = (x - G.cx) / G.w;
      if (Math.abs(v) >= 1) return [x, y];
      const bump = (1 - v * v) ** 2, phi = Math.PI * (v + 1) * G.f;
      return [x + G.a * Math.sin(phi) * bump, y - G.b * (1 - Math.cos(phi)) * .5 * bump];
    };
    const row = (g, G, y, end = 1) => { const n = Math.max(1, Math.round(PTS * end)); for (let i = 0; i <= n; i++) { const [x, yy] = at(G, (i / PTS), y); if (i) g.lineTo(x, yy); else g.moveTo(x, yy); } };
    return (g, c, t) => {
      const K = Math.floor(t / PER), u = (t % PER) / PER, rise = SP * (1 - smooth(0, .14, u)), pen = smooth(.08, .95, u);
      g.lineCap = g.lineJoin = 'round';
      // the gesture passes from one line to the next
      g.fillStyle = c.ink;
      g.globalAlpha = .4;
      g.beginPath();
      for (let j = K - ROWS + 1; j < K; j++) {
        const A = gen(j), B = gen(j + 1), ya = Y1 - (K - j) * SP + rise - 14, yb = ya + SP;
        for (let i = 1; i < 8; i++) { const f = i / 8; dot(g, A.cx + (B.cx - A.cx) * f, ya + (yb - ya) * f, .6); }
      }
      g.fill();
      for (let j = K - ROWS; j <= K; j++) {
        const age = K - j, y = Y1 - age * SP + rise, G = gen(j);
        const fadeTop = j === K - ROWS ? 1 - smooth(0, .14, u) : 1;
        g.strokeStyle = age ? c.ink : c.mix(.25);
        g.globalAlpha = (age ? .65 * (1 - age / (ROWS + 1)) + .1 : 1) * fadeTop;
        g.lineWidth = age ? .7 : 1.3;
        g.beginPath(); row(g, G, y, age ? 1 : pen); g.stroke();
        if (age) {
          g.globalAlpha *= .35; g.lineWidth = .4;
          g.beginPath(); row(g, { ...G, a: G.a * .9, b: G.b * 1.12 }, y, 1); g.stroke();
        }
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      const [px, py] = at(gen(K), Math.round(PTS * pen) / PTS, Y1 + rise);
      point(g, c, px, py, 5, 26);
    };
  },

  // A body breathing: lines spread from the heart to the skin, swell with each breath and carry every beat outward.
  body() {
    const N = 24, PTS = 180, HX = 304, HY = 292, BREATH = 7.5, BEAT = 1.1;
    // the outline of a bust: a head joined softly to the shoulders
    const smin = (a, b, k) => { const h = clamp(.5 + (.5 * (b - a)) / k); return b + (a - b) * h - k * h * (1 - h); };
    const field = (x, y) => {
      const head = Math.hypot(x - 300, (y - 172) * .92) - 54;
      const w = 140 - .12 * (y - 250), qx = Math.abs(x - 300) - (w - 80), qy = Math.abs(y - 408) - 92;
      return smin(head, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 80, 70);
    };
    // each direction from the heart reaches the skin at its last crossing
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
    const beat = (x) => Math.exp(-((x / .07) ** 2)) + .55 * Math.exp(-(((x - .27) / .07) ** 2));
    return (g, c, t) => {
      const age = t % BEAT;
      g.lineCap = g.lineJoin = 'round';
      for (let i = 0; i < N; i++) {
        const k = (i + 1) / N, lag = k * .55;
        const d = beat(age - lag) + beat(age + BEAT - lag);
        const q = k * (1 + .05 * Math.sin((t / BREATH - k * .2) * TAU)) + .028 * d * (1 - .75 * k);
        g.strokeStyle = c.mix(clamp(k * 3 - .2));
        g.globalAlpha = .3 + .55 * k ** 1.5;
        g.lineWidth = i === N - 1 ? 1.3 : .42 + .3 * k;
        g.beginPath();
        skin.forEach(([x, y], j) => { const X = HX + x * q, Y = HY + y * q; if (j) g.lineTo(X, Y); else g.moveTo(X, Y); });
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, HX, HY, 4.2 + 2.6 * beat(age), 30);
    };
  },

  // A puddle on the pavement: pebbles fall, circles widen and cross, the sky trembles in the water. A click throws a pebble.
  play() {
    const CX = 300, CY = 312, W = 240, H = 160, SQ = .5, PERIOD = 4.4, LIFE = 13;
    const shore = (a) => 1 + .05 * Math.sin(3 * a + 1) + .035 * Math.sin(5 * a + 2.2) + .02 * Math.sin(9 * a + .4) + .015 * Math.sin(14 * a) + .02 * Math.cos(2 * a);
    const SHORE = Float64Array.from({ length: 721 }, (_, i) => shore((i / 720) * TAU - Math.PI));
    const inside = (x, y, margin = 1) => { const u = (x - CX) / W, v = (y - CY) / H; return Math.hypot(u, v) < SHORE[Math.round(((Math.atan2(v, u) + Math.PI) / TAU) * 720)] * margin; };
    const border = Array.from({ length: 241 }, (_, i) => { const a = (i / 240) * TAU, q = shore(a); return [CX + W * q * Math.cos(a), CY + H * q * Math.sin(a)]; });
    // each line of the reflected sky, cut to the water
    const spans = [];
    for (let y = CY - H * 1.2; y < CY + H * 1.2; y += 3.1) {
      const xs = [];
      for (let i = 0; i < 240; i++) {
        const [x0, y0] = border[i], [x1, y1] = border[i + 1];
        if ((y0 - y) * (y1 - y) < 0) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) spans.push(y, xs[i] + 2, xs[i + 1] - 2);
    }
    const r = rng(52);
    const grit = Array.from({ length: 1400 }, () => {
      const x = r() * 600, y = 40 + r() * 545, u = (x - CX) / W, v = (y - CY) / H;
      const rim = Math.hypot(u, v) / shore(Math.atan2(v, u));
      return rim < 1.02 ? null : [x, y, .3 + r() * .6, rim];
    }).filter(Boolean);
    const stones = Array.from({ length: 22 }, (_, k) => {
      const a = r() * TAU, q = 1.08 + r() * .4, x = CX + W * shore(a) * q * Math.cos(a), y = CY + H * shore(a) * q * Math.sin(a), s = 1.2 + r() * 3.2;
      return Array.from({ length: 9 }, (_, i) => { const b = (i / 8) * TAU, w = s * (.75 + .25 * Math.sin(b * 3 + k)); return [x + w * Math.cos(b), y + w * .62 * Math.sin(b)]; });
    }).filter((p) => p[0][1] < 590 && p[0][1] > 30);
    const clouds = Array.from({ length: 10 }, () => [r() * 900, CY - H * .9 + r() * H * 1.8, 55 + r() * 80, 12 + r() * 14, r()]);
    const auto = (j) => { const m = rng(j * 71 + 9); m(); let x, y; do { x = CX + (m() - .5) * W * 1.3; y = CY + (m() - .5) * H * 1.2; } while (!inside(x, y, .8)); return { x, y, at: j * PERIOD + 1.2 }; };
    const clicks = [];
    let lastClick = null;
    return (g, c, t, s) => {
      if (s.click && s.click !== lastClick) {
        lastClick = s.click;
        if (!s.snap) {
          let [x, y] = s.click;
          for (let k = 0; k < 40 && !inside(x, y, .9); k++) { x += (CX - x) * .08; y += (CY - y) * .08; }
          clicks.push({ x, y, at: t + .45 });
          if (clicks.length > 3) clicks.shift();
        }
      }
      for (let i = clicks.length - 1; i >= 0; i--) if (t < clicks[i].at - 1 || t - clicks[i].at > LIFE) clicks.splice(i, 1);
      const k = Math.floor(t / PERIOD), drops = [];
      for (let j = k - 2; j <= k; j++) drops.push(auto(j));
      drops.push(...clicks);
      const live = drops.filter((d) => t > d.at && t - d.at < LIFE);
      // the height of the water, and how a slope facing us darkens it
      let slope = 0;
      const n = live.length, DX = live.map((d) => d.x), DY = live.map((d) => d.y), FRONT = live.map((d) => (t - d.at) * 46), DAMP = live.map((d) => Math.exp(-(t - d.at) / 6));
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
      // the clouds that reach a given line of water
      const sky = clouds.map(([x0, y0, w, h, p]) => [((x0 + t * (4 + p * 3)) % 900) - 150, y0, w, h, p * 9]);
      let row = [];
      const cloudRow = (y) => {
        row = [];
        const shimmer = .35 * Math.sin(y * .2 + t * .3);
        for (const [cx, y0, w, h, p] of sky) { const k = Math.exp(-(((y - y0) / h) ** 2)); if (k > .01) row.push(cx, w, k, p, shimmer); }
      };
      const cloud = (x) => {
        let v = 0;
        for (let i = 0; i < row.length; i += 5) { const dx = (x - row[i]) / row[i + 1]; if (dx < 3 && dx > -3) v += Math.exp(-dx * dx) * row[i + 2] * (1 + row[i + 4] * Math.sin(x * .09 + row[i + 3])); }
        return v;
      };
      g.lineCap = g.lineJoin = 'round';
      // the pavement around it, darker where it is wet
      g.fillStyle = c.ink;
      for (let b = 0; b < 3; b++) {
        g.globalAlpha = [.55, .35, .2][b];
        g.beginPath();
        for (const [x, y, size, rim] of grit) if ((rim < 1.12 ? 0 : rim < 1.35 ? 1 : 2) === b) dot(g, x, y, size);
        g.fill();
      }
      g.globalAlpha = .5;
      g.beginPath();
      for (const p of stones) p.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.fill();
      // the shore, and the wet ring around it
      g.globalAlpha = .85;
      g.lineWidth = 1.1;
      g.beginPath();
      border.forEach(([x, y], i) => { const dx = x - CX, dy = y - CY, q = 1 + .006 * Math.sin(i * .9 + t * .8); if (i) g.lineTo(CX + dx * q, CY + dy * q); else g.moveTo(CX + dx * q, CY + dy * q); });
      g.stroke();
      g.globalAlpha = .35;
      g.lineWidth = .5;
      g.beginPath();
      border.forEach(([x, y], i) => { const X = CX + (x - CX) * 1.045, Y = CY + (y - CY) * 1.06; if (i % 2) g.lineTo(X, Y); else g.moveTo(X, Y); });
      g.stroke();
      // the sky in the water, engraved: lines thicken where it is dark, vanish in the clouds, and every circle shades them
      const tones = [[], [], [], []];
      for (let i = 0; i < spans.length; i += 3) {
        const y = spans[i], x0 = spans[i + 1], x1 = spans[i + 2], depth = (y - (CY - H)) / (2 * H);
        cloudRow(y);
        let px = x0, py = y + wave(x0, y) * 5.5;
        for (let x = x0 + 4.5; x <= x1 + 4.4; x += 4.5) {
          const X = Math.min(x, x1), h = wave(X, y), Y = y + h * 5.5 + .5 * Math.sin(X * .05 + t * 1.1 + y * .3);
          const tone = .22 + .5 * depth - 1.1 * clamp(cloud(X + h * 8) - .25) + .85 * slope;
          const b = Math.floor(tone * 4.6);
          if (b >= 0) {
            // a stroke that continues the last one of the same weight extends it
            const list = tones[Math.min(3, b)], n = list.length;
            if (n && list[n - 2] === px && list[n - 1] === py) list.push(X, Y); else list.push(NaN, px, py, X, Y);
          }
          px = X; py = Y;
        }
      }
      tones.forEach((list, b) => {
        g.globalAlpha = [.4, .6, .78, .92][b];
        g.lineWidth = [.32, .5, .72, 1][b];
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) { if (Number.isNaN(list[i])) { i++; g.moveTo(list[i], list[i + 1]); } else g.lineTo(list[i], list[i + 1]); }
        g.stroke();
      });
      // the circles, crossing one another
      g.lineWidth = .7;
      for (const d of live) {
        const age = t - d.at;
        for (let j = 0; j < 5; j++) {
          const R = age * 46 - j * 17 - 4;
          if (R < 2) continue;
          const amp = Math.exp(-age / 5 - j * .3);
          g.globalAlpha = Math.min(.85, amp * 1.1);
          if (g.globalAlpha < .03) continue;
          g.beginPath();
          let open = false;
          const m = Math.max(24, Math.round(R * .7));
          for (let i = 0; i <= m; i++) {
            const a = (i / m) * TAU, q = R + 1.3 * Math.sin(a * 7 + t * 1.7 + j * 2);
            const x = d.x + q * Math.cos(a), y = d.y + q * SQ * Math.sin(a);
            if (!inside(x, y, .985)) { open = false; continue; }
            if (open) g.lineTo(x, y); else g.moveTo(x, y);
            open = true;
          }
          g.stroke();
        }
      }
      // a leaf rides the circles
      const lx = CX - 120 + 60 * Math.sin(t * .045), ly = CY + 52 + 18 * Math.sin(t * .06 + 1), lh = wave(lx, ly);
      const la = .5 + .25 * Math.sin(t * .07) + lh * .15, ca = Math.cos(la), sa = Math.sin(la), L = 26;
      const leaf = (u, side) => { const w = side * 8 * Math.sin(Math.PI * u) ** .9; return [lx + (u - .5) * L * ca - w * sa, ly + lh * 3 + ((u - .5) * L * sa + w * ca) * .7]; };
      g.globalAlpha = .9;
      g.lineWidth = .8;
      g.beginPath();
      for (const side of [-1, 1]) for (let i = 0; i <= 14; i++) { const [x, y] = leaf(i / 14, side); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      const [ax, ay] = leaf(0, 0), [bx, by] = leaf(1, 0);
      g.moveTo(ax - 5 * ca, ay - 5 * sa * .7); g.lineTo(bx, by);
      for (let i = 1; i < 6; i++) for (const side of [-1, 1]) { const [x0, y0] = leaf(i / 6, 0), [x1, y1] = leaf(i / 6 + .1, side * .75); g.moveTo(x0, y0); g.lineTo(x1, y1); }
      g.stroke();
      // the last pebble: falling, then resting under the water
      let last = null;
      for (const d of drops) if (t > d.at - .6 && (!last || d.at > last.at)) last = d;
      g.globalAlpha = 1;
      if (last) {
        const age = t - last.at;
        if (age < 0) {
          const f = 1 + age / .6, y = last.y - 220 * (1 - f * f);
          point(g, c, last.x, y, 4, 16);
        } else {
          // the splash
          if (age < .7) {
            g.fillStyle = c.ink;
            g.globalAlpha = 1 - age / .7;
            g.beginPath();
            for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + last.x, v = 30 + (i % 3) * 14; dot(g, last.x + Math.cos(a) * v * age, last.y + Math.sin(a) * v * SQ * age - (60 + (i % 4) * 20) * age + 160 * age * age, 1.1); }
            g.fill();
            g.globalAlpha = 1;
          }
          const h = wave(last.x + 6, last.y);
          point(g, c, last.x + h * 1.5, last.y + 4 + h * 2, 4.5 - 1.2 * smooth(0, 3, age), 26 * Math.exp(-age / 5) + 12);
        }
      }
    };
  },

  // A landscape dreamed line by line: a city becomes the sea, the sea a sleeping face, the face mountains.
  // What it was a moment ago rises into the sky and fades. The red point lives in every world without knowing it.
  dream() {
    const ROWS = 66, COLS = 150, STAGE = 9, r = rng(19);
    const hash = (a, b) => { const m = rng(a * 374761 + b * 668265 + 7); m(); return m(); };
    const blocks = new Float64Array(22 * 12).map((_, i) => hash(i % 22, Math.floor(i / 22)));
    const worlds = [
      // a city: blocks and streets, a few towers
      (u, z) => {
        const gu = (u + 1.1) * 7, gz = z * 8, fu = gu % 1, fz = gz % 1;
        if (fu < .16 || fu > .84 || fz < .2 || fz > .8) return 0;
        const h = blocks[(Math.floor(gz) % 12) * 22 + (Math.floor(gu) % 22)];
        return (.05 + .38 * h * h + (h > .88 ? .3 : 0)) * (1.1 - z * .45);
      },
      // the sea
      (u, z, t) => .16 + .1 * Math.sin(u * 7 + z * 16 - t * .9) + .05 * Math.sin(u * 15 - z * 11 + t * 1.3) + .04 * Math.sin(z * 31 + u * 3 - t * 1.7),
      // a face, asleep, lying under the sky: brow, closed eyes, nose, lips, chin
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
      // mountains
      (u, z) => {
        const m = 1 - Math.abs(Math.sin(u * 2.4 + .7 + z * .8)), n = 1 - Math.abs(Math.sin(u * 6.1 - z * 3.3 + 2));
        return (.62 * m * m + .2 * n * n) * (1.15 - z * .7) + .03 * Math.sin(u * 30 + z * 23);
      },
    ];
    const height = (u, z, t) => {
      const j = Math.floor(t / STAGE), p = t / STAGE - j;
      const A = worlds[((j % 4) + 4) % 4], B = worlds[(((j + 1) % 4) + 4) % 4];
      // the change sweeps in from the far side
      const f = smooth(0, 1, (p - .4) * 3.6 - z * .9 - .2 * u * u);
      return f <= 0 ? A(u, z, t) : f >= 1 ? B(u, z, t) : A(u, z, t) * (1 - f) + B(u, z, t) * f;
    };
    const project = (u, z, h) => [300 + u * (150 + 300 * z ** 1.2), 236 + 318 * z ** 1.35 - h * (70 + 150 * z)];
    const stars = Array.from({ length: 260 }, () => [r() * 600, r() ** 1.6 * 220, .3 + r() * .6]);
    const horizon = new Float64Array(COLS + 1), skyline = new Float64Array(COLS + 1);
    const HOME = [.16, .64];
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      g.fillStyle = c.ink;
      g.globalAlpha = .35;
      g.beginPath();
      for (const [x, y, s] of stars) dot(g, x, y, s);
      g.fill();
      // what it dreamed a moment ago: only its outline is left, rising and fading
      g.strokeStyle = c.ink;
      g.lineWidth = .5;
      for (let d = 5; d >= 1; d--) {
        const then = t - d * 1.7;
        skyline.fill(1e9);
        for (let row = ROWS - 1; row >= 0; row -= 5) {
          const z = row / (ROWS - 1);
          for (let col = 0; col <= COLS; col += 2) { const u = (col / COLS) * 2 - 1, y = project(u, z, height(u, z, then))[1]; if (y < skyline[col]) skyline[col] = y; }
        }
        g.globalAlpha = .6 * (1 - d / 6);
        g.beginPath();
        for (let col = 0; col + 2 <= COLS; col += 4) {
          const z = 0, u0 = (col / COLS) * 2 - 1, u1 = ((col + 2) / COLS) * 2 - 1;
          g.moveTo(project(u0, z, 0)[0] * (1 + d * .02) - d * 6, skyline[col] - d * 17);
          g.lineTo(project(u1, z, 0)[0] * (1 + d * .02) - d * 6, skyline[col + 2] - d * 17);
        }
        g.stroke();
      }
      // the world itself, drawn from the nearest line to the farthest; what is in front hides what is behind
      horizon.fill(1e9);
      const BANDS = 7, bands = Array.from({ length: BANDS }, () => []);
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
        // visible runs, as continuous lines: NaN starts a new one
        let open = false;
        for (let col = 0; col < COLS; col++) {
          const a = horizon[col] - ys[col], b = horizon[col + 1] - ys[col + 1];
          if (a <= 0 && b <= 0) { open = false; continue; }
          const k = a / (a - b), mx = xs[col] + (xs[col + 1] - xs[col]) * k, my = ys[col] + (ys[col + 1] - ys[col]) * k;
          if (!open) { if (a > 0) list.push(NaN, xs[col], ys[col]); else list.push(NaN, mx, my); }
          if (b > 0) { list.push(xs[col + 1], ys[col + 1]); open = true; } else { list.push(mx, my); open = false; }
        }
        for (let col = 0; col <= COLS; col++) if (ys[col] < horizon[col]) horizon[col] = ys[col];
      }
      bands.forEach((list, b) => {
        g.globalAlpha = .95 - b * .1;
        g.lineWidth = .75 - b * .06;
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) { if (Number.isNaN(list[i])) { i++; g.moveTo(list[i], list[i + 1]); } else g.lineTo(list[i], list[i + 1]); }
        g.stroke();
      });
      g.globalAlpha = 1;
      if (home) point(g, c, home[0], home[1] - 4, 4.5, 26);
    };
  },

  // A small point, a low light, and the immense shadow it throws on the wall, its trembling rings magnified.
  // Bring the pointer closer: the shadow returns to its true size.
  fear() {
    const PX = 300, PY = 476, FLOOR = 430, LX = 300, LY = 690, RINGS = 4, r = rng(17);
    const motes = Array.from({ length: 170 }, () => { const a = -Math.PI / 2 + (r() - .5) * 1.25, q = 140 + r() * 560; return [LX + q * Math.cos(a), LY + q * Math.sin(a), .3 + r() * .5, r() * TAU]; });
    let calm = 0;
    return (g, c, t, s) => {
      const near = s.x == null ? 0 : 1 - smooth(70, 320, Math.hypot(s.x - PX, s.y - PY));
      calm = ease(s, calm, near, .035);
      const size = (1 - .9 * calm) * (1 + .025 * Math.sin(t * 1.3) + .015 * Math.sin(t * 2.9 + 1));
      // the rings around the point, and their shadows, the same rings many times larger
      const rings = Array.from({ length: RINGS }, (_, i) => (9 + 3.2 * i) * (1 - calm) + (16 + 15 * i) * calm + .7 * Math.sin(t * 2.2 + i * 2.1) * (1 - calm));
      const rx = 112 * size, ry = 146 * size, cx = PX + 10 * Math.sin(t * .21) * size, cy = FLOOR - ry * .9, band = 6 + 9 * size;
      const edge = (a) => 1 + .022 * Math.sin(5 * a + t * .9) + .014 * Math.sin(11 * a - t * 1.7) + .007 * Math.sin(23 * a + t * 3.1);
      const scales = rings.map((q) => q / 5.5), half = band / 2 / rx;
      // 0: lit, 1: inside the shadow of the point, 2: inside the shadow of a ring
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
      // the light: strongest low and in the middle, fading up the wall and to the sides
      const light = (x, y) => Math.exp(-(((x - LX) / 290) ** 2) - (((FLOOR - y) / 330) ** 2));
      g.lineCap = 'butt';
      g.strokeStyle = c.ink;
      // the wall, engraved in horizontal strokes, brighter where the light falls; the shadows cut them
      const tones = [[], [], [], [], []];
      // consecutive strokes of the same weight on a line become one
      const lay = (b, x0, y0, x1, y1) => {
        const list = tones[b], n = list.length;
        if (n && list[n - 2] === x0 && list[n - 1] === y0 && y0 === y1) list[n - 2] = x1;
        else list.push(x0, y0, x1, y1);
      };
      for (let y = 6; y < FLOOR - 1; y += 3.2) {
        const wob = .3 * Math.sin(y * 1.7);
        for (let x = 0; x < 600; x += 4.5) {
          if (shade(x + 2.25, y)) continue;
          const b = Math.floor(light(x + 2.25, y) * (1 + .12 * Math.sin(x * .05 + y * .9)) * 5.6 - .4);
          if (b >= 0) lay(Math.min(4, b), x, y + wob, x + 4.5, y + wob);
        }
      }
      // the floor, lit from in front; the shadow runs from the point to the foot of the wall
      const foot = rx * Math.sqrt(Math.max(0, 1 - ((FLOOR - cy) / ry) ** 2));
      for (let k = 0; k < 22; k++) {
        const y = FLOOR + 3 + 168 * (k / 21) ** 1.5, f = (y - FLOOR) / (PY - FLOOR), sw = f < 1 ? foot * (1 - f) + 5 * f : 0;
        for (let x = 0; x < 600; x += 4.5) {
          if (sw && Math.abs(x + 2.25 - (cx + (PX - cx) * f)) < sw) continue;
          const b = Math.floor(Math.exp(-(((x - LX) / 300) ** 2)) * (.45 + .55 * (y - FLOOR) / 170) * 5.2 - .4);
          if (b >= 0) lay(Math.min(4, b), x, y, x + 4.5, y);
        }
      }
      tones.forEach((list, b) => {
        g.globalAlpha = [.16, .26, .38, .5, .64][b];
        g.lineWidth = [.4, .5, .6, .7, .8][b];
        g.beginPath();
        for (let i = 0; i < list.length; i += 4) { g.moveTo(list[i], list[i + 1]); g.lineTo(list[i + 2], list[i + 3]); }
        g.stroke();
      });
      g.lineCap = g.lineJoin = 'round';
      // inside the great shadow, a fine crossing hatch
      g.globalAlpha = .12;
      g.lineWidth = .4;
      g.beginPath();
      for (const dir of [-1, 1]) for (let k = -60; k < 60; k++) {
        let open = false;
        for (let y = cy - ry * 1.1; y <= FLOOR; y += 4) {
          const x = cx + k * 5.5 + dir * (y - cy) * .9;
          if (Math.hypot((x - cx) / rx, (y - cy) / ry) < .955 - 3 / rx) { if (open) g.lineTo(x, y); else g.moveTo(x, y); open = true; } else open = false;
        }
      }
      g.stroke();
      // the rays that graze the point and carry its outline up the wall
      g.globalAlpha = .08;
      g.lineWidth = .5;
      g.beginPath();
      for (let i = -10; i <= 10; i++) { const ex = PX + i * 31; g.moveTo(PX + i * 2, PY + 30); g.lineTo(ex, FLOOR - 6 - Math.abs(i) * 6); }
      g.stroke();
      g.globalAlpha = .35;
      g.beginPath();
      for (const side of [-1, 1]) { g.moveTo(PX + side * 5, PY - 5); g.lineTo(cx + side * rx * edge(side > 0 ? 0 : Math.PI), cy); }
      g.stroke();
      // dust in the beam
      g.fillStyle = c.ink;
      g.globalAlpha = .45;
      g.beginPath();
      for (const [x, y, sz, p] of motes) { const X = x + 3 * Math.sin(t * .2 + p), Y = y + 4 * Math.sin(t * .13 + p * 2); if (!shade(X, Y)) dot(g, X, Y, sz); }
      g.fill();
      // the trembling outlines: the shadow of the point, three times, and the edges of the ring shadows
      const outline = (scale, grow, wobble) => {
        g.beginPath();
        let open = false;
        for (let k = 0; k <= 180; k++) {
          const a = (k / 180) * TAU, q = edge(a) * scale + grow / rx + wobble * Math.sin(a * 17 + t * 2.4) / rx;
          const x = cx + rx * q * Math.cos(a), y = cy + ry * q * Math.sin(a);
          if (y > FLOOR) { open = false; continue; }
          if (open) g.lineTo(x, y); else g.moveTo(x, y);
          open = true;
        }
        g.stroke();
      };
      for (let pass = 0; pass < 3; pass++) {
        g.globalAlpha = [.8, .3, .14][pass];
        g.lineWidth = [.8, .5, .5][pass];
        outline(1, pass * 3.5, .8);
      }
      g.lineWidth = .5;
      rings.forEach((q, i) => {
        g.globalAlpha = .4 - i * .06;
        outline(q / 5.5, -band / 2, .5);
        outline(q / 5.5, band / 2, .5);
      });
      // where floor meets wall
      g.globalAlpha = .7;
      g.lineWidth = .8;
      g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(600, FLOOR); g.stroke();
      // the rings it keeps around itself: tight and trembling, they loosen when someone comes near
      g.lineWidth = .7;
      rings.forEach((rad, i) => {
        g.globalAlpha = (.8 - i * .12) * (1 - .6 * calm);
        g.beginPath();
        for (let k = 0; k <= 48; k++) { const a = (k / 48) * TAU, x = PX + rad * Math.cos(a), y = PY + rad * .42 * Math.sin(a); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      });
      g.globalAlpha = 1;
      point(g, c, PX, PY - 5, 5.5, 22);
    };
  },

  // One point in a vast space, linked by faint threads to others that come and go. Sometimes all are there at once.
  alone() {
    const r = rng(37), N = 16, ONE = 36;
    const others = Array.from({ length: N }, (_, i) => ({ a: (i / N) * TAU + r() * .3, q: 175 + r() * 105, P: 15 + r() * 14, p: r(), v: (r() - .5) * .02 }));
    const specks = Array.from({ length: 140 }, () => { const q = 292 * Math.sqrt(r()), a = r() * TAU; return [300 + q * Math.cos(a), 300 + q * Math.sin(a), .35 + r() * .4]; });
    // the pointer is a presence too: a thread reaches toward it
    let presence = 0, hx = 300, hy = 300;
    return (g, c, t, s) => {
      const near = s.x != null;
      if (near) { hx = presence ? ease(s, hx, s.x, .08) : s.x; hy = presence ? ease(s, hy, s.y, .08) : s.y; }
      presence = ease(s, presence, near ? 1 : 0, .04);
      if (presence < .002 && !near) presence = 0;
      const u = (t % ONE) / ONE, together = smooth(.74, .84, u) * (1 - smooth(.92, 1, u));
      const pos = others.map((o) => {
        const a = o.a + o.v * t, on = Math.sin(Math.PI * ((t / o.P + o.p) % 1)) ** 6;
        return [300 + o.q * Math.cos(a), 300 + o.q * Math.sin(a), Math.max(on, together)];
      });
      g.lineCap = 'round';
      g.fillStyle = c.ink;
      g.globalAlpha = .3;
      g.beginPath();
      for (const [x, y, size] of specks) dot(g, x, y, size);
      g.fill();
      g.strokeStyle = c.ink;
      g.lineWidth = .45;
      if (together > .01) {
        g.globalAlpha = .25 * together;
        g.beginPath();
        pos.forEach(([x, y], i) => { const [nx, ny] = pos[(i + 1) % N]; g.moveTo(x, y); g.lineTo(nx, ny); });
        g.stroke();
      }
      for (const [x, y, v] of pos) {
        if (v < .01) continue;
        g.globalAlpha = .45 * v;
        g.beginPath(); g.moveTo(300, 300); g.lineTo(x, y); g.stroke();
      }
      for (const [x, y, v] of pos) {
        g.globalAlpha = .16 + .8 * v;
        g.beginPath(); dot(g, x, y, 1.5 + 1.3 * v); g.fill();
      }
      if (presence > .01) {
        g.globalAlpha = .5 * presence;
        g.lineWidth = .6;
        g.beginPath(); g.moveTo(300, 300); g.lineTo(hx, hy); g.stroke();
        g.beginPath(); dot(g, hx, hy, 4); g.stroke();
      }
      g.globalAlpha = 1;
      point(g, c, 300, 300, 5.5, 34);
    };
  },

  // A harmonic figure that never quite closes, until for a moment it does, perfectly.
  beauty() {
    const TURNS = 7, PTS = 300, PERIOD = 26, R = 232;
    return (g, c, t) => {
      const u = (t % PERIOD) / PERIOD;
      const hold = smooth(.6, .66, u) * (1 - smooth(.9, .98, u));
      const delta = (.011 + .004 * Math.sin(t * .23)) * (1 - hold), phase = .45 * Math.sin(t * .07) * (1 - hold);
      const v0 = t * .012, a0 = v0 * TAU;
      const at = (v) => {
        const a = v * TAU, b = -4 * a + phase + delta * (a - a0) * 4;
        return [300 + R * (.6 * Math.sin(a) + .4 * Math.sin(b)), 300 - R * (.6 * Math.cos(a) + .4 * Math.cos(b))];
      };
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      g.lineWidth = .5;
      for (let n = 0; n < TURNS; n++) {
        g.globalAlpha = .12 + .2 * (n / (TURNS - 1));
        g.beginPath();
        for (let i = 0; i <= PTS; i++) { const [x, y] = at(v0 - TURNS / 2 + n + i / PTS); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      if (hold > .01) {
        g.globalAlpha = .85 * hold;
        g.lineWidth = 1.1;
        g.beginPath();
        for (let i = 0; i <= PTS * 2; i++) { const [x, y] = at(v0 + i / (PTS * 2)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
      const [px, py] = at(v0 + TURNS / 2);
      point(g, c, px, py, 4.5 + 1.5 * hold, 24 + 16 * hold);
    };
  },

  // A rope of many fibres, tied in a knot. The knot loosens, then gives way thread by thread,
  // until the threads lie free, still faintly marked where they were held. Then another knot is tied.
  mend() {
    const PERIOD = 48, FIBRES = 48, DS = 4, r = rng(66);
    const fibres = Array.from({ length: FIBRES }, (_, f) => ({ strand: f % 3, a: r() * TAU, q: 1 + r() * 4.4, at: 0, spread: 0, wave: r() * TAU, dir: r() < .5 }));
    // they give way one after another, strand by strand
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
      // resampled every DS pixels
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
    return (g, c, t) => {
      const k = Math.floor(t / PERIOD), u = t / PERIOD - k;
      const fade = smooth(0, .04, u) * (1 - smooth(.95, 1, u));
      const loose = smooth(.04, .3, u), S = 60 + 22 * loose;
      const P = centre(S, 6 * Math.sin(t * .13)), M = P.length;
      const normal = P.map((_, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(M - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; });
      // where the rope crosses itself, the strand that passes under is hidden; crossings alternate over and under
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
      g.lineCap = g.lineJoin = 'round';
      const front = [[], []], back = [[], []];
      // shared along the rope: the turn of the three strands, the twist of the fibres, the shape of the loose threads
      const strandC = [0, 1, 2].map((k) => Float64Array.from({ length: M }, (_, i) => Math.cos((k * TAU) / 3 + i * DS * .1)));
      const strandS = [0, 1, 2].map((k) => Float64Array.from({ length: M }, (_, i) => Math.sin((k * TAU) / 3 + i * DS * .1)));
      const twistC = Float64Array.from({ length: M }, (_, i) => Math.cos(i * DS * .23)), twistS = Float64Array.from({ length: M }, (_, i) => Math.sin(i * DS * .23));
      const V = Float64Array.from({ length: M }, (_, i) => i / (M - 1));
      const MID = V.map((v) => Math.exp(-(((v - .5) / .13) ** 2))), ARC = V.map((v) => Math.sin(Math.PI * v));
      const crimpC = V.map((v) => Math.cos(v * 34)), crimpS = V.map((v) => Math.sin(v * 34)), driftC = V.map((v) => Math.cos(v * 7 + t * .05)), driftS = V.map((v) => Math.sin(v * 7 + t * .05));
      for (let f = 0; f < FIBRES; f++) {
        // a thread is drawn out of the rope from one end to the other
        const fb = fibres[f], pull = clamp((u - fb.at) / .08), sc = strandC[fb.strand], ss = strandS[fb.strand];
        const ca = Math.cos(fb.a), sa = Math.sin(fb.a), cw = Math.cos(fb.wave), sw = Math.sin(fb.wave);
        let open = false, lastList = null;
        for (let i = 0; i < M; i++) {
          // cos(a - l), sin(a - l) from the shared tables
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
          if (free < .5 && under[i]) { open = false; continue; }
          const side = depth > 0 || free > .5 ? 0 : 1, list = (side ? back : front)[lane];
          if (open && list === lastList) list.push(x, y);
          else {
            if (open) lastList.push(x, y);
            list.push(NaN, x, y);
          }
          open = true; lastList = list;
        }
      }
      const draw = (list, alpha, width, colour) => {
        g.strokeStyle = colour;
        g.globalAlpha = alpha * fade;
        g.lineWidth = width;
        g.beginPath();
        for (let i = 0; i < list.length; i += 2) {
          if (Number.isNaN(list[i])) { i++; g.moveTo(list[i], list[i + 1]); } else g.lineTo(list[i], list[i + 1]);
        }
        g.stroke();
      };
      // where the knot was, its trace remains, faintly
      if (hold < 1) {
        g.strokeStyle = c.ink;
        g.globalAlpha = .2 * (1 - hold) * fade;
        g.lineWidth = .5;
        g.beginPath();
        for (let i = 0; i + 2 < M; i += 4) if (!under[i]) { g.moveTo(P[i][0], P[i][1]); g.lineTo(P[i + 2][0], P[i + 2][1]); }
        g.stroke();
      }
      draw(back[0], .3, .45, c.ink);
      draw(back[1], .3, .4, c.ink);
      draw(front[1], .7, .5, c.ink);
      draw(front[0], .92, .55, c.ink);
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      // the heart of the knot: what was held there, smaller as the threads let go
      const settle = smooth(.15, 0, hold);
      point(g, c, 300 + 6 * Math.sin(t * .13) * (1 - settle), 262 + 88 * settle, (2.8 + 3.2 * hold) * (.3 + .7 * fade), 18 + 22 * hold);
    };
  },

  // A line of life thins out and ends; what it was drifts away and becomes part of a wider field.
  death() {
    const r = rng(61), END = 316, Y = 300, L = 24, golden = Math.PI * (3 - Math.sqrt(5));
    const field = Array.from({ length: 1200 }, (_, i) => { const q = 288 * Math.sqrt((i + .5) / 1200), a = i * golden; return [300 + q * Math.cos(a), 300 + q * Math.sin(a), .45 + r() * .45, r() * TAU]; });
    const dust = Array.from({ length: 420 }, () => ({ to: field[Math.floor(r() * field.length)], off: r(), curl: r() * 2 - 1 }));
    const life = (x, t) => Y + 16 * Math.sin(x * .021 - t * .25) * smooth(20, 140, x) + 5 * Math.sin(x * .07 + t * .4);
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      g.fillStyle = c.ink;
      g.globalAlpha = .22;
      g.beginPath();
      for (const [x, y, size, w] of field) dot(g, x + .7 * Math.sin(t * .3 + w), y + .7 * Math.cos(t * .27 + w), size);
      g.fill();
      // the life, thinner as it goes
      const X0 = 22, BANDS = 12;
      g.strokeStyle = c.ink;
      for (let b = 0; b < BANDS; b++) {
        const k = b / (BANDS - 1), xa = X0 + ((END - X0) * b) / BANDS, xb = X0 + ((END - X0) * (b + 1)) / BANDS;
        g.globalAlpha = .9 - .35 * k;
        g.lineWidth = .3 + 2.8 * (1 - k) ** 1.3;
        g.beginPath();
        for (let i = 0; i <= 12; i++) { const x = xa + ((xb - xa) * i) / 12; if (i) g.lineTo(x, life(x, t)); else g.moveTo(x, life(x, t)); }
        g.stroke();
      }
      // its dust leaves the end and settles among the others
      const ey = life(END, t), groups = [[], [], [], []];
      for (const d of dust) {
        const f = (t / L + d.off) % 1, e = 1 - (1 - f) ** 2.4, swirl = d.curl * 46 * Math.sin(Math.PI * e);
        const [tx, ty, size] = d.to, dx = tx - END, dy = ty - ey, n = Math.hypot(dx, dy) || 1;
        groups[Math.min(3, Math.floor(f * 4))].push(END + dx * e - (dy / n) * swirl, ey + dy * e + (dx / n) * swirl, 1.2 + (size - 1.2) * f);
      }
      groups.forEach((list, b) => {
        g.globalAlpha = .85 - b * .17;
        g.beginPath();
        for (let i = 0; i < list.length; i += 3) dot(g, list[i], list[i + 1], list[i + 2]);
        g.fill();
      });
      g.globalAlpha = 1;
      point(g, c, END, ey, 4, 28);
    };
  },

  // Leaves fall, lie down and become ground; from that ground, something rises.
  leaves() {
    const PERIOD = 30, GROUND = 474, N = 13, r = rng(83);
    const humus = Array.from({ length: 80 }, () => [40 + r() * 520, GROUND + 9 + r() ** 1.6 * 80, 3 + r() * 9, r() * .4 - .2]);
    const leafAt = (k, i) => {
      const m = rng(k * 211 + i * 7 + 1); m();
      return { x: 60 + m() * 480, start: (i / N) * .55 + m() * .05, dur: .17 + m() * .08, sway: 18 + m() * 28, w: 1.4 + m() * 1.1, rot: m() * TAU, size: 14 + m() * 8, lie: m() < .5 ? 0 : Math.PI, ph: m() * TAU };
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
    return (g, c, t) => {
      const k = Math.floor(t / PERIOD), u = (t % PERIOD) / PERIOD;
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      // the ground, made of all the leaves that came before
      g.globalAlpha = .7;
      g.lineWidth = .9;
      g.beginPath(); g.moveTo(24, GROUND); g.lineTo(576, GROUND); g.stroke();
      g.globalAlpha = .32;
      g.lineWidth = .6;
      g.beginPath();
      for (const [x, y, len, tilt] of humus) { g.moveTo(x - len, y - tilt * len); g.lineTo(x + len, y + tilt * len); }
      g.stroke();
      g.lineWidth = .8;
      for (let i = 0; i < N; i++) {
        const L = leafAt(k, i), f = (u - L.start) / L.dur;
        if (f < 0) continue;
        const swing = Math.min(f, 1) * L.w * TAU + L.ph, x = L.x + L.sway * Math.sin(swing);
        const fall = L.rot + .8 * Math.sin(swing + 1), settle = smooth(1, 1.35, f);
        const y = f < 1 ? -30 + (GROUND - 4 + 30) * f : GROUND - 4 + 6 * smooth(.72, .97, u);
        g.globalAlpha = .85 * (1 - smooth(.72, .97, u));
        if (g.globalAlpha < .01) continue;
        g.beginPath(); leaf(g, x, y, fall + (L.lie - fall) * settle, L.size, settle); g.stroke();
      }
      // a seed below the ground becomes a sprout
      const grow = smooth(.36, .9, u), open = smooth(.62, .92, u), gone = 1 - smooth(.95, 1, u);
      const top = GROUND + 12 - 170 * grow;
      const stem = (v) => [300 + 9 * Math.sin(v * 2.6) * grow, GROUND + 12 - (GROUND + 12 - top) * v];
      if (grow > .005) {
        g.globalAlpha = .9 * gone;
        g.lineWidth = 1.1;
        g.beginPath();
        for (let i = 0; i <= 20; i++) { const [x, y] = stem(i / 20); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
        if (open > .01) {
          const [x, y] = stem(1);
          g.lineWidth = .9;
          g.beginPath();
          leaf(g, x - 15 * open * Math.cos(.5 * open), y - 15 * open * Math.sin(.5 * open) + 2, Math.PI + .5 * open, 13 * open, 0);
          leaf(g, x + 15 * open * Math.cos(.5 * open), y - 15 * open * Math.sin(.5 * open) + 2, -.5 * open, 13 * open, 0);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      const [sx, sy] = stem(1);
      point(g, c, sx, sy, (3 + 1.5 * grow) * (.4 + .6 * gone), 22 + 8 * grow);
    };
  },

  // Converging from very different directions, by very different ways, toward the same point.
  passers() {
    const PTS = 150;
    const paths = [[0, 0, .5], [5, 14, .5], [2, 26, .5], [9, 7, .5], [3.5, 18, .5], [1.4, 22, .5]].map(([f, amp, bend], i) => ({ a: -Math.PI / 2 + (i * TAU) / 6 + .25, f, amp, bend, ph: i * 1.3, off: i * .17 }));
    const at = (p, s) => {
      const q = 286 * (1 - s), a = p.a + p.bend * (1 - s) ** 2, lat = p.amp * Math.sin(p.f * s * Math.PI + p.ph) * (1 - s) ** .7;
      return [300 + q * Math.cos(a) - lat * Math.sin(a), 300 + q * Math.sin(a) + lat * Math.cos(a)];
    };
    const pts = paths.map((p) => Array.from({ length: PTS + 1 }, (_, i) => at(p, i / PTS)));
    const normal = (list, i) => { const a = list[Math.max(0, i - 1)], b = list[Math.min(PTS, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; };
    const run = (g, list, from, to, dx = 0, dy = 0, side = 0) => {
      for (let i = from; i <= to; i++) { const [nx, ny] = side ? normal(list, i) : [0, 0], x = list[i][0] + nx * side + dx, y = list[i][1] + ny * side + dy; if (i > from) g.lineTo(x, y); else g.moveTo(x, y); }
    };
    // six manners of walking: plain, in steps, doubled, broken, measured, beaded
    const styles = [
      (g, l) => { g.lineWidth = 1.1; g.beginPath(); run(g, l, 0, PTS); g.stroke(); },
      (g, l) => { g.beginPath(); for (let i = 0; i < PTS; i += 4) dot(g, l[i][0], l[i][1], .95); g.fill(); },
      (g, l) => { g.lineWidth = .5; g.beginPath(); run(g, l, 0, PTS, 0, 0, 2.6); run(g, l, 0, PTS, 0, 0, -2.6); g.stroke(); },
      (g, l) => { g.lineWidth = .9; g.beginPath(); for (let i = 0; i < PTS; i += 7) run(g, l, i, Math.min(PTS, i + 4)); g.stroke(); },
      (g, l) => { g.lineWidth = .5; g.beginPath(); run(g, l, 0, PTS); for (let i = 3; i < PTS; i += 6) { const [nx, ny] = normal(l, i), q = 5 * (1 - i / PTS) + 1.5; g.moveTo(l[i][0] - nx * q, l[i][1] - ny * q); g.lineTo(l[i][0] + nx * q, l[i][1] + ny * q); } g.stroke(); },
      (g, l) => { g.lineWidth = .45; g.beginPath(); run(g, l, 0, PTS); for (let i = 5; i < PTS - 6; i += 11) dot(g, l[i][0], l[i][1], 2.6 * (1 - i / PTS) + .8); g.stroke(); },
    ];
    return (g, c, t) => {
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = g.fillStyle = c.ink;
      pts.forEach((list, i) => { g.globalAlpha = .75; styles[i](g, list); });
      // those who walk them, all going the same way
      g.beginPath();
      paths.forEach((p) => {
        for (let m = 0; m < 2; m++) {
          const s = (t * .028 + p.off + m / 2) % 1, [x, y] = at(p, s);
          if (s < .9) dot(g, x, y, 2);
        }
      });
      g.globalAlpha = .9;
      g.fill();
      g.globalAlpha = .3;
      g.lineWidth = .5;
      g.beginPath(); g.arc(300, 300, 24, 0, TAU); g.stroke();
      g.globalAlpha = 1;
      point(g, c, 300, 300, 6, 36);
    };
  },

  // A flame handed on from one to the next: each carrier fades once it has passed it on.
  relay() {
    const P = 4.6, GAP = 132, BASE = 522;
    const cupY = (j) => 300 + 50 * Math.sin(j * 1.9) + 18 * Math.sin(j * 4.1);
    return (g, c, t) => {
      const k = Math.floor(t / P), u = (t % P) / P, fly = smooth(.3, .8, u);
      const X = (j) => 300 + (j - k - u) * GAP;
      const strength = (j) => {
        if (j > k + 1) return .3 * (1 - smooth(1.2, 3, j - k - u));
        if (j === k + 1) return .3 + .7 * fly;
        return Math.exp(-Math.max(0, t - (j + .8) * P) / 4);
      };
      const flame = (j) => [X(j), cupY(j) - 7];
      const arcAt = (j, f) => { const [ax, ay] = flame(j), [bx, by] = flame(j + 1); return [ax + (bx - ax) * f, ay + (by - ay) * f - 70 * 4 * f * (1 - f)]; };
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = g.fillStyle = c.ink;
      g.globalAlpha = .5;
      g.lineWidth = .6;
      g.beginPath(); g.moveTo(20, BASE); g.lineTo(580, BASE); g.stroke();
      // where it went: the arcs of earlier passages
      for (let j = k - 3; j < k; j++) {
        g.globalAlpha = .4 * strength(j);
        g.beginPath();
        for (let i = 1; i < 18; i++) { const [x, y] = arcAt(j, i / 18); dot(g, x, y, .8); }
        g.fill();
      }
      for (let j = k - 3; j <= k + 3; j++) {
        const x = X(j), y = cupY(j);
        if (x < -40 || x > 640) continue;
        g.globalAlpha = .9 * strength(j);
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y, 17, .08 * Math.PI, .92 * Math.PI);
        g.moveTo(x, y + 17); g.lineTo(x, BASE - 8);
        g.moveTo(x - 9, BASE - 8); g.lineTo(x + 9, BASE - 8);
        g.stroke();
      }
      const [px, py] = u < .3 ? flame(k) : u > .8 ? flame(k + 1) : arcAt(k, fly);
      // the flame itself
      g.strokeStyle = c.mark;
      g.globalAlpha = .8;
      g.lineWidth = .9;
      g.beginPath();
      const sway = 1.6 * Math.sin(t * 7) + 1.2 * Math.sin(t * 11.3);
      for (const side of [1, -1]) for (let i = 0; i <= 10; i++) {
        const v = i / 10, x = px + side * 6 * Math.sin(Math.PI * v) ** .8 * (1 - .45 * v) + sway * v * v, y = py - 4 - v * 22;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
      g.globalAlpha = 1;
      g.strokeStyle = c.ink;
      point(g, c, px, py, 4.5, 26);
    };
  },

  // A knot seen up close, loosening slowly until the rope lies open around the point it held.
  knot() {
    const N = 360, PERIOD = 30, W = 7;
    return (g, c, t) => {
      const u = (t % PERIOD) / PERIOD, loose = smooth(.15, .72, u), fade = smooth(0, .05, u) * (1 - smooth(.9, .99, u));
      const A = 2 - 1.75 * loose, S = 232 / (1 + A), rot = .12 * Math.sin(t * .1) - Math.PI / 2, ca = Math.cos(rot), sa = Math.sin(rot);
      const P = [], Z = [];
      for (let i = 0; i < N; i++) {
        const s = (i / N) * TAU, x = Math.sin(s) + A * Math.sin(2 * s), y = Math.cos(s) - A * Math.cos(2 * s);
        P.push([300 + S * (x * ca - y * sa), 300 + S * (x * sa + y * ca)]);
        Z.push(-Math.sin(3 * s));
      }
      // where the rope passes under itself, it is hidden
      const hide = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const [ax, ay] = P[i], [bx, by] = P[(i + 1) % N];
        for (let j = i + 3; j < N; j++) {
          if (i + N - j < 3) continue;
          const [cx, cy] = P[j], [dx, dy] = P[(j + 1) % N];
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (!den) continue;
          const p = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, q = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          if (p < 0 || p > 1 || q < 0 || q > 1) continue;
          const under = Z[i] < Z[j] ? i : j, len = Math.hypot(P[(under + 1) % N][0] - P[under][0], P[(under + 1) % N][1] - P[under][1]) || 1;
          const m = Math.ceil((W * 1.1) / len);
          for (let d = -m; d <= m; d++) hide[(under + d + N) % N] = 1;
        }
      }
      const normal = (i) => { const a = P[(i + N - 1) % N], b = P[(i + 1) % N], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d]; };
      let first = hide.indexOf(1);
      if (first < 0) first = 0;
      g.lineCap = g.lineJoin = 'round';
      g.strokeStyle = c.ink;
      g.globalAlpha = .9 * fade;
      g.lineWidth = 1;
      g.beginPath();
      for (const side of [W / 2, -W / 2]) {
        let open = false;
        for (let n = 0; n <= N; n++) {
          const i = (first + n) % N;
          if (hide[i]) { open = false; continue; }
          const [nx, ny] = normal(i), x = P[i][0] + nx * side, y = P[i][1] + ny * side;
          if (open) g.lineTo(x, y); else g.moveTo(x, y);
          open = true;
        }
      }
      g.stroke();
      // the twist of the rope
      g.globalAlpha = .4 * fade;
      g.lineWidth = .5;
      g.beginPath();
      for (let i = 0; i < N; i += 4) {
        const j = (i + 2) % N;
        if (hide[i] || hide[j]) continue;
        const [nx, ny] = normal(i), [mx, my] = normal(j);
        g.moveTo(P[i][0] - nx * W * .4, P[i][1] - ny * W * .4); g.lineTo(P[j][0] + mx * W * .4, P[j][1] + my * W * .4);
      }
      g.stroke();
      g.globalAlpha = 1;
      point(g, c, 300, 300, (3.5 + 2 * loose) * (.4 + .6 * fade), 18 + 22 * loose);
    };
  },
};

// The frame used when the motion is stopped, and in the books.
export const FROZEN = { source: 48, fractal: 18, void: 21, nested: 0, lives: 21, time: 6.2, worlds: 21, knowing: 60, balance: 3, field: 7, drop: 18.4, forms: 21, useful: 12.5, why: 21, river: 9, forgetting: 121, birth: 25.5, kin: 6, choice: 13, love: 30, days: 752, silence: 12, emerge: 25, zoom: 7, pages: 22, map: 44, ripple: 9.5, water: 9, gesture: 52, body: 3.3, play: 24, dream: 15.5, fear: 6, alone: 30, beauty: 17, mend: 26, death: 12, leaves: 25.5, passers: 6, relay: 8, knot: 12 };

export function createScene(name, labels = {}, options = {}) {
  return factories[name](labels, options);
}
