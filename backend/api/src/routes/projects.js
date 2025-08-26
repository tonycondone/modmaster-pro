const express = require('express');
const router = express.Router();

// Projects routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Projects endpoint - Coming soon' });
});

module.exports = router;