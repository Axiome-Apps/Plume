import { describe, it, expect } from 'vitest';
import { CommandError, commandErrorKey } from '../commandError';

describe('commandErrorKey', () => {
  it('maps each kind to its i18n key', () => {
    expect(commandErrorKey('validation')).toBe('errors.validation');
    expect(commandErrorKey('not_found')).toBe('errors.notFound');
    expect(commandErrorKey('io')).toBe('errors.io');
    expect(commandErrorKey('security')).toBe('errors.security');
    expect(commandErrorKey('unsupported')).toBe('errors.unsupported');
    expect(commandErrorKey('internal')).toBe('errors.internal');
  });

  it('falls back to the internal key for an undefined kind', () => {
    expect(commandErrorKey(undefined)).toBe('errors.internal');
  });
});

describe('CommandError.from', () => {
  it('parses a well-formed rejection into a typed error', () => {
    const error = CommandError.from({ kind: 'security', message: 'blocked' });

    expect(error).toBeInstanceOf(CommandError);
    expect(error.kind).toBe('security');
    expect(error.message).toBe('blocked');
  });

  it('treats an off-contract shape as an internal fault', () => {
    const error = CommandError.from({ nope: true });

    expect(error.kind).toBe('internal');
  });

  it('carries a raw string rejection as the internal message', () => {
    const error = CommandError.from('boom');

    expect(error.kind).toBe('internal');
    expect(error.message).toBe('boom');
  });
});
