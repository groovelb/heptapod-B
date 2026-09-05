#!/usr/bin/env node
/** Read-only CLI for the SAME model/relationship pipeline used by the frontend.
 * node scripts/test-resonance.mjs Louise Hannah
 * node scripts/test-resonance.mjs Louise Louis
 * node scripts/test-resonance.mjs Louise 'Louise?'
 * No database, simulated tags, browser or separate alphabet-scoring path.
 */
import { prepareArchiveGlyph } from '../src/utils/heptapod/archiveGlyph.js';
import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../src/utils/heptapod/relateGlyphs.js';

const [nameA, nameB] = process.argv.slice(2);
if (!nameA || !nameB) {
  console.error('사용법: node scripts/test-resonance.mjs <이름A> <이름B>');
  process.exitCode = 1;
} else {
  try {
    const prepared = await Promise.all([nameA, nameB].map(prepareArchiveGlyph));
    const glyphs = prepared.map((item) => ({ id: item.fingerprint, canonical_name: item.canonicalName,
      is_interrogative: item.isInterrogative, encoder_version: item.encoderVersion, model_data: item.modelData }));
    const relations = relateGlyphs(...glyphs);
    console.log(JSON.stringify({
      algorithmVersion: RELATION_ALGORITHM_VERSION,
      glyphs: prepared.map((item) => ({ name: item.displayName, mode: item.modelData.meta.encodingMode,
        branches: item.modelData.clusters.length, opening: item.modelData.gap })),
      status: glyphs[0].id === glyphs[1].id ? 'same-glyph' : relations.length ? 'measured-resonance' : 'no-observed-resonance',
      relations: relations.map((relation) => ({ type: relation.relationType, level: relation.components.level,
        wholeScore: relation.components.wholeScore, motifScore: relation.components.motifScore,
        observations: relation.evidence.observations })),
    }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
