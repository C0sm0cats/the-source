// Enhancements only: every word is already in the HTML, and each figure has an image for when JavaScript is off.
const { createScene, FROZEN, makeColors } = await import(`./scenes.mjs${new URL(import.meta.url).search}`);

const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Page: tone, menu ---------- */
const menu = document.querySelector('.thread-menu');
const tones = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) document.body.dataset.tone = entry.target.dataset.tone;
}, { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('section[data-tone]').forEach((section) => tones.observe(section));

/* ---------- Where the reader is: rail, contents, bar ---------- */
const chapters = [...document.querySelectorAll('section.chapter')];
const railLinks = new Map([...document.querySelectorAll('.rail a')].map((a) => [a.hash.slice(1), a]));
const threadLinks = new Map([...document.querySelectorAll('.thread-panel a')].map((a) => [a.hash.slice(1), a]));
let current = null;
const here = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) current = entry.target.id;
  chapters.forEach((ch, i) => {
    const on = ch.id === current, rail = railLinks.get(ch.id);
    rail?.toggleAttribute('aria-current', on);
    rail?.classList.toggle('read', chapters.findIndex((c) => c.id === current) > i);
    if (on) threadLinks.get(ch.id)?.setAttribute('aria-current', 'location'); else threadLinks.get(ch.id)?.removeAttribute('aria-current');
  });
}, { rootMargin: '-45% 0px -54% 0px' });
chapters.forEach((ch) => here.observe(ch));

const bar = document.querySelector('.bar');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  bar.classList.toggle('away', y > lastY + 4 && y > 400 && !menu.open);
  if (y < lastY - 4) bar.classList.remove('away');
  lastY = y;
}, { passive: true });

/* ---------- Reading: text arrives, keys turn pages, links copy ---------- */
if (!reduced.matches) {
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('seen'); seen.unobserve(entry.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.chapter-head, .text > *, .interlude > *, .ending > *, .lexicon dl > div').forEach((el) => {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal'); seen.observe(el); }
  });
}

const stops = [...document.querySelectorAll('.opening, .interlude, section.chapter, .ending')];
addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
  const dir = { ArrowRight: 1, ArrowLeft: -1, j: 1, k: -1 }[event.key];
  if (!dir) return;
  const y = scrollY + 2;
  const index = stops.findLastIndex((el) => el.offsetTop <= y);
  const next = stops[Math.max(0, Math.min(stops.length - 1, index + dir))];
  if (next) { event.preventDefault(); next.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' }); history.replaceState(null, '', `#${next.id || 'top'}`); }
});
if (matchMedia('(hover: hover)').matches) document.querySelector('.keys')?.removeAttribute('hidden');

document.querySelectorAll('.anchor').forEach((a) => a.addEventListener('click', () => {
  const url = new URL(a.hash, location.href).href;
  navigator.clipboard?.writeText(url).then(() => { a.classList.add('copied'); setTimeout(() => a.classList.remove('copied'), 1600); }, () => {});
}));

/* ---------- Figures: full screen, a hint the first time ---------- */
if (document.fullscreenEnabled) {
  document.querySelectorAll('[data-expand]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const stage = button.closest('.stage');
      if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen?.().catch(() => {});
    });
  });
}
const hinted = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) {
    const fig = entry.target; fig.querySelector('.hint')?.removeAttribute('hidden');
    fig.classList.add('fresh'); setTimeout(() => fig.classList.remove('fresh'), 4200); hinted.unobserve(fig);
  }
}, { threshold: .6 });
document.querySelectorAll('.chapter > .fig').forEach((fig) => hinted.observe(fig));

menu.addEventListener('click', (event) => { if (event.target.closest('a')) menu.open = false; });
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
});
document.addEventListener('click', (event) => { if (menu.open && !menu.contains(event.target)) menu.open = false; });

/* ---------- Colours ---------- */
// Colours only change during a tone transition, so the palette is rebuilt only when ink or mark differ.
const palettes = new Map();
function palette(canvas) {
  const style = getComputedStyle(canvas);
  const ink = style.color, mark = style.getPropertyValue('--mark').trim(), bg = style.getPropertyValue('--bg').trim();
  const key = `${ink}|${mark}|${bg}`;
  let colors = palettes.get(key);
  if (!colors) {
    colors = makeColors(ink, mark, bg);
    if (palettes.size > 256) palettes.clear();
    palettes.set(key, colors);
  }
  return colors;
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
  // slow machines get fewer pixels rather than fewer frames
  const ratio = Math.min(devicePixelRatio || 1, 2) * (item.scale ?? 1);
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
  const figure = canvas.closest('figure, .fig');
  const name = canvas.dataset.scene;
  const state = { x: null, y: null, click: null, snap: false };
  const limit = figure.querySelector('[data-limit]');
  const range = limit?.querySelector('input');
  let draw;
  try { draw = createScene(name, JSON.parse(canvas.dataset.labels || '{}'), { step: () => +(range?.value ?? 0) }); } catch { return; }
  const item = { canvas, name, g: canvas.getContext('2d'), state, visible: false, draw };
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
  // a mouse hovers; a finger rests where it touched for a moment, then lifts
  let lift = 0;
  const rest = () => { clearTimeout(lift); lift = setTimeout(() => { state.x = state.y = null; }, 2500); };
  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.buttons) [state.x, state.y] = locate(event);
    if (event.pointerType !== 'mouse' && event.buttons) rest();
  });
  canvas.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') state.x = state.y = null; });
  canvas.addEventListener('pointerdown', (event) => {
    state.click = locate(event);
    if (event.pointerType !== 'mouse') { [state.x, state.y] = state.click; rest(); }
    if (paused) paint(item);
  });
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
  active.forEach((item) => {
    const start = performance.now();
    try { paint(item); } catch (error) { item.visible = false; console.error(error); return; }
    item.cost = .9 * (item.cost ?? 0) + .1 * (performance.now() - start);
    if (item.cost > 24 && (item.scale ?? 1) > .5) { item.scale = (item.scale ?? 1) * .8; item.cost = 0; }
  });
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

// Fonts can still shift the page after the browser has jumped to a #chapter: land there again, unless the reader has moved.
const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
if (target) {
  let moved = false;
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) addEventListener(type, () => { moved = true; }, { once: true, passive: true });
  const land = () => { if (!moved) target.scrollIntoView(); };
  document.fonts?.ready.then(land);
  addEventListener('load', land, { once: true });
}
