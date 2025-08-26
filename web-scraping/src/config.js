module.exports = {
  port: process.env.API_PORT || 8002,
  environment: process.env.NODE_ENV || 'development',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://modmaster_user:modmaster_password@localhost:5432/modmaster_pro',
  },
  
  n8n: {
    url: process.env.N8N_URL || 'http://localhost:5678',
    username: process.env.N8N_USERNAME || 'admin',
    password: process.env.N8N_PASSWORD || 'modmaster123',
  },
  
  scraping: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    concurrency: 5,
    cacheExpiry: 3600, // 1 hour
  },
  
  queue: {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
  
  platforms: {
    amazon: {
      baseUrl: 'https://www.amazon.com',
      searchUrl: 'https://www.amazon.com/s',
      rateLimit: 1000, // ms between requests
    },
    ebay: {
      baseUrl: 'https://www.ebay.com',
      searchUrl: 'https://www.ebay.com/sch/i.html',
      rateLimit: 500,
    },
    autozone: {
      baseUrl: 'https://www.autozone.com',
      searchUrl: 'https://www.autozone.com/searchresult',
      rateLimit: 1000,
    },
    summitRacing: {
      baseUrl: 'https://www.summitracing.com',
      searchUrl: 'https://www.summitracing.com/search',
      rateLimit: 750,
    },
    jegs: {
      baseUrl: 'https://www.jegs.com',
      searchUrl: 'https://www.jegs.com/webapp/wcs/stores/servlet/SearchResultsPageCmd',
      rateLimit: 750,
    },
  },
  
  proxy: {
    enabled: process.env.USE_PROXY === 'true',
    providers: {
      brightData: {
        host: process.env.BRIGHT_DATA_HOST,
        port: process.env.BRIGHT_DATA_PORT,
        username: process.env.BRIGHT_DATA_USERNAME,
        password: process.env.BRIGHT_DATA_PASSWORD,
      },
    },
  },
  
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://backend-api:3000',
    ],
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    errorReporting: process.env.SENTRY_DSN ? true : false,
  },
};