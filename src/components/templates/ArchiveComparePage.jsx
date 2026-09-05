import { useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useGlyph } from '../../hooks/data/useGlyph';
import { usePublish } from '../../hooks/data/usePublish';
import { buildArchiveModel, ARCHIVE_ENCODER_VERSION } from '../../utils/heptapod/archiveGlyph';
import { normalizeName } from '../../utils/heptapod/normalizeName';
import { relateGlyphs } from '../../utils/heptapod/relateGlyphs';
import { glyphLabel, getMorphologyObservations, isMorphologyRelation } from '../../utils/heptapod/resonanceView';
import { exportPairCard, shareArchive } from '../../utils/heptapod/shareArchive';
import GlyphNode from '../data-display/GlyphNode';
import GlyphPairComparison from '../data-display/GlyphPairComparison';
import PublishDialog from '../overlay-feedback/PublishDialog';

/** Public pair links and private, local comparisons use the same rendered models. */
export default function ArchiveComparePage({ client }) {
  const { leftId, rightId } = useParams();
  const navigate = useNavigate();
  const leftState = useGlyph(leftId, { client });
  const rightState = useGlyph(rightId || null, { client });
  const { publish } = usePublish({ client });
  const composing = useRef(false);
  const [draft, setDraft] = useState('');
  const [localName, setLocalName] = useState('');
  const [inputError, setInputError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const localGlyph = useMemo(() => {
    if (!localName) return null;
    try {
      const normalized = normalizeName(localName);
      return { id: 'local', canonical_name: normalized.canonicalName, is_interrogative: normalized.isInterrogative,
        encoder_version: ARCHIVE_ENCODER_VERSION, model_data: buildArchiveModel(localName) };
    } catch { return null; }
  }, [localName]);
  const left = leftState.glyph;
  const right = localGlyph || rightState.glyph;
  const comparison = useMemo(() => {
    if (!left || !right) return { relations: [], error: '' };
    try { return { relations: relateGlyphs(left, right).filter(isMorphologyRelation), error: '' }; }
    catch { return { relations: [], error: '이 표식의 형태 데이터를 읽을 수 없어 비교를 완료하지 못했습니다.' }; }
  }, [left, right]);
  const shareReason = comparison.relations.flatMap(getMorphologyObservations)[0]?.reason
    || comparison.relations.find((relation) => relation.relationType === 'VARIANT')?.reasons?.[0];
  const runAction = async (action) => {
    if (sharing) return;
    setSharing(true);
    setActionError('');
    setNotice('');
    try {
      const result = await action();
      if (result === 'copied') setNotice('공개 링크를 복사했습니다.');
      else if (result === 'shared') setNotice('공유 창으로 전달했습니다.');
    } catch (error) { setActionError(error.message || '다시 시도해 주세요.'); }
    finally { setSharing(false); }
  };
  const compareLocal = (event) => {
    event.preventDefault();
    if (composing.current) return;
    try {
      buildArchiveModel(draft);
      setLocalName(draft.trim());
      setInputError('');
      setNotice('이름을 변환한 표식을 이 기기에서 비교했습니다. 아직 공개하지 않았습니다.');
    } catch (error) { setInputError(error.message); }
  };
  const loading = leftState.loading || (!!rightId && rightState.loading);
  const unavailable = leftState.error || (rightId && rightState.error) || (!loading && (!left || (!!rightId && !rightState.glyph)));
  return (
    <Box component="main" sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', px: { xs: 2, md: 5 }, py: 3 } }>
      <Box component="nav" aria-label="비교 화면 탐색" sx={ { display: 'flex', justifyContent: 'space-between', mb: 4, '& .MuiButton-root': { color: 'inherit', minHeight: 44 } } }>
        <Button component={ RouterLink } to={ `/glyph/${leftId}` }>← 표식으로</Button>
        <Button component={ RouterLink } to="/archive">아카이브</Button>
      </Box>
      <Box sx={ { maxWidth: 1060, mx: 'auto' } }>
        <Typography component="h1" variant="h4" sx={ { fontFamily: '"Cinzel", "Noto Serif KR", serif', mb: 1 } }>두 표식 사이에서</Typography>
        <Typography sx={ { mb: 3 } }>이름이 변환된 Heptapod B 표식의 닮은 부위를 나란히 살펴봅니다.</Typography>
        {loading ? <Box role="status" sx={ { py: 8, textAlign: 'center' } }><CircularProgress color="inherit" /><Typography>공개된 표식을 불러오는 중…</Typography></Box> : unavailable ? (
          <Alert severity="info">공개되지 않았거나 불러올 수 없는 표식입니다. <Button onClick={ () => { leftState.refetch?.(); rightState.refetch?.(); } }>다시 시도</Button></Alert>
        ) : (
          <>
            {comparison.error && <Alert severity="error" sx={ { mb: 2 } }>{comparison.error}</Alert>}
            {right && !comparison.error ? (
              <GlyphPairComparison leftGlyph={ left } rightGlyph={ right } relations={ comparison.relations }
                onExplore={ (id) => id !== 'local' && navigate(`/field/${id}`) }
                onShare={ !localGlyph ? () => runAction(() => shareArchive({ left, right, reason: shareReason })) : undefined }
                sharing={ sharing } />
            ) : !right && <Box sx={ { display: 'flex', justifyContent: 'center', py: 2 } }><GlyphNode model={ left.model_data } size={ 240 } label={ glyphLabel(left) } /></Box>}
            {right && !comparison.error && <Box sx={ { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, my: 2 } }>
              <Button disabled={ sharing } onClick={ () => runAction(() => exportPairCard(left, right, shareReason)) } sx={ { color: 'inherit', minHeight: 44 } }>표식 비교 이미지 저장</Button>
              {localGlyph && <Button onClick={ () => setPublishOpen(true) } sx={ { color: 'inherit', minHeight: 44, borderBottom: '1px solid' } }>내 응답을 공개하고 링크 만들기</Button>}
              {localGlyph && rightId && <Button onClick={ () => { setLocalName(''); setNotice(''); } } sx={ { color: 'inherit', minHeight: 44 } }>공유받은 비교로 돌아가기</Button>}
            </Box>}
            <Box component="form" onSubmit={ compareLocal } sx={ { mt: 5, py: 3, borderTop: '1px solid', borderColor: 'custom.chamber.ink', maxWidth: 620, mx: 'auto' } }>
              <Typography component="h2" variant="h6" sx={ { mb: 1 } }>당신의 이름은 어떤 표식과 공명할까요?</Typography>
              <Typography sx={ { mb: 2 } }>이름을 Heptapod B 표식으로 변환해 형태를 비교합니다. 공개하기 전에는 이 기기에서만 확인합니다.</Typography>
              <Box sx={ { display: 'flex', gap: 1, alignItems: 'start' } }>
                <TextField label="표식으로 변환할 이름" value={ draft } onChange={ (event) => setDraft(event.target.value) } error={ !!inputError } helperText={ inputError } fullWidth
                  onCompositionStart={ () => { composing.current = true; } } onCompositionEnd={ () => { composing.current = false; } }
                  onKeyDown={ (event) => { if (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault(); } }
                  sx={ { '& .MuiInputBase-root, & .MuiInputLabel-root': { color: 'custom.chamber.ink' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'custom.chamber.ink' } } } />
                <Button type="submit" disabled={ !draft.trim() } sx={ { color: 'inherit', minHeight: 56, whiteSpace: 'nowrap' } }>변환해 비교하기</Button>
              </Box>
            </Box>
          </>
        )}
        {notice && <Typography role="status" sx={ { mt: 2, textAlign: 'center' } }>{notice}</Typography>}
        {actionError && <Alert severity="error" sx={ { mt: 2 } }>{actionError}</Alert>}
      </Box>
      <PublishDialog key={ `${leftId}:${localName}` } open={ publishOpen } onClose={ () => setPublishOpen(false) } glyphName={ localName }
        model={ localGlyph?.model_data } onPublish={ ({ consented }) => publish({ displayName: localName, consented }) }
        onPublished={ ({ glyphId }) => { setLocalName(''); setNotice(''); navigate(`/compare/${leftId}/${glyphId}`); } } />
    </Box>
  );
}
