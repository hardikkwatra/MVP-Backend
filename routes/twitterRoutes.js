const express = require("express");
const { getUserDetails } = require("../controllers/twitterController");

const router = express.Router();

// Route to get Twitter user details
router.get("/user/:username", getUserDetails);

module.exports = router;
