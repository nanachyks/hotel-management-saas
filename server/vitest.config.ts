import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    testTimeout: 10000,
    exclude: ['**/dist/**', '**/node_modules/**'],
    // Test files share one Postgres database (server/docker-compose.test.yml),
    // unlike the old per-file in-memory sql.js instance — running files in
    // parallel causes cross-file row collisions/deletions against shared tables.
    fileParallelism: false,
  },
});
