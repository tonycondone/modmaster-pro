/**
 * Main scraping engine for automotive parts data.
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const logger = require('../utils/logger');
const { Part } = require('../models');
const redis = require('../utils/redis');
const crypto = require('crypto');
const { RateLimiter } = require('limiter');
const Bull = require('bull');

class PartScraper {
  constructor() {
    this.browser = null;
    this.scrapers = new Map();
    this.scrapingQueue = new Bull('scraping-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
    });
    
    // Rate limiters for each site
    this.rateLimiters = {
      autozone: new RateLimiter({ tokensPerInterval: 10, interval: 'minute' }),
      rockauto: new RateLimiter({ tokensPerInterval: 5, interval: 'minute' }),
      amazon: new RateLimiter({ tokensPerInterval: 3, interval: 'minute' }),
      ebay: new RateLimiter({ tokensPerInterval: 5, interval: 'minute' }),
      partsgeek: new RateLimiter({ tokensPerInterval: 8, interval: 'minute' }),
    };
    
    this.setupQueue();
  }

  /**
   * Initialize the browser instance
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Setup job queue processing
   */
  setupQueue() {
    // Process scraping jobs
    this.scrapingQueue.process('scrape-site', async (job) => {
      const { site, config } = job.data;
      return await this.scrapeSite(site, config);
    });

    // Handle failed jobs
    this.scrapingQueue.on('failed', (job, err) => {
      logger.error(`Scraping job ${job.id} failed:`, err);
    });

    // Handle completed jobs
    this.scrapingQueue.on('completed', (job, result) => {
      logger.info(`Scraping job ${job.id} completed. Parts found: ${result.partsCount}`);
    });
  }

  /**
   * Register a site-specific scraper
   */
  registerScraper(siteName, scraper) {
    this.scrapers.set(siteName, scraper);
    logger.info(`Registered scraper for ${siteName}`);
  }

  /**
   * Scrape a specific site
   */
  async scrapeSite(siteName, config = {}) {
    const scraper = this.scrapers.get(siteName);
    if (!scraper) {
      throw new Error(`No scraper registered for site: ${siteName}`);
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters[siteName];
    if (rateLimiter) {
      const remainingTokens = await rateLimiter.removeTokens(1);
      if (remainingTokens < 0) {
        throw new Error(`Rate limit exceeded for ${siteName}`);
      }
    }

    try {
      logger.info(`Starting scrape for ${siteName}`);
      const startTime = Date.now();
      
      // Run the scraper
      const parts = await scraper.scrape(config);
      
      // Process and save parts
      const savedParts = await this.processParts(parts, siteName);
      
      const duration = Date.now() - startTime;
      logger.info(`Scraping ${siteName} completed in ${duration}ms. Parts: ${savedParts.length}`);
      
      return {
        site: siteName,
        partsCount: savedParts.length,
        duration,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`Error scraping ${siteName}:`, error);
      throw error;
    }
  }

  /**
   * Process and save scraped parts
   */
  async processParts(partsData, source) {
    const savedParts = [];
    
    for (const partData of partsData) {
      try {
        // Normalize the data
        const normalizedData = this.normalizePartData(partData, source);
        
        // Check for duplicates
        const isDuplicate = await this.detectDuplicate(normalizedData);
        if (isDuplicate) {
          logger.debug(`Duplicate part found: ${normalizedData.name}`);
          continue;
        }
        
        // Save to database
        const savedPart = await this.savePart(normalizedData);
        savedParts.push(savedPart);
        
        // Update cache
        await this.updateCache(savedPart);
      } catch (error) {
        logger.error(`Error processing part:`, error, partData);
      }
    }
    
    return savedParts;
  }

  /**
   * Normalize part data from different sources
   */
  normalizePartData(rawData, source) {
    return {
      name: this.cleanText(rawData.name || rawData.title),
      description: this.cleanText(rawData.description || ''),
      price: this.parsePrice(rawData.price),
      originalPrice: rawData.originalPrice ? this.parsePrice(rawData.originalPrice) : null,
      brand: this.cleanText(rawData.brand || rawData.manufacturer || ''),
      partNumber: rawData.partNumber || rawData.sku || '',
      category: rawData.category || 'Uncategorized',
      subcategory: rawData.subcategory || '',
      images: this.normalizeImages(rawData.images || rawData.image),
      availability: rawData.availability || rawData.inStock || 'unknown',
      condition: rawData.condition || 'new',
      compatibleVehicles: this.parseCompatibility(rawData.compatibility || rawData.fitment),
      specifications: rawData.specifications || {},
      source: source,
      sourceUrl: rawData.url || rawData.link,
      sourceId: rawData.id || this.generateSourceId(rawData),
      rating: rawData.rating || null,
      reviewCount: rawData.reviewCount || 0,
      seller: rawData.seller || source,
      shippingInfo: rawData.shipping || {},
      lastUpdated: new Date(),
    };
  }

  /**
   * Clean text data
   */
  cleanText(text) {
    if (!text) return '';
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E]/g, ''); // Remove non-ASCII characters
  }

  /**
   * Parse price from various formats
   */
  parsePrice(priceStr) {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return null;
    
    // Remove currency symbols and extract number
    const cleaned = priceStr.toString().replace(/[^0-9.,]/g, '');
    const price = parseFloat(cleaned.replace(',', ''));
    
    return isNaN(price) ? null : price;
  }

  /**
   * Normalize image URLs
   */
  normalizeImages(images) {
    if (!images) return [];
    if (typeof images === 'string') return [images];
    if (Array.isArray(images)) return images.filter(img => img && typeof img === 'string');
    return [];
  }

  /**
   * Parse vehicle compatibility data
   */
  parseCompatibility(compatData) {
    if (!compatData) return [];
    
    // Handle different formats
    if (typeof compatData === 'string') {
      // Parse string format: "2010-2015 Honda Civic, 2012-2018 Toyota Camry"
      return compatData.split(',').map(item => {
        const match = item.trim().match(/(\d{4})-?(\d{4})?\s+(.+)/);
        if (match) {
          return {
            yearStart: parseInt(match[1]),
            yearEnd: parseInt(match[2] || match[1]),
            make: match[3].split(' ')[0],
            model: match[3].split(' ').slice(1).join(' '),
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    if (Array.isArray(compatData)) {
      return compatData.map(item => ({
        yearStart: item.yearStart || item.year_start,
        yearEnd: item.yearEnd || item.year_end || item.yearStart || item.year_start,
        make: item.make,
        model: item.model,
        submodel: item.submodel || '',
        engine: item.engine || '',
      }));
    }
    
    return [];
  }

  /**
   * Generate a unique source ID
   */
  generateSourceId(data) {
    const str = `${data.name}-${data.brand}-${data.partNumber}`;
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 16);
  }

  /**
   * Detect duplicate parts
   */
  async detectDuplicate(partData) {
    // Check by part number if available
    if (partData.partNumber) {
      const existing = await Part.findOne({
        where: {
          partNumber: partData.partNumber,
          source: partData.source,
        },
      });
      if (existing) return true;
    }
    
    // Check by source ID
    if (partData.sourceId) {
      const existing = await Part.findOne({
        where: {
          sourceId: partData.sourceId,
          source: partData.source,
        },
      });
      if (existing) return true;
    }
    
    // Fuzzy matching for similar parts
    const similarParts = await Part.findAll({
      where: {
        name: {
          [Op.iLike]: `%${partData.name.substring(0, 20)}%`,
        },
        brand: partData.brand,
      },
      limit: 5,
    });
    
    // Calculate similarity score
    for (const similar of similarParts) {
      const score = this.calculateSimilarity(partData, similar);
      if (score > 0.9) return true;
    }
    
    return false;
  }

  /**
   * Calculate similarity between two parts
   */
  calculateSimilarity(part1, part2) {
    let score = 0;
    let factors = 0;
    
    // Name similarity
    if (part1.name && part2.name) {
      const nameSim = this.stringSimilarity(part1.name, part2.name);
      score += nameSim * 0.3;
      factors += 0.3;
    }
    
    // Brand match
    if (part1.brand === part2.brand) {
      score += 0.2;
    }
    factors += 0.2;
    
    // Part number match
    if (part1.partNumber && part2.partNumber && part1.partNumber === part2.partNumber) {
      score += 0.3;
    }
    factors += 0.3;
    
    // Price similarity (within 10%)
    if (part1.price && part2.price) {
      const priceDiff = Math.abs(part1.price - part2.price) / Math.max(part1.price, part2.price);
      if (priceDiff < 0.1) {
        score += 0.2;
      }
    }
    factors += 0.2;
    
    return factors > 0 ? score / factors : 0;
  }

  /**
   * Simple string similarity calculation
   */
  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Save part to database
   */
  async savePart(partData) {
    try {
      const part = await Part.create(partData);
      return part;
    } catch (error) {
      logger.error('Error saving part:', error);
      throw error;
    }
  }

  /**
   * Update cache with new part data
   */
  async updateCache(part) {
    try {
      const cacheKey = `part:${part.id}`;
      await redis.setex(cacheKey, 3600, JSON.stringify(part));
      
      // Update category cache
      const categoryKey = `parts:category:${part.category}`;
      await redis.sadd(categoryKey, part.id);
      await redis.expire(categoryKey, 3600);
    } catch (error) {
      logger.warn('Cache update failed:', error);
    }
  }

  /**
   * Schedule regular scraping
   */
  async scheduleScraping(interval = 'daily') {
    const sites = Array.from(this.scrapers.keys());
    
    for (const site of sites) {
      let cron;
      switch (interval) {
        case 'hourly':
          cron = '0 * * * *';
          break;
        case 'daily':
          cron = '0 2 * * *'; // 2 AM daily
          break;
        case 'weekly':
          cron = '0 2 * * 0'; // Sunday 2 AM
          break;
        default:
          cron = '0 2 * * *';
      }
      
      // Add recurring job
      await this.scrapingQueue.add(
        'scrape-site',
        { site, config: {} },
        {
          repeat: { cron },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
      
      logger.info(`Scheduled ${interval} scraping for ${site}`);
    }
  }

  /**
   * Get scraping statistics
   */
  async getStatistics() {
    const stats = {
      totalParts: await Part.count(),
      partsBySite: {},
      lastUpdated: {},
      queueStatus: await this.scrapingQueue.getJobCounts(),
    };
    
    // Get parts count by source
    const sources = await Part.findAll({
      attributes: [
        'source',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      group: ['source'],
    });
    
    sources.forEach(source => {
      stats.partsBySite[source.source] = source.get('count');
    });
    
    // Get last update time for each source
    const lastUpdates = await Part.findAll({
      attributes: [
        'source',
        [Sequelize.fn('MAX', Sequelize.col('lastUpdated')), 'lastUpdate'],
      ],
      group: ['source'],
    });
    
    lastUpdates.forEach(update => {
      stats.lastUpdated[update.source] = update.get('lastUpdate');
    });
    
    return stats;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await this.scrapingQueue.close();
  }
}

module.exports = PartScraper;