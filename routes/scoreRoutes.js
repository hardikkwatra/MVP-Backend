const express = require("express");
const { CollectData, getTotalScore } = require('../controllers/NewScoreController.js');

const router = express.Router();

// Redirect old GET endpoint to use the new controller
router.get("/get-score/:privyId/:username/:address", CollectData);

// Main endpoint for score calculation
router.post("/get-score", CollectData);

// Total score endpoint
router.get("/total-score/:privyId", getTotalScore);

module.exports = router;


