const express = require('express');
const router = express.Router();

// Parts routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Parts endpoint - Coming soon' });
});

module.exports = router;