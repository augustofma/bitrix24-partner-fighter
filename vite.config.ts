import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build can be hosted from any sub-folder.
  base: './',
  build: {
    target: 'es2022',
    // Phaser alone is ~1.2 MB minified; this is expected for a game bundle.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
