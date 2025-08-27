const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class EbayScraper extends BaseScraper {
  constructor() {
    super('eBay', {
      rateLimit: {
        maxRequests: 50,
        windowMs: 60000 // 50 requests per minute
      },
      timeout: 45000,
      retries: 3
    });
  }

  async searchParts(query, filters = {}) {
    try {
      const searchUrl = this.buildSearchUrl(query, filters);
      const page = await this.getPage();
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for search results
      await page.waitForSelector('.srp-results', { timeout: 30000 });
      
      // Extract results
      const results = await page.evaluate(() => {
        const items = [];
        const listings = document.querySelectorAll('.s-item');
        
        listings.forEach((listing, index) => {
          // Skip first item (often an ad)
          if (index === 0 && listing.classList.contains('s-item__before-answer')) {
            return;
          }
          
          const title = listing.querySelector('.s-item__title')?.textContent?.trim();
          const priceText = listing.querySelector('.s-item__price')?.textContent?.trim();
          const imageUrl = listing.querySelector('.s-item__image img')?.src;
          const link = listing.querySelector('.s-item__link')?.href;
          const shipping = listing.querySelector('.s-item__shipping')?.textContent?.trim();
          const seller = listing.querySelector('.s-item__seller-info-text')?.textContent?.trim();
          const condition = listing.querySelector('.SECONDARY_INFO')?.textContent?.trim();
          const watchers = listing.querySelector('.s-item__watchcount')?.textContent?.trim();
          
          // Extract item ID from URL
          const itemIdMatch = link?.match(/\/itm\/(\d+)/);
          const itemId = itemIdMatch ? itemIdMatch[1] : null;
          
          // Parse price
          let price = null;
          if (priceText) {
            const priceMatch = priceText.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', ''));
            }
          }
          
          // Parse shipping cost
          let shippingCost = 0;
          if (shipping && !shipping.toLowerCase().includes('free')) {
            const shippingMatch = shipping.match(/[\d,]+\.?\d*/);
            if (shippingMatch) {
              shippingCost = parseFloat(shippingMatch[0].replace(',', ''));
            }
          }
          
          if (title && price !== null && itemId) {
            items.push({
              itemId,
              title,
              price,
              shippingCost,
              totalPrice: price + shippingCost,
              imageUrl,
              link,
              condition,
              seller,
              watchers: watchers ? parseInt(watchers.match(/\d+/)?.[0] || '0') : 0,
              platform: 'eBay'
            });
          }
        });
        
        return items;
      });
      
      logger.info(`Scraped ${results.length} items from eBay for query: ${query}`);
      return results;
      
    } catch (error) {
      logger.error('eBay search error:', error);
      throw error;
    }
  }

  async getPartDetails(itemId) {
    try {
      const itemUrl = `https://www.ebay.com/itm/${itemId}`;
      const page = await this.getPage();
      
      await page.goto(itemUrl, { waitUntil: 'networkidle2' });
      
      // Wait for item details
      await page.waitForSelector('.it-ttl', { timeout: 30000 });
      
      const details = await page.evaluate(() => {
        const title = document.querySelector('.it-ttl')?.textContent?.trim();
        const priceText = document.querySelector('.vi-VR-cvipPrice')?.textContent?.trim() || 
                         document.querySelector('.notranslate')?.textContent?.trim();
        const condition = document.querySelector('.u-flL.condText')?.textContent?.trim();
        const images = Array.from(document.querySelectorAll('.pic img')).map(img => img.src);
        
        // Item specifics
        const specifics = {};
        document.querySelectorAll('.ux-layout-section__item').forEach(row => {
          const label = row.querySelector('.ux-labels-values__labels')?.textContent?.trim();
          const value = row.querySelector('.ux-labels-values__values')?.textContent?.trim();
          if (label && value) {
            specifics[label] = value;
          }
        });
        
        // Seller info
        const sellerName = document.querySelector('.si-inner .mbg-nw')?.textContent?.trim();
        const sellerScore = document.querySelector('.si-inner .mbg-l')?.textContent?.trim();
        
        // Shipping info
        const shippingCost = document.querySelector('.vi-acc-del-range')?.textContent?.trim();
        const estimatedDelivery = document.querySelector('.vi-acc-del-range + span')?.textContent?.trim();
        
        // Availability
        const quantityText = document.querySelector('.qtyTxt')?.textContent?.trim();
        const availableMatch = quantityText?.match(/(\d+) available/);
        const quantity = availableMatch ? parseInt(availableMatch[1]) : null;
        
        // Extract numeric price
        let price = null;
        if (priceText) {
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(',', ''));
          }
        }
        
        return {
          title,
          price,
          condition,
          images,
          specifics,
          seller: {
            name: sellerName,
            score: sellerScore
          },
          shipping: {
            cost: shippingCost,
            estimatedDelivery
          },
          availability: {
            inStock: quantity ? quantity > 0 : true,
            quantity
          }
        };
      });
      
      // Check compatibility if available
      let compatibility = null;
      try {
        await page.click('.vi-acc-vc-btn', { timeout: 5000 });
        await page.waitForSelector('.vi-acc-e-t', { timeout: 5000 });
        
        compatibility = await page.evaluate(() => {
          const compatibleVehicles = [];
          document.querySelectorAll('.vi-acc-e-t').forEach(row => {
            const text = row.textContent?.trim();
            if (text) {
              compatibleVehicles.push(text);
            }
          });
          return compatibleVehicles;
        });
      } catch (e) {
        // Compatibility info not available
      }
      
      return {
        ...details,
        itemId,
        url: itemUrl,
        compatibility,
        platform: 'eBay',
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`eBay item details error for ${itemId}:`, error);
      throw error;
    }
  }

  async trackPrice(itemId) {
    try {
      const details = await this.getPartDetails(itemId);
      
      return {
        itemId,
        price: details.price,
        availability: details.availability,
        shipping: details.shipping,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`eBay price tracking error for ${itemId}:`, error);
      throw error;
    }
  }

  buildSearchUrl(query, filters = {}) {
    const baseUrl = 'https://www.ebay.com/sch/i.html';
    const params = new URLSearchParams({
      _nkw: query,
      _sacat: filters.category || '6030', // Auto Parts & Accessories
      _sop: filters.sortBy || '15', // Best Match
      LH_BIN: '1', // Buy It Now only
      rt: 'nc' // List view
    });
    
    if (filters.minPrice) {
      params.append('_udlo', filters.minPrice.toString());
    }
    
    if (filters.maxPrice) {
      params.append('_udhi', filters.maxPrice.toString());
    }
    
    if (filters.condition === 'new') {
      params.append('LH_ItemCondition', '3');
    } else if (filters.condition === 'used') {
      params.append('LH_ItemCondition', '4');
    }
    
    if (filters.freeShipping) {
      params.append('LH_FS', '1');
    }
    
    if (filters.location === 'US') {
      params.append('LH_PrefLoc', '1');
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  validateData(data) {
    const errors = [];
    
    if (!data.itemId) {
      errors.push('Missing item ID');
    }
    
    if (!data.title || data.title.length < 5) {
      errors.push('Invalid title');
    }
    
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push('Invalid price');
    }
    
    if (!data.link || !data.link.includes('ebay.com')) {
      errors.push('Invalid link');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async handleCaptcha(page) {
    // Check for eBay CAPTCHA
    const captchaExists = await page.$('#captchaBox');
    
    if (captchaExists) {
      logger.warn('eBay CAPTCHA detected');
      
      // Try to solve using 2captcha if configured
      if (process.env.CAPTCHA_API_KEY) {
        // Implementation for captcha solving service
        throw new Error('CAPTCHA solving not implemented');
      } else {
        throw new Error('CAPTCHA detected and no solver configured');
      }
    }
  }
}

module.exports = EbayScraper;