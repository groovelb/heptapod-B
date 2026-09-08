import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createGlyphImageAdapter } from '../src/lib/glyphImages/service.js';
import { backfillGlyphImages } from '../src/lib/glyphImages/jobs.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const value = (flag) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
const output = resolve(value('--checkpoint') || `tmp/glyph-images-${apply ? 'apply' : 'dry-run'}.json`);
try {
  const adapter = createGlyphImageAdapter({ url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY });
  const checkpoint = args.includes('--resume') ? JSON.parse(await readFile(output, 'utf8')) : null;
  await mkdir(dirname(output), { recursive: true });
  const state = await backfillGlyphImages({ adapter, apply, retryFailed: args.includes('--retry-failed'), checkpoint,
    onCheckpoint: async (current) => { await writeFile(`${output}.tmp`, JSON.stringify(current, null, 2), { mode: 0o600 }); await rename(`${output}.tmp`, output); } });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', complete: state.complete, counts: state.counts, checkpoint: output }));
} catch { console.error('Glyph image backfill failed. Check server environment and checkpoint; no credentials were logged.'); process.exitCode = 1; }
