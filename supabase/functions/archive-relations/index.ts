import { ArchiveError, corsHeaders, errorResponse, jsonResponse, readRequest, validGlyphId } from '../_shared/archive-http.js';
import { archiveServerClients } from '../_shared/archive-server.js';
import { computePublicRelations } from '../_shared/archive-relations.js';

export async function handleRelations(request: Request) {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await readRequest(request);
    if (!validGlyphId(body.glyphId)) throw new ArchiveError('표식 주소를 확인해 주세요.');
    const { publicClient } = archiveServerClients();
    return jsonResponse(await computePublicRelations(publicClient, body.glyphId));
  } catch (error) { return errorResponse(error); }
}

if (import.meta.main) Deno.serve(handleRelations);
