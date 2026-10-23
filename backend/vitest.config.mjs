import 'dotenv/config';
import { defineConfig } from 'vitest/config';

// Integration tests use their own database (finance_tracker_test), created and reset automatically.
// MySQL credentials are read from .env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
      DB_HOST: process.env.DB_HOST || '127.0.0.1',
      DB_PORT: process.env.DB_PORT || '3306',
      DB_USER: process.env.DB_USER || 'root',
      DB_PASSWORD: process.env.DB_PASSWORD || '',
      DB_NAME: 'finance_tracker_test',
      CORS_ORIGIN: 'http://localhost:5173',
      COOKIE_SAMESITE: 'strict',
      LOGIN_RATE_LIMIT: '1000',
      REGISTER_RATE_LIMIT: '1000',
    },
  },
});
