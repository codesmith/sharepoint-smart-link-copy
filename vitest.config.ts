import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '.steering/**',
        '**/*.config.{ts,js}',
        '**/types/**',
        // Chrome拡張機能のグルーコード。chrome.*/DOM APIへの依存が大きく、
        // docs/architecture.mdのテスト戦略上、ユニットテストの対象外(手動確認・統合テストで担保)としている
        'src/background/**',
        'src/content/ClipboardWriter.ts',
        'src/content/index.ts',
        'src/content/loader.ts',
        'src/shared/types.ts',
        'src/shared/messages.ts',
        'scripts/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
