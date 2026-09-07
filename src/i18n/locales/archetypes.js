import narratives from '../../data/archetypeNarratives.json' with { type: 'json' };

// The deployed JSON owns all family/type copy in both languages.
function narrativeMessages(locale) {
  const records = [
    ...Object.entries(narratives.families).map(([id, value]) => [`family.${id}`, value[locale]]),
    ...Object.entries(narratives.types).map(([id, value]) => [id, value[locale]]),
  ];
  return Object.freeze(Object.fromEntries(records.flatMap(([id, record]) =>
    Object.entries(record).flatMap(([field, value]) => Array.isArray(value)
      ? value.map((sentence, index) => [`archetype.${id}.${field}.${index}`, sentence])
      : [[`archetype.${id}.${field}`, value]]))));
}

export const archetypeKo = narrativeMessages('ko');
export const archetypeEn = narrativeMessages('en');
