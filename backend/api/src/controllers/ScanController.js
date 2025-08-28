const { validationResult } = require('express-validator');
const VehicleScan = require('../models/VehicleScan');
const Vehicle = require('../models/Vehicle');
const Part = require('../models/Part');
const { AppError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { uploadToCloudinary } = require('../services/uploadService');
const { processImage } = require('../services/aiService');
const { identifyParts } = require('../services/partIdentificationService');
const redis = require('../utils/redis');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { Op } = require('sequelize');
const sequelize = require('../utils/database');

class ScanController {
  /**
   * Create new scan
   * @route POST /api/scans
   */
  static async createScan(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ValidationError('Validation failed', errors.array());
      }

      const userId = req.user.id;
      const { vehicle_id, scan_type = 'parts', notes } = req.body;

      // Validate vehicle ownership
      if (vehicle_id) {
        const vehicle = await Vehicle.findOne({
          where: { id: vehicle_id, user_id: userId, deleted_at: null }
        });
        if (!vehicle) {
          throw new AppError('Vehicle not found', 404);
        }
      }

      // Check if image is provided
      if (!req.files || !req.files.image) {
        throw new ValidationError('Image is required');
      }

      // Generate scan ID
      const scanId = uuidv4();

      // Process image (resize, optimize)
      const imageBuffer = req.files.image.data;
      const processedImage = await sharp(imageBuffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload to cloud storage
      const uploadResult = await uploadToCloudinary(
        { data: processedImage, mimetype: 'image/jpeg' },
        'scans'
      );

      // Create scan record
      const scan = await VehicleScan.create({
        id: scanId,
        user_id: userId,
        vehicle_id,
        scan_type,
        image_url: uploadResult.secure_url,
        image_metadata: {
          original_name: req.files.image.name,
          size: req.files.image.size,
          mimetype: req.files.image.mimetype,
          dimensions: await sharp(imageBuffer).metadata()
        },
        notes,
        status: 'processing'
      });

      // Start async processing
      this.processInBackground(scanId, uploadResult.secure_url, scan_type);

      logger.info('Scan created', { userId, scanId, vehicleId: vehicle_id });

      res.status(202).json({
        success: true,
        message: 'Scan uploaded successfully. Processing in progress.',
        data: {
          scan: {
            id: scan.id,
            status: scan.status,
            scan_type: scan.scan_type,
            created_at: scan.created_at
          },
          processing_url: `/api/scans/${scanId}/status`
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process scan in background
   */
  static async processInBackground(scanId, imageUrl, scanType) {
    try {
      // Update status to processing
      await VehicleScan.update(
        { status: 'processing', processed_at: new Date() },
        { where: { id: scanId } }
      );

      // Call AI service
      const aiResults = await processImage(imageUrl, scanType);

      if (!aiResults || aiResults.error) {
        throw new Error(aiResults?.error || 'AI processing failed');
      }

      // Identify parts from AI results
      const identifiedParts = await identifyParts(aiResults.detections);

      // Store results
      const transaction = await sequelize.transaction();
      
      try {
        // Update scan with results
        await VehicleScan.update(
          {
            status: 'completed',
            ai_results: aiResults,
            parts_detected: identifiedParts.length,
            confidence_score: aiResults.overall_confidence,
            processing_time: aiResults.processing_time,
            completed_at: new Date()
          },
          { where: { id: scanId }, transaction }
        );

        // Associate detected parts
        const scan = await VehicleScan.findByPk(scanId, { transaction });
        
        for (const partData of identifiedParts) {
          // Find or create part
          let part = await Part.findOne({
            where: {
              [Op.or]: [
                { oem_number: partData.oem_number },
                { universal_part_number: partData.upn }
              ]
            },
            transaction
          });

          if (!part && partData.oem_number) {
            part = await Part.create({
              name: partData.name,
              category: partData.category,
              subcategory: partData.subcategory,
              manufacturer: partData.manufacturer,
              oem_number: partData.oem_number,
              universal_part_number: partData.upn,
              description: partData.description
            }, { transaction });
          }

          if (part) {
            // Create association with detection details
            await scan.addDetectedPart(part, {
              through: {
                confidence_score: partData.confidence,
                location: partData.bounding_box,
                ai_metadata: partData.metadata
              },
              transaction
            });
          }
        }

        await transaction.commit();

        // Clear any cached data
        await redis.del(`scan:${scanId}:status`);

        // Send notification if configured
        await this.sendProcessingNotification(scan, 'completed');

        logger.info('Scan processing completed', { scanId, partsDetected: identifiedParts.length });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('Scan processing failed', { scanId, error: error.message });
      
      // Update scan status to failed
      await VehicleScan.update(
        {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date()
        },
        { where: { id: scanId } }
      );

      // Send failure notification
      const scan = await VehicleScan.findByPk(scanId);
      await this.sendProcessingNotification(scan, 'failed');
    }
  }

  /**
   * Get scan status
   * @route GET /api/scans/:id/status
   */
  static async getScanStatus(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check cache first
      const cached = await redis.get(`scan:${id}:status`);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const scan = await VehicleScan.findOne({
        where: { id, user_id: userId },
        attributes: ['id', 'status', 'processing_time', 'parts_detected', 'error_message']
      });

      if (!scan) {
        throw new AppError('Scan not found', 404);
      }

      const response = {
        success: true,
        data: {
          scan_id: scan.id,
          status: scan.status,
          processing_time: scan.processing_time,
          parts_detected: scan.parts_detected,
          error_message: scan.error_message
        }
      };

      // Cache if still processing
      if (scan.status === 'processing') {
        await redis.setex(`scan:${id}:status`, 10, JSON.stringify(response));
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scan details
   * @route GET /api/scans/:id
   */
  static async getScanDetails(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await VehicleScan.findOne({
        where: { id, user_id: userId },
        include: [
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year']
          },
          {
            model: Part,
            as: 'detectedParts',
            through: {
              attributes: ['confidence_score', 'location', 'ai_metadata']
            }
          }
        ]
      });

      if (!scan) {
        throw new AppError('Scan not found', 404);
      }

      res.json({
        success: true,
        data: { scan }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's scan history
   * @route GET /api/scans
   */
  static async getUserScans(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        vehicle_id,
        scan_type,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 20,
        sort = 'created_at',
        order = 'DESC'
      } = req.query;

      const whereClause = { user_id: userId };

      if (vehicle_id) whereClause.vehicle_id = vehicle_id;
      if (scan_type) whereClause.scan_type = scan_type;
      if (status) whereClause.status = status;
      
      if (date_from || date_to) {
        whereClause.created_at = {};
        if (date_from) whereClause.created_at[Op.gte] = new Date(date_from);
        if (date_to) whereClause.created_at[Op.lte] = new Date(date_to);
      }

      const offset = (page - 1) * limit;

      const scans = await VehicleScan.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sort, order]],
        include: [
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year']
          }
        ]
      });

      res.json({
        success: true,
        data: {
          scans: scans.rows,
          pagination: {
            total: scans.count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(scans.count / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete scan
   * @route DELETE /api/scans/:id
   */
  static async deleteScan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await VehicleScan.findOne({
        where: { id, user_id: userId }
      });

      if (!scan) {
        throw new AppError('Scan not found', 404);
      }

      // Delete image from cloud storage
      if (scan.image_url) {
        await deleteFromCloudinary(scan.image_url);
      }

      // Delete scan record
      await scan.destroy();

      logger.info('Scan deleted', { userId, scanId: id });

      res.json({
        success: true,
        message: 'Scan deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Re-process scan
   * @route POST /api/scans/:id/reprocess
   */
  static async reprocessScan(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const scan = await VehicleScan.findOne({
        where: { id, user_id: userId }
      });

      if (!scan) {
        throw new AppError('Scan not found', 404);
      }

      if (!scan.image_url) {
        throw new AppError('Scan image not found', 400);
      }

      // Reset scan status
      await scan.update({
        status: 'processing',
        ai_results: null,
        parts_detected: 0,
        confidence_score: null,
        error_message: null,
        processing_time: null
      });

      // Start reprocessing
      this.processInBackground(scan.id, scan.image_url, scan.scan_type);

      logger.info('Scan reprocessing started', { userId, scanId: id });

      res.json({
        success: true,
        message: 'Scan reprocessing started',
        data: {
          scan_id: scan.id,
          status: 'processing',
          processing_url: `/api/scans/${id}/status`
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export scan results
   * @route GET /api/scans/:id/export
   */
  static async exportScanResults(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user.id;

      const scan = await VehicleScan.findOne({
        where: { id, user_id: userId },
        include: [
          {
            model: Vehicle,
            as: 'vehicle'
          },
          {
            model: Part,
            as: 'detectedParts',
            through: {
              attributes: ['confidence_score', 'location']
            }
          }
        ]
      });

      if (!scan) {
        throw new AppError('Scan not found', 404);
      }

      if (scan.status !== 'completed') {
        throw new AppError('Scan processing not completed', 400);
      }

      let exportData;
      let contentType;
      let filename;

      switch (format) {
        case 'csv':
          exportData = this.generateCSVExport(scan);
          contentType = 'text/csv';
          filename = `scan_${id}_results.csv`;
          break;
        
        case 'pdf':
          exportData = await this.generatePDFExport(scan);
          contentType = 'application/pdf';
          filename = `scan_${id}_results.pdf`;
          break;
        
        default:
          exportData = JSON.stringify(scan, null, 2);
          contentType = 'application/json';
          filename = `scan_${id}_results.json`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scan analytics
   * @route GET /api/scans/analytics
   */
  static async getScanAnalytics(req, res, next) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      const dateRange = this.getDateRange(period);

      const analytics = await VehicleScan.findAll({
        where: {
          user_id: userId,
          created_at: {
            [Op.gte]: dateRange.start,
            [Op.lte]: dateRange.end
          }
        },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_scans'],
          [sequelize.fn('AVG', sequelize.col('confidence_score')), 'avg_confidence'],
          [sequelize.fn('SUM', sequelize.col('parts_detected')), 'total_parts_detected'],
          'scan_type',
          'status',
          [sequelize.fn('DATE', sequelize.col('created_at')), 'date']
        ],
        group: ['scan_type', 'status', sequelize.fn('DATE', sequelize.col('created_at'))]
      });

      const summary = {
        total_scans: analytics.reduce((sum, row) => sum + parseInt(row.get('total_scans')), 0),
        successful_scans: analytics.filter(row => row.status === 'completed').reduce((sum, row) => sum + parseInt(row.get('total_scans')), 0),
        failed_scans: analytics.filter(row => row.status === 'failed').reduce((sum, row) => sum + parseInt(row.get('total_scans')), 0),
        average_confidence: parseFloat(analytics.reduce((sum, row) => sum + parseFloat(row.get('avg_confidence') || 0), 0) / analytics.length).toFixed(2),
        total_parts_detected: analytics.reduce((sum, row) => sum + parseInt(row.get('total_parts_detected')), 0)
      };

      res.json({
        success: true,
        data: {
          summary,
          daily_breakdown: analytics,
          period: {
            start: dateRange.start,
            end: dateRange.end
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Send processing notification
   */
  static async sendProcessingNotification(scan, status) {
    // Implementation depends on notification service
    // This is a placeholder
    logger.info('Notification sent', { scanId: scan.id, status });
  }

  /**
   * Helper: Generate CSV export
   */
  static generateCSVExport(scan) {
    const headers = ['Part Name', 'Category', 'Manufacturer', 'OEM Number', 'Confidence Score'];
    const rows = scan.detectedParts.map(part => [
      part.name,
      part.category,
      part.manufacturer,
      part.oem_number,
      part.ScanPart.confidence_score
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Helper: Generate PDF export
   */
  static async generatePDFExport(scan) {
    // This would use a PDF generation library like puppeteer or pdfkit
    // Placeholder implementation
    return Buffer.from('PDF content would be generated here');
  }

  /**
   * Helper: Get date range
   */
  static getDateRange(period) {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }
}

module.exports = ScanController;