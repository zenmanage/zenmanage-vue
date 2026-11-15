import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@zenmanage/vue',
        replacement: fileURLToPath(new URL('../../dist/index.js', import.meta.url)),
      },
      {
        find: /^vue$/,
        replacement: fileURLToPath(
          new URL('./node_modules/vue/dist/vue.runtime.esm-bundler.js', import.meta.url)
        ),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
