const { getUserDetails } = require("./twitterController.js");
const { getWalletDetails } = require("./BlockchainController.js");
const { getTelegramData } = require("../Services/veridaService.js");
const Score = require("../models/Score");
const User = require("../models/User");

async function CollectData(req, res) {
    try {
        console.log("🔍 Request Received:", req.method === "POST" ? req.body : req.params);

        let { privyId, username, address } = req.params;
        let {email} = req.body;

        if (req.method === "POST") {
            if (!privyId && req.body.privyId) privyId = req.body.privyId;
            if (!username && req.body.userId) username = req.body.userId;
            if (!username && req.body.twitterUsername) username = req.body.twitterUsername;
            if (!address && req.body.walletAddress) address = req.body.walletAddress;
            if (!email && req.body.email) email = req.body.email;
        }
        
        // Make sure privyId is available even for test users
        if (!privyId) {
            return res.status(400).json({ error: "Provide a Privy ID" });
        }

        console.log(`📢 Using PrivyID: ${privyId}`);
        
        // Handle multiple wallet addresses
        let walletAddresses = [];
        if (req.body.walletAddresses && Array.isArray(req.body.walletAddresses)) {
            walletAddresses = req.body.walletAddresses;
            console.log(`📦 Processing ${walletAddresses.length} wallet addresses from request`);
            
            // Use the first address if no primary address is specified
            if (!address && walletAddresses.length > 0) {
                address = walletAddresses[0];
                console.log(`Using first wallet address as primary: ${address}`);
            }
        } else if (address) {
            // If only a single address is provided, add it to the array
            walletAddresses = [address];
        }

        // Use privyId from userDid if not provided directly
        if (!privyId && req.body.userDid) {
            privyId = req.body.userDid;
            console.log(`Using userDid as privyId: ${privyId}`);
        }

        // Extract Telegram-related data
        const { userDid, authToken, veridaUserId, veridaConnected, twitterConnected, walletConnected } = req.body;

        console.log(`📢 Fetching data for: PrivyID(${privyId}), Twitter(${username || "None"}), Wallets(${walletAddresses.length}), Verida Auth(${authToken ? "Provided" : "None"})`);

        let userData = null;
        let walletData = {};
        let telegramGroups = { items: [] };
        let telegramMessages = { items: [] };

        // ✅ Fetch Twitter Data
        if (username) {
            try {
                userData = await getUserDetails(username);
                console.log("✅ Twitter data fetched successfully");
            } catch (err) {
                console.error("❌ Error fetching Twitter user data:", err.message);
                userData = { result: { legacy: {} } }; // Provide empty structure to prevent errors
            }
        } else {
            userData = { result: { legacy: {} } }; // Provide empty structure to prevent errors
        }

        // ✅ Fetch Wallet Data for the primary address
        if (address) {
            try {
                walletData = await getWalletDetails(address);
                console.log("✅ Wallet data fetched successfully for primary address");
            } catch (err) {
                console.error("❌ Error fetching wallet data:", err.message);
                // Initialize empty wallet data structure
                walletData = {
                    "Native Balance Result": 0,
                    "Token Balances Result": [],
                    "Active Chains Result": { activeChains: [] },
                    "DeFi Positions Summary Result": [],
                    "Resolved Address Result": null,
                    "Wallet NFTs Result": [],
                    "Transaction Count": 0,
                    "Unique Token Interactions": 0
                };
            }
        } else {
            // Initialize empty wallet data structure
            walletData = {
                "Native Balance Result": 0,
                "Token Balances Result": [],
                "Active Chains Result": { activeChains: [] },
                "DeFi Positions Summary Result": [],
                "Resolved Address Result": null,
                "Wallet NFTs Result": [],
                "Transaction Count": 0,
                "Unique Token Interactions": 0
            };
        }

        // ✅ Fetch Telegram Data from Verida API
        if (userDid && authToken) {
            try {
                console.log(`📊 Fetching Telegram data for: PrivyID(${privyId}), Verida DID(${userDid})`);
                
                const telegramData = await getTelegramData(userDid, authToken);
                
                if (telegramData) {
                    console.log("✅ Telegram data fetched successfully");
                    telegramGroups = { items: Array.isArray(telegramData.groups) ? telegramData.groups : [] };
                    telegramMessages = { items: Array.isArray(telegramData.messages) ? telegramData.messages : [] };
                } else {
                    console.log("⚠️ No Telegram data returned from Verida service");
                }
            } catch (err) {
                console.error("❌ Error fetching Telegram data:", err.message);
            }
        }

        // ✅ Calculate scores using the algorithm
        const evaluationResult = evaluateUser(userData, walletData, telegramGroups, telegramMessages);
        console.log("✅ Score evaluation completed", JSON.stringify(evaluationResult.scores));
        
        // ✅ Update or create user score record
        try {
            // Find existing score record or create new one
            let scoreRecord = await Score.findOne({ privyId });
            
            if (!scoreRecord) {
                console.log(`Creating new score record for PrivyID: ${privyId}`);
                scoreRecord = new Score({
                    privyId,
                    username: username || null,
                    email: email || null,
                    badges: [],
                    wallets: []
                });
            } else {
                console.log(`Updating existing score record for PrivyID: ${privyId}`);
            }
            
            // Update score record with new calculated scores
            scoreRecord.twitterScore = evaluationResult.scores.socialScore || 0;
            scoreRecord.telegramScore = evaluationResult.scores.telegramScore || 0;
            
            // Add badges 
            scoreRecord.badges = Object.keys(evaluationResult.badges);
            
            // Process all wallet addresses
            let totalWalletScore = 0;
            
            // Update each wallet in the walletAddresses array
            for (const walletAddress of walletAddresses) {
                if (!walletAddress) continue;
                
                // Check if this wallet already exists in the record
                const walletIndex = scoreRecord.wallets.findIndex(w => w.walletAddress === walletAddress);
                
                // For the primary address, use the calculated score
                // For other addresses, assign a default score if they don't exist
                const walletScore = (walletAddress === address) 
                    ? (evaluationResult.scores.cryptoScore || 0) + (evaluationResult.scores.nftScore || 0)
                    : 10; // Default score for additional wallets
                
                if (walletIndex >= 0) {
                    // Only update the score for the primary address
                    if (walletAddress === address) {
                        scoreRecord.wallets[walletIndex].score = walletScore;
                        console.log(`✅ Updated existing wallet score: ${walletAddress} = ${walletScore}`);
                    } else {
                        console.log(`ℹ️ Existing additional wallet: ${walletAddress}, score = ${scoreRecord.wallets[walletIndex].score}`);
                    }
                } else {
                    // Add the new wallet
                    scoreRecord.wallets.push({
                        walletAddress: walletAddress,
                        score: walletScore
                    });
                    console.log(`✅ Added new wallet with score: ${walletAddress} = ${walletScore}`);
                }
            }
            
            // Recalculate total wallet score as the sum of all wallet scores
            totalWalletScore = scoreRecord.wallets.reduce((sum, wallet) => sum + wallet.score, 0);
            
            // Update total score
            scoreRecord.totalScore = scoreRecord.twitterScore + scoreRecord.telegramScore + totalWalletScore;
            
            // Save the score record
            await scoreRecord.save();
            console.log(`✅ Score record saved successfully: ${scoreRecord._id}`);
            console.log(`✅ Score updated for PrivyID: ${privyId}, Total score: ${scoreRecord.totalScore}`);
            
            // Also update User model if it exists
            const user = await User.findOne({ privyId });
            if (user) {
                // Update connection statuses if provided
                if (veridaConnected !== undefined) user.veridaConnected = veridaConnected;
                if (veridaUserId) user.veridaUserId = veridaUserId;
                if (twitterConnected !== undefined) user.twitterConnected = twitterConnected;
                if (walletConnected !== undefined) user.walletConnected = walletConnected;
                if (username) user.twitterUsername = username;
                
                // Update overall total score
                user.totalScore = scoreRecord.totalScore;
                
                // Update score components
                if (!user.scoreDetails) {
                    user.scoreDetails = {};
                }
                
                user.scoreDetails.twitterScore = evaluationResult.scores.socialScore || 0;
                user.scoreDetails.walletScore = totalWalletScore;
                user.scoreDetails.veridaScore = evaluationResult.scores.telegramScore || 0;
                
                // Update detailed score breakdown
                user.scoreDetails.twitterDetails = { 
                    socialScore: evaluationResult.scores.socialScore,
                    badges: Object.keys(evaluationResult.badges).filter(badge => 
                        ["Influence Investor", "Tweet Trader", "Engagement Economist", 
                         "Media Mogul", "List Legend", "Verified Visionary", 
                         "Pinned Post Pro", "Super Follower", "Creator Subscriber", 
                         "Twitter Veteran", "Retweet Riches", "Crypto Communicator", 
                         "Social Connector", "Engagement Star", "Fast Grower", 
                         "Viral Validator"].includes(badge)
                    )
                };
                
                user.scoreDetails.walletDetails = { 
                    cryptoScore: evaluationResult.scores.cryptoScore,
                    nftScore: evaluationResult.scores.nftScore,
                    totalWalletScore: totalWalletScore,
                    walletCount: scoreRecord.wallets.length,
                    badges: Object.keys(evaluationResult.badges).filter(badge => 
                        ["Chain Explorer", "Token Holder", "NFT Networker", 
                         "DeFi Drifter", "Gas Spender", "Staking Veteran", 
                         "Airdrop Veteran", "DAO Diplomat", "Web3 Domain Owner", 
                         "Degen Dualist", "Transaction Titan", "Token Interactor", 
                         "NFT Whale", "DeFi Master", "Bridge Blazer", 
                         "Social HODLer"].includes(badge)
                    )
                };
                
                user.scoreDetails.veridaDetails = { 
                    telegramScore: evaluationResult.scores.telegramScore,
                    communityScore: evaluationResult.scores.communityScore,
                    badges: Object.keys(evaluationResult.badges).filter(badge => 
                        ["Group Guru", "Message Maestro", "Pinned Message Master", 
                         "Media Messenger", "Hashtag Hero", "Poll Creator", 
                         "Community Leader", "Bot Interactor", "Sticker Star", 
                         "GIF Guru", "Mention Magnet", "Telegram Titan", 
                         "Governance Griot", "Dapp Diplomat"].includes(badge)
                    )
                };
                
                user.lastScoreUpdate = new Date();
                await user.save();
                console.log(`✅ User record also updated for PrivyID: ${privyId}`);
            } else {
                // Create a new User record if one doesn't exist
                try {
                    console.log(`No User record found, creating new one for PrivyID: ${privyId}`);
                    const newUser = new User({
                        privyId,
                        email: email || null,
                        twitterUsername: username || null,
                        totalScore: scoreRecord.totalScore,
                        walletAddress: address || null,
                        walletConnected: !!address,
                        scoreDetails: {
                            twitterScore: evaluationResult.scores.socialScore || 0,
                            walletScore: totalWalletScore,
                            veridaScore: evaluationResult.scores.telegramScore || 0
                        },
                        lastScoreUpdate: new Date()
                    });
                    await newUser.save();
                    console.log(`✅ New User record created for PrivyID: ${privyId}`);
                } catch (userCreateError) {
                    console.error("❌ Error creating new User record:", userCreateError.message);
                }
            }
        } catch (dbError) {
            console.error("❌ Error saving score to database:", dbError.message);
            // Continue execution even if db save fails
        }

        // Make sure scores include the values from the evaluation
        const responseScores = {
            ...evaluationResult.scores,
            // Ensure we're returning the direct calculation results even if DB save failed
            totalScore: evaluationResult.scores.totalScore || 0,
        };

        return res.json({ 
            success: true,
            privyId,
            title: evaluationResult.title,
            badges: evaluationResult.badges,
            scores: responseScores,
            walletCount: walletAddresses.length
        });

    } catch (error) {
        console.error("❌ Error calculating score:", error.message);
        return res.status(500).json({ error: "Server Error", message: error.message });
    }
}

