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

  // Two trees unfold from the point and return. The pointer opens or closes their angle.
  fractal(labels) {
    const DEPTH = 11;
    let spread = .5;
    return (g, c, t, s) => {
      const target = s.x == null ? .5 + .05 * Math.sin(t / 7) : .22 + .5 * (s.x / 600);
      spread = ease(s, spread, target, .06);
      const grown = (.48 + .52 * (.5 + .5 * Math.cos((t / 18) * TAU))) * (DEPTH + 1);
      const levels = Array.from({ length: DEPTH + 1 }, () => []);
      const grow = (x, y, angle, length, level) => {
        const f = Math.min(1, grown - level);
        if (f <= 0) return;
        const nx = x + length * f * Math.cos(angle), ny = y + length * f * Math.sin(angle);
        levels[level].push(x, y, nx, ny);
        if (level < DEPTH && f === 1) { grow(nx, ny, angle - spread, length * .745, level + 1); grow(nx, ny, angle + spread, length * .745, level + 1); }
      };
      grow(300, 300, -Math.PI / 2, 66, 0);
      grow(300, 300, Math.PI / 2, 66, 0);
      g.lineCap = 'round';
      levels.forEach((line, level) => {
        const k = level / DEPTH;
        g.strokeStyle = c.mix(Math.min(1, k * 2.3));
        g.globalAlpha = 1 - k * .3;
        g.lineWidth = Math.max(.24, 2.5 * .77 ** level);
        g.beginPath();
        for (let i = 0; i < line.length; i += 4) { g.moveTo(line[i], line[i + 1]); g.lineTo(line[i + 2], line[i + 3]); }
        g.stroke();
      });
      g.globalAlpha = 1;
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
};

// The frame used when the motion is stopped, and in the books.
export const FROZEN = { source: 48, fractal: 36, void: 21, nested: 0, lives: 21, time: 6.2, worlds: 21, knowing: 60, balance: 3, field: 7, drop: 18.4, forms: 21, useful: 12.5, why: 21 };

export function createScene(name, labels = {}, options = {}) {
  return factories[name](labels, options);
}
