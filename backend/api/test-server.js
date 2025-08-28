require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();
const port = process.env.API_PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'ModMaster Pro API',
    version: '1.0.0'
  });
});

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ModMaster Pro API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      docs: '/api-docs'
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 ModMaster Pro Test Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

module.exports = app; 