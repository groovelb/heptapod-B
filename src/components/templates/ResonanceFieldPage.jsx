import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useGlyph } from '../../hooks/data/useGlyph';
import { useGlyphRelations } from '../../hooks/data/useGlyphRelations';
import ResonanceMap from '../data-display/ResonanceMap';
import ResonanceList from '../data-display/ResonanceList';
import RelationInspector from '../overlay-feedback/RelationInspector';
import { groupResonanceRows, glyphLabel } from '../../utils/heptapod/resonanceView';

const FILTERS = [['ALL', '모두'], ['branch', '가지 구조'], ['opening', '개구부'], ['ink', '잉크 분포'], ['ring', '링 윤곽'], ['VARIANT', '질문의 변주']];

/** Public, sampled one-hop relationships. Node IDs—not names—control navigation. */
export default function ResonanceFieldPage({ client }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { glyph, loading, error, refetch } = useGlyph(id, { client });
  const relationQuery = useGlyphRelations(id, { client });
  const [filter, setFilter] = useState('ALL');
  const [inspectedId, setInspectedId] = useState(null);
  const [view, setView] = useState(null);
  const neighbors = useMemo(() => groupResonanceRows(relationQuery.relations, {
    limit: 24, types: filter === 'VARIANT' ? ['VARIANT'] : [],
    kinds: filter === 'ALL' || filter === 'VARIANT' ? [] : [filter],
  }), [relationQuery.relations, filter]);
  const inspected = neighbors.find((neighbor) => neighbor.id === inspectedId);
  const listView = view ? view === 'list' : mobile || reduced;
  const explore = (neighborId) => { setInspectedId(null); navigate(`/field/${neighborId}`); };

  return (
    <Box sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', px: { xs: 2, sm: 4 }, py: 4 } }>
      <Box sx={ { maxWidth: 880, mx: 'auto' } }>
        <Box component="nav" aria-label="형태 공명 지도 탐색" sx={ { display: 'flex', justifyContent: 'space-between', mb: 3 } }>
          <Button component={ RouterLink } to={ `/glyph/${id}` } color="inherit">← 표식으로</Button>
          <Button component={ RouterLink } to="/archive" color="inherit">아카이브</Button>
        </Box>
        {loading ? <CircularProgress color="inherit" aria-label="표식 불러오는 중" /> : error || !glyph ? (
          <Alert severity={ error ? 'error' : 'info' } action={ error ? <Button onClick={ refetch } color="inherit">다시 시도</Button> : null }>
            {error ? '표식을 불러오지 못했습니다.' : '존재하지 않거나 공개되지 않은 표식입니다.'}
          </Alert>
        ) : (
          <>
            <Typography component="h1" variant="h4" sx={ { fontFamily: "'Noto Serif KR', Georgia, serif", overflowWrap: 'anywhere' } }>{glyphLabel(glyph)}의 표식에서 발견한 공명</Typography>
            <Typography variant="body2" sx={ { mt: 2, mb: 3, lineHeight: 1.8, opacity: 0.75 } }>
              변환된 표식의 가지 구조, 개구부, 잉크 분포와 링 윤곽을 따라 닮은 부위를 발견합니다.
              {!relationQuery.loading && !relationQuery.error && ` 현재 비교한 공개 표식 ${relationQuery.sampleSize || 0}개 기준입니다.`}
              {relationQuery.mappingStatus === 'partial-sample' && ' 일부 모델은 읽을 수 없어 비교에서 제외했습니다.'}
            </Typography>
            <Box sx={ { display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 } } role="group" aria-label="형태 관측 부위 필터">
              {FILTERS.map(([value, label]) => <Button key={ value } color="inherit" variant={ filter === value ? 'outlined' : 'text' } aria-pressed={ filter === value } onClick={ () => { setFilter(value); setInspectedId(null); } }>{label}</Button>)}
            </Box>
            {listView && <Button color="inherit" onClick={ () => setView('map') } sx={ { mb: 2 } }>지도로 보기</Button>}
            {listView || relationQuery.loading || relationQuery.error || !neighbors.length ? (
              <ResonanceList centerName={ glyphLabel(glyph) } relations={ neighbors } loading={ relationQuery.loading }
                error={ relationQuery.error } onRetry={ relationQuery.refetch } onInspect={ (neighbor) => setInspectedId(neighbor.id) } onNodeSelect={ explore }
                emptyMessage={ filter === 'ALL' ? '현재 비교한 표식들에서는 설명할 수 있는 형태 공명을 찾지 못했습니다.' : '현재 비교 범위에서 이 부위가 공명하는 표식은 없습니다.' } />
            ) : (
              <ResonanceMap key={ `${id}:${filter}` } centerModel={ glyph.model_data } centerName={ glyphLabel(glyph) } relations={ neighbors }
                onInspect={ (neighbor) => setInspectedId(neighbor.id) } onNodeSelect={ explore } width={ 720 } height={ 640 } sx={ { mx: 'auto' } } />
            )}
            <Typography variant="caption" sx={ { display: 'block', mt: 2, opacity: 0.8 } }>전체 형태의 공명과 일부 구조의 공명을 구분해 표시합니다. 부위를 선택하면 두 표식의 같은 관측점을 확인할 수 있습니다.</Typography>
            <Button component={ RouterLink } to={ `/compare/${id}` } color="inherit" sx={ { mt: 3 } }>내 이름을 표식으로 변환해 비교하기 →</Button>
            <RelationInspector open={ !!inspected } relation={ inspected ? { ...inspected, leftGlyph: glyph, nameA: glyphLabel(glyph), nameB: inspected.name } : null }
              onClose={ () => setInspectedId(null) } onExplore={ explore } onCompare={ (neighborId) => navigate(`/compare/${id}/${neighborId}`) } />
          </>
        )}
      </Box>
    </Box>
  );
}
