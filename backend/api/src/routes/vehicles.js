const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Vehicles endpoint - coming soon" });
});

module.exports = router;
