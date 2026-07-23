import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src-tauri/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/test/**',
        'src/**/__tests__/**',
      ],
      // A ratchet, not a target: these sit just under what the suite currently
      // reaches, so deleting a test trips the gate. Raise them when coverage
      // grows. The figures stay low overall because components and the store
      // are untested by design — the numbers that matter are per-module.
      // (The previous values were nested under a `global` key, which Vitest
      // reads as a file glob, so nothing was ever enforced.)
      thresholds: {
        branches: 70,
        functions: 60,
        lines: 13,
        statements: 13,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
