import ArchetypeNarrative from './ArchetypeNarrative';
import { ARCHETYPE_CATALOG } from '../../data/heptapodArchetypeCatalog.js';

export default {
  title: 'Custom Component/5. Data Display/ArchetypeNarrative', component: ArchetypeNarrative, tags: ['autodocs'],
  parameters: { docs: { description: { component: '페이지·섹션 제목은 bold, 핵심 산세리프 문장은 20/24px로 제목 아래 위계를 유지합니다. 본문·핵심 문장·제목·소제목·보조 정보에 editorial 시맨틱 타이포를 적용하고, 줄 길이·여백·구분선도 테마 토큰으로 관리합니다. 특징·일상 장면 목록은 표식과 같은 테두리 원 불릿을 쓰고, 여러 줄 본문은 같은 시작선으로 정렬합니다. 배포 JSON에서 내 이름의 뜻을 먼저 보여주고, 상위 군집·메타데이터 조합을 참여자의 행동·관계·일상 장면으로 풉니다. Create 분석·Archive 피드·개별 상세가 재사용하며 분류나 네트워크 요청은 하지 않습니다.' } } },
  argTypes: {
    archetype: { control: 'object', description: '완전 판독한 ARCHETYPE_CATALOG 항목. 미제공하면 군집 설명만 표시' },
    familyId: { control: 'select', options: ['arrival', 'reception', 'reciprocity'], description: '상위 군집. 기본값은 archetype.familyId' },
    showIdentity: { control: 'boolean', description: '이름의 뜻을 맨 앞에 표시. 이미 정체성을 보여주는 피드에서는 false' },
    showMotto: { control: 'boolean', description: '한마디를 처음에 인용문으로 표시. 제목 아래 별도로 표시하는 부모에서는 false' },
    showFamily: { control: 'boolean', description: '피드에서 이미 소개한 상위 군집의 반복 표시 여부' },
    variant: { control: 'select', options: ['full', 'compact'], description: 'full은 특징·상황·긴장·질문·관계·차이·한마디까지 표시, compact는 조합과 핵심 서사' },
    spacing: { control: 'select', options: ['default', 'archive', 'archiveDetail'], description: 'archive는 목록 간격, archiveDetail은 구역 안쪽 패딩과 소제목·본문 간격을 확장. Create 기본 간격과 독립적' },
    sx: { control: 'object', description: 'MUI sx 추가 스타일' },
  },
  args: { archetype: ARCHETYPE_CATALOG['meaning-v1:reciprocity:simultaneity+openness+trace'], showFamily: true, showIdentity: true, variant: 'full', sx: { maxWidth: (theme) => theme.editorial.measure, p: 2 } },
};
export const Docs = {};
export const Family = { args: { archetype: undefined, familyId: 'arrival' } };
export const Feed = { args: { showFamily: false, showIdentity: false, variant: 'compact', spacing: 'archive' } };
export const Archive = { args: { spacing: 'archive' } };
export const Baseline = { args: { archetype: ARCHETYPE_CATALOG['meaning-v1:reception:none'] } };

export const ArchiveDetail = { args: { spacing: 'archiveDetail', showMotto: false } };
