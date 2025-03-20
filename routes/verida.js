const express = require('express');
const router = express.Router();
const axios = require('axios');
const { calculateVeridaScore } = require('../Services/veridaService');
const User = require('../models/User');
const scoreService = require('../Services/scoreService');
const veridaService = require('../Services/veridaService');

// Get Verida auth URL
router.get('/auth/url', async (req, res) => {
  console.log(`\n🔐 GENERATING VERIDA AUTH URL 🔐`);
  console.log(`================================`);
  
  try {
    console.log(`🔍 Defining required scopes...`);
    // Define scopes needed for Telegram data
    const scopesList = [
      'api:ds-query',
      'api:search-universal',
      'ds:social-email',
      'api:connections-profiles',
      'api:connections-status',
      'api:db-query',
      'api:ds-get-by-id',
      'api:db-get-by-id',
      'api:ds-update',
      'api:search-ds',
      'api:search-chat-threads',
      'ds:r:social-chat-group',
      'ds:r:social-chat-message'
    ];
    console.log(`✅ Defined ${scopesList.length} scopes`);
    
    // IMPORTANT: Set redirectUrl to our backend callback endpoint, not the frontend directly
    const backendUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    const redirectUrl = `${backendUrl}/api/verida/auth/callback`;
    // Using the same appDID as in the example project
    const appDID = 'did:vda:mainnet:0x87AE6A302aBf187298FC1Fa02A48cFD9EAd2818D';
    
    console.log(`🔄 Redirect URL: ${redirectUrl}`);
    console.log(`🆔 App DID: ${appDID}`);
    
    // Construct URL with multiple scope parameters - HARDCODED format
    let authUrl = 'https://app.verida.ai/auth?';
    
    // Add each scope individually
    scopesList.forEach(scope => {
      authUrl += `scopes=${encodeURIComponent(scope)}&`;
    });
    
    // Add redirect URL and appDID
    authUrl += `redirectUrl=${encodeURIComponent(redirectUrl)}&appDID=${encodeURIComponent(appDID)}`;
    
    console.log(`\n🔑 GENERATED AUTH URL 🔑`);
    console.log(`========================`);
    console.log(authUrl);
    console.log(`========================\n`);
    
    return res.json({ 
      success: true, 
      authUrl 
    });
  } catch (error) {
    console.error(`❌ Error generating auth URL: ${error.message}`);
    console.error(`================================\n`);
    
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Auth callback route
router.get('/auth/callback', async (req, res) => {
  console.log(`\n🔍 RECEIVED VERIDA CALLBACK 🔍`);
  console.log(`=============================`);
  
  console.log(`🌐 Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log(`📝 Query parameters:`, req.query);
  
  try {
    console.log(`🔑 Extracting auth token from request...`);
    
    // Extract token from request (might be auth_token or token)
    let authToken = req.query.auth_token || req.query.token;
    
    // Log token format before parsing
    if (authToken) {
      if (typeof authToken === 'string') {
        console.log(`🔑 Raw token type: string, length: ${authToken.length}`);
        console.log(`🔑 Token starts with: ${authToken.substring(0, 30)}...`);
        
        // Check if it's a JSON string
        if (authToken.startsWith('{')) {
          console.log(`🔑 Token appears to be JSON format`);
        } else if (authToken.startsWith('ey')) {
          console.log(`🔑 Token appears to be JWT format`);
        }
      } else {
        console.log(`🔑 Raw token type: ${typeof authToken}`);
      }
    } else {
      console.log(`⚠️ No token found in query parameters`);
      // Check for other authentication parameters
      if (req.query.did) {
        console.log(`🆔 DID found in query parameters: ${req.query.did}`);
      }
    }
    
    // Try to parse token if it's a JSON string
    if (authToken && typeof authToken === 'string' && authToken.startsWith('{')) {
      try {
        const tokenObj = JSON.parse(authToken);
        console.log(`📦 Token parsed as JSON object with keys: ${Object.keys(tokenObj).join(', ')}`);
        
        // Examine token structure
        if (tokenObj.token) {
          console.log(`🔑 Token object contains 'token' property`);
          
          if (typeof tokenObj.token === 'string') {
            console.log(`🔑 Inner token is a string, length: ${tokenObj.token.length}`);
            authToken = tokenObj.token;
          } else if (typeof tokenObj.token === 'object') {
            console.log(`🔑 Inner token is an object with keys: ${Object.keys(tokenObj.token).join(', ')}`);
            // Check for did in the token object
            if (tokenObj.token.did) {
              console.log(`🆔 DID found in token object: ${tokenObj.token.did}`);
            }
            // For now, keep the entire object as the token
            authToken = tokenObj.token;
          }
        }
      } catch (e) {
        console.warn(`⚠️ Failed to parse token as JSON: ${e.message}`);
      }
    }
    
    if (!authToken) {
      throw new Error('No auth token found in callback parameters');
    }
    
    // Generate a userId (use DID if available or generate one based on timestamp)
    let userId = req.query.did || `verida_${Date.now()}`;
    console.log(`👤 Using user ID: ${userId}`);
    
    // Store the auth token
    veridaService.storeAuthToken(userId, authToken);
    
    // Immediately try to extract DID and fetch user data
    console.log(`\n🔍 ATTEMPTING TO FETCH USER DATA 🔍`);
    console.log(`=================================`);
    
    try {
      // Try to get the user's DID
      console.log(`🔍 Fetching user DID...`);
      const did = await veridaService.getUserDID(authToken);
      if (did) {
        console.log(`✅ Retrieved DID: ${did}`);
        userId = did; // Use DID as userId for better consistency
        // Re-store token with the DID as key
        veridaService.storeAuthToken(userId, authToken);
      }
    } catch (didError) {
      console.error(`❌ Error fetching user DID: ${didError.message}`);
    }
    
    // Create or find the user in the database
    console.log(`🔍 Finding or creating user in database...`);
    let user = await User.findOne({ privyId: userId });
    
    if (!user) {
      console.log(`👤 User not found, creating new user with privyId: ${userId}`);
      user = new User({
        privyId: userId,
        veridaConnected: true,
        veridaUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await user.save();
      console.log(`✅ New user created in database`);
    } else {
      console.log(`👤 User found in database: ${user._id}`);
      // Update Verida connection status
      user.veridaConnected = true;
      user.veridaUserId = userId;
      user.updatedAt = new Date();
      await user.save();
      console.log(`✅ User updated in database`);
    }
    
    // Fetch Telegram Groups
    console.log(`\n📋 FETCHING TELEGRAM DATA 📋`);
    console.log(`=============================`);
    
    console.log(`📋 Fetching Telegram groups for user ${userId}...`);
    let groups = [];
    try {
      groups = await veridaService.getTelegramGroups(userId);
      console.log(`✅ Retrieved ${groups.length} Telegram groups`);
    } catch (groupError) {
      console.error(`❌ Error fetching Telegram groups: ${groupError.message}`);
    }
    
    // Fetch Telegram Messages
    console.log(`📋 Fetching Telegram messages for user ${userId}...`);
    let messages = [];
    try {
      messages = await veridaService.getTelegramMessages(userId);
      console.log(`✅ Retrieved ${messages.length} Telegram messages`);
    } catch (messageError) {
      console.error(`❌ Error fetching Telegram messages: ${messageError.message}`);
    }
    
    // Calculate the Verida score
    console.log(`\n🧮 CALCULATING SCORE 🧮`);
    console.log(`=======================`);
    
    let veridaScore = 0;
    try {
      console.log(`🧮 Calculating Verida score based on ${groups.length} groups and ${messages.length} messages...`);
      const scoreResult = await veridaService.calculateVeridaScore(userId);
      veridaScore = scoreResult.score;
      console.log(`✅ Calculated Verida score: ${veridaScore}`);
      
      // Update user's score in database
      if (user) {
        if (!user.scoreDetails) {
          user.scoreDetails = {};
        }
        user.scoreDetails.veridaScore = veridaScore;
        user.totalScore = (user.scoreDetails.twitterScore || 0) + 
                          (user.scoreDetails.walletScore || 0) + 
                          veridaScore;
        await user.save();
        console.log(`✅ User score updated in database`);
      }
    } catch (scoreError) {
      console.error(`❌ Error calculating Verida score: ${scoreError.message}`);
    }
    
    // Build the redirect URL with success parameters
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/verida?status=success&userId=${encodeURIComponent(userId)}&score=${veridaScore}`;
    
    console.log(`\n🔀 REDIRECTING TO FRONTEND 🔀`);
    console.log(`=============================`);
    console.log(`🔀 Redirect URL: ${redirectUrl}`);
    console.log(`=============================\n`);
    
    return res.redirect(redirectUrl);
    
  } catch (error) {
    console.error(`\n❌ ERROR PROCESSING CALLBACK ❌`);
    console.error(`=============================`);
    console.error(`❌ Error: ${error.message}`);
    console.error(`❌ Stack: ${error.stack}`);
    console.error(`=============================\n`);
    
    // Redirect back to the frontend with error parameters
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const errorMessage = encodeURIComponent(error.message);
    return res.redirect(`${frontendUrl}/verida?status=error&message=${errorMessage}`);
  }
});

// Get Telegram groups data
router.get('/telegram/groups/:userId', async (req, res) => {
  console.log(`\n📊 FETCHING TELEGRAM GROUPS 📊`);
  console.log(`==============================`);
  
  try {
    const { userId } = req.params;
    console.log(`🆔 User ID: ${userId}`);
    
    if (!userId) {
      console.error('❌ Missing user ID parameter');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    console.log(`🔍 Fetching Telegram groups for user: ${userId}`);
    const groups = await veridaService.getTelegramGroups(userId);
    
    console.log(`✅ Retrieved ${groups.length} groups`);
    console.log(`==============================\n`);
    
    res.json({ 
      success: true, 
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('❌ Error fetching Telegram groups:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch Telegram groups' });
  }
});

// Get Telegram messages data
router.get('/telegram/messages/:userId', async (req, res) => {
  console.log(`\n📝 FETCHING TELEGRAM MESSAGES 📝`);
  console.log(`================================`);
  
  try {
    const { userId } = req.params;
    console.log(`🆔 User ID: ${userId}`);
    
    if (!userId) {
      console.error('❌ Missing user ID parameter');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    console.log(`🔍 Fetching Telegram messages for user: ${userId}`);
    const messages = await veridaService.getTelegramMessages(userId);
    
    console.log(`✅ Retrieved ${messages.length} messages`);
    console.log(`================================\n`);
    
    res.json({ 
      success: true, 
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('❌ Error fetching Telegram messages:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch Telegram messages' });
  }
});

// Update user's Verida status
router.post('/update-status', async (req, res) => {
  console.log(`\n📝 VERIDA STATUS UPDATE 📝`);
  console.log(`==========================`);
  
  try {
    const { privyId, veridaConnected = true, veridaUserId, score, walletAddresses } = req.body;
    
    console.log(`📥 Received request to update Verida status:`);
    console.log(`👤 User ID: ${privyId}`);
    console.log(`🔌 Verida Connected: ${veridaConnected}`);
    console.log(`🔑 Verida User ID: ${veridaUserId}`);
    console.log(`📊 Score Provided: ${score !== undefined ? score : 'No'}`);
    console.log(`💼 Wallet Addresses: ${walletAddresses ? walletAddresses.length : 0} provided`);
    
    if (!privyId) {
      throw new Error('User ID (privyId) is required');
    }
    
    if (!veridaUserId && veridaConnected) {
      throw new Error('Verida User ID is required when setting connected status to true');
    }
    
    // Update the user's Verida status
    console.log(`🔄 Updating Verida status in database...`);
    const updateResult = await scoreService.updateVeridaStatus({
      privyId,
      veridaConnected,
      veridaUserId,
      walletAddresses
    });
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update Verida status');
    }
    
    // If score is provided, update it directly
    let scoreResult = null;
    if (score !== undefined) {
      console.log(`📊 Updating score directly with provided value: ${score}`);
      
      // Find the user to update
      const user = await User.findOne({ privyId });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Ensure scoreDetails object exists
      if (!user.scoreDetails) {
        user.scoreDetails = {};
      }
      
      // Update the score
      user.scoreDetails.veridaScore = score;
      
      // Also update total score
      const twitterScore = user.scoreDetails.twitterScore || 0;
      const walletScore = user.scoreDetails.walletScore || 0;
      user.totalScore = twitterScore + walletScore + score;
      
      await user.save();
      console.log(`✅ Score updated directly: ${score}`);
      
      scoreResult = {
        success: true,
        score: score
      };
    } else if (veridaConnected && veridaUserId) {
      // If score not provided but user is connected, calculate it
      console.log(`🧮 No score provided, calculating Verida score...`);
      scoreResult = await scoreService.calculateVeridaScore(privyId);
      
      if (scoreResult.success) {
        console.log(`✅ Score calculated: ${scoreResult.score}`);
      } else {
        console.warn(`⚠️ Failed to calculate score: ${scoreResult.error}`);
      }
    }
    
    console.log(`✅ Verida status updated successfully`);
    console.log(`==========================\n`);
    
    return res.json({
      success: true,
      scoreUpdated: scoreResult ? scoreResult.success : false,
      score: scoreResult ? scoreResult.score : undefined
    });
  } catch (error) {
    console.error(`❌ Error updating Verida status: ${error.message}`);
    console.error(`==========================\n`);
    
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Calculate Verida score
router.post('/calculate-score', async (req, res) => {
  console.log(`\n📊 CALCULATING VERIDA SCORE 📊`);
  console.log(`=============================`);
  
  try {
    const { privyId } = req.body;
    console.log(`📝 Request data:`, req.body);
    
    if (!privyId) {
      console.error('❌ Missing privyId in calculate-score request');
      return res.status(400).json({ success: false, error: 'Missing required field: privyId' });
    }
    
    console.log(`🔍 Calculating Verida score for user with privyId: ${privyId}`);
    const scoreResult = await scoreService.calculateVeridaScore(privyId);
    
    if (!scoreResult.success) {
      console.error('❌ Score calculation failed:', scoreResult.error);
      const status = scoreResult.error === 'User not found' ? 404 : 500;
      return res.status(status).json(scoreResult);
    }
    
    console.log(`✅ Score calculated successfully: ${scoreResult.score}`);
    console.log(`=============================\n`);
    
    res.json(scoreResult);
  } catch (error) {
    console.error('❌ Error calculating Verida score:', error.message);
    res.status(500).json({ success: false, error: 'Failed to calculate Verida score' });
  }
});

// Test route for debugging Verida integration
router.get('/debug', async (req, res) => {
  console.log(`\n🔧 VERIDA DEBUG ENDPOINT 🔧`);
  console.log(`==========================`);
  
  try {
    // Check if we have any stored tokens
    const tokenCount = Object.keys(global.userTokens || {}).length;
    console.log(`📊 Stored token count: ${tokenCount}`);
    
    // Get list of Verida users from the database
    const veridaUsers = await User.find({ veridaConnected: true }).select('_id privyId veridaConnected veridaUserId totalScore scoreDetails');
    console.log(`📊 Verida connected users in database: ${veridaUsers.length}`);
    
    // Generate an auth URL for testing
    const testAuthUrl = await veridaService.generateAuthUrl();
    
    // Return debug information
    return res.json({
      success: true,
      tokenCount,
      storedTokenUsers: Object.keys(global.userTokens || {}),
      databaseUsers: veridaUsers,
      testAuthUrl
    });
  } catch (error) {
    console.error(`❌ Error in debug endpoint: ${error.message}`);
    console.error(`==========================\n`);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test route to check data for a specific user
router.get('/debug/:userId', async (req, res) => {
  console.log(`\n🔍 CHECKING USER DATA 🔍`);
  console.log(`======================`);
  
  try {
    const { userId } = req.params;
    console.log(`👤 Checking data for user: ${userId}`);
    
    // Check if we have a token for this user
    const hasToken = (global.userTokens || {})[userId] !== undefined;
    console.log(`🔑 Token found: ${hasToken ? 'Yes' : 'No'}`);
    
    // Find user in database
    const user = await User.findOne({ 
      $or: [
        { privyId: userId },
        { veridaUserId: userId }
      ]
    }).select('_id privyId veridaConnected veridaUserId totalScore scoreDetails');
    
    console.log(`🗄️ User found in database: ${user ? 'Yes' : 'No'}`);
    
    // Try to get Telegram data if we have a token
    let groups = [];
    let messages = [];
    let score = null;
    
    if (hasToken) {
      try {
        console.log(`📥 Fetching Telegram groups...`);
        groups = await veridaService.getTelegramGroups(userId);
        console.log(`✅ Retrieved ${groups.length} groups`);
      } catch (groupError) {
        console.error(`❌ Error fetching groups: ${groupError.message}`);
      }
      
      try {
        console.log(`📥 Fetching Telegram messages...`);
        messages = await veridaService.getTelegramMessages(userId);
        console.log(`✅ Retrieved ${messages.length} messages`);
      } catch (messageError) {
        console.error(`❌ Error fetching messages: ${messageError.message}`);
      }
      
      try {
        console.log(`🧮 Calculating score...`);
        const scoreResult = await veridaService.calculateVeridaScore(userId);
        if (scoreResult.success) {
          score = scoreResult;
          console.log(`✅ Score calculated: ${scoreResult.score}`);
        }
      } catch (scoreError) {
        console.error(`❌ Error calculating score: ${scoreError.message}`);
      }
    }
    
    // Return all debug information
    return res.json({
      success: true,
      userId,
      hasToken,
      user: user || null,
      dataStats: {
        groupCount: groups.length,
        messageCount: messages.length,
        hasScore: score !== null
      },
      sampleData: {
        groups: groups.slice(0, 1),
        messages: messages.slice(0, 1)
      },
      score
    });
  } catch (error) {
    console.error(`❌ Error checking user data: ${error.message}`);
    console.error(`======================\n`);
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 