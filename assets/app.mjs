// Enhancements only: every word is already in the HTML, and each figure has an image for when JavaScript is off.
import { createScene, FROZEN } from './scenes.mjs';

const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Page: tone, progress, menu ---------- */
const tones = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) document.body.dataset.tone = entry.target.dataset.tone;
}, { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('section[data-tone]').forEach((section) => tones.observe(section));

const progress = document.querySelector('.progress');
const onScroll = () => {
  const max = root.scrollHeight - innerHeight;
  progress.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max) : 0);
};
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
onScroll();

const menu = document.querySelector('.thread-menu');
menu.addEventListener('click', (event) => { if (event.target.closest('a')) menu.open = false; });
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
});
document.addEventListener('click', (event) => { if (menu.open && !menu.contains(event.target)) menu.open = false; });

/* ---------- Colours ---------- */
const parse = (value) => {
  const probe = document.createElement('canvas').getContext('2d');
  probe.fillStyle = value;
  const hex = probe.fillStyle;
  if (hex.startsWith('#')) return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return hex.match(/[\d.]+/g).slice(0, 3).map(Number);
};
function palette(canvas) {
  const style = getComputedStyle(canvas);
  const ink = style.color, mark = style.getPropertyValue('--mark').trim();
  const a = parse(mark), b = parse(ink);
  const table = Array.from({ length: 17 }, (_, i) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * (i / 16))).join(',')})`);
  return { ink, mark, mix: (t) => table[Math.round(Math.max(0, Math.min(1, t)) * 16)] };
}

/* ---------- Running the scenes ---------- */
let paused = reduced.matches;
let clock = 0;
let last = 0;
const running = [];

function paint(item) {
  const { canvas, draw, state, name } = item;
  const size = canvas.clientWidth;
  if (!size) return;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const pixels = Math.round(size * ratio);
  if (canvas.width !== pixels) canvas.width = canvas.height = pixels;
  const g = item.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, pixels, pixels);
  const k = pixels / 600;
  g.setTransform(k, 0, 0, k, 0, 0);
  const colors = palette(canvas);
  g.fillStyle = g.strokeStyle = colors.ink;
  g.globalAlpha = 1;
  state.snap = paused;
  draw(g, colors, paused ? FROZEN[name] : FROZEN[name] + clock, state);
}

document.querySelectorAll('canvas[data-scene]').forEach((canvas) => {
  const figure = canvas.parentElement;
  const name = canvas.dataset.scene;
  const state = { x: null, y: null, click: null, snap: false };
  const limit = figure.querySelector('[data-limit]');
  const range = limit?.querySelector('input');
  const draw = createScene(name, JSON.parse(canvas.dataset.labels || '{}'), { step: () => +(range?.value ?? 0) });
  const item = { canvas, name, g: canvas.getContext('2d'), state, visible: false, draw };
  canvas.hidden = false;
  if (limit) {
    const output = limit.querySelector('output');
    const format = new Intl.NumberFormat(root.lang);
    const steps = [25, 100, 1000, 10000, 100000, Infinity];
    const update = () => {
      const count = steps[+range.value];
      output.textContent = count === Infinity ? limit.dataset.infinity : `${format.format(count)} ${limit.dataset.lives}`;
      range.setAttribute('aria-valuetext', output.textContent);
      if (paused) paint(item);
    };
    range.addEventListener('input', update);
    limit.hidden = false;
    update();
  }
  const locate = (event) => {
    const box = canvas.getBoundingClientRect();
    return [((event.clientX - box.left) / box.width) * 600, ((event.clientY - box.top) / box.height) * 600];
  };
  canvas.addEventListener('pointermove', (event) => { if (event.pointerType === 'mouse') [state.x, state.y] = locate(event); });
  canvas.addEventListener('pointerleave', () => { state.x = state.y = null; });
  canvas.addEventListener('pointerdown', (event) => { state.click = locate(event); if (paused) paint(item); });
  new IntersectionObserver(([entry]) => {
    item.visible = entry.isIntersecting;
    if (item.visible) { paint(item); wake(); }
  }, { rootMargin: '80px' }).observe(canvas);
  new ResizeObserver(() => paint(item)).observe(canvas);
  running.push(item);
});

let frame = 0;
function tick(now) {
  frame = 0;
  const active = running.filter((item) => item.visible);
  if (paused || !active.length) return;
  clock += Math.min(.05, (now - last) / 1000);
  last = now;
  active.forEach(paint);
  frame = requestAnimationFrame(tick);
}
function wake() {
  if (!frame && !paused) { last = performance.now(); frame = requestAnimationFrame(tick); }
}
const repaint = () => running.filter((item) => item.visible).forEach(paint);
new MutationObserver(() => { if (paused) setTimeout(repaint, 950); }).observe(document.body, { attributes: true, attributeFilter: ['data-tone'] });
document.fonts?.ready.then(repaint);

const motion = document.querySelector('[data-motion]');
const syncMotion = () => { motion.textContent = paused ? motion.dataset.resume : motion.dataset.pause; motion.setAttribute('aria-pressed', paused); };
motion.hidden = false;
motion.addEventListener('click', () => { paused = !paused; syncMotion(); if (paused) repaint(); else wake(); });
syncMotion();