// Import weights from algo.txt
const weights = {
    followers: 0.001, retweets: 0.005, quotes: 0.005, replies: 0.002, engagement: 0.0001, verification: 5, tweetFreq: 0.001,
    subscriptions: 2, accountAge: 0.1, media: 0.01, pinned: 5, friends: 0.001, listed: 0.01, superFollow: 5,
    activeChains: 5, nativeBalance: 10, tokenHoldings: 2, nftHoldings: 5, defiPositions: 5, web3Domains: 5,
    transactionCount: 0.01, uniqueTokenInteractions: 1, groupCount: 2, messageFreq: 0.1, pinnedMessages: 5,
    mediaMessages: 2, hashtags: 1, polls: 2, leadership: 5, botInteractions: 1, stickerMessages: 0.5,
    gifMessages: 0.5, mentionCount: 1
};

// Import badge thresholds from algo.txt
const badgeThresholds = {
    "Influence Investor": [1000000, 5000000, 10000000], "Tweet Trader": [5, 10, 20], "Engagement Economist": [1000, 5000, 10000],
    "Media Mogul": [100, 500, 1000], "List Legend": [100, 500, 1000], "Verified Visionary": [1, 1, 1],
    "Pinned Post Pro": [1, 1, 1], "Super Follower": [1, 1, 1], "Creator Subscriber": [5, 10, 20],
    "Twitter Veteran": [5, 10, 15], "Retweet Riches": [100, 500, 1000], "Crypto Communicator": [50, 100, 200],
    "Social Connector": [1000, 5000, 10000], "Engagement Star": [2000, 10000, 20000], "Fast Grower": [100000, 500000, 1000000],
    "Viral Validator": [500, 2000, 5000], "Chain Explorer": [2, 5, 10], "Token Holder": [5, 20, 50],
    "NFT Networker": [1, 5, 10], "DeFi Drifter": [1, 3, 5], "Gas Spender": [100, 500, 1000],
    "Staking Veteran": [1, 3, 5], "Airdrop Veteran": [1, 5, 10], "DAO Diplomat": [1, 5, 10],
    "Web3 Domain Owner": [1, 1, 1], "Degen Dualist": [10000, 50000, 100000], "Transaction Titan": [100, 500, 1000],
    "Token Interactor": [10, 50, 100], "NFT Whale": [10, 50, 100], "DeFi Master": [5, 10, 20],
    "Bridge Blazer": [5, 10, 20], "Social HODLer": [1, 10, 50], "Group Guru": [5, 10, 20],
    "Message Maestro": [100, 500, 1000], "Pinned Message Master": [1, 5, 10], "Media Messenger": [10, 50, 100],
    "Hashtag Hero": [10, 50, 100], "Poll Creator": [1, 5, 10], "Community Leader": [1, 3, 5],
    "Bot Interactor": [10, 50, 100], "Sticker Star": [10, 50, 100], "GIF Guru": [10, 50, 100],
    "Mention Magnet": [10, 50, 100], "Telegram Titan": [500, 1000, 2000], "Governance Griot": [2, 5, 10],
    "Dapp Diplomat": [50, 100, 200], "Liquidity Laureate": [1, 3, 5]
};

