import { relateGlyphs, RELATION_ALGORITHM_VERSION } from '../../../src/utils/heptapod/relateGlyphs.js';
import { renderSharePng, validateShareModel, SHARE_WIDTH, SHARE_HEIGHT } from './png.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE_MESSAGE = '이 표식은 공개되어 있지 않거나 찾을 수 없습니다.';
const COMMON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Surrogate-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

export function trustedShareUrl(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
    || url.username || url.password || url.search || url.hash) throw new Error('Invalid archive URL configuration');
  return url;
}

/** Standard Supabase project domains rewrite HTML to plain text, so they cannot
 * be the public rich-share URL. Use an explicit custom domain or hosting proxy. */
export function trustedRichShareUrl(value) {
  const url = trustedShareUrl(value);
  const hostname = url.hostname.replace(/\.$/, '');
  if (hostname === 'supabase.co' || hostname.endsWith('.supabase.co')) {
    throw new Error('Rich sharing requires an HTML-capable custom domain or proxy');
  }
  return url;
}

export function escapeShareHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function failure(status, message) {
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>공유를 열 수 없습니다</title><p>${message}</p></html>`, {
    status, headers: { ...COMMON_HEADERS, 'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, noarchive', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" },
  });
}

function canonicalLink(base, left, right, format) {
  const url = new URL(base);
  url.searchParams.set('left', left);
  if (right) url.searchParams.set('right', right);
  if (format) url.searchParams.set('format', format);
  return url.href;
}

function glyphName(glyph) {
  if (typeof glyph.canonical_name !== 'string' || !glyph.canonical_name.trim()
    || glyph.canonical_name.length > 256) throw new Error('Invalid stored name');
  return glyph.canonical_name + (glyph.is_interrogative ? '?' : '');
}

/**
 * Public, non-mutating link surface. It rechecks both endpoints on every HTML,
 * PNG and HEAD request, even when injected readers run with elevated permissions.
 */
export function createArchiveShareHandler({ readPublicGlyphs, siteUrl, shareUrl }) {
  const site = trustedShareUrl(siteUrl);
  const endpoint = trustedRichShareUrl(shareUrl);
  if (!site.pathname.endsWith('/')) site.pathname += '/';
  if (typeof readPublicGlyphs !== 'function') throw new Error('Missing archive reader');

  return async function handleArchiveShare(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return failure(405, 'GET 요청으로 공유를 열어 주세요.');
    const url = new URL(request.url);
    const params = url.searchParams;
    const left = params.get('left')?.toLowerCase();
    const right = params.has('right') ? params.get('right')?.toLowerCase() : null;
    const format = params.get('format') || 'html';
    if (!left || !UUID.test(left) || (right !== null && !UUID.test(right))
      || !['html', 'png'].includes(format)
      || [...params.keys()].some((key) => !['left', 'right', 'format'].includes(key))
      || ['left', 'right', 'format'].some((key) => params.getAll(key).length > 1)) {
      return failure(400, '공유 주소를 확인해 주세요.');
    }

    const ids = right ? [...new Set([left, right])] : [left];
    let rows;
    try { rows = await readPublicGlyphs(ids); }
    catch { return failure(503, '지금은 공유를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.'); }
    if (!Array.isArray(rows)) return failure(503, '지금은 공유를 불러올 수 없습니다.');
    const byId = new Map(rows.filter((row) => row && typeof row.id === 'string')
      .map((row) => [row.id.toLowerCase(), row]));
    const glyphs = [left, ...(right ? [right] : [])].map((id) => byId.get(id));
    // Return a generic response before reading ANY name/model on unavailable pairs.
    if (glyphs.some((glyph) => !glyph || glyph.is_public !== true)) return failure(404, PRIVATE_MESSAGE);

    let names;
    let relations = [];
    try {
      names = glyphs.map(glyphName);
      for (const glyph of glyphs) validateShareModel(glyph.model_data);
      if (right) relations = relateGlyphs(glyphs[0], glyphs[1]);
    } catch { return failure(404, PRIVATE_MESSAGE); }

    if (format === 'png') {
      const headers = { ...COMMON_HEADERS, 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="response-archive.png"' };
      if (request.method === 'HEAD') return new Response(null, { headers });
      try { return new Response(await renderSharePng(glyphs.map((glyph) => glyph.model_data)), { headers }); }
      catch { return failure(503, '지금은 공유 이미지를 만들 수 없습니다.'); }
    }

    const currentRelations = relations.filter((relation) => relation.algorithmVersion >= RELATION_ALGORITHM_VERSION);
    const explanation = currentRelations.find((relation) => relation.relationType === 'FORM' && relation.evidence?.basis === 'rendered-form')
      || currentRelations.find((relation) => relation.relationType === 'VARIANT' && relation.evidence?.basis === 'rendered-variant');
    const sameGlyph = right === left;
    const reason = sameGlyph ? '같은 기록에 보존된 동일한 표식입니다.' : explanation?.evidence?.observations?.[0]?.reason || explanation?.reasons?.[0] || (right
      ? '두 표식의 가지와 틈, 먹의 흐름을 비교했지만 현재 기준의 형태 공명은 발견되지 않았습니다.'
      : '아카이브에 보존된 표식입니다. 당신의 표식과도 형태가 닮아 있을까요?');
    const title = `${names.join(' · ')} | The Response Archive`;
    const destination = new URL(right && !sameGlyph ? `compare/${left}/${right}` : `glyph/${left}`, site).href;
    const canonical = canonicalLink(endpoint, left, right);
    const png = canonicalLink(endpoint, left, right, 'png');
    const esc = escapeShareHtml;
    const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(reason)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(reason)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(png)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${SHARE_WIDTH}">
<meta property="og:image:height" content="${SHARE_HEIGHT}">
<meta property="og:image:alt" content="${esc(names.join(' · ') + '의 실제 표식')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(canonical)}">
<style>
body{margin:0;background:#d6e8ed;color:#1c2226;font-family:Georgia,serif}main{max-width:960px;margin:auto;padding:36px 24px 64px;text-align:center}small{letter-spacing:.13em;font:12px monospace}img{display:block;width:100%;height:auto;margin:20px 0}h1{font-weight:400;font-size:clamp(24px,5vw,44px);overflow-wrap:anywhere}p{font-family:system-ui,sans-serif;line-height:1.8}a{display:inline-block;margin-top:20px;padding:14px 24px;border:1px solid currentColor;border-radius:2px;color:inherit;text-decoration:none;font-family:system-ui,sans-serif}a:focus-visible{outline:3px solid currentColor;outline-offset:4px}
</style>
</head>
<body><main>
<small>HEPTAPOD B · THE RESPONSE ARCHIVE</small>
<img src="${esc(png)}" width="${SHARE_WIDTH}" height="${SHARE_HEIGHT}" alt="${esc(names.join(' · ') + '의 실제 표식')}">
<h1>${esc(names.join(' · '))}</h1>
<p>${esc(reason)}</p>
<a href="${esc(destination)}">${right && !sameGlyph ? '두 이름의 연결 살펴보기' : '이 이름에서 탐색하기'}</a>
</main></body></html>`;
    const headers = {
      ...COMMON_HEADERS, 'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `default-src 'none'; img-src ${endpoint.origin}; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    };
    return new Response(request.method === 'HEAD' ? null : html, { headers });
  };
}
