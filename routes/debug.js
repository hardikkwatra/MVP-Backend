const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Score = require('../models/Score');

// Health check route
router.get('/health', (req, res) => {
  return res.json({ status: 'ok', message: 'Debug API is working' });
});

// Simple wallet connect route
router.post('/connect', async (req, res) => {
  try {
    console.log('Debug wallet connect request:', req.body);
    const { privyId, walletAddress } = req.body;
    
    if (!privyId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find or create user
    let user = await User.findOne({ privyId });
    
    if (!user) {
      user = new User({
        privyId,
        walletConnected: true,
        walletAddress
        // Deliberately NOT setting email to avoid duplicate key issues
      });
      await user.save();
    } else {
      user.walletConnected = true;
      user.walletAddress = walletAddress;
      await user.save();
    }
    
    // Create or update score record
    let score = await Score.findOne({ privyId });
    
    if (!score) {
      score = new Score({
        privyId,
        wallets: [{ walletAddress, score: 10 }]
      });
      await score.save();
    } else {
      const walletExists = score.wallets.some(w => w.walletAddress === walletAddress);
      if (!walletExists) {
        score.wallets.push({ walletAddress, score: 10 });
        await score.save();
      }
    }
    
    return res.json({
      success: true,
      message: 'Wallet connected successfully',
      user,
      score
    });
  } catch (error) {
    console.error('Debug wallet connect error:', error);
    return res.status(500).json({ 
      error: 'Failed to connect wallet', 
      details: error.message 
    });
  }
});

// Simple wallet status route
router.get('/status/:privyId', async (req, res) => {
  try {
    const { privyId } = req.params;
    
    if (!privyId) {
      return res.status(400).json({ error: 'Missing privyId parameter' });
    }
    
    const user = await User.findOne({ privyId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const score = await Score.findOne({ privyId });
    
    return res.json({
      walletConnected: user.walletConnected,
      walletAddress: user.walletAddress,
      wallets: score ? score.wallets : []
    });
  } catch (error) {
    console.error('Debug wallet status error:', error);
    return res.status(500).json({ 
      error: 'Failed to get wallet status', 
      details: error.message 
    });
  }
});

// Debug user creation route
router.post('/create-user', async (req, res) => {
  try {
    const { privyId } = req.body;
    
    if (!privyId) {
      return res.status(400).json({ error: 'Missing privyId field' });
    }
    
    // Create a test user without email
    const user = new User({
      privyId,
      walletConnected: false,
      totalScore: 0
    });
    
    await user.save();
    
    return res.json({
      success: true,
      message: 'Test user created',
      user
    });
  } catch (error) {
    console.error('Debug create user error:', error);
    return res.status(500).json({ 
      error: 'Failed to create test user', 
      details: error.message 
    });
  }
});

module.exports = router; 