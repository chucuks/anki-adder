import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts', 
        'src/application/ports.ts', 
        'src/domain/entities.ts',
        'src/server.ts',
        'src/web-app.ts',
        'src/client-app.ts',
        'src/create-app.ts'
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 94.5,
        statements: 95
      }
    },
  },
});
