/**
 * 인코더 파이프라인 한 번 실행.
 *
 * 09 Encoder Pipeline 과 Custom Component/1. Encoder/GlyphModel 이 같은 함수를 쓴다.
 * 화면이 쓰는 유틸을 그대로 호출하므로 여기 뜨는 값이 실제 값이다.
 */
import { normalizeName } from '../../utils/heptapod/normalizeName';
import { validateName } from '../../utils/heptapod/validateName';
import { encode } from '../../utils/heptapod/encode';
import { buildModel } from '../../utils/heptapod/buildModel';
import { buildModelReversible, decode, inspect } from '../../utils/heptapod/reversibleModel';
import { extractGlyphFeatures } from '../../utils/heptapod/extractGlyphFeatures';
import { classifyGlyphMorphology } from '../../utils/heptapod/classifyGlyphMorphology';
import { interpretGlyphMeaning } from '../../utils/heptapod/interpretGlyphMeaning';
import { buildMeaningReading } from '../../utils/heptapod/buildMeaningReading';
import { getGlyphArchetype } from '../../data/heptapodArchetypeCatalog';
import { ARCHIVE_ENCODER_VERSION } from '../../utils/heptapod/archiveGlyph';

/** 배열이면 길이, 없으면 '해당 없음' */
const countOf = (value) => (Array.isArray(value) ? value.length : '해당 없음');

/** 소수 자리 정리 (깊은 JSON 을 읽을 수 있게) */
const round = (value, digits = 3) => (typeof value === 'number' && Number.isFinite(value)
  ? Number(value.toFixed(digits)) : value);

/** 중첩 객체의 숫자를 전부 반올림해 표시용으로 만든다 */
export function readable(value, digits = 3) {
  if (Array.isArray(value)) return value.map((item) => readable(item, digits));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, readable(item, digits)]));
  }
  return round(value, digits);
}

/**
 * 이름 하나를 단계별로 흘려 중간 산출물을 모은다.
 *
 * @param {string} name - 입력 이름 [Required]
 * @returns {{ steps: Array<object>, model: ?object, legacyModel: ?object, interpretation: ?object }}
 */
