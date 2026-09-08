import { handleGlyphImageRequest } from '../../../../src/lib/glyphImages/service.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
  return handleGlyphImageRequest(request, (await params).id);
}
export const HEAD = GET;
