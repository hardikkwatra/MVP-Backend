/**
 * Comprehensive Backend Test Script
 * 
 * This script tests all major backend components and logs detailed information
 * Useful for identifying conflicts or issues in the scoring system
 * 
 * Run with: node test-backend.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { evaluateUser } = require('./controllers/NewScoreController');
const Score = require('./models/Score');
const User = require('./models/User');

// Load environment variables
dotenv.config();

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_WALLET = '0xTestWallet' + Date.now().toString().slice(-8);
const TEST_TWITTER = 'testuser' + Date.now().toString().slice(-5);

// Tracking results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper for logging
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(80));
}

// Helper for test results
function testResult(name, success, message, data = null) {
  const result = {
    name,
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    results.passed.push(result);
    console.log(`✅ PASSED: ${name} - ${message}`);
  } else {
    results.failed.push(result);
    console.error(`❌ FAILED: ${name} - ${message}`);
  }
  
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  return success;
}

// Helper for warnings
function logWarning(name, message, data = null) {
  const warning = {
    name,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  
  results.warnings.push(warning);
  console.warn(`⚠️ WARNING: ${name} - ${message}`);
  
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

// Connect to database
async function connectDatabase() {
  try {
    logSection('Connecting to Database');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

// Test API health
async function testApiHealth() {
  try {
    logSection('Testing API Health');
    const response = await axios.get(`${BASE_URL}/api/health`);
    return testResult('API Health', response.status === 200, 'API is running', response.data);
  } catch (error) {
    return testResult('API Health', false, `Error: ${error.message}`);
  }
}

// Test Score Controllers
async function testScoreControllers() {
  try {
    logSection('Testing Score Controllers');
    
    // Clean up any previous test data
    await Score.deleteOne({ privyId: TEST_USER_ID });
    await User.deleteOne({ privyId: TEST_USER_ID });
    
    // Test mock data for score calculation
    const mockTwitter = { 
      result: { 
        legacy: { 
          followers_count: 1000,
          statuses_count: 500,
          favourites_count: 200,
          media_count: 50,
          listed_count: 5,
          friends_count: 300,
          created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        is_blue_verified: true 
      } 
    };
    
    const mockWallet = { 
      'Native Balance Result': 10,
      'Token Balances Result': ['token1', 'token2'],
      'Active Chains Result': { activeChains: ['ethereum', 'polygon'] },
      'DeFi Positions Summary Result': ['position1'],
      'Wallet NFTs Result': ['nft1', 'nft2'],
      'Transaction Count': 150,
      'Unique Token Interactions': 10
    };
    
    const mockTelegramGroups = { 
      items: [
        { sourceData: { permissions: { can_send_polls: true } } }
      ] 
    };
    
    const mockTelegramMessages = { 
      items: [
        { sourceData: { content: { _: "messagePhoto" } } }
      ] 
    };
    
    // Test direct algorithm call
    console.log('Testing direct evaluateUser function call');
    const directResult = evaluateUser(mockTwitter, mockWallet, mockTelegramGroups, mockTelegramMessages);
    testResult('Direct Algorithm', !!directResult.scores, 'Algorithm calculated scores directly', directResult);
    
    // Test via API - POST to /api/score/get-score
    try {
      console.log('Testing score API endpoint (POST)');
      const postResponse = await axios.post(`${BASE_URL}/api/score/get-score`, {
        privyId: TEST_USER_ID,
        twitterUsername: TEST_TWITTER,
        walletAddress: TEST_WALLET,
        walletAddresses: [TEST_WALLET]
      });
      
      testResult('Score API POST', postResponse.status === 200, 'Score calculated via POST', postResponse.data);
      
      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check database for score record
      const scoreRecord = await Score.findOne({ privyId: TEST_USER_ID });
      testResult('Score DB Record', !!scoreRecord, 'Score record was created in database', scoreRecord);
      
      // Check database for user record
      const userRecord = await User.findOne({ privyId: TEST_USER_ID });
      if (userRecord) {
        testResult('User DB Record', true, 'User record was found in database', userRecord);
      } else {
        logWarning('User DB Record', 'User record not created in database - this is normal if there was no prior user record');
      }
      
      // Compare scores between direct calculation and API result
      const directTotal = directResult.scores.totalScore;
      const apiTotal = postResponse.data.scores.totalScore;
      const dbTotal = scoreRecord ? scoreRecord.totalScore : 0;
      
      if (Math.abs(directTotal - apiTotal) > 1) {
        logWarning('Score Consistency', `Direct and API scores differ: ${directTotal} vs ${apiTotal}`);
      }
      
      if (Math.abs(apiTotal - dbTotal) > 1) {
        logWarning('Database Consistency', `API and DB scores differ: ${apiTotal} vs ${dbTotal}`);
      }
      
      // Test GET endpoint - /api/score/total-score/{privyId}
      console.log('Testing score GET endpoint');
      const getResponse = await axios.get(`${BASE_URL}/api/score/total-score/${TEST_USER_ID}`);
      testResult('Score API GET', getResponse.status === 200, 'Score retrieved via GET', getResponse.data);
      
      // Verify GET result against database
      if (Math.abs(getResponse.data.totalScore - dbTotal) > 1) {
        logWarning('GET Endpoint Consistency', `GET endpoint and DB scores differ: ${getResponse.data.totalScore} vs ${dbTotal}`);
      }
      
    } catch (apiError) {
      testResult('Score API', false, `API Error: ${apiError.message}`, apiError.response?.data);
    }
    
    return true;
  } catch (error) {
    console.error('Error in score controllers test:', error);
    return false;
  }
}

// Test Wallet Routes
async function testWalletRoutes() {
  try {
    logSection('Testing Wallet Routes');
    
    // Test wallet connection
    const walletResponse = await axios.post(`${BASE_URL}/api/wallet/connect`, {
      privyId: TEST_USER_ID,
      walletAddress: TEST_WALLET,
      walletAddresses: [TEST_WALLET, TEST_WALLET + 'extra']
    });
    
    testResult('Wallet Connect', walletResponse.status === 200, 'Wallet connected successfully', walletResponse.data);
    
    // Check wallet status
    const statusResponse = await axios.get(`${BASE_URL}/api/wallet/status/${TEST_USER_ID}`);
    testResult('Wallet Status', statusResponse.status === 200, 'Retrieved wallet status', statusResponse.data);
    
    // Verify wallet data in database
    const walletCount = statusResponse.data.wallets ? statusResponse.data.wallets.length : 0;
    if (walletCount < 2) {
      logWarning('Wallet Count', `Expected at least 2 wallets, found ${walletCount}`, statusResponse.data.wallets);
    }
    
    return true;
  } catch (error) {
    testResult('Wallet Routes', false, `Error: ${error.message}`, error.response?.data);
    return false;
  }
}

// Check for common issues
async function checkForIssues() {
  try {
    logSection('Checking for Common Issues');
    
    // Check for duplicate records
    const scoreCount = await Score.countDocuments({ privyId: TEST_USER_ID });
    if (scoreCount > 1) {
      logWarning('Duplicate Scores', `Found ${scoreCount} score records for test user`);
      
      // Show the duplicates
      const duplicates = await Score.find({ privyId: TEST_USER_ID });
      console.log('Duplicate records:', duplicates);
    } else {
      testResult('Score Uniqueness', true, 'No duplicate score records found');
    }
    
    // Check for data consistency issues between User and Score models
    const user = await User.findOne({ privyId: TEST_USER_ID });
    const score = await Score.findOne({ privyId: TEST_USER_ID });
    
    if (user && score) {
      // Compare total scores
      const userTotal = user.totalScore || 0;
      const scoreTotal = score.totalScore || 0;
      
      if (Math.abs(userTotal - scoreTotal) > 1) {
        logWarning('Model Consistency', `User.totalScore (${userTotal}) differs from Score.totalScore (${scoreTotal})`);
      } else {
        testResult('Model Consistency', true, 'User and Score models have consistent total scores');
      }
      
      // Check wallet consistency
      if (user.walletAddress && !score.wallets.some(w => w.walletAddress === user.walletAddress)) {
        logWarning('Wallet Consistency', `User.walletAddress (${user.walletAddress}) not found in Score.wallets`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking for issues:', error);
    return false;
  }
}

// Run cleanup
async function cleanup() {
  try {
    logSection('Cleanup');
    
    // Remove test data
    const scoreDelete = await Score.deleteOne({ privyId: TEST_USER_ID });
    const userDelete = await User.deleteOne({ privyId: TEST_USER_ID });
    
    console.log(`Removed ${scoreDelete.deletedCount} score records and ${userDelete.deletedCount} user records`);
    
    // Close database connection
    await mongoose.connection.close();
    console.log('Closed database connection');
    
    return true;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '*'.repeat(80));
  console.log(`🧪 BACKEND TEST SUITE - ${new Date().toLocaleString()}`);
  console.log('*'.repeat(80) + '\n');
  
  try {
    // Connect to database
    const dbConnected = await connectDatabase();
    if (!dbConnected) {
      console.error('Cannot proceed with tests without database connection');
      return;
    }
    
    // Run tests
    await testApiHealth();
    await testScoreControllers();
    await testWalletRoutes();
    await checkForIssues();
    
    // Cleanup
    await cleanup();
    
    // Report results
    logSection('Test Results Summary');
    console.log(`✅ Passed: ${results.passed.length} tests`);
    console.log(`❌ Failed: ${results.failed.length} tests`);
    console.log(`⚠️ Warnings: ${results.warnings.length}`);
    
    if (results.failed.length > 0) {
      console.log('\nFailed Tests:');
      results.failed.forEach(test => {
        console.log(`- ${test.name}: ${test.message}`);
      });
    }
    
    if (results.warnings.length > 0) {
      console.log('\nWarnings:');
      results.warnings.forEach(warning => {
        console.log(`- ${warning.name}: ${warning.message}`);
      });
    }
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 