// Frames for assets/plates.webp: the real scenes, drawn in a grid by a headless Chromium. Called by build_plates.py.
const { chromium } = require('playwright-core');
const fs = require('fs');
const [out, port, frames, fps] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5]];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1300, height: 1300 } });
  await p.goto(`http://localhost:${port}/en/`); // same origin, so the scenes module can be imported
  await p.setContent(`<!doctype html><html><head><base href="http://localhost:${port}/"><style>
@font-face { font-family: S; src: url(assets/fonts/Spectral-LightItalic.woff2); } body{margin:0;background:#000}</style></head>
<body><canvas id="c"></canvas><span style="font-family:S">x</span></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  const n = await p.evaluate(async ({ frames, fps }) => {
    const { createScene, FROZEN } = await import('/assets/scenes.mjs');
    const data = await (await fetch('/content/chapters.json')).json();
    const TONES = { paper: ['#eeece5', '#17171b', '#e03c1f'], dusk: ['#3c4256', '#f0ede4', '#ff6b4d'], night: ['#0b0c12', '#ece8dd', '#ff5a3a'], blank: ['#ffffff', '#111114', '#e03c1f'] };
    const CH = data.chapters, COLS = 6, CELL = 220, STRIP = 34, PAD = 16;
    const rows = Math.ceil(CH.length / COLS);
    const cv = document.getElementById('c'); cv.width = COLS * CELL; cv.height = rows * (CELL + STRIP);
    const g = cv.getContext('2d');
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const items = CH.map((ch) => {
      const [bg, ink, mark] = TONES[ch.tone]; const a = rgb(mark), b2 = rgb(ink);
      const table = Array.from({ length: 17 }, (_, i) => `rgb(${a.map((v, k) => Math.round(v + (b2[k] - v) * (i / 16))).join(',')})`);
      return { ch, bg, colors: { ink, mark, mix: (t) => table[Math.round(Math.max(0, Math.min(1, t)) * 16)] }, draw: createScene(ch.figure, {}, { step: () => 2 }), s: { x: null, y: null, click: null, snap: false } };
    });
    window.__frames = [];
    for (let f = 0; f < frames; f++) {
      items.forEach((it, i) => {
        const x = (i % COLS) * CELL, y = Math.floor(i / COLS) * (CELL + STRIP);
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
        g.fillStyle = it.bg; g.fillRect(x, y, CELL, CELL + STRIP);
        g.save(); g.beginPath(); g.rect(x, y, CELL, CELL + STRIP); g.clip();
        const k = (CELL - 2 * PAD) / 600; g.setTransform(k, 0, 0, k, x + PAD, y + PAD + 4);
        g.fillStyle = g.strokeStyle = it.colors.ink;
        it.draw(g, it.colors, FROZEN[it.ch.figure] + f / fps, it.s);
        g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
        g.fillStyle = it.colors.ink; g.font = 'italic 300 13px S'; g.textAlign = 'left';
        g.fillText(`${String(i + 1).padStart(2, '0')}  ${it.ch.en.title}`, x + PAD, y + CELL + STRIP - 14);
      });
      window.__frames.push(cv.toDataURL('image/png'));
    }
    return window.__frames.length;
  }, { frames, fps });
  for (let i = 0; i < n; i++) {
    const url = await p.evaluate((i) => window.__frames[i], i);
    fs.writeFileSync(`${out}/f${String(i).padStart(3, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('frames', n);
  await b.close();
})();
