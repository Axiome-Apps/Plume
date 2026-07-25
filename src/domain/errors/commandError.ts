import { translate } from '@/domain/i18n/translate';
import type { TranslationKeyType } from '@/domain/i18n/schema';
import { CommandErrorSchema, type CommandErrorKind } from './schema';

export { CommandErrorSchema, CommandErrorKindSchema } from './schema';
export type { CommandErrorKind, CommandErrorType } from './schema';

/**
 * Typed error thrown at the IPC boundary. A Tauri command rejection carries a
 * serialized `{ kind, message }`; `CommandError.from` parses it back into this
 * typed error so consumers branch on `kind` instead of matching free-form
 * strings.
 */
export class CommandError extends Error {
  readonly kind: CommandErrorKind;

  constructor(kind: CommandErrorKind, message: string) {
    super(message);
    this.name = 'CommandError';
    this.kind = kind;
  }

  static from(raw: unknown): CommandError {
    const parsed = CommandErrorSchema.safeParse(raw);
    if (parsed.success) {
      return new CommandError(parsed.data.kind, parsed.data.message);
    }
    // A rejection that does not match the contract is an unexpected internal fault.
    return new CommandError('internal', typeof raw === 'string' ? raw : 'Unexpected error');
  }
}

const KEY_BY_KIND: Record<CommandErrorKind, TranslationKeyType> = {
  validation: 'errors.validation',
  not_found: 'errors.notFound',
  io: 'errors.io',
  security: 'errors.security',
  unsupported: 'errors.unsupported',
  internal: 'errors.internal',
};

/** i18n key for a command error kind (undefined → generic internal error). */
export function commandErrorKey(kind: CommandErrorKind | undefined): TranslationKeyType {
  return kind ? KEY_BY_KIND[kind] : 'errors.internal';
}

/** Translated, user-facing message for a caught error of unknown provenance. */
export function commandErrorMessage(error: unknown): string {
  const kind = error instanceof CommandError ? error.kind : undefined;
  return translate(commandErrorKey(kind));
}
