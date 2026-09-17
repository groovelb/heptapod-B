/**
 * Storybook 렌더 스모크 전용 Vitest 설정
 *
 * 저장소 기본 설정(vite.config.js / vitest.config.js)에는 @storybook/addon-vitest 의
 * 브라우저 모드(playwright chromium)가 켜져 있다. 이 하네스는 브라우저를 쓰지 않으므로
 * 설정을 완전히 분리해서 그 플러그인이 끼어들지 않게 한다.
 *
 * 실행: pnpm exec vitest run --config vitest.smoke.config.js
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    /**
     * webpack/jsconfig 로만 선언된 별칭(heptapod 의 `@/*` -> `src/*`)을 Vite 에도 알린다.
     * 문자열 '@' 로 두면 @mui/material 까지 걸리므로 `^@/` 정규식으로 한정한다.
     */
    alias: [
      { find: /^@\//, replacement: `${path.join(dirname, 'src')}/` },
    ],
  },
  /** next/font 등 Next 전용 import 가 있는 저장소를 위한 최소 셰이딩 자리 (필요 시 추가) */
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  test: {
    name: 'storybook-smoke',
    environment: 'happy-dom',
    globals: false,
    include: ['scripts/storybook-smoke.test.jsx'],
    setupFiles: ['scripts/storybook-smoke.setup.js'],
    /** 스토리별 타임아웃은 테스트 안에서 10초로 따로 건다 */
    testTimeout: 10000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    /** 스토리 사이 전역 상태가 섞이지 않게 단일 프로세스에서 순차 실행한다 */
    pool: 'forks',
    fileParallelism: false,
    /** 실패해도 전 스토리를 끝까지 돌려야 목록이 나온다 */
    bail: 0,
    retry: 0,
    reporters: [['default', { summary: false }]],
    css: false,
    /** 스토리 코드가 뿜는 console 로그로 출력이 묻히지 않게 한다 */
    silent: 'passed-only',
  },
});
