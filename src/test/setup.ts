import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterEach } from 'vitest';

/**
 * Global test setup.
 *
 * There is deliberately no Tauri mock here. The app never reads `window.__TAURI__`:
 * it imports `invoke` from `@tauri-apps/api/core`, so a global stub intercepts
 * nothing. Mock the module in the test that needs it:
 *
 *   vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
 *   vi.mocked(invoke).mockResolvedValue(payload);
 *
 * See `src/lib/__tests__/tauri.test.ts` for the pattern in use.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
