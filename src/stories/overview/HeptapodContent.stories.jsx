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
import {
  HERO_STORY_BEATS,
  HERO_MASTER_TITLE,
  HERO_START_LABEL,
  HERO_SKIP_LABEL,
  HERO_HEADLINE_FONT,
  HERO_VIDEO_DURATION,
  HERO_TITLE_CELLS,
  HERO_HANDOFF_VH,
  HERO_VIDEO_SRC,
  HERO_VIDEO_SRC_MOBILE,
  HERO_POSTER_SRC,
  HERO_AUDIO_BED_SRC,
  HERO_AUDIO_CLIP_BASE,
} from '../../data/heptapodHeroStory';

export default {
  title: 'Overview/Heptapod B/06 Content Data',
  parameters: {
    layout: 'padded',
  },
};

/** 인트로 상수 묶음: 표제·라벨·길이·경로 */
const CONSTANTS = {
  HERO_MASTER_TITLE,
  HERO_START_LABEL,
  HERO_SKIP_LABEL,
  HERO_HEADLINE_FONT,
  HERO_VIDEO_DURATION,
  HERO_TITLE_CELLS,
  HERO_HANDOFF_VH,
  HERO_VIDEO_SRC,
  HERO_VIDEO_SRC_MOBILE,
  HERO_POSTER_SRC,
  HERO_AUDIO_BED_SRC,
  HERO_AUDIO_CLIP_BASE,
};

/**
 * 단순 key-value 표
 *
 * Props:
 * @param {object} data - 표로 펼칠 객체 [Required]
 * @param {string} keyLabel - 키 컬럼 라벨 [Optional, 기본값: 'key']
 * @param {string} valueLabel - 값 컬럼 라벨 [Optional, 기본값: 'value']
 *
 * Example usage:
 * <KeyValueTable data={ CONSTANTS } />
 */
function KeyValueTable({ data, keyLabel = 'key', valueLabel = 'value' }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: '30%' } }>{ keyLabel }</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>{ valueLabel }</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { Object.entries(data).map(([k, v]) => (
            <TableRow key={ k }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 13 } }>{ k }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ String(v) }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 비트 카피 표: 헤드라인(영문 serif)과 본문(한글)
 *
 * Props:
 * @param {Array} beats - HERO_STORY_BEATS [Required]
 *
 * Example usage:
 * <CopyTable beats={ HERO_STORY_BEATS } />
 */
function CopyTable({ beats }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 60 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600, width: '32%' } }>headline</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>body</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { beats.map((b) => (
            <TableRow key={ b.id } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, verticalAlign: 'top' } }>{ b.id }</TableCell>
              <TableCell sx={ { fontSize: 14, fontWeight: 600, verticalAlign: 'top' } }>{ b.headline || '-' }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary', whiteSpace: 'pre-line', verticalAlign: 'top' } }>{ b.body || '-' }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 비트 연출 표: 샷·영상 구간·셀 가중치·키네틱 변주·배치
 *
 * Props:
 * @param {Array} beats - HERO_STORY_BEATS [Required]
 *
 * Example usage:
 * <BeatTable beats={ HERO_STORY_BEATS } />
 */
function BeatTable({ beats }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>shot</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>video</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>cells</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>kinetic</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>placement</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>emphasis</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { beats.map((b) => (
            <TableRow key={ b.id } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, fontWeight: 600 } }>{ b.id }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ b.shot }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ `${b.video[0]} ~ ${b.video[1]}s` }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ b.cells }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ b.kinetic }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ b.placement }</TableCell>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ b.isEmphasis ? 'yes' : '-' }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** 히어로 인트로 카피와 비트 데이터 */
export const Default = {
  render: () => (
    <>
      <DocumentTitle
        title="Content Data"
        status="Available"
        note="인트로 비트 카피 · 연출 파라미터 · 자산 경로 상수"
        brandName="Design System"
        systemName="Heptapod B"
        version="1.0"
      />
      <PageContainer>
        <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
          Content Data
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
          <code>src/data/heptapodHeroStory.js</code>
        </Typography>

        <SectionTitle
          title="HERO_STORY_BEATS (copy)"
          description={ `${HERO_STORY_BEATS.length}마디. 헤드라인은 영문 serif, 본문은 한글 전용이다. 줄바꿈 문자는 거울 대칭이나 타자 연출의 분리 지점이다.` }
        />
        <CopyTable beats={ HERO_STORY_BEATS } />

        <SectionTitle
          title="HERO_STORY_BEATS (staging)"
          description="셀 가중치가 페이싱을 정한다. 읽는 비트는 길게, 액션 비트는 짧게 둔다."
        />
        <BeatTable beats={ HERO_STORY_BEATS } />

        <SectionTitle
          title="상수"
          description="표제·라벨·길이·자산 경로. 영상과 소리 파일은 public 경로 문자열로 참조한다."
        />
        <KeyValueTable data={ CONSTANTS } />
      </PageContainer>
    </>
  ),
};