// Import title requirements from algo.txt
const titleRequirements = {
    "Crypto Connoisseur": ["Crypto Communicator", "Social Connector", "Liquidity Laureate", "Telegram Titan"],
    "Blockchain Baron": ["DeFi Master", "Liquidity Laureate", "Governance Griot", "Staking Veteran", "Gas Spender"],
    "Digital Dynamo": ["Twitter Veteran", "Fast Grower", "Engagement Star", "Verified Visionary", "Degen Dualist"],
    "DeFi Dynamo": ["DeFi Master", "Airdrop Veteran", "Dapp Diplomat"],
    "NFT Aficionado": ["NFT Networker", "NFT Whale"],
    "Social Savant": ["Crypto Communicator", "Social Connector", "Twitter Veteran", "Engagement Economist", "Retweet Riches"],
    "Protocol Pioneer": ["Chain Explorer", "Bridge Blazer", "DeFi Drifter"],
    "Token Titan": ["Influence Investor", "NFT Networker", "Tweet Trader"],
    "Chain Champion": ["Bridge Blazer", "Viral Validator", "Social HODLer"],
    "Governance Guru": ["DAO Diplomat", "Community Leader", "Governance Griot"]
};

/**
 * Calculate scores for each category based on user data
 * Implemented from algo.txt
 */
