/**
 * Heptapod B Encoder — 검증 스크립트 (외부 프레임워크 없음)
 *
 * 실행: node src/utils/heptapod/verify.mjs
 * 실패 시 exit 1.
 *
 * 검증 항목:
 *   a. 결정론  — 같은 이름 50회 호출 → 동일 모델 (deep equal)
 *   b. 다양성  — 샘플 50개(한글 25 + 영문 25) 시각 충돌 0 + 유사도 분포
 *   c. 갈고리 독립성 — questionHook 토글 전후 본체 deep equal
 *   d. 하한 보장 — 1글자 이름도 가지 ≥ 3
 *   e. 범위 검증 — 모든 출력 파라미터가 F1~F8 범위 내
 */

import { encode } from './encode.js';
import { buildModel, RANGES, BRANCH_TYPES, SLOT_COUNT } from './buildModel.js';

const TWO_PI = Math.PI * 2;

/** 샘플 이름 50개 — 한글 25 + 영문 25, 1~5글자 혼합 */
const SAMPLE_NAMES = [
  // 한글 25
  '김민준', '이서연', '박지호', '최수아', '한강',
  '윤', '나비', '헵타포드', '정다은', '강현우',
  '조은별', '임태양', '오하늘', '서지우', '신라',
  '백두산', '류', '문샛별', '황금비', '안개꽃',
  '장미래', '권오성', '홍길동', '별', '구름달빛',
  // 영문 25
  'Louise', 'Ian', 'Abbott', 'Costello', 'Amy',
  'Eva', 'Hannah', 'Weber', 'Halpern', 'Shang',
  'Banks', 'Donnelly', 'Kang', 'Ted', 'Chiang',
  'Sapir', 'Whorf', 'Vona', 'Remmy', 'Astra',
  'Echo', 'Nova', 'Orion', 'Lyra', 'Zed',
];

let failures = 0;
const rows = [];

/**
 * 검증 결과 1행 기록.
 * @param {string} id - 검증 항목 ID
 * @param {string} name - 항목 이름
 * @param {boolean} pass - 통과 여부
 * @param {string} detail - 수치/상세
 */
function record(id, name, pass, detail) {
  if (!pass) {
    failures += 1;
  }
  rows.push({ id, name, result: pass ? 'PASS' : 'FAIL', detail });
}

/**
 * 재귀 deep equal (순수 JSON 데이터 전제).
 * @param {*} a - 비교 대상 A
 * @param {*} b - 비교 대상 B
 * @returns {boolean} 동일 여부
 */
function deepEqual(a, b) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b || a === null || b === null) {
    return false;
  }
  if (typeof a !== 'object') {
    return false;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) {
    return false;
  }
  return ka.every((k) => deepEqual(a[k], b[k]));
}

/**
 * 범위 검사 헬퍼.
 * @param {number} v - 값
 * @param {number} min - 하한
 * @param {number} max - 상한
 * @returns {boolean} 범위 내 여부
 */
function inRange(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min - 1e-12 && v <= max + 1e-12;
}

// ─────────────────────────────────────────────────────────────────────────
// a. 결정론: 같은 이름 50회 → 동일 모델
// ─────────────────────────────────────────────────────────────────────────
{
  const targets = ['김민준', 'Louise', '윤', 'Abbott Costello'];
  let allEqual = true;
  let checked = 0;
  for (const name of targets) {
    const ref = buildModel(encode(name), { questionHook: true });
    const refJson = JSON.stringify(ref);
    for (let i = 0; i < 50; i += 1) {
      const again = buildModel(encode(name), { questionHook: true });
      checked += 1;
      if (JSON.stringify(again) !== refJson || !deepEqual(ref, again)) {
        allEqual = false;
      }
    }
  }
  record('a', '결정론 (같은 이름 50회 deep equal)', allEqual, `${targets.length}개 이름 × 50회 = ${checked}회 비교, 불일치 ${allEqual ? 0 : '있음'}`);
}

