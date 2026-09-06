#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { encode } from '../src/utils/heptapod/encode.js';
import { buildModel } from '../src/utils/heptapod/buildModel.js';
import { normalizeName } from '../src/utils/heptapod/normalizeName.js';
import { extractGlyphFeatures } from '../src/utils/heptapod/extractGlyphFeatures.js';

const sb = createClient(
  'https://jkeghathfojadnyrlxve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprZWdoYXRoZm9qYWRueXJseHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDA1NjQsImV4cCI6MjA5MzI3NjU2NH0.K0HRELhYLOa_3d4Fy_uvMwwfhYDPn_MyiB3SSSpZI-s'
);

const NAMES = [
  'Louise', '서연', '明月', 'Alejandra', '민준',
  '天河', 'Costello', '은하', 'María', '永恆',
  'Ian', '하늘', '星辰', 'Natasha', '준혁',
  '風月', 'Abbott', '소라', 'Émile', '雲海',
  'Yuki', '다온', '朝陽', 'Ingrid', '지우',
  '碧空', 'Weber', '나래', 'Søren', '流星',
];

for (const name of NAMES) {
  try {
    const encoded = encode(name);
    const model = buildModel(encoded);
    const n = normalizeName(name);
    const features = extractGlyphFeatures(model);
    const fingerprint = `v1-${encoded.hashHex}`;

    model.meta = { ...model.meta, name, hashHex: encoded.hashHex, reversible: true };

    const { data: existing } = await sb
      .from('glyphs')
      .select('id')
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    let glyphId;
    if (existing) {
      glyphId = existing.id;
      console.log(`SKIP (exists): ${name} [${fingerprint}]`);
      continue;
    }

    const { data: newGlyph, error: insertErr } = await sb
      .from('glyphs')
      .insert({
        canonical_name: n.canonicalName,
        is_interrogative: n.isInterrogative,
        fingerprint,
        encoder_version: 1,
        model_data: model,
        feature_vector: features,
        contour_primary: features.contourLineage?.primary || null,
        contour_quadrant: features.contourLineage?.quadrant || null,
        contour_label: features.contourLineage?.label || null,
      })
      .select('id')
      .single();

    if (insertErr) { console.error(`ERR glyph ${name}:`, insertErr.message); continue; }
    glyphId = newGlyph.id;

    const { error: contribErr } = await sb
      .from('glyph_contributions')
      .insert({
        glyph_id: glyphId,
        display_name: n.displayName,
        context_tags: [],
      });

    if (contribErr) { console.error(`ERR contrib ${name}:`, contribErr.message); continue; }
    console.log(`OK: ${name} [${fingerprint}] → ${glyphId}`);
  } catch (e) {
    console.error(`FAIL ${name}:`, e.message);
  }
}

console.log('Done.');
