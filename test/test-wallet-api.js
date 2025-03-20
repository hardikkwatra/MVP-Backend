/**
 * Test script for wallet API
 * 
 * Run with: node test-wallet-api.js
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/wallet';
const TEST_ID = `test-user-wallet-${Date.now()}`;
const TEST_WALLET = `0xTestWallet${Date.now()}`;

async function runTests() {
  console.log('Starting wallet API tests');
  console.log(`Using test ID: ${TEST_ID}`);
  console.log(`Using test wallet: ${TEST_WALLET}`);
  console.log('========================');
  
  try {
    // Test 1: Connect wallet
    console.log('\nTest 1: Connect wallet');
    const connectResponse = await axios.post(`${BASE_URL}/connect`, {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET
    });
    console.log('Connect wallet status:', connectResponse.status);
    console.log('Connect wallet data:', connectResponse.data);
    
    // Test 2: Get wallet status
    console.log('\nTest 2: Get wallet status');
    const statusResponse = await axios.get(`${BASE_URL}/status/${TEST_ID}`);
    console.log('Wallet status status:', statusResponse.status);
    console.log('Wallet status data:', statusResponse.data);
    
    // Test 3: Connect wallet with multiple addresses
    console.log('\nTest 3: Connect wallet with multiple addresses');
    const multiWalletResponse = await axios.post(`${BASE_URL}/connect`, {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET,
      walletAddresses: [TEST_WALLET, `${TEST_WALLET}2`, `${TEST_WALLET}3`]
    });
    console.log('Multi-wallet connect status:', multiWalletResponse.status);
    console.log('Multi-wallet connect data:', multiWalletResponse.data);
    
    // Test 4: Get updated wallet status
    console.log('\nTest 4: Get updated wallet status');
    const updatedStatusResponse = await axios.get(`${BASE_URL}/status/${TEST_ID}`);
    console.log('Updated wallet status status:', updatedStatusResponse.status);
    console.log('Updated wallet status data:', updatedStatusResponse.data);
    
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