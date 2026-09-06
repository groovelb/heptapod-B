import ArchiveClusterExplorer from './ArchiveClusterExplorer';
import { ARCHIVE_STORY_GLYPHS } from '../../test-fixtures/archiveClient';
import { clusterArchiveGlyphs } from '../../utils/heptapod/clusterArchiveGlyphs';

const glyphs = ARCHIVE_STORY_GLYPHS.filter((glyph) => glyph.is_public);
const clusters = clusterArchiveGlyphs(glyphs);
export default {
  title: 'Custom Component/Data Display/ArchiveClusterExplorer', component: ArchiveClusterExplorer, tags: ['autodocs'],
  parameters: { docs: { description: { component: '실제 로컬 인코더로 만든 표식에서 계산한 중첩 군집입니다. 군집 선택 이벤트는 갤러리의 필터로 전달되며, 선택 상태는 Controls의 selectedId로 확인합니다. 공개 DB·인증·네트워크를 사용하지 않습니다. 같은 군집의 모든 구성원 쌍과 같은 관측 부위를 검증합니다.' } } },
  argTypes: {
    clusters: { control: 'object', description: '직렬화 가능한 군집 계산 결과' },
    glyphs: { control: 'object', description: '공개 표본의 저장된 표식 모델' },
    selectedId: { control: 'select', options: [null, 'ungrouped', ...clusters.groups.map((group) => group.id)], description: '선택한 군집 또는 미소속 범위' },
    onSelect: { action: 'select', description: '표시 범위 선택' },
    loading: { control: 'boolean', description: '군집 계산 중' },
    error: { control: 'text', description: '계산 오류' },
    onRetry: { action: 'retry', description: '계산 다시 시도' },
    onCompare: { action: 'compare', description: '공개 표식 쌍 비교·공유 화면 이동' },
  },
  args: { glyphs, clusters, selectedId: null, loading: false, error: null },
};
export const Default = {};
export const Selected = { args: { selectedId: clusters.groups.find((group) => group.kind === 'branch').id } };
export const Empty = { args: { clusters: clusterArchiveGlyphs(glyphs.slice(3, 4)), glyphs: glyphs.slice(3, 4) } };
export const Loading = { args: { clusters: null, loading: true } };
export const Error = { args: { clusters: null, error: '군집 계산을 완료하지 못했어요.' } };
