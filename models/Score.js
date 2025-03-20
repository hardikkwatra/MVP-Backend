const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
    privyId: { type: String, required: true, unique: true },
    username: { type: String, default: null },
    email: { type: String, unique: true, sparse: true }, 
    twitterScore: { type: Number, default: 0 },
    telegramScore: { type: Number, default: 0 },  
    totalScore: { type: Number, default: 0 },  
    wallets: [
        {
            walletAddress: { type: String, required: true },
            score: { type: Number, required: true, default: 10 }
        }
    ],
    badges: [{ type: String ,default: [] }]
});

module.exports = mongoose.model("Score", ScoreSchema);
