/** Shared browser/server guard before feature extraction or O(m*n) name comparison. */
export function assertComparableGlyph(glyph) {
  const name = glyph?.canonical_name;
  if (typeof name !== 'string' || !name.length || name.length > 256
    || new TextEncoder().encode(name).length > 256
    || [...new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(name)].length > 64) {
    throw new TypeError('비교할 이름의 길이를 확인할 수 없습니다.');
  }
  const model = glyph.model_data;
  const limits = { harmonics: 8, strands: 8, clusters: 3, pressure: 8,
    slots: 12, branches: 3, jamo: 256, dropZones: 8, inkLoads: 8 };
  if (!model || typeof model !== 'object' || Array.isArray(model)) throw new TypeError('표식 모델이 필요합니다.');
  for (const [key, limit] of Object.entries(limits)) {
    if (model[key] !== undefined && (!Array.isArray(model[key]) || model[key].length > limit)) {
      throw new TypeError('표식의 배열 크기가 비교 범위를 넘었습니다.');
    }
  }
  if (model.clusters?.some((cluster) => !Number.isInteger(cluster?.spikeN) || cluster.spikeN < 0 || cluster.spikeN > 32)) {
    throw new TypeError('표식의 가지 수가 비교 범위를 넘었습니다.');
  }
  // Inspect with a fixed work budget; never stringify unbounded stored JSON.
  const stack = [{ value: model, depth: 0 }];
  let nodes = 0;
  let characters = 0;
  while (stack.length) {
    const { value, depth } = stack.pop();
    nodes += 1;
    if (nodes > 2048 || depth > 12) throw new TypeError('표식 모델이 비교 범위를 넘었습니다.');
    if (typeof value === 'string') {
      characters += value.length;
      if (characters > 32768) throw new TypeError('표식 모델의 텍스트가 너무 큽니다.');
    } else if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new TypeError('표식 모델의 숫자를 확인할 수 없습니다.');
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length > 256) throw new TypeError('표식 모델의 배열이 너무 큽니다.');
        for (const item of value) stack.push({ value: item, depth: depth + 1 });
      } else {
        const keys = Object.keys(value);
        if (keys.length > 128) throw new TypeError('표식 모델의 속성이 너무 많습니다.');
        for (const key of keys) {
          characters += key.length;
          if (characters > 32768) throw new TypeError('표식 모델의 속성이 너무 큽니다.');
          stack.push({ value: value[key], depth: depth + 1 });
        }
      }
    }
  }
}
