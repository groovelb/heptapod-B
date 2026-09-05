import { createClient } from 'npm:@supabase/supabase-js@2.115.0';
import { ArchiveError } from './archive-http.js';

export function archiveServerClients() {
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) throw new ArchiveError('서버 설정을 확인해 주세요.', 503);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    publicClient: createClient(url, anonKey, options),
    admin: createClient(url, serviceKey, options),
  };
}

export async function verifiedOwner(request, client) {
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new ArchiveError('공개할 때 사용한 세션이 필요합니다.', 401);
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data?.user?.id) throw new ArchiveError('세션을 확인할 수 없습니다. 다시 시도해 주세요.', 401);
  return data.user.id;
}

export function rpcError(error) {
  if (error.code === '42501') return new ArchiveError('이 응답을 변경할 권한이 없습니다.', 403);
  if (error.code === '22023') return new ArchiveError('공개할 이름과 동의를 확인해 주세요.');
  if (error.code === 'P0001') return new ArchiveError('공개 횟수가 많습니다. 잠시 후 다시 시도해 주세요.', 429);
  return new ArchiveError('저장에 실패했습니다. 다시 시도해 주세요.', 503);
}
