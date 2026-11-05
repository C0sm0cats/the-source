#!/usr/bin/env node
// Look at figures without the site: render scenes to PNG on their night, and time them.
// Usage (after npm install): node scripts/shoot.cjs <outdir> name[:t1,t2,...][@x,y] ...
// Writes <outdir>/<name>-<t>.png (900 px) and prints the mean draw time per frame (budget: < 8 ms).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.html': 'text/html' };
const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const port = server.address().port;
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  p.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto(`http://localhost:${port}/assets/fonts/`).catch(() => {});
  await p.setContent(`<!doctype html><html><head><base href="http://localhost:${port}/"><style>
@font-face { font-family: Spectral; src: url(assets/fonts/Spectral-LightItalic.woff2); font-style: italic; font-weight: 300; }
body{margin:0;background:#07080c}</style></head><body><canvas id="c" width="900" height="900"></canvas><i style="font-family:Spectral">x</i></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  for (const spec of specs) {
    const m = spec.match(/^([\w-]+)(?::([\d.,]+))?(?:@([\d.]+),([\d.]+))?$/);
    if (!m) { console.log('bad spec', spec); continue; }
    const [, name, times, px, py] = m;
    const res = await p.evaluate(async ({ name, times, px, py }) => {
      const { createScene, FROZEN, makeColors } = await import('/assets/scenes.mjs');
      const labels = { you: 'une vie', past: 'passé', future: 'futur', large: 'infiniment grand', small: 'infiniment petit', everything: 'tout', nothing: 'rien', knowing: 'savoir', living: 'vivre' };
      if (!(name in FROZEN)) return { error: `no FROZEN entry for ${name}` };
      const c = makeColors('#ece8dd', '#ff5a3a', '#07080c');
      const cv = document.getElementById('c'), g = cv.getContext('2d');
      const draw = createScene(name, labels, { step: () => 2 });
      const s = { x: px == null ? null : +px, y: py == null ? null : +py, click: null, snap: false };
      const ts = times ? times.split(',').map(Number) : [0];
      const shots = [];
      // warm up from t=0 so eased state settles, as on the page
      let t0 = performance.now(), n = 0;
      for (let t = 0; t <= Math.max(...ts) + 1e-9; t += 1 / 30) {
        g.setTransform(1.5, 0, 0, 1.5, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#07080c'; g.fillRect(0, 0, 600, 600); g.fillStyle = g.strokeStyle = c.ink;
        draw(g, c, FROZEN[name] + t, s); n++;
        if (ts.some((x) => Math.abs(x - t) < 1 / 60)) shots.push([t, cv.toDataURL('image/png')]);
        if (n > 900) break;
      }
      return { ms: (performance.now() - t0) / n, shots };
    }, { name, times, px, py });
    if (res.error) { console.log(name, res.error); continue; }
    for (const [t, url] of res.shots) {
      const file = path.join(out, `${name}-${t.toFixed(1)}.png`);
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log(file);
    }
    console.log(`${name}: ${res.ms.toFixed(2)} ms/frame`);
  }
  await b.close(); server.close();
});
