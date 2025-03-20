/**
 * @deprecated - This file is deprecated and will be removed in future versions.
 * Please use NewScoreController.js for all score-related functionality.
 */

const { getUserDetails } = require("./twitterController.js");
const { getWalletDetails } = require("./BlockchainController.js");
const { getTelegramData } = require("../Services/veridaService.js");
const Score = require("../models/Score");
const { CollectData, getTotalScore: newGetTotalScore } = require("./NewScoreController");

// ✅ Function to Handle Score Updates (Twitter + Wallets + Telegram)
async function calculateScore(req, res) {
    console.warn("DEPRECATED: Using old scoreController.js. Please update to use NewScoreController.js");
    
    // Forward to the new controller to maintain consistency
    return CollectData(req, res);
}

// ✅ Function to Set Default Telegram Score
async function setDefaultTelegramScore(privyId) {
    console.log(`Setting default Telegram score for PrivyID: ${privyId}`);
    const defaultScore = 1; // Minimum score as fallback
    
    let userEntry = await Score.findOne({ privyId });
    
    if (!userEntry) {
        userEntry = new Score({
            privyId,
            telegramScore: defaultScore
        });
    } else if (userEntry.telegramScore === undefined || userEntry.telegramScore === null) {
        userEntry.telegramScore = defaultScore;
    }
    
    await userEntry.save();
}

// ✅ Function to Update Twitter Score in MongoDB
async function updateTwitterScore(privyId, userData) {
    if (!userData) return;

    const twitterScore = generateTwitterScore(userData);
    const username = userData?.data?.user?.result?.screen_name || null;

    let userEntry = await Score.findOne({ privyId });

    if (!userEntry) {
        userEntry = new Score({
            privyId,
            email,
            username,
            twitterScore,
            totalScore: twitterScore
        });
    } else {
        userEntry.username = username;
        userEntry.twitterScore = twitterScore;
    }

    await userEntry.save();
}

// ✅ Function to Update Wallet Score in MongoDB
async function updateWalletScore(privyId, address, walletData) {
    const { score } = generateWalletScore(walletData);

    let userEntry = await Score.findOne({ privyId });

    if (!userEntry) {
        userEntry = new Score({
            privyId,
            wallets: [{ walletAddress: address, score }],
            totalScore: score
        });
    } else {
        const walletIndex = userEntry.wallets.findIndex(w => w.walletAddress === address);
        
        if (walletIndex >= 0) {
            userEntry.wallets[walletIndex].score = score;
        } else {
            userEntry.wallets.push({ walletAddress: address, score });
        }
    }

    await userEntry.save();
}

// ✅ Function to Update Telegram Score in MongoDB
async function updateTelegramScore(privyId, telegramData) {
    if (!telegramData) return;

    // Default values in case data is missing
    const groups = telegramData.groups || 0;
    const messages = telegramData.messages || 0;
    const keywordMatches = telegramData.keywordMatches || { totalCount: 0 };

    // ✅ Base Score from Groups & Messages
    let telegramScore = calculateDynamicScore(groups, 2, { low: 10, medium: 50, high: 100 }) +
                        calculateDynamicScore(messages, 2, { low: 100, medium: 500, high: 1000 });

    // ✅ Bonus Score for Keyword Engagement
    const keywordBonus = keywordMatches.totalCount * 0.5; // Adjust weight as needed
    telegramScore += keywordBonus;

    // ✅ Ensure minimum score of 1
    telegramScore = Math.max(telegramScore, 1);

    console.log(`Score calculation: groups=${groups}, messages=${messages}, keywordBonus=${keywordBonus}, totalTelegramScore=${telegramScore}`);

    // ✅ Assign Badges for Telegram Activity
    let badges = [];
    if (telegramScore > 10) badges.push("Telegram Titan");
    if (groups > 10) badges.push("Community Leader");
    if (keywordMatches.totalCount > 20) badges.push("Engagement Maestro");

    let userEntry = await Score.findOne({ privyId });

    if (!userEntry) {
        userEntry = new Score({
            privyId,
            telegramScore,
            badges,
            totalScore: telegramScore
        });
    } else {
        userEntry.telegramScore = telegramScore;
        
        // Merge badges without duplicates
        if (!userEntry.badges) {
            userEntry.badges = badges;
        } else {
            userEntry.badges = [...new Set([...userEntry.badges, ...badges])];
        }
    }

    await userEntry.save();
}

