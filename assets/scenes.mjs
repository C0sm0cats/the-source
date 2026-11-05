// The book's figures. One drawing code for the site (animated canvas) and the PDFs (a recorded frame).
// Each scene draws in a 600 x 600 box on a night background and depends only on the time t, so any frame can be reproduced.
// Contract: createScene(name, labels, options) returns draw(g, c, t, s): g a 2D context (or the PDF recorder, g.isRecorder),
// c the colours (see scenes/kit.mjs makeColors), s the pointer state { x, y, click, snap }.
// The figure modules are loaded with this module's own ?v= query, so a page never mixes code versions.
const v = new URL(import.meta.url).search;
const load = (name) => import(`./scenes/${name}.mjs${v}`);
const K = await load('kit');
const PARTS = ['source', 'origin', 'unfolding', 'experience', 'passage', 'return'];
const modules = await Promise.all(PARTS.map(load));

const factories = {};
export const FROZEN = {};
for (const m of modules) { Object.assign(factories, m.default(K)); Object.assign(FROZEN, m.FROZEN); }
export const { makeColors, recordColors } = K;

export function createScene(name, labels = {}, options = {}) {
  return factories[name](labels, options);
}
