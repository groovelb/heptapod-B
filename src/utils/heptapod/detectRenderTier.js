/**
 * detectRenderTier — 로고그램 렌더러 폴백 전략용 디바이스 능력 감지 유틸
 *
 * 렌더러는 3단계 폴백 구조:
 *   WebGL 유체(고성능) → Canvas 2D 입자(중간) → SVG(기본/폴백)
 *
 * 이 모듈은 순수 감지만 담당한다. 렌더링 로직·React 의존성을 포함하지 않으며,
 * 평범한 함수로 제공된다(훅 래핑은 컴포넌트 단계에서 별도 처리).
 *
 * 판정 결과는 RenderConfig 엔티티(02-ux-flow.md)와 정렬된다:
 *   { tier: 'webgl' | 'canvas' | 'svg', reducedMotion: boolean }
 * 여기에 데이터 리드아웃 표기를 위한 reasons(판정 근거 문자열 배열)를 더한다.
 */

/** reduced-motion 감지에 사용하는 미디어쿼리 문자열 */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 보수적 강등 기준이 되는 논리 코어 수 (이하이면 저성능 신호) */
const LOW_CORE_THRESHOLD = 4;

/** 보수적 강등 기준이 되는 deviceMemory(GB) (이하이면 저성능 신호) */
const LOW_MEMORY_THRESHOLD_GB = 4;

/**
 * SSR/비브라우저 환경 여부를 판단한다.
 *
 * @returns {boolean} window 또는 navigator가 부재하면 true
 */
function isNonBrowserEnv() {
  return typeof window === 'undefined' || typeof navigator === 'undefined';
}

/**
 * prefers-reduced-motion: reduce 매치 여부를 안전하게 조회한다.
 *
 * @returns {boolean} reduce를 선호하면 true (조회 불가 시 false)
 */
function matchReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * WebGL2 / WebGL1 컨텍스트 생성 가능 여부를 검사한다.
 * 검사용으로 생성한 컨텍스트는 WEBGL_lose_context 확장으로 즉시 해제한다.
 *
 * @returns {{ webgl2: boolean, webgl1: boolean, released: boolean }}
 *   webgl2 - WebGL2 컨텍스트 생성 성공 여부
 *   webgl1 - WebGL1(experimental 포함) 컨텍스트 생성 성공 여부
 *   released - loseContext 확장으로 해제를 호출했는지 여부
 */
function probeWebGL() {
  const result = { webgl2: false, webgl1: false, released: false };

  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return result;
  }

  let canvas = null;
  let gl = null;

  try {
    canvas = document.createElement('canvas');

    gl = canvas.getContext('webgl2');
    if (gl) {
      result.webgl2 = true;
      result.webgl1 = true;
    } else {
      gl =
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (gl) {
        result.webgl1 = true;
      }
    }
  } catch {
    // 컨텍스트 생성 자체가 throw하면 WebGL 미지원으로 간주
    return result;
  } finally {
    // 검사용 컨텍스트는 반드시 해제한다 (GPU 리소스 누수 방지)
    if (gl && typeof gl.getExtension === 'function') {
      try {
        const loseExt = gl.getExtension('WEBGL_lose_context');
        if (loseExt && typeof loseExt.loseContext === 'function') {
          loseExt.loseContext();
          result.released = true;
        }
      } catch {
        // 해제 실패는 치명적이지 않음 — 무시
      }
    }
    // 캔버스 참조 해제(GC 힌트)
    canvas = null;
    gl = null;
  }

  return result;
}

/**
 * 디바이스 능력을 감지해 렌더러 tier와 reduced-motion 선호를 판정한다.
 *
 * 판정 규칙:
 *   - WebGL2/WebGL1 컨텍스트 생성 불가 → 'canvas'로 강등 (WebGL 폴백)
 *   - WebGL 가능하더라도 저성능 신호(논리 코어 ≤4, deviceMemory ≤4GB)가
 *     감지되면 보수적으로 'canvas'로 강등
 *   - 그 외 → 'webgl'
 *   - SSR/비브라우저 환경 → 'svg' (폴백 기본값)
 *   - prefers-reduced-motion은 tier와 독립적으로 reducedMotion 플래그에만 반영한다.
 *     (정지 렌더 품질은 최고 tier를 써도 무방하므로 tier를 낮추지 않는다)
 *
 * @returns {{ tier: ('webgl'|'canvas'|'svg'), reducedMotion: boolean, reasons: string[] }}
 *   tier - 선택된 렌더러 등급
 *   reducedMotion - prefers-reduced-motion: reduce 선호 여부
 *   reasons - 각 판정 근거 문자열 배열(데이터 리드아웃 표기용)
 *
 * Example usage:
 *   const config = detectRenderTier();
 *   // → { tier: 'webgl', reducedMotion: false, reasons: ['webgl2-ok', ...] }
 */