// ─────────────────────────────────────────────────────────────────────────
// b. 다양성: 50개 샘플 시각 충돌 검사 + 유사도 분포
// ─────────────────────────────────────────────────────────────────────────
const models = SAMPLE_NAMES.map((name) => buildModel(encode(name)));
{
  const sig = (m) => ({
    slotPattern: m.slots.map((s) => (s.active ? 1 : 0)).join(''),
    typeSeq: m.branches.map((b) => b.type).join(','),
    weightAngle: m.ring.weightCenterAngle,
  });
  const sigs = models.map(sig);
  const collisions = [];
  const hammingDist = [];
  const angleDiffs = [];
  for (let i = 0; i < sigs.length; i += 1) {
    for (let j = i + 1; j < sigs.length; j += 1) {
      const a = sigs[i];
      const b = sigs[j];
      let ham = 0;
      for (let k = 0; k < SLOT_COUNT; k += 1) {
        if (a.slotPattern[k] !== b.slotPattern[k]) {
          ham += 1;
        }
      }
      hammingDist.push(ham);
      let da = Math.abs(a.weightAngle - b.weightAngle) % TWO_PI;
      if (da > Math.PI) {
        da = TWO_PI - da;
      }
      angleDiffs.push(da);
      if (a.slotPattern === b.slotPattern && a.typeSeq === b.typeSeq && Math.abs(a.weightAngle - b.weightAngle) < 1e-9) {
        collisions.push(`${SAMPLE_NAMES[i]} ↔ ${SAMPLE_NAMES[j]}`);
      }
    }
  }
  const pairs = hammingDist.length;
  const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const hist = new Array(SLOT_COUNT + 1).fill(0);
  hammingDist.forEach((h) => {
    hist[h] += 1;
  });
  record('b', '다양성 (시각 충돌 쌍 = 0)', collisions.length === 0, `${pairs}쌍 검사, 충돌 ${collisions.length}건${collisions.length ? ' — ' + collisions.join(', ') : ''}`);

  console.log('\n[다양성 지표 분포] (50개 모델, 1225쌍)');
  console.log(`  슬롯 패턴 해밍 거리: min ${Math.min(...hammingDist)} / avg ${avg(hammingDist).toFixed(2)} / max ${Math.max(...hammingDist)}`);
  console.log(`  해밍 히스토그램 [거리:쌍수]: ${hist.map((c, d) => (c ? `${d}:${c}` : null)).filter(Boolean).join('  ')}`);
  console.log(`  무게중심 각도차: min ${(Math.min(...angleDiffs) * 180 / Math.PI).toFixed(2)}° / avg ${(avg(angleDiffs) * 180 / Math.PI).toFixed(1)}°`);
  const ham0 = hist[0];
  console.log(`  슬롯 패턴 완전 일치 쌍: ${ham0} (유형 시퀀스·각도까지 일치해야 충돌)`);
}

// ─────────────────────────────────────────────────────────────────────────
// c. 갈고리 독립성: questionHook 토글 전후 본체 deep equal
// ─────────────────────────────────────────────────────────────────────────
{
  let independent = true;
  let hookPresent = true;
  for (const name of SAMPLE_NAMES) {
    const off = buildModel(encode(name), { questionHook: false });
    const on = buildModel(encode(name), { questionHook: true });
    if (on.questionHook === null) {
      hookPresent = false;
    }
    if (off.questionHook !== null) {
      independent = false;
    }
    const bodyOff = { ...off, questionHook: undefined };
    const bodyOn = { ...on, questionHook: undefined };
    if (!deepEqual(bodyOff, bodyOn)) {
      independent = false;
    }
  }
  record('c', '갈고리 독립성 (토글 전후 본체 불변)', independent && hookPresent, `50개 이름 토글 비교, 본체 불변 ${independent ? 'OK' : 'FAIL'}, 갈고리 생성 ${hookPresent ? 'OK' : 'FAIL'}`);
}

// ─────────────────────────────────────────────────────────────────────────
// d. 하한 보장: 1글자 이름도 가지 ≥ 3
// ─────────────────────────────────────────────────────────────────────────
{
  const shortNames = ['윤', '별', '류', 'A', 'I', 'é', '강', 'Z', ''];
  const counts = shortNames.map((n) => buildModel(encode(n)).branches.length);
  const ok = counts.every((c) => c >= 3);
  record('d', '하한 보장 (1글자 → 가지 ≥ 3)', ok, shortNames.map((n, i) => `'${n || '∅'}':${counts[i]}`).join(' '));
}

