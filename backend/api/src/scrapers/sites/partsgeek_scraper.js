/**
 * PartsGeek automotive parts scraper
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class PartsGeekScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.partsgeek.com';
  }

  /**
   * Main scraping function
   */
  async scrape(config = {}) {
    const { 
      categories = [
        '/brake-parts',
        '/engine-parts',
        '/suspension-parts',
        '/cooling-system',
        '/ignition-parts'
      ],
      maxPartsPerCategory = 25 
    } = config;
    
    const allParts = [];
    
    for (const category of categories) {
      try {
        logger.info(`Scraping PartsGeek category: ${category}`);
        const parts = await this.scrapeCategory(category, maxPartsPerCategory);
        allParts.push(...parts);
        
        await this.delay(2000 + Math.random() * 3000);
      } catch (error) {
        logger.error(`Error scraping PartsGeek category ${category}:`, error);
      }
    }
    
    return allParts;
  }

  /**
   * Scrape a specific category
   */
  async scrapeCategory(categoryPath, maxParts) {
    const page = await this.browser.newPage();
    const parts = [];
    
    try {
      const url = `${this.baseUrl}${categoryPath}`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for product grid
      await page.waitForSelector('.product-item', { timeout: 10000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      $('.product-item').each((index, element) => {
        if (parts.length >= maxParts) return false;
        
        const part = this.extractPartData($, element, categoryPath);
        if (part) {
          parts.push(part);
        }
      });
      
    } finally {
      await page.close();
    }
    
    return parts;
  }

  /**
   * Extract part data from element
   */
  extractPartData($, element, categoryPath) {
    const $item = $(element);
    
    const name = $item.find('.product-name').text().trim();
    const brand = $item.find('.brand-name').text().trim();
    const price = $item.find('.price-now').text().trim();
    const originalPrice = $item.find('.price-was').text().trim();
    const image = $item.find('.product-image img').attr('src');
    const link = $item.find('.product-name a').attr('href');
    const partNumber = $item.find('.part-number').text().replace('Part #:', '').trim();
    
    if (!name || !price) return null;
    
    // Extract rating
    const ratingWidth = $item.find('.rating-stars .fill').css('width');
    const rating = ratingWidth ? (parseFloat(ratingWidth) / 20) : null;
    
    return {
      name,
      brand: brand || 'Generic',
      price,
      originalPrice: originalPrice || null,
      partNumber,
      category: this.getCategoryFromPath(categoryPath),
      images: image ? [this.normalizeImageUrl(image)] : [],
      url: link ? `${this.baseUrl}${link}` : null,
      rating,
      availability: 'in-stock',
      condition: 'new',
      seller: 'PartsGeek',
    };
  }

  /**
   * Get category from path
   */
  getCategoryFromPath(path) {
    const categoryMap = {
      'brake-parts': 'Brakes',
      'engine-parts': 'Engine Parts',
      'suspension-parts': 'Suspension',
      'cooling-system': 'Cooling',
      'ignition-parts': 'Ignition System',
    };
    
    const key = path.replace('/', '');
    return categoryMap[key] || 'General';
  }

  /**
   * Normalize image URL
   */
  normalizeImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) return `${this.baseUrl}${url}`;
    return url;
  }

  /**
   * Random delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = PartsGeekScraper;