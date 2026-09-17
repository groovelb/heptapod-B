

/** @type { import('@storybook/nextjs').StorybookConfig } */
const config = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding"
  ],
  "framework": "@storybook/nextjs",
  /** 배포 빌드(SB_STATIC=0)에서는 public/ 을 복사하지 않는다. 사이트 루트가 같은 경로를 제공한다 */
  "staticDirs": process.env.SB_STATIC === '0' ? [] : ['../public'],
  /** `import doc from "...md?raw"` 를 webpack 에서 문자열로 읽는다 (Vite 의 ?raw 와 같은 계약) */
  webpackFinal: async (config) => {
    config.module.rules.push({ resourceQuery: /raw/, type: 'asset/source' });
    return config;
  }
};
export default config;
