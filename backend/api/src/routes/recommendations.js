const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Recommendations endpoint - coming soon" });
});

module.exports = router;
