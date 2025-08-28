/**
 * Amazon automotive parts scraper
 */

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../utils/logger');

class AmazonScraper {
  constructor(browser) {
    this.browser = browser;
    this.baseUrl = 'https://www.amazon.com';
    this.automotiveUrl = 'https://www.amazon.com/s?i=automotive';
    this.searchTerms = [
      'brake pads',
      'oil filter',
      'air filter',
      'spark plugs',
      'car battery',
      'windshield wipers',
      'headlight bulbs',
      'cabin air filter',
    ];
  }

  /**
   * Main scraping function
   */
  async scrape(config = {}) {
    const { searchTerms = this.searchTerms, maxPages = 3, maxPartsPerSearch = 20 } = config;
    const allParts = [];
    
    for (const searchTerm of searchTerms) {
      try {
        logger.info(`Scraping Amazon for: ${searchTerm}`);
        const parts = await this.searchParts(searchTerm, maxPages, maxPartsPerSearch);
        allParts.push(...parts);
        
        // Random delay between searches
        await this.delay(5000 + Math.random() * 5000);
      } catch (error) {
        logger.error(`Error scraping Amazon for ${searchTerm}:`, error);
      }
    }
    
    return allParts;
  }

  /**
   * Search for parts
   */
  async searchParts(searchTerm, maxPages, maxParts) {
    const page = await this.browser.newPage();
    const parts = [];
    
    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Add cookies to appear more human-like
      await page.setCookie({
        name: 'session-id',
        value: '146-9753254-8169519',
        domain: '.amazon.com',
      });
      
      let currentPage = 1;
      let nextUrl = `${this.baseUrl}/s?k=${encodeURIComponent(searchTerm)}&i=automotive`;
      
      while (currentPage <= maxPages && parts.length < maxParts && nextUrl) {
        try {
          // Navigate to search results
          await page.goto(nextUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          
          // Check for CAPTCHA
          const hasCaptcha = await page.$('#captchacharacters');
          if (hasCaptcha) {
            logger.warn('CAPTCHA detected, skipping...');
            break;
          }
          
          // Wait for results
          await page.waitForSelector('[data-component-type="s-search-result"]', { 
            timeout: 10000 
          }).catch(() => {
            logger.warn('No search results found');
          });
          
          // Extract parts from current page
          const pageParts = await this.extractPartsFromPage(page, searchTerm);
          parts.push(...pageParts);
          
          // Find next page link
          const nextPageLink = await page.$('a.s-pagination-next');
          if (nextPageLink && currentPage < maxPages) {
            nextUrl = await page.evaluate(el => el.href, nextPageLink);
            currentPage++;
            await this.delay(3000 + Math.random() * 3000);
          } else {
            break;
          }
          
        } catch (error) {
          logger.error(`Error on page ${currentPage}:`, error);
          break;
        }
      }
      
    } finally {
      await page.close();
    }
    
    return parts.slice(0, maxParts);
  }

  /**
   * Extract parts from search results page
   */
  async extractPartsFromPage(page, searchTerm) {
    const content = await page.content();
    const $ = cheerio.load(content);
    const parts = [];
    
    $('[data-component-type="s-search-result"]').each((index, element) => {
      try {
        const part = this.extractPartData($, element, searchTerm);
        if (part && this.isAutomotivePart(part)) {
          parts.push(part);
        }
      } catch (error) {
        logger.error('Error extracting part data:', error);
      }
    });
    
    return parts;
  }

