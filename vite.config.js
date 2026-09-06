/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import ko from './src/i18n/locales/ko.js';

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // configFile:false SSR tests use .vite; keep the live app's optimized deps separate.
  cacheDir: 'node_modules/.vite-app',
  plugins: [react(), {
    name: 'localized-html-copy',
    transformIndexHtml(html) {
      const keys = { APP_TITLE: 'app.title', APP_DESCRIPTION: 'app.description', APP_OG_DESCRIPTION: 'app.ogDescription' };
      const escape = (value) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
      return html.replace(/%(APP_TITLE|APP_DESCRIPTION|APP_OG_DESCRIPTION)%/g, (_, key) => escape(ko[keys[key]]));
    },
  }],
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.js']
      }
    }]
  }
});
