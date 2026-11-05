// Render figures as JPEG, exactly as the site draws them (additive light included), on their chapter's night.
// Usage: node render_figures.cjs <jobs.json> — jobs: [{ scene, labels, bg, t, size, file }]. Called by build_figures.py.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': f.endsWith('.mjs') ? 'text/javascript' : f.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
}).listen(0, async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.error('pageerror:', e.message));
  await p.goto(`http://localhost:${server.address().port}/assets/`);
  await p.setContent(`<!doctype html><html><head><base href="http://localhost:${server.address().port}/"><style>
@font-face { font-family: Spectral; src: url(assets/fonts/Spectral-LightItalic.woff2); font-style: italic; font-weight: 300; }
</style></head><body><canvas id="c"></canvas><i style="font-family:Spectral">x</i></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  for (const job of jobs) {
    const url = await p.evaluate(async ({ scene, labels, bg, t, size, later }) => {
      const { createScene, FROZEN, makeColors } = await import('/assets/scenes.mjs');
      const c = makeColors('#ece8dd', '#ff5a3a', bg);
      const cv = document.getElementById('c'); cv.width = cv.height = size;
      const g = cv.getContext('2d'), k = size / 600, draw = createScene(scene, labels, { step: () => 2 });
      const s = { x: null, y: null, click: null, snap: false }, at = t ?? (later ? FROZEN[scene] * 1.37 + 9 : FROZEN[scene]);
      // run up to the moment so smoothed state settles, then paint it on the night
      for (let x = Math.max(0, at - 4); x < at; x += 1 / 30) { g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 600, 600); draw(g, c, x, s); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = bg; g.fillRect(0, 0, size, size);
      g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = g.strokeStyle = c.ink;
      draw(g, c, at, s);
      // the edges dissolve into the night, as on the site (CSS mask there)
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      const e = size * .07, clear = bg + '00';
      for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, e, 0, 0, 0, e, size], [size, 0, size - e, 0, size - e, 0, e, size], [0, 0, 0, e, 0, 0, size, e], [0, size, 0, size - e, 0, size - e, size, e]]) {
        const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, bg); lg.addColorStop(1, clear);
        g.fillStyle = lg; g.fillRect(rx, ry, rw, rh);
      }
      return cv.toDataURL('image/jpeg', .86);
    }, job);
    fs.mkdirSync(path.dirname(job.file), { recursive: true });
    fs.writeFileSync(job.file, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('figures', jobs.length);
  await b.close(); server.close();
});
