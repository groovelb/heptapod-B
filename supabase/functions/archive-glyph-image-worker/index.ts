import { createGlyphImageAdapter } from '../../../src/lib/glyphImages/service.js';
import { renderGlyphImage } from '../../../src/lib/glyphImages/rasterize.js';
import { createGlyphImageWorkerHandler } from './handler.js';

const adapter = createGlyphImageAdapter({ url: Deno.env.get('SUPABASE_URL'), key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') });
Deno.serve(createGlyphImageWorkerHandler({ secret: Deno.env.get('GLYPH_IMAGE_WORKER_SECRET'), adapter, render: renderGlyphImage }));
