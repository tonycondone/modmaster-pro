require('dotenv').config();

const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'ModMaster Pro',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'development',
    debug: process.env.DEBUG === 'true',
    port: parseInt(process.env.API_PORT, 10) || 3000,
    host: process.env.API_HOST || '0.0.0.0',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    apiVersion: process.env.API_VERSION || 'v1',
  },

  // Database
  database: {
    client: 'postgresql',
    url: process.env.DATABASE_URL || (() => {
      throw new Error('DATABASE_URL environment variable is required');
    })(),
    connection: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
      database: process.env.POSTGRES_DB || 'modmaster_pro',
      user: process.env.POSTGRES_USER || 'modmaster_user',
      password: process.env.POSTGRES_PASSWORD || (() => {
        throw new Error('POSTGRES_PASSWORD environment variable is required for security');
      })(),
      ssl: process.env.POSTGRES_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'modmaster:',
  },

  // Elasticsearch
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    host: process.env.ELASTICSEARCH_HOST || 'localhost',
    port: parseInt(process.env.ELASTICSEARCH_PORT, 10) || 9200,
    username: process.env.ELASTICSEARCH_USERNAME || '',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
    indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'modmaster',
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET environment variable is required for security');
    })(),
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'modmaster-pro',
    audience: process.env.JWT_AUDIENCE || 'modmaster-pro-users',
  },

  // Password Security
  password: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8,
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:19000'],
    allowCredentials: process.env.CORS_ALLOW_CREDENTIALS !== 'false',
    maxAge: parseInt(process.env.CORS_MAX_AGE, 10) || 86400,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880, // 5MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? process.env.ALLOWED_FILE_TYPES.split(',') : ['jpg', 'jpeg', 'png', 'webp'],
    storagePath: process.env.UPLOAD_STORAGE_PATH || './uploads',
  },

  // Request Limits
  maxRequestSize: process.env.MAX_REQUEST_SIZE || '10MB',

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '100MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 10,
    compress: process.env.LOG_COMPRESS !== 'false',
  },

  // External Services
  external: {
    aiService: {
      url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
      timeout: parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || 30000,
    },
    scrapingService: {
      url: process.env.SCRAPING_SERVICE_URL || 'http://localhost:8001',
      timeout: parseInt(process.env.SCRAPING_SERVICE_TIMEOUT, 10) || 30000,
    },
    n8n: {
      url: process.env.N8N_URL || 'http://localhost:5678',
      username: process.env.N8N_USERNAME || 'admin',
      password: process.env.N8N_PASSWORD || (() => {
        throw new Error('N8N_PASSWORD environment variable is required for security');
      })(),
      webhookToken: process.env.N8N_WEBHOOK_TOKEN || '',
    },
  },

  // AI/ML Configuration
  ai: {
    computerVision: {
      modelPath: process.env.CV_MODEL_PATH || './ai-ml/models/computer-vision',
      confidenceThreshold: parseFloat(process.env.CV_CONFIDENCE_THRESHOLD) || 0.85,
      maxImageSize: parseInt(process.env.CV_MAX_IMAGE_SIZE, 10) || 4096,
    },
    recommendations: {
      modelPath: process.env.RECOMMENDATION_MODEL_PATH || './ai-ml/models/recommendation-engine',
      cacheTtl: parseInt(process.env.RECOMMENDATION_CACHE_TTL, 10) || 3600,
    },
  },

  // Marketplace Integrations
  marketplace: {
    amazon: {
      apiKey: process.env.AMAZON_API_KEY || '',
      apiSecret: process.env.AMAZON_API_SECRET || '',
      partnerTag: process.env.AMAZON_PARTNER_TAG || '',
      marketplaceId: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
    },
    ebay: {
      appId: process.env.EBAY_APP_ID || '',
      certId: process.env.EBAY_CERT_ID || '',
      clientSecret: process.env.EBAY_CLIENT_SECRET || '',
      sandbox: process.env.EBAY_SANDBOX === 'true',
    },
    autozone: {
      apiKey: process.env.AUTOZONE_API_KEY || '',
      apiUrl: process.env.AUTOZONE_API_URL || 'https://api.autozone.com',
    },
    summitRacing: {
      apiKey: process.env.SUMMIT_RACING_API_KEY || '',
      apiUrl: process.env.SUMMIT_RACING_API_URL || 'https://api.summitracing.com',
    },
  },

  // File Storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'minio',
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT, 10) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'modmaster_access_key',
      secretKey: process.env.MINIO_SECRET_KEY || (() => {
        throw new Error('MINIO_SECRET_KEY environment variable is required for security');
      })(),
      bucketName: process.env.MINIO_BUCKET_NAME || 'modmaster-pro',
    },
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET || 'modmaster-pro-storage',
    },
  },

  // Monitoring
  monitoring: {
    prometheus: {
      enabled: process.env.PROMETHEUS_ENABLED !== 'false',
      path: '/metrics',
    },
    sentry: {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
    },
  },

  // Feature Flags
  features: {
    aiScanning: process.env.FEATURE_AI_SCANNING !== 'false',
    smartRecommendations: process.env.FEATURE_SMART_RECOMMENDATIONS !== 'false',
    realTimePricing: process.env.FEATURE_REAL_TIME_PRICING !== 'false',
    socialFeatures: process.env.FEATURE_SOCIAL_FEATURES !== 'false',
    shopIntegration: process.env.FEATURE_SHOP_INTEGRATION === 'true',
    enterpriseAnalytics: process.env.FEATURE_ENTERPRISE_ANALYTICS === 'true',
  },

  // Performance
  performance: {
    cache: {
      defaultTtl: parseInt(process.env.CACHE_TTL_DEFAULT, 10) || 3600,
      userDataTtl: parseInt(process.env.CACHE_TTL_USER_DATA, 10) || 1800,
      partsDataTtl: parseInt(process.env.CACHE_TTL_PARTS_DATA, 10) || 7200,
      priceDataTtl: parseInt(process.env.CACHE_TTL_PRICE_DATA, 10) || 300,
      aiPredictionsTtl: parseInt(process.env.CACHE_TTL_AI_PREDICTIONS, 10) || 3600,
    },
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'modmaster-session-secret',
    csrfProtection: process.env.CSRF_PROTECTION !== 'false',
    xssProtection: process.env.XSS_PROTECTION !== 'false',
    hstsEnabled: process.env.HSTS_ENABLED !== 'false',
    hstsMaxAge: parseInt(process.env.HSTS_MAX_AGE, 10) || 31536000,
  },
};

// Validate required configuration
const validateConfig = () => {
  const required = [
    'jwt.secret',
    'database.url',
    'redis.url',
  ];

  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }
};

// Validate configuration in non-test environments
if (config.app.environment !== 'test') {
  validateConfig();
}

module.exports = config;