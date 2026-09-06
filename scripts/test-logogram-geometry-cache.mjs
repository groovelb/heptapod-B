/** Pure Node regression: deterministic geometry only; no DOM, browser or network. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { generateParticles, generateVapor, drawInkParticle, paintStatic, paintVapor, stampStreaks } from '../src/utils/heptapod/logogramParticles.js';
import { createLogogramGeometryCache } from '../src/utils/heptapod/logogramGeometryCache.js';

let checks = 0;
const check = (run) => { run(); checks++; };
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};
let particleCalls = 0;
let vaporCalls = 0;
const cached = createLogogramGeometryCache({
  generateParticles: (...args) => { particleCalls++; return generateParticles(...args); },
  generateVapor: (...args) => { vaporCalls++; return generateVapor(...args); },
});
const models = ['Louise', 'Louise?', 'Abbott', '민준', 'Louis'].map((name) => freeze(buildArchiveModel(name)));
const normal = cached(models[0]);
check(() => assert.deepEqual(normal.built, generateParticles(models[0], false), 'Cached normal geometry exactly equals baseline'));
check(() => assert.deepEqual(normal.vapor, generateVapor(models[0]), 'Cached vapor exactly equals baseline'));
check(() => assert.equal(cached(models[0], false), normal, 'Repeated model identity reuses the same geometry record'));
const instances = [0, 1, 2, 3, 4, 0, 1, 2, 0, 1, 2].map((index) => cached(models[index]));
check(() => assert.equal(instances.length, 11));
check(() => assert.equal(particleCalls, 5, 'Eleven Archive surfaces generate particles only once per five distinct models'));
check(() => assert.equal(vaporCalls, 5, 'Eleven Archive surfaces generate vapor only once per five distinct models'));
const normalSnapshot = structuredClone(normal);
const reduced = cached(models[0], true);
check(() => assert.notEqual(reduced.built, normal.built, 'Reduced-mode particle schedule is isolated'));
check(() => assert.deepEqual(reduced.built, generateParticles(models[0], true), 'Reduced geometry equals baseline'));
check(() => assert.equal(reduced.vapor, normal.vapor, 'Pure vapor schedule is independent of reduced-motion mode'));
check(() => assert.deepEqual(normal, normalSnapshot, 'Building reduced geometry cannot mutate existing normal schedule'));
check(() => assert.equal(cached(models[0], true), reduced));
check(() => assert.equal(particleCalls, 6));
check(() => assert.equal(vaporCalls, 5));
const distinctSameHash = structuredClone(models[0]);
distinctSameHash.gap = null;
check(() => assert.equal(distinctSameHash.meta.hash, models[0].meta.hash));
const distinct = cached(freeze(distinctSameHash));
check(() => assert.notEqual(distinct, normal, 'Identical hash never aliases distinct model objects'));
check(() => assert.deepEqual(distinct.built, generateParticles(distinctSameHash, false)));
check(() => assert.notDeepEqual(distinct.built, normal.built, 'Geometry follows actual model fields, not only hash'));
check(() => assert.equal(particleCalls, 7));

// Freezing catches writes to cached particle/puff records by every drawing consumer.
freeze(normal);
const traceDrawing = ({ built, vapor }) => {
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(['drawImage', ...args]),
    translate: (...args) => calls.push(['translate', ...args]), rotate: (...args) => calls.push(['rotate', ...args]) };
  const sprites = { hard: 'hard-sprite', soft: 'soft-sprite' };
  for (const particle of built.particles) drawInkParticle(ctx, particle, sprites, 0.5);
  stampStreaks(ctx, built.particles, 800, 'streak-sprite');
  paintStatic(ctx, built.particles, sprites);
  paintVapor(ctx, vapor.puffs, 800, 'puff-sprite');
  paintVapor(ctx, vapor.puffs, 8000, 'puff-sprite');
  return calls;
};
check(() => assert.deepEqual(traceDrawing(normal), traceDrawing({ built: generateParticles(models[0]), vapor: generateVapor(models[0]) }),
  'Formation, streak, static ink and ongoing vapor drawing commands equal uncached baseline'));
check(() => assert.deepEqual(normal, normalSnapshot, 'All renderer consumers leave geometry unchanged'));
check(() => assert.deepEqual(Object.keys(normal).sort(), ['built', 'vapor'], 'Cache holds no Canvas, sprites, clock or animation context'));
const source = await readFile(new URL('../src/components/motion/LogogramRendererCanvas.jsx', import.meta.url), 'utf8');
check(() => assert.match(source, /getLogogramGeometry\(model, prefersReduced\)/));
check(() => assert.match(source, /let t0 = performance\.now\(\)/, 'Animation clock remains local to each renderer'));
check(() => assert.match(source, /let settledInk = null/, 'Settled ink surface remains local to each renderer'));
check(() => assert.match(source, /\[built, vapor, size, ink, isActive, prefersReduced, timeScale\]/, 'Animation effect dependency contract is unchanged'));
console.log(`Logogram geometry cache: ${checks} checks passed; 11 surfaces / 5 builds, identical drawing output, isolated motion modes and per-instance animation state. Pure Node only.`);