function calculateScore(twitterData, walletData, telegramGroups, telegramMessages) {
    // Safely access Twitter data properties
    const twitter = twitterData?.result?.legacy || {};
    
    // Initialize wallet data structure if properties are missing
    const wallet = {
        "Native Balance Result": walletData["Native Balance Result"] || 0,
        "Token Balances Result": walletData["Token Balances Result"] || [],
        "activeChains": walletData["Active Chains Result"]?.activeChains || [],
        "DeFi Positions Summary Result": walletData["DeFi Positions Summary Result"] || [],
        "Resolved Address Result": walletData["Resolved Address Result"] || null,
        "Wallet NFTs Result": walletData["Wallet NFTs Result"] || [],
        "transactionCount": walletData["Transaction Count"] || 0,
        "uniqueTokenInteractions": walletData["Unique Token Interactions"] || 0
    };
    
    // Safely access Telegram data
    const telegram = Array.isArray(telegramGroups?.items) ? telegramGroups.items : [];
    const messages = Array.isArray(telegramMessages?.items) ? telegramMessages.items : [];

    // Calculate Social Influence Score (max 50)
    const socialScore = (
        (twitter.followers_count || 0) * weights.followers +
        ((twitter.favourites_count || 0) + (twitter.media_count || 0) + (twitter.listed_count || 0)) * weights.engagement +
        (twitterData?.result?.is_blue_verified ? weights.verification : 0) +
        (twitter.statuses_count || 0) * weights.tweetFreq +
        (twitterData?.result?.creator_subscriptions_count || 0) * weights.subscriptions +
        (twitter.created_at ? ((new Date() - new Date(twitter.created_at)) / (1000 * 60 * 60 * 24 * 365)) * weights.accountAge : 0) +
        (twitter.media_count || 0) * weights.media +
        (twitter.pinned_tweet_ids_str?.length > 0 ? weights.pinned : 0) +
        (twitter.friends_count || 0) * weights.friends +
        (twitter.listed_count || 0) * weights.listed +
        (twitterData?.result?.super_follow_eligible ? weights.superFollow : 0) +
        (twitter.retweet_count || 0) * weights.retweets +
        (twitter.quote_count || 0) * weights.quotes +
        (twitter.reply_count || 0) * weights.replies
    );

    // Calculate Crypto/DeFi Activity Score (max 40)
    const cryptoScore = (
        wallet.activeChains.length * weights.activeChains +
        wallet["Native Balance Result"] * weights.nativeBalance +
        wallet["Token Balances Result"].length * weights.tokenHoldings +
        wallet["DeFi Positions Summary Result"].length * weights.defiPositions +
        (wallet["Resolved Address Result"] ? weights.web3Domains : 0) +
        wallet.transactionCount * weights.transactionCount +
        wallet.uniqueTokenInteractions * weights.uniqueTokenInteractions
    );

    // Calculate NFT Engagement Score (max 30)
    const nftScore = wallet["Wallet NFTs Result"].length * weights.nftHoldings;

    // Calculate Community Engagement Score (max 20)
    const communityScore = (
        (twitterData?.result?.creator_subscriptions_count || 0) * weights.subscriptions +
        telegram.length * weights.groupCount
    );

    // Safely handle Telegram data which might not follow expected structure
    const telegramScore = (() => {
        try {
            return (
                telegram.length * weights.groupCount +
                messages.length * weights.messageFreq +
                messages.filter(m => m?.sourceData?.is_pinned).length * weights.pinnedMessages +
                messages.filter(m => m?.sourceData?.content?._ === "messagePhoto").length * weights.mediaMessages +
                messages.reduce((sum, m) => {
                    try {
                        return sum + (m?.sourceData?.content?.caption?.entities || [])
                            .filter(e => e?.type?._ === "textEntityTypeHashtag").length;
                    } catch (e) {
                        return sum;
                    }
                }, 0) * weights.hashtags +
                (telegram.some(g => g?.sourceData?.permissions?.can_send_polls) ? weights.polls : 0) +
                (telegram.some(g => g?.sourceData?.permissions?.can_pin_messages) ? weights.leadership : 0) +
                messages.filter(m => m?.sourceData?.via_bot_user_id !== 0).length * weights.botInteractions +
                messages.filter(m => m?.sourceData?.content?._ === "messageSticker").length * weights.stickerMessages +
                messages.filter(m => m?.sourceData?.content?._ === "messageAnimation").length * weights.gifMessages +
                messages.reduce((sum, m) => {
                    try {
                        return sum + (m?.sourceData?.content?.entities || [])
                            .filter(e => e?.type?._ === "textEntityTypeMention").length;
                    } catch (e) {
                        return sum;
                    }
                }, 0) * weights.mentionCount
            );
        } catch (e) {
            console.error("Error calculating Telegram score:", e.message);
            return 0;
        }
    })();

    // Calculate Total Score with caps from algo.txt
    const totalScore = Math.min(socialScore, 50) + Math.min(cryptoScore, 40) + Math.min(nftScore, 30) +
                     Math.min(communityScore, 20) + Math.min(telegramScore, 15);

    return { socialScore, cryptoScore, nftScore, communityScore, telegramScore, totalScore };
}

