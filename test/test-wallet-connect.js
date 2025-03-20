/**
 * Simple script to test the wallet connect endpoint
 */

const axios = require('axios');

async function testWalletConnect() {
  try {
    console.log('Testing wallet connect endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/wallet/connect', {
      privyId: 'test-user-direct',
      walletAddress: '0xTestWalletDirect'
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('\nSuccess! Wallet connect endpoint is working properly.');
  } catch (error) {
    console.error('Error connecting wallet:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testWalletConnect(); 