function detectRenderTier() {
  // SSR 안전: 브라우저 API 부재 시 가장 안전한 폴백 tier로 즉시 반환
  if (isNonBrowserEnv()) {
    return { tier: 'svg', reducedMotion: false, reasons: ['ssr'] };
  }

  const reasons = [];
  const reducedMotion = matchReducedMotion();
  reasons.push(
    reducedMotion ? 'reduced-motion:reduce' : 'reduced-motion:no-preference'
  );

  // WebGL 능력 검사 (검사 후 컨텍스트 해제)
  const webgl = probeWebGL();

  if (!webgl.webgl1) {
    reasons.push('webgl:unavailable');
    reasons.push('tier:canvas(fallback-from-webgl)');
    return { tier: 'canvas', reducedMotion, reasons };
  }

  reasons.push(webgl.webgl2 ? 'webgl2:ok' : 'webgl1:ok');
  if (webgl.released) {
    reasons.push('webgl:context-released');
  }

  // 저성능 휴리스틱 (보수적): 하나라도 걸리면 canvas로 강등
  let lowPerf = false;

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0) {
    if (cores <= LOW_CORE_THRESHOLD) {
      lowPerf = true;
      reasons.push('cores:' + cores + '(<=' + LOW_CORE_THRESHOLD + ')');
    } else {
      reasons.push('cores:' + cores);
    }
  } else {
    reasons.push('cores:unknown');
  }

  // deviceMemory는 지원 브라우저(Chromium 계열)에서만 노출됨
  const memory = navigator.deviceMemory;
  if (typeof memory === 'number' && memory > 0) {
    if (memory <= LOW_MEMORY_THRESHOLD_GB) {
      lowPerf = true;
      reasons.push('deviceMemory:' + memory + 'GB(<=' + LOW_MEMORY_THRESHOLD_GB + ')');
    } else {
      reasons.push('deviceMemory:' + memory + 'GB');
    }
  } else {
    reasons.push('deviceMemory:unsupported');
  }

  if (lowPerf) {
    reasons.push('tier:canvas(low-perf-heuristic)');
    return { tier: 'canvas', reducedMotion, reasons };
  }

  reasons.push('tier:webgl');
  return { tier: 'webgl', reducedMotion, reasons };
}

/**
 * prefers-reduced-motion 변경을 구독하는 헬퍼.
 * 콜백은 구독 시점에 즉시 1회 호출되고, 이후 변경마다 호출된다.
 *
 * @param {function} callback - (matches: boolean)을 인자로 받는 변경 핸들러 [Required]
 * @returns {function} unsubscribe - 호출 시 구독을 해제하는 함수
 *
 * Example usage:
 *   const stop = subscribeReducedMotion((reduce) => setReduce(reduce));
 *   // ... later
 *   stop();
 */
function subscribeReducedMotion(callback) {
  if (typeof callback !== 'function') {
    return function noop() {};
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // SSR/비지원 환경: 즉시 false 1회 통지 후 no-op unsubscribe
    callback(false);
    return function noop() {};
  }

  let mql;
  try {
    mql = window.matchMedia(REDUCED_MOTION_QUERY);
  } catch {
    callback(false);
    return function noop() {};
  }

  // 구독 시점 현재 상태 즉시 통지
  callback(mql.matches);

  const handler = function handleChange(event) {
    callback(event.matches);
  };

  // 최신 표준(addEventListener)과 구형(addListener)을 모두 지원
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', handler);
    return function unsubscribe() {
      mql.removeEventListener('change', handler);
    };
  }

  if (typeof mql.addListener === 'function') {
    mql.addListener(handler);
    return function unsubscribe() {
      mql.removeListener(handler);
    };
  }

  return function noop() {};
}

export { detectRenderTier, subscribeReducedMotion };
