const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * Swagger/OpenAPI configuration
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ModMaster Pro API',
      version: '1.0.0',
      description: 'AI-powered vehicle parts identification and marketplace platform',
      contact: {
        name: 'ModMaster Pro Support',
        email: 'support@modmasterpro.com',
        url: 'https://modmasterpro.com/support'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000/api',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../models/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ]
};

/**
 * Custom Swagger UI options
 */
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin-bottom: 50px }
    .swagger-ui .info .title { color: #2563eb }
    .swagger-ui .btn.authorize { background-color: #2563eb; border-color: #2563eb }
    .swagger-ui .btn.authorize:hover { background-color: #1d4ed8; border-color: #1d4ed8 }
    .swagger-ui .btn.execute { background-color: #10b981; border-color: #10b981 }
    .swagger-ui .btn.execute:hover { background-color: #059669; border-color: #059669 }
  `,
  customSiteTitle: 'ModMaster Pro API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    validatorUrl: null,
    tryItOutEnabled: process.env.NODE_ENV !== 'production'
  }
};

/**
 * Setup Swagger documentation
 * @param {Express} app - Express application instance
 */
function setupSwagger(app) {
  try {
    // Load the main Swagger YAML file
    const swaggerYamlPath = path.join(__dirname, '../swagger.yaml');
    let swaggerDocument;

    if (fs.existsSync(swaggerYamlPath)) {
      // Load from YAML file
      swaggerDocument = YAML.load(swaggerYamlPath);
      logger.info('Loaded Swagger documentation from YAML file');
    } else {
      // Generate from JSDoc comments
      swaggerDocument = swaggerJsdoc(swaggerOptions);
      logger.info('Generated Swagger documentation from JSDoc');
    }

    // Add dynamic server URL based on environment
    if (process.env.NODE_ENV === 'production') {
      swaggerDocument.servers = [
        {
          url: process.env.API_URL || 'https://api.modmasterpro.com',
          description: 'Production server'
        }
      ];
    }

    // Setup Swagger UI
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, swaggerUiOptions)
    );

    // Serve the raw OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
      res.json(swaggerDocument);
    });

    app.get('/api-docs.yaml', (req, res) => {
      res.type('yaml').send(YAML.stringify(swaggerDocument, 10));
    });

    logger.info('Swagger documentation available at /api-docs');
  } catch (error) {
    logger.error('Failed to setup Swagger documentation', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Generate API documentation from routes
 * @returns {Object} Generated OpenAPI specification
 */
function generateDocs() {
  try {
    const spec = swaggerJsdoc(swaggerOptions);
    logger.info('Generated API documentation', {
      paths: Object.keys(spec.paths || {}).length,
      schemas: Object.keys(spec.components?.schemas || {}).length
    });
    return spec;
  } catch (error) {
    logger.error('Failed to generate API documentation', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Validate OpenAPI specification
 * @param {Object} spec - OpenAPI specification
 * @returns {Object} Validation result
 */
async function validateApiSpec(spec) {
  try {
    // Basic validation
    const errors = [];
    
    if (!spec.openapi || !spec.openapi.startsWith('3.')) {
      errors.push('Invalid OpenAPI version');
    }
    
    if (!spec.info || !spec.info.title || !spec.info.version) {
      errors.push('Missing required info fields');
    }
    
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No paths defined');
    }
    
    // Validate each path
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      const hasMethod = methods.some(method => pathItem[method]);
      
      if (!hasMethod) {
        errors.push(`Path ${path} has no HTTP methods defined`);
      }
      
      // Validate operations
      for (const method of methods) {
        const operation = pathItem[method];
        if (operation) {
          if (!operation.summary && !operation.description) {
            errors.push(`${method.toUpperCase()} ${path} missing summary or description`);
          }
          
          if (!operation.responses || Object.keys(operation.responses).length === 0) {
            errors.push(`${method.toUpperCase()} ${path} has no responses defined`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Failed to validate API specification', {
      error: error.message
    });
    return {
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Serve API documentation
 * @param {string} path - Path to serve documentation
 * @returns {Function} Express middleware
 */
function serveApiDocs(path = '/api-docs') {
  return (req, res, next) => {
    if (req.path === path || req.path.startsWith(path + '/')) {
      return swaggerUi.setup(swaggerDocument, swaggerUiOptions)(req, res, next);
    }
    next();
  };
}

/**
 * Middleware to add API documentation links to responses
 */
function addDocumentationHeaders(req, res, next) {
  res.setHeader('X-API-Docs', `${req.protocol}://${req.get('host')}/api-docs`);
  res.setHeader('X-API-Spec', `${req.protocol}://${req.get('host')}/api-docs.json`);
  next();
}

module.exports = {
  setupSwagger,
  generateDocs,
  validateApiSpec,
  serveApiDocs,
  addDocumentationHeaders
};