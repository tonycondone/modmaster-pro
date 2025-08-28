const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const config = require('../config');
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET
});

/**
 * Upload service for handling file uploads and image processing
 */
class UploadService {
  constructor() {
    this.allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.tempUploadPath = path.join(process.cwd(), 'temp', 'uploads');
    
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Ensure temp upload directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempUploadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Configure multer for file uploads
   */
  getMulterConfig(folder = 'general') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempUploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${folder}-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize
      }
    });
  }

  /**
   * Upload image to Cloudinary
   */
  async uploadToCloudinary(filePath, options = {}) {
    try {
      const defaultOptions = {
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto'
      };

      const uploadOptions = { ...defaultOptions, ...options };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      logger.info(`File uploaded to Cloudinary: ${result.public_id}`);
      return result;
    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteFromCloudinary(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted from Cloudinary: ${publicId}`);
      return result;
    } catch (error) {
      logger.error('Cloudinary delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Process and optimize image before upload
   */
  async processImage(inputPath, outputPath, options = {}) {
    try {
      const {
        width = null,
        height = null,
        quality = 80,
        format = 'jpeg'
      } = options;

      let processor = sharp(inputPath);

      // Resize if dimensions provided
      if (width || height) {
        processor = processor.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Convert format and set quality
      if (format === 'jpeg') {
        processor = processor.jpeg({ quality });
      } else if (format === 'png') {
        processor = processor.png({ quality });
      } else if (format === 'webp') {
        processor = processor.webp({ quality });
      }

      await processor.toFile(outputPath);

      logger.info(`Image processed: ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Upload avatar image
   */
  async uploadAvatar(filePath, userId) {
    try {
      // Process image for avatar (square, 300x300)
      const processedPath = path.join(this.tempUploadPath, `avatar-${userId}-${Date.now()}.jpg`);
      
      await this.processImage(filePath, processedPath, {
        width: 300,
        height: 300,
        quality: 85,
        format: 'jpeg'
      });

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(processedPath, {
        folder: 'avatars',
        public_id: `avatar-${userId}`,
        overwrite: true,
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'face' }
        ]
      });

      // Clean up temp files
      await this.cleanupFile(filePath);
      await this.cleanupFile(processedPath);

      return result;
    } catch (error) {
      logger.error('Avatar upload error:', error);
      throw error;
    }
  }

  /**
   * Upload scan image
   */
  async uploadScanImage(filePath, scanId, userId) {
    try {
      // Process image for scan (optimize but maintain quality for AI)
      const processedPath = path.join(this.tempUploadPath, `scan-${scanId}-${Date.now()}.jpg`);
      
      await this.processImage(filePath, processedPath, {
        quality: 90,
        format: 'jpeg'
      });

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(processedPath, {
        folder: `scans/${userId}`,
        public_id: `scan-${scanId}`,
        tags: ['scan', `user-${userId}`]
      });

      // Clean up temp files
      await this.cleanupFile(filePath);
      await this.cleanupFile(processedPath);

      return result;
    } catch (error) {
      logger.error('Scan image upload error:', error);
      throw error;
    }
  }

  /**
   * Upload vehicle image
   */
  async uploadVehicleImage(filePath, vehicleId, userId) {
    try {
      // Process image for vehicle
      const processedPath = path.join(this.tempUploadPath, `vehicle-${vehicleId}-${Date.now()}.jpg`);
      
      await this.processImage(filePath, processedPath, {
        width: 800,
        height: 600,
        quality: 85,
        format: 'jpeg'
      });

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(processedPath, {
        folder: `vehicles/${userId}`,
        public_id: `vehicle-${vehicleId}-${Date.now()}`,
        tags: ['vehicle', `user-${userId}`]
      });

      // Clean up temp files
      await this.cleanupFile(filePath);
      await this.cleanupFile(processedPath);

      return result;
    } catch (error) {
      logger.error('Vehicle image upload error:', error);
      throw error;
    }
  }

  /**
   * Generate image thumbnails
   */
  async generateThumbnails(filePath, sizes = [{ width: 150, height: 150, suffix: 'thumb' }]) {
    try {
      const thumbnails = [];
      const baseFilename = path.basename(filePath, path.extname(filePath));
      const dir = path.dirname(filePath);

      for (const size of sizes) {
        const thumbnailPath = path.join(dir, `${baseFilename}-${size.suffix}.jpg`);
        
        await this.processImage(filePath, thumbnailPath, {
          width: size.width,
          height: size.height,
          quality: 80,
          format: 'jpeg'
        });

        thumbnails.push({
          size: `${size.width}x${size.height}`,
          path: thumbnailPath
        });
      }

      return thumbnails;
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   */
  async validateImage(filePath) {
    try {
      const metadata = await sharp(filePath).metadata();
      
      const validation = {
        valid: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        errors: []
      };

      // Check minimum dimensions
      if (metadata.width < 100 || metadata.height < 100) {
        validation.valid = false;
        validation.errors.push('Image dimensions too small (minimum 100x100)');
      }

      // Check maximum dimensions
      if (metadata.width > 5000 || metadata.height > 5000) {
        validation.valid = false;
        validation.errors.push('Image dimensions too large (maximum 5000x5000)');
      }

      // Check file size
      if (metadata.size > this.maxFileSize) {
        validation.valid = false;
        validation.errors.push(`File size too large (maximum ${this.maxFileSize / 1024 / 1024}MB)`);
      }

      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid image file: ${error.message}`]
      };
    }
  }

  /**
   * Clean up temporary file
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to cleanup file ${filePath}:`, error.message);
    }
  }

  /**
   * Clean up old temporary files
   */
  async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      const files = await fs.readdir(this.tempUploadPath);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.tempUploadPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.cleanupFile(filePath);
        }
      }

      logger.info('Temp files cleanup completed');
    } catch (error) {
      logger.error('Temp files cleanup error:', error);
    }
  }
}

// Export singleton instance
module.exports = new UploadService();

// Export specific methods for backward compatibility
module.exports.uploadToCloudinary = (filePath, options) => {
  return module.exports.uploadToCloudinary(filePath, options);
};

module.exports.deleteFromCloudinary = (publicId) => {
  return module.exports.deleteFromCloudinary(publicId);
};