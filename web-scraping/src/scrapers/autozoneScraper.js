const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class AutoZoneScraper extends BaseScraper {
  constructor() {
    super('AutoZone', {
      rateLimit: {
        maxRequests: 30,
        windowMs: 60000 // 30 requests per minute
      },
      timeout: 45000,
      retries: 3,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
  }

  async initialize() {
    await super.initialize();
    // Set default store for pricing
    await this.setDefaultStore();
  }

  async setDefaultStore(zipCode = '10001') {
    try {
      const page = await this.getPage();
      await page.goto('https://www.autozone.com', { waitUntil: 'networkidle2' });
      
      // Click store selector
      const storeSelector = await page.$('.store-selector');
      if (storeSelector) {
        await storeSelector.click();
        await page.waitForSelector('#store-search-input', { timeout: 5000 });
        await page.type('#store-search-input', zipCode);
        await page.keyboard.press('Enter');
        
        // Wait for store results and select first one
        await page.waitForSelector('.store-result', { timeout: 10000 });
        await page.click('.store-result:first-child .select-store-btn');
        await page.waitForTimeout(2000);
      }
    } catch (error) {
      logger.warn('Could not set default store:', error.message);
    }
  }

  async searchParts(query, filters = {}) {
    try {
      const searchUrl = this.buildSearchUrl(query, filters);
      const page = await this.getPage();
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for search results
      await page.waitForSelector('.product-results', { timeout: 30000 });
      
      // Handle "no results" case
      const noResults = await page.$('.no-results-message');
      if (noResults) {
        logger.info(`No results found on AutoZone for query: ${query}`);
        return [];
      }
      
      // Extract results
      const results = await page.evaluate(() => {
        const items = [];
        const products = document.querySelectorAll('.product-tile');
        
        products.forEach(product => {
          const titleElement = product.querySelector('.product-title a');
          const title = titleElement?.textContent?.trim();
          const link = titleElement?.href;
          const priceText = product.querySelector('.price-main')?.textContent?.trim();
          const imageUrl = product.querySelector('.product-image img')?.src;
          const partNumber = product.querySelector('.part-number')?.textContent?.trim();
          const brand = product.querySelector('.brand-name')?.textContent?.trim();
          const rating = product.querySelector('.rating-stars')?.getAttribute('data-rating');
          const reviewCount = product.querySelector('.review-count')?.textContent?.trim();
          
          // Extract SKU from link
          const skuMatch = link?.match(/\/sku\/(\d+)/);
          const sku = skuMatch ? skuMatch[1] : null;
          
          // Parse price
          let price = null;
          if (priceText) {
            const priceMatch = priceText.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
              price = parseFloat(priceMatch[0].replace(',', ''));
            }
          }
          
          // Check availability
          const inStock = !product.querySelector('.out-of-stock');
          const limitedStock = !!product.querySelector('.limited-availability');
          
          // Parse review count
          let reviews = 0;
          if (reviewCount) {
            const reviewMatch = reviewCount.match(/\d+/);
            if (reviewMatch) {
              reviews = parseInt(reviewMatch[0]);
            }
          }
          
          if (title && price !== null && sku) {
            items.push({
              sku,
              title,
              brand: brand || 'Generic',
              partNumber: partNumber?.replace('Part #', '').trim(),
              price,
              imageUrl,
              link: `https://www.autozone.com${link}`,
              rating: rating ? parseFloat(rating) : null,
              reviewCount: reviews,
              availability: inStock ? (limitedStock ? 'limited' : 'in_stock') : 'out_of_stock',
              platform: 'AutoZone'
            });
          }
        });
        
        return items;
      });
      
      logger.info(`Scraped ${results.length} items from AutoZone for query: ${query}`);
      return results;
      
    } catch (error) {
      logger.error('AutoZone search error:', error);
      throw error;
    }
  }

  async getPartDetails(sku) {
    try {
      const itemUrl = `https://www.autozone.com/sku/${sku}`;
      const page = await this.getPage();
      
      await page.goto(itemUrl, { waitUntil: 'networkidle2' });
      
      // Wait for product details
      await page.waitForSelector('.product-details', { timeout: 30000 });
      
      const details = await page.evaluate(() => {
        const title = document.querySelector('h1.product-name')?.textContent?.trim();
        const brand = document.querySelector('.brand-name')?.textContent?.trim();
        const partNumber = document.querySelector('.part-number')?.textContent?.trim();
        const priceText = document.querySelector('.price-main')?.textContent?.trim();
        const description = document.querySelector('.product-description')?.textContent?.trim();
        
        // Images
        const images = Array.from(document.querySelectorAll('.product-images img'))
          .map(img => img.src)
          .filter(src => !src.includes('placeholder'));
        
        // Specifications
        const specs = {};
        document.querySelectorAll('.specification-row').forEach(row => {
          const label = row.querySelector('.spec-label')?.textContent?.trim();
          const value = row.querySelector('.spec-value')?.textContent?.trim();
          if (label && value) {
            specs[label] = value;
          }
        });
        
        // Features
        const features = Array.from(document.querySelectorAll('.product-features li'))
          .map(li => li.textContent?.trim())
          .filter(Boolean);
        
        // Compatibility
        const compatibility = [];
        document.querySelectorAll('.vehicle-fitment-item').forEach(item => {
          const vehicle = item.textContent?.trim();
          if (vehicle) {
            compatibility.push(vehicle);
          }
        });
        
        // Warranty
        const warranty = document.querySelector('.warranty-info')?.textContent?.trim();
        
        // Reviews
        const rating = document.querySelector('.rating-stars')?.getAttribute('data-rating');
        const reviewCount = document.querySelector('.review-count')?.textContent?.trim();
        
        // Availability
        const inStock = !document.querySelector('.out-of-stock');
        const storeAvailability = document.querySelector('.store-availability')?.textContent?.trim();
        
        // Extract price
        let price = null;
        if (priceText) {
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0].replace(',', ''));
          }
        }
        
        return {
          title,
          brand,
          partNumber: partNumber?.replace('Part #', '').trim(),
          price,
          description,
          images,
          specifications: specs,
          features,
          compatibility,
          warranty,
          rating: rating ? parseFloat(rating) : null,
          reviewCount: parseInt(reviewCount?.match(/\d+/)?.[0] || '0'),
          availability: {
            online: inStock,
            store: storeAvailability || 'Check store'
          }
        };
      });
      
      // Get related products
      const relatedProducts = await page.evaluate(() => {
        const related = [];
        document.querySelectorAll('.related-products .product-tile').forEach(product => {
          const title = product.querySelector('.product-title')?.textContent?.trim();
          const sku = product.querySelector('a')?.href?.match(/\/sku\/(\d+)/)?.[1];
          const price = product.querySelector('.price-main')?.textContent?.trim();
          
          if (title && sku) {
            related.push({
              sku,
              title,
              price
            });
          }
        });
        return related;
      });
      
      return {
        ...details,
        sku,
        url: itemUrl,
        relatedProducts,
        platform: 'AutoZone',
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error(`AutoZone item details error for ${sku}:`, error);
      throw error;
    }
  }

  async checkStoreAvailability(sku, zipCode) {
    try {
      const page = await this.getPage();
      
      // Navigate to product page
      await page.goto(`https://www.autozone.com/sku/${sku}`, { waitUntil: 'networkidle2' });
      
      // Click "Check Other Stores"
      const checkStoresBtn = await page.$('.check-stores-btn');
      if (checkStoresBtn) {
        await checkStoresBtn.click();
        await page.waitForSelector('#store-search-modal', { timeout: 5000 });
        
        // Enter zip code
        await page.type('#store-search-input', zipCode);
        await page.keyboard.press('Enter');
        
        // Wait for results
        await page.waitForSelector('.store-availability-results', { timeout: 10000 });
        
        // Extract store availability
        const availability = await page.evaluate(() => {
          const stores = [];
          document.querySelectorAll('.store-result').forEach(store => {
            const name = store.querySelector('.store-name')?.textContent?.trim();
            const address = store.querySelector('.store-address')?.textContent?.trim();
            const distance = store.querySelector('.store-distance')?.textContent?.trim();
            const stock = store.querySelector('.stock-status')?.textContent?.trim();
            const quantity = store.querySelector('.stock-quantity')?.textContent?.trim();
            
            if (name) {
              stores.push({
                name,
                address,
                distance,
                inStock: stock?.toLowerCase().includes('in stock'),
                quantity: quantity ? parseInt(quantity.match(/\d+/)?.[0] || '0') : null
              });
            }
          });
          return stores;
        });
        
        return availability;
      }
      
      return [];
      
    } catch (error) {
      logger.error(`AutoZone store availability error for ${sku}:`, error);
      throw error;
    }
  }

  buildSearchUrl(query, filters = {}) {
    const baseUrl = 'https://www.autozone.com/searchresults';
    const params = new URLSearchParams({
      searchText: query
    });
    
    if (filters.category) {
      params.append('categoryName', filters.category);
    }
    
    if (filters.brand) {
      params.append('brand', filters.brand);
    }
    
    if (filters.minPrice || filters.maxPrice) {
      const priceRange = `${filters.minPrice || 0}-${filters.maxPrice || 99999}`;
      params.append('price', priceRange);
    }
    
    if (filters.inStoreOnly) {
      params.append('storeOnly', 'true');
    }
    
    if (filters.sortBy) {
      // AutoZone sort options: relevance, price-low-high, price-high-low, rating
      params.append('sort', filters.sortBy);
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  validateData(data) {
    const errors = [];
    
    if (!data.sku) {
      errors.push('Missing SKU');
    }
    
    if (!data.title || data.title.length < 5) {
      errors.push('Invalid title');
    }
    
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push('Invalid price');
    }
    
    if (!data.link || !data.link.includes('autozone.com')) {
      errors.push('Invalid link');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async handleAntiBot(page) {
    // Check for AutoZone anti-bot measures
    const blocked = await page.$('.blocked-message');
    
    if (blocked) {
      logger.warn('AutoZone anti-bot detected');
      
      // Implement anti-bot bypass strategies
      await page.waitForTimeout(5000 + Math.random() * 5000);
      
      // Clear cookies and retry
      const cookies = await page.cookies();
      await page.deleteCookie(...cookies);
      
      throw new Error('Blocked by AutoZone anti-bot system');
    }
  }
}

module.exports = AutoZoneScraper;