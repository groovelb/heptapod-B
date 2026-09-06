import { generateParticles, generateVapor } from './logogramParticles.js';

/**
 * Share deterministic geometry across surfaces rendering the same model object.
 * Models and returned geometry are immutable after first use: build a new model
 * object when changing its form. Current builders finish construction before
 * returning models; drawing consumers only read particle and puff schedules.
 *
 * Weak keys follow the model lifetime. Never key by hash/name: distinct models
 * can share a hash while their actual geometry differs. Canvas, color sprites,
 * elapsed clocks and visibility/formation state stay owned by each renderer.
 * Factory injection supports generation-count tests without changing generators.
 */
export function createLogogramGeometryCache({
  generateParticles: buildParticles = generateParticles,
  generateVapor: buildVapor = generateVapor,
} = {}) {
  const models = new WeakMap();
  return (model, reduced = false) => {
    const mode = reduced ? 'reduced' : 'normal';
    let entry = models.get(model);
    if (entry?.[mode]) return entry[mode];
    const built = buildParticles(model, Boolean(reduced));
    if (!entry) {
      entry = { vapor: buildVapor(model) };
      models.set(model, entry);
    }
    entry[mode] = { built, vapor: entry.vapor };
    return entry[mode];
  };
}

export const getLogogramGeometry = createLogogramGeometryCache();
