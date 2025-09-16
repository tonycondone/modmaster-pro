const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ModMaster Pro Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test endpoint working',
    data: {
      database: 'Connected', // Placeholder
      redis: 'Connected',    // Placeholder
      services: ['Backend API', 'AI Service', 'Mobile App'] // Placeholder
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ModMaster Pro Backend API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/test`);
});