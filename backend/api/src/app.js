const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
// const prometheusMiddleware = require('express-prometheus-middleware');
require('express-async-errors');

// Import configuration
const config = require('./config');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const vehicleRoutes = require('./routes/vehicles');
const partRoutes = require('./routes/parts');
const scanRoutes = require('./routes/scans');
const recommendationRoutes = require('./routes/recommendations');
const marketplaceRoutes = require('./routes/marketplace');
const projectRoutes = require('./routes/projects');
const healthRoutes = require('./routes/health');
const paymentRoutes = require('./routes/payments.routes');

// Import middleware
const { initializePassport, requireAuth } = require('./middleware/auth');
const validationMiddleware = require('./middleware/validation');
const { rateLimiters, addRateLimitHeaders } = require('./middleware/rateLimit');

// Create Express app
const app = express();

// Initialize passport
initializePassport(app);

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: config.cors.allowCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: config.cors.maxAge,
}));

// Compression middleware
app.use(compression());

// Request parsing middleware
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

// Logging middleware
if (config.environment !== 'test') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// Prometheus metrics middleware (temporarily disabled)
// app.use(prometheusMiddleware({
//   metricsPath: '/metrics',
//   collectDefaultMetrics: true,
//   requestDurationBuckets: [0.1, 0.5, 1, 2, 5],
//   requestLengthBuckets: [512, 1024, 5120, 10240, 51200],
//   responseLengthBuckets: [512, 1024, 5120, 10240, 51200],
// }));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
});

app.use('/api/', limiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ModMaster Pro API',
      version: '1.0.0',
      description: 'Full-stack car modification platform API',
      contact: {
        name: 'ModMaster Pro Team',
        email: 'support@modmasterpro.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
      {
        url: 'https://api.modmasterpro.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint (no rate limiting)
app.use('/health', healthRoutes);

// API routes with rate limiting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', requireAuth, userRoutes);
app.use('/api/v1/vehicles', requireAuth, vehicleRoutes);
app.use('/api/v1/parts', partRoutes);
app.use('/api/v1/scans', requireAuth, scanRoutes);
app.use('/api/v1/recommendations', requireAuth, recommendationRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/projects', requireAuth, projectRoutes);
app.use('/api/v1/payments', requireAuth, paymentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;