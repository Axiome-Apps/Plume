import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Tauri API
const mockTauriAPI = {
  invoke: vi.fn(),
  getCurrentWebview: vi.fn(() => ({
    onDragDropEvent: vi.fn(),
  })),
};

// Global mocks for Tauri
Object.defineProperty(window, '__TAURI__', {
  value: mockTauriAPI,
  writable: true,
});

// Extend global object type
declare global {
  var mockTauriInvoke: (command: string, response: unknown) => void;
  var mockTauriInvokeError: (command: string, error: Error) => void;
}

// Mock functions that are commonly used in tests
globalThis.mockTauriInvoke = (command: string, response: unknown) => {
  mockTauriAPI.invoke.mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unhandled Tauri command: ${cmd}`));
  });
};

globalThis.mockTauriInvokeError = (command: string, error: Error) => {
  mockTauriAPI.invoke.mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error(`Unhandled Tauri command: ${cmd}`));
  });
};

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Cleanup after tests
afterEach(() => {
  vi.restoreAllMocks();
});