  /**
   * Extract part data from element
   */
  extractPartData($, element, searchTerm) {
    const $item = $(element);
    
    // Extract ASIN
    const asin = $item.attr('data-asin');
    if (!asin) return null;
    
    // Extract title/name
    const name = $item.find('h2 span').text().trim();
    if (!name) return null;
    
    // Extract price
    const priceWhole = $item.find('.a-price-whole').first().text().trim();
    const priceFraction = $item.find('.a-price-fraction').first().text().trim();
    const price = priceWhole ? `${priceWhole}${priceFraction}` : null;
    
    // Extract original price
    const originalPrice = $item.find('.a-text-price .a-offscreen').text().trim();
    
    // Extract rating
    const ratingText = $item.find('.a-icon-star-small .a-icon-alt').text().trim();
    const rating = ratingText ? parseFloat(ratingText.match(/[\d.]+/)?.[0] || 0) : null;
    
    // Extract review count
    const reviewCount = parseInt(
      $item.find('.a-size-base.s-underline-text').text().replace(/[^\d]/g, '') || 0
    );
    
    // Extract image
    const image = $item.find('.s-image').attr('src');
    
    // Extract brand
    let brand = $item.find('.s-size-base-plus').text().trim();
    if (!brand) {
      // Try to extract from title
      brand = name.split(' ')[0];
    }
    
    // Extract Prime eligibility
    const isPrime = $item.find('.s-prime').length > 0;
    
    // Extract shipping info
    const shippingText = $item.find('.a-color-base.a-text-bold').text().trim();
    
    // Build URL
    const url = `${this.baseUrl}/dp/${asin}`;
    
    return {
      name,
      brand,
      price,
      originalPrice,
      asin,
      category: this.categorizeBySearchTerm(searchTerm),
      images: image ? [image] : [],
      url,
      rating,
      reviewCount,
      availability: 'in-stock',
      condition: 'new',
      seller: 'Amazon',
      shippingInfo: {
        isPrime,
        shippingText,
      },
      sourceId: asin,
    };
  }

  /**
   * Check if item is likely an automotive part
   */
  isAutomotivePart(part) {
    const automotiveKeywords = [
      'car', 'auto', 'vehicle', 'truck', 'brake', 'engine', 'filter',
      'spark', 'battery', 'oil', 'windshield', 'headlight', 'taillight',
      'transmission', 'radiator', 'exhaust', 'suspension', 'steering'
    ];
    
    const nameLower = part.name.toLowerCase();
    return automotiveKeywords.some(keyword => nameLower.includes(keyword));
  }

  /**
   * Categorize part based on search term
   */
  categorizeBySearchTerm(searchTerm) {
    const categoryMap = {
      'brake': 'Brakes',
      'oil filter': 'Engine Parts',
      'air filter': 'Engine Parts',
      'spark plug': 'Ignition System',
      'battery': 'Electrical',
      'wiper': 'Wipers & Washers',
      'headlight': 'Lighting',
      'bulb': 'Lighting',
      'cabin filter': 'Interior',
    };
    
    const termLower = searchTerm.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (termLower.includes(key)) {
        return value;
      }
    }
    
    return 'General';
  }

  /**
   * Scrape detailed part information
   */
  async scrapePartDetails(asin) {
    const page = await this.browser.newPage();
    
    try {
      const url = `${this.baseUrl}/dp/${asin}`;
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Extract detailed specifications
      const specifications = {};
      $('#feature-bullets li').each((i, el) => {
        const text = $(el).find('span').text().trim();
        if (text && !text.includes('Make sure this fits')) {
          specifications[`feature_${i + 1}`] = text;
        }
      });
      
      // Extract technical details
      $('.prodDetTable tr').each((i, el) => {
        const key = $(el).find('th').text().trim();
        const value = $(el).find('td').text().trim();
        if (key && value) {
          specifications[key.toLowerCase().replace(/\s+/g, '_')] = value;
        }
      });
      
      // Extract all images
      const images = [];
      $('#altImages .item img').each((i, el) => {
        const src = $(el).attr('src');
        if (src) {
          // Get high-res version
          const highResSrc = src.replace(/\._.*_\./, '.');
          images.push(highResSrc);
        }
      });
      
      // Extract compatibility
      const compatibility = [];
      $('.fit-data-container .a-list-item').each((i, el) => {
        const text = $(el).text().trim();
        if (text) {
          compatibility.push(text);
        }
      });
      
      return {
        specifications,
        images,
        compatibility: compatibility.join('; '),
        description: $('#feature-bullets').text().trim(),
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

module.exports = AmazonScraper;