export function runEncoderPipeline(name) {
  const steps = [];
  const push = (step) => { steps.push(step); return step.data; };

  const canonical = push({
    id: 'normalize',
    title: '1. 정규화',
    module: 'utils/heptapod/normalizeName.js',
    summary: 'NFC, 앞뒤 공백 제거, 연속 공백 축약, 소문자화. 물음표는 본문에서 떼어 의문 여부로 옮긴다',
    data: normalizeName(name),
  });

  const validation = push({
    id: 'validate',
    title: '2. 검증',
    module: 'utils/heptapod/validateName.js',
    summary: '빈 값, 지원하지 않는 문자, 길이 상한을 거른다. 통과하지 못하면 여기서 멈춘다',
    data: validateName(name),
  });

  if (!validation.valid) {
    return { steps, model: null, legacyModel: null, interpretation: null, canonical, validation };
  }

  const seed = encode(name);
  push({
    id: 'encode',
    title: '3. 시드',
    module: 'utils/heptapod/encode.js',
    summary: 'NFD 로 쪼갠 뒤 xmur3 해시를 만들고, 본체와 갈고리가 각각 다른 난수 스트림을 받는다',
    data: {
      hash: seed.hash,
      hashHex: seed.hashHex,
      nfdUnitCount: seed.nfdUnits.length,
      nfdUnits: seed.nfdUnits.join(' '),
      streams: ['body', 'hook'],
    },
  });

  const legacyModel = buildModel(seed);
  push({
    id: 'buildModel',
    title: '4. 형태 파라미터 (v1)',
    module: 'utils/heptapod/buildModel.js',
    summary: '시드에서 링, 슬롯 12, 가지, 덩어리를 뽑는다. 렌더링 관심사는 들어가지 않는다',
    data: {
      meta: legacyModel.meta,
      ring: readable({
        ellipticity: legacyModel.ring.ellipticity,
        harmonics: legacyModel.ring.harmonics,
        strokeWidth: legacyModel.ring.strokeWidth,
        weightCenterAngle: legacyModel.ring.weightCenterAngle,
      }),
      slotCount: countOf(legacyModel.slots),
      activeSlots: Array.isArray(legacyModel.slots)
        ? legacyModel.slots.filter((slot) => slot.active).length : '해당 없음',
      branchCount: countOf(legacyModel.branches),
      clusterCount: countOf(legacyModel.clusters),
      strandCount: countOf(legacyModel.strands),
      inkLoadCount: countOf(legacyModel.inkLoads),
      dropZoneCount: countOf(legacyModel.dropZones),
      gap: legacyModel.gap ? readable(legacyModel.gap) : '해당 없음 (닫힌 링)',
      splatter: countOf(legacyModel.splatter),
    },
  });

  const model = buildModelReversible(name);
  push({
    id: 'reversible',
    title: `5. 가역 모델 (v${ARCHIVE_ENCODER_VERSION})`,
    module: 'utils/heptapod/reversibleModel.js · reversibleCodec.js',
    summary: '이름을 큰 정수 하나로 바꾸고 그 자릿수를 덩어리와 가닥에 나눠 담는다. 공개 아카이브가 쓰는 모델이다',
    data: {
      meta: model.meta,
      clusterCount: countOf(model.clusters),
      strandCount: countOf(model.strands),
      gap: model.gap ? readable(model.gap) : '해당 없음 (닫힌 링)',
      questionHook: model.questionHook ? readable(model.questionHook) : '해당 없음',
    },
  });

  push({
    id: 'inspect',
    title: '6. 자릿수 풀이',
    module: 'utils/heptapod/reversibleModel.js · inspect()',
    summary: '이름이 어떤 진법으로 어떤 수가 됐는지, 그 수가 어느 칸에 들어갔는지 보여 준다',
    data: readable(inspect(model)),
  });

  const restored = decode(model);
  push({
    id: 'decode',
    title: '7. 되읽기',
    module: 'utils/heptapod/reversibleModel.js · decode()',
    summary: '형태만 보고 이름을 복원한다. 입력과 같아야 결정론과 가역이 성립한다',
    data: { ...restored, matchesInput: restored.name === normalizeName(name).canonicalName },
  });

  const features = extractGlyphFeatures(model);
  push({
    id: 'features',
    title: '8. 특징 추출',
    module: 'utils/heptapod/extractGlyphFeatures.js',
    summary: '관계 계산이 쓰는 값이다. 링 윤곽, 개구부, 가지, 필압과 먹 분포를 숫자로 만든다',
    data: readable({
      strandCount: features.strandCount,
      clusterCount: features.clusterCount,
      weightCenterAngle: features.weightCenterAngle,
      gap: features.gap,
      ringPeakCount: countOf(features.ringPeaks),
      inkPeakCount: countOf(features.inkPeaks),
      pressurePeakCount: countOf(features.pressurePeaks),
      contourLineage: features.contourLineage,
    }),
  });

  const morphology = classifyGlyphMorphology(model);
  push({
    id: 'morphology',
    title: '9. 형태 분류',
    module: 'utils/heptapod/classifyGlyphMorphology.js',
    summary: '링의 열림, 초점 방향과 개수, 배치, 먹 봉우리를 규칙으로 분류한다',
    data: readable({
      status: morphology.status,
      ring: morphology.ring,
      direction: morphology.direction,
      focusCount: morphology.focusCount,
      arrangement: morphology.arrangement,
      ink: morphology.ink,
      inkPeakCount: morphology.inkPeakCount,
      morphologyKey: morphology.morphologyKey,
    }),
  });

  const interpretation = interpretGlyphMeaning(model);
  push({
    id: 'meaning',
    title: '10. 의미 판독',
    module: 'utils/heptapod/interpretGlyphMeaning.js',
    summary: '분류를 기본 의미 하나와 추가 의미 셋으로 옮긴다. 이름의 뜻이 아니라 형태의 뜻이다',
    data: {
      status: interpretation.status,
      baseMeaning: interpretation.baseMeaning,
      modifiers: interpretation.modifiers,
      meaningKey: interpretation.meaningKey,
      title: interpretation.title,
      observationCount: countOf(interpretation.observations),
    },
  });

  push({
    id: 'reading',
    title: '11. 관측 문장',
    module: 'utils/heptapod/buildMeaningReading.js',
    summary: '각 의미가 형태의 어느 부위에서 나왔는지 문장과 좌표로 잇는다',
    data: (buildMeaningReading(interpretation, 'ko') || []).map((entry) => ({
      meaningId: entry.meaningId,
      label: entry.label,
      reason: entry.reason,
      anchors: countOf(entry.anchors),
    })),
  });

  const archetype = getGlyphArchetype(interpretation);
  push({
    id: 'archetype',
    title: '12. 유형',
    module: 'data/heptapodArchetypeCatalog.js',
    summary: '기본 의미 3 곱하기 추가 의미 조합 8, 스물넷 중 하나로 이름을 읽는다',
    data: archetype ? {
      meaningKey: archetype.meaningKey,
      title: archetype.title,
      reading: archetype.reading,
      motto: archetype.motto,
      order: archetype.order,
    } : { note: '완전 판독이 아니어서 유형을 붙이지 않는다' },
  });

  push({
    id: 'fingerprint',
    title: '13. 공개 정체성',
    module: 'utils/heptapod/archiveGlyph.js · prepareArchiveGlyph()',
    browserOnly: true,
    summary: '다듬은 이름과 의문 여부와 버전으로 SHA-256 지문을 만든다. crypto.subtle 을 쓰므로 이 표에서는 호출하지 않는다',
    data: {
      input: `${normalizeName(name).canonicalName} · interrogative=${normalizeName(name).isInterrogative} · v${ARCHIVE_ENCODER_VERSION}`,
      note: '서버가 공개 시 같은 입력으로 다시 계산해 대조한다',
    },
  });

  return { steps, model, legacyModel, interpretation, canonical, validation };
}

export default runEncoderPipeline;
