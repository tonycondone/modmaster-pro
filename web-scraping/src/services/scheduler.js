const cron = require('node-cron');
const logger = require('../utils/logger');
const { addScrapeJob } = require('./queueService');
const { query } = require('../utils/database');

const initializeScheduler = async () => {
  // Schedule price updates every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled price update');
    
    try {
      // Get tracked parts
      const result = await query(`
        SELECT DISTINCT p.id, p.part_number, mi.platform, mi.external_url
        FROM parts p
        JOIN marketplace_integrations mi ON mi.part_id = p.id
        WHERE mi.is_tracked = true
        AND mi.last_checked_at < NOW() - INTERVAL '6 hours'
        LIMIT 100
      `);

      for (const row of result.rows) {
        await addScrapeJob({
          platform: row.platform,
          url: row.external_url,
          partId: row.id,
        });
      }

      logger.info(`Scheduled ${result.rows.length} price update jobs`);
    } catch (error) {
      logger.error('Scheduled price update failed:', error);
    }
  });

  // Schedule daily trending update
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily trending update');
    // TODO: Implement trending calculation
  });

  logger.info('Scheduler initialized');
};

module.exports = {
  initializeScheduler,
};