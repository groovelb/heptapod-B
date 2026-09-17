/**
 * Storybook 렌더 스모크 하네스: 환경 셋업
 *
 * happy-dom 에 없는 브라우저 API 를 최소 스텁으로 채운다.
 * 목적은 "브라우저였다면 통과했을 스토리"가 환경 부족으로 터지는 것을 막는 것이다.
 * 스텁은 항상 존재 여부를 먼저 확인하고 없을 때만 넣는다(실제 구현을 덮어쓰지 않는다).
 *
 * 여기서 채우지 못하는 것은 storybook-smoke.test.jsx 의 ENV_PATTERNS 로 'env' 분류한다.
 */

import { setProjectAnnotations } from '@storybook/react-vite';

/* ---------------------------------------------------------------- 폴리필 */

/** ResizeObserver: 콜백을 절대 호출하지 않는 no-op 관찰자 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** IntersectionObserver: 항상 화면 밖으로 보고하되 콜백은 호출하지 않는다 */
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.root = options.root ?? null;
      this.rootMargin = options.rootMargin ?? '0px';
      this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0];
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

/** MutationObserver 는 happy-dom 에 있지만 환경에 따라 빠질 수 있다 */
if (typeof globalThis.MutationObserver === 'undefined') {
  globalThis.MutationObserver = class MutationObserver {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

/** matchMedia: 모든 쿼리를 false 로 답한다(데스크톱 기본 분기 유지) */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return false; },
  });
}

/** requestAnimationFrame: 16ms 타이머로 대체 */
if (typeof globalThis.requestAnimationFrame !== 'function') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
if (typeof globalThis.requestIdleCallback !== 'function') {
  globalThis.requestIdleCallback = (cb) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 1);
  globalThis.cancelIdleCallback = (id) => clearTimeout(id);
}

/** 스크롤 API: happy-dom 은 window.scrollTo 가 "not implemented" 를 던진다 */
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
  window.scrollBy = () => {};
  if (typeof Element !== 'undefined') {
    Element.prototype.scrollTo = Element.prototype.scrollTo || function scrollTo() {};
    Element.prototype.scrollBy = Element.prototype.scrollBy || function scrollBy() {};
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function scrollIntoView() {};
  }
}

/** Canvas: 2d 는 최소 스텁, webgl 계열은 null(라이브러리가 "미지원"으로 인식하게) */
if (typeof HTMLCanvasElement !== 'undefined') {
  const make2dContext = (canvas) => {
    const gradient = { addColorStop() {} };
    const ctx = {
      canvas,
      /* 상태 속성 (쓰기 가능해야 한다) */
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
      miterLimit: 10, lineDashOffset: 0, font: '10px sans-serif', textAlign: 'start',
      textBaseline: 'alphabetic', direction: 'inherit', globalAlpha: 1,
      globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
      shadowBlur: 0, shadowColor: 'rgba(0,0,0,0)', shadowOffsetX: 0, shadowOffsetY: 0,
      filter: 'none',
      /* 값을 돌려줘야 하는 메서드 */
      measureText: (text = '') => ({
        width: String(text).length * 6,
        actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2,
        actualBoundingBoxLeft: 0, actualBoundingBoxRight: String(text).length * 6,
        fontBoundingBoxAscent: 8, fontBoundingBoxDescent: 2,
      }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      createConicGradient: () => gradient,
      createPattern: () => null,
      getImageData: (_x, _y, w = 1, h = 1) => ({
        width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
      }),
      createImageData: (w = 1, h = 1) => ({
        width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)),
      }),
      getLineDash: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      isPointInPath: () => false,
      isPointInStroke: () => false,
    };
    /* 나머지 드로잉 메서드는 전부 no-op */
    const noops = [
      'save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform', 'resetTransform',
      'clearRect', 'fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo',
      'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect',
      'fill', 'stroke', 'clip', 'drawImage', 'putImageData', 'fillText', 'strokeText',
      'setLineDash', 'drawFocusIfNeeded', 'reset',
    ];
    for (const name of noops) ctx[name] = () => {};
    return ctx;
  };

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
    if (type === '2d') {
      if (!this.__smoke2d) this.__smoke2d = make2dContext(this);
      return this.__smoke2d;
    }
    /* webgl / webgl2 / bitmaprenderer: 브라우저 미지원과 같은 신호를 준다 */
    if (typeof type === 'string' && /webgl|experimental-webgl|bitmaprenderer|webgpu/i.test(type)) {
      return null;
    }
    if (typeof originalGetContext === 'function') {
      try { return originalGetContext.call(this, type, ...rest); } catch { return null; }
    }
    return null;
  };

  HTMLCanvasElement.prototype.toDataURL = HTMLCanvasElement.prototype.toDataURL
    || function toDataURL() { return 'data:image/png;base64,'; };
  HTMLCanvasElement.prototype.toBlob = HTMLCanvasElement.prototype.toBlob
    || function toBlob(cb) { cb?.(null); };
}

/** 미디어 재생 API: happy-dom 은 play/pause/load 를 구현하지 않는다 */
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function pause() {};
  HTMLMediaElement.prototype.load = function load() {};
  if (!Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'duration')?.get) {
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', { configurable: true, get: () => 0 });
  }
}

/** 폰트 로딩 API */
if (typeof document !== 'undefined' && !document.fonts) {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      ready: Promise.resolve(),
      status: 'loaded',
      check: () => true,
      load: () => Promise.resolve([]),
      add() {}, delete() {}, clear() {},
      addEventListener() {}, removeEventListener() {},
      forEach() {}, size: 0,
    },
  });
}
if (typeof globalThis.FontFace === 'undefined') {
  globalThis.FontFace = class FontFace {
    constructor(family) { this.family = family; this.status = 'loaded'; }
    load() { return Promise.resolve(this); }
  };
}

/** Blob/Object URL */
if (typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:smoke/0';
  URL.revokeObjectURL = () => {};
}

/** getComputedStyle 이 CSS 변수 조회에서 빈 문자열만 주도록 보장 (에러 금지) */
if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
  const original = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el, pseudo) => {
    try {
      return original(el, pseudo);
    } catch {
      return { getPropertyValue: () => '' };
    }
  };
}

/** 실제 네트워크 요청을 막는다(구글 폰트 등). 스토리 로직 오류와 섞이지 않게 즉시 실패 대신 빈 응답 */
if (typeof globalThis.fetch === 'function') {
  globalThis.fetch = async () => new Response('', { status: 200 });
}

/** React act 환경 표시 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------------------------------- 프로젝트 프리뷰 주입 */

/**
 * 저장소마다 .storybook/preview 확장자가 다르다(jsx/ts/js).
 * glob 으로 실제 존재하는 파일 하나를 골라 setProjectAnnotations 에 넘긴다.
 * addon-a11y 의 preview 는 넣지 않는다: axe 계측이 happy-dom 에서 노이즈만 만든다.
 */
const previewModules = import.meta.glob('../.storybook/preview.{js,jsx,mjs,ts,tsx}', { eager: true });
const previewEntries = Object.values(previewModules);

if (previewEntries.length === 0) {
  console.warn('[smoke] .storybook/preview 를 찾지 못했다. 전역 데코레이터 없이 렌더한다.');
} else {
  setProjectAnnotations(previewEntries);
}