/**
 * Assign badges based on thresholds
 * Implemented from algo.txt
 */
function assignBadges(twitterData, walletData, telegramGroups, telegramMessages) {
    // Safely access Twitter data properties
    const twitter = twitterData?.result?.legacy || {};
    
    // Initialize wallet data structure if properties are missing
    const wallet = {
        "Native Balance Result": walletData["Native Balance Result"] || 0,
        "Token Balances Result": walletData["Token Balances Result"] || [],
        "activeChains": walletData["Active Chains Result"]?.activeChains || [],
        "DeFi Positions Summary Result": walletData["DeFi Positions Summary Result"] || [],
        "Resolved Address Result": walletData["Resolved Address Result"] || null,
        "Wallet NFTs Result": walletData["Wallet NFTs Result"] || [],
        "transactionCount": walletData["Transaction Count"] || 0,
        "uniqueTokenInteractions": walletData["Unique Token Interactions"] || 0
    };
    
    // Safely access Telegram data
    const telegram = Array.isArray(telegramGroups?.items) ? telegramGroups.items : [];
    const messages = Array.isArray(telegramMessages?.items) ? telegramMessages.items : [];

    const badges = {};
    const assignLevel = (badge, value) => {
        if (!badgeThresholds[badge]) return null;
        
        const [silver, gold, platinum] = badgeThresholds[badge];
        if (value >= platinum) return { level: "Platinum", value };
        if (value >= gold) return { level: "Gold", value };
        if (value >= silver) return { level: "Silver", value };
        return null;
    };

    // Twitter-Based Badges
    try {
        badges["Influence Investor"] = assignLevel("Influence Investor", twitter.followers_count || 0);
        badges["Tweet Trader"] = assignLevel("Tweet Trader", (twitter.statuses_count || 0) / 100);
        badges["Engagement Economist"] = assignLevel("Engagement Economist", twitter.favourites_count || 0);
        badges["Media Mogul"] = assignLevel("Media Mogul", twitter.media_count || 0);
        badges["List Legend"] = assignLevel("List Legend", twitter.listed_count || 0);
        badges["Verified Visionary"] = assignLevel("Verified Visionary", twitterData?.result?.is_blue_verified ? 1 : 0);
        badges["Pinned Post Pro"] = assignLevel("Pinned Post Pro", twitter.pinned_tweet_ids_str?.length > 0 ? 1 : 0);
        badges["Super Follower"] = assignLevel("Super Follower", twitterData?.result?.super_follow_eligible ? 1 : 0);
        badges["Creator Subscriber"] = assignLevel("Creator Subscriber", twitterData?.result?.creator_subscriptions_count || 0);
        badges["Twitter Veteran"] = assignLevel("Twitter Veteran", twitter.created_at ? 
            ((new Date() - new Date(twitter.created_at)) / (1000 * 60 * 60 * 24 * 365)) : 0);
        badges["Retweet Riches"] = assignLevel("Retweet Riches", twitter.retweet_count || 0);
        badges["Crypto Communicator"] = assignLevel("Crypto Communicator", (twitter.statuses_count || 0) / 100);
        badges["Social Connector"] = assignLevel("Social Connector", twitter.friends_count || 0);
        badges["Engagement Star"] = assignLevel("Engagement Star", (twitter.favourites_count || 0) + (twitter.retweet_count || 0));
        const yearsActive = twitter.created_at ? 
            ((new Date() - new Date(twitter.created_at)) / (1000 * 60 * 60 * 24 * 365)) : 1;
        badges["Fast Grower"] = assignLevel("Fast Grower", (twitter.followers_count || 0) / (yearsActive || 1));
        badges["Viral Validator"] = assignLevel("Viral Validator", twitter.retweet_count || 0);
    } catch (e) {
        console.error("Error assigning Twitter badges:", e.message);
    }

    // Wallet-Based Badges
    try {
        badges["Chain Explorer"] = assignLevel("Chain Explorer", wallet.activeChains.length);
        badges["Token Holder"] = assignLevel("Token Holder", wallet["Token Balances Result"].length);
        badges["NFT Networker"] = assignLevel("NFT Networker", wallet["Wallet NFTs Result"].length);
        badges["DeFi Drifter"] = assignLevel("DeFi Drifter", wallet["DeFi Positions Summary Result"].length);
        badges["Gas Spender"] = assignLevel("Gas Spender", wallet["Gas Spent"] || 0);
        badges["Staking Veteran"] = assignLevel("Staking Veteran", wallet["Staking Positions"] || 0);
        badges["Airdrop Veteran"] = assignLevel("Airdrop Veteran", wallet["Airdrops"] || 0);
        badges["DAO Diplomat"] = assignLevel("DAO Diplomat", wallet["DAO Votes"] || 0);
        badges["Web3 Domain Owner"] = assignLevel("Web3 Domain Owner", wallet["Resolved Address Result"] ? 1 : 0);
        badges["Degen Dualist"] = assignLevel("Degen Dualist", wallet.transactionCount);
        badges["Transaction Titan"] = assignLevel("Transaction Titan", wallet.transactionCount);
        badges["Token Interactor"] = assignLevel("Token Interactor", wallet.uniqueTokenInteractions);
        badges["NFT Whale"] = assignLevel("NFT Whale", wallet["Wallet NFTs Result"].length);
        badges["DeFi Master"] = assignLevel("DeFi Master", wallet["DeFi Positions Summary Result"].length);
        badges["Bridge Blazer"] = assignLevel("Bridge Blazer", wallet.activeChains.length);
        badges["Social HODLer"] = assignLevel("Social HODLer", wallet["Native Balance Result"]);
        badges["Liquidity Laureate"] = assignLevel("Liquidity Laureate", wallet["DeFi Positions Summary Result"].length);
    } catch (e) {
        console.error("Error assigning Wallet badges:", e.message);
    }

    // Telegram-Based Badges - with error handling for missing properties
    try {
        badges["Group Guru"] = assignLevel("Group Guru", telegram.length);
        badges["Message Maestro"] = assignLevel("Message Maestro", messages.length);
        
        // Pinned Message Master - safely check for pinned messages
        const pinnedCount = messages.filter(m => {
            try { return m?.sourceData?.is_pinned; } 
            catch (e) { return false; }
        }).length;
        badges["Pinned Message Master"] = assignLevel("Pinned Message Master", pinnedCount);
        
        // Media Messenger - safely check for media messages
        const mediaCount = messages.filter(m => {
            try { return m?.sourceData?.content?._ === "messagePhoto"; } 
            catch (e) { return false; }
        }).length;
        badges["Media Messenger"] = assignLevel("Media Messenger", mediaCount);
        
        // Hashtag Hero - safely count hashtags
        let hashtagCount = 0;
        try {
            hashtagCount = messages.reduce((sum, m) => {
                try {
                    return sum + (m?.sourceData?.content?.caption?.entities || [])
                        .filter(e => e?.type?._ === "textEntityTypeHashtag").length;
                } catch (e) {
                    return sum;
                }
            }, 0);
        } catch (e) {
            hashtagCount = 0;
        }
        badges["Hashtag Hero"] = assignLevel("Hashtag Hero", hashtagCount);
        
        // Poll Creator - safely check for poll permission
        let canSendPolls = false;
        try {
            canSendPolls = telegram.some(g => g?.sourceData?.permissions?.can_send_polls);
        } catch (e) {
            canSendPolls = false;
        }
        badges["Poll Creator"] = assignLevel("Poll Creator", canSendPolls ? 1 : 0);
        
        // Community Leader - safely check for pin message permission
        let leadershipCount = 0;
        try {
            leadershipCount = telegram.filter(g => g?.sourceData?.permissions?.can_pin_messages).length;
        } catch (e) {
            leadershipCount = 0;
        }
        badges["Community Leader"] = assignLevel("Community Leader", leadershipCount);
        
        // Bot Interactor - safely check for bot interactions
        const botCount = messages.filter(m => {
            try { return m?.sourceData?.via_bot_user_id !== 0; } 
            catch (e) { return false; }
        }).length;
        badges["Bot Interactor"] = assignLevel("Bot Interactor", botCount);
        
        // Sticker Star - safely check for sticker messages
        const stickerCount = messages.filter(m => {
            try { return m?.sourceData?.content?._ === "messageSticker"; } 
            catch (e) { return false; }
        }).length;
        badges["Sticker Star"] = assignLevel("Sticker Star", stickerCount);
        
        // GIF Guru - safely check for GIF messages
        const gifCount = messages.filter(m => {
            try { return m?.sourceData?.content?._ === "messageAnimation"; } 
            catch (e) { return false; }
        }).length;
        badges["GIF Guru"] = assignLevel("GIF Guru", gifCount);
        
        // Mention Magnet - safely count mentions
        let mentionCount = 0;
        try {
            mentionCount = messages.reduce((sum, m) => {
                try {
                    return sum + (m?.sourceData?.content?.entities || [])
                        .filter(e => e?.type?._ === "textEntityTypeMention").length;
                } catch (e) {
                    return sum;
                }
            }, 0);
        } catch (e) {
            mentionCount = 0;
        }
        badges["Mention Magnet"] = assignLevel("Mention Magnet", mentionCount);
        
        // Telegram Titan - combination of messages and leadership
        const titanScore = messages.length + (canSendPolls ? 1000 : 0);
        badges["Telegram Titan"] = assignLevel("Telegram Titan", titanScore);
        
        // Governance Griot - combination of poll and pin permissions
        const griotScore = (canSendPolls ? 1 : 0) + (leadershipCount > 0 ? 1 : 0);
        badges["Governance Griot"] = assignLevel("Governance Griot", griotScore);
        
        // Dapp Diplomat - same as Bot Interactor for now
        badges["Dapp Diplomat"] = assignLevel("Dapp Diplomat", botCount);
    } catch (e) {
        console.error("Error assigning Telegram badges:", e.message);
    }

    // Filter out null badges
    return Object.fromEntries(Object.entries(badges).filter(([_, v]) => v));
}

