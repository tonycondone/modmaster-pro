const cheerio = require('cheerio');
const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class AmazonScraper extends BaseScraper {
  constructor() {
    super('amazon');
    this.requiresBrowser = true; // Amazon often requires JavaScript
  }

  async scrapeProduct(url, options = {}) {
    try {
      // Use browser for Amazon
      const browser = options.browser;
      if (!browser) {
        throw new Error('Browser instance required for Amazon scraping');
      }

      const page = await browser.newPage();
      
      try {
        const html = await this.fetchWithBrowser(page, url, options);
        const $ = cheerio.load(html);

        // Extract product data
        const data = {
          url,
          platform: 'amazon',
          title: this.extractTitle($),
          price: this.extractPrice($),
          originalPrice: this.extractOriginalPrice($),
          availability: this.extractAvailability($),
          rating: this.extractRating($),
          reviewCount: this.extractReviewCount($),
          images: this.extractImages($),
          asin: this.extractASIN(url),
          seller: this.extractSeller($),
          isPrime: this.checkPrime($),
          shippingInfo: this.extractShipping($),
          specifications: this.extractSpecifications($),
          timestamp: new Date().toISOString(),
        };

        // Calculate discount
        if (data.originalPrice && data.price) {
          data.discount = data.originalPrice - data.price;
          data.discountPercentage = Math.round(
            (data.discount / data.originalPrice) * 100
          );
        }

        return data;

      } finally {
        await page.close();
      }

    } catch (error) {
      logger.error('Amazon scraping error:', error);
      throw error;
    }
  }

  async searchProducts(query, options = {}) {
    try {
      const browser = options.browser;
      if (!browser) {
        throw new Error('Browser instance required for Amazon search');
      }

      const page = await browser.newPage();
      
      try {
        // Build search URL
        const searchUrl = new URL(this.config.searchUrl);
        searchUrl.searchParams.set('k', query);
        searchUrl.searchParams.set('s', 'relevanceblender');

        const html = await this.fetchWithBrowser(page, searchUrl.href, {
          ...options,
          waitForSelector: '[data-component-type="s-search-result"]',
        });

        const $ = cheerio.load(html);
        const results = [];

        $('[data-component-type="s-search-result"]').each((i, element) => {
          if (i >= (options.limit || 10)) return false;

          const $item = $(element);
          
          const result = {
            title: $item.find('h2 a span').text().trim(),
            url: 'https://www.amazon.com' + $item.find('h2 a').attr('href'),
            price: this.parsePrice(
              $item.find('.a-price-whole').first().text()
            ),
            rating: parseFloat(
              $item.find('.a-icon-star-small .a-icon-alt').text()
            ) || null,
            image: $item.find('.s-image').attr('src'),
            isPrime: $item.find('.a-icon-prime').length > 0,
            asin: $item.attr('data-asin'),
          };

          if (result.title && result.url) {
            results.push(result);
          }
        });

        return results;

      } finally {
        await page.close();
      }

    } catch (error) {
      logger.error('Amazon search error:', error);
      throw error;
    }
  }

  extractTitle($) {
    return $('#productTitle').text().trim() || 
           $('h1.a-size-large').text().trim() ||
           null;
  }

  extractPrice($) {
    const priceText = $('.a-price-whole').first().text() ||
                     $('#priceblock_dealprice').text() ||
                     $('#priceblock_ourprice').text() ||
                     $('.a-price.a-text-price.a-size-medium.apexPriceToPay').text() ||
                     $('.a-price-range').first().text();
    
    return this.parsePrice(priceText);
  }

  extractOriginalPrice($) {
    const originalPriceText = $('.a-price.a-text-price').first().text() ||
                             $('.a-text-strike').first().text();
    
    return this.parsePrice(originalPriceText);
  }

  extractAvailability($) {
    const availabilityText = $('#availability span').text().trim();
    return this.parseAvailability(availabilityText);
  }

  extractRating($) {
    const ratingText = $('.a-icon-star .a-icon-alt').first().text();
    const match = ratingText.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
  }

  extractReviewCount($) {
    const reviewText = $('#acrCustomerReviewText').text();
    const match = reviewText.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  extractImages($) {
    const images = [];
    
    // Main image
    const mainImage = $('#landingImage').attr('data-old-hires') ||
                     $('#landingImage').attr('src');
    if (mainImage) {
      images.push(this.extractImageUrl(mainImage, this.config.baseUrl));
    }

    // Thumbnail images
    $('.imageThumbnail img').each((i, el) => {
      const thumbUrl = $(el).attr('src');
      if (thumbUrl) {
        // Convert thumbnail to full size
        const fullSizeUrl = thumbUrl.replace(/\._.*_\./, '.');
        images.push(this.extractImageUrl(fullSizeUrl, this.config.baseUrl));
      }
    });

    return images;
  }

  extractASIN(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
  }

  extractSeller($) {
    return $('#sellerProfileTriggerId').text().trim() ||
           $('.a-link-normal.tabular-buybox-text').first().text().trim() ||
           'Amazon';
  }

  checkPrime($) {
    return $('.a-icon-prime').length > 0 ||
           $('#primeInsignia').length > 0;
  }

  extractShipping($) {
    const shippingText = $('#mir-layout-DELIVERY_BLOCK').text().trim() ||
                        $('.a-text-bold:contains("FREE delivery")').parent().text().trim();
    
    return {
      text: shippingText,
      isFree: shippingText.toLowerCase().includes('free'),
    };
  }

  extractSpecifications($) {
    const specs = {};
    
    $('#feature-bullets li').each((i, el) => {
      const text = $(el).text().trim();
      if (text && !text.includes('Make sure this fits')) {
        specs[`feature_${i + 1}`] = text;
      }
    });

    // Technical details table
    $('.prodDetTable tr, #productDetails_techSpec_section_1 tr').each((i, el) => {
      const key = $(el).find('th, td:first-child').text().trim();
      const value = $(el).find('td:last-child').text().trim();
      
      if (key && value && key !== value) {
        specs[key.toLowerCase().replace(/\s+/g, '_')] = value;
      }
    });

    return specs;
  }
}

module.exports = AmazonScraper;