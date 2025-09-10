const jobQueue = require('../services/jobQueue');
const { processEmailJob } = require('../jobs/emailJob');
const { processScanJob } = require('../jobs/scanProcessingJob');
const { processMaintenanceJob } = require('../jobs/maintenanceReminderJob');
const logger = require('../utils/logger');
const os = require('os');

// Worker configuration
const WORKER_CONFIG = {
  email: {
    concurrency: 10,
    processor: processEmailJob
  },
  scan: {
    concurrency: 5,
    processor: processScanJob
  },
  maintenance: {
    concurrency: 3,
    processor: processMaintenanceJob
  }
};

/**
 * Job Worker
 * Manages background job processing for all queues
 */
class JobWorker {
  constructor() {
    this.isRunning = false;
    this.queues = new Map();
    this.gracefulShutdown = false;
    this.metrics = {
      startTime: null,
      processedJobs: 0,
      failedJobs: 0,
      activeJobs: 0
    };
  }

  /**
   * Start the job worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Job worker is already running');
      return;
    }

    try {
      logger.info('Starting job worker', {
        hostname: os.hostname(),
        pid: process.pid,
        nodeVersion: process.version
      });

      this.isRunning = true;
      this.metrics.startTime = new Date();

      // Setup queues
      this.setupQueues();

      // Setup process handlers
      this.setupProcessHandlers();

      // Start monitoring
      this.startMonitoring();

      logger.info('Job worker started successfully', {
        queues: Array.from(this.queues.keys())
      });
    } catch (error) {
      logger.error('Failed to start job worker', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Setup all job queues
   */
  setupQueues() {
    // Email queue
    const emailQueue = jobQueue.createQueue('email-queue', {
      removeOnComplete: 100,
      removeOnFail: 50
    });
    jobQueue.processJobs('email-queue', WORKER_CONFIG.email.processor, {
      concurrency: WORKER_CONFIG.email.concurrency
    });
    this.queues.set('email', emailQueue);

    // Scan processing queue
    const scanQueue = jobQueue.createQueue('scan-queue', {
      removeOnComplete: 50,
      removeOnFail: 25
    });
    jobQueue.processJobs('scan-queue', WORKER_CONFIG.scan.processor, {
      concurrency: WORKER_CONFIG.scan.concurrency
    });
    this.queues.set('scan', scanQueue);

    // Maintenance queue
    const maintenanceQueue = jobQueue.createQueue('maintenance-queue', {
      removeOnComplete: 100,
      removeOnFail: 50
    });
    jobQueue.processJobs('maintenance-queue', WORKER_CONFIG.maintenance.processor, {
      concurrency: WORKER_CONFIG.maintenance.concurrency
    });
    this.queues.set('maintenance', maintenanceQueue);

    // Setup queue event handlers
    this.setupQueueEventHandlers();
  }

  /**
   * Setup event handlers for all queues
   */
  setupQueueEventHandlers() {
    for (const [name, queue] of this.queues) {
      // Track metrics
      queue.on('completed', () => {
        this.metrics.processedJobs++;
      });

      queue.on('failed', () => {
        this.metrics.failedJobs++;
      });

      queue.on('active', () => {
        this.metrics.activeJobs++;
      });

      queue.on('completed', () => {
        if (this.metrics.activeJobs > 0) {
          this.metrics.activeJobs--;
        }
      });

      queue.on('failed', () => {
        if (this.metrics.activeJobs > 0) {
          this.metrics.activeJobs--;
        }
      });

      // Log critical events
      queue.on('error', (error) => {
        logger.error('Queue error', {
          queue: name,
          error: error.message,
          stack: error.stack
        });
      });

      queue.on('stalled', (job) => {
        logger.warn('Job stalled', {
          queue: name,
          jobId: job.id,
          data: job.data
        });
      });
    }
  }

