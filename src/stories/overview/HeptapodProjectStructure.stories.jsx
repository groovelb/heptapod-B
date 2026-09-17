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
 * 컴포넌트가 아닌 항목(Hook / Context / Data)의 목적·역할 설명.
 * 파일 이름 또는 export 이름을 키로 사용.
 */
const DESCRIPTIONS = {
  // Hooks
  useScrubSoundEngine: 'Hook · 스크롤 위치에 결속된 베드·클립 사운드 엔진',

  // Data
  heptapodHeroStory: 'Data · 인트로 비트 6마디의 카피·영상 구간·셀 가중치',
  heptapodScrubTimeline: 'Data · 비트에서 파생한 스크럽 타임라인(셀 좌표·진행도)',
  layoutTaxonomyData: 'Data · 레이아웃 아키타입 택소노미',
  componentTokenMap: 'Data · 컴포넌트와 디자인 토큰 매핑',
  ruleRelationships: 'Data · Rules·Skills 관계 그래프',
  projectStructure: 'Data · 프로젝트 구조 자동 생성 데이터',
};

/** Context/Provider 이름 패턴 */
const isContextName = (name) => /Context$|Provider$/.test(name);

/**
 * 트리 노드를 TreeNode 가 받을 수 있는 중첩 객체로 변환.
 * - 컴포넌트: 중첩 객체 (자식 컴포넌트 포함)
 * - Context/Provider: 자식 유무와 상관없이 리프(설명 문자열)로 표시
 * - Hooks/Data: 리프(설명 문자열)
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
    out[key] = nodeToTree(child);
  }

  for (const h of node.hooks || []) {
    out[h.name] = DESCRIPTIONS[h.name] || 'Hook';
  }

  for (const d of node.data || []) {
    out[d.name] = DESCRIPTIONS[d.name] || 'Data';
  }

  return out;
}

/** Project Structure - App.jsx 를 루트로 한 전체 구조 트리 탐색기 */
export const Default = {
  render: () => {
    const root = projectStructure.root;
    const tree = nodeToTree(root);

    return (
      <>
        <DocumentTitle
          title="Project Structure"
          status="Available"
          note="App.jsx 를 루트로 한 전체 컴포넌트 포함 관계"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Project Structure
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
            클릭하여 펼치기/접기 | <code>src/App.jsx</code> · 재생성: <code>pnpm generate-structure</code>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 3 } }>
            컴포넌트는 중첩 구조로, 컴포넌트가 아닌 항목(Hook · Context · Data)은 목적·역할 설명과 함께 리프로 표시한다.
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
