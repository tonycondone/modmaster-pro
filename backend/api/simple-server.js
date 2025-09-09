const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ModMaster Pro Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'ModMaster Pro API is operational',
    version: '1.0.0',
    services: {
      api: 'running',
      database: 'pending',
      ai_service: 'pending'
    }
  });
});

// Auth endpoints (mock for now)
app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'User registration endpoint - coming soon',
    data: { userId: 'mock-user-id' }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'User login endpoint - coming soon',
    data: { 
      token: 'mock-jwt-token',
      user: { id: 'mock-user-id', email: 'user@example.com' }
    }
  });
});

// Vehicle endpoints (mock)
app.get('/api/vehicles', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        vin: 'MOCK123456789'
      }
    ]
  });
});

// Parts endpoints (mock)
app.get('/api/parts', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: 'Brake Pads',
        price: 89.99,
        category: 'Brakes',
        compatibility: ['Toyota Camry']
      },
      {
        id: 2,
        name: 'Oil Filter',
        price: 12.99,
        category: 'Engine',
        compatibility: ['Toyota Camry']
      }
    ]
  });
});

// Scan endpoints (mock)
app.post('/api/scans', (req, res) => {
  res.json({
    success: true,
    message: 'Image scan endpoint - AI service integration coming soon',
    data: {
      scanId: 'mock-scan-id',
      status: 'processing'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(port, () => {
  console.log(`
🚀 ModMaster Pro Backend API Server Started!
📡 Server running on: http://localhost:${port}
🔗 Health check: http://localhost:${port}/health
📊 API Status: http://localhost:${port}/api/status
🌐 Environment: ${process.env.NODE_ENV || 'development'}
⏰ Started at: ${new Date().toISOString()}
  `);
});

module.exports = app; 