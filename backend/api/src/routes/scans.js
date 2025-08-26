const express = require('express');
const router = express.Router();

// Scans routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Scans endpoint - Coming soon' });
});

module.exports = router;