const Bull = require('bull');
const config = require('../config');
const logger = require('../utils/logger');

let scraperQueue;

const initializeQueue = async () => {
  scraperQueue = new Bull('scraper-queue', config.redis.url);

  // Process jobs
  scraperQueue.process('scrape', 5, async (job) => {
    const { platform, url, partId } = job.data;
    logger.info(`Processing scrape job for ${platform}: ${url}`);

    const scraperManager = require('./scraperManager');
    const result = await scraperManager.scrapeProduct(platform, url);

    // Update price history if partId provided
    if (partId) {
      await scraperManager.updatePriceHistory(partId, platform, result);
    }

    return result;
  });

  // Event handlers
  scraperQueue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed`);
  });

  scraperQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });

  logger.info('Queue service initialized');
};

const addScrapeJob = async (data, options = {}) => {
  const job = await scraperQueue.add('scrape', data, {
    ...config.queue.defaultJobOptions,
    ...options,
  });
  
  return job.id;
};

module.exports = {
  initializeQueue,
  addScrapeJob,
};