/**
 * API Test Script
 * 
 * This script tests our API with the fixes we've made to ensure
 * the score controllers are working correctly.
 * 
 * Run with: node test-api.js
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER_ID = 'test-api-user-' + Date.now();
const TEST_WALLET = '0xTestWallet' + Date.now().toString().slice(-8);

// Helper for logging
function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`🔍 ${title}`);
  console.log('='.repeat(80));
}

// Test score calculation API
async function testScoreAPI() {
  try {
    logSection('Testing Score API');
    
    // Test POST score calculation
    console.log('Testing POST /api/score/get-score');
    const postResponse = await axios.post(`${BASE_URL}/api/score/get-score`, {
      privyId: TEST_USER_ID,
      twitterUsername: 'testuser',
      walletAddress: TEST_WALLET,
      email: 'test@example.com'
    });
    
    console.log(`POST Response Status: ${postResponse.status}`);
    console.log('Response Data:', JSON.stringify(postResponse.data, null, 2));
    
    // Test GET total score
    console.log('\nTesting GET /api/score/total-score/:privyId');
    const getResponse = await axios.get(`${BASE_URL}/api/score/total-score/${TEST_USER_ID}`);
    
    console.log(`GET Response Status: ${getResponse.status}`);
    console.log('Response Data:', JSON.stringify(getResponse.data, null, 2));
    
    // Verify the scores match
    if (postResponse.data.scores.totalScore === getResponse.data.totalScore) {
      console.log('\n✅ Scores match between POST and GET endpoints!');
    } else {
      console.log('\n❌ Score mismatch between POST and GET endpoints');
      console.log(`POST score: ${postResponse.data.scores.totalScore}`);
      console.log(`GET score: ${getResponse.data.totalScore}`);
    }
    
    return { 
      success: true, 
      postScore: postResponse.data.scores.totalScore,
      getScore: getResponse.data.totalScore
    };
  } catch (error) {
    console.error('Error testing Score API:', error.message);
    console.error('Response data:', error.response?.data);
    return { success: false, error: error.message };
  }
}

// Test wallet routes
async function testWalletAPI() {
  try {
    logSection('Testing Wallet API');
    
    // Test wallet connect
    console.log('Testing POST /api/wallet/connect');
    const connectResponse = await axios.post(`${BASE_URL}/api/wallet/connect`, {
      privyId: TEST_USER_ID,
      walletAddress: TEST_WALLET,
      walletAddresses: [TEST_WALLET, TEST_WALLET + 'extra']
    });
    
    console.log(`Connect Response Status: ${connectResponse.status}`);
    console.log('Response Data:', JSON.stringify(connectResponse.data, null, 2));
    
    // Test wallet status
    console.log('\nTesting GET /api/wallet/status/:privyId');
    const statusResponse = await axios.get(`${BASE_URL}/api/wallet/status/${TEST_USER_ID}`);
    
    console.log(`Status Response Status: ${statusResponse.status}`);
    console.log('Response Data:', JSON.stringify(statusResponse.data, null, 2));
    
    // Verify wallets are correctly stored
    if (statusResponse.data.wallets && statusResponse.data.wallets.length > 0) {
      console.log(`\n✅ Found ${statusResponse.data.wallets.length} wallets for the user!`);
      
      // Check if our test wallet is in the list
      const foundWallet = statusResponse.data.wallets.some(w => w.walletAddress === TEST_WALLET);
      if (foundWallet) {
        console.log('✅ Test wallet is in the wallet list!');
      } else {
        console.log('❌ Test wallet not found in wallet list');
      }
    } else {
      console.log('\n❌ No wallets found for the user');
    }
    
    return { 
      success: true, 
      walletCount: statusResponse.data.wallets?.length || 0,
      walletFound: statusResponse.data.wallets?.some(w => w.walletAddress === TEST_WALLET) || false
    };
  } catch (error) {
    console.error('Error testing Wallet API:', error.message);
    console.error('Response data:', error.response?.data);
    return { success: false, error: error.message };
  }
}

// Verify end-to-end flow
async function testFullFlow() {
  try {
    logSection('Testing Full Flow');
    
    // 1. Connect wallet
    console.log('1. Connecting wallet');
    const connectResponse = await axios.post(`${BASE_URL}/api/wallet/connect`, {
      privyId: TEST_USER_ID,
      walletAddress: TEST_WALLET
    });
    console.log(`Wallet connected: ${connectResponse.status === 200}`);
    
    // 2. Calculate score
    console.log('\n2. Calculating score');
    const scoreResponse = await axios.post(`${BASE_URL}/api/score/get-score`, {
      privyId: TEST_USER_ID,
      walletAddress: TEST_WALLET,
      twitterUsername: 'testuser'
    });
    console.log(`Score calculated: ${scoreResponse.status === 200}`);
    console.log(`Total score: ${scoreResponse.data.scores.totalScore}`);
    
    // 3. Get wallet status
    console.log('\n3. Getting wallet status');
    const statusResponse = await axios.get(`${BASE_URL}/api/wallet/status/${TEST_USER_ID}`);
    console.log(`Got wallet status: ${statusResponse.status === 200}`);
    console.log(`Wallet connected: ${statusResponse.data.walletConnected}`);
    console.log(`Wallet count: ${statusResponse.data.wallets?.length || 0}`);
    
    // 4. Get total score
    console.log('\n4. Getting total score');
    const totalResponse = await axios.get(`${BASE_URL}/api/score/total-score/${TEST_USER_ID}`);
    console.log(`Got total score: ${totalResponse.status === 200}`);
    console.log(`Total score: ${totalResponse.data.totalScore}`);
    
    console.log('\n✅ Full flow test completed successfully!');
    return true;
  } catch (error) {
    console.error('Error testing full flow:', error.message);
    console.error('Response data:', error.response?.data);
    return false;
  }
}

// Main function
async function runTests() {
  console.log('🧪 TESTING API WITH FIXES');
  console.log(`Test User ID: ${TEST_USER_ID}`);
  console.log(`Test Wallet: ${TEST_WALLET}`);
  
  try {
    // Check if server is running
    const healthCheck = await axios.get(`${BASE_URL}/api/health`);
    console.log(`Server is running: ${healthCheck.status === 200}`);
    
    // Run tests
    await testScoreAPI();
    await testWalletAPI();
    await testFullFlow();
    
    console.log('\n🎉 All tests completed!');
  } catch (error) {
    console.error('Error during tests:', error.message);
  }
}

// Run the tests
runTests(); 