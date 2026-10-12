import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'safari15' },
  test: { include: ['tests/**/*.test.ts'] },
});
