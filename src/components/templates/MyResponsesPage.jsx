import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuth } from '../../hooks/data/useAuth';
import { useMyContributions } from '../../hooks/data/useMyContributions';
import { useUnpublish } from '../../hooks/data/useUnpublish';
import { glyphLabel } from '../../utils/heptapod/resonanceView';

/** Private contribution management; public archive remains a separate route. */
export default function MyResponsesPage({ client }) {
  const { user, loading: authLoading, error: authError, linkWithGoogle, signInWithGoogle } = useAuth({ client });
  const { contributions, loading, error, refetch } = useMyContributions({ client, userId: user?.id });
  const { unpublish, loading: withdrawing } = useUnpublish({ client });
  const [target, setTarget] = useState(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const linkAccount = async () => {
    setActionError('');
    try { await (user?.is_anonymous ? linkWithGoogle?.() : signInWithGoogle?.()); }
    catch (err) { setActionError(err.message); }
  };
  const withdraw = async () => {
    setActionError('');
    try {
      await unpublish(target.glyph_id);
      setTarget(null);
      setNotice('내 응답을 공개 철회했습니다. 다른 사람의 응답은 유지됩니다.');
      refetch();
    } catch (err) { setActionError(err.message); }
  };
  return <Box component="main" sx={ { minHeight: '100vh', bgcolor: 'custom.chamber.fog', color: 'custom.chamber.ink', px: { xs: 2, md: 5 }, py: 4, '& .MuiButton-root': { color: 'custom.chamber.ink', minHeight: 44 } } }>
    <Button component={ RouterLink } to="/archive">← 공개 아카이브</Button>
    <Box sx={ { maxWidth: 720, mx: 'auto', mt: 4 } }>
      <Typography component="h1" variant="h4" sx={ { mb: 2 } }>내가 남긴 응답</Typography>
      {user?.is_anonymous && <Alert severity="info" sx={ { mb: 3 } }>이 기기의 익명 세션입니다. 브라우저 데이터를 지우기 전에 계정을 연결하면 다른 기기에서도 관리할 수 있습니다.<Button onClick={ linkAccount }>Google 계정 연결</Button></Alert>}
      {!user && !authLoading && <Box><Typography>응답을 남긴 세션이나 연결된 계정으로 관리할 수 있습니다.</Typography><Button onClick={ linkAccount }>Google로 로그인</Button></Box>}
      {error && <Alert severity="error">{error}<Button onClick={ refetch }>다시 시도</Button></Alert>}
      {authError && <Alert severity="error">{authError}</Alert>}
      {actionError && <Alert severity="error" sx={ { my: 2 } }>{actionError}</Alert>}
      {notice && <Typography role="status" sx={ { my: 2 } }>{notice}</Typography>}
      {loading || authLoading ? <Typography role="status">응답을 불러오는 중…</Typography> : user && contributions.length === 0 ? <Typography sx={ { my: 4 } }>이 세션에서 공개한 응답이 없습니다.</Typography> : contributions.map((contribution) => <Box key={ contribution.id } sx={ { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, py: 2, borderBottom: '1px solid' } }>
        <Button component={ RouterLink } to={ `/glyph/${contribution.glyph_id}` }>{contribution.display_name || glyphLabel(contribution.glyph)}</Button>
        <Button onClick={ () => { setActionError(''); setTarget(contribution); } }>공개 철회</Button>
      </Box>)}
    </Box>
    <Dialog open={ !!target } onClose={ () => !withdrawing && setTarget(null) } aria-labelledby="withdraw-title">
      <DialogTitle id="withdraw-title">내 응답을 공개 철회할까요?</DialogTitle>
      <DialogContent>내가 남긴 응답만 철회합니다. 이 표식에 다른 공개 응답이 있으면 표식은 아카이브에 남습니다.{actionError && <Alert severity="error" sx={ { mt: 2 } }>{actionError}</Alert>}</DialogContent>
      <DialogActions><Button disabled={ withdrawing } onClick={ () => setTarget(null) }>취소</Button><Button disabled={ withdrawing } onClick={ withdraw }>{withdrawing ? '처리 중…' : '공개 철회'}</Button></DialogActions>
    </Dialog>
  </Box>;
}
