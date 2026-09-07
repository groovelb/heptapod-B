import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCHETYPE_CATALOG, ARCHETYPE_NARRATIVE_VERSION, ARCHETYPE_FAMILIES } from '../src/data/heptapodArchetypeCatalog.js';
import narratives from '../src/data/archetypeNarratives.json' with { type: 'json' };
const narrativesKo = Object.fromEntries(Object.entries(narratives.types).map(([id, value]) => [id, value.ko]));
const narrativesEn = Object.fromEntries(Object.entries(narratives.types).map(([id, value]) => [id, value.en]));
import { localizeMessage } from '../src/i18n/messages.js';

const entries = Object.values(ARCHETYPE_CATALOG);
const fields = ['title', 'composition', 'reading', 'story', 'traits', 'moments', 'tension', 'question', 'motto', 'distinction', 'relations'];

test('every existing combination has a complete bilingual editorial record', () => {
  assert.equal(ARCHETYPE_NARRATIVE_VERSION, 4);
  assert.deepEqual(Object.keys(narrativesKo), entries.map((entry) => `${entry.familyId}.${entry.modifierIds.join('+') || 'none'}`));
  assert.deepEqual(Object.keys(narrativesEn), Object.keys(narrativesKo));
  assert.deepEqual([0, 1, 2, 3].map((count) => entries.filter((entry) => entry.modifierIds.length === count).length), [3, 9, 9, 3]);
  for (const entry of entries) {
    const id = `${entry.familyId}.${entry.modifierIds.join('+') || 'none'}`;
    const ko = narrativesKo[id];
    const en = narrativesEn[id];
    assert.deepEqual(Object.keys(ko).sort(), [...fields].sort(), id);
    assert.deepEqual(Object.keys(en).sort(), [...fields].sort(), id);
    assert.ok(ko.story.length >= 180 && ko.story.length <= 260, `${id}: Korean story length`);
    assert.ok(ko.reading.length <= 90 && en.reading.length <= 160, `${id}: short sharing identity`);
    for (const [field, count] of [['traits', 3], ['moments', 2], ['relations', 2]]) {
      assert.equal(ko[field].length, count, `${id}.${field}`);
      assert.equal(en[field].length, count, `${id}.${field}`);
      assert.ok(Object.isFrozen(entry[field]), `${id}.${field} immutable`);
    }
    for (const field of fields) {
      const original = [ko[field]].flat();
      const translated = [en[field]].flat();
      const published = field === 'relations' ? entry.relations.map((relation) => relation.reading) : [entry[field]].flat();
      assert.deepEqual(published, original, `${id}.${field}: exact source`);
      original.forEach((sentence, index) => {
        assert.equal(typeof sentence, 'string');
        assert.ok(sentence.trim().length > 0);
        assert.ok(translated[index].trim().length > 0);
        assert.equal(localizeMessage(sentence, 'en'), translated[index], `${id}.${field}: no silent locale fallback`);
        assert.doesNotMatch(translated[index], /[가-힣]|—|\b(?:TODO|TBD)\b/);
      });
    }
    assert.ok(ko.question.endsWith('?') && en.question.endsWith('?'), id);
  }
});

test('identities, scenes and mottos are authored separately for all 24 types in both languages', () => {
  for (const records of [narrativesKo, narrativesEn]) {
    for (const field of ['reading', 'story', 'motto', 'distinction']) {
      assert.equal(new Set(Object.values(records).map((record) => record[field])).size, 24, field);
    }
  }
});

test('editorial relationships name valid counterparts without changing classification keys', () => {
  for (const entry of entries) {
    for (const relation of entry.relations) {
      assert.ok(Object.isFrozen(relation));
      assert.ok(ARCHETYPE_CATALOG[relation.targetMeaningKey]);
      assert.notEqual(relation.targetMeaningKey, entry.meaningKey);
      assert.deepEqual(Object.keys(relation), ['targetMeaningKey', 'reading']);
    }
    const otherFamily = ARCHETYPE_CATALOG[entry.relations[0].targetMeaningKey];
    const neighbor = ARCHETYPE_CATALOG[entry.relations[1].targetMeaningKey];
    assert.notEqual(otherFamily.familyId, entry.familyId);
    assert.deepEqual(otherFamily.modifierIds, entry.modifierIds);
    assert.equal(neighbor.familyId, entry.familyId);
    const differences = [...new Set([...neighbor.modifierIds, ...entry.modifierIds])]
      .filter((id) => neighbor.modifierIds.includes(id) !== entry.modifierIds.includes(id));
    assert.equal(differences.length, 1, `${entry.id}: neighboring type must differ by exactly one observation`);
    assert.equal(entry.meaningVersion, 1);
  }
});

test('all three family introductions and exact combination additions come from deployed JSON', () => {
  assert.deepEqual(Object.keys(narratives.families), ['arrival', 'reception', 'reciprocity']);
  for (const [id, family] of Object.entries(ARCHETYPE_FAMILIES)) {
    assert.ok(Object.isFrozen(family));
    for (const field of ['title', 'reading', 'story']) {
      assert.equal(family[field], narratives.families[id].ko[field]);
      assert.equal(localizeMessage(family[field], 'en'), narratives.families[id].en[field]);
    }
  }
  for (const records of [narrativesKo, narrativesEn]) {
    assert.equal(new Set(Object.values(records).map((record) => record.composition)).size, 24);
  }
});
