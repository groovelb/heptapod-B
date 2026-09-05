import { prepareArchiveGlyph } from '../../../src/utils/heptapod/archiveGlyph.js';
import { ArchiveError, corsHeaders, errorResponse, jsonResponse, readRequest } from '../_shared/archive-http.js';
import { archiveServerClients, rpcError, verifiedOwner } from '../_shared/archive-server.js';

export async function handlePublish(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await readRequest(request);
    if (body.consented !== true) throw new ArchiveError('이름과 표식 공개에 동의해 주세요.');
    if (typeof body.displayName !== 'string' || body.displayName.length > 512) throw new ArchiveError('이름을 확인해 주세요.');
    const tags = body.contextTags ?? [];
    if (!Array.isArray(tags) || tags.length > 3 || tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 32)) {
      throw new ArchiveError('맥락 태그는 32자 이내로 최대 3개까지 선택할 수 있습니다.');
    }
    const { admin, publicClient } = archiveServerClients();
    const ownerId = await verifiedOwner(request, publicClient);
    let glyph;
    try { glyph = await prepareArchiveGlyph(body.displayName); }
    catch (error) { throw new ArchiveError(error instanceof Error ? error.message : '이름을 확인해 주세요.'); }
    const { data, error } = await admin.rpc('archive_publish_verified', {
      p_owner_id: ownerId,
      p_glyph: glyph,
      p_display_name: glyph.displayName,
      p_context_tags: [...new Set(tags.map((tag) => tag.trim()))],
      p_consented: true,
    });
    if (error) throw rpcError(error);
    return jsonResponse(data);
  } catch (error) { return errorResponse(error); }
}

if (import.meta.main) Deno.serve(handlePublish);
