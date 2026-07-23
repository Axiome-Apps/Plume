import { z } from 'zod';

// Schema for Tauri v2 drag & drop events
export const DragDropPayloadSchema = z.object({
  type: z.enum(['enter', 'over', 'drop', 'leave']),
  paths: z.array(z.string()).optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

export const DragDropEventSchema = z.object({
  payload: DragDropPayloadSchema,
});

// Inferred types - convention: SchemaName + Type
export type DragDropPayloadType = z.infer<typeof DragDropPayloadSchema>;
export type DragDropEventType = z.infer<typeof DragDropEventSchema>;
