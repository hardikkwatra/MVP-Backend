/**
 * Standalone Wallet Connect Test
 * 
 * Run with: node test-wallet.js
 */

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Score = require('./models/Score');

// Load environment variables
dotenv.config();

// Setup simple express app
const app = express();
app.use(express.json());

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple wallet connect endpoint
app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { privyId, walletAddress } = req.body;

    if (!privyId || !walletAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`Processing wallet connect for privyId: ${privyId}, wallet: ${walletAddress}`);

    // Find user
    let user = await User.findOne({ privyId });
    
    if (!user) {
      console.log(`Creating new user for privyId: ${privyId}`);
      // Create new user but use undefined instead of null for email
      try {
        user = new User({
          privyId,
          walletConnected: true,
          walletAddress,
          // Use undefined instead of null for email to avoid duplicate key errors
          email: undefined,
          totalScore: 0
        });
        await user.save();
        console.log(`New user created with ID: ${user._id}`);
      } catch (userError) {
        console.error('Error creating user:', userError);
        return res.status(500).json({
          error: "Failed to create user",
          details: userError.message
        });
      }
    } else {
      console.log(`Updating existing user: ${user._id}`);
      user.walletConnected = true;
      user.walletAddress = walletAddress;
      await user.save();
    }
    
    // Update the Score model
    let scoreRecord = await Score.findOne({ privyId });
    
    if (!scoreRecord) {
      console.log(`Creating new score record for privyId: ${privyId}`);
      scoreRecord = new Score({ 
        privyId,
        wallets: [{
          walletAddress: walletAddress,
          score: 10 // Default score
        }]
      });
      await scoreRecord.save();
    } else {
      console.log(`Updating existing score record: ${scoreRecord._id}`);
      // Check if wallet already exists
      const walletExists = scoreRecord.wallets.some(w => w.walletAddress === walletAddress);
      
      if (!walletExists) {
        scoreRecord.wallets.push({
          walletAddress: walletAddress,
          score: 10
        });
        await scoreRecord.save();
      }
    }

    return res.json({
      success: true,
      message: "Wallet connected successfully",
      user,
      score: scoreRecord
    });
  } catch (error) {
    console.error("Error connecting wallet:", error);
    return res.status(500).json({ error: "Failed to connect wallet", details: error.message });
  }
});

// Start server
const PORT = 5555;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  
  // Run a test request
  console.log(`\nRunning test...\n`);
  testWalletConnect();
});

// Test function using a direct database call (no HTTP)
async function testWalletConnect() {
  try {
    const TEST_ID = `test-user-${Date.now()}`;
    const TEST_WALLET = `0xTest${Date.now()}`;
    
    console.log(`Testing with privyId: ${TEST_ID}, wallet: ${TEST_WALLET}`);
    
    // Find or create user directly
    let user = await User.findOne({ privyId: TEST_ID });
    
    if (!user) {
      user = new User({
        privyId: TEST_ID,
        walletConnected: true,
        walletAddress: TEST_WALLET,
        // Use undefined instead of null for email
        email: undefined
      });
      await user.save();
      console.log(`Test user created with ID: ${user._id}`);
    } else {
      user.walletConnected = true;
      user.walletAddress = TEST_WALLET;
      await user.save();
      console.log(`Test user updated`);
    }
    
    // Create score record
    let score = await Score.findOne({ privyId: TEST_ID });
    
    if (!score) {
      score = new Score({
        privyId: TEST_ID,
        wallets: [{ walletAddress: TEST_WALLET, score: 10 }]
      });
      await score.save();
      console.log(`Test score created with ID: ${score._id}`);
    }
    
    console.log(`\nTest completed successfully`);
    console.log(`\nPress Ctrl+C to exit`);
  } catch (error) {
    console.error(`Test failed:`, error);
  }
} 