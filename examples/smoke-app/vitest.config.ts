import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Tests that need a browser opt into jsdom with `// @vitest-environment jsdom`. The server
    // rendering test runs in Node, where @zenmanage/sdk expects a server key.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
