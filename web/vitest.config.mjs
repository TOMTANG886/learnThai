import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    environmentMatchGlobs: [
      // Component tests need jsdom (browser-like) environment
      ['test/components/**', 'jsdom'],
    ],
  },
});
