import { DragDropEventSchema, type DragDropEventType } from './schema';

/**
 * Drag & drop event as pure data + helpers (declaration merging). The raw event
 * is parsed at the IPC boundary through `DragDropEvent.fromRaw`.
 */
export type DragDropEvent = DragDropEventType;

export const DragDropEvent = {
  fromRaw: (raw: unknown): DragDropEvent => DragDropEventSchema.parse(raw),

  paths: (event: DragDropEvent): string[] | undefined => event.payload.paths,

  isDrop: (event: DragDropEvent): boolean => event.payload.type === 'drop',

  /**
   * Raw paths on a `drop` event (files and/or folders), or `null` when the event
   * is not a drop. Filtering and folder expansion happen on the backend scanner
   * (`scan_paths_for_images`) — the frontend does not inspect extensions.
   */
  dropPaths: (event: DragDropEvent): string[] | null =>
    DragDropEvent.isDrop(event) ? (event.payload.paths ?? []) : null,
} as const;
