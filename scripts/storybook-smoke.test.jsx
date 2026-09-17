/**
 * Storybook 전 스토리 렌더 스모크 하네스
 *
 * 목적: `storybook build` 는 통과하지만 실제로 열면 터지는 런타임 렌더 오류를 브라우저 없이 잡는다.
 * 실행: pnpm exec vitest run --config vitest.smoke.config.js
 * 결과: SMOKE_OUT 환경변수 경로(기본 <repo>/.smoke-report.json)에 JSON 배열.
 *
 * ── 동작 ────────────────────────────────────────────────────────────────
 * 1. import.meta.glob 으로 src 아래 모든 *.stories.* 모듈을 지연 로드한다.
 *    (eager 대신 지연 로드: 모듈 하나의 import 실패가 하네스 전체를 무너뜨리지 않고
 *     status:'error', reason:'module-import' 한 줄로 남게 하려는 것이다.)
 * 2. @storybook/react-vite 의 composeStories 로 스토리를 합성한다.
 *    setup 파일의 setProjectAnnotations 가 .storybook/preview 의 데코레이터·파라미터를 적용한다.
 * 3. 스토리마다 react-dom/client createRoot 로 act() 안에서 렌더하고, 이펙트가 돌 시간을 준 뒤 unmount 한다.
 * 4. 스토리당 타임아웃 10초.
 *
 * ── status 분류 기준 ────────────────────────────────────────────────────
 * ok    렌더와 unmount 가 오류 없이 끝났다.
 * error 스토리·컴포넌트 코드의 실제 결함으로 보인다. (기본값: env 패턴에 걸리지 않은 모든 오류)
 * env   happy-dom 이 브라우저가 아니라서 난 오류다. 아래 ENV_PATTERNS 에 걸린 메시지만 해당한다.
 *       WebGL/getContext, three/react-three-fiber 의 GL 컨텍스트, HTMLMediaElement,
 *       ResizeObserver/IntersectionObserver/matchMedia/rAF/scrollTo 미구현,
 *       Lenis 같은 스크롤 라이브러리, 폰트 로딩, happy-dom 의 "not implemented".
 *       env 로 분류하기 전에 storybook-smoke.setup.js 에서 폴리필로 먼저 줄였다.
 *       env 는 "브라우저에서는 통과할 수도 있다"는 뜻이지 "문제 없음"이 아니다. 표본 확인이 필요하다.
 *
 * ── 대상에서 빼는 것 ────────────────────────────────────────────────────
 * *.mdx 문서, autodocs 로 자동 생성되는 Docs 페이지(모듈 export 가 아니라 대상이 아니다).
 *
 * ── 한계 ────────────────────────────────────────────────────────────────
 * 레이아웃 값이 전부 0 이다(offsetWidth/getBoundingClientRect). 크기 계산이 0 으로 흘러
 * 조용히 잘못 그려지는 버그는 못 잡는다. CSS 도 적용되지 않으므로 시각 회귀는 대상 밖이다.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { composeStories } from '@storybook/react-vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname as pathDirname, resolve } from 'node:path';

/**
 * 브라우저 환경 부족으로 판정하는 메시지 패턴
 *
 * 오류 "메시지"에만 맞춘다. 스택까지 검사하면 파일명 때문에 오분류가 난다.
 * (실제로 heptapod 의 LogogramRendererWebgl 스토리가 스택의 'Webgl' 때문에 env 로 숨었다.
 *  메시지는 'Cannot destructure property count of ring.strands' 라는 진짜 버그였다.)
 * 판정을 좁게 잡아서, 애매하면 env 가 아니라 error 쪽으로 떨어지게 한다.
 */
const ENV_PATTERNS = [
  /Error creating WebGL context/i,
  /WebGL[^.]*(not supported|unavailable|disabled|context could not)/i,
  /getContext[^.]*(is not a function|not implemented|returned null)/i,
  /\bnot implemented\b/i,
  /happy-dom|jsdom/i,
  /(ResizeObserver|IntersectionObserver|MutationObserver) is not (defined|a constructor)/,
  /(matchMedia|requestAnimationFrame|cancelAnimationFrame|requestIdleCallback) is not (a function|defined)/,
  /(scrollTo|scrollBy|scrollIntoView) is not a function/,
  /(createObjectURL|createImageBitmap) is not a function/,
  /HTMLMediaElement|\.(play|load)\(\) is not a function|requestVideoFrameCallback/,
  /document\.fonts|FontFace is not (defined|a constructor)|font (loading|face) .*not/i,
  /navigator\.(mediaDevices|clipboard|permissions|gpu)/,
  /The animation was canceled/i,
  /Failed to (fetch|load) .*(font|image|video|audio)/i,
];

/**
 * env 판정은 message 로만 한다. stack 은 원인 파일 추정에만 쓴다.
 * 즉 "브라우저 API 가 없어서 그 API 이름이 메시지에 찍힌 경우"만 env 다.
 */
const isEnvFailure = (message) => ENV_PATTERNS.some((pattern) => pattern.test(message ?? ''));

