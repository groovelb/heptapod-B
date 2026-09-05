import { generateParticles, makeSprites, paintStatic, SIZE0 } from './logogramParticles.js';
import { glyphLabel } from './resonanceView.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function archiveSharePath(leftId, rightId) {
  if (!UUID.test(leftId) || (rightId && !UUID.test(rightId))) throw new Error('공개된 표식만 링크로 공유할 수 있습니다.');
  return rightId ? `/compare/${leftId}/${rightId}` : `/glyph/${leftId}`;
}

/** Optional edge endpoint serves OG metadata; app links also work without it. */
export function archiveShareUrl(leftId, rightId, options = {}) {
  const path = archiveSharePath(leftId, rightId);
  const origin = options.origin || globalThis.location?.origin;
  const endpoint = options.endpoint ?? import.meta.env?.VITE_ARCHIVE_SHARE_URL;
  if (endpoint) {
    const url = new URL(endpoint);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) throw new Error('공유 주소 설정을 확인해 주세요.');
    // Hosted Supabase shared domains rewrite HTML to text/plain. Keep a usable
    // app URL until an HTML-capable custom-domain endpoint is configured.
    if (/(^|\.)supabase\.(co|in)$/.test(url.hostname)) return new URL(path, origin).href;
    url.searchParams.set('left', leftId);
    if (rightId) url.searchParams.set('right', rightId);
    return url.href;
  }
  return new URL(path, origin).href;
}

export async function shareArchive({ left, right, reason }, options = {}) {
  const url = archiveShareUrl(left.id, right?.id, options);
  const title = right ? `${glyphLabel(left)} · ${glyphLabel(right)} — 두 이름 비교` : `${glyphLabel(left)} — The Response Archive`;
  const nav = options.navigator || globalThis.navigator;
  if (nav?.share) {
    try {
      await nav.share({ title, text: reason || '당신의 이름과도 연결될까요?', url });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  if (!nav?.clipboard?.writeText) throw new Error('이 기기에서는 링크를 복사할 수 없습니다. 주소창의 링크를 사용해 주세요.');
  await nav.clipboard.writeText(url);
  return 'copied';
}

/** Same final particles as the display renderer; no inferred or synthetic glyphs. */
export async function exportPairCard(left, right, reason = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 저장할 수 없습니다.');
  await document.fonts?.ready;
  ctx.fillStyle = '#d6e8ed';
  ctx.fillRect(0, 0, 1200, 630);
  const sprites = makeSprites('#1c2226');
  for (const [index, glyph] of [left, right].entries()) {
    const { particles } = generateParticles(glyph.model_data, true);
    ctx.save();
    ctx.translate(90 + index * 600, 58);
    ctx.scale(420 / SIZE0, 420 / SIZE0);
    paintStatic(ctx, particles, sprites);
    ctx.restore();
    ctx.fillStyle = '#1c2226';
    ctx.textAlign = 'center';
    ctx.font = '32px "Noto Serif KR", Georgia, serif';
    ctx.fillText(glyphLabel(glyph), 300 + index * 600, 486, 500);
  }
  ctx.font = '20px "Noto Serif KR", sans-serif';
  ctx.fillText(reason || '두 이름을 나란히 관측합니다.', 600, 548, 1080);
  ctx.font = '14px monospace';
  ctx.fillText('HEPTAPOD B · THE RESPONSE ARCHIVE', 600, 596);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('이미지를 만들지 못했습니다. 다시 시도해 주세요.');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'response-archive-comparison.png';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
