#!/usr/bin/env node
// Record one frame of each scene as vector operations, for the PDFs. Usage: export_figures.mjs <labels.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createScene, FROZEN } from '../assets/scenes.mjs';

const round = (v) => Math.round(v * 100) / 100;

class Recorder {
  constructor() {
    this.ops = []; this.path = []; this.globalAlpha = 1; this.lineWidth = 1;
    this.fillStyle = 'ink'; this.strokeStyle = 'ink'; this.textAlign = 'left'; this.font = '18px'; this.lineCap = 'round'; this.lineJoin = 'round';
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push(['M', round(x), round(y)]); }
  lineTo(x, y) { this.path.push(['L', round(x), round(y)]); }
  closePath() { this.path.push(['Z']); }
  rect(x, y, w, h) { this.path.push(['M', round(x), round(y)], ['L', round(x + w), round(y)], ['L', round(x + w), round(y + h)], ['L', round(x), round(y + h)], ['Z']); }
  arc(x, y, r, start, end) {
    if (Math.abs(end - start) >= Math.PI * 2 - 1e-6) {
      const last = this.path[this.path.length - 1];
      if (last && last[0] === 'M') this.path.pop();
      this.path.push(['C', round(x), round(y), round(r)]);
      return;
    }
    const steps = Math.max(8, Math.ceil((Math.abs(end - start) * Math.max(r, 8)) / 6));
    for (let i = 0; i <= steps; i++) {
      const a = start + ((end - start) * i) / steps, px = round(x + r * Math.cos(a)), py = round(y + r * Math.sin(a));
      this.path.push([i === 0 && (!this.path.length || this.path[this.path.length - 1][0] === 'Z') ? 'M' : 'L', px, py]);
    }
  }
  fill() { if (this.path.length) this.ops.push({ k: 'f', c: this.fillStyle, a: round(this.globalAlpha), d: this.path }); this.path = []; }
  stroke() { if (this.path.length) this.ops.push({ k: 's', c: this.strokeStyle, a: round(this.globalAlpha), w: round(this.lineWidth), d: this.path }); this.path = []; }
  fillRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.fill(); }
  fillText(text, x, y) { this.ops.push({ k: 't', t: text, x: round(x), y: round(y), al: this.textAlign, s: parseFloat(this.font.match(/([\d.]+)px/)[1]) }); }
}

const [labelsPath, out] = process.argv.slice(2);
const labels = JSON.parse(readFileSync(labelsPath, 'utf8'));
const colors = { ink: 'ink', mark: 'mark', mix: (t) => `mix:${Math.round(Math.max(0, Math.min(1, t)) * 16) / 16}` };
const result = {};
for (const name of Object.keys(FROZEN)) {
  const g = new Recorder();
  createScene(name, labels, { step: () => 0 })(g, colors, FROZEN[name], { x: null, y: null, click: null, snap: true });
  result[name] = g.ops;
  // a second moment of the same figure, for the full-page plates in the books
  const later = new Recorder();
  createScene(name, labels, { step: () => 2 })(later, colors, FROZEN[name] * 1.37 + 9, { x: null, y: null, click: null, snap: true });
  result[`${name}~`] = later.ops;
}
writeFileSync(out, JSON.stringify(result));
