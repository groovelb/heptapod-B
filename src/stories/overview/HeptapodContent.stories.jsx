import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
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
  HERO_AUTOPLAY_FROM,
  HERO_TITLE_CELLS,
  HERO_HANDOFF_VH,
  HERO_VIDEO_SRC,
  HERO_VIDEO_SRC_MOBILE,
  HERO_POSTER_SRC,
  HERO_POSTER_SRC_MOBILE,
  HERO_AUDIO_BED_SRC,
  HERO_AUDIO_CLIP_BASE,
} from '../../data/heptapodHeroStory';
import narratives from '../../data/archetypeNarratives.json';
import assetInventory from '../../data/assetInventory.js';

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
  HERO_AUTOPLAY_FROM,
  HERO_TITLE_CELLS,
  HERO_HANDOFF_VH,
  HERO_VIDEO_SRC,
  HERO_VIDEO_SRC_MOBILE,
  HERO_POSTER_SRC,
  HERO_POSTER_SRC_MOBILE,
  HERO_AUDIO_BED_SRC,
  HERO_AUDIO_CLIP_BASE,
};

/**
 * 샷 번호별 스틸.
 * 비트의 shot 문자열에서 첫 두 자리를 읽어 hero-scenes 의 같은 번호 폴더에서 대표 한 장을 고른다.
 * 번호가 같은 폴더를 고를 뿐이고 그 샷의 실제 프레임이라는 뜻은 아니다. s08 이상은 폴더가 없어 비어 있다.
 */
const SHOT_STILLS = assetInventory.items.reduce((acc, item) => {
  const match = item.folder.match(/hero-scenes\/s(\d\d)-/);
  if (!match || item.kind !== 'image') return acc;
  const key = match[1];
  const prefer = item.name === 'start.png' || item.name === 'mid.png';
  if (!acc[key] || (prefer && acc[key].name !== 'start.png')) acc[key] = item;
  return acc;
}, {});

/** 인트로가 실제로 거는 포스터 두 장 */
const POSTERS = [
  { src: HERO_POSTER_SRC, label: `넓은 화면 포스터 · ${HERO_VIDEO_SRC.split('/').pop()}` },
  { src: HERO_POSTER_SRC_MOBILE, label: `좁은 화면 포스터 · ${HERO_VIDEO_SRC_MOBILE.split('/').pop()}` },
];

/** 유형 원고에서 표로 뽑는 필드 */
const NARRATIVE_FIELDS = [
  ['reading', '이름의 뜻'],
  ['story', '이 이름이 그리는 사람'],
  ['tension', '놓치기 쉬운 점'],
  ['question', '스스로에게 묻는 질문'],
  ['distinction', '비슷한 유형과의 차이'],
  ['motto', '한마디'],
];

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
            <TableCell sx={ { fontWeight: 600, width: 130 } }>샷 스틸</TableCell>
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
              <TableCell>
                <ShotStill shot={ b.shot } />
              </TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 샷 스틸 한 칸
 *
 * Props:
 * @param {string} shot - 비트의 샷 범위 문자열 (예: '02→03') [Required]
 *
 * Example usage:
 * <ShotStill shot="02→03" />
 */
function ShotStill({ shot }) {
  const key = String(shot).slice(0, 2);
  const item = SHOT_STILLS[key];
  if (!item) return <Box component="span" sx={ { color: 'text.disabled', fontSize: 11 } }>없음</Box>;
  return (
    <Stack spacing={ 0.5 }>
      <Box
        component="img"
        src={ item.url }
        alt={ `${shot} 샷 스틸` }
        loading="lazy"
        sx={ { width: '100%', maxWidth: 120, height: 'auto', display: 'block', backgroundColor: 'action.hover' } }
      />
      <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 9, color: 'text.secondary' } }>
        { `s${key} · ${item.name}` }
      </Typography>
    </Stack>
  );
}

/**
 * 계열 원고 표: 도래·수용·상호성의 한영 제목과 대표 설명
 *
 * Props:
 * @param {object} families - archetypeNarratives.json 의 families [Required]
 *
 * Example usage:
 * <FamilyTable families={ narratives.families } />
 */
