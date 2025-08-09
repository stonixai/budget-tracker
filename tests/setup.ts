import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { testDb, cleanDatabase } from './utils/test-db';

// Extend expect with jest-dom matchers
// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock server for API calls
export const server = setupServer();

beforeAll(() => {
  server.listen();
  // Initialize test database
  testDb.exec('PRAGMA foreign_keys = ON');
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  server.resetHandlers();
  // Clean database before each test
  cleanDatabase();
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Global test utilities
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.confirm for delete operations
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(() => true),
});

// Mock Intl.NumberFormat for consistent currency formatting
Object.defineProperty(Intl, 'NumberFormat', {
  writable: true,
  value: vi.fn(() => ({
    format: vi.fn((value: number) => `$${(value / 100).toFixed(2)}`),
  })),
});