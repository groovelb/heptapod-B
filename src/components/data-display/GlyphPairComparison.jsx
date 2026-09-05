import { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import GlyphNode from './GlyphNode';
import { CX0, CY0, R0, SIZE0 } from '../../utils/heptapod/logogramParticles';
import { getMorphologyObservations, isMorphologyRelation, morphologyRelationLabel } from '../../utils/heptapod/resonanceView';
import { sameRenderedBody } from '../../utils/heptapod/morphology';

const OBSERVATION_LABELS = { branch: '가지 구조', opening: '개구부', ink: '잉크 분포', ring: '링 윤곽', question: '질문의 변주' };
const METRICS = {
  harmonicSim: '링 굴곡', gapSim: '링 간극', strandSim: '링 가닥 수',
  inkScore: '필압·먹 분포', pressureSim: '필압 변화', inkLoadSim: '먹 고임 분포', dryBreakSim: '갈필 분포',
  ringScore: '링 종합', clusterScore: '가지 배치',
  motifScore: '관측한 일부 구조',
};

function nameOf(glyph) {
  return glyph?.display_name || (glyph?.canonical_name
    ? `${glyph.canonical_name}${glyph.is_interrogative && !glyph.canonical_name.endsWith('?') ? '?' : ''}`
    : glyph?.model_data?.meta?.name || '이름 없음');
}

/** 근거 문장을 먼저 표시하고 계산값은 요청할 때만 펼치는 공통 표시부. */
export function RelationEvidence({ relation }) {
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  if (!isMorphologyRelation(relation)) return null;
  const observations = getMorphologyObservations(relation);
  const reasons = observations.length ? observations.map((item) => item.reason) : relation.reasons || [];
  const components = relation.components || {};
  const metrics = Object.entries(METRICS).filter(([key]) => Number.isFinite(components[key]));
  return (
    <Box sx={ { py: 2, borderTop: '1px solid', borderColor: alpha(ink, 0.2) } }>
      <Typography component="h3" sx={ { fontSize: '1rem', fontWeight: 500, mb: 0.5 } }>{ morphologyRelationLabel(relation) }</Typography>
      <Typography variant="caption" sx={ { color: alpha(ink, 0.8) } }>저장된 Heptapod B 형태에서 관측</Typography>
      { reasons.length ? reasons.map((reason) => (
        <Typography key={ reason } variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ reason }</Typography>
      )) : <Typography variant="body2" sx={ { mt: 1 } }>이 연결의 설명 근거가 아직 기록되지 않았어요.</Typography> }
      { (metrics.length > 0 || Number.isFinite(relation.score) || relation.algorithmVersion) && (
        <Box component="details" sx={ { mt: 1.5, '& summary': { cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', textDecoration: 'underline', fontSize: '0.8rem' }, '& summary:focus-visible': { outline: `2px solid ${ink}`, outlineOffset: 2 } } }>
          <Box component="summary">계산 근거 펼쳐보기</Box>
          <Box component="dl" sx={ { display: 'grid', gridTemplateColumns: '1fr auto', gap: 1, m: 0, fontSize: '0.8rem', '& dd': { m: 0, fontVariantNumeric: 'tabular-nums' } } }>
            { Number.isFinite(relation.score) && <><Box component="dt">{ relation.relationType === 'VARIANT' ? '본체 일치값' : '전체 형태 점수' }</Box><Box component="dd">{ relation.score.toFixed(3) }</Box></> }
            { metrics.map(([key, label]) => (
              <Box key={ key } sx={ { display: 'contents' } }><Box component="dt">{ label }</Box><Box component="dd">{ components[key].toFixed(3) }</Box></Box>
            )) }
          </Box>
          <Typography variant="caption" sx={ { mt: 1.5, display: 'block', lineHeight: 1.6, color: alpha(ink, 0.8) } }>
            점수는 해당 관측 항목의 일치 정도예요. 이름의 의미나 사람 사이의 관계를 나타내지는 않아요.
            { relation.algorithmVersion ? ` 계산 기준 v${relation.algorithmVersion}.` : '' }
          </Typography>
        </Box>
      ) }
    </Box>
  );
}

function GlyphFigure({ glyph, observations, activeObservation, side, onExplore }) {
  const theme = useTheme();
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const model = glyph.model_data;
  const name = nameOf(glyph);
  const radiusAt = (ang) => model.harmonics.reduce((value, harmonic) => value
    + R0 * harmonic.amp * Math.sin(harmonic.k * ang + harmonic.phase), R0);
  const point = (ang, offset = 0) => ({
    x: (CX0 + (radiusAt(ang) + offset) * Math.cos(ang)) / SIZE0 * 100,
    y: (CY0 + (radiusAt(ang) + offset) * Math.sin(ang)) / SIZE0 * 100,
  });
  const active = observations[activeObservation];
  const hookPresent = side === 'left' ? active?.hookPresentA : active?.hookPresentB;
  const marks = observations.map((observation, index) => {
    if (index !== activeObservation) return null;
    const anchor = side === 'left' ? observation.anchorA : observation.anchorB;
    const cluster = observation.kind === 'branch' ? model.clusters[anchor.clusterIndex] : null;
    // The renderer's unrotated coordinates are preserved. Never rotate or morph
    // a glyph into a closer match, and never locate evidence from the name.
    const offset = cluster ? cluster.dirBias * (9 + cluster.I * 15) * 0.18 : 0;
    const half = anchor.half ?? Math.PI / 18;
    const arc = Array.from({ length: 25 }, (_, step) => {
      const p = point(anchor.ang - half + 2 * half * step / 24);
      return `${p.x},${p.y}`;
    }).join(' ');
    return {
      ...point(anchor.ang, offset), label: point(anchor.ang, 56),
      number: index + 1, kind: observation.kind, arc,
    };
  }).filter(Boolean);
  return (
    <Box component="figure" sx={ { m: 0, minWidth: 0, textAlign: 'center' } }>
      <Box sx={ { position: 'relative', width: '100%', maxWidth: 248, mx: 'auto' } }>
        <GlyphNode model={ model } size={ 248 } sx={ { p: 0, border: 0, display: 'flex', width: '100%', '& canvas': { height: 'auto', aspectRatio: '1' } } } />
        { marks.length > 0 && (
          <Box component="svg" viewBox="0 0 100 100" aria-hidden="true" sx={ { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', color: ink } }>
            { marks.map((mark) => <g key={ mark.number } data-kind={ mark.kind } data-observation-index={ mark.number }>
              { !['branch', 'question'].includes(mark.kind) && <polyline points={ mark.arc } fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /> }
              <circle cx={ mark.x } cy={ mark.y } r="7" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
              <text x={ mark.label.x } y={ mark.label.y } textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="5">{ mark.number }</text>
            </g>) }
          </Box>
        ) }
      </Box>
      <Typography component="figcaption" sx={ { fontFamily: "'Cinzel', 'Noto Serif KR', Georgia, serif", fontSize: { xs: '1rem', sm: '1.2rem' }, overflowWrap: 'anywhere', lineHeight: 1.8 } }>
        { name }
      </Typography>
      { active?.kind === 'question' && <Typography variant="caption" sx={ { display: 'block', mt: 1 } }>{ hookPresent ? '표시된 위치에 질문 갈고리가 있어요.' : '같은 위치에 질문 갈고리가 없어요.' }</Typography> }
      { onExplore && glyph.id && !glyph.is_local && glyph.id !== 'local' && !String(glyph.id).startsWith('local-') && (
        <Button onClick={ () => onExplore(glyph.id) } aria-label={ `${name}에서 탐색` } sx={ { mt: 1, minHeight: 44, color: ink, fontSize: '0.8rem' } }>이 표식에서 탐색</Button>
      ) }
    </Box>
  );
}

/**
 * GlyphPairComparison — 저장된 두 표식과 실제 계산 근거를 비교하는 순수 표시 컴포넌트.
 * @param {object} leftGlyph - 왼쪽 DB Glyph (model_data, canonical_name, id)
 * @param {object} rightGlyph - 오른쪽 DB Glyph
 * @param {Array} relations - relateGlyphs의 실제 결과
 * @param {function} onExplore - 탐색할 Glyph ID
 * @param {function} onShare - 비교 공유. 생략하면 공유 버튼을 표시하지 않음
 * @param {boolean} sharing - 공유 준비 중
 * @param {object} sx - 추가 MUI sx
 */
export default function GlyphPairComparison({ leftGlyph, rightGlyph, relations = [], onExplore, onShare, sharing = false, sx = {} }) {
  const theme = useTheme();
  const [selectedObservation, setSelectedObservation] = useState(0);
  const ink = theme.palette.custom?.chamber?.ink || theme.palette.text.primary;
  const fog = theme.palette.custom?.chamber?.fog || theme.palette.background.paper;
  if (!leftGlyph?.model_data || !rightGlyph?.model_data) return <Typography role="status">비교할 두 표식의 데이터가 필요해요.</Typography>;

  const same = Boolean(leftGlyph.id && leftGlyph.id === rightGlyph.id)
    || (sameRenderedBody(leftGlyph.model_data, rightGlyph.model_data)
      && JSON.stringify(leftGlyph.model_data.questionHook ?? null) === JSON.stringify(rightGlyph.model_data.questionHook ?? null));
  const measuredRelations = relations.filter(isMorphologyRelation);
  const observations = measuredRelations.flatMap(getMorphologyObservations);
  const activeObservation = Math.min(selectedObservation, observations.length - 1);
  const firstReason = observations[0]?.reason || measuredRelations[0]?.reasons?.[0];
  return (
    <Box sx={ { color: ink, bgcolor: fog, p: { xs: 2, sm: 3 }, ...sx } }>
      <Typography component="h2" sx={ { fontSize: '1.2rem', fontWeight: 400, lineHeight: 1.6 } }>
        { same ? '동일한 표식이에요.' : measuredRelations.length ? '표식으로 변환한 뒤 발견한 공명' : '두 표식을 나란히 살펴보세요.' }
      </Typography>
      <Typography variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>
        { same ? '같은 형태를 다시 보고 있어요. 별도의 연결선은 만들지 않아요.' : firstReason || '현재 기준에서는 설명할 수 있는 형태 공명을 찾지 못했어요.' }
      </Typography>
      <Box sx={ { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: { xs: 1, sm: 3 }, my: 3 } }>
        <GlyphFigure glyph={ leftGlyph } observations={ observations } activeObservation={ activeObservation } side="left" onExplore={ onExplore } />
        <GlyphFigure glyph={ rightGlyph } observations={ observations } activeObservation={ activeObservation } side="right" onExplore={ onExplore } />
      </Box>
      { observations.length > 0 && <Box sx={ { mb: 2 } }>
        <Typography variant="body2" sx={ { mb: 1, lineHeight: 1.7 } }>같은 번호가 가리키는 두 표식의 실제 부분을 살펴보세요.</Typography>
        <Box role="group" aria-label="형태 관측 지점" sx={ { display: 'flex', gap: 1, flexWrap: 'wrap' } }>
          { observations.map((observation, index) => <Button key={ `${observation.kind}-${index}` }
            color="inherit" variant={ activeObservation === index ? 'outlined' : 'text' }
            aria-pressed={ activeObservation === index } onClick={ () => setSelectedObservation(index) }
            sx={ { minHeight: 44 } }>{ index + 1 }. { OBSERVATION_LABELS[observation.kind] }</Button>) }
        </Box>
        <Typography role="status" variant="body2" sx={ { mt: 1, lineHeight: 1.8 } }>{ observations[activeObservation]?.reason }</Typography>
      </Box> }
      { measuredRelations.some((relation) => relation.evidence?.level === 'shared-motif') && <Typography variant="body2" sx={ { mb: 2, lineHeight: 1.8 } }>일부 구조에서 발견한 공명이에요. 표식 전체가 닮았다는 뜻은 아니에요.</Typography> }
      { measuredRelations.map((relation, index) => <RelationEvidence key={ `${relation.relationType}-${index}` } relation={ relation } />) }
      { onShare && <Button variant="outlined" disabled={ sharing } onClick={ onShare } sx={ { mt: 2, color: ink, borderColor: alpha(ink, 0.4), minHeight: 44 } }>{ sharing ? '공유 준비 중…' : measuredRelations.length ? '이 연결 공유하기' : '이 비교 공유하기' }</Button> }
    </Box>
  );
}
