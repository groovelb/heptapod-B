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
} from '../../components/storybookDocumentation';
import { HERO_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import modelContract from '../../utils/heptapod/MODEL.md?raw';

export default {
  title: 'Overview/Heptapod B/05 Logogram Data',
  parameters: {
    layout: 'padded',
  },
};

/**
 * 이름 사전: 02-ux-flow.md 3.2절 표를 그대로 옮긴 것.
 * 라벨(데이터명·한국어·코드 식별자)은 기획 문서와 글자 단위로 같아야 한다.
 */
const NAME_DICTIONARY = [
  {
    data: 'EncodeInput', korean: '입력 이름', identifier: 'encodeInput', table: '(클라이언트)', owner: 'Encoder',
  },
  {
    data: 'Seed', korean: '시드', identifier: 'seed', table: '(클라이언트)', owner: 'Encoder',
  },
  {
    data: 'LogogramModel', korean: '로고그램 모델', identifier: 'logogramModel', table: '(클라이언트)', owner: 'Encoder',
  },
  {
    data: 'Readout', korean: '데이터 리드아웃', identifier: 'readout', table: '(클라이언트)', owner: 'Encoder',
  },
  {
    data: 'RenderConfig', korean: '렌더 설정', identifier: 'renderConfig', table: '(클라이언트)', owner: 'Encoder',
  },
  {
    data: 'HeroBeat', korean: '인트로 비트', identifier: 'heroBeat', table: '(정적)', owner: '없음',
  },
];

/** 소수 자리 고정 표기 (undefined 안전) */
const fixed = (value, digits = 2) => (typeof value === 'number' ? value.toFixed(digits) : '-');

/**
 * 이름 사전 표
 *
 * Props:
 * @param {Array} rows - NAME_DICTIONARY 형태의 행 배열 [Required]
 *
 * Example usage:
 * <DictionaryTable rows={ NAME_DICTIONARY } />
 */
function DictionaryTable({ rows }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>데이터명</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>한국어</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>코드 식별자</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>예상 테이블명</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>생성 책임 페이지</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { rows.map((r) => (
            <TableRow key={ r.data }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 13 } }>{ r.data }</TableCell>
              <TableCell sx={ { fontSize: 13 } }>{ r.korean }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 13 } }>{ r.identifier }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ r.table }</TableCell>
              <TableCell sx={ { fontSize: 13 } }>{ r.owner }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 스크럽 타임라인 표: 비트별 영상 구간과 셀 좌표
 *
 * Props:
 * @param {Array} clips - HERO_SCRUB_TIMELINE.clips [Required]
 *
 * Example usage:
 * <TimelineTable clips={ HERO_SCRUB_TIMELINE.clips } />
 */
function TimelineTable({ clips }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>video start (s)</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>duration (s)</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>cells</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>cell range</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>norm range</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { clips.map((c) => (
            <TableRow key={ c.id } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 13, fontWeight: 600 } }>{ c.id }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ fixed(c.start) }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ fixed(c.duration) }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ c.cells }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ `${fixed(c.cellStart)} ~ ${fixed(c.cellEnd)}` }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ `${fixed(c.startNorm, 3)} ~ ${fixed(c.endNorm, 3)}` }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** 로고그램 모델 계약과 스크럽 타임라인 데이터 */
export const Default = {
  render: () => {
    const timeline = HERO_SCRUB_TIMELINE;

    return (
      <>
        <DocumentTitle
          title="Logogram Data"
          status="Available"
          note="렌더러 입력 계약(LogogramModel)과 스크럽 타임라인"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Logogram Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            <code>src/utils/heptapod/MODEL.md</code> · <code>src/data/heptapodScrubTimeline.js</code>
          </Typography>

          <SectionTitle
            title="이름 사전"
            description="02-ux-flow.md 3.2절과 같은 라벨. 서버 데이터가 없어 테이블명 자리는 (클라이언트) 또는 (정적)이다."
          />
          <DictionaryTable rows={ NAME_DICTIONARY } />

          <SectionTitle
            title="HERO_SCRUB_TIMELINE"
            description={ `영상 ${timeline.total}초 · 타이틀 셀 ${timeline.titleCells} · 트랙 셀 합 ${timeline.scrubCells} (1셀 = 100vh) · 클립 ${timeline.clips.length}개` }
          />
          <TimelineTable clips={ timeline.clips } />

          <SectionTitle
            title="LogogramModel 계약"
            description="렌더러 3종이 공유하는 단일 입력 계약. 길이는 링 반지름 R로 정규화하고 각도는 라디안이다."
          />
          <Box
            component="pre"
            sx={ {
              m: 0,
              p: 2,
              fontFamily: 'monospace',
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'action.hover',
            } }
          >
            { modelContract }
          </Box>
        </PageContainer>
      </>
    );
  },
};
