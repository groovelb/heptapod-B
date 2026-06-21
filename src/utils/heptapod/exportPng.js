/**
 * Heptapod B Encoder — 고해상도 PNG 추출 유틸 (형태 모델 v2)
 *
 * 표시 Canvas 렌더러와 동일한 입자 전개(logogramParticles)를 오프스크린
 * 고해상 캔버스에 정적(완성형)으로 페인트해 PNG로 추출한다.
 *
 * - 결정론: 같은 모델 → 같은 입자 → 같은 PNG (절대 조건)
 * - 표시 캔버스(애니메이션 중간 상태)와 독립된 정지 완성형
 * - 종이 톤 배경 위 잉크 (사전 페이지 느낌)
 */

import {
  generateParticles, makeSprites, paintStatic, SIZE0,
} from './logogramParticles';

/**
 * 모델을 고해상 PNG로 추출해 다운로드를 트리거한다.
 *
 * @param {object} model - buildModel 산출물 [Required]
 * @param {object} options - 추출 옵션 [Optional]
 * @param {string} options.name - 파일명에 쓸 이름 [Optional, 기본값: 'logogram']
 * @param {number} options.size - 기준 한 변 (px) [Optional, 기본값: 960]
 * @param {number} options.scale - 출력 배율 [Optional, 기본값: 2]
 * @param {string} options.inkColor - 잉크 색 [Optional, 기본값: '#15171a']
 * @param {string} options.background - 배경 색 (null이면 투명) [Optional]
 *
 * Example usage:
 * exportLogogramPng(model, { name: '김민준', size: 960, scale: 2 });
 */
export function exportLogogramPng(model, options = {}) {
  const {
    name = 'logogram',
    size = 960,
    scale = 2,
    inkColor = '#15171a',
    background = null,
  } = options;

  const px = Math.round(size * scale);
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, px, px);
  }

  // 720-space → 출력 px 스케일 (표시 렌더러와 동일 좌표계)
  const sc = px / SIZE0;
  ctx.setTransform(sc, 0, 0, sc, 0, 0);

  const { particles } = generateParticles(model, true); // 정적 완성형
  const sprites = makeSprites(inkColor);
  paintStatic(ctx, particles, sprites);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `heptapod-b-${name}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });
}

export default exportLogogramPng;
