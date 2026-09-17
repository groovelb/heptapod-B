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
import { HERO_SCRUB_TIMELINE, HERO_MOBILE_SCRUB_TIMELINE } from '../../data/heptapodScrubTimeline';
import {
  MEANING_VERSION,
  MORPHOLOGY_VERSION,
  MEANING_BASE_IDS,
  MEANING_MODIFIER_IDS,
  MEANING_CATALOG,
} from '../../data/heptapodMeaningCatalog';
import {
  ARCHETYPE_CATALOG,
  ARCHETYPE_FAMILIES,
  ARCHETYPE_NARRATIVE_VERSION,
} from '../../data/heptapodArchetypeCatalog';
import { getArchiveArchetypeSymbol } from '../../data/archiveArchetypeSymbols';
import { ARCHIVE_FAMILY_SYMBOLS, ARCHIVE_TIMELINE_SYMBOL } from '../../data/archiveFamilySymbols';
import { AUTHORED_GLYPH_IMAGES_BY_MODEL } from '../../lib/glyphImages/authoredManifest';
import { canonicalModelJson } from '../../lib/glyphImages/contract';
import { HERO_POSTER_SRC, HERO_POSTER_SRC_MOBILE } from '../../data/heptapodHeroStory';
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
    data: 'EncodeInput', korean: '입력 이름', identifier: 'encodeInput', table: '(클라이언트)', owner: 'Canvas',
  },
  {
    data: 'Glyph', korean: '표식', identifier: 'glyph', table: 'glyphs', owner: 'Canvas',
  },
  {
    data: 'Readout', korean: '계측 값', identifier: 'readout', table: '(클라이언트)', owner: 'Canvas',
  },
  {
    data: 'MeaningReading', korean: '의미 판독', identifier: 'meaningReading', table: '(클라이언트)', owner: 'Canvas',
  },
  {
    data: 'Archetype', korean: '유형', identifier: 'archetype', table: '(정적)', owner: '없음',
  },
  {
    data: 'Response', korean: '공개 기록', identifier: 'response', table: 'glyph_contributions', owner: 'Canvas',
  },
  {
    data: 'Resonance', korean: '연결', identifier: 'resonance', table: 'glyph_relations', owner: 'GlyphDetail',
  },
  {
    data: 'HeroBeat', korean: '인트로 비트', identifier: 'heroBeat', table: '(정적)', owner: '없음',
  },
];

/** 소수 자리 고정 표기 (undefined 안전) */
const fixed = (value, digits = 2) => (typeof value === 'number' ? value.toFixed(digits) : '-');

/**
 * 저작 모델에 대응하는 사전 생성 PNG를 찾는다.
 * 화면이 쓰는 것과 같은 manifest이므로 여기 뜨는 그림이 실제로 목록에 뜨는 그림이다.
 *
 * @param {object} model - 저작 상징의 모델 [Required]
 * @param {number} size - 256 또는 512 [Optional, 기본값: 256]
 * @returns {?string} public 경로. 없으면 null
 */
function symbolImage(model, size = 256) {
  try {
    return AUTHORED_GLYPH_IMAGES_BY_MODEL[canonicalModelJson(model)]?.[size]?.src || null;
  } catch {
    return null;
  }
}

/**
 * 표식 썸네일 한 칸
 *
 * Props:
 * @param {string} src - 이미지 경로 [Required]
 * @param {string} alt - 대체 텍스트 [Required]
 * @param {number} size - 화면 크기(px) [Optional, 기본값: 48]
 *
 * Example usage:
 * <GlyphThumb src={ src } alt="첫 신호" />
 */
function GlyphThumb({ src, alt, size = 48 }) {
  if (!src) return <Box sx={ { width: size, height: size } } />;
  return (
    <Box
      component="img"
      src={ src }
      alt={ alt }
      loading="lazy"
      sx={ { width: size, height: size, display: 'block', backgroundColor: 'action.hover' } }
    />
  );
}

/** 의미 ID 목록 → 한글 라벨 문자열 */
const meaningLabels = (ids) => (ids.length
  ? ids.map((id) => MEANING_CATALOG[id].label).join(' · ')
  : '기본형');

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
 * 의미 카탈로그 표: 기본 의미 3종과 추가 의미 3종
 *
 * Props:
 * @param {Array} ids - MEANING_CATALOG 의 키 배열 [Required]
 * @param {string} kind - 표시할 구분 라벨 [Required]
 *
 * Example usage:
 * <MeaningTable ids={ MEANING_BASE_IDS } kind="기본" />
 */
function MeaningTable({ ids, kind }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 140 } }>id</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 120 } }>{ `${kind} 의미` }</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>판정 기준</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { ids.map((id) => (
            <TableRow key={ id }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12 } }>{ id }</TableCell>
              <TableCell sx={ { fontSize: 13, fontWeight: 600 } }>{ MEANING_CATALOG[id].label }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary' } }>{ MEANING_CATALOG[id].description }</TableCell>
            </TableRow>
          )) }
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * 유형 카탈로그 표: 의미 키 24개와 그 제목·뜻·상징 유무
 *
 * Props:
 * @param {Array} archetypes - ARCHETYPE_CATALOG 의 값 배열 [Required]
 *
 * Example usage:
 * <ArchetypeTable archetypes={ Object.values(ARCHETYPE_CATALOG) } />
 */
