import { DragDropEventSchema, type DragDropEventType } from './schema';

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const;

/**
 * Drag & drop event as pure data + helpers (declaration merging). The raw event
 * is parsed at the IPC boundary through `DragDropEvent.fromRaw`.
 */
export type DragDropEvent = DragDropEventType;

export const DragDropEvent = {
  fromRaw: (raw: unknown): DragDropEvent => DragDropEventSchema.parse(raw),

  paths: (event: DragDropEvent): string[] | undefined => event.payload.paths,

  isDrop: (event: DragDropEvent): boolean => event.payload.type === 'drop',

  validImagePaths: (
    event: DragDropEvent,
    supported: readonly string[] = SUPPORTED_EXTENSIONS
  ): string[] =>
    (event.payload.paths ?? []).filter(path =>
      supported.some(ext => path.toLowerCase().endsWith(ext.toLowerCase()))
    ),

  /** Valid image paths on a `drop` event, or `null` when the event is not a drop. */
  processDrop: (event: DragDropEvent): string[] | null =>
    DragDropEvent.isDrop(event) ? DragDropEvent.validImagePaths(event) : null,
} as const;
