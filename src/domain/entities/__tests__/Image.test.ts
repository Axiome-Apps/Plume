import { Image } from '../Image';
import { ImageStatus } from '../../schemas/imageSchemas';

describe('Image Entity', () => {
  describe('constructor', () => {
    it('should create a pending image with correct properties', () => {
      const imageData = {
        id: 'test-id',
        name: 'test.jpg',
        originalSize: 1000,
        status: ImageStatus.PENDING as const,
        preview: 'data:image/jpeg;base64,test',
        path: '/path/to/test.jpg',
      };

      const image = new Image(imageData);

      expect(image.id).toBe('test-id');
      expect(image.name).toBe('test.jpg');
      expect(image.originalSize).toBe(1000);
      expect(image.status).toBe(ImageStatus.PENDING);
      expect(image.preview).toBe('data:image/jpeg;base64,test');
      expect(image.path).toBe('/path/to/test.jpg');
    });
  });

  describe('state transitions', () => {
    let pendingImage: Image;

    beforeEach(() => {
      pendingImage = new Image({
        id: 'test-id',
        name: 'test.jpg',
        originalSize: 1000,
        status: ImageStatus.PENDING,
        preview: 'data:image/jpeg;base64,test',
        path: '/path/to/test.jpg',
      });
    });

    describe('toProcessing', () => {
      it('should transition from pending to processing', () => {
        const processingImage = pendingImage.toProcessing(25);

        expect(processingImage.status).toBe(ImageStatus.PROCESSING);
        expect(processingImage.data.status).toBe(ImageStatus.PROCESSING);
        expect(processingImage.data.progress).toBe(25);
        expect(processingImage.id).toBe(pendingImage.id);
      });

      it('should throw error when transitioning from non-pending status', () => {
        const processingImage = pendingImage.toProcessing();
        
        expect(() => processingImage.toProcessing()).toThrow(
          'Cannot transition from processing to processing'
        );
      });
    });

    describe('toCompleted', () => {
      it('should transition from processing to completed', () => {
        const processingImage = pendingImage.toProcessing(50);
        const completedImage = processingImage.toCompleted({
          compressedSize: 600,
          compressionRatio: 0.6,
          outputPath: '/path/to/compressed.jpg',
          format: 'WebP',
          outputPreview: 'data:image/webp;base64,compressed',
        });

        expect(completedImage.status).toBe(ImageStatus.COMPLETED);
        expect(completedImage.data.status).toBe(ImageStatus.COMPLETED);
        expect(completedImage.data.compressedSize).toBe(600);
        expect(completedImage.data.compressionRatio).toBe(0.6);
        expect(completedImage.data.outputPath).toBe('/path/to/compressed.jpg');
        expect(completedImage.data.format).toBe('WebP');
      });

      it('should calculate savings percentage correctly', () => {
        const processingImage = pendingImage.toProcessing();
        const completedImage = processingImage.toCompleted({
          compressedSize: 400,
          compressionRatio: 0.4,
          outputPath: '/path/to/compressed.jpg',
          format: 'WebP',
          outputPreview: 'data:image/webp;base64,compressed',
        });

        expect(completedImage.savingsPercentage).toBe(60); // (1000 - 400) / 1000 * 100
      });

      it('should throw error when transitioning from non-processing status', () => {
        expect(() => pendingImage.toCompleted({
          compressedSize: 600,
          compressionRatio: 0.6,
          outputPath: '/path/to/compressed.jpg',
          format: 'WebP',
          outputPreview: 'data:image/webp;base64,compressed',
        })).toThrow('Cannot transition from pending to completed');
      });
    });

    describe('toError', () => {
      it('should transition to error state from any status', () => {
        const errorMessage = 'Compression failed';
        const errorImage = pendingImage.toError(errorMessage);

        expect(errorImage.status).toBe(ImageStatus.ERROR);
        expect(errorImage.data.status).toBe(ImageStatus.ERROR);
        expect(errorImage.data.errorMessage).toBe(errorMessage);
      });

      it('should transition to error from processing state', () => {
        const processingImage = pendingImage.toProcessing(75);
        const errorImage = processingImage.toError('Processing failed');

        expect(errorImage.status).toBe(ImageStatus.ERROR);
        expect(errorImage.data.errorMessage).toBe('Processing failed');
      });
    });
  });

  describe('getters', () => {
    it('should return correct savings percentage for completed image', () => {
      const completedImageData = {
        id: 'test-id',
        name: 'test.jpg',
        originalSize: 1000,
        status: ImageStatus.COMPLETED as const,
        preview: 'data:image/jpeg;base64,test',
        path: '/path/to/test.jpg',
        compressedSize: 300,
        compressionRatio: 0.3,
        outputPath: '/path/to/compressed.jpg',
        format: 'WebP' as const,
        outputPreview: 'data:image/webp;base64,compressed',
      };

      const image = new Image(completedImageData);

      expect(image.savingsPercentage).toBe(70);
    });

    it('should return 0 savings percentage for non-completed image', () => {
      const pendingImageData = {
        id: 'test-id',
        name: 'test.jpg',
        originalSize: 1000,
        status: ImageStatus.PENDING as const,
        preview: 'data:image/jpeg;base64,test',
        path: '/path/to/test.jpg',
      };

      const image = new Image(pendingImageData);

      expect(image.savingsPercentage).toBe(0);
    });
  });

  describe('immutability', () => {
    it('should not mutate original image when transitioning state', () => {
      const originalImage = new Image({
        id: 'test-id',
        name: 'test.jpg',
        originalSize: 1000,
        status: ImageStatus.PENDING,
        preview: 'data:image/jpeg;base64,test',
        path: '/path/to/test.jpg',
      });

      const processingImage = originalImage.toProcessing(50);

      expect(originalImage.status).toBe(ImageStatus.PENDING);
      expect(processingImage.status).toBe(ImageStatus.PROCESSING);
      expect(originalImage).not.toBe(processingImage);
    });
  });
});