// ─────────────────────────────────────────────────────────────────────────
// e. 범위 검증: 모든 출력 파라미터가 F1~F8 범위 내
// ─────────────────────────────────────────────────────────────────────────
{
  const errors = [];
  let inCount = 0;
  let outCount = 0;
  const allModels = SAMPLE_NAMES.map((n) => buildModel(encode(n), { questionHook: true }));

  allModels.forEach((m, idx) => {
    const tag = SAMPLE_NAMES[idx];
    const err = (msg) => errors.push(`[${tag}] ${msg}`);
    const r = m.ring;

    // F1
    if (!inRange(r.ellipticity, ...RANGES.ellipticity)) {
      err(`ellipticity ${r.ellipticity}`);
    }
    if (r.harmonics.length !== 4 || !r.harmonics.every((h) => RANGES.harmonicKs.includes(h.k) && inRange(h.amp, ...RANGES.harmonicAmp) && inRange(h.phase, 0, TWO_PI))) {
      err('harmonics 범위 이탈');
    }
    // F2
    if (r.strokeWidth.min !== RANGES.strokeMin || !inRange(r.strokeWidth.base, ...RANGES.strokeBase) || !inRange(r.strokeWidth.peak, ...RANGES.strokePeak) || !inRange(r.strokeWidth.peakSigma, ...RANGES.strokeSigma)) {
      err('strokeWidth 범위 이탈');
    }
    // F3
    if (!inRange(r.strands.count, ...RANGES.strandCount) || !Number.isInteger(r.strands.count) || !inRange(r.strands.separation, ...RANGES.strandSep) || r.strands.phaseOffsets.length !== r.strands.count) {
      err('strands 범위 이탈');
    }
    // F7
    if (r.gap.isOpen && !inRange(r.gap.width, RANGES.gapWidth[0], RANGES.gapWidth[1])) {
      err(`gap.width ${r.gap.width}`);
    }
    // S1/S4
    if (!inRange(m.branches.length, ...RANGES.branchCount)) {
      err(`branchCount ${m.branches.length}`);
    }
    // 슬롯 구조
    const activeCount = m.slots.filter((s) => s.active).length;
    if (m.slots.length !== 12 || activeCount !== m.branches.length) {
      err(`slots 구조 (active ${activeCount} ≠ branches ${m.branches.length})`);
    }
    // F4 클러스터
    if (!inRange(m.clusters.length, 1, 6)) {
      err(`clusterCount ${m.clusters.length}`);
    }
    // F5/F6/F8 + S2 가지
    m.branches.forEach((b) => {
      if (!BRANCH_TYPES.includes(b.type)) {
        err(`branch type ${b.type}`);
      }
      if (!inRange(b.length, ...RANGES.branchLength)) {
        err(`branch length ${b.length}`);
      }
      if (!inRange(b.curl, -1, 1) || !inRange(b.widthMul, 0.6, 1.4)) {
        err('branch curl/widthMul 이탈');
      }
      if (b.direction !== 'in' && b.direction !== 'out') {
        err(`branch direction ${b.direction}`);
      }
      if (b.direction === 'in') {
        inCount += 1;
      } else {
        outCount += 1;
      }
      if (b.droplet && !inRange(b.droplet.diameter, 0.03, RANGES.dropletMax)) {
        err(`droplet ${b.droplet.diameter}`);
      }
      if (b.isEscapeLoop && !inRange(b.escapeLoopLength, ...RANGES.escapeLoopLength)) {
        err(`escapeLoopLength ${b.escapeLoopLength}`);
      }
    });
    // F6 스플래터
    if (!inRange(m.splatter.length, ...RANGES.splatterCount)) {
      err(`splatterCount ${m.splatter.length}`);
    }
    m.splatter.forEach((s) => {
      if (!inRange(s.diameter, ...RANGES.splatterDiameter)) {
        err(`splatter diameter ${s.diameter}`);
      }
    });
    // questionHook
    const q = m.questionHook;
    if (!q || !inRange(q.length, 0.15, 0.35) || !inRange(Math.abs(q.curl), 0.5, 1) || !inRange(q.widthMul, 0.8, 1.2)) {
      err('questionHook 범위 이탈');
    }
  });

  const outRatio = outCount / (inCount + outCount);
  // F5 안:밖 ≈ 2:8 — 집계 비율이 통계적 허용 범위 내인지
  if (!inRange(outRatio, 0.65, 0.95)) {
    errors.push(`direction out 비율 ${outRatio.toFixed(3)} — 기대 ≈ 0.8`);
  }

  record('e', '범위 검증 (F1~F8 전 파라미터)', errors.length === 0, errors.length === 0 ? `50개 모델 전수 통과, 가지 방향 out 비율 ${(outRatio * 100).toFixed(1)}% (기대 80%)` : errors.slice(0, 5).join(' | '));
}

// ─────────────────────────────────────────────────────────────────────────
// 결과 출력
// ─────────────────────────────────────────────────────────────────────────
console.log('\n[Heptapod B Encoder — verify 결과]');
console.table(rows.map((r) => ({ 항목: r.id, 검증: r.name, 결과: r.result, 상세: r.detail })));

if (failures > 0) {
  console.error(`\n${failures}개 항목 실패`);
  process.exit(1);
}
console.log('\n전 항목 통과');
