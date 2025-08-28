const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * AI Service for communicating with the AI microservice
 */
class AIService {
  constructor() {
    this.baseURL = config.AI_SERVICE_URL || 'http://localhost:8001';
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Process an image using the AI service
   */
  async processImage(scanId, imageUrl, vehicleId = null) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/scan/process`,
        {
          image_url: imageUrl,
          vehicle_id: vehicleId,
          scan_id: scanId
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      logger.info(`AI processing completed for scan: ${scanId}`);
      return response.data;
    } catch (error) {
      logger.error('AI service error:', error.response?.data || error.message);
      throw new Error(`AI processing failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process image from file upload
   */
  async processImageFile(scanId, filePath, vehicleId = null) {
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(filePath));
      if (vehicleId) formData.append('vehicle_id', vehicleId);
      formData.append('scan_id', scanId);

      const response = await axios.post(
        `${this.baseURL}/api/scan/process`,
        formData,
        {
          timeout: this.timeout,
          headers: {
            ...formData.getHeaders(),
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      logger.info(`AI processing completed for scan: ${scanId}`);
      return response.data;
    } catch (error) {
      logger.error('AI service error:', error.response?.data || error.message);
      throw new Error(`AI processing failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get scan result by ID
   */
  async getScanResult(scanId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/scan/result/${scanId}`,
        {
          timeout: 10000,
          headers: {
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Get scan result error:', error.response?.data || error.message);
      throw new Error(`Failed to get scan result: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get analysis for detected parts
   */
  async getPartAnalysis(partDetections) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/analysis/parts`,
        {
          detections: partDetections
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Part analysis error:', error.response?.data || error.message);
      throw new Error(`Part analysis failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get part recommendations based on scan results
   */
  async getPartRecommendations(userId, scanResults, vehicleId = null) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/recommendation/parts`,
        {
          user_id: userId,
          scan_results: scanResults,
          vehicle_id: vehicleId
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Part recommendations error:', error.response?.data || error.message);
      throw new Error(`Part recommendations failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process batch of images
   */
  async processBatchImages(images) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/scan/batch`,
        {
          images: images
        },
        {
          timeout: 60000, // 60 seconds for batch processing
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      logger.info(`Batch processing completed for ${images.length} images`);
      return response.data;
    } catch (error) {
      logger.error('Batch processing error:', error.response?.data || error.message);
      throw new Error(`Batch processing failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get AI service health status
   */
  async getHealthStatus() {
    try {
      const response = await axios.get(
        `${this.baseURL}/health`,
        {
          timeout: 5000,
          headers: {
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('AI service health check error:', error.message);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics() {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/metrics/models`,
        {
          timeout: 10000,
          headers: {
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Model metrics error:', error.response?.data || error.message);
      throw new Error(`Failed to get model metrics: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Validate image before processing
   */
  async validateImage(imageUrl) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/validate/image`,
        {
          image_url: imageUrl
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.AI_SERVICE_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Image validation error:', error.response?.data || error.message);
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

// Export singleton instance
module.exports = new AIService();

// Export processImage function for backward compatibility
module.exports.processImage = async (scanId, imageUrl, vehicleId = null) => {
  return module.exports.processImage(scanId, imageUrl, vehicleId);
};