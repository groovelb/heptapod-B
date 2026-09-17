import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
  DocumentTitle,
  PageContainer,
  SectionTitle,
  TreeNode,
} from '../../components/storybookDocumentation';
import projectStructure from '../../data/projectStructure.js';

export default {
  title: 'Custom Component/0. Hierarchy',
  parameters: {
    layout: 'padded',
  },
};

/**
 * 컴포넌트 출처 분류.
 * 스타터킷 `src/components`와 파일 단위로 비교한 결과다(동일 = 스타터킷, 다름 = 수정, 이 저장소에만 = 신규).
 * 값은 { kind, note }이고 kind 는 starterkit / modified / new / app 중 하나다.
 */
const CLASSIFICATION = {
  FadeTransition: { kind: 'starterkit' },
  RatioContainer: { kind: 'starterkit' },
  GNB: { kind: 'modified', note: '언어·경로 항목과 전면 서랍' },
  LineGrid: { kind: 'modified', note: '에디토리얼 괘선 격자' },
  VideoScrubbing: { kind: 'modified', note: '모바일 트랙과 실제 종료 판정' },
};

/** app 디렉터리와 라우팅·전역 provider 계층 */
const APP_LAYER = new Set([
  'app', 'providers', 'App', 'AppRoutes', 'EncoderRoutes', 'NextRouteView',
  'NextRouterProvider', 'NavigationSessionProvider', 'LocaleProvider',
]);

/** 라우트 페이지를 그리는 템플릿 */
const ROUTE_TEMPLATES = new Set([
  'HeptapodHeroIntro', 'HeptapodEncoderPage', 'MyArchivePage',
  'GlyphDetailPage', 'ResonanceFieldPage', 'ArchiveComparePage',
]);

/** 분류별 라벨과 색 */
const KIND_LABEL = {
  starterkit: { text: '스타터킷', color: 'text.disabled' },
  modified: { text: '수정', color: 'warning.dark' },
  new: { text: '신규', color: 'primary.main' },
  app: { text: '라우트·전역', color: 'text.secondary' },
};

/** 저장소 전체 집계 (컴포넌트 104개 기준) */
const REPO_TOTALS = { starterkit: 39, modified: 12, new: 53 };

/**
 * 노드 하나의 분류를 정한다. app 계층과 라우트 파일이 먼저다.
 *
 * @param {object} node - projectStructure 노드 [Required]
 * @returns {string} starterkit | modified | new | app
 */
function kindOf(node) {
  if (APP_LAYER.has(node.name) || (node.file || '').startsWith('app')) return 'app';
  return CLASSIFICATION[node.name]?.kind || 'new';
}

/** 트리 키에 붙이는 한 줄 라벨. TreeNode 는 자식 키를 문자열로 그린다 */
function labelOf(node) {
  const kind = kindOf(node);
  const note = CLASSIFICATION[node.name]?.note;
  const parts = [node.name, KIND_LABEL[kind].text];
  if (ROUTE_TEMPLATES.has(node.name)) parts.splice(1, 0, '라우트 템플릿');
  if (note) parts.push(note);
  if (node.ref) parts.push('다른 가지에 이미 펼침');
  return parts.join(' · ');
}

/**
 * 노드를 TreeNode 값으로 바꾼다.
 * 스타터킷 컴포넌트와 중복 가지는 펼치지 않고 회색 라벨 한 줄로 끝낸다.
 *
 * @param {object} node - projectStructure 노드 [Required]
 * @returns {object|string} 자식이 있으면 중첩 객체, 없으면 라벨 문자열
 */
function toTree(node) {
  const out = {};
  for (const child of node.children || []) {
    const key = labelOf(child);
    const kind = kindOf(child);
    const subtree = kind === 'starterkit' || child.ref ? {} : toTree(child);
    out[key] = Object.keys(subtree).length ? subtree : KIND_LABEL[kind].text;
  }
  for (const hook of node.hooks || []) out[`${hook.name} · Hook`] = 'Hook';
  for (const data of node.data || []) out[`${data.name} · Data`] = 'Data';
  return out;
}

