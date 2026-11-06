// Measures how much each scene reacts: max mean per-pixel RGB difference (0-765) vs. an untouched run, over frames.
// hover: pointer sweeps the whole figure from frame 30; click: clicks at (300,300) frame 45 and (180,380) frame 75. Usage: node interact.cjs [names...]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const server = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0]); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/javascript' }); fs.createReadStream(f).pipe(r); }).listen(0, async () => {
  const port = server.address().port, b = await chromium.launch(), p = await b.newPage();
  await p.goto(`http://localhost:${port}/assets/`).catch(() => {});
  const res = await p.evaluate(async (names) => {
    const { createScene, FROZEN, makeColors } = await import('/assets/scenes.mjs');
    const c = makeColors('#ece8dd', '#ff5a3a', '#07080c'), out = {};
    const run = (name, mode) => {
      const cv = new OffscreenCanvas(300, 300), g = cv.getContext('2d'), draw = createScene(name, {}, { step: () => 2 });
      const s = { x: null, y: null, click: null, snap: false };
      const frames = [];
      for (let i = 0; i <= 120; i++) {
        const t = FROZEN[name] + i / 30;
        if (mode === 'hover' && i > 30) { s.x = 300 + 220 * Math.sin(i / 11); s.y = 300 + 200 * Math.sin(i / 17 + 1); }
        if (mode === 'click' && i === 45) s.click = [300, 300]; if (mode === 'click' && i === 75) s.click = [180, 380];
        g.setTransform(.5, 0, 0, .5, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#07080c'; g.fillRect(0, 0, 600, 600);
        draw(g, c, t, s);
        if (i > 30 && i % 6 === 0) frames.push(g.getImageData(0, 0, 300, 300).data);
      }
      return frames;
    };
    const diff = (A, B) => Math.max(...A.map((a, k) => diff1(a, B[k]))); const diff1 = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return +(d / (a.length / 4)).toFixed(2); };
    for (const n of (names.length ? names : Object.keys(FROZEN))) { const base = run(n, 'none'); out[n] = [diff(base, run(n, 'hover')), diff(base, run(n, 'click'))]; }
    return out;
  }, process.argv.slice(2));
  for (const [n, [h, c]] of Object.entries(res)) console.log(n.padEnd(11), 'hover', String(h).padStart(6), ' click', String(c).padStart(6));
  await b.close(); server.close();
});
