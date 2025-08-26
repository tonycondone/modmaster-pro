const { query } = require('../utils/database');
const logger = require('../utils/logger');

class PriceTracker {
  async getPriceHistory(partId, options = {}) {
    try {
      const { platform, days = 30 } = options;
      
      let queryText = `
        SELECT 
          platform,
          current_price,
          original_price,
          discount_percentage,
          availability,
          last_updated_at
        FROM marketplace_integrations
        WHERE part_id = $1
        AND last_updated_at > NOW() - INTERVAL '${days} days'
      `;
      
      const params = [partId];
      
      if (platform) {
        queryText += ' AND platform = $2';
        params.push(platform);
      }
      
      queryText += ' ORDER BY last_updated_at DESC';
      
      const result = await query(queryText, params);
      return result.rows;
      
    } catch (error) {
      logger.error('Error getting price history:', error);
      throw error;
    }
  }

  async trackPart(partId, options = {}) {
    try {
      const { platforms = [], targetPrice, notifyEmail } = options;
      
      // TODO: Implement price tracking logic
      // This would set up monitoring for the part
      
      logger.info(`Setting up price tracking for part ${partId}`);
      
      return true;
      
    } catch (error) {
      logger.error('Error tracking part:', error);
      throw error;
    }
  }

  async getCurrentPrices(partId) {
    try {
      const result = await query(`
        SELECT 
          platform,
          current_price,
          original_price,
          discount_percentage,
          availability,
          external_url,
          last_updated_at
        FROM marketplace_integrations
        WHERE part_id = $1
        AND is_tracked = true
        ORDER BY current_price ASC
      `, [partId]);
      
      return result.rows;
      
    } catch (error) {
      logger.error('Error getting current prices:', error);
      throw error;
    }
  }
}

module.exports = new PriceTracker();