const { chromium } = require('playwright');
const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const userAgent = require('user-agents');
const logger = require('../utils/logger');
const config = require('../config');
const { redis } = require('../utils/redis');

class ScraperManager {
  constructor() {
    this.browser = null;
    this.scrapers = new Map();
    this.initializeScrapers();
  }

  initializeScrapers() {
    // Import platform-specific scrapers
    const AmazonScraper = require('../scrapers/amazonScraper');
    const EbayScraper = require('../scrapers/ebayScraper');
    const AutoZoneScraper = require('../scrapers/autozoneScraper');
    const SummitRacingScraper = require('../scrapers/summitRacingScraper');
    
    // Register scrapers
    this.scrapers.set('amazon', new AmazonScraper());
    this.scrapers.set('ebay', new EbayScraper());
    this.scrapers.set('autozone', new AutoZoneScraper());
    this.scrapers.set('summit_racing', new SummitRacingScraper());
  }

  async initializeBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-features=IsolateOrigins',
          '--disable-site-isolation-trials',
        ],
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeProduct(platform, productUrl, options = {}) {
    const scraper = this.scrapers.get(platform);
    if (!scraper) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Check cache first
    const cacheKey = `scrape:${platform}:${productUrl}`;
    const cached = await redis.get(cacheKey);
    if (cached && !options.forceRefresh) {
      logger.info(`Cache hit for ${productUrl}`);
      return JSON.parse(cached);
    }

    try {
      // Initialize browser if needed
      if (scraper.requiresBrowser && !this.browser) {
        await this.initializeBrowser();
      }

      // Scrape the product
      const result = await scraper.scrapeProduct(productUrl, {
        browser: this.browser,
        userAgent: new userAgent().toString(),
        ...options,
      });

      // Cache the result
      await redis.setex(
        cacheKey,
        config.scraping.cacheExpiry,
        JSON.stringify(result)
      );

      logger.info(`Successfully scraped ${productUrl}`);
      return result;

    } catch (error) {
      logger.error(`Error scraping ${productUrl}:`, error);
      throw error;
    }
  }

  async searchProducts(platform, searchQuery, options = {}) {
    const scraper = this.scrapers.get(platform);
    if (!scraper) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Check cache
    const cacheKey = `search:${platform}:${searchQuery}:${JSON.stringify(options)}`;
    const cached = await redis.get(cacheKey);
    if (cached && !options.forceRefresh) {
      logger.info(`Cache hit for search: ${searchQuery}`);
      return JSON.parse(cached);
    }

    try {
      // Initialize browser if needed
      if (scraper.requiresBrowser && !this.browser) {
        await this.initializeBrowser();
      }

      // Search for products
      const results = await scraper.searchProducts(searchQuery, {
        browser: this.browser,
        userAgent: new userAgent().toString(),
        limit: options.limit || 10,
        ...options,
      });

      // Cache the results
      await redis.setex(
        cacheKey,
        config.scraping.cacheExpiry,
        JSON.stringify(results)
      );

      logger.info(`Successfully searched for "${searchQuery}" on ${platform}`);
      return results;

    } catch (error) {
      logger.error(`Error searching "${searchQuery}" on ${platform}:`, error);
      throw error;
    }
  }

  async scrapeMultiplePlatforms(productIdentifier, platforms = []) {
    const platformsToScrape = platforms.length > 0 
      ? platforms 
      : Array.from(this.scrapers.keys());

    const results = await Promise.allSettled(
      platformsToScrape.map(platform =>
        this.searchAndScrapeFirst(platform, productIdentifier)
      )
    );

    const successfulResults = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push({
          platform: platformsToScrape[index],
          data: result.value,
        });
      } else {
        errors.push({
          platform: platformsToScrape[index],
          error: result.reason.message,
        });
      }
    });

    return {
      success: successfulResults,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  async searchAndScrapeFirst(platform, searchQuery) {
    // Search for the product
    const searchResults = await this.searchProducts(platform, searchQuery, {
      limit: 1,
    });

    if (searchResults.length === 0) {
      throw new Error(`No results found for "${searchQuery}" on ${platform}`);
    }

    // Scrape the first result
    const firstResult = searchResults[0];
    return this.scrapeProduct(platform, firstResult.url);
  }

  async updatePriceHistory(partId, platform, priceData) {
    try {
      // Get current integration
      const integration = await this.getIntegration(partId, platform);
      
      if (!integration) {
        // Create new integration
        await this.createIntegration(partId, platform, priceData);
      } else {
        // Update existing integration
        await this.updateIntegration(integration.id, priceData);
      }

      logger.info(`Updated price history for part ${partId} on ${platform}`);
    } catch (error) {
      logger.error(`Error updating price history:`, error);
      throw error;
    }
  }

  async getIntegration(partId, platform) {
    // This would query the database
    // Simplified for now
    return null;
  }

  async createIntegration(partId, platform, data) {
    // This would insert into database
    logger.info(`Creating integration for part ${partId} on ${platform}`);
  }

  async updateIntegration(integrationId, data) {
    // This would update database
    logger.info(`Updating integration ${integrationId}`);
  }
}

module.exports = new ScraperManager();