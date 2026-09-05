import { ArchiveError, corsHeaders, errorResponse, jsonResponse, readRequest, validGlyphId } from '../_shared/archive-http.js';
import { archiveServerClients, rpcError, verifiedOwner } from '../_shared/archive-server.js';

export async function handleUnpublish(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await readRequest(request);
    if (!validGlyphId(body.glyphId)) throw new ArchiveError('표식 주소를 확인해 주세요.');
    const { admin, publicClient } = archiveServerClients();
    const ownerId = await verifiedOwner(request, publicClient);
    const { data, error } = await admin.rpc('archive_unpublish_verified', { p_owner_id: ownerId, p_glyph_id: body.glyphId });
    if (error) throw rpcError(error);
    return jsonResponse(data);
  } catch (error) { return errorResponse(error); }
}

if (import.meta.main) Deno.serve(handleUnpublish);
