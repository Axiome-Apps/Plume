import { DragDropEventSchema, DragDropEventType, DragDropPayloadType } from './schema';

/**
 * Entité DragDropEvent - Encapsule la logique métier des événements drag & drop
 */
export class DragDropEventEntity {
  constructor(private _data: DragDropEventType) {}

  // Factory method avec validation
  static fromRawEvent(rawEvent: unknown): DragDropEventEntity {
    const validatedEvent = DragDropEventSchema.parse(rawEvent);
    return new DragDropEventEntity(validatedEvent);
  }

  // Getters
  get payload(): DragDropPayloadType {
    return this._data.payload;
  }

  get type(): DragDropPayloadType['type'] {
    return this._data.payload.type;
  }

  get paths(): string[] | undefined {
    return this._data.payload.paths;
  }

  get position(): { x: number; y: number } | undefined {
    return this._data.payload.position;
  }

  // Type guards
  isDrop(): boolean {
    return this.type === 'drop';
  }

  isEnter(): boolean {
    return this.type === 'enter';
  }

  isOver(): boolean {
    return this.type === 'over';
  }

  isLeave(): boolean {
    return this.type === 'leave';
  }

  // Méthodes utilitaires
  hasFiles(): boolean {
    return this.paths !== undefined && this.paths.length > 0;
  }

  getValidImagePaths(supportedExtensions: string[] = ['.jpg', '.jpeg', '.png', '.webp']): string[] {
    if (!this.hasFiles()) return [];

    return this.paths!.filter(path =>
      supportedExtensions.some(ext => path.toLowerCase().endsWith(ext.toLowerCase()))
    );
  }

  // Méthode principale pour traiter les drops
  processDropEvent(): string[] | null {
    if (!this.isDrop()) return null;
    if (!this.hasFiles()) return [];

    return this.getValidImagePaths();
  }

  // Sérialisation
  toJSON(): DragDropEventType {
    return { ...this._data };
  }
}
