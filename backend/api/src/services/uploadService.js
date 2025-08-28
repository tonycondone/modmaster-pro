const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config');

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret
});

/**
 * Upload file to Cloudinary
 */
async function uploadToCloudinary(file, folder = 'general') {
  try {
    const fileBuffer = file.data || file.buffer;
    const fileName = `${folder}/${uuidv4()}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `modmaster-pro/${folder}`,
          public_id: fileName,
          overwrite: true
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    logger.error('Upload service error:', error);
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 */
async function deleteFromCloudinary(publicIdOrUrl) {
  try {
    let publicId = publicIdOrUrl;
    
    // Extract public_id if full URL is provided
    if (publicIdOrUrl.includes('cloudinary.com')) {
      const matches = publicIdOrUrl.match(/upload\/(?:v\d+\/)?(.+)\./);
      if (matches) {
        publicId = matches[1];
      }
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Process and optimize image
 */
async function processImage(buffer, options = {}) {
  const {
    width = 1920,
    height = 1080,
    quality = 85,
    format = 'jpeg'
  } = options;

  try {
    return await sharp(buffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      [format]({ quality })
      .toBuffer();
  } catch (error) {
    logger.error('Image processing error:', error);
    throw error;
  }
}

/**
 * Upload multiple files
 */
async function uploadMultiple(files, folder = 'general') {
  const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  processImage,
  uploadMultiple
};