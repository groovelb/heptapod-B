import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  DocumentTitle,
  PageContainer,
  TreeNode,
} from '../../components/storybookDocumentation';
import projectStructure from '../../data/projectStructure.js';

export default {
  title: 'Overview/Heptapod B/04 Project Structure',
  parameters: {
    layout: 'padded',
  },
};

/**
 * 컴포넌트가 아닌 항목(Hook / Context / Data)과 잎 컴포넌트의 목적 설명.
 * 파일 이름 또는 export 이름을 키로 사용.
 */
const DESCRIPTIONS = {
  // App Router 진입점
  'app/layout': 'Route · 서버 루트 레이아웃, 폰트와 메타데이터',
  'app/page': 'Route · `/` 영상 랜딩',
  'app/canvas/page': 'Route · `/canvas` 이름 입력과 표식 생성',
  'app/archive/page': 'Route · `/archive` 계열과 유형 피드',
  'app/glyph/[id]/page': 'Route · `/glyph/:id` 공개 표식 상세',
  'app/field/[id]/page': 'Route · `/field/:id` 연결 지도',
  'app/compare/[leftId]/[[...rightId]]/page': 'Route · `/compare/:left/:right?` 두 표식 비교',

  // Provider / Context
  providers: 'Provider · 테마, 로케일, 라우터를 클라이언트에 주입',
  LocaleProvider: 'Provider · 한영 사전과 문서 언어 속성',
  NextRouterProvider: 'Provider · 기존 라우터 훅을 Next 내비게이션에 연결',
  NavigationSessionProvider: 'Provider · 경로 간 이동 의도와 복귀 위치 보관',

  // 라우팅
  NextRouteView: 'Route · 서버 페이지가 부르는 클라이언트 라우트 뷰',
  AppRoutes: '경로 등록. 랜딩·캔버스·아카이브와 UUID 경로 3종',
  EncoderRoutes: '랜딩 완료 인계와 옛 이름 쿼리 어댑터',

  // Hooks
  useI18n: 'Hook · 현재 언어와 문구 조회',
  useScrubSoundEngine: 'Hook · 스크롤 위치에 결속된 베드·클립 사운드 엔진',

  // Data
  heptapodHeroStory: 'Data · 인트로 비트 6마디의 카피·영상 구간·셀 가중치',
  heptapodScrubTimeline: 'Data · 비트에서 파생한 스크럽 타임라인(셀 좌표·진행도)',
  heptapodMeaningCatalog: 'Data · 기본 의미 3종과 추가 의미 3종의 정의',
  heptapodArchetypeCatalog: 'Data · 의미 조합 24개의 제목·서사·관계',
  archetypeNarratives: 'Data · 계열 3개와 유형 24개의 한영 원고',
  archiveArchetypeSymbols: 'Data · 유형 상징 24종의 저작 모델',
  archiveFamilySymbols: 'Data · 계열 상징 3종의 저작 모델',
  layoutTaxonomyData: 'Data · 레이아웃 아키타입 택소노미',
  componentTokenMap: 'Data · 컴포넌트와 디자인 토큰 매핑',
  ruleRelationships: 'Data · Rules·Skills 관계 그래프',
  projectStructure: 'Data · 프로젝트 구조 자동 생성 데이터',
};

/** Context/Provider 이름 패턴 */
const isContextName = (name) => /Context$|Provider$/.test(name);

/**
 * 트리 노드를 TreeNode 가 받을 수 있는 중첩 객체로 변환.
 * - 자식이 있는 컴포넌트: 중첩 객체
 * - Context/Provider: 자식 유무와 상관없이 리프(설명 문자열)로 표시
 * - 잎 컴포넌트/Hook/Data: 리프(설명 문자열)
 */
function nodeToTree(node) {
  const out = {};
  const nameCount = {};

  for (const child of node.children || []) {
    // Context/Provider는 설명만 남기고 하위 탐색 중단
    if (isContextName(child.name)) {
      out[child.name] = DESCRIPTIONS[child.name] || 'Context/Provider';
      continue;
    }
    let key = child.name;
    if (nameCount[key] !== undefined) {
      nameCount[key] += 1;
      key = `${child.name}#${nameCount[key]}`;
    } else {
      nameCount[key] = 0;
    }
    const subtree = nodeToTree(child);
    out[key] = Object.keys(subtree).length
      ? subtree
      : DESCRIPTIONS[child.name] || 'Component';
  }

  for (const h of node.hooks || []) {
    out[h.name] = DESCRIPTIONS[h.name] || 'Hook';
  }

  for (const d of node.data || []) {
    out[d.name] = DESCRIPTIONS[d.name] || 'Data';
  }

  return out;
}

/** Project Structure - app 디렉터리를 루트로 한 전체 구조 트리 탐색기 */
export const Default = {
  render: () => {
    const root = projectStructure.root;
    const tree = nodeToTree(root);

    return (
      <>
        <DocumentTitle
          title="Project Structure"
          status="Available"
          note="app 라우터를 루트로 한 전체 컴포넌트 포함 관계"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Project Structure
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
            클릭하여 펼치기/접기 | <code>app/layout.jsx</code>와 라우트 7개가 루트 · 재생성: <code>pnpm generate-structure</code>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 3 } }>
            자식이 있는 컴포넌트는 중첩 구조로, 그 밖의 항목(라우트 · Provider · Hook · Data)은 목적 설명과 함께 리프로 표시한다.
          </Typography>

          <Box sx={ { p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 } }>
            <Box sx={ { fontFamily: 'monospace' } }>
              <TreeNode keyName={ root.name } value={ tree } depth={ 0 } defaultOpen />
            </Box>
          </Box>
        </PageContainer>
      </>
    );
  },
};
