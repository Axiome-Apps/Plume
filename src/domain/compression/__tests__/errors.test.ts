import { describe, it, expect } from 'vitest';
import { compressionErrorKey } from '../errors';
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

describe('compressionErrorKey', () => {
  it('falls back to the unknown message when the backend reported nothing', () => {
    expect(compressionErrorKey(undefined)).toBe('errors.unknown');
    expect(compressionErrorKey(null)).toBe('errors.unknown');
    expect(compressionErrorKey('')).toBe('errors.unknown');
  });

  it.each([
    ['Permission denied (os error 13)', 'errors.permissionDenied'],
    ['File validation failed: not an image', 'errors.invalidFile'],
    ['Unsupported format: bmp', 'errors.unsupportedFormat'],
    ['this codec is unsupported', 'errors.unsupportedFormat'],
    ['Failed to read /tmp/photo.png', 'errors.readFailed'],
    ['Failed to write /tmp/photo_balanced.webp', 'errors.writeFailed'],
    ['No space left on device', 'errors.noSpace'],
    ['Invalid output path: /etc/passwd', 'errors.invalidPath'],
  ])('maps %j to %s', (backendError, expectedKey) => {
    expect(compressionErrorKey(backendError)).toBe(expectedKey);
  });

  it('never leaks an unrecognised backend string into the UI', () => {
    expect(compressionErrorKey('thread panicked at src/engine.rs:42')).toBe(
      'errors.compressionFailed'
    );
  });

  it('matches on a substring, since the backend wraps its errors in context', () => {
    // commands/compression.rs formats "Compression failed: {e}" around the io::Error.
    expect(compressionErrorKey('Compression failed: Permission denied')).toBe(
      'errors.permissionDenied'
    );
  });

  // A key with no translation renders as the raw key in the UI, which is worse
  // than the generic message it was meant to replace.
  it('only ever returns keys that both locales define', () => {
    const backendErrors = [
      undefined,
      'Permission denied',
      'File validation failed',
      'Unsupported',
      'unsupported',
      'Failed to read',
      'Failed to write',
      'No space left',
      'Invalid output path',
      'anything else',
    ];
    const reachableKeys = [...new Set(backendErrors.map(compressionErrorKey))];

    const locales: Record<string, Record<string, unknown>>[] = [fr, en];

    expect(reachableKeys.length).toBeGreaterThan(1);
    for (const key of reachableKeys) {
      const [namespace, name] = key.split('.');
      for (const locale of locales) {
        expect(locale[namespace]).toHaveProperty(name);
      }
    }
  });
});
