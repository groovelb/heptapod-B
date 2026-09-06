/** Pure Node oracle comparison; no browser, Canvas engine or network calls. */
import assert from 'node:assert/strict';
import { buildArchiveModel } from '../src/utils/heptapod/archiveGlyph.js';
import { generateVapor, paintVapor } from '../src/utils/heptapod/logogramParticles.js';
import { paintVapor as oracle } from './fixtures/vapor-baseline.mjs';

let checks = 0;
const check = (run) => { run(); checks++; };
const trace = (paint, puffs, time) => {
  const operations = [];
  const ctx = new Proxy({
    translate: (...args) => operations.push(['translate', ...args]),
    rotate: (...args) => operations.push(['rotate', ...args]),
    drawImage: (...args) => operations.push(['drawImage', ...args]),
  }, { set: (target, key, value) => { operations.push(['set', key, value]); target[key] = value; return true; } });
  paint(ctx, puffs, time, 'vapor-sprite');
  return operations;
};
const results = [];
for (const name of ['Louise', 'Louise?', '민준', '明月']) {
  const { puffs } = generateVapor(buildArchiveModel(name));
  for (const puff of puffs) Object.freeze(puff);
  Object.freeze(puffs);
  const before = structuredClone(puffs);
  const times = new Set([-1, 0, 800, 60_000, 300_000, 600_000]);
  for (const puff of puffs) {
    for (const boundary of [puff.birth, puff.birth + puff.life, puff.birth + puff.cycle]) {
      times.add(boundary - 0.000001); times.add(boundary); times.add(boundary + 0.000001);
    }
  }
  // Deliberately visit equilibrium first, then rewind: cache cannot be time-stateful.
  for (const time of [...times].sort((a, b) => b - a)) {
    check(() => assert.deepEqual(trace(paintVapor, puffs, time), trace(oracle, puffs, time), `${name}: exact property/drawing trace at ${time}ms`));
  }
  check(() => assert.deepEqual(puffs, before, `${name}: no mutation of schedule`));
  let examined = 0;
  const counted = new Proxy(puffs, { get: (target, key, receiver) => {
    if (typeof key === 'string' && /^\d+$/.test(key)) examined++;
    return Reflect.get(target, key, receiver);
  } });
  trace(paintVapor, counted, 0); // Pay one-time schedule preparation before counting.
  const cyclic = puffs.filter((puff) => puff.cycle > 0).length;
  for (const time of [60_000, 300_000, 600_000]) {
    examined = 0;
    trace(oracle, counted, time);
    const baselineExamined = examined;
    examined = 0;
    trace(paintVapor, counted, time);
    check(() => assert.equal(baselineExamined, puffs.length));
    check(() => assert.equal(examined, cyclic, `${name}: examine only ongoing puffs at ${time}ms`));
    results.push({ name, time, before: baselineExamined, after: examined });
  }
  examined = 0;
  trace(paintVapor, counted, 0);
  check(() => assert.equal(examined, puffs.length, 'Rewind restores full formation schedule'));
}

// Interleaved original indices are essential: noiseHash must not use filtered indices.
const sample = generateVapor(buildArchiveModel('Louise')).puffs;
const cyclic = sample.filter((puff) => puff.cycle > 0);
const singleUse = sample.filter((puff) => puff.cycle <= 0);
const mixed = Object.freeze([singleUse[0], cyclic[0], singleUse[1], cyclic[1], singleUse[2], cyclic[2]]);
for (const time of [600_000, 800, 60_000, 0, 300_000]) {
  check(() => assert.deepEqual(trace(paintVapor, mixed, time), trace(oracle, mixed, time), 'Original sparse indices and rewind retain exact noise'));
}
check(() => assert.deepEqual(trace(paintVapor, [], 60_000), trace(oracle, [], 60_000), 'Empty schedule resets alpha identically'));
console.log(`Vapor work: ${checks} checks passed; exact baseline drawing/property traces, all birth/expiry boundaries, long-running equilibrium, rewind and original noise indices. Pure Node only.`);
console.log(JSON.stringify(results));
