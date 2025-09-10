/**
 * AutoZone parts scraper
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class AutoZoneScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.autozone.com';
    this.categories = [
      '/aftermarket-parts/brake-pads',
      '/aftermarket-parts/oil-filter',
      '/aftermarket-parts/air-filter',
      '/aftermarket-parts/battery',
      '/aftermarket-parts/spark-plug',
      '/aftermarket-parts/alternator',
      '/aftermarket-parts/radiator',
      '/aftermarket-parts/brake-rotor',
    ];
  }

  /**
   * Main scraping function
   */
  async scrape(config = {}) {
    const { categories = this.categories, maxPages = 5, maxPartsPerCategory = 50 } = config;
    const allParts = [];
    
    for (const category of categories) {
      try {
        logger.info(`Scraping AutoZone category: ${category}`);
        const parts = await this.scrapeCategory(category, maxPages, maxPartsPerCategory);
        allParts.push(...parts);
        
        // Random delay between categories
        await this.delay(2000 + Math.random() * 3000);
      } catch (error) {
        logger.error(`Error scraping category ${category}:`, error);
      }
    }
    
    return allParts;
  }

  /**
   * Scrape a specific category
   */
  async scrapeCategory(categoryPath, maxPages, maxParts) {
    const parts = [];
    let page = 1;
    
    while (page <= maxPages && parts.length < maxParts) {
      const url = `${this.baseUrl}${categoryPath}?page=${page}`;
      
      try {
        const pageParts = await this.scrapePage(url);
        parts.push(...pageParts);
        
        if (pageParts.length === 0) break; // No more parts
        
        page++;
        await this.delay(1000 + Math.random() * 2000);
      } catch (error) {
        logger.error(`Error scraping page ${url}:`, error);
        break;
      }
    }
    
    return parts.slice(0, maxParts);
  }

  /**
   * Scrape a single page
   */
  async scrapePage(url) {
    const page = await this.browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for product listings
      await page.waitForSelector('.product-listing', { timeout: 10000 });
      
      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);
      
      const parts = [];
      
      // Extract parts data
      $('.product-listing .product-item').each((index, element) => {
        try {
          const part = this.extractPartData($, element);
          if (part) {
            parts.push(part);
          }
        } catch (error) {
          logger.error('Error extracting part data:', error);
        }
      });
      
      return parts;
    } finally {
      await page.close();
    }
  }

  /**
   * Extract part data from element
   */
  extractPartData($, element) {
    const $item = $(element);
    
    // Extract basic info
    const name = $item.find('.product-name').text().trim();
    const brand = $item.find('.product-brand').text().trim();
    const price = $item.find('.product-price .price').text().trim();
    const image = $item.find('.product-image img').attr('src');
    const link = $item.find('.product-name a').attr('href');
    
    if (!name || !price) return null;
    
    // Extract part number
    const partNumber = $item.find('.part-number').text().replace('Part #:', '').trim();
    
    // Extract rating
    const ratingText = $item.find('.rating-stars').attr('aria-label');
    const rating = ratingText ? parseFloat(ratingText.match(/[\d.]+/)?.[0] || 0) : null;
    const reviewCount = parseInt($item.find('.review-count').text().match(/\d+/)?.[0] || 0);
    
    // Extract availability
    const availability = $item.find('.availability-status').text().trim();
    const inStock = availability.toLowerCase().includes('in stock');
    
    // Extract compatibility (if shown)
    const compatibility = [];
    $item.find('.fitment-info .vehicle').each((i, el) => {
      compatibility.push($(el).text().trim());
    });
    
    return {
      name,
      brand,
      price,
      originalPrice: $item.find('.product-price .original-price').text().trim() || null,
      partNumber,
      category: this.extractCategory(link),
      images: image ? [this.normalizeImageUrl(image)] : [],
      url: link ? `${this.baseUrl}${link}` : null,
      rating,
      reviewCount,
      availability: inStock ? 'in-stock' : 'out-of-stock',
      compatibility: compatibility.join(', '),
      specifications: {
        warranty: $item.find('.warranty-info').text().trim() || null,
      },
    };
  }

  /**
   * Extract category from URL
   */
  extractCategory(url) {
    if (!url) return 'Uncategorized';
    
    const match = url.match(/\/aftermarket-parts\/([^\/]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    return 'Uncategorized';
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
   * Scrape detailed part information
   */
  async scrapePartDetails(partUrl) {
    const page = await this.browser.newPage();
    
    try {
      await page.goto(partUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract detailed specifications
      const specifications = {};
      $('.product-specifications .spec-item').each((i, el) => {
        const key = $(el).find('.spec-name').text().trim();
        const value = $(el).find('.spec-value').text().trim();
        if (key && value) {
          specifications[key.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      });
      
      // Extract all images
      const images = [];
      $('.product-images img').each((i, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src) {
          images.push(this.normalizeImageUrl(src));
        }
      });
      
      // Extract detailed compatibility
      const compatibility = [];
      $('.compatibility-list .vehicle-item').each((i, el) => {
        const year = $(el).find('.year').text().trim();
        const make = $(el).find('.make').text().trim();
        const model = $(el).find('.model').text().trim();
        const engine = $(el).find('.engine').text().trim();
        
        if (year && make && model) {
          compatibility.push({
            yearStart: parseInt(year.split('-')[0]),
            yearEnd: parseInt(year.split('-')[1] || year.split('-')[0]),
            make,
            model,
            engine,
          });
        }
      });
      
      // Extract features
      const features = [];
      $('.product-features li').each((i, el) => {
        features.push($(el).text().trim());
      });
      
      return {
        specifications,
        images,
        compatibility,
        features,
        description: $('.product-description').text().trim(),
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Random delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AutoZoneScraper;