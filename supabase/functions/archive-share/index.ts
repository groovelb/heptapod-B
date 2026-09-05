import { createArchiveShareHandler } from './handler.js';
import { createPublicGlyphReader } from './reader.js';

// Intentionally public: social previews cannot send a user JWT. Every response
// fetches only current public glyphs; the reader uses the platform anon key.
export async function handleArchiveShare(request: Request) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const siteUrl = Deno.env.get('ARCHIVE_SITE_URL');
    // Required explicitly: the default *.supabase.co gateway rewrites HTML to
    // text/plain. Rich OG needs a custom Supabase domain or HTML-capable proxy.
    const shareUrl = Deno.env.get('ARCHIVE_SHARE_URL');
    if (!supabaseUrl || !anonKey || !siteUrl || !shareUrl) throw new Error('Missing archive configuration');
    const handler = createArchiveShareHandler({
      readPublicGlyphs: createPublicGlyphReader({ supabaseUrl, anonKey }),
      siteUrl,
      shareUrl,
    });
    return await handler(request);
  } catch {
    return new Response('공유 페이지를 준비하고 있습니다.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, noarchive' },
    });
  }
}

if (import.meta.main) Deno.serve(handleArchiveShare);
