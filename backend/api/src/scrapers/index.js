/**
 * Initialize and manage all scrapers
 */

const PartScraper = require('./part_scraper');
const AutoZoneScraper = require('./sites/autozone_scraper');
const RockAutoScraper = require('./sites/rockauto_scraper');
const AmazonScraper = require('./sites/amazon_scraper');
const EbayScraper = require('./sites/ebay_scraper');
const PartsGeekScraper = require('./sites/partsgeek_scraper');
const logger = require('../utils/logger');

class ScraperManager {
  constructor() {
    this.partScraper = null;
    this.browser = null;
    this.isInitialized = false;
  }

  /**
   * Initialize all scrapers
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info('Scrapers already initialized');
      return;
    }

    try {
      logger.info('Initializing scrapers...');
      
      // Create main scraper instance
      this.partScraper = new PartScraper();
      
      // Initialize browser
      this.browser = await this.partScraper.initBrowser();
      
      // Register site-specific scrapers
      this.partScraper.registerScraper('autozone', new AutoZoneScraper(this.browser));
      this.partScraper.registerScraper('rockauto', new RockAutoScraper(this.browser));
      this.partScraper.registerScraper('amazon', new AmazonScraper(this.browser));
      this.partScraper.registerScraper('ebay', new EbayScraper(this.browser));
      this.partScraper.registerScraper('partsgeek', new PartsGeekScraper(this.browser));
      
      this.isInitialized = true;
      logger.info('All scrapers initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize scrapers:', error);
      throw error;
    }
  }

  /**
   * Scrape all sites
   */
  async scrapeAll(config = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results = {
      success: [],
      failed: [],
      totalParts: 0,
      startTime: new Date(),
    };

    const sites = ['autozone', 'rockauto', 'amazon', 'ebay', 'partsgeek'];
    
    for (const site of sites) {
      try {
        logger.info(`Starting scrape for ${site}`);
        const siteResult = await this.partScraper.scrapeSite(site, config[site] || {});
        
        results.success.push({
          site,
          ...siteResult,
        });
        
        results.totalParts += siteResult.partsCount;
      } catch (error) {
        logger.error(`Failed to scrape ${site}:`, error);
        results.failed.push({
          site,
          error: error.message,
        });
      }
      
      // Delay between sites
      await this.delay(5000);
    }

    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;
    
    return results;
  }

  /**
   * Scrape a specific site
   */
  async scrapeSite(siteName, config = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.partScraper.scrapeSite(siteName, config);
  }

  /**
   * Schedule scraping jobs
   */
  async scheduleScraping(interval = 'daily') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.partScraper.scheduleScraping(interval);
    logger.info(`Scheduled ${interval} scraping for all sites`);
  }

  /**
   * Get scraping statistics
   */
  async getStatistics() {
    if (!this.isInitialized) {
      return {
        error: 'Scrapers not initialized',
      };
    }

    return await this.partScraper.getStatistics();
  }

  /**
   * Add a scraping job to queue
   */
  async addScrapingJob(site, config = {}, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const job = await this.partScraper.scrapingQueue.add(
      'scrape-site',
      { site, config },
      options
    );

    logger.info(`Added scraping job ${job.id} for ${site}`);
    return job;
  }

  /**
   * Get queue status
   */
  async getQueueStatus() {
    if (!this.isInitialized) {
      return null;
    }

    const jobCounts = await this.partScraper.scrapingQueue.getJobCounts();
    const workers = await this.partScraper.scrapingQueue.getWorkers();
    
    return {
      jobCounts,
      workers: workers.length,
      isPaused: await this.partScraper.scrapingQueue.isPaused(),
    };
  }

  /**
   * Pause scraping
   */
  async pauseScraping() {
    if (this.partScraper && this.partScraper.scrapingQueue) {
      await this.partScraper.scrapingQueue.pause();
      logger.info('Scraping paused');
    }
  }

  /**
   * Resume scraping
   */
  async resumeScraping() {
    if (this.partScraper && this.partScraper.scrapingQueue) {
      await this.partScraper.scrapingQueue.resume();
      logger.info('Scraping resumed');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    logger.info('Cleaning up scrapers...');
    
    if (this.partScraper) {
      await this.partScraper.cleanup();
    }
    
    this.isInitialized = false;
    logger.info('Scrapers cleaned up');
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const scraperManager = new ScraperManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, cleaning up scrapers...');
  await scraperManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, cleaning up scrapers...');
  await scraperManager.cleanup();
  process.exit(0);
});

module.exports = scraperManager;