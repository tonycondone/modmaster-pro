const express = require('express');
const router = express.Router();

// Marketplace routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Marketplace endpoint - Coming soon' });
});

module.exports = router;