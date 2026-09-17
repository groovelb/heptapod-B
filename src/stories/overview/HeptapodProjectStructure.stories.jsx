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

  // 페이지 템플릿
  HeptapodHeroIntro: '랜딩 전체. 스크럽 트랙과 완주 인계',
  HeptapodEncoderPage: '생성 화면 전체. 인코딩·판독·공개 흐름',
  MyArchivePage: '아카이브 전체. 이름은 옛 개인 화면에서 남았다',
  GlyphDetailPage: '공개 표식 상세와 주요 연결',
  ResonanceFieldPage: '연결 지도와 목록 전환',
  ArchiveComparePage: '두 표식을 나란히 놓고 대응 부위 확인',

  // 전역 내비게이션
  AppGNB: '전역 헤더 래퍼. 경로와 언어 전환을 얹는다',
  GNB: '스타터킷 헤더. 모바일 서랍은 전면 폭',
  LanguageSwitcher: '한국어와 영어 전환',

  // 표식 렌더링
  LogogramChamber: '화면 전체 안개와 깊이 모션',
  LogogramRendererCanvas: '입자 형성. 현재 유일하게 쓰는 렌더러',
  StaticGlyphImage: '좁은 화면 목록과 미리보기의 정지 표식',
  GlyphRenderScope: '살아 있는 표식과 정지 이미지의 적용 범위',
  RatioContainer: '정방형 비율 고정 컨테이너',
  FadeTransition: '패널 등장 페이드',
  LineGrid: '에디토리얼 괘선 격자',

  // 아카이브 표시
  ArchiveDepthExplorer: '계열 상징과 유형 묶음의 깊이 탐색',
  ArchiveArchetypeFeed: '유형별 세로 피드와 실제 구성원',
  ArchiveFamilySymbol: '도래·수용·상호성 계열의 안내용 상징',
  ArchiveSelectedGlyph: '선택 표식 상세. 같은 유형과 부위 그리드',
  ArchiveGlyph: '목록 한 칸의 표식과 중앙 이름',
  ArchiveFeedIndex: '피드 안의 유형 인덱스',
  ArchetypeNarrative: '유형 서사. 조합·특징·질문·관계',
  ArchetypeMotto: '유형의 한마디 인용',
  GlyphMeaningSummary: '이름의 뜻과 관측 근거 요약',
  GlyphClusterLink: '같은 의미군으로 건너가는 링크',
  GlyphObservationChips: '의미 다중 선택 칩',

  // 연결과 비교
  GlyphNode: '지도와 비교에 쓰는 가벼운 표식 노드',
  GlyphPairComparison: '두 표식의 대응 부위에 같은 번호',
  ResonanceMap: '중심 둘레의 이웃 배치',
  ResonanceList: '같은 데이터를 목록으로',
  RelationInspector: '연결 근거 문장과 수치',

  // 오버레이
  AnalysisOverlay: '초록 격자·정점·순차 스캔',
  GlyphObservationOverlay: '선택한 의미의 실제 부위 강조',
  PublishDialog: '공개 동의 확인과 상태 전환',
  SocialShareDialog: '보낼 곳 선택. 기기 공유창은 열지 않는다',
  HeroAffordance: '랜딩의 시작·건너뛰기·소리 안내',

  // 랜딩 스크럽
  VideoScrubbing: '스크롤 위치를 영상 재생 위치로',
  ScrubHud: '마디 카운터와 진행바',
  ScrubCaption: '비트 하나의 캡션. 변주를 골라 그린다',
  CaptionFrame: '캡션의 격자 배치와 진행도 창',
  InkLetters: '글자별 번짐과 자간 변형',
  InstrumentLine: '계기 톤의 보조 라인',
  TitleDisperse: '표제가 스크럽과 함께 흩어진다',
  SeamCaption: '이음매 변주',
  RingCaption: '링 왼쪽을 지나는 패럴럭스 변주',
  MirrorCaption: '위아래 거울 대칭 변주',
  ScrambleCaption: '글자 뒤섞임 변주',
  RotateCaption: '덩어리 회전 변주(구버전)',
  FlipReflowCaption: '세로 기둥에서 문장으로 재배치',
  TypeCaption: '타자 변주',

  // Hooks
  useI18n: 'Hook · 현재 언어와 문구 조회',
  useScrubSoundEngine: 'Hook · 스크롤 위치에 결속된 베드·클립 사운드 엔진',
  useGlyphFormationSound: 'Hook · 표식이 맺힐 때의 소리',
  useArchiveGlyphs: 'Hook · 공개 표식 목록 조회',
  useArchiveMeanings: 'Hook · 목록의 의미 판독 집계',
  useArchiveScroll: 'Hook · 목록과 상세의 스크롤 위치 보존',
  useArchiveMobileObservation: 'Hook · 좁은 화면의 관측 표시 배치',
  useGlyph: 'Hook · 공개 표식 하나 조회',
  useGlyphRelations: 'Hook · 중심 표식의 연결 조회',
  usePublish: 'Hook · 동의 확인과 공개 요청',

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
 * - 중복 가지(ref): 설명 뒤에 이미 펼친 곳이 있다고 표시
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
    if (Object.keys(subtree).length) {
      out[key] = subtree;
      continue;
    }
    const text = DESCRIPTIONS[child.name] || 'Component';
    out[key] = child.ref ? `${text} (다른 가지에 이미 펼침)` : text;
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
