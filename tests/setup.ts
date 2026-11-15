import { afterEach, beforeEach, vi } from 'vitest';
import { clearServerClients } from '../src/server';

// A test that forgets installFakeApi() would otherwise reach the real API.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.reject(new Error('Unexpected network request: call installFakeApi() first'))
    )
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  clearServerClients();

  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
});
