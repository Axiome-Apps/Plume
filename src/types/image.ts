// Re-export types from domain schemas for backward compatibility
// This file will be gradually phased out as we migrate to the new architecture

export {
  type BaseImage as BaseImageData,
  type PendingImage,
  type ProcessingImage, 
  type CompletedImage,
  type ImageData,
  type ImageStatusType as ImageStatus,
  ImageStatus as ImageStatusEnum
} from "../domain/schemas/imageSchemas";