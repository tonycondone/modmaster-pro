const Bull = require('bull');
const Redis = require('redis');
const logger = require('../utils/logger');
const config = require('../config');

// Redis configuration
const redisConfig = {
  redis: {
    port: config.redis.port || 6379,
    host: config.redis.host || 'localhost',
    password: config.redis.password,
    db: config.redis.db || 0,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  }
};

// Queue storage
const queues = new Map();

// Queue event handlers
const setupQueueEvents = (queue, queueName) => {
  queue.on('error', (error) => {
    logger.error('Queue error', { queueName, error: error.message, stack: error.stack });
  });

  queue.on('waiting', (jobId) => {
    logger.debug('Job waiting', { queueName, jobId });
  });

  queue.on('active', (job) => {
    logger.info('Job started', { queueName, jobId: job.id, data: job.data });
  });

  queue.on('completed', (job, result) => {
    logger.info('Job completed', { queueName, jobId: job.id, result });
  });

  queue.on('failed', (job, err) => {
    logger.error('Job failed', { 
      queueName, 
      jobId: job.id, 
      attempt: job.attemptsMade,
      error: err.message,
      stack: err.stack 
    });
  });

  queue.on('stalled', (job) => {
    logger.warn('Job stalled', { queueName, jobId: job.id });
  });

  queue.on('removed', (job) => {
    logger.info('Job removed', { queueName, jobId: job.id });
  });
};

/**
 * Job Queue Service
 * Manages background job processing using Bull
 */
