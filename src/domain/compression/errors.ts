import type { TranslationKeyType } from '@/domain/i18n';

/**
 * Map a backend compression error to the key of the message shown to the user.
 *
 * The backend reports failures as free-form English strings (`commands/compression.rs`
 * formats them from the underlying io::Error), so matching on substrings is the
 * only contract available. Anything unrecognised falls back to the generic
 * failure message rather than leaking a raw Rust error into the UI.
 */
export function compressionErrorKey(error: string | null | undefined): TranslationKeyType {
  if (!error) return 'errors.unknown';
  if (error.includes('Permission denied')) return 'errors.permissionDenied';
  if (error.includes('File validation failed')) return 'errors.invalidFile';
  if (error.includes('Unsupported') || error.includes('unsupported'))
    return 'errors.unsupportedFormat';
  if (error.includes('Failed to read')) return 'errors.readFailed';
  if (error.includes('Failed to write')) return 'errors.writeFailed';
  if (error.includes('No space left')) return 'errors.noSpace';
  if (error.includes('Invalid output path')) return 'errors.invalidPath';
  return 'errors.compressionFailed';
}
