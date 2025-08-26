const { AmazonScraper } = require('../scrapers/amazonScraper');
const { EbayScraper } = require('../scrapers/ebayScraper');
const nock = require('nock');

describe('Scrapers', () => {
  describe('AmazonScraper', () => {
    let scraper;

    beforeEach(() => {
      scraper = new AmazonScraper();
    });

    it('should extract title correctly', () => {
      const $ = require('cheerio').load(`
        <div id="productTitle">Test Product Title</div>
      `);

      const title = scraper.extractTitle($);
      expect(title).toBe('Test Product Title');
    });

    it('should parse price correctly', () => {
      const $ = require('cheerio').load(`
        <span class="a-price-whole">99.99</span>
      `);

      const price = scraper.extractPrice($);
      expect(price).toBe(99.99);
    });

    it('should extract ASIN from URL', () => {
      const url = 'https://www.amazon.com/dp/B08N5WRWNW/ref=sr_1_1';
      const asin = scraper.extractASIN(url);
      expect(asin).toBe('B08N5WRWNW');
    });

    it('should check Prime eligibility', () => {
      const $ = require('cheerio').load(`
        <i class="a-icon a-icon-prime"></i>
      `);

      const isPrime = scraper.checkPrime($);
      expect(isPrime).toBe(true);
    });
  });

  describe('EbayScraper', () => {
    let scraper;

    beforeEach(() => {
      scraper = new EbayScraper();
    });

    it('should extract item number from URL', () => {
      const url = 'https://www.ebay.com/itm/123456789012';
      const itemNumber = scraper.extractItemNumber(url);
      expect(itemNumber).toBe('123456789012');
    });

    it('should parse availability correctly', () => {
      const $ = require('cheerio').load(`
        <div class="vi-qty-avail">
          <span>5 available</span>
        </div>
      `);

      const availability = scraper.extractAvailability($);
      expect(availability).toBe('in_stock');
    });

    it('should handle free shipping', () => {
      const $ = require('cheerio').load(`
        <div id="vi-acc-shpsToLbl-cnt">FREE shipping</div>
      `);

      const shippingCost = scraper.extractShippingCost($);
      expect(shippingCost).toBe(0);
    });

    it('should search products successfully', async () => {
      // Mock the HTTP request
      nock('https://www.ebay.com')
        .get('/sch/i.html')
        .query({ _nkw: 'car parts', _sop: '12' })
        .reply(200, `
          <html>
            <body>
              <div class="s-item">
                <h3 class="s-item__title">Car Part 1</h3>
                <a class="s-item__link" href="https://ebay.com/itm/123"></a>
                <span class="s-item__price">$50.00</span>
              </div>
              <div class="s-item">
                <h3 class="s-item__title">Car Part 2</h3>
                <a class="s-item__link" href="https://ebay.com/itm/456"></a>
                <span class="s-item__price">$75.00</span>
              </div>
            </body>
          </html>
        `);

      const results = await scraper.searchProducts('car parts', { limit: 2 });
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Car Part 1');
      expect(results[0].price).toBe(50);
      expect(results[1].title).toBe('Car Part 2');
      expect(results[1].price).toBe(75);
    });
  });

  describe('Price Parsing', () => {
    let scraper;

    beforeEach(() => {
      scraper = new EbayScraper();
    });

    it('should parse various price formats', () => {
      const testCases = [
        { input: '$99.99', expected: 99.99 },
        { input: '€50.00', expected: 50 },
        { input: '1,234.56', expected: 1234.56 },
        { input: 'USD 25', expected: 25 },
        { input: 'Free', expected: null },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scraper.parsePrice(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Availability Parsing', () => {
    let scraper;

    beforeEach(() => {
      scraper = new EbayScraper();
    });

    it('should parse various availability texts', () => {
      const testCases = [
        { input: 'In Stock', expected: 'in_stock' },
        { input: '5 available', expected: 'in_stock' },
        { input: 'Out of stock', expected: 'out_of_stock' },
        { input: 'Currently unavailable', expected: 'out_of_stock' },
        { input: 'Only 2 left - Low stock', expected: 'low_stock' },
        { input: 'Limited availability', expected: 'low_stock' },
        { input: 'Unknown status', expected: 'unknown' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = scraper.parseAvailability(input);
        expect(result).toBe(expected);
      });
    });
  });
});