/** 스택에서 저장소 src 안의 첫 프레임을 뽑는다(원인 파일 추정용) */
const originFile = (stack) => {
  if (!stack) return null;
  for (const line of stack.split('\n')) {
    const match = line.match(/\(?((?:\/|[A-Za-z]:\\)[^\s)]*?\/src\/[^\s)]+?)(?::\d+:\d+)?\)?$/);
    if (match) return match[1].replace(/\?.*$/, '');
  }
  return null;
};

const topStack = (stack, lines = 5) => (stack ? stack.split('\n').slice(0, lines).join('\n') : null);

const describeError = (error) => {
  if (error instanceof Error) return { message: error.message || String(error), stack: error.stack };
  if (error && typeof error === 'object') {
    return { message: error.message ? String(error.message) : JSON.stringify(error), stack: error.stack };
  }
  return { message: String(error), stack: undefined };
};

/* ------------------------------------------------------------- 스토리 수집 */

const storyModules = import.meta.glob('../src/**/*.stories.{js,jsx,mjs,ts,tsx}');

/** @type {Array<{file:string,title:string,storyName:string,status:string,message:string|null,stack:string|null,originFile:string|null}>} */
const results = [];

/** @type {Array<{file:string, title:string, entries:Array<[string, Function]>}>} */
const collected = [];

for (const [file, load] of Object.entries(storyModules).sort(([a], [b]) => a.localeCompare(b))) {
  try {
    const mod = await load();
    const title = mod.default?.title ?? file;
    const composed = composeStories(mod);
    const entries = Object.entries(composed).filter(([, story]) => typeof story === 'function');
    collected.push({ file, title, entries });
    if (entries.length === 0) {
      results.push({
        file, title, storyName: '(module)', status: 'error',
        message: '합성된 스토리가 0개다. default export 나 named story export 를 확인하라.',
        stack: null, originFile: null,
      });
    }
  } catch (error) {
    const { message, stack } = describeError(error);
    results.push({
      file, title: file, storyName: '(module)',
      status: isEnvFailure(message) ? 'env' : 'error',
      message, stack: topStack(stack), originFile: originFile(stack),
    });
  }
}

/* --------------------------------------------------------------- 렌더 실행 */

/** 한 스토리를 렌더하고 결과를 분류한다 */
const renderStory = async (Story) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  /** 렌더 중/직후 비동기 경로에서 터진 오류를 모은다 */
  const asyncErrors = [];
  const onWindowError = (event) => { asyncErrors.push(event.error ?? event.message); };
  const onRejection = (event) => { asyncErrors.push(event.reason); };
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onRejection);

  const root = createRoot(container, {
    onUncaughtError: (error) => { asyncErrors.push(error); },
    onCaughtError: (error) => { asyncErrors.push(error); },
    onRecoverableError: () => {},
  });

  try {
    await act(async () => {
      root.render(<Story />);
    });
    /* 이펙트, 타이머, rAF 가 한 바퀴 돌 시간을 준다 */
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    if (asyncErrors.length > 0) throw asyncErrors[0];
  } finally {
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onRejection);
    try {
      await act(async () => { root.unmount(); });
    } catch {
      /* unmount 실패는 렌더 결과 판정을 덮지 않는다 */
    }
    container.remove();
  }
};

if (collected.length === 0) {
  describe('storybook smoke', () => {
    it('스토리 파일을 찾지 못했다', () => {
      expect.fail('import.meta.glob 이 ../src/**/*.stories.* 에서 아무것도 찾지 못했다.');
    });
  });
}

for (const { file, title, entries } of collected) {
  describe(title, () => {
    for (const [storyName, Story] of entries) {
      it(storyName, async () => {
        try {
          await renderStory(Story);
          results.push({ file, title, storyName, status: 'ok', message: null, stack: null, originFile: null });
        } catch (error) {
          const { message, stack } = describeError(error);
          const status = isEnvFailure(message) ? 'env' : 'error';
          results.push({ file, title, storyName, status, message, stack: topStack(stack), originFile: originFile(stack) });
          if (status === 'error') {
            throw new Error(`[${title} / ${storyName}] ${message}`, { cause: error });
          }
        }
      }, 10000);
    }
  });
}

afterAll(() => {
  const out = process.env.SMOKE_OUT
    ? resolve(process.env.SMOKE_OUT)
    : resolve(process.cwd(), '.smoke-report.json');
  mkdirSync(pathDirname(out), { recursive: true });

  const counts = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  const payload = {
    repo: process.env.SMOKE_REPO ?? process.cwd(),
    generatedAt: new Date().toISOString(),
    total: results.length,
    ok: counts.ok ?? 0,
    error: counts.error ?? 0,
    env: counts.env ?? 0,
    results: results.sort((a, b) => (a.title + a.storyName).localeCompare(b.title + b.storyName)),
  };
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[smoke] total=${payload.total} ok=${payload.ok} error=${payload.error} env=${payload.env} -> ${out}`);
});
