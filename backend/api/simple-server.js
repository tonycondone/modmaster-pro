const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ModMaster Pro Backend API is running",
    timestamp: new Date().toISOString(),
    environment: "development"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ModMaster Pro Backend API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
