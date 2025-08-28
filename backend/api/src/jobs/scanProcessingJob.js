const aiService = require('../services/aiService');
const partIdentificationService = require('../services/partIdentificationService');
const uploadService = require('../services/uploadService');
const Scan = require('../models/Scan');
const User = require('../models/User');
const jobQueue = require('../services/jobQueue');
const { EMAIL_JOB_TYPES } = require('./emailJob');
const logger = require('../utils/logger');
const sharp = require('sharp');

/**
 * Scan processing job types
 */
const SCAN_JOB_TYPES = {
  PROCESS_IMAGE_SCAN: 'PROCESS_IMAGE_SCAN',
  BATCH_PROCESS_SCANS: 'BATCH_PROCESS_SCANS',
  REPROCESS_FAILED_SCAN: 'REPROCESS_FAILED_SCAN'
};

/**
 * Main scan processing job handler
 * @param {Object} job - Bull job object
 * @returns {Promise<Object>} Processing result
 */
async function processScanJob(job) {
  const { type, data } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Processing scan job', { 
      jobId: job.id, 
      type,
      userId: data.userId 
    });

    let result;

    switch (type) {
      case SCAN_JOB_TYPES.PROCESS_IMAGE_SCAN:
        result = await processImageScan(data, job);
        break;

      case SCAN_JOB_TYPES.BATCH_PROCESS_SCANS:
        result = await batchProcessScans(data, job);
        break;

      case SCAN_JOB_TYPES.REPROCESS_FAILED_SCAN:
        result = await reprocessFailedScan(data, job);
        break;

      default:
        throw new Error(`Unknown scan job type: ${type}`);
    }

    const duration = Date.now() - startTime;
    logger.info('Scan job completed', { 
      jobId: job.id, 
      type,
      duration,
      result 
    });

    return result;
  } catch (error) {
    logger.error('Scan job failed', { 
      jobId: job.id, 
      type,
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}

/**
 * Process uploaded image scan
 * @param {Object} imageData - Contains imageUrl, userId, vehicleId
 * @param {Object} job - Bull job instance
 * @returns {Promise<Object>} Scan results
 */
async function processImageScan(imageData, job) {
  const { imageUrl, userId, vehicleId, metadata = {} } = imageData;
  let scanRecord;

  try {
    // Update progress: Starting
    await job.progress(10);

    // Create scan record
    scanRecord = await Scan.create({
      userId,
      vehicleId,
      imageUrl,
      status: 'processing',
      metadata
    });

    // Update progress: Image preprocessing
    await job.progress(20);

    // Preprocess image
    const processedImage = await preprocessImage(imageUrl);

    // Update progress: AI identification
    await job.progress(40);

    // Call AI service for part identification
    const identificationResult = await identifyParts(processedImage);

    // Update progress: Part matching
    await job.progress(60);

    // Match identified parts with database
    const matchedParts = await matchPartsWithDatabase(identificationResult, vehicleId);

    // Update progress: Saving results
    await job.progress(80);

    // Save results
    const results = await saveResults({
      scanId: scanRecord.id,
      userId,
      identificationResult,
      matchedParts
    });

    // Update scan record
    await scanRecord.update({
      status: 'completed',
      results: results.summary,
      identifiedParts: results.parts,
      confidence: results.averageConfidence,
      processingTime: Date.now() - job.timestamp
    });

    // Update progress: Notifying user
    await job.progress(90);

    // Notify user of results
    await notifyUser(userId, scanRecord, results);

    // Update progress: Complete
    await job.progress(100);

    // Update scan history
    await updateScanHistory(userId, scanRecord.id);

    return {
      success: true,
      scanId: scanRecord.id,
      identifiedParts: results.parts.length,
      confidence: results.averageConfidence,
      processingTime: Date.now() - job.timestamp
    };

  } catch (error) {
    // Update scan record with error
    if (scanRecord) {
      await scanRecord.update({
        status: 'failed',
        error: error.message
      });
    }

    logger.error('Failed to process image scan', {
      userId,
      imageUrl,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * Preprocess image for AI analysis
 * @param {string} imageUrl - URL of the image to process
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function preprocessImage(imageUrl) {
  try {
    // Download image
    const imageBuffer = await uploadService.downloadImage(imageUrl);

    // Process with sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .normalize() // Normalize brightness and contrast
      .sharpen() // Enhance edges
      .toFormat('jpeg', { quality: 90 })
      .toBuffer();

    logger.info('Image preprocessed successfully', {
      originalSize: imageBuffer.length,
      processedSize: processedBuffer.length
    });

    return processedBuffer;
  } catch (error) {
    logger.error('Failed to preprocess image', {
      imageUrl,
      error: error.message
    });
    throw new Error('Image preprocessing failed');
  }
}

/**
 * Identify parts using AI service
 * @param {Buffer} processedImage - Processed image buffer
 * @returns {Promise<Object>} AI identification results
 */
async function identifyParts(processedImage) {
  try {
    // Convert buffer to base64 for AI service
    const base64Image = processedImage.toString('base64');

    // Call AI service
    const aiResult = await aiService.identifyParts({
      image: base64Image,
      format: 'jpeg'
    });

    // Validate AI response
    if (!aiResult || !aiResult.detections) {
      throw new Error('Invalid AI service response');
    }

    logger.info('Parts identified by AI', {
      detectionCount: aiResult.detections.length,
      processingTime: aiResult.processingTime
    });

    return aiResult;
  } catch (error) {
    logger.error('Failed to identify parts', {
      error: error.message
    });
    throw new Error('Part identification failed');
  }
}

/**
 * Match AI-identified parts with database
 * @param {Object} identificationResult - AI identification results
 * @param {string} vehicleId - Vehicle ID for compatibility check
 * @returns {Promise<Array>} Matched parts with details
 */
async function matchPartsWithDatabase(identificationResult, vehicleId) {
  try {
    const matchedParts = [];

    for (const detection of identificationResult.detections) {
      try {
        // Find matching parts in database
        const matches = await partIdentificationService.findMatchingParts({
          category: detection.category,
          keywords: detection.keywords,
          vehicleId,
          confidence: detection.confidence
        });

        if (matches.length > 0) {
          matchedParts.push({
            ...detection,
            matches: matches.slice(0, 5), // Top 5 matches
            bestMatch: matches[0]
          });
        }
      } catch (error) {
        logger.warn('Failed to match part', {
          category: detection.category,
          error: error.message
        });
      }
    }

    logger.info('Parts matched with database', {
      identifiedCount: identificationResult.detections.length,
      matchedCount: matchedParts.length
    });

    return matchedParts;
  } catch (error) {
    logger.error('Failed to match parts with database', {
      error: error.message
    });
    throw new Error('Part matching failed');
  }
}

/**
 * Save scan results to database
 * @param {Object} data - Scan results data
 * @returns {Promise<Object>} Saved results summary
 */
async function saveResults(data, userId) {
  const { scanId, identificationResult, matchedParts } = data;

  try {
    // Calculate average confidence
    const confidences = matchedParts.map(p => p.confidence);
    const averageConfidence = confidences.length > 0 
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
      : 0;

    // Prepare parts data
    const partsData = matchedParts.map(part => ({
      scanId,
      category: part.category,
      confidence: part.confidence,
      boundingBox: part.boundingBox,
      matches: part.matches,
      bestMatchId: part.bestMatch?.id,
      bestMatchName: part.bestMatch?.name,
      bestMatchPrice: part.bestMatch?.price
    }));

    // Save to database (implement based on your schema)
    // await ScanPart.bulkCreate(partsData);

    // Generate recommendations
    const recommendations = await partIdentificationService.generateRecommendations({
      matchedParts,
      vehicleId: data.vehicleId
    });

    return {
      summary: {
        totalDetections: identificationResult.detections.length,
        matchedParts: matchedParts.length,
        averageConfidence,
        processingTime: identificationResult.processingTime
      },
      parts: partsData,
      averageConfidence,
      recommendations
    };
  } catch (error) {
    logger.error('Failed to save scan results', {
      scanId,
      error: error.message
    });
    throw new Error('Failed to save results');
  }
}

/**
 * Notify user of scan results
 * @param {string} userId - User ID
 * @param {Object} scan - Scan record
 * @param {Object} results - Scan results
 */
async function notifyUser(userId, scan, results) {
  try {
    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prepare email data
    const emailData = {
      to: user.email,
      firstName: user.firstName,
      scan: {
        id: scan.id,
        imageUrl: scan.imageUrl,
        createdAt: scan.createdAt
      },
      identifiedParts: results.parts,
      recommendations: results.recommendations,
      compatibleVehicles: [] // Add compatible vehicles if needed
    };

    // Queue email job
    await jobQueue.addJob('email-queue', {
      type: EMAIL_JOB_TYPES.SEND_SCAN_RESULTS,
      data: emailData
    });

    // Send push notification if enabled
    if (user.pushNotificationsEnabled && user.pushToken) {
      // Implement push notification logic
      logger.info('Push notification queued for scan results', {
        userId,
        scanId: scan.id
      });
    }

    logger.info('User notified of scan results', {
      userId,
      scanId: scan.id,
      email: user.email
    });
  } catch (error) {
    logger.error('Failed to notify user of scan results', {
      userId,
      scanId: scan.id,
      error: error.message
    });
    // Don't throw - notification failure shouldn't fail the whole job
  }
}

/**
 * Update user's scan history
 * @param {string} userId - User ID
 * @param {string} scanId - Scan ID
 */
async function updateScanHistory(userId, scanId) {
  try {
    // Update scan count
    await User.increment('scanCount', {
      where: { id: userId }
    });

    // Update last scan date
    await User.update(
      { lastScanAt: new Date() },
      { where: { id: userId } }
    );

    logger.info('Scan history updated', {
      userId,
      scanId
    });
  } catch (error) {
    logger.error('Failed to update scan history', {
      userId,
      scanId,
      error: error.message
    });
    // Don't throw - history update failure shouldn't fail the whole job
  }
}

/**
 * Batch process multiple scans
 * @param {Object} data - Batch processing data
 * @param {Object} job - Bull job instance
 */
async function batchProcessScans(data, job) {
  const { scanIds, userId } = data;
  const results = [];
  const failures = [];

  try {
    const totalScans = scanIds.length;
    let processedCount = 0;

    for (const scanId of scanIds) {
      try {
        // Get scan details
        const scan = await Scan.findByPk(scanId);
        if (!scan) {
          throw new Error('Scan not found');
        }

        // Process individual scan
        const result = await processImageScan({
          imageUrl: scan.imageUrl,
          userId: scan.userId,
          vehicleId: scan.vehicleId,
          metadata: scan.metadata
        }, job);

        results.push({
          scanId,
          success: true,
          result
        });
      } catch (error) {
        logger.error('Failed to process scan in batch', {
          scanId,
          error: error.message
        });

        failures.push({
          scanId,
          success: false,
          error: error.message
        });
      }

      processedCount++;
      await job.progress(Math.round((processedCount / totalScans) * 100));
    }

    return {
      totalProcessed: results.length,
      totalFailed: failures.length,
      results,
      failures
    };
  } catch (error) {
    logger.error('Batch scan processing failed', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Reprocess a failed scan
 * @param {Object} data - Reprocess data
 * @param {Object} job - Bull job instance
 */
async function reprocessFailedScan(data, job) {
  const { scanId } = data;

  try {
    // Get scan details
    const scan = await Scan.findByPk(scanId);
    if (!scan) {
      throw new Error('Scan not found');
    }

    if (scan.status !== 'failed') {
      throw new Error('Scan is not in failed state');
    }

    // Reset scan status
    await scan.update({
      status: 'processing',
      error: null
    });

    // Reprocess the scan
    const result = await processImageScan({
      imageUrl: scan.imageUrl,
      userId: scan.userId,
      vehicleId: scan.vehicleId,
      metadata: scan.metadata
    }, job);

    return result;
  } catch (error) {
    logger.error('Failed to reprocess scan', {
      scanId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  processScanJob,
  SCAN_JOB_TYPES
};