function FamilyTable({ families }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 110 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 110 } }>ko title</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 130 } }>en title</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>ko reading</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { Object.entries(families).map(([id, value]) => (
            <TableRow key={ id }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ id }</TableCell>
              <TableCell sx={ { fontSize: 13, fontWeight: 600 } }>{ value.ko.title }</TableCell>
              <TableCell sx={ { fontSize: 13 } }>{ value.en.title }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary' } }>{ value.ko.reading }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 유형 원고 표: 24개 조합의 제목·조합 설명·한마디
 *
 * Props:
 * @param {object} types - archetypeNarratives.json 의 types [Required]
 *
 * Example usage:
 * <TypeNarrativeTable types={ narratives.types } />
 */
function TypeNarrativeTable({ types }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 200 } }>key</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 130 } }>ko title</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>composition</TableCell>
            <TableCell sx={ { fontWeight: 600, width: '26%' } }>motto</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { Object.entries(types).map(([key, value]) => (
            <TableRow key={ key } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 11, verticalAlign: 'top' } }>{ key }</TableCell>
              <TableCell sx={ { fontSize: 13, fontWeight: 600, verticalAlign: 'top' } }>{ value.ko.title }</TableCell>
              <TableCell sx={ { fontSize: 12, color: 'text.secondary', verticalAlign: 'top' } }>{ value.ko.composition }</TableCell>
              <TableCell sx={ { fontSize: 12, verticalAlign: 'top' } }>{ value.ko.motto }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 원고 한 편 전문: 한 유형의 모든 서사 필드
 *
 * Props:
 * @param {string} title - 유형 제목 [Required]
 * @param {object} copy - 해당 유형의 ko 원고 [Required]
 *
 * Example usage:
 * <NarrativeSample title="첫 신호" copy={ narratives.types['arrival.none'].ko } />
 */
function NarrativeSample({ title, copy }) {
  return (
    <Box sx={ { mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 } }>
      <Typography variant="h6" sx={ { mb: 2 } }>{ title }</Typography>
      <Stack spacing={ 1.5 }>
        { NARRATIVE_FIELDS.map(([field, label]) => (
          <Box key={ field }>
            <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary' } }>
              { `${field} · ${label}` }
            </Typography>
            <Typography variant="body2">{ copy[field] }</Typography>
          </Box>
        )) }
        <Box>
          <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary' } }>
            traits · 특징
          </Typography>
          { copy.traits.map((trait) => (
            <Typography key={ trait } variant="body2">{ trait }</Typography>
          )) }
        </Box>
        <Box>
          <Typography variant="caption" sx={ { fontFamily: 'monospace', color: 'text.secondary' } }>
            moments · 일상 사례
          </Typography>
          { copy.moments.map((moment) => (
            <Typography key={ moment } variant="body2">{ moment }</Typography>
          )) }
        </Box>
      </Stack>
    </Box>
  );
}

/** 히어로 인트로 카피와 유형 서사 원고 */
export const Default = {
  render: () => {
    const [sampleKey] = Object.keys(narratives.types);
    const sample = narratives.types[sampleKey];

    return (
      <>
        <DocumentTitle
          title="Content Data"
          status="Available"
          note="인트로 비트 카피 · 연출 파라미터 · 유형 서사 원고"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Content Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            <code>src/data/heptapodHeroStory.js</code> · <code>src/data/archetypeNarratives.json</code>
          </Typography>

          <SectionTitle
            title="HERO_STORY_BEATS (copy)"
            description={ `${HERO_STORY_BEATS.length}마디. 헤드라인은 영문 serif, 본문은 한글 전용이다. 줄바꿈 문자는 거울 대칭이나 타자 연출의 분리 지점이다.` }
          />
          <CopyTable beats={ HERO_STORY_BEATS } />

          <SectionTitle
            title="HERO_STORY_BEATS (staging)"
            description="셀 가중치가 페이싱을 정한다. 읽는 비트는 길게, 액션 비트는 짧게 둔다. 오른쪽 스틸은 hero-scenes 에서 번호만 맞춰 고른 참고 이미지이고 그 샷의 실제 프레임이 아니다. 같은 번호 폴더가 없으면 비워 둔다."
          />
          <BeatTable beats={ HERO_STORY_BEATS } />

          <SectionTitle
            title="상수"
            description="표제·라벨·길이·자산 경로. 영상과 소리 파일은 public 경로 문자열로 참조하고 넓은 화면과 좁은 화면이 서로 다른 파일을 쓴다."
          />
          <KeyValueTable data={ CONSTANTS } />
          <Stack direction="row" spacing={ 2 } sx={ { mb: 4, flexWrap: 'wrap' } }>
            { POSTERS.map((poster) => (
              <Stack key={ poster.src } spacing={ 0.5 } sx={ { width: { xs: '100%', sm: 300 } } }>
                <Box
                  component="img"
                  src={ poster.src }
                  alt={ poster.label }
                  loading="lazy"
                  sx={ { width: '100%', height: 'auto', display: 'block', backgroundColor: 'action.hover' } }
                />
                <Typography variant="caption" sx={ { fontSize: 11, color: 'text.secondary' } }>{ poster.label }</Typography>
              </Stack>
            )) }
          </Stack>

          <SectionTitle
            title="계열 원고"
            description={ `원고 v${narratives.narrativeVersion}. 계열 ${Object.keys(narratives.families).length}개는 유형 24개의 상위 방향이다. 배포 원본은 JSON 하나이고 Markdown이나 DB에서 읽지 않는다.` }
          />
          <FamilyTable families={ narratives.families } />

          <SectionTitle
            title="유형 원고"
            description={ `${Object.keys(narratives.types).length}개 조합의 한영 원고. 형태에서 성격을 검증한 결과가 아니라 세계관 안에서 이름에 붙이는 해석이다.` }
          />
          <TypeNarrativeTable types={ narratives.types } />

          <SectionTitle
            title="원고 한 편 전문"
            description={ `${sampleKey} 한 유형의 모든 필드. 나머지 23개도 같은 필드를 갖는다.` }
          />
          <NarrativeSample title={ sample.ko.title } copy={ sample.ko } />
        </PageContainer>
      </>
    );
  },
};
