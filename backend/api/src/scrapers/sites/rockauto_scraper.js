/**
 * RockAuto parts scraper
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class RockAutoScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.rockauto.com';
    this.catalogUrl = 'https://www.rockauto.com/en/catalog';
  }

  /**
   * Main scraping function
   */
  async scrape(config = {}) {
    const { 
      makes = ['HONDA', 'TOYOTA', 'FORD', 'CHEVROLET'],
      years = [2020, 2019, 2018],
      maxPartsPerVehicle = 30 
    } = config;
    
    const allParts = [];
    
    for (const make of makes) {
      for (const year of years) {
        try {
          logger.info(`Scraping RockAuto for ${year} ${make}`);
          const parts = await this.scrapeVehicleParts(make, year, maxPartsPerVehicle);
          allParts.push(...parts);
          
          // Random delay
          await this.delay(3000 + Math.random() * 3000);
        } catch (error) {
          logger.error(`Error scraping ${year} ${make}:`, error);
        }
      }
    }
    
    return allParts;
  }

  /**
   * Scrape parts for a specific vehicle
   */
  async scrapeVehicleParts(make, year, maxParts) {
    const page = await this.browser.newPage();
    const parts = [];
    
    try {
      // Navigate to catalog
      await page.goto(this.catalogUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Select make
      await page.waitForSelector(`a[href*="${make.toLowerCase()}"]`, { timeout: 10000 });
      await page.click(`a[href*="${make.toLowerCase()}"]`);
      await page.waitForNavigation();
      
      // Select year
      await page.waitForSelector(`a[href*=",${year},"]`, { timeout: 10000 });
      await page.click(`a[href*=",${year},"]`);
      await page.waitForNavigation();
      
      // Select first available model
      await page.waitForSelector('.ranavnode', { timeout: 10000 });
      const models = await page.$$('.ranavnode a');
      if (models.length > 0) {
        await models[0].click();
        await page.waitForNavigation();
      }
      
      // Get categories
      const categories = await page.$$eval('.ranavnode a', links => 
        links.slice(0, 5).map(link => link.href)
      );
      
      // Scrape parts from each category
      for (const categoryUrl of categories) {
        if (parts.length >= maxParts) break;
        
        try {
          const categoryParts = await this.scrapeCategoryPage(categoryUrl, make, year);
          parts.push(...categoryParts);
          
          await this.delay(2000 + Math.random() * 2000);
        } catch (error) {
          logger.error(`Error scraping category ${categoryUrl}:`, error);
        }
      }
      
    } finally {
      await page.close();
    }
    
    return parts.slice(0, maxParts);
  }

  /**
   * Scrape parts from a category page
   */
  async scrapeCategoryPage(url, make, year) {
    const page = await this.browser.newPage();
    const parts = [];
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for parts listing
      await page.waitForSelector('.listing-text-row', { timeout: 10000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract category name
      const category = $('.navtitle').last().text().trim();
      
      // Extract parts
      $('.listing-text-row').each((index, element) => {
        try {
          const part = this.extractPartData($, element, category, make, year);
          if (part) {
            parts.push(part);
          }
        } catch (error) {
          logger.error('Error extracting part:', error);
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
  extractPartData($, element, category, make, year) {
    const $row = $(element);
    
    // Extract basic info
    const brand = $row.find('.listing-text-row-mfg-brand span').first().text().trim();
    const partNumber = $row.find('.listing-text-row-partnumber span').text().trim();
    const name = $row.find('.listing-text-row span[id^="vdesc_"]').text().trim();
    
    if (!name || !partNumber) return null;
    
    // Extract price
    const priceText = $row.find('.listing-text-row-price').text().trim();
    const price = priceText.match(/\$?([\d.]+)/)?.[1];
    
    // Extract additional info
    const infoText = $row.find('.listing-text-row-moreinfo span').text().trim();
    const features = infoText ? infoText.split(';').map(f => f.trim()) : [];
    
    // Extract image
    const image = $row.find('.listing-inline-image img').attr('src');
    
    // Build compatibility
    const compatibility = [{
      yearStart: year,
      yearEnd: year,
      make: make,
      model: 'Various Models',
    }];
    
    return {
      name: `${brand} ${name}`,
      brand,
      partNumber,
      price,
      category,
      subcategory: this.normalizeCategory(category),
      images: image ? [this.normalizeImageUrl(image)] : [],
      url: `${this.baseUrl}/en/partsearch/?partnum=${partNumber}`,
      availability: 'check-availability',
      condition: 'new',
      compatibility: JSON.stringify(compatibility),
      features,
      specifications: {
        warranty: this.extractWarranty(infoText),
      },
    };
  }

  /**
   * Normalize category name
   */
  normalizeCategory(category) {
    if (!category) return 'Uncategorized';
    
    const categoryMap = {
      'Brake & Wheel Hub': 'Brakes',
      'Engine': 'Engine Parts',
      'Ignition': 'Ignition System',
      'Exhaust & Emission': 'Exhaust',
      'Suspension & Steering': 'Suspension',
      'Transmission & Drivetrain': 'Transmission',
      'Cooling System': 'Cooling',
      'Fuel & Air': 'Fuel System',
      'Electrical': 'Electrical',
      'Body': 'Body Parts',
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key)) {
        return value;
      }
    }
    
    return category;
  }

  /**
   * Extract warranty information
   */
  extractWarranty(text) {
    if (!text) return null;
    
    const warrantyMatch = text.match(/(\d+)\s*(year|month|day)/i);
    if (warrantyMatch) {
      return `${warrantyMatch[1]} ${warrantyMatch[2]}${parseInt(warrantyMatch[1]) > 1 ? 's' : ''}`;
    }
    
    if (text.toLowerCase().includes('lifetime')) {
      return 'Lifetime';
    }
    
    return null;
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

module.exports = RockAutoScraper;