  /**
   * Setup process event handlers for graceful shutdown
   */
  setupProcessHandlers() {
    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      await this.shutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, starting graceful shutdown');
      await this.shutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack
      });
      // Give logger time to write
      setTimeout(() => process.exit(1), 1000);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason,
        promise
      });
    });
  }

  /**
   * Start monitoring and reporting
   */
  startMonitoring() {
    // Report metrics every minute
    this.monitoringInterval = setInterval(() => {
      this.reportMetrics();
    }, 60000);

    // Check queue health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkQueueHealth();
    }, 30000);

    // Clean old jobs every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanOldJobs();
    }, 3600000);
  }

  /**
   * Report worker metrics
   */
  async reportMetrics() {
    try {
      const uptime = Date.now() - this.metrics.startTime;
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const queueStats = {};
      for (const [name, queue] of this.queues) {
        const stats = await jobQueue.getQueueStats(`${name}-queue`);
        queueStats[name] = stats.counts;
      }

      logger.info('Worker metrics', {
        uptime: Math.floor(uptime / 1000),
        processedJobs: this.metrics.processedJobs,
        failedJobs: this.metrics.failedJobs,
        activeJobs: this.metrics.activeJobs,
        memoryUsage: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
        },
        cpuUsage: {
          user: Math.round(cpuUsage.user / 1000000) + ' ms',
          system: Math.round(cpuUsage.system / 1000000) + ' ms'
        },
        queues: queueStats
      });
    } catch (error) {
      logger.error('Failed to report metrics', {
        error: error.message
      });
    }
  }

  /**
   * Check health of all queues
   */
  async checkQueueHealth() {
    try {
      for (const [name, queue] of this.queues) {
        const isPaused = await queue.isPaused();
        const stats = await jobQueue.getQueueStats(`${name}-queue`);

        // Check for issues
        if (isPaused) {
          logger.warn('Queue is paused', { queue: name });
        }

        if (stats.counts.failed > 100) {
          logger.warn('High number of failed jobs', {
            queue: name,
            failedCount: stats.counts.failed
          });
        }

        if (stats.counts.waiting > 1000) {
          logger.warn('High number of waiting jobs', {
            queue: name,
            waitingCount: stats.counts.waiting
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check queue health', {
        error: error.message
      });
    }
  }

  /**
   * Clean old completed and failed jobs
   */
  async cleanOldJobs() {
    try {
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [name, queue] of this.queues) {
        const cleanedCompleted = await jobQueue.cleanQueue(`${name}-queue`, maxAge, 'completed');
        const cleanedFailed = await jobQueue.cleanQueue(`${name}-queue`, maxAge * 7, 'failed'); // Keep failed jobs for 7 days

        if (cleanedCompleted.length > 0 || cleanedFailed.length > 0) {
          logger.info('Cleaned old jobs', {
            queue: name,
            completedCleaned: cleanedCompleted.length,
            failedCleaned: cleanedFailed.length
          });
        }
      }
    } catch (error) {
      logger.error('Failed to clean old jobs', {
        error: error.message
      });
    }
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown() {
    if (this.gracefulShutdown) {
      logger.info('Shutdown already in progress');
      return;
    }

    this.gracefulShutdown = true;
    logger.info('Starting graceful shutdown');

    try {
      // Stop accepting new jobs
      for (const [name, queue] of this.queues) {
        await queue.pause();
        logger.info('Queue paused', { queue: name });
      }

      // Clear intervals
      if (this.monitoringInterval) clearInterval(this.monitoringInterval);
      if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);

      // Wait for active jobs to complete (max 30 seconds)
      const shutdownTimeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing exit');
        process.exit(0);
      }, 30000);

      // Wait for active jobs
      let activeJobs = this.metrics.activeJobs;
      while (activeJobs > 0) {
        logger.info('Waiting for active jobs to complete', { activeJobs });
        await new Promise(resolve => setTimeout(resolve, 1000));
        activeJobs = this.metrics.activeJobs;
      }

      clearTimeout(shutdownTimeout);

      // Close all queues
      await jobQueue.closeAll();

      // Final metrics
      await this.reportMetrics();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    }
  }

  /**
   * Get worker status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      uptime: this.metrics.startTime ? Date.now() - this.metrics.startTime : 0,
      metrics: this.metrics,
      queues: Array.from(this.queues.keys()),
      hostname: os.hostname(),
      pid: process.pid
    };
  }
}

// Create and export worker instance
const worker = new JobWorker();

// Start worker if running as main module
if (require.main === module) {
  worker.start().catch(error => {
    logger.error('Failed to start worker', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
}

module.exports = worker;