const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('../config');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.resolve(config.logging.filePath);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for structured logging
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports
const transports = [];

// Console transport for development
if (config.app.environment === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: config.logging.level,
    })
  );
}

// File transports
const fileTransports = [
  // Combined log file
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    compress: config.logging.compress,
    format: customFormat,
    level: 'info',
  }),
  // Error log file
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    compress: config.logging.compress,
    format: customFormat,
    level: 'error',
  }),
  // Debug log file (only in development)
  ...(config.app.debug ? [
    new DailyRotateFile({
      filename: path.join(logDir, 'debug-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      compress: config.logging.compress,
      format: customFormat,
      level: 'debug',
    })
  ] : []),
];

transports.push(...fileTransports);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  defaultMeta: {
    service: config.app.name,
    environment: config.app.environment,
    version: config.app.version,
  },
  transports,
  exitOnError: false,
});

// Add error handling for file transports
fileTransports.forEach(transport => {
  transport.on('error', (error) => {
    console.error('Logger transport error:', error);
  });
});

// Create a stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Helper methods for structured logging
logger.logWithContext = (level, message, context = {}) => {
  logger.log(level, message, context);
};

logger.logRequest = (req, message, level = 'info') => {
  const context = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    requestId: req.id,
  };
  logger.log(level, message, context);
};

logger.logError = (error, context = {}) => {
  const errorContext = {
    ...context,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  };
  logger.error('Error occurred', errorContext);
};

logger.logDatabaseQuery = (query, params, duration, context = {}) => {
  const queryContext = {
    ...context,
    query: {
      sql: query,
      params,
      duration: `${duration}ms`,
    },
  };
  logger.debug('Database query executed', queryContext);
};

logger.logApiCall = (method, url, statusCode, duration, context = {}) => {
  const apiContext = {
    ...context,
    api: {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
    },
  };
  logger.info('API call completed', apiContext);
};

logger.logPerformance = (operation, duration, context = {}) => {
  const perfContext = {
    ...context,
    performance: {
      operation,
      duration: `${duration}ms`,
    },
  };
  logger.info('Performance metric', perfContext);
};

logger.logSecurity = (event, details, context = {}) => {
  const securityContext = {
    ...context,
    security: {
      event,
      details,
      timestamp: new Date().toISOString(),
    },
  };
  logger.warn('Security event', securityContext);
};

logger.logBusiness = (event, data, context = {}) => {
  const businessContext = {
    ...context,
    business: {
      event,
      data,
      timestamp: new Date().toISOString(),
    },
  };
  logger.info('Business event', businessContext);
};

// Override console methods in development for better debugging
if (config.app.environment === 'development') {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  // Override console methods to also log to our logger
  console.log = (...args) => {
    originalConsole.log(...args);
    logger.info(args.join(' '));
  };

  console.info = (...args) => {
    originalConsole.info(...args);
    logger.info(args.join(' '));
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    logger.warn(args.join(' '));
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    logger.error(args.join(' '));
  };

  console.debug = (...args) => {
    originalConsole.debug(...args);
    logger.debug(args.join(' '));
  };
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing logger');
  logger.end();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing logger');
  logger.end();
});

module.exports = logger;