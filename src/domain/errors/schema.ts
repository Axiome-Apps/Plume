import { z } from 'zod';

/** Stable error kinds emitted by Rust commands (mirrors CommandError in src-tauri). */
export const CommandErrorKindSchema = z.enum([
  'validation',
  'not_found',
  'io',
  'security',
  'unsupported',
  'internal',
]);

// IPC contract — mirrors the `{ kind, message }` serialization of CommandError.
export const CommandErrorSchema = z.object({
  kind: CommandErrorKindSchema,
  message: z.string(),
});

export type CommandErrorKind = z.infer<typeof CommandErrorKindSchema>;
export type CommandErrorType = z.infer<typeof CommandErrorSchema>;
