const express = require("express");
const { getWalletDetails } = require("../controllers/BlockchainController");

const router = express.Router();

router.get("/fetch-blockchain-data", getWalletDetails );

module.exports = router;
