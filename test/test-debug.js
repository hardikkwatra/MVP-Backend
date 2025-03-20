/**
 * Test script for debug endpoints
 * 
 * Run with: node test-debug.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/debug';
const TEST_ID = `test-user-debug-${Date.now()}`;
const TEST_WALLET = `0xTestDebug${Date.now()}`;

async function runTests() {
  console.log('Starting debug endpoint tests');
  console.log(`Using test ID: ${TEST_ID}`);
  console.log(`Using test wallet: ${TEST_WALLET}`);
  console.log('========================');
  
  try {
    // Test 1: Health check
    console.log('\nTest 1: Health check');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('Health check status:', healthResponse.status);
    console.log('Health check data:', healthResponse.data);
    
    // Test 2: Create user
    console.log('\nTest 2: Create user');
    const createUserResponse = await axios.post(`${BASE_URL}/create-user`, {
      privyId: TEST_ID
    });
    console.log('Create user status:', createUserResponse.status);
    console.log('Create user data:', createUserResponse.data);
    
    // Test 3: Connect wallet
    console.log('\nTest 3: Connect wallet');
    const connectResponse = await axios.post(`${BASE_URL}/connect`, {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET
    });
    console.log('Connect wallet status:', connectResponse.status);
    console.log('Connect wallet data:', connectResponse.data);
    
    // Test 4: Get wallet status
    console.log('\nTest 4: Get wallet status');
    const statusResponse = await axios.get(`${BASE_URL}/status/${TEST_ID}`);
    console.log('Wallet status status:', statusResponse.status);
    console.log('Wallet status data:', statusResponse.data);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
runTests(); 