/**
 * Assign a title based on badge combinations
 * Implemented from algo.txt
 */
function assignTitleBasedOnBadges(badges) {
    for (const [title, requiredBadges] of Object.entries(titleRequirements)) {
        if (requiredBadges.every(badge => badge in badges)) {
            return title;
        }
    }
    return "ALL ROUNDOOR";
}

/**
 * Main evaluation function
 * Implemented from algo.txt
 */
function evaluateUser(twitterData, walletData, telegramGroups, telegramMessages) {
    try {
        const scores = calculateScore(twitterData, walletData, telegramGroups, telegramMessages);
        const badges = assignBadges(twitterData, walletData, telegramGroups, telegramMessages);
        const title = assignTitleBasedOnBadges(badges);

        return {
            title,
            badges,
            scores
        };
    } catch (error) {
        console.error("Error in evaluateUser:", error.message);
        // Return safe default values if evaluation fails
        return {
            title: "ALL ROUNDOOR",
            badges: {},
            scores: {
                socialScore: 0,
                cryptoScore: 0,
                nftScore: 0,
                communityScore: 0,
                telegramScore: 0,
                totalScore: 0
            }
        };
    }
}

// ✅ Function to Fetch Total Score from Database
async function getTotalScore(req, res) {
    try {
        const { privyId } = req.params;

        if (!privyId) {
            return res.status(400).json({ error: "Privy ID is required" });
        }

        console.log(`📢 Fetching total score for PrivyID: ${privyId}`);

        const userEntry = await Score.findOne({ privyId });

        if (!userEntry) {
            return res.json({ totalScore: 0, wallets: [], badges: [] });
        }

        return res.json({
            totalScore: userEntry.totalScore || 0,
            twitterScore: userEntry.twitterScore || 0,
            telegramScore: userEntry.telegramScore || 0,
            walletScores: userEntry.wallets || [],
            badges: userEntry.badges || []
        });
    } catch (error) {
        console.error("❌ Error fetching total score:", error.message);
        return res.status(500).json({ error: "Server Error" });
    }
}

module.exports = {
    CollectData,
    evaluateUser,
    getTotalScore
};