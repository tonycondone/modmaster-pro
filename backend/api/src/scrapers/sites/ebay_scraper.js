/**
 * eBay automotive parts scraper
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class EbayScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.ebay.com';
    this.motorsUrl = 'https://www.ebay.com/b/Auto-Parts-Accessories/6000/bn_569479';
  }

  /**
   * Main scraping function
   */
  async scrape(config = {}) {
    const { 
      categories = [
        'Brakes-Parts',
        'Engine-Cooling',
        'Filters',
        'Ignition-Systems',
        'Suspension-Steering'
      ],
      maxPartsPerCategory = 20 
    } = config;
    
    const allParts = [];
    
    for (const category of categories) {
      try {
        logger.info(`Scraping eBay category: ${category}`);
        const parts = await this.scrapeCategory(category, maxPartsPerCategory);
        allParts.push(...parts);
        
        await this.delay(3000 + Math.random() * 3000);
      } catch (error) {
        logger.error(`Error scraping eBay category ${category}:`, error);
      }
    }
    
    return allParts;
  }

  /**
   * Scrape a specific category
   */
  async scrapeCategory(category, maxParts) {
    const page = await this.browser.newPage();
    const parts = [];
    
    try {
      const url = `${this.motorsUrl}?_nkw=${category}&rt=nc&_sacat=6000`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for listings
      await page.waitForSelector('.s-item', { timeout: 10000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      $('.s-item').each((index, element) => {
        if (parts.length >= maxParts) return false;
        
        const part = this.extractPartData($, element, category);
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
   * Extract part data from listing
   */
  extractPartData($, element, category) {
    const $item = $(element);
    
    // Skip promoted listings header
    if ($item.hasClass('s-item--before-answer')) return null;
    
    const title = $item.find('.s-item__title').text().trim();
    if (!title || title === 'Shop on eBay') return null;
    
    const price = $item.find('.s-item__price').text().trim();
    const image = $item.find('.s-item__image-img').attr('src');
    const link = $item.find('.s-item__link').attr('href');
    const condition = $item.find('.SECONDARY_INFO').text().trim();
    const shipping = $item.find('.s-item__shipping').text().trim();
    const seller = $item.find('.s-item__seller-info-text').text().trim();
    
    // Extract item ID from URL
    const itemId = link?.match(/itm\/(\d+)/)?.[1];
    
    return {
      name: title,
      brand: this.extractBrand(title),
      price,
      category: this.normalizeCategory(category),
      images: image ? [image] : [],
      url: link,
      condition: condition || 'Used',
      availability: 'in-stock',
      seller: seller || 'eBay Seller',
      shippingInfo: {
        text: shipping,
        isFreeShipping: shipping.toLowerCase().includes('free'),
      },
      sourceId: itemId,
    };
  }

  /**
   * Extract brand from title
   */
  extractBrand(title) {
    const brands = [
      'ACDelco', 'Bosch', 'Wagner', 'Motorcraft', 'Gates',
      'Moog', 'Monroe', 'KYB', 'Timken', 'NGK', 'Denso'
    ];
    
    const titleUpper = title.toUpperCase();
    for (const brand of brands) {
      if (titleUpper.includes(brand.toUpperCase())) {
        return brand;
      }
    }
    
    // Try to get first word as brand
    const firstWord = title.split(' ')[0];
    return firstWord.length > 2 ? firstWord : 'Generic';
  }

  /**
   * Normalize category name
   */
  normalizeCategory(category) {
    const categoryMap = {
      'Brakes-Parts': 'Brakes',
      'Engine-Cooling': 'Cooling',
      'Filters': 'Engine Parts',
      'Ignition-Systems': 'Ignition System',
      'Suspension-Steering': 'Suspension',
    };
    
    return categoryMap[category] || 'General';
  }

  /**
   * Random delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EbayScraper;