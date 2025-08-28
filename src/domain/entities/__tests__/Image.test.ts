import { Image } from '../Image';
import { ImageStatus } from '../../schemas/imageSchemas';

describe('Image', () => {
  const baseImageData = {
    name: 'test.jpg',
    originalSize: 1024000,
    format: 'JPEG' as 'JPEG',
    preview: 'data:image/jpeg;base64,test',
    path: '/test/path.jpg'
  };

  const estimatedCompression = {
    percent: 50,
    ratio: 0.5
  };

  describe('createPending', () => {
    it('creates pending image', () => {
      const image = Image.createPending(baseImageData, estimatedCompression);
      
      expect(image.name).toBe('test.jpg');
      expect(image.originalSize).toBe(1024000);
      expect(image.format).toBe('JPEG');
      expect(image.status).toBe(ImageStatus.PENDING);
      expect(image.id).toBeTruthy();
    });
  });

  describe('status methods', () => {
    it('correctly identifies pending status', () => {
      const image = Image.createPending(baseImageData, estimatedCompression);
      
      expect(image.isPending()).toBe(true);
      expect(image.isProcessing()).toBe(false);
      expect(image.isCompleted()).toBe(false);
    });
  });

  describe('toProcessing', () => {
    it('creates processing image', () => {
      const image = Image.createPending(baseImageData, estimatedCompression);
      const processing = image.toProcessing(25);
      
      expect(processing.status).toBe(ImageStatus.PROCESSING);
      expect(processing).not.toBe(image); // Should be immutable
    });
  });

  describe('formatting methods', () => {
    it('formats original size correctly', () => {
      const image = Image.createPending(baseImageData, estimatedCompression);
      expect(image.getFormattedOriginalSize()).toMatch(/MB|KB/); // Should show MB or KB
    });
  });

  describe('status checks', () => {
    it('correctly identifies status transitions', () => {
      const image = Image.createPending(baseImageData, estimatedCompression);
      expect(image.isPending()).toBe(true);
      
      const processing = image.toProcessing(50);
      expect(processing.isProcessing()).toBe(true);
      expect(processing.isPending()).toBe(false);
    });
  });
});