const cheerio = require('cheerio');
const BaseScraper = require('./baseScraper');
const logger = require('../utils/logger');

class EbayScraper extends BaseScraper {
  constructor() {
    super('ebay');
    this.requiresBrowser = false; // eBay works well without JavaScript
  }

  async scrapeProduct(url, options = {}) {
    try {
      const html = await this.fetchHtml(url, options);
      const $ = cheerio.load(html);

      const data = {
        url,
        platform: 'ebay',
        title: this.extractTitle($),
        price: this.extractPrice($),
        condition: this.extractCondition($),
        availability: this.extractAvailability($),
        seller: this.extractSeller($),
        sellerRating: this.extractSellerRating($),
        shippingCost: this.extractShippingCost($),
        images: this.extractImages($),
        itemNumber: this.extractItemNumber(url),
        bidsCount: this.extractBidsCount($),
        watchersCount: this.extractWatchersCount($),
        timestamp: new Date().toISOString(),
      };

      return data;

    } catch (error) {
      logger.error('eBay scraping error:', error);
      throw error;
    }
  }

  async searchProducts(query, options = {}) {
    try {
      // Build search URL
      const searchUrl = new URL(this.config.searchUrl);
      searchUrl.searchParams.set('_nkw', query);
      searchUrl.searchParams.set('_sop', '12'); // Best match

      const html = await this.fetchHtml(searchUrl.href, options);
      const $ = cheerio.load(html);

      const results = [];

      $('.s-item').each((i, element) => {
        if (i >= (options.limit || 10)) return false;

        const $item = $(element);
        
        const result = {
          title: $item.find('.s-item__title').text().trim(),
          url: $item.find('.s-item__link').attr('href'),
          price: this.parsePrice($item.find('.s-item__price').text()),
          condition: $item.find('.SECONDARY_INFO').text().trim(),
          image: $item.find('.s-item__image img').attr('src'),
          shipping: $item.find('.s-item__shipping').text().trim(),
          seller: $item.find('.s-item__seller-info-text').text().trim(),
        };

        if (result.title && result.url && result.title !== 'Shop on eBay') {
          results.push(result);
        }
      });

      return results;

    } catch (error) {
      logger.error('eBay search error:', error);
      throw error;
    }
  }

  extractTitle($) {
    return $('.it-ttl').text().trim() ||
           $('h1.it-ttl').text().trim() ||
           $('.vi-VR-itemtitle-followable').text().trim() ||
           null;
  }

  extractPrice($) {
    const priceText = $('.vi-VR-priceBox-now').text() ||
                     $('#prcIsum').text() ||
                     $('.vi-price-value').text() ||
                     $('.notranslate').first().text();
    
    return this.parsePrice(priceText);
  }

  extractCondition($) {
    return $('.u-flL.condText').text().trim() ||
           $('.vi-acc-del-range').text().trim() ||
           'Not specified';
  }

  extractAvailability($) {
    const quantityText = $('.vi-qty-avail span').text().trim();
    
    if (quantityText.includes('available')) {
      return 'in_stock';
    } else if (quantityText.includes('sold')) {
      return 'out_of_stock';
    }
    
    return 'in_stock';
  }

  extractSeller($) {
    return $('.si-inner .mbg-nw').text().trim() ||
           $('.ux-seller-section__item--seller a').text().trim() ||
           'Unknown seller';
  }

  extractSellerRating($) {
    const ratingText = $('.si-inner .perCent').text().trim();
    return ratingText || null;
  }

  extractShippingCost($) {
    const shippingText = $('#vi-acc-shpsToLbl-cnt').text() ||
                        $('#shippingSection .vi-acc-del-range').text();
    
    if (shippingText.toLowerCase().includes('free')) {
      return 0;
    }
    
    return this.parsePrice(shippingText);
  }

  extractImages($) {
    const images = [];
    
    // Main image
    const mainImage = $('#icImg').attr('src') ||
                     $('.ux-image-carousel-item img').first().attr('src');
    
    if (mainImage) {
      images.push(this.extractImageUrl(mainImage, this.config.baseUrl));
    }

    // Additional images
    $('.lst.icon img').each((i, el) => {
      const imgUrl = $(el).attr('src');
      if (imgUrl) {
        // Convert thumbnail to full size
        const fullSizeUrl = imgUrl.replace(/s-l64/, 's-l1600');
        images.push(this.extractImageUrl(fullSizeUrl, this.config.baseUrl));
      }
    });

    return images;
  }

  extractItemNumber(url) {
    const match = url.match(/\/itm\/(\d+)/);
    return match ? match[1] : null;
  }

  extractBidsCount($) {
    const bidsText = $('.vi-VR-bid-lnk span').first().text();
    const match = bidsText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractWatchersCount($) {
    const watchersText = $('.vi-cvip-watcherCount').text();
    const match = watchersText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

module.exports = EbayScraper;