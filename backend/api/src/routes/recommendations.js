const express = require('express');
const router = express.Router();

// Recommendations routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Recommendations endpoint - Coming soon' });
});

module.exports = router;