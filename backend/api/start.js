#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Set default environment variables if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://modmaster_user:1212@localhost:5432/modmaster_pro';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dac1a120ae2e8c01cb79b7217fe46bafe680aca331b4e10cd205f8d2198483fb';
process.env.API_PORT = process.env.API_PORT || '3000';

console.log('🚀 Starting ModMaster Pro Backend...');
console.log(`📍 Environment: ${process.env.NODE_ENV}`);
console.log(`🌐 Port: ${process.env.API_PORT}`);
console.log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);

// Start the server
try {
  require('./src/server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error(error.stack);
  process.exit(1);
} 