function ArchetypeTable({ archetypes }) {
  return (
    <TableContainer sx={ { mb: 4 } }>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={ { fontWeight: 600, width: 40 } }>#</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 90 } }>계열</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>추가 의미</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>유형</TableCell>
            <TableCell sx={ { fontWeight: 600 } }>이름의 뜻</TableCell>
            <TableCell sx={ { fontWeight: 600, width: 72 } }>상징</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { archetypes.map((a) => (
            <TableRow key={ a.meaningKey } sx={ { '&:hover': { backgroundColor: 'action.hover' } } }>
              <TableCell sx={ { fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' } }>{ a.order }</TableCell>
              <TableCell sx={ { fontSize: 13 } }>{ ARCHETYPE_FAMILIES[a.familyId].title }</TableCell>
              <TableCell sx={ { fontSize: 12, color: 'text.secondary' } }>{ meaningLabels(a.modifierIds) }</TableCell>
              <TableCell sx={ { fontSize: 13, fontWeight: 600 } }>{ a.title }</TableCell>
              <TableCell sx={ { fontSize: 13, color: 'text.secondary' } }>{ a.reading }</TableCell>
              <TableCell>
                <GlyphThumb
                  src={ symbolImage(getArchiveArchetypeSymbol(a.meaningKey)?.model) }
                  alt={ `${a.title} 상징` }
                />
              </TableCell>
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

/** 표식 데이터: 이름 사전, 의미군, 유형 카탈로그, 모델 계약, 스크럽 타임라인 */
export const Default = {
  render: () => {
    const timeline = HERO_SCRUB_TIMELINE;
    const mobile = HERO_MOBILE_SCRUB_TIMELINE;
    const archetypes = Object.values(ARCHETYPE_CATALOG).sort((a, b) => a.order - b.order);
    const familyIds = Object.keys(ARCHIVE_FAMILY_SYMBOLS);

    return (
      <>
        <DocumentTitle
          title="Logogram Data"
          status="Available"
          note="표식 입력 계약, 의미군, 유형 카탈로그, 스크럽 타임라인"
          brandName="Design System"
          systemName="Heptapod B"
          version="1.0"
        />
        <PageContainer>
          <Typography variant="h4" sx={ { fontWeight: 700, mb: 1 } }>
            Logogram Data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={ { mb: 4 } }>
            <code>src/utils/heptapod/MODEL.md</code> · <code>src/data/heptapodMeaningCatalog.js</code> · <code>src/data/heptapodArchetypeCatalog.js</code> · <code>src/data/heptapodScrubTimeline.js</code>
          </Typography>

          <SectionTitle
            title="이름 사전"
            description="02-ux-flow.md 3.2절과 같은 라벨. 동의를 거쳐 서버에 남는 셋만 테이블명을 갖는다."
          />
          <DictionaryTable rows={ NAME_DICTIONARY } />

          <SectionTitle
            title="의미군"
            description={ `meaning v${MEANING_VERSION} · morphology v${MORPHOLOGY_VERSION}. 이름이 아니라 저장된 형태만 판독한다.` }
          />
          <MeaningTable ids={ MEANING_BASE_IDS } kind="기본" />
          <MeaningTable ids={ MEANING_MODIFIER_IDS } kind="추가" />

          <SectionTitle
            title="유형 카탈로그"
            description={ `기본 의미 ${MEANING_BASE_IDS.length}개 곱하기 추가 의미 조합 8개 = ${archetypes.length}개. 원고 v${ARCHETYPE_NARRATIVE_VERSION}. 계열 상징 ${familyIds.length}종은 안내용 저작 모델이고 소속·집계에 들어가지 않는다. 미리 써 둔 해석이지 관측된 군집의 수가 아니다.` }
          />
          <ArchetypeTable archetypes={ archetypes } />

          <SectionTitle
            title="계열 상징과 시간순 상징"
            description="화면이 쓰는 사전 생성 PNG 그대로다. 사람의 표식이 아니라 안내용 저작 모델이고 소속·집계에 들어가지 않는다."
          />
          <Stack direction="row" spacing={ 3 } sx={ { mb: 4, flexWrap: 'wrap' } }>
            { familyIds.map((id) => (
              <Stack key={ id } spacing={ 0.5 } alignItems="center">
                <GlyphThumb src={ symbolImage(ARCHIVE_FAMILY_SYMBOLS[id].model) } alt={ `${id} 계열 상징` } size={ 96 } />
                <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 11 } }>{ id }</Typography>
              </Stack>
            )) }
            <Stack spacing={ 0.5 } alignItems="center">
              <GlyphThumb src={ symbolImage(ARCHIVE_TIMELINE_SYMBOL.model_data) } alt="시간순 상징" size={ 96 } />
              <Typography variant="caption" sx={ { fontFamily: 'monospace', fontSize: 11 } }>timeline</Typography>
            </Stack>
          </Stack>

          <SectionTitle
            title="HERO_SCRUB_TIMELINE"
            description={ `영상 ${timeline.total}초 · 타이틀 셀 ${timeline.titleCells} · 트랙 셀 합 ${timeline.scrubCells} (1셀 = 100vh) · 클립 ${timeline.clips.length}개. 좁은 화면은 같은 순서를 트랙 셀 합 ${mobile.scrubCells}로 지난다.` }
          />
          <TimelineTable clips={ timeline.clips } />
          <Stack direction="row" spacing={ 2 } sx={ { mb: 4, flexWrap: 'wrap' } }>
            { [
              { src: HERO_POSTER_SRC, label: '넓은 화면 첫 프레임' },
              { src: HERO_POSTER_SRC_MOBILE, label: '좁은 화면 첫 프레임' },
            ].map((poster) => (
              <Stack key={ poster.src } spacing={ 0.5 } sx={ { width: { xs: '100%', sm: 280 } } }>
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
            title="LogogramModel 계약"
            description="렌더러 3종과 정지 이미지 생성기가 공유하는 단일 입력 계약. 길이는 링 반지름 R로 정규화하고 각도는 라디안이다."
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
