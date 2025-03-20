const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { CollectData } = require("../controllers/NewScoreController");
const Score = require("../models/Score");

// Connect wallet
router.post("/connect", async (req, res) => {
  try {
    console.log(`Wallet connect request received: ${JSON.stringify(req.body)}`);
    
    const { privyId, walletAddress, walletAddresses } = req.body;

    if (!privyId || !walletAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find user
    let user = await User.findOne({ privyId });
    
    if (!user) {
      try {
        // Create new user with minimal fields
        // Don't set email field at all to avoid duplicate key errors
        user = new User({
          privyId,
          walletConnected: true,
          walletAddress
          // Email intentionally omitted to avoid duplicacy issues
        });
        await user.save();
        console.log(`New user created: ${user._id}`);
      } catch (error) {
        // Handle MongoDB duplicate key errors
        if (error.code === 11000) {
          console.log(`Duplicate key error: ${error.message}`);
          
          // Try to find the user again in case it was created in another request
          user = await User.findOne({ privyId });
          
          if (user) {
            // Update the existing user
            user.walletConnected = true;
            user.walletAddress = walletAddress;
            await user.save();
            console.log(`Found user after duplicate error: ${user._id}`);
          } else {
            // This shouldn't happen but handle it anyway
            return res.status(500).json({
              error: "Database conflict error",
              details: error.message
            });
          }
        } else {
          console.error("Error creating user:", error);
          return res.status(500).json({
            error: "Failed to create user",
            details: error.message
          });
        }
      }
    } else {
      // Update existing user
      user.walletConnected = true;
      user.walletAddress = walletAddress;
      await user.save();
      console.log(`User updated: ${user._id}`);
    }

    // Handle Score model
    let scoreRecord = await Score.findOne({ privyId });
    
    if (!scoreRecord) {
      try {
        // Create new score record
        const wallets = walletAddresses 
          ? walletAddresses.map(addr => ({ walletAddress: addr, score: 0 }))
          : [{ walletAddress, score: 0 }];
        
        scoreRecord = new Score({ 
          privyId,
          wallets
        });
        await scoreRecord.save();
        console.log(`New score record created: ${scoreRecord._id}`);
      } catch (error) {
        // Handle potential duplicate key errors in score creation
        if (error.code === 11000) {
          console.log(`Duplicate key error for score: ${error.message}`);
          
          // Try to find the score record again
          scoreRecord = await Score.findOne({ privyId });
          
          if (!scoreRecord) {
            console.error("Failed to find or create score record after duplicate error");
            // Continue execution, even without score record
          }
        } else {
          console.error("Error creating score record:", error);
          // Continue execution, even without score record
        }
      }
    }

    if (scoreRecord) {
      // Update existing score record
      if (walletAddresses && Array.isArray(walletAddresses)) {
        for (const addr of walletAddresses) {
          const walletExists = scoreRecord.wallets.some(w => w.walletAddress === addr);
          if (!walletExists) {
            scoreRecord.wallets.push({
              walletAddress: addr,
              score: 0
            });
          }
        }
      } else if (walletAddress) {
        const walletExists = scoreRecord.wallets.some(w => w.walletAddress === walletAddress);
        if (!walletExists) {
          scoreRecord.wallets.push({
            walletAddress,
            score: 0
          });
        }
      }
      
      try {
        await scoreRecord.save();
        console.log(`Score record updated: ${scoreRecord._id}`);
      } catch (error) {
        console.error("Error updating score record:", error);
        // Continue execution, even with score record save error
      }
    }

    return res.json({
      success: true,
      message: "Wallet connected successfully",
      user,
      score: scoreRecord || { error: "Failed to create or find score record" }
    });
  } catch (error) {
    console.error("Error connecting wallet:", error);
    return res.status(500).json({ 
      error: "Failed to connect wallet", 
      details: error.message 
    });
  }
});

// Disconnect wallet
router.post("/disconnect", async (req, res) => {
  try {
    const { privyId } = req.body;

    if (!privyId) {
      return res.status(400).json({ error: "Missing privyId" });
    }

    // Update user's wallet connection status
    const user = await User.findOneAndUpdate(
      { privyId },
      {
        walletConnected: false,
        walletAddress: null,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove wallet scores by recalculating with no wallet
    const scoreRequest = {
      body: {
        privyId,
        walletConnected: false
      },
      method: "POST"
    };
    
    // Create a mock response object with json method
    const mockRes = {
      json: () => {}
    };
    
    // Call CollectData but capture response rather than sending it
    try {
      await CollectData(scoreRequest, mockRes);
      console.log('Score recalculation complete after wallet disconnect');
    } catch (scoreError) {
      console.error('Error recalculating score:', scoreError.message);
    }

    return res.json({
      success: true,
      message: "Wallet disconnected successfully",
      user,
    });
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
    return res.status(500).json({ error: "Failed to disconnect wallet", details: error.message });
  }
});

// Get wallet status
router.get("/status/:privyId", async (req, res) => {
  try {
    const { privyId } = req.params;
    
    if (!privyId) {
      return res.status(400).json({ error: "Missing privyId parameter" });
    }
    
    const user = await User.findOne({ privyId });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const score = await Score.findOne({ privyId });
    
    return res.json({
      walletConnected: user.walletConnected,
      walletAddress: user.walletAddress,
      wallets: score ? score.wallets : []
    });
  } catch (error) {
    console.error("Error getting wallet status:", error);
    return res.status(500).json({ 
      error: "Failed to get wallet status", 
      details: error.message 
    });
  }
});

module.exports = router; 