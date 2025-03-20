const User = require('../models/User');
const Wallet = require('../models/Wallet');
const veridaService = require('./veridaService');
const Score = require('../models/Score');

/**
 * Calculate and update the total score for a user
 * @param {string} privyId - The user's Privy ID
 * @returns {Object} Result object with success status and score details
 */
const calculateScore = async (privyId) => {
  try {
    console.log(`Calculating score for user with privyId: ${privyId}`);
    
    // Find the user by privyId
    const user = await User.findOne({ privyId });
    
    if (!user) {
      console.error(`User not found for privyId: ${privyId}`);
      return { success: false, error: 'User not found' };
    }
    
    // Get scores from each component or default to 0
    const twitterScore = user.scoreDetails?.twitterScore || 0;
    const walletScore = user.scoreDetails?.walletScore || 0;
    const veridaScore = user.scoreDetails?.veridaScore || 0;
    
    // Calculate total score
    const totalScore = twitterScore + walletScore + veridaScore;
    
    console.log(`Score components - Twitter: ${twitterScore}, Wallet: ${walletScore}, Verida: ${veridaScore}`);
    console.log(`Total score: ${totalScore}`);
    
    // Update user's total score
    user.totalScore = totalScore;
    await user.save();
    
    return {
      success: true,
      score: totalScore,
      details: {
        twitter: twitterScore,
        wallet: walletScore,
        verida: veridaScore
      }
    };
  } catch (error) {
    console.error('Error calculating score:', error.message);
    return { success: false, error: 'Failed to calculate score' };
  }
};

/**
 * Update the Verida connection status and ID for a user
 * @param {Object} data - Object containing privyId, veridaConnected, and veridaUserId
 * @returns {Object} Result object with success status
 */
const updateVeridaStatus = async (data) => {
  try {
    const { privyId, veridaConnected, veridaUserId, walletAddresses } = data;
    
    console.log(`Updating Verida status for user: ${privyId}`);
    console.log(`New status: ${veridaConnected ? 'Connected' : 'Disconnected'}, User ID: ${veridaUserId}`);
    
    // Find the user by privyId
    const user = await User.findOne({ privyId });
    
    if (!user) {
      console.error(`User not found for privyId: ${privyId}`);
      return { success: false, error: 'User not found' };
    }
    
    // Update Verida status
    user.veridaConnected = veridaConnected;
    user.veridaUserId = veridaUserId;
    
    // Save the changes
    await user.save();
    
    // Update the Score model if wallet addresses are provided
    if (walletAddresses && Array.isArray(walletAddresses) && walletAddresses.length > 0) {
      console.log(`Processing ${walletAddresses.length} wallet addresses for Score model`);
      
      // Find or create score record
      let scoreRecord = await Score.findOne({ privyId });
      
      if (!scoreRecord) {
        scoreRecord = new Score({ 
          privyId,
          wallets: []
        });
      }
      
      // Add any wallet addresses that don't already exist in the array
      let addedCount = 0;
      for (const address of walletAddresses) {
        if (address && !scoreRecord.wallets.some(w => w.walletAddress === address)) {
          scoreRecord.wallets.push({
            walletAddress: address,
            score: 10 // Default score for new wallet
          });
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        await scoreRecord.save();
        console.log(`Added ${addedCount} new wallet addresses to Score record`);
      }
    }
    
    console.log(`Verida status updated successfully for user: ${privyId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating Verida status:', error.message);
    return { success: false, error: 'Failed to update Verida status' };
  }
};

/**
 * Calculate and update the Verida score for a user
 * @param {string} privyId - The user's Privy ID
 * @returns {Object} Result object with success status and score details
 */
const calculateVeridaScore = async (privyId) => {
  try {
    console.log(`Calculating Verida score for user with privyId: ${privyId}`);
    
    // Find the user by privyId
    const user = await User.findOne({ privyId });
    
    if (!user) {
      console.error(`User not found for privyId: ${privyId}`);
      return { success: false, error: 'User not found' };
    }
    
    if (!user.veridaConnected || !user.veridaUserId) {
      console.error(`User is not connected to Verida: ${privyId}`);
      return { success: false, error: 'User not connected to Verida' };
    }
    
    // Calculate Verida score using the Verida service
    const veridaScoreResult = await veridaService.calculateVeridaScore(user.veridaUserId);
    
    if (!veridaScoreResult.success) {
      console.error(`Failed to calculate Verida score: ${veridaScoreResult.error}`);
      return veridaScoreResult;
    }
    
    // Ensure scoreDetails object exists
    if (!user.scoreDetails) {
      user.scoreDetails = {};
    }
    
    // Update user's Verida score and details
    user.scoreDetails.veridaScore = veridaScoreResult.score;
    user.scoreDetails.veridaDetails = veridaScoreResult.details;
    
    // Save the changes
    await user.save();
    
    // Recalculate total score
    await calculateScore(privyId);
    
    console.log(`Verida score updated successfully: ${veridaScoreResult.score}`);
    
    return veridaScoreResult;
  } catch (error) {
    console.error('Error calculating Verida score:', error.message);
    return { success: false, error: 'Failed to calculate Verida score' };
  }
};

// Export the service functions
const scoreService = {
  calculateScore,
  updateVeridaStatus,
  calculateVeridaScore
};

module.exports = scoreService; 