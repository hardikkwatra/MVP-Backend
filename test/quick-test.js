/**
 * Quick test script for wallet endpoints
 * Run with: node quick-test.js
 */

const axios = require('axios');

// Test parameters
const TEST_ID = `test-user-${Date.now()}`;
const TEST_WALLET = `0xTest${Date.now()}`;
const MAIN_SERVER_URL = 'http://localhost:5000/api';
const TEST_SERVER_URL = 'http://localhost:5555/api';

// Run all tests
async function runTests() {
  console.log('Starting wallet endpoint tests\n');
  
  // Test 1: Main server health check
  try {
    console.log('Test 1: Main server health check');
    const healthResponse = await axios.get(`${MAIN_SERVER_URL}/health`);
    console.log('Health check result:', healthResponse.status, healthResponse.data);
  } catch (error) {
    console.error('Main server health check failed:', error.message);
    console.log('Make sure the main server is running on port 5000');
  }
  
  // Test 2: Connect wallet on main server
  try {
    console.log('\nTest 2: Connect wallet on main server');
    const connectData = {
      privyId: TEST_ID,
      walletAddress: TEST_WALLET
    };
    
    console.log('Sending request to:', `${MAIN_SERVER_URL}/wallet/connect`);
    console.log('Request data:', JSON.stringify(connectData));
    
    const connectResponse = await axios.post(`${MAIN_SERVER_URL}/wallet/connect`, connectData);
    console.log('Connect wallet result:', connectResponse.status);
    console.log('Response data:', JSON.stringify(connectResponse.data, null, 2));
  } catch (error) {
    console.error('Main server wallet connect failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  // Test 3: Test standalone test server
  try {
    console.log('\nTest 3: Run standalone test server (port 5555)');
    console.log('Please run "node test-wallet.js" in a separate terminal');
    console.log('Then press Enter to continue...');
    await waitForInput();
    
    // Test connection to test server
    try {
      const connectData = {
        privyId: `${TEST_ID}-standalone`,
        walletAddress: `${TEST_WALLET}-standalone`
      };
      
      console.log('Sending request to:', `${TEST_SERVER_URL}/wallet/connect`);
      console.log('Request data:', JSON.stringify(connectData));
      
      const testResponse = await axios.post(`${TEST_SERVER_URL}/wallet/connect`, connectData);
      console.log('Standalone test result:', testResponse.status);
      console.log('Response data:', JSON.stringify(testResponse.data, null, 2));
    } catch (error) {
      console.error('Standalone test failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  } catch (error) {
    console.error('Error in standalone test:', error);
  }
  
  console.log('\nTests completed');
}

// Helper function to wait for user input
function waitForInput() {
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

// Run tests
runTests(); 