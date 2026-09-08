import { createGlyphImageAdapter } from '../src/lib/glyphImages/service.js';
import { processGlyphImageJobs } from '../src/lib/glyphImages/jobs.js';

const args = process.argv.slice(2);
if (!args.includes('--apply')) {
  console.log('Dry run: no jobs claimed or images written. Use --apply to process one bounded batch (default 2, max 4).');
} else {
  try {
    const { renderGlyphImage } = await import('../src/lib/glyphImages/rasterize.js');
    const adapter = createGlyphImageAdapter({ url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY });
    const index = args.indexOf('--limit'); const limit = index < 0 ? 2 : Number(args[index + 1]);
    if (!Number.isInteger(limit) || limit < 1 || limit > 4) throw new Error('Invalid limit');
    console.log(JSON.stringify(await processGlyphImageJobs({ adapter, render: renderGlyphImage, limit })));
  } catch { console.error('Glyph image worker failed. Check server environment; no credentials were logged.'); process.exitCode = 1; }
}
