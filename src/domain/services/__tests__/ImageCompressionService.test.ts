import { ImageCompressionService } from '../ImageCompressionService';
import { CompressionSettings } from '../../entities/CompressionSettings';

// Mock the Tauri commands
const mockTauriCommands = {
  compressImage: jest.fn(),
  compressBatch: jest.fn(),
  generatePreview: jest.fn(),
};

describe('ImageCompressionService', () => {
  let service: ImageCompressionService;

  beforeEach(() => {
    service = new ImageCompressionService(mockTauriCommands);
    jest.clearAllMocks();
  });

  describe('compressImage', () => {
    it('should compress image successfully', async () => {
      const mockResponse = {
        success: true,
        result: {
          compressed_data: new Uint8Array([1, 2, 3]),
          original_size: 1000,
          compressed_size: 600,
          savings_percent: 40.0,
        },
        output_path: '/path/to/compressed.webp',
      };

      mockTauriCommands.compressImage.mockResolvedValue(mockResponse);

      const settings = new CompressionSettings({
        quality: 80,
        format: 'WebP',
      });

      const result = await service.compressImage('/path/to/image.jpg', settings);

      expect(result.success).toBe(true);
      expect(result.originalSize).toBe(1000);
      expect(result.compressedSize).toBe(600);
      expect(result.savingsPercent).toBe(40.0);
      expect(result.outputPath).toBe('/path/to/compressed.webp');

      expect(mockTauriCommands.compressImage).toHaveBeenCalledWith({
        file_path: '/path/to/image.jpg',
        quality: 80,
        format: 'webp',
      });
    });

    it('should handle compression failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid image format',
        result: null,
        output_path: null,
      };

      mockTauriCommands.compressImage.mockResolvedValue(mockResponse);

      const settings = new CompressionSettings();

      await expect(
        service.compressImage('/path/to/invalid.txt', settings)
      ).rejects.toThrow('Invalid image format');
    });

    it('should handle Tauri command rejection', async () => {
      mockTauriCommands.compressImage.mockRejectedValue(
        new Error('Tauri command failed')
      );

      const settings = new CompressionSettings();

      await expect(
        service.compressImage('/path/to/image.jpg', settings)
      ).rejects.toThrow('Tauri command failed');
    });

    it('should convert settings to Tauri format correctly', async () => {
      const mockResponse = {
        success: true,
        result: {
          compressed_data: new Uint8Array([]),
          original_size: 1000,
          compressed_size: 800,
          savings_percent: 20.0,
        },
        output_path: '/path/to/compressed.png',
      };

      mockTauriCommands.compressImage.mockResolvedValue(mockResponse);

      const settings = new CompressionSettings({
        quality: 95,
        format: 'PNG',
        lossless: true,
      });

      await service.compressImage('/path/to/image.jpg', settings);

      expect(mockTauriCommands.compressImage).toHaveBeenCalledWith({
        file_path: '/path/to/image.jpg',
        quality: 95,
        format: 'png',
      });
    });
  });

  describe('compressBatch', () => {
    it('should compress multiple images successfully', async () => {
      const mockBatchResponse = [
        {
          success: true,
          result: {
            compressed_data: new Uint8Array([1, 2, 3]),
            original_size: 1000,
            compressed_size: 600,
            savings_percent: 40.0,
          },
          output_path: '/path/to/compressed1.webp',
        },
        {
          success: true,
          result: {
            compressed_data: new Uint8Array([4, 5, 6]),
            original_size: 2000,
            compressed_size: 1200,
            savings_percent: 40.0,
          },
          output_path: '/path/to/compressed2.webp',
        },
      ];

      mockTauriCommands.compressBatch.mockResolvedValue(mockBatchResponse);

      const filePaths = ['/path/to/image1.jpg', '/path/to/image2.jpg'];
      const settings = new CompressionSettings({ quality: 75 });

      const results = await service.compressBatch(filePaths, settings);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      expect(mockTauriCommands.compressBatch).toHaveBeenCalledWith(
        filePaths,
        75,
        'auto'
      );
    });

    it('should handle partial failures in batch compression', async () => {
      const mockBatchResponse = [
        {
          success: true,
          result: {
            compressed_data: new Uint8Array([1, 2, 3]),
            original_size: 1000,
            compressed_size: 600,
            savings_percent: 40.0,
          },
          output_path: '/path/to/compressed1.webp',
        },
        {
          success: false,
          error: 'Corrupted image',
          result: null,
          output_path: null,
        },
      ];

      mockTauriCommands.compressBatch.mockResolvedValue(mockBatchResponse);

      const filePaths = ['/path/to/image1.jpg', '/path/to/corrupted.jpg'];
      const settings = new CompressionSettings();

      const results = await service.compressBatch(filePaths, settings);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Corrupted image');
    });

    it('should handle empty file list', async () => {
      mockTauriCommands.compressBatch.mockResolvedValue([]);

      const results = await service.compressBatch([], new CompressionSettings());

      expect(results).toEqual([]);
      expect(mockTauriCommands.compressBatch).toHaveBeenCalledWith([], 80, 'auto');
    });
  });

  describe('generatePreview', () => {
    it('should generate preview successfully', async () => {
      const mockPreview = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...';
      mockTauriCommands.generatePreview.mockResolvedValue(mockPreview);

      const preview = await service.generatePreview('/path/to/image.jpg');

      expect(preview).toBe(mockPreview);
      expect(mockTauriCommands.generatePreview).toHaveBeenCalledWith('/path/to/image.jpg');
    });

    it('should handle preview generation failure', async () => {
      mockTauriCommands.generatePreview.mockRejectedValue(
        new Error('Failed to read file')
      );

      await expect(
        service.generatePreview('/path/to/nonexistent.jpg')
      ).rejects.toThrow('Failed to read file');
    });

    it('should validate preview format', async () => {
      const validPreview = 'data:image/png;base64,iVBORw0KGgoAAAANSUhE...';
      mockTauriCommands.generatePreview.mockResolvedValue(validPreview);

      const preview = await service.generatePreview('/path/to/image.png');

      expect(preview).toMatch(/^data:image\/(jpeg|png|webp);base64,/);
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      mockTauriCommands.compressImage.mockResolvedValue({
        success: false,
        error: 'Unsupported image format: .bmp',
        result: null,
        output_path: null,
      });

      const settings = new CompressionSettings();

      await expect(
        service.compressImage('/path/to/image.bmp', settings)
      ).rejects.toThrow('Unsupported image format: .bmp');
    });

    it('should handle network/system errors', async () => {
      mockTauriCommands.compressImage.mockRejectedValue(
        new Error('System error: insufficient memory')
      );

      const settings = new CompressionSettings();

      await expect(
        service.compressImage('/path/to/huge-image.jpg', settings)
      ).rejects.toThrow('System error: insufficient memory');
    });
  });

  describe('integration', () => {
    it('should work with different compression settings', async () => {
      const mockResponse = {
        success: true,
        result: {
          compressed_data: new Uint8Array([1, 2, 3]),
          original_size: 1000,
          compressed_size: 700,
          savings_percent: 30.0,
        },
        output_path: '/path/to/compressed.jpg',
      };

      mockTauriCommands.compressImage.mockResolvedValue(mockResponse);

      // Test different format settings
      const jpegSettings = new CompressionSettings({ format: 'JPEG', quality: 90 });
      const webpSettings = new CompressionSettings({ format: 'WebP', quality: 80 });
      const pngSettings = new CompressionSettings({ format: 'PNG', lossless: true });

      await service.compressImage('/path/to/image.jpg', jpegSettings);
      await service.compressImage('/path/to/image.jpg', webpSettings);
      await service.compressImage('/path/to/image.jpg', pngSettings);

      expect(mockTauriCommands.compressImage).toHaveBeenCalledTimes(3);
      
      // Verify the calls
      const calls = mockTauriCommands.compressImage.mock.calls;
      expect(calls[0][0].format).toBe('jpeg');
      expect(calls[1][0].format).toBe('webp');
      expect(calls[2][0].format).toBe('png');
    });
  });
});