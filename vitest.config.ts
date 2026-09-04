import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Mirror the '@/*' path alias defined in tsconfig.json so that
      // imports like '@/lib/config' resolve correctly in the test environment.
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    // Load the project's .env file before any test module is imported,
    // so that src/lib/config.ts can validate env vars without throwing.
    setupFiles: ['./src/lib/agents/test.setup.ts'],
  },
});
