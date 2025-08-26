const express = require('express');
const router = express.Router();

// Vehicle routes will be implemented here
router.get('/', (req, res) => {
  res.json({ message: 'Vehicles endpoint - Coming soon' });
});

module.exports = router;