class JobQueueService {
  /**
   * Create or get a queue
   * @param {string} queueName - Name of the queue
   * @param {Object} options - Queue configuration options
   * @returns {Object} Bull queue instance
   */
  createQueue(queueName, options = {}) {
    try {
      // Return existing queue if already created
      if (queues.has(queueName)) {
        return queues.get(queueName);
      }

      // Create new queue
      const queue = new Bull(queueName, {
        ...redisConfig,
        defaultJobOptions: {
          removeOnComplete: options.removeOnComplete !== false ? 100 : false,
          removeOnFail: options.removeOnFail !== false ? 50 : false,
          attempts: options.attempts || 3,
          backoff: {
            type: options.backoffType || 'exponential',
            delay: options.backoffDelay || 2000
          }
        },
        ...options
      });

      // Setup event handlers
      setupQueueEvents(queue, queueName);

      // Store queue
      queues.set(queueName, queue);

      logger.info('Queue created', { queueName });
      return queue;
    } catch (error) {
      logger.error('Error creating queue', { 
        queueName, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Add a job to a queue
   * @param {string} queueName - Name of the queue
   * @param {Object} jobData - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>} Created job
   */
  async addJob(queueName, jobData, options = {}) {
    try {
      const queue = this.createQueue(queueName);
      
      // Job options
      const jobOptions = {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: options.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options.removeOnComplete !== false,
        removeOnFail: options.removeOnFail,
        timeout: options.timeout || 30000
      };

      // Add custom job ID if provided
      if (options.jobId) {
        jobOptions.jobId = options.jobId;
      }

      // Add job to queue
      const job = await queue.add(jobData, jobOptions);
      
      logger.info('Job added to queue', { 
        queueName, 
        jobId: job.id,
        priority: jobOptions.priority,
        delay: jobOptions.delay 
      });

      return job;
    } catch (error) {
      logger.error('Error adding job to queue', { 
        queueName, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Process jobs in a queue
   * @param {string} queueName - Name of the queue
   * @param {Function} processor - Job processor function
   * @param {Object} options - Processing options
   */
  processJobs(queueName, processor, options = {}) {
    try {
      const queue = this.createQueue(queueName);
      
      // Processing options
      const concurrency = options.concurrency || 5;
      
      // Wrap processor with error handling
      const wrappedProcessor = async (job) => {
        const startTime = Date.now();
        
        try {
          logger.info('Processing job', { 
            queueName, 
            jobId: job.id,
            attempt: job.attemptsMade + 1 
          });
          
          // Call the actual processor
          const result = await processor(job);
          
          const duration = Date.now() - startTime;
          logger.info('Job processed successfully', { 
            queueName, 
            jobId: job.id,
            duration 
          });
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          logger.error('Job processing failed', { 
            queueName, 
            jobId: job.id,
            duration,
            error: error.message,
            stack: error.stack 
          });
          throw error;
        }
      };
      
      // Start processing
      queue.process(concurrency, wrappedProcessor);
      
      logger.info('Queue processor started', { 
        queueName, 
        concurrency 
      });
    } catch (error) {
      logger.error('Error setting up queue processor', { 
        queueName, 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status information
   */
  async getJobStatus(jobId, queueName) {
    try {
      const queue = this.createQueue(queueName);
      const job = await queue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      const state = await job.getState();
      const progress = job.progress();
      
      return {
        id: job.id,
        state,
        progress,
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null
      };
    } catch (error) {
      logger.error('Error getting job status', { 
        queueName,
        jobId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Retry a failed job
   * @param {string} queueName - Name of the queue
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Retried job
   */
  async retryFailedJob(jobId, queueName) {
    try {
      const queue = this.createQueue(queueName);
      const job = await queue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      const state = await job.getState();
      if (state !== 'failed') {
        throw new Error(`Cannot retry job in state: ${state}`);
      }

      // Retry the job
      await job.retry();
      
      logger.info('Job retry initiated', { 
        queueName, 
        jobId 
      });

      return job;
    } catch (error) {
      logger.error('Error retrying job', { 
        queueName,
        jobId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clean old jobs from queue
   * @param {string} queueName - Name of the queue
   * @param {number} age - Age in milliseconds
   * @param {string} status - Job status to clean (completed/failed)
   * @returns {Promise<Array>} Removed jobs
   */
  async cleanQueue(queueName, age = 86400000, status = 'completed') {
    try {
      const queue = this.createQueue(queueName);
      const validStatuses = ['completed', 'failed', 'delayed', 'wait', 'active'];
      
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      // Clean jobs older than specified age
      const jobs = await queue.clean(age, status);
      
      logger.info('Queue cleaned', { 
        queueName, 
        status,
        removedCount: jobs.length,
        age 
      });

      return jobs;
    } catch (error) {
      logger.error('Error cleaning queue', { 
        queueName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Name of the queue
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats(queueName) {
    try {
      const queue = this.createQueue(queueName);
      
      // Get job counts
      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
        pausedCount
      ] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused()
      ]);

      // Get sample jobs
      const [
        waitingJobs,
        activeJobs,
        completedJobs,
        failedJobs
      ] = await Promise.all([
        queue.getWaiting(0, 5),
        queue.getActive(0, 5),
        queue.getCompleted(0, 5),
        queue.getFailed(0, 5)
      ]);

      return {
        name: queueName,
        counts: {
          waiting: waitingCount,
          active: activeCount,
          completed: completedCount,
          failed: failedCount,
          delayed: delayedCount
        },
        isPaused: pausedCount,
        samples: {
          waiting: waitingJobs.map(job => ({
            id: job.id,
            data: job.data,
            createdAt: new Date(job.timestamp)
          })),
          active: activeJobs.map(job => ({
            id: job.id,
            data: job.data,
            startedAt: new Date(job.processedOn)
          })),
          completed: completedJobs.map(job => ({
            id: job.id,
            data: job.data,
            completedAt: new Date(job.finishedOn),
            result: job.returnvalue
          })),
          failed: failedJobs.map(job => ({
            id: job.id,
            data: job.data,
            failedAt: new Date(job.finishedOn),
            reason: job.failedReason
          }))
        }
      };
    } catch (error) {
      logger.error('Error getting queue stats', { 
        queueName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Pause a queue
   * @param {string} queueName - Name of the queue
   */
  async pauseQueue(queueName) {
    try {
      const queue = this.createQueue(queueName);
      await queue.pause();
      logger.info('Queue paused', { queueName });
    } catch (error) {
      logger.error('Error pausing queue', { 
        queueName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Resume a queue
   * @param {string} queueName - Name of the queue
   */
  async resumeQueue(queueName) {
    try {
      const queue = this.createQueue(queueName);
      await queue.resume();
      logger.info('Queue resumed', { queueName });
    } catch (error) {
      logger.error('Error resuming queue', { 
        queueName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Close all queues
   */
  async closeAll() {
    try {
      const closePromises = [];
      
      for (const [queueName, queue] of queues) {
        closePromises.push(queue.close());
      }
      
      await Promise.all(closePromises);
      queues.clear();
      
      logger.info('All queues closed');
    } catch (error) {
      logger.error('Error closing queues', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all active queues
   * @returns {Array} List of queue names
   */
  getActiveQueues() {
    return Array.from(queues.keys());
  }
}

// Export singleton instance
module.exports = new JobQueueService();