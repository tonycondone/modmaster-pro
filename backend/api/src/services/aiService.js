const axios = require('axios');
const FormData = require('form-data');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Process image through AI service
 */
async function processImage(imageUrl, scanType = 'parts') {
  try {
    const response = await axios.post(
      `${config.ai.serviceUrl}/api/v1/process`,
      {
        image_url: imageUrl,
        scan_type: scanType,
        options: {
          detect_parts: true,
          identify_condition: true,
          extract_text: true,
          confidence_threshold: 0.7
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      }
    );

    return response.data;
  } catch (error) {
    logger.error('AI service error:', error.response?.data || error.message);
    throw new Error('AI processing failed');
  }
}

/**
 * Get part recommendations based on scan
 */
async function getRecommendations(scanResults, vehicleInfo) {
  try {
    const response = await axios.post(
      `${config.ai.serviceUrl}/api/v1/recommendations`,
      {
        scan_results: scanResults,
        vehicle: vehicleInfo
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error('AI recommendations error:', error);
    return { recommendations: [] };
  }
}

/**
 * Analyze vehicle damage
 */
async function analyzeDamage(imageUrl) {
  try {
    const response = await axios.post(
      `${config.ai.serviceUrl}/api/v1/analyze-damage`,
      {
        image_url: imageUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Damage analysis error:', error);
    throw new Error('Damage analysis failed');
  }
}

/**
 * Extract VIN from image
 */
async function extractVIN(imageUrl) {
  try {
    const response = await axios.post(
      `${config.ai.serviceUrl}/api/v1/extract-vin`,
      {
        image_url: imageUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${config.ai.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    logger.error('VIN extraction error:', error);
    throw new Error('VIN extraction failed');
  }
}

module.exports = {
  processImage,
  getRecommendations,
  analyzeDamage,
  extractVIN
};