// ✅ Function to Calculate Total Score (Twitter + Wallet + Telegram)
async function calculateTotalScore(privyId) {
    const userEntry = await Score.findOne({ privyId });

    if (!userEntry) return 0;

    const walletTotal = userEntry.wallets?.reduce((acc, curr) => acc + curr.score, 0) || 0;
    
    // ✅ Add all scores together
    userEntry.totalScore = (userEntry.twitterScore || 0) + walletTotal + (userEntry.telegramScore || 0);

    await userEntry.save();

    return userEntry.totalScore;
}

// ✅ Function to Fetch Total Score from Database
async function getTotalScore(req, res) {
    console.warn("DEPRECATED: Using old scoreController.js. Please update to use NewScoreController.js");
    
    // Forward to the new controller to maintain consistency
    return newGetTotalScore(req, res);
}

// ✅ Function to Get Telegram Score
async function getTelegramScore(req, res) {
    try {
        const { privyId } = req.params;

        if (!privyId) {
            return res.status(400).json({ error: "Privy ID is required" });
        }

        console.log(`📢 Fetching Telegram score for PrivyID: ${privyId}`);

        const userEntry = await Score.findOne({ privyId });

        if (!userEntry || userEntry.telegramScore === undefined) {
            console.log(`⚠️ No Telegram score found for PrivyID: ${privyId}`);
            return res.json({ telegramScore: 0 });
        }

        console.log(`✅ Telegram Score for ${privyId}: ${userEntry.telegramScore}`);
        return res.json({ telegramScore: userEntry.telegramScore });

    } catch (error) {
        console.error("❌ Error fetching Telegram score:", error.message);
        return res.status(500).json({ error: "Server Error" });
    }
}

// ✅ Utility Function for Scoring
function calculateDynamicScore(value, weight, thresholds) {
    if (value > thresholds.high) return weight * 5;
    if (value > thresholds.medium) return weight * 3;
    if (value > thresholds.low) return weight * 1;
    return 0;
}

// ✅ Generate Twitter Score Based on User Data
function generateTwitterScore(userData) {
    let score = 0;

    if (userData) {
        const user = userData?.data?.user?.result || {};
        const followers = user.followers_count || 0;
        score += followers > 10000000 ? 40 : followers > 1000000 ? 30 : followers > 100000 ? 20 : 10;

        const engagement = (user.favourites_count || 0) + (user.media_count || 0) + (user.listed_count || 0);
        score += engagement > 50000 ? 10 : engagement > 10000 ? 5 : 0;

        
        if (user.is_blue_verified) score += 5;
        score = Math.min(score, 40);
    }

    return score;
}

// ✅ Generate Wallet Score Based on Wallet Data
function generateWalletScore(walletData) {
    let cryptoScore = 0;
    let nftScore = 0;

    const activeChains = walletData?.activeChains?.length || 0;
    cryptoScore += activeChains > 1 ? 20 : activeChains === 1 ? 10 : 0;

    if ((walletData?.nativeBalance || 0) > 1) cryptoScore += 10;
    if ((walletData?.defiPositionsSummary?.length || 0) > 0) cryptoScore += 10;

    nftScore = (walletData?.walletNFTs?.length || 0) > 0 ? 20 : 0;

    return { score: Math.max(cryptoScore + nftScore, 10) };
}

module.exports = { calculateScore, getTotalScore, getTelegramScore };