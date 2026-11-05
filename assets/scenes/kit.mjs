// Shared drawing kit for every figure: maths, the old ink helpers, and the light helpers (additive glow, sparks, spectra).
// Works in the browser (canvas) and in Node (the PDF recorder, which sets g.isRecorder and has no images or blend modes).
export const TAU = Math.PI * 2;

export const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
export const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const dot = (g, x, y, r) => { g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); };
export const ease = (s, current, goal, k) => (s.snap ? goal : current + (goal - current) * k);

/* ---------- Colour ---------- */
const hex = (h) => (h.startsWith('#') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : h.match(/[\d.]+/g).slice(0, 3).map(Number));
export const mixRGB = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
const rgb = (v) => `rgb(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])})`;
const ramp = (stops, n, cyclic) => Array.from({ length: n }, (_, i) => {
  const u = (i / (cyclic ? n : n - 1)) * (cyclic ? stops.length : stops.length - 1);
  const k = Math.floor(u) % stops.length;
  return rgb(mixRGB(stops[k], stops[(k + 1) % stops.length], u - Math.floor(u)));
});
const pick = (table, u, cyclic) => {
  const n = table.length;
  if (cyclic) return table[((Math.round(u * n) % n) + n) % n];
  return table[Math.round(clamp(u) * (n - 1))];
};
// The banner's spectrum (cyclic), and two ramps that end in white: embers and cold light.
export const SPECTRUM = ['#ff5a3a', '#ff9440', '#ffd35a', '#7be08f', '#45cfff', '#5d7cff', '#b46bff', '#ff5fae'].map(hex);
export const HEAT = ['#3a0a12', '#a3142a', '#ff5a3a', '#ff9440', '#ffd35a', '#fff6e6'].map(hex);
export const COOL = ['#0c1030', '#2a2f8a', '#5d7cff', '#45cfff', '#b8f0ff', '#f4fbff'].map(hex);
const TABLES = { hue: ramp(SPECTRUM, 256, true), heat: ramp(HEAT, 128), cool: ramp(COOL, 128) };

// colors handed to every scene. ink: light text colour; mark: the ember; mix(t): mark → ink;
// hue(u): cyclic spectrum; heat(u), cool(u): dark → white ramps; bg: the night behind the figure.
export function makeColors(ink, mark, bg = '#07080c') {
  const a = hex(mark), b = hex(ink);
  const table = Array.from({ length: 17 }, (_, i) => rgb(mixRGB(a, b, i / 16)));
  return {
    ink: rgb(b), mark: rgb(a), bg,
    mix: (t) => table[Math.round(clamp(t) * 16)],
    hue: (u) => pick(TABLES.hue, u, true),
    heat: (u) => pick(TABLES.heat, u),
    cool: (u) => pick(TABLES.cool, u),
  };
}
// The PDF recorder keeps colours symbolic; scripts/figures.py resolves them against the page's tone.
export const recordColors = {
  ink: 'ink', mark: 'mark', bg: 'bg',
  mix: (t) => `mix:${Math.round(clamp(t) * 16) / 16}`,
  hue: (u) => `hue:${(((Math.round(u * 64) % 64) + 64) % 64) / 64}`,
  heat: (u) => `heat:${Math.round(clamp(u) * 32) / 32}`,
  cool: (u) => `cool:${Math.round(clamp(u) * 32) / 32}`,
};
export const RAMPS = { spectrum: SPECTRUM, heat: HEAT, cool: COOL };

/* ---------- Light ---------- */
// Additive mode: overlapping light adds up, like the banner. Always switch back with light(g, false).
export function light(g, on = true) { g.globalCompositeOperation = on ? 'lighter' : 'source-over'; }

// A soft round light. In the browser, a cached radial sprite per colour; in print, a few stacked discs.
const sprites = new Map();
function sprite(color) {
  let s = sprites.get(color);
  if (s) return s;
  const size = 128, cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const x = cv.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  // a gaussian-ish falloff: bright core, long faint tail
  [[0, 1], [.08, .72], [.2, .38], [.38, .16], [.6, .05], [.8, .012], [1, 0]].forEach(([o, a]) => {
    gr.addColorStop(o, color.replace('rgb(', 'rgba(').replace(')', `,${a})`));
  });
  x.fillStyle = gr;
  x.fillRect(0, 0, size, size);
  if (sprites.size > 600) sprites.clear();
  sprites.set(color, cv);
  return cv;
}
export function glow(g, x, y, r, color, alpha = 1) {
  if (r <= 0 || alpha <= 0) return;
  const before = g.globalAlpha;
  if (g.isRecorder) {
    g.fillStyle = color;
    for (let i = 0; i < 5; i++) { g.globalAlpha = before * alpha * .09; g.beginPath(); g.arc(x, y, r * (.12 + .5 * (1 - i / 5) ** 1.6), 0, TAU); g.fill(); }
  } else {
    g.globalAlpha = before * alpha;
    g.drawImage(sprite(color.startsWith('#') ? rgb(hex(color)) : color), x - r, y - r, 2 * r, 2 * r);
  }
  g.globalAlpha = before;
}
// A point of light: wide halo, inner halo, hot core. Like the tips of the banner's fibres.
export function spark(g, x, y, r, color, alpha = 1, core = '#fff6ee') {
  glow(g, x, y, r * 9, color, .32 * alpha);
  glow(g, x, y, r * 3.2, color, .75 * alpha);
  const before = g.globalAlpha;
  g.globalAlpha = before * Math.min(1, alpha * 1.1);
  g.fillStyle = core;
  g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill();
  g.globalAlpha = before;
}

/* ---------- Ink helpers (still used by some figures) ---------- */
// A soft glow that also exists in print: stacked translucent discs.
export function point(g, c, x, y, r, glowR = r * 5) {
  g.fillStyle = c.mark;
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = .035;
    g.beginPath();
    g.arc(x, y, r + (glowR - r) * (1 - i / 9), 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
  g.fillStyle = g.strokeStyle = c.ink;
}
export function label(g, c, text, x, y, align = 'center', size = 18) {
  if (!text) return;
  g.fillStyle = c.ink;
  g.font = `italic 300 ${size}px Spectral, Georgia, serif`;
  g.textAlign = align;
  g.fillText(text, x, y);
}
export function strokeBuckets(g, c, buckets, width) {
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