/** 분류별 수와 스토리 링크 목록을 한 번에 모은다 */
function collect(node, acc) {
  const kind = kindOf(node);
  if (node.name !== 'app') {
    acc.counts[kind] = (acc.counts[kind] || 0) + 1;
    if (!acc.seen.has(node.name)) {
      acc.seen.add(node.name);
      acc.unique[kind] = (acc.unique[kind] || 0) + 1;
      acc.rows.push({
        name: node.name,
        kind,
        file: node.file,
        storyId: node.storyId,
        storyTitle: node.storyTitle,
      });
    }
  }
  for (const child of node.children || []) collect(child, acc);
  return acc;
}

/**
 * 분류별 수 표
 *
 * Props:
 * @param {object} counts - 분류별 노드 수 [Required]
 * @param {object} unique - 분류별 고유 컴포넌트 수 [Required]
 *
 * Example usage:
 * <CountTable counts={ counts } unique={ unique } />
 */
function CountTable({ counts, unique }) {
  const kinds = ['app', 'new', 'modified', 'starterkit'];
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>분류</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 120 } }>트리 노드</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 140 } }>고유 이름</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 160 } }>저장소 전체</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { kinds.map((kind) => (
            <TableRow key={ kind }>
              <TableCell sx={ { fontSize: 13, color: KIND_LABEL[kind].color } }>{ KIND_LABEL[kind].text }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ counts[kind] || 0 }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ unique[kind] || 0 }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ REPO_TOTALS[kind] ?? '-' }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 스토리 링크 표: 트리에 나온 고유 이름과 해당 스토리
 *
 * Props:
 * @param {Array} rows - collect 가 모은 행 배열 [Required]
 *
 * Example usage:
 * <LinkTable rows={ rows } />
 */
function LinkTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 220 } }>이름</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 110 } }>분류</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>파일</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>스토리</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((r) => (
            <TableRow key={ r.name } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ r.name }</TableCell>
              <TableCell sx={ { fontSize: 12, color: KIND_LABEL[r.kind].color } }>{ KIND_LABEL[r.kind].text }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' } }>{ r.file }</TableCell>
              <TableCell sx={ { fontSize: 12 } }>
                { r.storyId ? (
                  <a href={ `?path=/story/${r.storyId}` } target="_top">{ r.storyTitle }</a>
                ) : (
                  <Box component="span" sx={ { color: 'text.disabled' } }>스토리 없음</Box>
                ) }
              </TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** 라우트에서 템플릿, 컴포넌트로 내려가는 시각 위계 */
export const Default = {
  render: () => {
    const root = projectStructure.root;
    const acc = collect(root, { counts: {}, unique: {}, rows: [], seen: new Set() });
    const routes = (root.children || []).map((child) => ({ node: child, tree: toTree(child) }));

    return (
      <>
        <DocumentTitle
          title="Hierarchy"
          status="Available"
          note="라우트에서 템플릿, 컴포넌트로 내려가는 출처별 위계"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Hierarchy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            <code>src/data/projectStructure.js</code>의 실제 import 그래프다. 재생성은 <code>pnpm generate-structure</code>. 스타터킷 그대로인 컴포넌트는 회색 한 줄로 접고, 수정·신규만 펼친다.
          </Typography>

          <SectionTitle
            title="분류별 수"
            description="트리 노드는 같은 컴포넌트가 여러 화면에 쓰이면 여러 번 센다. 고유 이름은 한 번만 센다."
          />
          <CountTable counts={ acc.counts } unique={ acc.unique } />

          <SectionTitle
            title="구조"
            description="app/layout 아래 전역 provider, 그 옆에 라우트 7개. 라우트마다 화면을 그리는 템플릿과 그 아래 컴포넌트가 붙는다."
          />
          <Box sx={ { p: 2, mb: 4, border: '1px solid', borderColor: 'divider', borderRadius: 1 } }>
            <Box sx={ { fontFamily: 'monospace' } }>
              { routes.map((r) => (
                <TreeNode
                  key={ r.node.name }
                  keyName={ labelOf(r.node) }
                  value={ r.tree }
                  depth={ 0 }
                  defaultOpen
                />
              )) }
            </Box>
          </Box>

          <SectionTitle
            title="스토리 링크"
            description="트리에 나온 고유 이름과 그 스토리다. TreeNode 는 자식 키를 문자열로 그려서 링크는 이 표가 맡는다."
          />
          <LinkTable rows={ acc.rows } />
        </PageContainer>
      </>
    );
  },
};
