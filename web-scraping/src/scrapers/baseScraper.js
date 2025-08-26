const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const config = require('../config');

class BaseScraper {
  constructor(platform) {
    this.platform = platform;
    this.config = config.platforms[platform] || {};
    this.requiresBrowser = false;
    this.lastRequestTime = 0;
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = this.config.rateLimit || 1000;

    if (timeSinceLastRequest < minDelay) {
      const delay = minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  async fetchHtml(url, options = {}) {
    await this.rateLimit();

    const headers = {
      'User-Agent': options.userAgent || config.scraping.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...options.headers,
    };

    try {
      const response = await axios.get(url, {
        headers,
        timeout: config.scraping.timeout,
        maxRedirects: 5,
      });

      return response.data;
    } catch (error) {
      logger.error(`Error fetching ${url}:`, error.message);
      throw error;
    }
  }

  async fetchWithBrowser(page, url, options = {}) {
    await this.rateLimit();

    try {
      // Set user agent
      if (options.userAgent) {
        await page.setExtraHTTPHeaders({
          'User-Agent': options.userAgent,
        });
      }

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.scraping.timeout,
      });

      // Wait for specific elements if needed
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: 10000,
        });
      }

      // Get page content
      const html = await page.content();
      return html;

    } catch (error) {
      logger.error(`Error fetching ${url} with browser:`, error.message);
      throw error;
    }
  }

  parsePrice(priceText) {
    if (!priceText) return null;

    // Remove currency symbols and non-numeric characters
    const cleanPrice = priceText
      .replace(/[^0-9.,]/g, '')
      .replace(',', '');

    const price = parseFloat(cleanPrice);
    return isNaN(price) ? null : price;
  }

  parseAvailability(availabilityText) {
    if (!availabilityText) return 'unknown';

    const text = availabilityText.toLowerCase();
    
    if (text.includes('in stock') || text.includes('available')) {
      return 'in_stock';
    } else if (text.includes('out of stock') || text.includes('unavailable')) {
      return 'out_of_stock';
    } else if (text.includes('low stock') || text.includes('limited')) {
      return 'low_stock';
    }

    return 'unknown';
  }

  extractImageUrl(imageUrl, baseUrl) {
    if (!imageUrl) return null;

    // Handle relative URLs
    if (imageUrl.startsWith('//')) {
      return 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      return new URL(imageUrl, baseUrl).href;
    }

    return imageUrl;
  }

  async scrapeProduct(url, options = {}) {
    throw new Error('scrapeProduct method must be implemented by subclass');
  }

  async searchProducts(query, options = {}) {
    throw new Error('searchProducts method must be implemented by subclass');
  }
}

module.exports = BaseScraper;