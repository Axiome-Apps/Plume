/* eslint-env node */
import '@testing-library/jest-dom';

// Mock Tauri API
const mockTauriAPI = {
  invoke: jest.fn(),
  getCurrentWebview: jest.fn(() => ({
    onDragDropEvent: jest.fn(),
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
  (mockTauriAPI.invoke as jest.Mock).mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.resolve(response);
    }
    return Promise.reject(new Error(`Unhandled Tauri command: ${cmd}`));
  });
};

globalThis.mockTauriInvokeError = (command: string, error: Error) => {
  (mockTauriAPI.invoke as jest.Mock).mockImplementation((cmd: string) => {
    if (cmd === command) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error(`Unhandled Tauri command: ${cmd}`));
  });
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Cleanup after tests
afterEach(() => {
  jest.restoreAllMocks();
});