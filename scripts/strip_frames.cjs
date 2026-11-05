// Frames for assets/strip.webp: a few figures, one after another, large on the night with their chapter's thesis.
// Called by build_strip.py: node strip_frames.cjs <outdir> <port> <frames per figure> <fps> <fade frames> <ids...>
const { chromium } = require('playwright');
const fs = require('fs');
const [out, port, per, fps, fade, ...ids] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 640 } });
  await p.goto(`http://localhost:${port}/assets/`);
  await p.setContent(`<!doctype html><html><head><base href="http://localhost:${port}/"><style>
@font-face { font-family: T; src: url(assets/fonts/Spectral-ExtraLight.woff2); }
@font-face { font-family: I; src: url(assets/fonts/Spectral-LightItalic.woff2); }
body{margin:0;background:#000}</style></head><body><canvas id="c"></canvas><span style="font-family:T">x</span><span style="font-family:I">x</span></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  const n = await p.evaluate(async ({ per, fps, fade, ids }) => {
    const { createScene, FROZEN, makeColors } = await import('/assets/scenes.mjs');
    const data = await (await fetch('/content/chapters.json')).json();
    const W = 1600, H = 640, S = 600, FX = 960, FY = 20;
    const cv = document.getElementById('c'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d');
    const colors = makeColors('#ece8dd', '#ff5a3a', '#07080c');
    const items = ids.map((id) => {
      const ch = data.chapters.find((c) => c.id === id);
      const index = data.chapters.indexOf(ch);
      const labels = Object.fromEntries(['you', 'past', 'future', 'large', 'small', 'everything', 'nothing', 'knowing', 'living'].map((k) => [k, data.ui.en[k]]));
      return { ch, index, draw: createScene(ch.figure, labels, { step: () => 2 }), s: { x: null, y: null, click: null, snap: false } };
    });
    const wrap = (text, font, width) => {
      g.font = font; const words = text.replace(/'/g, '’').split(' '), lines = []; let line = '';
      for (const w of words) { const next = line ? `${line} ${w}` : w; if (g.measureText(next).width > width && line) { lines.push(line); line = w; } else line = next; }
      return [...lines, line];
    };
    const frame = (it, f, ctx) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const bg = ctx.createRadialGradient(FX + S / 2, H / 2, 0, FX + S / 2, H / 2, 900);
      bg.addColorStop(0, '#16111c'); bg.addColorStop(.5, '#0a0b11'); bg.addColorStop(1, '#06070a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(1, 0, 0, 1, FX, FY);
      ctx.fillStyle = ctx.strokeStyle = colors.ink;
      it.draw(ctx, colors, FROZEN[it.ch.figure] + f / fps, it.s);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ff5a3a'; ctx.font = 'italic 300 24px I'; ctx.textAlign = 'left';
      ctx.fillText(`${String(it.index + 1).padStart(2, '0')}  ·  ${data.ui.en.parts[it.ch.part]}`, 88, 150);
      ctx.fillStyle = '#ece8dd';
      const lines = wrap(it.ch.en.thesis, '200 60px T', 780); ctx.font = '200 60px T';
      lines.forEach((l, i) => ctx.fillText(l, 86, 250 + i * 74));
      ctx.fillStyle = '#b9b4aa'; ctx.font = 'italic 300 24px I';
      ctx.fillText(`${it.ch.en.title}  ·  ${it.ch.fr.title}`.replace(/'/g, '’'), 88, 250 + lines.length * 74 + 40);
    };
    window.__frames = [];
    items.forEach((it, k) => {
      const next = items[(k + 1) % items.length];
      for (let f = 0; f < per; f++) {
        frame(it, f, g);
        const into = f - (per - fade);
        if (into >= 0) { frame(next, into - fade, o); g.globalAlpha = (into + 1) / (fade + 1); g.drawImage(off, 0, 0); g.globalAlpha = 1; }
        window.__frames.push(cv.toDataURL('image/png'));
      }
    });
    return window.__frames.length;
  }, { per: +per, fps: +fps, fade: +fade, ids });
  for (let i = 0; i < n; i++) {
    const url = await p.evaluate((i) => window.__frames[i], i);
    fs.writeFileSync(`${out}/f${String(i).padStart(4, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('frames', n);
  await b.close();
})();
