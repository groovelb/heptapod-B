/**
 * MODEL.md 계약 형태로 맞춘 표식 모델 (스토리 전용 어댑터).
 *
 * `LogogramRendererSvg` 와 `LogogramRendererWebgl` 은 `src/utils/heptapod/MODEL.md` 의
 * 계약(`ring.strands`, `ring.gap`, `branches[].curl/length/direction/droplet`, `splatter`)을 읽는다.
 * 현재 `buildModel` 은 입자 렌더러용 형태(`strands[]`, `clusters[]`, `dropZones[]`, `inkLoads[]`)를 내보내
 * 두 이름이 같은 자리에서 다른 뜻을 갖는다. 화면은 Canvas 렌더러만 쓰므로 이 어긋남이 드러나지 않았다.
 *
 * 제품 코드를 고치지 않고 스토리에서만 계약 형태로 환산한다. 아래 매핑은 이 파일이 만든 표시용 값이고
 * 인코딩 결과가 아니다. 데이터의 출처는 전부 실제 모델이며 새로 만들어 낸 수치는 없다.
 */
import { encode } from '../../utils/heptapod/encode';
import { buildModel } from '../../utils/heptapod/buildModel';

/** 값을 범위 안으로 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 계약의 가지 유형 4종 */
const BRANCH_TYPES = ['wisp', 'hook', 'blob', 'spike'];

/**
 * 현재 모델의 덩어리 하나를 계약의 가지 하나로 환산한다.
 *
 * @param {object} branch - 현재 모델 branches[i] (index, type, slotIndex, angle, intensity) [Required]
 * @param {object} cluster - 같은 순번의 clusters[i] (ang, I, dirBias, spikeN, coneSpread, ph) [Optional]
 * @returns {object} MODEL.md 계약의 branch
 */
function toContractBranch(branch, cluster) {
  const type = BRANCH_TYPES.includes(branch.type) ? branch.type : 'wisp';
  const intensity = Number.isFinite(branch.intensity) ? branch.intensity : 1;
  const spread = cluster && Number.isFinite(cluster.coneSpread) ? cluster.coneSpread : 0.3;
  const phase = cluster && Number.isFinite(cluster.ph) ? cluster.ph : 0;
  return {
    index: branch.index,
    slotIndex: branch.slotIndex,
    jamo: null,
    code: 0,
    type,
    angle: branch.angle,
    direction: cluster && cluster.dirBias < 0 ? 'in' : 'out',
    length: clamp(0.1 + spread * 0.3, 0.1, 0.4),
    curl: clamp(Math.sin(phase), -1, 1),
    widthMul: clamp(intensity, 0.6, 1.4),
    angleJitter: 0,
    droplet: type === 'blob'
      ? { diameter: clamp(0.12 + intensity * 0.1, 0.12, 0.35) }
      : { diameter: clamp(0.03 + intensity * 0.03, 0.03, 0.1) },
    isEscapeLoop: false,
    escapeLoopLength: 0,
  };
}

/**
 * 이름 하나를 MODEL.md 계약 형태의 모델로 만든다.
 *
 * @param {string} name - 인코딩할 이름 [Required]
 * @param {object} options - buildModel 옵션 (questionHook 등) [Optional]
 * @returns {object} 계약 형태의 LogogramModel
 */
export function contractModelOf(name, options = {}) {
  const model = buildModel(encode(name), options);
  const strands = Array.isArray(model.strands) ? model.strands : [];
  const branches = Array.isArray(model.branches) ? model.branches : [];
  const clusters = Array.isArray(model.clusters) ? model.clusters : [];
  const dropZones = Array.isArray(model.dropZones) ? model.dropZones : [];
  const hook = model.questionHook;

  return {
    ...model,
    ring: {
      ...model.ring,
      strands: {
        count: clamp(strands.length || 1, 1, 4),
        separation: strands.length
          ? clamp(Math.abs(strands[0].off) * 0.1, 0, 0.1)
          : 0,
        phaseOffsets: strands.slice(0, 4).map((strand, index) => (index === 0 ? 0 : strand.wobPh)),
      },
      gap: model.gap
        ? { isOpen: true, angle: model.gap.ang, width: clamp(model.gap.half * 2, 0, Math.PI / 3) }
        : { isOpen: false, angle: 0, width: 0 },
    },
    branches: branches.map((branch, index) => toContractBranch(branch, clusters[index])),
    splatter: dropZones.map((zone) => ({
      angle: zone.ang,
      distance: clamp(1 + zone.width, 0.75, 1.35),
      diameter: clamp(zone.strength * 0.03, 0.01, 0.03),
    })),
    questionHook: hook
      ? {
        angle: hook.ang,
        length: clamp(hook.len / 100, 0.15, 0.35),
        curl: clamp(hook.curl, -1, 1),
        widthMul: 1,
      }
      : null,
  };
}

export default contractModelOf;
